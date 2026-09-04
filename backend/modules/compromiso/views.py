from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.utils import timezone
from .models import CompromisoGuardia
from .serializers import CompromisoGuardiaSerializer
from modules.guardia_admin.models import Perfil, Sede
from modules.potencial.models import PeriodoGuardia

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "modulo": "Compromiso de Guardia",
            "mensaje": "Módulo de Compromiso activo (Hito 3).",
            "usuario": request.user.username,
            "rol": getattr(request.user, 'role', 'TRABAJADOR'),
            "estado": "Hito 3 Operativo"
        })

class CompromisoViewSet(viewsets.ModelViewSet):
    """
    Controlador para el registro, consulta y firma de compromisos (RF-0301 a RF-0403).
    """
    queryset = CompromisoGuardia.objects.all()
    serializer_class = CompromisoGuardiaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', 'TRABAJADOR')
        
        # Superadmin y Jefes de Seguridad ven todo
        if role in ['SUPERADMIN', 'JEFE_SEGURIDAD']:
            return CompromisoGuardia.objects.all()
            
        # Responsable de Área ve los compromisos de su Área
        if role == 'RESPONSABLE_AREA':
            perfil = getattr(user, 'perfil', None)
            if perfil and perfil.area:
                return CompromisoGuardia.objects.filter(perfil__area=perfil.area)
            return CompromisoGuardia.objects.none()

        # Responsable de Depto ve los de su departamento
        if role == 'RESPONSABLE_DEPTO':
            perfil = getattr(user, 'perfil', None)
            if perfil and perfil.depto:
                return CompromisoGuardia.objects.filter(perfil__depto=perfil.depto)
            return CompromisoGuardia.objects.none()

        # Trabajador / Estudiante ven únicamente el suyo
        return CompromisoGuardia.objects.filter(perfil__usuario=user)

    @action(detail=False, methods=['post'], url_path='firmar')
    def firmar(self, request):
        """
        Firma o actualiza el compromiso del usuario autenticado (RF-0301, RF-0302, RF-0401, RF-0402).
        """
        user = request.user
        perfil = getattr(user, 'perfil', None)
        if not perfil:
            return Response(
                {"error": "El usuario no tiene un perfil asociado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        periodo_id = request.data.get('periodo_id')
        if periodo_id:
            try:
                periodo = PeriodoGuardia.objects.get(id=periodo_id)
            except PeriodoGuardia.DoesNotExist:
                return Response({"error": "Período no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Buscar período activo por defecto
            periodo = PeriodoGuardia.objects.filter(activo=True).first()
            if not periodo:
                return Response(
                    {"error": "No existe un período de guardia activo configurado."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        sede_id = request.data.get('sede_id')
        if not sede_id:
            # Si no viene sede, tomar la que tenía en perfil o la primera activa
            sede = perfil.sedePref or Sede.objects.filter(activo=True).first()
        else:
            try:
                sede = Sede.objects.get(id=sede_id)
            except Sede.DoesNotExist:
                return Response({"error": "Sede no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        tipo_turno = request.data.get('tipo_turno', perfil.tipoPref or 'Diurna')
        tipo_dia = request.data.get('tipo_dia', perfil.diaPref or 'Semana')
        
        # Identificar si es estudiante
        es_estudiante = (perfil.tipo == 'ESTUDIANTE') or (getattr(user, 'role', '') == 'ESTUDIANTE')
        if request.data.get('es_estudiante') is not None:
            es_estudiante = bool(request.data.get('es_estudiante'))

        # RN-06: Validar si es estudiante que el área admita estudiantes
        if es_estudiante and perfil.area and not perfil.area.tieneEstudiantes:
            return Response(
                {"error": "RN-06: Su área universitaria no tiene habilitada la guardia estudiantil."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear o actualizar compromiso (RF-0302 / RF-0303 / RF-0403)
        compromiso, created = CompromisoGuardia.objects.update_or_create(
            perfil=perfil,
            periodo=periodo,
            defaults={
                'sede': sede,
                'tipo_turno': tipo_turno,
                'tipo_dia': tipo_dia,
                'es_estudiante': es_estudiante,
            }
        )

        serializer = self.get_serializer(compromiso)
        return Response({
            "mensaje": "Compromiso firmado y guardado exitosamente." if created else "Compromiso actualizado con éxito.",
            "compromiso": serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
