'use client';

import React, { useState, useEffect, useRef } from 'react';
import { fetchCatalogs, uploadCatalogFile, repairCatalogErrors, CatalogAsset } from '@/lib/supabase/client';
import { ShieldAlert, UploadCloud, FileSpreadsheet, FileText, CheckCircle, XCircle, AlertTriangle, Play, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';

interface AdminPanelProps {
  currentRole: 'vendedor' | 'soporte' | 'tecnico' | 'admin';
}

export default function AdminPanel({ currentRole }: AdminPanelProps) {
  const [catalogs, setCatalogs] = useState<CatalogAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCatalogForRepair, setSelectedCatalogForRepair] = useState<CatalogAsset | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCatalogs = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalogs();
      setCatalogs(data);
    } catch (err) {
      console.error('Error fetching catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole === 'admin') {
      loadCatalogs();
    }
  }, [currentRole]);

  // Handle real file upload change
  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = file.name;
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    setTimeout(async () => {
      try {
        const newCat = await uploadCatalogFile(fileName, fileSize);
        setCatalogs(prev => [newCat, ...prev]);
        
        if (newCat.status === 'Con error') {
          showToast(`⚠️ Alerta: El archivo "${newCat.fileName}" contiene errores.`);
        } else {
          showToast(`✅ Archivo "${newCat.fileName}" cargado y validado.`);
        }
      } catch (err) {
        console.error('Error uploading real file:', err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset input
        }
      }
    }, 1200);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Check extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['xlsx', 'pdf', 'docx', 'doc'].includes(extension)) {
      showToast('❌ Formato inválido. Solo se admiten .xlsx, .pdf, .docx o .doc');
      return;
    }

    setUploading(true);
    const fileName = file.name;
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    setTimeout(async () => {
      try {
        const newCat = await uploadCatalogFile(fileName, fileSize);
        setCatalogs(prev => [newCat, ...prev]);
        
        if (newCat.status === 'Con error') {
          showToast(`⚠️ Alerta: El archivo "${newCat.fileName}" contiene errores.`);
        } else {
          showToast(`✅ Archivo "${newCat.fileName}" cargado y validado.`);
        }
      } catch (err) {
        console.error('Error uploading dropped file:', err);
      } finally {
        setUploading(false);
      }
    }, 1200);
  };

  const handleRepair = async (id: string) => {
    try {
      const updated = await repairCatalogErrors(id);
      if (updated) {
        setCatalogs(prev => prev.map(c => c.id === id ? updated : c));
        setSelectedCatalogForRepair(null);
        showToast('✅ Errores corregidos. Archivo marcado como Validado.');
      }
    } catch (err) {
      console.error('Error repairing catalog:', err);
    }
  };

  const handlePublishAll = () => {
    const validUnpublished = catalogs.filter(c => c.status === 'Validado');
    if (validUnpublished.length === 0) {
      showToast('ℹ️ No hay nuevos catálogos validados listos para publicar.');
      return;
    }
    
    showToast('🚀 ¡Catálogos publicados con éxito! El asistente de IA ya los ha indexado.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Role Authorization Check
  if (currentRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 border border-slate-800 rounded-3xl backdrop-blur-xl text-center space-y-6 max-w-xl mx-auto my-10 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 shadow-lg shadow-rose-955/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">Acceso Restringido</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Esta sección de administración es exclusiva para Administradores de TI y Gestores de Base de Datos de Site Solutions.
          </p>
        </div>
        <div className="pt-2">
          <div className="text-xs px-4 py-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-xl font-medium inline-block">
            Tip: Cambia el perfil activo en la barra superior a "Personal Técnico" o "Administrador" (si habilitado) para explorar.
          </div>
        </div>
      </div>
    );
  }

  // Find any active error-status catalog for summary warning card
  const errorCatalogs = catalogs.filter(c => c.status === 'Con error');

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950/90 text-slate-100 border border-slate-850 px-5 py-3 rounded-xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Grid: Upload & Errors warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Module: Subir Catálogo */}
        <div className="lg:col-span-2 bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1.5">
              <UploadCloud className="w-5 h-5 text-cyan-500" />
              Módulo de Carga de Fichas y Catálogos
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Arrastra y suelta tus archivos o haz clic en el área inferior para subir tus catálogos maestros Excel (.xlsx), fichas técnicas PDF (.pdf) o documentos Word (.docx, .doc).
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRealFileUpload}
            accept=".xlsx,.pdf,.docx,.doc"
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none ${
              isDragActive
                ? 'border-cyan-550 bg-cyan-950/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/20 hover:bg-slate-900/30'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                <span className="text-xs font-semibold text-cyan-400">Validando estructura y consistencia de datos...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-cyan-400' : 'text-slate-550'}`} />
                <span className="text-xs font-bold text-slate-300">
                  {isDragActive ? '¡Suelta el archivo aquí!' : 'Arrastra tu archivo aquí o haz clic para explorar'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Formatos admitidos: Excel (.xlsx), PDF (.pdf), Word (.docx, .doc)
                </span>
              </div>
            )}
          </div>

          {/* Test Simulation controls underneath */}
          <div className="mt-4 flex gap-2.5 justify-end">
            <span className="text-[10px] text-slate-500 self-center mr-auto">Simular cargas de prueba:</span>
            <button
              type="button"
              onClick={() => {
                setUploading(true);
                setTimeout(async () => {
                  const newCat = await uploadCatalogFile('catalogo_inventario_con_error_temp.xlsx', '1.4 MB');
                  setCatalogs(prev => [newCat, ...prev]);
                  setUploading(false);
                  showToast('⚠️ Alerta: Simulación de error Excel cargada.');
                }, 1000);
              }}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] px-3.5 py-2.5 rounded-xl font-medium transition-all active:scale-95"
            >
              Simular Error Excel
            </button>

            <button
              type="button"
              onClick={() => {
                setUploading(true);
                setTimeout(async () => {
                  const newCat = await uploadCatalogFile('manual_usuario_con_error.docx', '2.5 MB');
                  setCatalogs(prev => [newCat, ...prev]);
                  setUploading(false);
                  showToast('⚠️ Alerta: Simulación de error Word cargada.');
                }, 1000);
              }}
              className="bg-slate-900 border border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] px-3.5 py-2.5 rounded-xl font-medium transition-all active:scale-95"
            >
              Simular Error Word
            </button>
          </div>
        </div>

        {/* Module: Punto de Control 1 - Alertas de Validación */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              Validación de Datos (Control de Calidad)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Punto de Control de ingesta de información para evitar respuestas erróneas del chatbot.
            </p>
          </div>

          {errorCatalogs.length > 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-4">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-400 block">Errores Pendientes</span>
                  <span className="text-[11px] text-slate-300 leading-relaxed block">
                    Se detectaron errores estructurales (SKUs duplicados, celdas de precio vacías) en {errorCatalogs.length} archivo(s).
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCatalogForRepair(errorCatalogs[0])}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-2 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Revisar errores
              </button>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4.5 flex gap-3.5 items-start">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-emerald-400 block">Estructuras Limpias</span>
                <span className="text-[11px] text-slate-400 leading-relaxed block">
                  Todos los catálogos activos cargados se encuentran completamente limpios, estructurados y listos para publicación.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monitoring Active Catalogs Table */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Catálogos Activos e Historial</h3>
            <p className="text-xs text-slate-400">Listado de fichas técnicas y tablas maestras procesadas por el sistema.</p>
          </div>

          <button
            onClick={handlePublishAll}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-cyan-950/20 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Validar y publicar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <th className="px-6 py-4">Nombre del Archivo</th>
                <th className="px-6 py-4">Fecha de Carga</th>
                <th className="px-6 py-4">Tamaño</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin mx-auto mb-2" />
                    <span className="text-xs text-slate-500">Cargando catálogos...</span>
                  </td>
                </tr>
              ) : catalogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 text-xs">
                    No hay catálogos cargados en el sistema de Site Solutions.
                  </td>
                </tr>
              ) : (
                catalogs.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-900/10 transition-all">
                    <td className="px-6 py-4 font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        {cat.fileName.endsWith('.pdf') ? (
                          <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="font-mono text-xs">{cat.fileName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {cat.uploadDate}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {cat.size}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        cat.status === 'Validado'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {cat.status === 'Validado' ? 'Validado' : 'Con error'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {cat.status === 'Con error' ? (
                          <button
                            onClick={() => setSelectedCatalogForRepair(cat)}
                            className="bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                          >
                            Revisar Errores
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold pr-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Listo
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repair Errors Modal / Dialog (Control 1 UI) */}
      {selectedCatalogForRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Depurador de Estructura de Catálogo
                </h3>
              </div>
              <button
                onClick={() => setSelectedCatalogForRepair(null)}
                className="text-slate-400 hover:text-slate-200 transition-all text-lg font-medium p-1 hover:bg-slate-850 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block uppercase font-semibold">Archivo Analizado:</span>
                <span className="text-xs font-mono text-cyan-400 block mt-0.5">{selectedCatalogForRepair.fileName}</span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-2 font-medium">Alertas de inconsistencia encontradas:</span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedCatalogForRepair.errors?.map((err, idx) => (
                    <div key={idx} className="flex gap-2.5 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-xs text-rose-300">
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-850 space-y-2">
                <span className="text-xs font-bold text-slate-200 block">Resolución de Datos Automática</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Al confirmar la auto-corrección, el sistema aplicará reglas de normalización: eliminar duplicados manteniendo el registro más reciente y rellenar celdas de precio vacías con el precio lista de fallback del SKU.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCatalogForRepair(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
              >
                Cancelar
              </button>
              
              <button
                onClick={() => handleRepair(selectedCatalogForRepair.id)}
                className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Auto-corregir y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
