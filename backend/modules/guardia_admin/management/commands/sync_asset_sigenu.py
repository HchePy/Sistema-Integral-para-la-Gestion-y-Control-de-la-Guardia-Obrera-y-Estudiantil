from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from modules.guardia_admin.models import (
    Cargo, Contrato, Sede, Area, Departamento, Perfil, ConfiguracionReglaGuardia
)
from core.rbac import (
    ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA,
    ROLE_RESPONSABLE_DEPARTAMENTO, ROLE_TRABAJADOR, ROLE_ESTUDIANTE
)

User = get_user_model()

class Command(BaseCommand):
    help = "Sincroniza datos maestros de trabajadores (ASSET) y estudiantes (SIGENU) preservando datos locales de contacto (RN-01, RF-0101)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando sincronización institucional ASSET / SIGENU..."))

        # 1. Cargos
        cargos_nombres = ['Decano', 'Profesor Auxiliar', 'Especialista en Redes', 'Técnico de Soporte', 'Secretaria', 'Estudiante de 4to Año']
        cargos = {}
        for c in cargos_nombres:
            cargo, _ = Cargo.objects.get_or_create(nombre=c)
            cargos[c] = cargo

        # 2. Contratos
        contratos_nombres = ['Fijo Indeterminado', 'Determinado', 'Adiestrado', 'Estudiante Activo']
        contratos = {}
        for c in contratos_nombres:
            contrato, _ = Contrato.objects.get_or_create(nombre=c)
            contratos[c] = contrato

        # 3. Sedes
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

        # 4. Áreas
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

        # 5. Departamentos
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

        # 6. Usuarios y perfiles maestros
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

            area_obj = areas.get(u_data['area'])
            depto_obj = deptos.get(u_data['depto'])
            cargo_obj = cargos.get(u_data['cargo'])
            contrato_obj = contratos.get(u_data['contrato'])

            perfil, _ = Perfil.objects.get_or_create(usuario=user)
            # Actualizar datos maestros institucionales de ASSET / SIGENU
            perfil.ci = u_data['ci']
            perfil.sexo = u_data['sexo']
            perfil.tipo = u_data['tipo']
            perfil.area = area_obj
            perfil.depto = depto_obj
            perfil.cargo = cargo_obj
            perfil.contrato = contrato_obj
            # Preservar datos locales de contacto si ya existen; si no existen, inicializar valores
            if not perfil.celular:
                perfil.celular = '52345678'
            if not perfil.direccion:
                perfil.direccion = 'Calle Martí #45, Holguín'
            perfil.save()

        # 7. Reglas RN-02
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

        self.stdout.write(self.style.SUCCESS(
            f"Sincronización completada exitosamente.\n"
            f"- Usuarios creados: {creados}, actualizados: {actualizados}\n"
            f"- Nomencladores actualizados: {len(cargos)} cargos, {len(contratos)} contratos, {len(sedes)} sedes, {len(areas)} áreas\n"
            f"- Reglas de guardia RN-02 configuradas: {len(defaults_rn02)} ({reglas_creadas} nuevas)"
        ))
