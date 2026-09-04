from django.db import models
from django.conf import settings
from core.models import AuditableModel
from modules.guardia_admin.models import Perfil, Sede
from modules.potencial.models import PeriodoGuardia

class CompromisoGuardia(AuditableModel):
    """
    Registro formal del compromiso de guardia obrera y estudiantil (RF-0301, RF-0302, RF-0401, RF-0402).
    """
    TURNO_CHOICES = [
        ('Diurna', 'Diurna'),
        ('Nocturna', 'Nocturna'),
    ]
    DIA_CHOICES = [
        ('Semana', 'Día de Semana'),
        ('Fin de Semana', 'Fin de Semana'),
    ]

    perfil = models.ForeignKey(
        Perfil,
        on_delete=models.CASCADE,
        related_name="compromisos",
        verbose_name="Perfil del Titular"
    )
    periodo = models.ForeignKey(
        PeriodoGuardia,
        on_delete=models.CASCADE,
        related_name="compromisos",
        verbose_name="Período de Guardia"
    )
    sede = models.ForeignKey(
        Sede,
        on_delete=models.PROTECT,
        related_name="compromisos",
        verbose_name="Sede Seleccionada"
    )
    tipo_turno = models.CharField(
        max_length=20,
        choices=TURNO_CHOICES,
        default='Diurna',
        verbose_name="Turno Seleccionado"
    )
    tipo_dia = models.CharField(
        max_length=20,
        choices=DIA_CHOICES,
        default='Semana',
        verbose_name="Tipo de Día Seleccionado"
    )
    es_estudiante = models.BooleanField(
        default=False,
        verbose_name="¿Es Guardia Estudiantil?"
    )
    fecha_firma = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha y Hora de Firma"
    )

    class Meta:
        verbose_name = "Compromiso de Guardia"
        verbose_name_plural = "Compromisos de Guardia"
        ordering = ["-fecha_firma"]
        unique_together = ["perfil", "periodo"]

    def __str__(self):
        tipo_str = "Estudiantil" if self.es_estudiante else "Obrera"
        return f"Compromiso {tipo_str} de {self.perfil.usuario.get_full_name() or self.perfil.usuario.username} ({self.periodo.nombre})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Sincronizar automáticamente con el Perfil para reflejar su estado comprometido
        perfil = self.perfil
        perfil.comprometido = True
        perfil.sedePref = self.sede
        perfil.tipoPref = self.tipo_turno
        perfil.diaPref = self.tipo_dia
        perfil.save(update_fields=['comprometido', 'sedePref', 'tipoPref', 'diaPref', 'actualizado_en'])
