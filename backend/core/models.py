from django.db import models
from django.conf import settings
import threading

# Almacenamiento local del hilo para capturar el usuario actual y la dirección IP en cada request
_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

def get_current_ip():
    return getattr(_thread_locals, 'ip', '')

class AuditMiddleware:
    """
    Middleware de Django para guardar información de la petición en el contexto de ejecución local del hilo.
    Permite registrar al usuario e IP en operaciones CRUD automáticas sin tener que pasarlo explícitamente a los modelos.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = request.user if request.user.is_authenticated else None
        
        # Obtener IP real detrás de proxys como Nginx
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            _thread_locals.ip = x_forwarded_for.split(',')[0].strip()
        else:
            _thread_locals.ip = request.META.get('REMOTE_ADDR', '')
            
        response = self.get_response(request)
        return response

class AuditLog(models.Model):
    """
    Modelo para guardar los registros de auditoría (logs) requeridos institucionalmente.
    """
    ACCION_CHOICES = [
        ('CREAR', 'Crear'),
        ('MODIFICAR', 'Modificar'),
        ('ELIMINAR', 'Eliminar'),
    ]
    
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs_auditoria',
        verbose_name='Usuario Ejecutor'
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='Dirección IP')
    accion = models.CharField(max_length=15, choices=ACCION_CHOICES, verbose_name='Acción')
    tabla = models.CharField(max_length=100, verbose_name='Tabla / Modelo')
    objeto_id = models.CharField(max_length=100, verbose_name='ID del Objeto')
    detalle = models.TextField(verbose_name='Detalle de Cambios')
    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name='Fecha y Hora')

    class Meta:
        verbose_name = 'Registro de Auditoría'
        verbose_name_plural = 'Registros de Auditoría'
        ordering = ['-fecha_registro']

    def __init__(self, *args, **kwargs):
        if 'modelo' in kwargs and 'tabla' not in kwargs:
            kwargs['tabla'] = kwargs.pop('modelo')
        elif 'modelo' in kwargs:
            kwargs.pop('modelo')
        super().__init__(*args, **kwargs)

    @property
    def modelo(self):
        return self.tabla

    @property
    def fecha(self):
        return self.fecha_registro

    def __str__(self):
        return f"{self.fecha_registro} - {self.usuario} - {self.accion} en {self.tabla}"

class AuditableModel(models.Model):
    """
    Clase abstracta que añade campos de fecha y registra de manera automática
    cambios en la base de datos para auditoría institucional.
    """
    creado_en = models.DateTimeField(auto_now_add=True, verbose_name='Creado en')
    actualizado_en = models.DateTimeField(auto_now=True, verbose_name='Actualizado en')

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        es_nuevo = self.pk is None
        usuario = get_current_user()
        ip = get_current_ip()
        
        # Guardar el registro
        super().save(*args, **kwargs)
        
        # Registrar auditoría
        accion = 'CREAR' if es_nuevo else 'MODIFICAR'
        detalles = f"Datos guardados del modelo {self.__class__.__name__}"
        
        AuditLog.objects.create(
            usuario=usuario,
            ip_address=ip,
            accion=accion,
            tabla=self.__class__.__name__,
            objeto_id=str(self.pk),
            detalle=detalles
        )

    def delete(self, *args, **kwargs):
        pk_borrado = self.pk
        usuario = get_current_user()
        ip = get_current_ip()
        
        # Registrar auditoría antes de borrar de la base de datos
        AuditLog.objects.create(
            usuario=usuario,
            ip_address=ip,
            accion='ELIMINAR',
            tabla=self.__class__.__name__,
            objeto_id=str(pk_borrado),
            detalle=f"Objeto de tipo {self.__class__.__name__} eliminado permanentemente."
        )
        
        super().delete(*args, **kwargs)
