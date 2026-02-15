import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import CryptoJS from 'crypto-js';
import { CONFIG } from './config.js';
import { sanitize } from './utils.js';

// --- CONFIGURATION & STATE ---
const MASTER_KEY = CONFIG.MASTER_KEY;
const STORAGE_KEY = CONFIG.STORAGE_KEY;

let inventory = [];
let catalogs = {
    brands: ['Dell', 'HP', 'Lenovo', 'Apple', 'Microsoft'],
    modelsByBrand: {
        'Dell': ['Latitude 3420', 'Latitude 5430', 'OptiPlex 7090', 'Precision 3581'],
        'HP': ['EliteDesk 800', 'ProBook 450', 'ZBook Firefly', 'EliteBook 840'],
        'Lenovo': ['ThinkPad X1', 'ThinkCentre M70', 'Legion 5 Pro'],
        'Apple': ['MacBook Pro M2', 'MacBook Air M3', 'iMac 24"'],
        'Microsoft': ['Surface Pro 9', 'Surface Laptop 5']
    },
    locations: {
        sedes: ['Corporativo', 'Naucalpan'],
        externo: ['Campo']
    }
};

// --- DOM ELEMENTS ---
const inventoryBody = document.getElementById('inventoryBody');
const inventoryForm = document.getElementById('inventoryForm');
const modalOverlay = document.getElementById('modalOverlay');
const detailModalOverlay = document.getElementById('detailModalOverlay');
const detailModalBody = document.getElementById('detailModalBody');
const catalogModalOverlay = document.getElementById('catalogModalOverlay');
const searchInput = document.getElementById('searchInput');

// Dynamic UI
const totalAssetsEl = document.getElementById('totalAssets');
const activeLocationsEl = document.getElementById('activeLocations');

// Form/Catalog Controls
const brandInput = document.getElementById('brand');
const modelInput = document.getElementById('model');
const locationInput = document.getElementById('location');
const catalogBrandSelect = document.getElementById('catalogBrandSelect');
const brandList = document.getElementById('brandList');
const modelList = document.getElementById('modelList');
const locationList = document.getElementById('locationList');
const modelManagementSection = document.getElementById('modelManagementSection');
const importInput = document.getElementById('importInput');

// --- SECURITY & DATA ---
const encrypt = (data) => CryptoJS.AES.encrypt(JSON.stringify(data), MASTER_KEY).toString();
const decrypt = (ciphertext) => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
        const dec = bytes.toString(CryptoJS.enc.Utf8);
        return dec ? JSON.parse(dec) : null;
    } catch (e) { return null; }
};

const saveToStorage = () => {
    localStorage.setItem(STORAGE_KEY, encrypt({ inventory, catalogs }));
    updateStats();
};

const loadData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const dec = decrypt(stored);
        if (dec) {
            inventory = dec.inventory || [];
            catalogs = dec.catalogs || catalogs;
        }
    }
    renderTable();
    updateStats();
    syncFormSelects();
};

const updateStats = () => {
    totalAssetsEl.textContent = inventory.length;
    activeLocationsEl.textContent = (catalogs.locations.sedes?.length || 0) + (catalogs.locations.externo?.length || 0);
};

// --- CORE UI RENDERING ---
const renderTable = (data = inventory) => {
    inventoryBody.innerHTML = '';
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        tr.style.cursor = 'pointer';

        const sc = item.status === 'Activo' ? 'badge-green' : item.status === 'Mantenimiento' ? 'badge-orange' : 'badge-danger';

        tr.innerHTML = `
            <td><code>${sanitize(item.resguardo || '-')}</code></td>
            <td>
                <div style="font-weight: 700; color: var(--text);">${sanitize(item.fullName)}</div>
                <div style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">${sanitize(item.position || '-')}</div>
            </td>
            <td><span style="font-weight: 500;">${sanitize(item.deviceType)}</span></td>
            <td>
                <div style="font-weight: 600;">${sanitize(item.brand)}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${sanitize(item.model || '-')}</div>
            </td>
            <td>${sanitize(item.pcName || '-')}</td>
            <td><code>${sanitize(item.serialNumber)}</code></td>
            <td><span class="badge badge-blue">${sanitize(item.location || '-')}</span></td>
            <td><span class="badge ${sc}">${sanitize(item.status)}</span></td>
            <td>
                <div class="btn-group-glass">
                    <button class="glass-btn btn-row-edit" title="Editar"><i data-lucide="edit-2" style="width:14px"></i></button>
                    <button class="glass-btn btn-row-delete" style="color:var(--danger)" title="Eliminar"><i data-lucide="trash-2" style="width:14px"></i></button>
                </div>
            </td>
        `;

        // Row Click -> View Detail
        tr.onclick = (e) => {
            if (e.target.closest('.btn-group-glass')) return;
            viewAssetDetail(item.id);
        };

        // Button Logic
        tr.querySelector('.btn-row-edit').onclick = (e) => { e.stopPropagation(); openEditForm(item.id); };
        tr.querySelector('.btn-row-delete').onclick = (e) => {
            e.stopPropagation();
            if (confirm(`¿Está seguro de eliminar el activo con serie ${item.serialNumber}?`)) {
                inventory = inventory.filter(i => i.id !== item.id);
                saveToStorage(); renderTable();
            }
        };

        inventoryBody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
};

const viewAssetDetail = (id) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const initials = item.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    detailModalBody.innerHTML = `
        <div class="asset-passport-premium animate__animated animate__zoomIn">
            <div class="user-profile-card">
                <div class="user-avatar-premium">${initials}</div>
                <h2 style="font-size: 1.8rem;">${sanitize(item.fullName)}</h2>
                <p style="color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">${sanitize(item.position)}</p>
                <div style="margin-top: 1.5rem;">
                    <span class="badge ${item.status === 'Activo' ? 'badge-green' : item.status === 'Baja' ? 'badge-danger' : 'badge-orange'}" style="font-size: 0.9rem; padding: 0.5rem 1.5rem;">${sanitize(item.status)}</span>
                </div>
                <div style="margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; font-size: 0.9rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                        <span style="color:var(--text-dim)">Ubicación / Sede</span>
                        <span style="font-weight:600">${sanitize(item.location)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between;">
                        <span style="color:var(--text-dim)">División / Dirección</span>
                        <span style="font-weight:600">${sanitize(item.address || '-')}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-grid-v2" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <!-- Main Specs -->
                <div class="info-card"><label>S/N Serial</label><div class="value">${sanitize(item.serialNumber)}</div></div>
                <div class="info-card"><label>Resguardo N°</label><div class="value">${sanitize(item.resguardo || 'Pendiente')}</div></div>
                
                <div class="info-card" style="grid-column: span 2;">
                    <label>Equipo Principal</label>
                    <div class="value" style="display: flex; gap: 0.5rem; align-items: center;">
                        <span style="color: var(--primary)">${sanitize(item.deviceType)}</span>
                        <span>${sanitize(item.brand)} ${sanitize(item.model)}</span>
                    </div>
                </div>

                <div class="info-card"><label>Hardware Specs</label><div class="value" style="font-size:0.8rem">${sanitize(item.processor || 'CPU')} / RAM ${sanitize(item.ram)} / ${sanitize(item.storageCapacity)}</div></div>
                <div class="info-card"><label>Mouse (Serie)</label><div class="value">${sanitize(item.mouseExternal || '-')}</div></div>

                <!-- Peripherals -->
                <div class="info-card" style="grid-column: span 2; border-left: 3px solid var(--secondary);">
                    <label>Monitor / Accesorio</label>
                    <div class="value" style="font-size: 0.85rem;">
                        ${sanitize(item.periphBrand || '')} ${sanitize(item.periphModel || '')} <code style="margin-left:5px">${sanitize(item.periphSerial || '-')}</code>
                    </div>
                </div>

                <!-- Maintenance & Costs -->
                <div class="info-card"><label>Costo (Precio U.)</label><div class="value">${sanitize(item.price || '$0.00')}</div></div>
                <div class="info-card"><label>Fecha Compra</label><div class="value">${sanitize(item.purchaseDate || '-')}</div></div>
                
                <div class="info-card"><label>Último Manto.</label><div class="value">${sanitize(item.lastMtto || '-')}</div></div>
                <div class="info-card"><label>Próximo Manto.</label><div class="value" style="color:var(--primary)">${sanitize(item.nextMtto || '-')}</div></div>

                <div class="info-card" style="grid-column: span 2;">
                    <label>Reporte de Incidentes / Condiciones</label>
                    <div class="value" style="font-size: 0.8rem; color: var(--text-dim); line-height: 1.4;">
                        <strong>Condiciones:</strong> ${sanitize(item.conditions || 'Sin reporte')}<br>
                        <strong>Incidentes:</strong> ${sanitize(item.incidentReport || 'Sin reporte')}
                    </div>
                </div>

                <div class="info-card" style="grid-column: span 2;">
                    <label>Observaciones / Fotos</label>
                    <div class="value" style="font-size: 0.8rem; color: var(--text-dim);">${sanitize(item.notes || '-')}</div>
                    ${item.photos ? `<div style="font-size:0.7rem; color:var(--primary); margin-top:5px; overflow:hidden; text-overflow:ellipsis;">LINK: ${sanitize(item.photos)}</div>` : ''}
                </div>
            </div>
        </div>
    `;

    detailModalOverlay.classList.add('active');

    // Button Listeners in Detail
    document.getElementById('editFromDetailBtn').onclick = () => {
        detailModalOverlay.classList.remove('active');
        openEditForm(item.id);
    };

    document.getElementById('printDetailBtn').onclick = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Header - Executive blue
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 35, 210, 4, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('FICHA DE RESGUARDO IT', 14, 18);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(item.fullName || 'Usuario', 14, 28);

        // User info section
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Información del Activo', 14, 50);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        
        const infoY = 58;
        const leftCol = 14;
        const rightCol = 110;
        
        doc.text(`Resguardo: ${item.resguardo || 'Pendiente'}`, leftCol, infoY);
        doc.text(`Serie: ${item.serialNumber || '-'}`, rightCol, infoY);
        doc.text(`Equipo: ${item.deviceType || '-'}`, leftCol, infoY + 7);
        doc.text(`Marca: ${item.brand || '-'}`, rightCol, infoY + 7);
        doc.text(`Modelo: ${item.model || '-'}`, leftCol, infoY + 14);
        doc.text(`Nombre PC: ${item.pcName || '-'}`, rightCol, infoY + 14);
        doc.text(`Ubicación: ${item.location || '-'}`, leftCol, infoY + 21);
        doc.text(`Estado: ${item.status || '-'}`, rightCol, infoY + 21);
        doc.text(`Usuario: ${item.fullName || '-'}`, leftCol, infoY + 28);
        doc.text(`Puesto: ${item.position || '-'}`, rightCol, infoY + 28);

        // Technical specs
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Especificaciones Técnicas', 14, infoY + 42);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const specY = infoY + 50;
        doc.text(`Procesador: ${item.processor || 'N/A'}`, leftCol, specY);
        doc.text(`RAM: ${item.ram || 'N/A'}`, rightCol, specY);
        doc.text(`Almacenamiento: ${item.storageCapacity || 'N/A'}`, leftCol, specY + 7);
        doc.text(`Sistema Operativo: ${item.os || 'N/A'}`, rightCol, specY + 7);

        // Additional info
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Información Adicional', 14, specY + 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const addY = specY + 30;
        doc.text(`Correo: ${item.email || 'N/A'}`, leftCol, addY);
        doc.text(`Extensión: ${item.extension || 'N/A'}`, rightCol, addY);
        doc.text(`Departamento: ${item.department || 'N/A'}`, leftCol, addY + 7);
        doc.text(`Dirección: ${item.address || 'N/A'}`, rightCol, addY + 7);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Sistema de Gestión de Activos IT - Servyre', 105, 285, { align: 'center' });

        doc.save(`Ficha_Resguardo_${item.serialNumber || 'IT'}.pdf`);
    };
};

// --- FORM LOGIC ---
const openEditForm = (id = null) => {
    inventoryForm.reset();
    document.getElementById('itemId').value = id || '';
    document.getElementById('modalTitle').textContent = id ? 'Editar Registro Activo' : 'Nuevo Registro de Inventario';

    syncFormSelects();

    if (id) {
        const i = inventory.find(item => item.id === id);
        if (i) {
            locationInput.value = i.location;
            document.getElementById('address').value = i.address || '';
            document.getElementById('department').value = i.department;
            document.getElementById('position').value = i.position;
            document.getElementById('fullName').value = i.fullName;
            document.getElementById('email').value = i.email;
            document.getElementById('extension').value = i.extension || '';
            document.getElementById('resguardo').value = i.resguardo || '';
            document.getElementById('deviceType').value = i.deviceType;
            brandInput.value = i.brand;
            updateModelsDropdown();
            modelInput.value = i.model;
            document.getElementById('serialNumber').value = i.serialNumber;
            document.getElementById('os').value = i.os || '';
            document.getElementById('pcName').value = i.pcName || '';
            document.getElementById('processor').value = i.processor || '';
            document.getElementById('ram').value = i.ram;
            document.getElementById('storageCapacity').value = i.storageCapacity;
            document.getElementById('status').value = i.status;
            document.getElementById('mouseExternal').value = i.mouseExternal || '';

            // New Fields
            document.getElementById('price').value = i.price || '';
            document.getElementById('purchaseDate').value = i.purchaseDate || '';
            document.getElementById('periphBrand').value = i.periphBrand || '';
            document.getElementById('periphModel').value = i.periphModel || '';
            document.getElementById('periphSerial').value = i.periphSerial || '';
            document.getElementById('incidentReport').value = i.incidentReport || '';
            document.getElementById('lastMtto').value = i.lastMtto || '';
            document.getElementById('nextMtto').value = i.nextMtto || '';
            document.getElementById('conditions').value = i.conditions || '';
            document.getElementById('photos').value = i.photos || '';
            document.getElementById('notes').value = i.notes || '';
        }
    } else {
        modelInput.disabled = true;
    }
    modalOverlay.classList.add('active');
};

const updateModelsDropdown = () => {
    const brand = brandInput.value;
    modelInput.innerHTML = '<option value="">Desplegar modelos...</option>';
    if (brand) {
        modelInput.disabled = false;
        (catalogs.modelsByBrand[brand] || []).forEach(m => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = m;
            modelInput.appendChild(opt);
        });
    } else {
        modelInput.disabled = true;
    }
};

const syncFormSelects = () => {
    // Locations - combine both categories with separator
    locationInput.innerHTML = '<option value="">Seleccionar...</option>';
    const sedes = catalogs.locations.sedes || [];
    const externo = catalogs.locations.externo || [];
    const allLocations = [...sedes, ...externo];
    
    // Add group headers
    if (sedes.length > 0) {
        const optGroup = document.createElement('optgroup');
        optGroup.label = 'SEDES';
        sedes.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = l;
            optGroup.appendChild(opt);
        });
        locationInput.appendChild(optGroup);
    }
    
    if (externo.length > 0) {
        const optGroup = document.createElement('optgroup');
        optGroup.label = 'EXTERNO';
        externo.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l;
            opt.textContent = l;
            optGroup.appendChild(opt);
        });
        locationInput.appendChild(optGroup);
    }

    // Brands
    const currentB = brandInput.value;
    brandInput.innerHTML = '<option value="">Sel. Marca...</option>';
    catalogBrandSelect.innerHTML = '<option value="">Marca para modelos...</option>';
    catalogs.brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = b;
        brandInput.appendChild(opt.cloneNode(true));
        catalogBrandSelect.appendChild(opt);
    });
    brandInput.value = currentB;

    renderCatalogItems();
};

const renderCatalogItems = () => {
    // Brand List with delete
    brandList.innerHTML = '';
    catalogs.brands.forEach(b => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sanitize(b)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-type="brands" data-val="${sanitize(b)}">&times;</button>`;
        brandList.appendChild(li);
    });

    // Location List - Sedes
    const locationList = document.getElementById('locationList');
    const locationList2 = document.getElementById('locationList2');
    
    locationList.innerHTML = '';
    (catalogs.locations.sedes || []).forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sanitize(l)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-type="locations" data-cat="sedes" data-val="${sanitize(l)}">&times;</button>`;
        locationList.appendChild(li);
    });

    // Location List - Externo
    locationList2.innerHTML = '';
    (catalogs.locations.externo || []).forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sanitize(l)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-type="locations" data-cat="externo" data-val="${sanitize(l)}">&times;</button>`;
        locationList2.appendChild(li);
    });

    // Models
    const selB = catalogBrandSelect.value;
    if (selB) {
        modelManagementSection.style.display = 'block';
        modelList.innerHTML = '';
        (catalogs.modelsByBrand[selB] || []).forEach(m => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${sanitize(m)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-type="models" data-val="${sanitize(m)}" data-parent="${sanitize(selB)}">&times;</button>`;
            modelList.appendChild(li);
        });
    } else {
        modelManagementSection.style.display = 'none';
    }

    // Attach event listeners
    brandList.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => delCatItem(btn.dataset.type, btn.dataset.val);
    });
    locationList.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => delCatItem(btn.dataset.type, btn.dataset.val, btn.dataset.cat);
    });
    locationList2?.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => delCatItem(btn.dataset.type, btn.dataset.val, btn.dataset.cat);
    });
    modelList.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => delCatItem(btn.dataset.type, btn.dataset.val, btn.dataset.parent);
    });
};

window.delCatItem = (type, val, parent = null) => {
    if (!confirm(`¿Eliminar ${val} del catálogo? Esto no borrará registros existentes.`)) return;
    if (type === 'brands') {
        catalogs.brands = catalogs.brands.filter(x => x !== val);
        delete catalogs.modelsByBrand[val];
    } else if (type === 'locations' && parent) {
        catalogs.locations[parent] = (catalogs.locations[parent] || []).filter(x => x !== val);
    } else if (type === 'models' && parent) {
        catalogs.modelsByBrand[parent] = catalogs.modelsByBrand[parent].filter(x => x !== val);
    }
    saveToStorage(); syncFormSelects();
};

// --- DATA IMPORT / EXPORT ---
document.getElementById('exportBackupBtn').onclick = () => {
    const dataStr = JSON.stringify({ inventory, catalogs }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resguardo_IT_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

// Export Excel - All fields in executive format
document.getElementById('exportExcelBtn').onclick = () => {
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
    
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    ws['!rows'] = [{ hpt: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario IT");

    XLSX.writeFile(wb, `Inventario_IT_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// PDF Column Modal Elements
const pdfColumnModal = document.getElementById('pdfColumnModal');
const closePdfColumnModal = document.getElementById('closePdfColumnModal');
const cancelPdfBtn = document.getElementById('cancelPdfBtn');
const generatePdfBtn = document.getElementById('generatePdfBtn');
const selectAllColumns = document.getElementById('selectAllColumns');
const deselectAllColumns = document.getElementById('deselectAllColumns');

let currentPdfFilter = 'todos';

// Column labels mapping
const columnLabels = {
    resguardo: 'Resguardo',
    fullName: 'Usuario',
    position: 'Puesto',
    department: 'Departamento',
    location: 'Ubicación',
    deviceType: 'Equipo',
    brand: 'Marca',
    model: 'Modelo',
    serialNumber: 'Serie',
    pcName: 'Nombre PC',
    os: 'Sistema Operativo',
    processor: 'Procesador',
    ram: 'RAM',
    storageCapacity: 'Disco',
    email: 'Correo',
    extension: 'Extensión',
    status: 'Estado',
    price: 'Precio',
    purchaseDate: 'Fecha Compra',
    mouseExternal: 'Mouse'
};

// Export PDF - Show column selector first
document.getElementById('exportPdfBtn').onclick = () => {
    currentPdfFilter = document.getElementById('pdfFilter').value;
    
    if (inventory.length === 0) {
        alert('No hay registros para exportar.');
        return;
    }
    
    pdfColumnModal.classList.add('active');
};

// Close modal handlers
closePdfColumnModal?.addEventListener('click', () => pdfColumnModal.classList.remove('active'));
cancelPdfBtn?.addEventListener('click', () => pdfColumnModal.classList.remove('active'));

// Select/Deselect all
selectAllColumns?.addEventListener('click', () => {
    document.querySelectorAll('.pdf-column-checkbox input').forEach(cb => cb.checked = true);
});

deselectAllColumns?.addEventListener('click', () => {
    document.querySelectorAll('.pdf-column-checkbox input').forEach(cb => cb.checked = false);
});

// Generate PDF with selected columns
generatePdfBtn?.addEventListener('click', () => {
    try {
        const selectedColumns = Array.from(document.querySelectorAll('.pdf-column-checkbox input:checked')).map(cb => cb.value);
        
        if (selectedColumns.length === 0) {
            alert('Selecciona al menos una columna.');
            return;
        }
        
        let filteredData = inventory;
        if (currentPdfFilter !== 'todos') {
            filteredData = inventory.filter(item => item.status === currentPdfFilter);
        }

        if (filteredData.length === 0) {
            alert('No hay registros para exportar.');
            return;
        }

        pdfColumnModal.classList.remove('active');

        const doc = new jsPDF('l', 'mm', 'legal');
        
        // Executive header - Professional blue palette
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
        const filterLabel = currentPdfFilter === 'todos' ? 'Reporte General' : currentPdfFilter;
        doc.text(`Inventario de Activos - ${filterLabel}`, 14, 22);
        
        // Date and count
        doc.setFontSize(9);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 330, 10, { align: 'right' });
        doc.text(`Total: ${filteredData.length} registros`, 330, 18, { align: 'right' });

        // Build table headers and data based on selected columns
        const headers = ['#', ...selectedColumns.map(col => columnLabels[col] || col)];
        
        const getCellValue = (item, col) => {
            const val = item[col];
            if (val === undefined || val === null || val === '') return '-';
            return String(val);
        };
        
        const tableData = filteredData.map((item, index) => [
            index + 1,
            ...selectedColumns.map(col => getCellValue(item, col))
        ]);

        // Calculate column widths - wider columns for full names
        const colCount = selectedColumns.length + 1;
        const minColWidth = 22;
        const maxColWidth = 55;
        const pageWidth = 336;
        const rowNumWidth = 12;
        const availableWidth = pageWidth - rowNumWidth;
        
        let baseWidth = Math.floor(availableWidth / colCount);
        if (baseWidth > maxColWidth) baseWidth = maxColWidth;
        if (baseWidth < minColWidth) baseWidth = minColWidth;
        
        const columnStyles = { 0: { cellWidth: rowNumWidth, fontStyle: 'bold' } };
        selectedColumns.forEach((_, i) => {
            columnStyles[i + 1] = { cellWidth: baseWidth };
        });

        autoTable(doc, {
            head: [headers],
            body: tableData,
            startY: 38,
            theme: 'striped',
            headStyles: {
                fillStyle: [30, 58, 138],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 3
            },
            bodyStyles: {
                fontSize: 8,
                textColor: [50, 50, 50],
                cellPadding: 2
            },
            alternateRowStyles: {
                fillStyle: [248, 250, 252]
            },
            columnStyles: columnStyles,
            margin: { left: 10, right: 10 },
            styles: {
                overflow: 'linebreak',
                cellWidth: 'wrap'
            }
        });

        // Executive Summary
        const finalY = doc.lastAutoTable.finalY + 12;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(10, finalY - 4, 336, 45, 3, 3, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Ejecutivo', 16, finalY + 4);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);
        
        // Status counts
        const counts = { Activo: 0, Mantenimiento: 0, Baja: 0 };
        inventory.forEach(item => {
            if (counts[item.status] !== undefined) counts[item.status]++;
        });
        
        doc.text(`Activos: ${counts.Activo}`, 16, finalY + 12);
        doc.text(`En Mantenimiento: ${counts.Mantenimiento}`, 70, finalY + 12);
        doc.text(`Bajas: ${counts.Baja}`, 140, finalY + 12);
        
        // Location breakdown
        const locations = {};
        inventory.forEach(item => {
            const loc = item.location || 'Sin asignar';
            locations[loc] = (locations[loc] || 0) + 1;
        });
        
        const locEntries = Object.entries(locations).slice(0, 4);
        let locY = finalY + 20;
        doc.setFont('helvetica', 'bold');
        doc.text('Por Ubicación:', 16, locY);
        doc.setFont('helvetica', 'normal');
        
        let colX = 16;
        locEntries.forEach(([loc, count], i) => {
            if (i === 2) { colX = 100; locY = finalY + 26; }
            doc.text(`• ${loc}: ${count}`, colX, locY);
            colX += 70;
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Sistema de Gestión de Activos IT - Servyre', 178, 330, { align: 'center' });

        const filename = `Inventario_Servyre_${currentPdfFilter}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('Error al generar PDF: ' + error.message);
    }
});

// Function to generate and download a Template Excel
window.downloadTemplate = () => {
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
        "Carlos Daniel Velez Ramirez", "Corporativo", "Direccion de Administracion y Finanzas",
        "Inteligencia de Operaciones", "Jefe de Inteligencia de Operaciones", "433",
        "carlos.velez@servyre.com", "Serv-068", "Laptop", "Dell", "Latitude 3500", "JVSRMT2",
        "1305HS0IL448", "Windows 10/64 bits", "CarlosV-LT", "Intel Core i5-8265U CPU 1.60 GHz",
        "8 GB", "480 GB SSD", "$16,340.92", "2020-03-12", "Dell", "E1916HV",
        "CN-0HN22V-72872-72P-DGKB-A00", "", "2025-12-17", "2026-06-17", "", "JVSRMT2"
    ];

    const instructions = [
        ["INSTRUCCIONES DE CARGA - SERVYRE IT"],
        [""],
        ["1. LLENADO DE DATOS:"],
        ["   - Respete el orden de las columnas de la hoja 'Inventario'."],
        ["   - No elimine ni cambie el nombre de los encabezados (Fila 1)."],
        [""],
        ["2. FORMATOS ESPECIALES:"],
        ["   - Fechas: Use el formato AAAA-MM-DD (Ej: 2025-12-31) para mejor compatibilidad."],
        ["   - RAM/Disco: Puede poner el número seguido de la unidad (Ej: 16 GB)."],
        [""],
        ["3. CÓMO SUBIR:"],
        ["   - Una vez lleno, guarde el archivo."],
        ["   - En el sistema web, haga clic en el botón 'Importar'."],
        ["   - Seleccione su archivo Excel y confirme la importación."],
        [""],
        ["4. RECOMENDACIÓN:"],
        ["   - Use la 'Ubicación' tal cual aparece en el sistema (ej. Corporativo) para que los filtros funcionen bien."]
    ];

    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wsInstr = XLSX.utils.aoa_to_sheet(instructions);

    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    wsInstr['!cols'] = [{ wch: 80 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.utils.book_append_sheet(wb, wsInstr, "COMO_SUBIR");

    XLSX.writeFile(wb, "Plantilla_Inventario_Servyre_V2.xlsx");
};

document.getElementById('importDataBtn').onclick = () => importInput.click();

importInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.inventory && imported.catalogs) {
                    inventory = imported.inventory;
                    catalogs = imported.catalogs;
                    saveToStorage();
                    location.reload();
                    alert('Base de datos restaurada correctamente.');
                }
            } catch (err) { alert('Error al procesar el archivo JSON.'); }
        };
        reader.readAsText(file);
    } else {
        // Advanced Excel Import
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            if (confirm(`Se han detectado ${json.length} registros. ¿Desea importarlos al inventario actual?`)) {
                let importedCount = 0;
                json.forEach(row => {
                    inventory.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        fullName: row['Nombre Completo'] || 'N/A',
                        location: row['Ubicación'] || 'Corporativo',
                        address: row['Direccion'] || '',
                        department: row['Departamento'] || 'General',
                        position: row['Puesto'] || '',
                        extension: row['Extension'] || '',
                        email: row['Correo'] || '',
                        resguardo: row['Resguardo'] || '',
                        deviceType: row['Equipo'] || 'Laptop',
                        brand: row['Marca'] || '',
                        model: row['Modelo'] || '',
                        serialNumber: row['Serie'] || 'SN-' + Date.now().toString().slice(-6),
                        mouseExternal: row['Mouse externo (Laptop)'] || '',
                        os: row['Sistema Operativo'] || '',
                        pcName: row['Nombre PC'] || '',
                        processor: row['Procesador'] || '',
                        ram: row['RAM'] || '8 GB',
                        storageCapacity: row['Disco duro'] || '256 GB SSD',
                        price: row['Precio unitario'] || '',
                        purchaseDate: row['Fecha de Compra'] || '',
                        periphBrand: row['Marca (Monitor/Accesorio)'] || '',
                        periphModel: row['Modelo (Monitor/Accesorio)'] || '',
                        periphSerial: row['Serie (Monitor/Accesorio)'] || '',
                        incidentReport: row['Reporte (Incidentes)'] || '',
                        lastMtto: row['Ultima Fecha de Mtto.'] || '',
                        nextMtto: row['Proxima Fecha de Mtto.'] || '',
                        conditions: row['Condiciones'] || '',
                        photos: row['Fotos'] || '',
                        status: 'Activo',
                        notes: ''
                    });
                    importedCount++;
                });
                saveToStorage();
                renderTable();
                alert(`¡Éxito! Se importaron ${importedCount} registros correctamente.`);
            }
        };
        reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
};

// --- EVENTS ---
brandInput.onchange = updateModelsDropdown;
catalogBrandSelect.onchange = renderCatalogItems;

inventoryForm.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    const itemData = {
        id: id || Date.now().toString(),
        location: locationInput.value,
        address: document.getElementById('address').value,
        department: document.getElementById('department').value,
        position: document.getElementById('position').value,
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        extension: document.getElementById('extension').value,
        resguardo: document.getElementById('resguardo').value,
        deviceType: document.getElementById('deviceType').value,
        brand: brandInput.value,
        model: modelInput.value,
        serialNumber: document.getElementById('serialNumber').value,
        os: document.getElementById('os').value,
        pcName: document.getElementById('pcName').value,
        processor: document.getElementById('processor').value,
        ram: document.getElementById('ram').value,
        storageCapacity: document.getElementById('storageCapacity').value,
        status: document.getElementById('status').value,
        mouseExternal: document.getElementById('mouseExternal').value,
        notes: document.getElementById('notes').value,
        // Added fields
        price: document.getElementById('price').value,
        purchaseDate: document.getElementById('purchaseDate').value,
        warranty: document.getElementById('warranty').value,
        periphBrand: document.getElementById('periphBrand').value,
        periphModel: document.getElementById('periphModel').value,
        periphSerial: document.getElementById('periphSerial').value,
        incidentReport: document.getElementById('incidentReport').value,
        lastMtto: document.getElementById('lastMtto').value,
        nextMtto: document.getElementById('nextMtto').value,
        conditions: document.getElementById('conditions').value,
        photos: document.getElementById('photos').value
    };

    if (id) {
        const idx = inventory.findIndex(i => i.id === id);
        inventory[idx] = itemData;
    } else {
        inventory.unshift(itemData);
    }

    saveToStorage(); renderTable();
    modalOverlay.classList.remove('active');
};

searchInput.oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderTable(inventory.filter(i =>
        i.fullName.toLowerCase().includes(q) ||
        i.serialNumber.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q)
    ));
};

// Global Actions
document.getElementById('addItemBtn').onclick = () => openEditForm();
document.getElementById('manageCatalogsBtn').onclick = () => { syncFormSelects(); catalogModalOverlay.classList.add('active'); };

document.getElementById('closeModal').onclick = () => modalOverlay.classList.remove('active');
document.getElementById('cancelBtn').onclick = () => modalOverlay.classList.remove('active');
document.getElementById('closeDetailModal').onclick = () => detailModalOverlay.classList.remove('active');
document.getElementById('closeCatalogModal').onclick = () => catalogModalOverlay.classList.remove('active');
document.getElementById('finishCatalogBtn').onclick = () => catalogModalOverlay.classList.remove('active');

// Add Catalog Items
document.getElementById('addBrandBtn').onclick = () => {
    const v = document.getElementById('newBrandInput').value.trim();
    if (v && !catalogs.brands.includes(v)) {
        catalogs.brands.push(v); catalogs.modelsByBrand[v] = [];
        document.getElementById('newBrandInput').value = '';
        saveToStorage(); syncFormSelects();
    }
};

document.getElementById('addModelBtn').onclick = () => {
    const b = catalogBrandSelect.value;
    const v = document.getElementById('newModelInput').value.trim();
    if (b && v && !catalogs.modelsByBrand[b].includes(v)) {
        catalogs.modelsByBrand[b].push(v);
        document.getElementById('newModelInput').value = '';
        saveToStorage(); syncFormSelects();
    }
};

document.getElementById('addLocationBtn').onclick = () => {
    const v = document.getElementById('newLocationInput').value.trim();
    if (v && !(catalogs.locations.sedes || []).includes(v)) {
        if (!catalogs.locations.sedes) catalogs.locations.sedes = [];
        catalogs.locations.sedes.push(v);
        document.getElementById('newLocationInput').value = '';
        saveToStorage(); syncFormSelects();
    }
};

document.getElementById('addLocationBtn2')?.addEventListener('click', () => {
    const v = document.getElementById('newLocationInput2').value.trim();
    if (v && !(catalogs.locations.externo || []).includes(v)) {
        if (!catalogs.locations.externo) catalogs.locations.externo = [];
        catalogs.locations.externo.push(v);
        document.getElementById('newLocationInput2').value = '';
        saveToStorage(); syncFormSelects();
    }
});

// --- THEME TOGGLE ---
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('servyre-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

themeToggle?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('servyre-theme', next);
});

window.switchCat = (id) => {
    document.querySelectorAll('.cat-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`cat-${id}`).style.display = 'block';
    event.currentTarget.classList.add('active');
};

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
};

// --- INITIALIZE ---
loadData();
console.log('Servyre IT Professional v2.0 - Advanced Data Management System Loaded.');
