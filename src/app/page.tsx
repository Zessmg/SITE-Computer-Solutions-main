'use client';

import React, { useState, useEffect } from 'react';
import { 
  isSupabaseConfigured, 
  fetchHistory, 
  fetchCatalogs, 
  fetchProducts,
  getCurrentUser, 
  signInWithGoogle, 
  signOutUser 
} from '@/lib/supabase/client';
import ChatInterface from '@/components/ui/ChatInterface';
import HistoryPanel from '@/components/ui/HistoryPanel';
import ApprovalsPanel from '@/components/ui/ApprovalsPanel';
import AdminPanel from '@/components/ui/AdminPanel';
import ProductPanel from '@/components/ui/ProductPanel';
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
  LogOut
} from 'lucide-react';

export default function Home() {
  const [currentRole, setCurrentRole] = useState<'vendedor' | 'soporte' | 'tecnico' | 'admin'>('vendedor');
  const [activeTab, setActiveTab] = useState<'consulta' | 'historial' | 'aprobaciones' | 'administracion' | 'productos'>('consulta');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedLoginEmail, setSelectedLoginEmail] = useState('admin@sitesolutions.com');
  
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
          // Set initial role automatically based on email address
          const email = currentUser.email?.toLowerCase() || '';
          if (email.startsWith('admin') || email === 'geeraa123@gmail.com') {
            setCurrentRole('admin');
            setIsAdminMode(true);
            setActiveTab('consulta');
          } else if (email.startsWith('soporte')) {
            setCurrentRole('soporte');
            setIsAdminMode(false);
            setActiveTab('consulta');
          } else if (email.startsWith('tecnico')) {
            setCurrentRole('tecnico');
            setIsAdminMode(false);
            setActiveTab('consulta');
          } else {
            setCurrentRole('vendedor');
            setIsAdminMode(false);
            setActiveTab('consulta');
          }
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
          title: 'Asistente de IA para Soporte Técnico 24/7',
          desc: 'Busca diagnósticos rápidos de hardware corporativo, consulta incidencias recurrentes de clientes, firmas de firmware y estados de garantía.',
          badge: '🛠️ Vista de Diagnóstico de Soporte'
        };
      case 'tecnico':
        return {
          title: 'Asistente de Especificación de Silicio',
          desc: 'Detalles profundos de arquitectura de CPU, sockets de motherboard, requerimientos térmicos (TDP), voltajes y esquemas de placa madre.',
          badge: '⚡ Vista de Ingeniería Hardware'
        };
      case 'admin':
        return {
          title: 'Asistente de Control y Carga de Catálogos',
          desc: 'Carga nuevos catálogos maestros Excel y PDF, depura errores estructurales del control de calidad e indexa la información en el motor de IA.',
          badge: '👑 Panel de Control del Administrador'
        };
    }
  };

  const headerInfo = getRoleHeaderInfo();

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
              Conéctate de forma segura con tu cuenta de correo corporativa de Google.
            </p>
          </div>

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
                <option value="vendedor@sitesolutions.com">vendedor@sitesolutions.com (Rol: Ventas)</option>
                <option value="soporte@sitesolutions.com">soporte@sitesolutions.com (Rol: Soporte)</option>
                <option value="tecnico@sitesolutions.com">tecnico@sitesolutions.com (Rol: Técnico)</option>
              </select>
            </div>
          )}

          {/* Social Google Login Button */}
          <button
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
                    onClick={() => setCurrentRole('tecnico')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      currentRole === 'tecnico' 
                        ? 'bg-slate-850 text-cyan-400 border border-slate-700/60 shadow-md shadow-slate-950/40' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Técnico</span>
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
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-slate-800 bg-slate-900"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.email?.charAt(0)}
                </div>
              )}
              
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
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Cotizaciones Enviadas</span>
              <strong className="text-lg font-bold text-slate-200 mt-1 block">{metrics.sentQuotes}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Stock Total</span>
              <strong className="text-lg font-bold text-emerald-400 mt-1 block">{metrics.totalStock}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Cotizaciones pendientes por aprobar</span>
              <strong className="text-lg font-bold text-amber-400 mt-1 block">{metrics.pendingQuotes}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Revisiones Catálogos</span>
              <strong className="text-lg font-bold text-cyan-400 mt-1 block">{metrics.pendingCatalogs}</strong>
            </div>
          </div>

        </div>
      </section>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pb-16 space-y-6">
        
        {/* Navigation Tab Bar */}
        <div className="flex border-b border-slate-850 items-center justify-between">
          <div className="flex gap-1.5 -mb-px">
            <button
              onClick={() => setActiveTab('consulta')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'consulta'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Portal de Consulta</span>
            </button>
            
            <button
              onClick={() => setActiveTab('productos')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'productos'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Catálogo de Equipos</span>
            </button>
            
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'historial'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Historial</span>
            </button>

            {(currentRole === 'vendedor' || currentRole === 'admin') && (
              <button
                onClick={() => setActiveTab('aprobaciones')}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'aprobaciones'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cotizaciones pendientes</span>
              </button>
            )}
            
            {/* Administration Tab is unlocked when Admin Mode is active */}
            {isAdminMode && (
              <button
                onClick={() => setActiveTab('administracion')}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'administracion'
                    ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Panel de Administración</span>
                {currentRole !== 'admin' && (
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-600 animate-pulse" />
                )}
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Portal interno de consulta de infraestructura • Site Solutions Inc.
          </div>
        </div>

        {/* Tab content renderer */}
        <div className="mt-6">
          {activeTab === 'consulta' && (
            <ChatInterface currentRole={currentRole} />
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
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-auto bg-slate-950 border-t border-slate-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            © 2026 Site Solutions Inc. Todos los derechos reservados.
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
