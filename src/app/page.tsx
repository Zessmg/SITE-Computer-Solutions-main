'use client';

import React, { useState, useEffect } from 'react';
import { isSupabaseConfigured, fetchHistory, fetchCatalogs } from '@/lib/supabase/client';
import ChatInterface from '@/components/ui/ChatInterface';
import HistoryPanel from '@/components/ui/HistoryPanel';
import AdminPanel from '@/components/ui/AdminPanel';
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
  Users 
} from 'lucide-react';

export default function Home() {
  const [currentRole, setCurrentRole] = useState<'vendedor' | 'soporte' | 'tecnico' | 'admin'>('vendedor');
  const [activeTab, setActiveTab] = useState<'consulta' | 'historial' | 'administracion'>('consulta');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Dashboard Metrics State
  const [metrics, setMetrics] = useState({
    totalProducts: 4,
    totalStock: 56,
    pendingApprovals: 1,
    dbStatus: 'Local Fallback'
  });

  // Load metrics dynamically from mock/Supabase database
  useEffect(() => {
    const loadDashboardMetrics = async () => {
      try {
        const history = await fetchHistory();
        const catalogs = await fetchCatalogs();
        const pending = history.filter(h => h.status === 'Pendiente').length;
        
        setMetrics({
          totalProducts: 4,
          totalStock: 56,
          pendingApprovals: pending,
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
  }, []);

  // Descriptions of view based on role
  const getRoleHeaderInfo = () => {
    switch (currentRole) {
      case 'vendedor':
        return {
          title: 'Asistente de IA para Ventas y Comercial',
          desc: 'Consulta precios corporativos de lista en USD, verifica existencias en tiempo real de almacenes centrales y genera cotizaciones en segundos.',
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
          <div className="grid grid-cols-2 gap-3 w-full md:w-80 shrink-0">
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Modelos Activos</span>
              <strong className="text-lg font-bold text-slate-200 mt-1 block">{metrics.totalProducts}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Stock Total</span>
              <strong className="text-lg font-bold text-emerald-400 mt-1 block">{metrics.totalStock}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Revisiones Pendientes</span>
              <strong className="text-lg font-bold text-amber-400 mt-1 block">{metrics.pendingApprovals}</strong>
            </div>
            <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-semibold block uppercase">Aseguramiento</span>
              <strong className="text-lg font-bold text-cyan-400 mt-1 block">100%</strong>
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
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'historial'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-950/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Panel de Trabajo / Historial</span>
            </button>
            
            {/* Administration Tab is visual feedback, simulated role restriction inside the Panel */}
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

          {activeTab === 'historial' && (
            <HistoryPanel />
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
