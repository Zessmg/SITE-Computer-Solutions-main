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
  const [quotingState, setQuotingState] = useState<{
    step: 'idle' | 'waiting_client_name' | 'adding_products' | 'confirming_quantity_change';
    clientName?: string;
    selectedProducts: any[];
    pendingQuantity?: number;
    pendingQuantityChange?: {
      productSku: string;
      newQuantity: number;
    };
  }>({
    step: 'idle',
    selectedProducts: []
  });
  
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
      let activeStep = quotingState.step;

      // --- WIZARD COTIZACIONES FLOW ---
      if (activeStep === 'confirming_quantity_change') {
        if (cleanQuery === 'si' || cleanQuery === 'sí') {
          const skuToChange = quotingState.pendingQuantityChange?.productSku;
          const newQty = quotingState.pendingQuantityChange?.newQuantity || 1;
          
          const updatedProducts = quotingState.selectedProducts.map(p => {
            if (p.sku === skuToChange) {
              return { ...p, quantity: newQty };
            }
            return p;
          });

          // Calculate total and compatibility
          const totalVal = updatedProducts.reduce((acc, p) => acc + (p.price * (p.quantity || 1)), 0);
          
          const hasMotherboard = updatedProducts.some(p => p.category.toLowerCase().includes('madre') || p.category.toLowerCase().includes('motherboard'));
          const hasRam = updatedProducts.some(p => p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memoria'));
          
          let compatibilityStatus = 'OK';
          if (hasMotherboard && hasRam) {
            const isD5Motherboard = updatedProducts.some(p => (p.category.toLowerCase().includes('madre') || p.category.toLowerCase().includes('motherboard')) && p.description.toLowerCase().includes('ddr5'));
            const isD5Ram = updatedProducts.some(p => (p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memoria')) && p.description.toLowerCase().includes('ddr5'));
            
            const isD4Motherboard = updatedProducts.some(p => (p.category.toLowerCase().includes('madre') || p.category.toLowerCase().includes('motherboard')) && p.description.toLowerCase().includes('ddr4'));
            const isD4Ram = updatedProducts.some(p => (p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memoria')) && p.description.toLowerCase().includes('ddr4'));

            if ((isD5Motherboard && isD4Ram) || (isD4Motherboard && isD5Ram)) {
              compatibilityStatus = 'Incompatibilidad DDR4/DDR5';
            }
          }

          const currencySymbol = 'MXN';
          const itemsText = updatedProducts
            .map(p => `*   **${p.quantity || 1}x ${p.name}** - $${p.price.toLocaleString('es-MX')} ${currencySymbol} c/u ($${(p.price * (p.quantity || 1)).toLocaleString('es-MX')} ${currencySymbol})`)
            .join('\n');

          const quoteId = 'COT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
          const finalCard: ChatMessage = {
            id: quoteId,
            sender: 'assistant',
            text: `📋 **RESUMEN DE COTIZACIÓN AUTOGENERADA**\n` +
                  `**ID Cotización:** \`${quoteId}\`\n` +
                  `**Cliente:** \`${quotingState.clientName || 'General'}\`\n` +
                  `**Moneda:** MXN\n` +
                  `**Vigencia:** 30 días naturales\n\n` +
                  `**Equipos Solicitados:**\n${itemsText}\n\n` +
                  `**Compatibilidad de Componentes:** ${compatibilityStatus === 'OK' ? '✅ Compatible' : '❌ Conflicto Detectado: ' + compatibilityStatus}\n\n` +
                  `💰 **VALOR TOTAL: $${totalVal.toLocaleString('es-MX')} MXN**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            metadata: {
              clientName: quotingState.clientName || 'General',
              total: totalVal,
              products: updatedProducts,
              isQuotationCard: true
            }
          };

          setQuotingState({
            step: 'idle',
            selectedProducts: []
          });

          setMessages(prev => [...prev, finalCard]);
          setIsLoading(false);
          return;
        } else {
          // Cancelar confirmación de cambio de cantidad y proceder al paso estándar
          activeStep = 'adding_products';
          setQuotingState(prev => ({
            ...prev,
            step: 'adding_products',
            pendingQuantityChange: undefined
          }));
        }
      }

      if (activeStep === 'waiting_client_name') {
        const clientNameInput = userMessage.text.trim();
        const cleanNameInput = normalizeText(clientNameInput).replace(/[^a-z0-9]/g, '');
        
        const hasNumbers = /\d/.test(clientNameInput);
        const isEmpty = clientNameInput.length < 2;
        
        // Verificar que el nombre no contenga o sea similar a un SKU o nombre de producto de la base de datos
        const isComponent = productsList.some(p => {
          const skuClean = normalizeText(p.sku).replace(/[^a-z0-9]/g, '');
          const nameClean = normalizeText(p.name).replace(/[^a-z0-9]/g, '');
          return cleanNameInput.includes(skuClean) || cleanNameInput.includes(nameClean) || skuClean.includes(cleanNameInput);
        });

        // Términos genéricos de tecnología que no permitimos como nombre de cliente
        const techWords = ['ram', 'laptop', 'motherboard', 'mother', 'tarjeta', 'madre', 'procesador', 'cpu', 'gpu', 'disco', 'ssd', 'switch', 'servidor', 'server', 'memoria'];
        const isTechTerm = techWords.some(tw => cleanNameInput.includes(tw));

        if (isEmpty || hasNumbers || isComponent || isTechTerm) {
          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: `❌ **Nombre de cliente no aceptado.** Por favor, proporciona un nombre de persona o empresa real para continuar.\n\n*   No puede contener números.\n*   No puede ser el nombre o SKU de un componente del catálogo (ej: \`NB-A14X\`, \`TC-Z690\`, \`RAM\`, \`Laptop\`, etc.).\n*   Se permiten letras, acentos y caracteres especiales (ej: \`Cecilia Martínez\`).`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        setQuotingState(prev => ({
          ...prev,
          step: 'adding_products',
          clientName: clientNameInput
        }));

        const assistantMessage: ChatMessage = {
          id: 'm-' + Math.random().toString(36).substr(2, 9),
          sender: 'assistant',
          text: `Cliente registrado: **${clientNameInput}**.\n\nPor favor, escribe el **SKU** o nombre de los productos que deseas agregar, uno por uno. Cuando termines, haz clic en **'Finalizar Cotización'**.\n\n💡 **Guía de SKU Rápidos de nuestro catálogo (copia y pega)**:\n*   **Laptops**: \`NB-A14X\` (NovaByte NB-A14X), \`VX-Pro15\` (Vertex Systems VX-Pro15)\n*   **Tarjetas Madre**: \`TC-Z690\` (TechCore TC-Z690 - *Soporta DDR5*), \`TC-ITX-Mini\` (TechCore TC-ITX-Mini - *Soporta DDR4*)\n*   **Memorias RAM**: \`QL-DDR5-32\` (Quantum Line DDR5), \`OB-DDR4-16\` (OmniBytes DDR4)\n*   **Procesadores/GPUs**: \`FT-i9X-12C\` (Ferrotech CPU), \`NB-RTX90\` (NovaByte GPU)\n\n⚠️ **Reglas de Compatibilidad de RAM y Placa**:\n*   ✅ **Combinación Válida**: Placa DDR5 (\`TC-Z690\`) + Memoria DDR5 (\`QL-DDR5-32\`)\n*   ❌ **Combinación Inválida (Conflicto)**: Placa DDR5 (\`TC-Z690\`) + Memoria DDR4 (\`OB-DDR4-16\`)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }
      if (activeStep === 'adding_products') {
        // Si el usuario ingresa un número simple y ya hay productos en la lista, asumimos que quiere cambiar la cantidad
        const isSimpleNumber = userMessage.text.trim().match(/^(\d+)$/);
        if (isSimpleNumber && quotingState.selectedProducts.length > 0) {
          const newQty = parseInt(isSimpleNumber[1], 10);
          const targetProduct = quotingState.selectedProducts[quotingState.selectedProducts.length - 1];
          
          setQuotingState(prev => ({
            ...prev,
            step: 'confirming_quantity_change',
            pendingQuantityChange: {
              productSku: targetProduct.sku,
              newQuantity: newQty
            }
          }));

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: `¿Deseas cambiar la cantidad de **${targetProduct.name}** a **${newQty} unidades** y volver a cotizar?\n\n*   Responde **'Sí'** para confirmar y volver a cotizar.\n*   Escribe cualquier otra cosa para continuar editando.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        const wantsToFinish = ['no', 'no gracias', 'ninguno', 'listo', 'terminar', 'calcular', 'n'].includes(cleanQuery) && !quotingState.pendingQuantity;
        if (wantsToFinish) {
          if (quotingState.selectedProducts.length === 0) {
            const assistantMessage: ChatMessage = {
              id: 'm-' + Math.random().toString(36).substr(2, 9),
              sender: 'assistant',
              text: `No has agregado ningún producto todavía. Por favor, escribe un SKU (ej: \`NB-A14X\`) o escribe **'Cancelar'** para salir.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          }

          // Calculate total and compatibility
          const totalVal = quotingState.selectedProducts.reduce((acc, p) => acc + (p.price * (p.quantity || 1)), 0);
          
          const hasMotherboard = quotingState.selectedProducts.some(p => p.category.toLowerCase().includes('madre') || p.category.toLowerCase().includes('motherboard'));
          const hasRam = quotingState.selectedProducts.some(p => p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memoria'));
          
          let compatibilityStatus = 'OK';
          if (hasMotherboard && hasRam) {
            const isD5Motherboard = quotingState.selectedProducts.some(p => (p.category.toLowerCase().includes('madre') || p.category.toLowerCase().includes('motherboard')) && p.description.toLowerCase().includes('ddr5'));
            const isD5Ram = quotingState.selectedProducts.some(p => (p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memoria')) && p.description.toLowerCase().includes('ddr5'));
            
            const isD4Motherboard = quotingState.selectedProducts.some(p => (p.category.toLowerCase().includes('madre') || p.category.toLowerCase().includes('motherboard')) && p.description.toLowerCase().includes('ddr4'));
            const isD4Ram = quotingState.selectedProducts.some(p => (p.category.toLowerCase().includes('ram') || p.category.toLowerCase().includes('memoria')) && p.description.toLowerCase().includes('ddr4'));

            if ((isD5Motherboard && isD4Ram) || (isD4Motherboard && isD5Ram)) {
              compatibilityStatus = 'Incompatibilidad DDR4/DDR5';
            }
          }

          setQuotingState({ step: 'idle', selectedProducts: [] });

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: `He preparado el resumen final de la cotización para **${quotingState.clientName}**. Por favor, revisa los detalles a continuación antes de enviarla a autorización:`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            metadata: {
              isMultiProductQuote: true,
              clientName: quotingState.clientName,
              products: quotingState.selectedProducts,
              total: totalVal,
              compatibility: compatibilityStatus,
              vigencia: 'OK',
              moneda: 'MXN',
              status: 'Revisión'
            }
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        if (cleanQuery === 'cancelar') {
          setQuotingState({ step: 'idle', selectedProducts: [] });
          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: `Asistente de cotización cancelado y descartado.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        // Función auxiliar para parsear múltiples ítems (ej: "7 NB-A14X y 3 VX-Pro15")
        const parseMultipleItems = (text: string, normalizeFn: (s: string) => string) => {
          const parts = text.split(/\s+y\s+|\s+and\s+|\s*,\s*|\s*\+\s*/i);
          const results = [];
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const match = trimmed.match(/^(\d+)\s*(?:unidades?|u|un|pz|piezas?\s+(?:de\s+)?)?x?\s*(.+)$/i);
            if (match) {
              results.push({
                quantity: parseInt(match[1], 10),
                productSearchText: normalizeFn(match[2]),
                originalText: trimmed
              });
            } else {
              results.push({
                quantity: 1,
                productSearchText: normalizeFn(trimmed),
                originalText: trimmed
              });
            }
          }
          return results;
        };

        const parsedItems = parseMultipleItems(userMessage.text, normalizeText);

        // 1. Detectar si el usuario ingresó únicamente una cantidad (ej: "5 unidades" o "5")
        const qtyOnlyMatch = userMessage.text.trim().match(/^(\d+)\s*(?:unidades?|u|un|pz|piezas?)?\s*(?:de)?$/i);
        if (qtyOnlyMatch && parsedItems.length === 1 && parsedItems[0].productSearchText === '') {
          const quantity = parseInt(qtyOnlyMatch[1], 10);
          setQuotingState(prev => ({
            ...prev,
            pendingQuantity: quantity
          }));
          
          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: `De acuerdo, anotado: **${quantity} unidades**. ¿De qué producto o SKU de la lista deseas cotizar esta cantidad?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        // 2. Procesar la lista de productos encontrados
        const addedList: any[] = [];
        const failedSearches: string[] = [];

        for (const item of parsedItems) {
          // Si el usuario tenía una cantidad pendiente guardada del paso anterior
          let quantity = item.quantity;
          if (parsedItems.length === 1 && quotingState.pendingQuantity && quantity === 1) {
            quantity = quotingState.pendingQuantity;
          }

          const words = item.productSearchText.split(/\s+/).filter(w => w.length > 1);
          let foundProduct = productsList.find(p => {
            const skuNorm = normalizeText(p.sku);
            const nameNorm = normalizeText(p.name);
            const skuStrip = skuNorm.replace(/[^a-z0-9]/g, '');
            const searchStrip = item.productSearchText.replace(/[^a-z0-9]/g, '');
            
            if (skuStrip && searchStrip.includes(skuStrip)) return true;
            
            return item.productSearchText.includes(skuNorm) || words.some(word => {
              const wordStrip = word.replace(/[^a-z0-9]/g, '');
              return nameNorm.includes(word) || skuNorm.includes(word) || (wordStrip && skuStrip.includes(wordStrip));
            });
          });

          if (foundProduct) {
            const getMockValue = (key: string, category: string): string => {
              const cat = (category || '').toLowerCase();
              if (key === 'processor') {
                if (cat.includes('laptop')) return 'Intel Core i5-1245U';
                if (cat.includes('desktop')) return 'Intel Core i5-12400';
                if (cat.includes('mother') || cat.includes('madre')) return 'LGA1700';
                return 'x86/x64';
              }
              if (key === 'ram') {
                if (cat.includes('laptop')) return '8GB DDR4';
                if (cat.includes('desktop')) return '16GB DDR4';
                if (cat.includes('mother') || cat.includes('madre')) return '4x DDR5 slots';
                return 'N/A';
              }
              if (key === 'storage') {
                if (cat.includes('laptop')) return '512GB NVMe SSD';
                if (cat.includes('desktop')) return '1TB NVMe SSD';
                if (cat.includes('mother') || cat.includes('madre')) return '3x M.2 slots';
                return 'N/A';
              }
              return 'N/A';
            };

            const activeProduct = { ...foundProduct, quantity };
            if (!activeProduct.specs || activeProduct.specs.processor === 'N/A') {
              activeProduct.specs = {
                processor: getMockValue('processor', activeProduct.category),
                ram: getMockValue('ram', activeProduct.category),
                storage: getMockValue('storage', activeProduct.category),
                warranty_months: 12
              };
            }
            addedList.push(activeProduct);
          } else {
            const cleanedItemText = item.productSearchText.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanedItemText.includes('z790') || cleanedItemText.includes('tcz790')) {
              failedSearches.push(`❌ El producto **${item.originalText}** fue reemplazado por **TC-Z690**.`);
            } else {
              failedSearches.push(`❌ No se encontraron productos para: "${item.originalText}".`);
            }
          }
        }

        if (addedList.length > 0) {
          // Guardar en el estado de cotización
          setQuotingState(prev => ({
            ...prev,
            selectedProducts: [...prev.selectedProducts, ...addedList],
            pendingQuantity: undefined
          }));

          const currentList = [...quotingState.selectedProducts, ...addedList];
          const totalUnits = currentList.reduce((acc, p) => acc + (p.quantity || 1), 0);
          
          const addedSummaryText = addedList
            .map(p => `*   ✅ **${p.quantity || 1}x ${p.name}** ($${(p.price * (p.quantity || 1)).toLocaleString('es-MX')} MXN) agregado. (Precio unitario: $${p.price.toLocaleString('es-MX')} MXN)`)
            .join('\n');

          const failedSummaryText = failedSearches.length > 0
            ? `\n\n${failedSearches.join('\n')}`
            : '';

          const listSummaryText = currentList
            .map(p => `*   **${p.quantity || 1}x** ${p.name}`)
            .join('\n');

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: `${addedSummaryText}${failedSummaryText}\n\nLlevas un total de **${totalUnits} unidades** en la lista:\n${listSummaryText}\n\n¿Deseas agregar otro equipo? Escribe su SKU/cantidad, o haz clic en el botón **'Finalizar Cotización'** si has terminado.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          // Si falló toda la búsqueda, mantener la cantidad si existía
          if (quotingState.pendingQuantity) {
            setQuotingState(prev => ({ ...prev, pendingQuantity: quotingState.pendingQuantity }));
          }
          const cleanedText = userMessage.text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          let failText = `❌ No encontré ningún producto que coincida con "${userMessage.text}". Por favor, indícame un SKU exacto de la lista (ej: \`NB-A14X\`, \`TC-Z690\`, \`QL-DDR5-32\`) o escribe **'Listo'** si has terminado.`;
          
          if (cleanedText.includes('z790') || cleanedText.includes('tcz790')) {
            failText = `❌ El producto **${userMessage.text}** fue reemplazado por **TC-Z690**.`;
          }

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: failText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
        setIsLoading(false);
        return;
      }

      // --- PROCEDER CON EL BUSCADOR SEMANTICO NORMAL ---
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
        const queryCleaned = cleanQuery.replace(/[^a-z0-9]/g, '');
        if (queryCleaned.includes('z790') || queryCleaned.includes('tcz790')) {
          responseText = `El producto **TC-Z790** fue reemplazado por **TC-Z690**.`;
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

  const handleMultiQuoteAction = async (msg: ChatMessage, action: 'approve' | 'edit' | 'reject') => {
    if (!msg.metadata) return;
    
    // Actualizar estado local del mensaje
    setMessages(prev => prev.map(m => {
      if (m.id === msg.id && m.metadata) {
        return {
          ...m,
          metadata: {
            ...m.metadata,
            status: action === 'approve' ? 'Aprobada' : action === 'reject' ? 'Rechazada' : 'Editando'
          }
        };
      }
      return m;
    }));

    if (action === 'approve') {
      try {
        const clientName = msg.metadata.clientName || 'Cliente General';
        // Registrar en base de datos la cotización multi-producto
        await insertHistoryRecord({
          client: clientName,
          query: `Cotización Multi-producto (${msg.metadata.products.length} ítems)`,
          response: `Resumen de cotización total de $${msg.metadata.total.toLocaleString('es-MX')} MXN.`,
          status: 'Pendiente',
          metadata: {
            sku: 'MULTI',
            name: `Cotización: ${msg.metadata.products.map((p: any) => p.sku).join(', ')}`,
            price: msg.metadata.total,
            stock: 0,
            warehouse: 'Varios Almacenes',
            isMultiProduct: true,
            products: msg.metadata.products
          }
        });
        
        const confirmMsg: ChatMessage = {
          id: 'm-' + Math.random().toString(36).substr(2, 9),
          sender: 'assistant',
          text: `¡Cotización para **${clientName}** aprobada y enviada al supervisor! Se ha registrado el folio en la pestaña de **Autorización de Cotizaciones** bajo el estado **'Pendiente'** para la firma final.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, confirmMsg]);
      } catch (err) {
        console.error('Error insertando cotización multi-producto:', err);
      }
    } else if (action === 'reject') {
      const cancelMsg: ChatMessage = {
        id: 'm-' + Math.random().toString(36).substr(2, 9),
        sender: 'assistant',
        text: `Cotización para **${msg.metadata.clientName}** rechazada y descartada.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, cancelMsg]);
    } else if (action === 'edit') {
      // Activar modo edición en el wizard
      setQuotingState({
        step: 'adding_products',
        clientName: msg.metadata.clientName,
        selectedProducts: msg.metadata.products
      });
      const editMsg: ChatMessage = {
        id: 'm-' + Math.random().toString(36).substr(2, 9),
        sender: 'assistant',
        text: `Modo de edición activado. Llevas **${msg.metadata.products.length} productos** en la lista. Puedes escribir otro SKU para agregarlo, o presionar **'Finalizar Cotización'** cuando termines.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, editMsg]);
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
            onClick={() => {
              setQuotingState({
                step: 'waiting_client_name',
                selectedProducts: []
              });
              
              const initMessage: ChatMessage = {
                id: 'm-' + Math.random().toString(36).substr(2, 9),
                sender: 'assistant',
                text: 'Iniciando Asistente de Cotización. Por favor, escribe el nombre del cliente para comenzar.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
              setMessages(prev => [...prev, initMessage]);
            }}
            className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-all active:scale-[0.98] shadow-sm flex items-center justify-between"
          >
            <span>Cotizaciones</span>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          </button>
          
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
              
              {/* Previsualización de Cotización Multi-producto */}
              {msg.metadata?.isMultiProductQuote && (
                <div className="mt-4 p-5 bg-slate-900/90 rounded-2xl border border-slate-800 text-slate-200 space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-800 pb-2">
                    Revisar respuesta antes de enviar
                  </span>
                  
                  {/* Contenedor central - igual a la captura del mockup */}
                  <div className="bg-slate-950/70 border border-slate-850 p-4 rounded-xl space-y-3.5 font-mono text-xs">
                    <div className="border-b border-slate-900 pb-2 text-slate-400">
                      Cliente: <strong className="text-slate-200">{msg.metadata.clientName}</strong> | Consulta: Cotización
                    </div>
                    
                    <div className="space-y-1.5 py-1 text-slate-300">
                      {msg.metadata.products.map((p: any, idx: number) => {
                        const qty = p.quantity || 1;
                        const label = qty > 1 ? `${qty}x ${p.name}` : p.name;
                        const dotsCount = Math.max(4, 30 - label.length);
                        const dots = '.'.repeat(dotsCount);
                        const subtotal = p.price * qty;
                        return (
                          <div key={idx} className="flex justify-between">
                            <span>- {label} {dots}</span>
                            <span className="font-bold text-cyan-400">${subtotal.toLocaleString('es-MX')} MXN</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="border-t border-slate-900 pt-3 flex justify-between font-bold text-sm text-slate-200">
                      <span>TOTAL:</span>
                      <span>${msg.metadata.total.toLocaleString('es-MX')} MXN</span>
                    </div>
                  </div>
                  
                  {/* Badges de validación - igual a la captura del mockup */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                      Vigencia: OK
                    </span>
                    
                    {msg.metadata.compatibility === 'OK' ? (
                      <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                        Compatibilidad: OK
                      </span>
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 flex items-center gap-1">
                        Compatibilidad: {msg.metadata.compatibility}
                      </span>
                    )}
                    
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                      Moneda: MXN
                    </span>
                  </div>
                  
                  {/* Botones inferiores de acción - igual a la captura del mockup */}
                  {msg.metadata.status === 'Revisión' ? (
                    <div className="flex gap-2.5 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => handleMultiQuoteAction(msg, 'approve')}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                      >
                        Aprobar y enviar
                      </button>
                      <button
                        onClick={() => handleMultiQuoteAction(msg, 'edit')}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleMultiQuoteAction(msg, 'reject')}
                        className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-semibold text-white shadow-md transition-all active:scale-[0.98]"
                      >
                        Rechazar
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs font-bold text-slate-400 italic">
                      Estado: Cotización {msg.metadata.status}
                    </div>
                  )}
                </div>
              )}
              
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
        {quotingState.step === 'adding_products' && (
          <button
            type="button"
            id="finish-quote-btn"
            onClick={() => {
              setInputText('Listo');
              // Disparar envío
              setTimeout(() => {
                const submitBtn = document.getElementById('submit-msg-btn');
                submitBtn?.click();
              }, 50);
            }}
            className="px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-all active:scale-95 shadow-md shrink-0 animate-pulse"
          >
            Finalizar Cotización
          </button>
        )}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            quotingState.step === 'waiting_client_name'
              ? "Escribe el nombre del cliente (ej: Cecilia Martínez)..."
              : quotingState.step === 'adding_products'
              ? "Escribe un SKU (ej: NB-A14X) o nombre de producto a agregar..."
              : "Escribe una consulta técnica o comercial en lenguaje natural (ej. 'stock de servidores')..."
          }
          className="flex-1 bg-slate-900/90 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-505 placeholder-slate-500 focus:border-cyan-600 transition-all"
        />
        <button
          type="submit"
          id="submit-msg-btn"
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
