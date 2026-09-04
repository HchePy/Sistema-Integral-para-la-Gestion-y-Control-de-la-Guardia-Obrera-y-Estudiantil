from rest_framework import serializers
from datetime import date
from .models import PeriodoGuardia, AprobacionPotencialArea
from modules.guardia_admin.models import Perfil, Area

def calcular_edad_ci(ci_str):
    """
    RN-01: Cálculo de edad a partir de los primeros 6 dígitos del carné de identidad cubano (AAMMDD).
    Lógica de siglo: si el año > año actual en 2 dígitos, es siglo XX (19xx); de lo contrario siglo XXI (20xx).
    """
    if not ci_str or len(str(ci_str)) < 6:
        return None
    try:
        aa = int(str(ci_str)[0:2])
        mm = int(str(ci_str)[2:4])
        dd = int(str(ci_str)[4:6])

        today = date.today()
        current_year_two_digits = today.year % 100

        century = 1900 if aa > current_year_two_digits else 2000
        full_year = century + aa

        nacimiento = date(full_year, mm, dd)
        edad = today.year - nacimiento.year - ((today.month, today.day) < (nacimiento.month, nacimiento.day))
        return edad
    except Exception:
        return None

def enmascarar_ci(ci_str, is_authorized=False):
    """
    RN-10: Enmascaramiento de CI (######-####) para usuarios sin privilegios administrativos.
    """
    if not ci_str:
        return ""
    ci_str = str(ci_str)
    if is_authorized or len(ci_str) < 11:
        return ci_str
    # Formato enmascarado: 6 dígitos ocultos + últimos 4 visibles o viceversa
    return f"######-{ci_str[-4:]}"

class PeriodoGuardiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodoGuardia
        fields = [
            'id',
            'nombre',
            'inicio_compromiso',
            'fin_compromiso',
            'inicio_aprobacion',
            'fin_aprobacion',
            'activo',
            'creado_en',
            'actualizado_en',
        ]

class PotencialPersonaSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    ci_enmascarado = serializers.SerializerMethodField()
    edad = serializers.SerializerMethodField()
    contrato_nombre = serializers.CharField(source='contrato.nombre', read_only=True, default='')
    area_nombre = serializers.CharField(source='area.nombre', read_only=True, default='')
    depto_nombre = serializers.CharField(source='depto.nombre', read_only=True, default='')
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True, default='')
    sedePref_nombre = serializers.CharField(source='sedePref.nombre', read_only=True, default='')

    class Meta:
        model = Perfil
        fields = [
            'id',
            'usuario_id',
            'nombre_completo',
            'ci_enmascarado',
            'sexo',
            'edad',
            'tipo',
            'contrato',
            'contrato_nombre',
            'area',
            'area_nombre',
            'depto',
            'depto_nombre',
            'cargo',
            'cargo_nombre',
            'comprometido',
            'sedePref',
            'sedePref_nombre',
            'tipoPref',
            'diaPref',
            'telefono',
            'celular',
            'whatsapp',
        ]

    def get_nombre_completo(self, obj):
        return obj.usuario.get_full_name() or obj.usuario.username

    def get_ci_enmascarado(self, obj):
        request = self.context.get('request')
        is_authorized = False
        if request and request.user.is_authenticated:
            # RN-10: Visible únicamente para el propio usuario o SUPERADMIN
            if getattr(request.user, 'role', '') == 'SUPERADMIN' or request.user.id == obj.usuario_id:
                is_authorized = True
        return enmascarar_ci(obj.ci, is_authorized)

    def get_edad(self, obj):
        # RN-01: Cálculo automático de edad
        return calcular_edad_ci(obj.ci)
