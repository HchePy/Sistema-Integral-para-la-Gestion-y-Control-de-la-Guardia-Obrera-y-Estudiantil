from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DistribucionAreaViewSet,
    AsignacionGuardiaViewSet,
    GuardiasDelDiaView,
    CronogramaPersonalView
)

router = DefaultRouter()
router.register(r'areas', DistribucionAreaViewSet, basename='distribucion-area')
router.register(r'asignaciones', AsignacionGuardiaViewSet, basename='distribucion-asignacion')

urlpatterns = [
    path('guardias-del-dia/', GuardiasDelDiaView.as_view(), name='guardias-del-dia'),
    path('cronograma/', CronogramaPersonalView.as_view(), name='cronograma-personal'),
    path('', include(router.urls)),
]
