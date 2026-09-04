from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.utils import timezone
from .models import PeriodoGuardia, AprobacionPotencialArea
from .serializers import PeriodoGuardiaSerializer, PotencialPersonaSerializer
from modules.guardia_admin.models import Perfil, Area, Sede
from modules.compromiso.models import CompromisoGuardia

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "modulo": "Potencial de Guardia",
            "mensaje": "Módulo de Potencial activo (Hito 3).",
            "usuario": request.user.username,
            "rol": getattr(request.user, 'role', 'TRABAJADOR'),
            "estado": "Hito 3 Operativo"
        })

class PeriodoGuardiaViewSet(viewsets.ModelViewSet):
    """
    CRUD de Períodos de Guardia (RF-0113).
    """
    queryset = PeriodoGuardia.objects.all()
    serializer_class = PeriodoGuardiaSerializer
    permission_classes = [IsAuthenticated]

class PotencialViewSet(viewsets.ViewSet):
    """
    Gestión del Potencial de Guardia por Área/Departamento (RF-0501 a RF-0504).
    Implementa RN-04 (Cierre irreversible) y RN-10 (Protección de CI).
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='listado')
    def listado(self, request):
        user = request.user
        role = getattr(user, 'role', 'TRABAJADOR')
        
        # Obtener período activo o especificado
        periodo_id = request.query_params.get('periodo_id')
        if periodo_id:
            periodo = PeriodoGuardia.objects.filter(id=periodo_id).first()
        else:
            periodo = PeriodoGuardia.objects.filter(activo=True).first()

        perfil_user = getattr(user, 'perfil', None)
        area_objetivo = None

        # Filtrar por área según el rol del usuario
        if role in ['SUPERADMIN', 'JEFE_SEGURIDAD']:
            filtro_area_id = request.query_params.get('area_id')
            if filtro_area_id:
                queryset = Perfil.objects.filter(area_id=filtro_area_id)
                area_objetivo = Area.objects.filter(id=filtro_area_id).first()
            else:
                queryset = Perfil.objects.all()
        elif role == 'RESPONSABLE_AREA':
            if perfil_user and perfil_user.area:
                queryset = Perfil.objects.filter(area=perfil_user.area)
                area_objetivo = perfil_user.area
            else:
                queryset = Perfil.objects.none()
        elif role == 'RESPONSABLE_DEPTO':
            if perfil_user and perfil_user.depto:
                queryset = Perfil.objects.filter(depto=perfil_user.depto)
                area_objetivo = perfil_user.area
            else:
                queryset = Perfil.objects.none()
        else:
            # Trabajador/Estudiante solo se ve a sí mismo
            queryset = Perfil.objects.filter(usuario=user)
            if perfil_user:
                area_objetivo = perfil_user.area

        # Verificar si el potencial de esta área ya fue aprobado (RN-04)
        aprobado = False
        aprobado_info = None
        if periodo and area_objetivo:
            aprobacion = AprobacionPotencialArea.objects.filter(periodo=periodo, area=area_objetivo).first()
            if aprobacion and aprobacion.aprobado:
                aprobado = True
                aprobado_info = {
                    "aprobado_por": aprobacion.aprobado_por.get_full_name() if aprobacion.aprobado_por else "Administrador",
                    "fecha_aprobacion": aprobacion.fecha_aprobacion
                }

        serializer = PotencialPersonaSerializer(queryset, many=True, context={'request': request})
        total = queryset.count()
        comprometidos_count = queryset.filter(comprometido=True).count()
        pendientes_count = total - comprometidos_count

        return Response({
            "periodo": PeriodoGuardiaSerializer(periodo).data if periodo else None,
            "area": area_objetivo.nombre if area_objetivo else "Todas las Áreas",
            "aprobado": aprobado,
            "aprobado_info": aprobado_info,
            "total_potencial": total,
            "comprometidos_count": comprometidos_count,
            "pendientes_count": pendientes_count,
            "resultados": serializer.data
        })

    @action(detail=False, methods=['post'], url_path='aprobar')
    def aprobar(self, request):
        """
        RN-04 & RF-0503: Cierre irreversible del potencial por parte del responsable de área.
        Solo el SUPERADMIN puede revertir la aprobación.
        """
        user = request.user
        role = getattr(user, 'role', 'TRABAJADOR')

        if role not in ['SUPERADMIN', 'RESPONSABLE_AREA']:
            return Response(
                {"error": "No tiene permisos para aprobar el potencial de guardia."},
                status=status.HTTP_403_FORBIDDEN
            )

        periodo_id = request.data.get('periodo_id')
        periodo = PeriodoGuardia.objects.filter(id=periodo_id).first() if periodo_id else PeriodoGuardia.objects.filter(activo=True).first()
        if not periodo:
            return Response({"error": "No existe un período activo."}, status=status.HTTP_400_BAD_REQUEST)

        # Determinar área a aprobar
        area_id = request.data.get('area_id')
        if role == 'SUPERADMIN' and area_id:
            area = Area.objects.filter(id=area_id).first()
        else:
            perfil = getattr(user, 'perfil', None)
            area = perfil.area if perfil else None

        if not area:
            return Response({"error": "No se pudo determinar el área a aprobar."}, status=status.HTTP_400_BAD_REQUEST)

        aprobacion, _ = AprobacionPotencialArea.objects.get_or_create(periodo=periodo, area=area)

        # Si ya estaba aprobado y el usuario no es SUPERADMIN, aplicar RN-04 (bloqueo irreversible)
        desbloquear = request.data.get('desbloquear', False)
        if aprobacion.aprobado:
            if role != 'SUPERADMIN':
                return Response(
                    {"error": "RN-04: El potencial de este área ya fue aprobado y cerrado. Solo el SUPERADMIN puede desbloquearlo."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if desbloquear:
                aprobacion.aprobado = False
                aprobacion.save()
                return Response({"mensaje": f"Potencial del área {area.nombre} desbloqueado exitosamente por Superadmin."})

        aprobacion.aprobado = True
        aprobacion.aprobado_por = user
        aprobacion.fecha_aprobacion = timezone.now()
        aprobacion.save()

        return Response({
            "mensaje": f"RN-04: Potencial del área '{area.nombre}' aprobado y bloqueado con éxito.",
            "area": area.nombre,
            "aprobado": True,
            "fecha_aprobacion": aprobacion.fecha_aprobacion
        })

    @action(detail=False, methods=['post'], url_path='asignar-lote')
    def asignar_lote(self, request):
        """
        RF-0502: Asignación por lote para incluir masivamente trabajadores/estudiantes pendientes.
        """
        user = request.user
        role = getattr(user, 'role', 'TRABAJADOR')
        if role not in ['SUPERADMIN', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPTO']:
            return Response({"error": "No tiene permisos para asignar potencial."}, status=status.HTTP_403_FORBIDDEN)

        perfiles_ids = request.data.get('perfiles_ids', [])
        if not perfiles_ids:
            return Response({"error": "Debe seleccionar al menos un usuario."}, status=status.HTTP_400_BAD_REQUEST)

        periodo_id = request.data.get('periodo_id')
        periodo = PeriodoGuardia.objects.filter(id=periodo_id).first() if periodo_id else PeriodoGuardia.objects.filter(activo=True).first()
        if not periodo:
            return Response({"error": "Período no encontrado."}, status=status.HTTP_400_BAD_REQUEST)

        sede_id = request.data.get('sede_id')
        sede = Sede.objects.filter(id=sede_id).first() if sede_id else Sede.objects.filter(activo=True).first()
        tipo_turno = request.data.get('tipo_turno', 'Diurna')
        tipo_dia = request.data.get('tipo_dia', 'Semana')

        perfiles = Perfil.objects.filter(id__in=perfiles_ids)
        
        # RN-04: Validar si alguna de las áreas está bloqueada
        for p in perfiles:
            if p.area and role != 'SUPERADMIN':
                aprobacion = AprobacionPotencialArea.objects.filter(periodo=periodo, area=p.area, aprobado=True).first()
                if aprobacion:
                    return Response(
                        {"error": f"RN-04: El potencial del área '{p.area.nombre}' ya está cerrado y aprobado. No puede modificarse."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        actualizados = 0
        for p in perfiles:
            p.comprometido = True
            p.sedePref = sede
            p.tipoPref = tipo_turno
            p.diaPref = tipo_dia
            p.save()

            CompromisoGuardia.objects.update_or_create(
                perfil=p,
                periodo=periodo,
                defaults={
                    'sede': sede,
                    'tipo_turno': tipo_turno,
                    'tipo_dia': tipo_dia,
                    'es_estudiante': (p.tipo == 'ESTUDIANTE')
                }
            )
            actualizados += 1

        return Response({
            "mensaje": f"Se han incluido y asignado exitosamente {actualizados} personas al potencial.",
            "actualizados": actualizados
        })

    @action(detail=False, methods=['post'], url_path='incluir-manual')
    def incluir_manual(self, request):
        """
        RF-0502: Inclusión manual individual al potencial de guardia.
        """
        perfil_id = request.data.get('perfil_id')
        if not perfil_id:
            return Response({"error": "Debe especificar el perfil del usuario."}, status=status.HTTP_400_BAD_REQUEST)

        # Reutilizar lógica con array de un elemento
        request.data['perfiles_ids'] = [perfil_id]
        return self.asignar_lote(request)
