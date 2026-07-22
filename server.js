const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------
// Inicialización de Supabase Client con Fallback
// ----------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-supabase-url')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isSupabaseConfigured = true;
    console.log('⚡ Conectado exitosamente al cliente de Supabase');
  } catch (err) {
    console.warn('⚠️ Error inicializando cliente Supabase, usando fallback local:', err.message);
  }
} else {
  console.log('ℹ️ Supabase no configurado en .env. Ejecutando en Modo Fallback (In-Memory Database).');
}

// ----------------------------------------------------
// Base de Datos Fallback en Memoria (Rich Demo Dataset)
// ----------------------------------------------------
const mockProducts = [
  {
    id: 'p1',
    sku: 'SRV-EPIC-2U',
    name: 'Servidor Enterprise Rack SiteCore 2U X9',
    category: 'Servidores',
    brand: 'Site Solutions',
    price: 4850.00,
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
    price: 2499.00,
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
    price: 1890.00,
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
    price: 3150.00,
    stock: 5,
    warehouse_location: 'Almacén Central A-05',
    description: 'Matriz NAS empresarial de 8 bahías 3.5"/2.5" SATA/SAS hot-swap con ZFS preconfigurado y snapshots inmutables anti-ransomware.',
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

// ----------------------------------------------------
// Endpoints API
// ----------------------------------------------------

// Health Check & Supabase Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Site Solutions Tech Catalog Portal',
    supabaseConnected: isSupabaseConfigured,
    mode: isSupabaseConfigured ? 'Supabase Live DB' : 'In-Memory Fallback DB',
    timestamp: new Date().toISOString()
  });
});

// Obtener Lista de Productos (Filtros: category, query, role)
app.get('/api/products', async (req, res) => {
  const { category, search, role } = req.query;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('products').select('*, technical_specs(*)');
      if (category && category !== 'Todos') {
        query = query.eq('category', category);
      }
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      const { data, error } = await query;
      if (!error && data) {
        return res.json({ success: true, source: 'supabase', products: data });
      }
    } catch (err) {
      console.warn('Fallo en consulta Supabase, pasando a fallback:', err.message);
    }
  }

  // Fallback local filtering
  let filtered = [...mockProducts];
  if (category && category !== 'Todos') {
    filtered = filtered.filter(p => p.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  res.json({
    success: true,
    source: isSupabaseConfigured ? 'supabase_error_fallback' : 'memory_fallback',
    products: filtered,
    role: role || 'General'
  });
});

// Detalle de Producto por ID / SKU
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = mockProducts.find(p => p.id === id || p.sku === id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }
  res.json({ success: true, product });
});

// Iniciar servidor Node.js
app.listen(PORT, () => {
  console.log(`🚀 Servidor Site Solutions escuchando en http://localhost:${PORT}`);
});
