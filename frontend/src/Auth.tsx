import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (!isLogin && (!firstName.trim() || !lastName.trim())) {
      setError('Por favor, ingresa tu nombre y apellido.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const normalizedUsername = username.trim().toLowerCase();
    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin
      ? { username: normalizedUsername, password }
      : { username: normalizedUsername, password, first_name: firstName.trim(), last_name: lastName.trim() };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error inesperado.');
      }

      // Guardar usuario en localStorage
      localStorage.setItem('acon_user', data.username);
      localStorage.setItem('acon_user_name', `${data.first_name} ${data.last_name}`);
      
      // Redirigir a selección de marca
      navigate('/select-brand');
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden"
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      {/* ── Ambient blobs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #0044CC 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 65%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* ── Auth Card ── */}
      <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-white/[0.06] p-8 md:p-10 shadow-2xl backdrop-blur-xl"
        style={{ background: 'rgba(12,14,20,0.75)' }}>
        
        {/* Glow behind logo */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-[#0044CC] opacity-20 blur-2xl pointer-events-none" />

        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white select-none mb-4"
            style={{
              background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)',
              boxShadow: '0 0 24px rgba(0,68,204,0.4)',
            }}
          >
            A
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }}
            />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white text-center leading-tight">
            {isLogin ? 'Bienvenido a ACON' : 'Crea tu cuenta en ACON'}
          </h2>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {isLogin ? 'Ingresa tus credenciales para acceder al sistema' : 'Empieza a controlar tus ventas en ferias'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* First Name & Last Name (Register only) */}
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 focus:bg-white/[0.05] transition-all"
                  disabled={loading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Apellido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Pérez"
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 focus:bg-white/[0.05] transition-all"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 focus:bg-white/[0.05] transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 focus:bg-white/[0.05] transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input (Register only) */}
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Confirmar contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0044CC]/50 focus:bg-white/[0.05] transition-all"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl text-white font-semibold text-sm transition-all duration-200 cursor-pointer relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #0044CC 0%, #2266FF 100%)',
              boxShadow: '0 4px 20px rgba(0,68,204,0.3)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {isLogin ? 'Iniciando sesión...' : 'Registrando cuenta...'}
              </span>
            ) : (
              <>
                <span>{isLogin ? 'Ingresar a ACON' : 'Registrar y continuar'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-6 border-t border-white/[0.05] text-center">
          <p className="text-xs text-slate-500">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="ml-1.5 text-[#6699FF] hover:underline font-semibold cursor-pointer"
            >
              {isLogin ? 'Créala aquí' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
