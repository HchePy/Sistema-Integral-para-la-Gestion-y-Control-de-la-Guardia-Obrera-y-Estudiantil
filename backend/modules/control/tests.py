from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
import datetime

from modules.guardia_admin.models import Area, Sede, Perfil
from modules.potencial.models import PeriodoGuardia
from modules.distribucion.models import DistribucionArea, AsignacionGuardia
from modules.control.models import ControlGuardia, Notificacion

User = get_user_model()

class ControlModelTestCase(TestCase):
    def setUp(self):
        self.periodo = PeriodoGuardia.objects.create(
            nombre="Periodo Control Test",
            inicio_compromiso=datetime.date(2026, 6, 1),
            fin_compromiso=datetime.date(2026, 6, 30),
            inicio_aprobacion=datetime.date(2026, 7, 1),
            fin_aprobacion=datetime.date(2026, 7, 7)
        )
        self.sede = Sede.objects.create(nombre="Sede Test", minObreras=2, minEstudiantiles=2)
        self.area = Area.objects.create(codigo="F-TEST", nombre="Facultad Test", tieneEstudiantes=True)
        self.user = User.objects.create_user(username="worker1", password="password", role="TRABAJADOR")
        self.perfil = Perfil.objects.create(usuario=self.user, ci="90050512345", tipo="OBRERO", area=self.area)
        self.distribucion = DistribucionArea.objects.create(
            periodo=self.periodo,
            area=self.area,
            sede=self.sede,
            tipo_turno='Diurna',
            tipo_personal='OBRERO',
            mes=6,
            año=2026,
            dias_asignados=[10]
        )
        self.asignacion = AsignacionGuardia.objects.create(
            distribucion=self.distribucion,
            perfil=self.perfil,
            fecha=datetime.date(2026, 6, 10)
        )

    def test_rn09_inasistencia_evaluacion_en_blanco(self):
        """RN-09: Si no asistió a la guardia, la evaluación debe quedar en blanco obligatoriamente."""
        control = ControlGuardia(
            asignacion=self.asignacion,
            asistio=False,
            evaluacion='B',
            observaciones="Faltó"
        )
        control.clean()
        self.assertEqual(control.evaluacion, '', "La evaluación debe limpiarse a blanco si asistio=False.")

    def test_rn09_evaluacion_valida(self):
        """RN-09: Evaluaciones permitidas son B, R, M."""
        control = ControlGuardia.objects.create(
            asignacion=self.asignacion,
            asistio=True,
            evaluacion='B',
            observaciones="Excelente servicio"
        )
        self.assertEqual(control.evaluacion, 'B')

        # Evaluación inválida
        control.evaluacion = 'Z'
        with self.assertRaises(ValidationError):
            control.clean()

    def test_notificacion_creacion_y_lectura(self):
        """MOD-09: Creación de notificación y marcado como leída."""
        notif = Notificacion.objects.create(
            usuario=self.user,
            titulo="Aviso Test",
            mensaje="Mensaje de prueba",
            tipo="RECORDATORIO"
        )
        self.assertFalse(notif.leido)
        notif.leido = True
        notif.save()
        self.assertTrue(notif.leido)
