from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ControlGuardiaViewSet,
    HistorialCumplimientoView,
    NotificacionViewSet
)

router = DefaultRouter()
router.register(r'evaluaciones', ControlGuardiaViewSet, basename='control-evaluacion')
router.register(r'notificaciones', NotificacionViewSet, basename='control-notificacion')

urlpatterns = [
    path('historial/', HistorialCumplimientoView.as_view(), name='historial-cumplimiento'),
    path('', include(router.urls)),
]
