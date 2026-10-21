from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from core.rbac import (
    HasRole, ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA,
    ROLE_RESPONSABLE_DEPARTAMENTO, ROLE_TRABAJADOR, ROLE_ESTUDIANTE
)
from .models import Cargo, Contrato, Sede, Area, Departamento, Perfil, ConfiguracionReglaGuardia
from .serializers import (
    CargoSerializer, ContratoSerializer, SedeSerializer,
    AreaSerializer, DepartamentoSerializer, PerfilSerializer,
    ConfiguracionReglaGuardiaSerializer
)

User = get_user_model()

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "modulo": "Administración General de la Guardia",
            "mensaje": "Conexión exitosa con el Backend de la Guardia UHO.",
            "usuario": request.user.username,
            "rol": request.user.role,
            "estado": "Boilerplate v1.0 Activo"
        })

# --- VIEWSETS DE NOMENCLADORES ---

class CargoViewSet(viewsets.ModelViewSet):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Superadmin y roles autenticados de administracion pueden gestionar
        if self.action in ['destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN)()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], url_path='guardar-permisos')
    def guardar_permisos(self, request):
        """
        Persiste la matriz RBAC de permisos asociados a un rol/cargo institucional.
        """
        nombre = request.data.get('nombre')
        permisos = request.data.get('permisos', [])
        descripcion = request.data.get('descripcion')

        if not nombre:
            return Response({'error': 'Nombre de cargo requerido'}, status=status.HTTP_400_BAD_REQUEST)

        cargo, _ = Cargo.objects.get_or_create(nombre=nombre)
        cargo.permisos = permisos
        if descripcion:
            cargo.descripcion = descripcion
        cargo.save()
        return Response(CargoSerializer(cargo).data, status=status.HTTP_200_OK)

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN)()]
        return super().get_permissions()

class SedeViewSet(viewsets.ModelViewSet):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Superadmin y Jefe de Seguridad pueden modificar sedes
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD)()]
        return super().get_permissions()

class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN)()]
        return super().get_permissions()

class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN)()]
        return super().get_permissions()

# --- VIEWSET DE PERFILES CON SEGURIDAD RBAC ---

class PerfilViewSet(viewsets.ModelViewSet):
    serializer_class = PerfilSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # Superadmin y Jefe de Seguridad ven todos los perfiles
        if user.role in [ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD]:
            return Perfil.objects.all()
            
        # Responsable de Área ve solo los perfiles de su Área
        elif user.role == ROLE_RESPONSABLE_AREA:
            if hasattr(user, 'perfil') and user.perfil.area:
                return Perfil.objects.filter(area=user.perfil.area)
            return Perfil.objects.none()
            
        # Responsable de Departamento ve solo los de su Departamento
        elif user.role == ROLE_RESPONSABLE_DEPARTAMENTO:
            if hasattr(user, 'perfil') and user.perfil.depto:
                return Perfil.objects.filter(depto=user.perfil.depto)
            return Perfil.objects.none()
            
        # Trabajadores y Estudiantes normales ven solo su propio perfil
        else:
            return Perfil.objects.filter(usuario=user)

    def get_permissions(self):
        # Crear y Eliminar perfiles directamente está limitado a Superadmin
        if self.action in ['create', 'destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN)()]
        return super().get_permissions()

    def update(self, request, *args, **kwargs):
        # Asegurarse de que un usuario regular solo pueda editar campos de contacto o preferencias,
        # e impedir que modifique su CI, tipo, contrato, cargo, area o depto.
        instance = self.get_object()
        user = request.user

        if user.role not in [ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD]:
            # Verificar que solo edite su propio perfil
            if instance.usuario != user:
                return Response(
                    {"detail": "No tienes permiso para modificar este perfil."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Impedir la modificación de campos administrativos
            for field in ['usuario', 'ci', 'sexo', 'tipo', 'contrato', 'area', 'depto', 'cargo']:
                if field in request.data and str(request.data[field]) != str(getattr(instance, field + '_id', getattr(instance, field, ''))):
                    return Response(
                        {"detail": f"No tienes permiso para modificar el campo administrativo: {field}"},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """
        Consulta o actualiza datos personales y de contacto del perfil del usuario en sesión.
        """
        perfil = getattr(request.user, 'perfil', None)
        if not perfil:
            return Response({"detail": "Perfil no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'PATCH':
            allowed_fields = [
                'telefono', 'celular', 'whatsapp', 'direccion', 'referencia',
                'contactoNombre', 'contactoCelular', 'tipoPref', 'diaPref'
            ]
            for field in allowed_fields:
                if field in request.data:
                    setattr(perfil, field, request.data[field])
            perfil.save()

        return Response(PerfilSerializer(perfil).data, status=status.HTTP_200_OK)

# --- VISTA DE SINCRONIZACIÓN DE REGISTROS SIMULADOS (ASSET / SIGENU) ---

class SincronizarRegistrosView(APIView):
    """
    Simula la sincronización masiva de la guardia con el sistema de personal (ASSET) 
    y el registro escolar (SIGENU), insertando nomencladores, usuarios y perfiles por defecto.
    """
    permission_classes = [IsAuthenticated, HasRole.for_roles(ROLE_SUPERADMIN)]

    def post(self, request):
        # 1. Crear Cargos por defecto si no existen
        cargos_nombres = ['Decano', 'Profesor Auxiliar', 'Especialista en Redes', 'Técnico de Soporte', 'Secretaria', 'Estudiante de 4to Año']
        cargos = {}
        for c in cargos_nombres:
            cargo, _ = Cargo.objects.get_or_create(nombre=c)
            cargos[c] = cargo

        # 2. Crear Contratos por defecto si no existen
        contratos_nombres = ['Fijo Indeterminado', 'Determinado', 'Adiestrado', 'Estudiante Activo']
        contratos = {}
        for c in contratos_nombres:
            contrato, _ = Contrato.objects.get_or_create(nombre=c)
            contratos[c] = contrato

        # 3. Crear Sedes por defecto si no existen
        sedes_data = [
            {'nombre': 'Sede Oscar Lucero Moya', 'direccion': 'Ave. de los Libertadores, Holguín', 'minObreras': 3, 'minEstudiantiles': 4},
            {'nombre': 'Sede Manuel Aguilera', 'direccion': 'Carretera a Guardalavaca, Holguín', 'minObreras': 2, 'minEstudiantiles': 2},
            {'nombre': 'Sede Celia Sánchez Manduley', 'direccion': 'Ave. XX Aniversario, Holguín', 'minObreras': 2, 'minEstudiantiles': 2}
        ]
        sedes = {}
        for s_data in sedes_data:
            sede, _ = Sede.objects.get_or_create(
                nombre=s_data['nombre'],
                defaults={
                    'direccion': s_data['direccion'],
                    'minObreras': s_data['minObreras'],
                    'minEstudiantiles': s_data['minEstudiantiles']
                }
            )
            sedes[s_data['nombre']] = sede

        # 4. Crear Áreas por defecto si no existen
        areas_data = [
            {'codigo': 'FAC-INF', 'nombre': 'Facultad de Informática y Matemática', 'tieneEstudiantes': True},
            {'codigo': 'FAC-ING', 'nombre': 'Facultad de Ingeniería', 'tieneEstudiantes': True},
            {'codigo': 'DIR-INF', 'nombre': 'Dirección de Informatización', 'tieneEstudiantes': False},
            {'codigo': 'FAC-MED', 'nombre': 'Facultad de Ciencias Médicas', 'tieneEstudiantes': True}
        ]
        areas = {}
        for a_data in areas_data:
            area, _ = Area.objects.get_or_create(
                codigo=a_data['codigo'],
                defaults={
                    'nombre': a_data['nombre'],
                    'tieneEstudiantes': a_data['tieneEstudiantes']
                }
            )
            areas[a_data['nombre']] = area

        # 5. Crear Departamentos por defecto si no existen
        deptos_data = [
            {'codigo': 'DEP-SIST', 'nombre': 'Depto. de Sistemas de Información', 'area_nombre': 'Facultad de Informática y Matemática'},
            {'codigo': 'DEP-RED', 'nombre': 'Depto. de Conectividad y Redes', 'area_nombre': 'Facultad de Informática y Matemática'},
            {'codigo': 'DEP-MEC', 'nombre': 'Depto. de Ingeniería Mecánica', 'area_nombre': 'Facultad de Ingeniería'},
            {'codigo': 'DEP-TEL', 'nombre': 'Depto. de Telecomunicaciones', 'area_nombre': 'Dirección de Informatización'}
        ]
        deptos = {}
        for d_data in deptos_data:
            area_padre = areas.get(d_data['area_nombre'])
            if area_padre:
                depto, _ = Departamento.objects.get_or_create(
                    codigo=d_data['codigo'],
                    areaPadre=area_padre,
                    defaults={'nombre': d_data['nombre']}
                )
                deptos[d_data['nombre']] = depto

        # 6. Crear usuarios y perfiles por defecto (para pruebas rápidas de login)
        mock_usuarios = [
            {
                'username': 'superadmin', 'first_name': 'Carlos', 'last_name': 'Leyva',
                'email': 'carlos.leyva@uho.edu.cu', 'role': ROLE_SUPERADMIN, 'depto_inst': 'Dirección de Informatización',
                'ci': '75041012345', 'sexo': 'M', 'tipo': 'OBRERO', 'contrato': 'Fijo Indeterminado',
                'area': 'Dirección de Informatización', 'depto': 'Depto. de Telecomunicaciones', 'cargo': 'Decano'
            },
            {
                'username': 'jefe_seguridad', 'first_name': 'Elena', 'last_name': 'Rost',
                'email': 'elena.rost@uho.edu.cu', 'role': ROLE_JEFE_SEGURIDAD, 'depto_inst': 'Facultad de Informática y Matemática',
                'ci': '79051212345', 'sexo': 'F', 'tipo': 'OBRERO', 'contrato': 'Fijo Indeterminado',
                'area': 'Facultad de Informática y Matemática', 'depto': 'Depto. de Sistemas de Información', 'cargo': 'Profesor Auxiliar'
            },
            {
                'username': 'resp_area', 'first_name': 'Julio', 'last_name': 'Gómez',
                'email': 'julio.gomez@uho.edu.cu', 'role': ROLE_RESPONSABLE_AREA, 'depto_inst': 'Facultad de Ingeniería',
                'ci': '82031412345', 'sexo': 'M', 'tipo': 'OBRERO', 'contrato': 'Fijo Indeterminado',
                'area': 'Facultad de Ingeniería', 'depto': 'Depto. de Ingeniería Mecánica', 'cargo': 'Profesor Auxiliar'
            },
            {
                'username': 'resp_depto', 'first_name': 'Ramón', 'last_name': 'Valdés',
                'email': 'ramon.valdes@uho.edu.cu', 'role': ROLE_RESPONSABLE_DEPARTAMENTO, 'depto_inst': 'Facultad de Informática y Matemática',
                'ci': '85091212345', 'sexo': 'M', 'tipo': 'OBRERO', 'contrato': 'Fijo Indeterminado',
                'area': 'Facultad de Informática y Matemática', 'depto': 'Depto. de Sistemas de Información', 'cargo': 'Profesor Auxiliar'
            },
            {
                'username': 'trabajador', 'first_name': 'José', 'last_name': 'Rodríguez Pérez',
                'email': 'jose.rodriguez@uho.edu.cu', 'role': ROLE_TRABAJADOR, 'depto_inst': 'Facultad de Informática y Matemática',
                'ci': '78041523456', 'sexo': 'M', 'tipo': 'OBRERO', 'contrato': 'Fijo Indeterminado',
                'area': 'Facultad de Informática y Matemática', 'depto': 'Depto. de Sistemas de Información', 'cargo': 'Profesor Auxiliar'
            },
            {
                'username': 'estudiante', 'first_name': 'Carlos', 'last_name': 'Gómez Batista',
                'email': 'carlos.gomez@uho.edu.cu', 'role': ROLE_ESTUDIANTE, 'depto_inst': 'Facultad de Informática y Matemática',
                'ci': '03102434567', 'sexo': 'M', 'tipo': 'ESTUDIANTE', 'contrato': 'Estudiante Activo',
                'area': 'Facultad de Informática y Matemática', 'depto': 'Depto. de Sistemas de Información', 'cargo': 'Estudiante de 4to Año'
            }
        ]
        
        creados = 0
        actualizados = 0
        
        for u_data in mock_usuarios:
            user, created = User.objects.get_or_create(
                username=u_data['username'],
                defaults={
                    'email': u_data['email'],
                    'first_name': u_data['first_name'],
                    'last_name': u_data['last_name'],
                    'role': u_data['role'],
                    'departamento': u_data['depto_inst']
                }
            )
            if created:
                user.set_password('password')
                user.save()
                creados += 1
            else:
                user.first_name = u_data['first_name']
                user.last_name = u_data['last_name']
                user.role = u_data['role']
                user.departamento = u_data['depto_inst']
                user.save()
                actualizados += 1
                
            # Asignar perfiles correspondientes
            area_obj = areas.get(u_data['area'])
            depto_obj = deptos.get(u_data['depto'])
            cargo_obj = cargos.get(u_data['cargo'])
            contrato_obj = contratos.get(u_data['contrato'])
            
            Perfil.objects.update_or_create(
                usuario=user,
                defaults={
                    'ci': u_data['ci'],
                    'sexo': u_data['sexo'],
                    'tipo': u_data['tipo'],
                    'area': area_obj,
                    'depto': depto_obj,
                    'cargo': cargo_obj,
                    'contrato': contrato_obj,
                    'telefono': '24461234' if u_data['tipo'] == 'OBRERO' else '',
                    'celular': '52345678',
                    'whatsapp': '52345678',
                    'direccion': 'Calle Martí #45, Holguín',
                    'referencia': 'Cerca del parque central',
                    'contactoNombre': 'Luis Rodríguez',
                    'contactoCelular': '53987654'
                }
            )

        # Asignar el responsable del Area y Departamento en base a los usuarios creados
        try:
            admin_user = User.objects.get(username='superadmin')
            dir_inf = areas.get('Dirección de Informatización')
            if dir_inf:
                dir_inf.responsable = admin_user
                dir_inf.save()
                
            resp_area_user = User.objects.get(username='resp_area')
            fac_ing = areas.get('Facultad de Ingeniería')
            if fac_ing:
                fac_ing.responsable = resp_area_user
                fac_ing.save()
                
            resp_depto_user = User.objects.get(username='resp_depto')
            depto_sist = deptos.get('Depto. de Sistemas de Información')
            if depto_sist:
                depto_sist.responsable = resp_depto_user
                depto_sist.save()
        except User.DoesNotExist:
            pass

        # 7. Reglas Globales de Guardia RN-02
        defaults_rn02 = [
            {'tipo_usuario': 'OBRERO', 'sexo': 'M', 'tipo_turno_defecto': 'Nocturna', 'tipo_dia_defecto': 'Semana'},
            {'tipo_usuario': 'OBRERO', 'sexo': 'F', 'tipo_turno_defecto': 'Diurna', 'tipo_dia_defecto': 'Semana'},
            {'tipo_usuario': 'ESTUDIANTE', 'sexo': 'M', 'tipo_turno_defecto': 'Nocturna', 'tipo_dia_defecto': 'Fin de Semana'},
            {'tipo_usuario': 'ESTUDIANTE', 'sexo': 'F', 'tipo_turno_defecto': 'Diurna', 'tipo_dia_defecto': 'Semana'},
        ]
        reglas_creadas = 0
        for r in defaults_rn02:
            _, created_regla = ConfiguracionReglaGuardia.objects.get_or_create(
                tipo_usuario=r['tipo_usuario'],
                sexo=r['sexo'],
                defaults={'tipo_turno_defecto': r['tipo_turno_defecto'], 'tipo_dia_defecto': r['tipo_dia_defecto']}
            )
            if created_regla:
                reglas_creadas += 1

        return Response({
            "status": "success",
            "message": "Sincronización institucional completada exitosamente desde ASSET y SIGENU.",
            "cargos_creados": len(cargos_nombres),
            "contratos_creados": len(contratos_nombres),
            "sedes_creadas": len(sedes_data),
            "areas_creadas": len(areas_data),
            "departamentos_creados": len(deptos_data),
            "usuarios_creados": creados,
            "usuarios_actualizados": actualizados,
            "reglas_rn02_creadas": reglas_creadas
        }, status=status.HTTP_200_OK)


class ConfiguracionReglaGuardiaViewSet(viewsets.ModelViewSet):
    """
    CRUD para los parámetros globales del sistema configurables por Superadmin (RN-02).
    Define los valores por defecto del tipo de guardia y tipo de día según:
    - tipo de usuario (OBRERO / ESTUDIANTE)
    - sexo (M / F)
    """
    queryset = ConfiguracionReglaGuardia.objects.all()
    serializer_class = ConfiguracionReglaGuardiaSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [HasRole.for_roles(ROLE_SUPERADMIN)()]
        return [IsAuthenticated()]

