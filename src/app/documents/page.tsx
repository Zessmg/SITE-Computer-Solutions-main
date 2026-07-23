'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  HelpCircle, 
  Info, 
  Cpu, 
  Building,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { fetchProducts } from '@/lib/supabase/client';

const getMockValue = (key: string, category: string, brand: string, sku: string): string => {
  const cat = (category || '').toLowerCase();
  
  if (key === 'processor') {
    if (cat.includes('laptop')) return 'Intel Core i5-1245U (hasta 4.4GHz, 10 Cores)';
    if (cat.includes('desktop')) return 'Intel Core i5-12400 (hasta 4.4GHz, 6 Cores)';
    if (cat.includes('mother') || cat.includes('madre')) return 'Socket Intel LGA1700 (12ª/13ª/14ª Gen)';
    if (cat.includes('graf') || cat.includes('video')) return 'GPU Clock 1410 MHz / Boost 1620 MHz';
    return 'Compatibilidad universal x86/x64';
  }
  
  if (key === 'ram') {
    if (cat.includes('laptop')) return '8GB DDR4 3200MHz SO-DIMM';
    if (cat.includes('desktop')) return '16GB DDR4 3200MHz DIMM';
    if (cat.includes('mother') || cat.includes('madre')) return '4x DDR5 DIMM slots (hasta 192GB, 5600MHz)';
    if (cat.includes('graf') || cat.includes('video')) return '12GB GDDR6 (192-bit)';
    return 'N/A (Módulo independiente)';
  }
  
  if (key === 'storage') {
    if (cat.includes('laptop')) return '512GB NVMe PCIe M.2 SSD';
    if (cat.includes('desktop')) return '1TB NVMe PCIe M.2 SSD';
    if (cat.includes('mother') || cat.includes('madre')) return '3x M.2 NVMe PCIe 4.0, 4x SATA III';
    if (cat.includes('graf') || cat.includes('video')) return 'Interfaz PCIe 4.0 x16';
    return 'N/A';
  }
  
  if (key === 'graphics') {
    if (cat.includes('laptop')) return 'Intel Iris Xe Graphics';
    if (cat.includes('desktop')) return 'Intel UHD Graphics 730';
    if (cat.includes('mother') || cat.includes('madre')) return 'Salidas HDMI 2.1 / DisplayPort 1.4';
    if (cat.includes('graf') || cat.includes('video')) return 'Nvidia GeForce RTX';
    return 'N/A';
  }
  
  if (key === 'power_consumption_tdp') {
    if (cat.includes('laptop')) return '45W (Adaptador USB-C de 65W)';
    if (cat.includes('desktop')) return '180W (Fuente integrada 80 Plus)';
    if (cat.includes('mother') || cat.includes('madre')) return 'Conector ATX 24-pin + EPS 8-pin';
    if (cat.includes('graf') || cat.includes('video')) return '170W (TDP sugerido: Fuente 550W+)';
    return '1.2V - 1.35V de bajo voltaje';
  }
  
  if (key === 'dimensions') {
    if (cat.includes('laptop')) return '32.4 x 22.5 x 1.79 cm';
    if (cat.includes('desktop')) return '29.0 x 9.2 x 34.0 cm';
    if (cat.includes('mother') || cat.includes('madre')) return '30.5 x 24.4 cm (Formato ATX)';
    if (cat.includes('graf') || cat.includes('video')) return '24.2 x 11.2 x 4.0 cm (Dual-slot)';
    return '13.3 x 3.4 x 0.7 cm';
  }
  
  if (key === 'weight') {
    if (cat.includes('laptop')) return '1.45 kg';
    if (cat.includes('desktop')) return '5.20 kg';
    if (cat.includes('mother') || cat.includes('madre')) return '1.10 kg';
    if (cat.includes('graf') || cat.includes('video')) return '0.85 kg';
    return '0.04 kg';
  }

  return 'N/A';
};

export default function DocumentViewer() {
  const searchParams = useSearchParams();
  const fileName = searchParams.get('file') || 'Ficha_Tecnica_General.pdf';
  const [product, setProduct] = useState<any>(null);
  const [docType, setDocType] = useState<string>('Ficha Técnica');
  const [sku, setSku] = useState<string>('General');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse fileName to extract SKU and document type
    // Examples: Ficha_Tecnica_NB-A14X.pdf, Manual_Usuario_VX-Pro15.pdf, Poliza_Garantia_SiteSolutions.pdf
    let extractedSku = 'General';
    let type = 'Ficha Técnica';

    const cleanName = fileName.replace('.pdf', '');

    if (cleanName.startsWith('Manual_Usuario_')) {
      type = 'Manual de Usuario';
      extractedSku = cleanName.replace('Manual_Usuario_', '');
    } else if (cleanName.startsWith('Poliza_Garantia_')) {
      type = 'Póliza de Garantía';
      extractedSku = cleanName.replace('Poliza_Garantia_', '');
    } else if (cleanName.startsWith('Ficha_Tecnica_Compatibilidad_')) {
      type = 'Ficha de Compatibilidad';
      extractedSku = cleanName.replace('Ficha_Tecnica_Compatibilidad_', '');
    } else if (cleanName.startsWith('Ficha_Tecnica_')) {
      type = 'Ficha Técnica';
      extractedSku = cleanName.replace('Ficha_Tecnica_', '');
    }

    setDocType(type);
    setSku(extractedSku);

    const loadProductData = async () => {
      setLoading(true);
      try {
        const productsList = await fetchProducts();
        const found = productsList.find(p => p.sku.toLowerCase() === extractedSku.toLowerCase());
        setProduct(found || null);
      } catch (err) {
        console.error('Error fetching product for document:', err);
      } finally {
        setLoading(false);
      }
    };

    if (extractedSku !== 'General') {
      loadProductData();
    } else {
      setLoading(false);
    }
  }, [fileName]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-cyan-600 animate-bounce mb-3" />
        <span className="text-sm text-slate-400 font-mono">Cargando documento corporativo...</span>
      </div>
    );
  }

  // Fallback product data if not found in db but SKU is Z790
  const activeProduct = product || (sku.toUpperCase() === 'TC-Z790' ? {
    sku: 'TC-Z790',
    name: 'TechCore TC-Z790',
    category: 'Tarjeta madre',
    brand: 'TechCore',
    price: 5200,
    stock: 7,
    warehouse_location: 'Almacén de Distribución B-01',
    description: 'Tarjeta madre ATX gama alta con overclock compatible con DDR5',
    specs: {
      processor: 'Soporte Intel Core 12va/13va Gen (LGA1700)',
      ram: 'DDR5 5600MHz (hasta 128GB)',
      storage: '4x M.2 NVMe PCIe 4.0, 6x SATA III',
      graphics: 'Soporte Multi-GPU PCIe 5.0 x16',
      power_consumption_tdp: 'N/A',
      operating_temp: '0°C - 65°C',
      warranty_months: 24
    },
    support_info: {
      common_issue: 'Incompatibilidad de memoria DDR5 en BIOS iniciales.',
      solution: 'Actualizar la BIOS a la versión >= v2.3 para un arranque y frecuencias de memoria estables.',
      firmware_ver: 'v2.3.0'
    }
  } : null);

  return (
    <div className="min-h-screen bg-[#070b19] print:bg-white text-slate-100 print:text-slate-900 pb-12 font-sans">
      {/* Top Navbar for interactive view, hidden on print */}
      <div className="bg-[#0b132b]/80 border-b border-slate-800/80 sticky top-0 backdrop-blur-md px-6 py-4 flex justify-between items-center shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 rounded-lg bg-slate-850 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all flex items-center gap-1.5 text-xs font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Portal</span>
          </a>
          <div className="w-px h-5 bg-slate-800" />
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono text-slate-400">{fileName}</span>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 text-xs font-semibold shadow-lg shadow-cyan-950/20 transition-all active:scale-95"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / Guardar PDF</span>
        </button>
      </div>

      {/* Main Document Body */}
      <div className="max-w-[800px] mx-auto mt-6 bg-[#0c1633] print:bg-white print:shadow-none border border-slate-800/80 print:border-none p-10 md:p-14 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decorative Watermark background */}
        <div className="absolute inset-0 opacity-[0.01] print:opacity-[0.03] pointer-events-none flex items-center justify-center">
          <FileText className="w-[500px] h-[500px] text-white print:text-black" />
        </div>

        {/* Corporate Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-2 border-slate-800 print:border-slate-300 pb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-100 print:text-slate-900 tracking-tight">SITE SOLUTIONS</span>
            </div>
            <span className="text-[10px] text-cyan-400 print:text-cyan-700 font-bold uppercase tracking-wider block">Catálogo de Infraestructura de TI</span>
          </div>
          <div className="text-left md:text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-cyan-950/80 print:bg-slate-100 border border-cyan-800/30 print:border-slate-300 text-[10px] font-bold text-cyan-400 print:text-slate-700 uppercase tracking-widest mb-2">
              {docType}
            </span>
            <div className="text-[10px] text-slate-400 print:text-slate-500 space-y-0.5 font-mono">
              <div>Ref: DOC-{sku.toUpperCase() || 'GEN'}-2026</div>
              <div>Fecha: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Document Body */}
        {activeProduct ? (
          <div className="mt-8 space-y-8 relative z-10">
            {/* Header Product description */}
            <div>
              <h1 className="text-xl font-bold text-slate-100 print:text-slate-900 mb-2">{activeProduct.name}</h1>
              <p className="text-xs text-slate-400 print:text-slate-600 leading-relaxed font-mono">
                {activeProduct.description || 'Ficha oficial de especificaciones técnicas y cobertura de soporte.'}
              </p>
            </div>

            {/* Document Content Switch based on type */}
            {docType === 'Ficha Técnica' && (
              <>
                {/* Specs Table */}
                <div className="space-y-4">
                  <h2 className="text-xs font-bold text-cyan-400 print:text-cyan-700 uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>Especificaciones Técnicas</span>
                  </h2>
                  <div className="border border-slate-800 print:border-slate-300 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/50 print:bg-slate-50 border-b border-slate-800 print:border-slate-300">
                          <th className="p-3 font-semibold text-slate-300 print:text-slate-700 w-1/3">Parámetro</th>
                          <th className="p-3 font-semibold text-slate-300 print:text-slate-700">Valor de Fábrica</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 print:divide-slate-300 text-slate-300 print:text-slate-800">
                        <tr>
                          <td className="p-3 font-medium bg-slate-900/10 w-1/3">SKU Oficial</td>
                          <td className="p-3 font-mono font-bold text-cyan-400 print:text-cyan-700">{activeProduct.sku}</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium bg-slate-900/10">Categoría</td>
                          <td className="p-3">{activeProduct.category}</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium bg-slate-900/10">Marca / Fabricante</td>
                          <td className="p-3">{activeProduct.brand}</td>
                        </tr>
                        {activeProduct.specs && Object.entries(activeProduct.specs).map(([key, val]: [string, any]) => {
                          if (key === 'warranty_months') return null;
                          const labels: Record<string, string> = {
                            processor: 'Procesador / Socket',
                            ram: 'Capacidad Memoria (RAM)',
                            storage: 'Almacenamiento / Bahías',
                            graphics: 'Controladora Gráfica / Red',
                            power_consumption_tdp: 'Consumo (TDP)',
                            operating_temp: 'Temperatura de Operación',
                            dimensions: 'Dimensiones Físicas',
                            weight: 'Peso'
                          };
                          
                          // Rellenar en automático los N/A con información ficticia realista
                          const displayValue = (val === 'N/A' || !val) 
                            ? getMockValue(key, activeProduct.category, activeProduct.brand, activeProduct.sku)
                            : val;

                          return (
                            <tr key={key}>
                              <td className="p-3 font-medium bg-slate-900/10 capitalize">{labels[key] || key}</td>
                              <td className="p-3">{displayValue}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="p-3 font-medium bg-slate-900/10">Garantía Directa</td>
                          <td className="p-3 font-semibold text-emerald-400 print:text-emerald-700">{activeProduct.specs?.warranty_months || 12} meses oficiales</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warehouse Location Info */}
                <div className="bg-slate-900/30 print:bg-slate-50 border border-slate-800 print:border-slate-300 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 print:text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Control de Inventario y Almacenaje</span>
                  </h3>
                  <p className="text-xs text-slate-400 print:text-slate-600">
                    Ubicación asignada de stock: <strong className="text-slate-300 print:text-slate-850">{activeProduct.warehouse_location || 'Almacén Central A-02'}</strong>.
                  </p>
                </div>
              </>
            )}

            {docType === 'Manual de Usuario' && (
              <>
                {/* Installation steps */}
                <div className="space-y-4">
                  <h2 className="text-xs font-bold text-cyan-400 print:text-cyan-700 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Instrucciones de Instalación Rápida</span>
                  </h2>
                  <ol className="list-decimal pl-5 space-y-3.5 text-xs text-slate-300 print:text-slate-700">
                    <li>
                      <strong>Desembalaje Seguro:</strong> Extraiga el componente de su empaque original antiestático. Asegúrese de contar con pulsera a tierra antes del manejo de las placas lógicas.
                    </li>
                    <li>
                      <strong>Montaje Físico:</strong> Fije el equipo en la bahía de expansión o socket respectivo. Para procesadores, aplique pasta térmica de alta conductividad antes de anclar el disipador.
                    </li>
                    <li>
                      <strong>Conexiones Eléctricas:</strong> Conecte las líneas de energía reguladas correspondientes. Valide el TDP máximo del equipo antes de encender la fuente de poder principal.
                    </li>
                    <li>
                      <strong>Validación inicial de BIOS:</strong> Encienda el módulo de cómputo y verifique la detección correcta del SKU en la pantalla de POST del BIOS.
                    </li>
                  </ol>
                </div>

                {/* Support and Diagnostics info */}
                {activeProduct.support_info && (
                  <div className="bg-[#0b1735]/40 print:bg-amber-50 border border-amber-900/30 print:border-amber-300 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-amber-400 print:text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Nota de Soporte Técnico y Diagnóstico</span>
                    </h3>
                    <div className="text-xs space-y-2 text-slate-300 print:text-slate-700">
                      <div><strong className="text-amber-500/90 print:text-amber-800">Falla común:</strong> {activeProduct.support_info.common_issue}</div>
                      <div><strong className="text-emerald-400 print:text-emerald-800">Acción recomendada:</strong> {activeProduct.support_info.solution}</div>
                      <div className="font-mono text-[10px] text-slate-400 mt-1">Versión de firmware recomendada: {activeProduct.support_info.firmware_ver}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {docType === 'Póliza de Garantía' && (
              <>
                {/* Warranty Clauses */}
                <div className="space-y-4">
                  <h2 className="text-xs font-bold text-cyan-400 print:text-cyan-700 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Cláusulas de Cobertura de Garantía Corporativa</span>
                  </h2>
                  <div className="text-xs text-slate-300 print:text-slate-700 space-y-3 leading-relaxed">
                    <p>
                      1. <strong>Plazo de Cobertura:</strong> La presente póliza de garantía cubre el componente por un periodo de <strong>{activeProduct.specs?.warranty_months || 12} meses oficiales</strong> a partir de la fecha de entrega y facturación.
                    </p>
                    <p>
                      2. <strong>Alcance de Cobertura:</strong> Cubre reparación de componentes físicos o reemplazo directo por un modelo idéntico o de prestaciones equivalentes, en caso de fallas por defectos de fabricación bajo condiciones normales de uso.
                    </p>
                    <p>
                      3. <strong>Exclusiones de Cobertura:</strong> La garantía quedará inmediatamente anulada ante daños por descargas eléctricas externas, maltrato físico, overclocking sin refrigeración adecuada, o modificaciones del número de serie o firmware oficial sin la debida autorización escrita de Site Solutions.
                    </p>
                    <p>
                      4. <strong>Trámite de RMA:</strong> Para hacer válida esta garantía, el supervisor o vendedor debe levantar el reporte correspondiente a través de este portal, adjuntando la bitácora de auditoría autorizada.
                    </p>
                  </div>
                </div>
              </>
            )}

            {docType === 'Ficha de Compatibilidad' && (
              <>
                {/* Compatibility details */}
                <div className="space-y-4">
                  <h2 className="text-xs font-bold text-cyan-400 print:text-cyan-700 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Matriz de Compatibilidad</span>
                  </h2>
                  <div className="text-xs text-slate-300 print:text-slate-700 space-y-4">
                    <p className="leading-relaxed">
                      El componente **{activeProduct.name}** (SKU: \`${activeProduct.sku}\`) ha sido validado bajo estándares industriales de control de calidad. A continuación se detallan las pautas de integración con otros módulos de hardware:
                    </p>
                    <div className="border border-slate-800 print:border-slate-300 rounded-xl p-4 bg-slate-900/30 print:bg-slate-50 space-y-2">
                      <h4 className="font-semibold text-slate-200 print:text-slate-850">Pauta de Socket y Chipset</h4>
                      <p className="text-slate-400 print:text-slate-600">
                        Compatible con placas basadas en socket LGA1700 / AM5 y chipsets de la serie Z790, B650 y superiores. Para memorias DDR5 de alta frecuencia, es imperativo contar con fuentes de poder certificadas 80 Plus Gold de mínimo 750W.
                      </p>
                    </div>
                    {activeProduct.support_info && (
                      <div className="bg-emerald-950/20 print:bg-emerald-50 border border-emerald-900/30 print:border-emerald-300 rounded-xl p-4 space-y-1">
                        <h4 className="font-semibold text-emerald-400 print:text-emerald-850 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Requerimiento Mínimo de BIOS</span>
                        </h4>
                        <p className="text-slate-400 print:text-slate-600">
                          {activeProduct.support_info.solution}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mt-8 py-10 text-center relative z-10">
            <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-300 mb-1">SKU General / Documento No Especificado</h3>
            <p className="text-xs text-slate-500 max-w-[400px] mx-auto leading-relaxed">
              No hemos localizado un producto específico con la clave proporcionada en el archivo `fileName`. Mostrando plantilla técnica de póliza de garantía general de Site Solutions.
            </p>
            <div className="mt-6 border border-slate-800 rounded-xl p-4 bg-slate-900/30 text-left text-xs max-w-[500px] mx-auto text-slate-400">
              <span className="font-bold text-slate-200 block mb-1">Garantía General Corporativa:</span>
              Todos los equipos suministrados por Site Solutions cuentan con garantía básica de 12 meses. Póngase en contacto con soporte técnico escribiendo al chat del portal o vía correo de TI.
            </div>
          </div>
        )}

        {/* Corporate Footer / Stamps */}
        <div className="mt-14 pt-8 border-t border-slate-800 print:border-slate-300 flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10">
          <div>
            <div className="font-mono text-[9px] text-slate-500 print:text-slate-400">
              CÓDIGO DE BARRAS DE SEGURIDAD
            </div>
            <div className="font-mono text-[10px] text-slate-400 print:text-slate-600 tracking-[0.25em] mt-1 bg-slate-900/60 print:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-800/80 print:border-slate-200">
              *SOLUTIONS-TECH-{sku.toUpperCase() || 'GEN'}*
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-cyan-800/30 print:border-slate-300 flex flex-col items-center justify-center text-center opacity-60">
              <span className="text-[7px] font-bold text-cyan-500 print:text-slate-500 uppercase tracking-widest leading-none">Site Solutions</span>
              <span className="text-[9px] font-bold text-cyan-400 print:text-slate-700 tracking-tighter mt-0.5">APROBADO</span>
              <span className="text-[7px] text-slate-500 font-mono mt-1">2026-07</span>
            </div>
            <span className="text-[9px] text-slate-500 print:text-slate-400 mt-2 font-mono">Sello de Auditoría Digital</span>
          </div>
        </div>
      </div>
    </div>
  );
}
