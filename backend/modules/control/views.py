from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime, timedelta
from .models import ControlGuardia, Notificacion
from .serializers import ControlGuardiaSerializer, NotificacionSerializer
from modules.distribucion.models import AsignacionGuardia
from modules.guardia_admin.models import Perfil
from core.rbac import (
    HasRole, ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD,
    ROLE_RESPONSABLE_AREA, ROLE_RESPONSABLE_DEPARTAMENTO
)

class ControlGuardiaViewSet(viewsets.ModelViewSet):
    """
    Gestión del Control Diario y Evaluaciones de Guardia (RF-0701, RF-0702).
    Aplica RN-09 (Evaluaciones B/R/M y ausencias).
    """
    queryset = ControlGuardia.objects.select_related(
        'asignacion', 'asignacion__perfil', 'asignacion__perfil__usuario',
        'asignacion__distribucion', 'asignacion__distribucion__area',
        'asignacion__distribucion__departamento', 'asignacion__distribucion__sede',
        'registrado_por'
    ).all()
    serializer_class = ControlGuardiaSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Solo personal con roles de control y administración puede registrar/modificar
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'guardar_lote_diario']:
            return [IsAuthenticated(), HasRole.for_roles(
                ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA, ROLE_RESPONSABLE_DEPARTAMENTO
            )()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        fecha = self.request.query_params.get('fecha')
        if fecha:
            qs = qs.filter(asignacion__fecha=fecha)

        area_id = self.request.query_params.get('area_id')
        if area_id:
            qs = qs.filter(asignacion__distribucion__area_id=area_id)

        asistio = self.request.query_params.get('asistio')
        if asistio is not None:
            qs = qs.filter(asistio=asistio.lower() in ['true', '1'])

        evaluacion = self.request.query_params.get('evaluacion')
        if evaluacion:
            qs = qs.filter(evaluacion=evaluacion.upper())

        return qs

    def perform_create(self, serializer):
        serializer.save(registrado_por=self.request.user)

    @action(detail=False, methods=['post'], url_path='guardar-lote-diario')
    def guardar_lote_diario(self, request):
        """
        Guarda o actualiza en bloque las asistencias y evaluaciones del control diario.
        Payload esperado:
        {
            "fecha": "2026-06-07",
            "registros": [
                {
                    "asignacion_id": 1,
                    "asistio": true,
                    "evaluacion": "B",
                    "observaciones": "Cumplió correctamente"
                },
                {
                    "asignacion_id": 2,
                    "asistio": false,
                    "evaluacion": "",
                    "observaciones": "Ausencia injustificada"
                }
            ]
        }
        """
        registros = request.data.get('registros', [])
        if not registros:
            return Response({"error": "No se enviaron registros de asistencia para guardar."}, status=status.HTTP_400_BAD_REQUEST)

        procesados = []
        errores = []

        for item in registros:
            asignacion_id = item.get('asignacion_id')
            asistio = item.get('asistio', True)
            evaluacion = item.get('evaluacion', '')
            observaciones = item.get('observaciones', '')

            # RN-09: Si no asistió, evaluación forzada a ''
            if not asistio:
                evaluacion = ''

            try:
                asignacion = AsignacionGuardia.objects.filter(id=asignacion_id).first()
                if not asignacion:
                    errores.append(f"Asignación con ID {asignacion_id} no encontrada.")
                    continue

                control, created = ControlGuardia.objects.update_or_create(
                    asignacion=asignacion,
                    defaults={
                        'asistio': asistio,
                        'evaluacion': evaluacion,
                        'observaciones': observaciones,
                        'registrado_por': request.user
                    }
                )
                procesados.append(control.id)
            except Exception as e:
                errores.append(f"Error procesando asignación {asignacion_id}: {str(e)}")

        return Response({
            "mensaje": f"{len(procesados)} registros de control diario guardados exitosamente.",
            "total_procesados": len(procesados),
            "errores": errores
        }, status=status.HTTP_200_OK if procesados else status.HTTP_400_BAD_REQUEST)


class HistorialCumplimientoView(APIView):
    """
    Consulta consolidada de cumplimiento e historial de guardia (RF-0703).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = ControlGuardia.objects.select_related(
            'asignacion', 'asignacion__perfil', 'asignacion__perfil__usuario',
            'asignacion__distribucion', 'asignacion__distribucion__area',
            'asignacion__distribucion__sede'
        ).all()

        perfil_id = request.query_params.get('perfil_id')
        if perfil_id:
            qs = qs.filter(asignacion__perfil_id=perfil_id)

        area_id = request.query_params.get('area_id')
        if area_id:
            qs = qs.filter(asignacion__distribucion__area_id=area_id)

        mes = request.query_params.get('mes')
        if mes:
            qs = qs.filter(asignacion__fecha__month=mes)

        año = request.query_params.get('año')
        if año:
            qs = qs.filter(asignacion__fecha__year=año)

        total_asignadas = qs.count()
        total_asistidas = qs.filter(asistio=True).count()
        total_ausencias = qs.filter(asistio=False).count()
        eval_b = qs.filter(asistio=True, evaluacion='B').count()
        eval_r = qs.filter(asistio=True, evaluacion='R').count()
        eval_m = qs.filter(asistio=True, evaluacion='M').count()

        porcentaje_cumplimiento = round((total_asistidas / total_asignadas * 100), 1) if total_asignadas > 0 else 0

        serializer = ControlGuardiaSerializer(qs, many=True, context={'request': request})

        return Response({
            "resumen": {
                "total_asignadas": total_asignadas,
                "total_asistidas": total_asistidas,
                "total_ausencias": total_ausencias,
                "porcentaje_cumplimiento": porcentaje_cumplimiento,
                "calificaciones": {
                    "bien": eval_b,
                    "regular": eval_r,
                    "mal": eval_m
                }
            },
            "registros": serializer.data
        })


class NotificacionViewSet(viewsets.ModelViewSet):
    """
    Gestión de Notificaciones Internas para la campanita del Header (MOD-09, RF-0901 a RF-0905).
    """
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Cada usuario solo ve sus propias notificaciones
        return Notificacion.objects.filter(usuario=self.request.user).order_by('-fecha_envio')

    @action(detail=False, methods=['post'], url_path='marcar-todas-leidas')
    def marcar_todas_leidas(self, request):
        """
        Marca todas las notificaciones pendientes del usuario como leídas.
        """
        actualizadas = Notificacion.objects.filter(usuario=request.user, leido=False).update(leido=True)
        return Response({
            "mensaje": f"{actualizadas} notificaciones marcadas como leídas.",
            "actualizadas": actualizadas
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='marcar-leida')
    def marcar_una_leida(self, request, pk=None):
        notif = self.get_object()
        notif.leido = True
        notif.save()
        return Response({"mensaje": "Notificación marcada como leída.", "id": notif.id})

    @action(detail=False, methods=['post'], url_path='generar-alertas-automaticas')
    def generar_alertas_automaticas(self, request):
        """
        Ejecuta el motor de alertas institucionales (RN-08):
        - 7 días antes de la guardia: recordatorio semanal.
        - 24 horas antes: alerta urgente.
        """
        hoy = timezone.now().date()
        fecha_7_dias = hoy + timedelta(days=7)
        fecha_1_dia = hoy + timedelta(days=1)

        creadas = 0

        # 1. Alerta de 7 días
        asignaciones_7 = AsignacionGuardia.objects.filter(
            fecha=fecha_7_dias,
            notificado_semana=False
        ).select_related('perfil__usuario', 'distribucion__sede')

        for a in asignaciones_7:
            usuario = a.perfil.usuario
            sede_nom = a.distribucion.sede.nombre
            turno = a.distribucion.tipo_turno
            Notificacion.objects.create(
                usuario=usuario,
                titulo=f"📅 Recordatorio Semanal: Próxima Guardia ({a.fecha.strftime('%d/%m/%Y')})",
                mensaje=f"Tiene asignado turno de Guardia {turno} en la '{sede_nom}' el próximo {a.fecha.strftime('%d/%m/%Y')}.",
                tipo='RECORDATORIO'
            )
            a.notificado_semana = True
            a.save(update_fields=['notificado_semana'])
            creadas += 1

        # 2. Alerta de 24 horas (día anterior)
        asignaciones_1 = AsignacionGuardia.objects.filter(
            fecha=fecha_1_dia,
            notificado_dia=False
        ).select_related('perfil__usuario', 'distribucion__sede')

        for a in asignaciones_1:
            usuario = a.perfil.usuario
            sede_nom = a.distribucion.sede.nombre
            turno = a.distribucion.tipo_turno
            Notificacion.objects.create(
                usuario=usuario,
                titulo=f"⏰ Recordatorio Urgente: Guardia Mañana ({a.fecha.strftime('%d/%m/%Y')})",
                mensaje=f"Estimado(a) {usuario.first_name}, mañana le corresponde Guardia {turno} en '{sede_nom}'. Por favor confirmar asistencia con su responsable.",
                tipo='ALERTA'
            )
            a.notificado_dia = True
            a.save(update_fields=['notificado_dia'])
            creadas += 1

        return Response({
            "mensaje": f"Motor de alertas ejecutado con éxito. Se generaron {creadas} notificaciones institucionales (RN-08).",
            "notificaciones_creadas": creadas
        }, status=status.HTTP_200_OK)
