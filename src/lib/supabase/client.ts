import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export let supabase: any = null;
export let isSupabaseConfigured = false;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-url')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isSupabaseConfigured = true;
    console.log('⚡ Supabase Client initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Error initializing Supabase client, using local storage database:', err);
  }
} else {
  console.log('ℹ️ Running in Local Fallback mode (Supabase URL/Key missing in .env).');
}

// ==============================================================
// TYPE DEFINITIONS
// ==============================================================

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  metadata?: {
    sku?: string;
    name?: string;
    price?: number;
    stock?: number;
    warehouse?: string;
    specs?: string;
    solution?: string;
  };
}

export interface HistoryRecord {
  id: string;
  date: string;
  client: string;
  query: string;
  response: string;
  status: 'Aprobada' | 'Pendiente' | 'Rechazada';
  metadata?: any;
}

export interface CatalogAsset {
  id: string;
  fileName: string;
  uploadDate: string;
  status: 'Validado' | 'Con error';
  errors?: string[];
  size: string;
}

// ==============================================================
// LOCAL STORAGE FALLBACK SEED DATA
// ==============================================================

const SEED_HISTORY: HistoryRecord[] = [
  {
    id: 'h1',
    date: '2026-07-21',
    client: 'Banco Azteca / Ventas',
    query: 'Necesitamos cotización de 5 servidores de doble procesador para virtualización.',
    response: 'Asistente: Servidor Enterprise Rack SiteCore 2U X9 con 2x AMD EPYC (192 núcleos totales), 512GB RAM, 4x 3.84TB NVMe. Precio unitario: $97,000.00 MXN. Stock disponible: 14 unidades.',
    status: 'Aprobada'
  },
  {
    id: 'h2',
    date: '2026-07-20',
    client: 'Walmart Redes / Soporte',
    query: 'El switch óptico de fibra en sucursal 47 muestra advertencia en el puerto SFP+.',
    response: 'Asistente: Alerta por transceptor SFP+ de terceros en canal 47. Solución: Inspeccionar y sustituir con transceptor certificado Site-Optics SR-10G. Firmware recomendado: SiteOS v12.4.2.',
    status: 'Pendiente'
  },
  {
    id: 'h3',
    date: '2026-07-19',
    client: 'Femsa TI / Técnico',
    query: '¿Cuáles son las dimensiones físicas y consumo TDP de la laptop TitanBook Pro 16?',
    response: 'Asistente: Dimensiones: 356 x 248 x 19.9 mm. Peso: 2.15 kg. Consumo TDP: Adaptador GaN 280W Smart Charge. GPU dedicada NVIDIA RTX 4080.',
    status: 'Aprobada'
  },
  {
    id: 'h4',
    date: '2026-07-18',
    client: 'Cemex Corp / Ventas',
    query: 'Cotizar almacenamiento NAS con soporte para cifrado por hardware.',
    response: 'Asistente: Almacenamiento DataVault NAS 8-Bay, Xeon E-2336 6-Core, 32GB RAM, encriptación AES-256 por hardware. Precio: $63,000.00 MXN.',
    status: 'Rechazada'
  }
];

const SEED_CATALOGS: CatalogAsset[] = [
  {
    id: 'cat-1',
    fileName: 'catalogo_servidores_q2_2026.xlsx',
    uploadDate: '2026-07-15',
    status: 'Validado',
    size: '4.2 MB'
  },
  {
    id: 'cat-2',
    fileName: 'ficha_tecnica_titanbook.pdf',
    uploadDate: '2026-07-18',
    status: 'Validado',
    size: '1.8 MB'
  },
  {
    id: 'cat-3',
    fileName: 'matriz_precios_networking_v2.xlsx',
    uploadDate: '2026-07-21',
    status: 'Con error',
    errors: [
      'Celda vacía en columna "Precio" (Fila 12, SKU: SWT-FIBER-48P)',
      'Código SKU duplicado en Fila 24 (LTP-PRO-16X)'
    ],
    size: '2.5 MB'
  }
];

// Helper to initialize local storage
const getLocalStorageData = <T>(key: string, defaultData: T): T => {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
};

const setLocalStorageData = <T>(key: string, data: T): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

// ==============================================================
// DATABASE API SIGNATURES (Supabase with LocalStorage Fallback)
// ==============================================================

/**
 * SELECT: Obtener el historial de consultas del portal.
 * Soporta filtros opcionales de fecha y estado de aprobación.
 */
export async function fetchHistory(statusFilter?: string, searchFilter?: string): Promise<HistoryRecord[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('audit_history').select('*').order('date', { ascending: false });
      
      if (statusFilter && statusFilter !== 'Todos') {
        query = query.eq('status', statusFilter);
      }
      if (searchFilter) {
        query = query.or(`client.ilike.%${searchFilter}%,query.ilike.%${searchFilter}%`);
      }
      
      const { data, error } = await query;
      if (!error && data) return data as HistoryRecord[];
      console.warn('Supabase fetchHistory error, falling back to local database:', error);
    } catch (err) {
      console.error('Supabase fetchHistory exception:', err);
    }
  }

  // Fallback local storage database
  const history = getLocalStorageData<HistoryRecord[]>('site_solutions_history', SEED_HISTORY);
  let filtered = [...history];

  if (statusFilter && statusFilter !== 'Todos') {
    filtered = filtered.filter(item => item.status === statusFilter);
  }
  if (searchFilter) {
    const term = searchFilter.toLowerCase();
    filtered = filtered.filter(item => 
      item.client.toLowerCase().includes(term) || 
      item.query.toLowerCase().includes(term) ||
      item.response.toLowerCase().includes(term)
    );
  }

  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * INSERT: Registrar una nueva interacción de chat en el historial.
 * Agrega el mensaje al registro de auditoría en estado 'Pendiente'.
 */
export async function insertHistoryRecord(record: Omit<HistoryRecord, 'id'>): Promise<HistoryRecord> {
  const newRecord: HistoryRecord = {
    ...record,
    id: 'h-' + Math.random().toString(36).substr(2, 9)
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_history')
        .insert([newRecord])
        .select()
        .single();
      
      if (!error && data) return data as HistoryRecord;
      console.warn('Supabase insert error, falling back:', error);
    } catch (err) {
      console.error('Supabase insert exception:', err);
    }
  }

  // Fallback
  const history = getLocalStorageData<HistoryRecord[]>('site_solutions_history', SEED_HISTORY);
  history.unshift(newRecord);
  setLocalStorageData('site_solutions_history', history);
  return newRecord;
}

/**
 * UPDATE: Cambiar el estado de aprobación de una consulta (Aprobada, Rechazada, Pendiente).
 */
export async function updateApprovalStatus(id: string, status: 'Aprobada' | 'Pendiente' | 'Rechazada'): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('audit_history')
        .update({ status })
        .eq('id', id);
      
      if (!error) return true;
      console.warn('Supabase update error, falling back:', error);
    } catch (err) {
      console.error('Supabase update exception:', err);
    }
  }

  // Fallback
  const history = getLocalStorageData<HistoryRecord[]>('site_solutions_history', SEED_HISTORY);
  const index = history.findIndex(item => item.id === id);
  if (index !== -1) {
    history[index].status = status;
    setLocalStorageData('site_solutions_history', history);
    return true;
  }
  return false;
}

/**
 * SELECT: Consultar el catálogo de archivos activos e históricos de carga.
 */
export async function fetchCatalogs(): Promise<CatalogAsset[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .select('*')
        .order('uploadDate', { ascending: false });
      
      if (!error && data) return data as CatalogAsset[];
      console.warn('Supabase fetchCatalogs error, falling back:', error);
    } catch (err) {
      console.error('Supabase fetchCatalogs exception:', err);
    }
  }

  return getLocalStorageData<CatalogAsset[]>('site_solutions_catalogs', SEED_CATALOGS);
}

/**
 * INSERT & VALIDATE: Simular la carga de un archivo de catálogo,
 * aplicando validaciones estructurales de calidad de datos.
 */
export async function uploadCatalogFile(fileName: string, fileSize: string): Promise<CatalogAsset> {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Reglas de validación simuladas (si contiene "error" o es de cierto tipo)
  let status: 'Validado' | 'Con error' = 'Validado';
  let errors: string[] = [];

  if (fileName.toLowerCase().includes('error') || fileName.toLowerCase().includes('temp')) {
    status = 'Con error';
    errors = [
      'Celda vacía detectada en la columna "Código de Barras" (Fila 8)',
      'Error de tipo: Se esperaba valor DECIMAL en columna "Precio" (Fila 19, valor: "Consultar")',
      'SKU no registrado en catálogo maestro: SWT-FAST-8P (Fila 34)'
    ];
  } else if (extension !== 'xlsx' && extension !== 'pdf') {
    status = 'Con error';
    errors = [
      'Formato de archivo inválido. Solo se admiten archivos Excel (.xlsx) o fichas técnicas PDF (.pdf).'
    ];
  }

  const newCatalog: CatalogAsset = {
    id: 'cat-' + Math.random().toString(36).substr(2, 9),
    fileName,
    uploadDate: new Date().toISOString().split('T')[0],
    status,
    errors,
    size: fileSize
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .insert([newCatalog])
        .select()
        .single();
      
      if (!error && data) return data as CatalogAsset;
      console.warn('Supabase upload insert error, falling back:', error);
    } catch (err) {
      console.error('Supabase upload exception:', err);
    }
  }

  const catalogs = getLocalStorageData<CatalogAsset[]>('site_solutions_catalogs', SEED_CATALOGS);
  catalogs.unshift(newCatalog);
  setLocalStorageData('site_solutions_catalogs', catalogs);
  return newCatalog;
}

/**
 * UPDATE: Confirmar validación de errores del catálogo y forzar estado "Validado".
 */
export async function repairCatalogErrors(id: string): Promise<CatalogAsset | null> {
  let updatedCatalog: CatalogAsset | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .update({ status: 'Validado', errors: [] })
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as CatalogAsset;
    } catch (err) {
      console.error('Supabase repair exception:', err);
    }
  }

  // Fallback
  const catalogs = getLocalStorageData<CatalogAsset[]>('site_solutions_catalogs', SEED_CATALOGS);
  const index = catalogs.findIndex(item => item.id === id);
  if (index !== -1) {
    catalogs[index].status = 'Validado';
    catalogs[index].errors = [];
    updatedCatalog = catalogs[index];
    setLocalStorageData('site_solutions_catalogs', catalogs);
  }
  return updatedCatalog;
}

/**
 * AUTH: Iniciar sesión con Google (Soporta Supabase OAuth y fallback simulado).
 */
export async function signInWithGoogle(email: string = 'admin@sitesolutions.com'): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : ''
        }
      });
      if (error) throw error;
      return;
    } catch (err) {
      console.error('Supabase Google Sign-In error:', err);
    }
  }

  // Fallback local storage login simulation
  const name = email.split('@')[0];
  const user = {
    id: 'u-' + Math.random().toString(36).substr(2, 9),
    email,
    user_metadata: {
      full_name: name.charAt(0).toUpperCase() + name.slice(1) + ' (Demo)',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
    }
  };
  setLocalStorageData('site_solutions_session', user);
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

/**
 * AUTH: Cerrar sesión actual.
 */
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Supabase Sign-Out error:', err);
    }
  }
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('site_solutions_session');
    window.location.reload();
  }
}

/**
 * AUTH: Obtener usuario actual en sesión.
 */
export async function getCurrentUser(): Promise<any> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) return data.user;
    } catch (err) {
      console.error('Supabase getUser error:', err);
    }
  }
  return getLocalStorageData<any>('site_solutions_session', null);
}

// ==============================================================
// PRODUCT DATA Master Operations (Local Storage & Supabase Sync)
// ==============================================================

const SEED_PRODUCTS = [
  {
    id: 'p1',
    sku: 'SRV-EPIC-2U',
    name: 'Servidor Enterprise Rack SiteCore 2U X9',
    category: 'Servidores',
    brand: 'Site Solutions',
    price: 97000.00,
    stock: 14,
    warehouse_location: 'Almacén Central A-12',
    description: 'Servidor de doble socket diseñado para virtualización masiva (VMware/Proxmox) y cargas de trabajo críticas de base de datos SQL.',
    image_url: '/assets/enterprise_server_rack.png',
    status: 'Disponible',
    specs: {
      processor: '2x AMD EPYC 9654 (192 Cores Total @ 3.7GHz Boost)',
      ram: '512 GB DDR5 ECC Register 4800MHz (Expandible a 3TB)',
      storage: '4x 3.84TB NVMe U.2 Enterprise SSD RAID 10 + 2x Hot Swap Bays',
      graphics: 'ASPEED AST2600 BMC iGPU',
      power_consumption_tdp: '800W Dual Platinum Redundant PSU (100-240V)',
      operating_temp: '10°C - 35°C',
      dimensions: '438 x 87 x 750 mm (2U Standard Rack)',
      weight: '24.5 kg',
      warranty_months: 36,
      socket: 'Dual Socket SP5',
      driver_download_url: '#download-drivers-srv',
      manual_url: '#manual-pdf-srv'
    },
    support_info: {
      common_issue: 'Código de error BMC LED 0xAF (Entorno térmico elevado)',
      solution: 'Verificar flujo de aire en bahía posterior de ventiladores hot-swap #3 y reemplazar filtro de polvo.',
      firmware_ver: 'v4.18.9-release-stable'
    }
  },
  {
    id: 'p2',
    sku: 'LTP-PRO-16X',
    name: 'Workstation Laptop TitanBook Pro 16',
    category: 'Workstations',
    brand: 'Site Solutions',
    price: 49990.00,
    stock: 28,
    warehouse_location: 'Almacén Norte B-04',
    description: 'Workstation móvil ultra-resistente en aleación de titanio y magnesio con certificación militar MIL-STD-810H para ingenieros de campo.',
    image_url: '/assets/pro_workstation_laptop.png',
    status: 'Disponible',
    specs: {
      processor: 'Intel Core i9-14900HX (24 Núcleos, hasta 5.8 GHz)',
      ram: '64 GB DDR5 5600MHz Dual Channel',
      storage: '2TB PCIe Gen4 M.2 NVMe SSD (7400 MB/s)',
      graphics: 'NVIDIA RTX 4080 Laptop GPU 12GB GDDR6 VRAM',
      power_consumption_tdp: 'Adaptador GaN 280W Smart Charge',
      operating_temp: '0°C - 45°C',
      dimensions: '356 x 248 x 19.9 mm',
      weight: '2.15 kg',
      warranty_months: 24,
      socket: 'BGA1964 (Soldado)',
      driver_download_url: '#download-drivers-ltp',
      manual_url: '#manual-pdf-ltp'
    },
    support_info: {
      common_issue: 'Parpadeo puntual de pantalla al conectar mediante Thunderbolt 4 dual',
      solution: 'Actualizar driver de gráficos a la versión v552.12 e instalar el firmware BIOS v1.14.',
      firmware_ver: 'BIOS v1.14 - EC v0.9'
    }
  },
  {
    id: 'p3',
    sku: 'SWT-FIBER-48P',
    name: 'Switch de Red Óptica SwitchNet 48P SFP+',
    category: 'Networking',
    brand: 'Site Solutions',
    price: 37800.00,
    stock: 9,
    warehouse_location: 'Almacén Redes C-01',
    description: 'Switch L3 totalmente administrable con 48 puertos 1GbE RJ45 PoE+ (740W totales) y 4 puertos uplink 10G SFP+ para fibra.',
    image_url: '/assets/fiber_network_switch.png',
    status: 'En Stock Reducido',
    specs: {
      processor: 'Marvell ARMADA Dual-Core 1.6GHz ASIC Packet Switch Engine',
      ram: '4GB DDR4 High-Speed Buffer Memory',
      storage: '1GB NAND Flash Firmware OS Container',
      graphics: 'N/A',
      power_consumption_tdp: '820W Max (Con carga PoE completa)',
      operating_temp: '-5°C - 50°C',
      dimensions: '440 x 44 x 380 mm (1U Rack Mount)',
      weight: '6.8 kg',
      warranty_months: 60,
      socket: 'N/A Hardware Integrado',
      driver_download_url: '#download-drivers-swt',
      manual_url: '#manual-pdf-swt'
    },
    support_info: {
      common_issue: 'Alerta de sobrecalentamiento en módulo SFP+ de canal 47',
      solution: 'Revisar transceptor de fibra de baja calidad de terceros. Se recomienda transceptor certificado Site-Optics SR-10G.',
      firmware_ver: 'SiteOS v12.4.2-Build88'
    }
  },
  {
    id: 'p4',
    sku: 'NAS-ENTERPRISE-8B',
    name: 'Almacenamiento Redundante DataVault NAS 8-Bay',
    category: 'Almacenamiento',
    brand: 'Site Solutions',
    price: 63000.00,
    stock: 5,
    warehouse_location: 'Almacén Central A-05',
    description: 'Matriz NAS de 8 bahías hot-swap con ZFS preconfigurado y snapshots inmutables anti-ransomware.',
    image_url: '/assets/hero_tech_banner.png',
    status: 'Disponible',
    specs: {
      processor: 'Intel Xeon E-2336 6-Core / 12-Threads 2.9GHz',
      ram: '32GB DDR4 ECC Unbuffered (Máximo 128GB)',
      storage: '8x Bahías 3.5" Hot-Swap SAS/SATA + 2x M.2 NVMe Cache Slots',
      graphics: 'Intel UHD Graphics P750',
      power_consumption_tdp: '350W Redundant Gold Efficiency PSU',
      operating_temp: '5°C - 40°C',
      dimensions: '482 x 88 x 520 mm (2U)',
      weight: '16.2 kg',
      warranty_months: 36,
      socket: 'LGA1200',
      driver_download_url: '#download-drivers-nas',
      manual_url: '#manual-pdf-nas'
    },
    support_info: {
      common_issue: 'Degradación de arreglo RAID ZFS por fallo de disco en bay #4',
      solution: 'Reemplazar disco defectuoso en caliente y ejecutar comando "zpool replace datavault /dev/sdX".',
      firmware_ver: 'DataOS ZFS v5.0.1'
    }
  }
];

/**
 * SELECT: Obtener todos los productos.
 */
export async function fetchProducts(categoryFilter?: string, searchFilter?: string): Promise<any[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('products').select('*');
      
      if (categoryFilter && categoryFilter !== 'Todos') {
        query = query.eq('category', categoryFilter);
      }
      if (searchFilter) {
        query = query.ilike('name', `%${searchFilter}%`);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        return data.map(item => ({
          ...item,
          specs: item.specs || { warranty_months: 36 }
        }));
      }
      console.warn('Supabase fetchProducts error, falling back:', error);
    } catch (err) {
      console.error('Supabase fetchProducts exception:', err);
    }
  }

  // Fallback
  const products = getLocalStorageData<any[]>('site_solutions_products', SEED_PRODUCTS);
  let filtered = [...products];
  
  if (categoryFilter && categoryFilter !== 'Todos') {
    filtered = filtered.filter(p => p.category === categoryFilter);
  }
  if (searchFilter) {
    const term = searchFilter.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }
  return filtered;
}

/**
 * INSERT: Agregar un nuevo producto al catálogo.
 */
export async function insertProduct(productData: any): Promise<any> {
  const newProduct = {
    ...productData,
    id: productData.id || 'p-' + Math.random().toString(36).substr(2, 9),
    specs: productData.specs || {
      processor: 'N/A',
      ram: 'N/A',
      storage: 'N/A',
      graphics: 'N/A',
      power_consumption_tdp: 'N/A',
      operating_temp: 'N/A',
      dimensions: 'N/A',
      weight: 'N/A',
      warranty_months: 36
    },
    support_info: productData.support_info || {
      common_issue: 'Ninguno reportado',
      solution: 'Contactar soporte técnico',
      firmware_ver: 'v1.0.0'
    }
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();
      
      if (!error && data) return data;
      console.warn('Supabase insertProduct error, falling back:', error);
    } catch (err) {
      console.error('Supabase insertProduct exception:', err);
    }
  }

  // Fallback
  const products = getLocalStorageData<any[]>('site_solutions_products', SEED_PRODUCTS);
  products.push(newProduct);
  setLocalStorageData('site_solutions_products', products);
  return newProduct;
}

/**
 * UPDATE: Editar precio y descripción de un producto.
 */
export async function updateProduct(id: string, updates: { price: number; description: string }): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          price: updates.price,
          description: updates.description
        })
        .eq('id', id);
      
      if (!error) return true;
      console.warn('Supabase updateProduct error, falling back:', error);
    } catch (err) {
      console.error('Supabase updateProduct exception:', err);
    }
  }

  // Fallback
  const products = getLocalStorageData<any[]>('site_solutions_products', SEED_PRODUCTS);
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index].price = updates.price;
    products[index].description = updates.description;
    setLocalStorageData('site_solutions_products', products);
    return true;
  }
  return false;
}
