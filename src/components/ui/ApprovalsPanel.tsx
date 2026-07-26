'use client';

import React, { useState, useEffect } from 'react';
import { fetchHistory, updateApprovalStatus, HistoryRecord } from '@/lib/supabase/client';
import { Check, X, ShieldAlert, Sparkles, Clock, AlertCircle, FileText, CheckCircle2, User } from 'lucide-react';

interface ApprovalsPanelProps {
  currentUser?: any;
}

export default function ApprovalsPanel({ currentUser }: ApprovalsPanelProps) {
  const [pendingQuotes, setPendingQuotes] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadPending = async () => {
    setLoading(true);
    try {
      // Fetch only pending history records
      const data = await fetchHistory('Pendiente', '');
      setPendingQuotes(data);
    } catch (err) {
      console.error('Error fetching pending quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleProcessQuote = async (id: string, status: 'Aprobada' | 'Rechazada') => {
    setActioningId(id);
    try {
      const reviewerEmail = currentUser?.email || 'ventas@sitesolutions.com';
      const success = await updateApprovalStatus(id, status, reviewerEmail);
      if (success) {
        // Remove from local list of pending approvals
        setPendingQuotes(prev => prev.filter(q => q.id !== id));
      }
    } catch (err) {
      console.error('Error processing quote status:', err);
    } finally {
      setActioningId(null);
    }
  };

  // Helper to parse products from metadata safely (supports both single and multi-product formats)
  const getProductsList = (record: HistoryRecord) => {
    if (record.metadata?.products && Array.isArray(record.metadata.products)) {
      return record.metadata.products;
    }
    if (record.metadata?.sku) {
      return [{
        sku: record.metadata.sku,
        name: record.metadata.name || record.query,
        quantity: 1,
        price: record.metadata.price || 0
      }];
    }
    return [];
  };

  const getCompatibilityStatus = (products: any[]) => {
    const hasMotherboard = products.some(p => p.category?.toLowerCase().includes('madre') || p.category?.toLowerCase().includes('motherboard') || p.name?.toLowerCase().includes('z690') || p.name?.toLowerCase().includes('itx'));
    const hasRam = products.some(p => p.category?.toLowerCase().includes('ram') || p.category?.toLowerCase().includes('memoria') || p.name?.toLowerCase().includes('ddr'));
    
    if (hasMotherboard && hasRam) {
      const isD5Motherboard = products.some(p => (p.category?.toLowerCase().includes('madre') || p.category?.toLowerCase().includes('motherboard') || p.name?.toLowerCase().includes('z690')) && (p.description?.toLowerCase().includes('ddr5') || p.name?.toLowerCase().includes('z690')));
      const isD5Ram = products.some(p => (p.category?.toLowerCase().includes('ram') || p.category?.toLowerCase().includes('memoria')) && (p.description?.toLowerCase().includes('ddr5') || p.name?.toLowerCase().includes('ddr5')));
      
      const isD4Motherboard = products.some(p => (p.category?.toLowerCase().includes('madre') || p.category?.toLowerCase().includes('motherboard') || p.name?.toLowerCase().includes('itx')) && (p.description?.toLowerCase().includes('ddr4') || p.name?.toLowerCase().includes('itx')));
      const isD4Ram = products.some(p => (p.category?.toLowerCase().includes('ram') || p.category?.toLowerCase().includes('memoria')) && (p.description?.toLowerCase().includes('ddr4') || p.name?.toLowerCase().includes('ddr4')));

      if ((isD5Motherboard && isD4Ram) || (isD4Motherboard && isD5Ram)) {
        return 'Conflicto DDR4/DDR5';
      }
    }
    return 'Compatible';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Banner de Info */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Revisión de Cotizaciones
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bandeja exclusiva para Ventas y Administradores. Revisa y decide sobre las cotizaciones pendientes de clientes antes de su emisión formal.
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-400 font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>{pendingQuotes.length} pendientes</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin" />
          <span className="text-slate-400 text-xs font-semibold">Cargando bandeja de cotizaciones...</span>
        </div>
      ) : pendingQuotes.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4 backdrop-blur-xl shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
            <Check className="w-7 h-7 text-emerald-450" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-100">Bandeja al día</h3>
            <p className="text-xs text-slate-400 leading-relaxed px-4">
              No tienes cotizaciones pendientes de autorizar. Todas las solicitudes han sido procesadas correctamente.
            </p>
          </div>
        </div>
      ) : (
        /* Grid of pending quote cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pendingQuotes.map((record) => {
            const products = getProductsList(record);
            const total = record.metadata?.total || record.metadata?.price || 0;
            const compatibility = getCompatibilityStatus(products);
            const isCompatible = compatibility === 'Compatible';

            return (
              <div 
                key={record.id} 
                className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl hover:border-slate-700/60 transition-all group"
              >
                {/* Card Header */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-500 font-bold font-mono bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-850">
                      ID: {record.id}
                    </span>
                    <span className="text-[10px] text-slate-450 font-mono font-medium">
                      {record.date}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-350 font-bold">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Cliente: <span className="text-slate-100">{record.client || 'N/A'}</span></span>
                    </div>
                    <div className="text-[10px] text-slate-500 italic max-w-full truncate font-mono">
                      Consulta: "{record.query}"
                    </div>
                  </div>

                  <div className="h-px bg-slate-850/60" />

                  {/* Items list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ítems Cotizados</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {products.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                          <span className="text-slate-300 font-semibold truncate max-w-[200px]" title={p.name}>
                            {p.quantity || 1}x {p.name}
                          </span>
                          <span className="text-slate-500 font-mono text-[10px]">
                            ${(p.price * (p.quantity || 1)).toLocaleString('es-MX')} MXN
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-slate-850/60" />

                  {/* Compatibility Status & Price */}
                  <div className="flex items-center justify-between gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850 shadow-inner">
                    <div>
                      <span className="text-[9px] text-slate-500 block leading-none uppercase font-bold tracking-wider">Compatibilidad</span>
                      <span className={`inline-flex items-center text-[10px] font-bold mt-1.5 ${isCompatible ? 'text-emerald-450' : 'text-rose-450'}`}>
                        {isCompatible ? '✅ Compatible' : '❌ Conflicto'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block leading-none uppercase font-bold tracking-wider">Total Cotizado</span>
                      <strong className="text-sm font-extrabold text-cyan-400 mt-1 block">
                        ${total.toLocaleString('es-MX')} MXN
                      </strong>
                    </div>
                  </div>
                  
                  {/* Warning message if incompatible */}
                  {!isCompatible && (
                    <div className="flex items-center gap-1.5 p-2 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg font-semibold animate-pulse">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Incompatibilidad detectada en DDR4/DDR5 para esta cotización.</span>
                    </div>
                  )}
                </div>

                {/* Approve/Reject Buttons */}
                <div className="flex gap-2.5 mt-5">
                  <button
                    disabled={actioningId === record.id}
                    onClick={() => handleProcessQuote(record.id, 'Aprobada')}
                    className="flex-1 bg-emerald-600/15 hover:bg-emerald-600 disabled:opacity-40 text-emerald-400 hover:text-white rounded-xl py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 border border-emerald-500/20 shadow-md shadow-emerald-950/10"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aprobar</span>
                  </button>
                  
                  <button
                    disabled={actioningId === record.id}
                    onClick={() => handleProcessQuote(record.id, 'Rechazada')}
                    className="flex-1 bg-rose-600/15 hover:bg-rose-650 disabled:opacity-40 text-rose-400 hover:text-white rounded-xl py-2.5 text-xs font-bold transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 border border-rose-500/20 shadow-md shadow-rose-950/10"
                  >
                    <X className="w-4 h-4" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
