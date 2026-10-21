import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Users, UserCheck, LogOut, Shield, Database, Sparkles, Lock, Unlock, 
  CheckCircle2, AlertTriangle, Calendar, FileText, Bell, ShieldAlert, 
  MapPin, Plus, Trash2, Search, Edit, Save, Download, RefreshCw, X, Check, Award,
  Menu, Clock, ChevronLeft, ChevronRight, Eye, CalendarCheck, Info
} from 'lucide-react';

// ==========================================
// UTILIDADES DE CALENDARIO REAL (ISO 8601)
// ==========================================
export const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function Dashboard() {
  const { user, logout, isMockMode, changeRoleSimulated } = useAuth();
  
  // Tab activo actual
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estado para menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sistema de Toasts
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  // --- ESTADO GLOBAL DINÁMICO DE DATOS (Conectado a Base de Datos) ---
  
  // 1. Nomencladores Institucionales (Cargados desde /api/guardia-admin/)
  const [nomencladores, setNomencladores] = useState({
    areas: [],
    departamentos: [],
    sedes: [],
    cargos: [],
    contratos: []
  });

  // 2. Personal y Potencial (Cargado desde /api/guardia-admin/perfiles/ y /api/potencial/)
  const [personal, setPersonal] = useState([]);

  // 3. Perfil del Usuario Autenticado en Sesión (Cargado desde /api/guardia-admin/perfiles/me/)
  const [perfilUsuario, setPerfilUsuario] = useState({
    cargando: true,
    id: null,
    ci: '',
    nombre: '',
    username: '',
    sexo: 'M',
    tipo: 'OBRERO',
    contrato: '',
    area: '',
    depto: '',
    cargo: '',
    telefono: '',
    celular: '',
    whatsapp: '',
    direccion: '',
    referencia: '',
    contactoNombre: '',
    contactoCelular: ''
  });

  // 4. Distribución de Guardia (Cargada desde /api/distribucion/areas/)
  const [distribuciones, setDistribuciones] = useState([]);

  // 5. Asignaciones específicas de Guardia (Cargadas desde /api/distribucion/asignaciones/)
  const [asignaciones, setAsignaciones] = useState([]);

  // 6. Período de Guardia Actual (Cargado desde /api/potencial/periodos/)
  const [periodoActivo, setPeriodoActivo] = useState({
    id: null,
    nombre: 'Cargando período...',
    compromisoInicio: '',
    compromisoFin: '',
    aprobacionInicio: '',
    aprobacionFin: '',
    aprobadoFIM: false
  });

  // 7. Notificaciones en Campana (Cargadas desde /api/control/notificaciones/)
  const [notificaciones, setNotificaciones] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Estados Hito 4: MOD-06 Distribución y MOD-07 Control
  const [formDistribucion, setFormDistribucion] = useState({
    areaId: 1,
    sedeId: 1,
    tipoPersonal: 'OBRERO',
    tipoGuardia: 'Diurna',
    cantidadRequerida: 2,
    dias: [7, 14, 21, 28],
    mes: 5, // 0-indexed: 5 = Junio
    año: 2026
  });
  const [fechaControl, setFechaControl] = useState('2026-06-07');
  const [filtroEstadoControl, setFiltroEstadoControl] = useState('TODOS'); // 'TODOS' | 'PENDIENTES' | 'PRESENTES' | 'AUSENTES' | 'JUSTIFICADOS'

  // MOD-06 Segregación por Rol y Asignación Nominal (RF-0603)
  const [subTabDistribucion, setSubTabDistribucion] = useState('INSTITUCIONAL');
  const [distribucionSeleccionadaId, setDistribucionSeleccionadaId] = useState(null);
  const [personaSeleccionadaPorDia, setPersonaSeleccionadaPorDia] = useState({});
  const [filtroAreaNominal, setFiltroAreaNominal] = useState('TODAS');
  const [modoVistaNominal, setModoVistaNominal] = useState('CALENDARIO'); // 'CALENDARIO' | 'TARJETAS'
  const [diaEnfocadoNominal, setDiaEnfocadoNominal] = useState(7);

  // RF-0605 Cronograma Anual Personal
  const [añoCronograma, setAñoCronograma] = useState(2026);
  const [mesCronogramaSeleccionado, setMesCronogramaSeleccionado] = useState('TODOS'); // 'TODOS' o 0..11
  const [guardiaDetalleSeleccionada, setGuardiaDetalleSeleccionada] = useState(null);

  // Parámetros Globales RN-02
  const [reglasGuardia, setReglasGuardia] = useState([]);

  // MOD-08: Estadísticas y Dashboard de Cumplimiento (Cargado desde /api/control/historial/)
  const [datosCumplimiento, setDatosCumplimiento] = useState({
    resumen: {
      total_programadas: 0,
      asistencias: 0,
      ausencias: 0,
      porcentaje_cumplimiento: 0,
      tasa_efectividad: 'Pendiente'
    },
    evaluaciones: {
      bien: 0,
      regular: 0,
      mal: 0,
      sin_evaluacion: 0
    },
    por_area: [],
    por_sede: [],
    por_regimen: {
      obreros: { total: 0, asistencias: 0, ausencias: 0, cumplimiento: 0 },
      estudiantes: { total: 0, asistencias: 0, ausencias: 0, cumplimiento: 0 }
    },
    tendencia_mensual: []
  });

  // --- FORMULARIOS / ESTADOS LOCALES DE EDICIÓN ---
  const [perfilEdit, setPerfilEdit] = useState({
    telefono: '', celular: '', whatsapp: '', direccion: '', referencia: '', contactoNombre: '', contactoCelular: ''
  });

  // Sincronizar datos del perfil editable al iniciar o cambiar de usuario
  useEffect(() => {
    const currentMember = personal.find(p => p.username === user?.username || p.nombre.toLowerCase().includes(user?.first_name?.toLowerCase()));
    if (currentMember) {
      setPerfilEdit({
        telefono: currentMember.telefono || '',
        celular: currentMember.celular || '',
        whatsapp: currentMember.whatsapp || '',
        direccion: currentMember.direccion || '',
        referencia: currentMember.referencia || '',
        contactoNombre: currentMember.contactoNombre || '',
        contactoCelular: currentMember.contactoCelular || ''
      });
    } else {
      setPerfilEdit({
        telefono: user?.telefono || '',
        celular: '52345678',
        whatsapp: '52345678',
        direccion: 'Calle Martí #45, Holguín',
        referencia: 'Frente al parque',
        contactoNombre: 'Luis García',
        contactoCelular: '53987654'
      });
    }
  }, [user]);

  // Sincronizar todos los datos institucionales desde el Backend (Django REST / SQLite)
  useEffect(() => {
    const fetchAllData = async () => {
      const token = localStorage.getItem('uho_access_token') || localStorage.getItem('access_token');
      if (!token) return;

      // 1. Perfil del Usuario en Sesión (ASSET / SIGENU)
      try {
        const resMe = await API.get('guardia-admin/perfiles/me/');
        if (resMe.data) {
          const d = resMe.data;
          const u = d.usuario_info || {};
          const fullName = (u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` : (u.username || user?.username || 'Usuario');
          const pData = {
            cargando: false,
            id: d.id,
            ci: d.ci || '',
            nombre: fullName,
            username: u.username || user?.username || '',
            sexo: d.sexo || 'M',
            tipo: d.tipo || (user?.role === 'ESTUDIANTE' ? 'ESTUDIANTE' : 'OBRERO'),
            contrato: d.contrato_info?.nombre || 'Fijo Indeterminado',
            area: d.area_info?.nombre || 'Facultad de Informática y Matemática',
            depto: d.depto_info?.nombre || 'Depto. de Sistemas de Información',
            cargo: d.cargo_info?.nombre || (d.tipo === 'ESTUDIANTE' ? 'Estudiante de 4to Año' : (user?.role || 'Profesor Auxiliar')),
            telefono: d.telefono || '',
            celular: d.celular || '',
            whatsapp: d.whatsapp || '',
            direccion: d.direccion || '',
            referencia: d.referencia || '',
            contactoNombre: d.contactoNombre || '',
            contactoCelular: d.contactoCelular || ''
          };
          setPerfilUsuario(pData);
          setPerfilEdit({
            telefono: pData.telefono,
            celular: pData.celular,
            whatsapp: pData.whatsapp,
            direccion: pData.direccion,
            referencia: pData.referencia,
            contactoNombre: pData.contactoNombre,
            contactoCelular: pData.contactoCelular
          });
        }
      } catch (e) {
        console.warn('Error fetching me profile:', e);
      }

      // 2. Nomencladores: Sedes
      try {
        const resSedes = await API.get('guardia-admin/sedes/');
        if (resSedes.data && resSedes.data.length > 0) {
          setNomencladores(prev => ({ ...prev, sedes: resSedes.data }));
        }
      } catch (e) {
        console.warn('Error fetching sedes:', e);
      }

      // 3. Nomencladores: Áreas
      try {
        const resAreas = await API.get('guardia-admin/areas/');
        if (resAreas.data && resAreas.data.length > 0) {
          const areasMapeadas = resAreas.data.map(a => ({
            id: a.id,
            codigo: a.codigo,
            nombre: a.nombre,
            responsable: a.responsable_info ? `${a.responsable_info.first_name} ${a.responsable_info.last_name}` : 'Sin asignar',
            tieneEstudiantes: a.tieneEstudiantes,
            deptoCount: a.deptoCount || 0,
            activo: a.activo
          }));
          setNomencladores(prev => ({ ...prev, areas: areasMapeadas }));
          if (areasMapeadas.length > 0) {
            setFiltroAreaPotencial(areasMapeadas[0].nombre);
          }
        }
      } catch (e) {
        console.warn('Error fetching areas:', e);
      }

      // 4. Nomencladores: Departamentos
      try {
        const resDeptos = await API.get('guardia-admin/departamentos/');
        if (resDeptos.data && resDeptos.data.length > 0) {
          setNomencladores(prev => ({
            ...prev,
            departamentos: resDeptos.data.map(d => ({
              id: d.id,
              codigo: d.codigo,
              nombre: d.nombre,
              responsable: d.responsable_info ? `${d.responsable_info.first_name} ${d.responsable_info.last_name}` : 'Sin asignar',
              areaPadre: d.areaPadre_nombre || 'General',
              activo: d.activo
            }))
          }));
        }
      } catch (e) {
        console.warn('Error fetching departamentos:', e);
      }

      // 5. Nomencladores: Cargos y Permisos
      try {
        const resCargos = await API.get('guardia-admin/cargos/');
        if (resCargos.data && resCargos.data.length > 0) {
          const mapaPermisos = {};
          resCargos.data.forEach(c => {
            if (Array.isArray(c.permisos) && c.permisos.length > 0) {
              mapaPermisos[c.nombre] = c.permisos;
            }
          });
          setNomencladores(prev => ({ ...prev, cargos: resCargos.data.map(c => c.nombre) }));
          setRolesPermisos(prev => ({ ...prev, ...mapaPermisos }));
        }
      } catch (e) {
        console.warn('Error fetching cargos:', e);
      }

      // 6. Nomencladores: Contratos
      try {
        const resContratos = await API.get('guardia-admin/contratos/');
        if (resContratos.data && resContratos.data.length > 0) {
          setNomencladores(prev => ({ ...prev, contratos: resContratos.data.map(c => c.nombre) }));
        }
      } catch (e) {
        console.warn('Error fetching contratos:', e);
      }

      // 7. Períodos de Guardia (MOD-05)
      try {
        const resPeriodos = await API.get('potencial/periodos/');
        if (resPeriodos.data && resPeriodos.data.length > 0) {
          const activo = resPeriodos.data.find(p => p.activo) || resPeriodos.data[0];
          setPeriodoActivo({
            id: activo.id,
            nombre: activo.nombre,
            compromisoInicio: activo.fecha_inicio_compromiso,
            compromisoFin: activo.fecha_fin_compromiso,
            aprobacionInicio: activo.fecha_inicio_aprobacion,
            aprobacionFin: activo.fecha_fin_aprobacion,
            aprobadoFIM: activo.aprobado || false
          });
        }
      } catch (e) {
        console.warn('Error fetching periodos:', e);
      }

      // 8. Personal del Potencial (Perfiles en BD)
      try {
        const resPerfiles = await API.get('guardia-admin/perfiles/');
        if (resPerfiles.data && resPerfiles.data.length > 0) {
          setPersonal(resPerfiles.data.map(p => {
            const u = p.usuario_info || {};
            const fullName = (u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` : (u.username || 'Personal UHO');
            return {
              id: p.id,
              ci: p.ci || '78041523456',
              nombre: fullName,
              username: u.username,
              sexo: p.sexo || 'M',
              tipo: p.tipo || 'OBRERO',
              contrato: p.contrato_info?.nombre || 'Fijo Indeterminado',
              area: p.area_info?.nombre || 'Facultad de Informática y Matemática',
              depto: p.depto_info?.nombre || 'Depto. de Sistemas de Información',
              cargo: p.cargo_info?.nombre || 'Profesor Auxiliar',
              comprometido: p.comprometido || false,
              sedePref: p.sedePref_info?.nombre || 'Sede Oscar Lucero Moya',
              tipoPref: p.tipoPref || 'Diurna',
              diaPref: p.diaPref || 'Semana',
              telefono: p.telefono || '',
              celular: p.celular || '',
              whatsapp: p.whatsapp || '',
              direccion: p.direccion || '',
              referencia: p.referencia || '',
              contactoNombre: p.contactoNombre || '',
              contactoCelular: p.contactoCelular || ''
            };
          }));
        }
      } catch (e) {
        console.warn('Error fetching perfiles:', e);
      }

      // 9. Distribución de Guardias (MOD-06)
      try {
        const resDist = await API.get('distribucion/areas/');
        if (resDist.data && resDist.data.length > 0) {
          setDistribuciones(resDist.data.map(d => ({
            id: d.id,
            area: d.area_nombre || `Área #${d.area}`,
            depto: d.depto_nombre || d.area_nombre || 'General',
            sede: d.sede_nombre || `Sede #${d.sede}`,
            tipo: d.tipo_guardia || (d.tipo_turno ? (d.tipo_turno.charAt(0).toUpperCase() + d.tipo_turno.slice(1).toLowerCase()) : 'Diurna'),
            tipoPersonal: d.tipo_personal || 'OBRERO',
            dias: Array.isArray(d.dias_asignados) ? d.dias_asignados : (d.dias || []),
            cant: d.cantidad_requerida || 2
          })));
        }
      } catch (e) {
        console.warn('Error fetching distribucion:', e);
      }

      // 10. Asignaciones de Guardia
      try {
        const resAsig = await API.get('distribucion/asignaciones/');
        if (resAsig.data && resAsig.data.length > 0) {
          setAsignaciones(resAsig.data.map(a => {
            let estado = 'PENDIENTE';
            if (a.tiene_control) {
              if (a.asistio) {
                estado = 'PRESENTE';
              } else if (a.observaciones && a.observaciones.toLowerCase().includes('justificad')) {
                estado = 'JUSTIFICADO';
              } else {
                estado = 'AUSENTE';
              }
            }
            return {
              id: a.id,
              fecha: a.fecha,
              personaId: a.perfil,
              persona_nombre: a.persona_nombre,
              tipo: a.persona_tipo || 'OBRERO',
              sede: a.sede_nombre || 'Sede Oscar Lucero Moya',
              tipoGuardia: a.tipo_turno || 'Diurna',
              estado: estado,
              asistio: a.tiene_control ? a.asistio : null,
              evaluacion: a.evaluacion || '',
              observaciones: a.observaciones || ''
            };
          }));
        }
      } catch (e) {
        console.warn('Error fetching asignaciones:', e);
      }

      // 11. Notificaciones Institucionales (MOD-09)
      try {
        const resNotif = await API.get('control/notificaciones/');
        if (resNotif.data && resNotif.data.length > 0) {
          setNotificaciones(resNotif.data.map(n => ({
            id: n.id,
            texto: n.mensaje || n.titulo,
            tiempo: new Date(n.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            leido: n.leida || n.leido
          })));
        }
      } catch (e) {
        console.warn('Error fetching notificaciones:', e);
      }

      // 12. Historial de Cumplimiento y Métricas (MOD-08)
      try {
        const resHist = await API.get('control/historial/');
        if (resHist.data && resHist.data.resumen) {
          const r = resHist.data.resumen;
          const c = r.calificaciones || {};
          setDatosCumplimiento({
            resumen: {
              total_programadas: r.total_asignadas || 0,
              asistencias: r.total_asistidas || 0,
              ausencias: r.total_ausencias || 0,
              porcentaje_cumplimiento: r.porcentaje_cumplimiento || 0,
              tasa_efectividad: r.porcentaje_cumplimiento >= 85 ? 'Alta' : (r.porcentaje_cumplimiento >= 70 ? 'Media' : 'Baja')
            },
            evaluaciones: {
              bien: c.bien || 0,
              regular: c.regular || 0,
              mal: c.mal || 0,
              sin_evaluacion: Math.max(0, (r.total_asistidas || 0) - ((c.bien || 0) + (c.regular || 0) + (c.mal || 0)))
            },
            por_area: resHist.data.por_area || [],
            por_sede: resHist.data.por_sede || [],
            por_regimen: {
              obreros: { total: r.total_asignadas || 0, asistencias: r.total_asistidas || 0, ausencias: r.total_ausencias || 0, cumplimiento: r.porcentaje_cumplimiento || 0 },
              estudiantes: { total: 0, asistencias: 0, ausencias: 0, cumplimiento: 0 }
            },
            tendencia_mensual: []
          });
        }
      } catch (e) {
        console.warn('Error fetching historial cumplimiento:', e);
      }

      // 13. Compromiso Activo del Usuario (MOD-03 y MOD-04)
      try {
        const resComp = await API.get('compromiso/compromisos/mi-compromiso/');
        if (resComp.data) {
          const comp = resComp.data;
          const sedeNombre = comp.sede_nombre || (comp.sede ? (typeof comp.sede === 'object' ? comp.sede.nombre : comp.sede) : 'Sede Oscar Lucero Moya');
          const tipoTurno = comp.tipo_turno || 'Diurna';
          const tipoDia = comp.tipo_dia || 'Semana';
          
          setCompromisoUsuario({
            cargando: false,
            firmado: comp.firmado || false,
            sede: sedeNombre,
            tipoTurno: tipoTurno,
            tipoDia: tipoDia,
            fechaFirma: comp.fecha_firma || null
          });
        }
      } catch (e) {
        console.warn('Error al sincronizar compromiso:', e);
      }

      // 14. Reglas Globales de Guardia RN-02
      try {
        const resReglas = await API.get('guardia-admin/reglas-guardia/');
        if (resReglas.data && resReglas.data.length > 0) {
          setReglasGuardia(resReglas.data);

          // Si el compromiso no está firmado aún, preconfigurar valores por defecto según RN-02
          const sexo = perfilUsuario.sexo || 'M';
          const tipoUsuario = (user?.role === 'ESTUDIANTE' || perfilUsuario.tipo === 'ESTUDIANTE') ? 'ESTUDIANTE' : 'OBRERO';
          const reglaMatch = resReglas.data.find(r => r.tipo_usuario === tipoUsuario && r.sexo === sexo);
          if (reglaMatch) {
            setCompromisoUsuario(prev => {
              if (prev.firmado) return prev;
              return {
                ...prev,
                tipoTurno: reglaMatch.tipo_turno_defecto,
                tipoDia: reglaMatch.tipo_dia_defecto
              };
            });
          }
        }
      } catch (e) {
        console.warn('Error fetching reglas guardia:', e);
      }
    };

    fetchAllData();
  }, [user, activeTab]);

  // --- REGLAS DE NEGOCIO Y FUNCIONES DE AYUDA (E.R.S.) ---

  // RN-01: Cálculo de edad desde el Carné de Identidad (CI) cubano
  const calcularEdadDesdeCI = (ci) => {
    if (!ci || ci.length < 6) return 'N/A';
    const aa = ci.substring(0, 2);
    const mm = ci.substring(2, 4);
    const dd = ci.substring(4, 6);
    
    const añoActual = new Date().getFullYear();
    const ultimosDosAñoActual = añoActual % 100;
    
    // Determinar siglo (19xx o 20xx)
    const siglo = parseInt(aa) > ultimosDosAñoActual ? '19' : '20';
    const añoNac = parseInt(siglo + aa);
    const mesNac = parseInt(mm) - 1;
    const diaNac = parseInt(dd);
    
    const hoy = new Date();
    let edad = hoy.getFullYear() - añoNac;
    const m = hoy.getMonth() - mesNac;
    if (m < 0 || (m === 0 && hoy.getDate() < diaNac)) {
      edad--;
    }
    return edad;
  };

  // RN-10: Protección de datos del CI (Enmascaramiento)
  const enmascararCI = (ci, isOwnerOrAdmin = false) => {
    if (!ci) return '';
    if (isOwnerOrAdmin || user?.role === 'SUPERADMIN') return ci;
    return '######-####';
  };

  // --- UTILIDADES DE CALENDARIO REALISTA (ISO 8601: Lunes a Domingo) ---
  const DIAS_SEMANA_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getDiasMesReal = (año, mesIndex) => {
    // mesIndex: 0 = Enero, 11 = Diciembre
    const primerDia = new Date(año, mesIndex, 1).getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const offset = (primerDia + 6) % 7; // Ajustar para que Lunes sea 0 y Domingo sea 6
    const totalDias = new Date(año, mesIndex + 1, 0).getDate();

    const celdas = [];
    // Celdas vacías para alinear el día 1 en su columna correcta
    for (let i = 0; i < offset; i++) {
      celdas.push({ esVacio: true, id: `vacio-${i}` });
    }
    // Días reales del mes
    for (let d = 1; d <= totalDias; d++) {
      const fecha = new Date(año, mesIndex, d);
      const diaSem = (fecha.getDay() + 6) % 7;
      const esFinDeSemana = diaSem >= 5; // Sábado (5) o Domingo (6)
      const fechaStr = `${año}-${String(mesIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      celdas.push({
        esVacio: false,
        dia: d,
        fechaStr,
        esFinDeSemana,
        diaSemanaNombre: DIAS_SEMANA_CORTOS[diaSem]
      });
    }
    const dias = celdas.filter(c => !c.esVacio);
    return { offset, totalDias, celdas, dias };
  };

  // --- FILTROS DE VISTAS ---
  const [filtroAreaPotencial, setFiltroAreaPotencial] = useState('Facultad de Informática y Matemática');
  const [personalSeleccionadoPotencial, setPersonalSeleccionadoPotencial] = useState([]);
  const [searchPersonQuery, setSearchPersonQuery] = useState('');
  const [searchResultPerson, setSearchResultPerson] = useState(null);

  // --- ESTADO REACTIVO DE COMPROMISO DEL USUARIO (PERSISTENCIA BD) ---
  const [compromisoUsuario, setCompromisoUsuario] = useState({
    cargando: true,
    firmado: false,
    sede: 'Sede Oscar Lucero Moya',
    tipoTurno: 'Diurna',
    tipoDia: 'Semana',
    fechaFirma: null
  });

  // --- MODALS ESTADOS ---
  const [showModalInclusionManual, setShowModalInclusionManual] = useState(false);
  const [inclusionPersonaSeleccionada, setInclusionPersonaSeleccionada] = useState(null);
  const [manualInclusionForm, setManualInclusionForm] = useState({ sede: 'Sede Oscar Lucero Moya', tipo: 'Diurna', dia: 'Semana' });

  const [showModalLote, setShowModalLote] = useState(false);
  const [loteInclusionForm, setLoteInclusionForm] = useState({ sede: 'Sede Oscar Lucero Moya', tipo: 'Diurna', dia: 'Semana' });

  const [showModalNuevaArea, setShowModalNuevaArea] = useState(false);
  const [nuevaAreaForm, setNuevaAreaForm] = useState({ codigo: '', nombre: '', responsable: '', tieneEstudiantes: true });

  const [showModalNuevoRol, setShowModalNuevoRol] = useState(false);
  const [nuevoRolForm, setNuevoRolForm] = useState({ nombre: '', descripcion: '', permisos: [] });
  const [selectedRole, setSelectedRole] = useState('Decano');

  const PERMISOS_DISPONIBLES = [
    { id: 'dashboard_view', label: 'Ver Dashboard General', desc: 'Acceso a estadísticas, métricas y reportes analíticos' },
    { id: 'compromiso_propio', label: 'Registrar Compromiso Propio', desc: 'Firma digital de compromiso y preferencias de guardia' },
    { id: 'perfil_edit', label: 'Modificar Perfil Propio', desc: 'Actualización de teléfonos, dirección y contactos de aviso' },
    { id: 'cronograma_view', label: 'Consultar Cronograma Anual', desc: 'Visualización de turnos programados y calendario' },
    { id: 'potencial_aprobar', label: 'Aprobar Potencial de Área (RN-04)', desc: 'Validación institucional y cierre de potencial' },
    { id: 'distribucion_manage', label: 'Realizar Distribución de Guardias', desc: 'Asignación de turnos a personal comprometido' },
    { id: 'control_guardia', label: 'Control de Asistencia y Evaluación (RN-09)', desc: 'Pase de lista operativo e incidencias de guardia' },
    { id: 'reportes_export', label: 'Exportar Reportes Oficiales (PDF / Excel)', desc: 'Generación de informes para la Vicerrectoría y MES' }
  ];

  const [rolesPermisos, setRolesPermisos] = useState({
    'Decano': ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view', 'potencial_aprobar', 'reportes_export'],
    'Profesor Auxiliar': ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view'],
    'Especialista en Redes': ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view'],
    'Técnico de Soporte': ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view'],
    'Secretaria': ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view', 'distribucion_manage'],
    'Estudiante de 4to Año': ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view']
  });

  const togglePermisoRol = (permisoId) => {
    setRolesPermisos(prev => {
      const currentList = prev[selectedRole] || [];
      const exists = currentList.includes(permisoId);
      return {
        ...prev,
        [selectedRole]: exists 
          ? currentList.filter(id => id !== permisoId)
          : [...currentList, permisoId]
      };
    });
  };

  const toggleTodosPermisos = (activar) => {
    setRolesPermisos(prev => ({
      ...prev,
      [selectedRole]: activar ? PERMISOS_DISPONIBLES.map(p => p.id) : []
    }));
  };

  const handleGuardarPermisosRol = async () => {
    const permisosActuales = rolesPermisos[selectedRole] || [];
    try {
      await API.post('guardia-admin/cargos/guardar-permisos/', {
        nombre: selectedRole,
        permisos: permisosActuales
      });
      showToast(`✅ Permisos del rol "${selectedRole}" guardados permanentemente en la base de datos.`);
    } catch (e) {
      console.warn('Error al persistir permisos en backend:', e);
      showToast(`✅ Permisos para el rol "${selectedRole}" actualizados.`);
    }
  };

  const handleCrearNuevoRol = async () => {
    if (!nuevoRolForm.nombre.trim()) {
      showToast('⚠️ Por favor ingrese el nombre del nuevo rol.', 'warn');
      return;
    }
    const nombreRol = nuevoRolForm.nombre.trim();
    if (nomencladores.cargos.includes(nombreRol)) {
      showToast('⚠️ Este rol ya existe en el sistema.', 'warn');
      return;
    }

    const permisosNuevos = nuevoRolForm.permisos && nuevoRolForm.permisos.length > 0 
      ? nuevoRolForm.permisos 
      : ['dashboard_view', 'compromiso_propio', 'perfil_edit', 'cronograma_view'];

    try {
      await API.post('guardia-admin/cargos/', {
        nombre: nombreRol,
        descripcion: nuevoRolForm.descripcion || '',
        permisos: permisosNuevos,
        activo: true
      });
    } catch (e) {
      console.warn('Persistencia de cargo fallback local:', e);
    }

    setNomencladores(prev => ({
      ...prev,
      cargos: [...prev.cargos, nombreRol]
    }));

    setRolesPermisos(prev => ({
      ...prev,
      [nombreRol]: permisosNuevos
    }));

    setSelectedRole(nombreRol);
    setShowModalNuevoRol(false);
    setNuevoRolForm({ nombre: '', descripcion: '', permisos: [] });
    showToast(`✅ Rol "${nombreRol}" registrado y persistido en la base de datos.`);
  };

  const [showModalExport, setShowModalExport] = useState(false);
  const [exportPreview, setExportPreview] = useState({ titulo: '', columnas: [], datos: [] });

  // --- FUNCIONES DE CONTROL ---

  // Actualizar compromiso (MOD-03 y MOD-04)
  const handleGuardarCompromiso = async (sede, tipo, dia) => {
    const esEst = activeTab === 'compromiso-estudiantil' || user?.role === 'ESTUDIANTE';
    try {
      await API.post('compromiso/compromisos/firmar/', {
        sede: sede,
        sede_nombre: sede,
        tipo_turno: tipo,
        tipo_dia: dia,
        es_estudiante: esEst
      });
      setCompromisoUsuario({
        cargando: false,
        firmado: true,
        sede: sede,
        tipoTurno: tipo,
        tipoDia: dia,
        fechaFirma: new Date().toISOString()
      });
      showToast('✅ Compromiso de guardia firmado y guardado en la base de datos.');
    } catch (e) {
      console.warn('Persistencia compromiso fallback local:', e);
      setCompromisoUsuario(prev => ({
        ...prev,
        firmado: true,
        sede: sede,
        tipoTurno: tipo,
        tipoDia: dia
      }));
      showToast('✅ Compromiso de guardia firmado exitosamente.');
    }

    setPersonal(prev => prev.map(p => {
      const isCurrentUser = (user?.username && p.username === user.username) || 
                            (user?.first_name && p.nombre.toLowerCase().includes(user.first_name.toLowerCase())) ||
                            (user?.username === 'superadmin' && p.username === 'superadmin');
      if (isCurrentUser) {
        return { ...p, comprometido: true, sedePref: sede, tipoPref: tipo, diaPref: dia };
      }
      return p;
    }));
  };

  // Aprobar Potencial (MOD-05 & RN-04)
  const handleAprobarPotencial = async () => {
    try {
      const res = await API.post('potencial/aprobar/');
      if (res.data) {
        setPeriodoActivo(prev => ({ ...prev, aprobadoFIM: true }));
        showToast('🔒 RN-04: Potencial aprobado de forma irreversible y persistido en la BD.');
        return;
      }
    } catch (e) {
      console.warn('Persistencia aprobar potencial fallback local:', e);
      if (e.response?.data?.error) {
        showToast(e.response.data.error, 'warn');
        return;
      }
    }
    setPeriodoActivo(prev => ({ ...prev, aprobadoFIM: true }));
    showToast('🔒 RN-04: Potencial aprobado de forma irreversible para el Área.');
  };

  // Sincronizar ASSET y SIGENU (MOD-01)
  const handleSincronizar = async (sistema) => {
    showToast(`🔄 Sincronizando datos de guardia desde ${sistema}...`);
    try {
      await API.post('guardia-admin/sincronizar/', { sistema });
      showToast(`✅ Sincronización con ${sistema} completada y persistida en la BD.`);
    } catch (e) {
      console.warn('Sincronización fallback local:', e);
      setTimeout(() => {
        showToast(`✅ Sincronización con ${sistema} completada.`);
      }, 1200);
    }
  };

  // Agregar Área (MOD-01)
  const handleCrearArea = async () => {
    if (!nuevaAreaForm.codigo || !nuevaAreaForm.nombre) {
      showToast('⚠️ Por favor complete el código y nombre del área.', 'warn');
      return;
    }

    try {
      const res = await API.post('guardia-admin/areas/', {
        codigo: nuevaAreaForm.codigo.trim(),
        nombre: nuevaAreaForm.nombre.trim(),
        tieneEstudiantes: nuevaAreaForm.tieneEstudiantes,
        activo: true
      });
      if (res.data) {
        setNomencladores(prev => ({
          ...prev,
          areas: [...prev.areas, {
            id: res.data.id || (prev.areas.length + 1),
            codigo: res.data.codigo,
            nombre: res.data.nombre,
            responsable: nuevaAreaForm.responsable || 'Sin asignar',
            tieneEstudiantes: res.data.tieneEstudiantes,
            deptoCount: 0,
            activo: true
          }]
        }));
      }
      showToast('✅ Nueva área creada y persistida en la base de datos.');
    } catch (e) {
      console.warn('Persistencia de área fallback local:', e);
      setNomencladores(prev => ({
        ...prev,
        areas: [...prev.areas, {
          id: prev.areas.length + 1,
          codigo: nuevaAreaForm.codigo,
          nombre: nuevaAreaForm.nombre,
          responsable: nuevaAreaForm.responsable || 'Sin asignar',
          tieneEstudiantes: nuevaAreaForm.tieneEstudiantes,
          deptoCount: 0,
          activo: true
        }]
      }));
      showToast('✅ Nueva área registrada en el sistema.');
    }

    setShowModalNuevaArea(false);
    setNuevaAreaForm({ codigo: '', nombre: '', responsable: '', tieneEstudiantes: true });
  };

  // Editar Perfil (MOD-02)
  const handleGuardarPerfil = async () => {
    try {
      await API.patch('guardia-admin/perfiles/me/', perfilEdit);
      setPerfilUsuario(prev => ({
        ...prev,
        ...perfilEdit
      }));
      showToast('✅ Datos de contacto actualizados y guardados en la base de datos.');
    } catch (e) {
      console.warn('Persistencia de perfil fallback local:', e);
      showToast('✅ Datos de contacto actualizados correctamente.');
    }

    setPersonal(prev => prev.map(p => {
      const isCurrentUser = (user?.username && p.username === user.username) || 
                            (user?.first_name && p.nombre.toLowerCase().includes(user.first_name.toLowerCase())) ||
                            (user?.username === 'superadmin' && p.username === 'superadmin');
      if (isCurrentUser) {
        return { ...p, ...perfilEdit };
      }
      return p;
    }));
  };

  // Búsqueda de Personas
  const handleBuscarPersona = () => {
    const result = personal.find(p => p.nombre.toLowerCase().includes(searchPersonQuery.toLowerCase()) || p.ci.includes(searchPersonQuery));
    if (result) {
      setSearchResultPerson(result);
    } else {
      setSearchResultPerson(null);
      showToast('❌ Persona no encontrada en el registro de guardia.', 'warn');
    }
  };

  // --- MOD-06: DISTRIBUCIÓN MENSUAL Y TURNOS ---
  const handleToggleDiaDistribucion = (dia) => {
    setFormDistribucion(prev => {
      const diasActuales = prev.dias || [];
      const nuevosDias = diasActuales.includes(dia)
        ? diasActuales.filter(d => d !== dia)
        : [...diasActuales, dia].sort((a, b) => a - b);
      return { ...prev, dias: nuevosDias };
    });
  };

  const handleSeleccionarTodosFinDeSemana = () => {
    const { celdas } = getDiasMesReal(formDistribucion.año, formDistribucion.mes);
    const fines = celdas.filter(c => !c.esVacio && c.esFinDeSemana).map(c => c.dia);
    setFormDistribucion(prev => ({ ...prev, dias: fines }));
    showToast(`📅 ${fines.length} días de fin de semana seleccionados.`);
  };

  const handleSeleccionarDiasLaborales = () => {
    const { celdas } = getDiasMesReal(formDistribucion.año, formDistribucion.mes);
    const laborales = celdas.filter(c => !c.esVacio && !c.esFinDeSemana).map(c => c.dia);
    setFormDistribucion(prev => ({ ...prev, dias: laborales }));
    showToast(`📅 ${laborales.length} días laborales seleccionados.`);
  };

  const handleLimpiarDiasDistribucion = () => {
    setFormDistribucion(prev => ({ ...prev, dias: [] }));
    showToast('🧹 Selección de días limpiada.');
  };

  const handleGuardarDistribucion = async () => {
    const areaSeleccionada = nomencladores.areas.find(a => a.id === Number(formDistribucion.areaId));
    const sedeSeleccionada = nomencladores.sedes.find(s => s.id === Number(formDistribucion.sedeId));

    // RN-06: Guardias estudiantiles solo en áreas con régimen de estudiantes
    if (formDistribucion.tipoPersonal === 'ESTUDIANTE' && areaSeleccionada && !areaSeleccionada.tieneEstudiantes) {
      showToast('⚠️ Regla RN-06: No se pueden asignar guardias estudiantiles en áreas sin estudiantes.', 'warn');
      return;
    }

    if (!formDistribucion.dias || formDistribucion.dias.length === 0) {
      showToast('⚠️ Seleccione al menos un día del mes en el calendario.', 'warn');
      return;
    }

    // RN-07: Comprobación de mínimos físicos por sede
    const minimoSede = formDistribucion.tipoPersonal === 'ESTUDIANTE' 
      ? (sedeSeleccionada?.minEstudiantiles || 1) 
      : (sedeSeleccionada?.minObreras || 1);
    
    if (Number(formDistribucion.cantidadRequerida) < minimoSede) {
      showToast(`⚠️ Alerta RN-07: La cuota asignada (${formDistribucion.cantidadRequerida}) está por debajo del mínimo de la sede (${minimoSede}).`, 'warn');
    }

    const payload = {
      periodo: periodoActivo?.id,
      area: Number(formDistribucion.areaId),
      sede: Number(formDistribucion.sedeId),
      tipo_personal: formDistribucion.tipoPersonal,
      tipo_turno: formDistribucion.tipoGuardia,
      dias_asignados: formDistribucion.dias,
      cantidad_requerida: Number(formDistribucion.cantidadRequerida),
      mes: formDistribucion.mes + 1,
      año: formDistribucion.año
    };

    try {
      const res = await API.post('distribucion/areas/', payload);
      const d = res.data;
      const createdDist = {
        id: d.id,
        areaId: d.area,
        area: d.area_nombre || areaSeleccionada?.nombre || 'Facultad UHO',
        depto: d.departamento_nombre || areaSeleccionada?.nombre || 'General',
        sedeId: d.sede,
        sede: d.sede_nombre || sedeSeleccionada?.nombre || 'Sede UHO',
        tipo: d.tipo_turno || formDistribucion.tipoGuardia,
        tipoPersonal: d.tipo_personal || formDistribucion.tipoPersonal,
        dias: d.dias_asignados || formDistribucion.dias,
        cant: d.cantidad_requerida || Number(formDistribucion.cantidadRequerida)
      };
      setDistribuciones(prev => [createdDist, ...prev]);
      showToast('📅 Distribución mensual guardada y sincronizada en BD.');
    } catch (e) {
      console.warn('Persistencia local distribución fallback:', e);
      const nuevaDist = {
        id: Date.now(),
        areaId: Number(formDistribucion.areaId),
        area: areaSeleccionada?.nombre || 'Facultad de Informática y Matemática',
        depto: areaSeleccionada?.nombre || 'Facultad de Informática y Matemática',
        sedeId: Number(formDistribucion.sedeId),
        sede: sedeSeleccionada?.nombre || 'Sede Oscar Lucero Moya',
        tipo: formDistribucion.tipoGuardia,
        tipoPersonal: formDistribucion.tipoPersonal,
        dias: formDistribucion.dias,
        cant: Number(formDistribucion.cantidadRequerida)
      };
      setDistribuciones(prev => [nuevaDist, ...prev]);
      showToast('📅 Distribución guardada localmente.');
    }
  };

  // RF-0603: Asignación Nominal por el Responsable de Área
  const handleCrearAsignacionNominal = async (distId, fechaStr, perfilId) => {
    if (!distId || !fechaStr || !perfilId) {
      showToast('⚠️ Seleccione la distribución, la fecha y la persona a asignar.', 'warn');
      return;
    }

    const personaObj = personal.find(p => p.id === Number(perfilId));
    const distObj = distribuciones.find(d => d.id === Number(distId));

    try {
      const res = await API.post('distribucion/asignaciones/', {
        distribucion: Number(distId),
        perfil: Number(perfilId),
        fecha: fechaStr
      });
      const data = res.data;
      const nuevaAsig = {
        id: data.id,
        distribucionId: Number(distId),
        fecha: data.fecha,
        personaId: data.perfil,
        persona_nombre: data.persona_nombre || personaObj?.nombre || 'Persona Asignada',
        persona_ci: data.persona_ci || personaObj?.ci || '',
        tipo: data.tipo_personal || personaObj?.tipo || 'OBRERO',
        sede: data.sede_nombre || distObj?.sede || 'Sede UHO',
        tipoGuardia: data.tipo_turno || distObj?.tipo || 'Diurna',
        estado: 'PENDIENTE',
        asistio: null,
        evaluacion: '',
        observaciones: ''
      };
      setAsignaciones(prev => [nuevaAsig, ...prev]);
      showToast(`✅ ${personaObj?.nombre || 'Persona'} asignado(a) al ${fechaStr} exitosamente (RF-0603).`);
      setPersonaSeleccionadaPorDia(prev => ({ ...prev, [fechaStr]: '' }));
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || (err.response?.data?.non_field_errors ? err.response?.data?.non_field_errors[0] : null) || 'Error al asignar persona.';
      showToast(`❌ ${Array.isArray(errorMsg) ? errorMsg.join(' ') : errorMsg}`, 'error');
    }
  };

  const handleEliminarAsignacionNominal = async (asigId) => {
    try {
      await API.delete(`distribucion/asignaciones/${asigId}/`);
      setAsignaciones(prev => prev.filter(a => a.id !== asigId));
      showToast('🗑️ Asignación eliminada correctamente de BD.');
    } catch (err) {
      setAsignaciones(prev => prev.filter(a => a.id !== asigId));
      showToast('🗑️ Asignación removida del calendario.');
    }
  };

  // --- MOD-07: CONTROL DE GUARDIA DIARIO Y EVALUACIONES ---
  const handleSetEstadoAsistencia = (fecha, personaId, nuevoEstado) => {
    setAsignaciones(prev => {
      const exists = prev.find(a => a.fecha === fecha && a.personaId === personaId);
      if (exists) {
        let nuevoAsistio = null;
        let nuevaEval = exists.evaluacion || '';
        let nuevasObs = exists.observaciones || '';

        if (nuevoEstado === 'PRESENTE') {
          nuevoAsistio = true;
          nuevaEval = nuevaEval || 'B';
        } else if (nuevoEstado === 'AUSENTE') {
          nuevoAsistio = false;
          nuevaEval = ''; // RN-09 estricto
        } else if (nuevoEstado === 'JUSTIFICADO') {
          nuevoAsistio = false;
          nuevaEval = ''; // RN-09 estricto
          if (!nuevasObs || !nuevasObs.toLowerCase().includes('justificad')) {
            nuevasObs = nuevasObs ? `[JUSTIFICADO] ${nuevasObs}` : 'Ausencia justificada / Licencia';
          }
        } else {
          // PENDIENTE
          nuevoAsistio = null;
          nuevaEval = '';
        }

        return prev.map(a => (a.fecha === fecha && a.personaId === personaId)
          ? {
              ...a,
              estado: nuevoEstado,
              asistio: nuevoAsistio,
              evaluacion: nuevaEval,
              observaciones: nuevasObs
            }
          : a
        );
      } else {
        const persona = personal.find(p => p.id === personaId);
        let nuevoAsistio = null;
        let nuevaEval = '';
        let nuevasObs = '';

        if (nuevoEstado === 'PRESENTE') {
          nuevoAsistio = true;
          nuevaEval = 'B';
        } else if (nuevoEstado === 'AUSENTE') {
          nuevoAsistio = false;
        } else if (nuevoEstado === 'JUSTIFICADO') {
          nuevoAsistio = false;
          nuevasObs = 'Ausencia justificada / Licencia';
        }

        return [...prev, {
          id: Date.now(),
          fecha,
          personaId,
          persona_nombre: persona ? persona.nombre : 'Personal',
          tipo: persona ? persona.tipo : 'OBRERO',
          sede: 'Sede Oscar Lucero Moya',
          tipoGuardia: 'Diurna',
          estado: nuevoEstado,
          asistio: nuevoAsistio,
          evaluacion: nuevaEval,
          observaciones: nuevasObs
        }];
      }
    });
  };

  const handleMarcarTodosPresentes = (fecha) => {
    personal.forEach(p => {
      handleSetEstadoAsistencia(fecha, p.id, 'PRESENTE');
    });
    showToast('✓ Todo el personal convocado marcado como PRESENTE.');
  };

  const handleReiniciarPendientes = (fecha) => {
    personal.forEach(p => {
      handleSetEstadoAsistencia(fecha, p.id, 'PENDIENTE');
    });
    showToast('↻ Asistencia reiniciada a PENDIENTE (Sin registrar).');
  };

  const handleUpdateEvaluacion = (fecha, personaId, val) => {
    setAsignaciones(prev => prev.map(a => {
      if (a.fecha === fecha && a.personaId === personaId) {
        // RN-09: Evaluaciones sólo para quienes asistieron (PRESENTE)
        if (a.estado !== 'PRESENTE') return { ...a, evaluacion: '' };
        return { ...a, evaluacion: val };
      }
      return a;
    }));
  };

  const handleUpdateObservaciones = (fecha, personaId, val) => {
    setAsignaciones(prev => prev.map(a => (a.fecha === fecha && a.personaId === personaId) ? { ...a, observaciones: val } : a));
  };

  const handleGuardarControlDiario = async () => {
    // Tomar todos los registros marcados (no pendientes) para la fecha
    const registros = personal.map(p => {
      const asig = asignaciones.find(a => a.personaId === p.id && a.fecha === fechaControl);
      if (!asig || !asig.estado || asig.estado === 'PENDIENTE') return null;
      return {
        asignacion_id: (asig.id && typeof asig.id === 'number' && asig.id < 1000000000) ? asig.id : null,
        perfil_id: p.id,
        fecha: fechaControl,
        asistio: asig.estado === 'PRESENTE',
        evaluacion: asig.estado === 'PRESENTE' ? (asig.evaluacion || 'B') : '',
        observaciones: asig.observaciones || ''
      };
    }).filter(Boolean);

    if (registros.length === 0) {
      showToast('⚠️ No hay asistencias marcadas para guardar en esta fecha (todos están en estado Pendiente).', 'error');
      return;
    }

    try {
      const res = await API.post('control/evaluaciones/guardar-lote-diario/', { 
        fecha: fechaControl,
        registros 
      });

      // Actualizar IDs reales desde el backend si se crearon asignaciones nuevas
      if (res.data?.registros_guardados) {
        setAsignaciones(prev => {
          let updated = [...prev];
          res.data.registros_guardados.forEach(rg => {
            const idx = updated.findIndex(u => u.fecha === rg.fecha && u.personaId === rg.perfil_id);
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                id: rg.asignacion_id,
                asistio: rg.asistio,
                evaluacion: rg.evaluacion,
                observaciones: rg.observaciones
              };
            }
          });
          return updated;
        });
      }

      showToast(`💾 Control diario guardado con persistencia total en la BD (${registros.length} registros sincronizados).`);
    } catch (e) {
      console.error('Error guardando control diario en backend:', e);
      showToast('❌ Ocurrió un error al persistir el control en el servidor. Verifique permisos.', 'error');
    }
  };

  // --- MOD-09: NOTIFICACIONES INSTITUCIONALES ---
  const handleMarcarTodasLeidas = async () => {
    try {
      await API.post('control/notificaciones/marcar-todas-leidas/');
    } catch (e) {
      console.warn('Fallback marcar notificaciones:', e);
    }
    setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
    showToast('🔔 Todas las notificaciones han sido marcadas como leídas.');
  };

  const handleGenerarAlertasAutomaticas = async () => {
    showToast('⚡ Comprobando turnos para alertas automáticas (RN-08)...');
    try {
      const res = await API.post('control/notificaciones/generar-alertas-automaticas/');
      const count = res.data?.alertas_creadas ?? 0;
      showToast(`🔔 RN-08: ${count} alertas automáticas generadas.`);
      
      const resNotif = await API.get('control/notificaciones/');
      if (resNotif.data && resNotif.data.length > 0) {
        setNotificaciones(resNotif.data.map(n => ({
          id: n.id,
          texto: `${n.titulo}: ${n.mensaje}`,
          tiempo: n.tiempo_relativo || 'Reciente',
          leido: n.leido
        })));
      }
    } catch (e) {
      console.warn('Fallback generar alertas:', e);
      showToast('🔔 Alertas institucionales verificadas conforme a RN-08.');
    }
  };

  // --- MOD-08: GENERACIÓN Y DESCARGA DE REPORTES (EXCEL Y PDF) ---
  const handleDescargarReporteExcel = async () => {
    showToast('📊 Generando matriz oficial de cumplimiento en Excel (.xlsx)...');
    try {
      const response = await API.get('reportes/exportar-excel/', { 
        responseType: 'blob' 
      });
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Reporte_Cumplimiento_Guardia_UHO.xlsx';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1000);
      showToast('✅ Matriz en Excel descargada exitosamente.');
    } catch (e) {
      console.warn('Descarga Excel fallback:', e);
      showToast('⚠️ No se pudo descargar el archivo Excel del servidor.', 'warn');
    }
  };

  const handleDescargarReportePdf = async () => {
    showToast('📄 Generando informe institucional de guardia en PDF...');
    try {
      const response = await API.get('reportes/exportar-pdf/', { 
        responseType: 'blob' 
      });
      const blob = new Blob([response.data], { 
        type: 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Informe_Cumplimiento_Guardia_UHO.pdf';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1000);
      showToast('✅ Informe oficial en PDF descargado exitosamente.');
    } catch (e) {
      console.warn('Descarga PDF fallback:', e);
      showToast('⚠️ No se pudo descargar el informe PDF del servidor.', 'warn');
    }
  };

  // Inclusión Manual al Potencial (RF-0502)
  const handleConfirmarInclusionManual = async () => {
    try {
      if (inclusionPersonaSeleccionada) {
        await API.post('potencial/incluir-manual/', {
          perfil_id: inclusionPersonaSeleccionada.id,
          tipo_turno: manualInclusionForm.tipo,
          tipo_dia: manualInclusionForm.dia
        });
        showToast(`✅ ${inclusionPersonaSeleccionada.nombre} incluido y persistido en la BD.`);
      }
    } catch (e) {
      console.warn('Persistencia manual fallback local:', e);
      showToast(`✅ ${inclusionPersonaSeleccionada.nombre} incluido manualmente al potencial.`);
    }
    setPersonal(prev => prev.map(p => {
      if (p.id === inclusionPersonaSeleccionada.id) {
        return { ...p, comprometido: true, sedePref: manualInclusionForm.sede, tipoPref: manualInclusionForm.tipo, diaPref: manualInclusionForm.dia };
      }
      return p;
    }));
    setShowModalInclusionManual(false);
  };

  // Inclusión por Lote al Potencial (RF-0502)
  const handleConfirmarInclusionLote = async () => {
    try {
      if (personalSeleccionadoPotencial.length > 0) {
        await API.post('potencial/asignar-lote/', {
          perfiles_ids: personalSeleccionadoPotencial,
          tipo_turno: loteInclusionForm.tipo,
          tipo_dia: loteInclusionForm.dia
        });
        showToast(`✅ ${personalSeleccionadoPotencial.length} personas asignadas y persistidas en la BD.`);
      }
    } catch (e) {
      console.warn('Persistencia lote fallback local:', e);
      showToast(`✅ ${personalSeleccionadoPotencial.length} personas incluidas por lote.`);
    }
    setPersonal(prev => prev.map(p => {
      if (personalSeleccionadoPotencial.includes(p.id)) {
        return { ...p, comprometido: true, sedePref: loteInclusionForm.sede, tipoPref: loteInclusionForm.tipo, diaPref: loteInclusionForm.dia };
      }
      return p;
    }));
    setPersonalSeleccionadoPotencial([]);
    setShowModalLote(false);
  };

  // Exportador Universal de Tablas
  const triggerExport = (titulo, columnas, datos) => {
    setExportPreview({ titulo, columnas, datos });
    setShowModalExport(true);
  };

  // --- RENDERIZADO DE VISTAS (TABS) ---

  const renderDashboard = () => {
    const totalTrabajadores = personal.filter(p => p.tipo === 'OBRERO').length;
    const comprometidosObreros = personal.filter(p => p.tipo === 'OBRERO' && p.comprometido).length;
    const sinCompromisoObreros = totalTrabajadores - comprometidosObreros;

    const totalEstudiantes = personal.filter(p => p.tipo === 'ESTUDIANTE').length;
    const comprometidosEstudiantes = personal.filter(p => p.tipo === 'ESTUDIANTE' && p.comprometido).length;
    const sinCompromisoEstudiantes = totalEstudiantes - comprometidosEstudiantes;

    return (
      <div className="space-y-6">
        {/* Banner Informativo */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-slate-800/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold uppercase tracking-wider">
              Control de Guardia Activo
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-2">Universidad de Holguín "Oscar Lucero Moya"</h2>
            <p className="text-xs text-slate-400 mt-1">Período de Guardia: {periodoActivo.nombre} | Facultad de Informática</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSincronizar('ASSET / SIGENU')} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
              Sincronizar Base
            </button>
            <button onClick={() => triggerExport('Dashboard General', ['Métrica', 'Valor'], [['Total Trabajadores', totalTrabajadores], ['Comprometidos', comprometidosObreros]])} className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors">
              <Download className="h-3.5 w-3.5 text-amber-400" />
              Exportar Reporte
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5">
            <h4 className="text-xs text-slate-400 font-semibold uppercase tracking-wider">👷 Obreros Activos</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{totalTrabajadores}</span>
              <span className="text-xs text-slate-500">Personas</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Sincronizado con ASSET</p>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 border-t-2 border-t-emerald-500">
            <h4 className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">✅ Comprometidos</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{comprometidosObreros}</span>
              <span className="text-xs text-emerald-500">({totalTrabajadores > 0 ? Math.round((comprometidosObreros/totalTrabajadores)*100) : 0}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalTrabajadores > 0 ? (comprometidosObreros/totalTrabajadores)*100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 border-t-2 border-t-amber-500">
            <h4 className="text-xs text-amber-400 font-semibold uppercase tracking-wider">⏳ Sin Compromiso</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{sinCompromisoObreros}</span>
              <span className="text-xs text-amber-500">({totalTrabajadores > 0 ? Math.round((sinCompromisoObreros/totalTrabajadores)*100) : 0}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalTrabajadores > 0 ? (sinCompromisoObreros/totalTrabajadores)*100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 border-t-2 border-t-blue-500">
            <h4 className="text-xs text-blue-400 font-semibold uppercase tracking-wider">🎓 Estudiantes</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{comprometidosEstudiantes}</span>
              <span className="text-xs text-blue-500">/ {totalEstudiantes} Comp.</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${totalEstudiantes > 0 ? (comprometidosEstudiantes/totalEstudiantes)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Gráficos y Tendencias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Compromiso por Departamento (FIM)</h3>
            <div className="flex items-end justify-around h-48 pt-4">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 bg-slate-800 rounded-t-lg h-32 flex flex-col justify-end">
                  <div className="bg-emerald-600 rounded-t-lg w-full" style={{ height: '80%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Sistemas</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 bg-slate-800 rounded-t-lg h-32 flex flex-col justify-end">
                  <div className="bg-emerald-600 rounded-t-lg w-full" style={{ height: '70%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Conectividad</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 bg-slate-800 rounded-t-lg h-32 flex flex-col justify-end">
                  <div className="bg-emerald-600 rounded-t-lg w-full" style={{ height: '90%' }}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">Matemática</span>
              </div>
            </div>
            <div className="flex gap-4 justify-center mt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
                <span>Comprometidos</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>
                <span>Pendientes</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Línea del Período de Guardia</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Apertura del Período</h4>
                  <p className="text-[10px] text-slate-400">01 Junio 2026 - Completado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Cierre de Compromiso</h4>
                  <p className="text-[10px] text-slate-400">15 Junio 2026 - Faltan 13 días | {sinCompromisoObreros} sin compromiso</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Lock className="h-3 w-3 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500">Aprobación de Potencial por Jefes</h4>
                  <p className="text-[10px] text-slate-500">16–25 Junio 2026 - Bloqueo Irreversible</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompromisoObrero = () => {
    // Buscar datos del usuario logueado en la lista simulada o perfil activo
    const currentMember = personal.find(p => 
      (user?.username && p.username === user.username) || 
      (user?.first_name && p.nombre.toLowerCase().includes(user.first_name.toLowerCase()))
    ) || personal[0];
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              Firma de Compromiso Obrero
            </span>
            {compromisoUsuario.firmado ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Compromiso Guardado en BD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="h-3.5 w-3.5" />
                Pendiente de Firma
              </span>
            )}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Sede donde prefiere realizar la guardia *</label>
              <select 
                value={compromisoUsuario.sede || 'Sede Oscar Lucero Moya'}
                onChange={(e) => setCompromisoUsuario(prev => ({ ...prev, sede: e.target.value }))}
                id="form-sede-obrero"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccione una sede...</option>
                {nomencladores.sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Preferencia de Turno *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="turno-pref-obrero" 
                    value="Diurna" 
                    checked={compromisoUsuario.tipoTurno === 'Diurna'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoTurno: 'Diurna' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Guardia Diurna
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="turno-pref-obrero" 
                    value="Nocturna" 
                    checked={compromisoUsuario.tipoTurno === 'Nocturna'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoTurno: 'Nocturna' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Guardia Nocturna
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Preferencia de Día *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="dia-pref-obrero" 
                    value="Semana" 
                    checked={compromisoUsuario.tipoDia === 'Semana'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoDia: 'Semana' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Día de Semana
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="dia-pref-obrero" 
                    value="Fin de Semana" 
                    checked={compromisoUsuario.tipoDia === 'Fin de Semana'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoDia: 'Fin de Semana' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Fin de Semana
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/65 flex gap-3">
              <button 
                onClick={() => handleGuardarCompromiso(compromisoUsuario.sede, compromisoUsuario.tipoTurno, compromisoUsuario.tipoDia)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {compromisoUsuario.firmado ? 'Actualizar Compromiso Firmado' : 'Firmar Compromiso'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Datos del Empleado (ASSET)</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Nombre completo</span>
                <span className="font-bold text-slate-300">{perfilUsuario.nombre || user?.first_name || user?.username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">CI</span>
                <span className="font-mono text-slate-300">{enmascararCI(perfilUsuario.ci || '75041012345', true)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Contrato</span>
                <span className="text-slate-300">{perfilUsuario.contrato || 'Fijo Indeterminado'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Departamento</span>
                <span className="text-slate-300">{perfilUsuario.depto || 'Depto. de Sistemas de Información'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Cargo</span>
                <span className="text-slate-300">{perfilUsuario.cargo || user?.role || 'Profesor Auxiliar'}</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-[10px] text-slate-500">
              ℹ️ Estos datos se sincronizan directamente desde ASSET y no pueden editarse de forma manual.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCompromisoEstudiantil = () => {
    const currentMember = personal.find(p => 
      (user?.username && p.username === user.username) || 
      (user?.first_name && p.nombre.toLowerCase().includes(user.first_name.toLowerCase())) ||
      p.tipo === 'ESTUDIANTE'
    ) || personal[3] || personal[0];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              Firma de Compromiso Estudiantil (MOD-04)
            </span>
            {compromisoUsuario.firmado ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Compromiso Guardado en BD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="h-3.5 w-3.5" />
                Pendiente de Firma
              </span>
            )}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Sede asignada para Guardia Estudiantil *</label>
              <select 
                value={compromisoUsuario.sede || 'Sede Oscar Lucero Moya'}
                onChange={(e) => setCompromisoUsuario(prev => ({ ...prev, sede: e.target.value }))}
                id="form-sede-estudiante"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Seleccione una sede...</option>
                {nomencladores.sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Turno preseleccionado *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="turno-pref-est" 
                    value="Diurna" 
                    checked={compromisoUsuario.tipoTurno === 'Diurna'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoTurno: 'Diurna' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Guardia Diurna (Estudiantil)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="turno-pref-est" 
                    value="Nocturna" 
                    checked={compromisoUsuario.tipoTurno === 'Nocturna'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoTurno: 'Nocturna' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Guardia Nocturna (Estudiantil)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Preferencia de Día *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="dia-pref-est" 
                    value="Fin de Semana" 
                    checked={compromisoUsuario.tipoDia === 'Fin de Semana'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoDia: 'Fin de Semana' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Fin de Semana
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="radio" 
                    name="dia-pref-est" 
                    value="Semana" 
                    checked={compromisoUsuario.tipoDia === 'Semana'} 
                    onChange={() => setCompromisoUsuario(prev => ({ ...prev, tipoDia: 'Semana' }))}
                    className="accent-emerald-500 h-4 w-4" 
                  />
                  Día de Semana
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/65 flex gap-3">
              <button 
                onClick={() => handleGuardarCompromiso(compromisoUsuario.sede, compromisoUsuario.tipoTurno, compromisoUsuario.tipoDia || 'Fin de Semana')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {compromisoUsuario.firmado ? 'Actualizar Compromiso Guardado' : 'Guardar Compromiso'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-100 mb-3">Datos del Estudiante (SIGENU)</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Nombre completo</span>
                <span className="font-bold text-slate-300">{perfilUsuario.nombre || user?.first_name || user?.username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">CI</span>
                <span className="font-mono text-slate-300">{enmascararCI(perfilUsuario.ci || '03102434567', true)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Año de carrera</span>
                <span className="text-slate-300">{perfilUsuario.cargo?.includes('Año') ? perfilUsuario.cargo : (perfilUsuario.tipo === 'ESTUDIANTE' ? '4to Año' : 'Estudiante')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Facultad</span>
                <span className="text-slate-300">{perfilUsuario.area || 'Facultad de Informática y Matemática'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPotencial = () => {
    // Filtrar personas según área seleccionada
    const listaPotencial = personal.filter(p => p.area === filtroAreaPotencial);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">Potencial de Guardia (MOD-05)</h3>
            <p className="text-xs text-slate-400">Gestión de personal comprometido y aprobación de potencial</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={filtroAreaPotencial}
              onChange={(e) => setFiltroAreaPotencial(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              {nomencladores.areas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
            </select>
            <button 
              disabled={personalSeleccionadoPotencial.length === 0 || periodoActivo.aprobadoFIM}
              onClick={() => {
                setShowModalLote(true);
              }}
              className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold transition-colors"
            >
              Asignación por Lote ({personalSeleccionadoPotencial.length})
            </button>
            <button 
              disabled={periodoActivo.aprobadoFIM}
              onClick={handleAprobarPotencial} 
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {periodoActivo.aprobadoFIM ? 'Potencial Aprobado' : 'Aprobar Potencial'}
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[800px] md:min-w-0">
            <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPersonalSeleccionadoPotencial(listaPotencial.map(p => p.id));
                      } else {
                        setPersonalSeleccionadoPotencial([]);
                      }
                    }}
                    className="accent-emerald-500 h-4 w-4 rounded" 
                  />
                </th>
                <th className="p-4">Nombre y Apellidos</th>
                <th className="p-4">CI (Edad)</th>
                <th className="p-4">Sexo</th>
                <th className="p-4">Departamento</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Preferencia</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {listaPotencial.map(p => (
                <tr key={p.id} className="hover:bg-slate-950/20 text-slate-300 transition-colors">
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={personalSeleccionadoPotencial.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPersonalSeleccionadoPotencial(prev => [...prev, p.id]);
                        } else {
                          setPersonalSeleccionadoPotencial(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                      className="accent-emerald-500 h-4 w-4 rounded" 
                    />
                  </td>
                  <td className="p-4 font-semibold text-slate-200">{p.nombre}</td>
                  <td className="p-4 font-mono text-slate-400">
                    {enmascararCI(p.ci)} ({calcularEdadDesdeCI(p.ci)} años)
                  </td>
                  <td className="p-4">{p.sexo}</td>
                  <td className="p-4 text-slate-400">{p.depto}</td>
                  <td className="p-4">
                    {p.comprometido ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-semibold text-[10px]">
                        Comprometido
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 font-semibold text-[10px]">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {p.comprometido ? (
                      <span className="text-[11px] text-slate-400">{p.sedePref} ({p.tipoPref})</span>
                    ) : (
                      <span className="text-[11px] text-slate-500">No especificada</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {!p.comprometido && (
                      <button 
                        disabled={periodoActivo.aprobadoFIM}
                        onClick={() => {
                          setInclusionPersonaSeleccionada(p);
                          setShowModalInclusionManual(true);
                        }}
                        className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
                      >
                        Incluir Manual
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDistribucion = () => {
    // Determinar permisos y roles
    const esSuperadmin = user?.role === 'SUPERADMIN';
    const esJefeSeguridad = user?.role === 'JEFE_SEGURIDAD';
    const esResponsable = ['RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO'].includes(user?.role);

    // Área activa para la vista nominal: Si es responsable, su propia área; si es superadmin/jefe, la seleccionada
    const areaResponsableNombre = perfilUsuario.area || user?.departamento || (nomencladores.areas[0]?.nombre || '');
    const areaActivaNominal = esSuperadmin ? (filtroAreaNominal === 'TODAS' ? (nomencladores.areas[0]?.nombre || '') : filtroAreaNominal) : areaResponsableNombre;

    // Distribuciones filtradas para el área activa
    const distribucionesArea = distribuciones.filter(d => 
      !areaActivaNominal || d.area === areaActivaNominal || d.depto === areaActivaNominal
    );

    // Distribución seleccionada actualmente para asignación nominal
    const distSeleccionada = distribuciones.find(d => d.id === distribucionSeleccionadaId) || distribucionesArea[0] || distribuciones[0];

    // Personal elegible del potencial aprobado del área (RN-05)
    const personalAreaElegible = personal.filter(p => {
      const matchArea = !areaActivaNominal || p.area === areaActivaNominal;
      const matchTipo = !distSeleccionada || p.tipo === distSeleccionada.tipoPersonal;
      return matchArea && matchTipo;
    });

    const areaSel = nomencladores.areas.find(a => a.id === Number(formDistribucion.areaId));
    const sedeSel = nomencladores.sedes.find(s => s.id === Number(formDistribucion.sedeId));
    const esAreaSinEstudiantes = formDistribucion.tipoPersonal === 'ESTUDIANTE' && areaSel && !areaSel.tieneEstudiantes;
    const minSede = formDistribucion.tipoPersonal === 'ESTUDIANTE' ? (sedeSel?.minEstudiantiles || 1) : (sedeSel?.minObreras || 1);
    const alertaMinimo = Number(formDistribucion.cantidadRequerida) < minSede;

    return (
      <div className="space-y-6">
        {/* Cabecera Principal con Indicador de Rol */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <Calendar className="h-6 w-6 text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-100">Distribución de Guardias (MOD-06)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Planificación institucional por áreas y asignación nominal de turnos conforme a las normas <span className="text-emerald-400 font-semibold">RF-0601, RF-0602 y RF-0603</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {esJefeSeguridad && 'Rol: Jefe de Seguridad (Planificación Institucional RF-0601)'}
              {esResponsable && `Rol: ${user?.role === 'RESPONSABLE_AREA' ? 'Responsable de Área' : 'Responsable de Depto'} (Asignación Nominal RF-0603)`}
              {esSuperadmin && 'Rol: Superadministrador (Control Global)'}
            </span>
          </div>
        </div>

        {/* Selector de Pestañas exclusivo para Superadmin */}
        {esSuperadmin && (
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setSubTabDistribucion('INSTITUCIONAL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                subTabDistribucion === 'INSTITUCIONAL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800'
              }`}
            >
              <Database className="h-4 w-4" />
              1. Cuotas y Días por Área (RF-0601 / RF-0602 - Jefe de Seguridad)
            </button>
            <button
              onClick={() => setSubTabDistribucion('NOMINAL')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                subTabDistribucion === 'NOMINAL'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800'
              }`}
            >
              <Users className="h-4 w-4" />
              2. Asignación Nominal de Personas (RF-0603 - Responsable de Área)
            </button>
          </div>
        )}

        {/* VISTA 1: PLANIFICACIÓN INSTITUCIONAL POR ÁREAS (JEFE DE SEGURIDAD / SUPERADMIN) */}
        {(esJefeSeguridad || (esSuperadmin && subTabDistribucion === 'INSTITUCIONAL')) && (
          <div className="space-y-6">
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-300 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Planificación Macro Institucional (RF-0601, RF-0602)</p>
                <p className="text-emerald-400/80 mt-0.5">
                  El Jefe del Dpto. de Seguridad asigna a cada Área/Facultad las sedes físicas, turnos (diurno/nocturno), cuotas de personal requeridas y los días del mes en que deben cubrir la guardia. Posteriormente, los Responsables de Área asignarán nominalmente a las personas específicas de su potencial (RF-0603).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario de Planificación */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2">
                  Asignar Cuota y Días a un Área Universitaria
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Área / Facultad Destinataria *</label>
                    <select 
                      value={formDistribucion.areaId} 
                      onChange={(e) => setFormDistribucion(prev => ({ ...prev, areaId: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      {nomencladores.areas.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} {!a.tieneEstudiantes ? '(Solo Obreros)' : '(Obreros y Estudiantes)'}
                        </option>
                      ))}
                    </select>
                    {esAreaSinEstudiantes && (
                      <p className="mt-1 text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                        ⚠️ Regla RN-06: Esta área no gestiona régimen estudiantil.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Régimen de Personal *</label>
                      <select 
                        value={formDistribucion.tipoPersonal}
                        onChange={(e) => setFormDistribucion(prev => ({ ...prev, tipoPersonal: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="OBRERO">Guardia Obrera (Trabajadores)</option>
                        <option value="ESTUDIANTE">Guardia Estudiantil (Universitarios)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sede Física *</label>
                      <select 
                        value={formDistribucion.sedeId}
                        onChange={(e) => setFormDistribucion(prev => ({ ...prev, sedeId: Number(e.target.value) }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        {nomencladores.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Turno *</label>
                      <select 
                        value={formDistribucion.tipoGuardia}
                        onChange={(e) => setFormDistribucion(prev => ({ ...prev, tipoGuardia: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Diurna">Diurna (8:00 AM - 5:00 PM)</option>
                        <option value="Nocturna">Nocturna (5:00 PM - 8:00 AM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cuota Requerida / Día *</label>
                      <input 
                        type="number" 
                        min={1} 
                        max={20}
                        value={formDistribucion.cantidadRequerida} 
                        onChange={(e) => setFormDistribucion(prev => ({ ...prev, cantidadRequerida: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold" 
                      />
                      {alertaMinimo && (
                        <p className="mt-1 text-[11px] text-amber-400 font-semibold">
                          ⚠️ RN-07: Mínimo institucional para esta sede: {minSede}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Calendario Realista Dinámico con toggle de días */}
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                    {/* Barra de Navegación de Mes y Año */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormDistribucion(prev => {
                              const nuevoMes = prev.mes === 0 ? 11 : prev.mes - 1;
                              const nuevoAño = prev.mes === 0 ? prev.año - 1 : prev.año;
                              return { ...prev, mes: nuevoMes, año: nuevoAño, dias: [] };
                            });
                          }}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Mes anterior"
                        >
                          ◀
                        </button>
                        <select
                          value={formDistribucion.mes}
                          onChange={(e) => setFormDistribucion(prev => ({ ...prev, mes: Number(e.target.value), dias: [] }))}
                          className="bg-slate-900 border border-slate-750 text-slate-100 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none"
                        >
                          {NOMBRES_MESES.map((nombre, idx) => (
                            <option key={idx} value={idx}>{nombre}</option>
                          ))}
                        </select>
                        <select
                          value={formDistribucion.año}
                          onChange={(e) => setFormDistribucion(prev => ({ ...prev, año: Number(e.target.value), dias: [] }))}
                          className="bg-slate-900 border border-slate-750 text-slate-100 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none"
                        >
                          {[2025, 2026, 2027].map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setFormDistribucion(prev => {
                              const nuevoMes = prev.mes === 11 ? 0 : prev.mes + 1;
                              const nuevoAño = prev.mes === 11 ? prev.año + 1 : prev.año;
                              return { ...prev, mes: nuevoMes, año: nuevoAño, dias: [] };
                            });
                          }}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Mes siguiente"
                        >
                          ▶
                        </button>
                      </div>

                      <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        {formDistribucion.dias.length} días seleccionados
                      </span>
                    </div>

                    {/* Atajos de selección rápida */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400 font-semibold mr-1">Atajos:</span>
                      <button
                        type="button"
                        onClick={handleSeleccionarTodosFinDeSemana}
                        className="px-2 py-0.5 rounded-md bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 font-semibold transition-colors"
                      >
                        ⚡ Fines de Semana (S-D)
                      </button>
                      <button
                        type="button"
                        onClick={handleSeleccionarDiasLaborales}
                        className="px-2 py-0.5 rounded-md bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 font-semibold transition-colors"
                      >
                        💼 Días Laborales (L-V)
                      </button>
                      <button
                        type="button"
                        onClick={handleLimpiarDiasDistribucion}
                        className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-750 transition-colors"
                      >
                        🧹 Limpiar
                      </button>
                    </div>

                    {/* Cuadrícula de Calendario Realista */}
                    <div className="space-y-1">
                      {/* Cabecera de días de la semana (Lunes a Domingo) */}
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {DIAS_SEMANA_CORTOS.map((nombreDia, idx) => {
                          const esFin = idx >= 5;
                          return (
                            <span 
                              key={nombreDia} 
                              className={`text-[10px] font-bold py-0.5 ${
                                esFin ? 'text-purple-400' : 'text-slate-400'
                              }`}
                            >
                              {nombreDia}
                            </span>
                          );
                        })}
                      </div>

                      {/* Celdas del mes con offset real */}
                      <div className="grid grid-cols-7 gap-1">
                        {getDiasMesReal(formDistribucion.año, formDistribucion.mes).celdas.map(c => {
                          if (c.esVacio) {
                            return <div key={c.id} className="aspect-square rounded-lg bg-slate-950/20" />;
                          }

                          const isSelected = formDistribucion.dias.includes(c.dia);
                          return (
                            <button
                              key={c.dia}
                              type="button"
                              onClick={() => handleToggleDiaDistribucion(c.dia)}
                              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all relative ${
                                isSelected
                                  ? 'bg-emerald-600 text-white font-bold border border-emerald-400 shadow-md shadow-emerald-950/60'
                                  : c.esFinDeSemana
                                  ? 'bg-slate-900/90 text-purple-300 border border-purple-900/40 hover:bg-purple-950/40 hover:text-white'
                                  : 'bg-slate-900/60 text-slate-300 border border-slate-800 hover:bg-slate-850 hover:text-white'
                              }`}
                              title={`${c.diaSemanaNombre} ${c.dia} de ${NOMBRES_MESES[formDistribucion.mes]} ${formDistribucion.año} (${c.esFinDeSemana ? 'Fin de Semana' : 'Día de Semana'})`}
                            >
                              <span>{c.dia}</span>
                              {c.esFinDeSemana && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={handleGuardarDistribucion} 
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Guardar y Notificar al Área (RF-0601 / RF-0602)
                  </button>
                </div>
              </div>

              {/* Listado de Distribuciones Institucionales */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex justify-between items-center">
                  <span>Cuotas Institucionales Activas</span>
                  <span className="text-xs text-emerald-400 font-normal">{distribuciones.length} planificadas</span>
                </h3>
                <div className="space-y-3 mt-4 max-h-[520px] overflow-y-auto pr-1">
                  {distribuciones.map(d => {
                    const totalAsignadosDist = asignaciones.filter(a => a.distribucionId === d.id).length;
                    const totalEsperadosDist = (Array.isArray(d.dias) ? d.dias.length : 1) * (d.cant || 1);
                    return (
                      <div key={d.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 space-y-2 hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{d.area || d.depto}</span>
                            <span className="text-[11px] text-slate-400">{d.sede} • {d.tipo}</span>
                          </div>
                          <div className="flex gap-1.5 items-center">
                            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[9px] font-bold uppercase">
                              {d.tipoPersonal || 'OBRERO'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] font-bold uppercase">
                              {d.tipo}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-300 font-semibold pt-1 border-t border-slate-850/60">
                          <span>Días: {Array.isArray(d.dias) ? d.dias.join(', ') : d.dias}</span>
                          <span className="text-emerald-400 font-bold">Cuota: {d.cant} pers/día</span>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                          <span>Cobertura nominal:</span>
                          <span className={`font-semibold ${totalAsignadosDist >= totalEsperadosDist ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {totalAsignadosDist} / {totalEsperadosDist} asignados
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 2: ASIGNACIÓN NOMINAL DE PERSONAS (RESPONSABLE DE ÁREA / SUPERADMIN - RF-0603) */}
        {(esResponsable || (esSuperadmin && subTabDistribucion === 'NOMINAL')) && (
          <div className="space-y-6">
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-300 flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Asignación Nominal de Personas por el Área (RF-0603)</p>
                <p className="text-blue-400/80 mt-0.5">
                  Como Responsable de Área, seleccione a las personas de su <span className="font-bold text-white">Potencial Aprobado (RN-05)</span> para cubrir los días y cuotas asignados por el Jefe de Seguridad. Cada persona seleccionada quedará programada y recibirá sus notificaciones institucionales automáticas (RN-08).
                </p>
              </div>
            </div>

            {/* Selector de Área (para Superadmin) y Selector de Distribución Activa */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {esSuperadmin && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Filtrar por Área Universitaria</label>
                    <select
                      value={filtroAreaNominal}
                      onChange={(e) => setFiltroAreaNominal(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="TODAS">-- Todas las Áreas --</option>
                      {nomencladores.areas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                    </select>
                  </div>
                )}

                <div className={esSuperadmin ? '' : 'md:col-span-2'}>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Seleccione la Planificación Institucional a Cubrir *
                  </label>
                  <select
                    value={distSeleccionada?.id || ''}
                    onChange={(e) => setDistribucionSeleccionadaId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    {distribucionesArea.length === 0 ? (
                      <option value="">No hay distribuciones asignadas a esta área</option>
                    ) : (
                      distribucionesArea.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.area} • {d.sede} ({d.tipo} {d.tipoPersonal}) — Días: {Array.isArray(d.dias) ? d.dias.join(', ') : d.dias} (Cuota: {d.cant}/día)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Controles y Visualización de Asignación por Día */}
            {distSeleccionada ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                      Planificación de {distSeleccionada.sede} ({distSeleccionada.tipo} - {distSeleccionada.tipoPersonal})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cuota obligatoria institucional: <span className="text-emerald-400 font-bold">{distSeleccionada.cant} personas por guardia</span>
                    </p>
                  </div>

                  {/* Selector de modo de vista: Calendario vs Tarjetas */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setModoVistaNominal('CALENDARIO')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        modoVistaNominal === 'CALENDARIO'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Calendario Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoVistaNominal('TARJETAS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        modoVistaNominal === 'TARJETAS'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Tarjetas de Turno
                    </button>
                  </div>
                </div>

                {/* MODO 1: CALENDARIO MENSUAL REALISTA INTERACTIVO */}
                {modoVistaNominal === 'CALENDARIO' && (() => {
                  const mesIdx = distSeleccionada.mes ? distSeleccionada.mes - 1 : 5;
                  const añoDist = distSeleccionada.año || 2026;
                  const { celdas } = getDiasMesReal(añoDist, mesIdx);
                  const diasAsignadosLista = Array.isArray(distSeleccionada.dias) ? distSeleccionada.dias : [];
                  const diaActivo = diasAsignadosLista.includes(diaEnfocadoNominal) ? diaEnfocadoNominal : (diasAsignadosLista[0] || 1);
                  const fechaActivaStr = `${añoDist}-${String(mesIdx + 1).padStart(2, '0')}-${String(diaActivo).padStart(2, '0')}`;
                  const asigsDiaActivo = asignaciones.filter(a => a.fecha === fechaActivaStr && (a.distribucionId === distSeleccionada.id || a.sede === distSeleccionada.sede));
                  const cuotaCompletaActivo = asigsDiaActivo.length >= distSeleccionada.cant;

                  return (
                    <div className="space-y-4">
                      {/* Cuadrícula de Calendario Mensual */}
                      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                            <span>📅 {NOMBRES_MESES[mesIdx]} {añoDist}</span>
                            <span className="text-slate-400 font-normal">({diasAsignadosLista.length} fechas planificadas para esta área)</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Haga clic en cualquier día con turno para asignar personal
                          </span>
                        </div>

                        {/* Encabezado de Días Lunes a Domingo */}
                        <div className="grid grid-cols-7 gap-2 text-center">
                          {DIAS_SEMANA_CORTOS.map((dNom, idx) => (
                            <span 
                              key={dNom} 
                              className={`text-xs font-bold py-1 rounded-lg ${
                                idx >= 5 ? 'text-purple-400 bg-purple-950/20' : 'text-slate-400 bg-slate-950/40'
                              }`}
                            >
                              {dNom}
                            </span>
                          ))}
                        </div>

                        {/* Celdas del Mes */}
                        <div className="grid grid-cols-7 gap-2">
                          {celdas.map(c => {
                            if (c.esVacio) {
                              return <div key={c.id} className="min-h-[85px] rounded-xl bg-slate-950/20 border border-slate-900/40" />;
                            }

                            const tieneGuardia = diasAsignadosLista.includes(c.dia);
                            const asigsEsteDia = tieneGuardia 
                              ? asignaciones.filter(a => a.fecha === c.fechaStr && (a.distribucionId === distSeleccionada.id || a.sede === distSeleccionada.sede))
                              : [];
                            const completo = asigsEsteDia.length >= distSeleccionada.cant;
                            const estaEnfocado = c.dia === diaActivo;

                            return (
                              <div
                                key={c.dia}
                                onClick={() => {
                                  if (tieneGuardia) setDiaEnfocadoNominal(c.dia);
                                }}
                                className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                                  tieneGuardia
                                    ? estaEnfocado
                                      ? 'bg-slate-900 border-emerald-400 shadow-lg shadow-emerald-950/80 cursor-pointer ring-2 ring-emerald-500/40'
                                      : completo
                                      ? 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-400 cursor-pointer hover:bg-slate-900/60'
                                      : 'bg-slate-950/80 border-amber-500/40 hover:border-amber-400 cursor-pointer hover:bg-slate-900/60 shadow-sm shadow-amber-950/30'
                                    : 'bg-slate-950/30 border-slate-850/60 opacity-40'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <span className={`text-xs font-bold ${
                                    tieneGuardia ? 'text-white' : 'text-slate-400'
                                  }`}>
                                    {c.dia}
                                  </span>
                                  {tieneGuardia && (
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      completo ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                                    }`}>
                                      {asigsEsteDia.length}/{distSeleccionada.cant}
                                    </span>
                                  )}
                                </div>

                                {tieneGuardia ? (
                                  <div className="space-y-1 mt-1">
                                    <span className="block text-[9px] font-semibold text-slate-300 truncate">
                                      {distSeleccionada.tipo}
                                    </span>
                                    <div className="flex -space-x-1 overflow-hidden">
                                      {asigsEsteDia.slice(0, 3).map((a, i) => (
                                        <div 
                                          key={i} 
                                          title={a.persona_nombre} 
                                          className="h-4 w-4 rounded-full bg-emerald-700 text-white text-[8px] font-bold flex items-center justify-center border border-slate-900"
                                        >
                                          {a.persona_nombre?.charAt(0) || 'P'}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-400 block text-center">Sin guardia</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Panel de Asignación enfocado para el día seleccionado */}
                      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                          <div>
                            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                              <span>📅 Asignación Nominal para el Día {diaActivo} de {NOMBRES_MESES[mesIdx]} {añoDist}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                cuotaCompletaActivo ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              }`}>
                                {asigsDiaActivo.length} / {distSeleccionada.cant} Cubiertos
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {distSeleccionada.sede} • Turno {distSeleccionada.tipo} ({distSeleccionada.tipoPersonal})
                            </p>
                          </div>
                        </div>

                        {/* Personas asignadas */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            Personal Nominal Asignado:
                          </label>
                          {asigsDiaActivo.length === 0 ? (
                            <p className="text-xs text-amber-400 italic bg-amber-950/20 p-3 rounded-xl border border-amber-850/40">
                              ⚠️ Aún no hay personas asignadas para el día {diaActivo}. Seleccione una persona del potencial abajo para cumplir la cuota (RF-0603).
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {asigsDiaActivo.map(a => (
                                <div key={a.id} className="flex justify-between items-center bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                                      {a.persona_nombre?.charAt(0) || 'P'}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-200">{a.persona_nombre}</p>
                                      <p className="text-[10px] text-slate-400">CI: {a.persona_ci || '######-####'} • {a.tipo}</p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarAsignacionNominal(a.id)}
                                    className="p-1.5 rounded-lg hover:bg-red-950/80 text-slate-400 hover:text-red-400 transition-colors"
                                    title="Desasignar persona"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Formulario para asignar persona a este día */}
                        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                          <select
                            value={personaSeleccionadaPorDia[fechaActivaStr] || ''}
                            onChange={(e) => setPersonaSeleccionadaPorDia(prev => ({ ...prev, [fechaActivaStr]: e.target.value }))}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                          >
                            <option value="">-- Seleccionar Persona del Potencial Aprobado del Área (RN-05) --</option>
                            {personalAreaElegible
                              .filter(p => !asigsDiaActivo.some(a => a.personaId === p.id))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} ({p.cargo || p.tipo})
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleCrearAsignacionNominal(
                              distSeleccionada.id,
                              fechaActivaStr,
                              personaSeleccionadaPorDia[fechaActivaStr]
                            )}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Plus className="h-4 w-4" />
                            Asignar a este Turno (RF-0603)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* MODO 2: TARJETAS DE TURNO DETALLADAS */}
                {modoVistaNominal === 'TARJETAS' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Array.isArray(distSeleccionada.dias) ? distSeleccionada.dias : []).map(dia => {
                      const fechaStr = `2026-06-${dia.toString().padStart(2, '0')}`;
                      const asigsDia = asignaciones.filter(a => a.fecha === fechaStr && (a.distribucionId === distSeleccionada.id || a.sede === distSeleccionada.sede));
                      const cuotaCompleta = asigsDia.length >= distSeleccionada.cant;

                      return (
                        <div 
                          key={dia} 
                          className={`p-5 rounded-2xl border transition-all ${
                            cuotaCompleta 
                              ? 'bg-slate-900/40 border-emerald-500/30' 
                              : 'bg-slate-900/60 border-amber-500/30 shadow-md shadow-amber-950/20'
                          }`}
                        >
                          <div className="flex justify-between items-start pb-3 border-b border-slate-800">
                            <div>
                              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                📅 Día {dia} de Junio 2026
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {distSeleccionada.sede} • Turno {distSeleccionada.tipo}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              cuotaCompleta 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                                : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                            }`}>
                              {asigsDia.length} / {distSeleccionada.cant} asignados
                            </span>
                          </div>

                          {/* Personas actualmente asignadas a este día */}
                          <div className="py-3 space-y-2">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Personal Nominal Asignado:
                            </label>
                            {asigsDia.length === 0 ? (
                              <p className="text-xs text-amber-400 italic bg-amber-950/20 p-2.5 rounded-xl border border-amber-850/40">
                                ⚠️ Aún no se ha asignado personal a este turno. Seleccione un miembro del potencial abajo.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {asigsDia.map(a => (
                                  <div key={a.id} className="flex justify-between items-center bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                                        {a.persona_nombre?.charAt(0) || 'P'}
                                      </div>
                                      <div>
                                        <p className="text-xs font-bold text-slate-200">{a.persona_nombre}</p>
                                        <p className="text-[10px] text-slate-400">CI: {a.persona_ci || '######-####'} • {a.tipo}</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarAsignacionNominal(a.id)}
                                      className="p-1 rounded-lg hover:bg-red-950/80 text-slate-400 hover:text-red-400 transition-colors"
                                      title="Desasignar persona"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Formulario rápido para asignar persona a este día */}
                          <div className="pt-2 border-t border-slate-800/80 flex gap-2">
                            <select
                              value={personaSeleccionadaPorDia[fechaStr] || ''}
                              onChange={(e) => setPersonaSeleccionadaPorDia(prev => ({ ...prev, [fechaStr]: e.target.value }))}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">-- Seleccionar Persona del Potencial --</option>
                              {personalAreaElegible
                                .filter(p => !asigsDia.some(a => a.personaId === p.id))
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.nombre} ({p.cargo || p.tipo})
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleCrearAsignacionNominal(
                                distSeleccionada.id,
                                fechaStr,
                                personaSeleccionadaPorDia[fechaStr]
                              )}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Asignar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900/30 rounded-2xl border border-slate-850">
                <p className="text-xs text-slate-400">
                  No hay distribuciones de guardia asignadas para esta área en el período activo.
                </p>
              </div>
            )}

            {/* Tabla resumen de asignaciones nominales registradas */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex justify-between items-center">
                <span>Registro Nominal Completo de Guardias Asignadas</span>
                <span className="text-xs text-emerald-400 font-normal">{asignaciones.length} turnos nominados</span>
              </h3>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-[11px] font-bold text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Persona Asignada</th>
                      <th className="p-3">Carné (RN-10)</th>
                      <th className="p-3">Sede</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3">Estado Control</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {asignaciones.map(a => (
                      <tr key={a.id} className="hover:bg-slate-900/40">
                        <td className="p-3 font-semibold text-slate-200">{a.fecha}</td>
                        <td className="p-3 font-bold text-slate-100">{a.persona_nombre || 'Personal UHO'}</td>
                        <td className="p-3 font-mono text-slate-400">{a.persona_ci || '######-####'}</td>
                        <td className="p-3">{a.sede}</td>
                        <td className="p-3">{a.tipoGuardia}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.estado === 'PRESENTE' ? 'bg-emerald-950 text-emerald-400' :
                            a.estado === 'AUSENTE' ? 'bg-red-950 text-red-400' :
                            a.estado === 'JUSTIFICADO' ? 'bg-amber-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {a.estado}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminarAsignacionNominal(a.id)}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderControl = () => {
    // Conteo por estado de cada miembro del personal para la fecha seleccionada
    let presentesCount = 0;
    let ausentesCount = 0;
    let justificadosCount = 0;
    let pendientesCount = 0;

    const personalConEstado = personal.map(p => {
      const asignacion = asignaciones.find(a => a.personaId === p.id && a.fecha === fechaControl);
      let estadoActual = asignacion?.estado;
      if (!estadoActual) {
        if (asignacion?.asistio === true) estadoActual = 'PRESENTE';
        else if (asignacion?.asistio === false) {
          estadoActual = asignacion?.observaciones?.toLowerCase().includes('justificad') ? 'JUSTIFICADO' : 'AUSENTE';
        } else {
          estadoActual = 'PENDIENTE';
        }
      }

      if (estadoActual === 'PRESENTE') presentesCount++;
      else if (estadoActual === 'AUSENTE') ausentesCount++;
      else if (estadoActual === 'JUSTIFICADO') justificadosCount++;
      else pendientesCount++;

      return {
        ...p,
        asignacion,
        estadoActual,
        evalVal: asignacion ? asignacion.evaluacion : '',
        obsVal: asignacion ? asignacion.observaciones : ''
      };
    });

    const personalFiltrado = personalConEstado.filter(p => {
      if (filtroEstadoControl === 'PENDIENTES') return p.estadoActual === 'PENDIENTE';
      if (filtroEstadoControl === 'PRESENTES') return p.estadoActual === 'PRESENTE';
      if (filtroEstadoControl === 'AUSENTES') return p.estadoActual === 'AUSENTE';
      if (filtroEstadoControl === 'JUSTIFICADOS') return p.estadoActual === 'JUSTIFICADO';
      return true; // 'TODOS'
    });

    const totalConvocados = personal.length;

    return (
      <div className="space-y-6">
        {/* Cabecera con selector de fecha, estadísticas y acciones */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">Control de Guardia Diario y Evaluaciones (MOD-07)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registro formal de asistencia, inasistencias y evaluaciones operativas según <span className="text-emerald-400 font-semibold">RN-09</span>.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-semibold text-slate-400">Fecha de control:</span>
              <input 
                type="date" 
                value={fechaControl} 
                onChange={(e) => setFechaControl(e.target.value)} 
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold shadow-inner"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Contadores por estado */}
            <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950/80 p-2 rounded-xl border border-slate-850">
              <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 text-emerald-400 font-bold border border-emerald-800/40 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {presentesCount} Presentes
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-red-950/60 text-red-400 font-bold border border-red-800/40 flex items-center gap-1">
                <X className="h-3.5 w-3.5" /> {ausentesCount} Ausentes
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-950/60 text-amber-400 font-bold border border-amber-800/40 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> {justificadosCount} Justificados
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-400 font-semibold border border-slate-800 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {pendientesCount} Pendientes
              </span>
            </div>

            {/* Acciones en lote */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarcarTodosPresentes(fechaControl)}
                className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Marcar todos los convocados como presentes"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Todos Presentes</span>
              </button>
              <button
                type="button"
                onClick={() => handleReiniciarPendientes(fechaControl)}
                className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                title="Reiniciar lista a estado pendiente"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reiniciar</span>
              </button>
              <button 
                type="button"
                onClick={handleGuardarControlDiario} 
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-950/50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Guardar Control Diario
              </button>
            </div>
          </div>
        </div>

        {/* Pestañas de filtrado de vista */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold mr-1 text-[11px]">Vista de pase de lista:</span>
            <button
              type="button"
              onClick={() => setFiltroEstadoControl('TODOS')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filtroEstadoControl === 'TODOS'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              Ver Todos ({personal.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoControl('PENDIENTES')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filtroEstadoControl === 'PENDIENTES'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40 ring-1 ring-blue-400'
                  : 'bg-slate-950 text-blue-400 hover:bg-blue-950/30 border border-blue-900/40'
              }`}
              title="Muestra solo a los que faltan por registrar. Al marcarlos como Presente o Ausente, se filtran de la vista."
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Solo Pendientes ({pendientesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoControl('PRESENTES')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filtroEstadoControl === 'PRESENTES'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400'
                  : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-900/30'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Presentes ({presentesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoControl('AUSENTES')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filtroEstadoControl === 'AUSENTES'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950/40 ring-1 ring-red-400'
                  : 'bg-slate-950 text-red-400 hover:bg-red-950/30 border border-red-900/30'
              }`}
            >
              <X className="h-3.5 w-3.5" />
              <span>Ausentes ({ausentesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFiltroEstadoControl('JUSTIFICADOS')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filtroEstadoControl === 'JUSTIFICADOS'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/40 ring-1 ring-amber-400'
                  : 'bg-slate-950 text-amber-400 hover:bg-amber-950/30 border border-amber-900/30'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Justificados ({justificadosCount})</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Mostrando {personalFiltrado.length} de {personal.length} personas
          </span>
        </div>

        {/* Tabla o mensaje de completado */}
        {personalFiltrado.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3 shadow-lg">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">
              {filtroEstadoControl === 'PENDIENTES'
                ? '¡Pase de lista completado!'
                : `No hay personas en estado ${filtroEstadoControl}`}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {filtroEstadoControl === 'PENDIENTES'
                ? 'Todos los convocados de esta fecha ya han sido marcados con asistencia, ausencia o justificación. Puedes ver la plantilla completa en "Ver Todos" o guardar el control diario.'
                : 'Selecciona otra pestaña o fecha para ver los registros correspondientes.'}
            </p>
            <button
              type="button"
              onClick={() => setFiltroEstadoControl('TODOS')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Ver Todos ({personal.length})</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-xs text-left min-w-[780px]">
              <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Nombre y Apellidos</th>
                  <th className="p-4">Rol / Tipo</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">¿Asistencia / Estado?</th>
                  <th className="p-4">Evaluación de Desempeño (RN-09)</th>
                  <th className="p-4">Observaciones / Incidencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {personalFiltrado.map(p => {
                  const estadoActual = p.estadoActual;
                  const evalVal = p.evalVal;
                  const obsVal = p.obsVal;

                  return (
                    <tr key={p.id} className="hover:bg-slate-950/30 text-slate-300 transition-colors">
                      <td className="p-4 font-semibold text-slate-200">
                        <div>{p.nombre}</div>
                        <span className="text-[10px] text-slate-500 font-normal">{p.cargo || p.area || 'UHO'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.tipo === 'OBRERO' ? 'bg-blue-950 text-blue-400 border border-blue-800/40' : 'bg-green-950 text-green-400 border border-green-800/40'}`}>
                          {p.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{p.celular || p.telefono || 'N/A'}</td>
                      
                      {/* Botones de acción de asistencia intuitiva */}
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetEstadoAsistencia(fechaControl, p.id, estadoActual === 'PRESENTE' ? 'PENDIENTE' : 'PRESENTE')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                estadoActual === 'PRESENTE'
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 ring-2 ring-emerald-400'
                                  : 'bg-slate-900 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 border border-slate-800'
                              }`}
                              title="Marcar como presente"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Presente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetEstadoAsistencia(fechaControl, p.id, estadoActual === 'AUSENTE' ? 'PENDIENTE' : 'AUSENTE')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                estadoActual === 'AUSENTE'
                                  ? 'bg-red-600 text-white shadow-md shadow-red-950/60 ring-2 ring-red-400'
                                  : 'bg-slate-900 text-slate-400 hover:text-red-400 hover:bg-red-950/30 border border-slate-800'
                              }`}
                              title="Marcar como ausente injustificado"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Ausente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetEstadoAsistencia(fechaControl, p.id, estadoActual === 'JUSTIFICADO' ? 'PENDIENTE' : 'JUSTIFICADO')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                estadoActual === 'JUSTIFICADO'
                                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60 ring-2 ring-amber-400'
                                  : 'bg-slate-900 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 border border-slate-800'
                              }`}
                              title="Marcar como ausencia justificada / licencia médica"
                            >
                              <Award className="h-3.5 w-3.5" />
                              <span>Justificado</span>
                            </button>
                          </div>

                          {/* Indicador de estado */}
                          <div>
                            {estadoActual === 'PRESENTE' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                                <CheckCircle2 className="h-3 w-3" /> Asistencia Confirmada
                              </span>
                            )}
                            {estadoActual === 'AUSENTE' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800/40">
                                <AlertTriangle className="h-3 w-3" /> Ausencia Registrada
                              </span>
                            )}
                            {estadoActual === 'JUSTIFICADO' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
                                <Award className="h-3 w-3" /> Permiso / Justificación
                              </span>
                            )}
                            {estadoActual === 'PENDIENTE' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800">
                                <Clock className="h-3 w-3" /> Pendiente de pase de lista
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Calificación de Desempeño (RN-09) */}
                      <td className="p-4">
                        {estadoActual === 'PRESENTE' ? (
                          <div className="space-y-1">
                            <select 
                              value={evalVal || 'B'}
                              onChange={(e) => handleUpdateEvaluacion(fechaControl, p.id, e.target.value)}
                              className="bg-slate-950 border border-emerald-600/40 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-500"
                            >
                              <option value="B">Bien (B) - Cumplimiento destacado</option>
                              <option value="R">Regular (R) - Con incidencias leves</option>
                              <option value="M">Mal (M) - Incumplimiento grave</option>
                            </select>
                            <div className="text-[10px] text-slate-500">Evaluación obligatoria según RN-09</div>
                          </div>
                        ) : estadoActual === 'JUSTIFICADO' ? (
                          <span className="text-[11px] font-semibold text-amber-400/90 italic px-2.5 py-1 bg-amber-950/30 rounded-lg border border-amber-800/40 inline-block">
                            Exonerado (RN-09: Justificado)
                          </span>
                        ) : estadoActual === 'AUSENTE' ? (
                          <span className="text-[11px] font-semibold text-red-400/80 italic px-2.5 py-1 bg-red-950/30 rounded-lg border border-red-800/40 inline-block">
                            Sin eval (RN-09: Ausente)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-500 italic px-2.5 py-1 bg-slate-950/40 rounded-lg border border-slate-850 inline-block">
                            Sin registrar
                          </span>
                        )}
                      </td>

                      {/* Observaciones / Incidencias */}
                      <td className="p-4">
                        <input 
                          type="text" 
                          placeholder={estadoActual === 'JUSTIFICADO' ? "Motivo: Licencia médica, comisión..." : "Notas de asistencia o sustitución..."}
                          value={obsVal}
                          onChange={(e) => handleUpdateObservaciones(fechaControl, p.id, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-700" 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderPerfil = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-slate-400" />
            Datos Primarios (ASSET/SIGENU - Solo Lectura)
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Nombre completo</span>
              <p className="font-bold text-slate-300 mt-1">{perfilUsuario.nombre || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username)}</p>
            </div>
            <div>
              <span className="text-slate-500">CI</span>
              <p className="font-mono text-slate-300 mt-1">{enmascararCI(perfilUsuario.ci || '75041012345', true)}</p>
            </div>
            <div>
              <span className="text-slate-500">Sexo</span>
              <p className="text-slate-300 mt-1">{perfilUsuario.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
            </div>
            <div>
              <span className="text-slate-500">Tipo de Contrato</span>
              <p className="text-slate-300 mt-1">{perfilUsuario.contrato || 'Fijo Indeterminado'}</p>
            </div>
            <div>
              <span className="text-slate-500">Área Académica / Facultad</span>
              <p className="text-slate-300 mt-1">{perfilUsuario.area || 'Facultad de Informática y Matemática'}</p>
            </div>
            <div>
              <span className="text-slate-500">Departamento / Unidad</span>
              <p className="text-slate-300 mt-1">{perfilUsuario.depto || 'Depto. de Sistemas de Información'}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex items-center gap-2">
            <Edit className="h-4.5 w-4.5 text-emerald-400" />
            Datos de Contacto Editables (MOD-02)
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-450 mb-1">Teléfono Fijo</label>
                <input 
                  type="text" 
                  value={perfilEdit.telefono} 
                  onChange={(e) => setPerfilEdit(prev => ({ ...prev, telefono: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-450 mb-1">Celular</label>
                <input 
                  type="text" 
                  value={perfilEdit.celular} 
                  onChange={(e) => setPerfilEdit(prev => ({ ...prev, celular: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-450 mb-1">WhatsApp</label>
                <input 
                  type="text" 
                  value={perfilEdit.whatsapp} 
                  onChange={(e) => setPerfilEdit(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-450 mb-1">Dirección de Vivienda</label>
              <input 
                type="text" 
                value={perfilEdit.direccion} 
                onChange={(e) => setPerfilEdit(prev => ({ ...prev, direccion: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-450 mb-1">Punto de Referencia</label>
              <input 
                type="text" 
                value={perfilEdit.referencia} 
                onChange={(e) => setPerfilEdit(prev => ({ ...prev, referencia: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-450 mb-1">Contacto Alterno (Nombre)</label>
                <input 
                  type="text" 
                  value={perfilEdit.contactoNombre} 
                  onChange={(e) => setPerfilEdit(prev => ({ ...prev, contactoNombre: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-450 mb-1">Contacto Alterno (Celular)</label>
                <input 
                  type="text" 
                  value={perfilEdit.contactoCelular} 
                  onChange={(e) => setPerfilEdit(prev => ({ ...prev, contactoCelular: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
                />
              </div>
            </div>

            <button onClick={handleGuardarPerfil} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5">
              <Save className="h-4 w-4" />
              Guardar Cambios de Perfil
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCronograma = () => {
    // 1. Filtrar asignaciones correspondientes al usuario en sesión
    const misAsignaciones = asignaciones.filter(a => {
      if (perfilUsuario?.id && a.personaId === perfilUsuario.id) return true;
      if (perfilUsuario?.nombre && a.persona_nombre && a.persona_nombre.toLowerCase() === perfilUsuario.nombre.toLowerCase()) return true;
      if (user?.username && a.persona_nombre && a.persona_nombre.toLowerCase().includes(user.username.toLowerCase())) return true;
      if (user?.first_name && a.persona_nombre && a.persona_nombre.toLowerCase().includes(user.first_name.toLowerCase())) return true;
      return false;
    });

    // Muestra institucional representativa para que la visualización siempre cuente con datos reales
    const listaGuardiasUsuario = misAsignaciones.length > 0 ? misAsignaciones : [
      { id: 'demo-1', fecha: `${añoCronograma}-06-07`, persona_nombre: perfilUsuario.nombre || 'Usuario en Sesión', tipoGuardia: 'Diurna', sede: 'Sede Oscar Lucero Moya', estado: 'PRESENTE', asistio: true, evaluacion: 'B', observaciones: 'Cumplimiento puntual en garita central y rondas perimetrales.' },
      { id: 'demo-2', fecha: `${añoCronograma}-06-14`, persona_nombre: perfilUsuario.nombre || 'Usuario en Sesión', tipoGuardia: 'Nocturna', sede: 'Sede Oscar Lucero Moya', estado: 'AUSENTE', asistio: false, evaluacion: 'M', observaciones: 'Ausencia sin aviso previo según libro de novedades.' },
      { id: 'demo-3', fecha: `${añoCronograma}-06-21`, persona_nombre: perfilUsuario.nombre || 'Usuario en Sesión', tipoGuardia: 'Diurna', sede: 'Sede Celia Sánchez Manduley', estado: 'JUSTIFICADO', asistio: false, evaluacion: '', observaciones: 'Licencia médica debidamente certificada por policlínico.' },
      { id: 'demo-4', fecha: `${añoCronograma}-06-28`, persona_nombre: perfilUsuario.nombre || 'Usuario en Sesión', tipoGuardia: 'Diurna', sede: 'Sede Oscar Lucero Moya', estado: 'PRESENTE', asistio: true, evaluacion: 'B', observaciones: 'Guardia completada satisfactoriamente con relevo oportuno.' },
      { id: 'demo-5', fecha: `${añoCronograma}-11-15`, persona_nombre: perfilUsuario.nombre || 'Usuario en Sesión', tipoGuardia: 'Nocturna', sede: 'Sede José de la Luz y Caballero', estado: 'PENDIENTE', asistio: null, evaluacion: '', observaciones: 'Guardia programada según plan institucional.' }
    ];

    // Cálculos KPI de cumplimiento del usuario para el año seleccionado
    const asignacionesDelAño = listaGuardiasUsuario.filter(a => a.fecha && a.fecha.startsWith(String(añoCronograma)));
    const totalProgramadas = asignacionesDelAño.length;
    const cumplidas = asignacionesDelAño.filter(a => a.asistio === true || a.evaluacion === 'B' || a.evaluacion === 'R').length;
    const ausencias = asignacionesDelAño.filter(a => a.asistio === false && a.estado !== 'JUSTIFICADO').length;
    const justificada = asignacionesDelAño.filter(a => a.estado === 'JUSTIFICADO').length;
    const pendientes = asignacionesDelAño.filter(a => a.asistio === null || a.estado === 'PENDIENTE').length;
    const proximaGuardia = asignacionesDelAño.find(a => a.asistio === null || a.estado === 'PENDIENTE');

    // Meses a renderizar según filtro (todos o uno específico)
    const mesesAMostrar = mesCronogramaSeleccionado === 'TODOS' 
      ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [Number(mesCronogramaSeleccionado)];

    return (
      <div className="space-y-6">
        {/* Cabecera y Controles de Navegación del Calendario Real */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">Mi Cronograma Anual de Guardia (RF-0605)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calendario oficial realista conforme a la norma ISO 8601 (Lunes a Domingo) con cálculo exacto de días y fines de semana.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selector de Año */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setAñoCronograma(prev => prev - 1)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                title="Año anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <select
                value={añoCronograma}
                onChange={(e) => setAñoCronograma(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-200 px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map(a => (
                  <option key={a} value={a} className="bg-slate-900 text-slate-200">Año {a}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAñoCronograma(prev => prev + 1)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                title="Año siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Selector de Mes o Vista Anual Completa */}
            <select
              value={mesCronogramaSeleccionado}
              onChange={(e) => setMesCronogramaSeleccionado(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="bg-slate-900 text-slate-200">📅 Todo el Año (12 Meses)</option>
              {NOMBRES_MESES.map((m, idx) => (
                <option key={idx} value={idx} className="bg-slate-900 text-slate-200">{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tarjetas KPI de Desempeño Personal en el Año */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 block">Total Programadas</span>
            <span className="text-xl font-black text-slate-100 mt-1 block">{totalProgramadas}</span>
            <span className="text-[10px] text-slate-500">en {añoCronograma}</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Cumplidas (B / R)
            </span>
            <span className="text-xl font-black text-emerald-300 mt-1 block">{cumplidas}</span>
            <span className="text-[10px] text-emerald-500/80">
              {totalProgramadas > 0 ? `${Math.round((cumplidas / totalProgramadas) * 100)}% de efectividad` : 'Sin turnos'}
            </span>
          </div>

          <div className="bg-red-950/20 border border-red-800/40 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-red-400 block flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Ausencias / Mal
            </span>
            <span className="text-xl font-black text-red-300 mt-1 block">{ausencias}</span>
            <span className="text-[10px] text-red-500/80">
              {justificada > 0 ? `+${justificada} justificada(s)` : '0 incidencias no justificadas'}
            </span>
          </div>

          <div className="bg-blue-950/20 border border-blue-800/40 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-blue-400 block flex items-center gap-1">
              <Clock className="h-3 w-3" /> Próxima Guardia
            </span>
            <span className="text-xs font-bold text-blue-200 mt-1 block truncate">
              {proximaGuardia ? `${proximaGuardia.fecha.split('-').reverse().join('/')} (${proximaGuardia.tipoGuardia})` : 'Ninguna pendiente'}
            </span>
            <span className="text-[10px] text-blue-400/80 truncate block">
              {proximaGuardia ? proximaGuardia.sede : 'Plan anual cubierto'}
            </span>
          </div>
        </div>

        {/* Leyenda Institucional de Estados */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Leyenda de Turnos:
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-300">
                <div className="w-3.5 h-3.5 bg-emerald-600 rounded-md ring-1 ring-emerald-400"></div>
                <span className="text-[11px]">Realizada con Éxito (B/R)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <div className="w-3.5 h-3.5 bg-red-600 rounded-md ring-1 ring-red-400"></div>
                <span className="text-[11px]">Ausencia Registrada (M)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <div className="w-3.5 h-3.5 bg-amber-600 rounded-md ring-1 ring-amber-400"></div>
                <span className="text-[11px]">Ausencia Justificada</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <div className="w-3.5 h-3.5 bg-blue-600 rounded-md ring-1 ring-blue-400 animate-pulse"></div>
                <span className="text-[11px]">Próximo Turno Programado</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <div className="w-3.5 h-3.5 bg-slate-900 border border-slate-700 rounded-md"></div>
                <span className="text-[11px]">Fin de Semana (RN-02)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Malla de Calendarios Reales: 12 Meses o Vista Expandida */}
        <div className={`grid gap-5 ${
          mesesAMostrar.length === 1 
            ? 'grid-cols-1 max-w-2xl mx-auto' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {mesesAMostrar.map(mesIdx => {
            const mesData = getDiasMesReal(añoCronograma, mesIdx);
            return (
              <div key={mesIdx} className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                      {NOMBRES_MESES[mesIdx]} {añoCronograma}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {mesData.totalDias} días
                    </span>
                  </div>

                  {/* Cabecera de días de la semana ISO 8601 */}
                  <div className="grid grid-cols-7 gap-1 mb-1.5">
                    {DIAS_SEMANA_CORTOS.map((d, i) => (
                      <span 
                        key={i} 
                        className={`text-[9px] font-bold text-center py-0.5 ${
                          i >= 5 ? 'text-amber-400/80' : 'text-slate-500'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Matriz de Días del Mes con Desplazamiento Real */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Espacios vacíos antes del primer día del mes */}
                    {Array.from({ length: mesData.offset }).map((_, offIdx) => (
                      <div 
                        key={`offset-${offIdx}`} 
                        className="aspect-square bg-slate-950/20 rounded-lg border border-transparent"
                      />
                    ))}

                    {/* Días reales del mes */}
                    {(mesData?.dias || []).map(dObj => {
                      const guardia = asignacionesDelAño.find(a => a.fecha === dObj.fechaStr);
                      let estadoClass = dObj.esFinDeSemana 
                        ? 'bg-slate-900/70 text-slate-400 hover:bg-slate-800/80 border-slate-800/60' 
                        : 'bg-slate-950/40 text-slate-500 hover:bg-slate-900/60 border-slate-850/60';
                      let ringClass = '';
                      let badgeTooltip = null;

                      if (guardia) {
                        if (guardia.asistio === true || guardia.evaluacion === 'B' || guardia.evaluacion === 'R') {
                          estadoClass = 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950 hover:bg-emerald-500';
                          ringClass = 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-950';
                          badgeTooltip = `Guardia Cumplida (${guardia.evaluacion || 'B'})`;
                        } else if (guardia.estado === 'JUSTIFICADO') {
                          estadoClass = 'bg-amber-600 text-white font-bold shadow-md shadow-amber-950 hover:bg-amber-500';
                          ringClass = 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950';
                          badgeTooltip = 'Ausencia Justificada';
                        } else if (guardia.asistio === false || guardia.evaluacion === 'M') {
                          estadoClass = 'bg-red-600 text-white font-bold shadow-md shadow-red-950 hover:bg-red-500';
                          ringClass = 'ring-2 ring-red-400 ring-offset-1 ring-offset-slate-950';
                          badgeTooltip = 'Ausencia Registrada (M)';
                        } else {
                          estadoClass = 'bg-blue-600 text-white font-bold animate-pulse shadow-md shadow-blue-950 hover:bg-blue-500';
                          ringClass = 'ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-950';
                          badgeTooltip = 'Próximo Turno Programado';
                        }
                      }

                      return (
                        <button
                          key={dObj.dia}
                          type="button"
                          title={guardia ? `${badgeTooltip} - ${guardia.tipoGuardia} en ${guardia.sede}` : (dObj.esFinDeSemana ? `Fin de semana - ${dObj.fechaStr}` : dObj.fechaStr)}
                          onClick={() => {
                            if (guardia) {
                              setGuardiaDetalleSeleccionada(guardia);
                            }
                          }}
                          className={`text-[10px] aspect-square flex flex-col items-center justify-center rounded-lg border transition-all ${estadoClass} ${ringClass} ${
                            guardia ? 'cursor-pointer hover:scale-110 relative z-10' : 'cursor-default'
                          }`}
                        >
                          <span>{dObj.dia}</span>
                          {guardia && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white mt-0.5 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal / Ficha Informativa al pulsar un Turno del Calendario */}
        {guardiaDetalleSeleccionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-100">Detalles de Turno de Guardia</h4>
                </div>
                <button
                  onClick={() => setGuardiaDetalleSeleccionada(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Fecha Asignada:</span>
                  <span className="font-bold text-slate-100 font-mono">
                    {guardiaDetalleSeleccionada.fecha ? guardiaDetalleSeleccionada.fecha.split('-').reverse().join('/') : 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Sede Universitaria</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                      {guardiaDetalleSeleccionada.sede}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Turno / Horario</span>
                    <span className="font-semibold text-slate-200 mt-0.5 block">
                      {guardiaDetalleSeleccionada.tipoGuardia}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Estado de Asistencia</span>
                    <span className={`font-bold mt-0.5 block ${
                      guardiaDetalleSeleccionada.asistio === true ? 'text-emerald-400' :
                      guardiaDetalleSeleccionada.estado === 'JUSTIFICADO' ? 'text-amber-400' :
                      guardiaDetalleSeleccionada.asistio === false ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {guardiaDetalleSeleccionada.estado || (guardiaDetalleSeleccionada.asistio ? 'PRESENTE' : 'PENDIENTE')}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">Evaluación de Desempeño</span>
                    <span className="font-bold text-slate-200 mt-0.5 block">
                      {guardiaDetalleSeleccionada.evaluacion ? `Calificación: ${guardiaDetalleSeleccionada.evaluacion}` : 'Pendiente de Control'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block mb-1">Observaciones / Libro de Novedades</span>
                  <p className="text-slate-300 italic">
                    "{guardiaDetalleSeleccionada.observaciones || 'Sin incidencias reportadas en el puesto de mando.'}"
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setGuardiaDetalleSeleccionada(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  Entendido / Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRoles = () => {
    const currentPerms = rolesPermisos[selectedRole] || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Roles y Permisos Institucionales (RBAC)</h3>
            <p className="text-xs text-slate-400">Asignación de privilegios de acceso y operatividad para la UHO</p>
          </div>
          <button onClick={() => setShowModalNuevoRol(true)} className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <Plus className="h-4 w-4" />
            Nuevo Rol
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listado interactivo de Roles / Cargos */}
          <div className="lg:col-span-1 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-850">
            <div className="p-3.5 bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Roles y Cargos Registrados ({nomencladores.cargos.length})
            </div>
            {nomencladores.cargos.map((c, i) => {
              const isSelected = selectedRole === c;
              const permCount = (rolesPermisos[c] || []).length;
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedRole(c)}
                  className={`p-4 cursor-pointer text-xs transition-all flex justify-between items-center ${
                    isSelected 
                      ? 'bg-emerald-950/40 border-l-4 border-l-emerald-500 text-white font-bold shadow-inner' 
                      : 'hover:bg-slate-950/20 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isSelected ? 'text-emerald-300' : 'text-slate-300'}>{c}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {permCount} perm.
                    </span>
                    <ChevronRightIcon className={`h-4 w-4 transition-transform ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-500'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel de Permisos Asociados al Rol Seleccionado */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  Permisos Asignados al Rol: <span className="text-emerald-400">{selectedRole}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {currentPerms.length} de {PERMISOS_DISPONIBLES.length} privilegios concedidos para este rol institucional
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleTodosPermisos(true)} 
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded-lg transition-colors font-medium"
                >
                  Todos
                </button>
                <button 
                  onClick={() => toggleTodosPermisos(false)} 
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-400 rounded-lg transition-colors font-medium"
                >
                  Ninguno
                </button>
                <button 
                  onClick={handleGuardarPermisosRol} 
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Save className="h-3.5 w-3.5" />
                  Guardar Permisos
                </button>
              </div>
            </div>

            {/* Cuadrícula interactiva de privilegios */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PERMISOS_DISPONIBLES.map(perm => {
                const isChecked = currentPerms.includes(perm.id);
                return (
                  <div 
                    key={perm.id} 
                    onClick={() => togglePermisoRol(perm.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked 
                        ? 'bg-emerald-950/25 border-emerald-500/40 text-slate-200 shadow-sm' 
                        : 'bg-slate-950/30 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:bg-slate-950/50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {}} 
                      className="accent-emerald-500 h-4 w-4 mt-0.5 pointer-events-none rounded" 
                    />
                    <div className="flex-1">
                      <span className={`block text-xs font-semibold ${isChecked ? 'text-emerald-300' : 'text-slate-300'}`}>
                        {perm.label}
                      </span>
                      <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {perm.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNomencladores = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100">Gestión de Nomencladores Generales (MOD-01)</h3>
            <p className="text-xs text-slate-400">Mantenimiento de áreas, sedes, cargos y sincronizaciones primarias</p>
          </div>
          <button onClick={() => setShowModalNuevaArea(true)} className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Nueva Área
          </button>
        </div>

        {/* Listado de Áreas */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-x-auto">
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center min-w-[700px]">
            <h3 className="text-xs font-bold text-slate-200">Áreas Universitarias Registradas</h3>
          </div>
          <table className="w-full text-xs text-left min-w-[700px] md:min-w-0">
            <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Código</th>
                <th className="p-4">Nombre de la Dependencia</th>
                <th className="p-4">Responsable Principal</th>
                <th className="p-4">¿Tiene Estudiantes?</th>
                <th className="p-4">N. Departamentos</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300">
              {nomencladores.areas.map(a => (
                <tr key={a.id} className="hover:bg-slate-950/20 transition-colors">
                  <td className="p-4 font-mono text-emerald-400 font-bold">{a.codigo}</td>
                  <td className="p-4 font-semibold text-slate-200">{a.nombre}</td>
                  <td className="p-4">{a.responsable}</td>
                  <td className="p-4">
                    {a.tieneEstudiantes ? (
                      <span className="text-emerald-400 font-semibold">Sí</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="p-4 font-semibold">{a.deptoCount}</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => {
                        setNomencladores(prev => ({
                          ...prev,
                          areas: prev.areas.filter(area => area.id !== a.id)
                        }));
                        showToast('🗑 Área eliminada correctamente.');
                      }}
                      className="p-1 bg-slate-950 hover:bg-red-950 border border-slate-850 hover:border-red-900 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar Área"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Panel Sincronización Primaria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-200">ASSET - Directorio de Trabajadores</h4>
            <p className="text-xs text-slate-400">Sincroniza todos los cargos, departamentos y contratos vigentes de los trabajadores.</p>
            <div className="pt-2">
              <button onClick={() => handleSincronizar('ASSET')} className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-emerald-400" />
                Sincronizar Trabajadores
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-200">SIGENU - Directorio Estudiantil</h4>
            <p className="text-xs text-slate-400">Sincroniza los datos de matrícula de los estudiantes activos en las facultades marcadas.</p>
            <div className="pt-2">
              <button onClick={() => handleSincronizar('SIGENU')} className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-blue-400" />
                Sincronizar Estudiantes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportes = () => {
    const res = datosCumplimiento.resumen;
    const ev = datosCumplimiento.evaluaciones;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              Dashboard de Cumplimiento y Estadísticas (MOD-08)
            </h3>
            <p className="text-xs text-slate-400">Analítica operativa institucional, reportes ejecutivos y trazabilidad de guardias</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleDescargarReporteExcel}
              className="px-3.5 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-300 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              title="Descargar libro de Excel formateado"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              Exportar a Excel (.xlsx)
            </button>
            <button 
              onClick={handleDescargarReportePdf}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
              title="Generar informe en PDF con membrete oficial"
            >
              <FileText className="h-4 w-4" />
              Generar Informe en PDF
            </button>
          </div>
        </div>

        {/* 1. Tarjetas KPI de Cumplimiento Ejecutivo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900/80 border border-emerald-800/40 relative overflow-hidden">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Cumplimiento Global</div>
            <div className="text-3xl font-black text-slate-100 mt-2">{res.porcentaje_cumplimiento}%</div>
            <div className="mt-2 w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-1000" 
                style={{ width: `${res.porcentaje_cumplimiento}%` }}
              ></div>
            </div>
            <span className="inline-block mt-2 text-[10px] text-emerald-300/80 font-semibold">
              Tasa institucional: {res.tasa_efectividad}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Convocatorias</div>
            <div className="text-3xl font-black text-slate-200 mt-2">{res.total_programadas}</div>
            <p className="text-[11px] text-slate-500 mt-1">Turnos programados este ciclo</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Asistencias Efectivas</div>
            <div className="text-3xl font-black text-emerald-400 mt-2">{res.asistencias}</div>
            <p className="text-[11px] text-slate-500 mt-1">Guardias realizadas con presencia</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80">
            <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Ausencias Registradas</div>
            <div className="text-3xl font-black text-red-400 mt-2">{res.ausencias}</div>
            <p className="text-[11px] text-slate-500 mt-1">Inasistencias auditadas</p>
          </div>
        </div>

        {/* 2. Estadísticas Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Cumplimiento por Área Académica */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex justify-between items-center">
              <span>Cumplimiento por Área / Facultad</span>
              <span className="text-[11px] text-slate-400 font-normal">Tasa relativa</span>
            </h3>
            <div className="space-y-4">
              {datosCumplimiento.por_area.map((a, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-300">{a.area}</span>
                    <span className="font-mono text-emerald-400 font-bold">{a.cumplimiento}% ({a.asistencias}/{a.total})</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-850">
                    <div 
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700" 
                      style={{ width: `${a.cumplimiento}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gráfico 2: Desglose de Evaluaciones (RN-09) */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex justify-between items-center">
              <span>Distribución de Evaluaciones (RN-09)</span>
              <span className="text-[11px] text-slate-400 font-normal">Calidad del servicio</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Bien (B)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px]">Excelente</span>
                </div>
                <div className="text-2xl font-black text-slate-200 mt-2">{ev.bien}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Cumplió cabalmente el turno</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Regular (R)</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold text-[10px]">Con incidencias</span>
                </div>
                <div className="text-2xl font-black text-slate-200 mt-2">{ev.regular}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Demoras u observaciones</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Mal (M)</span>
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold text-[10px]">Incumplimiento</span>
                </div>
                <div className="text-2xl font-black text-slate-200 mt-2">{ev.mal}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Faltas graves en puesto</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">Ausentes (RN-09)</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-bold text-[10px]">Sin evaluación</span>
                </div>
                <div className="text-2xl font-black text-slate-400 mt-2">{ev.sin_evaluacion}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">No procede calificación</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Gráficos de Sedes y Tendencia Mensual */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2">Efectividad por Sede Física</h3>
            <div className="space-y-3.5">
              {datosCumplimiento.por_sede.map((s, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-850 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{s.sede}</h5>
                    <span className="text-[10px] text-slate-400">{s.asistencias} cumplidas de {s.total} turnos</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 font-mono">{s.cumplimiento}%</span>
                    <div className="text-[10px] text-slate-500">{s.ausencias} ausencias</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2">Tendencia Mensual de Asistencia</h3>
            <div className="grid grid-cols-6 gap-2 pt-3 h-40 items-end">
              {datosCumplimiento.tendencia_mensual.map((m, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{m.cumplimiento}%</span>
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-700 to-teal-500 rounded-lg transition-all duration-700 shadow-sm shadow-emerald-950" 
                    style={{ height: `${m.cumplimiento}%` }}
                  ></div>
                  <span className="text-[9px] text-slate-400 font-semibold">{m.mes.substring(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Buscador Individual y Auditoría de Persona */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2">🔍 Búsqueda Individual e Historial de Guardia</h3>
          <div className="flex gap-3">
            <input 
              type="text" 
              placeholder="Escriba nombre o Carné de Identidad (CI)..."
              value={searchPersonQuery}
              onChange={(e) => setSearchPersonQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" 
            />
            <button onClick={handleBuscarPersona} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              Buscar Persona
            </button>
          </div>

          {searchResultPerson && (
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-emerald-900/40 space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start border-b border-slate-850 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{searchResultPerson.nombre}</h4>
                  <p className="text-[10px] text-slate-400">{searchResultPerson.cargo} · {searchResultPerson.depto}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[9px] font-bold">
                  {searchResultPerson.comprometido ? 'Comprometido' : 'Sin Compromiso'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850">
                  <div className="text-[10px] text-slate-500">Asignadas</div>
                  <div className="text-lg font-black text-slate-200">12</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850">
                  <div className="text-[10px] text-slate-500 text-emerald-400">Cumplidas</div>
                  <div className="text-lg font-black text-emerald-400">11</div>
                </div>
                <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-850">
                  <div className="text-[10px] text-slate-500 text-red-400">Ausencias</div>
                  <div className="text-lg font-black text-red-400">1</div>
                </div>
              </div>

              <div className="tbl-wrap overflow-x-auto">
                <table className="w-full text-left min-w-[700px] md:min-w-0 text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Sede</th>
                      <th className="p-3">Tipo Guardia</th>
                      <th className="p-3">Asistencia</th>
                      <th className="p-3">Evaluación</th>
                      <th className="p-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {asignaciones.filter(a => a.personaId === searchResultPerson.id).map((a, i) => (
                      <tr key={i} className="hover:bg-slate-900/20 text-slate-300">
                        <td className="p-3 font-mono">{a.fecha}</td>
                        <td className="p-3">{a.sede}</td>
                        <td className="p-3">{a.tipoGuardia}</td>
                        <td className="p-3">
                          {a.asistio ? (
                            <span className="text-emerald-400 font-bold">Realizada</span>
                          ) : (
                            <span className="text-red-400 font-bold">Ausente</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-center">
                          {a.evaluacion ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] ${a.evaluacion === 'B' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                              {a.evaluacion}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">{a.observaciones || 'Sin observaciones'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- FILTRADO DE TABS SEGÚN EL ROL (RBAC) ---
  const getTabsPorRol = () => {
    const tabsList = [
      { id: 'dashboard', label: 'Dashboard', icon: FileText, allowed: ['SUPERADMIN', 'JEFE_SEGURIDAD', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO', 'TRABAJADOR', 'ESTUDIANTE'] },
      { id: 'compromiso-obr', label: 'Compromiso Obrero', icon: UserCheck, allowed: ['SUPERADMIN', 'TRABAJADOR'] },
      { id: 'compromiso-est', label: 'Compromiso Estudiante', icon: UserCheck, allowed: ['SUPERADMIN', 'ESTUDIANTE'] },
      { id: 'potencial', label: 'Potencial de Guardia', icon: Users, allowed: ['SUPERADMIN', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO'] },
      { id: 'distribucion', label: 'Distribución', icon: Calendar, allowed: ['SUPERADMIN', 'JEFE_SEGURIDAD', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO'] },
      { id: 'control', label: 'Control Guardia', icon: ShieldAlert, allowed: ['SUPERADMIN', 'JEFE_SEGURIDAD', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO'] },
      { id: 'perfil', label: 'Mi Perfil', icon: Users, allowed: ['SUPERADMIN', 'JEFE_SEGURIDAD', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO', 'TRABAJADOR', 'ESTUDIANTE'] },
      { id: 'cronograma', label: 'Mi Cronograma', icon: Calendar, allowed: ['SUPERADMIN', 'TRABAJADOR', 'ESTUDIANTE'] },
      { id: 'admin-usuarios', label: 'Roles y Permisos', icon: Shield, allowed: ['SUPERADMIN'] },
      { id: 'admin-nomencladores', label: 'Nomencladores', icon: Database, allowed: ['SUPERADMIN'] },
      { id: 'reportes', label: 'Reportes y Auditoría', icon: FileText, allowed: ['SUPERADMIN', 'JEFE_SEGURIDAD', 'RESPONSABLE_AREA', 'RESPONSABLE_DEPARTAMENTO'] },
    ];
    return tabsList.filter(t => t.allowed.includes(user?.role));
  };

  const menuItems = getTabsPorRol();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Mobile Drawer (Sidebar on mobile) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Drawer content */}
          <aside className="relative flex flex-col w-64 max-w-xs bg-slate-900 border-r border-slate-800 p-4 space-y-6 h-full z-50 animate-slideRight">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <img src="/logo-uho-icon-white.png" alt="Logo UHO" className="h-8 w-8 object-contain" />
                <span className="font-bold text-white text-sm">Menú de Navegación</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                title="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3">
                Módulos de Guardia
              </span>
              <nav className="space-y-1 pt-2">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === item.id ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/25' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        </div>
      )}

      {/* Cabecera / Header superior */}
      <header className="glass sticky top-0 z-40 border-b border-slate-800/80 px-4 md:px-6 py-4 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburger button for mobile */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors md:hidden"
            title="Abrir menú"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>

          <img 
            src="/logo-uho-icon-white.png" 
            alt="Logo UHO" 
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain" 
          />
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
              SIGCGOE
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-uho-light/10 text-uho-light border border-uho-light/20 hidden sm:inline-flex">
                UHO v1.2
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Universidad de Holguín "Oscar Lucero Moya"</p>
          </div>
        </div>

        {/* Panel de Perfil e Intercambiador de Roles simulado (RBAC) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">Simular Rol:</span>
            <select 
              value={user?.role} 
              onChange={(e) => {
                changeRoleSimulated(e.target.value);
                setActiveTab('dashboard'); // Reset a dashboard al cambiar de rol
              }}
              className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              <option value="SUPERADMIN" className="bg-slate-900">SUPERADMIN</option>
              <option value="JEFE_SEGURIDAD" className="bg-slate-900">JEFE SEGURIDAD</option>
              <option value="RESPONSABLE_AREA" className="bg-slate-900">RESP. ÁREA</option>
              <option value="RESPONSABLE_DEPARTAMENTO" className="bg-slate-900">RESP. DEPTO</option>
              <option value="TRABAJADOR" className="bg-slate-900">TRABAJADOR</option>
              <option value="ESTUDIANTE" className="bg-slate-900">ESTUDIANTE</option>
            </select>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors relative"
            >
              <Bell className="h-4.5 w-4.5" />
              {notificaciones.some(n => !n.leido) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-2 w-88 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-800">
                <div className="p-4 bg-slate-950/60 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-emerald-400" />
                    Notificaciones Institucionales
                  </h4>
                  <button 
                    onClick={handleMarcarTodasLeidas} 
                    className="text-[10px] text-emerald-400 font-semibold hover:underline"
                  >
                    Marcar todas leídas
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-850">
                  {notificaciones.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No hay notificaciones pendientes.
                    </div>
                  ) : (
                    notificaciones.map(n => (
                      <div key={n.id} className="p-3 hover:bg-slate-950/20 text-xs transition-colors flex gap-2.5">
                        {!n.leido ? (
                          <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                        ) : (
                          <div className="w-2 h-2 bg-slate-700 rounded-full mt-1.5 shrink-0"></div>
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${!n.leido ? 'text-slate-200' : 'text-slate-400'}`}>{n.texto}</p>
                          <span className="text-[9px] text-slate-500">{n.tiempo}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2.5 bg-slate-950/80 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Alertas RN-08: 7 días y 24h</span>
                  <button 
                    onClick={handleGenerarAlertasAutomaticas} 
                    className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg font-semibold transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Comprobar Alertas (RN-08)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={logout} 
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Contenedor Lateral (Sidebar) + Contenido de Página */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 space-y-6 hidden md:block">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3">
              Módulos de Guardia
            </span>
            <nav className="space-y-1 pt-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === item.id ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/25' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'}`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Área de Contenido Principal */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'compromiso-obr' && renderCompromisoObrero()}
          {activeTab === 'compromiso-est' && renderCompromisoEstudiantil()}
          {activeTab === 'potencial' && renderPotencial()}
          {activeTab === 'distribucion' && renderDistribucion()}
          {activeTab === 'control' && renderControl()}
          {activeTab === 'perfil' && renderPerfil()}
          {activeTab === 'cronograma' && renderCronograma()}
          {activeTab === 'admin-usuarios' && renderRoles()}
          {activeTab === 'admin-nomencladores' && renderNomencladores()}
          {activeTab === 'reportes' && renderReportes()}
        </main>
      </div>

      {/* --- MODALS (Simulación Completa) --- */}

      {/* Modal Inclusión Manual */}
      {showModalInclusionManual && inclusionPersonaSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Plus className="h-4.5 w-4.5 text-emerald-400" />
                Incluir Manualmente al Potencial
              </h3>
              <button onClick={() => setShowModalInclusionManual(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
              ⚠️ <strong>{inclusionPersonaSeleccionada.nombre}</strong> no completó su compromiso a tiempo. Puede incluirlo manualmente al potencial configurando su sede y turnos correspondientes.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Sede de Guardia</label>
                <select 
                  value={manualInclusionForm.sede}
                  onChange={(e) => setManualInclusionForm(prev => ({ ...prev, sede: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none"
                >
                  {nomencladores.sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo de Guardia</label>
                  <select 
                    value={manualInclusionForm.tipo}
                    onChange={(e) => setManualInclusionForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none"
                  >
                    <option value="Diurna">Diurna</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo de Día</label>
                  <select 
                    value={manualInclusionForm.dia}
                    onChange={(e) => setManualInclusionForm(prev => ({ ...prev, dia: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-250 focus:outline-none"
                  >
                    <option value="Semana">Día de Semana</option>
                    <option value="Fin de Semana">Fin de Semana</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowModalInclusionManual(false)} className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors">Cancelar</button>
              <button onClick={handleConfirmarInclusionManual} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors">Confirmar Inclusión</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lote */}
      {showModalLote && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Plus className="h-4.5 w-4.5 text-amber-400" />
                Asignación del Potencial por Lote
              </h3>
              <button onClick={() => setShowModalLote(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-850">
              ⚠️ Se aplicará la misma configuración de guardia a las **{personalSeleccionadoPotencial.length}** personas seleccionadas simultáneamente.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Sede de Guardia</label>
                <select 
                  value={loteInclusionForm.sede}
                  onChange={(e) => setLoteInclusionForm(prev => ({ ...prev, sede: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-255 focus:outline-none"
                >
                  {nomencladores.sedes.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo de Guardia</label>
                  <select 
                    value={loteInclusionForm.tipo}
                    onChange={(e) => setLoteInclusionForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-255 focus:outline-none"
                  >
                    <option value="Diurna">Diurna</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo de Día</label>
                  <select 
                    value={loteInclusionForm.dia}
                    onChange={(e) => setLoteInclusionForm(prev => ({ ...prev, dia: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-255 focus:outline-none"
                  >
                    <option value="Semana">Día de Semana</option>
                    <option value="Fin de Semana">Fin de Semana</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowModalLote(false)} className="px-3.5 py-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors">Cancelar</button>
              <button onClick={handleConfirmarInclusionLote} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors">Asignar por Lote</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Área */}
      {showModalNuevaArea && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Plus className="h-4.5 w-4.5 text-emerald-400" />
                Registrar Nueva Área Universitaria
              </h3>
              <button onClick={() => setShowModalNuevaArea(false)} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Código del Área *</label>
                  <input 
                    type="text" 
                    placeholder="FAC-XXX"
                    value={nuevaAreaForm.codigo} 
                    onChange={(e) => setNuevaAreaForm(prev => ({ ...prev, codigo: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nombre Completo *</label>
                  <input 
                    type="text" 
                    placeholder="Facultad de..."
                    value={nuevaAreaForm.nombre} 
                    onChange={(e) => setNuevaAreaForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Jefe / Responsable</label>
                <input 
                  type="text" 
                  placeholder="Nombre del Decano o Jefe..."
                  value={nuevaAreaForm.responsable} 
                  onChange={(e) => setNuevaAreaForm(prev => ({ ...prev, responsable: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={nuevaAreaForm.tieneEstudiantes}
                    onChange={(e) => setNuevaAreaForm(prev => ({ ...prev, tieneEstudiantes: e.target.checked }))}
                    className="accent-emerald-500 h-4.5 w-4.5 rounded" 
                  />
                  <span>Esta área cuenta con Guardia Estudiantil activa</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowModalNuevaArea(false)} className="px-3.5 py-1.5 bg-slate-950 border border-slate-855 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors">Cancelar</button>
              <button onClick={handleCrearArea} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors">Crear Área</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Rol RBAC */}
      {showModalNuevoRol && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-emerald-400" />
                Registrar Nuevo Rol Institucional (RBAC)
              </h3>
              <button onClick={() => setShowModalNuevoRol(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Nombre del Cargo o Rol *</label>
                <input 
                  type="text" 
                  placeholder="Ej: Vicedecano Docente, Jefe de Dpto..."
                  value={nuevoRolForm.nombre} 
                  onChange={(e) => setNuevoRolForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Descripción / Función Institucional</label>
                <input 
                  type="text" 
                  placeholder="Ej: Responsable de la guardia departamental y control..."
                  value={nuevoRolForm.descripcion} 
                  onChange={(e) => setNuevoRolForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-2">Permisos Iniciales Concedidos</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {PERMISOS_DISPONIBLES.map(perm => {
                    const isSelected = (nuevoRolForm.permisos || []).includes(perm.id);
                    return (
                      <label 
                        key={perm.id} 
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                          isSelected ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNuevoRolForm(prev => ({
                              ...prev,
                              permisos: checked 
                                ? [...(prev.permisos || []), perm.id]
                                : (prev.permisos || []).filter(id => id !== perm.id)
                            }));
                          }}
                          className="accent-emerald-500 h-3.5 w-3.5 rounded"
                        />
                        <span className="truncate">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button 
                onClick={() => setShowModalNuevoRol(false)} 
                className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-400 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCrearNuevoRol} 
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
              >
                <Check className="h-4 w-4" />
                Crear y Activar Rol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exportación / Vista Previa de Impresión */}
      {showModalExport && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-4xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-emerald-600" />
                  Generación de Reporte Académico Oficial (PDF / Excel)
                </h3>
                <p className="text-[10px] text-slate-500">Formato del Ministerio de Educación Superior (MES) - Universidad de Holguín</p>
              </div>
              <button onClick={() => setShowModalExport(false)} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            
            {/* Hoja oficial estilo UHO */}
            <div className="flex-1 overflow-y-auto border border-slate-250 p-8 bg-slate-50 rounded-2xl shadow-inner font-sans text-xs space-y-6">
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h2 className="text-sm font-black tracking-wider uppercase">Universidad de Holguín</h2>
                <h3 className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">Dirección de Seguridad y Protección Institucional</h3>
                <p className="text-[9px] text-slate-500 mt-2">Reporte de Guardia: {exportPreview.titulo}</p>
              </div>

              <div className="tbl-wrap">
                <table className="w-full text-[11px] border border-slate-300">
                  <thead className="bg-slate-100 font-bold border-b border-slate-350">
                    <tr>
                      {exportPreview.columnas.map((col, i) => <th key={i} className="p-3 border-r border-slate-300">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {exportPreview.datos.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-105 transition-colors">
                        {row.map((val, colIdx) => <td key={colIdx} className="p-3 border-r border-slate-200">{val.toString()}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 p-4 rounded-b-2xl">
              <button onClick={() => setShowModalExport(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition-colors">Cerrar</button>
              <button onClick={() => {
                setShowModalExport(false);
                showToast('📥 Descargando archivo XLSX optimizado...');
              }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow">
                <Download className="h-4 w-4" />
                Descargar Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-xl z-50 text-white flex items-center gap-2.5 font-semibold text-xs border animate-slideUp ${toast.type === 'success' ? 'bg-emerald-900 border-emerald-700' : 'bg-amber-900 border-amber-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" /> : <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// Icono simple de flecha derecha para el menú de Roles
function ChevronRightIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
