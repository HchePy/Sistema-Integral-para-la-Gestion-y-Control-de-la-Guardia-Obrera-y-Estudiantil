from django.urls import path
from .views import (
    DashboardCumplimientoView,
    ExportarExcelView,
    ExportarPdfView
)

urlpatterns = [
    path('dashboard-cumplimiento/', DashboardCumplimientoView.as_view(), name='dashboard-cumplimiento'),
    path('exportar-excel/', ExportarExcelView.as_view(), name='exportar-excel'),
    path('exportar-pdf/', ExportarPdfView.as_view(), name='exportar-pdf'),
]
