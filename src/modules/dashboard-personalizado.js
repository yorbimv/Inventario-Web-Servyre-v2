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

    // Inicializar iconos de Lucide después de renderizar
    if (window.lucide) {
        window.lucide.createIcons();
    }

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
        }

        if (window.lucide) {
            window.lucide.createIcons();
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
    // Calcular estadísticas por ubicación
    const ubicaciones = {};
    inventory.forEach(i => {
        const loc = i.location || 'Sin ubicación';
        if (!ubicaciones[loc]) {
            ubicaciones[loc] = { total: 0, activos: 0, mantenimiento: 0 };
        }
        ubicaciones[loc].total++;
        if (i.status === 'Activo') ubicaciones[loc].activos++;
        if (i.status === 'Mantenimiento') ubicaciones[loc].mantenimiento++;
    });
    const ubicacionList = Object.entries(ubicaciones).sort((a, b) => b[1].total - a[1].total);

    // Calcular modelos por ubicación
    const modelosPorUbicacion = {};
    inventory.forEach(i => {
        const loc = i.location || 'Sin ubicación';
        const model = `${i.brand || ''} ${i.model || ''}`.trim() || 'Sin modelo';
        if (!modelosPorUbicacion[loc]) {
            modelosPorUbicacion[loc] = {};
        }
        modelosPorUbicacion[loc][model] = (modelosPorUbicacion[loc][model] || 0) + 1;
    });
    
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem;">
            <!-- Tabla: Equipos por Ubicación -->
            <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="map-pin" style="width: 18px; height: 18px; color: #3B82F6;"></i>
                    Equipos por Ubicación
                </h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 400px;">
                        <thead style="background: var(--card-bg, #252547);">
                            <tr>
                                <th style="padding: 0.6rem 0.5rem; text-align: left; font-size: 0.65rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Ubicación</th>
                                <th style="padding: 0.6rem 0.5rem; text-align: center; font-size: 0.65rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Total</th>
                                <th style="padding: 0.6rem 0.5rem; text-align: center; font-size: 0.65rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Activos</th>
                                <th style="padding: 0.6rem 0.5rem; text-align: center; font-size: 0.65rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333);">Mtto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ubicacionList.map(([lugar, stats]) => `
                                <tr>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-light, #333); font-weight: 600; font-size: 0.85rem;">${lugar}</td>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-light, #333); text-align: center; font-size: 0.9rem; font-weight: 700; color: #3B82F6;">${stats.total}</td>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-light, #333); text-align: center; font-size: 0.85rem; color: #10B981;">${stats.activos}</td>
                                    <td style="padding: 0.5rem; border-bottom: 1px solid var(--border-light, #333); text-align: center; font-size: 0.85rem; color: ${stats.mantenimiento > 0 ? '#F59E0B' : 'var(--text-dim)'};">${stats.mantenimiento}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Lista Jerárquica: Modelos por Ubicación -->
            <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="monitor" style="width: 18px; height: 18px; color: #10B981;"></i>
                    Modelos por Ubicación
                </h3>
                <div>
                    ${Object.entries(modelosPorUbicacion).sort((a, b) => {
                        const totalA = Object.values(a[1]).reduce((sum, val) => sum + val, 0);
                        const totalB = Object.values(b[1]).reduce((sum, val) => sum + val, 0);
                        return totalB - totalA;
                    }).map(([ubicacion, modelos]) => {
                        const modelosOrdenados = Object.entries(modelos).sort((a, b) => b[1] - a[1]).slice(0, 5);
                        return `
                            <div style="margin-bottom: 1rem; background: var(--card-bg, #252547); border-radius: 8px; padding: 0.75rem;">
                                <div style="font-weight: 700; color: var(--text, #fff); font-size: 0.9rem; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="color: #3B82F6;">📍</span> ${ubicacion}
                                    <span style="font-size: 0.75rem; color: var(--text-dim, #888); font-weight: 400;">(${Object.values(modelos).reduce((a, b) => a + b, 0)} equipos)</span>
                                </div>
                                <div style="padding-left: 1.5rem;">
                                    ${modelosOrdenados.map(([modelo, cantidad], idx) => `
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.25rem 0; font-size: 0.8rem; ${idx < modelosOrdenados.length - 1 ? 'border-bottom: 1px solid var(--border-light, #333);' : ''}">
                                            <span style="color: var(--text-secondary, #ccc);">${idx + 1}. ${modelo}</span>
                                            <span style="font-weight: 600; color: #10B981; background: #10B98120; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">${cantidad}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
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
