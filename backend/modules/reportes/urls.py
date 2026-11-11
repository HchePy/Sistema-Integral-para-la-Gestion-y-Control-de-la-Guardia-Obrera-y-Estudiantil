from django.urls import path
from .views import (
    DashboardCumplimientoView,
    ExportarExcelView,
    ExportarPdfView,
    PublicGuardiasDelDiaAPIView,
    PublicEstadisticasCumplimientoAPIView,
)

urlpatterns = [
    path('dashboard-cumplimiento/', DashboardCumplimientoView.as_view(), name='dashboard-cumplimiento'),
    path('exportar-excel/', ExportarExcelView.as_view(), name='exportar-excel'),
    path('exportar-pdf/', ExportarPdfView.as_view(), name='exportar-pdf'),
    # MOD-10: Endpoints de Interoperabilidad Institucional (RF-1001, RF-1002)
    path('public/guardias-del-dia/', PublicGuardiasDelDiaAPIView.as_view(), name='public-guardias-del-dia'),
    path('public/estadisticas-cumplimiento/', PublicEstadisticasCumplimientoAPIView.as_view(), name='public-estadisticas-cumplimiento'),
]
