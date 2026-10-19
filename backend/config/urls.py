from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Panel de Administración de Django
    path('admin/', admin.site.urls),
    
    # Documentación de API (Swagger / OpenAPI 3.0)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # Módulo de Autenticación
    path('api/auth/', include('authentication.urls')),
    
    # Skeletons de Módulos de Guardia (Modularidad Escalable)
    path('api/guardia_admin/', include('modules.guardia_admin.urls')),
    path('api/guardia-admin/', include('modules.guardia_admin.urls')),
    path('api/compromiso/', include('modules.compromiso.urls')),
    path('api/potencial/', include('modules.potencial.urls')),
    path('api/distribucion/', include('modules.distribucion.urls')),
    path('api/control/', include('modules.control.urls')),
    path('api/reportes/', include('modules.reportes.urls')),
]
