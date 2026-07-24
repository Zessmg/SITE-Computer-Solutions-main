'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchHistory, updateApprovalStatus, deleteHistoryRecord, HistoryRecord } from '@/lib/supabase/client';
import { Search, Filter, Calendar, Eye, Check, X, ShieldAlert, Sparkles, Clock, AlertCircle, ChevronDown, Download, Trash2 } from 'lucide-react';

interface HistoryPanelProps {
  currentUser?: any;
}

export default function HistoryPanel({ currentUser }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchFilter, setSearchFilter] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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

  // Reset pagination page, selections and fetch history when filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
    setIsConfirmingBulkDelete(false);
    loadHistory();
  }, [statusFilter, searchFilter]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Delete Record Handler
  const handleDelete = async (id: string) => {
    try {
      const success = await deleteHistoryRecord(id);
      if (success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        setSelectedIds(prev => prev.filter(item => item !== id));
        setSelectedRecord(null);
        setIsConfirmingDelete(false);
      }
    } catch (err) {
      console.error('Error deleting history record:', err);
    }
  };

  const closeModal = () => {
    setSelectedRecord(null);
    setIsConfirmingDelete(false);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // Spanish character encoding BOM
    csvContent += 'Fecha,Cliente,Consulta,Estado,Revisor,Fecha Decision\n';
    
    history.forEach(item => {
      const formattedDate = formatDateTime(item.date, item.metadata);
      const client = `"${(item.client || '').replace(/"/g, '""')}"`;
      const query = `"${(item.query || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const status = `"${item.status || ''}"`;
      const revisor = `"${(item.metadata?.approvedBy || 'N/A').replace(/"/g, '""')}"`;
      const decisionDate = `"${(item.metadata?.approvedAt || 'N/A').replace(/"/g, '""')}"`;
      
      csvContent += `${formattedDate},${client},${query},${status},${revisor},${decisionDate}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'historial_cotizaciones.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Date and Time formatter helper
  const formatDateTime = (dateStr: string, metadata?: any) => {
    if (!dateStr) return 'N/A';
    if (metadata?.approvedAt) {
      try {
        const d = new Date(metadata.approvedAt);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } catch (e) {}
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]} 12:00`;
    }
    return dateStr;
  };

  // Paginated Slicing
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);

  // Selection handlers
  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening detailed modal
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const currentPageIds = currentItems.map(item => item.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const isAllCurrentPageSelected = currentItems.length > 0 && currentItems.map(item => item.id).every(id => selectedIds.includes(id));

  // Bulk Delete execute
  const executeBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map(id => deleteHistoryRecord(id)));
      setHistory(prev => prev.filter(item => !selectedIds.includes(item.id)));
      setSelectedIds([]);
      setIsConfirmingBulkDelete(false);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error executing bulk delete:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-205">
      {/* Title & Info Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Historial de Cotizaciones y Consultas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Revisa el registro de auditoría, las respuestas proporcionadas por la IA y valida las cotizaciones comerciales emitidas por el chatbot.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl shadow-md">
        
        {/* Search Input Box */}
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por cliente, producto o fecha..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-955 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-600 transition-all font-medium"
          />
        </div>

        {/* Dropdown status Filter, Export and Bulk Delete button */}
        <div className="flex items-center gap-3 justify-end shrink-0">
          
          {/* Bulk Delete Confirm Action */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-950/65 border border-rose-500/25 px-3 py-1.5 rounded-xl animate-in zoom-in duration-200">
              {!isConfirmingBulkDelete ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingBulkDelete(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-350 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Borrar ({selectedIds.length})</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-rose-400">¿Confirmas borrar {selectedIds.length} {selectedIds.length === 1 ? 'registro' : 'registros'}?</span>
                  <button
                    onClick={executeBulkDelete}
                    className="px-2 py-1 bg-rose-650 hover:bg-rose-600 text-white rounded-lg transition-all"
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setIsConfirmingBulkDelete(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg transition-all"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Dropdown Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-955 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98]"
            >
              <Filter className="w-3.5 h-3.5 text-cyan-500" />
              <span>Filtrar: {statusFilter}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="py-1">
                  {['Todos', 'Aprobada', 'Pendiente', 'Rechazada'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(status);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-all font-semibold block ${
                        statusFilter === status
                          ? 'bg-cyan-655 text-cyan-400 bg-cyan-955/30'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-955 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900/10 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500/50 focus:ring-offset-slate-900 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">FECHA</th>
                <th className="px-6 py-4">CONSULTA</th>
                <th className="px-6 py-4 text-center">ESTADO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-7 h-7 rounded-full border-2 border-slate-805 border-t-cyan-500 animate-spin" />
                      <span className="text-slate-400 text-xs font-medium">Cargando registros...</span>
                    </div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-700" />
                      <span className="text-slate-450 font-semibold text-xs">No se encontraron cotizaciones en el historial</span>
                      <span className="text-[10px] text-slate-600">Ajusta los filtros de búsqueda o realiza una nueva cotización con el chatbot.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((record) => {
                  const isApproved = record.status === 'Aprobada';
                  const isRejected = record.status === 'Rechazada';
                  
                  const pillColor = 
                    isApproved
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5'
                      : isRejected
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5';

                  const dotColor = isApproved ? 'bg-emerald-450' : isRejected ? 'bg-rose-450' : 'bg-amber-450';

                  return (
                    <tr 
                      key={record.id} 
                      onClick={() => setSelectedRecord(record)}
                      className={`hover:bg-slate-900/35 transition-all cursor-pointer ${
                        selectedIds.includes(record.id) ? 'bg-cyan-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record.id)}
                          onChange={(e) => handleToggleSelect(record.id, e as any)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-cyan-600 focus:ring-cyan-500/50 focus:ring-offset-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-450 font-mono font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatDateTime(record.date, record.metadata)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-200 max-w-lg truncate">
                        <div className="flex flex-col gap-0.5">
                          <span>{record.query}</span>
                          {record.client && (
                            <span className="text-[10px] text-slate-500 font-medium font-mono leading-none">
                              Cliente: {record.client}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold border shadow-inner tracking-wide ${pillColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />
                            {record.status === 'Pendiente' ? 'Pendiente' : record.status === 'Editando' ? 'Editada' : record.status}
                          </span>
                          {record.metadata?.approvedBy && (
                            <span className="text-[8px] text-slate-500 font-mono block leading-none font-bold" title={`Decisión por: ${record.metadata.approvedBy}`}>
                              Por: {record.metadata.approvedBy.split('@')[0]}
                            </span>
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 bg-slate-955 border-t border-slate-800/80 flex justify-between items-center text-xs">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-slate-955 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 disabled:hover:bg-slate-955 rounded-xl font-bold text-slate-300 disabled:opacity-30 transition-all active:scale-[0.98]"
            >
              Anterior
            </button>
            <span className="text-slate-450 font-semibold font-mono text-[10px]">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-slate-955 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 disabled:hover:bg-slate-955 rounded-xl font-bold text-slate-300 disabled:opacity-30 transition-all active:scale-[0.98]"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Details Dialog / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-955 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold font-mono">ID COTIZACIÓN: {selectedRecord.id}</span>
                <h3 className="text-sm font-bold text-slate-100">
                  Detalles Completos del Registro
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-200 transition-all text-lg font-medium p-1 hover:bg-slate-850 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block mb-1 font-semibold uppercase">Fecha y Hora</span>
                  <span className="text-slate-200 font-bold">{formatDateTime(selectedRecord.date, selectedRecord.metadata)}</span>
                </div>
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] block mb-1 font-semibold uppercase">Cliente Asignado</span>
                  <span className="text-slate-200 font-bold">{selectedRecord.client || 'N/A'}</span>
                </div>
              </div>

              {selectedRecord.metadata && selectedRecord.metadata.price !== undefined && (
                <div className="bg-slate-950/60 p-4.5 rounded-2xl border border-slate-850 space-y-3.5 shadow-inner">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Valores Comerciales Ofrecidos</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Equipo(s) Cotizado(s)</span>
                      <strong className="text-xs text-slate-200 font-semibold block mt-0.5 truncate">
                        {selectedRecord.metadata.name || 'N/A'}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">SKU: {selectedRecord.metadata.sku}</span>
                    </div>
                    <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-2.5 flex flex-col justify-center items-center text-center">
                      <span className="text-[9px] text-cyan-400 font-medium block uppercase leading-none">Precio Ofrecido</span>
                      <strong className="text-sm font-extrabold text-cyan-400 mt-1.5 leading-none">
                        ${Number(selectedRecord.metadata.price).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                      <span className="text-[8px] text-slate-500 block mt-1 font-mono uppercase">MXN</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-500 block mb-1.5 font-bold uppercase">Consulta del Cliente:</span>
                <div className="bg-slate-955 p-4 rounded-xl border border-slate-850 text-xs text-slate-200 italic font-mono">
                  "{selectedRecord.query}"
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1.5 font-bold uppercase">Respuesta Generada por IA:</span>
                <div className="bg-slate-955 p-4 rounded-xl border border-slate-850 text-xs text-slate-200 font-normal leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
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
                    <span className="text-[11px] text-amber-550 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      Pendiente de validación en la pestaña de Aprobaciones.
                    </span>
                  ) : (
                    <span className="text-xs text-slate-550 flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-4 h-4 text-cyan-500" />
                      Decisión registrada e inmutable
                    </span>
                  )}
                </div>

                {selectedRecord.metadata?.approvedBy && (
                  <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 text-xs text-slate-400 space-y-1 mt-1 font-medium">
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
            <div className="px-6 py-4 bg-slate-955 border-t border-slate-800 flex justify-between items-center">
              <div>
                {!isConfirmingDelete ? (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/10 hover:bg-rose-650 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-rose-500/20 active:scale-95 shadow-md shadow-rose-950/10 animate-in fade-in"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Registro</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-150">
                    <span className="text-[10px] text-rose-450 font-bold">¿Confirmas borrar?</span>
                    <button
                      onClick={() => handleDelete(selectedRecord.id)}
                      className="px-2.5 py-1.5 bg-rose-655 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold transition-all active:scale-95 shadow-sm"
                    >
                      Sí, borrar
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={closeModal}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
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
