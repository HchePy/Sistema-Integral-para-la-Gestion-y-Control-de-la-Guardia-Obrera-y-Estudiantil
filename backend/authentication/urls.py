from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    SimularRolInstitucionalView,
    GestionRolesUsuariosView,
    UserRegistrationView,
    UserProfileView,
)

urlpatterns = [
    # Inicio de sesión vía AGA_AUTH (Retorna Tokens de Acceso y Refresco JWT + Perfil Institucional)
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),

    # Conmutador de Rol para Simulación Institucional en Entorno de Pruebas de Tesis
    path('simular-rol/', SimularRolInstitucionalView.as_view(), name='simular_rol_institucional'),

    # Gestión de Asignación de Roles y Alcance a Usuarios (RF-0110, RF-0111)
    path('usuarios-roles/', GestionRolesUsuariosView.as_view(), name='usuarios_roles'),

    # Refresco de Token JWT expirado
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Registro de un nuevo usuario
    path('register/', UserRegistrationView.as_view(), name='user_register'),

    # Obtener perfil del usuario actual autenticado
    path('profile/', UserProfileView.as_view(), name='user_profile'),
]
