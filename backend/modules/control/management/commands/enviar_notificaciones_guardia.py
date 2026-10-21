from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
from modules.distribucion.models import AsignacionGuardia
from modules.control.models import Notificacion

class Command(BaseCommand):
    help = "Envía y registra recordatorios automáticos de guardia con 7 días de antelación y 24 horas antes (RN-08)."

    def handle(self, *args, **options):
        hoy = timezone.now().date()
        fecha_7_dias = hoy + timedelta(days=7)
        fecha_1_dia = hoy + timedelta(days=1)

        self.stdout.write(self.style.NOTICE(f"Ejecutando notificador automático RN-08 para fecha actual {hoy}..."))

        notif_7d_count = 0
        notif_1d_count = 0

        # 1. Notificaciones con 7 días de antelación
        guardias_7d = AsignacionGuardia.objects.filter(
            fecha=fecha_7_dias,
            notificado_semana=False
        ).select_related('perfil__usuario', 'distribucion__sede')

        for asig in guardias_7d:
            usuario = asig.perfil.usuario
            sede_nombre = asig.distribucion.sede.nombre
            turno = asig.distribucion.tipo_turno

            titulo = f"Recordatorio Institucional: Guardia Universitaria en 7 días"
            mensaje = (
                f"Estimado(a) {usuario.get_full_name() or usuario.username},\n"
                f"Le recordamos que tiene asignada una guardia el día {asig.fecha} "
                f"en la sede '{sede_nombre}' en el turno {turno}.\n"
                f"Por favor verifique su disponibilidad y tome las previsiones necesarias (RN-08)."
            )

            Notificacion.objects.create(
                usuario=usuario,
                titulo=titulo,
                mensaje=mensaje,
                tipo='RECORDATORIO'
            )

            # Envío por email si el usuario tiene correo institucional
            if usuario.email:
                try:
                    send_mail(
                        subject=titulo,
                        message=mensaje,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'guardia@uho.edu.cu'),
                        recipient_list=[usuario.email],
                        fail_silently=True
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"No se pudo enviar email a {usuario.email}: {e}"))

            asig.notificado_semana = True
            asig.save(update_fields=['notificado_semana'])
            notif_7d_count += 1

        # 2. Notificaciones con 24 horas (1 día) de antelación
        guardias_1d = AsignacionGuardia.objects.filter(
            fecha=fecha_1_dia,
            notificado_dia=False
        ).select_related('perfil__usuario', 'distribucion__sede')

        for asig in guardias_1d:
            usuario = asig.perfil.usuario
            sede_nombre = asig.distribucion.sede.nombre
            turno = asig.distribucion.tipo_turno

            titulo = f"Alerta Operativa: Guardia Universitaria Mañana"
            mensaje = (
                f"Estimado(a) {usuario.get_full_name() or usuario.username},\n"
                f"Le alertamos que mañana {asig.fecha} le corresponde cumplir su turno de guardia "
                f"({turno}) en la sede '{sede_nombre}'. Recuerde presentarse puntualmente con su carné de identidad (RN-08)."
            )

            Notificacion.objects.create(
                usuario=usuario,
                titulo=titulo,
                mensaje=mensaje,
                tipo='RECORDATORIO'
            )

            if usuario.email:
                try:
                    send_mail(
                        subject=titulo,
                        message=mensaje,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'guardia@uho.edu.cu'),
                        recipient_list=[usuario.email],
                        fail_silently=True
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"No se pudo enviar email a {usuario.email}: {e}"))

            asig.notificado_dia = True
            asig.save(update_fields=['notificado_dia'])
            notif_1d_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Proceso de alertas automáticas finalizado exitosamente:\n"
            f"- Notificaciones de 7 días generadas: {notif_7d_count}\n"
            f"- Notificaciones de 24 horas generadas: {notif_1d_count}"
        ))
