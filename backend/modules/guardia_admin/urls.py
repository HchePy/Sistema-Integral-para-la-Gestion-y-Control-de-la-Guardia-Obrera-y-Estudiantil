from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardView, CargoViewSet, ContratoViewSet, SedeViewSet,
    AreaViewSet, DepartamentoViewSet, PerfilViewSet, SincronizarRegistrosView,
    ConfiguracionReglaGuardiaViewSet, AuditLogView
)

router = DefaultRouter()
router.register('cargos', CargoViewSet, basename='cargo')
router.register('contratos', ContratoViewSet, basename='contrato')
router.register('sedes', SedeViewSet, basename='sede')
router.register('areas', AreaViewSet, basename='area')
router.register('departamentos', DepartamentoViewSet, basename='departamento')
router.register('perfiles', PerfilViewSet, basename='perfil')
router.register('reglas-guardia', ConfiguracionReglaGuardiaViewSet, basename='regla-guardia')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('sincronizar/', SincronizarRegistrosView.as_view(), name='sincronizar'),
    path('sincronizar-fuentes/', SincronizarRegistrosView.as_view(), name='sincronizar-fuentes'),
    path('auditoria/', AuditLogView.as_view(), name='auditoria'),
    path('', include(router.urls)),
]
