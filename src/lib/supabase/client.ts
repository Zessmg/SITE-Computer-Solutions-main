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
  status: 'Validado' | 'Con error' | 'Pendiente';
  errors?: string[];
  size: string;
  url?: string;
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
    status: 'Aprobada',
    metadata: {
      sku: 'SRV-EPIC-2U',
      name: 'Servidor Enterprise Rack SiteCore 2U X9',
      price: 97000.00,
      stock: 14,
      warehouse: 'Almacén Central'
    }
  },
  {
    id: 'h2',
    date: '2026-07-20',
    client: 'Walmart Redes / Soporte',
    query: 'El switch óptico de fibra en sucursal 47 muestra advertencia en el puerto SFP+.',
    response: 'Asistente: Alerta por transceptor SFP+ de terceros en canal 47. Solución: Inspeccionar y sustituir con transceptor certificado Site-Optics SR-10G. Firmware recomendado: SiteOS v12.4.2.',
    status: 'Pendiente',
    metadata: {
      sku: 'SWT-FIBER-48P',
      name: 'Switch de Red Optica SwitchNet 48P SFP+',
      price: 37800.00,
      stock: 9,
      warehouse: 'Almacén Noreste'
    }
  },
  {
    id: 'h3',
    date: '2026-07-19',
    client: 'Femsa TI / Técnico',
    query: '¿Cuáles son las dimensiones físicas y consumo TDP de la laptop TitanBook Pro 16?',
    response: 'Asistente: Dimensiones: 356 x 248 x 19.9 mm. Peso: 2.15 kg. Consumo TDP: Adaptador GaN 280W Smart Charge. GPU dedicada NVIDIA RTX 4080.',
    status: 'Aprobada',
    metadata: {
      sku: 'LTP-PRO-16X',
      name: 'Workstation Laptop TitanBook Pro 16',
      price: 49500.00,
      stock: 22,
      warehouse: 'Almacén Central'
    }
  },
  {
    id: 'h4',
    date: '2026-07-18',
    client: 'Cemex Corp / Ventas',
    query: 'Cotizar almacenamiento NAS con soporte para cifrado por hardware.',
    response: 'Asistente: Almacenamiento DataVault NAS 8-Bay, Xeon E-2336 6-Core, 32GB RAM, encriptación AES-256 por hardware. Precio: $63,000.00 MXN.',
    status: 'Rechazada',
    metadata: {
      sku: 'NAS-ENTERPRISE-8B',
      name: 'Almacenamiento Redundante DataVault NAS 8-Bay',
      price: 63000.00,
      stock: 5,
      warehouse: 'Almacén Central'
    }
  }
];

const SEED_CATALOGS: CatalogAsset[] = [
  {
    id: 'cat-1',
    fileName: 'catalogo_servidores_q2_2026.xlsx',
    uploadDate: '2026-07-15',
    status: 'Pendiente',
    size: '4.2 MB',
    url: 'https://bpcodbujtqqlnzxvfsyx.supabase.co/storage/v1/object/public/catalogs/catalogo_servidores_q2_2026.xlsx'
  },
  {
    id: 'cat-2',
    fileName: 'ficha_tecnica_titanbook.pdf',
    uploadDate: '2026-07-18',
    status: 'Validado',
    size: '1.8 MB',
    url: 'https://bpcodbujtqqlnzxvfsyx.supabase.co/storage/v1/object/public/catalogs/ficha_tecnica_titanbook.pdf'
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
    size: '2.5 MB',
    url: 'https://bpcodbujtqqlnzxvfsyx.supabase.co/storage/v1/object/public/catalogs/matriz_precios_networking_v2.xlsx'
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
  
  // Cache sync: si la base de datos estática semilla del catálogo cambió de tamaño,
  // invalidamos el caché local del navegador para forzar la carga de los nuevos productos.
  if (key === 'site_solutions_products' && Array.isArray(defaultData)) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length < defaultData.length) {
        localStorage.setItem(key, JSON.stringify(defaultData));
        return defaultData;
      }
    } catch (e) {
      console.error('Error synchronizing local products seed cache:', e);
    }
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
export async function updateApprovalStatus(
  id: string, 
  status: 'Aprobada' | 'Pendiente' | 'Rechazada',
  approvedBy: string = 'Sistema'
): Promise<boolean> {
  const approvedAt = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Obtener el metadata actual para no pisar otros campos
      const { data: record } = await supabase
        .from('audit_history')
        .select('metadata')
        .eq('id', id)
        .single();
        
      const currentMetadata = record?.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        approvedBy,
        approvedAt
      };

      const { error } = await supabase
        .from('audit_history')
        .update({ status, metadata: updatedMetadata })
        .eq('id', id);
      
      if (!error) return true;
      console.warn('Supabase update error, falling back:', error);
    } catch (err) {
      console.error('Supabase update exception:', err);
    }
  }

  // Fallback local storage
  const history = getLocalStorageData<HistoryRecord[]>('site_solutions_history', SEED_HISTORY);
  const index = history.findIndex(item => item.id === id);
  if (index !== -1) {
    const currentMetadata = history[index].metadata || {};
    history[index].status = status;
    history[index].metadata = {
      ...currentMetadata,
      approvedBy,
      approvedAt
    };
    setLocalStorageData('site_solutions_history', history);
  }
  return false;
}

/**
 * DELETE: Eliminar un registro de cotización del historial de auditoría.
 */
export async function deleteHistoryRecord(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('audit_history')
        .delete()
        .eq('id', id);
      
      if (!error) return true;
      console.warn('Supabase delete error, falling back:', error);
    } catch (err) {
      console.error('Supabase delete exception:', err);
    }
  }

  // Fallback
  try {
    const history = getLocalStorageData<HistoryRecord[]>('site_solutions_history', SEED_HISTORY);
    const updatedHistory = history.filter(item => item.id !== id);
    setLocalStorageData('site_solutions_history', updatedHistory);
    return true;
  } catch (err) {
    console.error('Local delete failed:', err);
    return false;
  }
}

/**
 * SELECT: Consultar el catálogo de archivos activos e históricos de carga.
 */
export async function fetchCatalogs(): Promise<CatalogAsset[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Obtener archivos registrados en la tabla de base de datos
      const { data: dbCatalogs, error: dbError } = await supabase
        .from('catalogs')
        .select('*')
        .order('uploadDate', { ascending: false });
      
      let catalogsList = dbError || !dbCatalogs ? [] : (dbCatalogs as CatalogAsset[]);

      // 2. Obtener lista de archivos reales en el bucket de Storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('catalogs')
        .list('', { limit: 100 });

      if (!storageError && Array.isArray(storageFiles)) {
        // Ignorar placeholders vacíos por defecto
        const filteredStorage = storageFiles.filter(
          f => f.name !== '.emptyFolderPlaceholder' && f.name !== '.placeholder'
        );

        // Identificar archivos en Storage que NO están en la base de datos (subidos externamente)
        const newSyncItems: CatalogAsset[] = [];
        
        for (const file of filteredStorage) {
          const existsInDb = catalogsList.some(c => c.fileName === file.name);
          if (!existsInDb) {
            const extension = file.name.split('.').pop()?.toLowerCase();
            const defaultUrl = 'https://bpcodbujtqqlnzxvfsyx.supabase.co';
            const finalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
            const fileUrl = `${finalSupabaseUrl}/storage/v1/object/public/catalogs/${file.name}`;
            
            // Validar extensión
            let status: 'Validado' | 'Con error' = 'Validado';
            let errors: string[] = [];
            if (extension !== 'xlsx' && extension !== 'pdf' && extension !== 'docx' && extension !== 'doc') {
              status = 'Con error';
              errors = ['Formato no soportado en carga externa o manual.'];
            }

            const newCatalog: CatalogAsset = {
              id: 'cat-sync-' + Math.random().toString(36).substr(2, 9),
              fileName: file.name,
              uploadDate: file.created_at ? file.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              status,
              errors,
              size: file.metadata?.size ? (file.metadata.size / (1024 * 1024)).toFixed(2) + ' MB' : '0.1 MB',
              url: fileUrl
            };

            newSyncItems.push(newCatalog);
          }
        }

        // Si hay nuevos elementos encontrados en Storage, intentamos guardarlos en la base de datos para persistirlos
        if (newSyncItems.length > 0) {
          await supabase
            .from('catalogs')
            .insert(newSyncItems);
          
          // Incluso si falla la inserción por políticas RLS en la base de datos,
          // los añadimos al listado en memoria para que se muestren de inmediato en el portal.
          catalogsList = [...newSyncItems, ...catalogsList];
        }
      }

      if (!dbError && dbCatalogs && catalogsList.length > 0) {
        return catalogsList;
      }
      
      console.warn('Supabase fetchCatalogs empty or error, falling back:', dbError || 'Empty database');
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
export async function uploadCatalogFile(fileName: string, fileSize: string, fileObject?: File): Promise<CatalogAsset> {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Reglas de validación simuladas (si contiene "error" o es de cierto tipo)
  let status: 'Validado' | 'Con error' | 'Pendiente' = 'Pendiente';
  let errors: string[] = [];

  if (fileName.toLowerCase().includes('error') || fileName.toLowerCase().includes('temp')) {
    status = 'Con error';
    if (extension === 'docx' || extension === 'doc') {
      errors = [
        'Falta estructura jerárquica de encabezados (H1, H2) requerida para la ingesta del motor de IA.',
        'Se detectaron 3 imágenes sin descripción alternativa (Alt Text) para procesamiento semántico.',
        'SKU de referencia SWT-FAST-8P no válido o no registrado en el cuerpo del manual técnico.'
      ];
    } else {
      errors = [
        'Celda vacía detectada en la columna "Código de Barras" (Fila 8)',
        'Error de tipo: Se esperaba valor DECIMAL en columna "Precio" (Fila 19, valor: "Consultar")',
        'SKU no registrado en catálogo maestro: SWT-FAST-8P (Fila 34)'
      ];
    }
  } else if (extension !== 'xlsx' && extension !== 'pdf' && extension !== 'docx' && extension !== 'doc') {
    status = 'Con error';
    errors = [
      'Formato de archivo inválido. Solo se admiten archivos Excel (.xlsx), fichas técnicas PDF (.pdf) o documentos Word (.docx, .doc).'
    ];
  } else {
    // Si el archivo está limpio y estructurado, su estado inicial es "Pendiente de revisión"
    status = 'Pendiente';
  }

  const defaultUrl = 'https://bpcodbujtqqlnzxvfsyx.supabase.co';
  const finalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultUrl;
  const fileUrl = `${finalSupabaseUrl}/storage/v1/object/public/catalogs/${fileName}`;

  const newCatalog: CatalogAsset = {
    id: 'cat-' + Math.random().toString(36).substr(2, 9),
    fileName,
    uploadDate: new Date().toISOString().split('T')[0],
    status,
    errors,
    size: fileSize,
    url: fileUrl
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Si se pasó el archivo físico, lo subimos a Supabase Storage
      if (fileObject) {
        const { error: storageError } = await supabase.storage
          .from('catalogs')
          .upload(fileName, fileObject, { cacheControl: '3600', upsert: true });
        
        if (storageError) {
          console.warn('Supabase storage upload error:', storageError.message);
        }
      }

      // 2. Insertamos la fila en la tabla de base de datos
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
 * DELETE: Eliminar uno o más archivos del catálogo histórico.
 */
export async function deleteCatalogs(ids: string[]): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('catalogs')
        .delete()
        .in('id', ids);
      
      if (!error) return true;
      console.warn('Supabase deleteCatalogs error, falling back:', error);
    } catch (err) {
      console.error('Supabase deleteCatalogs exception:', err);
    }
  }

  // Fallback local storage
  try {
    const catalogs = getLocalStorageData<CatalogAsset[]>('site_solutions_catalogs', SEED_CATALOGS);
    const filtered = catalogs.filter(item => !ids.includes(item.id));
    setLocalStorageData('site_solutions_catalogs', filtered);
    return true;
  } catch (err) {
    console.error('Local deleteCatalogs exception:', err);
    return false;
  }
}

/**
 * UPDATE: Confirmar revisión de un catálogo y cambiar estado a "Validado".
 */
export async function validateCatalog(id: string): Promise<CatalogAsset | null> {
  let updatedCatalog: CatalogAsset | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .update({ status: 'Validado' })
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as CatalogAsset;
    } catch (err) {
      console.error('Supabase validateCatalog exception:', err);
    }
  }

  // Fallback local storage
  const catalogs = getLocalStorageData<CatalogAsset[]>('site_solutions_catalogs', SEED_CATALOGS);
  const index = catalogs.findIndex(item => item.id === id);
  if (index !== -1) {
    catalogs[index].status = 'Validado';
    updatedCatalog = catalogs[index];
    setLocalStorageData('site_solutions_catalogs', catalogs);
  }
  return updatedCatalog;
}

/**
 * UPDATE: Revertir la validación de un catálogo y regresarlo a "Pendiente".
 */
export async function rollbackCatalog(id: string): Promise<CatalogAsset | null> {
  let updatedCatalog: CatalogAsset | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('catalogs')
        .update({ status: 'Pendiente' })
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as CatalogAsset;
    } catch (err) {
      console.error('Supabase rollbackCatalog exception:', err);
    }
  }

  // Fallback local storage
  const catalogs = getLocalStorageData<CatalogAsset[]>('site_solutions_catalogs', SEED_CATALOGS);
  const index = catalogs.findIndex(item => item.id === id);
  if (index !== -1) {
    catalogs[index].status = 'Pendiente';
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
    "id": "l-01",
    "sku": "NB-A14X",
    "name": "NovaByte NB-A14X",
    "category": "Laptop",
    "brand": "NovaByte",
    "price": 14500,
    "stock": 12,
    "warehouse_location": "Almacén Central A-02",
    "description": "Laptop delgada para oficina, 14\", uso general",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "l-02",
    "sku": "VX-Pro15",
    "name": "Vertex Systems VX-Pro15",
    "category": "Laptop",
    "brand": "Vertex Systems",
    "price": 21800,
    "stock": 7,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Laptop de rendimiento medio para diseño y multitarea",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "l-03",
    "sku": "OB-Light13",
    "name": "Orbis Tech OB-Light13",
    "category": "Laptop",
    "brand": "Orbis Tech",
    "price": 17300,
    "stock": 10,
    "warehouse_location": "Almacén Central A-02",
    "description": "Laptop ultraligera para movilidad y viajes",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "l-04",
    "sku": "TC-Work16",
    "name": "TechCore TC-Work16",
    "category": "Laptop",
    "brand": "TechCore",
    "price": 29900,
    "stock": 4,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Laptop robusta orientada a estaciones de trabajo móviles",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "d-01",
    "sku": "ZC-Office2",
    "name": "Zenith Computing ZC-Office2",
    "category": "Desktop",
    "brand": "Zenith Computing",
    "price": 9800,
    "stock": 15,
    "warehouse_location": "Almacén Central A-02",
    "description": "PC de escritorio para tareas administrativas",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "d-02",
    "sku": "AX-Creator",
    "name": "Apex Hardware AX-Creator",
    "category": "Desktop",
    "brand": "Apex Hardware",
    "price": 26500,
    "stock": 6,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "PC de escritorio orientada a edición multimedia",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Descontinuado (últimas piezas)",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "d-03",
    "sku": "SL-Compact",
    "name": "Solace PC SL-Compact",
    "category": "Desktop",
    "brand": "Solace PC",
    "price": 8200,
    "stock": 20,
    "warehouse_location": "Almacén Central A-02",
    "description": "Mini PC de escritorio de bajo consumo",
    "image_url": "/assets/pro_workstation_laptop.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 12
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "cpu-01",
    "sku": "QL-R5-4C",
    "name": "Quantum Line QL-R5-4C",
    "category": "Procesador",
    "brand": "Quantum Line",
    "price": 2200,
    "stock": 25,
    "warehouse_location": "Almacén Central A-02",
    "description": "Procesador de 4 núcleos para uso general",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "QL-R5-4C",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "cpu-02",
    "sku": "QL-R7-8C",
    "name": "Quantum Line QL-R7-8C",
    "category": "Procesador",
    "brand": "Quantum Line",
    "price": 5400,
    "stock": 14,
    "warehouse_location": "Almacén Central A-02",
    "description": "Procesador de 8 núcleos de alto rendimiento",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "QL-R7-8C",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "cpu-03",
    "sku": "FT-i5E-6C",
    "name": "Ferrotech FT-i5E-6C",
    "category": "Procesador",
    "brand": "Ferrotech",
    "price": 3600,
    "stock": 18,
    "warehouse_location": "Almacén Central A-02",
    "description": "Procesador de 6 núcleos eficiente en consumo",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "FT-i5E-6C",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "cpu-04",
    "sku": "FT-i9X-12C",
    "name": "Ferrotech FT-i9X-12C",
    "category": "Procesador",
    "brand": "Ferrotech",
    "price": 9800,
    "stock": 5,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Procesador de 12 núcleos gama entusiasta",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "FT-i9X-12C",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "gpu-01",
    "sku": "BC-GTX560",
    "name": "Bright Circuit BC-GTX560",
    "category": "Tarjeta gráfica",
    "brand": "Bright Circuit",
    "price": 4200,
    "stock": 16,
    "warehouse_location": "Almacén Central A-02",
    "description": "Tarjeta gráfica de entrada, 6GB VRAM",
    "image_url": "/assets/fiber_network_switch.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "BC-GTX560",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "gpu-02",
    "sku": "BC-GTX770",
    "name": "Bright Circuit BC-GTX770",
    "category": "Tarjeta gráfica",
    "brand": "Bright Circuit",
    "price": 7900,
    "stock": 9,
    "warehouse_location": "Almacén Central A-02",
    "description": "Tarjeta gráfica gama media, 8GB VRAM",
    "image_url": "/assets/fiber_network_switch.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "BC-GTX770",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "gpu-03",
    "sku": "NB-RTX90",
    "name": "NovaByte NB-RTX90",
    "category": "Tarjeta gráfica",
    "brand": "NovaByte",
    "price": 15600,
    "stock": 4,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Tarjeta gráfica gama alta, 12GB VRAM",
    "image_url": "/assets/fiber_network_switch.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "NB-RTX90",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "gpu-04",
    "sku": "NB-RTX95Ti",
    "name": "NovaByte NB-RTX95Ti",
    "category": "Tarjeta gráfica",
    "brand": "NovaByte",
    "price": 24800,
    "stock": 2,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Tarjeta gráfica premium, 16GB VRAM",
    "image_url": "/assets/fiber_network_switch.png",
    "status": "Por agotarse",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "NB-RTX95Ti",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "mb-01",
    "sku": "VX-B450M",
    "name": "Vertex Systems VX-B450M",
    "category": "Tarjeta madre",
    "brand": "Vertex Systems",
    "price": 1800,
    "stock": 20,
    "warehouse_location": "Almacén Central A-02",
    "description": "Tarjeta madre micro-ATX gama básica",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "mb-02",
    "sku": "VX-B650",
    "name": "Vertex Systems VX-B650",
    "category": "Tarjeta madre",
    "brand": "Vertex Systems",
    "price": 2900,
    "stock": 13,
    "warehouse_location": "Almacén Central A-02",
    "description": "Tarjeta madre ATX gama media",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "mb-03",
    "sku": "TC-Z690",
    "name": "TechCore TC-Z690",
    "category": "Tarjeta madre",
    "brand": "TechCore",
    "price": 5200,
    "stock": 7,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Tarjeta madre ATX gama alta con overclock",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "mb-04",
    "sku": "TC-ITX-Mini",
    "name": "TechCore TC-ITX-Mini",
    "category": "Tarjeta madre",
    "brand": "TechCore",
    "price": 3100,
    "stock": 6,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Tarjeta madre Mini-ITX compacta",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "ram-01",
    "sku": "OB-DDR4-8",
    "name": "Orbis Tech OB-DDR4-8",
    "category": "Memoria RAM",
    "brand": "Orbis Tech",
    "price": 750,
    "stock": 40,
    "warehouse_location": "Almacén Central A-02",
    "description": "Módulo DDR4 de 8GB, 3200MHz",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "Módulo DDR4 de 8GB, 3200MHz",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "ram-02",
    "sku": "OB-DDR4-16",
    "name": "Orbis Tech OB-DDR4-16",
    "category": "Memoria RAM",
    "brand": "Orbis Tech",
    "price": 1400,
    "stock": 30,
    "warehouse_location": "Almacén Central A-02",
    "description": "Módulo DDR4 de 16GB, 3200MHz",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "Módulo DDR4 de 16GB, 3200MHz",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "ram-03",
    "sku": "QL-DDR5-16",
    "name": "Quantum Line QL-DDR5-16",
    "category": "Memoria RAM",
    "brand": "Quantum Line",
    "price": 2100,
    "stock": 22,
    "warehouse_location": "Almacén Central A-02",
    "description": "Módulo DDR5 de 16GB, 5600MHz",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "Módulo DDR5 de 16GB, 5600MHz",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "ram-04",
    "sku": "QL-DDR5-32",
    "name": "Quantum Line QL-DDR5-32",
    "category": "Memoria RAM",
    "brand": "Quantum Line",
    "price": 3800,
    "stock": 11,
    "warehouse_location": "Almacén Central A-02",
    "description": "Módulo DDR5 de 32GB, 5600MHz",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "Módulo DDR5 de 32GB, 5600MHz",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "alm-01",
    "sku": "SL-SSD500",
    "name": "Solace PC SL-SSD500",
    "category": "Almacenamiento",
    "brand": "Solace PC",
    "price": 850,
    "stock": 35,
    "warehouse_location": "Almacén Central A-02",
    "description": "SSD SATA de 500GB",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "SSD SATA de 500GB",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "alm-02",
    "sku": "SL-SSD1TB-NVMe",
    "name": "Solace PC SL-SSD1TB-NVMe",
    "category": "Almacenamiento",
    "brand": "Solace PC",
    "price": 1650,
    "stock": 25,
    "warehouse_location": "Almacén Central A-02",
    "description": "SSD NVMe de 1TB",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "SSD NVMe de 1TB",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "alm-03",
    "sku": "AX-HDD2TB",
    "name": "Apex Hardware AX-HDD2TB",
    "category": "Almacenamiento",
    "brand": "Apex Hardware",
    "price": 1100,
    "stock": 18,
    "warehouse_location": "Almacén Central A-02",
    "description": "Disco duro mecánico de 2TB",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "Disco duro mecánico de 2TB",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "alm-04",
    "sku": "AX-SSD2TB-NVMe",
    "name": "Apex Hardware AX-SSD2TB-NVMe",
    "category": "Almacenamiento",
    "brand": "Apex Hardware",
    "price": 3200,
    "stock": 9,
    "warehouse_location": "Almacén Central A-02",
    "description": "SSD NVMe de 2TB alto rendimiento",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "SSD NVMe de 2TB alto rendimiento",
      "graphics": "N/A",
      "power_consumption_tdp": "N/A",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "psu-01",
    "sku": "FT-PSU500",
    "name": "Ferrotech FT-PSU500",
    "category": "Fuente de poder",
    "brand": "Ferrotech",
    "price": 950,
    "stock": 20,
    "warehouse_location": "Almacén Central A-02",
    "description": "Fuente de poder de 500W, certificación 80+ Bronze",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "Fuente de poder de 500W, certificación 80+ Bronze",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 24
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "psu-02",
    "sku": "FT-PSU650M",
    "name": "Ferrotech FT-PSU650M",
    "category": "Fuente de poder",
    "brand": "Ferrotech",
    "price": 1600,
    "stock": 12,
    "warehouse_location": "Almacén Central A-02",
    "description": "Fuente de poder de 650W modular, 80+ Gold",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "Fuente de poder de 650W modular, 80+ Gold",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
    }
  },
  {
    "id": "psu-03",
    "sku": "BC-PSU850M",
    "name": "Bright Circuit BC-PSU850M",
    "category": "Fuente de poder",
    "brand": "Bright Circuit",
    "price": 2400,
    "stock": 6,
    "warehouse_location": "Almacén de Distribución B-01",
    "description": "Fuente de poder de 850W modular, 80+ Gold",
    "image_url": "/assets/hero_tech_banner.png",
    "status": "Disponible",
    "specs": {
      "processor": "N/A",
      "ram": "N/A",
      "storage": "N/A",
      "graphics": "N/A",
      "power_consumption_tdp": "Fuente de poder de 850W modular, 80+ Gold",
      "operating_temp": "0°C - 50°C",
      "dimensions": "N/A",
      "weight": "N/A",
      "warranty_months": 36
    },
    "support_info": {
      "common_issue": "Sin fallas reportadas recientemente.",
      "solution": "Contactar soporte técnico oficial de Site Solutions.",
      "firmware_ver": "v1.0.0"
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
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          ...item,
          specs: item.specs || { warranty_months: 36 }
        }));
      }
      console.warn('Supabase fetchProducts empty or error, falling back:', error || 'Empty table');
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
