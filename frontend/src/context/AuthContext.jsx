import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const ROLES_DISPONIBLES = [
  { id: 'SUPERADMIN', label: 'Administrador General (SUPERADMIN)', area: 'Dirección de Informatización', first_name: 'Carlos', last_name: 'Leyva Rodríguez', username: 'superadmin' },
  { id: 'JEFE_SEGURIDAD', label: 'Jefe de Seguridad y Protección', area: 'Dirección de Seguridad y Protección Universitaria', first_name: 'Elena', last_name: 'Rost Martínez', username: 'jefe_seguridad' },
  { id: 'RESPONSABLE_AREA', label: 'Responsable de Área (Decano / Director)', area: 'Facultad de Informática y Matemática', first_name: 'Julio César', last_name: 'Gómez Torres', username: 'resp_area' },
  { id: 'RESPONSABLE_DEPARTAMENTO', label: 'Responsable de Departamento', area: 'Facultad de Informática y Matemática', first_name: 'Ramón', last_name: 'Valdés Almaguer', username: 'resp_depto' },
  { id: 'TRABAJADOR', label: 'Trabajador (Guardia Obrera)', area: 'Facultad de Informática y Matemática', first_name: 'José Manuel', last_name: 'Rodríguez Pérez', username: 'trabajador' },
  { id: 'ESTUDIANTE', label: 'Estudiante (Guardia Estudiantil)', area: 'Facultad de Informática y Matemática', first_name: 'Carlos Alberto', last_name: 'Gómez Batista', username: 'estudiante' },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeRoleForUI = (roleStr) => {
    if (roleStr === 'RESPONSABLE_DEPTO') return 'RESPONSABLE_DEPARTAMENTO';
    return roleStr || 'SUPERADMIN';
  };

  useEffect(() => {
    const initSession = async () => {
      const savedUserStr = localStorage.getItem('uho_session_user');
      let initialRole = 'SUPERADMIN';
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          initialRole = parsed.role || 'SUPERADMIN';
          setUser({ ...parsed, role: normalizeRoleForUI(parsed.role) });
        } catch (e) {
          // continúa con sincronización de token
        }
      }

      // Obtener token JWT real de la base de datos simulada para garantizar persistencia
      try {
        const res = await api.post('/auth/simular-rol/', { role: initialRole });
        const data = res.data;
        if (data.access) {
          localStorage.setItem('access_token', data.access);
          localStorage.setItem('refresh_token', data.refresh || '');
        }
        const sessionUser = {
          ...data,
          role: normalizeRoleForUI(data.role),
          area: data.area || data.departamento || 'Facultad de Informática y Matemática',
          departamento: data.departamento || data.area || 'Facultad de Informática y Matemática',
        };
        setUser(sessionUser);
        localStorage.setItem('uho_session_user', JSON.stringify(sessionUser));
      } catch (err) {
        if (!savedUserStr) {
          const defaultProfile = ROLES_DISPONIBLES[0];
          const fallbackUser = {
            username: defaultProfile.username,
            role: defaultProfile.id,
            first_name: defaultProfile.first_name,
            last_name: defaultProfile.last_name,
            email: `${defaultProfile.username}@uho.edu.cu`,
            departamento: defaultProfile.area,
            area: defaultProfile.area,
          };
          setUser(fallbackUser);
          localStorage.setItem('uho_session_user', JSON.stringify(fallbackUser));
        }
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  const switchRole = async (newRoleId) => {
    const found = ROLES_DISPONIBLES.find(r => r.id === newRoleId) || ROLES_DISPONIBLES[0];
    try {
      const res = await api.post('/auth/simular-rol/', { role: found.id, username: found.username });
      const data = res.data;
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh || '');
      }
      const updatedUser = {
        ...data,
        role: normalizeRoleForUI(data.role),
        area: data.area || found.area,
        departamento: data.departamento || found.area,
      };
      setUser(updatedUser);
      localStorage.setItem('uho_session_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      const updatedUser = {
        username: found.username,
        role: found.id,
        first_name: found.first_name,
        last_name: found.last_name,
        email: `${found.username}@uho.edu.cu`,
        departamento: found.area,
        area: found.area,
      };
      setUser(updatedUser);
      localStorage.setItem('uho_session_user', JSON.stringify(updatedUser));
      return updatedUser;
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      const { access, refresh, ...userData } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      const nextUser = {
        ...userData,
        role: normalizeRoleForUI(userData.role),
        area: userData.area || userData.departamento || 'Facultad de Informática y Matemática',
        departamento: userData.departamento || userData.area || 'Facultad de Informática y Matemática',
      };
      setUser(nextUser);
      localStorage.setItem('uho_session_user', JSON.stringify(nextUser));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Credenciales institucionales inválidas en AGA_AUTH (auth.uho.edu.cu).',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('uho_session_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, switchRole, changeRoleSimulated: switchRole, ROLES_DISPONIBLES }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
