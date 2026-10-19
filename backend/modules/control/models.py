from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from core.models import AuditableModel
from modules.distribucion.models import AsignacionGuardia

class ControlGuardia(AuditableModel):
    """
    Registro diario del cumplimiento y evaluación de la guardia (RF-0701, RF-0702).
    Aplica RN-09 (Evaluaciones B/R/M e inasistencias en blanco).
    """
    EVALUACION_CHOICES = [
        ('B', 'Bien'),
        ('R', 'Regular'),
        ('M', 'Mal'),
    ]

    asignacion = models.OneToOneField(
        AsignacionGuardia,
        on_delete=models.CASCADE,
        related_name="control",
        verbose_name="Guardia Asignada"
    )
    asistio = models.BooleanField(
        default=True,
        verbose_name="¿Asistió a la guardia?"
    )
    evaluacion = models.CharField(
        max_length=5,
        blank=True,
        choices=EVALUACION_CHOICES,
        verbose_name="Evaluación de Desempeño"
    )
    observaciones = models.TextField(
        blank=True,
        default='',
        verbose_name="Observaciones / Incidencias"
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="controles_guardia_registrados",
        verbose_name="Responsable de Control"
    )
    fecha_registro = models.DateTimeField(
        auto_now=True,
        verbose_name="Fecha y Hora de Registro"
    )

    class Meta:
        verbose_name = "Control y Evaluación de Guardia"
        verbose_name_plural = "Controles y Evaluaciones de Guardia"
        ordering = ["-fecha_registro"]

    def __str__(self):
        estado_asist = "CUMPLIÓ" if self.asistio else "AUSENCIA"
        eval_str = f" ({self.evaluacion})" if self.evaluacion else ""
        return f"{self.asignacion.fecha} | {self.asignacion.perfil.usuario.username} - {estado_asist}{eval_str}"

    def clean(self):
        super().clean()
        # RN-09: Si no asistió, la evaluación debe quedar en blanco obligatoriamente
        if not self.asistio and self.evaluacion:
            self.evaluacion = ''

        # Si asistió y se colocó evaluación, debe ser B, R o M
        if self.asistio and self.evaluacion and self.evaluacion not in ['B', 'R', 'M']:
            raise ValidationError({
                'evaluacion': "Las evaluaciones válidas según RN-09 son 'B' (Bien), 'R' (Regular) o 'M' (Mal)."
            })

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class Notificacion(AuditableModel):
    """
    Sistema institucional de notificaciones y recordatorios (RF-0901 a RF-0905, RN-08).
    Alimenta la campanita interna de notificaciones del Header y emula alertas por correo.
    """
    TIPO_CHOICES = [
        ('INFO', 'Información Institucional'),
        ('RECORDATORIO', 'Recordatorio de Guardia'),
        ('ALERTA', 'Alerta Operativa'),
    ]

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificaciones",
        verbose_name="Usuario Destinatario"
    )
    titulo = models.CharField(
        max_length=200,
        verbose_name="Título"
    )
    mensaje = models.TextField(
        verbose_name="Mensaje"
    )
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_CHOICES,
        default='INFO',
        verbose_name="Tipo de Notificación"
    )
    leido = models.BooleanField(
        default=False,
        verbose_name="¿Leído?"
    )
    fecha_envio = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha y Hora de Envío"
    )

    class Meta:
        verbose_name = "Notificación Institucional"
        verbose_name_plural = "Notificaciones Institucionales"
        ordering = ["-fecha_envio"]

    def __str__(self):
        leido_str = "Leído" if self.leido else "Nuevo"
        return f"[{self.tipo}] {self.titulo} -> {self.usuario.username} ({leido_str})"
