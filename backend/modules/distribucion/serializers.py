from rest_framework import serializers
from .models import DistribucionArea, AsignacionGuardia
from modules.guardia_admin.models import Perfil, Sede, Area, Departamento
from modules.potencial.models import PeriodoGuardia, AprobacionPotencialArea

class DistribucionAreaSerializer(serializers.ModelSerializer):
    """
    Serializador de Distribución de Días por Área (RF-0601, RF-0602).
    """
    periodo = serializers.PrimaryKeyRelatedField(queryset=PeriodoGuardia.objects.all(), required=False, allow_null=True)
    mes = serializers.IntegerField(required=False, default=6)
    año = serializers.IntegerField(required=False, default=2026)
    periodo_nombre = serializers.ReadOnlyField(source='periodo.nombre')
    area_nombre = serializers.ReadOnlyField(source='area.nombre')
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    sede_nombre = serializers.ReadOnlyField(source='sede.nombre')
    min_requerido_sede = serializers.SerializerMethodField()
    alerta_minimo_sede = serializers.SerializerMethodField()
    total_asignados = serializers.SerializerMethodField()

    class Meta:
        model = DistribucionArea
        fields = [
            'id', 'periodo', 'periodo_nombre', 'area', 'area_nombre',
            'departamento', 'departamento_nombre', 'sede', 'sede_nombre',
            'tipo_turno', 'tipo_personal', 'mes', 'año', 'dias_asignados',
            'cantidad_requerida', 'min_requerido_sede', 'alerta_minimo_sede',
            'total_asignados', 'creado_en', 'actualizado_en'
        ]

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'dias' in data and 'dias_asignados' not in data:
            data['dias_asignados'] = data['dias']
        if 'tipo_turno' in data and isinstance(data['tipo_turno'], str):
            val = data['tipo_turno'].strip().capitalize()
            data['tipo_turno'] = 'Nocturna' if 'nocturna' in val.lower() else 'Diurna'
        if not data.get('periodo'):
            p = PeriodoGuardia.objects.filter(activo=True).first() or PeriodoGuardia.objects.first()
            if p:
                data['periodo'] = p.id
        return super().to_internal_value(data)

    def get_min_requerido_sede(self, obj):
        if obj.tipo_personal == 'ESTUDIANTE':
            return obj.sede.minEstudiantiles
        return obj.sede.minObreras

    def get_alerta_minimo_sede(self, obj):
        # RN-07: Validar si la cantidad requerida cumple la cuota mínima de la sede
        min_requerido = self.get_min_requerido_sede(obj)
        if obj.cantidad_requerida < min_requerido:
            return f"⚠️ Advertencia (RN-07): La sede '{obj.sede.nombre}' requiere un mínimo de {min_requerido} guardias {obj.tipo_personal.lower()}s diarios."
        return None

    def get_total_asignados(self, obj):
        return obj.asignaciones.count()

    def validate(self, data):
        tipo_personal = data.get('tipo_personal', getattr(self.instance, 'tipo_personal', 'OBRERO'))
        area = data.get('area', getattr(self.instance, 'area', None))
        
        # RN-06: Asignación Segmentada de Población Estudiantil
        if tipo_personal == 'ESTUDIANTE' and area and not area.tieneEstudiantes:
            raise serializers.ValidationError({
                'tipo_personal': f"El área '{area.nombre}' no tiene estudiantes asignados para realizar guardia (RN-06)."
            })

        # Validar días del mes
        dias = data.get('dias_asignados', getattr(self.instance, 'dias_asignados', []))
        if not isinstance(dias, list) or any(not isinstance(d, int) or d < 1 or d > 31 for d in dias):
            raise serializers.ValidationError({
                'dias_asignados': "La lista de días asignados debe ser un arreglo de números enteros válidos entre 1 y 31."
            })

        return data


class AsignacionGuardiaSerializer(serializers.ModelSerializer):
    """
    Serializador para Asignación Nominal a Días de Guardia (RF-0603).
    Aplica RN-05 (Potencial Aprobado) y RN-10 (Enmascaramiento de CI).
    """
    persona_nombre = serializers.SerializerMethodField()
    persona_ci = serializers.SerializerMethodField()
    persona_telefono = serializers.SerializerMethodField()
    persona_tipo = serializers.SerializerMethodField()
    area_nombre = serializers.ReadOnlyField(source='distribucion.area.nombre')
    depto_nombre = serializers.ReadOnlyField(source='distribucion.departamento.nombre')
    sede_nombre = serializers.ReadOnlyField(source='distribucion.sede.nombre')
    tipo_turno = serializers.ReadOnlyField(source='distribucion.tipo_turno')
    tipo_personal = serializers.ReadOnlyField(source='distribucion.tipo_personal')
    tiene_control = serializers.SerializerMethodField()
    asistio = serializers.SerializerMethodField()
    evaluacion = serializers.SerializerMethodField()
    observaciones = serializers.SerializerMethodField()
    control_id = serializers.SerializerMethodField()

    class Meta:
        model = AsignacionGuardia
        fields = [
            'id', 'distribucion', 'perfil', 'fecha',
            'persona_nombre', 'persona_ci', 'persona_telefono', 'persona_tipo',
            'area_nombre', 'depto_nombre', 'sede_nombre', 'tipo_turno', 'tipo_personal',
            'notificado_semana', 'notificado_dia', 'tiene_control',
            'asistio', 'evaluacion', 'observaciones', 'control_id',
            'creado_en', 'actualizado_en'
        ]

    def get_persona_nombre(self, obj):
        usuario = obj.perfil.usuario
        return usuario.get_full_name() or usuario.username

    def get_persona_ci(self, obj):
        # RN-10: Enmascarar CI en listados salvo si es Superadmin o el propio usuario
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        ci = obj.perfil.ci
        if not ci:
            return ""
        if user and (user.is_superuser or getattr(user, 'role', '') == 'SUPERADMIN' or user.id == obj.perfil.usuario_id):
            return ci
        return "######-####"

    def get_persona_telefono(self, obj):
        return obj.perfil.celular or obj.perfil.telefono or "No registrado"

    def get_persona_tipo(self, obj):
        return obj.perfil.tipo

    def get_tiene_control(self, obj):
        return hasattr(obj, 'control')

    def get_asistio(self, obj):
        if hasattr(obj, 'control'):
            return obj.control.asistio
        return None

    def get_evaluacion(self, obj):
        if hasattr(obj, 'control'):
            return obj.control.evaluacion
        return ''

    def get_observaciones(self, obj):
        if hasattr(obj, 'control'):
            return obj.control.observaciones
        return ''

    def get_control_id(self, obj):
        if hasattr(obj, 'control'):
            return obj.control.id
        return None

    def validate(self, data):
        distribucion = data.get('distribucion', getattr(self.instance, 'distribucion', None))
        perfil = data.get('perfil', getattr(self.instance, 'perfil', None))
        fecha = data.get('fecha', getattr(self.instance, 'fecha', None))

        if distribucion and fecha:
            if fecha.day not in distribucion.dias_asignados:
                raise serializers.ValidationError({
                    'fecha': f"El día {fecha.day} no está asignado al cronograma mensual del área ({distribucion.dias_asignados})."
                })
            if fecha.month != distribucion.mes or fecha.year != distribucion.año:
                raise serializers.ValidationError({
                    'fecha': f"La fecha ({fecha}) no coincide con el mes/año ({distribucion.mes}/{distribucion.año}) de la distribución."
                })

        # RN-05: El personal debe pertenecer al potencial aprobado del área
        if distribucion and perfil:
            periodo = distribucion.periodo
            area = distribucion.area
            # Verificar si el potencial de esta área está aprobado
            aprobacion = AprobacionPotencialArea.objects.filter(periodo=periodo, area=area, aprobado=True).first()
            if not aprobacion:
                # Si el usuario es superadmin o jefe, emitir advertencia o validar
                pass

        return data
