/**
 * Site Solutions - Client JavaScript Application
 * Multi-role Tech Portal & Datasheet Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // Application State
    // ----------------------------------------------------
    let currentRole = 'vendedor'; // 'vendedor' | 'soporte' | 'tecnico'
    let currentCategory = 'Todos';
    let searchQuery = '';
    let productsList = [];
    let activeProductForModal = null;

    // DOM References
    const bodyElem = document.body;
    const roleButtons = document.querySelectorAll('.role-btn');
    const heroRoleBanner = document.getElementById('hero-role-banner');
    const heroRoleDesc = document.getElementById('hero-role-description');
    const heroRoleModeMetric = document.getElementById('metric-role-mode');
    const roleActionPanel = document.getElementById('role-action-panel');
    
    const categoryChips = document.querySelectorAll('.cat-chip');
    const productGrid = document.getElementById('product-grid-container');
    const resultsCounter = document.getElementById('results-count-text');
    
    const searchInput = document.getElementById('global-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const triggerSearchBtn = document.getElementById('btn-trigger-search');
    
    const dbStatusBadge = document.getElementById('db-status-badge');
    const dbStatusText = document.getElementById('db-status-text');
    
    const datasheetModal = document.getElementById('datasheet-modal');
    const schemaModal = document.getElementById('schema-modal');

    // ----------------------------------------------------
    // Initial Startup & Health Check
    // ----------------------------------------------------
    init();

    async function init() {
        setupEventListeners();
        await checkHealthStatus();
        await loadProducts();
        updateRoleView(currentRole);
    }

    // ----------------------------------------------------
    // API Requests
    // ----------------------------------------------------
    async function checkHealthStatus() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            
            document.getElementById('backend-status-json').textContent = JSON.stringify(data, null, 2);

            if (data.supabaseConnected) {
                dbStatusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                dbStatusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                dbStatusText.textContent = 'Supabase Conectado (En Vivo)';
            } else {
                dbStatusBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                dbStatusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
                dbStatusText.textContent = 'Supabase DB: Modo Demo Fallback';
            }
        } catch (err) {
            console.warn('Backend API offline:', err);
            dbStatusText.textContent = 'Modo Local (Servidor No Detectado)';
        }
    }

    async function loadProducts() {
        try {
            let url = `/api/products?role=${currentRole}`;
            if (currentCategory && currentCategory !== 'Todos') {
                url += `&category=${encodeURIComponent(currentCategory)}`;
            }
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.success && Array.isArray(data.products)) {
                productsList = data.products;
                renderProductsGrid();
                updateMetrics();
            }
        } catch (err) {
            console.error('Error cargando catálogo de productos:', err);
            productGrid.innerHTML = `<div class="error-msg">Error conectando con el catálogo en servidor.</div>`;
        }
    }

    // ----------------------------------------------------
    // UI Rendering Functions
    // ----------------------------------------------------
    function renderProductsGrid() {
        if (!productsList || productsList.length === 0) {
            productGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔍</div>
                    <h3>No se encontraron equipos o fichas técnicas</h3>
                    <p style="font-size:0.9rem;">Prueba con otros términos de búsqueda o selecciona otra categoría.</p>
                </div>
            `;
            resultsCounter.textContent = 'Mostrando 0 equipos';
            return;
        }

        resultsCounter.textContent = `Mostrando ${productsList.length} equipo${productsList.length > 1 ? 's' : ''}`;

        productGrid.innerHTML = productsList.map(prod => {
            const stockClass = prod.stock <= 10 ? 'stock-tag low' : 'stock-tag';
            
            // Role specific content for cards
            let roleFeatureHTML = '';
            let priceOrActionHTML = '';

            if (currentRole === 'vendedor') {
                roleFeatureHTML = `
                    <div class="card-role-feature" style="border-color: rgba(16, 185, 129, 0.3);">
                        <span class="feature-title" style="color: var(--role-vendedor);">💼 Info Comercial & Stock</span>
                        <div>Almacén: <strong>${prod.warehouse_location || 'Central'}</strong></div>
                        <div>Disponibilidad: <strong>${prod.stock} unidades listas</strong></div>
                    </div>
                `;
                priceOrActionHTML = `<span class="card-price">$${prod.price.toLocaleString('en-US', {minimumFractionDigits: 2})} USD</span>`;
            } else if (currentRole === 'soporte') {
                const issue = prod.support_info ? prod.support_info.common_issue : 'Sin reportes críticos';
                const fw = prod.support_info ? prod.support_info.firmware_ver : 'N/A';
                roleFeatureHTML = `
                    <div class="card-role-feature" style="border-color: rgba(245, 158, 11, 0.3);">
                        <span class="feature-title" style="color: var(--role-soporte);">🛠️ Diagnóstico & Soporte</span>
                        <div>Fórmula FW: <strong>${fw}</strong></div>
                        <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Reporte: <strong>${issue}</strong></div>
                    </div>
                `;
                priceOrActionHTML = `<span style="font-size:0.8rem; color:var(--role-soporte); font-weight:700;">Garantía: ${prod.specs.warranty_months || 36}m</span>`;
            } else if (currentRole === 'tecnico') {
                roleFeatureHTML = `
                    <div class="card-role-feature" style="border-color: rgba(0, 240, 255, 0.3);">
                        <span class="feature-title" style="color: var(--role-tecnico);">⚡ Specs Hardware Breve</span>
                        <div>Socket: <strong>${prod.specs.socket || 'Integrado'}</strong></div>
                        <div>TDP / Power: <strong>${prod.specs.power_consumption_tdp || 'N/A'}</strong></div>
                    </div>
                `;
                priceOrActionHTML = `<span style="font-size:0.8rem; color:var(--role-tecnico); font-weight:700;">DDR5 ECC RAM</span>`;
            }

            return `
                <article class="product-card" data-id="${prod.id}">
                    <div class="card-image-wrapper">
                        <img src="${prod.image_url || '/assets/enterprise_server_rack.png'}" alt="${prod.name}" loading="lazy">
                        <span class="category-tag">${prod.category}</span>
                        <span class="${stockClass}">${prod.stock} en stock</span>
                    </div>

                    <div class="card-content">
                        <span class="sku-code">SKU: ${prod.sku}</span>
                        <h3 class="product-name">${prod.name}</h3>
                        <p class="product-desc">${prod.description}</p>

                        ${roleFeatureHTML}

                        <div class="card-footer">
                            ${priceOrActionHTML}
                            <button class="btn-open-datasheet" data-sku="${prod.sku}">Ver Ficha Técnica 📄</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Attach event listeners to card buttons
        document.querySelectorAll('.btn-open-datasheet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sku = e.target.getAttribute('data-sku');
                openDatasheetModal(sku);
            });
        });
    }

    function updateRoleView(role) {
        currentRole = role;
        bodyElem.setAttribute('data-active-role', role);

        // Update Role Buttons Active Class
        roleButtons.forEach(btn => {
            if (btn.getAttribute('data-role') === role) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Hero Banner Adaptation
        if (role === 'vendedor') {
            heroRoleBanner.innerHTML = `<span class="badge-icon">💼</span> Vista Optimizada para Vendedores`;
            heroRoleBanner.style.borderColor = 'var(--role-vendedor)';
            heroRoleBanner.style.color = 'var(--role-vendedor)';
            heroRoleDesc.textContent = 'Accede a precios corporativos, disponibilidad de inventario en almacén y genera cotizaciones instantáneas para clientes enterprise.';
            heroRoleModeMetric.textContent = 'Comercial';
            heroRoleModeMetric.style.color = 'var(--role-vendedor)';

            roleActionPanel.style.borderLeftColor = 'var(--role-vendedor)';
            roleActionPanel.innerHTML = `
                <div class="role-action-info">
                    <h3> Herramientas para Vendedores</h3>
                    <p>Calcula márgenes comerciales, verifica ubicaciones físicas de stock y exporta propuestas.</p>
                </div>
                <div class="role-action-btns">
                    <button class="btn-role-action" id="btn-quick-quote">💼 Generar Cotización Consolidada</button>
                    <button class="btn-role-action" onclick="alert('Buscando almacenes con disponibilidad máxima...')">📦 Mapa de Inventario</button>
                </div>
            `;
        } else if (role === 'soporte') {
            heroRoleBanner.innerHTML = `<span class="badge-icon">🛠️</span> Vista Optimizada para equipo de Soporte`;
            heroRoleBanner.style.borderColor = 'var(--role-soporte)';
            heroRoleBanner.style.color = 'var(--role-soporte)';
            heroRoleDesc.textContent = 'Consulta guías rápidas de solución de problemas, mapas de errores recurrentes, códigos LED de BMC y versiones de firmware compatibles.';
            heroRoleModeMetric.textContent = 'Soporte 24/7';
            heroRoleModeMetric.style.color = 'var(--role-soporte)';

            roleActionPanel.style.borderLeftColor = 'var(--role-soporte)';
            roleActionPanel.innerHTML = `
                <div class="role-action-info">
                    <h3> Base de Conocimiento de Soporte Técnico</h3>
                    <p>Accede directamente a códigos de error, firmas de firmware y estados de garantía por número de serie.</p>
                </div>
                <div class="role-action-btns">
                    <button class="btn-role-action" onclick="alert('Abriendo buscador de números de serie para garantía...')">🔍 Consulta de Garantía por Serie</button>
                    <button class="btn-role-action" onclick="alert('Abriendo catálogo de parches de firmware...')">💾 Matriz de Firmware</button>
                </div>
            `;
        } else if (role === 'tecnico') {
            heroRoleBanner.innerHTML = `<span class="badge-icon">⚡</span> Vista Optimizada para Personal Técnico`;
            heroRoleBanner.style.borderColor = 'var(--role-tecnico)';
            heroRoleBanner.style.color = 'var(--role-tecnico)';
            heroRoleDesc.textContent = 'Analiza especificaciones a nivel de silicio (sockets, arquitectura de CPU, líneas PCIe, consumo térmico TDP, voltajes) y diagramas.';
            heroRoleModeMetric.textContent = 'Especificación Hardware';
            heroRoleModeMetric.style.color = 'var(--role-tecnico)';

            roleActionPanel.style.borderLeftColor = 'var(--role-tecnico)';
            roleActionPanel.innerHTML = `
                <div class="role-action-info">
                    <h3> Centro Técnico y Datasheets Profundos</h3>
                    <p>Descarga diagramas esquemáticos de tarjetas de sistema, requerimientos térmicos y controladores.</p>
                </div>
                <div class="role-action-btns">
                    <button class="btn-role-action" onclick="alert('Generando paquete completo de drivers...')">📦 Descargar Paquete de Drivers ISO</button>
                    <button class="btn-role-action" onclick="alert('Abriendo matriz de compatibilidad de sockets AMD/Intel...')">⚡ Matriz Sockets & TDP</button>
                </div>
            `;
        }

        // Re-render product grid for the new role view
        renderProductsGrid();
    }

    function updateMetrics() {
        document.getElementById('metric-total-products').textContent = productsList.length;
        const totalStock = productsList.reduce((acc, p) => acc + (p.stock || 0), 0);
        document.getElementById('metric-stock-available').textContent = totalStock;
    }

    // ----------------------------------------------------
    // Datasheet Modal Management
    // ----------------------------------------------------
    function openDatasheetModal(sku) {
        const prod = productsList.find(p => p.sku === sku);
        if (!prod) return;

        activeProductForModal = prod;

        // Fill modal fields
        document.getElementById('modal-sku-badge').textContent = `SKU: ${prod.sku}`;
        document.getElementById('modal-product-title').textContent = prod.name;
        document.getElementById('modal-img').src = prod.image_url || '/assets/enterprise_server_rack.png';

        document.getElementById('spec-cpu').textContent = prod.specs.processor || 'N/A';
        document.getElementById('spec-socket').textContent = prod.specs.socket || 'Integrado';
        document.getElementById('spec-ram').textContent = prod.specs.ram || 'N/A';
        document.getElementById('spec-tdp').textContent = prod.specs.power_consumption_tdp || 'N/A';

        document.getElementById('spec-storage').textContent = prod.specs.storage || 'N/A';
        document.getElementById('spec-gpu').textContent = prod.specs.graphics || 'N/A';
        document.getElementById('spec-dims').textContent = prod.specs.dimensions || 'N/A';
        document.getElementById('spec-weight').textContent = prod.specs.weight || 'N/A';
        document.getElementById('spec-temp').textContent = prod.specs.operating_temp || '0°C - 40°C';
        document.getElementById('spec-warranty').textContent = `${prod.specs.warranty_months || 36} Meses (Site Solutions Guarantee)`;

        // Fill Support Tab
        const sup = prod.support_info || {};
        document.getElementById('support-issue-title').textContent = sup.common_issue || 'Ningún problema recurrente registrado';
        document.getElementById('support-symptom').textContent = prod.description;
        document.getElementById('support-solution').textContent = sup.solution || 'Contactar a ingeniería de soporte Nivel 3.';
        document.getElementById('support-firmware').textContent = sup.firmware_ver || 'v1.0.0-Stable';

        // Fill Commercial Tab
        document.getElementById('modal-price').textContent = `$${prod.price.toLocaleString('en-US', {minimumFractionDigits: 2})} USD`;
        document.getElementById('modal-location').textContent = prod.warehouse_location || 'Almacén Central';
        document.getElementById('modal-stock').textContent = `${prod.stock} Unidades en Inventario`;

        datasheetModal.style.display = 'flex';
    }

    function closeDatasheetModal() {
        datasheetModal.style.display = 'none';
    }

    // ----------------------------------------------------
    // Event Listeners
    // ----------------------------------------------------
    function setupEventListeners() {
        // Role Switchers
        roleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.getAttribute('data-role');
                updateRoleView(role);
            });
        });

        // Category Filter Chips
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                categoryChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentCategory = chip.getAttribute('data-category');
                loadProducts();
            });
        });

        // Search Input Handling
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            if (searchQuery.length > 0) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            loadProducts();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            loadProducts();
        });

        triggerSearchBtn.addEventListener('click', () => {
            loadProducts();
        });

        // Modal Tab Switching
        document.querySelectorAll('.tab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                
                tabBtn.classList.add('active');
                const targetTabId = tabBtn.getAttribute('data-tab');
                document.getElementById(targetTabId).classList.add('active');
            });
        });

        // Modal Close Buttons
        document.getElementById('btn-close-datasheet-modal').addEventListener('click', closeDatasheetModal);
        datasheetModal.addEventListener('click', (e) => {
            if (e.target === datasheetModal) closeDatasheetModal();
        });

        // Schema Modal
        document.getElementById('btn-open-schema-modal').addEventListener('click', () => {
            schemaModal.style.display = 'flex';
        });
        document.getElementById('btn-close-schema-modal').addEventListener('click', () => {
            schemaModal.style.display = 'none';
        });
        schemaModal.addEventListener('click', (e) => {
            if (e.target === schemaModal) schemaModal.style.display = 'none';
        });

        // Action Buttons inside Modal
        document.getElementById('btn-download-driver').addEventListener('click', () => {
            alert(`Iniciando descarga de paquete de controladores para SKU: ${activeProductForModal?.sku}...`);
        });

        document.getElementById('btn-generate-quote-modal').addEventListener('click', () => {
            alert(`Generando propuesta comercial en PDF para ${activeProductForModal?.name} por $${activeProductForModal?.price} USD`);
        });
    }
});
