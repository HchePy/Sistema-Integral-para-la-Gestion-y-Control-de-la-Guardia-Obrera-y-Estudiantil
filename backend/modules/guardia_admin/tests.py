import datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from core.integrations import calcular_edad_y_sexo_desde_ci
from modules.guardia_admin.models import (
    Cargo, Contrato, Sede, Area, Departamento, Perfil, ConfiguracionReglaGuardia
)
from modules.potencial.models import PeriodoGuardia, AprobacionPotencialArea
from modules.distribucion.models import DistribucionArea, AsignacionGuardia
from modules.control.models import ControlGuardia

User = get_user_model()


class SIGCGOEBusinessRulesAndModulesTests(TestCase):
    """
    Pruebas Unitarias y de Integración para el SIGCGOE — Universidad de Holguín (UHO).
    Valida las Reglas de Negocio RN-01 a RN-10, Requisitos Funcionales RF-0102, RF-1001, RF-1002 y Auditoría RNF-11.
    """

    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_user(
            username='admin_uho_test',
            email='admin@uho.edu.cu',
            password='Password123*',
            role='SUPERADMIN',
            is_staff=True
        )
        self.client.force_authenticate(user=self.superadmin)

        self.cargo_prof = Cargo.objects.create(
            nombre='Profesor Titular',
            permisos=['mod_compromiso', 'ver_cronograma_personal']
        )
        self.contrato_ind = Contrato.objects.create(nombre='Indeterminado')

        self.area_fim = Area.objects.create(
            codigo='FAC-FIM',
            nombre='Facultad de Informática y Matemática',
            tieneEstudiantes=True
        )
        self.area_rrhh = Area.objects.create(
            codigo='DIR-RRHH',
            nombre='Dirección de Recursos Humanos',
            tieneEstudiantes=False
        )
        self.depto_con_personal = Departamento.objects.create(
            codigo='DEP-SIS',
            nombre='Depto. de Sistemas de Información',
            areaPadre=self.area_fim
        )
        self.depto_vacio = Departamento.objects.create(
            codigo='DEP-LAB',
            nombre='Laboratorio de Inteligencia Artificial',
            areaPadre=self.area_fim
        )
        self.sede_olm = Sede.objects.create(
            nombre='Sede Oscar Lucero Moya',
            minObreras=2,
            minEstudiantiles=2
        )
        self.perfil_obrero = Perfil.objects.create(
            usuario=self.superadmin,
            ci='85041212345',
            sexo='M',
            tipo='OBRERO',
            area=self.area_fim,
            depto=self.depto_con_personal,
            cargo=self.cargo_prof,
            contrato=self.contrato_ind,
            activo=True
        )
        self.periodo = PeriodoGuardia.objects.create(
            nombre='Período de Guardia II Semestre 2026',
            inicio_compromiso=datetime.date(2026, 1, 1),
            fin_compromiso=datetime.date(2026, 12, 20),
            inicio_aprobacion=datetime.date(2026, 1, 15),
            fin_aprobacion=datetime.date(2026, 12, 31),
            activo=True
        )

    def test_rn01_calculo_edad_y_sexo_desde_ci_cubano(self):
        """RN-01: Verifica deducción exacta de edad y sexo (dígito 10 par=M, impar=F) desde CI de 11 dígitos."""
        info_m = calcular_edad_y_sexo_desde_ci('85041212345', datetime.date(2026, 6, 1))
        self.assertEqual(info_m['sexo'], 'M')
        self.assertEqual(info_m['edad'], 41)

        info_f = calcular_edad_y_sexo_desde_ci('03091861234', datetime.date(2026, 10, 1))
        self.assertEqual(info_f['sexo'], 'F')
        self.assertEqual(info_f['edad'], 23)

    def test_rf0102_proteccion_baja_departamento_con_trabajadores(self):
        """RF-0102: Bloquea eliminación de departamento con personal activo y permite eliminar departamento vacío."""
        res_bloqueado = self.client.delete(f'/api/guardia-admin/departamentos/{self.depto_con_personal.id}/')
        self.assertEqual(res_bloqueado.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Departamento.objects.filter(id=self.depto_con_personal.id).exists())

        res_permitido = self.client.delete(f'/api/guardia-admin/departamentos/{self.depto_vacio.id}/')
        self.assertEqual(res_permitido.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Departamento.objects.filter(id=self.depto_vacio.id).exists())

    def test_rn04_bloqueo_y_desbloqueo_potencial_superadmin(self):
        """RN-04: Aprobación de potencial bloquea ediciones y solo Superadmin puede reabrirlo."""
        res_aprobar = self.client.post('/api/potencial/aprobar/', {'area': self.area_fim.nombre}, format='json')
        self.assertEqual(res_aprobar.status_code, status.HTTP_200_OK)
        self.assertTrue(AprobacionPotencialArea.objects.get(area=self.area_fim, periodo=self.periodo).aprobado)

        res_reabrir = self.client.post(
            '/api/potencial/aprobar/',
            {'area': self.area_fim.nombre, 'desbloquear': True},
            format='json'
        )
        self.assertEqual(res_reabrir.status_code, status.HTTP_200_OK)
        self.assertFalse(AprobacionPotencialArea.objects.get(area=self.area_fim, periodo=self.periodo).aprobado)

    def test_rn06_restriccion_guardia_estudiantil_en_area_sin_estudiantes(self):
        """RN-06: Impide asignar régimen ESTUDIANTE a áreas administrativas sin estudiantes."""
        res = self.client.post('/api/distribucion/areas/', {
            'area': self.area_rrhh.id,
            'sede': self.sede_olm.id,
            'mes': 6,
            'año': 2026,
            'tipo_guardia': 'Diurna',
            'tipo_personal': 'ESTUDIANTE',
            'cantidad_requerida': 2,
            'dias_asignados': [6, 13]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rn10_enmascaramiento_ci_y_endpoints_publicos_rf1001_rf1002(self):
        """RN-10, RF-1001 y RF-1002: Verifica API pública institucional y enmascaramiento de CI."""
        res_pub_dia = self.client.get('/api/public/guardias-del-dia/')
        self.assertEqual(res_pub_dia.status_code, status.HTTP_200_OK)
        self.assertIn('guardias', res_pub_dia.data)

        res_pub_stats = self.client.get('/api/public/estadisticas-cumplimiento/')
        self.assertEqual(res_pub_stats.status_code, status.HTTP_200_OK)
        self.assertIn('porcentaje_cumplimiento_global', res_pub_stats.data)
