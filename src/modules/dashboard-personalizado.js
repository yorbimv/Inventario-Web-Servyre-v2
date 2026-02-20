/**
 * Dashboard Personalizado - Simple y Funcional
 */

export function initDashboardPersonalizado(inventory, containerId = 'dashboardContainer') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Container no encontrado');
        return;
    }

    // Guardar inventario globalmente para ordenamiento
    window.dashboardInventory = inventory;

    // Estado del ordenamiento
    window.redSortState = { field: null, order: 'asc' };

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

    // Calcular alertas
    const alerts = generateAlerts(inventory);
    const hasAlerts = alerts.length > 0;

    // HTML del dashboard
    container.innerHTML = `
        <div class="personalized-dashboard" style="padding: 1.5rem;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; font-size: 1.5rem; color: var(--text);">
                    <i data-lucide="layout-dashboard" style="vertical-align: middle; margin-right: 0.5rem;"></i>
                    Dashboard
                </h2>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button onclick="renderDashboardView('resumen')" class="glass-btn" style="padding: 0.5rem 1rem;">
                        <i data-lucide="home" style="width: 16px;"></i> Resumen
                    </button>
                    <button onclick="renderDashboardView('red')" class="glass-btn" style="padding: 0.5rem 1rem;">
                        <i data-lucide="wifi" style="width: 16px;"></i> Red
                    </button>
                    <button onclick="showAlertsToast()" class="glass-btn bell-btn ${hasAlerts ? 'has-alerts' : ''}" style="padding: 0.5rem 1rem; position: relative;" title="Ver alertas">
                        <i data-lucide="bell" style="width: 16px;"></i>
                        ${hasAlerts ? `<span class="alert-badge" style="position: absolute; top: -4px; right: -4px; background: var(--danger); color: white; font-size: 0.65rem; font-weight: 700; padding: 2px 5px; border-radius: 10px; min-width: 16px; text-align: center;">${alerts.length}</span>` : ''}
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

    // Escuchar actualizaciones del inventario
    window.addEventListener('inventory-updated', () => {
        // Recalcular KPIs con nuevos datos
        const newInventory = window.dashboardInventory || [];
        const newKpis = {
            total: newInventory.length,
            active: newInventory.filter(i => i.status === 'Activo').length,
            maintenance: newInventory.filter(i => i.status === 'Mantenimiento').length,
            warranty: newInventory.filter(i => i.warranty && parseInt(i.warranty) > 0).length,
            baja: newInventory.filter(i => i.status === 'Baja').length,
            piezas: newInventory.filter(i => i.status === 'Para piezas').length,
            conIP: newInventory.filter(i => i.ipAddress).length,
            sinIP: newInventory.length - newInventory.filter(i => i.ipAddress).length,
            dhcp: newInventory.filter(i => i.ipType === 'DHCP' || !i.ipType).length,
            ipFija: newInventory.filter(i => i.ipType === 'IP Fija').length
        };
        
        // Actualizar botones de alertas en el header
        const alerts = generateAlerts(newInventory);
        const hasAlerts = alerts.length > 0;
        
        // Buscar y actualizar el botón de alertas
        const bellBtn = document.querySelector('.bell-btn');
        if (bellBtn) {
            const badge = bellBtn.querySelector('.alert-badge');
            if (hasAlerts) {
                if (badge) {
                    badge.textContent = alerts.length;
                } else {
                    const newBadge = document.createElement('span');
                    newBadge.className = 'alert-badge';
                    newBadge.style.cssText = 'position: absolute; top: -4px; right: -4px; background: var(--danger); color: white; font-size: 0.65rem; font-weight: 700; padding: 2px 5px; border-radius: 10px; min-width: 16px; text-align: center;';
                    newBadge.textContent = alerts.length;
                    bellBtn.appendChild(newBadge);
                }
                bellBtn.classList.add('has-alerts');
            } else {
                if (badge) badge.remove();
                bellBtn.classList.remove('has-alerts');
            }
        }
        
        // Actualizar KPIs en pantalla si existen
        const kpiCards = document.querySelectorAll('.kpi-card-simple');
        if (kpiCards.length >= 6) {
            const values = [newKpis.total, newKpis.active, newKpis.maintenance, newKpis.warranty, newKpis.baja, newKpis.piezas];
            kpiCards.forEach((card, index) => {
                const valueEl = card.querySelector('div > div > div:first-child');
                if (valueEl && values[index] !== undefined) {
                    valueEl.textContent = values[index];
                }
            });
        }
    });

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

// Función global para ordenar la tabla Red
window.sortRedTable = function(field) {
    if (!window.redSortState) {
        window.redSortState = { field: null, order: 'asc' };
    }
    
    // Si se hace click en la misma columna, cambiar el orden
    if (window.redSortState.field === field) {
        window.redSortState.order = window.redSortState.order === 'asc' ? 'desc' : 'asc';
    } else {
        // Si es una columna nueva, ordenar ascendente
        window.redSortState.field = field;
        window.redSortState.order = 'asc';
    }
    
    // Re-renderizar la vista
    const content = document.getElementById('dashboardContent');
    if (content && window.dashboardInventory) {
        content.innerHTML = renderRedView(window.dashboardInventory);
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
};

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
    
    // Ordenar según el estado actual
    const sortState = window.dashboardSortState?.ubicacion || { field: 'total', order: 'desc' };
    let ubicacionList = Object.entries(ubicaciones);
    
    ubicacionList.sort((a, b) => {
        let valA, valB;
        if (sortState.field === 'ubicacion') {
            valA = a[0].toLowerCase();
            valB = b[0].toLowerCase();
        } else {
            valA = a[1][sortState.field];
            valB = b[1][sortState.field];
        }
        
        if (valA < valB) return sortState.order === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.order === 'asc' ? 1 : -1;
        return 0;
    });

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
    let conIP = inventory.filter(i => i.ipAddress);
    
    // Aplicar ordenamiento si existe
    const sortState = window.redSortState || { field: null, order: 'asc' };
    if (sortState.field) {
        conIP = [...conIP].sort((a, b) => {
            let valA, valB;
            
            switch(sortState.field) {
                case 'fullName':
                    valA = (a.fullName || '').toLowerCase();
                    valB = (b.fullName || '').toLowerCase();
                    break;
                case 'device':
                    valA = ((a.deviceType || '') + ' ' + (a.brand || '')).toLowerCase();
                    valB = ((b.deviceType || '') + ' ' + (b.brand || '')).toLowerCase();
                    break;
                case 'email':
                    valA = (a.email || '').toLowerCase();
                    valB = (b.email || '').toLowerCase();
                    break;
                case 'ip':
                    // Ordenar IPs numéricamente
                    valA = (a.ipAddress || '').split('.').map(Number);
                    valB = (b.ipAddress || '').split('.').map(Number);
                    for (let i = 0; i < 4; i++) {
                        if (valA[i] !== valB[i]) {
                            return sortState.order === 'asc' ? valA[i] - valB[i] : valB[i] - valA[i];
                        }
                    }
                    return 0;
                case 'type':
                    valA = (a.ipType || 'DHCP').toLowerCase();
                    valB = (b.ipType || 'DHCP').toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            if (sortState.field !== 'ip') {
                if (valA < valB) return sortState.order === 'asc' ? -1 : 1;
                if (valA > valB) return sortState.order === 'asc' ? 1 : -1;
                return 0;
            }
            return 0;
        });
    }
    
    // Función para obtener el indicador de ordenamiento
    const getSortIndicator = (field) => {
        if (sortState.field !== field) return '<span style="color: var(--text-dim); opacity: 0.3;">↕</span>';
        return sortState.order === 'asc' ? '<span style="color: #10B981;">▲</span>' : '<span style="color: #F59E0B;">▼</span>';
    };
    
    return `
        <div style="background: var(--surface, #1e1e3f); border: 1px solid var(--border, #333); border-radius: 12px; overflow: hidden;">
            <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border, #333);">
                <h3 style="margin: 0; font-size: 1rem; color: var(--text-dim, #888); display: flex; align-items: center; gap: 0.5rem;">
                    <i data-lucide="wifi" style="width: 18px; height: 18px; color: var(--primary, #FCD34D);"></i>
                    Equipos con IP Asignada (${conIP.length})
                </h3>
            </div>
            <div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: var(--card-bg, #252547); position: sticky; top: 0;">
                        <tr>
                            <th onclick="sortRedTable('fullName')" style="padding: 0.875rem 1rem; text-align: center; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); cursor: pointer; user-select: none;">Usuario ${getSortIndicator('fullName')}</th>
                            <th onclick="sortRedTable('device')" style="padding: 0.875rem 1rem; text-align: center; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); cursor: pointer; user-select: none;">Equipo ${getSortIndicator('device')}</th>
                            <th onclick="sortRedTable('email')" style="padding: 0.875rem 1rem; text-align: center; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); cursor: pointer; user-select: none;">Correo ${getSortIndicator('email')}</th>
                            <th onclick="sortRedTable('ip')" style="padding: 0.875rem 1rem; text-align: center; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); cursor: pointer; user-select: none;">IP ${getSortIndicator('ip')}</th>
                            <th onclick="sortRedTable('type')" style="padding: 0.875rem 1rem; text-align: center; font-size: 0.7rem; text-transform: uppercase; color: var(--text-dim, #888); border-bottom: 1px solid var(--border, #333); cursor: pointer; user-select: none;">Tipo ${getSortIndicator('type')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conIP.map(item => `
                            <tr>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-weight: 600; text-align: center;">${item.fullName || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); text-align: center;">${item.deviceType || '-'} ${item.brand || ''}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-size: 0.85rem; text-align: center;">${item.email || '-'}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); font-family: monospace; color: var(--primary, #FCD34D); font-weight: 600; text-align: center;">${item.ipAddress}</td>
                                <td style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-light, #333); text-align: center;">
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

// ============================================
// FUNCIONES DE ALERTAS
// ============================================

function generateAlerts(inventory) {
    const alerts = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Verificar garantías por vencer
    inventory.forEach(item => {
        if (item.warrantyEndDate) {
            const warrantyEnd = new Date(item.warrantyEndDate);
            if (warrantyEnd >= today && warrantyEnd <= thirtyDaysFromNow) {
                const daysLeft = Math.ceil((warrantyEnd - today) / (1000 * 60 * 60 * 24));
                alerts.push({
                    type: 'warning',
                    icon: 'shield-alert',
                    title: 'Garantía por Vencer',
                    description: `${item.serialNumber || item.deviceType} vence en ${daysLeft} días`,
                    key: `warranty-${item.id}`
                });
            }
        }
    });
    
    // Verificar mantenimiento próximo
    inventory.forEach(item => {
        if (item.nextMtto) {
            const nextMtto = new Date(item.nextMtto);
            if (nextMtto >= today && nextMtto <= thirtyDaysFromNow) {
                const daysLeft = Math.ceil((nextMtto - today) / (1000 * 60 * 60 * 24));
                alerts.push({
                    type: 'info',
                    icon: 'calendar',
                    title: 'Mantenimiento Próximo',
                    description: `${item.serialNumber || item.deviceType} en ${daysLeft} días`,
                    key: `mtto-${item.id}`
                });
            }
        }
    });
    
    // Equipos sin IP asignada
    const sinIP = inventory.filter(i => !i.ipAddress && i.status === 'Activo');
    if (sinIP.length > 0) {
        alerts.push({
            type: 'warning',
            icon: 'wifi-off',
            title: 'Equipos sin IP',
            description: `${sinIP.length} equipos activos sin dirección IP asignada`,
            key: 'sin-ip'
        });
    }
    
    // Equipos de baja
    const bajas = inventory.filter(i => i.status === 'Baja');
    if (bajas.length > 0) {
        alerts.push({
            type: 'danger',
            icon: 'x-circle',
            title: 'Equipos de Baja',
            description: `${bajas.length} equipos dados de baja`,
            key: 'bajas'
        });
    }
    
    return alerts;
}

// Función global para mostrar el toast de alertas
window.showAlertsToast = function() {
    const inventory = window.dashboardInventory || [];
    const alerts = generateAlerts(inventory);
    
    const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
    const activeAlerts = alerts.filter(alert => !dismissed[alert.title]);
    
    // Cerrar toast anterior si existe
    const existingToast = document.getElementById('alertsToastPersonalizado');
    if (existingToast) {
        existingToast.remove();
    }
    
    if (activeAlerts.length === 0) {
        alert('No hay alertas pendientes');
        return;
    }
    
    const dismissAlert = (title) => {
        const dismissed = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
        dismissed[title] = true;
        localStorage.setItem('dismissedAlerts', JSON.stringify(dismissed));
        
        const alertItem = document.querySelector(`[data-alert-title="${title}"]`);
        if (alertItem) {
            alertItem.remove();
        }
        
        const remainingAlerts = document.querySelectorAll('#alertsToastPersonalizado [data-alert-title]');
        const countSpan = document.querySelector('#alertsToastPersonalizado .alert-count');
        if (countSpan) {
            countSpan.textContent = remainingAlerts.length;
        }
        
        const bellBtn = document.querySelector('.bell-btn');
        const badge = bellBtn?.querySelector('.alert-badge');
        if (badge) {
            badge.textContent = remainingAlerts.length;
            if (remainingAlerts.length === 0) {
                badge.remove();
                bellBtn?.classList.remove('has-alerts');
            }
        }
        
        if (remainingAlerts.length === 0) {
            document.getElementById('alertsToastPersonalizado')?.remove();
        }
    };
    
    window.dismissAlert = dismissAlert;
    
    const toast = document.createElement('div');
    toast.id = 'alertsToastPersonalizado';
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 380px;
        max-height: 70vh;
        background: var(--surface-opaque, #1e1e2e);
        border: 1px solid var(--border, rgba(255,255,255,0.1));
        border-radius: 16px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        z-index: 9999;
        overflow: hidden;
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--card-bg);">
            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: var(--text);">
                <i data-lucide="bell" style="color: var(--primary);"></i>
                <span>Alertas (<span class="alert-count">${activeAlerts.length}</span>)</span>
            </div>
            <button onclick="this.closest('#alertsToastPersonalizado').remove()" style="background: none; border: none; color: var(--text-dim); cursor: pointer; padding: 0.25rem;">
                <i data-lucide="x"></i>
            </button>
        </div>
        <div style="max-height: calc(70vh - 60px); overflow-y: auto; padding: 0.5rem;">
            ${activeAlerts.map(alert => `
                <div data-alert-title="${alert.title}" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 0.25rem; background: ${alert.type === 'danger' ? 'rgba(239,68,68,0.1)' : alert.type === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)'};">
                    <i data-lucide="${alert.icon}" style="color: ${alert.type === 'danger' ? '#EF4444' : alert.type === 'warning' ? '#F59E0B' : '#3B82F6'}; flex-shrink: 0; margin-top: 2px;"></i>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: var(--text); margin-bottom: 0.25rem;">${alert.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim);">${alert.description}</div>
                    </div>
                    <button onclick="dismissAlert('${alert.title}')" title="Descartar alerta" style="background: none; border: none; color: var(--text-dim); cursor: pointer; padding: 0.25rem; opacity: 0.6; transition: opacity 0.2s;">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `).join('')}
        </div>
        <div style="padding: 0.75rem 1rem; border-top: 1px solid var(--border); text-align: center;">
            <button onclick="localStorage.removeItem('dismissedAlerts'); window.showAlertsToast();" style="background: none; border: none; color: var(--text-dim); font-size: 0.75rem; cursor: pointer; text-decoration: underline;">
                Restablecer alertas
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function closeAlert(e) {
            if (!toast.contains(e.target) && !e.target.closest('.bell-btn')) {
                toast.remove();
                document.removeEventListener('click', closeAlert);
            }
        });
    }, 100);
};

// Agregar estilos de animación si no existen
if (!document.getElementById('alerts-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'alerts-toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}
