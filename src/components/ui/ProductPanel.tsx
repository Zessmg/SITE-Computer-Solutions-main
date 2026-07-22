'use client';

import React, { useState, useEffect } from 'react';
import { fetchProducts, insertProduct, updateProduct } from '@/lib/supabase/client';
import { 
  Plus, 
  Edit3, 
  Search, 
  Filter, 
  Server, 
  Laptop, 
  Network, 
  HardDrive, 
  Tag, 
  DollarSign, 
  Database, 
  MapPin, 
  Activity, 
  Cpu, 
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';

interface ProductPanelProps {
  currentRole: 'vendedor' | 'soporte' | 'tecnico' | 'admin';
}

export default function ProductPanel({ currentRole }: ProductPanelProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New product form state
  const [newProductForm, setNewProductForm] = useState({
    sku: '',
    name: '',
    category: 'Servidores',
    brand: 'Site Solutions',
    price: 0,
    stock: 0,
    warehouse_location: '',
    description: '',
    processor: '',
    ram: '',
    storage: '',
    common_issue: '',
    solution: '',
    firmware_ver: 'v1.0.0'
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    price: 0,
    description: ''
  });

  // Check permission
  const canModify = currentRole === 'admin' || currentRole === 'vendedor';

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts(categoryFilter, searchQuery);
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Icon selector based on category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Servidores':
        return <Server className="w-5 h-5 text-cyan-400" />;
      case 'Workstations':
        return <Laptop className="w-5 h-5 text-indigo-400" />;
      case 'Networking':
        return <Network className="w-5 h-5 text-emerald-400" />;
      case 'Almacenamiento':
        return <HardDrive className="w-5 h-5 text-amber-400" />;
      default:
        return <Tag className="w-5 h-5 text-slate-400" />;
    }
  };

  // Handle Add Product Submit
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.sku || !newProductForm.name) return;

    try {
      const formattedProduct = {
        sku: newProductForm.sku.toUpperCase(),
        name: newProductForm.name,
        category: newProductForm.category,
        brand: newProductForm.brand,
        price: Number(newProductForm.price),
        stock: Number(newProductForm.stock),
        warehouse_location: newProductForm.warehouse_location || 'Almacén Central',
        description: newProductForm.description,
        image_url: newProductForm.category === 'Servidores' 
          ? '/assets/enterprise_server_rack.png' 
          : newProductForm.category === 'Workstations'
          ? '/assets/pro_workstation_laptop.png'
          : newProductForm.category === 'Networking'
          ? '/assets/fiber_network_switch.png'
          : '/assets/hero_tech_banner.png',
        specs: {
          processor: newProductForm.processor || 'N/A',
          ram: newProductForm.ram || 'N/A',
          storage: newProductForm.storage || 'N/A',
          warranty_months: 36
        },
        support_info: {
          common_issue: newProductForm.common_issue || 'Ninguno reportado',
          solution: newProductForm.solution || 'Contactar soporte técnico',
          firmware_ver: newProductForm.firmware_ver
        }
      };

      await insertProduct(formattedProduct);
      setIsAddModalOpen(false);
      showToast('🎉 ¡Producto agregado e indexado con éxito!');
      // Reset form
      setNewProductForm({
        sku: '',
        name: '',
        category: 'Servidores',
        brand: 'Site Solutions',
        price: 0,
        stock: 0,
        warehouse_location: '',
        description: '',
        processor: '',
        ram: '',
        storage: '',
        common_issue: '',
        solution: '',
        firmware_ver: 'v1.0.0'
      });
      loadProducts();
    } catch (err) {
      console.error('Error inserting product:', err);
    }
  };

  // Handle Edit Click
  const handleEditClick = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      price: product.price,
      description: product.description
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const success = await updateProduct(editingProduct.id, {
        price: Number(editForm.price),
        description: editForm.description
      });
      if (success) {
        setEditingProduct(null);
        showToast('📝 ¡Producto actualizado correctamente!');
        loadProducts();
      }
    } catch (err) {
      console.error('Error updating product:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-950/95 text-slate-100 border border-slate-800 px-5 py-3.5 rounded-xl flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-500 animate-bounce" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center p-5 bg-slate-950/60 border border-slate-900 rounded-2xl backdrop-blur-xl">
        <div className="flex-1 w-full max-w-md relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por SKU, nombre, descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Categoría:</span>
          </div>
          <div className="flex bg-slate-900 border border-slate-850 p-0.5 rounded-xl overflow-x-auto w-full sm:w-auto">
            {['Todos', 'Servidores', 'Workstations', 'Networking', 'Almacenamiento'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-slate-850 text-cyan-400 border border-slate-700/60 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {canModify && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/20"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Producto</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-24 bg-slate-950/20 border border-slate-900 rounded-3xl">
          <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-500">Cargando catálogo maestro...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-slate-950/20 border border-slate-900 rounded-3xl text-slate-500 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-700 mx-auto" />
          <h3 className="font-semibold text-slate-400">Sin productos disponibles</h3>
          <p className="text-xs text-slate-600">Prueba cambiando los términos de búsqueda o filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <div 
              key={p.id} 
              className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden shadow-lg backdrop-blur-xl flex flex-col justify-between hover:border-slate-800 hover:shadow-2xl hover:shadow-cyan-950/5 transition-all group"
            >
              <div>
                {/* Header Image & Tags */}
                <div className="relative h-44 bg-slate-900 overflow-hidden">
                  <img 
                    src={p.image_url || '/assets/enterprise_server_rack.png'} 
                    alt={p.name}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wider text-cyan-400 font-mono">
                    {p.sku}
                  </div>
                  <div className="absolute top-3 right-3 bg-slate-950/90 rounded-full p-1.5 border border-slate-850 shadow-md">
                    {getCategoryIcon(p.category)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">{p.category}</span>
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors leading-snug truncate">
                      {p.name}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                    {p.description}
                  </p>

                  {/* Role Specific Details Card */}
                  {currentRole === 'vendedor' && (
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Almacén:</span>
                        <strong className="text-slate-300 font-medium">{p.warehouse_location || 'Central'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Stock:</span>
                        <strong className="text-emerald-400">{p.stock} unidades</strong>
                      </div>
                    </div>
                  )}

                  {currentRole === 'soporte' && (
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl text-xs space-y-1">
                      <div className="text-amber-400 font-semibold block border-b border-slate-850 pb-1 mb-1">
                        🛠️ Soporte
                      </div>
                      <div className="truncate text-slate-300">
                        <span className="text-slate-500 mr-1">Falla:</span> 
                        {p.support_info?.common_issue || 'Sin fallas'}
                      </div>
                      <div className="text-slate-400">
                        <span className="text-slate-500 mr-1">FW:</span> 
                        {p.support_info?.firmware_ver || 'v1.0.0'}
                      </div>
                    </div>
                  )}

                  {currentRole === 'tecnico' && (
                    <div className="bg-slate-900/60 border border-slate-850 p-3 rounded-xl text-[11px] space-y-1">
                      <div className="text-cyan-400 font-semibold block border-b border-slate-850 pb-1 mb-1">
                        ⚡ Hardware Specs
                      </div>
                      <div className="truncate text-slate-300"><span className="text-slate-500 mr-1">CPU:</span> {p.specs?.processor || 'N/A'}</div>
                      <div className="truncate text-slate-300"><span className="text-slate-500 mr-1">RAM:</span> {p.specs?.ram || 'N/A'}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer pricing and action */}
              <div className="p-5 pt-0 border-t border-slate-900 mt-4 flex items-center justify-between">
                <div className="flex items-center text-slate-200">
                  <DollarSign className="w-4 h-4 text-cyan-500" />
                  <strong className="text-base font-extrabold text-cyan-400">
                    {p.price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-bold ml-1 font-mono">USD</span>
                </div>

                {canModify ? (
                  <button
                    onClick={() => handleEditClick(p)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 p-2 border border-slate-850 rounded-xl transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                    <Activity className="w-3.5 h-3.5 text-slate-600" />
                    Verificado
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: ADD PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-500" />
                Agregar Nuevo Equipo al Catálogo
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-850 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Código SKU (Único)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. SRV-EPIC-2U"
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({...newProductForm, sku: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Servidor Enterprise SiteCore"
                    value={newProductForm.name}
                    onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Categoría</label>
                  <select
                    value={newProductForm.category}
                    onChange={(e) => setNewProductForm({...newProductForm, category: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="Servidores">Servidores</option>
                    <option value="Workstations">Workstations</option>
                    <option value="Networking">Networking</option>
                    <option value="Almacenamiento">Almacenamiento</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Precio de Lista (USD)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="4500"
                    value={newProductForm.price || ''}
                    onChange={(e) => setNewProductForm({...newProductForm, price: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Stock Físico</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="10"
                    value={newProductForm.stock || ''}
                    onChange={(e) => setNewProductForm({...newProductForm, stock: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase block">Ubicación del Almacén</label>
                  <input
                    type="text"
                    placeholder="Ej. Almacén Central A-12"
                    value={newProductForm.warehouse_location}
                    onChange={(e) => setNewProductForm({...newProductForm, warehouse_location: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Descripción Corta</label>
                <textarea
                  required
                  placeholder="Describe las características generales, uso clave e infraestructura sugerida..."
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                />
              </div>

              <div className="border-t border-slate-850 pt-4 space-y-3">
                <span className="text-xs font-bold text-cyan-400 block">Especificaciones Técnicas (Opcional)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-semibold block">Procesador / CPU</label>
                    <input
                      type="text"
                      placeholder="Intel Xeon / AMD EPYC"
                      value={newProductForm.processor}
                      onChange={(e) => setNewProductForm({...newProductForm, processor: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-semibold block">Memoria RAM</label>
                    <input
                      type="text"
                      placeholder="64GB DDR5 ECC"
                      value={newProductForm.ram}
                      onChange={(e) => setNewProductForm({...newProductForm, ram: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-semibold block">Almacenamiento / SSD</label>
                    <input
                      type="text"
                      placeholder="2x 2TB NVMe"
                      value={newProductForm.storage}
                      onChange={(e) => setNewProductForm({...newProductForm, storage: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4 space-y-3">
                <span className="text-xs font-bold text-amber-500 block">Soporte Técnico (Fallas Comunes)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-semibold block">Falla Común / Alerta</label>
                    <input
                      type="text"
                      placeholder="Ej. Código BMC LED 0xAF"
                      value={newProductForm.common_issue}
                      onChange={(e) => setNewProductForm({...newProductForm, common_issue: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 font-semibold block">Solución Técnica Sugerida</label>
                    <input
                      type="text"
                      placeholder="Ej. Verificar ventilador #3"
                      value={newProductForm.solution}
                      onChange={(e) => setNewProductForm({...newProductForm, solution: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-850 -mx-6 -mb-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-md shadow-cyan-950/20"
                >
                  Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDIT PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-slate-950/80 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-semibold font-mono">Editar SKU: {editingProduct.sku}</span>
                <h3 className="text-sm font-semibold text-slate-100">
                  Modificar Precio & Descripción
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-850 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
                <span className="text-[9px] text-slate-500 block uppercase font-semibold">Producto Seleccionado:</span>
                <span className="text-xs font-bold text-slate-200 block mt-0.5">{editingProduct.name}</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Precio de Venta (USD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editForm.price || ''}
                    onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-6 pr-10 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] text-slate-500 font-bold font-mono">USD</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">Descripción del Producto</label>
                <textarea
                  required
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none leading-relaxed"
                />
              </div>

              <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-850 -mx-6 -mb-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-md shadow-cyan-950/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
