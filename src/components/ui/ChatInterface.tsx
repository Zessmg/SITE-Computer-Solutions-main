'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles, Server, Laptop, Network, HardDrive, ShieldCheck } from 'lucide-react';
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
      const queryLower = userMessage.text.toLowerCase();
      let matchedProduct = productsList.find(p => 
        queryLower.includes(p.sku.toLowerCase()) || 
        queryLower.includes(p.name.toLowerCase()) ||
        p.category.toLowerCase().includes(queryLower) ||
        (p.brand && queryLower.includes(p.brand.toLowerCase()))
      );

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

        responseText = `He localizado el equipo **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) en nuestra base de conocimientos. `;
        
        if (currentRole === 'vendedor') {
          responseText += `Actualmente contamos con un stock comercial de **${matchedProduct.stock} unidades** ubicadas en el **${warehouseText}**. El precio de lista corporativo es **$${matchedProduct.price.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN**.`;
        } else if (currentRole === 'soporte') {
          responseText += `La ficha de diagnóstico indica: **${solutionText}** (Versión de Firmware recomendada: \`${matchedProduct.support_info?.firmware_ver || 'v1.0'}\`).`;
        } else {
          responseText += `Especificaciones a nivel técnico: **${specsText}**`;
        }

        metadata = {
          sku: matchedProduct.sku,
          name: matchedProduct.name,
          price: matchedProduct.price,
          stock: matchedProduct.stock,
          warehouse: warehouseText,
          specs: specsText,
          solution: solutionText
        };
      } else {
        responseText = `He revisado el catálogo para "${userMessage.text}", pero no coincide con ningún SKU exacto o categoría principal. Te recomiendo buscar por 'Servidor', 'Laptop', 'Switch' o 'NAS'.`;
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
    
    try {
      const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
      await insertHistoryRecord({
        date: new Date().toISOString().split('T')[0],
        client: clientName,
        query: `Consulta de SKU: ${msg.metadata.sku} (${msg.metadata.name})`,
        response: msg.text,
        status: 'Aprobada',
        metadata: msg.metadata
      });

      setApprovedId(msg.id);
      setTimeout(() => setApprovedId(null), 3000);
    } catch (err) {
      console.error('Error approving query:', err);
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/40 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        approvedId === msg.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20 active:scale-95'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {approvedId === msg.id ? 'Aprobado con éxito' : 'Aprobar y enviar'}
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

      {/* Suggested prompts */}
      <div className="px-6 py-2.5 bg-slate-950/30 border-t border-slate-850 flex gap-2 overflow-x-auto text-xs whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setInputText('¿Qué stock tenemos del servidor de doble socket AMD?')}
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-full px-3.5 py-1.5 text-slate-300 transition-all active:scale-95"
        >
          🔍 Consultar Servidor
        </button>
        <button
          onClick={() => setInputText('¿Ficha de soporte para error 0xAF en switch o servidor?')}
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-full px-3.5 py-1.5 text-slate-300 transition-all active:scale-95"
        >
          🛠️ Reporte de Error 0xAF
        </button>
        <button
          onClick={() => setInputText('¿Precio y GPU de la laptop TitanBook?')}
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-full px-3.5 py-1.5 text-slate-300 transition-all active:scale-95"
        >
          💻 Specs de Workstation
        </button>
        <button
          onClick={() => setInputText('¿Qué almacenamiento NAS de 8 bahías recomiendan?')}
          className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 rounded-full px-3.5 py-1.5 text-slate-300 transition-all active:scale-95"
        >
          💾 Consultar NAS DataVault
        </button>
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
  );
}
