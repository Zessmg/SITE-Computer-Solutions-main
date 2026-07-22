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
    response: 'Asistente: Servidor Enterprise Rack SiteCore 2U X9 con 2x AMD EPYC (192 núcleos totales), 512GB RAM, 4x 3.84TB NVMe. Precio unitario: $4,850.00 USD. Stock disponible: 14 unidades.',
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
    response: 'Asistente: Almacenamiento DataVault NAS 8-Bay, Xeon E-2336 6-Core, 32GB RAM, encriptación AES-256 por hardware. Precio: $3,150.00 USD.',
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
