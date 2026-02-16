import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitize } from './utils.js';

export const exportJSON = (data) => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resguardo_IT_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

export const exportExcel = (inventory) => {
    if (inventory.length === 0) {
        alert('No hay registros para exportar.');
        return;
    }

    const headers = [
        "Resguardo", "Usuario", "Puesto", "Correo", "Extensión", "Departamento",
        "Dirección", "Ubicación", "Tipo Equipo", "Marca", "Modelo", "Serie",
        "Nombre PC", "Sistema Operativo", "Procesador", "RAM", "Disco",
        "Estado", "Precio", "Fecha Compra", "Marca Periférico", "Modelo Periférico",
        "Serie Periférico", "Mouse Externo", "Último Mtto", "Próximo Mtto",
        "Condiciones", "Incidentes", "Notas", "Fotos"
    ];

    const rows = inventory.map(item => [
        item.resguardo || '', item.fullName || '', item.position || '', item.email || '',
        item.extension || '', item.department || '', item.address || '', item.location || '',
        item.deviceType || '', item.brand || '', item.model || '', item.serialNumber || '',
        item.pcName || '', item.os || '', item.processor || '', item.ram || '', item.storageCapacity || '',
        item.status || '', item.price || '', item.purchaseDate || '',
        item.periphBrand || '', item.periphModel || '', item.periphSerial || '',
        item.mouseExternal || '', item.lastMtto || '', item.nextMtto || '',
        item.conditions || '', item.incidentReport || '', item.notes || '', item.photos || ''
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario IT");
    XLSX.writeFile(wb, `Inventario_IT_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const downloadTemplate = () => {
    const headers = [
        "Nombre Completo", "Ubicación", "Direccion", "Departamento", "Puesto",
        "Extension", "Correo", "Resguardo", "Equipo", "Marca", "Modelo", "Serie",
        "Mouse externo (Laptop)", "Sistema Operativo", "Nombre PC", "Procesador",
        "RAM", "Disco duro", "Precio unitario", "Fecha de Compra",
        "Marca (Monitor/Accesorio)", "Modelo (Monitor/Accesorio)", "Serie (Monitor/Accesorio)",
        "Reporte (Incidentes)", "Ultima Fecha de Mtto.", "Proxima Fecha de Mtto.",
        "Condiciones", "Fotos"
    ];

    const exampleRow = [
        "Juan Perez", "Corporativo", "Direccion General",
        "Administracion", "Gerente", "123",
        "juan.perez@servyre.com", "Serv-001", "Laptop", "Dell", "Latitude 5420", "SN001",
        "Logitech", "Windows 10", "Juan-PC", "i5",
        "16 GB", "512 GB", "15000", "2024-01-01", "BenQ", "GW2280",
        "SNMON001", "", "2025-01-01", "2026-01-01", "Buen estado", ""
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Plantilla_Inventario_Servyre_V2.xlsx");
};

export const generatePdf = (inventory, columns = null, title = 'Reporte de Inventario') => {
    try {
        const doc = new jsPDF('l', 'mm', 'legal');

        // Header
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, 356, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('SERVYRE IT', 14, 14);
        doc.setFontSize(11);
        doc.text(title, 14, 22);

        // Data prep
        const allCols = [
            "resguardo", "fullName", "position", "department", "location",
            "deviceType", "brand", "model", "serialNumber", "status"
        ];
        const selectedCols = columns || allCols;

        const headers = selectedCols.map(c => c.toUpperCase());
        const rows = inventory.map(item => selectedCols.map(col => item[col] || '-'));

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 35,
            theme: 'striped',
            styles: { fontSize: 8 }
        });

        doc.save(`Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
        console.error("PDF Error", e);
        alert("Error al generar PDF");
    }
};

export const generateDetailPdf = (item) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('FICHA DE RESGUARDO', 14, 18);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Usuario: ${item.fullName || ''}`, 14, 50);
    doc.text(`Equipo: ${item.deviceType || ''} ${item.brand || ''} ${item.model || ''}`, 14, 60);
    doc.text(`Serie: ${item.serialNumber || ''}`, 14, 70);
    doc.text(`Ubicación: ${item.location || ''}`, 14, 80);

    doc.save(`Ficha_${item.serialNumber}.pdf`);
};
