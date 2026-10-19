from django.db import models
from django.conf import settings
from core.models import AuditableModel

class Cargo(AuditableModel):
    """
    Representa los cargos laborales o estudiantiles del personal.
    """
    nombre = models.CharField(max_length=150, unique=True, verbose_name="Nombre del Cargo")
    descripcion = models.CharField(max_length=255, blank=True, null=True, verbose_name="Descripción")
    permisos = models.JSONField(default=list, blank=True, verbose_name="Permisos RBAC Asignados")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Cargo"
        verbose_name_plural = "Cargos"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class Contrato(AuditableModel):
    """
    Representa el tipo de relación laboral o estudiantil (ej. Fijo Indeterminado, Adiestrado, Estudiante).
    """
    nombre = models.CharField(max_length=150, unique=True, verbose_name="Tipo de Contrato")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Tipo de Contrato"
        verbose_name_plural = "Tipos de Contratos"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class Sede(AuditableModel):
    """
    Sedes físicas de la Universidad de Holguín sujetas a guardia física.
    """
    nombre = models.CharField(max_length=255, unique=True, verbose_name="Nombre de la Sede")
    direccion = models.TextField(blank=True, null=True, verbose_name="Dirección Física")
    minObreras = models.PositiveIntegerField(default=0, verbose_name="Mínimo de Guardias Obreras")
    minEstudiantiles = models.PositiveIntegerField(default=0, verbose_name="Mínimo de Guardias Estudiantiles")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Sede"
        verbose_name_plural = "Sedes"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class Area(AuditableModel):
    """
    Áreas o Facultades de la UHO encargadas de la distribución de la guardia.
    """
    codigo = models.CharField(max_length=50, unique=True, verbose_name="Código del Área")
    nombre = models.CharField(max_length=255, unique=True, verbose_name="Nombre del Área")
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="areas_responsables",
        verbose_name="Responsable de Área"
    )
    tieneEstudiantes = models.BooleanField(default=True, verbose_name="¿Tiene Estudiantes?")
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Área"
        verbose_name_plural = "Áreas"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

class Departamento(AuditableModel):
    """
    Sub-departamentos o direcciones que dependen de una Facultad/Área padre.
    """
    codigo = models.CharField(max_length=50, unique=True, verbose_name="Código del Departamento")
    nombre = models.CharField(max_length=255, unique=True, verbose_name="Nombre del Departamento")
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="departamentos_responsables",
        verbose_name="Responsable de Departamento"
    )
    areaPadre = models.ForeignKey(
        Area,
        on_delete=models.CASCADE,
        related_name="departamentos",
        verbose_name="Área / Facultad Padre"
    )
    activo = models.BooleanField(default=True, verbose_name="Activo")

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        ordering = ["nombre"]
        unique_together = ["areaPadre", "nombre"]

    def __str__(self):
        return f"{self.areaPadre.nombre} - {self.nombre}"

class Perfil(AuditableModel):
    """
    Perfil detallado del trabajador o estudiante con sus preferencias y datos de contacto.
    """
    SEXO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
    ]
    TIPO_CHOICES = [
        ('OBRERO', 'Obrero'),
        ('ESTUDIANTE', 'Estudiante'),
    ]
    TURNO_CHOICES = [
        ('Diurna', 'Diurna'),
        ('Nocturna', 'Nocturna'),
    ]
    DIA_CHOICES = [
        ('Semana', 'Día de Semana'),
        ('Fin de Semana', 'Fin de Semana'),
    ]

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
        verbose_name="Usuario"
    )
    ci = models.CharField(max_length=11, unique=True, verbose_name="Carné de Identidad")
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, verbose_name="Sexo")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='OBRERO', verbose_name="Tipo de Guardia")
    
    # Relaciones organizativas
    contrato = models.ForeignKey(Contrato, on_delete=models.SET_NULL, null=True, blank=True, related_name="perfiles", verbose_name="Contrato")
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, blank=True, related_name="perfiles", verbose_name="Área")
    depto = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True, related_name="perfiles", verbose_name="Departamento")
    cargo = models.ForeignKey(Cargo, on_delete=models.SET_NULL, null=True, blank=True, related_name="perfiles", verbose_name="Cargo")
    
    # Datos de contacto adicionales
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono Fijo")
    celular = models.CharField(max_length=20, blank=True, null=True, verbose_name="Celular")
    whatsapp = models.CharField(max_length=20, blank=True, null=True, verbose_name="WhatsApp")
    direccion = models.TextField(blank=True, null=True, verbose_name="Dirección de Residencia")
    referencia = models.TextField(blank=True, null=True, verbose_name="Referencia de Dirección")
    
    # Contacto de emergencia
    contactoNombre = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nombre de Contacto de Emergencia")
    contactoCelular = models.CharField(max_length=20, blank=True, null=True, verbose_name="Celular de Contacto de Emergencia")
    
    # Preferencias de guardia firmadas en compromiso (MOD-03 / MOD-04)
    comprometido = models.BooleanField(default=False, verbose_name="¿Ha firmado el compromiso?")
    sedePref = models.ForeignKey(
        Sede,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preferidos_sede",
        verbose_name="Sede Preferida"
    )
    tipoPref = models.CharField(max_length=20, choices=TURNO_CHOICES, default='Diurna', verbose_name="Turno Preferido")
    diaPref = models.CharField(max_length=20, choices=DIA_CHOICES, default='Semana', verbose_name="Día de la semana Preferido")

    class Meta:
        verbose_name = "Perfil de Personal / Estudiante"
        verbose_name_plural = "Perfiles de Personal y Estudiantes"
        ordering = ["usuario__last_name", "usuario__first_name"]

    def __str__(self):
        return f"Perfil de {self.usuario.get_full_name() or self.usuario.username} ({self.ci})"
