import os
from pathlib import Path
from datetime import timedelta
import environ

# Ruta base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# Inicializar environ
env = environ.Env()
# Leer archivo .env si existe
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# CONFIGURACIÓN DE SEGURIDAD
SECRET_KEY = env('SECRET_KEY', default='django-insecure-uho-system-development-key-2026-v1')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '[::1]', 'testserver'])

# APLICACIONES INSTALADAS
INSTALLED_APPS = [
    # Django Channels (debe ir antes de staticfiles si se usa daphne)
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Librerías de Terceros
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
    'channels',
    'storages',
    
    # Módulos del Sistema UHO
    'core',
    'authentication',
    'modules.guardia_admin',
    'modules.compromiso',
    'modules.potencial',
    'modules.distribucion',
    'modules.control',
    'modules.reportes',
]

# MIDDLEWARE
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.models.AuditMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# BASE DE DATOS (PostgreSQL por defecto, con fallback a SQLite para desarrollo sin Docker)
DATABASES = {
    'default': env.db('DATABASE_URL', default=f'sqlite:///{BASE_DIR / "db.sqlite3"}')
}

# USER MODEL PERSONALIZADO
AUTH_USER_MODEL = 'authentication.CustomUser'

# VALIDACIÓN DE CONTRASEÑAS
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# INTERNACIONALIZACIÓN (Español, Cuba)
LANGUAGE_CODE = 'es-cu'
TIME_ZONE = 'America/Havana'
USE_I18N = True
USE_TZ = True

# ARCHIVOS ESTÁTICOS Y MEDIA
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# CONFIGURACIÓN DE MINIO (S3 COMPATIBLE) PARA ARCHIVOS EN PRODUCCIÓN
USE_MINIO = env.bool('USE_MINIO', default=False)
if USE_MINIO:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = env('MINIO_ACCESS_KEY', default='minioadmin')
    AWS_SECRET_ACCESS_KEY = env('MINIO_SECRET_KEY', default='minioadmin')
    AWS_STORAGE_BUCKET_NAME = env('MINIO_BUCKET_NAME', default='uho-media')
    AWS_S3_ENDPOINT_URL = env('MINIO_ENDPOINT', default='http://localhost:9000')
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_FILE_OVERWRITE = False

# CORS SETTINGS
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=True)
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])

# CONFIGURACIÓN DE DJANGO REST FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# CONFIGURACIÓN DE JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(env('JWT_ACCESS_LIFETIME_MINS', default=120))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(env('JWT_REFRESH_LIFETIME_DAYS', default=7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# SPECTACULAR API DOCS
SPECTACULAR_SETTINGS = {
    'TITLE': 'Sistema de Informatización UHO API',
    'DESCRIPTION': 'Documentación del Sistema de Desarrollo para el Proceso de Informatización de la Universidad de Holguín (UHO)',
    'VERSION': '1.2.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CHANNEL LAYERS (WebSockets para notificaciones en tiempo real)
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

# TIPO DE CAMPO AUTO DE FAULT
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
