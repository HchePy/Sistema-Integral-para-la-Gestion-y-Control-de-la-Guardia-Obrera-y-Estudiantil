from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import datetime

from modules.guardia_admin.models import Area, Departamento, Sede, Perfil
from modules.potencial.models import PeriodoGuardia
from modules.distribucion.models import DistribucionArea, AsignacionGuardia

User = get_user_model()

class DistribucionModelTestCase(TestCase):
    def setUp(self):
        self.periodo = PeriodoGuardia.objects.create(
            nombre="Periodo Test 2026",
            inicio_compromiso=datetime.date(2026, 6, 1),
            fin_compromiso=datetime.date(2026, 6, 30),
            inicio_aprobacion=datetime.date(2026, 7, 1),
            fin_aprobacion=datetime.date(2026, 7, 7)
        )
        self.sede = Sede.objects.create(
            nombre="Sede Central Test",
            direccion="Holguín",
            minObreras=2,
            minEstudiantiles=2
        )
        self.area_con_est = Area.objects.create(
            codigo="AREA-EST",
            nombre="Facultad con Estudiantes",
            tieneEstudiantes=True
        )
        self.area_sin_est = Area.objects.create(
            codigo="AREA-NO-EST",
            nombre="Dirección sin Estudiantes",
            tieneEstudiantes=False
        )
        self.user = User.objects.create_user(username="testworker", password="password", role="TRABAJADOR")
        self.perfil = Perfil.objects.create(usuario=self.user, ci="85010112345", tipo="OBRERO", area=self.area_con_est)

    def test_rn06_estudiantes_en_area_sin_estudiantes_falla(self):
        """RN-06: Asignar guardia estudiantil a área sin estudiantes debe fallar."""
        dist = DistribucionArea(
            periodo=self.periodo,
            area=self.area_sin_est,
            sede=self.sede,
            tipo_turno='Diurna',
            tipo_personal='ESTUDIANTE',
            mes=6,
            año=2026,
            dias_asignados=[1, 2]
        )
        with self.assertRaises(ValidationError):
            dist.clean()

    def test_distribucion_valida(self):
        """Distribución válida debe guardarse sin errores."""
        dist = DistribucionArea.objects.create(
            periodo=self.periodo,
            area=self.area_con_est,
            sede=self.sede,
            tipo_turno='Diurna',
            tipo_personal='OBRERO',
            mes=6,
            año=2026,
            dias_asignados=[7, 14],
            cantidad_requerida=2
        )
        self.assertEqual(dist.dias_asignados, [7, 14])

    def test_asignacion_valida_y_dia_invalido(self):
        """Asignación a un día no contenido en la distribución debe fallar."""
        dist = DistribucionArea.objects.create(
            periodo=self.periodo,
            area=self.area_con_est,
            sede=self.sede,
            tipo_turno='Diurna',
            tipo_personal='OBRERO',
            mes=6,
            año=2026,
            dias_asignados=[7, 14]
        )
        # Día inválido (8 no está en [7, 14])
        asig_invalida = AsignacionGuardia(
            distribucion=dist,
            perfil=self.perfil,
            fecha=datetime.date(2026, 6, 8)
        )
        with self.assertRaises(ValidationError):
            asig_invalida.clean()

        # Día válido (7 sí está)
        asig_valida = AsignacionGuardia.objects.create(
            distribucion=dist,
            perfil=self.perfil,
            fecha=datetime.date(2026, 6, 7)
        )
        self.assertEqual(asig_valida.fecha.day, 7)
