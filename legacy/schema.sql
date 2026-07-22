-- ======================================================
-- Site Solutions - Esquema de Base de Datos para Supabase
-- ======================================================

-- 1. Tabla de Productos (Catálogo General)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Servidores', 'Laptops', 'Networking', 'Almacenamiento', 'Workstations'
    brand VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    description TEXT,
    image_url TEXT,
    status VARCHAR(50) DEFAULT 'Disponible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Especificaciones Técnicas (Fichas Técnicas)
CREATE TABLE IF NOT EXISTS public.technical_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    processor VARCHAR(255),
    ram_capacity VARCHAR(100),
    storage_specs VARCHAR(255),
    graphics VARCHAR(255),
    power_consumption_tdp VARCHAR(100),
    operating_temp VARCHAR(100),
    dimensions VARCHAR(100),
    weight VARCHAR(50),
    warranty_months INT DEFAULT 36,
    driver_download_url TEXT,
    datasheet_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Soporte Técnico y Guías de Fallas
CREATE TABLE IF NOT EXISTS public.support_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_sku VARCHAR(50) NOT NULL,
    issue_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Firmware', 'Diagnóstico Hardware', 'Garantía', 'Conectividad'
    symptoms TEXT NOT NULL,
    solution_steps TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'Media', -- 'Baja', 'Media', 'Crítica'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ======================================================
-- Datos Iniciales de Ejemplo (Seed Data)
-- ======================================================
INSERT INTO public.products (sku, name, category, brand, price, stock, description, image_url, status)
VALUES 
('SRV-EPIC-2U', 'Servidor Enterprise Rack SiteCore 2U X9', 'Servidores', 'Site Solutions', 4850.00, 14, 'Servidor de doble socket para cargas pesadas de virtualización y bases de datos con redundancia total.', '/assets/enterprise_server_rack.png', 'Disponible'),
('LTP-PRO-16X', 'Workstation Laptop TitanBook Pro 16', 'Workstations', 'Site Solutions', 2499.00, 28, 'Laptop de alto rendimiento para ingenieros y desarrolladores con GPU dedicada y pantalla 4K.', '/assets/pro_workstation_laptop.png', 'Disponible'),
('SWT-FIBER-48P', 'Switch de Red Optica SwitchNet 48P SFP+', 'Networking', 'Site Solutions', 1890.00, 9, 'Switch administrable de 48 puertos Gigabit Ethernet con 4 puertos uplink 10G SFP+ para fibra.', '/assets/fiber_network_switch.png', 'En Stock Reducido'),
('NAS-ENTERPRISE-8B', 'Almacenamiento Redundante DataVault NAS 8-Bay', 'Almacenamiento', 'Site Solutions', 3150.00, 5, 'Sistema NAS empresarial de 8 bahías hot-swap con encriptación AES-256 por hardware y puerto dual 10GbE.', '/assets/hero_tech_banner.png', 'Disponible')
ON CONFLICT (sku) DO NOTHING;
