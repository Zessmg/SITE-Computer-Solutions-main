'use client';

import React, { useState, useEffect } from 'react';
import { 
  isSupabaseConfigured, 
  fetchHistory, 
  fetchCatalogs, 
  fetchProducts,
  getCurrentUser, 
  signInWithGoogle, 
  signInWithEmailPassword,
  signUpWithEmailPassword,
  fetchUsersList,
  signOutUser 
} from '@/lib/supabase/client';
import ChatInterface from '@/components/ui/ChatInterface';
import HistoryPanel from '@/components/ui/HistoryPanel';
import ApprovalsPanel from '@/components/ui/ApprovalsPanel';
import AdminPanel from '@/components/ui/AdminPanel';
import ProductPanel from '@/components/ui/ProductPanel';
import UsersPanel from '@/components/ui/UsersPanel';
import { 
  Briefcase, 
  Wrench, 
  Cpu, 
  Settings, 
  Database, 
  Sparkles, 
  MessageSquare, 
  History, 
  ShieldAlert, 
  Server, 
  Layers, 
  CheckCircle2, 
  Users,
  AlertCircle,
  LogOut,
  Terminal,
  Network
} from 'lucide-react';

export default function Home() {
  const [currentRole, setCurrentRole] = useState<'vendedor' | 'soporte' | 'admin'>('vendedor');
  const [activeTab, setActiveTab] = useState<'consulta' | 'historial' | 'aprobaciones' | 'administracion' | 'productos' | 'usuarios'>('consulta');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const getTabClass = (tabId: string) => {
    const isActive = activeTab === tabId;
    const baseClass = "flex items-center gap-2 py-2.5 px-4 text-xs font-bold transition-all border rounded-xl active:scale-[0.98]";
    if (isActive) {
      return `${baseClass} bg-slate-900 border-cyan-500/50 text-cyan-400 shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/10`;
    } else {
      return `${baseClass} bg-slate-950/15 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-850/25 hover:border-slate-700`;
    }
  };
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [baseRole, setBaseRole] = useState<'vendedor' | 'soporte' | 'admin'>('vendedor');
  const [selectedLoginEmail, setSelectedLoginEmail] = useState('admin@sitesolutions.com');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Dashboard Metrics State
  const [metrics, setMetrics] = useState({
    sentQuotes: 0,
    totalStock: 0,
    pendingQuotes: 0,
    pendingCatalogs: 0,
    dbStatus: 'Local Fallback'
  });

  // Check auth state on start
  useEffect(() => {
    const checkUser = async () => {
      setLoadingAuth(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          const email = currentUser.email?.toLowerCase() || '';
          
          // Consultar directorio dinámico para encontrar su rol asignado
          const allUsers = await fetchUsersList();
          const registered = allUsers.find(u => u.email.toLowerCase().trim() === email);
          
          if (registered) {
            const roleStr = registered.role.toLowerCase();
            let resolved: 'vendedor' | 'soporte' | 'admin' = 'vendedor';
            if (roleStr === 'administrador' || roleStr === 'admin') {
              resolved = 'admin';
            } else if (roleStr === 'tecnico' || roleStr === 'técnico' || roleStr === 'soporte') {
              resolved = 'soporte';
            }
            setBaseRole(resolved);
            setCurrentRole(resolved);
            setIsAdminMode(resolved === 'admin');
          } else {
            // Asignación por defecto según el prefijo del correo si no está en el directorio
            let resolved: 'vendedor' | 'soporte' | 'admin' = 'vendedor';
            if (email.startsWith('admin') || email === 'geeraa123@gmail.com') {
              resolved = 'admin';
            } else if (email.startsWith('soporte') || email.startsWith('tecnico')) {
              resolved = 'soporte';
            }
            setBaseRole(resolved);
            setCurrentRole(resolved);
            setIsAdminMode(resolved === 'admin');
          }
          setActiveTab('consulta');
        }
      } catch (err) {
        console.error('Error checking user session:', err);
      } finally {
        setLoadingAuth(false);
      }
    };
    checkUser();
  }, []);

  // Load metrics dynamically from mock/Supabase database
  useEffect(() => {
    if (!user) return;
    
    const loadDashboardMetrics = async () => {
      try {
        const history = await fetchHistory();
        const catalogs = await fetchCatalogs();
        const products = await fetchProducts('Todos', '');
        
        const sentQuotes = history.length;
        const pendingQuotes = history.filter(h => h.status === 'Pendiente').length;
        const pendingCatalogs = catalogs.filter(c => c.status === 'Pendiente').length;
        const totalStock = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
        
        setMetrics({
          sentQuotes,
          totalStock,
          pendingQuotes,
          pendingCatalogs,
          dbStatus: isSupabaseConfigured ? 'Supabase En Vivo' : 'Modo Fallback'
        });
      } catch (err) {
        console.error('Error loading dashboard metrics:', err);
      }
    };
    loadDashboardMetrics();
    
    // Listen to tab changes or history approvals to update metrics
    const interval = setInterval(loadDashboardMetrics, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle(selectedLoginEmail);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const [showRegisterOption, setShowRegisterOption] = useState(false);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setShowRegisterOption(false);
    if (!emailInput || !passwordInput) {
      setLoginError('Por favor ingrese su correo y contraseña.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { user, error } = await signInWithEmailPassword(emailInput, passwordInput);
      if (error) {
        setLoginError(error);
        if (isSupabaseConfigured && !error.includes('bloqueada')) {
          setShowRegisterOption(true);
        }
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError('Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailPasswordRegister = async () => {
    setLoginError(null);
    if (!emailInput || !passwordInput) {
      setLoginError('Por favor ingrese correo y contraseña.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { error: signUpError } = await signUpWithEmailPassword(emailInput, passwordInput);
      if (signUpError) {
        setLoginError(signUpError);
        return;
      }
      // Auto login after sign up
      const { error: signInError } = await signInWithEmailPassword(emailInput, passwordInput);
      if (signInError) {
        setLoginError(signInError);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setLoginError('Error al registrar la cuenta. Asegúrate de ingresar un correo corporativo válido.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign-Out failed:', err);
    }
  };

  // Descriptions of view based on role
  const getRoleHeaderInfo = () => {
    switch (currentRole) {
      case 'vendedor':
        return {
          title: 'Asistente de IA para Ventas y Comercial',
          desc: 'Consulta precios corporativos de lista en MXN, verifica existencias en tiempo real de almacenes centrales y genera cotizaciones en segundos.',
          badge: '💼 Vista Comercial Optimizada'
        };
      case 'soporte':
        return {
          title: 'Asistente de IA para Soporte y Garantías',
          desc: 'Resuelve dudas de clientes sobre garantías, fallas comunes y procedimientos de devolución, con acceso directo a manuales técnicos y políticas actualizadas.',
          badge: '🛠️ Soporte y Diagnóstico de TI'
        };
      case 'admin':
        return {
          title: 'Centro de Control y Validación de Catálogos',
          desc: 'Supervisa la carga y validación de catálogos, administra usuarios y roles del sistema, y respalda a Ventas en la aprobación de cotizaciones cuando es necesario.',
          badge: '👑 Panel de Control del Administrador'
        };
    }
  };

  const headerInfo = getRoleHeaderInfo();

  const getMetricLabels = () => {
    if (currentRole === 'soporte') {
      return {
        label1: 'Consultas resueltas hoy',
        label2: 'Garantías activas',
        label3: 'Manuales disponibles',
        label4: 'Revisiones de catálogos'
      };
    }
    if (currentRole === 'admin') {
      return {
        label1: 'Usuarios activos',
        label2: 'Catálogos por validar',
        label3: 'Cotizaciones pendientes (respaldo)',
        label4: 'Revisiones de catálogos'
      };
    }
    return {
      label1: 'Cotizaciones enviadas',
      label2: 'Stock total',
      label3: 'Cotizaciones pendientes por aprobar',
      label4: 'Revisiones de catálogos'
    };
  };

  const metricLabels = getMetricLabels();

  // -------------------------------------------------------------
  // RENDERING Auth Loading State
  // -------------------------------------------------------------
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin mb-4" />
        <span className="text-xs text-slate-500 font-medium">Estableciendo conexión segura...</span>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING Google Login Screen
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center font-sans relative selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
        
        {/* Background ambient glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md p-8 bg-slate-900/40 border border-slate-850 rounded-3xl backdrop-blur-xl shadow-2xl space-y-8 z-10 animate-in fade-in duration-300">
          
          {/* Header Branding */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold tracking-wide text-lg bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                SITE SOLUTIONS
              </h1>
              <span className="block text-xs font-semibold text-cyan-500 uppercase tracking-widest font-mono mt-0.5">
                Tech Catalog Portal
              </span>
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <h2 className="text-sm font-semibold text-slate-200">Ingreso al Asistente de IA</h2>
            <p className="text-xs text-slate-400 leading-relaxed px-4">
              Ingresa tus credenciales corporativas o accede mediante Google.
            </p>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl space-y-2 text-xs text-rose-400 animate-in fade-in duration-205 flex flex-col">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
                {showRegisterOption && (
                  <button
                    type="button"
                    onClick={handleEmailPasswordRegister}
                    className="text-left text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline transition-all self-start mt-1"
                  >
                    ¿Es tu primera vez? Regístrala dando clic aquí
                  </button>
                )}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-450 font-bold uppercase block">Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="usuario@sitesolutions.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-450 font-bold uppercase block">Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 disabled:opacity-50 text-white rounded-xl py-3 text-xs font-bold transition-all duration-200 active:scale-[0.98] shadow-lg shadow-cyan-950/20"
            >
              {isLoggingIn ? 'Verificando credenciales...' : 'Ingresar'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-850/60"></div>
            <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">O continuar con</span>
            <div className="flex-grow border-t border-slate-850/60"></div>
          </div>

          {/* Social Google Login Button */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 rounded-xl py-3.5 text-xs font-bold transition-all duration-200 active:scale-98 flex items-center justify-center gap-3 shadow-lg shadow-white/5 font-semibold"
          >
            <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.6c-.28 1.5-1.11 2.76-2.39 3.62v3.02h3.86c2.26-2.09 3.67-5.17 3.67-8.47z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.02c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.13C3.26 22.25 7.37 24 12 24z" />
              <path fill="#FBBC05" d="M5.27 14.27c-.25-.72-.39-1.5-.39-2.3 0-.8.14-1.58.39-2.3V6.54H1.29C.47 8.18 0 10.04 0 12s.47 3.82 1.29 5.46l3.98-3.19z" />
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 1.75 1.29 4.75l3.98 3.19c.95-2.85 3.6-4.96 6.73-4.96z" />
            </svg>
            <span>Iniciar Sesión con Google</span>
          </button>

          {/* Fallback Role Selector (Helper for testing different profiles without real Supabase connection) */}
          {!isSupabaseConfigured && (
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>Simular Cuenta de Google (Modo Demo)</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Selecciona con qué correo iniciarás sesión para simular los diferentes roles de la plataforma:
              </p>
              <select
                value={selectedLoginEmail}
                onChange={(e) => setSelectedLoginEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              >
                <option value="geeraa123@gmail.com">geeraa123@gmail.com (Rol: Administrador - Google)</option>
                <option value="admin@sitesolutions.com">admin@sitesolutions.com (Rol: Administrador)</option>
                <option value="ventas@sitesolutions.com">ventas@sitesolutions.com (Rol: Ventas)</option>
                <option value="soporte@sitesolutions.com">soporte@sitesolutions.com (Rol: Soporte)</option>
              </select>
            </div>
          )}

          {/* Database connection badge */}
          <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-slate-500 font-medium">
            <span>Conexión:</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono">{isSupabaseConfigured ? 'Supabase En Vivo' : 'Modo Fallback'}</span>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING Main Authenticated Dashboard Layout
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/70 border-b border-slate-900 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold tracking-wide text-sm bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                SITE SOLUTIONS
              </span>
              <span className="block text-[10px] font-semibold text-cyan-500 uppercase tracking-widest font-mono">
                Tech Catalog Portal
              </span>
            </div>
          </div>

          {/* Role selector */}
          {baseRole === 'admin' ? (
            <div className="flex items-center gap-3">
              {!isAdminMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Rol: <span className="text-cyan-400 capitalize font-semibold">{currentRole}</span></span>
                  <button
                    onClick={() => {
                      setIsAdminMode(true);
                      setCurrentRole('admin');
                      setActiveTab('administracion');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-rose-950/10"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Modo Admin</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-rose-400 font-bold hidden md:inline animate-pulse">👑 Cambiar Perfil (Admin):</span>
                  <div className="flex bg-slate-900/80 border border-slate-800 p-0.5 rounded-xl font-medium">
                    <button
                      onClick={() => setCurrentRole('vendedor')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        currentRole === 'vendedor' 
                          ? 'bg-slate-850 text-cyan-400 border border-slate-700/60 shadow-md shadow-slate-950/40' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Ventas</span>
                    </button>
                    <button
                      onClick={() => setCurrentRole('soporte')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        currentRole === 'soporte' 
                          ? 'bg-slate-850 text-amber-400 border border-slate-700/60 shadow-md shadow-slate-950/40' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Soporte</span>
                    </button>
                    <button
                      onClick={() => setCurrentRole('admin')}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        currentRole === 'admin' 
                          ? 'bg-slate-850 text-rose-400 border border-slate-700/60 shadow-md shadow-slate-950/40' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Admin TI</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setIsAdminMode(false);
                      setCurrentRole('vendedor');
                      setActiveTab('consulta');
                    }}
                    className="p-1.5 bg-slate-905 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold transition-all active:scale-95"
                    title="Salir de Modo Administrador"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 shadow-sm shadow-slate-950/20">
              <span className="text-slate-500 mr-1">Rol:</span>
              <span className="text-cyan-400 capitalize font-bold">{currentRole}</span>
            </div>
          )}

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            {/* Database connection badge */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800/80 rounded-xl px-3 py-1.5 shadow-sm">
              <Database className="w-3.5 h-3.5 text-cyan-500" />
              <span className="text-[10px] font-mono font-medium text-slate-300">
                {metrics.dbStatus}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-lg transition-all duration-300 ${
                currentRole === 'admin' 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                  : currentRole === 'soporte'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              }`}>
                {currentRole === 'admin' ? (
                  <Terminal className="w-4 h-4 animate-pulse" />
                ) : currentRole === 'soporte' ? (
                  <Wrench className="w-4 h-4" />
                ) : (
                  <Briefcase className="w-4 h-4" />
                )}
              </div>
              
              <div className="hidden lg:block text-left">
                <span className="text-xs font-semibold text-slate-200 block max-w-[120px] truncate leading-tight">
                  {user.user_metadata?.full_name || 'Usuario'}
                </span>
                <span className="text-[9px] text-slate-500 block max-w-[120px] truncate font-mono">
                  {user.email}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:text-rose-400 rounded-xl text-slate-450 hover:text-slate-200 transition-all active:scale-95"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto w-full">
        <div className="bg-slate-950/60 border border-slate-900 p-6 sm:p-8 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl relative flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
          
          <div className="space-y-3 max-w-2xl">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-cyan-500 px-3 py-1 bg-cyan-950/30 rounded-full border border-cyan-900/40">
              {headerInfo.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {headerInfo.title}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              {headerInfo.desc}
            </p>
          </div>

          {/* Metrics Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-[540px] shrink-0">
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block">{metricLabels.label1}</span>
              <strong className="text-lg font-bold text-slate-200 mt-1 block">{metrics.sentQuotes}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block">{metricLabels.label2}</span>
              <strong className="text-lg font-bold text-emerald-400 mt-1 block">{metrics.totalStock}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block">{metricLabels.label3}</span>
              <strong className="text-lg font-bold text-amber-400 mt-1 block">{metrics.pendingQuotes}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block">{metricLabels.label4}</span>
              <strong className="text-lg font-bold text-cyan-400 mt-1 block">{metrics.pendingCatalogs}</strong>
            </div>
          </div>

        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-16 space-y-6">
        
        {/* Navigation Tab Bar */}
        <div className="border-b border-slate-850/30 pb-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('consulta')}
              className={getTabClass('consulta')}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Asistente IA</span>
            </button>
            
            <button
              onClick={() => setActiveTab('productos')}
              className={getTabClass('productos')}
            >
              <Layers className="w-4 h-4" />
              <span>Catálogo de Equipos</span>
            </button>
            
            <button
              onClick={() => setActiveTab('historial')}
              className={getTabClass('historial')}
            >
              <History className="w-4 h-4" />
              <span>Historial</span>
            </button>

            {(currentRole === 'vendedor' || currentRole === 'admin') && (
              <button
                onClick={() => setActiveTab('aprobaciones')}
                className={getTabClass('aprobaciones')}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cotizaciones pendientes</span>
              </button>
            )}
            
            {isAdminMode && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={getTabClass('usuarios')}
              >
                <Users className="w-4 h-4" />
                <span>Usuarios</span>
              </button>
            )}

            {/* Administration Tab is unlocked when Admin Mode is active */}
            {isAdminMode && (
              <button
                onClick={() => setActiveTab('administracion')}
                className={getTabClass('administracion')}
              >
                <Settings className="w-4 h-4" />
                <span>Panel de Administración</span>
                {currentRole !== 'admin' && (
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab content renderer */}
        <div className="mt-6">
          {activeTab === 'consulta' && (
            <ChatInterface currentRole={currentRole} currentUser={user} />
          )}

          {activeTab === 'productos' && (
            <ProductPanel currentRole={currentRole} />
          )}

          {activeTab === 'historial' && (
            <HistoryPanel currentUser={user} />
          )}

          {activeTab === 'aprobaciones' && (
            <ApprovalsPanel currentUser={user} />
          )}

          {activeTab === 'administracion' && (
            <AdminPanel currentRole={currentRole} />
          )}

          {activeTab === 'usuarios' && (
            <UsersPanel currentUser={user} />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            © 2026 Site Solutions Inc. • Portal interno de consulta de infraestructura.
          </p>
          <div className="flex gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
              Ingesta Limpia
            </span>
            <span>•</span>
            <span>Auditoría de IA</span>
            <span>•</span>
            <span>Control de Calidad</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
