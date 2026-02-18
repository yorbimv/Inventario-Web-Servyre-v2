/**
 * Dashboard Ejecutivo - Sistema de gestión modular con pestañas
 * Diseño limpio, profesional y ejecutivo
 */

export class DashboardEjecutivo {
    constructor(inventory, containerId = 'dashboardContainer') {
        this.inventory = inventory;
        this.container = document.getElementById(containerId);
        this.currentTab = 'resumen';
        this.filters = {
            location: '',
            department: '',
            brand: '',
            status: ''
        };
    }

    render() {
        this.container.innerHTML = `
            <div class="ejecutivo-container">
                ${this.renderHeader()}
                ${this.renderTabs()}
                <div class="ejecutivo-content">
                    ${this.renderCurrentTab()}
                </div>
            </div>
        `;
        this.initCharts();
        if (window.lucide) window.lucide.createIcons();
    }

    renderHeader() {
        const totalEquipos = this.inventory.length;
        const activos = this.inventory.filter(i => i.status === 'Activo').length;
        const valorTotal = this.inventory.reduce((sum, i) => sum + (parseInt(i.price?.replace(/[^0-9]/g, '') || 0)), 0);

        return `
            <div class="ejecutivo-header">
                <div class="header-left">
                    <h1><i data-lucide="bar-chart-3"></i> Dashboard Ejecutivo</h1>
                    <p>Resumen ejecutivo de activos de TI</p>
                </div>
                <div class="header-stats">
                    <div class="stat-box">
                        <span class="stat-value">${totalEquipos}</span>
                        <span class="stat-label">Total Equipos</span>
                    </div>
                    <div class="stat-box success">
                        <span class="stat-value">${activos}</span>
                        <span class="stat-label">Activos</span>
                    </div>
                    <div class="stat-box warning">
                        <span class="stat-value">$${(valorTotal / 1000000).toFixed(1)}M</span>
                        <span class="stat-label">Valor Total</span>
                    </div>
                </div>
                <div class="header-actions">
                    <button class="glass-btn" onclick="dashboard.refresh()" title="Actualizar">
                        <i data-lucide="refresh-cw"></i>
                    </button>
                    <button class="premium-btn primary" onclick="dashboard.exportDashboard()">
                        <i data-lucide="download"></i> Exportar
                    </button>
                </div>
            </div>
        `;
    }

    renderTabs() {
        const tabs = [
            { id: 'resumen', icon: 'layout-dashboard', label: 'Resumen' },
            { id: 'inventario', icon: 'package', label: 'Inventario' },
            { id: 'red', icon: 'wifi', label: 'Red & IP' },
            { id: 'mantenimiento', icon: 'wrench', label: 'Mantenimiento' },
            { id: 'usuarios', icon: 'users', label: 'Usuarios' }
        ];

        return `
            <div class="ejecutivo-tabs">
                ${tabs.map(tab => `
                    <button class="tab-btn ${this.currentTab === tab.id ? 'active' : ''}" 
                            data-tab="${tab.id}"
                            onclick="window.dashboard.setTab('${tab.id}')">
                        <i data-lucide="${tab.icon}"></i>
                        <span>${tab.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'resumen':
                return this.renderResumen();
            case 'inventario':
                return this.renderInventario();
            case 'red':
                return this.renderRed();
            case 'mantenimiento':
                return this.renderMantenimiento();
            case 'usuarios':
                return this.renderUsuarios();
            default:
                return this.renderResumen();
        }
    }

    renderResumen() {
        const kpiData = this.calculateKPIData();
        
        return `
            <div class="tab-content active" id="tab-resumen">
                <div class="kpi-cards">
                    ${this.renderKPICard('Total Equipos', kpiData.total, 'package', 'primary')}
                    ${this.renderKPICard('Activos', kpiData.active, 'check-circle', 'success')}
                    ${this.renderKPICard('En Mantenimiento', kpiData.maintenance, 'wrench', 'warning')}
                    ${this.renderKPICard('Baja', kpiData.bajas, 'x-circle', 'danger')}
                </div>
                <div class="charts-row">
                    <div class="chart-card">
                        <h3><i data-lucide="pie-chart"></i> Estado de Activos</h3>
                        <canvas id="estadoChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3><i data-lucide="bar-chart-3"></i> Top Marcas</h3>
                        <canvas id="marcasChart"></canvas>
                    </div>
                </div>
                <div class="recent-section">
                    <h3><i data-lucide="clock"></i> Equipos Recientes</h3>
                    <div class="table-responsive">
                        <table class="ejecutivo-table">
                            <thead>
                                <tr>
                                    <th>Serie</th>
                                    <th>Usuario</th>
                                    <th>Equipo</th>
                                    <th>Marca</th>
                                    <th>Ubicación</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.inventory.slice(0, 5).map(item => `
                                    <tr onclick="window.dashboard.viewDetail('${item.id}')">
                                        <td><code>${item.serialNumber}</code></td>
                                        <td>${item.fullName}</td>
                                        <td>${item.deviceType}</td>
                                        <td>${item.brand}</td>
                                        <td><span class="badge badge-blue">${item.location}</span></td>
                                        <td><span class="badge ${this.getStatusBadge(item.status)}">${item.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderInventario() {
        const filtered = this.applyFilters(this.inventory);
        
        return `
            <div class="tab-content" id="tab-inventario">
                <div class="filters-bar">
                    <select class="filter-select" onchange="window.dashboard.setFilter('location', this.value)">
                        <option value="">Todas las ubicaciones</option>
                        ${this.getUniqueValues('location').map(l => `<option value="${l}">${l}</option>`).join('')}
                    </select>
                    <select class="filter-select" onchange="window.dashboard.setFilter('status', this.value)">
                        <option value="">Todos los estados</option>
                        <option value="Activo">Activo</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                        <option value="Baja">Baja</option>
                    </select>
                    <input type="text" class="search-input" placeholder="Buscar..." oninput="window.dashboard.search(this.value)">
                    <span class="result-count">${filtered.length} registros</span>
                </div>
                <div class="table-responsive">
                    <table class="ejecutivo-table full">
                        <thead>
                            <tr>
                                <th>Resguardo</th>
                                <th>Usuario</th>
                                <th>Equipo</th>
                                <th>Marca / Modelo</th>
                                <th>Nombre PC</th>
                                <th>Serie</th>
                                <th>Ubicación</th>
                                <th>IP</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filtered.map(item => `
                                <tr onclick="window.dashboard.viewDetail('${item.id}')">
                                    <td><code>${item.resguardo || '-'}</code></td>
                                    <td>${item.fullName}</td>
                                    <td>${item.deviceType}</td>
                                    <td>${item.brand} ${item.model}</td>
                                    <td>${item.pcName || '-'}</td>
                                    <td><code>${item.serialNumber}</code></td>
                                    <td><span class="badge badge-blue">${item.location}</span></td>
                                    <td>${this.renderIPCell(item)}</td>
                                    <td><span class="badge ${this.getStatusBadge(item.status)}">${item.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderRed() {
        const conIP = this.inventory.filter(i => i.ipAddress).length;
        const sinIP = this.inventory.length - conIP;
        const dhcp = this.inventory.filter(i => i.ipType === 'DHCP').length;
        const ipFija = this.inventory.filter(i => i.ipType === 'IP Fija').length;

        return `
            <div class="tab-content" id="tab-red">
                <div class="kpi-cards">
                    ${this.renderKPICard('Con IP', conIP, 'wifi', 'primary')}
                    ${this.renderKPICard('Sin IP', sinIP, 'wifi-off', 'warning')}
                    ${this.renderKPICard('DHCP', dhcp, 'network', 'success')}
                    ${this.renderKPICard('IP Fija', ipFija, 'hard-drive', 'info')}
                </div>
                <div class="charts-row">
                    <div class="chart-card">
                        <h3><i data-lucide="pie-chart"></i> Distribución IP</h3>
                        <canvas id="ipDistChart"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3><i data-lucide="bar-chart-3"></i> IP por Ubicación</h3>
                        <canvas id="ipLocationChart"></canvas>
                    </div>
                </div>
                <div class="recent-section">
                    <h3><i data-lucide="network"></i> Equipos con IP Asignada</h3>
                    <div class="table-responsive">
                        <table class="ejecutivo-table">
                            <thead>
                                <tr>
                                    <th>Serie</th>
                                    <th>Usuario</th>
                                    <th>IP Asignada</th>
                                    <th>Tipo</th>
                                    <th>Ubicación</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.inventory.filter(i => i.ipAddress).slice(0, 10).map(item => `
                                    <tr>
                                        <td><code>${item.serialNumber}</code></td>
                                        <td>${item.fullName}</td>
                                        <td><code style="color: var(--primary);">${item.ipAddress}</code></td>
                                        <td><span class="badge ${item.ipType === 'DHCP' ? 'badge-green' : 'badge-orange'}">${item.ipType || 'DHCP'}</span></td>
                                        <td><span class="badge badge-blue">${item.location}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderMantenimiento() {
        const proximos = this.inventory.filter(i => i.nextMtto).length;
        const vencidas = 0;
        const buenos = this.inventory.filter(i => !i.nextMtto || new Date(i.nextMtto) > new Date()).length;

        return `
            <div class="tab-content" id="tab-mantenimiento">
                <div class="kpi-cards">
                    ${this.renderKPICard('Próximos Manttos.', proximos, 'calendar', 'warning')}
                    ${this.renderKPICard('Vencidos', vencidas, 'alert-triangle', 'danger')}
                    ${this.renderKPICard('Al Día', buenos, 'check-circle', 'success')}
                    ${this.renderKPICard('Sin Fecha', this.inventory.length - proximos - buenos, 'calendar-x', 'gray')}
                </div>
                <div class="recent-section">
                    <h3><i data-lucide="wrench"></i> Equipos con Mantenimiento Programado</h3>
                    <div class="table-responsive">
                        <table class="ejecutivo-table">
                            <thead>
                                <tr>
                                    <th>Serie</th>
                                    <th>Usuario</th>
                                    <th>Último Mtto.</th>
                                    <th>Próximo Mtto.</th>
                                    <th>Garantía</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.inventory.filter(i => i.nextMtto).slice(0, 10).map(item => `
                                    <tr>
                                        <td><code>${item.serialNumber}</code></td>
                                        <td>${item.fullName}</td>
                                        <td>${item.lastMtto || '-'}</td>
                                        <td style="color: var(--primary); font-weight: 600;">${item.nextMtto || '-'}</td>
                                        <td>${item.warranty ? item.warranty + ' meses' : '-'}</td>
                                        <td><span class="badge ${this.getStatusBadge(item.status)}">${item.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderUsuarios() {
        const usuariosAgrupados = {};
        this.inventory.forEach(item => {
            if (!usuariosAgrupados[item.fullName]) {
                usuariosAgrupados[item.fullName] = [];
            }
            usuariosAgrupados[item.fullName].push(item);
        });

        const topUsuarios = Object.entries(usuariosAgrupados)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10);

        return `
            <div class="tab-content" id="tab-usuarios">
                <div class="kpi-cards">
                    ${this.renderKPICard('Total Usuarios', Object.keys(usuariosAgrupados).length, 'users', 'primary')}
                    ${this.renderKPICard('Con Equipo', this.inventory.filter(i => i.fullName && i.fullName !== 'N/A').length, 'laptop', 'success')}
                    ${this.renderKPICard('Sin Asignar', this.inventory.filter(i => !i.fullName || i.fullName === 'N/A').length, 'user-x', 'warning')}
                </div>
                <div class="recent-section">
                    <h3><i data-lucide="users"></i> Usuarios con Más Equipos</h3>
                    <div class="table-responsive">
                        <table class="ejecutivo-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Departamento</th>
                                    <th>Equipos</th>
                                    <th>Último Equipo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topUsuarios.map(([nombre, equipos]) => `
                                    <tr>
                                        <td style="font-weight: 600;">${nombre}</td>
                                        <td>${equipos[0].department || '-'}</td>
                                        <td><span class="badge badge-primary">${equipos.length}</span></td>
                                        <td>${equipos[0].deviceType} ${equipos[0].brand}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    renderKPICard(label, value, icon, color) {
        const colors = {
            primary: 'var(--primary)',
            success: 'var(--success)',
            warning: 'var(--warning)',
            danger: 'var(--danger)',
            info: '#3B82F6',
            gray: '#6B7280'
        };
        return `
            <div class="kpi-card-ejecutivo" style="--card-color: ${colors[color]}">
                <div class="kpi-icon"><i data-lucide="${icon}"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${value}</span>
                    <span class="kpi-label">${label}</span>
                </div>
            </div>
        `;
    }

    renderIPCell(item) {
        if (!item.ipAddress) return '<span class="badge badge-gray">Sin IP</span>';
        return `
            <div class="ip-cell">
                <code>${item.ipAddress}</code>
                <span class="badge ${item.ipType === 'DHCP' ? 'badge-green' : 'badge-orange'}">${item.ipType || 'DHCP'}</span>
            </div>
        `;
    }

    calculateKPIData() {
        return {
            total: this.inventory.length,
            active: this.inventory.filter(i => i.status === 'Activo').length,
            maintenance: this.inventory.filter(i => i.status === 'Mantenimiento').length,
            bajas: this.inventory.filter(i => i.status === 'Baja').length,
            totalValue: this.inventory.reduce((sum, i) => sum + (parseInt(i.price?.replace(/[^0-9]/g, '') || 0)), 0)
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
            if (this.filters.location && item.location !== this.filters.location) return false;
            if (this.filters.status && item.status !== this.filters.status) return false;
            if (this.filters.search) {
                const search = this.filters.search.toLowerCase();
                if (!item.fullName?.toLowerCase().includes(search) && 
                    !item.serialNumber?.toLowerCase().includes(search) &&
                    !item.brand?.toLowerCase().includes(search)) return false;
            }
            return true;
        });
    }

    setTab(tabId) {
        this.currentTab = tabId;
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

    refresh() {
        this.render();
    }

    viewDetail(id) {
        if (window.viewAssetDetail) {
            window.viewAssetDetail(id);
        }
    }

    exportDashboard() {
        alert('Exportando dashboard...');
    }

    initCharts() {
        if (typeof Chart === 'undefined') return;

        setTimeout(() => {
            this.initEstadoChart();
            this.initMarcasChart();
            this.initIPDistChart();
        }, 100);
    }

    initEstadoChart() {
        const ctx = document.getElementById('estadoChart');
        if (!ctx) return;

        const estados = {
            'Activo': this.inventory.filter(i => i.status === 'Activo').length,
            'Mantenimiento': this.inventory.filter(i => i.status === 'Mantenimiento').length,
            'Baja': this.inventory.filter(i => i.status === 'Baja').length,
            'Cancelado': this.inventory.filter(i => i.status === 'Cancelado').length
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(estados),
                datasets: [{
                    data: Object.values(estados),
                    backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9CA3AF' } }
                }
            }
        });
    }

    initMarcasChart() {
        const ctx = document.getElementById('marcasChart');
        if (!ctx) return;

        const marcas = {};
        this.inventory.forEach(i => {
            marcas[i.brand] = (marcas[i.brand] || 0) + 1;
        });

        const topMarcas = Object.entries(marcas).sort((a, b) => b[1] - a[1]).slice(0, 5);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topMarcas.map(m => m[0]),
                datasets: [{
                    label: 'Equipos',
                    data: topMarcas.map(m => m[1]),
                    backgroundColor: '#3B82F6',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    initIPDistChart() {
        const ctx = document.getElementById('ipDistChart');
        if (!ctx) return;

        const dhcp = this.inventory.filter(i => i.ipType === 'DHCP' || !i.ipType).length;
        const ipFija = this.inventory.filter(i => i.ipType === 'IP Fija').length;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['DHCP', 'IP Fija'],
                datasets: [{
                    data: [dhcp, ipFija],
                    backgroundColor: ['#10B981', '#F59E0B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9CA3AF' } }
                }
            }
        });
    }
}

export function initDashboardEjecutivo(inventory, containerId = 'dashboardContainer') {
    window.dashboard = new DashboardEjecutivo(inventory, containerId);
    window.dashboard.render();
    return window.dashboard;
}
