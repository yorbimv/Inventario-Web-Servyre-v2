/**
 * PDF Executive Generator - Generador de reportes PDF ejecutivos
 * Soporta múltiples formatos: A4 (V/H), Oficio, Doble Carta
 * Estilos: Ejecutivo Corporativo, Clásico, Moderno
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoManager } from './logo-manager.js';

export class PDFExecutiveGenerator {
    constructor(inventory, options = {}) {
        this.inventory = inventory;
        this.options = {
            format: options.format || 'a4',
            orientation: options.orientation || 'landscape',
            style: options.style || 'executive',
            sections: options.sections || {
                kpis: true,
                charts: true,
                tables: true,
                alerts: true
            },
            selectedKPIs: options.selectedKPIs || ['total', 'value', 'active', 'maintenance'],
            selectedFields: options.selectedFields || ['resguardo', 'fullName', 'deviceType', 'brand', 'status'],
            includeLogo: options.includeLogo !== false,
            includeDate: options.includeDate !== false,
            includeFooter: options.includeFooter !== false,
            pageNumbers: options.pageNumbers !== false,
            ...options
        };
        
        this.brandSettings = logoManager.getSettings();
        this.currentPage = 1;
        this.totalPages = 1;
        
        // Configuraciones de formato
        this.formats = {
            'a4': { width: 210, height: 297 },
            'oficio': { width: 216, height: 330 },
            'doble-carta': { width: 432, height: 279 }
        };
        
        // Estilos predefinidos
        this.styles = {
            executive: {
                colors: {
                    primary: [30, 58, 138],      // Azul marino
                    primaryLight: [59, 130, 246], // Azul real
                    accent: [252, 211, 77],       // Dorado
                    background: [255, 255, 255],  // Blanco
                    text: [31, 41, 55],           // Gris oscuro
                    textLight: [107, 114, 128],   // Gris medio
                    border: [229, 231, 235],      // Gris claro
                    success: [16, 185, 129],      // Verde
                    warning: [245, 158, 11],      // Ámbar
                    danger: [239, 68, 68]         // Rojo
                },
                header: {
                    useGradient: true,
                    height: 40
                }
            },
            classic: {
                colors: {
                    primary: [0, 0, 0],
                    accent: [100, 100, 100],
                    background: [255, 255, 255],
                    text: [0, 0, 0],
                    textLight: [100, 100, 100],
                    border: [200, 200, 200]
                },
                header: {
                    useGradient: false,
                    height: 35
                }
            },
            modern: {
                colors: {
                    primary: [15, 23, 42],
                    primaryLight: [30, 41, 59],
                    accent: [99, 102, 241],
                    background: [248, 250, 252],
                    text: [15, 23, 42],
                    textLight: [100, 116, 139],
                    border: [226, 232, 240]
                },
                header: {
                    useGradient: true,
                    height: 38
                }
            }
        };
    }

    /**
     * Genera el PDF completo
     */
    async generate() {
        const format = this.formats[this.options.format];
        const dimensions = this.options.orientation === 'landscape' 
            ? { width: format.height, height: format.width }
            : format;

        this.pdf = new jsPDF({
            orientation: this.options.orientation,
            unit: 'mm',
            format: [dimensions.width, dimensions.height]
        });

        this.style = this.styles[this.options.style];
        this.width = dimensions.width;
        this.height = dimensions.height;
        this.margin = 15;

        // Calcular páginas totales
        this.calculateTotalPages();

        // Generar contenido
        await this.renderHeader();
        
        let yPosition = this.style.header.height + 10;

        if (this.options.sections.kpis) {
            yPosition = this.renderKPISection(yPosition);
        }

        if (this.options.sections.charts && yPosition < this.height - 50) {
            yPosition = await this.renderChartsSection(yPosition);
        }

        if (this.options.sections.tables && yPosition < this.height - 40) {
            yPosition = this.renderTablesSection(yPosition);
        }

        if (this.options.sections.alerts && yPosition < this.height - 30) {
            yPosition = this.renderAlertsSection(yPosition);
        }

        // Footer en todas las páginas
        this.renderFooter();

        return this.pdf;
    }

    /**
     * Calcula el número total de páginas
     */
    calculateTotalPages() {
        let pages = 1;
        const itemsCount = this.inventory.length;
        
        // Estimación: ~25 items por página en tabla
        if (this.options.sections.tables && itemsCount > 25) {
            pages += Math.ceil((itemsCount - 25) / 35);
        }
        
        this.totalPages = pages;
    }

    /**
     * Renderiza el header del documento
     */
    async renderHeader() {
        const { colors, header } = this.style;
        
        // Fondo del header
        if (header.useGradient) {
            // Crear efecto de degradado con rectángulos
            for (let i = 0; i < header.height; i++) {
                const ratio = i / header.height;
                const r = Math.round(colors.primary[0] + (colors.primaryLight[0] - colors.primary[0]) * ratio);
                const g = Math.round(colors.primary[1] + (colors.primaryLight[1] - colors.primary[1]) * ratio);
                const b = Math.round(colors.primary[2] + (colors.primaryLight[2] - colors.primary[2]) * ratio);
                
                this.pdf.setFillColor(r, g, b);
                this.pdf.rect(0, i, this.width, 1, 'F');
            }
        } else {
            this.pdf.setFillColor(...colors.primary);
            this.pdf.rect(0, 0, this.width, header.height, 'F');
        }

        // Logo
        if (this.options.includeLogo && this.brandSettings.logoData) {
            try {
                const logoWidth = 30;
                const logoHeight = 20;
                this.pdf.addImage(
                    this.brandSettings.logoData,
                    'PNG',
                    this.margin,
                    10,
                    logoWidth,
                    logoHeight
                );
            } catch (e) {
                console.error('Error adding logo:', e);
            }
        }

        // Título
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.setFontSize(20);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(
            this.brandSettings.companyName,
            this.margin + (this.options.includeLogo ? 35 : 0),
            22
        );

        // Subtítulo
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
            this.brandSettings.reportSubtitle,
            this.margin + (this.options.includeLogo ? 35 : 0),
            30
        );

        // Línea decorativa dorada
        this.pdf.setDrawColor(...colors.accent);
        this.pdf.setLineWidth(1);
        this.pdf.line(
            this.margin,
            header.height - 3,
            this.margin + 50,
            header.height - 3
        );

        // Fecha
        if (this.options.includeDate) {
            this.pdf.setFontSize(9);
            this.pdf.setFont('helvetica', 'normal');
            const dateStr = new Date().toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            this.pdf.text(
                `Generado: ${dateStr}`,
                this.width - this.margin,
                20,
                { align: 'right' }
            );
        }

        // Información de contacto
        if (this.brandSettings.contactInfo) {
            this.pdf.setFontSize(8);
            this.pdf.text(
                this.brandSettings.contactInfo,
                this.width - this.margin,
                26,
                { align: 'right' }
            );
        }
    }

    /**
     * Renderiza sección de KPIs
     */
    renderKPISection(yPosition) {
        const { colors } = this.style;
        const kpis = this.calculateKPIs();
        const selectedKPIs = this.options.selectedKPIs;

        // Título de sección
        this.pdf.setTextColor(...colors.text);
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Resumen Ejecutivo', this.margin, yPosition);
        yPosition += 8;

        // Grid de KPIs
        const kpiWidth = (this.width - (2 * this.margin) - 20) / 3;
        const kpiHeight = 25;
        let xPosition = this.margin;
        let itemsInRow = 0;

        const kpiDefinitions = {
            total: { label: 'Total Equipos', value: kpis.total, icon: 'package' },
            value: { label: 'Valor Total', value: this.formatCurrency(kpis.totalValue), icon: 'dollar-sign' },
            active: { label: 'Activos', value: kpis.active, icon: 'check-circle', percentage: Math.round((kpis.active / kpis.total) * 100) },
            maintenance: { label: 'En Mantenimiento', value: kpis.maintenance, icon: 'wrench' },
            warranty: { label: 'Garantías Próximas', value: kpis.warrantyExpiring, icon: 'shield-alert' },
            bajas: { label: 'Bajas', value: kpis.bajas, icon: 'x-circle' }
        };

        selectedKPIs.forEach((kpiKey, index) => {
            const kpi = kpiDefinitions[kpiKey];
            if (!kpi) return;

            // Caja del KPI
            this.pdf.setFillColor(248, 250, 252);
            this.pdf.setDrawColor(...colors.border);
            this.pdf.setLineWidth(0.5);
            this.pdf.roundedRect(xPosition, yPosition, kpiWidth, kpiHeight, 3, 3, 'FD');

            // Valor
            this.pdf.setTextColor(...colors.primary);
            this.pdf.setFontSize(16);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(kpi.value.toString(), xPosition + 5, yPosition + 12);

            // Etiqueta
            this.pdf.setTextColor(...colors.textLight);
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.text(kpi.label, xPosition + 5, yPosition + 20);

            // Porcentaje si existe
            if (kpi.percentage) {
                this.pdf.setTextColor(16, 185, 129);
                this.pdf.setFontSize(9);
                this.pdf.text(`${kpi.percentage}%`, xPosition + kpiWidth - 15, yPosition + 12);
            }

            xPosition += kpiWidth + 10;
            itemsInRow++;

            if (itemsInRow === 3) {
                xPosition = this.margin;
                yPosition += kpiHeight + 8;
                itemsInRow = 0;
            }
        });

        if (itemsInRow > 0) {
            yPosition += kpiHeight + 8;
        }

        return yPosition + 5;
    }

    /**
     * Renderiza sección de gráficos
     */
    async renderChartsSection(yPosition) {
        const { colors } = this.style;

        // Título
        this.pdf.setTextColor(...colors.text);
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Análisis Visual', this.margin, yPosition);
        yPosition += 8;

        // Distribución por estado (gráfico simulado con barras)
        const statusData = this.getStatusDistribution();
        const chartHeight = 40;
        const maxValue = Math.max(...Object.values(statusData));

        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Distribución por Estado', this.margin, yPosition);
        yPosition += 5;

        const barWidth = 20;
        const maxBarWidth = 80;
        let xPos = this.margin;

        Object.entries(statusData).forEach(([status, count]) => {
            const barLength = (count / maxValue) * maxBarWidth;
            const color = this.getStatusColor(status);

            // Barra
            this.pdf.setFillColor(...color);
            this.pdf.rect(xPos, yPosition, barLength, 8, 'F');

            // Etiqueta
            this.pdf.setTextColor(...colors.text);
            this.pdf.setFontSize(8);
            this.pdf.text(status, xPos, yPosition + 12);

            // Valor
            this.pdf.setFontSize(9);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(count.toString(), xPos + barLength + 2, yPosition + 6);

            xPos += maxBarWidth + 30;
        });

        yPosition += chartHeight;

        return yPosition;
    }

    /**
     * Renderiza sección de tablas
     */
    renderTablesSection(yPosition) {
        const { colors } = this.style;

        // Título
        this.pdf.setTextColor(...colors.text);
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Detalle de Equipos', this.margin, yPosition);
        yPosition += 5;

        // Preparar datos de la tabla
        const headers = this.getTableHeaders();
        const data = this.inventory.slice(0, 30).map(item => 
            this.options.selectedFields.map(field => item[field] || '-')
        );

        // Generar tabla con autoTable
        autoTable(this.pdf, {
            startY: yPosition,
            head: [headers],
            body: data,
            theme: 'grid',
            headStyles: {
                fillColor: colors.primary,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8,
                textColor: colors.text
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            styles: {
                cellPadding: 2,
                fontSize: 8
            },
            margin: { left: this.margin, right: this.margin },
            didDrawPage: (data) => {
                this.renderFooter();
            }
        });

        return this.pdf.lastAutoTable.finalY + 10;
    }

    /**
     * Renderiza sección de alertas
     */
    renderAlertsSection(yPosition) {
        const { colors } = this.style;
        const alerts = this.generateAlerts();

        if (alerts.length === 0) return yPosition;

        // Título
        this.pdf.setTextColor(...colors.text);
        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('Alertas Requieren Atención', this.margin, yPosition);
        yPosition += 8;

        // Alertas
        alerts.forEach(alert => {
            const color = alert.type === 'danger' ? colors.danger : 
                         alert.type === 'warning' ? colors.warning : colors.info;

            // Caja de alerta
            this.pdf.setFillColor(color[0], color[1], color[2], 0.1);
            this.pdf.setDrawColor(...color);
            this.pdf.setLineWidth(0.5);
            this.pdf.roundedRect(this.margin, yPosition, this.width - (2 * this.margin), 15, 2, 2, 'FD');

            // Icono simulado (círculo)
            this.pdf.setFillColor(...color);
            this.pdf.ellipse(this.margin + 5, yPosition + 7.5, 2, 2, 'F');

            // Texto
            this.pdf.setTextColor(...colors.text);
            this.pdf.setFontSize(9);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(alert.title, this.margin + 12, yPosition + 6);

            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.text(alert.description, this.margin + 12, yPosition + 12);

            yPosition += 18;
        });

        return yPosition + 5;
    }

    /**
     * Renderiza footer
     */
    renderFooter() {
        if (!this.options.includeFooter) return;

        const { colors } = this.style;
        const footerY = this.height - 15;

        // Línea separadora
        this.pdf.setDrawColor(...colors.border);
        this.pdf.setLineWidth(0.5);
        this.pdf.line(this.margin, footerY - 5, this.width - this.margin, footerY - 5);

        // Texto del footer
        this.pdf.setTextColor(...colors.textLight);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
            `${this.brandSettings.companyName} • Reporte Ejecutivo`,
            this.margin,
            footerY
        );

        // Número de página
        if (this.options.pageNumbers) {
            this.pdf.text(
                `Página ${this.currentPage} de ${this.totalPages}`,
                this.width - this.margin,
                footerY,
                { align: 'right' }
            );
        }
    }

    /**
     * Calcula KPIs
     */
    calculateKPIs() {
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        return {
            total: this.inventory.length,
            active: this.inventory.filter(i => i.status === 'Activo').length,
            maintenance: this.inventory.filter(i => i.status === 'Mantenimiento').length,
            bajas: this.inventory.filter(i => i.status === 'Baja').length,
            totalValue: this.inventory.reduce((sum, i) => 
                sum + (parseFloat(i.price?.replace(/[^0-9.-]+/g, '')) || 0), 0),
            warrantyExpiring: this.inventory.filter(i => {
                if (!i.warrantyEndDate) return false;
                const end = new Date(i.warrantyEndDate);
                return end <= thirtyDays && end >= now;
            }).length
        };
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
     * Genera alertas
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
                title: 'Mantenimientos vencidos',
                description: `${overdueMtto.length} equipos requieren atención inmediata`
            });
        }

        return alerts;
    }

    /**
     * Obtiene headers de tabla
     */
    getTableHeaders() {
        const fieldLabels = {
            resguardo: 'Resguardo',
            fullName: 'Usuario',
            deviceType: 'Equipo',
            brand: 'Marca',
            model: 'Modelo',
            serialNumber: 'Serie',
            location: 'Ubicación',
            department: 'Depto',
            status: 'Estado',
            purchaseDate: 'Fecha Compra',
            warrantyEndDate: 'Fin Garantía',
            price: 'Precio'
        };

        return this.options.selectedFields.map(field => fieldLabels[field] || field);
    }

    /**
     * Obtiene color según estado
     */
    getStatusColor(status) {
        const colors = {
            'Activo': [16, 185, 129],
            'Mantenimiento': [245, 158, 11],
            'Baja': [239, 68, 68],
            'Cancelado': [107, 114, 128],
            'Para piezas': [255, 149, 0]
        };
        return colors[status] || [100, 100, 100];
    }

    /**
     * Formatea moneda
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    /**
     * Guarda el PDF
     */
    save(filename = null) {
        const dateStr = new Date().toISOString().split('T')[0];
        const name = filename || `Reporte_Ejecutivo_${this.brandSettings.companyName.replace(/\s+/g, '_')}_${dateStr}.pdf`;
        this.pdf.save(name);
    }
}

// Función de conveniencia
export async function generateExecutivePDF(inventory, options) {
    const generator = new PDFExecutiveGenerator(inventory, options);
    await generator.generate();
    return generator;
}
