import Chart from 'chart.js/auto';
import Sortable from 'sortablejs';

/**
 * Dashboard Premium - Sistema de widgets arrastrables con sincronización en tiempo real
 */

class DashboardManager {
  constructor(inventory, containerId = 'dashboardContainer') {
    this.inventory = inventory;
    this.container = document.getElementById(containerId);
    this.widgets = [];
    this.charts = {};
    this.sortable = null;
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
    
    this.container.innerHTML = `
      <div class="dashboard-container">
        ${this.renderToolbar()}
        ${this.renderGlobalFilters()}
        <div class="widgets-grid" id="widgetsGrid">
          ${this.renderKPIWidgets(kpiData)}
          ${this.renderChartWidgets()}
          ${this.renderTableWidget()}
        </div>
        ${this.renderAlertsPanel()}
        ${this.renderUpdateIndicator()}
      </div>
    `;

    this.initCharts();
    this.animateWidgets();
  }

  /**
   * Toolbar superior
   */
  renderToolbar() {
    return `
      <div class="dashboard-toolbar">
        <div class="toolbar-title">
          <i data-lucide="layout-dashboard"></i>
          Dashboard IT
        </div>
        <div class="toolbar-actions">
          <button class="glass-btn" onclick="dashboard.resetLayout()" title="Restaurar layout">
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
        icon: 'tool',
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

    return kpis.map((kpi, index) => `
      <div class="widget-container" data-widget-id="${kpi.id}">
        <div class="dashboard-widget kpi-widget widget-animate" style="animation-delay: ${index * 0.08}s">
          <div class="drag-handle">
            <i data-lucide="grip-vertical"></i>
          </div>
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
    `).join('');
  }

  /**
   * Widgets de gráficos
   */
  renderChartWidgets() {
    return `
      <div class="widget-container" data-widget-id="chart-status" style="grid-column: span 2;">
        <div class="dashboard-widget chart-widget widget-animate" style="animation-delay: 0.48s">
          <div class="drag-handle">
            <i data-lucide="grip-vertical"></i>
          </div>
          <div class="chart-header">
            <div class="chart-title">Distribución por Estado</div>
          </div>
          <div class="chart-container">
            <canvas id="statusChart"></canvas>
          </div>
        </div>
      </div>
      <div class="widget-container" data-widget-id="chart-brands">
        <div class="dashboard-widget chart-widget widget-animate" style="animation-delay: 0.56s">
          <div class="drag-handle">
            <i data-lucide="grip-vertical"></i>
          </div>
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
      <div class="widget-container table-widget" data-widget-id="table-recent">
        <div class="dashboard-widget widget-animate" style="animation-delay: 0.64s">
          <div class="drag-handle">
            <i data-lucide="grip-vertical"></i>
          </div>
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
                        ${item.status}
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
        icon: 'tool',
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
   * Inicializa drag & drop
   */
  initDragAndDrop() {
    const grid = document.getElementById('widgetsGrid');
    if (grid) {
      this.sortable = Sortable.create(grid, {
        animation: 300,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        dragClass: 'dragging',
        onEnd: (evt) => {
          this.saveLayout();
        }
      });
    }
  }

  /**
   * Guarda layout en localStorage
   */
  saveLayout() {
    const grid = document.getElementById('widgetsGrid');
    if (grid) {
      const order = Array.from(grid.children).map(child => child.dataset.widgetId);
      localStorage.setItem(this.layoutKey, JSON.stringify(order));
    }
  }

  /**
   * Carga layout desde localStorage
   */
  loadLayout() {
    const saved = localStorage.getItem(this.layoutKey);
    if (saved) {
      this.widgetOrder = JSON.parse(saved);
    }
  }

  /**
   * Restaura layout por defecto
   */
  resetLayout() {
    localStorage.removeItem(this.layoutKey);
    this.render();
    this.initDragAndDrop();
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
   * Exporta dashboard
   */
  exportDashboard() {
    // Aquí iría la lógica de exportación
    console.log('Exportando dashboard...');
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
      'Para piezas': 'warning'
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
