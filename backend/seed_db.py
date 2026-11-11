import os
import django
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import AuditLog
from core.integrations import calcular_edad_y_sexo_desde_ci
from modules.guardia_admin.models import (
    Cargo, Contrato, Sede, Area, Departamento, Perfil, ConfiguracionReglaGuardia
)
from modules.potencial.models import PeriodoGuardia, AprobacionPotencialArea
from modules.compromiso.models import CompromisoGuardia
from modules.distribucion.models import DistribucionArea, AsignacionGuardia
from modules.control.models import ControlGuardia, Notificacion

User = get_user_model()


def run_seed():
    print("======================================================================")
    print("  INICIALIZANDO BASE DE DATOS INSTITUCIONAL UHO — SIGCGOE (TESIS)     ")
    print("======================================================================")

    # 1. CARGOS INSTITUCIONALES Y MATRIZ DE PERMISOS RBAC (RF-0105, RF-0110)
    permisos_por_cargo = {
        'Administrador General': [
            'mod_admin', 'mod_trabajadores', 'mod_estudiantes', 'mod_compromiso',
            'mod_potencial', 'mod_distribucion', 'mod_control', 'mod_reportes',
            'mod_notificaciones', 'mod_api', 'aprobar_potencial', 'reabrir_potencial',
            'ver_ci_completo', 'sincronizar_primarios', 'ver_auditoria'
        ],
        'Director de Área': [
            'mod_trabajadores', 'mod_estudiantes', 'mod_compromiso', 'mod_potencial',
            'mod_distribucion', 'mod_control', 'mod_reportes', 'aprobar_potencial'
        ],
        'Decano': [
            'mod_trabajadores', 'mod_estudiantes', 'mod_compromiso', 'mod_potencial',
            'mod_distribucion', 'mod_control', 'mod_reportes', 'aprobar_potencial'
        ],
        'Jefe de Seguridad y Protección': [
            'mod_trabajadores', 'mod_estudiantes', 'mod_potencial',
            'mod_distribucion', 'mod_control', 'mod_reportes', 'mod_notificaciones'
        ],
        'Jefe de Departamento': [
            'mod_trabajadores', 'mod_estudiantes', 'mod_compromiso', 'mod_potencial',
            'mod_distribucion', 'mod_control', 'mod_reportes'
        ],
        'Profesor Titular': ['mod_compromiso', 'ver_cronograma_personal'],
        'Profesor Auxiliar': ['mod_compromiso', 'ver_cronograma_personal'],
        'Profesor Asistente': ['mod_compromiso', 'ver_cronograma_personal'],
        'Especialista en Redes y Sistemas': ['mod_compromiso', 'ver_cronograma_personal'],
        'Especialista de Seguridad': ['mod_control', 'mod_reportes', 'ver_cronograma_personal'],
        'Estudiante de 4to Año': ['mod_compromiso', 'ver_cronograma_personal'],
        'Estudiante de 3er Año': ['mod_compromiso', 'ver_cronograma_personal'],
        'Estudiante de 2do Año': ['mod_compromiso', 'ver_cronograma_personal'],
    }
    cargos = {}
    for nombre_cargo, perms in permisos_por_cargo.items():
        obj, _ = Cargo.objects.update_or_create(
            nombre=nombre_cargo,
            defaults={
                'descripcion': f'Cargo oficial universitario: {nombre_cargo}',
                'permisos': perms,
                'activo': True,
            }
        )
        cargos[nombre_cargo] = obj

    # 2. TIPOS DE CONTRATO (RF-0106)
    contratos_nombres = [
        'Indeterminado',
        'Determinado',
        'Adiestrado',
        'Contrato por Obra',
        'Estudiante Regular Diurno',
    ]
    contratos = {}
    for c_nom in contratos_nombres:
        obj, _ = Contrato.objects.update_or_create(
            nombre=c_nom,
            defaults={'descripcion': f'Régimen contractual institucional: {c_nom}', 'activo': True}
        )
        contratos[c_nom] = obj

    # 3. SEDES UNIVERSITARIAS DE LA UHO (RF-0103, RN-07)
    sedes_data = [
        {
            'nombre': 'Sede Oscar Lucero Moya',
            'direccion': 'Ave. XX Aniversario, Piedra Blanca, Holguín',
            'minObreras': 3,
            'minEstudiantiles': 4,
        },
        {
            'nombre': 'Sede Celia Sánchez Manduley',
            'direccion': 'Ave. de los Libertadores, Holguín',
            'minObreras': 2,
            'minEstudiantiles': 3,
        },
        {
            'nombre': 'Sede Manuel Fajardo',
            'direccion': 'Prolongación de Frexes, Holguín',
            'minObreras': 2,
            'minEstudiantiles': 2,
        },
        {
            'nombre': 'Sede José de la Luz y Caballero',
            'direccion': 'Ave. Capitán Urbino, Holguín',
            'minObreras': 2,
            'minEstudiantiles': 2,
        },
    ]
    sedes = {}
    for s_info in sedes_data:
        obj, _ = Sede.objects.update_or_create(
            nombre=s_info['nombre'],
            defaults={
                'direccion': s_info['direccion'],
                'minObreras': s_info['minObreras'],
                'minEstudiantiles': s_info['minEstudiantiles'],
                'activo': True,
            }
        )
        sedes[s_info['nombre']] = obj

    # 4. ÁREAS Y FACULTADES DE LA UHO (RF-0101, RN-06)
    areas_data = [
        {'codigo': 'FAC-INF', 'nombre': 'Facultad de Informática y Matemática', 'tieneEstudiantes': True},
        {'codigo': 'FAC-ING', 'nombre': 'Facultad de Ingeniería', 'tieneEstudiantes': True},
        {'codigo': 'FAC-CE', 'nombre': 'Facultad de Ciencias Empresariales y Administración', 'tieneEstudiantes': True},
        {'codigo': 'FAC-CF', 'nombre': 'Facultad de Cultura Física y Deportes', 'tieneEstudiantes': True},
        {'codigo': 'DIR-INF', 'nombre': 'Dirección de Informatización', 'tieneEstudiantes': False},
        {'codigo': 'DIR-SEG', 'nombre': 'Dirección de Seguridad y Protección Universitaria', 'tieneEstudiantes': False},
    ]
    areas = {}
    for a_info in areas_data:
        Area.objects.filter(nombre=a_info['nombre']).exclude(codigo=a_info['codigo']).delete()
        obj, _ = Area.objects.update_or_create(
            codigo=a_info['codigo'],
            defaults={
                'nombre': a_info['nombre'],
                'tieneEstudiantes': a_info['tieneEstudiantes'],
                'activo': True,
            }
        )
        areas[a_info['codigo']] = obj

    # 5. DEPARTAMENTOS POR ÁREA (RF-0102)
    deptos_data = [
        {'codigo': 'DEP-IS', 'nombre': 'Departamento de Ingeniería de Software', 'area': 'FAC-INF'},
        {'codigo': 'DEP-SI', 'nombre': 'Departamento de Sistemas de Información', 'area': 'FAC-INF'},
        {'codigo': 'DEP-MAT', 'nombre': 'Departamento de Matemática', 'area': 'FAC-INF'},
        {'codigo': 'DEP-LAB', 'nombre': 'Laboratorio de Innovación Digital', 'area': 'FAC-INF'},  # 0 integrantes para validar RF-0102
        {'codigo': 'DEP-RED', 'nombre': 'Departamento de Conectividad y Redes', 'area': 'DIR-INF'},
        {'codigo': 'DEP-DES', 'nombre': 'Departamento de Desarrollo de Software', 'area': 'DIR-INF'},
        {'codigo': 'DEP-MEC', 'nombre': 'Departamento de Ingeniería Mecánica', 'area': 'FAC-ING'},
        {'codigo': 'DEP-CIV', 'nombre': 'Departamento de Ingeniería Civil', 'area': 'FAC-ING'},
        {'codigo': 'DEP-ADM', 'nombre': 'Departamento de Administración y Economía', 'area': 'FAC-CE'},
        {'codigo': 'DEP-CF', 'nombre': 'Departamento de Cultura Física', 'area': 'FAC-CF'},
        {'codigo': 'DEP-SEG', 'nombre': 'Departamento de Guardia y Protección Física', 'area': 'DIR-SEG'},
    ]
    deptos = {}
    for d_info in deptos_data:
        Departamento.objects.filter(nombre=d_info['nombre']).exclude(codigo=d_info['codigo']).delete()
        obj, _ = Departamento.objects.update_or_create(
            codigo=d_info['codigo'],
            defaults={
                'nombre': d_info['nombre'],
                'areaPadre': areas[d_info['area']],
                'activo': True,
            }
        )
        deptos[d_info['codigo']] = obj

    # 6. REGLAS GLOBALES DE PREFERENCIA POR DEFECTO (RN-02, RF-0112)
    reglas_rn02 = [
        {'tipo_usuario': 'OBRERO', 'sexo': 'M', 'tipo_turno_defecto': 'Nocturna', 'tipo_dia_defecto': 'Semana'},
        {'tipo_usuario': 'OBRERO', 'sexo': 'F', 'tipo_turno_defecto': 'Diurna', 'tipo_dia_defecto': 'Semana'},
        {'tipo_usuario': 'ESTUDIANTE', 'sexo': 'M', 'tipo_turno_defecto': 'Nocturna', 'tipo_dia_defecto': 'Fin de Semana'},
        {'tipo_usuario': 'ESTUDIANTE', 'sexo': 'F', 'tipo_turno_defecto': 'Diurna', 'tipo_dia_defecto': 'Semana'},
    ]
    for r in reglas_rn02:
        ConfiguracionReglaGuardia.objects.update_or_create(
            tipo_usuario=r['tipo_usuario'],
            sexo=r['sexo'],
            defaults={
                'tipo_turno_defecto': r['tipo_turno_defecto'],
                'tipo_dia_defecto': r['tipo_dia_defecto'],
            }
        )

    # 7. PERÍODOS DE GUARDIA (RF-0113)
    hoy = timezone.now().date()
    periodo_activo, _ = PeriodoGuardia.objects.update_or_create(
        nombre="Período de Guardia II Semestre 2026",
        defaults={
            'inicio_compromiso': datetime.date(2026, 1, 1),
            'fin_compromiso': datetime.date(2026, 12, 20),
            'inicio_aprobacion': datetime.date(2026, 1, 15),
            'fin_aprobacion': datetime.date(2026, 12, 31),
            'activo': True,
        }
    )
    PeriodoGuardia.objects.update_or_create(
        nombre="Período de Guardia I Semestre 2026 (Histórico)",
        defaults={
            'inicio_compromiso': datetime.date(2025, 9, 1),
            'fin_compromiso': datetime.date(2025, 10, 15),
            'inicio_aprobacion': datetime.date(2025, 10, 16),
            'fin_aprobacion': datetime.date(2025, 10, 31),
            'activo': False,
        }
    )

    # 8. PERSONAL UNIVERSITARIO (TRABAJADORES DESDE ASSET Y ESTUDIANTES DESDE SIGENU)
    personal_data = [
        # --- 6 Cuentas Principales por Rol Institucional ---
        {
            'username': 'superadmin', 'first_name': 'Carlos', 'last_name': 'Leyva Rodríguez',
            'email': 'carlos.leyva@uho.edu.cu', 'role': 'SUPERADMIN',
            'ci': '75041012345', 'tipo': 'OBRERO', 'area': 'DIR-INF', 'depto': 'DEP-DES',
            'cargo': 'Administrador General', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24481101', 'cel': '52881011', 'dir': 'Calle Frexes #112 e/ Miró y Morales Lemus, Holguín',
            'ref': 'Frente al Parque Calixto García', 'emerg_nom': 'Laura Rodríguez', 'emerg_cel': '52881012'
        },
        {
            'username': 'jefe_seguridad', 'first_name': 'Elena', 'last_name': 'Rost Martínez',
            'email': 'elena.rost@uho.edu.cu', 'role': 'JEFE_SEGURIDAD',
            'ci': '79051212355', 'tipo': 'OBRERO', 'area': 'DIR-SEG', 'depto': 'DEP-SEG',
            'cargo': 'Jefe de Seguridad y Protección', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '24482205', 'cel': '52119044', 'dir': 'Ave. de los Libertadores #45, Rpto. Peralta, Holguín',
            'ref': 'Edificio 12 plantas, Apto 4B', 'emerg_nom': 'Marcos Martínez', 'emerg_cel': '52119045'
        },
        {
            'username': 'resp_area', 'first_name': 'Julio César', 'last_name': 'Gómez Torres',
            'email': 'julio.gomez@uho.edu.cu', 'role': 'RESPONSABLE_AREA',
            'ci': '82031412346', 'tipo': 'OBRERO', 'area': 'FAC-INF', 'depto': 'DEP-IS',
            'cargo': 'Decano', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24483310', 'cel': '53441280', 'dir': 'Calle Martí #78 e/ Maceo y Libertad, Holguín',
            'ref': 'Cerca de la Plaza de la Marqueta', 'emerg_nom': 'Carmen Torres', 'emerg_cel': '53441281'
        },
        {
            'username': 'resp_depto', 'first_name': 'Ramón', 'last_name': 'Valdés Almaguer',
            'email': 'ramon.valdes@uho.edu.cu', 'role': 'RESPONSABLE_DEPTO',
            'ci': '85091212348', 'tipo': 'OBRERO', 'area': 'FAC-INF', 'depto': 'DEP-IS',
            'cargo': 'Jefe de Departamento', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24484419', 'cel': '54128901', 'dir': 'Calle Luz y Caballero #34, Holguín',
            'ref': 'Próximo al Estadio Mayor General Calixto García', 'emerg_nom': 'Silvia Almaguer', 'emerg_cel': '54128902'
        },
        {
            'username': 'trabajador', 'first_name': 'José Manuel', 'last_name': 'Rodríguez Pérez',
            'email': 'jose.rodriguez@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '78041523466', 'tipo': 'OBRERO', 'area': 'FAC-INF', 'depto': 'DEP-IS',
            'cargo': 'Profesor Titular', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24461234', 'cel': '52345678', 'dir': 'Calle Martí #45 e/ Aricochea y Narciso López, Holguín',
            'ref': 'Cerca del Parque San José', 'emerg_nom': 'Luis Rodríguez', 'emerg_cel': '53987654'
        },
        {
            'username': 'estudiante', 'first_name': 'Carlos Alberto', 'last_name': 'Gómez Batista',
            'email': 'carlos.gomez@estudiantes.uho.edu.cu', 'role': 'ESTUDIANTE',
            'ci': '03102434568', 'tipo': 'ESTUDIANTE', 'area': 'FAC-INF', 'depto': 'DEP-IS',
            'cargo': 'Estudiante de 4to Año', 'contrato': 'Estudiante Regular Diurno',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Fin de Semana',
            'tel': '', 'cel': '55123490', 'dir': 'Residencia Estudiantil Bloque B, Sede Oscar Lucero Moya',
            'ref': 'Cuarto 204', 'emerg_nom': 'Alberto Gómez', 'emerg_cel': '52901122'
        },

        # --- Trabajadores Adicionales de las distintas Facultades y Direcciones ---
        {
            'username': 'maria.garcia', 'first_name': 'María del Carmen', 'last_name': 'García López',
            'email': 'maria.garcia@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '85082334577', 'tipo': 'OBRERO', 'area': 'FAC-INF', 'depto': 'DEP-SI',
            'cargo': 'Profesor Auxiliar', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '24423344', 'cel': '53456789', 'dir': 'Calle Agramonte #88, Holguín',
            'ref': 'Esquina a Carretera Central', 'emerg_nom': 'Pedro García', 'emerg_cel': '53456700'
        },
        {
            'username': 'roberto.perez', 'first_name': 'Roberto', 'last_name': 'Pérez Silva',
            'email': 'roberto.perez@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '82011045688', 'tipo': 'OBRERO', 'area': 'FAC-INF', 'depto': 'DEP-MAT',
            'cargo': 'Profesor Auxiliar', 'contrato': 'Determinado',
            'comprometido': True, 'sede': 'Sede Celia Sánchez Manduley', 'turno': 'Nocturna', 'dia': 'Fin de Semana',
            'tel': '24457788', 'cel': '54567890', 'dir': 'Rpto. Vista Alegre, Calle 5 #19, Holguín',
            'ref': 'Detrás del Policlínico Vista Alegre', 'emerg_nom': 'Rosa Silva', 'emerg_cel': '54567800'
        },
        {
            'username': 'ana.pupo', 'first_name': 'Ana Luisa', 'last_name': 'Pupo Tamayo',
            'email': 'ana.pupo@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '88110423451', 'tipo': 'OBRERO', 'area': 'FAC-INF', 'depto': 'DEP-MAT',
            'cargo': 'Profesor Asistente', 'contrato': 'Indeterminado',
            'comprometido': False, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '24471022', 'cel': '52781134', 'dir': 'Calle Arias #140, Holguín',
            'ref': 'Frente a la Biblioteca Provincial', 'emerg_nom': 'Jorge Pupo', 'emerg_cel': '52781135'
        },
        {
            'username': 'alejandro.santos', 'first_name': 'Alejandro', 'last_name': 'Santos Velázquez',
            'email': 'alejandro.santos@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '81061812340', 'tipo': 'OBRERO', 'area': 'DIR-INF', 'depto': 'DEP-RED',
            'cargo': 'Especialista en Redes y Sistemas', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24482510', 'cel': '53901122', 'dir': 'Rpto. Alcides Pino, Calle 12 #41, Holguín',
            'ref': 'Cerca de la Escuela Primaria', 'emerg_nom': 'Marta Velázquez', 'emerg_cel': '53901123'
        },
        {
            'username': 'beatriz.mendoza', 'first_name': 'Beatriz', 'last_name': 'Mendoza Feria',
            'email': 'beatriz.mendoza@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '90021423453', 'tipo': 'OBRERO', 'area': 'DIR-INF', 'depto': 'DEP-DES',
            'cargo': 'Especialista en Redes y Sistemas', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Celia Sánchez Manduley', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '24482511', 'cel': '52678912', 'dir': 'Rpto. Nuevo Holguín, Edif. 8 Apto 12',
            'ref': 'Junto al Joven Club de Computación', 'emerg_nom': 'Raúl Mendoza', 'emerg_cel': '52678913'
        },
        {
            'username': 'hector.escalona', 'first_name': 'Héctor', 'last_name': 'Escalona Ochoa',
            'email': 'hector.escalona@uho.edu.cu', 'role': 'RESPONSABLE_AREA',
            'ci': '76092212362', 'tipo': 'OBRERO', 'area': 'FAC-ING', 'depto': 'DEP-MEC',
            'cargo': 'Decano', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24481900', 'cel': '52890011', 'dir': 'Calle Maceo #201, Holguín',
            'ref': 'Cerca del Cine Martí', 'emerg_nom': 'Diana Ochoa', 'emerg_cel': '52890012'
        },
        {
            'username': 'osmani.batista', 'first_name': 'Osmani', 'last_name': 'Batista Sarmiento',
            'email': 'osmani.batista@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '84071912384', 'tipo': 'OBRERO', 'area': 'FAC-ING', 'depto': 'DEP-MEC',
            'cargo': 'Profesor Titular', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24481905', 'cel': '53112233', 'dir': 'Calle Aguilera #56, Holguín',
            'ref': 'Entre Morales Lemus y Narciso López', 'emerg_nom': 'Clara Sarmiento', 'emerg_cel': '53112234'
        },
        {
            'username': 'yadira.hijuelos', 'first_name': 'Yadira', 'last_name': 'Hijuelos Cruz',
            'email': 'yadira.hijuelos@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '89032523479', 'tipo': 'OBRERO', 'area': 'FAC-ING', 'depto': 'DEP-CIV',
            'cargo': 'Profesor Auxiliar', 'contrato': 'Indeterminado',
            'comprometido': False, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '24481920', 'cel': '54223344', 'dir': 'Rpto. Pedro Díaz Coello, Calle 3 #15, Holguín',
            'ref': 'Cerca del Consultorio Médico', 'emerg_nom': 'Mario Cruz', 'emerg_cel': '54223345'
        },
        {
            'username': 'jorge.marquez', 'first_name': 'Jorge Luis', 'last_name': 'Márquez Zaldívar',
            'email': 'jorge.marquez@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '83120512328', 'tipo': 'OBRERO', 'area': 'FAC-CE', 'depto': 'DEP-ADM',
            'cargo': 'Profesor Auxiliar', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Celia Sánchez Manduley', 'turno': 'Nocturna', 'dia': 'Semana',
            'tel': '24483010', 'cel': '52445566', 'dir': 'Calle Libertad #130, Holguín',
            'ref': 'Próximo al Parque Infantil', 'emerg_nom': 'Sonia Zaldívar', 'emerg_cel': '52445567'
        },
        {
            'username': 'miguel.almaguer', 'first_name': 'Miguel Ángel', 'last_name': 'Almaguer Cisneros',
            'email': 'miguel.almaguer@uho.edu.cu', 'role': 'TRABAJADOR',
            'ci': '80081112304', 'tipo': 'OBRERO', 'area': 'FAC-CF', 'depto': 'DEP-CF',
            'cargo': 'Profesor Auxiliar', 'contrato': 'Indeterminado',
            'comprometido': True, 'sede': 'Sede Manuel Fajardo', 'turno': 'Nocturna', 'dia': 'Fin de Semana',
            'tel': '24484020', 'cel': '53667788', 'dir': 'Prolongación de Frexes #89, Holguín',
            'ref': 'Frente a la Facultad de Cultura Física', 'emerg_nom': 'Teresa Cisneros', 'emerg_cel': '53667789'
        },

        # --- Estudiantes Adicionales sincronizados desde SIGENU ---
        {
            'username': 'ana.perez', 'first_name': 'Ana Beatriz', 'last_name': 'Pérez Vidal',
            'email': 'ana.perez@estudiantes.uho.edu.cu', 'role': 'ESTUDIANTE',
            'ci': '04021245679', 'tipo': 'ESTUDIANTE', 'area': 'FAC-INF', 'depto': 'DEP-IS',
            'cargo': 'Estudiante de 3er Año', 'contrato': 'Estudiante Regular Diurno',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '', 'cel': '55234501', 'dir': 'Calle Cuba #42, Holguín',
            'ref': 'Entre Frexes y Martí', 'emerg_nom': 'Beatriz Vidal', 'emerg_cel': '52334455'
        },
        {
            'username': 'luis.martinez', 'first_name': 'Luis Enrique', 'last_name': 'Martínez Feria',
            'email': 'luis.martinez@estudiantes.uho.edu.cu', 'role': 'ESTUDIANTE',
            'ci': '02071834520', 'tipo': 'ESTUDIANTE', 'area': 'FAC-INF', 'depto': 'DEP-SI',
            'cargo': 'Estudiante de 4to Año', 'contrato': 'Estudiante Regular Diurno',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Fin de Semana',
            'tel': '', 'cel': '55345602', 'dir': 'Residencia Estudiantil Bloque A, Sede Oscar Lucero Moya',
            'ref': 'Cuarto 108', 'emerg_nom': 'Enrique Martínez', 'emerg_cel': '52445500'
        },
        {
            'username': 'claudia.vera', 'first_name': 'Claudia', 'last_name': 'Vera Santiesteban',
            'email': 'claudia.vera@estudiantes.uho.edu.cu', 'role': 'ESTUDIANTE',
            'ci': '04090534513', 'tipo': 'ESTUDIANTE', 'area': 'FAC-INF', 'depto': 'DEP-SI',
            'cargo': 'Estudiante de 2do Año', 'contrato': 'Estudiante Regular Diurno',
            'comprometido': False, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Diurna', 'dia': 'Semana',
            'tel': '', 'cel': '55456703', 'dir': 'Rpto. Harlem, Calle 4 #22, Holguín',
            'ref': 'Cerca de la Parada de Ómnibus', 'emerg_nom': 'Miriam Santiesteban', 'emerg_cel': '52556677'
        },
        {
            'username': 'daniel.ochoa', 'first_name': 'Daniel Alejandro', 'last_name': 'Ochoa Leyva',
            'email': 'daniel.ochoa@estudiantes.uho.edu.cu', 'role': 'ESTUDIANTE',
            'ci': '03051934542', 'tipo': 'ESTUDIANTE', 'area': 'FAC-ING', 'depto': 'DEP-MEC',
            'cargo': 'Estudiante de 4to Año', 'contrato': 'Estudiante Regular Diurno',
            'comprometido': True, 'sede': 'Sede Oscar Lucero Moya', 'turno': 'Nocturna', 'dia': 'Fin de Semana',
            'tel': '', 'cel': '55567804', 'dir': 'Residencia Estudiantil Bloque C, Sede Oscar Lucero Moya',
            'ref': 'Cuarto 302', 'emerg_nom': 'Alejandro Ochoa', 'emerg_cel': '52667788'
        },
        {
            'username': 'kevin.dominguez', 'first_name': 'Kevin', 'last_name': 'Domínguez Borrero',
            'email': 'kevin.dominguez@estudiantes.uho.edu.cu', 'role': 'ESTUDIANTE',
            'ci': '03113034586', 'tipo': 'ESTUDIANTE', 'area': 'FAC-CE', 'depto': 'DEP-ADM',
            'cargo': 'Estudiante de 3er Año', 'contrato': 'Estudiante Regular Diurno',
            'comprometido': True, 'sede': 'Sede Celia Sánchez Manduley', 'turno': 'Nocturna', 'dia': 'Fin de Semana',
            'tel': '', 'cel': '55678905', 'dir': 'Calle Garayalde #77, Holguín',
            'ref': 'Próximo al Teatro Eddy Suñol', 'emerg_nom': 'Carlos Domínguez', 'emerg_cel': '52778899'
        },
    ]

    from django.contrib.auth.hashers import make_password
    hashed_default_pwd = make_password('password')

    perfiles_map = {}
    users_map = {}

    for p in personal_data:
        ci_info = calcular_edad_y_sexo_desde_ci(p['ci'])
        area_obj = areas[p['area']]
        depto_obj = deptos[p['depto']]
        cargo_obj = cargos[p['cargo']]
        contrato_obj = contratos[p['contrato']]
        sede_obj = sedes[p['sede']]

        user, created = User.objects.update_or_create(
            username=p['username'],
            defaults={
                'email': p['email'],
                'first_name': p['first_name'],
                'last_name': p['last_name'],
                'role': p['role'],
                'departamento': area_obj.nombre,
                'telefono': p['cel'],
                'is_staff': p['role'] == 'SUPERADMIN',
                'is_superuser': p['role'] == 'SUPERADMIN',
                'password': hashed_default_pwd,
            }
        )
        users_map[p['username']] = user

        Perfil.objects.filter(ci=p['ci']).exclude(usuario=user).delete()
        perfil, _ = Perfil.objects.update_or_create(
            usuario=user,
            defaults={
                'ci': p['ci'],
                'sexo': ci_info['sexo'],
                'tipo': p['tipo'],
                'contrato': contrato_obj,
                'area': area_obj,
                'depto': depto_obj,
                'cargo': cargo_obj,
                'comprometido': p['comprometido'],
                'sedePref': sede_obj,
                'tipoPref': p['turno'],
                'diaPref': p['dia'],
                'telefono': p['tel'],
                'celular': p['cel'],
                'whatsapp': p['cel'],
                'direccion': p['dir'],
                'referencia': p['ref'],
                'contactoNombre': p['emerg_nom'],
                'contactoCelular': p['emerg_cel'],
                'activo': True,
            }
        )
        perfiles_map[p['username']] = perfil

        if p['comprometido']:
            CompromisoGuardia.objects.update_or_create(
                perfil=perfil,
                periodo=periodo_activo,
                defaults={
                    'sede': sede_obj,
                    'tipo_turno': p['turno'],
                    'tipo_dia': p['dia'],
                    'es_estudiante': (p['tipo'] == 'ESTUDIANTE'),
                }
            )

    # Asignar responsables formales a Áreas y Departamentos
    areas['DIR-INF'].responsable = users_map['superadmin']
    areas['DIR-INF'].save()
    areas['DIR-SEG'].responsable = users_map['jefe_seguridad']
    areas['DIR-SEG'].save()
    areas['FAC-INF'].responsable = users_map['resp_area']
    areas['FAC-INF'].save()
    areas['FAC-ING'].responsable = users_map['hector.escalona']
    areas['FAC-ING'].save()

    deptos['DEP-IS'].responsable = users_map['resp_depto']
    deptos['DEP-IS'].save()

    # 9. APROBACIONES DE POTENCIAL POR ÁREA (MOD-05, RN-04)
    # Aprobamos FAC-INF y DIR-INF, dejando FAC-ING pendiente para que se puedan probar ambos estados
    for cod_aprob in ['FAC-INF', 'DIR-INF', 'FAC-CE']:
        AprobacionPotencialArea.objects.update_or_create(
            periodo=periodo_activo,
            area=areas[cod_aprob],
            defaults={
                'aprobado': True,
                'aprobado_por': users_map['resp_area'] if cod_aprob == 'FAC-INF' else users_map['superadmin'],
                'fecha_aprobacion': timezone.now(),
            }
        )

    # 10. DISTRIBUCIONES MENSUALES Y ASIGNACIONES NOMINALES (MOD-06, RF-0601 a RF-0605)
    mes_actual = hoy.month
    anio_actual = hoy.year
    dia_hoy = hoy.day

    dias_fim_obr = sorted(list({7, 14, 21, 28, dia_hoy}))
    dias_fim_est = sorted(list({6, 13, 20, 27, dia_hoy}))

    # Distribución para el mes actual y también para Junio 2026 (si mes_actual != 6)
    meses_a_poblar = sorted(list({6, mes_actual}))
    for m_num in meses_a_poblar:
        dist_fim_obr, _ = DistribucionArea.objects.update_or_create(
            periodo=periodo_activo,
            area=areas['FAC-INF'],
            departamento=deptos['DEP-IS'],
            sede=sedes['Sede Oscar Lucero Moya'],
            tipo_turno='Diurna',
            tipo_personal='OBRERO',
            mes=m_num,
            año=anio_actual,
            defaults={
                'dias_asignados': dias_fim_obr,
                'cantidad_requerida': 3,
            }
        )

        dist_fim_noc, _ = DistribucionArea.objects.update_or_create(
            periodo=periodo_activo,
            area=areas['FAC-INF'],
            departamento=deptos['DEP-SI'],
            sede=sedes['Sede Oscar Lucero Moya'],
            tipo_turno='Nocturna',
            tipo_personal='OBRERO',
            mes=m_num,
            año=anio_actual,
            defaults={
                'dias_asignados': dias_fim_obr,
                'cantidad_requerida': 3,
            }
        )

        dist_fim_est, _ = DistribucionArea.objects.update_or_create(
            periodo=periodo_activo,
            area=areas['FAC-INF'],
            departamento=deptos['DEP-IS'],
            sede=sedes['Sede Oscar Lucero Moya'],
            tipo_turno='Nocturna',
            tipo_personal='ESTUDIANTE',
            mes=m_num,
            año=anio_actual,
            defaults={
                'dias_asignados': dias_fim_est,
                'cantidad_requerida': 4,
            }
        )

        dist_dir_inf, _ = DistribucionArea.objects.update_or_create(
            periodo=periodo_activo,
            area=areas['DIR-INF'],
            departamento=deptos['DEP-RED'],
            sede=sedes['Sede Celia Sánchez Manduley'],
            tipo_turno='Nocturna',
            tipo_personal='OBRERO',
            mes=m_num,
            año=anio_actual,
            defaults={
                'dias_asignados': sorted(list({10, 18, 25, dia_hoy})),
                'cantidad_requerida': 2,
            }
        )

        dist_ing_obr, _ = DistribucionArea.objects.update_or_create(
            periodo=periodo_activo,
            area=areas['FAC-ING'],
            departamento=deptos['DEP-MEC'],
            sede=sedes['Sede Oscar Lucero Moya'],
            tipo_turno='Diurna',
            tipo_personal='OBRERO',
            mes=m_num,
            año=anio_actual,
            defaults={
                'dias_asignados': sorted(list({12, 19, 26, dia_hoy})),
                'cantidad_requerida': 3,
            }
        )

        # Crear asignaciones nominales y controles (RF-0603, RF-0701, RN-09)
        asignaciones_plan = [
            (dist_fim_obr, perfiles_map['trabajador'], 7, True, 'B', 'Cumplió puntualmente el recorrido de seguridad.'),
            (dist_fim_obr, perfiles_map['maria.garcia'], 14, False, '', 'Ausencia por certificado médico (RN-09: evaluación en blanco).'),
            (dist_fim_obr, perfiles_map['resp_depto'], 21, True, 'B', 'Sin incidencias reportadas en el turno diurno.'),
            (dist_fim_obr, perfiles_map['trabajador'], 28, True, 'B', 'Entrega de posta en orden.'),
            (dist_fim_noc, perfiles_map['roberto.perez'], 7, True, 'R', 'Llegada con 10 minutos de retraso al cambio de turno.'),
            (dist_fim_noc, perfiles_map['resp_area'], 14, True, 'B', 'Supervisión de guardia nocturna completada.'),
            (dist_fim_est, perfiles_map['estudiante'], 6, True, 'B', 'Excelente disciplina durante la guardia estudiantil.'),
            (dist_fim_est, perfiles_map['ana.perez'], 13, True, 'B', 'Guardia estudiantil cumplida satisfactoriamente.'),
            (dist_fim_est, perfiles_map['luis.martinez'], 20, True, 'B', 'Participación destacada en el control de acceso.'),
            (dist_fim_est, perfiles_map['estudiante'], 27, True, 'B', 'Segundo turno del mes cumplido sin novedades.'),
            (dist_dir_inf, perfiles_map['alejandro.santos'], 10, True, 'B', 'Verificación del nodo central y servidores UHO.'),
            (dist_dir_inf, perfiles_map['beatriz.mendoza'], 18, True, 'B', 'Control de seguridad en Dirección de Informatización.'),
            (dist_ing_obr, perfiles_map['osmani.batista'], 12, True, 'B', 'Guardia en laboratorios de Ingeniería Mecánica.'),
            (dist_ing_obr, perfiles_map['hector.escalona'], 19, True, 'B', 'Recorrido de control en Facultad de Ingeniería.'),
        ]

        # Si hoy no coincide con los días fijos anteriores, agregamos guardias para HOY
        # para que la vista "Guardias del Día" (RF-0604) y "Control Diario" (RF-0701) tengan datos hoy mismo
        if m_num == mes_actual:
            asignaciones_plan.extend([
                (dist_fim_obr, perfiles_map['trabajador'], dia_hoy, True, 'B', 'Turno del día en curso — Presente en posta principal.'),
                (dist_fim_noc, perfiles_map['maria.garcia'], dia_hoy, True, 'B', 'Turno asignado en Sede Oscar Lucero Moya.'),
                (dist_fim_est, perfiles_map['estudiante'], dia_hoy, True, 'B', 'Guardia estudiantil activa en residencia universitaria.'),
                (dist_dir_inf, perfiles_map['alejandro.santos'], dia_hoy, True, 'B', 'Guardia operativa en nodo central UHO.'),
            ])

        for dist_obj, perf_obj, dia_num, asist, eval_nota, obs_txt in asignaciones_plan:
            try:
                fecha_asig = datetime.date(anio_actual, m_num, dia_num)
            except ValueError:
                continue

            if dia_num not in dist_obj.dias_asignados:
                dist_obj.dias_asignados.append(dia_num)
                dist_obj.save()

            asig_obj, _ = AsignacionGuardia.objects.update_or_create(
                perfil=perf_obj,
                fecha=fecha_asig,
                defaults={
                    'distribucion': dist_obj,
                    'notificado_semana': True,
                    'notificado_dia': True,
                }
            )
            ControlGuardia.objects.update_or_create(
                asignacion=asig_obj,
                defaults={
                    'asistio': asist,
                    'evaluacion': eval_nota if asist else '',
                    'observaciones': obs_txt,
                    'registrado_por': users_map['jefe_seguridad'],
                }
            )

    # 11. NOTIFICACIONES INSTITUCIONALES (MOD-09, RN-08)
    for uname, u_obj in users_map.items():
        if Notificacion.objects.filter(usuario=u_obj).count() == 0:
            Notificacion.objects.create(
                usuario=u_obj,
                titulo="📅 Recordatorio Semanal de Guardia (RN-08)",
                mensaje=f"Estimado(a) {u_obj.get_full_name()}, le recordamos verificar sus turnos asignados en el Período de Guardia II Semestre 2026 en la Sede Oscar Lucero Moya.",
                tipo="RECORDATORIO",
                leido=False,
            )
            Notificacion.objects.create(
                usuario=u_obj,
                titulo="🏛️ Sincronización Institucional Completada (ASSET / SIGENU)",
                mensaje="El directorio primario de trabajadores y estudiantes de la Universidad de Holguín ha sido verificado exitosamente respetando sus datos locales de contacto (RN-01).",
                tipo="INFO",
                leido=True,
            )

    # 12. TRAZAS DE AUDITORÍA INSTITUCIONAL (RNF-06, RNF-11)
    if AuditLog.objects.count() == 0:
        eventos_iniciales = [
            (users_map['superadmin'], 'SYNC', 'ASSET / SIGENU', 'UHO-2026', 'Sincronización inicial de registros primarios ASSET (Trabajadores) y SIGENU (Estudiantes) preservando datos locales de contacto (RN-01).'),
            (users_map['superadmin'], 'CREATE', 'PeriodoGuardia', str(periodo_activo.id), 'Apertura oficial del Período de Guardia II Semestre 2026 (RF-0113).'),
            (users_map['resp_area'], 'APPROVE', 'AprobacionPotencialArea', 'FAC-INF', 'RN-04 & RF-0503: Aprobación y cierre del potencial de guardia de la Facultad de Informática y Matemática.'),
            (users_map['jefe_seguridad'], 'CREATE', 'DistribucionArea', 'Sede Oscar Lucero Moya', 'RF-0601: Publicación de la distribución mensual de guardia obrera y estudiantil cumpliendo mínimos de sede (RN-07).'),
            (users_map['jefe_seguridad'], 'UPDATE', 'ControlGuardia', 'Registro Diario', 'RF-0701 & RN-09: Registro de asistencia y evaluación del cumplimiento de la guardia universitaria.'),
            (users_map['superadmin'], 'LOGIN', 'AGA_AUTH', str(users_map['superadmin'].id), 'Autenticación institucional verificada mediante servicio AGA_AUTH (auth.uho.edu.cu).'),
        ]
        for u_log, acc, mod, obj_id, det in eventos_iniciales:
            AuditLog.objects.create(
                usuario=u_log,
                accion=acc,
                modelo=mod,
                objeto_id=obj_id,
                detalle=det,
                ip_address='10.14.0.10'
            )

    print("======================================================================")
    print(f"  SEED COMPLETADO CON ÉXITO:")
    print(f"  - Sedes UHO: {Sede.objects.count()}")
    print(f"  - Áreas / Facultades: {Area.objects.count()}")
    print(f"  - Departamentos: {Departamento.objects.count()}")
    print(f"  - Perfiles (Trabajadores + Estudiantes): {Perfil.objects.count()}")
    print(f"  - Compromisos Firmados: {CompromisoGuardia.objects.count()}")
    print(f"  - Distribuciones Mensuales: {DistribucionArea.objects.count()}")
    print(f"  - Asignaciones Nominales: {AsignacionGuardia.objects.count()}")
    print(f"  - Controles de Guardia (RN-09): {ControlGuardia.objects.count()}")
    print(f"  - Logs de Auditoría (RNF-11): {AuditLog.objects.count()}")
    print("======================================================================")


if __name__ == '__main__':
    run_seed()
