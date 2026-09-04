from django.db import models
from django.conf import settings
from core.models import AuditableModel
from modules.guardia_admin.models import Area

class PeriodoGuardia(AuditableModel):
    """
    Período de guardia para el compromiso y aprobación del potencial (RF-0113).
    """
    nombre = models.CharField(max_length=150, unique=True, verbose_name="Nombre del Período")
    inicio_compromiso = models.DateField(verbose_name="Inicio de Compromiso")
    fin_compromiso = models.DateField(verbose_name="Fin de Compromiso")
    inicio_aprobacion = models.DateField(verbose_name="Inicio de Aprobación")
    fin_aprobacion = models.DateField(verbose_name="Fin de Aprobación")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Período de Guardia"
        verbose_name_plural = "Períodos de Guardia"
        ordering = ["-creado_en"]

    def __str__(self):
        return self.nombre

class AprobacionPotencialArea(AuditableModel):
    """
    Registro del estado de aprobación del potencial por Área para un período dado (RF-0503, RN-04).
    Una vez aprobado, queda bloqueado irreversiblemente (salvo por SUPERADMIN).
    """
    periodo = models.ForeignKey(PeriodoGuardia, on_delete=models.CASCADE, related_name="aprobaciones_area")
    area = models.ForeignKey(Area, on_delete=models.CASCADE, related_name="aprobaciones_potencial")
    aprobado = models.BooleanField(default=False, verbose_name="¿Potencial Aprobado?")
    aprobado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="potenciales_aprobados",
        verbose_name="Aprobado por"
    )
    fecha_aprobacion = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Aprobación")

    class Meta:
        verbose_name = "Aprobación de Potencial por Área"
        verbose_name_plural = "Aprobaciones de Potencial por Área"
        unique_together = ["periodo", "area"]

    def __str__(self):
        estado = "APROBADO" if self.aprobado else "PENDIENTE"
        return f"{self.periodo.nombre} - {self.area.nombre} ({estado})"
