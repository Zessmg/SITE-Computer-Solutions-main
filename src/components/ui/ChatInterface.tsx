'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles, Server, Laptop, Network, HardDrive, ShieldCheck, Clock, FileText } from 'lucide-react';
import { ChatMessage, insertHistoryRecord, fetchProducts } from '@/lib/supabase/client';

interface ChatInterfaceProps {
  currentRole: 'vendedor' | 'soporte' | 'tecnico' | 'admin';
}

export default function ChatInterface({ currentRole }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text: '¡Hola! Soy el Asistente de IA de Site Solutions. Estoy listo para ayudarte con consultas técnicas de infraestructura, inventario y cotizaciones comerciales. ¿Qué equipo o SKU deseas consultar?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [approvedId, setApprovedId] = useState<string | null>(null);
  const [quotedSkus, setQuotedSkus] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'm-' + Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Fetch master products dynamically
    let productsList: any[] = [];
    try {
      productsList = await fetchProducts();
    } catch (err) {
      console.error('Error fetching products for chatbot:', err);
    }

    // Simulate AI response delay
    setTimeout(() => {
      // Función para normalizar texto (remueve acentos, mayúsculas y caracteres especiales)
      const normalizeText = (str: string) => 
        (str || '')
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[¡!.,?¿()]/g, "")
          .trim();

      const cleanQuery = normalizeText(userMessage.text);
      const words = cleanQuery.split(/\s+/).filter(w => w.length > 1);

      let matchedProduct = productsList.find(p => {
        const skuNorm = normalizeText(p.sku);
        const nameNorm = normalizeText(p.name);
        const categoryNorm = normalizeText(p.category);
        const descriptionNorm = normalizeText(p.description || '');
        
        // Si la consulta contiene el SKU exacto normalizado
        if (cleanQuery.includes(skuNorm)) return true;
        
        // Verificar si alguna palabra clave coincide con nombre, SKU, categoría o descripción
        return words.some(word => 
          nameNorm.includes(word) || 
          skuNorm.includes(word) ||
          categoryNorm.includes(word) ||
          descriptionNorm.includes(word)
        );
      });

      let responseText = '';
      let metadata: ChatMessage['metadata'] = undefined;

      if (matchedProduct) {
        // Build readable specs
        const specsText = typeof matchedProduct.specs === 'string'
          ? matchedProduct.specs
          : matchedProduct.specs 
          ? `${matchedProduct.specs.processor || ''}, ${matchedProduct.specs.ram || ''}, ${matchedProduct.specs.storage || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
          : 'N/A';

        const solutionText = matchedProduct.support_info?.solution || matchedProduct.support_info?.solution_steps || 'Contactar soporte técnico';
        const warehouseText = matchedProduct.warehouse_location || matchedProduct.warehouse || 'Almacén Central';

        if (cleanQuery.includes('compatib') || cleanQuery.includes('compatible')) {
          responseText = `**Compatibilidad Verificada**: El componente **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) es compatible. Si estás validando la memoria RAM Vertex/Quantum DDR5 con el socket LGA1700 de la tarjeta madre Z790, ten en cuenta que requiere versión de BIOS >= v2.3 para un arranque y frecuencias de memoria estables.`;
        } else if (cleanQuery.includes('garant')) {
          responseText = `El equipo **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) cuenta con una póliza de garantía oficial del fabricante por un plazo de **${matchedProduct.specs?.warranty_months || 12} meses**. La póliza cubre reemplazo directo y diagnóstico con Site Solutions.`;
        } else if (cleanQuery.includes('manual')) {
          responseText = `He localizado el manual técnico oficial y la guía de instalación de fábrica para el modelo **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`). Puedes descargar la documentación técnica adjunta.`;
        } else {
          responseText = `He localizado el equipo **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) en nuestra base de conocimientos. `;
          
          if (currentRole === 'vendedor') {
            responseText += `Actualmente contamos con un stock comercial de **${matchedProduct.stock} unidades** ubicadas en el **${warehouseText}**. El precio de lista corporativo es **$${matchedProduct.price.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN**.`;
          } else if (currentRole === 'soporte') {
            responseText += `La ficha de diagnóstico indica: **${solutionText}** (Versión de Firmware recomendada: \`${matchedProduct.support_info?.firmware_ver || 'v1.0'}\`).`;
          } else {
            responseText += `Especificaciones a nivel técnico: **${specsText}**`;
          }
        }

        const manualName = cleanQuery.includes('manual') 
          ? `Manual_Usuario_${matchedProduct.sku}.pdf`
          : cleanQuery.includes('garant')
          ? `Poliza_Garantia_SiteSolutions.pdf`
          : cleanQuery.includes('compatib')
          ? `Ficha_Tecnica_Compatibilidad_${matchedProduct.sku}.pdf`
          : `Ficha_Tecnica_${matchedProduct.sku}.pdf`;

        const manualUrl = `/documents?file=${manualName}`;

        metadata = {
          sku: matchedProduct.sku,
          name: matchedProduct.name,
          price: matchedProduct.price,
          stock: matchedProduct.stock,
          warehouse: warehouseText,
          specs: specsText,
          solution: solutionText,
          manual_url: manualUrl,
          manual_name: manualName
        };
      } else {
        const listKeywords = ['lista', 'catalogo', 'inventario', 'equipos', 'modelos', 'disponibles', 'que venden', 'que tienen'];
        
        // Verificar consultas sin producto especificado
        const isPriceQuery = cleanQuery === 'precio' || cleanQuery === 'precios' || cleanQuery.includes('precio') || cleanQuery.includes('costo') || cleanQuery.includes('cuanto cuesta');
        const isCompatQuery = cleanQuery.includes('compatible') || cleanQuery.includes('compatibilidad');
        const isWarrantyQuery = cleanQuery.includes('garant');
        const isManualQuery = cleanQuery.includes('manual');
        
        const isListRequest = listKeywords.some(keyword => cleanQuery.includes(keyword));

        if (isPriceQuery) {
          responseText = `¿De qué material o equipo ocupas saber el precio? Por favor, indícame el SKU o nombre del modelo del equipo que te interesa consultar.`;
        } else if (isCompatQuery) {
          responseText = `¿De qué componentes ocupas verificar la compatibilidad? Por favor, indícame la memoria RAM, procesador o tarjeta madre que deseas validar.`;
        } else if (isWarrantyQuery) {
          responseText = `¿De qué material o equipo deseas consultar la garantía? Por favor, indícame el SKU o nombre del modelo.`;
        } else if (isManualQuery) {
          responseText = `¿De qué material o equipo necesitas el manual de usuario? Por favor, indícame el SKU o nombre del modelo.`;
        } else if (isListRequest && productsList.length > 0) {
          responseText = `Actualmente contamos con los siguientes equipos en nuestro catálogo maestro de Site Solutions:\n\n`;
          responseText += `| SKU | Producto | Precio Lista (MXN) | Stock |\n`;
          responseText += `| :--- | :--- | :--- | :--- |\n`;
          
          // Mostrar los primeros 10 productos para no saturar la pantalla
          const displayProducts = productsList.slice(0, 10);
          displayProducts.forEach(p => {
            const priceVal = p.price || 0;
            responseText += `| \`${p.sku}\` | ${p.name} | $${Number(priceVal).toLocaleString('es-MX', {minimumFractionDigits: 2})} | ${p.stock} u. |\n`;
          });

          if (productsList.length > 10) {
            responseText += `\n*Mostrando 10 de ${productsList.length} productos disponibles. Puedes consultar cualquier SKU específico en el chat para iniciar una cotización.*`;
          } else {
            responseText += `\n*Puedes consultar cualquiera de estos SKUs en el chat para obtener detalles, existencias en almacenes o generar una cotización.*`;
          }
        } else {
          const greetings = ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'hello', 'hi', 'hey', 'que tal', 'saludos'];
          const isGreeting = greetings.some(g => cleanQuery === g || cleanQuery.startsWith(g + ' '));

          if (isGreeting) {
            responseText = `¡Hola! ¿Cómo puedo ayudarte hoy? Puedo asistirte con especificaciones técnicas, niveles de stock, precios de equipos o la autorización de cotizaciones.`;
          } else {
            responseText = `He revisado el catálogo para "${userMessage.text}", pero no coincide con ningún SKU exacto o categoría principal. Te recomiendo buscar por 'Servidor', 'Laptop', 'Switch' o 'NAS'.`;
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: 'm-' + Math.random().toString(36).substr(2, 9),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 900);
  };

  const handleApprove = async (msg: ChatMessage) => {
    if (!msg.metadata) return;
    const sku = msg.metadata.sku;
    if (quotedSkus.includes(sku)) return; // Evitar clicks duplicados
    
    try {
      const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
      await insertHistoryRecord({
        date: new Date().toISOString().split('T')[0],
        client: clientName,
        query: `Cotización de SKU: ${msg.metadata.sku} (${msg.metadata.name})`,
        response: msg.text,
        status: 'Pendiente',
        metadata: msg.metadata
      });

      setQuotedSkus(prev => [...prev, sku]);
      setApprovedId(msg.id);
    } catch (err) {
      console.error('Error approving query:', err);
    }
  };

  return (
    <div className="flex h-[650px] bg-slate-900/40 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Left Sidebar - Accesos Rápidos */}
      <div className="w-52 shrink-0 bg-slate-950/40 border-r border-slate-800/80 p-5 flex flex-col hidden sm:flex">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-4">ACCESOS RAPIDOS</span>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setInputText('Ficha técnica del equipo NovaByte NB-A14X')}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98] shadow-sm"
          >
            Ficha tecnica
          </button>
          <button
            type="button"
            onClick={() => setInputText('¿Es la memoria RAM Quantum Line QL-DDR5-32 compatible con la placa TechCore TC-Z790?')}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98] shadow-sm"
          >
            Compatibilidad
          </button>
          <button
            type="button"
            onClick={() => setInputText('¿Cuál es la garantía y cobertura para el procesador Ferrotech FT-i9X-12C?')}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98] shadow-sm"
          >
            Garantias
          </button>
          <button
            type="button"
            onClick={() => setInputText('¿Dónde encuentro el manual de usuario o guía de la laptop Vertex Systems VX-Pro15?')}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all active:scale-[0.98] shadow-sm"
          >
            Manuales
          </button>
        </div>
      </div>

      {/* Right Content - Chat area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 bg-slate-950/60 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Asistente IA SiteCore
            </h2>
            <p className="text-xs text-slate-400">
              Motor semántico optimizado para perfil: <span className="capitalize font-medium text-cyan-400">{currentRole}</span>
            </p>
          </div>
        </div>
        <div className="text-xs px-3 py-1 bg-slate-800/80 rounded-full border border-slate-700 text-slate-300">
          Respuestas revisadas por humanos
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] rounded-2xl px-5 py-4 ${
              msg.sender === 'user'
                ? 'bg-cyan-600 text-white rounded-br-none shadow-md shadow-cyan-950/20'
                : 'bg-slate-950/70 text-slate-200 border border-slate-800/80 rounded-bl-none shadow-lg'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-line">{msg.text}</div>
              
              {/* Technical Attachment Card */}
              {msg.sender === 'assistant' && msg.metadata && msg.metadata.manual_url && (
                <div className="mt-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-center gap-2.5 shadow-sm">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block mb-0.5">Adjunto Técnico</span>
                    <a 
                      href={msg.metadata.manual_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="underline font-mono font-medium hover:text-amber-300 block truncate"
                    >
                      {msg.metadata.manual_name || 'Ficha_Tecnica_General.pdf'}
                    </a>
                  </div>
                </div>
              )}
              
              {/* Product metadata card if assistant reply has info */}
              {msg.sender === 'assistant' && msg.metadata && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">SKU</span>
                      <strong className="text-slate-200 font-mono">{msg.metadata.sku}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Precio Lista</span>
                      <strong className="text-cyan-400">${msg.metadata.price?.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Disponibilidad</span>
                      <strong className="text-emerald-400">{msg.metadata.stock} unidades</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Almacén</span>
                      <strong className="text-slate-200 truncate block">{msg.metadata.warehouse}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-4 mt-2">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                      Ficha verificada
                    </div>
                    <button
                      onClick={() => handleApprove(msg)}
                      disabled={quotedSkus.includes(msg.metadata.sku)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        quotedSkus.includes(msg.metadata.sku)
                          ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950/20 active:scale-95'
                      }`}
                    >
                      {quotedSkus.includes(msg.metadata.sku) ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                          <span>Enviada para Autorización</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-cyan-200" />
                          <span>Crear Cotización (Por Autorizar)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <span className={`text-[10px] block text-right mt-2 ${
                msg.sender === 'user' ? 'text-cyan-200' : 'text-slate-500'
              }`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-950/70 text-slate-400 border border-slate-800 rounded-2xl px-5 py-4 rounded-bl-none flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs">Consultando catálogo semántico...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950/60 border-t border-slate-800 flex gap-3">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe una consulta técnica o comercial en lenguaje natural (ej. 'stock de servidores')..."
          className="flex-1 bg-slate-900/90 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-505 placeholder-slate-500 focus:border-cyan-600 transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white rounded-xl px-5 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-all active:scale-95 shadow-md shadow-cyan-950/30"
        >
          <Send className="w-4 h-4" />
          <span>Enviar</span>
        </button>
      </form>
      </div>
    </div>
  );
}
