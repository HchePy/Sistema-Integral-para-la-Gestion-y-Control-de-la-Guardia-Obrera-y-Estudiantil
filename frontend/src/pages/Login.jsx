import React, { useState } from 'react';
import { useAuth, ROLES_DISPONIBLES } from '../context/AuthContext';
import { Shield, Lock, User, AlertCircle, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('carlos.leyva@uho.edu.cu');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, switchRole } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);
    if (!result.success) {
      setError(result.message);
      setIsLoading(false);
    }
  };

  const handleQuickRoleAccess = async (roleObj) => {
    setError('');
    setIsLoading(true);
    await switchRole(roleObj.id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F2447] via-[#1A3A6E] to-[#2E6DAD] relative overflow-hidden px-4 py-8">
      {/* Elementos decorativos institucionales UHO */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#4A90D9] rounded-full mix-blend-multiply filter blur-3xl opacity-25 animate-blob"></div>
      <div className="absolute top-40 -right-40 w-96 h-96 bg-[#27AE60] rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-2000"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-[#D5E8F0]/40">
        {/* Columna Izquierda: Formulario de Autenticación AGA_AUTH */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-[#1A3A6E] flex items-center justify-center p-2 shadow-lg border-2 border-[#4A90D9]/40 shrink-0">
                <img
                  src="/logo_uho.png"
                  alt="Logo Universidad de Holguín"
                  className="w-full h-full object-contain bg-white rounded-lg p-1"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D5E8F0] text-[#1A3A6E] uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-[#1A3A6E]" /> Universidad de Holguín
                </span>
                <h1 className="text-2xl font-extrabold text-[#1A3A6E] tracking-tight mt-1">
                  SIGCGOE — Guardia UHO
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Sistema Integral para la Gestión y Control de la Guardia Obrera y Estudiantil
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-[#E74C3C] rounded-r-lg flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-[#E74C3C] shrink-0" />
                <p className="text-xs font-medium text-red-800">{error}</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Usuario o Correo Institucional (AGA_AUTH)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#2E6DAD]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E6DAD] focus:border-[#1A3A6E] transition-all bg-gray-50/70"
                    placeholder="usuario@uho.edu.cu"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Contraseña Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#2E6DAD]" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E6DAD] focus:border-[#1A3A6E] transition-all bg-gray-50/70"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-[#1A3A6E] hover:bg-[#2E6DAD] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A3A6E] transition-all disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando token con AGA_AUTH...
                  </span>
                ) : (
                  <>
                    <span>Iniciar Sesión Institucional</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5 font-medium text-[#1A3A6E]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#27AE60]" />
              Servicio Centralizado <code className="font-mono font-bold">auth.uho.edu.cu</code> (RF-0109)
            </span>
            <span>RNF-06 / RNF-13 Cumplido</span>
          </div>
        </div>

        {/* Columna Derecha: Selector Rápido del Entorno de Simulación de BD (6 Roles UHO) */}
        <div className="lg:col-span-5 bg-[#F4F6F9] border-t lg:border-t-0 lg:border-l border-gray-200 p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#1A3A6E] font-bold text-xs uppercase tracking-wider mb-2">
              <Building2 className="w-4 h-4 text-[#2E6DAD]" />
              Directorio Institucional Simulado (BD Activa)
            </div>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Seleccione cualquier perfil institucional sincronizado con <strong>ASSET / SIGENU</strong> para ingresar directamente con su token JWT real:
            </p>

            <div className="space-y-2">
              {ROLES_DISPONIBLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleQuickRoleAccess(r)}
                  className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#D5E8F0]/50 border border-gray-200 hover:border-[#2E6DAD] transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-[#1A3A6E] group-hover:text-[#2E6DAD] truncate">
                      {r.label}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {r.first_name} {r.last_name} • <span className="font-mono">{r.username}@uho.edu.cu</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#1A3A6E] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#D5E8F0]/60 border border-[#4A90D9]/30 text-[11px] text-[#1A3A6E]">
            <strong>Nota de Despliegue:</strong> En producción se enlaza automáticamente con PostgreSQL y los nodos <code className="font-mono">AGA_AUTH</code>, <code className="font-mono">ASSET</code> y <code className="font-mono">SIGENU</code> mediante <code className="font-mono">.env</code>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
