from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime
from .models import DistribucionArea, AsignacionGuardia
from .serializers import DistribucionAreaSerializer, AsignacionGuardiaSerializer
from modules.guardia_admin.models import Perfil, Area, Departamento
from modules.potencial.models import PeriodoGuardia, AprobacionPotencialArea
from core.rbac import (
    HasRole, ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD,
    ROLE_RESPONSABLE_AREA, ROLE_RESPONSABLE_DEPARTAMENTO
)

class DistribucionAreaViewSet(viewsets.ModelViewSet):
    """
    CRUD para la Distribución de días de guardia a nivel de Área/Departamento (RF-0601, RF-0602).
    Aplica RN-06 (flag de estudiantes) y RN-07 (mínimos de sede).
    """
    queryset = DistribucionArea.objects.select_related('periodo', 'area', 'departamento', 'sede').prefetch_related('asignaciones').all()
    serializer_class = DistribucionAreaSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Solo SUPERADMIN, JEFE_SEGURIDAD y RESPONSABLE_AREA pueden crear/modificar distribuciones
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), HasRole.for_roles(ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA)()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', '')
        qs = super().get_queryset()

        # Filtrar por parámetros de consulta
        periodo_id = self.request.query_params.get('periodo_id')
        if periodo_id:
            qs = qs.filter(periodo_id=periodo_id)
        else:
            # Por defecto al período activo si no se indica otro
            periodo_activo = PeriodoGuardia.objects.filter(activo=True).first()
            if periodo_activo and not self.request.query_params.get('todos'):
                qs = qs.filter(periodo=periodo_activo)

        area_id = self.request.query_params.get('area_id')
        if area_id:
            qs = qs.filter(area_id=area_id)
        elif role == ROLE_RESPONSABLE_AREA and hasattr(user, 'perfil') and user.perfil.area_id:
            qs = qs.filter(area_id=user.perfil.area_id)
        elif role == ROLE_RESPONSABLE_DEPARTAMENTO and hasattr(user, 'perfil') and user.perfil.departamento_id:
            qs = qs.filter(departamento_id=user.perfil.departamento_id)

        mes = self.request.query_params.get('mes')
        if mes:
            qs = qs.filter(mes=mes)

        return qs


class AsignacionGuardiaViewSet(viewsets.ModelViewSet):
    """
    Asignación nominal de personas a fechas de guardia (RF-0603).
    Aplica RN-05 (Potencial Aprobado).
    """
    queryset = AsignacionGuardia.objects.select_related(
        'distribucion', 'distribucion__area', 'distribucion__departamento',
        'distribucion__sede', 'perfil', 'perfil__usuario'
    ).all()
    serializer_class = AsignacionGuardiaSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Responsables y Administradores pueden asignar
        if self.action in ['create', 'destroy', 'update', 'partial_update', 'asignar_lote']:
            return [IsAuthenticated(), HasRole.for_roles(
                ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA, ROLE_RESPONSABLE_DEPARTAMENTO
            )()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        fecha = self.request.query_params.get('fecha')
        if fecha:
            qs = qs.filter(fecha=fecha)

        distribucion_id = self.request.query_params.get('distribucion_id')
        if distribucion_id:
            qs = qs.filter(distribucion_id=distribucion_id)

        area_id = self.request.query_params.get('area_id')
        if area_id:
            qs = qs.filter(distribucion__area_id=area_id)

        mes = self.request.query_params.get('mes')
        if mes:
            qs = qs.filter(distribucion__mes=mes)

        perfil_id = self.request.query_params.get('perfil_id')
        if perfil_id:
            qs = qs.filter(perfil_id=perfil_id)

        return qs

    @action(detail=False, methods=['post'], url_path='asignar-lote')
    def asignar_lote(self, request):
        """
        Asigna masivamente un conjunto de personas a fechas específicas dentro de una distribución.
        Payload esperado:
        {
            "distribucion_id": 1,
            "asignaciones": [
                {"perfil_id": 3, "fecha": "2026-06-07"},
                {"perfil_id": 4, "fecha": "2026-06-14"}
            ]
        }
        """
        distribucion_id = request.data.get('distribucion_id')
        asignaciones_data = request.data.get('asignaciones', [])

        if not distribucion_id or not asignaciones_data:
            return Response(
                {"error": "Debe especificar 'distribucion_id' y la lista 'asignaciones'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        distribucion = DistribucionArea.objects.filter(id=distribucion_id).first()
        if not distribucion:
            return Response({"error": "Distribución no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        creados = []
        errores = []

        for item in asignaciones_data:
            perfil_id = item.get('perfil_id')
            fecha_str = item.get('fecha')
            try:
                fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
                asig, created = AsignacionGuardia.objects.get_or_create(
                    distribucion=distribucion,
                    perfil_id=perfil_id,
                    fecha=fecha
                )
                creados.append(asig.id)
            except Exception as e:
                errores.append(f"Error asignando perfil {perfil_id} a {fecha_str}: {str(e)}")

        return Response({
            "mensaje": f"{len(creados)} asignaciones procesadas correctamente.",
            "asignaciones_ids": creados,
            "errores": errores
        }, status=status.HTTP_201_CREATED if creados else status.HTTP_400_BAD_REQUEST)


class GuardiasDelDiaView(APIView):
    """
    Listado del personal de guardia asignado a una fecha específica (RF-0604, RF-0701).
    Incluye datos de contacto completos para la coordinación operativa.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha_str = request.query_params.get('fecha')
        if fecha_str:
            try:
                fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Formato de fecha inválido. Utilice AAAA-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            fecha = timezone.now().date()

        asignaciones = AsignacionGuardia.objects.filter(fecha=fecha).select_related(
            'distribucion', 'distribucion__area', 'distribucion__departamento',
            'distribucion__sede', 'perfil', 'perfil__usuario', 'perfil__cargo'
        )

        resultados = []
        for a in asignaciones:
            usuario = a.perfil.usuario
            control = getattr(a, 'control', None)
            
            # RN-10: CI enmascarado si no es Superadmin o el usuario
            ci_mostrar = a.perfil.ci
            if not request.user.is_superuser and getattr(request.user, 'role', '') != ROLE_SUPERADMIN and request.user.id != usuario.id:
                ci_mostrar = "######-####"

            resultados.append({
                "id": a.id,
                "asignacion_id": a.id,
                "personaId": a.perfil.id,
                "nombre": usuario.get_full_name() or usuario.username,
                "ci": ci_mostrar,
                "tipo": a.perfil.tipo,
                "cargo": a.perfil.cargo.nombre if a.perfil.cargo else "No especificado",
                "area": a.distribucion.area.nombre,
                "depto": a.distribucion.departamento.nombre if a.distribucion.departamento else a.distribucion.area.nombre,
                "sede": a.distribucion.sede.nombre,
                "tipoGuardia": a.distribucion.tipo_turno,
                "fecha": str(a.fecha),
                "telefono": a.perfil.telefono or "",
                "celular": a.perfil.celular or "",
                "whatsapp": a.perfil.whatsapp or "",
                "direccion": a.perfil.direccion or "",
                "referencia": a.perfil.referencia or "",
                "contactoNombre": a.perfil.contactoNombre or "",
                "contactoCelular": a.perfil.contactoCelular or "",
                "asistio": control.asistio if control else None,
                "evaluacion": control.evaluacion if control else "",
                "observaciones": control.observaciones if control else "",
                "tiene_control": control is not None
            })

        return Response({
            "fecha": str(fecha),
            "total_guardias": len(resultados),
            "guardias": resultados
        })


class CronogramaPersonalView(APIView):
    """
    Vista del Cronograma Anual Personal de Guardia del usuario autenticado (RF-0605).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        perfil = getattr(user, 'perfil', None)
        
        # Superadmin o responsables pueden consultar el cronograma de otra persona vía perfil_id
        perfil_id_param = request.query_params.get('perfil_id')
        if perfil_id_param and (user.is_superuser or getattr(user, 'role', '') in [ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA]):
            perfil = Perfil.objects.filter(id=perfil_id_param).first()

        if not perfil:
            return Response({"error": "Perfil de usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        año_param = request.query_params.get('año', 2026)
        asignaciones = AsignacionGuardia.objects.filter(
            perfil=perfil,
            fecha__year=año_param
        ).select_related('distribucion', 'distribucion__sede').order_by('fecha')

        cronograma = []
        for a in asignaciones:
            control = getattr(a, 'control', None)
            cronograma.append({
                "id": a.id,
                "fecha": str(a.fecha),
                "dia": a.fecha.day,
                "mes": a.fecha.month,
                "año": a.fecha.year,
                "sede": a.distribucion.sede.nombre,
                "tipo_turno": a.distribucion.tipo_turno,
                "asistio": control.asistio if control else None,
                "evaluacion": control.evaluacion if control else "",
                "observaciones": control.observaciones if control else ""
            })

        return Response({
            "perfil_id": perfil.id,
            "usuario": perfil.usuario.username,
            "nombre": perfil.usuario.get_full_name() or perfil.usuario.username,
            "año": int(año_param),
            "total_guardias": len(cronograma),
            "guardias": cronograma
        })
