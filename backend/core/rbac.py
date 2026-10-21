from rest_framework import permissions

# ROLES INSTITUCIONALES DE GUARDIA DEFINIDOS
ROLE_SUPERADMIN = 'SUPERADMIN'
ROLE_JEFE_SEGURIDAD = 'JEFE_SEGURIDAD'
ROLE_RESPONSABLE_AREA = 'RESPONSABLE_AREA'
ROLE_RESPONSABLE_DEPARTAMENTO = 'RESPONSABLE_DEPARTAMENTO'
ROLE_TRABAJADOR = 'TRABAJADOR'
ROLE_ESTUDIANTE = 'ESTUDIANTE'

ROLES_CHOICES = [
    (ROLE_SUPERADMIN, 'Administrador del Sistema'),
    (ROLE_JEFE_SEGURIDAD, 'Jefe de Seguridad y Protección'),
    (ROLE_RESPONSABLE_AREA, 'Responsable de Área'),
    (ROLE_RESPONSABLE_DEPARTAMENTO, 'Responsable de Departamento'),
    (ROLE_TRABAJADOR, 'Trabajador / Guardia Obrero'),
    (ROLE_ESTUDIANTE, 'Estudiante / Guardia Estudiantil'),
]

class HasRole(permissions.BasePermission):
    """
    Permiso personalizado que verifica si el usuario autenticado posee uno de los roles permitidos.
    Uso:
        permission_classes = [HasRole.for_roles(ROLE_SUPERADMIN, ROLE_RESPONSABLE_AREA)]
    """
    def __init__(self, allowed_roles):
        self.allowed_roles = allowed_roles

    @classmethod
    def for_roles(cls, *roles):
        # Retorna una clase configurada dinámicamente con los roles permitidos
        class DynamicHasRole(cls):
            def __init__(self):
                super().__init__(roles)
        return DynamicHasRole

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusuarios de Django siempre tienen acceso completo
        if request.user.is_superuser:
            return True
            
        # Comprobar si el rol del usuario está dentro de los permitidos
        return request.user.role in self.allowed_roles

class IsInstitutionalStaff(permissions.BasePermission):
    """
    Permiso para personal institucional (excluye a estudiantes).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
            
        staff_roles = [ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA, ROLE_RESPONSABLE_DEPARTAMENTO, ROLE_TRABAJADOR]
        return request.user.role in staff_roles


def user_has_perm(user, perm_code):
    """
    Comprueba si un usuario tiene un permiso específico por rol de superusuario
    o a través de los permisos granulares asignados a su Cargo institucional (RF-0111, RF-0112).
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or getattr(user, 'role', '') == ROLE_SUPERADMIN:
        return True
    
    perfil = getattr(user, 'perfil', None)
    if perfil and perfil.cargo and isinstance(perfil.cargo.permisos, list):
        if perm_code in perfil.cargo.permisos or '*' in perfil.cargo.permisos:
            return True
            
    return False


class HasDynamicPermission(permissions.BasePermission):
    """
    Verifica si el usuario tiene el permiso específico asignado directamente o
    heredado mediante los permisos granulares de su Cargo institucional (RF-0111 / RF-0112).
    """
    def __init__(self, required_permission):
        self.required_permission = required_permission

    @classmethod
    def for_permission(cls, perm_code):
        class DynamicPermissionCheck(cls):
            def __init__(self):
                super().__init__(perm_code)
        return DynamicPermissionCheck

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return user_has_perm(request.user, self.required_permission)

