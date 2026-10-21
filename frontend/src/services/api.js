import axios from 'axios';

// Instancia de Axios preconfigurada para el backend UHO
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor de peticiones: Inyecta el JWT Bearer token si existe en localStorage
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('uho_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas: Maneja refresco automático de token en caso de expiración (HTTP 401 Unauthorized)
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refresh = localStorage.getItem('uho_refresh_token');
        if (refresh) {
          // Solicitar un nuevo token de acceso usando el token de refresco
          const refreshUrl = `${API.defaults.baseURL}auth/token/refresh/`;
          const response = await axios.post(refreshUrl, { refresh });
          const { access } = response.data;
          
          // Actualizar tokens y reintentar la petición original
          localStorage.setItem('uho_access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        // Si el refresh token también expiró, limpiar almacenamiento local
        localStorage.removeItem('uho_access_token');
        localStorage.removeItem('uho_refresh_token');
        localStorage.removeItem('uho_user');
        window.dispatchEvent(new Event('auth_logout'));
      }
    }
    return Promise.reject(error);
  }
);

export default API;
