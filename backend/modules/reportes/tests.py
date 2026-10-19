from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class ReportesAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_reportes',
            password='TestPassword123!',
            role='SUPERADMIN',
            email='admin_reportes@uho.edu.cu'
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_cumplimiento_endpoint(self):
        """Verifica que el dashboard de cumplimiento devuelva métricas consolidadas."""
        response = self.client.get('/api/reportes/dashboard-cumplimiento/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('resumen', response.data)
        self.assertIn('porcentaje_cumplimiento', response.data['resumen'])
        self.assertIn('evaluaciones', response.data)
        self.assertIn('por_area', response.data)
        self.assertIn('por_sede', response.data)

    def test_exportar_excel_endpoint(self):
        """Verifica que la exportación a Excel (.xlsx) genere un binario válido con cabeceras correctas."""
        response = self.client.get('/api/reportes/exportar-excel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        self.assertIn('attachment; filename="Reporte_Cumplimiento_Guardia_UHO.xlsx"', response['Content-Disposition'])
        self.assertTrue(len(response.content) > 1000)

    def test_exportar_pdf_endpoint(self):
        """Verifica que la exportación a PDF genere un binario válido con membrete y cabeceras correctas."""
        response = self.client.get('/api/reportes/exportar-pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment; filename="Informe_Cumplimiento_Guardia_UHO.pdf"', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF'))
