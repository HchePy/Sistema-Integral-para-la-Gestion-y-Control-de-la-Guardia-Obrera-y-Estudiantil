from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import AuditLog
from .models import Cargo, Contrato, Sede, Area, Departamento, Perfil, ConfiguracionReglaGuardia

User = get_user_model()

class AuditLogSerializer(serializers.ModelSerializer):
    usuario_username = serializers.SerializerMethodField()
    usuario_nombre = serializers.SerializerMethodField()
    usuario_rol = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'usuario', 'usuario_username', 'usuario_nombre', 'usuario_rol',
            'accion', 'modelo', 'objeto_id', 'detalle', 'ip_address', 'fecha'
        ]

    def get_usuario_username(self, obj):
        return obj.usuario.username if obj.usuario else 'sistema'

    def get_usuario_nombre(self, obj):
        if obj.usuario:
            return obj.usuario.get_full_name() or obj.usuario.username
        return 'Sistema Automático UHO'

    def get_usuario_rol(self, obj):
        return getattr(obj.usuario, 'role', 'SISTEMA') if obj.usuario else 'SISTEMA'

class CustomUserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role')

class CargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
        fields = '__all__'

class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = '__all__'

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = '__all__'

class AreaSerializer(serializers.ModelSerializer):
    deptoCount = serializers.SerializerMethodField()
    responsable_info = serializers.SerializerMethodField()

    class Meta:
        model = Area
        fields = '__all__'

    def get_deptoCount(self, obj):
        return obj.departamentos.filter(activo=True).count()

    def get_responsable_info(self, obj):
        if obj.responsable:
            return {
                "id": obj.responsable.id,
                "first_name": obj.responsable.first_name,
                "last_name": obj.responsable.last_name,
                "email": obj.responsable.email
            }
        return None

class DepartamentoSerializer(serializers.ModelSerializer):
    areaPadre_nombre = serializers.ReadOnlyField(source='areaPadre.nombre')
    responsable_info = serializers.SerializerMethodField()
    trabajadoresCount = serializers.SerializerMethodField()

    class Meta:
        model = Departamento
        fields = '__all__'

    def get_trabajadoresCount(self, obj):
        return obj.integrantes.filter(activo=True).count()

    def get_responsable_info(self, obj):
        if obj.responsable:
            return {
                "id": obj.responsable.id,
                "first_name": obj.responsable.first_name,
                "last_name": obj.responsable.last_name,
                "email": obj.responsable.email
            }
        return None

class PerfilSerializer(serializers.ModelSerializer):
    cargo = serializers.PrimaryKeyRelatedField(queryset=Cargo.objects.all(), required=False, allow_null=True)
    contrato = serializers.PrimaryKeyRelatedField(queryset=Contrato.objects.all(), required=False, allow_null=True)
    area = serializers.PrimaryKeyRelatedField(queryset=Area.objects.all(), required=False, allow_null=True)
    depto = serializers.PrimaryKeyRelatedField(queryset=Departamento.objects.all(), required=False, allow_null=True)
    sedePref = serializers.PrimaryKeyRelatedField(queryset=Sede.objects.all(), required=False, allow_null=True)
    usuario = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Perfil
        fields = '__all__'

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['usuario_info'] = CustomUserMiniSerializer(instance.usuario).data
        rep['cargo_info'] = CargoSerializer(instance.cargo).data if instance.cargo else None
        rep['contrato_info'] = ContratoSerializer(instance.contrato).data if instance.contrato else None
        rep['area_info'] = AreaSerializer(instance.area).data if instance.area else None
        rep['depto_info'] = DepartamentoSerializer(instance.depto).data if instance.depto else None
        rep['sedePref_info'] = SedeSerializer(instance.sedePref).data if instance.sedePref else None
        return rep


class ConfiguracionReglaGuardiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionReglaGuardia
        fields = '__all__'

