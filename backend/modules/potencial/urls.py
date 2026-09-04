from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardView, PeriodoGuardiaViewSet, PotencialViewSet

router = DefaultRouter()
router.register(r'periodos', PeriodoGuardiaViewSet, basename='periodo')
router.register(r'', PotencialViewSet, basename='potencial')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
