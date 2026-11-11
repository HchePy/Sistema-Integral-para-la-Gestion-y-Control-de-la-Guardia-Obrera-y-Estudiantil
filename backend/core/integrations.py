"""
Adaptadores de Integración Institucional — Universidad de Holguín (UHO)
=======================================================================
Este módulo implementa la capa de interoperabilidad del SIGCGOE con los
servicios centrales de la Universidad de Holguín:
1. AGA_AUTH (auth.uho.edu.cu) — Autenticación centralizada universitaria (RF-0109, RNF-06).
2. ASSET (asset.uho.edu.cu) — Sistema de Recursos Humanos / Trabajadores (RF-0107, RN-01).
3. SIGENU (sigenu.uho.edu.cu) — Sistema de Gestión de la Nueva Universidad / Estudiantes (RF-0108, RN-01).

Diseño para Producción y Simulación Local:
- Si las variables de entorno `AGA_AUTH_URL`, `ASSET_API_URL` o `SIGENU_API_URL`
  están configuradas con un endpoint de producción accesible en la intranet UHO,
  los adaptadores realizan la petición HTTP/REST real con timeout seguro.
- Si no hay conexión con la red de producción (modo simulación local / pruebas de tesis),
  los adaptadores operan automáticamente contra el catálogo institucional simulado
  de la Universidad de Holguín, garantizando 100% de funcionalidad y persistencia en BD.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import date


def calcular_edad_y_sexo_desde_ci(ci_str, fecha_referencia=None):
    """
    RN-01: Extrae automáticamente la fecha de nacimiento, edad actual y sexo
    a partir de los 11 dígitos del Carné de Identidad cubano (AAMMDDSSSSCV).
    - Dígitos 0-5 (AAMMDD): Fecha de nacimiento.
    - Dígito 9 (penúltimo dígito): Par = Masculino ('M'), Impar = Femenino ('F').
    """
    ci_clean = str(ci_str or "").strip()
    if len(ci_clean) != 11 or not ci_clean.isdigit():
        return {"edad": None, "sexo": "M"}

    try:
        aa = int(ci_clean[0:2])
        mm = int(ci_clean[2:4])
        dd = int(ci_clean[4:6])
        digito_sexo = int(ci_clean[9])
        sexo = "M" if digito_sexo % 2 == 0 else "F"

        hoy = fecha_referencia if fecha_referencia is not None else date.today()
        yy_actual = hoy.year % 100
        siglo = 1900 if aa > yy_actual else 2000
        anio_nac = siglo + aa
        fecha_nac = date(anio_nac, mm, dd)
        edad = hoy.year - fecha_nac.year - ((hoy.month, hoy.day) < (fecha_nac.month, fecha_nac.day))
        return {"edad": max(17, edad), "sexo": sexo}
    except Exception:
        return {"edad": 30, "sexo": "M"}


class AGAAuthAdapter:
    """
    Adaptador de Autenticación Institucional AGA_AUTH (auth.uho.edu.cu).
    Cumple con RF-0109, RNF-06 y RNF-13 (No almacenamiento de contraseñas en texto plano).
    """

    @classmethod
    def authenticate_user(cls, username, password):
        aga_url = os.environ.get("AGA_AUTH_URL", "").strip()
        if aga_url and aga_url.startswith("http"):
            try:
                payload = json.dumps({"username": username, "password": password}).encode("utf-8")
                req = urllib.request.Request(
                    f"{aga_url.rstrip('/')}/oauth/token",
                    data=payload,
                    headers={"Content-Type": "application/json", "Accept": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=4) as response:
                    if response.status == 200:
                        data = json.loads(response.read().decode("utf-8"))
                        return {"authenticated": True, "source": "AGA_AUTH_PRODUCCION", "data": data}
            except urllib.error.HTTPError as e:
                if e.code in (401, 403):
                    return {"authenticated": False, "source": "AGA_AUTH_PRODUCCION", "error": "Credenciales rechazadas por AGA_AUTH."}
            except Exception:
                # Fallback transparente a simulación local si no hay alcance de red a auth.uho.edu.cu
                pass

        return {"authenticated": None, "source": "AGA_AUTH_SIMULACION_LOCAL"}


class AssetRRHHAdapter:
    """
    Adaptador del Registro Primario de Recursos Humanos (ASSET - UHO).
    Provee los datos maestros de trabajadores universitarios (RF-0107, RN-01).
    """

    CATALOGO_TRABAJADORES_UHO = [
        {
            "username": "carlos.leyva",
            "first_name": "Carlos",
            "last_name": "Leyva Rodríguez",
            "email": "carlos.leyva@uho.edu.cu",
            "ci": "75041012345",
            "area_codigo": "DIR-INF",
            "depto_codigo": "DEP-DES",
            "cargo": "Director de Área",
            "contrato": "Indeterminado",
            "role": "SUPERADMIN",
        },
        {
            "username": "elena.rost",
            "first_name": "Elena",
            "last_name": "Rost Martínez",
            "email": "elena.rost@uho.edu.cu",
            "ci": "79051212355",
            "area_codigo": "DIR-SEG",
            "depto_codigo": "DEP-SEG",
            "cargo": "Jefe de Seguridad y Protección",
            "contrato": "Indeterminado",
            "role": "JEFE_SEGURIDAD",
        },
        {
            "username": "julio.gomez",
            "first_name": "Julio César",
            "last_name": "Gómez Torres",
            "email": "julio.gomez@uho.edu.cu",
            "ci": "82031412346",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-IS",
            "cargo": "Decano",
            "contrato": "Indeterminado",
            "role": "RESPONSABLE_AREA",
        },
        {
            "username": "ramon.valdes",
            "first_name": "Ramón",
            "last_name": "Valdés Almaguer",
            "email": "ramon.valdes@uho.edu.cu",
            "ci": "85091212348",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-IS",
            "cargo": "Jefe de Departamento",
            "contrato": "Indeterminado",
            "role": "RESPONSABLE_DEPTO",
        },
        {
            "username": "jose.rodriguez",
            "first_name": "José Manuel",
            "last_name": "Rodríguez Pérez",
            "email": "jose.rodriguez@uho.edu.cu",
            "ci": "78041523466",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-IS",
            "cargo": "Profesor Titular",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "maria.garcia",
            "first_name": "María del Carmen",
            "last_name": "García López",
            "email": "maria.garcia@uho.edu.cu",
            "ci": "85082334577",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-SI",
            "cargo": "Profesor Auxiliar",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "roberto.perez",
            "first_name": "Roberto",
            "last_name": "Pérez Silva",
            "email": "roberto.perez@uho.edu.cu",
            "ci": "82011045688",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-MAT",
            "cargo": "Profesor Auxiliar",
            "contrato": "Determinado",
            "role": "TRABAJADOR",
        },
        {
            "username": "ana.pupo",
            "first_name": "Ana Luisa",
            "last_name": "Pupo Tamayo",
            "email": "ana.pupo@uho.edu.cu",
            "ci": "88110423451",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-MAT",
            "cargo": "Profesor Asistente",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "alejandro.santos",
            "first_name": "Alejandro",
            "last_name": "Santos Velázquez",
            "email": "alejandro.santos@uho.edu.cu",
            "ci": "81061812340",
            "area_codigo": "DIR-INF",
            "depto_codigo": "DEP-RED",
            "cargo": "Especialista en Redes y Sistemas",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "beatriz.mendoza",
            "first_name": "Beatriz",
            "last_name": "Mendoza Feria",
            "email": "beatriz.mendoza@uho.edu.cu",
            "ci": "90021423453",
            "area_codigo": "DIR-INF",
            "depto_codigo": "DEP-DES",
            "cargo": "Especialista en Redes y Sistemas",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "hector.escalona",
            "first_name": "Héctor",
            "last_name": "Escalona Ochoa",
            "email": "hector.escalona@uho.edu.cu",
            "ci": "76092212362",
            "area_codigo": "FAC-ING",
            "depto_codigo": "DEP-MEC",
            "cargo": "Decano",
            "contrato": "Indeterminado",
            "role": "RESPONSABLE_AREA",
        },
        {
            "username": "osmani.batista",
            "first_name": "Osmani",
            "last_name": "Batista Sarmiento",
            "email": "osmani.batista@uho.edu.cu",
            "ci": "84071912384",
            "area_codigo": "FAC-ING",
            "depto_codigo": "DEP-MEC",
            "cargo": "Profesor Titular",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "yadira.hijuelos",
            "first_name": "Yadira",
            "last_name": "Hijuelos Cruz",
            "email": "yadira.hijuelos@uho.edu.cu",
            "ci": "89032523479",
            "area_codigo": "FAC-ING",
            "depto_codigo": "DEP-CIV",
            "cargo": "Profesor Auxiliar",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "jorge.marquez",
            "first_name": "Jorge Luis",
            "last_name": "Márquez Zaldívar",
            "email": "jorge.marquez@uho.edu.cu",
            "ci": "83120512328",
            "area_codigo": "FAC-CE",
            "depto_codigo": "DEP-ADM",
            "cargo": "Profesor Auxiliar",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
        {
            "username": "dania.campana",
            "first_name": "Dania",
            "last_name": "Campaña Rovira",
            "email": "dania.campana@uho.edu.cu",
            "ci": "91051723415",
            "area_codigo": "FAC-CE",
            "depto_codigo": "DEP-ADM",
            "cargo": "Profesor Asistente",
            "contrato": "Determinado",
            "role": "TRABAJADOR",
        },
        {
            "username": "miguel.almaguer",
            "first_name": "Miguel Ángel",
            "last_name": "Almaguer Cisneros",
            "email": "miguel.almaguer@uho.edu.cu",
            "ci": "80081112304",
            "area_codigo": "FAC-CF",
            "depto_codigo": "DEP-CF",
            "cargo": "Profesor Auxiliar",
            "contrato": "Indeterminado",
            "role": "TRABAJADOR",
        },
    ]

    @classmethod
    def fetch_trabajadores(cls):
        asset_url = os.environ.get("ASSET_API_URL", "").strip()
        if asset_url and asset_url.startswith("http"):
            try:
                req = urllib.request.Request(
                    f"{asset_url.rstrip('/')}/trabajadores",
                    headers={"Accept": "application/json"},
                    method="GET",
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        return {
                            "source": "ASSET_PRODUCCION",
                            "registros": json.loads(response.read().decode("utf-8")),
                        }
            except Exception:
                pass
        return {
            "source": "ASSET_SIMULACION_INSTITUCIONAL_UHO",
            "registros": cls.CATALOGO_TRABAJADORES_UHO,
        }


class SigenuAdapter:
    """
    Adaptador del Registro Primario Académico (SIGENU - UHO).
    Provee los datos maestros de estudiantes activos por Facultad (RF-0108, RN-01).
    """

    CATALOGO_ESTUDIANTES_UHO = [
        {
            "username": "carlos.gomez",
            "first_name": "Carlos Alberto",
            "last_name": "Gómez Batista",
            "email": "carlos.gomez@estudiantes.uho.edu.cu",
            "ci": "03102434568",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-IS",
            "cargo": "Estudiante de 4to Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "ana.perez",
            "first_name": "Ana Beatriz",
            "last_name": "Pérez Vidal",
            "email": "ana.perez@estudiantes.uho.edu.cu",
            "ci": "04021245679",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-IS",
            "cargo": "Estudiante de 3er Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "luis.martinez",
            "first_name": "Luis Enrique",
            "last_name": "Martínez Feria",
            "email": "luis.martinez@estudiantes.uho.edu.cu",
            "ci": "02071834520",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-SI",
            "cargo": "Estudiante de 4to Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "claudia.vera",
            "first_name": "Claudia",
            "last_name": "Vera Santiesteban",
            "email": "claudia.vera@estudiantes.uho.edu.cu",
            "ci": "04090534513",
            "area_codigo": "FAC-INF",
            "depto_codigo": "DEP-SI",
            "cargo": "Estudiante de 2do Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "daniel.ochea",
            "first_name": "Daniel Alejandro",
            "last_name": "Ochoa Leyva",
            "email": "daniel.ochoa@estudiantes.uho.edu.cu",
            "ci": "03051934542",
            "area_codigo": "FAC-ING",
            "depto_codigo": "DEP-MEC",
            "cargo": "Estudiante de 4to Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "laura.cordoves",
            "first_name": "Laura Patricia",
            "last_name": "Cordovés Aguilera",
            "email": "laura.cordoves@estudiantes.uho.edu.cu",
            "ci": "05012234535",
            "area_codigo": "FAC-ING",
            "depto_codigo": "DEP-CIV",
            "cargo": "Estudiante de 2do Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "kevin.dominguez",
            "first_name": "Kevin",
            "last_name": "Domínguez Borrero",
            "email": "kevin.dominguez@estudiantes.uho.edu.cu",
            "ci": "03113034586",
            "area_codigo": "FAC-CE",
            "depto_codigo": "DEP-ADM",
            "cargo": "Estudiante de 3er Año",
            "contrato": "Estudiante Regular Diurno",
        },
        {
            "username": "gabriela.proenza",
            "first_name": "Gabriela",
            "last_name": "Proenza Rondón",
            "email": "gabriela.proenza@estudiantes.uho.edu.cu",
            "ci": "04061434597",
            "area_codigo": "FAC-CF",
            "depto_codigo": "DEP-CF",
            "cargo": "Estudiante de 3er Año",
            "contrato": "Estudiante Regular Diurno",
        },
    ]

    @classmethod
    def fetch_estudiantes(cls):
        sigenu_url = os.environ.get("SIGENU_API_URL", "").strip()
        if sigenu_url and sigenu_url.startswith("http"):
            try:
                req = urllib.request.Request(
                    f"{sigenu_url.rstrip('/')}/estudiantes-activos",
                    headers={"Accept": "application/json"},
                    method="GET",
                )
                with urllib.request.urlopen(req, timeout=5) as response:
                    if response.status == 200:
                        return {
                            "source": "SIGENU_PRODUCCION",
                            "registros": json.loads(response.read().decode("utf-8")),
                        }
            except Exception:
                pass
        return {
            "source": "SIGENU_SIMULACION_INSTITUCIONAL_UHO",
            "registros": cls.CATALOGO_ESTUDIANTES_UHO,
        }
