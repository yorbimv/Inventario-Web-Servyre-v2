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
    // Calcular estadísticas para las tarjetas
    const ubicaciones = {};
    inventory.forEach(i => {
        const loc = i.location || 'Sin ubicación';
        ubicaciones[loc] = (ubicaciones[loc] || 0) + 1;
    });
    const ubicacionList = Object.entries(ubicaciones).sort((a, b) => b[1] - a[1]);

    const modelsMap = {};
    inventory.forEach(i => {
        const model = `${i.brand || ''} ${i.model || ''}`.trim() || 'Sin modelo';
        modelsMap[model] = (modelsMap[model] || 0) + 1;
    });
    const modeloList = Object.entries(modelsMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    
    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem;">
            <!-- Ubicaciones -->
            <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="map-pin" style="width: 18px; height: 18px; color: #3B82F6;"></i>
                    Equipos por Ubicación
                </h3>
                <p style="margin: 0 0 1rem 0; font-size: 0.75rem; color: var(--text-dim, #666);">Cantidad de equipos distribuidos por sede o ubicación física</p>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${ubicacionList.map(([lugar, cantidad], idx) => `
                        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg, #252547); border-radius: 8px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: ${['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'][idx % 6]}20; display: flex; align-items: center; justify-content: center; color: ${['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'][idx % 6]}; font-weight: 700; font-size: 0.9rem;">
                                ${cantidad}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--text, #fff); font-size: 0.9rem;">${lugar}</div>
                                <div style="height: 6px; background: #333; border-radius: 3px; margin-top: 6px; overflow: hidden;">
                                    <div style="height: 100%; width: ${(cantidad / ubicacionList[0][1]) * 100}%; background: ${['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'][idx % 6]}; border-radius: 3px;"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Modelos -->
            <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.5rem;">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="monitor" style="width: 18px; height: 18px; color: #10B981;"></i>
                    Modelos Más Comunes
                </h3>
                <p style="margin: 0 0 1rem 0; font-size: 0.75rem; color: var(--text-dim, #666);">Top modelos de equipos con mayor cantidad en inventario</p>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${modeloList.map(([modelo, cantidad], idx) => `
                        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--card-bg, #252547); border-radius: 8px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: #10B98120; display: flex; align-items: center; justify-content: center; color: #10B981; font-weight: 700; font-size: 0.9rem;">
                                ${cantidad}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--text, #fff); font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${modelo}</div>
                                <div style="height: 6px; background: #333; border-radius: 3px; margin-top: 6px; overflow: hidden;">
                                    <div style="height: 100%; width: ${(cantidad / modeloList[0][1]) * 100}%; background: #10B981; border-radius: 3px;"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
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
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 700px;">
                    <thead style="background: var(--card-bg, #252547);">
                        <tr>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">Resg.</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">Usuario</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">Marca/Modelo</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">PC</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">Serie</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">Ubicación</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">Estado</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: left; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap;">IP</th>
                            <th style="padding: 0.6rem 0.4rem; text-align: center; font-size: 0.6rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); white-space: nowrap; width: 70px;">✏️</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.slice(0, 50).map(item => `
                            <tr>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; font-size: 0.7rem; white-space: nowrap;">${item.resguardo || '-'}</td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); font-weight: 600; font-size: 0.75rem; white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis;">${item.fullName || '-'}</td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); font-size: 0.7rem; white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis;">${item.brand || '-'} ${item.model || ''}</td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; font-size: 0.7rem; white-space: nowrap;">${item.pcName || '-'}</td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; font-size: 0.7rem; white-space: nowrap;">${item.serialNumber || '-'}</td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); white-space: nowrap;"><span class="badge badge-blue" style="font-size: 0.55rem; padding: 0.15rem 0.3rem;">${item.location || '-'}</span></td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); white-space: nowrap;"><span class="badge ${getStatusBadge(item.status)}" style="font-size: 0.55rem; padding: 0.15rem 0.3rem;">${item.status || '-'}</span></td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; font-size: 0.65rem; color: var(--primary, #FCD34D); white-space: nowrap;">${item.ipAddress || '-'}</td>
                                <td style="padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border-light, #333); text-align: center; width: 70px;">
                                    <button onclick="window.openEditForm('${item.id}')" style="background: none; border: none; cursor: pointer; padding: 0.25rem; color: var(--primary, #3B82F6);" title="Editar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button onclick="deleteItemFromDashboard('${item.id}')" style="background: none; border: none; cursor: pointer; padding: 0.25rem; color: var(--danger, #EF4444);" title="Eliminar">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
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

// Función global para eliminar desde el dashboard
window.deleteItemFromDashboard = function(id) {
    if (confirm('¿Está seguro de eliminar este registro?')) {
        // Buscar y eliminar del inventario
        const inventory = JSON.parse(localStorage.getItem('servyre_inventory') || '{"inventory":[]}').inventory || [];
        const newInventory = inventory.filter(i => i.id !== id);
        localStorage.setItem('servyre_inventory', JSON.stringify({
            version: "2.0",
            lastModified: new Date().toISOString(),
            inventory: newInventory,
            catalogs: JSON.parse(localStorage.getItem('servyre_inventory') || '{}').catalogs || {}
        }));
        
        // Recargar dashboard
        if (window.location) {
            window.location.reload();
        }
    }
};
