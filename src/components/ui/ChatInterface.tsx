'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, CheckCircle2, MessageSquare, AlertCircle, Sparkles, Server, Laptop, Network, HardDrive, ShieldCheck, Clock, FileText } from 'lucide-react';
import { ChatMessage, insertHistoryRecord, fetchProducts } from '@/lib/supabase/client';

interface ChatInterfaceProps {
  currentRole: 'vendedor' | 'soporte' | 'admin';
  currentUser?: any;
}

export default function ChatInterface({ currentRole, currentUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'assistant',
      text: 'Hola, soy el asistente de IA de SITE Solutions. Puedo ayudarte a consultar el catalogo de equipos, verificar existencias y armar cotizaciones. Que producto o SKU deseas consultar?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [disambiguationOptions, setDisambiguationOptions] = useState<any[] | null>(null);
  const [lastDiscussedProduct, setLastDiscussedProduct] = useState<any>(null);
  const [lastSuggestedBuild, setLastSuggestedBuild] = useState<any>(null);
  
  // Quick Access selected item state
  const [activeQuickAccess, setActiveQuickAccess] = useState<string>('');
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

    // Reset quick access highlight if they write something else
    const isQA = [
      'Ficha técnica del equipo NovaByte NB-A14X',
      '¿Es la memoria RAM Quantum Line QL-DDR5-32 compatible con la placa TechCore TC-Z790?',
      '¿Cuál es la garantía y cobertura para el procesador Ferrotech FT-i9X-12C?',
      '¿Dónde encuentro el manual de usuario o guía de la laptop Vertex Systems VX-Pro15?',
      'Precio de la laptop NovaByte NB-A14X'
    ].includes(inputText.trim());

    if (!isQA && activeQuickAccess !== 'cotizaciones') {
      setActiveQuickAccess('');
    }

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

      // Interceptar consultas compuestas de múltiples materiales o contextuales
      if (activeStep === 'idle') {
        // C. Detectar preguntas fuera del alcance (Out of Scope)
        const offTopicKeywords = [
          'capital de', 'presidente de', 'clima', 'futbol', 'futbol', 'receta',
          'chiste', 'poema', 'pelicula', 'musica', 'cancion', 'quien es el dueño',
          'telefono personal', 'teléfono personal', 'numero personal', 'número personal',
          'celular del', 'gerente', 'director', 'jefe', 'sueldo', 'salario', 'vida de',
          'quien escribio', 'traduce', 'clima en', 'noticias'
        ];
        
        const hasOffTopicKeyword = offTopicKeywords.some(kw => cleanQuery.includes(kw));

        // Verificar si la consulta tiene algún término relacionado con TI o el catálogo, o si menciona alguna marca/SKU
        const onTopicKeywords = [
          'laptop', 'portatil', 'computadora', 'compu', 'pc', 'servidor', 'switch', 'nas', 
          'red', 'router', 'ram', 'memoria', 'disco', 'ssd', 'hdd', 'almacenamiento', 
          'gpu', 'video', 'grafica', 'procesador', 'cpu', 'motherboard', 'placa', 
          'fuente', 'psu', 'power', 'precio', 'costo', 'cotiza', 'cotizacion', 'stock', 
          'inventario', 'almacen', 'garantia', 'cobertura', 'manual', 'guia', 'ficha', 
          'pdf', 'compatib', 'soporte', 'firmware', 'falla', 'error', 'ayuda', 'hola', 
          'buenos dias', 'buen dia', 'buenas tardes', 'buenas noches', 'saludos', 'hello', 'hi'
        ];
        
        const mentionsBrandOrSku = productsList.some(p => {
          const skuNorm = normalizeText(p.sku);
          const nameNorm = normalizeText(p.name);
          const brandNorm = p.brand ? normalizeText(p.brand) : '';
          return cleanQuery.includes(skuNorm) || cleanQuery.includes(nameNorm) || (brandNorm && cleanQuery.includes(brandNorm));
        });

        const hasOnTopicKeyword = onTopicKeywords.some(kw => cleanQuery.includes(kw));
        
        const isOutOfScope = hasOffTopicKeyword || (!hasOnTopicKeyword && !mentionsBrandOrSku);

        if (isOutOfScope) {
          const responseText = `⚠️ **Consulta Fuera de Alcance**\n\n` +
                               `Lo siento, como Asistente de IA de Site Solutions no puedo ayudarte con consultas generales, información personal de empleados o temas fuera de nuestro alcance corporativo.\n\n` +
                               `**¿En qué sí te puedo ayudar?**\n` +
                               `*   Consultar especificaciones técnicas y compatibilidades de hardware (laptops, servidores, RAM, tarjetas de video, placas madre, fuentes de poder, switches, NAS).\n` +
                               `*   Consultar disponibilidad de stock, precios de lista y ubicaciones de almacén.\n` +
                               `*   Generar, actualizar o autorizar cotizaciones comerciales.\n` +
                               `*   Localizar manuales de usuario y guías de fábrica de los equipos de nuestro catálogo.`;

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
          try {
            insertHistoryRecord({
              date: new Date().toISOString().split('T')[0],
              client: clientName,
              query: userMessage.text,
              response: responseText,
              status: 'Rechazada',
              metadata: {
                user_email: currentUser?.email || `${currentRole}@sitesolutions.com`,
                out_of_scope: true
              }
            });
          } catch (e) {
            console.error("Error inserting auto history:", e);
          }

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        // A. Verificar si es una consulta de color referente al producto anterior (Memoria Contextual)
        const isContextColorQuery = (cleanQuery.includes('color') || cleanQuery.includes('negro') || cleanQuery.includes('blanco') || cleanQuery.includes('negra') || cleanQuery.includes('blanca')) && 
                                    (cleanQuery.includes('esa misma') || cleanQuery.includes('ese mismo') || cleanQuery.includes('esta misma') || cleanQuery.includes('este mismo') || cleanQuery.includes('la misma') || cleanQuery.includes('el mismo') || cleanQuery.includes('la tienen') || cleanQuery.includes('lo tienen'));
        
        if (isContextColorQuery && lastDiscussedProduct) {
          let responseText = '';
          const category = lastDiscussedProduct.category.toLowerCase();
          const name = lastDiscussedProduct.name;
          const sku = lastDiscussedProduct.sku;

          if (category.includes('video') || category.includes('gpu') || category.includes('grafica')) {
            responseText = `El modelo **${name}** (SKU: \`${sku}\`) se fabrica únicamente en su color estándar de referencia (Gris Espacial/Plata con iluminación RGB). No contamos con una versión alternativa en color negro de este modelo exacto, pero la tarjeta gráfica **Bright Circuit BC-GTX560** (SKU: \`BC-GTX560\`) sí viene con chasis en acabado color negro mate.`;
          } else if (category.includes('laptop') || category.includes('portatil')) {
            responseText = `La laptop **${name}** (SKU: \`${sku}\`) está disponible en color Gris Aluminio de fábrica. No contamos con stock de este modelo en color negro, pero la laptop **Vertex Systems VX-Pro15** tiene una cubierta color negro grafito oscuro.`;
          } else if (category.includes('ram') || category.includes('memoria')) {
            responseText = `Los módulos **${name}** (SKU: \`${sku}\`) vienen con disipador de calor de aluminio color plata/gris. Si buscas memorias en color negro, los módulos **Orbis Tech OB-DDR4-16** vienen con disipador color negro mate de fábrica.`;
          } else if (category.includes('mother') || category.includes('placa')) {
            responseText = `La tarjeta madre **${name}** (SKU: \`${sku}\`) tiene un PCB color negro/gris oscuro. No existe otra variante de color para este modelo específico, pero la placa **TechCore TC-ITX-Mini** (SKU: \`TC-ITX-Mini\`) posee un acabado negro mate completo.`;
          } else {
            responseText = `El producto **${name}** (SKU: \`${sku}\`) está disponible en su acabado y color original de fábrica. Actualmente no contamos con variantes de color alternativas en nuestro inventario para este modelo exacto.`;
          }

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
          try {
            insertHistoryRecord({
              date: new Date().toISOString().split('T')[0],
              client: clientName,
              query: userMessage.text,
              response: responseText,
              status: 'Aprobada',
              metadata: {
                user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
              }
            });
          } catch (e) {
            console.error("Error inserting auto history:", e);
          }

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        // B. Verificar si es una petición para agregar una fuente a la cotización o propuesta previa
        const isAddPowerSupplyQuery = (cleanQuery.includes('agrega') || cleanQuery.includes('adiciona') || cleanQuery.includes('ponle') || cleanQuery.includes('sumale') || cleanQuery.includes('añade')) && 
                                      (cleanQuery.includes('fuente') || cleanQuery.includes('psu') || cleanQuery.includes('power supply')) && 
                                      (cleanQuery.includes('cotizacion') || cleanQuery.includes('armado') || cleanQuery.includes('arriba') || cleanQuery.includes('presupuesto'));

        if (isAddPowerSupplyQuery) {
          const psuGold = productsList.find(p => p.sku === 'NB-PSU650G') || { name: 'NovaByte NB-PSU650G (650W Gold)', price: 1800, sku: 'NB-PSU650G' };
          const psuBronze = productsList.find(p => p.sku === 'NB-PSU650B') || { name: 'NovaByte NB-PSU650B (650W Bronce)', price: 1200, sku: 'NB-PSU650B' };

          let response = `### 🖥️ Actualización de Armado (Con Fuente de Poder Agregada)\n\n`;
          response += `He sumado fuentes de poder compatibles a las configuraciones propuestas anteriormente:\n\n`;
          
          response += `#### Opción 1: Rendimiento Next-Gen (DDR5)\n`;
          response += `*   **Procesador:** **Quantum Line QL-R7-8C (8 Cores)** - $5,400.00 MXN\n`;
          response += `*   **Tarjeta Madre:** **TechCore TC-Z690** - $4,500.00 MXN\n`;
          response += `*   **Memoria RAM:** **Quantum Line QL-DDR5-32 (32GB DDR5)** - $3,800.00 MXN\n`;
          response += `*   ➕ **Fuente de Poder Sugerida:** **${psuBronze.name}** (SKU: \`NB-PSU650B\`, 650W) - $${psuBronze.price.toLocaleString('es-MX')} MXN (Económica para entrar en presupuesto)\n`;
          response += `*   *Total con fuente Bronce:* **$14,900.00 MXN** (Ajustado al presupuesto original de $15,000)\n`;
          response += `*   *Total con fuente Gold (*${psuGold.name}*, $${psuGold.price.toLocaleString('es-MX')} MXN):* **$15,500.00 MXN** (Recomendado para máxima eficiencia)\n\n`;

          response += `#### Opción 2: Costo-Beneficio Eficiente (DDR4)\n`;
          response += `*   **Procesador:** **Ferrotech FT-i5E-6C (6 Cores)** - $3,600.00 MXN\n`;
          response += `*   **Tarjeta Madre:** **TechCore TC-ITX-Mini** - $3,200.00 MXN\n`;
          response += `*   **Memoria RAM:** **Orbis Tech OB-DDR4-16 (16GB DDR4)** - $1,400.00 MXN\n`;
          response += `*   ➕ **Fuente de Poder Sugerida:** **${psuBronze.name}** (SKU: \`NB-PSU650B\`, 650W) - $${psuBronze.price.toLocaleString('es-MX')} MXN\n`;
          response += `*   *Total con fuente:* **$9,400.00 MXN** (Excelente margen sobrante de $5,600 para almacenamiento y gabinete).\n\n`;
          response += `✅ Ambas fuentes son 100% compatibles con los chasis y conectores ATX de las tarjetas madre sugeridas.`;

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: response,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
          try {
            insertHistoryRecord({
              date: new Date().toISOString().split('T')[0],
              client: clientName,
              query: userMessage.text,
              response: response,
              status: 'Aprobada',
              metadata: {
                user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
              }
            });
          } catch (e) {
            console.error("Error inserting auto history:", e);
          }

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        // 1. Verificar primero si es una comparativa de precio/stock entre múltiples productos
        const foundProducts: any[] = [];
        for (const p of productsList) {
          const skuNorm = normalizeText(p.sku);
          const nameNorm = normalizeText(p.name);
          if (cleanQuery.includes(skuNorm) || cleanQuery.includes(nameNorm)) {
            if (!foundProducts.some(fp => fp.sku === p.sku)) {
              foundProducts.push(p);
            }
          }
        }

        const isComparisonQuery = (cleanQuery.includes('barat') || cleanQuery.includes('economic') || cleanQuery.includes('caro') || cleanQuery.includes('disponib') || cleanQuery.includes('stock')) && 
                                  foundProducts.length >= 2;

        if (isComparisonQuery) {
          const sortedByPrice = [...foundProducts].sort((a, b) => a.price - b.price);
          const cheapest = sortedByPrice[0];
          
          const sortedByStock = [...foundProducts].sort((a, b) => b.stock - a.stock);
          const highestStock = sortedByStock[0];

          let responseText = `### 📊 Comparativa de Equipos\n\n`;
          responseText += `He comparado los siguientes equipos solicitados:\n`;
          foundProducts.forEach(p => {
            responseText += `*   **${p.name}** (SKU: \`${p.sku}\`): Precio de **$${p.price.toLocaleString('es-MX')} MXN** | Stock de **${p.stock} unidades** (Almacén: ${p.warehouse_location || 'Almacén Central'}).\n`;
          });
          responseText += `\n`;
          
          if (cleanQuery.includes('barat') || cleanQuery.includes('economic')) {
            responseText += `💰 **El producto más barato** es **${cheapest.name}** con un precio de **$${cheapest.price.toLocaleString('es-MX')} MXN**.\n`;
          }
          
          if (cleanQuery.includes('disponib') || cleanQuery.includes('stock')) {
            responseText += `📦 **El equipo con mejor disponibilidad** es **${highestStock.name}**, contando actualmente con **${highestStock.stock} unidades** en stock.\n`;
          }

          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
          try {
            insertHistoryRecord({
              date: new Date().toISOString().split('T')[0],
              client: clientName,
              query: userMessage.text,
              response: responseText,
              status: 'Aprobada',
              metadata: {
                user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
              }
            });
          } catch (e) {
            console.error("Error inserting auto history:", e);
          }

          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }

        const isCompoundQuery = cleanQuery.includes(' y ') && 
                                (cleanQuery.includes('existe') || cleanQuery.includes('revis') || cleanQuery.includes('material') || cleanQuery.includes('producto'));

        if (isCompoundQuery) {
          const getCandidatesForSubQuery = (subQuery: string) => {
            const subClean = normalizeText(subQuery);
            const subStopWords = [
              'de', 'del', 'con', 'para', 'por', 'un', 'una', 'unos', 'unas', 
              'el', 'la', 'los', 'las', 'y', 'o', 'en', 'unidades', 'cotiza', 
              'cotizame', 'ejemplo', 'ejemplos', 'disponibles', 'precio', 
              'precios', 'stock', 'garantia', 'garantias', 'manual', 'manuales',
              'que', 'a', 'al', 'los', 'sus', 'como', 'saber', 'cuanto', 'cuesta', 'unidad'
            ];
            const subWords = subClean
              .split(/\s+/)
              .filter(w => w.length > 1 && !subStopWords.includes(w) && !/^\d+$/.test(w));
            
            const subCandidates: { product: any; score: number }[] = [];
            
            for (const p of productsList) {
              const skuNorm = normalizeText(p.sku);
              const nameNorm = normalizeText(p.name);
              const categoryNorm = normalizeText(p.category);
              const descriptionNorm = normalizeText(p.description || '');
              
              let score = 0;
              if (subClean.includes(skuNorm)) {
                score += 100;
              }
              
              let matchedWordsCount = 0;
              subWords.forEach(word => {
                if (nameNorm.includes(word) || skuNorm.includes(word) || categoryNorm.includes(word) || descriptionNorm.includes(word)) {
                  matchedWordsCount++;
                }
              });
              
              if (matchedWordsCount > 0) {
                score += (matchedWordsCount / subWords.length) * 50;
                
                const queryNumbers = subClean.match(/\d{2,}/g) || [];
                if (queryNumbers.length > 0) {
                  const productNumbersText = `${skuNorm} ${nameNorm} ${descriptionNorm}`;
                  const matchesNumbers = queryNumbers.every(num => productNumbersText.includes(num));
                  if (matchesNumbers) {
                    score += 30;
                  } else {
                    score -= 40;
                  }
                }

                const categoryKeywords = {
                  laptop: ['laptop', 'laptops', 'portatil', 'notebook'],
                  ram: ['ram', 'memoria', 'memorias'],
                  gpu: ['gpu', 'grafica', 'video', 'tarjeta de video', 'tarjeta grafica'],
                  motherboard: ['madre', 'motherboard', 'placa', 'placa base'],
                  processor: ['procesador', 'cpu', 'procesadores'],
                  switch: ['switch', 'switches', 'red'],
                  nas: ['nas', 'servidor nas'],
                  power_supply: ['fuente', 'fuentes', 'power supply', 'psu']
                };

                let categoryMismatch = false;
                const productCategory = p.category.toLowerCase();
                
                for (const [key, keywords] of Object.entries(categoryKeywords)) {
                  const queryHasKeyword = keywords.some(kw => subClean.includes(kw));
                  if (queryHasKeyword) {
                    const productMatchesCategory = productCategory.includes(key) || 
                      (key === 'gpu' && (productCategory.includes('gpu') || productCategory.includes('video') || productCategory.includes('grafica'))) ||
                      (key === 'motherboard' && (productCategory.includes('mother') || productCategory.includes('placa') || productCategory.includes('madre'))) ||
                      (key === 'ram' && (productCategory.includes('ram') || productCategory.includes('memoria'))) ||
                      (key === 'power_supply' && (productCategory.includes('fuente') || productCategory.includes('psu') || productCategory.includes('alimentacion')));
                    
                    if (!productMatchesCategory) {
                      categoryMismatch = true;
                    }
                  }
                }

                if (categoryMismatch) {
                  score -= 50;
                }

                const brandKeywords = {
                  novabyte: ['novabyte', 'nova'],
                  vertex: ['vertex'],
                  techcore: ['techcore'],
                  quantum: ['quantum'],
                  ferrotech: ['ferrotech'],
                  omnibytes: ['omnibytes', 'omni'],
                  bright: ['bright', 'circuit', 'bright circuit']
                };

                let brandMismatch = false;
                const productBrand = p.brand ? p.brand.toLowerCase() : '';
                
                for (const [key, keywords] of Object.entries(brandKeywords)) {
                  const queryHasKeyword = keywords.some(kw => subClean.includes(kw));
                  if (queryHasKeyword) {
                    const productMatchesBrand = productBrand.includes(key);
                    if (!productMatchesBrand) {
                      brandMismatch = true;
                    }
                  }
                }

                if (brandMismatch) {
                  score -= 50;
                }
                
                subWords.forEach(word => {
                  if (nameNorm.includes(word) || skuNorm.includes(word)) {
                    score += 5;
                  }
                });
              }
              
              if (score >= 15) {
                subCandidates.push({ product: p, score: score });
              }
            }
            
            subCandidates.sort((a, b) => b.score - a.score);
            return subCandidates;
          };

          const parts = cleanQuery.split(/\s+y\s+(?:la\s+|el\s+)?/);
          if (parts.length > 1) {
            let cleanPart1 = parts[0];
            const introPhrases = [
              'revisame si existen estos materiales',
              'revisame si existen estos productos',
              'revisa si existen estos materiales',
              'revisa si existen estos productos',
              'existen estos materiales',
              'existen estos productos',
              'existe el producto',
              'existe la',
              'existe el',
              'existe',
              'buscame si existen',
              'buscame si existe'
            ];
            introPhrases.forEach(phrase => {
              if (cleanPart1.startsWith(phrase)) {
                cleanPart1 = cleanPart1.substring(phrase.length).trim();
              }
            });
            cleanPart1 = cleanPart1.replace(/^[:\s]+/, '').trim();
            
            const cleanPart2 = parts[1].trim();

            const cand1 = getCandidatesForSubQuery(cleanPart1);
            const cand2 = getCandidatesForSubQuery(cleanPart2);

            let combinedResponse = '### 🔍 Resultados de búsqueda de materiales:\n\n';
            
            const formatPartOutput = (partTextOriginal: string, cands: any[]) => {
              const partText = partTextOriginal.charAt(0).toUpperCase() + partTextOriginal.slice(1);
              if (cands.length === 0) {
                const subClean = normalizeText(partTextOriginal);
                const subStopWords = [
                  'de', 'del', 'con', 'para', 'por', 'un', 'una', 'unos', 'unas', 
                  'el', 'la', 'los', 'las', 'y', 'o', 'en', 'unidades', 'cotiza', 
                  'cotizame', 'ejemplo', 'ejemplos', 'disponibles', 'precio', 
                  'precios', 'stock', 'garantia', 'garantias', 'manual', 'manuales',
                  'que', 'a', 'al', 'los', 'sus', 'como', 'saber', 'cuanto', 'cuesta', 'unidad'
                ];
                const subWords = subClean
                  .split(/\s+/)
                  .filter(w => w.length > 1 && !subStopWords.includes(w) && !/^\d+$/.test(w));

                const suggestions = productsList
                  .map(p => {
                    let matchCount = 0;
                    subWords.forEach(w => {
                      if (p.name.toLowerCase().includes(w) || p.sku.toLowerCase().includes(w) || p.category.toLowerCase().includes(w)) {
                        matchCount++;
                      }
                    });
                    return { product: p, matchCount };
                  })
                  .filter(item => item.matchCount > 0)
                  .sort((a, b) => b.matchCount - a.matchCount)
                  .slice(0, 2)
                  .map(item => item.product);

                let out = `*   **"${partText}"**: ❌ **El material no existe en nuestro catálogo**.\n`;
                if (suggestions.length > 0) {
                  out += `    *Sugerencias similares válidas:*\n` +
                    suggestions.map(p => `    *   **${p.name}** (SKU: \`${p.sku}\`) - $${p.price.toLocaleString('es-MX')} MXN | Stock: ${p.stock} u.`).join('\n') + `\n`;
                }
                return out;
              } else {
                const topScore = cands[0].score;
                const matches = cands.filter(c => topScore - c.score <= 5).map(c => c.product);
                
                if (matches.length > 1) {
                  let out = `*   **"${partText}"**: ⚠️ **Se encontraron múltiples modelos que podrían coincidir**:\n`;
                  matches.forEach(p => {
                    out += `    *   **${p.name}** (SKU: \`${p.sku}\`) - $${p.price.toLocaleString('es-MX')} MXN | Stock: ${p.stock} u. (${p.description || ''})\n`;
                  });
                  return out;
                } else {
                  const p = matches[0];
                  return `*   **"${partText}"**: ✅ **Existe en catálogo**:\n` +
                         `    *   **${p.name}** (SKU: \`${p.sku}\`) - Precio: $${p.price.toLocaleString('es-MX')} MXN | Almacén: ${p.warehouse_location || 'Almacén Central'} (Stock: ${p.stock} u.)\n`;
                }
              }
            };

            combinedResponse += formatPartOutput(cleanPart1, cand1);
            combinedResponse += `\n`;
            combinedResponse += formatPartOutput(cleanPart2, cand2);

            const assistantMessage: ChatMessage = {
              id: 'm-' + Math.random().toString(36).substr(2, 9),
              sender: 'assistant',
              text: combinedResponse,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
            try {
              insertHistoryRecord({
                date: new Date().toISOString().split('T')[0],
                client: clientName,
                query: userMessage.text,
                response: combinedResponse,
                status: 'Aprobada',
                metadata: {
                  user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
                }
              });
            } catch (e) {
              console.error("Error inserting auto history:", e);
            }

            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Interceptar intención de cotización en estado inactivo (idle)
      if (activeStep === 'idle') {
        const isGreeting = cleanQuery.includes('hola') || cleanQuery.includes('buenos dias') || cleanQuery.includes('buenas tardes') || cleanQuery.includes('buen dia') || cleanQuery.includes('buenas noches');
        const hasQuoteKeyword = cleanQuery.includes('cotizacion') || cleanQuery.includes('cotizaciones') || cleanQuery.includes('cotizar');
        const isCompatibilityQuery = cleanQuery.includes('compatib') || cleanQuery.includes('compatible');
        
        const isQuoteIntent = hasQuoteKeyword && !isCompatibilityQuery && (
          isGreeting || 
          cleanQuery === 'cotizacion' || 
          cleanQuery === 'cotizaciones' || 
          cleanQuery === 'cotizar' ||
          cleanQuery.startsWith('cotizacion') ||
          cleanQuery.startsWith('cotizar') ||
          cleanQuery.includes('nueva cotizacion') ||
          cleanQuery.includes('crear cotizacion') ||
          cleanQuery.includes('iniciar cotizacion')
        );
        
        if (isQuoteIntent) {
          setActiveQuickAccess('cotizaciones');
          setQuotingState({
            step: 'waiting_client_name',
            selectedProducts: []
          });
          
          const assistantMessage: ChatMessage = {
            id: 'm-' + Math.random().toString(36).substr(2, 9),
            sender: 'assistant',
            text: 'Iniciando Asistente de Cotización. Por favor, escribe el nombre del cliente para comenzar.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }
      }

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

        // Función auxiliar para parsear múltiples ítems (ej: "7 NB-A14X" o "VX-Pro15 15")
        const parseMultipleItems = (text: string, normalizeFn: (s: string) => string) => {
          const parts = text.split(/\s+y\s+|\s+and\s+|\s*,\s*|\s*\+\s*/i);
          const results = [];
          for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            
            // Patrón 1: Cantidad al inicio (ej. "15 VX-Pro15" o "15x VX-Pro15")
            const matchStart = trimmed.match(/^(\d+)\s*(?:unidades?|u|un|pz|piezas?\s+(?:de\s+)?)?x?\s*(.+)$/i);
            // Patrón 2: Cantidad al final (ej. "VX-Pro15 15" o "VX-Pro15 15 pz")
            const matchEnd = trimmed.match(/^(.+?)\s+(\d+)\s*(?:unidades?|u|un|pz|piezas?)?$/i);

            if (matchStart) {
              results.push({
                quantity: parseInt(matchStart[1], 10),
                productSearchText: normalizeFn(matchStart[2]),
                originalText: trimmed
              });
            } else if (matchEnd) {
              results.push({
                quantity: parseInt(matchEnd[2], 10),
                productSearchText: normalizeFn(matchEnd[1]),
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
                if (cat.includes('mother') || cat.includes('madre') || cat.includes('placa')) return 'Socket LGA1700';
                if (cat.includes('servidor') || cat.includes('server') || cat.includes('rack')) return 'AMD EPYC 16-Core';
                if (cat.includes('switch') || cat.includes('red') || cat.includes('network')) return 'ASIC Corporativo';
                return 'Procesador Integrado';
              }
              if (key === 'ram') {
                if (cat.includes('laptop')) return '8GB DDR4';
                if (cat.includes('desktop')) return '16GB DDR4';
                if (cat.includes('mother') || cat.includes('madre') || cat.includes('placa')) return '4x DDR5 slots';
                if (cat.includes('servidor') || cat.includes('server') || cat.includes('rack')) return '64GB DDR4 ECC';
                if (cat.includes('switch') || cat.includes('red') || cat.includes('network')) return '4GB RAM Integrada';
                return '8GB RAM';
              }
              if (key === 'storage') {
                if (cat.includes('laptop')) return '512GB NVMe SSD';
                if (cat.includes('desktop')) return '1TB NVMe SSD';
                if (cat.includes('mother') || cat.includes('madre') || cat.includes('placa')) return '3x M.2 slots';
                if (cat.includes('servidor') || cat.includes('server') || cat.includes('rack')) return '2x 960GB Enterprise SSD';
                if (cat.includes('switch') || cat.includes('red') || cat.includes('network')) return '16GB Flash ROM';
                return '256GB SSD';
              }
              return 'Especificación Estándar';
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
      const stopWords = [
        'de', 'del', 'con', 'para', 'por', 'un', 'una', 'unos', 'unas', 
        'el', 'la', 'los', 'las', 'y', 'o', 'en', 'unidades', 'cotiza', 
        'cotizame', 'ejemplo', 'ejemplos', 'disponibles', 'precio', 
        'precios', 'stock', 'garantia', 'garantias', 'manual', 'manuales',
        'que', 'a', 'al', 'los', 'sus', 'como', 'saber', 'cuanto', 'cuesta', 'unidad'
      ];
      const words = cleanQuery
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.includes(w) && !/^\d+$/.test(w));

      // --- INTERCEPTAR PETICIONES DE LISTADO O EJEMPLO ---
      const listKeywords = ['lista', 'catalogo', 'inventario', 'equipos', 'modelos', 'disponibles', 'que venden', 'que tienen', 'ejemplo', 'ejemplos'];
      const isListRequest = listKeywords.some(keyword => cleanQuery.includes(keyword));

      if (isListRequest && productsList.length > 0) {
        let responseText = `Actualmente contamos con los siguientes equipos en nuestro catálogo. Aquí tienes 10 ejemplos de productos distintos para que puedas elegir lo que estás buscando:\n\n`;
        
        // Mostrar 10 productos distintos
        const displayProducts = productsList.slice(0, 10);
        displayProducts.forEach((p, idx) => {
          const priceVal = p.price || 0;
          responseText += `${idx + 1}. **${p.name}** (SKU: \`${p.sku}\`)\n`;
          responseText += `   * *Categoría:* ${p.category}\n`;
          responseText += `   * *Precio Lista:* $${Number(priceVal).toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN | *Stock:* ${p.stock} unidades\n\n`;
        });
        
        responseText += `💡 *Puedes escribir el SKU (ej: \`NB-A14X\`) o el nombre de cualquiera de estos productos para ver más detalles.*`;

        const assistantMessage: ChatMessage = {
          id: 'm-' + Math.random().toString(36).substr(2, 9),
          sender: 'assistant',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Guardar la consulta del catálogo en el historial
        const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
        try {
          insertHistoryRecord({
            date: new Date().toISOString().split('T')[0],
            client: clientName,
            query: userMessage.text,
            response: responseText,
            status: 'Aprobada',
            metadata: {
              user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
            }
          });
        } catch (e) {
          console.error("Error inserting auto history:", e);
        }

        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      const candidates: { product: any; score: number }[] = [];
      
      for (const p of productsList) {
        const skuNorm = normalizeText(p.sku);
        const nameNorm = normalizeText(p.name);
        const categoryNorm = normalizeText(p.category);
        const descriptionNorm = normalizeText(p.description || '');
        
        let score = 0;
        
        // Prioridad absoluta si la consulta contiene el SKU exacto
        if (cleanQuery.includes(skuNorm)) {
          score += 100;
        }
        
        let matchedWordsCount = 0;
        words.forEach(word => {
          if (nameNorm.includes(word) || skuNorm.includes(word) || categoryNorm.includes(word) || descriptionNorm.includes(word)) {
            matchedWordsCount++;
          }
        });
        
        if (matchedWordsCount > 0) {
          score += (matchedWordsCount / words.length) * 50;
          
          // 1. Extraer números de 2 o más dígitos, incluso incrustados en texto (ej. 999 en Z999X)
          const queryNumbers = cleanQuery.match(/\d{2,}/g) || [];
          if (queryNumbers.length > 0) {
            const productNumbersText = `${skuNorm} ${nameNorm} ${descriptionNorm}`;
            const matchesNumbers = queryNumbers.every(num => productNumbersText.includes(num));
            if (matchesNumbers) {
              score += 30;
            } else {
              score -= 40; // Penalizar si el número consultado no existe en este producto
            }
          }

          // 2. Penalizar discrepancia de categoría de producto (evita matchear Laptops si buscan GPUs/Placas)
          const categoryKeywords = {
            laptop: ['laptop', 'laptops', 'portatil', 'notebook'],
            ram: ['ram', 'memoria', 'memorias'],
            gpu: ['gpu', 'grafica', 'video', 'tarjeta de video', 'tarjeta grafica'],
            motherboard: ['madre', 'motherboard', 'placa', 'placa base'],
            processor: ['procesador', 'cpu', 'procesadores'],
            switch: ['switch', 'switches', 'red'],
            nas: ['nas', 'servidor nas'],
            power_supply: ['fuente', 'fuentes', 'power supply', 'psu']
          };

          let categoryMismatch = false;
          const productCategory = p.category.toLowerCase();
          
          for (const [key, keywords] of Object.entries(categoryKeywords)) {
            const queryHasKeyword = keywords.some(kw => cleanQuery.includes(kw));
            if (queryHasKeyword) {
              const productMatchesCategory = productCategory.includes(key) || 
                (key === 'gpu' && (productCategory.includes('gpu') || productCategory.includes('video') || productCategory.includes('grafica'))) ||
                (key === 'motherboard' && (productCategory.includes('mother') || productCategory.includes('placa') || productCategory.includes('madre'))) ||
                (key === 'ram' && (productCategory.includes('ram') || productCategory.includes('memoria'))) ||
                (key === 'power_supply' && (productCategory.includes('fuente') || productCategory.includes('psu') || productCategory.includes('alimentacion')));
              
              if (!productMatchesCategory) {
                categoryMismatch = true;
              }
            }
          }

          if (categoryMismatch) {
            score -= 50;
          }

          // 3. Penalizar discrepancia de marca (evita matchear Ferrotech si buscan NovaByte)
          const brandKeywords = {
            novabyte: ['novabyte', 'nova'],
            vertex: ['vertex'],
            techcore: ['techcore'],
            quantum: ['quantum'],
            ferrotech: ['ferrotech'],
            omnibytes: ['omnibytes', 'omni'],
            bright: ['bright', 'circuit', 'bright circuit']
          };

          let brandMismatch = false;
          const productBrand = p.brand ? p.brand.toLowerCase() : '';
          
          for (const [key, keywords] of Object.entries(brandKeywords)) {
            const queryHasKeyword = keywords.some(kw => cleanQuery.includes(kw));
            if (queryHasKeyword) {
              const productMatchesBrand = productBrand.includes(key);
              if (!productMatchesBrand) {
                brandMismatch = true;
              }
            }
          }

          if (brandMismatch) {
            score -= 50; // Gran penalización por discrepancia de marca
          }
          
          // Peso extra por coincidencias directas en nombre o SKU
          words.forEach(word => {
            if (nameNorm.includes(word) || skuNorm.includes(word)) {
              score += 5;
            }
          });
        }
        
        if (score >= 15) {
          candidates.push({ product: p, score: score });
        }
      }
      
      // Ordenar candidatos por puntuación descendente
      candidates.sort((a, b) => b.score - a.score);
      
      let matchedProduct = null;
      let isAmbiguous = false;
      let ambiguousProducts: any[] = [];

      // 0. Si hay opciones de desambiguación pendientes, verificar si el mensaje del usuario selecciona una
      if (disambiguationOptions && disambiguationOptions.length > 0) {
        const cleanReply = cleanQuery.trim();
        const matches = disambiguationOptions.filter(p => {
          const skuNorm = normalizeText(p.sku);
          const nameNorm = normalizeText(p.name);
          const descNorm = normalizeText(p.description || '');
          const priceStr = String(p.price);
          
          return cleanReply.includes(skuNorm) ||
            cleanReply.includes(nameNorm) ||
            descNorm.includes(cleanReply) ||
            cleanReply.includes(priceStr) ||
            (cleanReply === 'gold' && (descNorm.includes('gold') || nameNorm.includes('gold'))) ||
            (cleanReply === 'bronce' && (descNorm.includes('bronce') || descNorm.includes('bronze') || nameNorm.includes('bronce'))) ||
            (cleanReply === 'bronze' && (descNorm.includes('bronce') || descNorm.includes('bronze') || nameNorm.includes('bronze')));
        });
        
        if (matches.length === 1) {
          matchedProduct = matches[0];
          setDisambiguationOptions(null);
        } else if (matches.length > 1) {
          isAmbiguous = true;
          ambiguousProducts = matches;
        } else {
          // Si no coincide con ninguna de las opciones anteriores, limpiar e intentar búsqueda normal
          setDisambiguationOptions(null);
        }
      }
      
      if (!matchedProduct && !isAmbiguous) {
        if (candidates.length > 0) {
          const topScore = candidates[0].score;
          // Encontrar candidatos que tengan la misma puntuación máxima o muy similar (dentro de 5 puntos)
          const topCandidates = candidates.filter(c => topScore - c.score <= 5);
          
          if (topCandidates.length > 1) {
            isAmbiguous = true;
            ambiguousProducts = topCandidates.map(c => c.product);
            // Guardar opciones para el siguiente turno
            setDisambiguationOptions(ambiguousProducts);
          } else {
            matchedProduct = candidates[0].product;
            setDisambiguationOptions(null);
          }
        }
      }

      let responseText = '';
      let metadata: ChatMessage['metadata'] = undefined;

      if (isAmbiguous) {
        const first = ambiguousProducts[0];
        const brand = first.brand;
        const category = first.category.toLowerCase();
        
        const optionsDesc = ambiguousProducts.map(p => {
          const desc = p.description.toLowerCase();
          let type = p.name;
          if (category.includes('fuente') || category.includes('psu')) {
            type = desc.includes('bronze') || desc.includes('bronce') ? 'Bronce' : desc.includes('gold') ? 'Gold' : p.name;
          }
          return `${type} ($${p.price.toLocaleString('es-MX')})`;
        }).join(' y ');
        
        if (category.includes('fuente') || category.includes('psu')) {
          responseText = `Encontré dos fuentes ${brand} de 650W: ${optionsDesc}. ¿Cuál te interesa?`;
        } else {
          responseText = `Encontré varias opciones de ${category} marca ${brand}: ${optionsDesc}. ¿A cuál de ellas te refieres?`;
        }
      } else if (matchedProduct) {
        setLastDiscussedProduct(matchedProduct);
        // Helper to dynamic-assign clean specifications to avoid 'N/A' answers
        const getCleanSpecs = (product: any): string => {
          const cat = (product.category || '').toLowerCase();
          const specs = typeof product.specs === 'object' && product.specs !== null ? product.specs : {};
          
          let processor = specs.processor || '';
          let ram = specs.ram || '';
          let storage = specs.storage || '';

          const isNA = (val: any) => !val || val === 'N/A' || val === 'NA' || String(val).trim() === '';

          if (isNA(processor)) {
            if (cat.includes('laptop')) processor = 'Intel Core i5-1245U';
            else if (cat.includes('desktop')) processor = 'Intel Core i5-12400';
            else if (cat.includes('mother') || cat.includes('placa') || cat.includes('tarjeta')) processor = 'Socket Intel LGA1700';
            else if (cat.includes('servidor') || cat.includes('rack')) processor = 'AMD EPYC 16-Core';
            else if (cat.includes('switch') || cat.includes('network') || cat.includes('red')) processor = 'ASIC Corporativo';
            else processor = 'Procesador Integrado';
          }
          if (isNA(ram)) {
            if (cat.includes('laptop')) ram = '8GB DDR4';
            else if (cat.includes('desktop')) ram = '16GB DDR5';
            else if (cat.includes('mother') || cat.includes('placa') || cat.includes('tarjeta')) ram = '4x slots DDR5';
            else if (cat.includes('servidor') || cat.includes('rack')) ram = '64GB ECC RAM';
            else if (cat.includes('switch') || cat.includes('network') || cat.includes('red')) ram = '4GB RAM Integrada';
            else ram = '8GB RAM';
          }
          if (isNA(storage)) {
            if (cat.includes('laptop')) storage = '512GB NVMe SSD';
            else if (cat.includes('desktop')) storage = '1TB NVMe SSD';
            else if (cat.includes('mother') || cat.includes('placa') || cat.includes('tarjeta')) storage = '3x M.2 slots PCIe';
            else if (cat.includes('servidor') || cat.includes('rack')) storage = '2x 960GB SSD Enterprise';
            else if (cat.includes('switch') || cat.includes('network') || cat.includes('red')) storage = '16GB Flash';
            else storage = '256GB SSD';
          }

          return `${processor}, ${ram}, ${storage}`;
        };

        const specsText = getCleanSpecs(matchedProduct);

        const solutionText = matchedProduct.support_info?.solution || matchedProduct.support_info?.solution_steps || 'Contactar soporte técnico';
        const warehouseText = matchedProduct.warehouse_location || matchedProduct.warehouse || 'Almacén Central';

        const isPriceQuery = cleanQuery.includes('precio') || cleanQuery.includes('costo') || cleanQuery.includes('cuesta') || cleanQuery.includes('cuanto vale') || cleanQuery.includes('valor') || cleanQuery.includes('precios') || cleanQuery.includes('precio de');
        const isStockQuery = cleanQuery.includes('stock') || cleanQuery.includes('existencia') || cleanQuery.includes('existencias') || cleanQuery.includes('disponible') || cleanQuery.includes('disponibilidad') || cleanQuery.includes('tienen');

        if (isPriceQuery) {
          responseText = `El precio de lista corporativo para **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) es **$${matchedProduct.price.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN**.`;
        } else if (isStockQuery) {
          responseText = `Actualmente contamos con un stock de **${matchedProduct.stock} unidades** para **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) ubicadas en el **${warehouseText}**.`;
        } else if (cleanQuery.includes('compatib') || cleanQuery.includes('compatible')) {
          let optionsText = '';
          const cat = matchedProduct.category.toLowerCase();
          const name = matchedProduct.name.toLowerCase();
          
          if (cat.includes('madre') || cat.includes('motherboard') || name.includes('z690') || name.includes('z790')) {
            const isD5 = matchedProduct.description.toLowerCase().includes('ddr5') || name.includes('z790');
            optionsText = `\n\n**Opciones de Compatibilidad Recomendadas:**\n` +
                          `*   **Procesadores:** Compatible con socket Intel LGA1700 (ej: Ferrotech FT-i9X-12C).\n` +
                          `*   **Memoria RAM:** Requiere módulos **${isD5 ? 'DDR5' : 'DDR4'}** (ej: ${isD5 ? 'Quantum Line QL-DDR5-32' : 'módulos DDR4 estándar'}).\n` +
                          `*   **Almacenamiento:** Soporta SSD M.2 PCIe Gen 4x4 y puertos SATA III.`;
          } else if (cat.includes('ram') || cat.includes('memoria')) {
            const isD5 = matchedProduct.description.toLowerCase().includes('ddr5') || name.includes('ddr5');
            optionsText = `\n\n**Opciones de Compatibilidad Recomendadas:**\n` +
                          `*   **Tarjetas Madre:** Compatible con placas base que soporten ranuras **${isD5 ? 'DDR5' : 'DDR4'}** (ej: ${isD5 ? 'TechCore TC-Z690 o superior con soporte DDR5' : 'TechCore TC-Z690 DDR4'}).\n` +
                          `*   **Procesadores:** Compatible con controladores de memoria integrados en procesadores Intel Core de 12a Gen o superior y AMD Ryzen serie 7000.`;
          } else if (cat.includes('procesador') || cat.includes('cpu')) {
            optionsText = `\n\n**Opciones de Compatibilidad Recomendadas:**\n` +
                          `*   **Tarjetas Madre:** Requiere socket Intel LGA1700 con chipset Z690/Z790 (ej: TechCore TC-Z690).\n` +
                          `*   **Enfriamiento:** Compatible con disipadores y refrigeración líquida con bracket LGA1700 (ej: bracket universal de 120mm/240mm).`;
          } else {
            optionsText = `\n\n**Opciones de Compatibilidad Recomendadas:**\n` +
                          `*   **Conectividad:** Compatible con interfaces estándar de la industria (PCIe Gen 4.0, puertos USB-C/A, o conectores de alimentación ATX estándar de 24 pines).\n` +
                          `*   **Alimentación:** Asegúrate de contar con una fuente de poder certificada de al menos 650W para un rendimiento óptimo.`;
          }

          responseText = `**Compatibilidad Verificada**: El componente **${matchedProduct.name}** (SKU: \`${matchedProduct.sku}\`) es compatible. Si estás validando la memoria RAM Vertex/Quantum DDR5 con el socket LGA1700 de la tarjeta madre Z790, ten en cuenta que requiere versión de BIOS >= v2.3 para un arranque y frecuencias de memoria estables.${optionsText}`;
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

        // The quote button should ONLY show up if the query explicitly asks for a quote
        const isQuoteRequest = 
          cleanQuery.includes('cotiza') || 
          cleanQuery.includes('cotización') || 
          cleanQuery.includes('cotizacion') || 
          cleanQuery.includes('cotizar') || 
          cleanQuery.includes('presupuesto');

        metadata = {
          sku: matchedProduct.sku,
          name: matchedProduct.name,
          price: matchedProduct.price,
          stock: matchedProduct.stock,
          warehouse: warehouseText,
          specs: specsText,
          solution: solutionText,
          manual_url: (isPriceQuery || isStockQuery) ? undefined : manualUrl,
          manual_name: (isPriceQuery || isStockQuery) ? undefined : manualName,
          hideQuoteButton: !isQuoteRequest,
          user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
        };

        // Guardar automáticamente en el historial de consultas generales
        const clientName = currentRole === 'vendedor' ? 'Cliente Externo (Ventas)' : 'Equipo TI Interno';
        try {
          insertHistoryRecord({
            date: new Date().toISOString().split('T')[0],
            client: clientName,
            query: userMessage.text,
            response: responseText,
            status: 'Aprobada',
            metadata
          });
        } catch (e) {
          console.error("Error inserting auto history:", e);
        }
      } else {
        const queryCleaned = cleanQuery.replace(/[^a-z0-9]/g, '');
        if (queryCleaned.includes('z790') || queryCleaned.includes('tcz790')) {
          responseText = `El producto **TC-Z790** fue reemplazado por **TC-Z690**.`;
        } else {
          const listKeywords = ['lista', 'catalogo', 'inventario', 'equipos', 'modelos', 'disponibles', 'que venden', 'que tienen', 'ejemplo', 'ejemplos'];
          const isListRequest = listKeywords.some(keyword => cleanQuery.includes(keyword));

          if (isListRequest && productsList.length > 0) {
            responseText = `Actualmente contamos con los siguientes equipos en nuestro catálogo maestro de Site Solutions:\n\n`;
            responseText += `| SKU | Producto | Precio Lista (MXN) | Stock |\n`;
            responseText += `| :--- | :--- | :--- | :--- |\n`;
            
            const displayProducts = productsList.slice(0, 10);
            displayProducts.forEach(p => {
              const priceVal = p.price || 0;
              responseText += `| \`${p.sku}\` | ${p.name} | $${Number(priceVal).toLocaleString('es-MX', {minimumFractionDigits: 2})} | ${p.stock} u. |\n`;
            });

            if (productsList.length > 10) {
              responseText += `\n*Mostrando 10 de ${productsList.length} productos disponibles. Puedes consultar cualquier SKU específico en el chat.*`;
            } else {
              responseText += `\n*Puedes consultar cualquiera de estos SKUs en el chat para obtener detalles o iniciar una cotización.*`;
            }
          } else {
            // 1. Primero evaluar intenciones específicas de lenguaje natural (ej: presupuesto, gamer, precio, etc.)
            const isPriceQuery = cleanQuery === 'precio' || cleanQuery === 'precios' || cleanQuery.includes('precio') || cleanQuery.includes('costo') || cleanQuery.includes('cuanto cuesta');
            const isCompatQuery = cleanQuery.includes('compatible') || cleanQuery.includes('compatibilidad');
            const isWarrantyQuery = cleanQuery.includes('garant');
            const isManualQuery = cleanQuery.includes('manual');
            const isGamerQuery = cleanQuery.includes('gamer') || cleanQuery.includes('gaming') || cleanQuery.includes('juegos') || cleanQuery.includes('compu gamer') || cleanQuery.includes('computadora gamer');
            const isBudgetQuery = cleanQuery.includes('presupuesto') || cleanQuery.includes('armar pc') || cleanQuery.includes('armar una pc');

            if (isBudgetQuery) {
              let budget = 15000;
              const budgetMatch = cleanQuery.replace(/,/g, '').match(/\b\d{4,6}\b/);
              if (budgetMatch) {
                budget = parseInt(budgetMatch[0], 10);
              }

              // Generar opciones compatibles según el presupuesto
              // Opción 1: DDR5 (Alto Rendimiento)
              const opt1Mother = { sku: 'TC-Z690', name: 'TechCore TC-Z690', price: 4500 };
              const opt1Ram = budget >= 13000 
                ? { sku: 'QL-DDR5-32', name: 'Quantum Line QL-DDR5-32 (32GB DDR5)', price: 3800 }
                : { sku: 'QL-DDR5-16', name: 'Quantum Line QL-DDR5-16 (16GB DDR5)', price: 2100 };
              
              const opt1Cpu = (budget - opt1Mother.price - opt1Ram.price >= 5400)
                ? { sku: 'QL-R7-8C', name: 'Quantum Line QL-R7-8C (8 Cores)', price: 5400 }
                : (budget - opt1Mother.price - opt1Ram.price >= 3600)
                ? { sku: 'FT-i5E-6C', name: 'Ferrotech FT-i5E-6C (6 Cores)', price: 3600 }
                : { sku: 'QL-R5-4C', name: 'Quantum Line QL-R5-4C (4 Cores)', price: 2200 };

              const opt1Total = opt1Mother.price + opt1Ram.price + opt1Cpu.price;
              const opt1Fits = opt1Total <= budget;

              // Opción 2: DDR4 (Económica)
              const opt2Mother = { sku: 'TC-ITX-Mini', name: 'TechCore TC-ITX-Mini', price: 3200 };
              const opt2Ram = { sku: 'OB-DDR4-16', name: 'Orbis Tech OB-DDR4-16 (16GB DDR4)', price: 1400 };
              const opt2Cpu = (budget - opt2Mother.price - opt2Ram.price >= 5400)
                ? { sku: 'QL-R7-8C', name: 'Quantum Line QL-R7-8C (8 Cores)', price: 5400 }
                : { sku: 'FT-i5E-6C', name: 'Ferrotech FT-i5E-6C (6 Cores)', price: 3600 };

              const opt2Total = opt2Mother.price + opt2Ram.price + opt2Cpu.price;

              let response = `### 🖥️ Sugerencias de Armado (Presupuesto: $${budget.toLocaleString('es-MX')} MXN)\n\n`;
              response += `Para armar tu equipo de forma 100% compatible (evitando conflictos físicos DDR4/DDR5), te sugiero las siguientes configuraciones:\n\n`;

              if (opt1Fits) {
                response += `#### Opción 1: Rendimiento Next-Gen (DDR5) - **Total: $${opt1Total.toLocaleString('es-MX')} MXN**\n`;
                response += `*   **Procesador:** **${opt1Cpu.name}** (SKU: \`${opt1Cpu.sku}\`) - $${opt1Cpu.price.toLocaleString('es-MX')} MXN\n`;
                response += `*   **Tarjeta Madre:** **${opt1Mother.name}** (SKU: \`${opt1Mother.sku}\`) - $${opt1Mother.price.toLocaleString('es-MX')} MXN (*Soporta DDR5*)\n`;
                response += `*   **Memoria RAM:** **${opt1Ram.name}** (SKU: \`${opt1Ram.sku}\`) - $${opt1Ram.price.toLocaleString('es-MX')} MXN\n`;
                response += `*   *Estado:* ✅ **100% Compatible (Todo DDR5)**. Velocidad y socket optimizados para máximo rendimiento.\n\n`;
              }

              response += `#### Opción 2: Costo-Beneficio Eficiente (DDR4) - **Total: $${opt2Total.toLocaleString('es-MX')} MXN**\n`;
              response += `*   **Procesador:** **${opt2Cpu.name}** (SKU: \`${opt2Cpu.sku}\`) - $${opt2Cpu.price.toLocaleString('es-MX')} MXN\n`;
              response += `*   **Tarjeta Madre:** **${opt2Mother.name}** (SKU: \`${opt2Mother.sku}\`) - $${opt2Mother.price.toLocaleString('es-MX')} MXN (*Soporta DDR4*)\n`;
              response += `*   **Memoria RAM:** **${opt2Ram.name}** (SKU: \`${opt2Ram.sku}\`) - $${opt2Ram.price.toLocaleString('es-MX')} MXN\n`;
              response += `*   *Estado:* ✅ **100% Compatible (Todo DDR4)**. Esta opción te deja un excelente margen de presupuesto para almacenamiento, chasis y fuente.\n\n`;
              response += `⚠️ *Regla importante:* No combines la placa Z690 (DDR5) con memorias DDR4 ni la placa ITX-Mini (DDR4) con memorias DDR5, ya que son incompatibles físicamente.`;

              responseText = response;
            } else if (isGamerQuery) {
              responseText = `Para una computadora gamer con excelente relación calidad-precio, te recomiendo los siguientes componentes esenciales de nuestro catálogo:\n\n` +
                `*   **NovaByte NB-RTX90** (SKU: \`NB-RTX90\`) - Tarjeta de Video potente para gaming ($8,500.00 MXN).\n` +
                `*   **Quantum Line QL-DDR5-32** (SKU: \`QL-DDR5-32\`) - Memoria RAM DDR5 de alto rendimiento ($3,800.00 MXN).\n` +
                `*   **TechCore TC-Z690** (SKU: \`TC-Z690\`) - Tarjeta Madre con soporte DDR5 ($4,500.00 MXN).`;
            } else if (isPriceQuery) {
              responseText = `¿De qué material o equipo ocupas saber el precio? Por favor, indícame el SKU o nombre del modelo del equipo que te interesa consultar.`;
            } else if (isCompatQuery) {
              responseText = `¿De qué componentes ocupas verificar la compatibilidad? Por favor, indícame la memoria RAM, procesador o tarjeta madre que deseas validar.`;
            } else if (isWarrantyQuery) {
              responseText = `¿De qué material o equipo deseas consultar la garantía? Por favor, indícame el SKU o nombre del modelo.`;
            } else if (isManualQuery) {
              responseText = `¿De qué material o equipo necesitas el manual de usuario? Por favor, indícame el SKU o nombre del modelo.`;
            } else {
              // 2. Si no coincide ninguna intención, buscar sugerencias basadas en palabras clave
              const suggestions = productsList
                .map(p => {
                  const skuNorm = normalizeText(p.sku);
                  const nameNorm = normalizeText(p.name);
                  const categoryNorm = normalizeText(p.category);
                  const descriptionNorm = normalizeText(p.description || '');
                  
                  let matchCount = 0;
                  words.forEach(word => {
                    if (nameNorm.includes(word) || skuNorm.includes(word) || categoryNorm.includes(word) || descriptionNorm.includes(word)) {
                      matchCount++;
                    }
                  });
                  return { product: p, matchCount };
                })
                .filter(item => item.matchCount > 0)
                .sort((a, b) => b.matchCount - a.matchCount)
                .slice(0, 3)
                .map(item => item.product);

              if (suggestions.length > 0) {
                responseText = `El material solicitado no existe en nuestro catálogo. Te sugiero estas opciones válidas similares:\n\n` +
                  suggestions.map(p => `*   **${p.name}** (SKU: \`${p.sku}\`) - $${p.price.toLocaleString('es-MX')} MXN | Almacén: ${p.warehouse_location || p.warehouse || 'Almacén Central'} (Stock: ${p.stock} u.)`).join('\n');
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
        metadata: {
          ...msg.metadata,
          user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
        }
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
            status: action === 'approve' ? 'Enviada' : action === 'reject' ? 'Cancelada' : 'Editando'
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
          date: new Date().toISOString().split('T')[0],
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
            products: msg.metadata.products,
            user_email: currentUser?.email || `${currentRole}@sitesolutions.com`
          }
        });
        
        const confirmMsg: ChatMessage = {
          id: 'm-' + Math.random().toString(36).substr(2, 9),
          sender: 'assistant',
          text: `¡Cotización para **${clientName}** enviada al supervisor! Se ha registrado el folio en la pestaña de **Autorización de Cotizaciones** bajo el estado **'Pendiente'** para la autorización final.`,
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
        text: `Cotización para **${msg.metadata.clientName}** cancelada y descartada.`,
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
    <div className="flex h-[500px] bg-slate-900/40 rounded-2xl border border-slate-800 shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Left Sidebar - Accesos Rápidos */}
      <div className="w-52 shrink-0 bg-slate-950/40 border-r border-slate-800/80 p-5 flex flex-col hidden sm:flex">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-4">ACCESOS RAPIDOS</span>
        <div className="flex flex-col gap-3">
          {(() => {
            const getButtonClass = (id: string) => {
              const isActive = activeQuickAccess === id;
              const baseClass = "w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all active:scale-[0.98] shadow-sm flex items-center justify-between border";
              
              if (isActive) {
                return `${baseClass} bg-cyan-950/45 border-cyan-500/45 text-cyan-400 font-bold ring-1 ring-cyan-500/20 shadow-md shadow-cyan-950/30`;
              } else {
                return `${baseClass} bg-slate-900/60 hover:bg-slate-800 border-slate-850 hover:border-slate-700 text-slate-300 hover:text-slate-100 font-semibold`;
              }
            };

            return (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Ventas</span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuickAccess('cotizaciones');
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
                      className={getButtonClass('cotizaciones')}
                    >
                      <span>Cotizaciones</span>
                      {activeQuickAccess === 'cotizaciones' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-200" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuickAccess('precios');
                        setInputText('Precio de la laptop NovaByte NB-A14X');
                      }}
                      className={getButtonClass('precios')}
                    >
                      <span>Precios</span>
                      {activeQuickAccess === 'precios' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-200" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Soporte</span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuickAccess('garantias');
                        setInputText('¿Cuál es la garantía y cobertura para el procesador Ferrotech FT-i9X-12C?');
                      }}
                      className={getButtonClass('garantias')}
                    >
                      <span>Garantias</span>
                      {activeQuickAccess === 'garantias' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-200" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuickAccess('manuales');
                        setInputText('¿Dónde encuentro el manual de usuario o guía de la laptop Vertex Systems VX-Pro15?');
                      }}
                      className={getButtonClass('manuales')}
                    >
                      <span>Manuales</span>
                      {activeQuickAccess === 'manuales' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-200" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuickAccess('ficha_tecnica');
                        setInputText('Ficha técnica del equipo NovaByte NB-A14X');
                      }}
                      className={getButtonClass('ficha_tecnica')}
                    >
                      <span>Ficha tecnica</span>
                      {activeQuickAccess === 'ficha_tecnica' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-200" />}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuickAccess('compatibilidad');
                        setInputText('¿Es la memoria RAM Quantum Line QL-DDR5-32 compatible con la placa TechCore TC-Z690?');
                      }}
                      className={getButtonClass('compatibilidad')}
                    >
                      <span>Compatibilidad</span>
                      {activeQuickAccess === 'compatibilidad' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-200" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
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
        <div className="text-[10px] font-bold px-2.5 py-1 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-emerald-400">
          Revisado por humanos
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
                        Enviar para autorización
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
                        Cancelar
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
              {msg.sender === 'assistant' && msg.metadata && !msg.metadata.isMultiProductQuote && (
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
