import os
import django

# Configurar el entorno de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.rbac import (
    ROLE_SUPERADMIN, ROLE_JEFE_SEGURIDAD, ROLE_RESPONSABLE_AREA,
    ROLE_RESPONSABLE_DEPARTAMENTO, ROLE_TRABAJADOR, ROLE_ESTUDIANTE
)
from modules.guardia_admin.models import Cargo, Contrato, Sede, Area, Departamento, Perfil

def seed():
    print("Iniciando inserción de datos de prueba...")
    
    # 1. Cargos
    cargos_nombres = ['Decano', 'Profesor Auxiliar', 'Especialista en Redes', 'Técnico de Soporte', 'Secretaria', 'Estudiante de 4to Año']
    cargos = {}
    for c in cargos_nombres:
        cargo, created = Cargo.objects.get_or_create(nombre=c)
        cargos[c] = cargo
        if created:
            print(f"Cargo creado: {c}")

    # 2. Contratos
    contratos_nombres = ['Fijo Indeterminado', 'Determinado', 'Adiestrado', 'Estudiante Activo']
    contratos = {}
    for c in contratos_nombres:
        contrato, created = Contrato.objects.get_or_create(nombre=c)
        contratos[c] = contrato
        if created:
            print(f"Contrato creado: {c}")

    # 3. Sedes
    sedes_data = [
        {'nombre': 'Sede Oscar Lucero Moya', 'direccion': 'Ave. de los Libertadores, Holguín', 'minObreras': 3, 'minEstudiantiles': 4},
        {'nombre': 'Sede Manuel Aguilera', 'direccion': 'Carretera a Guardalavaca, Holguín', 'minObreras': 2, 'minEstudiantiles': 2},
        {'nombre': 'Sede Celia Sánchez Manduley', 'direccion': 'Ave. XX Aniversario, Holguín', 'minObreras': 2, 'minEstudiantiles': 2}
    ]
    sedes = {}
    for s_data in sedes_data:
        sede, created = Sede.objects.get_or_create(
            nombre=s_data['nombre'],
            defaults={
                'direccion': s_data['direccion'],
                'minObreras': s_data['minObreras'],
                'minEstudiantiles': s_data['minEstudiantiles']
            }
        )
        sedes[s_data['nombre']] = sede
        if created:
            print(f"Sede creada: {s_data['nombre']}")

    # 4. Áreas
    areas_data = [
        {'codigo': 'FAC-INF', 'nombre': 'Facultad de Informática y Matemática', 'tieneEstudiantes': True},
        {'codigo': 'FAC-ING', 'nombre': 'Facultad de Ingeniería', 'tieneEstudiantes': True},
        {'codigo': 'DIR-INF', 'nombre': 'Dirección de Informatización', 'tieneEstudiantes': False},
        {'codigo': 'FAC-MED', 'nombre': 'Facultad de Ciencias Médicas', 'tieneEstudiantes': True}
    ]
    areas = {}
    for a_data in areas_data:
        area, created = Area.objects.get_or_create(
            codigo=a_data['codigo'],
            defaults={
                'nombre': a_data['nombre'],
                'tieneEstudiantes': a_data['tieneEstudiantes']
            }
        )
        areas[a_data['nombre']] = area
        if created:
            print(f"Área creada: {a_data['nombre']}")

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
            depto, created = Departamento.objects.get_or_create(
                codigo=d_data['codigo'],
                areaPadre=area_padre,
                defaults={'nombre': d_data['nombre']}
            )
            deptos[d_data['nombre']] = depto
            if created:
                print(f"Departamento creado: {d_data['nombre']}")

    # 6. Usuarios y Perfiles
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
            'area': 'Facultad de Informática y Matemática', 'depto': 'Depto. de Sistemas de Información', 'cargo': 'Decano'
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

    User = get_user_model()
    
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
            print(f"Usuario creado: {u_data['username']}")
        else:
            user.first_name = u_data['first_name']
            user.last_name = u_data['last_name']
            user.role = u_data['role']
            user.departamento = u_data['depto_inst']
            user.save()
            print(f"Usuario actualizado: {u_data['username']}")
            
        area_obj = areas.get(u_data['area'])
        depto_obj = deptos.get(u_data['depto'])
        cargo_obj = cargos.get(u_data['cargo'])
        contrato_obj = contratos.get(u_data['contrato'])
        
        perfil, p_created = Perfil.objects.update_or_create(
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
        if p_created:
            print(f"Perfil creado para: {u_data['username']}")

    # Asignar los responsables
    try:
        admin_user = User.objects.get(username='superadmin')
        dir_inf = areas.get('Dirección de Informatización')
        if dir_inf:
            dir_inf.responsable = admin_user
            dir_inf.save()
            
        resp_area_user = User.objects.get(username='resp_area')
        fac_inf = areas.get('Facultad de Informática y Matemática')
        if fac_inf:
            fac_inf.responsable = resp_area_user
            fac_inf.save()
            
        resp_depto_user = User.objects.get(username='resp_depto')
        depto_sist = deptos.get('Depto. de Sistemas de Información')
        if depto_sist:
            depto_sist.responsable = resp_depto_user
            print("Responsables de Área y Departamento asignados correctamente.")
    except Exception as e:
        print(f"Nota en asignación de responsables: {e}")

    # 7. Período de Guardia Activo (RF-0113 / Hito 3)
    from modules.potencial.models import PeriodoGuardia, AprobacionPotencialArea
    from modules.distribucion.models import DistribucionArea, AsignacionGuardia
    from modules.control.models import ControlGuardia, Notificacion
    import datetime

    periodo, p_created = PeriodoGuardia.objects.get_or_create(
        nombre="Junio — Julio 2026",
        defaults={
            'inicio_compromiso': datetime.date(2026, 6, 1),
            'fin_compromiso': datetime.date(2026, 6, 30),
            'inicio_aprobacion': datetime.date(2026, 7, 1),
            'fin_aprobacion': datetime.date(2026, 7, 7),
            'activo': True
        }
    )
    if p_created:
        print(f"Período de Guardia creado: {periodo.nombre}")

    # Aprobación de Potencial de la FIM para permitir asignación (RN-05)
    fac_inf = areas.get('Facultad de Informática y Matemática')
    if fac_inf:
        AprobacionPotencialArea.objects.get_or_create(
            periodo=periodo,
            area=fac_inf,
            defaults={'aprobado': True, 'fecha_aprobacion': datetime.datetime.now()}
        )

    # 8. Distribución de Guardia (MOD-06)
    sede_lucero = sedes.get('Sede Oscar Lucero Moya')
    sede_aguilera = sedes.get('Sede Manuel Aguilera')
    depto_sist = deptos.get('Depto. de Sistemas de Información')
    depto_mec = deptos.get('Depto. de Ingeniería Mecánica')

    dist1, _ = DistribucionArea.objects.get_or_create(
        periodo=periodo,
        area=fac_inf,
        departamento=depto_sist,
        sede=sede_lucero,
        tipo_turno='Diurna',
        tipo_personal='OBRERO',
        mes=6,
        año=2026,
        defaults={'dias_asignados': [7, 14, 21, 28], 'cantidad_requerida': 2}
    )
    dist2, _ = DistribucionArea.objects.get_or_create(
        periodo=periodo,
        area=fac_inf,
        departamento=depto_sist,
        sede=sede_lucero,
        tipo_turno='Nocturna',
        tipo_personal='OBRERO',
        mes=6,
        año=2026,
        defaults={'dias_asignados': [10, 24], 'cantidad_requerida': 2}
    )
    dist3, _ = DistribucionArea.objects.get_or_create(
        periodo=periodo,
        area=areas.get('Facultad de Ingeniería'),
        departamento=depto_mec,
        sede=sede_aguilera,
        tipo_turno='Diurna',
        tipo_personal='OBRERO',
        mes=6,
        año=2026,
        defaults={'dias_asignados': [3, 17, 31], 'cantidad_requerida': 2}
    )
    print("Distribuciones de Guardia creadas.")

    # 9. Asignaciones Nominales (RF-0603)
    p_trabajador = Perfil.objects.filter(usuario__username='trabajador').first()
    p_estudiante = Perfil.objects.filter(usuario__username='estudiante').first()

    asig1, _ = AsignacionGuardia.objects.get_or_create(
        distribucion=dist1,
        perfil=p_trabajador,
        fecha=datetime.date(2026, 6, 7)
    )
    asig2, _ = AsignacionGuardia.objects.get_or_create(
        distribucion=dist1,
        perfil=p_trabajador,
        fecha=datetime.date(2026, 6, 14)
    )
    asig3, _ = AsignacionGuardia.objects.get_or_create(
        distribucion=dist2,
        perfil=p_estudiante,
        fecha=datetime.date(2026, 6, 10)
    )
    print("Asignaciones Nominales creadas.")

    # 10. Controles y Evaluaciones Diarias (MOD-07 / RN-09)
    admin_usr = User.objects.filter(username='superadmin').first()
    c1, _ = ControlGuardia.objects.get_or_create(
        asignacion=asig1,
        defaults={
            'asistio': True,
            'evaluacion': 'B',
            'observaciones': 'Cumplió correctamente con el relevo de guardia.',
            'registrado_por': admin_usr
        }
    )
    c2, _ = ControlGuardia.objects.get_or_create(
        asignacion=asig2,
        defaults={
            'asistio': False,
            'evaluacion': '',  # RN-09: ausencias con evaluacion en blanco
            'observaciones': 'Ausencia injustificada del puesto asignado.',
            'registrado_por': admin_usr
        }
    )
    c3, _ = ControlGuardia.objects.get_or_create(
        asignacion=asig3,
        defaults={
            'asistio': True,
            'evaluacion': 'R',
            'observaciones': 'Llegó con 15 minutos de retraso al turno nocturno.',
            'registrado_por': admin_usr
        }
    )
    print("Controles y Evaluaciones de Guardia creados.")

    # 11. Notificaciones en Campana (MOD-09)
    for u in User.objects.all():
        Notificacion.objects.get_or_create(
            usuario=u,
            titulo="⏰ Período de Guardia Activo",
            defaults={
                'mensaje': 'El período de guardia Junio — Julio 2026 está activo en el sistema.',
                'tipo': 'INFO',
                'leido': False
            }
        )
        Notificacion.objects.get_or_create(
            usuario=u,
            titulo="📋 Revisión de Cronograma",
            defaults={
                'mensaje': 'Consulte su cronograma anual de guardia en la pestaña correspondiente.',
                'tipo': 'RECORDATORIO',
                'leido': True
            }
        )
    print("Notificaciones del sistema generadas con éxito.")

    print("Datos de prueba insertados con éxito.")

if __name__ == "__main__":
    seed()


