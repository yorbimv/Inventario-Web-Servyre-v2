import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from './toast.js';

// Field mappings for exports
const EXPORT_FIELDS = [
    { key: 'resguardo', label: 'N° Resguardo', section: 'identification' },
    { key: 'serialNumber', label: 'Serie', section: 'identification' },
    { key: 'status', label: 'Estado', section: 'identification' },
    { key: 'fullName', label: 'Usuario', section: 'user' },
    { key: 'position', label: 'Puesto', section: 'user' },
    { key: 'email', label: 'Correo', section: 'user' },
    { key: 'extension', label: 'Extensión', section: 'user' },
    { key: 'department', label: 'Departamento', section: 'user' },
    { key: 'location', label: 'Ubicación', section: 'user' },
    { key: 'address', label: 'Dirección', section: 'user' },
    { key: 'deviceType', label: 'Tipo Equipo', section: 'equipment' },
    { key: 'brand', label: 'Marca', section: 'equipment' },
    { key: 'model', label: 'Modelo', section: 'equipment' },
    { key: 'pcName', label: 'Nombre PC', section: 'equipment' },
    { key: 'os', label: 'Sistema Operativo', section: 'equipment' },
    { key: 'processor', label: 'Procesador', section: 'equipment' },
    { key: 'ram', label: 'RAM', section: 'equipment' },
    { key: 'storageCapacity', label: 'Almacenamiento', section: 'equipment' },
    { key: 'mouseExternal', label: 'Mouse', section: 'accessories' },
    { key: 'periphBrand', label: 'Marca Monitor', section: 'accessories' },
    { key: 'periphModel', label: 'Modelo Monitor', section: 'accessories' },
    { key: 'periphSerial', label: 'Serie Monitor', section: 'accessories' },
    { key: 'price', label: 'Precio', section: 'admin' },
    { key: 'purchaseDate', label: 'Fecha Compra', section: 'admin' },
    { key: 'warranty', label: 'Garantía (meses)', section: 'admin' },
    { key: 'lastMtto', label: 'Último Mtto', section: 'maintenance' },
    { key: 'nextMtto', label: 'Próximo Mtto', section: 'maintenance' },
    { key: 'conditions', label: 'Condiciones', section: 'notes' },
    { key: 'incidentReport', label: 'Incidentes', section: 'notes' },
    { key: 'notes', label: 'Notas', section: 'notes' },
    { key: 'photos', label: 'Fotos/Links', section: 'notes' }
];

// ============================================
// EXPORT: JSON (Backup)
// ============================================
export const exportJSON = (inventory, catalogs) => {
    const data = {
        version: "2.0",
        exportDate: new Date().toISOString(),
        recordCount: inventory.length,
        inventory: inventory,
        catalogs: catalogs
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Servyre_Inventario_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

// ============================================
// EXPORT: Excel (.xlsx)
// ============================================
export const exportExcel = (inventory) => {
    if (inventory.length === 0) {
        toast.warning('No hay registros para exportar.');
        return;
    }

    const headers = EXPORT_FIELDS.map(f => f.label);
    
    const rows = inventory.map(item => 
        EXPORT_FIELDS.map(field => item[field.key] || '')
    );

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Auto column width
    const colWidths = headers.map((h, i) => {
        const maxLength = Math.max(
            h.length,
            ...rows.map(r => String(r[i] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario IT");
    XLSX.writeFile(wb, `Servyre_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ============================================
// EXPORT: CSV
// ============================================
export const exportCSV = (inventory) => {
    if (inventory.length === 0) {
        toast.warning('No hay registros para exportar.');
        return;
    }

    const headers = EXPORT_FIELDS.map(f => f.label);
    const rows = inventory.map(item => 
        EXPORT_FIELDS.map(field => {
            const value = item[field.key] || '';
            // Escape quotes and wrap in quotes if contains comma
            return String(value).includes(',') ? `"${value}"` : value;
        })
    );

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Servyre_Inventario_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

// ============================================
// EXPORT: PDF (Lista)
// ============================================
export const exportPDF = (inventory, options = {}) => {
    if (inventory.length === 0) {
        toast.warning('No hay registros para exportar.');
        return;
    }

    const { title = 'Inventario de Activos', filter = 'todos' } = options;
    
    let filteredData = inventory;
    if (filter && filter !== 'todos') {
        filteredData = inventory.filter(item => item.status === filter);
    }

    try {
        const doc = new jsPDF('l', 'mm', 'legal');
        
        // Header
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, 356, 28, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 28, 356, 4, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('SERVYRE IT', 14, 14);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 22);
        
        doc.setFontSize(9);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 330, 10, { align: 'right' });
        doc.text(`Total: ${filteredData.length} registros`, 330, 18, { align: 'right' });

        // Columns to show
        const columns = [
            { header: 'Resguardo', dataKey: 'resguardo' },
            { header: 'Usuario', dataKey: 'fullName' },
            { header: 'Equipo', dataKey: 'deviceType' },
            { header: 'Marca', dataKey: 'brand' },
            { header: 'Serie', dataKey: 'serialNumber' },
            { header: 'Ubicación', dataKey: 'location' },
            { header: 'Estado', dataKey: 'status' }
        ];

        const data = filteredData.map(item => ({
            resguardo: item.resguardo || '-',
            fullName: item.fullName || '-',
            deviceType: item.deviceType || '-',
            brand: item.brand || '-',
            serialNumber: item.serialNumber || '-',
            location: item.location || '-',
            status: item.status || '-'
        }));

        autoTable(doc, {
            head: [columns.map(c => c.header)],
            body: data.map(row => columns.map(c => row[c.dataKey])),
            startY: 38,
            theme: 'striped',
            headStyles: {
                fillStyle: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: { fontSize: 8 },
            columnStyles: columns.reduce((acc, _, i) => {
                acc[i] = { cellWidth: 45 };
                return acc;
            }, {})
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Sistema de Gestión de Activos IT - Servyre', 178, 330, { align: 'center' });

        const filename = `Servyre_${filter}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        toast.error('Error al generar PDF: ' + error.message);
    }
};

// ============================================
// EXPORT: PDF Individual ( Ficha por equipo)
// ============================================
export const generateDetailPdf = (item) => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Header
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 35, 210, 5, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('FICHA DE RESGUARDO', 14, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`N° Resguardo: ${item.resguardo || 'N/A'}`, 14, 28);
        
        // Status badge
        const statusColor = {
            'Activo': [52, 199, 89],
            'Mantenimiento': [255, 159, 10],
            'Baja': [255, 69, 58],
            'Cancelado': [142, 142, 147],
            'Para piezas': [255, 149, 0]
        };
        const sc = statusColor[item.status] || [128, 128, 128];
        doc.setFillColor(...sc);
        doc.roundedRect(160, 12, 35, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(item.status || 'N/A', 177, 19, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        let y = 55;
        
        // Section: Usuario
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 182, 8, 'F');
        doc.text('USUARIO', 16, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const userFields = [
            ['Usuario:', item.fullName || '-'],
            ['Puesto:', item.position || '-'],
            ['Correo:', item.email || '-'],
            ['Extensión:', item.extension || '-'],
            ['Departamento:', item.department || '-'],
            ['Ubicación:', item.location || '-']
        ];
        userFields.forEach(([label, value], i) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 16, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, y);
            if (i % 2 === 0) doc.text('', 120, y);
            else y += 6;
        });
        y += 8;
        
        // Section: Equipo
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 182, 8, 'F');
        doc.text('EQUIPO', 16, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const equipFields = [
            ['Tipo:', item.deviceType || '-'],
            ['Marca:', item.brand || '-'],
            ['Modelo:', item.model || '-'],
            ['Serie:', item.serialNumber || '-'],
            ['Nombre PC:', item.pcName || '-'],
            ['SO:', item.os || '-']
        ];
        equipFields.forEach(([label, value], i) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 16, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, y);
            if (i % 2 === 0) doc.text('', 120, y);
            else y += 6;
        });
        y += 8;
        
        // Section: Hardware
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 182, 8, 'F');
        doc.text('HARDWARE', 16, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const hwFields = [
            ['Procesador:', item.processor || '-'],
            ['RAM:', item.ram || '-'],
            ['Almacenamiento:', item.storageCapacity || '-']
        ];
        hwFields.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 16, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, y);
            y += 6;
        });
        y += 5;
        
        // Section: Administrativo
        doc.setFont('helvetica', 'bold');
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 5, 182, 8, 'F');
        doc.text('ADMINISTRATIVO', 16, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const adminFields = [
            ['Precio:', item.price || '-'],
            ['Fecha Compra:', item.purchaseDate || '-'],
            ['Garantía:', item.warranty ? `${item.warranty} meses` : '-']
        ];
        adminFields.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, 16, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 60, y);
            y += 6;
        });
        
        // Notes section
        if (item.conditions || item.notes) {
            y += 5;
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(240, 240, 240);
            doc.rect(14, y - 5, 182, 8, 'F');
            doc.text('OBSERVACIONES', 16, y);
            y += 10;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            if (item.conditions) {
                doc.text(`Condiciones: ${item.conditions}`, 16, y);
                y += 6;
            }
            if (item.notes) {
                doc.text(`Notas: ${item.notes}`, 16, y);
            }
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 285);
        doc.text('Sistema de Gestión de Activos IT - Servyre', 105, 285, { align: 'center' });
        
        const filename = `Ficha_${item.resguardo || item.serialNumber || 'equipo'}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
    } catch (error) {
        console.error('Error generando PDF individual:', error);
        toast.error('Error al generar PDF: ' + error.message);
    }
};

// ============================================
// TEMPLATE: Excel para importar
// ============================================
export const downloadTemplate = () => {
    const headers = EXPORT_FIELDS.map(f => f.label);
    const exampleRow = EXPORT_FIELDS.map(f => {
        const examples = {
            'N° Resguardo': 'SERV-001',
            'Serie': 'SN12345ABC',
            'Estado': 'Activo',
            'Usuario': 'JUAN PÉREZ',
            'Puesto': 'GERENTE DE TI',
            'Correo': 'juan.perez@servyre.com',
            'Extensión': '4501',
            'Departamento': 'TECNOLOGÍAS',
            'Ubicación': 'Corporativo',
            'Tipo Equipo': 'Laptop',
            'Marca': 'Dell',
            'Modelo': 'Latitude 5430',
            'Nombre PC': 'TI-JUAN-LT01',
            'Sistema Operativo': 'Windows 11 Pro',
            'Procesador': 'Intel Core i7',
            'RAM': '16 GB',
            'Almacenamiento': '512 GB SSD',
            'Precio': '$25,000.00',
            'Fecha Compra': '2024-01-15',
            'Garantía (meses)': '36'
        };
        return examples[f.label] || '';
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    ws['!cols'] = headers.map(() => ({ wch: 25 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    
    // Add instructions sheet
    const instructions = [
        ["INSTRUCCIONES DE IMPORTACIÓN"],
        [""],
        ["1. No modifies los encabezados de las columnas"],
        ["2. Los campos obligatorios están marcados con *"],
        ["3. Para Estado usa: Activo, Mantenimiento, Baja, Cancelado, Para piezas"],
        ["4. Para Tipo Equipo usa: Laptop, Desktop, Servidor, Monitor, Impresora, Celular, Tablet, Otro"],
        ["5. Las fechas deben estar en formato: YYYY-MM-DD"],
        [""],
        ["Ejemplo de datos:"]
    ];
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");
    
    XLSX.writeFile(wb, "Plantilla_Importacion_Servyre_V2.xlsx");
};

// ============================================
// IMPORT: From JSON/Excel
// ============================================
export const importData = (file, type = 'json') => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                if (type === 'json') {
                    const data = JSON.parse(e.target.result);
                    resolve({
                        inventory: data.inventory || data,
                        catalogs: data.catalogs || null,
                        version: data.version || 'unknown'
                    });
                } else if (type === 'excel') {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(sheet);
                    
                    // Map columns to fields
                    const inventory = jsonData.map(row => {
                        const item = { id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2, 9) };
                        EXPORT_FIELDS.forEach(field => {
                            item[field.key] = row[field.label] || row[field.key] || '';
                        });
                        return item;
                    });
                    
                    resolve({ inventory, catalogs: null });
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
    });
};

export { EXPORT_FIELDS };
