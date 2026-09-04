from rest_framework import serializers
from .models import CompromisoGuardia
from modules.guardia_admin.models import Sede, Perfil
from modules.potencial.models import PeriodoGuardia

class CompromisoGuardiaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.SerializerMethodField()
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True)
    periodo_nombre = serializers.CharField(source='periodo.nombre', read_only=True)

    class Meta:
        model = CompromisoGuardia
        fields = [
            'id',
            'perfil',
            'usuario_nombre',
            'periodo',
            'periodo_nombre',
            'sede',
            'sede_nombre',
            'tipo_turno',
            'tipo_dia',
            'es_estudiante',
            'fecha_firma',
            'creado_en',
            'actualizado_en',
        ]
        read_only_fields = ['id', 'fecha_firma', 'creado_en', 'actualizado_en']

    def get_usuario_nombre(self, obj):
        return obj.perfil.usuario.get_full_name() or obj.perfil.usuario.username

    def validate(self, data):
        perfil = data.get('perfil') or (self.instance.perfil if self.instance else None)
        es_estudiante = data.get('es_estudiante', False)
        
        # RN-06: Guardia Estudiantil restringida a áreas/departamentos con tieneEstudiantes=True
        if es_estudiante and perfil and perfil.area:
            if not perfil.area.tieneEstudiantes:
                raise serializers.ValidationError(
                    "RN-06: El área del estudiante no tiene habilitada la guardia estudiantil."
                )

        return data
