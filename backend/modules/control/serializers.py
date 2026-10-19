from rest_framework import serializers
from .models import ControlGuardia, Notificacion
from modules.distribucion.models import AsignacionGuardia
from django.utils import timezone

class ControlGuardiaSerializer(serializers.ModelSerializer):
    """
    Serializador para el Control de Cumplimiento de Guardia (RF-0701, RF-0702).
    Aplica RN-09 y RN-10.
    """
    persona_nombre = serializers.SerializerMethodField()
    persona_ci = serializers.SerializerMethodField()
    persona_tipo = serializers.ReadOnlyField(source='asignacion.perfil.tipo')
    persona_telefono = serializers.SerializerMethodField()
    fecha_guardia = serializers.ReadOnlyField(source='asignacion.fecha')
    area_nombre = serializers.ReadOnlyField(source='asignacion.distribucion.area.nombre')
    depto_nombre = serializers.ReadOnlyField(source='asignacion.distribucion.departamento.nombre')
    sede_nombre = serializers.ReadOnlyField(source='asignacion.distribucion.sede.nombre')
    tipo_turno = serializers.ReadOnlyField(source='asignacion.distribucion.tipo_turno')
    registrado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = ControlGuardia
        fields = [
            'id', 'asignacion', 'fecha_guardia', 'persona_nombre', 'persona_ci',
            'persona_tipo', 'persona_telefono', 'area_nombre', 'depto_nombre',
            'sede_nombre', 'tipo_turno', 'asistio', 'evaluacion', 'observaciones',
            'registrado_por', 'registrado_por_nombre', 'fecha_registro'
        ]

    def get_persona_nombre(self, obj):
        usuario = obj.asignacion.perfil.usuario
        return usuario.get_full_name() or usuario.username

    def get_persona_ci(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        ci = obj.asignacion.perfil.ci
        if not ci:
            return ""
        if user and (user.is_superuser or getattr(user, 'role', '') == 'SUPERADMIN' or user.id == obj.asignacion.perfil.usuario_id):
            return ci
        return "######-####"

    def get_persona_telefono(self, obj):
        return obj.asignacion.perfil.celular or obj.asignacion.perfil.telefono or "No registrado"

    def get_registrado_por_nombre(self, obj):
        if obj.registrado_por:
            return obj.registrado_por.get_full_name() or obj.registrado_por.username
        return "Sistema Automático"

    def validate(self, data):
        asistio = data.get('asistio', getattr(self.instance, 'asistio', True))
        evaluacion = data.get('evaluacion', getattr(self.instance, 'evaluacion', ''))

        # RN-09: Si no asistió, la evaluación debe quedar en blanco obligatoriamente
        if not asistio:
            data['evaluacion'] = ''
        elif evaluacion and evaluacion not in ['B', 'R', 'M']:
            raise serializers.ValidationError({
                'evaluacion': "Evaluación inválida. Los valores permitidos según RN-09 son 'B' (Bien), 'R' (Regular) o 'M' (Mal)."
            })

        return data


class NotificacionSerializer(serializers.ModelSerializer):
    """
    Serializador de Notificaciones Internas (RF-0901 a RF-0905).
    """
    usuario_username = serializers.ReadOnlyField(source='usuario.username')
    tiempo_relativo = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = [
            'id', 'usuario', 'usuario_username', 'titulo', 'mensaje',
            'tipo', 'leido', 'fecha_envio', 'tiempo_relativo'
        ]

    def get_tiempo_relativo(self, obj):
        ahora = timezone.now()
        dif = ahora - obj.fecha_envio
        segundos = int(dif.total_seconds())

        if segundos < 60:
            return "Hace unos momentos"
        elif segundos < 3600:
            minutos = segundos // 60
            return f"Hace {minutos} min"
        elif segundos < 86400:
            horas = segundos // 3600
            return f"Hace {horas} hora{'s' if horas > 1 else ''}"
        else:
            dias = segundos // 86400
            if dias == 1:
                return "Ayer"
            return f"Hace {dias} días"
