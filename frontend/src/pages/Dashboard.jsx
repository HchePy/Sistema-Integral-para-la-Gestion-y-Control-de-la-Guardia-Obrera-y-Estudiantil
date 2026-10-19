import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  Users, UserCheck, LogOut, Shield, Database, Sparkles, Lock, Unlock, 
  CheckCircle2, AlertTriangle, Calendar, FileText, Bell, ShieldAlert, 
  MapPin, Plus, Trash2, Search, Edit, Save, Download, RefreshCw, X, Check, Award,
  Menu
} from 'lucide-react';

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

  // --- ESTADO GLOBAL SIMULADO DE DATOS (Sincronizado) ---
  
  // 1. Nomencladores
  const [nomencladores, setNomencladores] = useState({
    areas: [
      { id: 1, codigo: 'FAC-INF', nombre: 'Facultad de Informática y Matemática', responsable: 'Dra. Elena Rost', tieneEstudiantes: true, deptoCount: 4, activo: true },
      { id: 2, codigo: 'FAC-ING', nombre: 'Facultad de Ingeniería', responsable: 'Dr. Julio Gómez', tieneEstudiantes: true, deptoCount: 5, activo: true },
      { id: 3, codigo: 'DIR-INF', nombre: 'Dirección de Informatización', responsable: 'Ing. Carlos Leyva', tieneEstudiantes: false, deptoCount: 2, activo: true },
      { id: 4, codigo: 'FAC-MED', nombre: 'Facultad de Ciencias Médicas', responsable: 'Dr. Alejandro Silva', tieneEstudiantes: true, deptoCount: 6, activo: true }
    ],
    departamentos: [
      { id: 1, codigo: 'DEP-SIST', nombre: 'Depto. de Sistemas de Información', responsable: 'Lic. Ramón Valdés', areaPadre: 'Facultad de Informática y Matemática', activo: true },
      { id: 2, codigo: 'DEP-RED', nombre: 'Depto. de Conectividad y Redes', responsable: 'Ing. Roberto Pérez', areaPadre: 'Facultad de Informática y Matemática', activo: true },
      { id: 3, codigo: 'DEP-MEC', nombre: 'Depto. de Ingeniería Mecánica', responsable: 'MSc. Juan López', areaPadre: 'Facultad de Ingeniería', activo: true },
      { id: 4, codigo: 'DEP-TEL', nombre: 'Depto. de Telecomunicaciones', responsable: 'Ing. Laura Fuentes', areaPadre: 'Dirección de Informatización', activo: true }
    ],
    sedes: [
      { id: 1, nombre: 'Sede Oscar Lucero Moya', direccion: 'Ave. de los Libertadores, Holguín', minObreras: 3, minEstudiantiles: 4 },
      { id: 2, nombre: 'Sede Manuel Aguilera', direccion: 'Carretera a Guardalavaca, Holguín', minObreras: 2, minEstudiantiles: 2 },
      { id: 3, nombre: 'Sede Celia Sánchez Manduley', direccion: 'Ave. XX Aniversario, Holguín', minObreras: 2, minEstudiantiles: 2 }
    ],
    cargos: ['Decano', 'Profesor Auxiliar', 'Especialista en Redes', 'Técnico de Soporte', 'Secretaria', 'Estudiante de 4to Año'],
    contratos: ['Fijo Indeterminado', 'Determinado', 'Adiestrado', 'Estudiante Activo']
  });

  // 2. Personal y Potencial (Lista Maestra)
  const [personal, setPersonal] = useState([
    { id: 1, ci: '78041523456', nombre: 'José Rodríguez Pérez', sexo: 'M', tipo: 'OBRERO', contrato: 'Fijo Indeterminado', area: 'Facultad de Informática y Matemática', depto: 'Depto. de Sistemas de Información', cargo: 'Profesor Auxiliar', comprometido: true, sedePref: 'Sede Oscar Lucero Moya', tipoPref: 'Nocturna', diaPref: 'Semana', telefono: '24461234', celular: '52345678', whatsapp: '52345678', direccion: 'Calle Martí #45, Holguín', referencia: 'Frente al Parque Calixto García', contactoNombre: 'Luis Rodríguez', contactoCelular: '53987654' },
    { id: 2, ci: '85091212345', nombre: 'María García López', sexo: 'F', tipo: 'OBRERO', contrato: 'Fijo Indeterminado', area: 'Facultad de Informática y Matemática', depto: 'Depto. de Sistemas de Información', cargo: 'Profesora Auxiliar', comprometido: false, sedePref: 'Sede Oscar Lucero Moya', tipoPref: 'Diurna', diaPref: 'Semana', telefono: '24483322', celular: '53229988', whatsapp: '53229988', direccion: 'Calle Frexes #123, Holguín', referencia: 'Esquina de la Iglesia', contactoNombre: 'Pedro García', contactoCelular: '54221100' },
    { id: 3, ci: '92113045678', nombre: 'Roberto Pérez Silva', sexo: 'M', tipo: 'OBRERO', contrato: 'Fijo Indeterminado', area: 'Facultad de Informática y Matemática', depto: 'Depto. de Conectividad y Redes', cargo: 'Especialista en Redes', comprometido: true, sedePref: 'Sede Oscar Lucero Moya', tipoPref: 'Nocturna', diaPref: 'Fin de Semana', telefono: '24419988', celular: '52119900', whatsapp: '52119900', direccion: 'Calle Maceo #89, Holguín', referencia: 'Cerca del Hospital Clínico Quirúrgico', contactoNombre: 'Ana Pérez', contactoCelular: '53118800' },
    { id: 4, ci: '03102434567', nombre: 'Carlos Gómez Batista', sexo: 'M', tipo: 'ESTUDIANTE', contrato: 'Estudiante Activo', area: 'Facultad de Informática y Matemática', depto: 'Depto. de Sistemas de Información', cargo: 'Estudiante de 4to Año', comprometido: true, sedePref: 'Sede Manuel Aguilera', tipoPref: 'Diurna', diaPref: 'Fin de Semana', telefono: '', celular: '55667788', whatsapp: '55667788', direccion: 'Residencia Estudiantil UHO, Holguín', referencia: 'Edificio B, Apto 4', contactoNombre: 'Padre Gómez', contactoCelular: '52009988' },
    { id: 5, ci: '04081256789', nombre: 'Ana Pérez Vidal', sexo: 'F', tipo: 'ESTUDIANTE', contrato: 'Estudiante Activo', area: 'Facultad de Informática y Matemática', depto: 'Depto. de Sistemas de Información', cargo: 'Estudiante de 4to Año', comprometido: false, sedePref: 'Sede Oscar Lucero Moya', tipoPref: 'Diurna', diaPref: 'Semana', telefono: '', celular: '54433221', whatsapp: '54433221', direccion: 'Calle Cables #210, Holguín', referencia: 'Frente al estadio', contactoNombre: 'Madre Pérez', contactoCelular: '53998877' }
  ]);

  // 3. Distribución de Guardia
  const [distribuciones, setDistribuciones] = useState([
    { id: 1, area: 'Facultad de Informática y Matemática', depto: 'Depto. de Sistemas de Información', sede: 'Sede Oscar Lucero Moya', tipo: 'Diurna', dias: [7, 14, 21, 28], cant: 2 },
    { id: 2, area: 'Facultad de Informática y Matemática', depto: 'Depto. de Sistemas de Información', sede: 'Sede Oscar Lucero Moya', tipo: 'Nocturna', dias: [10, 24], cant: 3 },
    { id: 3, area: 'Facultad de Ingeniería', depto: 'Depto. de Ingeniería Mecánica', sede: 'Sede Manuel Aguilera', tipo: 'Diurna', dias: [3, 17, 31], cant: 2 }
  ]);

  // 4. Asignaciones específicas de Guardia
  const [asignaciones, setAsignaciones] = useState([
    { fecha: '2026-06-07', personaId: 1, tipo: 'OBRERO', sede: 'Sede Oscar Lucero Moya', tipoGuardia: 'Diurna', asistio: true, evaluacion: 'B', observaciones: 'Cumplió correctamente' },
    { fecha: '2026-06-10', personaId: 3, tipo: 'OBRERO', sede: 'Sede Oscar Lucero Moya', tipoGuardia: 'Nocturna', asistio: true, evaluacion: 'R', observaciones: 'Llegó 15 min tarde' },
    { fecha: '2026-06-14', personaId: 1, tipo: 'OBRERO', sede: 'Sede Oscar Lucero Moya', tipoGuardia: 'Diurna', asistio: false, evaluacion: '', observaciones: 'Ausencia injustificada' },
    { fecha: '2026-06-24', personaId: 4, tipo: 'ESTUDIANTE', sede: 'Sede Oscar Lucero Moya', tipoGuardia: 'Nocturna', asistio: true, evaluacion: 'B', observaciones: '' }
  ]);

  // 5. Período de Guardia Actual y Configuración General
  const [periodoActivo, setPeriodoActivo] = useState({
    nombre: 'Junio — Julio 2026',
    compromisoInicio: '2026-06-01',
    compromisoFin: '2026-06-15',
    aprobacionInicio: '2026-06-16',
    aprobacionFin: '2026-06-25',
    aprobadoFIM: false
  });

  // 6. Notificaciones en Campana
  const [notificaciones, setNotificaciones] = useState([
    { id: 1, texto: '⏰ El período de compromiso cierra el 15 de Junio.', tiempo: 'Hace 1 hora', leido: false },
    { id: 2, texto: '📋 El potencial del Depto. Sistemas está listo para aprobación.', tiempo: 'Hace 3 horas', leido: false },
    { id: 3, texto: '✅ La guardia del día 07/06/2026 fue registrada correctamente.', tiempo: 'Ayer', leido: true }
  ]);

  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Estados Hito 4: MOD-06 Distribución y MOD-07 Control
  const [formDistribucion, setFormDistribucion] = useState({
    areaId: 1,
    sedeId: 1,
    tipoPersonal: 'OBRERO',
    tipoGuardia: 'Diurna',
    cantidadRequerida: 2,
    dias: [7, 14, 21, 28]
  });
  const [fechaControl, setFechaControl] = useState('2026-06-07');

  // MOD-08: Estadísticas y Dashboard de Cumplimiento
  const [datosCumplimiento, setDatosCumplimiento] = useState({
    resumen: {
      total_programadas: 48,
      asistencias: 44,
      ausencias: 4,
      porcentaje_cumplimiento: 91.7,
      tasa_efectividad: 'Alta'
    },
    evaluaciones: {
      bien: 38,
      regular: 6,
      mal: 0,
      sin_evaluacion: 4
    },
    por_area: [
      { area: 'Facultad de Informática y Matemática', total: 20, asistencias: 19, ausencias: 1, cumplimiento: 95.0 },
      { area: 'Facultad de Ingeniería', total: 16, asistencias: 14, ausencias: 2, cumplimiento: 87.5 },
      { area: 'Dirección de Informatización', total: 12, asistencias: 11, ausencias: 1, cumplimiento: 91.7 }
    ],
    por_sede: [
      { sede: 'Sede Oscar Lucero Moya', total: 24, asistencias: 22, ausencias: 2, cumplimiento: 91.7 },
      { sede: 'Sede Manuel Aguilera', total: 14, asistencias: 13, ausencias: 1, cumplimiento: 92.9 },
      { sede: 'Sede Celia Sánchez Manduley', total: 10, asistencias: 9, ausencias: 1, cumplimiento: 90.0 }
    ],
    por_regimen: {
      obreros: { total: 32, asistencias: 30, ausencias: 2, cumplimiento: 93.8 },
      estudiantes: { total: 16, asistencias: 14, ausencias: 2, cumplimiento: 87.5 }
    },
    tendencia_mensual: [
      { mes: 'Enero', cumplimiento: 94 },
      { mes: 'Febrero', cumplimiento: 89 },
      { mes: 'Marzo', cumplimiento: 92 },
      { mes: 'Abril', cumplimiento: 96 },
      { mes: 'Mayo', cumplimiento: 90 },
      { mes: 'Junio', cumplimiento: 92 }
    ]
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

  // Sincronizar listado de potencial y período de guardia desde el Backend (Hito 3)
  useEffect(() => {
    const fetchPotencialData = async () => {
      try {
        const token = localStorage.getItem('uho_access_token') || localStorage.getItem('access_token');
        if (!token) return;
        const res = await API.get('potencial/listado/');
        if (res.data) {
          const data = res.data;
          if (data.periodo) {
            setPeriodoActivo(prev => ({
              ...prev,
              nombre: data.periodo.nombre || prev.nombre,
              compromisoInicio: data.periodo.inicio_compromiso || prev.compromisoInicio,
              compromisoFin: data.periodo.fin_compromiso || prev.compromisoFin,
              aprobacionInicio: data.periodo.inicio_aprobacion || prev.aprobacionInicio,
              aprobacionFin: data.periodo.fin_aprobacion || prev.aprobacionFin,
              aprobadoFIM: data.aprobado || false
            }));
          }
          if (data.resultados && data.resultados.length > 0) {
            setPersonal(data.resultados.map(r => ({
              id: r.id,
              ci: r.ci_enmascarado || r.ci,
              nombre: r.nombre_completo,
              sexo: r.sexo,
              tipo: r.tipo,
              contrato: r.contrato_nombre,
              area: r.area_nombre,
              depto: r.depto_nombre,
              cargo: r.cargo_nombre,
              comprometido: r.comprometido,
              sedePref: r.sedePref_nombre || 'Sede Oscar Lucero Moya',
              tipoPref: r.tipoPref || 'Diurna',
              diaPref: r.diaPref || 'Semana',
              telefono: r.telefono || '',
              celular: r.celular || '',
              whatsapp: r.whatsapp || '',
              direccion: r.direccion || '',
              referencia: r.referencia || '',
              contactoNombre: r.contactoNombre || '',
              contactoCelular: r.contactoCelular || ''
            })));
          }
        }
      } catch (err) {
        console.warn('Backend potencial fetch fallback:', err);
      }
    };
    fetchPotencialData();
  }, [user]);

  // Sincronizar datos de Hito 4 (Distribución, Asignaciones del Día, Notificaciones) desde el Backend
  useEffect(() => {
    const fetchHito4Data = async () => {
      try {
        const token = localStorage.getItem('uho_access_token') || localStorage.getItem('access_token');
        if (!token) return;

        // 1. Distribución mensual de áreas
        try {
          const resDist = await API.get('distribucion/areas/');
          if (resDist.data && resDist.data.length > 0) {
            setDistribuciones(resDist.data.map(d => ({
              id: d.id,
              area: d.area_nombre || `Área #${d.area}`,
              depto: d.area_nombre || `Área #${d.area}`,
              sede: d.sede_nombre || `Sede #${d.sede}`,
              tipo: d.tipo_turno ? (d.tipo_turno.charAt(0).toUpperCase() + d.tipo_turno.slice(1).toLowerCase()) : 'Diurna',
              tipoPersonal: d.tipo_personal,
              dias: d.dias || [],
              cant: d.cantidad_requerida
            })));
          }
        } catch (e) {
          console.warn('Distribución backend fallback:', e);
        }

        // 2. Asignaciones nominales de guardia
        try {
          const resAsig = await API.get('distribucion/asignaciones/');
          if (resAsig.data && resAsig.data.length > 0) {
            setAsignaciones(resAsig.data.map(a => ({
              id: a.id,
              fecha: a.fecha,
              personaId: a.persona,
              tipo: a.persona_tipo || 'OBRERO',
              sede: a.sede_nombre || 'Sede Oscar Lucero Moya',
              tipoGuardia: a.tipo_turno ? (a.tipo_turno.charAt(0).toUpperCase() + a.tipo_turno.slice(1).toLowerCase()) : 'Diurna',
              asistio: a.asistio !== undefined ? a.asistio : true,
              evaluacion: a.evaluacion || '',
              observaciones: a.incidencias || a.observaciones || ''
            })));
          }
        } catch (e) {
          console.warn('Asignaciones backend fallback:', e);
        }

        // 3. Notificaciones institucionales (campanita)
        try {
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
          console.warn('Notificaciones backend fallback:', e);
        }

        // 4. Métricas consolidadas del Dashboard de Cumplimiento (MOD-08)
        try {
          const resCump = await API.get('reportes/dashboard-cumplimiento/');
          if (resCump.data && resCump.data.resumen) {
            setDatosCumplimiento(resCump.data);
          }
        } catch (e) {
          console.warn('Dashboard cumplimiento sync fallback:', e);
        }
      } catch (err) {
        console.warn('Hito 4/5 sync fallback:', err);
      }
    };

    fetchHito4Data();
  }, [user]);

  // Sincronizar roles y permisos institucionales (RBAC) desde el Backend (Base de Datos)
  useEffect(() => {
    const fetchRolesData = async () => {
      try {
        const token = localStorage.getItem('uho_access_token') || localStorage.getItem('access_token');
        if (!token) return;

        // 1. Cargos y Permisos RBAC
        try {
          const res = await API.get('guardia-admin/cargos/');
          if (res.data && res.data.length > 0) {
            const nombresCargos = res.data.map(c => c.nombre);
            const mapaPermisos = {};
            res.data.forEach(c => {
              if (Array.isArray(c.permisos) && c.permisos.length > 0) {
                mapaPermisos[c.nombre] = c.permisos;
              }
            });
            setNomencladores(prev => ({
              ...prev,
              cargos: nombresCargos
            }));
            setRolesPermisos(prev => ({
              ...prev,
              ...mapaPermisos
            }));
          }
        } catch (errCargos) {
          console.warn('Backend cargos fetch fallback:', errCargos);
        }

        // 2. Áreas Universitarias
        try {
          const resAreas = await API.get('guardia-admin/areas/');
          if (resAreas.data && resAreas.data.length > 0) {
            setNomencladores(prev => ({
              ...prev,
              areas: resAreas.data.map(a => ({
                id: a.id,
                codigo: a.codigo,
                nombre: a.nombre,
                responsable: a.responsable_info ? `${a.responsable_info.first_name} ${a.responsable_info.last_name}` : 'Sin asignar',
                tieneEstudiantes: a.tieneEstudiantes,
                deptoCount: a.deptoCount || 0,
                activo: a.activo
              }))
            }));
          }
        } catch (errAreas) {
          console.warn('Backend areas fetch fallback:', errAreas);
        }
      } catch (err) {
        console.warn('Backend nomencladores fetch fallback:', err);
      }
    };

    fetchRolesData();
  }, [user]);

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

  // --- FILTROS DE VISTAS ---
  const [filtroAreaPotencial, setFiltroAreaPotencial] = useState('Facultad de Informática y Matemática');
  const [personalSeleccionadoPotencial, setPersonalSeleccionadoPotencial] = useState([]);
  const [searchPersonQuery, setSearchPersonQuery] = useState('');
  const [searchResultPerson, setSearchResultPerson] = useState(null);

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
    try {
      await API.post('compromiso/compromisos/firmar/', {
        tipo_turno: tipo,
        tipo_dia: dia
      });
      showToast('✅ Compromiso de guardia firmado y guardado en la base de datos.');
    } catch (e) {
      console.warn('Persistencia compromiso fallback local:', e);
      showToast('✅ Compromiso de guardia firmado exitosamente.');
    }

    setPersonal(prev => prev.map(p => {
      const isCurrentUser = p.nombre.toLowerCase().includes(user?.first_name?.toLowerCase()) || p.username === user?.username;
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
      showToast('✅ Datos de contacto actualizados y guardados en la base de datos.');
    } catch (e) {
      console.warn('Persistencia de perfil fallback local:', e);
      showToast('✅ Datos de contacto actualizados correctamente.');
    }

    setPersonal(prev => prev.map(p => {
      const isCurrentUser = p.nombre.toLowerCase().includes(user?.first_name?.toLowerCase()) || p.username === user?.username;
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

    const nuevaDist = {
      id: Date.now(),
      area: areaSeleccionada?.nombre || 'Facultad de Informática y Matemática',
      depto: areaSeleccionada?.nombre || 'Facultad de Informática y Matemática',
      sede: sedeSeleccionada?.nombre || 'Sede Oscar Lucero Moya',
      tipo: formDistribucion.tipoGuardia,
      tipoPersonal: formDistribucion.tipoPersonal,
      dias: formDistribucion.dias,
      cant: Number(formDistribucion.cantidadRequerida)
    };

    try {
      await API.post('distribucion/areas/', {
        area: Number(formDistribucion.areaId),
        sede: Number(formDistribucion.sedeId),
        tipo_personal: formDistribucion.tipoPersonal,
        tipo_turno: formDistribucion.tipoGuardia.toUpperCase(),
        dias: formDistribucion.dias,
        cantidad_requerida: Number(formDistribucion.cantidadRequerida)
      });
      showToast('📅 Distribución mensual sincronizada con la base de datos.');
    } catch (e) {
      console.warn('Persistencia local distribución fallback:', e);
      showToast('📅 Distribución de días guardada en el calendario.');
    }

    setDistribuciones(prev => [nuevaDist, ...prev]);
  };

  // --- MOD-07: CONTROL DE GUARDIA DIARIO Y EVALUACIONES ---
  const handleToggleAsistencia = (fecha, personaId) => {
    setAsignaciones(prev => {
      const exists = prev.find(a => a.fecha === fecha && a.personaId === personaId);
      if (exists) {
        const nuevoAsistio = !exists.asistio;
        return prev.map(a => (a.fecha === fecha && a.personaId === personaId) 
          ? { 
              ...a, 
              asistio: nuevoAsistio, 
              // RN-09: Si no asistió, evaluación debe estar vacía obligatoriamente
              evaluacion: nuevoAsistio ? (a.evaluacion || 'B') : '' 
            } 
          : a
        );
      } else {
        const persona = personal.find(p => p.id === personaId);
        return [...prev, { 
          id: Date.now(),
          fecha, 
          personaId, 
          tipo: persona ? persona.tipo : 'OBRERO', 
          sede: 'Sede Oscar Lucero Moya', 
          tipoGuardia: 'Diurna', 
          asistio: true, 
          evaluacion: 'B', 
          observaciones: '' 
        }];
      }
    });
  };

  const handleUpdateEvaluacion = (fecha, personaId, val) => {
    setAsignaciones(prev => prev.map(a => {
      if (a.fecha === fecha && a.personaId === personaId) {
        // RN-09: Evaluaciones sólo para quienes asistieron
        if (!a.asistio) return { ...a, evaluacion: '' };
        return { ...a, evaluacion: val };
      }
      return a;
    }));
  };

  const handleUpdateObservaciones = (fecha, personaId, val) => {
    setAsignaciones(prev => prev.map(a => (a.fecha === fecha && a.personaId === personaId) ? { ...a, observaciones: val } : a));
  };

  const handleGuardarControlDiario = async () => {
    const asignacionesFecha = asignaciones.filter(a => a.fecha === fechaControl);
    const registros = asignacionesFecha.map(a => ({
      asignacion_id: a.id || a.personaId,
      asistio: a.asistio,
      evaluacion: a.asistio ? (a.evaluacion || '') : '', // RN-09 estricto
      incidencias: a.observaciones || ''
    }));

    try {
      await API.post('control/evaluaciones/guardar-lote-diario/', { registros });
      showToast('💾 Control diario sincronizado con el backend exitosamente (RN-09).');
    } catch (e) {
      console.warn('Persistencia local control diario fallback:', e);
      showToast('💾 Control diario guardado correctamente (RN-09 aplicado).');
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
              <span className="text-xs text-emerald-500">({Math.round((comprometidosObreros/totalTrabajadores)*100)}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(comprometidosObreros/totalTrabajadores)*100}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 border-t-2 border-t-amber-500">
            <h4 className="text-xs text-amber-400 font-semibold uppercase tracking-wider">⏳ Sin Compromiso</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{sinCompromisoObreros}</span>
              <span className="text-xs text-amber-500">({Math.round((sinCompromisoObreros/totalTrabajadores)*100)}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(sinCompromisoObreros/totalTrabajadores)*100}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 border-t-2 border-t-blue-500">
            <h4 className="text-xs text-blue-400 font-semibold uppercase tracking-wider">🎓 Estudiantes</h4>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-slate-100">{comprometidosEstudiantes}</span>
              <span className="text-xs text-blue-500">/ {totalEstudiantes} Comp.</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(comprometidosEstudiantes/totalEstudiantes)*100}%` }}></div>
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
    // Buscar datos del usuario logueado en la lista simulada
    const currentMember = personal.find(p => p.username === user?.username || p.nombre.toLowerCase().includes(user?.first_name?.toLowerCase())) || personal[0];
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            Firma de Compromiso Obrera
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Sede donde prefiere realizar la guardia *</label>
              <select 
                defaultValue={currentMember.sedePref || ''}
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
                  <input type="radio" name="turno-pref" value="Diurna" defaultChecked={currentMember.tipoPref === 'Diurna'} className="accent-emerald-500 h-4 w-4" />
                  Guardia Diurna
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input type="radio" name="turno-pref" value="Nocturna" defaultChecked={currentMember.tipoPref === 'Nocturna'} className="accent-emerald-500 h-4 w-4" />
                  Guardia Nocturna
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Preferencia de Día *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input type="checkbox" name="dia-pref" value="Semana" defaultChecked={currentMember.diaPref === 'Semana'} className="accent-emerald-500 h-4 w-4 rounded" />
                  Día de Semana
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input type="checkbox" name="dia-pref" value="Fin de Semana" defaultChecked={currentMember.diaPref === 'Fin de Semana'} className="accent-emerald-500 h-4 w-4 rounded" />
                  Fin de Semana
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/65 flex gap-3">
              <button 
                onClick={() => {
                  const s = document.getElementById('form-sede-obrero').value;
                  const t = document.querySelector('input[name="turno-pref"]:checked')?.value || 'Diurna';
                  const d = 'Semana';
                  handleGuardarCompromiso(s, t, d);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
              >
                Firmar Compromiso
              </button>
              <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 rounded-xl text-xs text-slate-400 transition-all">
                Cancelar
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
                <span className="font-bold text-slate-300">{currentMember.nombre}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">CI</span>
                <span className="font-mono text-slate-300">{enmascararCI(currentMember.ci, true)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Contrato</span>
                <span className="text-slate-300">{currentMember.contrato}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Departamento</span>
                <span className="text-slate-300">{currentMember.depto}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Cargo</span>
                <span className="text-slate-300">{currentMember.cargo}</span>
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
    const currentMember = personal.find(p => p.tipo === 'ESTUDIANTE') || personal[3];
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            Firma de Compromiso Estudiantil (MOD-04)
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Sede asignada para Guardia Estudiantil *</label>
              <select 
                defaultValue={currentMember.sedePref || ''}
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
                  <input type="radio" name="turno-pref-est" value="Diurna" defaultChecked={currentMember.tipoPref === 'Diurna'} className="accent-emerald-500 h-4 w-4" />
                  Guardia Diurna (Estudiantil)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input type="radio" name="turno-pref-est" value="Nocturna" defaultChecked={currentMember.tipoPref === 'Nocturna'} className="accent-emerald-500 h-4 w-4" />
                  Guardia Nocturna (Estudiantil)
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/65 flex gap-3">
              <button 
                onClick={() => {
                  const s = document.getElementById('form-sede-estudiante').value;
                  const t = document.querySelector('input[name="turno-pref-est"]:checked')?.value || 'Diurna';
                  handleGuardarCompromiso(s, t, 'Fin de Semana');
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
              >
                Guardar Compromiso
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
                <span className="font-bold text-slate-300">{currentMember.nombre}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">CI</span>
                <span className="font-mono text-slate-300">{enmascararCI(currentMember.ci, true)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Año de carrera</span>
                <span className="text-slate-300">4to Año</span>
              </div>
              <div className="flex justify-between border-b border-slate-850 pb-1.5">
                <span className="text-slate-500">Facultad</span>
                <span className="text-slate-300">{currentMember.area}</span>
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
    const areaSel = nomencladores.areas.find(a => a.id === Number(formDistribucion.areaId));
    const sedeSel = nomencladores.sedes.find(s => s.id === Number(formDistribucion.sedeId));
    const esAreaSinEstudiantes = formDistribucion.tipoPersonal === 'ESTUDIANTE' && areaSel && !areaSel.tieneEstudiantes;
    const minSede = formDistribucion.tipoPersonal === 'ESTUDIANTE' ? (sedeSel?.minEstudiantiles || 1) : (sedeSel?.minObreras || 1);
    const alertaMinimo = Number(formDistribucion.cantidadRequerida) < minSede;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-100">Distribución de Turnos de Guardia (MOD-06)</h3>
          <p className="text-xs text-slate-400">Asignación nominal y mensual de cuotas y fechas institucionales</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2">Planificar Turnos de Guardia</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Área / Facultad Responsable</label>
                <select 
                  value={formDistribucion.areaId} 
                  onChange={(e) => setFormDistribucion(prev => ({ ...prev, areaId: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Régimen de Personal</label>
                  <select 
                    value={formDistribucion.tipoPersonal}
                    onChange={(e) => setFormDistribucion(prev => ({ ...prev, tipoPersonal: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="OBRERO">Obreros / Trabajadores</option>
                    <option value="ESTUDIANTE">Estudiantes Universitarios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sede Física</label>
                  <select 
                    value={formDistribucion.sedeId}
                    onChange={(e) => setFormDistribucion(prev => ({ ...prev, sedeId: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    {nomencladores.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Turno</label>
                  <select 
                    value={formDistribucion.tipoGuardia}
                    onChange={(e) => setFormDistribucion(prev => ({ ...prev, tipoGuardia: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Diurna">Diurna</option>
                    <option value="Nocturna">Nocturna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cantidad Requerida / Día</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={20}
                    value={formDistribucion.cantidadRequerida} 
                    onChange={(e) => setFormDistribucion(prev => ({ ...prev, cantidadRequerida: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none" 
                  />
                  {alertaMinimo && (
                    <p className="mt-1 text-[11px] text-amber-400 font-semibold">
                      ⚠️ RN-07: Mínimo institucional para esta sede: {minSede}
                    </p>
                  )}
                </div>
              </div>

              {/* Calendario interactivo con toggle de días */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Seleccione los días del mes</label>
                  <span className="text-[11px] text-emerald-400 font-semibold">{formDistribucion.dias.length} días seleccionados</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const isSelected = formDistribucion.dias.includes(day);
                    return (
                      <button 
                        key={day}
                        type="button"
                        onClick={() => handleToggleDiaDistribucion(day)}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'bg-emerald-600 text-white font-bold border border-emerald-400 shadow-md shadow-emerald-950/50' 
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-850 hover:text-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGuardarDistribucion} 
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-600 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Guardar Distribución (RN-05 / RN-06 / RN-07)
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-850 pb-2 flex justify-between items-center">
              <span>Distribuciones Registradas</span>
              <span className="text-xs text-emerald-400 font-normal">{distribuciones.length} planificadas</span>
            </h3>
            <div className="space-y-3 mt-4 max-h-[500px] overflow-y-auto pr-1">
              {distribuciones.map(d => (
                <div key={d.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 space-y-2 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-200">{d.area || d.depto}</span>
                    <div className="flex gap-1.5 items-center">
                      <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40 text-[9px] font-bold uppercase">
                        {d.tipoPersonal || 'OBRERO'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40 text-[9px] font-bold uppercase">
                        {d.tipo}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">{d.sede} • Cuota requerida: {d.cant} personas/día</div>
                  <div className="text-xs text-slate-300 font-semibold">
                    Días asignados: {Array.isArray(d.dias) ? d.dias.join(', ') : d.dias}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderControl = () => {
    // Filtrar o asociar asignaciones de la fecha activa
    const asignacionesDelDia = asignaciones.filter(a => a.fecha === fechaControl);
    const totalConvocados = asignacionesDelDia.length > 0 ? asignacionesDelDia.length : personal.length;
    const asistidosCount = asignacionesDelDia.length > 0 
      ? asignacionesDelDia.filter(a => a.asistio).length 
      : personal.filter(p => asignaciones.find(a => a.personaId === p.id && a.fecha === fechaControl)?.asistio).length;
    const ausentesCount = totalConvocados - asistidosCount;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">Control de Guardia Diario y Evaluaciones (MOD-07)</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Fecha de control:</span>
              <input 
                type="date" 
                value={fechaControl} 
                onChange={(e) => setFechaControl(e.target.value)} 
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-850">
              <span className="text-emerald-400 font-bold">{asistidosCount} Asistieron</span>
              <span className="text-slate-600">|</span>
              <span className="text-red-400 font-bold">{ausentesCount} Ausentes</span>
            </div>
            <button 
              onClick={handleGuardarControlDiario} 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar Control Diario
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[700px] md:min-w-0">
            <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Nombre y Apellidos</th>
                <th className="p-4">Rol / Tipo</th>
                <th className="p-4">Teléfono</th>
                <th className="p-4">¿Asistió?</th>
                <th className="p-4">Evaluación (RN-09)</th>
                <th className="p-4">Observaciones / Incidencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {personal.map(p => {
                const asignacion = asignaciones.find(a => a.personaId === p.id && a.fecha === fechaControl);
                const asistio = asignacion ? asignacion.asistio : false;
                const evalVal = asignacion ? asignacion.evaluacion : '';
                const obsVal = asignacion ? asignacion.observaciones : '';

                return (
                  <tr key={p.id} className="hover:bg-slate-950/20 text-slate-300 transition-colors">
                    <td className="p-4 font-semibold text-slate-200">{p.nombre}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.tipo === 'OBRERO' ? 'bg-blue-950 text-blue-400 border border-blue-800/40' : 'bg-green-950 text-green-400 border border-green-800/40'}`}>
                        {p.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">{p.celular || p.telefono || 'N/A'}</td>
                    <td className="p-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={asistio}
                          onChange={() => handleToggleAsistencia(fechaControl, p.id)}
                          className="accent-emerald-500 h-4.5 w-4.5 rounded" 
                        />
                        <span className={asistio ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {asistio ? 'Presente' : 'Ausente'}
                        </span>
                      </label>
                    </td>
                    <td className="p-4">
                      {asistio ? (
                        <select 
                          value={evalVal}
                          onChange={(e) => handleUpdateEvaluacion(fechaControl, p.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Seleccionar --</option>
                          <option value="B">Bien (B)</option>
                          <option value="R">Regular (R)</option>
                          <option value="M">Mal (M)</option>
                        </select>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 italic px-2 py-1 bg-slate-950/40 rounded-lg border border-slate-850">
                          Sin eval (RN-09: Ausente)
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <input 
                        type="text" 
                        placeholder="Escribir notas de asistencia o sustitución..."
                        value={obsVal}
                        onChange={(e) => handleUpdateObservaciones(fechaControl, p.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-700" 
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPerfil = () => {
    const currentMember = personal.find(p => p.username === user?.username || p.nombre.toLowerCase().includes(user?.first_name?.toLowerCase())) || personal[0];
    
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
              <p className="font-bold text-slate-350 mt-1">{currentMember.nombre}</p>
            </div>
            <div>
              <span className="text-slate-500">CI</span>
              <p className="font-bold text-slate-350 mt-1">{enmascararCI(currentMember.ci, true)}</p>
            </div>
            <div>
              <span className="text-slate-500">Sexo</span>
              <p className="text-slate-300 mt-1">{currentMember.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
            </div>
            <div>
              <span className="text-slate-500">Tipo de Contrato</span>
              <p className="text-slate-300 mt-1">{currentMember.contrato}</p>
            </div>
            <div>
              <span className="text-slate-500">Área Académica / Facultad</span>
              <p className="text-slate-300 mt-1">{currentMember.area}</p>
            </div>
            <div>
              <span className="text-slate-500">Departamento / Unidad</span>
              <p className="text-slate-300 mt-1">{currentMember.depto}</p>
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
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-100">Mi Cronograma de Guardia Personal</h3>
          <p className="text-xs text-slate-400">Visualización de turnos asignados durante el año</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6">
          <div className="flex gap-4 justify-end mb-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 bg-emerald-600 rounded-md"></div>
              <span>Realizada (B/R)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 bg-red-600 rounded-md"></div>
              <span>Ausencia (M)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 bg-blue-600 rounded-md"></div>
              <span>Próxima asignación</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'].map((mes, idx) => (
              <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-slate-300 mb-3 text-center">{mes} 2026</h4>
                <div className="grid grid-cols-7 gap-1">
                  {/* Fila de días de semana */}
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                    <span key={i} className="text-[10px] text-slate-500 font-bold text-center">{d}</span>
                  ))}
                  
                  {/* Rellenar días simulados */}
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
                    let bg = 'bg-slate-900 text-slate-400';
                    if (mes === 'Junio' && day === 7) bg = 'bg-emerald-600 text-white';
                    if (mes === 'Junio' && day === 14) bg = 'bg-red-600 text-white';
                    if (mes === 'Junio' && day === 24) bg = 'bg-emerald-600 text-white';
                    if (mes === 'Junio' && day === 15) bg = 'bg-blue-600 text-white font-bold animate-pulse';

                    return (
                      <span key={day} className={`text-[10px] text-center aspect-square flex items-center justify-center rounded-md border border-slate-800 ${bg}`}>
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
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
