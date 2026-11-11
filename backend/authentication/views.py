from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import CustomTokenObtainPairSerializer, UserRegistrationSerializer
from core.models import AuditLog
from core.integrations import AGAAuthAdapter
from modules.guardia_admin.models import Perfil, Area, Departamento

User = get_user_model()


def _build_user_session_payload(user, tokens=None):
    """
    Construye el diccionario completo de sesión institucional del usuario
    a partir de su registro en la base de datos y su Perfil asociado.
    """
    perfil = getattr(user, "perfil", None)
    area_nombre = perfil.area.nombre if (perfil and perfil.area) else (user.departamento or "Dirección de Informatización")
    depto_nombre = perfil.depto.nombre if (perfil and perfil.depto) else (user.departamento or area_nombre)
    cargo_nombre = perfil.cargo.nombre if (perfil and perfil.cargo) else user.get_role_display()

    payload = {
        "id": user.id,
        "perfil_id": perfil.id if perfil else None,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "role_display": user.get_role_display(),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "nombre_completo": user.get_full_name() or user.username,
        "area": area_nombre,
        "area_id": perfil.area_id if perfil else None,
        "departamento": depto_nombre,
        "depto_id": perfil.depto_id if perfil else None,
        "cargo": cargo_nombre,
        "ci": perfil.ci if perfil else "",
        "sexo": perfil.sexo if perfil else "M",
        "tipo": perfil.tipo if perfil else ("ESTUDIANTE" if user.role == "ESTUDIANTE" else "OBRERO"),
        "telefono": (perfil.celular or perfil.telefono) if perfil else (user.telefono or ""),
    }
    if tokens:
        payload["access"] = str(tokens["access"])
        payload["refresh"] = str(tokens["refresh"])
    return payload


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista institucional de inicio de sesión conectada con AGA_AUTH (RF-0109, RNF-06).
    Retorna Tokens JWT con claims del rol de la UHO y registra trazabilidad en AuditLog (RNF-11).
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        username_raw = str(request.data.get("username", "")).strip()
        password_raw = str(request.data.get("password", "")).strip()
        ip_addr = request.META.get("REMOTE_ADDR", "127.0.0.1")

        # Si el usuario ingresó correo completo (ej. carlos.leyva@uho.edu.cu), extraer usuario o buscar por email
        user_candidate = (
            User.objects.filter(username__iexact=username_raw).first()
            or User.objects.filter(email__iexact=username_raw).first()
        )
        if not user_candidate and "@" in username_raw:
            prefix = username_raw.split("@")[0]
            user_candidate = User.objects.filter(username__iexact=prefix).first()

        # Verificar adaptador AGA_AUTH (Producción o Simulación Institucional Local)
        aga_result = AGAAuthAdapter.authenticate_user(username_raw, password_raw)
        if aga_result.get("authenticated") is False:
            AuditLog.objects.create(
                usuario=user_candidate,
                accion="LOGIN_FAILED",
                modelo="AGA_AUTH",
                objeto_id=username_raw,
                detalle=f"Intento fallido de autenticación en AGA_AUTH para '{username_raw}'.",
                ip_address=ip_addr,
            )
            return Response(
                {"detail": aga_result.get("error", "Credenciales rechazadas por AGA_AUTH.")},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Si encontramos al usuario por email/alias, normalizar username en request.data
        mutable_data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if user_candidate:
            mutable_data["username"] = user_candidate.username

        serializer = self.get_serializer(data=mutable_data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            AuditLog.objects.create(
                usuario=user_candidate,
                accion="LOGIN_FAILED",
                modelo="AGA_AUTH",
                objeto_id=username_raw,
                detalle=f"Intento fallido de inicio de sesión para '{username_raw}'.",
                ip_address=ip_addr,
            )
            return Response(
                {"detail": "Credenciales institucionales inválidas en AGA_AUTH (auth.uho.edu.cu)."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = serializer.user
        AuditLog.objects.create(
            usuario=user,
            accion="LOGIN",
            modelo="AGA_AUTH",
            objeto_id=str(user.id),
            detalle=f"Inicio de sesión exitoso vía {aga_result.get('source', 'AGA_AUTH')} ({user.username} — Rol: {user.role}).",
            ip_address=ip_addr,
        )

        validated = serializer.validated_data
        session_data = _build_user_session_payload(
            user,
            tokens={"access": validated.get("access"), "refresh": validated.get("refresh")},
        )
        session_data["auth_source"] = aga_result.get("source", "AGA_AUTH_SIMULACION_LOCAL")
        return Response(session_data, status=status.HTTP_200_OK)


class SimularRolInstitucionalView(APIView):
    """
    Endpoint para el Simulador Institucional de Roles de la UHO.
    Permite conmutar entre los 6 roles oficiales del SIGCGOE durante las pruebas
    de validación de tesis obteniendo el usuario real en base de datos y su token JWT firmado.
    """
    permission_classes = [permissions.AllowAny]

    ROLE_TO_DEFAULT_USERNAME = {
        "SUPERADMIN": "superadmin",
        "JEFE_SEGURIDAD": "jefe_seguridad",
        "RESPONSABLE_AREA": "resp_area",
        "RESPONSABLE_DEPTO": "resp_depto",
        "RESPONSABLE_DEPARTAMENTO": "resp_depto",
        "TRABAJADOR": "trabajador",
        "ESTUDIANTE": "estudiante",
    }

    def post(self, request):
        role_req = str(request.data.get("role", "SUPERADMIN")).strip().upper()
        username_req = str(request.data.get("username", "")).strip()

        if role_req == "RESPONSABLE_DEPARTAMENTO":
            role_lookup = "RESPONSABLE_DEPTO"
        else:
            role_lookup = role_req

        user = None
        if username_req:
            user = User.objects.filter(username__iexact=username_req).first()

        if not user:
            default_uname = self.ROLE_TO_DEFAULT_USERNAME.get(role_req)
            if default_uname:
                user = User.objects.filter(username=default_uname).first()

        if not user:
            user = User.objects.filter(role__in=[role_req, role_lookup]).first()

        if not user:
            user = User.objects.first()

        if not user:
            return Response(
                {"error": "No hay usuarios inicializados en la base de datos. Ejecute seed_db.py."},
                status=status.HTTP_404_NOT_FOUND,
            )

        refresh = RefreshToken.for_user(user)
        refresh["username"] = user.username
        refresh["email"] = user.email
        refresh["role"] = user.role
        refresh["first_name"] = user.first_name
        refresh["last_name"] = user.last_name

        session_data = _build_user_session_payload(
            user,
            tokens={"access": str(refresh.access_token), "refresh": str(refresh)},
        )
        return Response(session_data, status=status.HTTP_200_OK)


class GestionRolesUsuariosView(APIView):
    """
    Gestión de Asignación de Roles y Alcance Organizacional a Usuarios (RF-0110, RF-0111).
    Permite listar todos los usuarios institucionales y que el SUPERADMIN modifique su rol y área/departamento.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        usuarios = User.objects.select_related("perfil", "perfil__area", "perfil__depto", "perfil__cargo").all().order_by("id")
        resultado = []
        for u in usuarios:
            resultado.append(_build_user_session_payload(u))
        return Response(resultado, status=status.HTTP_200_OK)

    def post(self, request):
        if getattr(request.user, "role", "") != "SUPERADMIN" and not request.user.is_superuser:
            return Response(
                {"error": "RF-0111: Solo el Administrador General (SUPERADMIN) puede asignar o revocar roles del sistema."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_id = request.data.get("user_id")
        nuevo_rol = request.data.get("role")
        area_id = request.data.get("area_id")
        depto_id = request.data.get("depto_id")

        target_user = User.objects.filter(id=user_id).first()
        if not target_user:
            return Response({"error": "Usuario no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        rol_anterior = target_user.role
        if nuevo_rol:
            target_user.role = nuevo_rol

        perfil, _ = Perfil.objects.get_or_create(usuario=target_user)
        if area_id:
            if str(area_id).isdigit():
                area_obj = Area.objects.filter(id=int(area_id)).first()
            else:
                area_obj = Area.objects.filter(nombre=str(area_id)).first() or Area.objects.filter(codigo=str(area_id)).first()
            if area_obj:
                perfil.area = area_obj
                target_user.departamento = area_obj.nombre
        if depto_id:
            if str(depto_id).isdigit():
                depto_obj = Departamento.objects.filter(id=int(depto_id)).first()
            else:
                depto_obj = Departamento.objects.filter(nombre=str(depto_id)).first() or Departamento.objects.filter(codigo=str(depto_id)).first()
            if depto_obj:
                perfil.depto = depto_obj

        target_user.save()
        perfil.save()

        AuditLog.objects.create(
            usuario=request.user,
            accion="UPDATE",
            modelo="CustomUser/Rol",
            objeto_id=str(target_user.id),
            detalle=f"RF-0111: Cambio de rol de '{target_user.username}' ({rol_anterior} -> {target_user.role}) en '{target_user.departamento}'.",
            ip_address=request.META.get("REMOTE_ADDR", "127.0.0.1"),
        )

        return Response({
            "mensaje": f"Rol de '{target_user.get_full_name() or target_user.username}' actualizado a {target_user.role}.",
            "usuario": _build_user_session_payload(target_user),
        }, status=status.HTTP_200_OK)


class UserRegistrationView(APIView):
    """
    Vista para el registro de personal universitario en el directorio local.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            AuditLog.objects.create(
                usuario=request.user if request.user.is_authenticated else user,
                accion="CREATE",
                modelo="CustomUser",
                objeto_id=str(user.id),
                detalle=f"Alta de usuario institucional '{user.username}' con rol {user.role}.",
                ip_address=request.META.get("REMOTE_ADDR", "127.0.0.1"),
            )
            return Response(
                {"detail": "Usuario registrado exitosamente en el sistema UHO."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    Retorna el perfil completo del usuario autenticado actualmente en la sesión.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(_build_user_session_payload(request.user))
