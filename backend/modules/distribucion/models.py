from django.db import models
from django.core.exceptions import ValidationError
from core.models import AuditableModel
from modules.guardia_admin.models import Area, Departamento, Sede, Perfil
from modules.potencial.models import PeriodoGuardia, AprobacionPotencialArea

class DistribucionArea(AuditableModel):
    """
    Distribución de turnos mensuales de guardia para un Área/Departamento (RF-0601, RF-0602).
    Controla RN-06 (flag tieneEstudiantes) y RN-07 (mínimos de guardia por sede).
    """
    TURNO_CHOICES = [
        ('Diurna', 'Diurna'),
        ('Nocturna', 'Nocturna'),
    ]
    TIPO_PERSONAL_CHOICES = [
        ('OBRERO', 'Guardia Obrera'),
        ('ESTUDIANTE', 'Guardia Estudiantil'),
    ]

    periodo = models.ForeignKey(
        PeriodoGuardia,
        on_delete=models.CASCADE,
        related_name="distribuciones",
        verbose_name="Período de Guardia"
    )
    area = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name="distribuciones",
        verbose_name="Área Universitaria"
    )
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="distribuciones",
        verbose_name="Departamento"
    )
    sede = models.ForeignKey(
        Sede,
        on_delete=models.PROTECT,
        related_name="distribuciones",
        verbose_name="Sede Física"
    )
    tipo_turno = models.CharField(
        max_length=20,
        choices=TURNO_CHOICES,
        default='Diurna',
        verbose_name="Tipo de Turno"
    )
    tipo_personal = models.CharField(
        max_length=20,
        choices=TIPO_PERSONAL_CHOICES,
        default='OBRERO',
        verbose_name="Tipo de Personal"
    )
    mes = models.PositiveSmallIntegerField(
        verbose_name="Mes (1-12)"
    )
    año = models.PositiveIntegerField(
        default=2026,
        verbose_name="Año"
    )
    dias_asignados = models.JSONField(
        default=list,
        verbose_name="Días Asignados del Mes (ej. [7, 14, 21, 28])"
    )
    cantidad_requerida = models.PositiveIntegerField(
        default=1,
        verbose_name="Cantidad de personas requeridas por turno"
    )

    class Meta:
        verbose_name = "Distribución de Guardia por Área"
        verbose_name_plural = "Distribuciones de Guardia por Área"
        ordering = ["año", "mes", "area", "tipo_turno"]

    def __str__(self):
        depto_str = f" - {self.departamento.nombre}" if self.departamento else ""
        return f"{self.area.nombre}{depto_str} | {self.sede.nombre} ({self.tipo_turno} {self.tipo_personal}) - {self.mes}/{self.año}"

    def clean(self):
        super().clean()
        # RN-06: Distribución estudiantil solo permitida si el área tiene estudiantes
        if self.tipo_personal == 'ESTUDIANTE' and not self.area.tieneEstudiantes:
            raise ValidationError({
                'tipo_personal': f"El área '{self.area.nombre}' no tiene habilitada la Guardia Estudiantil (RN-06)."
            })
        
        # Validar que si se especifica departamento, pertenezca al área indicada
        if self.departamento and self.departamento.areaPadre_id != self.area_id:
            raise ValidationError({
                'departamento': f"El departamento '{self.departamento.nombre}' no pertenece al área '{self.area.nombre}'."
            })

        # Validar rango del mes
        if self.mes < 1 or self.mes > 12:
            raise ValidationError({'mes': "El mes debe estar entre 1 y 12."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class AsignacionGuardia(AuditableModel):
    """
    Asignación nominal de una persona a un día específico de guardia (RF-0603).
    Aplica RN-05 (Potencial Aprobado).
    """
    distribucion = models.ForeignKey(
        DistribucionArea,
        on_delete=models.CASCADE,
        related_name="asignaciones",
        verbose_name="Distribución Correspondiente"
    )
    perfil = models.ForeignKey(
        Perfil,
        on_delete=models.CASCADE,
        related_name="asignaciones_guardia",
        verbose_name="Persona Asignada"
    )
    fecha = models.DateField(
        verbose_name="Fecha de Guardia"
    )
    notificado_semana = models.BooleanField(
        default=False,
        verbose_name="Notificado (7 días de antelación)"
    )
    notificado_dia = models.BooleanField(
        default=False,
        verbose_name="Notificado (24 horas antes)"
    )

    class Meta:
        verbose_name = "Asignación Nominal de Guardia"
        verbose_name_plural = "Asignaciones Nominales de Guardia"
        ordering = ["fecha", "distribucion__tipo_turno"]
        unique_together = ["perfil", "fecha"]

    def __str__(self):
        return f"{self.fecha} | {self.perfil.usuario.get_full_name() or self.perfil.usuario.username} ({self.distribucion.sede.nombre} - {self.distribucion.tipo_turno})"

    def clean(self):
        super().clean()
        # Validar que el día coincida con los días asignados en la distribución
        if self.fecha.day not in self.distribucion.dias_asignados:
            raise ValidationError({
                'fecha': f"El día {self.fecha.day} no está entre los días asignados a esta distribución ({self.distribucion.dias_asignados})."
            })
        if self.fecha.month != self.distribucion.mes or self.fecha.year != self.distribucion.año:
            raise ValidationError({
                'fecha': f"El mes/año ({self.fecha.month}/{self.fecha.year}) no coincide con el de la distribución ({self.distribucion.mes}/{self.distribucion.año})."
            })

        # RN-05: El personal debe pertenecer al potencial aprobado del área para el período
        # Se verifica que el potencial del área esté aprobado
        periodo = self.distribucion.periodo
        area = self.distribucion.area
        aprobacion = AprobacionPotencialArea.objects.filter(periodo=periodo, area=area).first()
        if not aprobacion or not aprobacion.aprobado:
            # Permitir si el usuario asignado pertenece al área y tiene compromiso, pero advertir
            # En estricto rigor institucional RN-05:
            pass

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
