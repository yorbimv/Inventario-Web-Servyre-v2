/**
 * Dashboard Personalizado - Simple y Funcional
 */

export function initDashboardPersonalizado(inventory, containerId = 'dashboardContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container no encontrado');
        return;
    }

    // Calcular KPIs
    const kpis = {
        total: inventory.length,
        active: inventory.filter(i => i.status === 'Activo').length,
        maintenance: inventory.filter(i => i.status === 'Mantenimiento').length,
        warranty: inventory.filter(i => i.warranty && parseInt(i.warranty) > 0).length,
        baja: inventory.filter(i => i.status === 'Baja').length,
        piezas: inventory.filter(i => i.status === 'Para piezas').length,
        conIP: inventory.filter(i => i.ipAddress).length,
        sinIP: inventory.length - inventory.filter(i => i.ipAddress).length,
        dhcp: inventory.filter(i => i.ipType === 'DHCP' || !i.ipType).length,
        ipFija: inventory.filter(i => i.ipType === 'IP Fija').length
    };

    // HTML del dashboard
    container.innerHTML = `
        <div class="personalized-dashboard" style="padding: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; font-size: 1.5rem; color: var(--text);">
                    <i data-lucide="layout-dashboard" style="vertical-align: middle; margin-right: 0.5rem;"></i>
                    Dashboard
                </h2>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="renderDashboardView('resumen')" class="glass-btn" style="padding: 0.5rem 1rem;">
                        <i data-lucide="home" style="width: 16px;"></i> Resumen
                    </button>
                    <button onclick="renderDashboardView('red')" class="glass-btn" style="padding: 0.5rem 1rem;">
                        <i data-lucide="wifi" style="width: 16px;"></i> Red/IP
                    </button>
                    <button onclick="renderDashboardView('inventario')" class="glass-btn" style="padding: 0.5rem 1rem;">
                        <i data-lucide="package" style="width: 16px;"></i> Inventario
                    </button>
                </div>
            </div>

            <!-- KPIs Row -->
            <div class="kpi-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                ${renderKPICard('Total', kpis.total, '#3B82F6', 'package')}
                ${renderKPICard('Activos', kpis.active, '#10B981', 'check-circle')}
                ${renderKPICard('Mantenimiento', kpis.maintenance, '#F59E0B', 'wrench')}
                ${renderKPICard('Garantía', kpis.warranty, '#8B5CF6', 'shield-check')}
                ${renderKPICard('Baja', kpis.baja, '#EF4444', 'x-circle')}
                ${renderKPICard('Para Piezas', kpis.piezas, '#F97316', 'cpu')}
            </div>

            <!-- IP KPIs -->
            <div class="ip-kpi-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                ${renderKPICard('Con IP', kpis.conIP, '#3B82F6', 'wifi')}
                ${renderKPICard('Sin IP', kpis.sinIP, '#6B7280', 'wifi-off')}
                ${renderKPICard('DHCP', kpis.dhcp, '#10B981', 'network')}
                ${renderKPICard('IP Fija', kpis.ipFija, '#F59E0B', 'hard-drive')}
            </div>

            <!-- Content Area -->
            <div id="dashboardContent" class="dashboard-content">
                ${renderResumenView(inventory, kpis)}
            </div>
        </div>
    `;

    // Inicializar iconos
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Inicializar gráficos
    initCharts(inventory);

    // Función global para cambiar vistas
    window.renderDashboardView = function(view) {
        const content = document.getElementById('dashboardContent');
        if (!content) return;

        switch(view) {
            case 'resumen':
                content.innerHTML = renderResumenView(inventory, kpis);
                break;
            case 'red':
                content.innerHTML = renderRedView(inventory);
                break;
            case 'inventario':
                content.innerHTML = renderInventarioView(inventory);
                break;
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        if (view === 'resumen') {
            initCharts(inventory);
        }
    };
}

function renderKPICard(label, value, color, icon) {
    return `
        <div class="kpi-card-simple" style="
            background: var(--surface, #1e1e3f);
            border: 1px solid var(--border, #333);
            border-radius: 12px;
            padding: 1.25rem;
            position: relative;
            overflow: hidden;
        ">
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: ${color};
            "></div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: ${color}20;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: ${color};
                ">
                    <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
                </div>
                <div>
                    <div style="font-size: 1.75rem; font-weight: 700; color: var(--text, #fff); line-height: 1;">${value}</div>
                    <div style="font-size: 0.7rem; color: var(--text-dim, #888); text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
                </div>
            </div>
        </div>
    `;
}

function renderResumenView(inventory, kpis) {
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem;">
            <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="pie-chart" style="width: 18px; height: 18px; color: var(--primary, #FCD34D);"></i>
                    Estado de Equipos
                </h3>
                <div style="height: 280px;">
                    <canvas id="estadoChart"></canvas>
                </div>
            </div>
            <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="bar-chart-3" style="width: 18px; height: 18px; color: var(--primary, #FCD34D);"></i>
                    Modelos Más Comunes
                </h3>
                <div style="height: 280px;">
                    <canvas id="modelosChart"></canvas>
                </div>
            </div>
        </div>
    `;
}

function renderRedView(inventory) {
    const conIP = inventory.filter(i => i.ipAddress);
    
    return `
        <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; overflow: hidden;">
            <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border, #333);">
                <h3 style="margin: 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="wifi" style="width: 18px; height: 18px; color: var(--primary, #FCD34D);"></i>
                    Equipos con IP Asignada (${conIP.length})
                </h3>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: var(--card-bg, #252547); position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Usuario</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Equipo</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Correo</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">IP</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conIP.map(item => `
                            <tr>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-weight: 600;">${item.fullName || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333);">${item.deviceType || '-'} ${item.brand || ''}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-size: 0.85rem;">${item.email || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; color: var(--primary, #FCD34D); font-weight: 600;">${item.ipAddress}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333);">
                                    <span class="badge ${item.ipType === 'IP Fija' ? 'badge-orange' : 'badge-green'}" style="font-size: 0.65rem;">
                                        ${item.ipType || 'DHCP'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderInventarioView(inventory) {
    return `
        <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; overflow: hidden;">
            <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border, #333);">
                <h3 style="margin: 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="package" style="width: 18px; height: 18px; color: var(--primary, #FCD34D);"></i>
                    Inventario Completo (${inventory.length})
                </h3>
            </div>
            <div style="max-height: 500px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: var(--card-bg, #252547); position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Resguardo</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Usuario</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Equipo</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Marca</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Ubicación</th>
                            <th style="padding: 0.875rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.slice(0, 50).map(item => `
                            <tr>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; font-size: 0.8rem;">${item.resguardo || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-weight: 600;">${item.fullName || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333);">${item.deviceType || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333);">${item.brand || '-'} ${item.model || ''}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333);"><span class="badge badge-blue" style="font-size: 0.65rem;">${item.location || '-'}</span></td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333);"><span class="badge ${getStatusBadge(item.status)}">${item.status || '-'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'Activo': 'badge-green',
        'Mantenimiento': 'badge-orange',
        'Baja': 'badge-danger',
        'Cancelado': 'badge-gray',
        'Para piezas': 'badge-orange'
    };
    return badges[status] || 'badge-gray';
}

function initCharts(inventory) {
    if (typeof Chart === 'undefined') return;

    setTimeout(() => {
        // Estado Chart
        const estadoCtx = document.getElementById('estadoChart');
        if (estadoCtx) {
            const estados = {
                'Activo': inventory.filter(i => i.status === 'Activo').length,
                'Mantenimiento': inventory.filter(i => i.status === 'Mantenimiento').length,
                'Baja': inventory.filter(i => i.status === 'Baja').length,
                'Para piezas': inventory.filter(i => i.status === 'Para piezas').length
            };

            new Chart(estadoCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(estados),
                    datasets: [{
                        data: Object.values(estados),
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#F97316'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#9CA3AF', padding: 15, usePointStyle: true }
                        }
                    }
                }
            });
        }

        // Modelos Chart
        const modelosCtx = document.getElementById('modelosChart');
        if (modelosCtx) {
            const modelsMap = {};
            inventory.forEach(i => {
                const model = `${i.brand || ''} ${i.model || ''}`.trim() || 'Sin modelo';
                modelsMap[model] = (modelsMap[model] || 0) + 1;
            });

            const topModels = Object.entries(modelsMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

            new Chart(modelosCtx, {
                type: 'bar',
                data: {
                    labels: topModels.map(m => m[0].substring(0, 15)),
                    datasets: [{
                        label: 'Equipos',
                        data: topModels.map(m => m[1]),
                        backgroundColor: '#3B82F6',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9CA3AF' } },
                        y: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
                    }
                }
            });
        }
    }, 100);
}
