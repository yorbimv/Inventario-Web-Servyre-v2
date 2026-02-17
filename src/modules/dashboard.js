import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const chartInstances = {};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
};

const animateCounter = (element, target, duration = 1500, prefix = '', suffix = '') => {
    const start = 0;
    const startTime = performance.now();
    
    const update = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        
        element.textContent = prefix + current.toLocaleString('es-MX') + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    };
    
    requestAnimationFrame(update);
};

const getKPIData = (inventory) => {
    const total = inventory.length;
    const active = inventory.filter(i => i.status === 'Activo').length;
    const maintenance = inventory.filter(i => i.status === 'Mantenimiento').length;
    const baja = inventory.filter(i => i.status === 'Baja').length;
    
    const totalValue = inventory.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);
    const avgValue = total > 0 ? totalValue / total : 0;
    
    const departments = [...new Set(inventory.map(i => i.department).filter(Boolean))];
    const locations = [...new Set(inventory.map(i => i.location).filter(Boolean))];
    
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingMtto = inventory.filter(i => {
        if (!i.nextMtto) return false;
        const mttoDate = new Date(i.nextMtto);
        return mttoDate <= nextWeek && mttoDate >= now;
    }).length;
    
    const overdueMtto = inventory.filter(i => {
        if (!i.nextMtto) return false;
        return new Date(i.nextMtto) < now;
    }).length;
    
    return { total, active, maintenance, baja, totalValue, avgValue, departments: departments.length, locations: locations.length, upcomingMtto, overdueMtto };
};

const getDistributionData = (inventory, field) => {
    const data = {};
    inventory.forEach(item => {
        const value = item[field] || 'Sin especificar';
        data[value] = (data[value] || 0) + 1;
    });
    return data;
};

const getValueByField = (inventory, field) => {
    const data = {};
    inventory.forEach(item => {
        const key = item[field] || 'Sin especificar';
        const value = parseFloat(item.price) || 0;
        data[key] = (data[key] || 0) + value;
    });
    return data;
};

const getTimelineData = (inventory) => {
    const data = {};
    inventory.forEach(item => {
        if (item.purchaseDate) {
            const year = new Date(item.purchaseDate).getFullYear();
            data[year] = (data[year] || 0) + 1;
        }
    });
    return data;
};

const colors = {
    primary: '#FCD34D',
    success: '#34C759',
    warning: '#FF9F0A',
    danger: '#FF453A',
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    indigo: '#6366F1'
};

const chartColors = Object.values(colors);

export const renderDashboard = (inventory, containerId = 'dashboardContainer') => {
    const container = document.getElementById(containerId);
    if (!container) return;

    Object.values(chartInstances).forEach(chart => chart.destroy());
    Object.keys(chartInstances).forEach(key => delete chartInstances[key]);

    const kpi = getKPIData(inventory);

    container.innerHTML = `
        <div class="dashboard-premium">
            <div class="dashboard-actions">
                <button class="premium-btn primary" id="exportDashboardPdf">
                    <i data-lucide="file-down"></i> Exportar PDF
                </button>
            </div>
            
            <div class="dashboard-nav">
                <button class="dashboard-nav-btn active" data-section="resumen">
                    <i data-lucide="layout-dashboard"></i> Resumen
                </button>
                <button class="dashboard-nav-btn" data-section="equipos">
                    <i data-lucide="laptop"></i> Equipos
                </button>
                <button class="dashboard-nav-btn" data-section="mantenimiento">
                    <i data-lucide="tool"></i> Mantenimiento
                </button>
                <button class="dashboard-nav-btn" data-section="garantias">
                    <i data-lucide="shield-check"></i> Garantías
                </button>
                <button class="dashboard-nav-btn" data-section="estados">
                    <i data-lucide="filter"></i> Estados
                </button>
                <button class="dashboard-nav-btn" data-section="financiero">
                    <i data-lucide="dollar-sign"></i> Financiero
                </button>
            </div>

            <div id="dashboardContent">
                ${renderResumenSection(kpi, inventory)}
            </div>
        </div>
    `;

    initDashboardNavigation(inventory);
    initCharts(inventory);
    initExportButton();

    if (window.lucide) window.lucide.createIcons();
};

const renderResumenSection = (kpi, inventory) => {
    return `
        <div class="dashboard-section active" id="section-resumen">
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon yellow"><i data-lucide="package"></i></div>
                        <div class="kpi-trend neutral"><i data-lucide="minus"></i> Total</div>
                    </div>
                    <div class="kpi-value" data-counter="${kpi.total}">0</div>
                    <div class="kpi-label">Total Activos</div>
                    <div class="kpi-sublabel">Registrados en sistema</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon green"><i data-lucide="check-circle"></i></div>
                        <div class="kpi-trend up"><i data-lucide="trending-up"></i> ${Math.round((kpi.active / (kpi.total || 1)) * 100)}%</div>
                    </div>
                    <div class="kpi-value" data-counter="${kpi.active}">0</div>
                    <div class="kpi-label">Activos</div>
                    <div class="kpi-sublabel">En funcionamiento</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon orange"><i data-lucide="wrench"></i></div>
                        <div class="kpi-trend neutral"><i data-lucide="activity"></i> ${kpi.maintenance}</div>
                    </div>
                    <div class="kpi-value" data-counter="${kpi.maintenance}">0</div>
                    <div class="kpi-label">En Mantenimiento</div>
                    <div class="kpi-sublabel">Requiere servicio</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon red"><i data-lucide="x-circle"></i></div>
                        <div class="kpi-trend down"><i data-lucide="trending-down"></i> ${kpi.baja}</div>
                    </div>
                    <div class="kpi-value" data-counter="${kpi.baja}">0</div>
                    <div class="kpi-label">De Baja</div>
                    <div class="kpi-sublabel">Inactivos/remplazados</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon blue"><i data-lucide="dollar-sign"></i></div>
                    </div>
                    <div class="kpi-value" data-counter="${kpi.totalValue}" data-currency="true">$0</div>
                    <div class="kpi-label">Valor Total</div>
                    <div class="kpi-sublabel">Inversión en activos</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon purple"><i data-lucide="calendar"></i></div>
                        <div class="kpi-trend ${kpi.upcomingMtto > 0 ? 'warning' : 'neutral'}">${kpi.upcomingMtto}</div>
                    </div>
                    <div class="kpi-value" data-counter="${kpi.upcomingMtto}">0</div>
                    <div class="kpi-label">Próximo Mantto.</div>
                    <div class="kpi-sublabel">Próximos 7 días</div>
                </div>
            </div>

            <div class="summary-cards">
                <div class="summary-card">
                    <div class="summary-icon" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6;">
                        <i data-lucide="building"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${kpi.departments}</div>
                        <div class="summary-label">Departamentos</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon" style="background: rgba(139, 92, 246, 0.15); color: #8B5CF6;">
                        <i data-lucide="map-pin"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${kpi.locations}</div>
                        <div class="summary-label">Ubicaciones</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon" style="background: rgba(255, 69, 58, 0.15); color: #FF453A;">
                        <i data-lucide="alert-triangle"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${kpi.overdueMtto}</div>
                        <div class="summary-label">Mantto. Vencido</div>
                    </div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon" style="background: rgba(6, 182, 212, 0.15); color: #06B6D4;">
                        <i data-lucide="calculator"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-value">${formatCurrency(kpi.avgValue)}</div>
                        <div class="summary-label">Valor Promedio</div>
                    </div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card">
                    <h3><i data-lucide="pie-chart"></i> Distribución por Estado</h3>
                    <canvas id="statusChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3><i data-lucide="bar-chart-3"></i> Estado de Activos</h3>
                    <canvas id="statusBarChart"></canvas>
                </div>
            </div>
        </div>
    `;
};

const renderEquiposSection = (inventory) => {
    const brands = getDistributionData(inventory, 'brand');
    const types = getDistributionData(inventory, 'deviceType');
    const models = getDistributionData(inventory, 'model');
    const topBrands = Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);

    return `
        <div class="dashboard-section" id="section-equipos">
            <div class="dashboard-grid">
                <div class="chart-card">
                    <h3><i data-lucide="tags"></i> Distribución por Marca</h3>
                    <canvas id="brandChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3><i data-lucide="monitor"></i> Tipos de Equipo</h3>
                    <canvas id="typeChart"></canvas>
                </div>
            </div>
            <div class="dashboard-grid">
                <div class="chart-card">
                    <h3><i data-lucide="trending-up"></i> Top 5 Marcas</h3>
                    <canvas id="topBrandsChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3><i data-lucide="hash"></i> Modelos Más Comunes</h3>
                    <canvas id="modelsChart"></canvas>
                </div>
            </div>
        </div>
    `;
};

const renderMantenimientoSection = (inventory) => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const next3Months = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    
    const overdue = [];
    const upcoming = [];
    const thisMonth = [];
    const nextMonths = [];

    inventory.forEach(item => {
        if (item.nextMtto) {
            const mttoDate = new Date(item.nextMtto);
            if (mttoDate < now) {
                overdue.push(item);
            } else if (mttoDate <= nextMonth) {
                upcoming.push(item);
            } else if (mttoDate <= next3Months) {
                thisMonth.push(item);
            } else {
                nextMonths.push(item);
            }
        }
    });

    return `
        <div class="dashboard-section" id="section-mantenimiento">
            <div class="kpi-grid">
                <div class="kpi-card" style="border-left: 4px solid #FF453A;">
                    <div class="kpi-header">
                        <div class="kpi-icon red"><i data-lucide="alert-circle"></i></div>
                    </div>
                    <div class="kpi-value">${overdue.length}</div>
                    <div class="kpi-label">Vencidos</div>
                    <div class="kpi-sublabel">Mantenimiento atrasado</div>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #FF9F0A;">
                    <div class="kpi-header">
                        <div class="kpi-icon orange"><i data-lucide="clock"></i></div>
                    </div>
                    <div class="kpi-value">${upcoming.length}</div>
                    <div class="kpi-label">Esta Semana</div>
                    <div class="kpi-sublabel">Próximos 7 días</div>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #3B82F6;">
                    <div class="kpi-header">
                        <div class="kpi-icon blue"><i data-lucide="calendar"></i></div>
                    </div>
                    <div class="kpi-value">${thisMonth.length}</div>
                    <div class="kpi-label">Este Mes</div>
                    <div class="kpi-sublabel">Próximos 30 días</div>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #34C759;">
                    <div class="kpi-header">
                        <div class="kpi-icon green"><i data-lucide="check-circle"></i></div>
                    </div>
                    <div class="kpi-value">${nextMonths.length}</div>
                    <div class="kpi-label">Próximos Meses</div>
                    <div class="kpi-sublabel">1-3 meses</div>
                </div>
            </div>

            <div class="dashboard-grid single">
                <div class="chart-card wide">
                    <h3><i data-lucide="calendar-range"></i> Línea de Tiempo de Mantenimientos</h3>
                    <canvas id="mttoTimelineChart"></canvas>
                </div>
            </div>

            ${overdue.length > 0 ? `
                <div class="chart-card" style="margin-top: 1.5rem;">
                    <h3><i data-lucide="alert-triangle"></i> Equipos con Mantenimiento Vencido</h3>
                    <table class="table-mini">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Equipo</th>
                                <th>Serie</th>
                                <th>Ubicación</th>
                                <th>Último Mtto</th>
                                <th>Próximo Mtto</th>
                                <th>Días Vencido</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${overdue.slice(0, 10).map(item => {
                                const daysOverdue = Math.floor((now - new Date(item.nextMtto)) / (1000 * 60 * 60 * 24));
                                return `
                                    <tr>
                                        <td>${item.fullName || '-'}</td>
                                        <td>${item.deviceType || '-'} ${item.brand || ''}</td>
                                        <td>${item.serialNumber || '-'}</td>
                                        <td>${item.location || '-'}</td>
                                        <td>${item.lastMtto || '-'}</td>
                                        <td>${item.nextMtto || '-'}</td>
                                        <td><span class="badge badge-danger">${daysOverdue} días</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `;
};

const renderFinancieroSection = (inventory) => {
    const byDept = getValueByField(inventory, 'department');
    const byLocation = getValueByField(inventory, 'location');
    const byBrand = getValueByField(inventory, 'brand');
    
    const topDept = Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topLocation = Object.entries(byLocation).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const totalValue = Object.values(byDept).reduce((a, b) => a + b, 0);

    return `
        <div class="dashboard-section" id="section-financiero">
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon blue"><i data-lucide="banknote"></i></div>
                    </div>
                    <div class="kpi-value">${formatCurrency(totalValue)}</div>
                    <div class="kpi-label">Valor Total Activos</div>
                    <div class="kpi-sublabel">Inversión acumulada</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon purple"><i data-lucide="building"></i></div>
                    </div>
                    <div class="kpi-value">${formatCurrency(byDept[Object.keys(byDept).sort((a,b) => byDept[b]-byDept[a])[0]] || 0)}</div>
                    <div class="kpi-label">Depto. Mayor Valor</div>
                    <div class="kpi-sublabel">${Object.keys(byDept).sort((a,b) => byDept[b]-byDept[a])[0] || '-'}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon green"><i data-lucide="map-pin"></i></div>
                    </div>
                    <div class="kpi-value">${formatCurrency(byLocation[Object.keys(byLocation).sort((a,b) => byLocation[b]-byLocation[a])[0]] || 0)}</div>
                    <div class="kpi-label">Ubicación Mayor Valor</div>
                    <div class="kpi-sublabel">${Object.keys(byLocation).sort((a,b) => byLocation[b]-byLocation[a])[0] || '-'}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-header">
                        <div class="kpi-icon orange"><i data-lucide="tag"></i></div>
                    </div>
                    <div class="kpi-value">${formatCurrency(byBrand[Object.keys(byBrand).sort((a,b) => byBrand[b]-byBrand[a])[0]] || 0)}</div>
                    <div class="kpi-label">Marca Mayor Inversión</div>
                    <div class="kpi-sublabel">${Object.keys(byBrand).sort((a,b) => byBrand[b]-byBrand[a])[0] || '-'}</div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card">
                    <h3><i data-lucide="building"></i> Valor por Departamento</h3>
                    <canvas id="deptValueChart"></canvas>
                </div>
                <div class="chart-card">
                    <h3><i data-lucide="map-pin"></i> Valor por Ubicación</h3>
                    <canvas id="locationValueChart"></canvas>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card wide">
                    <h3><i data-lucide="bar-chart"></i> Comparativa Valor por Marca</h3>
                    <canvas id="brandValueChart"></canvas>
                </div>
            </div>

            <div class="dashboard-grid single">
                <div class="chart-card">
                    <h3><i data-lucide="history"></i> Adquisiciones por Año</h3>
                    <canvas id="yearChart"></canvas>
                </div>
            </div>
        </div>
    `;
};

const renderGarantiasSection = (inventory) => {
    const now = new Date();
    
    const garantia15 = inventory.filter(item => {
        if (!item.warrantyEndDate) return false;
        const end = new Date(item.warrantyEndDate);
        const diff = (end - now) / (1000 * 60 * 60 * 24);
        return diff <= 15 && diff > 0;
    });
    
    const garantia30 = inventory.filter(item => {
        if (!item.warrantyEndDate) return false;
        const end = new Date(item.warrantyEndDate);
        const diff = (end - now) / (1000 * 60 * 60 * 24);
        return diff <= 30 && diff > 15;
    });
    
    const garantia60 = inventory.filter(item => {
        if (!item.warrantyEndDate) return false;
        const end = new Date(item.warrantyEndDate);
        const diff = (end - now) / (1000 * 60 * 60 * 24);
        return diff <= 60 && diff > 30;
    });
    
    const vencidas = inventory.filter(item => {
        if (!item.warrantyEndDate) return false;
        return new Date(item.warrantyEndDate) < now;
    });

    const renderWarrantyTable = (items, title, color) => {
        if (items.length === 0) return '';
        return `
            <div class="chart-card" style="margin-top: 1.5rem;">
                <h3 style="color: ${color};"><i data-lucide="alert-circle"></i> ${title} (${items.length})</h3>
                <div class="table-responsive">
                    <table class="table-mini">
                        <thead>
                            <tr>
                                <th>Resguardo</th>
                                <th>Equipo</th>
                                <th>Usuario</th>
                                <th>Fin Garantía</th>
                                <th>Días</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => {
                                const end = new Date(item.warrantyEndDate);
                                const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                                return `
                                    <tr>
                                        <td><code>${item.resguardo || '-'}</code></td>
                                        <td>${item.deviceType} ${item.brand}</td>
                                        <td>${item.fullName}</td>
                                        <td>${item.warrantyEndDate}</td>
                                        <td><span class="badge" style="background: ${color}; color: white;">${diff} días</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    return `
        <div class="dashboard-section" id="section-garantias">
            <div class="kpi-grid">
                <div class="kpi-card" style="border-left: 4px solid #FF453A;">
                    <div class="kpi-header">
                        <div class="kpi-icon red"><i data-lucide="alert-circle"></i></div>
                    </div>
                    <div class="kpi-value">${vencidas.length}</div>
                    <div class="kpi-label">Garantías Vencidas</div>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #FF9F0A;">
                    <div class="kpi-header">
                        <div class="kpi-icon orange"><i data-lucide="clock"></i></div>
                    </div>
                    <div class="kpi-value">${garantia15.length}</div>
                    <div class="kpi-label">15 días o menos</div>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #FF9500;">
                    <div class="kpi-header">
                        <div class="kpi-icon" style="background: rgba(255, 149, 0, 0.15); color: #FF9500;"><i data-lucide="calendar"></i></div>
                    </div>
                    <div class="kpi-value">${garantia30.length}</div>
                    <div class="kpi-label">16-30 días</div>
                </div>
                <div class="kpi-card" style="border-left: 4px solid #34C759;">
                    <div class="kpi-header">
                        <div class="kpi-icon green"><i data-lucide="check-circle"></i></div>
                    </div>
                    <div class="kpi-value">${garantia60.length}</div>
                    <div class="kpi-label">31-60 días</div>
                </div>
            </div>
            
            ${renderWarrantyTable(vencidas, 'Vencidas', '#FF453A')}
            ${renderWarrantyTable(garantia15, '15 días o menos', '#FF9F0A')}
            ${renderWarrantyTable(garantia30, '16-30 días', '#FF9500')}
        </div>
    `;
};

const renderEstadosSection = (inventory) => {
    const counts = {
        activo: inventory.filter(i => i.status === 'Activo').length,
        mantenimiento: inventory.filter(i => i.status === 'Mantenimiento').length,
        baja: inventory.filter(i => i.status === 'Baja').length,
        cancelado: inventory.filter(i => i.status === 'Cancelado').length,
        piezas: inventory.filter(i => i.status === 'Para piezas').length
    };

    const renderStatusTable = (items, title) => {
        if (items.length === 0) return '';
        return `
            <div class="chart-card" style="margin-top: 1.5rem;">
                <h3><i data-lucide="list"></i> ${title} (${items.length} equipos)</h3>
                <div class="table-responsive">
                    <table class="table-mini">
                        <thead>
                            <tr>
                                <th>Resguardo</th>
                                <th>Equipo</th>
                                <th>Marca</th>
                                <th>Serie</th>
                                <th>Usuario</th>
                                <th>Ubicación</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td><code>${item.resguardo || '-'}</code></td>
                                    <td>${item.deviceType}</td>
                                    <td>${item.brand}</td>
                                    <td>${item.serialNumber}</td>
                                    <td>${item.fullName}</td>
                                    <td>${item.location}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    };

    return `
        <div class="dashboard-section" id="section-estados">
            <div class="filter-buttons-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <button class="filter-btn active" data-filter="all" onclick="window.filterDashboardStatus('all')" style="padding: 1rem; border: 2px solid var(--primary); background: var(--surface); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${inventory.length}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim);">Todos</div>
                </button>
                <button class="filter-btn" data-filter="Activo" onclick="window.filterDashboardStatus('Activo')" style="padding: 1rem; border: 2px solid #34C759; background: var(--surface); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2rem; font-weight: 700; color: #34C759;">${counts.activo}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim);">Activos</div>
                </button>
                <button class="filter-btn" data-filter="Mantenimiento" onclick="window.filterDashboardStatus('Mantenimiento')" style="padding: 1rem; border: 2px solid #FF9F0A; background: var(--surface); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2rem; font-weight: 700; color: #FF9F0A;">${counts.mantenimiento}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim);">Mantenimiento</div>
                </button>
                <button class="filter-btn" data-filter="Baja" onclick="window.filterDashboardStatus('Baja')" style="padding: 1rem; border: 2px solid #FF453A; background: var(--surface); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2rem; font-weight: 700; color: #FF453A;">${counts.baja}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim);">Bajas</div>
                </button>
                <button class="filter-btn" data-filter="Cancelado" onclick="window.filterDashboardStatus('Cancelado')" style="padding: 1rem; border: 2px solid #8E8E93; background: var(--surface); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2rem; font-weight: 700; color: #8E8E93;">${counts.cancelado}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim);">Cancelados</div>
                </button>
                <button class="filter-btn" data-filter="Para piezas" onclick="window.filterDashboardStatus('Para piezas')" style="padding: 1rem; border: 2px solid #FF9500; background: var(--surface); border-radius: 12px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2rem; font-weight: 700; color: #FF9500;">${counts.piezas}</div>
                    <div style="font-size: 0.85rem; color: var(--text-dim);">Para Piezas</div>
                </button>
            </div>
            <div id="filteredStatusResults">
                ${renderStatusTable(inventory, 'Todos los Equipos')}
            </div>
        </div>
    `;
};

const initDashboardNavigation = (inventory) => {
    // Set up filter function for Estados section
    window.filterDashboardStatus = (filter) => {
        const container = document.getElementById('filteredStatusResults');
        if (!container) return;
        
        let filteredData = inventory;
        let title = 'Todos los Equipos';
        
        if (filter !== 'all') {
            filteredData = inventory.filter(item => item.status === filter);
            title = `Equipos - ${filter}`;
        }
        
        // Update active button state
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.style.background = 'var(--primary)';
                btn.style.color = '#000';
            } else {
                btn.style.background = 'var(--surface)';
                btn.style.color = 'inherit';
            }
        });
        
        // Re-render table
        const renderStatusTable = (items, title) => {
            if (items.length === 0) return '<div class="chart-card" style="margin-top: 1.5rem; text-align: center; padding: 2rem;"><p>No hay equipos en esta categoría</p></div>';
            return `
                <div class="chart-card" style="margin-top: 1.5rem;">
                    <h3><i data-lucide="list"></i> ${title} (${items.length} equipos)</h3>
                    <div class="table-responsive">
                        <table class="table-mini">
                            <thead>
                                <tr>
                                    <th>Resguardo</th>
                                    <th>Equipo</th>
                                    <th>Marca</th>
                                    <th>Serie</th>
                                    <th>Usuario</th>
                                    <th>Ubicación</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td><code>${item.resguardo || '-'}</code></td>
                                        <td>${item.deviceType}</td>
                                        <td>${item.brand}</td>
                                        <td>${item.serialNumber}</td>
                                        <td>${item.fullName}</td>
                                        <td>${item.location}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };
        
        container.innerHTML = renderStatusTable(filteredData, title);
        if (window.lucide) window.lucide.createIcons();
    };

    document.querySelectorAll('.dashboard-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dashboard-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const section = btn.dataset.section;
            const content = document.getElementById('dashboardContent');
            
            if (section === 'resumen') {
                content.innerHTML = renderResumenSection(getKPIData(inventory), inventory);
            } else if (section === 'equipos') {
                content.innerHTML = renderEquiposSection(inventory);
            } else if (section === 'mantenimiento') {
                content.innerHTML = renderMantenimientoSection(inventory);
            } else if (section === 'garantias') {
                content.innerHTML = renderGarantiasSection(inventory);
            } else if (section === 'estados') {
                content.innerHTML = renderEstadosSection(inventory);
            } else if (section === 'financiero') {
                content.innerHTML = renderFinancieroSection(inventory);
            }

            if (window.lucide) {
                window.lucide.createIcons();
            }
            
            initCharts(inventory, section);
            animateKPICounters();
        });
    });
};

const animateKPICounters = () => {
    document.querySelectorAll('.kpi-value[data-counter]').forEach(el => {
        const target = parseFloat(el.dataset.counter) || 0;
        const isCurrency = el.dataset.currency === 'true';
        
        if (isCurrency) {
            animateCounter(el, target, 1500, '$');
        } else {
            animateCounter(el, target, 1500);
        }
    });
};

const initCharts = (inventory, currentSection = 'resumen') => {
    const kpi = getKPIData(inventory);

    if (currentSection === 'resumen' || !currentSection) {
        animateKPICounters();

        if (document.getElementById('statusChart')) {
            chartInstances.statusChart = new Chart(document.getElementById('statusChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Activo', 'Mantenimiento', 'Baja'],
                    datasets: [{
                        data: [kpi.active, kpi.maintenance, kpi.baja],
                        backgroundColor: [colors.success, colors.warning, colors.danger],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#98989D',
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    },
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }

        if (document.getElementById('statusBarChart')) {
            chartInstances.statusBarChart = new Chart(document.getElementById('statusBarChart'), {
                type: 'bar',
                data: {
                    labels: ['Activo', 'Mantenimiento', 'Baja'],
                    datasets: [{
                        label: 'Cantidad',
                        data: [kpi.active, kpi.maintenance, kpi.baja],
                        backgroundColor: [colors.success, colors.warning, colors.danger],
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#98989D' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: '#98989D', font: { weight: 'bold' } }
                        }
                    },
                    animation: {
                        duration: 1500,
                        easing: 'easeOutQuart'
                    }
                }
            });
        }
    }

    if (currentSection === 'equipos' || !currentSection) {
        const brands = getDistributionData(inventory, 'brand');
        const types = getDistributionData(inventory, 'deviceType');
        const models = getDistributionData(inventory, 'model');
        const topBrands = Object.entries(brands).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topModels = Object.entries(models).sort((a, b) => b[1] - a[1]).slice(0, 8);

        if (document.getElementById('brandChart')) {
            chartInstances.brandChart = new Chart(document.getElementById('brandChart'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(brands),
                    datasets: [{
                        data: Object.values(brands),
                        backgroundColor: chartColors,
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#98989D',
                                padding: 12,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 11 }
                            }
                        }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }

        if (document.getElementById('typeChart')) {
            chartInstances.typeChart = new Chart(document.getElementById('typeChart'), {
                type: 'pie',
                data: {
                    labels: Object.keys(types),
                    datasets: [{
                        data: Object.values(types),
                        backgroundColor: chartColors,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#98989D',
                                padding: 15,
                                usePointStyle: true
                            }
                        }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }

        if (document.getElementById('topBrandsChart')) {
            chartInstances.topBrandsChart = new Chart(document.getElementById('topBrandsChart'), {
                type: 'bar',
                data: {
                    labels: topBrands.map(b => b[0]),
                    datasets: [{
                        label: 'Equipos',
                        data: topBrands.map(b => b[1]),
                        backgroundColor: [colors.primary, colors.blue, colors.purple, colors.cyan, colors.pink],
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#98989D' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#98989D' } }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }

        if (document.getElementById('modelsChart')) {
            chartInstances.modelsChart = new Chart(document.getElementById('modelsChart'), {
                type: 'bar',
                data: {
                    labels: topModels.map(m => m[0]),
                    datasets: [{
                        label: 'Cantidad',
                        data: topModels.map(m => m[1]),
                        backgroundColor: colors.primary,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#98989D' } },
                        y: { grid: { display: false }, ticks: { color: '#98989D', font: { size: 10 } } }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }
    }

    if (currentSection === 'mantenimiento' || !currentSection) {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const next3Months = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
        
        let overdue = 0, thisWeek = 0, thisMonth = 0, nextMonthsQ = 0;

        inventory.forEach(item => {
            if (item.nextMtto) {
                const mttoDate = new Date(item.nextMtto);
                if (mttoDate < now) overdue++;
                else if (mttoDate <= nextMonth) thisWeek++;
                else if (mttoDate <= next3Months) thisMonth++;
                else nextMonthsQ++;
            }
        });

        if (document.getElementById('mttoTimelineChart')) {
            chartInstances.mttoTimelineChart = new Chart(document.getElementById('mttoTimelineChart'), {
                type: 'bar',
                data: {
                    labels: ['Vencidos', 'Esta Semana', 'Este Mes', 'Próximos Meses'],
                    datasets: [{
                        label: 'Equipos',
                        data: [overdue, thisWeek, thisMonth, nextMonthsQ],
                        backgroundColor: [colors.danger, colors.warning, colors.blue, colors.success],
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#98989D' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#98989D' } }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }
    }

    if (currentSection === 'financiero' || !currentSection) {
        const byDept = getValueByField(inventory, 'department');
        const byLocation = getValueByField(inventory, 'location');
        const byBrand = getValueByField(inventory, 'brand');
        const timeline = getTimelineData(inventory);

        const topDept = Object.entries(byDept).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topLocation = Object.entries(byLocation).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const topBrand = Object.entries(byBrand).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const years = Object.keys(timeline).sort();

        if (document.getElementById('deptValueChart')) {
            chartInstances.deptValueChart = new Chart(document.getElementById('deptValueChart'), {
                type: 'doughnut',
                data: {
                    labels: topDept.map(d => d[0]),
                    datasets: [{
                        data: topDept.map(d => d[1]),
                        backgroundColor: chartColors,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '55%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#98989D',
                                padding: 10,
                                usePointStyle: true,
                                font: { size: 10 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    animation: { duration: 1500 }
                }
            });
        }

        if (document.getElementById('locationValueChart')) {
            chartInstances.locationValueChart = new Chart(document.getElementById('locationValueChart'), {
                type: 'doughnut',
                data: {
                    labels: topLocation.map(l => l[0]),
                    datasets: [{
                        data: topLocation.map(l => l[1]),
                        backgroundColor: chartColors,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '55%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#98989D',
                                padding: 10,
                                usePointStyle: true,
                                font: { size: 10 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
                            }
                        }
                    },
                    animation: { duration: 1500 }
                }
            });
        }

        if (document.getElementById('brandValueChart')) {
            chartInstances.brandValueChart = new Chart(document.getElementById('brandValueChart'), {
                type: 'bar',
                data: {
                    labels: topBrand.map(b => b[0]),
                    datasets: [{
                        label: 'Valor (MXN)',
                        data: topBrand.map(b => b[1]),
                        backgroundColor: colors.primary,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => formatCurrency(ctx.raw)
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#98989D', font: { size: 10 } } },
                        y: { 
                            grid: { color: 'rgba(255,255,255,0.05)' }, 
                            ticks: {
                                color: '#98989D',
                                callback: (value) => formatCurrency(value)
                            }
                        }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }

        if (document.getElementById('yearChart')) {
            chartInstances.yearChart = new Chart(document.getElementById('yearChart'), {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Adquisiciones',
                        data: years.map(y => timeline[y]),
                        borderColor: colors.primary,
                        backgroundColor: 'rgba(252, 211, 77, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.primary,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#98989D' } },
                        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#98989D' } }
                    },
                    animation: { duration: 1500, easing: 'easeOutQuart' }
                }
            });
        }

        animateKPICounters();
    }
};

const initExportButton = () => {
    const btn = document.getElementById('exportDashboardPdf');
    if (btn) {
        btn.addEventListener('click', exportDashboardPdf);
    }
};

export const exportDashboardPdf = async () => {
    const btn = document.getElementById('exportDashboardPdf');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Generando...';
    }

    try {
        const dashboard = document.querySelector('.dashboard-premium');
        if (!dashboard) return;

        const canvas = await html2canvas(dashboard, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#0F0F0F'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.setFillColor(15, 15, 15);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        pdf.setFillColor(30, 58, 138);
        pdf.rect(0, 0, pageWidth, 30, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.text('SERVYRE IT', 14, 18);
        
        pdf.setFontSize(10);
        pdf.text('Dashboard Ejecutivo', 14, 25);
        
        pdf.setTextColor(255, 255, 255);
        pdf.text(new Date().toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }), pageWidth - 14, 18, { align: 'right' });

        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let yPos = 35;
        
        if (imgHeight > pageHeight - 45) {
            const ratio = (pageHeight - 45) / imgHeight;
            const scaledHeight = imgHeight * ratio;
            pdf.addImage(imgData, 'PNG', 10, yPos, imgWidth * ratio, scaledHeight);
        } else {
            pdf.addImage(imgData, 'PNG', 10, yPos, imgWidth, imgHeight);
        }

        pdf.save(`Dashboard_Servyre_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Error al generar el PDF. Por favor intenta de nuevo.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="file-down"></i> Exportar PDF';
            if (window.createIcons) window.createIcons();
        }
    }
};
