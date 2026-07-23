'use client';

import React, { useState, useEffect } from 'react';
import { fetchHistory, updateApprovalStatus, HistoryRecord } from '@/lib/supabase/client';
import { Search, Filter, Calendar, Eye, Check, X, ShieldAlert, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface HistoryPanelProps {
  currentUser?: any;
}

export default function HistoryPanel({ currentUser }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory(statusFilter, searchFilter);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [statusFilter, searchFilter]);

  const handleUpdateStatus = async (id: string, status: 'Aprobada' | 'Rechazada') => {
    try {
      const userEmail = currentUser?.email || 'supervisor@sitesolutions.com';
      const success = await updateApprovalStatus(id, status, userEmail);
      if (success) {
        // Refresh local state with metadata details
        const approvedAt = new Date().toISOString();
        setHistory(prev => prev.map(item => 
          item.id === id ? { 
            ...item, 
            status,
            metadata: { ...item.metadata, approvedBy: userEmail, approvedAt }
          } : item
        ));
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord(prev => prev ? { 
            ...prev, 
            status,
            metadata: { ...prev.metadata, approvedBy: userEmail, approvedAt }
          } : null);
        }
      }
    } catch (err) {
      console.error('Error updating approval status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-5 bg-slate-950/60 border border-slate-800 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 w-full max-w-md relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por cliente, consulta o términos de respuesta..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar Estado:</span>
          </div>
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {['Todos', 'Aprobada', 'Pendiente', 'Rechazada'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente / Origen</th>
                <th className="px-6 py-4">Consulta</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin" />
                      <span className="text-slate-400 text-xs">Cargando registros de auditoría...</span>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <span className="text-slate-400 font-medium">No se encontraron consultas registradas</span>
                      <span className="text-xs text-slate-600">Prueba ajustando los filtros de estado o la búsqueda.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                history.map((record) => {
                  const badgeColor = 
                    record.status === 'Aprobada'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : record.status === 'Rechazada'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                  return (
                    <tr key={record.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="px-6 py-4.5 whitespace-nowrap text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {record.date}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-medium text-slate-200">
                        {record.client}
                      </td>
                      <td className="px-6 py-4.5 max-w-xs truncate text-slate-400">
                        {record.query}
                      </td>
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              record.status === 'Aprobada' ? 'bg-emerald-400' : record.status === 'Rechazada' ? 'bg-rose-400' : 'bg-amber-400'
                            }`} />
                            {record.status}
                          </span>
                          {record.metadata?.approvedBy && (
                            <span className="text-[10px] text-slate-500 font-mono block leading-none" title={`Decisión por: ${record.metadata.approvedBy}`}>
                              {record.status === 'Aprobada' ? 'Por' : 'Por'}: {record.metadata.approvedBy.split('@')[0]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all border border-transparent hover:border-slate-700 active:scale-95"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {record.status === 'Pendiente' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(record.id, 'Aprobada')}
                                className="p-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-all border border-emerald-500/20 active:scale-95"
                                title="Aprobar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(record.id, 'Rechazada')}
                                className="p-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all border border-rose-500/20 active:scale-95"
                                title="Rechazar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Dialog / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">ID: {selectedRecord.id}</span>
                <h3 className="text-sm font-semibold text-slate-100">
                  Detalle de Consulta de Auditoría
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-200 transition-all text-lg font-medium p-1 hover:bg-slate-850 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-slate-500 block mb-1">Fecha de Registro</span>
                  <span className="text-slate-200 font-medium">{selectedRecord.date}</span>
                </div>
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-slate-500 block mb-1">Usuario / Cliente</span>
                  <span className="text-slate-200 font-medium">{selectedRecord.client}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1.5 font-medium">Pregunta del Colaborador:</span>
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 text-sm text-slate-100 italic">
                  "{selectedRecord.query}"
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 block mb-1.5 font-medium">Respuesta Generada por IA:</span>
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 text-sm text-slate-200 font-normal leading-relaxed whitespace-pre-wrap">
                  {selectedRecord.response}
                </div>
              </div>

              {/* Status Section */}
              <div className="flex flex-col gap-4 p-4 bg-slate-950/30 rounded-xl border border-slate-850">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Estado de Validación:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      selectedRecord.status === 'Aprobada'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : selectedRecord.status === 'Rechazada'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {selectedRecord.status}
                    </span>
                  </div>

                  {selectedRecord.status === 'Pendiente' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(selectedRecord.id, 'Aprobada')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-md shadow-emerald-950/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedRecord.id, 'Rechazada')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-md shadow-rose-950/20"
                      >
                        <X className="w-3.5 h-3.5" />
                        Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <ShieldAlert className="w-4 h-4 text-cyan-500" />
                      Decisión registrada e inmutable
                    </span>
                  )}
                </div>

                {selectedRecord.metadata?.approvedBy && (
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 text-xs text-slate-400 space-y-1 mt-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Trazabilidad de Auditoría:</span>
                    <div>
                      <span className="font-semibold text-slate-350">Procesado por:</span> {selectedRecord.metadata.approvedBy}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-350">Fecha de decisión:</span> {new Date(selectedRecord.metadata.approvedAt).toLocaleString('es-MX')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
