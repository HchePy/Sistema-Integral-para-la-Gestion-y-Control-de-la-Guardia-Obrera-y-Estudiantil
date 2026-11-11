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
from core.models import AuditLog
from core.integrations import AssetRRHHAdapter, SigenuAdapter, calcular_edad_y_sexo_desde_ci
from .models import Cargo, Contrato, Sede, Area, Departamento, Perfil, ConfiguracionReglaGuardia
from .serializers import (
    CargoSerializer, ContratoSerializer, SedeSerializer,
    AreaSerializer, DepartamentoSerializer, PerfilSerializer,
    ConfiguracionReglaGuardiaSerializer, AuditLogSerializer
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        activos_count = instance.integrantes.filter(activo=True).count()
        if activos_count > 0:
            return Response(
                {
                    "error": f"RF-0102: No se puede eliminar el departamento '{instance.nombre}' porque tiene {activos_count} integrante(s) activo(s) asociado(s)."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        nombre_depto = instance.nombre
        response = super().destroy(request, *args, **kwargs)
        AuditLog.objects.create(
            usuario=request.user,
            accion='DELETE',
            modelo='Departamento',
            objeto_id=str(kwargs.get('pk', '')),
            detalle=f"RF-0102: Eliminado departamento '{nombre_depto}' sin trabajadores activos asociados.",
            ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1')
        )
        return response

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
    Sincronización con los registros primarios institucionales de la Universidad de Holguín:
    - ASSET (Sistema de Recursos Humanos - Trabajadores, RF-0107)
    - SIGENU (Sistema de Gestión de la Nueva Universidad - Estudiantes, RF-0108)
    Cumple RN-01: Calcula edad/sexo desde el CI y preserva intactos los datos de contacto locales.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        origen = str(request.data.get('origen', 'TODOS')).upper()

        # 1. Asegurar Sedes Oficiales de la Universidad de Holguín (RF-0103)
        sedes_data = [
            {'nombre': 'Sede Oscar Lucero Moya', 'direccion': 'Ave. XX Aniversario, Piedra Blanca, Holguín', 'minObreras': 3, 'minEstudiantiles': 4},
            {'nombre': 'Sede Celia Sánchez Manduley', 'direccion': 'Ave. de los Libertadores, Holguín', 'minObreras': 2, 'minEstudiantiles': 3},
            {'nombre': 'Sede Manuel Fajardo', 'direccion': 'Prolongación de Frexes, Holguín', 'minObreras': 2, 'minEstudiantiles': 2},
            {'nombre': 'Sede José de la Luz y Caballero', 'direccion': 'Ave. Capitán Urbino, Holguín', 'minObreras': 2, 'minEstudiantiles': 2},
        ]
        for s_data in sedes_data:
            Sede.objects.get_or_create(
                nombre=s_data['nombre'],
                defaults={
                    'direccion': s_data['direccion'],
                    'minObreras': s_data['minObreras'],
                    'minEstudiantiles': s_data['minEstudiantiles'],
                }
            )

        # 2. Asegurar Áreas y Departamentos Oficiales UHO (RF-0101, RF-0102, RN-06)
        areas_data = [
            {'codigo': 'FAC-INF', 'nombre': 'Facultad de Informática y Matemática', 'tieneEstudiantes': True},
            {'codigo': 'FAC-ING', 'nombre': 'Facultad de Ingeniería', 'tieneEstudiantes': True},
            {'codigo': 'FAC-CE', 'nombre': 'Facultad de Ciencias Empresariales y Administración', 'tieneEstudiantes': True},
            {'codigo': 'FAC-CF', 'nombre': 'Facultad de Cultura Física y Deportes', 'tieneEstudiantes': True},
            {'codigo': 'DIR-INF', 'nombre': 'Dirección de Informatización', 'tieneEstudiantes': False},
            {'codigo': 'DIR-SEG', 'nombre': 'Dirección de Seguridad y Protección Universitaria', 'tieneEstudiantes': False},
        ]
        areas_by_code = {}
        for a_data in areas_data:
            area_obj, _ = Area.objects.get_or_create(
                codigo=a_data['codigo'],
                defaults={'nombre': a_data['nombre'], 'tieneEstudiantes': a_data['tieneEstudiantes']}
            )
            areas_by_code[a_data['codigo']] = area_obj

        deptos_data = [
            {'codigo': 'DEP-IS', 'nombre': 'Departamento de Ingeniería de Software', 'area_codigo': 'FAC-INF'},
            {'codigo': 'DEP-SI', 'nombre': 'Departamento de Sistemas de Información', 'area_codigo': 'FAC-INF'},
            {'codigo': 'DEP-MAT', 'nombre': 'Departamento de Matemática', 'area_codigo': 'FAC-INF'},
            {'codigo': 'DEP-LAB', 'nombre': 'Laboratorio de Innovación Digital', 'area_codigo': 'FAC-INF'},
            {'codigo': 'DEP-RED', 'nombre': 'Departamento de Conectividad y Redes', 'area_codigo': 'DIR-INF'},
            {'codigo': 'DEP-DES', 'nombre': 'Departamento de Desarrollo de Software', 'area_codigo': 'DIR-INF'},
            {'codigo': 'DEP-MEC', 'nombre': 'Departamento de Ingeniería Mecánica', 'area_codigo': 'FAC-ING'},
            {'codigo': 'DEP-CIV', 'nombre': 'Departamento de Ingeniería Civil', 'area_codigo': 'FAC-ING'},
            {'codigo': 'DEP-ADM', 'nombre': 'Departamento de Administración y Economía', 'area_codigo': 'FAC-CE'},
            {'codigo': 'DEP-CF', 'nombre': 'Departamento de Cultura Física', 'area_codigo': 'FAC-CF'},
            {'codigo': 'DEP-SEG', 'nombre': 'Departamento de Guardia y Protección Física', 'area_codigo': 'DIR-SEG'},
        ]
        deptos_by_code = {}
        for d_data in deptos_data:
            area_padre = areas_by_code.get(d_data['area_codigo'])
            if area_padre:
                depto_obj, _ = Departamento.objects.get_or_create(
                    codigo=d_data['codigo'],
                    areaPadre=area_padre,
                    defaults={'nombre': d_data['nombre']}
                )
                deptos_by_code[d_data['codigo']] = depto_obj

        creados = 0
        actualizados = 0
        fuentes_consultadas = []

        # 3. Sincronizar Trabajadores desde ASSET (RF-0107)
        if origen in ['TODOS', 'ASSET']:
            asset_resp = AssetRRHHAdapter.fetch_trabajadores()
            fuentes_consultadas.append(asset_resp['source'])
            for item in asset_resp['registros']:
                ci_info = calcular_edad_y_sexo_desde_ci(item['ci'])
                area_obj = areas_by_code.get(item.get('area_codigo')) or Area.objects.first()
                depto_obj = deptos_by_code.get(item.get('depto_codigo'))
                cargo_obj, _ = Cargo.objects.get_or_create(nombre=item.get('cargo', 'Profesor Auxiliar'))
                contrato_obj, _ = Contrato.objects.get_or_create(nombre=item.get('contrato', 'Indeterminado'))

                user, u_created = User.objects.get_or_create(
                    username=item['username'],
                    defaults={
                        'email': item['email'],
                        'first_name': item['first_name'],
                        'last_name': item['last_name'],
                        'role': item.get('role', ROLE_TRABAJADOR),
                        'departamento': area_obj.nombre if area_obj else '',
                    }
                )
                if u_created:
                    user.set_password('password')
                    user.save()
                    creados += 1
                else:
                    user.first_name = item['first_name']
                    user.last_name = item['last_name']
                    user.email = item['email']
                    user.save()
                    actualizados += 1

                perfil, _ = Perfil.objects.get_or_create(usuario=user)
                perfil.ci = item['ci']
                perfil.sexo = ci_info['sexo']
                perfil.tipo = 'OBRERO'
                perfil.area = area_obj
                perfil.depto = depto_obj
                perfil.cargo = cargo_obj
                perfil.contrato = contrato_obj
                # RN-01: Nunca sobrescribir datos locales de contacto si ya existen
                if not perfil.celular:
                    perfil.celular = '52481920'
                if not perfil.direccion:
                    perfil.direccion = 'Reparto Peralta, Holguín'
                perfil.save()

        # 4. Sincronizar Estudiantes desde SIGENU (RF-0108)
        if origen in ['TODOS', 'SIGENU']:
            sigenu_resp = SigenuAdapter.fetch_estudiantes()
            fuentes_consultadas.append(sigenu_resp['source'])
            for item in sigenu_resp['registros']:
                ci_info = calcular_edad_y_sexo_desde_ci(item['ci'])
                area_obj = areas_by_code.get(item.get('area_codigo')) or Area.objects.filter(tieneEstudiantes=True).first()
                depto_obj = deptos_by_code.get(item.get('depto_codigo'))
                cargo_obj, _ = Cargo.objects.get_or_create(nombre=item.get('cargo', 'Estudiante de 4to Año'))
                contrato_obj, _ = Contrato.objects.get_or_create(nombre=item.get('contrato', 'Estudiante Regular Diurno'))

                user, u_created = User.objects.get_or_create(
                    username=item['username'],
                    defaults={
                        'email': item['email'],
                        'first_name': item['first_name'],
                        'last_name': item['last_name'],
                        'role': ROLE_ESTUDIANTE,
                        'departamento': area_obj.nombre if area_obj else '',
                    }
                )
                if u_created:
                    user.set_password('password')
                    user.save()
                    creados += 1
                else:
                    user.first_name = item['first_name']
                    user.last_name = item['last_name']
                    user.email = item['email']
                    user.save()
                    actualizados += 1

                perfil, _ = Perfil.objects.get_or_create(usuario=user)
                perfil.ci = item['ci']
                perfil.sexo = ci_info['sexo']
                perfil.tipo = 'ESTUDIANTE'
                perfil.area = area_obj
                perfil.depto = depto_obj
                perfil.cargo = cargo_obj
                perfil.contrato = contrato_obj
                if not perfil.celular:
                    perfil.celular = '53891245'
                if not perfil.direccion:
                    perfil.direccion = 'Residencia Estudiantil Sede Oscar Lucero Moya, Holguín'
                perfil.save()

        # 5. Asegurar Reglas Globales RN-02
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

        AuditLog.objects.create(
            usuario=request.user,
            accion='SYNC',
            modelo=f"Sincronización ({origen})",
            objeto_id=origen,
            detalle=f"Sincronización completada con {', '.join(fuentes_consultadas)}: {creados} nuevos, {actualizados} actualizados (RN-01 preservado).",
            ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1')
        )

        return Response({
            "status": "success",
            "message": f"Sincronización institucional completada con éxito ({', '.join(fuentes_consultadas)}). Datos locales de contacto preservados según RN-01.",
            "fuentes": fuentes_consultadas,
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


class AuditLogView(APIView):
    """
    Visor y Registro de Auditoría Institucional del SIGCGOE (RNF-06, RNF-11).
    Permite consultar la trazabilidad completa de eventos del sistema (logins, aprobaciones,
    cambios de rol, sincronizaciones con ASSET/SIGENU, etc.).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accion = request.query_params.get('accion')
        modelo = request.query_params.get('modelo')
        search = request.query_params.get('q')

        qs = AuditLog.objects.select_related('usuario').all().order_by('-fecha_registro')
        if accion:
            qs = qs.filter(accion=accion)
        if modelo:
            qs = qs.filter(tabla__icontains=modelo)
        if search:
            qs = qs.filter(detalle__icontains=search)

        logs = qs[:150]
        return Response(AuditLogSerializer(logs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request):
        accion = request.data.get('accion', 'UPDATE')
        modelo = request.data.get('modelo', 'Sistema')
        objeto_id = str(request.data.get('objeto_id', ''))
        detalle = request.data.get('detalle', '')

        log = AuditLog.objects.create(
            usuario=request.user,
            accion=accion,
            modelo=modelo,
            objeto_id=objeto_id,
            detalle=detalle,
            ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1')
        )
        return Response(AuditLogSerializer(log).data, status=status.HTTP_201_CREATED)


