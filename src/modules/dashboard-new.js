/**
 * Dashboard Nuevo - Estilo Moderno Corporativo
 * Diseño estilo Salesforce/Monday con menú lateral
 */

export class DashboardNew {
    constructor(inventory, containerId = 'mainContent') {
        this.inventory = inventory;
        this.container = document.getElementById(containerId);
        this.currentSection = 'dashboard';
        this.theme = localStorage.getItem('theme') || 'dark';
        this.filters = { search: '', status: '' };
    }

    init() {
        this.applyTheme();
        
        // Ocultar la sección de inventario antigua
        const inventorySection = document.getElementById('inventorySection');
        if (inventorySection) {
            inventorySection.style.display = 'none';
        }
        // Ocultar la tabla de inventario
        const inventoryTable = document.getElementById('inventoryTable');
        if (inventoryTable) {
            inventoryTable.style.display = 'none';
        }
        if (!this.container) {
            console.error('Dashboard container not found!');
            return;
        }
        this.render();
        // Forzar visibilidad
        this.container.style.display = 'block';
        this.container.style.visibility = 'visible';
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="app-layout">
                ${this.renderSidebar()}
                <div class="main-content">
                    ${this.renderTopBar()}
                    ${this.renderCurrentSection()}
                </div>
            </div>
        `;
        this.initCharts();
        if (window.lucide) window.lucide.createIcons();
    }

    renderSidebar() {
        const navItems = [
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
            { id: 'inventory', icon: 'package', label: 'Inventario' },
            { id: 'network', icon: 'wifi', label: 'Red / IP' },
            { id: 'maintenance', icon: 'wrench', label: 'Mantenimiento' },
            { id: 'users', icon: 'users', label: 'Usuarios' },
            { id: 'models', icon: 'monitor', label: 'Modelos' }
        ];

        return `
            <aside class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <i data-lucide="monitor"></i>
                        <span>SERVYRE</span>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    ${navItems.map(item => `
                        <div class="nav-item ${this.currentSection === item.id ? 'active' : ''}" 
                             onclick="window.dashboard.setSection('${item.id}')">
                            <i data-lucide="${item.icon}"></i>
                            <span>${item.label}</span>
                        </div>
                    `).join('')}
                </nav>
                <div class="sidebar-footer">
                    <button class="theme-toggle-btn" onclick="window.dashboard.toggleTheme()">
                        <i data-lucide="${this.theme === 'dark' ? 'sun' : 'moon'}"></i>
                        <span>${this.theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                    </button>
                </div>
            </aside>
        `;
    }

    renderTopBar() {
        return `
            <div class="top-bar">
                <div class="search-box">
                    <i data-lucide="search"></i>
                    <input type="text" placeholder="Buscar equipos, usuarios, series..." 
                           oninput="window.dashboard.search(this.value)">
                </div>
                <div class="top-bar-actions">
                    <button class="quick-action-btn" onclick="window.dashboard.exportData()">
                        <i data-lucide="download"></i>
                        Exportar
                    </button>
                    <button class="quick-action-btn" onclick="window.dashboard.addNew()">
                        <i data-lucide="plus"></i>
                        Nuevo
                    </button>
                </div>
            </div>
        `;
    }

    renderCurrentSection() {
        switch (this.currentSection) {
            case 'dashboard':
                return this.renderDashboard();
            case 'inventory':
                return this.renderInventory();
            case 'network':
                return this.renderNetwork();
            case 'maintenance':
                return this.renderMaintenance();
            case 'users':
                return this.renderUsers();
            case 'models':
                return this.renderModels();
            default:
                return this.renderDashboard();
        }
    }

    renderDashboard() {
        const kpis = this.calculateKPIs();
        console.log('KPIs:', kpis);
        
        return `
            <div class="dashboard-section" style="padding: 1.5rem;">
                <div class="kpi-grid">
                    ${this.renderKPICard('total', kpis.total, 'Total Equipos', 'package', 'total')}
                    ${this.renderKPICard('active', kpis.active, 'Activos', 'check-circle', 'active')}
                    ${this.renderKPICard('maintenance', kpis.maintenance, 'En Mantenimiento', 'wrench', 'maintenance')}
                    ${this.renderKPICard('warranty', kpis.warranty, 'En Garantía', 'shield-check', 'warranty')}
                    ${this.renderKPICard('baja', kpis.baja, 'Dados de Baja', 'x-circle', 'baja')}
                    ${this.renderKPICard('piezas', kpis.piezas, 'Para Piezas', 'cpu', 'piezas')}
                </div>
                
                <div class="charts-row" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-top: 1.5rem;">
                    <div class="chart-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
                        <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);">
                            <div class="chart-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: var(--text);">
                                <i data-lucide="pie-chart"></i>
                                Estado de Equipos
                            </div>
                        </div>
                        <div class="chart-canvas" style="height: 280px;">
                            <canvas id="estadoChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
                        <div class="chart-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-light);">
                            <div class="chart-title" style="display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 600; color: var(--text);">
                                <i data-lucide="bar-chart-3"></i>
                                Modelos Más Comunes
                            </div>
                        </div>
                        <div class="chart-canvas" style="height: 280px;">
                            <canvas id="modelosChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderKPICard(id, value, label, icon, type) {
        return `
            <div class="kpi-card ${type}" data-aos="fade-up">
                <div class="kpi-header">
                    <div class="kpi-icon">
                        <i data-lucide="${icon}"></i>
                    </div>
                </div>
                <div class="kpi-value">${value}</div>
                <div class="kpi-label">${label}</div>
            </div>
        `;
    }

    renderInventory() {
        const filtered = this.applyFilters(this.inventory);
        
        return `
            <div class="inventory-section">
                <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div class="section-title">
                        <i data-lucide="package"></i>
                        Inventario
                    </div>
                    <span style="color: var(--text-dim); font-size: 0.875rem;">${filtered.length} registros</span>
                </div>
                
                <div class="filters-bar" style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
                    <select class="filter-select" style="padding: 0.625rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text);" 
                            onchange="window.dashboard.setFilter('status', this.value)">
                        <option value="">Todos los estados</option>
                        <option value="Activo">Activo</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Baja">Baja</option>
                        <option value="Para piezas">Para piezas</option>
                    </select>
                    <select class="filter-select" style="padding: 0.625rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text);"
                            onchange="window.dashboard.setFilter('location', this.value)">
                        <option value="">Todas las ubicaciones</option>
                        ${this.getUniqueValues('location').map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                </div>
                
                <div class="table-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--card-bg);">
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Resguardo</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Usuario</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Equipo</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Marca/Modelo</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Serie</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Ubicación</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.slice(0, 50).map(item => `
                                <tr style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(252,211,77,0.05)'" onmouseout="this.style.background='transparent'">
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-family: monospace; font-size: 0.8rem;">${item.resguardo || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-weight: 500;">${item.fullName || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item.deviceType || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item.brand || '-'} ${item.model || ''}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-family: monospace; font-size: 0.8rem;">${item.serialNumber || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);"><span class="badge badge-blue" style="font-size: 0.7rem;">${item.location || '-'}</span></td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);"><span class="badge ${this.getStatusBadge(item.status)}">${item.status || '-'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderNetwork() {
        const conIP = this.inventory.filter(i => i.ipAddress).length;
        const sinIP = this.inventory.length - conIP;
        const dhcp = this.inventory.filter(i => i.ipType === 'DHCP' || !i.ipType).length;
        const ipFija = this.inventory.filter(i => i.ipType === 'IP Fija').length;

        return `
            <div class="network-section">
                <div class="section-title">
                    <i data-lucide="wifi"></i>
                    Red / IP
                </div>
                <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.5rem;">
                    ${this.renderKPICard('conIP', conIP, 'Con IP', 'wifi', 'total')}
                    ${this.renderKPICard('sinIP', sinIP, 'Sin IP', 'wifi-off', 'warning')}
                    ${this.renderKPICard('dhcp', dhcp, 'DHCP', 'network', 'active')}
                    ${this.renderKPICard('ipFija', ipFija, 'IP Fija', 'hard-drive', 'piezas')}
                </div>
                
                <div class="table-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--card-bg);">
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Usuario</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Equipo</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Correo</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">IP Asignada</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.inventory.filter(i => i.ipAddress).slice(0, 30).map(item => `
                                <tr>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-weight: 600;">${item.fullName || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item.deviceType || '-'} ${item.brand || ''}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-size: 0.85rem;">${item.email || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-family: monospace; color: var(--primary); font-weight: 600;">${item.ipAddress}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);"><span class="badge ${item.ipType === 'IP Fija' ? 'badge-orange' : 'badge-green'}">${item.ipType || 'DHCP'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderMaintenance() {
        return `
            <div class="maintenance-section">
                <div class="section-title">
                    <i data-lucide="wrench"></i>
                    Mantenimiento
                </div>
                <div class="table-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--card-bg);">
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Serie</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Usuario</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Último Mtto</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Próximo Mtto</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Garantía</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.inventory.slice(0, 20).map(item => `
                                <tr>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-family: monospace;">${item.serialNumber}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item.fullName}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item.lastMtto || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); color: var(--primary); font-weight: 500;">${item.nextMtto || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item.warranty ? item.warranty + ' meses' : '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);"><span class="badge ${this.getStatusBadge(item.status)}">${item.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderUsers() {
        const usersMap = {};
        this.inventory.forEach(item => {
            const name = item.fullName || 'Sin asignar';
            if (!usersMap[name]) usersMap[name] = [];
            usersMap[name].push(item);
        });

        const topUsers = Object.entries(usersMap).sort((a, b) => b[1].length - a[1].length).slice(0, 10);

        return `
            <div class="users-section">
                <div class="section-title">
                    <i data-lucide="users"></i>
                    Usuarios
                </div>
                <div class="table-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--card-bg);">
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Usuario</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Departamento</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Equipos</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Último Equipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topUsers.map(([name, items]) => `
                                <tr>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-weight: 600;">${name}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${items[0].department || '-'}</td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);"><span class="badge badge-primary" style="background: rgba(59,130,246,0.2); color: #3B82F6;">${items.length}</span></td>
                                    <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${items[0].deviceType} ${items[0].brand}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderModels() {
        const modelsMap = {};
        this.inventory.forEach(item => {
            const model = `${item.brand || ''} ${item.model || ''}`.trim() || 'Sin modelo';
            modelsMap[model] = (modelsMap[model] || 0) + 1;
        });

        const topModels = Object.entries(modelsMap).sort((a, b) => b[1] - a[1]).slice(0, 15);

        return `
            <div class="models-section">
                <div class="section-title">
                    <i data-lucide="monitor"></i>
                    Modelos
                </div>
                <div class="table-container" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--card-bg);">
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Modelo</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Cantidad</th>
                                <th style="padding: 1rem; text-align: left; font-size: 0.75rem; text-transform: uppercase; color: var(--text-dim); border-bottom: 1px solid var(--border);">Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topModels.map(([model, count]) => {
                                const item = this.inventory.find(i => `${i.brand} ${i.model}`.trim() === model);
                                return `
                                    <tr>
                                        <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light); font-weight: 600;">${model}</td>
                                        <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);"><span class="badge badge-primary" style="background: rgba(59,130,246,0.2); color: #3B82F6;">${count}</span></td>
                                        <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light);">${item?.deviceType || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    calculateKPIs() {
        return {
            total: this.inventory.length,
            active: this.inventory.filter(i => i.status === 'Activo').length,
            maintenance: this.inventory.filter(i => i.status === 'Mantenimiento').length,
            warranty: this.inventory.filter(i => i.warranty && parseInt(i.warranty) > 0).length,
            baja: this.inventory.filter(i => i.status === 'Baja').length,
            piezas: this.inventory.filter(i => i.status === 'Para piezas').length
        };
    }

    getStatusBadge(status) {
        const badges = {
            'Activo': 'badge-green',
            'Mantenimiento': 'badge-orange',
            'Baja': 'badge-danger',
            'Cancelado': 'badge-gray',
            'Para piezas': 'badge-orange'
        };
        return badges[status] || 'badge-gray';
    }

    getUniqueValues(field) {
        return [...new Set(this.inventory.map(i => i[field]).filter(Boolean))];
    }

    applyFilters(data) {
        return data.filter(item => {
            if (this.filters.status && item.status !== this.filters.status) return false;
            if (this.filters.search) {
                const s = this.filters.search.toLowerCase();
                if (!item.fullName?.toLowerCase().includes(s) && 
                    !item.serialNumber?.toLowerCase().includes(s) &&
                    !item.brand?.toLowerCase().includes(s)) return false;
            }
            return true;
        });
    }

    setSection(id) {
        this.currentSection = id;
        this.render();
    }

    setFilter(key, value) {
        this.filters[key] = value;
        this.render();
    }

    search(value) {
        this.filters.search = value;
        this.render();
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
        this.render();
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
    }

    addNew() {
        if (window.openEditForm) {
            window.openEditForm();
        }
    }

    exportData() {
        alert('Exportando datos...');
    }

    initCharts() {
        if (typeof Chart === 'undefined') return;

        setTimeout(() => {
            this.initEstadoChart();
            this.initModelChart();
        }, 100);
    }

    initEstadoChart() {
        const ctx = document.getElementById('estadoChart');
        if (!ctx) return;

        const estados = {
            'Activo': this.inventory.filter(i => i.status === 'Activo').length,
            'Mantenimiento': this.inventory.filter(i => i.status === 'Mantenimiento').length,
            'Baja': this.inventory.filter(i => i.status === 'Baja').length,
            'Para piezas': this.inventory.filter(i => i.status === 'Para piezas').length
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(estados),
                datasets: [{
                    data: Object.values(estados),
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#F97316'],
                    borderWidth: 0,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { 
                            color: '#9CA3AF',
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        } 
                    }
                }
            }
        });
    }

    initModelChart() {
        const ctx = document.getElementById('modelosChart');
        if (!ctx) return;

        const modelsMap = {};
        this.inventory.forEach(item => {
            const model = `${item.brand || ''} ${item.model || ''}`.trim() || 'Sin modelo';
            modelsMap[model] = (modelsMap[model] || 0) + 1;
        });

        const topModels = Object.entries(modelsMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topModels.map(m => m[0].substring(0, 15)),
                datasets: [{
                    label: 'Equipos',
                    data: topModels.map(m => m[1]),
                    backgroundColor: '#3B82F6',
                    borderRadius: 6,
                    barThickness: 30
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#9CA3AF' }
                    },
                    y: { 
                        grid: { display: false },
                        ticks: { color: '#9CA3AF' }
                    }
                }
            }
        });
    }
}

export function initDashboardNew(inventory, containerId = 'mainContent') {
    window.dashboard = new DashboardNew(inventory, containerId);
    window.dashboard.init();
    return window.dashboard;
}
