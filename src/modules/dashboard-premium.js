import Chart from 'chart.js/auto';
import { GridStack } from 'gridstack';

/**
 * Dashboard Premium - Sistema de widgets arrastrables con GridStack
 */

class DashboardManager {
  constructor(inventory, containerId = 'dashboardContainer') {
    this.inventory = inventory;
    this.container = document.getElementById(containerId);
    this.widgets = [];
    this.charts = {};
    this.grid = null;
    this.eventSource = null;
    this.layoutKey = 'dashboard-layout-v1';
    
    if (this.container) {
      this.init();
    }
  }

  init() {
    this.loadLayout();
    this.render();
    this.initDragAndDrop();
    this.initRealtimeSync();
    this.initEventListeners();
  }

  /**
   * Renderiza el dashboard completo
   */
  render() {
    const kpiData = this.calculateKPIData();
    
    const alerts = this.generateAlerts();
    
    this.container.innerHTML = `
      <div class="dashboard-container">
        ${this.renderToolbar(alerts)}
        ${this.renderGlobalFilters()}
        <div class="grid-stack" id="widgetsGrid">
          ${this.renderKPIWidgets(kpiData)}
          ${this.renderChartWidgets()}
          ${this.renderTableWidget()}
        </div>
      </div>
    `;

    this.initCharts();
    this.animateWidgets();
    this.initGridStack();
    
    // Renderizar iconos de Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Toolbar superior
   */
  renderToolbar(alerts = []) {
    const alertCount = alerts.length;
    const hasAlerts = alertCount > 0;
    
    return `
      <div class="dashboard-toolbar">
        <div class="toolbar-title">
          <i data-lucide="layout-dashboard"></i>
          Dashboard IT
        </div>
        <div class="toolbar-actions">
          <button class="glass-btn bell-btn ${hasAlerts ? 'has-alerts' : ''}" onclick="dashboard.showAlertsToast()" title="Ver alertas">
            <i data-lucide="bell"></i>
            ${hasAlerts ? `<span class="alert-badge">${alertCount}</span>` : ''}
          </button>
          <button class="glass-btn refresh-btn" onclick="dashboard.refresh()" title="Actualizar">
            <i data-lucide="refresh-cw"></i>
          </button>
          <button class="premium-btn primary" onclick="dashboard.exportDashboard()">
            <i data-lucide="download"></i>
            Exportar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Filtros globales sticky
   */
  renderGlobalFilters() {
    const locations = [...new Set(this.inventory.map(i => i.location).filter(Boolean))];
    const departments = [...new Set(this.inventory.map(i => i.department).filter(Boolean))];
    const brands = [...new Set(this.inventory.map(i => i.brand).filter(Boolean))];
    
    return `
      <div class="global-filters">
        <div class="filter-chip" data-filter="location">
          <i data-lucide="map-pin"></i>
          <span>Ubicación</span>
          <select class="filter-select" onchange="dashboard.applyFilter('location', this.value)">
            <option value="">Todas</option>
            ${locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          </select>
        </div>
        <div class="filter-chip" data-filter="department">
          <i data-lucide="building"></i>
          <span>Departamento</span>
          <select class="filter-select" onchange="dashboard.applyFilter('department', this.value)">
            <option value="">Todos</option>
            ${departments.map(dept => `<option value="${dept}">${dept}</option>`).join('')}
          </select>
        </div>
        <div class="filter-chip" data-filter="brand">
          <i data-lucide="tag"></i>
          <span>Marca</span>
          <select class="filter-select" onchange="dashboard.applyFilter('brand', this.value)">
            <option value="">Todas</option>
            ${brands.map(brand => `<option value="${brand}">${brand}</option>`).join('')}
          </select>
        </div>
        <div class="filter-chip" data-filter="status">
          <i data-lucide="activity"></i>
          <span>Estado</span>
          <select class="filter-select" onchange="dashboard.applyFilter('status', this.value)">
            <option value="">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Baja">Baja</option>
            <option value="Para piezas">Para piezas</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Muestra las alertas como toast
   */
  showAlertsToast() {
    const alerts = this.generateAlerts();
    if (alerts.length === 0) {
      return;
    }
    
    let toast = document.getElementById('alertsToast');
    if (toast) {
      toast.remove();
    }
    
    toast = document.createElement('div');
    toast.id = 'alertsToast';
    toast.className = 'alerts-toast';
    toast.innerHTML = `
      <div class="alerts-toast-header">
        <i data-lucide="bell"></i>
        <span>Alertas (${alerts.length})</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="alerts-toast-body">
        ${alerts.map(alert => `
          <div class="alert-item ${alert.type}">
            <i data-lucide="${alert.icon}"></i>
            <div>
              <strong>${alert.title}</strong>
              <p>${alert.description}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.body.appendChild(toast);
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Widgets de KPI
   */
  renderKPIWidgets(kpiData) {
    const kpis = [
      {
        id: 'kpi-total',
        icon: 'package',
        value: kpiData.total,
        label: 'Total Equipos',
        trend: { value: 12, direction: 'up' },
        color: 'primary'
      },
      {
        id: 'kpi-active',
        icon: 'check-circle',
        value: kpiData.active,
        label: 'Activos',
        trend: { value: 8, direction: 'up' },
        color: 'success'
      },
      {
        id: 'kpi-value',
        icon: 'dollar-sign',
        value: this.formatCurrency(kpiData.totalValue),
        label: 'Valor Total',
        trend: { value: 5, direction: 'up' },
        color: 'warning'
      },
      {
        id: 'kpi-maintenance',
        icon: 'wrench',
        value: kpiData.maintenance,
        label: 'En Mantenimiento',
        trend: { value: 2, direction: 'down' },
        color: 'warning'
      },
      {
        id: 'kpi-warranty',
        icon: 'shield-alert',
        value: kpiData.warrantyExpiring,
        label: 'Garantía por Vencer',
        trend: { value: 3, direction: 'up' },
        color: 'danger'
      },
      {
        id: 'kpi-bajas',
        icon: 'x-circle',
        value: kpiData.bajas,
        label: 'Bajas',
        trend: null,
        color: 'danger'
      }
    ];

    const positions = [
      { x: 0, y: 0, w: 1, h: 2 },
      { x: 1, y: 0, w: 1, h: 2 },
      { x: 2, y: 0, w: 1, h: 2 },
      { x: 3, y: 0, w: 1, h: 2 },
      { x: 0, y: 2, w: 1, h: 2 },
      { x: 1, y: 2, w: 1, h: 2 },
    ];

    return kpis.map((kpi, index) => {
      const pos = positions[index] || { x: 0, y: 0, w: 1, h: 2 };
      return `
        <div class="grid-stack-item" gs-id="${kpi.id}" gs-x="${pos.x}" gs-y="${pos.y}" gs-w="${pos.w}" gs-h="${pos.h}">
          <div class="grid-stack-item-content dashboard-widget kpi-widget widget-animate">
            <div class="kpi-header">
              <div class="kpi-icon-wrapper" style="color: var(--${kpi.color})">
                <i data-lucide="${kpi.icon}"></i>
              </div>
              ${kpi.trend ? `
                <div class="kpi-trend ${kpi.trend.direction}">
                  <i data-lucide="trending-${kpi.trend.direction}"></i>
                  ${kpi.trend.value}%
                </div>
              ` : ''}
            </div>
            <div class="kpi-value">${kpi.value}</div>
            <div class="kpi-label">${kpi.label}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Widgets de gráficos
   */
  renderChartWidgets() {
    return `
      <div class="grid-stack-item" gs-id="chart-status" gs-x="0" gs-y="4" gs-w="2" gs-h="4">
        <div class="grid-stack-item-content dashboard-widget chart-widget widget-animate">
          <div class="chart-header">
            <div class="chart-title">Distribución por Estado</div>
          </div>
          <div class="chart-container">
            <canvas id="statusChart"></canvas>
          </div>
        </div>
      </div>
      <div class="grid-stack-item" gs-id="chart-brands" gs-x="2" gs-y="4" gs-w="2" gs-h="4">
        <div class="grid-stack-item-content dashboard-widget chart-widget widget-animate">
          <div class="chart-header">
            <div class="chart-title">Marcas</div>
          </div>
          <div class="chart-container">
            <canvas id="brandsChart"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Widget de tabla
   */
  renderTableWidget() {
    const recentItems = this.inventory.slice(0, 10);
    
    return `
      <div class="grid-stack-item" gs-id="table-recent" gs-x="0" gs-y="8" gs-w="4" gs-h="4">
        <div class="grid-stack-item-content dashboard-widget widget-animate">
          <div class="table-header">
            <div class="chart-title">Equipos Recientes</div>
            <button class="glass-btn" onclick="dashboard.viewAll()">
              Ver todos
              <i data-lucide="arrow-right"></i>
            </button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Resguardo</th>
                  <th>Equipo</th>
                  <th>Usuario</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                ${recentItems.map(item => `
                  <tr onclick="dashboard.viewDetail('${item.id}')" style="cursor: pointer;">
                    <td><code>${item.resguardo || '-'}</code></td>
                    <td>${item.deviceType} ${item.brand}</td>
                    <td>${item.fullName}</td>
                    <td>${item.location}</td>
                    <td>
                      <span class="badge badge-${this.getStatusColor(item.status)}">
                        ${(item.status || '-').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Panel de alertas
   */
  renderAlertsPanel() {
    const alerts = this.generateAlerts();
    
    return `
      <div class="alerts-panel">
        <div class="alerts-header">
          <div class="alerts-title">
            <i data-lucide="bell"></i>
            Alertas (${alerts.length})
          </div>
        </div>
        ${alerts.map(alert => `
          <div class="alert-item">
            <div class="alert-icon ${alert.type}">
              <i data-lucide="${alert.icon}"></i>
            </div>
            <div class="alert-content">
              <div class="alert-title">${alert.title}</div>
              <div class="alert-desc">${alert.description}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Indicador de actualización
   */
  renderUpdateIndicator() {
    return `
      <div class="update-indicator" id="updateIndicator">
        <span class="dot"></span>
        <span>Datos actualizados</span>
      </div>
    `;
  }

  /**
   * Calcula datos de KPI
   */
  calculateKPIData() {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: this.inventory.length,
      active: this.inventory.filter(i => i.status === 'Activo').length,
      maintenance: this.inventory.filter(i => i.status === 'Mantenimiento').length,
      bajas: this.inventory.filter(i => i.status === 'Baja').length,
      totalValue: this.inventory.reduce((sum, i) => sum + (parseFloat(i.price?.replace(/[^0-9.-]+/g, '')) || 0), 0),
      warrantyExpiring: this.inventory.filter(i => {
        if (!i.warrantyEndDate) return false;
        const end = new Date(i.warrantyEndDate);
        return end <= thirtyDays && end >= now;
      }).length
    };
  }

  /**
   * Genera alertas basadas en datos
   */
  generateAlerts() {
    const alerts = [];
    const now = new Date();
    
    // Garantías por vencer
    const warrantyExpiring = this.inventory.filter(i => {
      if (!i.warrantyEndDate) return false;
      const end = new Date(i.warrantyEndDate);
      const diff = (end - now) / (1000 * 60 * 60 * 24);
      return diff <= 30 && diff > 0;
    });
    
    if (warrantyExpiring.length > 0) {
      alerts.push({
        type: 'warning',
        icon: 'shield-alert',
        title: 'Garantías por vencer',
        description: `${warrantyExpiring.length} equipos en los próximos 30 días`
      });
    }
    
    // Mantenimientos vencidos
    const overdueMtto = this.inventory.filter(i => {
      if (!i.nextMtto) return false;
      return new Date(i.nextMtto) < now;
    });
    
    if (overdueMtto.length > 0) {
      alerts.push({
        type: 'danger',
        icon: 'alert-triangle',
        title: 'Mantenimientos vencidos',
        description: `${overdueMtto.length} equipos requieren atención`
      });
    }
    
    // Equipos en mantenimiento
    const inMaintenance = this.inventory.filter(i => i.status === 'Mantenimiento');
    if (inMaintenance.length > 0) {
      alerts.push({
        type: 'info',
        icon: 'wrench',
        title: 'En mantenimiento',
        description: `${inMaintenance.length} equipos en servicio`
      });
    }
    
    return alerts;
  }

  /**
   * Inicializa gráficos
   */
  initCharts() {
    // Gráfico de estados
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
      const statusData = this.getStatusDistribution();
      this.charts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusData),
          datasets: [{
            data: Object.values(statusData),
            backgroundColor: [
              '#10B981', // Activo
              '#F59E0B', // Mantenimiento
              '#EF4444', // Baja
              '#71717A', // Cancelado
              '#FF9500'  // Para piezas
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: '#A1A1AA',
                padding: 20,
                usePointStyle: true
              }
            }
          },
          cutout: '65%'
        }
      });
    }
    
    // Gráfico de marcas
    const brandsCtx = document.getElementById('brandsChart');
    if (brandsCtx) {
      const brandsData = this.getTopBrands(5);
      this.charts.brands = new Chart(brandsCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(brandsData),
          datasets: [{
            label: 'Equipos',
            data: Object.values(brandsData),
            backgroundColor: 'rgba(252, 211, 77, 0.8)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#71717A' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#71717A' }
            }
          }
        }
      });
    }
  }

  /**
   * Distribución por estado
   */
  getStatusDistribution() {
    const distribution = {};
    this.inventory.forEach(item => {
      distribution[item.status] = (distribution[item.status] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Top marcas
   */
  getTopBrands(limit = 5) {
    const brands = {};
    this.inventory.forEach(item => {
      brands[item.brand] = (brands[item.brand] || 0) + 1;
    });
    return Object.fromEntries(
      Object.entries(brands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
    );
  }

  /**
   * Inicializa drag & drop con redimensión por zona
   */
  initGridStack() {
    const gridEl = document.getElementById('widgetsGrid');
    if (!gridEl) return;

    // Inicializar GridStack
    this.grid = GridStack.init({
      column: 4,
      cellHeight: 80,
      margin: 10,
      animate: true,
      float: true,
      resizable: {
        handles: 'se,sw,ne,nw,n,e,s,w'
      },
      draggable: {
        handle: '.grid-stack-item-content'
      }
    }, gridEl);

    // Evento cuando cambia el layout
    this.grid.on('change', (event, items) => {
      this.saveLayout();
    });
  }

  /**
   * Guarda layout en localStorage
   */
  saveLayout() {
    if (!this.grid) return;
    
    const layout = this.grid.save(false);
    localStorage.setItem(this.layoutKey, JSON.stringify(layout));
  }

  /**
   * Carga layout desde localStorage
   */
  loadLayout() {
    const saved = localStorage.getItem(this.layoutKey);
    if (saved && this.grid) {
      const layout = JSON.parse(saved);
      this.grid.load(layout);
    }
  }

  /**
   * Restaura layout por defecto
   */
  resetLayout() {
    localStorage.removeItem(this.layoutKey);
    this.render();
  }

  /**
   * Cambia el tamaño de un widget
   */
  changeWidgetSize(widgetId, span) {
    const widget = this.grid?.getWidgetById(widgetId);
    if (widget) {
      widget.w(span);
      this.grid?.compact();
      this.saveLayout();
    }
  }

  /**
   * Inicializa sincronización en tiempo real
   */
  initRealtimeSync() {
    // Escuchar cambios en localStorage (de otras pestañas)
    window.addEventListener('storage', (e) => {
      if (e.key === 'inventory-data') {
        this.showUpdateIndicator();
        setTimeout(() => this.refresh(), 1000);
      }
    });
    
    // Polling cada 30 segundos para cambios externos
    setInterval(() => {
      this.checkForUpdates();
    }, 30000);
  }

  /**
   * Verifica actualizaciones
   */
  checkForUpdates() {
    // Aquí iría la lógica para verificar cambios en el servidor
    // Por ahora, simulamos con localStorage
    const lastUpdate = localStorage.getItem('inventory-last-update');
    if (lastUpdate && lastUpdate !== this.lastUpdate) {
      this.showUpdateIndicator();
    }
  }

  /**
   * Muestra indicador de actualización
   */
  showUpdateIndicator() {
    const indicator = document.getElementById('updateIndicator');
    if (indicator) {
      indicator.classList.add('visible');
      setTimeout(() => {
        indicator.classList.remove('visible');
      }, 3000);
    }
  }

  /**
   * Refresca el dashboard
   */
  refresh() {
    // Destruir instancia anterior de Sortable para evitar duplicados
    if (this.sortable) {
      this.sortable.destroy();
      this.sortable = null;
    }
    this.render();
    this.initDragAndDrop();
  }

  /**
   * Aplica filtros
   */
  applyFilter(type, value) {
    console.log(`Filtrar por ${type}: ${value}`);
    // Aquí iría la lógica de filtrado
    // Por ahora solo actualizamos UI
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.remove('active');
    });
    event.target.closest('.filter-chip').classList.add('active');
  }

  /**
   * Muestra modal de exportación
   */
  showExportModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay glass-blur';
    modal.id = 'exportModal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header" style="border-bottom: 1px solid var(--border); padding: 1.5rem;">
          <h2 style="font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="file-text"></i>
            Exportar Reporte Ejecutivo
          </h2>
          <button class="close-btn" onclick="document.getElementById('exportModal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-dim);">&times;</button>
        </div>
        
        <div class="modal-body-premium" style="padding: 1.5rem;">
          <!-- Formato del documento -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">📐 Formato del Documento</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; cursor: pointer; border: 2px solid var(--border);" class="format-option" data-format="a4-landscape">
                <input type="radio" name="pdfFormat" value="a4-landscape" checked style="accent-color: var(--primary);">
                <div>
                  <div style="font-weight: 600;">A4 Horizontal</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">297 × 210 mm</div>
                </div>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; cursor: pointer; border: 2px solid var(--border);" class="format-option" data-format="a4-portrait">
                <input type="radio" name="pdfFormat" value="a4-portrait" style="accent-color: var(--primary);">
                <div>
                  <div style="font-weight: 600;">A4 Vertical</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">210 × 297 mm</div>
                </div>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; cursor: pointer; border: 2px solid var(--border);" class="format-option" data-format="oficio">
                <input type="radio" name="pdfFormat" value="oficio" style="accent-color: var(--primary);">
                <div>
                  <div style="font-weight: 600;">Oficio</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">216 × 330 mm</div>
                </div>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; cursor: pointer; border: 2px solid var(--border);" class="format-option" data-format="doble-carta">
                <input type="radio" name="pdfFormat" value="doble-carta" style="accent-color: var(--primary);">
                <div>
                  <div style="font-weight: 600;">Doble Carta</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">432 × 279 mm</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Estilo visual -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">🎨 Estilo Visual</h3>
            <select id="pdfStyle" style="width: 100%; padding: 0.75rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text);">
              <option value="executive">Ejecutivo Corporativo (Azul + Dorado)</option>
              <option value="classic">Clásico Elegante (Blanco y Negro)</option>
              <option value="modern">Moderno Profesional (Oscuro)</option>
            </select>
          </div>

          <!-- Secciones a incluir -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">📊 Secciones a Incluir</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includeKPIs" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Resumen Ejecutivo (KPIs)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includeCharts" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Gráficos Estadísticos</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includeTables" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Tablas de Detalle</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includeAlerts" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Alertas y Notificaciones</span>
              </label>
            </div>
          </div>

          <!-- Campos de equipos -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">📋 Campos de Equipos</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; max-height: 120px; overflow-y: auto; padding: 0.75rem; background: var(--card-bg); border-radius: 8px;">
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="resguardo" checked style="accent-color: var(--primary);">
                <span>Resguardo</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="fullName" checked style="accent-color: var(--primary);">
                <span>Usuario</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="deviceType" checked style="accent-color: var(--primary);">
                <span>Equipo</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="brand" checked style="accent-color: var(--primary);">
                <span>Marca</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="model" style="accent-color: var(--primary);">
                <span>Modelo</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="serialNumber" style="accent-color: var(--primary);">
                <span>Serie</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="location" checked style="accent-color: var(--primary);">
                <span>Ubicación</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="department" style="accent-color: var(--primary);">
                <span>Departamento</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="status" checked style="accent-color: var(--primary);">
                <span>Estado</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="purchaseDate" style="accent-color: var(--primary);">
                <span>Fecha Compra</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="price" style="accent-color: var(--primary);">
                <span>Precio</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem;">
                <input type="checkbox" class="field-checkbox" value="warrantyEndDate" style="accent-color: var(--primary);">
                <span>Fin Garantía</span>
              </label>
            </div>
          </div>

          <!-- Opciones adicionales -->
          <div style="margin-bottom: 1.5rem;">
            <h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);">⚙️ Opciones Adicionales</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includeLogo" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Incluir logo de la empresa</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includeDate" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Incluir fecha de generación</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="includePageNumbers" checked style="accent-color: var(--primary); width: 18px; height: 18px;">
                <span>Incluir numeración de páginas</span>
              </label>
            </div>
          </div>

          <!-- Vista previa -->
          <div style="background: var(--card-bg); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
            <h3 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: var(--text-muted);">👁️ Vista Previa</h3>
            <div style="display: flex; gap: 1rem; align-items: center;">
              <div style="width: 60px; height: 80px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.6rem; text-align: center;">
                PDF
              </div>
              <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">Reporte Ejecutivo</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                  <span id="previewFormat">A4 Horizontal</span> • 
                  <span id="previewStyle">Ejecutivo</span> • 
                  <span id="previewPages">~3 páginas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer-premium" style="padding: 1.5rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 1rem;">
          <button type="button" class="glass-btn" onclick="document.getElementById('exportModal').remove()">
            Cancelar
          </button>
          <button type="button" class="premium-btn primary" id="generatePDFBtn" style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="file-down"></i>
            Generar PDF
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Renderizar iconos
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Event listeners
    document.getElementById('generatePDFBtn').addEventListener('click', () => {
      this.generatePDF();
    });
    
    // Actualizar vista previa al cambiar opciones
    modal.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('change', () => this.updatePreview());
    });
  }

  /**
   * Actualiza la vista previa
   */
  updatePreview() {
    const format = document.querySelector('input[name="pdfFormat"]:checked')?.value || 'a4-landscape';
    const style = document.getElementById('pdfStyle')?.value || 'executive';
    
    const formatLabels = {
      'a4-landscape': 'A4 Horizontal',
      'a4-portrait': 'A4 Vertical',
      'oficio': 'Oficio',
      'doble-carta': 'Doble Carta'
    };
    
    const styleLabels = {
      'executive': 'Ejecutivo',
      'classic': 'Clásico',
      'modern': 'Moderno'
    };
    
    const previewFormat = document.getElementById('previewFormat');
    const previewStyle = document.getElementById('previewStyle');
    
    if (previewFormat) previewFormat.textContent = formatLabels[format];
    if (previewStyle) previewStyle.textContent = styleLabels[style];
  }

  /**
   * Genera el PDF
   */
  async generatePDF() {
    const generateBtn = document.getElementById('generatePDFBtn');
    generateBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Generando...';
    generateBtn.disabled = true;
    
    try {
      // Recopilar opciones
      const formatValue = document.querySelector('input[name="pdfFormat"]:checked')?.value || 'a4-landscape';
      const [format, orientation] = formatValue.split('-');
      
      const selectedFields = Array.from(document.querySelectorAll('.field-checkbox:checked')).map(cb => cb.value);
      
      const options = {
        format: format,
        orientation: orientation,
        style: document.getElementById('pdfStyle')?.value || 'executive',
        sections: {
          kpis: document.getElementById('includeKPIs')?.checked ?? true,
          charts: document.getElementById('includeCharts')?.checked ?? true,
          tables: document.getElementById('includeTables')?.checked ?? true,
          alerts: document.getElementById('includeAlerts')?.checked ?? true
        },
        selectedFields: selectedFields,
        includeLogo: document.getElementById('includeLogo')?.checked ?? true,
        includeDate: document.getElementById('includeDate')?.checked ?? true,
        includeFooter: true,
        pageNumbers: document.getElementById('includePageNumbers')?.checked ?? true
      };
      
      // Importar y usar el generador
      const { PDFExecutiveGenerator } = await import('./pdf-executive-generator.js');
      const generator = new PDFExecutiveGenerator(this.inventory, options);
      await generator.generate();
      generator.save();
      
      // Cerrar modal
      document.getElementById('exportModal')?.remove();
      
      // Mostrar notificación
      this.showNotification('PDF generado correctamente', 'success');
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      this.showNotification('Error al generar PDF: ' + error.message, 'error');
      generateBtn.innerHTML = '<i data-lucide="file-down"></i> Generar PDF';
      generateBtn.disabled = false;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  /**
   * Muestra notificación
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
      color: white;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      backdrop-filter: blur(10px);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Exporta dashboard (alias para compatibilidad)
   */
  exportDashboard() {
    this.showExportModal();
  }

  /**
   * Ver detalle
   */
  viewDetail(id) {
    // Aquí iría la lógica para ver detalle
    console.log('Ver detalle:', id);
  }

  /**
   * Ver todos
   */
  viewAll() {
    // Cambiar a vista de inventario
    console.log('Ver todos los equipos');
  }

  /**
   * Anima widgets al cargar
   */
  animateWidgets() {
    // La animación se maneja por CSS con animation-delay
  }

  /**
   * Inicializa event listeners
   */
  initEventListeners() {
    // Escuchar eventos personalizados de actualización
    window.addEventListener('inventory-updated', () => {
      this.refresh();
    });
  }

  /**
   * Helpers
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
  }

  getStatusColor(status) {
    const colors = {
      'Activo': 'green',
      'Mantenimiento': 'orange',
      'Baja': 'danger',
      'Cancelado': 'gray',
      'Para piezas': 'orange'
    };
    return colors[status] || 'gray';
  }
}

// Exportar para uso global
window.DashboardManager = DashboardManager;

/**
 * Función de inicialización
 */
export function initPremiumDashboard(inventory, containerId = 'dashboardContainer') {
  window.dashboard = new DashboardManager(inventory, containerId);
  return window.dashboard;
}
