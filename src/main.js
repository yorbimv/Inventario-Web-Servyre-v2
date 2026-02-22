import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import CryptoJS from 'crypto-js';
import { CONFIG } from './config.js';
import { sanitize, generateId } from './modules/utils.js';
import { renderDashboard } from './modules/dashboard.js';
import { initPremiumDashboard } from './modules/dashboard-premium.js';
import { initDashboardPersonalizado } from './modules/dashboard-personalizado.js';
import { elements } from './modules/ui.js';
import { exportExcel, exportJSON, exportCSV, exportPDF, generateDetailPdf, downloadTemplate, importData } from './modules/export.js';

// ============================================
// RIPPLE EFFECT - Premium Button Interactions
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', function(e) {
        const button = e.target.closest('.ripple, .premium-btn, .glass-btn, .action-btn, .save-btn, .cancel-btn, .filter-btn, .nav-tab, .dashboard-nav-btn');
        if (!button) return;
        
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple-wave';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        const existingRipple = button.querySelector('.ripple-wave');
        if (existingRipple) existingRipple.remove();
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Helper para分发 evento de actualización del inventario
const dispatchInventoryUpdate = () => {
    window.dispatchEvent(new CustomEvent('inventory-updated', { detail: { timestamp: Date.now() } }));
};
const MASTER_KEY = CONFIG.MASTER_KEY;
const STORAGE_KEY = CONFIG.STORAGE_KEY;

// Helper to safely add onclick handlers
const safeOnClick = (id, handler) => {
    const el = document.getElementById(id);
    if (el) el.onclick = handler;
};

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

// Data version constant
const DATA_VERSION = "2.0";

const saveToStorage = () => {
    const data = {
        version: DATA_VERSION,
        lastModified: new Date().toISOString(),
        inventory,
        catalogs
    };
    localStorage.setItem(STORAGE_KEY, encrypt(data));
    updateStats();
};

const loadData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const dec = decrypt(stored);
        if (dec) {
            // Handle migration from older versions
            if (!dec.version) {
                console.log("Migrating data from v1 to v2.0...");
                inventory = dec.inventory || [];
                catalogs = dec.catalogs || catalogs;
                // Save with new version after migration
                saveToStorage();
            } else {
                inventory = dec.inventory || [];
                catalogs = dec.catalogs || catalogs;
            }
        }
    }
    
    // Si no hay inventario, mostrar selector de ejemplos
    if (inventory.length === 0) {
        showExampleSelector();
        return; // No continuar hasta que seleccione un ejemplo
    }
    
    renderTable();
    updateStats();
    syncFormSelects();
    initDashboardPersonalizado(inventory, 'dashboardContainer');
}

function showExampleSelector() {
    const examples = [
        {
            id: 1,
            name: "Empresa Pequeña",
            description: "15 equipos - Uso mainly office",
            icon: "🏢",
            color: "#10B981"
        },
        {
            id: 2,
            name: "Empresa Mediana", 
            description: "30 equipos - Diversos departamentos",
            icon: "🏭",
            color: "#3B82F6"
        },
        {
            id: 3,
            name: "Empresa Grande",
            description: "50 equipos - Con mantenimientos",
            icon: "🏢",
            color: "#8B5CF6"
        },
        {
            id: 4,
            name: "Empresa con Problemas",
            description: "25 equipos - Muchos en mantenimiento",
            icon: "⚠️",
            color: "#F59E0B"
        },
        {
            id: 5,
            name: "Startup Tech",
            description: "20 equipos - Mayormente MacBooks",
            icon: "🚀",
            color: "#EC4899"
        }
    ];
    
    const modal = document.createElement('div');
    modal.id = 'exampleModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    
    modal.innerHTML = `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:2rem;max-width:700px;width:90%;max-height:90vh;overflow-y:auto;">
            <h2 style="text-align:center;margin-bottom:0.5rem;">
                <i data-lucide="database"></i> Selecciona un Ejemplo
            </h2>
            <p style="text-align:center;color:var(--text-muted);margin-bottom:2rem;">
                Elige un escenario predefinido para comenzar a probar el sistema
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;">
                ${examples.map(ex => `
                    <button onclick="loadExample(${ex.id})" style="
                        background:var(--card-bg);
                        border:2px solid var(--border);
                        border-radius:12px;
                        padding:1.5rem;
                        cursor:pointer;
                        transition:all 0.3s;
                        text-align:left;
                    " onmouseover="this.style.borderColor='var(--primary)';this.style.transform='translateY(-4px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
                        <div style="font-size:2rem;margin-bottom:0.5rem;">${ex.icon}</div>
                        <div style="font-weight:600;font-size:1rem;margin-bottom:0.25rem;color:var(--text);">${ex.name}</div>
                        <div style="font-size:0.8rem;color:var(--text-muted);">${ex.description}</div>
                    </button>
                `).join('')}
            </div>
            <div style="margin-top:2rem;text-align:center;">
                <button onclick="loadExample(0)" style="
                    background:transparent;
                    border:1px solid var(--border);
                    color:var(--text-muted);
                    padding:0.75rem 1.5rem;
                    border-radius:8px;
                    cursor:pointer;
                " onmouseover="this.style.borderColor='var(--text-muted)'" onmouseout="this.style.borderColor='var(--border)'">
                    Comenzar en blanco
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
}

function loadExample(exampleId) {
    const nombres = ["CARLOS", "MARÍA", "JOSÉ", "ANA", "LUIS", "PATRICIA", "JORGE", "ELENA", "FERNANDO", "SOFÍA", "MIGUEL", "ALEJANDRA", "ROBERTO", "CAROLINA", "DANIEL"];
    const apellidos = ["GARCÍA", "MARTÍNEZ", "LÓPEZ", "HERNÁNDEZ", "GONZÁLEZ", "PÉREZ", "RODRÍGUEZ", "SÁNCHEZ", "RAMÍREZ", "TORRES", "FLORES", "RIVERA", "GÓMEZ", "DÍAZ", "REYES"];
    const posiciones = ["GERENTE", "ANALISTA", "COORDINADOR", "DIRECTOR", "ESPECIALISTA", "ADMINISTRADOR", "SUPERVISOR", "CONSULTOR", "JEFE", "ASISTENTE", "TECNICO", "CONTADOR", "AUXILIAR", "COORDINADOR"];
    const areas = ["TI", "OPERACIONES", "FINANZAS", "RRHH", "VENTAS", "MARKETING", "LOGÍSTICA", "LEGAL", "ADMINISTRACIÓN", "CALIDAD", "COMPRAS", "PRODUCCIÓN"];
    const marcas = ["Dell", "HP", "Lenovo", "Apple", "Microsoft", "Asus", "Acer"];
    const modelos = {
        "Dell": ["Latitude 3420", "Latitude 5430", "Latitude 5540", "OptiPlex 7090", "Precision 3581", "Vostro 3520"],
        "HP": ["EliteDesk 800", "ProBook 450", "ZBook Firefly", "EliteBook 840", "ProBook 640", "Victus 15"],
        "Lenovo": ["ThinkPad X1", "ThinkCentre M70", "Legion 5 Pro", "IdeaPad Gaming", "ThinkBook 15", "Yoga 9i"],
        "Apple": ["MacBook Pro M2", "MacBook Pro M3", "MacBook Air M3", "iMac 24\"", "Mac Mini M2", "MacBook Air M1"],
        "Microsoft": ["Surface Pro 9", "Surface Laptop 5", "Surface Studio 2", "Surface Go 4"],
        "Asus": [" VivoBook 15", "ZenBook 14", "ROG Strix", "ExpertBook B1"],
        "Acer": ["Aspire 5", "Nitro 5", "Swift 3", "ConceptD 3"]
    };
    const ubicaciones = ["Corporativo", "Naucalpan", "Campo", "Sucursal Centro", "Sucursal Norte", "Warehouse"];
    const tipos = ["Laptop", "Desktop", "All-in-One", "Tablet", "Servidor"];
    const procesadores = ["Intel Core i5-1135G7", "Intel Core i7-1265U", "Intel Core i5-1235U", "Intel Core i9-13900H", "AMD Ryzen 5 5500U", "AMD Ryzen 7 6800U", "Apple M2", "Apple M3", "Intel Core i3-1215U"];
    const rams = ["8 GB", "16 GB", "32 GB", "64 GB"];
    const discos = ["256 GB SSD", "512 GB SSD", "1 TB SSD", "2 TB SSD"];
    const estados = ["Activo", "Mantenimiento", "Baja", "Cancelado", "Para piezas"];
    
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randomDate = (startYear = 2020, endYear = 2024) => {
        const start = new Date(startYear, 0, 1);
        const end = new Date(endYear, 11, 31);
        const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
        return date.toISOString().split('T')[0];
    };
    
    const config = {
        1: { count: 15, statusWeights: { Activo: 0.8, Mantenimiento: 0.1, Baja: 0.1 }, brandWeights: { Dell: 0.4, HP: 0.3, Lenovo: 0.2, Apple: 0.1 } },
        2: { count: 30, statusWeights: { Activo: 0.7, Mantenimiento: 0.15, Baja: 0.1, Cancelado: 0.05 }, brandWeights: { Dell: 0.35, HP: 0.25, Lenovo: 0.2, Apple: 0.1, Microsoft: 0.1 } },
        3: { count: 50, statusWeights: { Activo: 0.6, Mantenimiento: 0.25, Baja: 0.1, "Para piezas": 0.05 }, brandWeights: { Dell: 0.3, HP: 0.25, Lenovo: 0.2, Apple: 0.15, Microsoft: 0.1 } },
        4: { count: 25, statusWeights: { Activo: 0.35, Mantenimiento: 0.35, Baja: 0.2, "Para piezas": 0.1 }, brandWeights: { Dell: 0.3, HP: 0.35, Lenovo: 0.2, Asus: 0.1, Acer: 0.05 } },
        5: { count: 20, statusWeights: { Activo: 0.85, Mantenimiento: 0.1, Baja: 0.05 }, brandWeights: { Apple: 0.5, Dell: 0.2, Lenovo: 0.15, Microsoft: 0.15 } }
    };
    
    const getStatus = (weights) => {
        const r = Math.random();
        let cum = 0;
        for (const [status, weight] of Object.entries(weights)) {
            cum += weight;
            if (r < cum) return status;
        }
        return "Activo";
    };
    
    const getBrand = (weights) => {
        const r = Math.random();
        let cum = 0;
        for (const [brand, weight] of Object.entries(weights)) {
            cum += weight;
            if (r < cum) return brand;
        }
        return "Dell";
    };
    
    let inventory = [];
    const cfg = config[exampleId] || config[1];
    
    for (let i = 1; i <= cfg.count; i++) {
        const nombre = random(nombres);
        const apellido = random(apellidos);
        const marca = getBrand(cfg.brandWeights);
        const modelo = random(modelos[marca] || ["Generic"]);
        const ubicacion = random(ubicaciones);
        const fechaCompra = randomDate(2021, 2024);
        const estado = getStatus(cfg.statusWeights);
        const anioCompra = parseInt(fechaCompra.split('-')[0]);
        
        inventory.push({
            id: generateId(),
            resguardo: `SERV-${String(i + 1).padStart(4, '0')}`,
            fullName: `${nombre} ${apellido} ${random(apellidos)}`,
            position: `${random(posiciones)} DE ${random(areas)}`,
            email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@servyre.com`,
            extension: `${4000 + i}`,
            department: random(areas),
            address: ubicacion === "Corporativo" ? "TORRE CORPORATIVA PISO " + random([1,2,3,4,5,6,7,8]) : ubicacion === "Naucalpan" ? "PLANTA NAUCALPAN" : "EXTERNO",
            location: ubicacion,
            deviceType: random(tipos),
            brand: marca,
            model: modelo,
            serialNumber: `SN${marca.substring(0, 2).toUpperCase()}${anioCompra}${String(i).padStart(5, '0')}`,
            os: marca === "Apple" ? (Math.random() > 0.5 ? "macOS Sonoma" : "macOS Ventura") : "Windows 11 Pro",
            pcName: `${random(areas).substring(0, 2).toUpperCase()}-${nombre.substring(0, 3).toUpperCase()}-LT${String(i).padStart(2, '0')}`,
            processor: random(procesadores),
            ram: random(rams),
            storageCapacity: random(discos),
            status: estado,
            price: `$${(12000 + Math.floor(Math.random() * 45000)).toLocaleString()}.00`,
            purchaseDate: fechaCompra,
            warranty: estado === "Baja" ? 0 : 12 + Math.floor(Math.random() * 36),
            periphBrand: random(marcas),
            periphModel: `Monitor ${random([19,21,22,24,27,32])}" ${random(['HD','Full HD','4K'])}`,
            periphSerial: `MON-${String(i).padStart(5, '0')}`,
            mouseExternal: Math.random() > 0.2 ? `MOUSE-${String(i).padStart(5, '0')}` : "",
            lastMtto: estado === "Activo" ? randomDate(2023, 2024) : randomDate(2022, 2023),
            nextMtto: estado === "Activo" ? randomDate(2024, 2025) : "",
            conditions: estado === "Baja" ? "Equipo dado de baja por obsolescencia" : (estado === "Mantenimiento" ? "Equipo en taller para mantenimiento preventivo" : "Equipo en buenas condiciones de operación"),
            incidentReport: estado === "Mantenimiento" ? `Reporte #${Math.floor(Math.random() * 9999)} - Requiere servicio` : "",
            notes: `Ejemplo ${exampleId === 0 ? 'vacío' : 'predefinido #'+exampleId}`,
            photos: "",
            ipAddress: Math.random() > 0.3 ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : '',
            ipType: Math.random() > 0.5 ? 'DHCP' : 'IP Fija'
        });
    }
    
    // Cerrar modal y cargar inventario
    const modal = document.getElementById('exampleModal');
    if (modal) modal.remove();
    
    // Guardar directamente en localStorage con los datos generados
    alert(`Ejemplo #${exampleId} cargado con ${inventory.length} equipos`);
    const dataToSave = {
        version: "2.0",
        lastModified: new Date().toISOString(),
        inventory: inventory,
        catalogs: {
            departments: [...new Set(inventory.map(i => i.department))],
            locations: {
                sedes: ['Corporativo', 'Naucalpan'],
                externo: ['Campo', 'Sucursal Centro', 'Sucursal Norte', 'Warehouse']
            },
            brands: ['Dell', 'HP', 'Lenovo', 'Apple', 'Microsoft', 'Asus', 'Acer'],
            modelsByBrand: {
                "Dell": ["Latitude 3420", "Latitude 5430", "Latitude 5540", "OptiPlex 7090", "Precision 3581", "Vostro 3520"],
                "HP": ["EliteDesk 800", "ProBook 450", "ZBook Firefly", "EliteBook 840", "ProBook 640", "Victus 15"],
                "Lenovo": ["ThinkPad X1", "ThinkCentre M70", "Legion 5 Pro", "IdeaPad Gaming", "ThinkBook 15", "Yoga 9i"],
                "Apple": ["MacBook Pro M2", "MacBook Pro M3", "MacBook Air M3", "iMac 24\"", "Mac Mini M2", "MacBook Air M1"],
                "Microsoft": ["Surface Pro 9", "Surface Laptop 5", "Surface Studio 2", "Surface Go 4"],
                "Asus": ["VivoBook 15", "ZenBook 14", "ROG Strix", "ExpertBook B1"],
                "Acer": ["Aspire 5", "Nitro 5", "Swift 3", "ConceptD 3"]
            }
        }
    };
    localStorage.setItem(STORAGE_KEY, encrypt(dataToSave));
    
    // Recargar la página
    window.location.reload();
}

window.loadExample = loadExample;

// --- TAB NAVIGATION ---
let currentView = 'dashboard';

const switchToDashboard = () => {
    currentView = 'dashboard';
    document.getElementById('dashboardContainer').style.display = 'block';
    document.getElementById('inventorySection').style.display = 'none';
    
    // Update sidebar active state
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => item.classList.remove('active'));
    document.getElementById('tabDashboard')?.classList.add('active');
    
    // Update old nav-tabs (fallback)
    document.getElementById('tabDashboard')?.classList.add('active');
    document.getElementById('tabInventory')?.classList.remove('active');
    
    initDashboardPersonalizado(inventory, 'dashboardContainer');
};

const switchToInventory = () => {
    currentView = 'inventory';
    document.getElementById('dashboardContainer').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'block';
    
    // Update sidebar active state
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => item.classList.remove('active'));
    document.getElementById('tabInventory')?.classList.add('active');
    
    // Update old nav-tabs (fallback)
    document.getElementById('tabInventory')?.classList.add('active');
    document.getElementById('tabDashboard')?.classList.remove('active');
};

document.getElementById('tabDashboard')?.addEventListener('click', switchToDashboard);
document.getElementById('tabInventory')?.addEventListener('click', switchToInventory);

// Initialize
switchToDashboard();

// Ensure sidebar button has active class on load
document.getElementById('tabDashboard')?.classList.add('active');

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

        const sc = item.status === 'Activo' ? 'badge-green' 
            : item.status === 'Mantenimiento' ? 'badge-orange' 
            : item.status === 'Cancelado' ? 'badge-gray' 
            : item.status === 'Para piezas' ? 'badge-orange'
            : 'badge-danger';

        tr.innerHTML = `
            <td><code style="white-space: nowrap; font-size: 0.75rem; background: var(--card-bg); padding: 2px 6px; border-radius: 4px; color: var(--primary);">${sanitize(item.resguardo || '-')}</code></td>
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
            <td><span class="badge ${sc}">${sanitize(item.status || '-').toUpperCase()}</span></td>
            <td>${item.ipAddress ? `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                    <code style="font-size: 0.75rem;">${sanitize(item.ipAddress)}</code>
                    <span class="badge badge-blue" style="font-size: 0.6rem; padding: 0.2rem 0.4rem;">${sanitize(item.ipType || 'DHCP')}</span>
                </div>
            ` : '-'}</td>
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
                const deletedItem = {...item};
                inventory = inventory.filter(i => i.id !== item.id);
                saveToStorage(); renderTable();
                dispatchInventoryUpdate();
                setTimeout(() => window.addToHistory?.('delete', deletedItem), 100);
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
    const empty = (val) => val !== undefined && val !== null && String(val).trim() ? sanitize(val) : '<span class="empty-field">-</span>';
    const emptyText = (val) => val !== undefined && val !== null && String(val).trim() ? sanitize(val) : 'Sin registro';

detailModalBody.innerHTML = `
        <div class="asset-passport-premium animate__animated animate__zoomIn">
            <div class="id-card">
                <div class="id-card-left">
                    <div class="user-avatar-premium user-avatar-lg">${initials}</div>
                </div>
                <div class="id-card-right">
                    <div class="id-card-header">
                        <span class="id-name">${sanitize(item.fullName)}</span>
                        <span class="badge ${item.status === 'Activo' ? 'badge-green' : item.status === 'Mantenimiento' ? 'badge-orange' : item.status === 'Cancelado' ? 'badge-gray' : item.status === 'Para piezas' ? 'badge-orange' : 'badge-danger'}">${sanitize(item.status || '-').toUpperCase()}</span>
                    </div>
                    <div class="id-position">${sanitize(item.position)}</div>
                    <div class="id-contact">
                        <span>${item.email ? item.email.toLowerCase() : '-'}</span>
                        <span>${empty(item.location)} ${item.address ? ' > ' + empty(item.address) : ''}</span>
                    </div>
                </div>
                <div class="id-card-resguardo">
                    <span class="resguardo-label-card">RESGUARDO</span>
                    <span class="resguardo-value-card">${sanitize(item.resguardo || 'PENDIENTE')}</span>
                </div>
            </div>
            
            <div class="equipo-bar">
                <i data-lucide="laptop"></i>
                <span class="equipo-name">${empty(item.deviceType)} ${empty(item.brand)} ${empty(item.model)}</span>
                <span class="equipo-details">
                    SN: ${empty(item.serialNumber)} | Host: ${empty(item.pcName)} | ${empty(item.processor)} | ${empty(item.ram)} | ${empty(item.storageCapacity)} | IP: ${empty(item.ipAddress)}
                </span>
            </div>
                <div class="summary-contact">
                    <span>${item.email ? item.email.toLowerCase() : '-'}</span>
                    <span class="summary-ubicacion">${empty(item.location)}${item.address ? ' > ' + empty(item.address) : ''}</span>
                </div>
            </div>
            
            <div class="summary-equipo">
                <i data-lucide="laptop"></i>
                <span class="equipo-full">${empty(item.deviceType)} ${empty(item.brand)} ${empty(item.model)}</span>
                <span class="equipo-specs-inline">
                    <span>SN: ${empty(item.serialNumber)}</span>
                    <span>|</span>
                    <span>Host: ${empty(item.pcName)}</span>
                    <span>|</span>
                    <span>${empty(item.ram)}</span>
                    <span>|</span>
                    <span>${empty(item.storageCapacity)}</span>
                    <span>|</span>
                    <span>${empty(item.ipAddress)}</span>
                </span>
            </div>
                            <div class="key-field">
                                <span class="key-label">División</span>
                                <span class="key-value">${empty(item.address)}</span>
                            </div>
                        </div>
                        <div class="key-field-row">
                            <div class="key-field">
                                <span class="key-label">Correo</span>
                                <span class="key-value key-email">${item.email ? item.email.toLowerCase() : '-'}</span>
                            </div>
                            <div class="key-field key-field-resguardo">
                                <span class="key-label">Resguardo</span>
                                <span class="key-value">${sanitize(item.resguardo || 'PENDIENTE')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem;">
                        <span class="badge ${item.status === 'Activo' ? 'badge-green' : item.status === 'Mantenimiento' ? 'badge-orange' : item.status === 'Cancelado' ? 'badge-gray' : item.status === 'Para piezas' ? 'badge-orange' : 'badge-danger'}" style="font-size: 0.9rem; padding: 0.5rem 1.5rem;">${sanitize(item.status || '-').toUpperCase()}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-categories">
                <!-- SECCIÓN 1: IDENTIFICACIÓN -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="id-card"></i> Identificación</h3>
                    <div class="detail-grid">
                        <div class="info-card highlight-card">
                            <label>N° Resguardo</label>
                            <div class="value value-large">${sanitize(item.resguardo || 'PENDIENTE')}</div>
                        </div>
                        <div class="info-card">
                            <label>Serie</label>
                            <div class="value">${empty(item.serialNumber)}</div>
                        </div>
                        <div class="info-card">
                            <label>Estado</label>
                            <div class="value"><span class="status-badge" data-value="${item.status}">${empty(item.status)}</span></div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 2: USUARIO -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="users"></i> Usuario Asignado</h3>
                    <div class="detail-grid">
                        <div class="info-card">
                            <label>Nombre Completo</label>
                            <div class="value">${empty(item.fullName)}</div>
                        </div>
                        <div class="info-card">
                            <label>Puesto</label>
                            <div class="value">${empty(item.position)}</div>
                        </div>
                        <div class="info-card">
                            <label>Correo</label>
                            <div class="value">${empty(item.email)}</div>
                        </div>
                        <div class="info-card">
                            <label>Extensión</label>
                            <div class="value">${empty(item.extension)}</div>
                        </div>
                        <div class="info-card">
                            <label>Departamento</label>
                            <div class="value">${empty(item.department)}</div>
                        </div>
                        <div class="info-card">
                            <label>Ubicación</label>
                            <div class="value">${empty(item.location)}</div>
                        </div>
                        <div class="info-card full-width">
                            <label>Dirección</label>
                            <div class="value">${empty(item.address)}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 3: EQUIPO -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="cpu"></i> Especificaciones del Equipo</h3>
                    <div class="detail-grid">
                        <div class="info-card">
                            <label>Tipo de Equipo</label>
                            <div class="value">${empty(item.deviceType)}</div>
                        </div>
                        <div class="info-card">
                            <label>Marca</label>
                            <div class="value">${empty(item.brand)}</div>
                        </div>
                        <div class="info-card">
                            <label>Modelo</label>
                            <div class="value">${empty(item.model)}</div>
                        </div>
                        <div class="info-card">
                            <label>Nombre PC/Host</label>
                            <div class="value">${empty(item.pcName)}</div>
                        </div>
                        <div class="info-card">
                            <label>Sistema Operativo</label>
                            <div class="value">${empty(item.os)}</div>
                        </div>
                        <div class="info-card">
                            <label>Procesador</label>
                            <div class="value">${empty(item.processor)}</div>
                        </div>
                        <div class="info-card">
                            <label>RAM</label>
                            <div class="value">${empty(item.ram)}</div>
                        </div>
                        <div class="info-card">
                            <label>Almacenamiento</label>
                            <div class="value">${empty(item.storageCapacity)}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 4: ACCESORIOS -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="monitor"></i> Accesorios</h3>
                    <div class="detail-grid">
                        <div class="info-card">
                            <label>Mouse</label>
                            <div class="value">${empty(item.mouseExternal)}</div>
                        </div>
                        <div class="info-card">
                            <label>Marca Monitor</label>
                            <div class="value">${empty(item.periphBrand)}</div>
                        </div>
                        <div class="info-card">
                            <label>Modelo Monitor</label>
                            <div class="value">${empty(item.periphModel)}</div>
                        </div>
                        <div class="info-card">
                            <label>Serie Monitor</label>
                            <div class="value">${empty(item.periphSerial)}</div>
                        </div>
                        <div class="info-card">
                            <label>Adaptador HDMI</label>
                            <div class="value">${empty(item.hdmiAdapter)}</div>
                        </div>
                        <div class="info-card full-width">
                            <label>Otro Accesorio</label>
                            <div class="value">${empty(item.otroAccesorio)}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 5: RED -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="wifi"></i> Configuración de Red</h3>
                    <div class="detail-grid">
                        <div class="info-card">
                            <label>Dirección IP</label>
                            <div class="value"><code>${empty(item.ipAddress)}</code></div>
                        </div>
                        <div class="info-card">
                            <label>Tipo de IP</label>
                            <div class="value">${empty(item.ipType)}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 6: ADMINISTRATIVO -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="dollar-sign"></i> Datos Administrativos</h3>
                    <div class="detail-grid">
                        <div class="info-card">
                            <label>Precio Unitario</label>
                            <div class="value">${empty(item.price)}</div>
                        </div>
                        <div class="info-card">
                            <label>Fecha de Compra</label>
                            <div class="value">${empty(item.purchaseDate)}</div>
                        </div>
                        <div class="info-card">
                            <label>Garantía (meses)</label>
                            <div class="value">${empty(item.warranty)}</div>
                        </div>
                        <div class="info-card">
                            <label>Fecha Fin Garantía</label>
                            <div class="value">${sanitize(item.purchaseDate ? (() => {
                                const p = new Date(item.purchaseDate);
                                const w = parseInt(item.warranty) || 12;
                                p.setMonth(p.getMonth() + w);
                                return p.toISOString().split('T')[0];
                            })() : '-')}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 7: MANTENIMIENTO -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="wrench"></i> Mantenimiento</h3>
                    <div class="detail-grid">
                        <div class="info-card">
                            <label>Último Mantenimiento</label>
                            <div class="value">${empty(item.lastMtto)}</div>
                        </div>
                        <div class="info-card">
                            <label>Próximo Mantenimiento</label>
                            <div class="value" style="color: var(--primary);">${empty(item.nextMtto)}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 8: NOTAS -->
                <div class="detail-section">
                    <h3 class="section-title"><i data-lucide="file-text"></i> Notas y Documentación</h3>
                    <div class="detail-grid">
                        <div class="info-card full-width">
                            <label>Condiciones del Equipo</label>
                            <div class="value value-text">${emptyText(item.conditions)}</div>
                        </div>
                        <div class="info-card full-width">
                            <label>Reporte de Incidentes</label>
                            <div class="value value-text">${emptyText(item.incidentReport)}</div>
                        </div>
                        <div class="info-card full-width">
                            <label>Observaciones Adicionales</label>
                            <div class="value value-text">${emptyText(item.notes)}</div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 9: FOTOS -->
                <div class="detail-section photos-section">
                    <h3 class="section-title"><i data-lucide="image"></i> Fotos / Documentos</h3>
                    <div class="photos-grid">
                        ${(() => {
                            const photos = item.photos ? item.photos.split(',').map(p => p.trim()).filter(p => p) : [];
                            if (photos.length === 0) {
                                return '<div class="no-photos"><i data-lucide="image-off"></i><p>No hay fotos registradas</p></div>';
                            }
                            return photos.map((photo, idx) => `
                                <a href="${photo}" target="_blank" class="photo-thumbnail" title="Abrir en OneDrive">
                                    <div class="thumbnail-placeholder">
                                        <i data-lucide="link"></i>
                                        <span>Foto ${idx + 1}</span>
                                    </div>
                                </a>
                            `).join('');
                        })()}
                    </div>
                </div>
            </div>
            
            <!-- Historial de Usuarios -->
            ${(() => {
                const history = item.userHistory || [];
                if (history.length === 0) return '';
                
                return `
                    <div class="user-history-section" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); grid-column: span 2;">
                        <h3 style="margin-bottom: 1rem; color: var(--text-dim); display: flex; align-items: center; gap: 0.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            Historial de Usuarios
                        </h3>
                        <div class="history-table-container" style="overflow-x: auto;">
                            <table class="history-table" style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                                <thead>
                                    <tr style="background: var(--card-bg);">
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">Usuario</th>
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">Fecha Alta</th>
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">Fecha Baja</th>
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">Estado</th>
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">Modelo</th>
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">RAM</th>
                                        <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border); color: var(--text-dim);">Disco</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(h => `
                                        <tr style="${h.isCurrent ? 'background: rgba(16, 185, 129, 0.1);' : ''}">
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">
                                                <span style="font-weight: 600;">${sanitize(h.fullName || '-')}</span>
                                            </td>
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">${sanitize(h.startDate || '-')}</td>
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">${sanitize(h.endDate || 'Actual')}</td>
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">
                                                <span class="badge ${h.isCurrent ? 'badge-green' : 'badge-gray'}" style="font-size: 0.65rem;">
                                                    ${h.isCurrent ? 'Actual' : 'Histórico'}
                                                </span>
                                            </td>
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">${sanitize(h.specs?.model || '-')}</td>
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">${sanitize(h.specs?.ram || '-')}</td>
                                            <td style="padding: 0.75rem; border-bottom: 1px solid var(--border-light);">${sanitize(h.specs?.storage || '-')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            })()}
            
            <!-- Historial de Actividad (Activity Log) -->
            ${(() => {
                const activityLog = item.activityLog || [];
                if (activityLog.length === 0) return '';
                
                return `
                    <div class="activity-log-section">
                        <h3>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Historial de Actividad
                        </h3>
                        <div class="activity-log-list">
                            ${activityLog.map(log => {
                                const display = formatActivityLogForDisplay(log);
                                return `
                                    <div class="activity-log-item">
                                        <div class="activity-log-icon ${display.iconClass}">${display.icon}</div>
                                        <div class="activity-log-content">
                                            <div class="activity-log-description">${display.description}</div>
                                            <div class="activity-log-meta">${display.date} a las ${display.time}</div>
                                            ${display.fieldLabel ? `<span class="activity-log-field">${display.fieldLabel}</span>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            })()}
        </div>
    `;

    detailModalOverlay.classList.add('active');

    // Inicializar iconos Lucide
    if (window.lucide) window.lucide.createIcons();

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
    
    // Botón Eliminar
    document.getElementById('deleteFromDetailBtn').onclick = () => {
        const resguardo = item.resguardo || item.serialNumber || 'este activo';
        if (confirm(`¿Está seguro de eliminar el activo "${item.fullName || resguardo}"?\n\nSerie: ${item.serialNumber}\nResguardo: ${item.resguardo || 'N/A'}\n\n⚠️ Esta acción no se puede deshacer.`)) {
            // Agregar log de eliminación antes de eliminar
            addActivityLog(item, 'DELETE', null, null, null);
            
            // Guardar el log antes de eliminar (necesario porque después el item ya no existe)
            const logSaved = { ...item };
            
            inventory = inventory.filter(i => i.id !== item.id);
            saveToStorage();
            renderTable();
            detailModalOverlay.classList.remove('active');
            dispatchInventoryUpdate();
            setTimeout(() => window.addToHistory?.('delete', logSaved), 100);
            
            showNotification(`Registro eliminado: ${resguardo}`, 'warning');
        }
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
            document.getElementById('warranty').value = i.warranty || '';
            document.getElementById('warrantyEndDate').value = i.warrantyEndDate || '';
            document.getElementById('hdmiAdapter').value = i.hdmiAdapter || '';
            const otroCheck = document.getElementById('otroAccesorioCheck');
            const otroInput = document.getElementById('otroAccesorio');
            if (otroCheck && otroInput && i.otroAccesorio) {
                otroCheck.checked = true;
                otroInput.style.display = 'block';
                otroInput.value = i.otroAccesorio;
            }
            document.getElementById('periphBrand').value = i.periphBrand || '';
            document.getElementById('periphModel').value = i.periphModel || '';
            document.getElementById('periphSerial').value = i.periphSerial || '';
            document.getElementById('incidentReport').value = i.incidentReport || '';
            document.getElementById('lastMtto').value = i.lastMtto || '';
            document.getElementById('nextMtto').value = i.nextMtto || '';
            document.getElementById('conditions').value = i.conditions || '';
            document.getElementById('photos').value = i.photos || '';
            document.getElementById('notes').value = i.notes || '';
            
            // Campos de Red
            document.getElementById('ipAddress').value = i.ipAddress || '';
            document.getElementById('ipType').value = i.ipType || '';
            
            // Recalcular días de garantía
            if (window.updateWarrantyDays) {
                window.updateWarrantyDays();
            }
        }
    } else {
        modelInput.disabled = true;
    }
    modalOverlay.classList.add('active');
};

window.openEditForm = openEditForm;

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

// Botón Guardar en Disco (Exportar JSON)
const saveDiskBtn = document.getElementById('saveDiskBtn');
if (saveDiskBtn) {
    saveDiskBtn.onclick = () => {
        const data = {
            version: "2.0",
            exportDate: new Date().toISOString(),
            inventory: inventory,
            catalogs: catalogs
        };
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Servyre_Inventario_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        // Mostrar notificación
        showNotification('Datos guardados en disco correctamente', 'success');
    };
}

// Botón Abrir desde Disco (Importar JSON)
const openDiskBtn = document.getElementById('openDiskBtn');
if (openDiskBtn) {
    openDiskBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data.inventory) {
                            inventory = data.inventory;
                            if (data.catalogs) catalogs = data.catalogs;
                            saveToStorage();
                            renderTable();
                            updateStats();
                            showNotification('Datos cargados desde disco correctamente', 'success');
                        } else {
                            showNotification('El archivo no contiene datos válidos', 'error');
                        }
                    } catch (err) {
                        showNotification('Error al leer el archivo: ' + err.message, 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };
}

// Botón Exportar Backup
const exportBackupBtn = document.getElementById('exportBackupBtn');
if (exportBackupBtn) {
    exportBackupBtn.onclick = () => {
        const dataStr = JSON.stringify({ inventory, catalogs }, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Resguardo_IT_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Backup exportado correctamente', 'success');
    };
}

// Función para mostrar notificaciones premium
function showNotification(message, type = 'info') {
    console.log('showNotification llamada:', message, type);
    
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const titles = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 100%);
        border: 1px solid ${colors[type]};
        border-left: 4px solid ${colors[type]};
        border-radius: 12px;
        padding: 16px 20px;
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        animation: slideInRight 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    
    toast.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${colors[type]}20; display: flex; align-items: center; justify-content: center; color: ${colors[type]}; font-weight: bold; font-size: 16px; flex-shrink: 0;">
            ${icons[type]}
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 14px; color: ${colors[type]}; margin-bottom: 2px;">${titles[type]}</div>
            <div style="font-size: 13px; color: #e0e0e0;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #888; cursor: pointer; font-size: 18px; padding: 4px;">✕</button>
    `;

    container.appendChild(toast);
    console.log('Toast creado y añadido');

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 8000);
}

// Agregar animaciones si no existen
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// SISTEMA DE ACTIVITY LOG (Historial de cambios)
// ============================================================================
function generateLogId() {
    return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function addActivityLog(item, action, fieldChanged = null, oldValue = null, newValue = null) {
    if (!item.activityLog) {
        item.activityLog = [];
    }
    
    const logEntry = {
        id: generateLogId(),
        timestamp: new Date().toISOString(),
        action: action,
        fieldChanged: fieldChanged,
        oldValue: oldValue,
        newValue: newValue
    };
    
    // Agregar al inicio del array (más reciente primero)
    item.activityLog.unshift(logEntry);
    
    // Mantener solo los últimos 10 registros
    if (item.activityLog.length > 10) {
        item.activityLog = item.activityLog.slice(0, 10);
    }
    
    return logEntry;
}

function formatActivityLogForDisplay(logEntry) {
    const date = new Date(logEntry.timestamp);
    const dateStr = date.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    const timeStr = date.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const icons = {
        'CREATE': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        'UPDATE': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        'DELETE': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
    };
    
    const fieldLabels = {
        'status': 'Estado',
        'fullName': 'Usuario',
        'location': 'Ubicación',
        'brand': 'Marca',
        'model': 'Modelo',
        'serialNumber': 'Serie',
        'resguardo': 'Resguardo',
        'department': 'Departamento',
        'position': 'Puesto',
        'deviceType': 'Tipo equipo',
        'price': 'Precio',
        'purchaseDate': 'Fecha compra',
        'warranty': 'Garantía',
        'ipAddress': 'IP'
    };
    
    let description = '';
    
    if (logEntry.action === 'CREATE') {
        description = 'Registro creado';
    } else if (logEntry.action === 'DELETE') {
        description = 'Registro eliminado';
    } else if (logEntry.action === 'UPDATE' && logEntry.fieldChanged) {
        const fieldLabel = fieldLabels[logEntry.fieldChanged] || logEntry.fieldChanged;
        description = `Cambio en ${fieldLabel}`;
        if (logEntry.oldValue && logEntry.newValue) {
            description += `: ${logEntry.oldValue} → ${logEntry.newValue}`;
        }
    }
    
    return {
        icon: icons[logEntry.action],
        iconClass: logEntry.action.toLowerCase(),
        description: description,
        date: dateStr,
        time: timeStr,
        fieldLabel: logEntry.fieldChanged ? (fieldLabels[logEntry.fieldChanged] || logEntry.fieldChanged) : null
    };
}

// ============================================================================
// SISTEMA DE GARANTÍA EXTENDIDA
// ============================================================================
function calculateWarrantyInfo(purchaseDate, warrantyMonths) {
    if (!purchaseDate || !warrantyMonths) {
        return { endDate: null, daysRemaining: null, status: 'unknown' };
    }
    
    const purchase = new Date(purchaseDate);
    const endDate = new Date(purchase);
    endDate.setMonth(endDate.getMonth() + parseInt(warrantyMonths));
    
    const today = new Date();
    const diffTime = endDate - today;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status = 'valid';
    if (daysRemaining < 0) {
        status = 'expired';
    } else if (daysRemaining <= 30) {
        status = 'warning';
    }
    
    return {
        endDate: endDate.toISOString().split('T')[0],
        daysRemaining: daysRemaining,
        status: status
    };
}

function renderWarrantyBadge(purchaseDate, warrantyMonths) {
    const info = calculateWarrantyInfo(purchaseDate, warrantyMonths);
    
    if (!info.endDate) {
        return '<span class="warranty-badge" style="background: var(--card-bg); color: var(--text-muted);">Sin garantía</span>';
    }
    
    const statusLabels = {
        'valid': 'Vigente',
        'expired': 'Vencida',
        'warning': 'Por vencer'
    };
    
    const badgeHtml = `
        <span class="warranty-badge ${info.status}">
            ${info.status === 'valid' ? '✓' : info.status === 'warning' ? '⚠' : '✕'}
            ${statusLabels[info.status]}
        </span>
    `;
    
    const daysText = info.daysRemaining > 0 
        ? `${info.daysRemaining} días restantes` 
        : `Hace ${Math.abs(info.daysRemaining)} días`;
    
    return `
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            ${badgeHtml}
            <span class="warranty-days">${daysText}</span>
        </div>
    `;
}

// ============================================================================
// CÓDIGO PRINCIPAL - Se ejecuta después de DOMContentLoaded
// ============================================================================

searchInput.oninput = (e) => {
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

document.getElementById('importDataBtn').onclick = () => {
    const currentCount = inventory.length;
    const mensaje = `IMPORTAR DATOS

Esta accion importara datos desde un archivo Excel (.xlsx/.xls) o JSON.

- Los registros se AGREGARAN al inventario existente
- Los datos actuales NO seran eliminados
- Inventario actual: ${currentCount} registros

¿Desea continuar?`;

    if (confirm(mensaje)) {
        importInput.click();
    }
};

importInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.inventory) {
                    // Agregar o actualizar registros
                    const beforeCount = inventory.length;
                    let newCount = 0;
                    let updateCount = 0;
                    
                    imported.inventory.forEach(item => {
                        const index = inventory.findIndex(i => i.id === item.id);
                        if (index >= 0) {
                            // Actualizar registro existente (no hacer nada)
                            updateCount++;
                        } else {
                            // Agregar nuevo registro
                            inventory.push(item);
                            newCount++;
                        }
                    });
                    const afterCount = inventory.length;
                    saveToStorage();
                    renderTable();
                    updateStats();
                    
                    let msg = '';
                    if (newCount > 0) msg += `${newCount} nuevo(s) `;
                    if (updateCount > 0) msg += `${updateCount} existente(s) no modificado(s)`;
                    showNotification(`Importacion completada. ${msg}. Total: ${afterCount}`, 'success');
                } else {
                    showNotification('El archivo JSON no contiene inventario valido', 'error');
                }
            } catch (err) { 
                showNotification('Error al procesar el archivo JSON: ' + err.message, 'error'); 
            }
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
                        notes: '',
                        ipAddress: row['IP'] || '',
                        ipType: row['Tipo IP'] || ''
                    });
                    importedCount++;
                });
                saveToStorage();
                renderTable();
                dispatchInventoryUpdate();
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
        warrantyEndDate: document.getElementById('warrantyEndDate')?.value || '',
        hdmiAdapter: document.getElementById('hdmiAdapter')?.value || '',
        otroAccesorio: document.getElementById('otroAccesorio')?.value || '',
        periphBrand: document.getElementById('periphBrand').value,
        periphModel: document.getElementById('periphModel').value,
        periphSerial: document.getElementById('periphSerial').value,
        incidentReport: document.getElementById('incidentReport').value,
        lastMtto: document.getElementById('lastMtto').value,
        nextMtto: document.getElementById('nextMtto').value,
        conditions: document.getElementById('conditions').value,
        photos: document.getElementById('photos').value,
        // Campos de Red
        ipAddress: document.getElementById('ipAddress').value,
        ipType: document.getElementById('ipType').value
    };

    if (id) {
        const idx = inventory.findIndex(i => i.id === id);
        const oldItem = inventory[idx];
        const oldStatus = oldItem?.status;
        const newStatus = itemData.status;
        const resguardoLabel = itemData.resguardo || itemData.serialNumber || 'registro';
        
        // Detectar cambio de estado - mostrar solo UNA notificación
        const displayResguardo = resguardoLabel || 'Sin resguardo';
        if (oldStatus && oldStatus !== newStatus) {
            showNotification(`${displayResguardo}: Estado ${oldStatus} → ${newStatus}`, 'warning');
        } else {
            showNotification(`Registro actualizado: ${displayResguardo}`, 'info');
        }
        
        // Detectar cambio de usuario y registrar en historial
        if (oldItem && oldItem.fullName !== itemData.fullName) {
            const today = new Date().toISOString().split('T')[0];
            
            // Inicializar historial si no existe
            if (!oldItem.userHistory) {
                oldItem.userHistory = [];
            }
            
            // Cerrar el registro anterior del usuario
            if (oldItem.userHistory.length > 0) {
                const lastEntry = oldItem.userHistory[oldItem.userHistory.length - 1];
                if (lastEntry.isCurrent) {
                    lastEntry.endDate = today;
                    lastEntry.isCurrent = false;
                }
            }
            
            // Agregar nuevo registro de usuario
            const newEntry = {
                fullName: itemData.fullName,
                startDate: today,
                endDate: null,
                isCurrent: true,
                specs: {
                    model: itemData.model,
                    ram: itemData.ram,
                    storage: itemData.storageCapacity
                }
            };
            itemData.userHistory = [...(oldItem.userHistory || []), newEntry];
        } else if (oldItem && oldItem.userHistory) {
            // Actualizar specs si el usuario es el mismo pero cambiaron las specs
            itemData.userHistory = oldItem.userHistory;
        }
        
        // DETECTAR CAMBIOS PARA EL LOG DE ACTIVIDAD
        if (oldItem) {
            const fieldsToTrack = ['status', 'fullName', 'location', 'brand', 'model', 'serialNumber', 'resguardo', 'department', 'position', 'deviceType', 'price', 'purchaseDate', 'warranty', 'ipAddress'];
            
            fieldsToTrack.forEach(field => {
                if (oldItem[field] !== itemData[field]) {
                    addActivityLog(oldItem, 'UPDATE', field, oldItem[field], itemData[field]);
                }
            });
        }
        
        // Copiar el activityLog del item anterior
        itemData.activityLog = oldItem?.activityLog || [];
        
        inventory[idx] = itemData;
        setTimeout(() => window.addToHistory?.('update', itemData, oldItem), 100);
    } else {
        // Para nuevos registros, inicializar historial con el primer usuario
        const today = new Date().toISOString().split('T')[0];
        itemData.userHistory = [{
            fullName: itemData.fullName,
            startDate: today,
            endDate: null,
            isCurrent: true,
            specs: {
                model: itemData.model,
                ram: itemData.ram,
                storage: itemData.storageCapacity
            }
        }];
        
        // Inicializar log de actividad para nuevo registro
        itemData.activityLog = [];
        addActivityLog(itemData, 'CREATE', null, null, null);
        
        // Mostrar notificación de nuevo registro
        const resguardoLabel = itemData.resguardo || itemData.serialNumber || 'registro';
        showNotification(`Nuevo equipo registrado: ${resguardoLabel}`, 'success');
        
        inventory.unshift(itemData);
        setTimeout(() => window.addToHistory?.('create', itemData), 100);
    }

    saveToStorage(); renderTable();
    modalOverlay.classList.remove('active');
};

// Función para mostrar alerta de cambio de estado (usando notificaciones flotantes)
function showStatusChangeAlert(oldStatus, newStatus, itemName) {
    const statusColors = {
        'Activo': '#10B981',
        'Mantenimiento': '#F59E0B',
        'Baja': '#EF4444',
        'Cancelado': '#6B7280',
        'Para piezas': '#F97316'
    };
    
    const message = `${oldStatus} → ${newStatus} (${itemName || 'Equipo'})`;
    
    // Usar showNotification para consistencia con las demás alertas
    showNotification(`Estado actualizado: ${message}`, 'info');
    
    // Guardar cambio de estado en localStorage
    const statusChanges = JSON.parse(localStorage.getItem('statusChanges')) || [];
    statusChanges.push({
        oldStatus,
        newStatus,
        itemName,
        timestamp: new Date().toISOString()
    });
    // Mantener solo los últimos 10 cambios
    if (statusChanges.length > 10) {
        statusChanges.splice(0, statusChanges.length - 10);
    }
    localStorage.setItem('statusChanges', JSON.stringify(statusChanges));
}

// Función para mostrar alerta de modificación exitosa
function showModificationAlert(serialNumber) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(16, 185, 129, 0.95);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
        color: white;
    `;
    
    alertDiv.innerHTML = `
        <button onclick="this.parentElement.remove()" style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: white;
            opacity: 0.7;
            cursor: pointer;
            font-size: 1.2rem;
            line-height: 1;
            padding: 0;
        ">&times;</button>
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
                <div style="font-weight: 600; font-size: 0.9rem;">Registro actualizado</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">Serie: ${serialNumber || 'N/A'}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

// Función para mostrar alerta de nuevo registro
function showNewRecordAlert(serialNumber) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(59, 130, 246, 0.95);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);
        color: white;
    `;
    
    alertDiv.innerHTML = `
        <button onclick="this.parentElement.remove()" style="
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: white;
            opacity: 0.7;
            cursor: pointer;
            font-size: 1.2rem;
            line-height: 1;
            padding: 0;
        ">&times;</button>
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <div>
                <div style="font-weight: 600; font-size: 0.9rem;">Nuevo registro agregado</div>
                <div style="font-size: 0.75rem; opacity: 0.9;">Serie: ${serialNumber || 'N/A'}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-remover después de 3 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
}

searchInput.oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderTable(inventory.filter(i =>
        i.fullName.toLowerCase().includes(q) ||
        i.serialNumber.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q)
    ));
};

// Global Actions - moved to initApp()

// Toggle Otro Accesorio
window.toggleOtroAccesorio = () => {
    const checkbox = document.getElementById('otroAccesorioCheck');
    const input = document.getElementById('otroAccesorio');
    if (checkbox && input) {
        input.style.display = checkbox.checked ? 'block' : 'none';
        if (!checkbox.checked) input.value = '';
    }
};

// Calculate Warranty End Date
window.calculateWarrantyEnd = () => {
    const purchaseDate = document.getElementById('purchaseDate')?.value;
    const warrantyMonths = document.getElementById('warranty')?.value;
    
    if (purchaseDate && warrantyMonths) {
        const start = new Date(purchaseDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + parseInt(warrantyMonths));
        
        const endDateInput = document.getElementById('warrantyEndDate');
        if (endDateInput) {
            endDateInput.value = end.toISOString().split('T')[0];
        }
        
        window.updateWarrantyDays();
    }
};

// Carousel Functions
window.moveCarousel = (carouselId, direction) => {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dots = carousel.parentElement.querySelectorAll('.dot');
    let currentIndex = 0;
    
    slides.forEach((slide, idx) => {
        if (slide.style.display === 'block') currentIndex = idx;
    });
    
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = slides.length - 1;
    if (newIndex >= slides.length) newIndex = 0;
    
    window.goToSlide(carouselId, newIndex);
};

window.goToSlide = (carouselId, index) => {
    const carousel = document.getElementById(carouselId);
    if (!carousel) return;
    
    const slides = carousel.querySelectorAll('.carousel-slide');
    const dots = carousel.parentElement.querySelectorAll('.dot');
    
    slides.forEach((slide, idx) => {
        slide.style.display = idx === index ? 'block' : 'none';
        slide.classList.toggle('active', idx === index);
    });
    
    dots.forEach((dot, idx) => {
        dot.style.opacity = idx === index ? '1' : '0.5';
        dot.style.background = idx === index ? 'var(--primary)' : 'var(--text-dim)';
    });
};

// Update Warranty Days Display
window.updateWarrantyDays = () => {
    const endDateInput = document.getElementById('warrantyEndDate');
    const badge = document.getElementById('warrantyDaysRemaining');
    
    if (!endDateInput || !badge || !endDateInput.value) return;
    
    const end = new Date(endDateInput.value);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) {
        badge.textContent = `Vencida (${Math.abs(diff)} días)`;
        badge.style.background = 'rgba(255, 69, 58, 0.2)';
        badge.style.color = '#FF453A';
    } else if (diff <= 30) {
        badge.textContent = `${diff} días`;
        badge.style.background = 'rgba(255, 159, 10, 0.2)';
        badge.style.color = '#FF9F0A';
    } else if (diff <= 90) {
        badge.textContent = `${diff} días`;
        badge.style.background = 'rgba(255, 149, 0, 0.2)';
        badge.style.color = '#FF9500';
    } else {
        badge.textContent = `${diff} días`;
        badge.style.background = 'rgba(52, 199, 89, 0.2)';
        badge.style.color = '#34C759';
    }
};

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
function initApp() {
    loadData();
    
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('servyre-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeToggle) {
        themeToggle.onclick = function() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('servyre-theme', next);
        };
    }
    
    // Custom Select for Status
    const statusSelectContainer = document.getElementById('statusSelectContainer');
    const statusTrigger = document.getElementById('statusTrigger');
    const statusDropdown = document.getElementById('statusDropdown');
    const statusSelect = document.getElementById('status');
    
    if (statusSelectContainer && statusTrigger) {
        statusTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            statusSelectContainer.classList.toggle('open');
        });
        
        document.querySelectorAll('.custom-select-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                statusSelect.value = value;
                const badge = statusTrigger.querySelector('.status-badge');
                badge.textContent = value;
                badge.dataset.value = value;
                statusSelectContainer.classList.remove('open');
            });
        });
        
        document.addEventListener('click', () => {
            statusSelectContainer.classList.remove('open');
        });
    }
    
    // Otro Accesorio checkbox
    const otroCheck = document.getElementById('otroAccesorioCheck');
    if (otroCheck) {
        otroCheck.addEventListener('change', window.toggleOtroAccesorio);
    }
    
    // Update warranty days every minute
    setInterval(() => {
        if (document.getElementById('warrantyEndDate')?.value) {
            window.updateWarrantyDays();
        }
    }, 60000);
    
    // Attach all event handlers
    safeOnClick('exportExcelBtn', () => {
        exportExcel(inventory);
    });
    
    safeOnClick('exportPdfBtn', () => {
        if (inventory.length === 0) {
            alert('No hay registros para exportar.');
            return;
        }
        pdfColumnModal.classList.add('active');
    });
    
    // Export JSON Backup
    const expBackupBtn = document.getElementById('exportBackupBtn');
    if (expBackupBtn) {
        expBackupBtn.onclick = () => exportJSON(inventory, catalogs);
    }
    
    safeOnClick('importDataBtn', () => importInput.click());
    safeOnClick('addItemBtn', () => openEditForm());
    safeOnClick('sidebarNewBtn', () => openEditForm());
    safeOnClick('manageCatalogsBtn', () => { syncFormSelects(); catalogModalOverlay.classList.add('active'); });
    safeOnClick('closeModal', () => modalOverlay.classList.remove('active'));
    // cancelBtn eliminado - el modal se cierra con el botón X o haciendo clic fuera
    
    // Save Icon Button - Submit form programmatically
    safeOnClick('saveBtnIcon', () => {
        inventoryForm.dispatchEvent(new Event('submit'));
    });
    
    safeOnClick('closeDetailModal', () => detailModalOverlay.classList.remove('active'));
    safeOnClick('closeCatalogModal', () => catalogModalOverlay.classList.remove('active'));
    safeOnClick('finishCatalogBtn', () => catalogModalOverlay.classList.remove('active'));
    safeOnClick('addBrandBtn', () => {
        const v = document.getElementById('newBrandInput').value.trim();
        if (v && !catalogs.brands.includes(v)) {
            catalogs.brands.push(v); catalogs.modelsByBrand[v] = [];
            document.getElementById('newBrandInput').value = '';
            saveToStorage(); syncFormSelects();
        }
    });
    safeOnClick('addModelBtn', () => {
        const b = catalogBrandSelect.value;
        const v = document.getElementById('newModelInput').value.trim();
        if (b && v && !catalogs.modelsByBrand[b].includes(v)) {
            catalogs.modelsByBrand[b].push(v);
            document.getElementById('newModelInput').value = '';
            saveToStorage(); syncFormSelects();
        }
    });
    safeOnClick('addLocationBtn', () => {
        const v = document.getElementById('newLocationInput').value.trim();
        if (v && !(catalogs.locations.sedes || []).includes(v)) {
            if (!catalogs.locations.sedes) catalogs.locations.sedes = [];
            catalogs.locations.sedes.push(v);
            document.getElementById('newLocationInput').value = '';
            saveToStorage(); syncFormSelects();
        }
    });
    
    // Inicializar Logo Manager cuando se abra la pestaña de Marca
    window.initBrandSettings = () => {
        import('./modules/logo-manager.js').then(({ logoManager }) => {
            logoManager.render('brandSettingsContainer');
        });
    };
    
    // Observar cuando se muestra la pestaña de marca
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const marcaSection = document.getElementById('cat-marca');
                if (marcaSection && marcaSection.style.display !== 'none') {
                    window.initBrandSettings();
                }
            }
        });
    });
    
    const marcaSection = document.getElementById('cat-marca');
    if (marcaSection) {
        observer.observe(marcaSection, { attributes: true });
    }
    
    // Configuración de Plantilla PDF
    const PDF_TEMPLATE_KEY = 'servyre-pdf-template-settings';
    
    window.savePdfTemplateSettings = () => {
        const settings = {
            defaultFormat: document.querySelector('input[name="defaultPdfFormat"]:checked')?.value || 'a4-landscape',
            defaultStyle: document.getElementById('defaultPdfStyle')?.value || 'executive',
            defaultSections: {
                kpis: document.getElementById('defaultIncludeKPIs')?.checked ?? true,
                charts: document.getElementById('defaultIncludeCharts')?.checked ?? true,
                tables: document.getElementById('defaultIncludeTables')?.checked ?? true,
                alerts: document.getElementById('defaultIncludeAlerts')?.checked ?? true
            },
            includeLogo: document.getElementById('defaultIncludeLogo')?.checked ?? true,
            includeDate: document.getElementById('defaultIncludeDate')?.checked ?? true,
            pageNumbers: document.getElementById('defaultPageNumbers')?.checked ?? true
        };
        
        localStorage.setItem(PDF_TEMPLATE_KEY, JSON.stringify(settings));
        showNotification('Configuración guardada correctamente', 'success');
    };
    
    window.resetPdfTemplateSettings = () => {
        if (confirm('¿Restaurar configuración predeterminada?')) {
            localStorage.removeItem(PDF_TEMPLATE_KEY);
            location.reload();
        }
    };
    
    window.loadPdfTemplateSettings = () => {
        try {
            const settings = JSON.parse(localStorage.getItem(PDF_TEMPLATE_KEY));
            if (settings) {
                // Aplicar configuraciones cargadas
                const formatRadio = document.querySelector(`input[name="defaultPdfFormat"][value="${settings.defaultFormat}"]`);
                if (formatRadio) formatRadio.checked = true;
                
                const styleSelect = document.getElementById('defaultPdfStyle');
                if (styleSelect) styleSelect.value = settings.defaultStyle;
                
                const includeKPIs = document.getElementById('defaultIncludeKPIs');
                if (includeKPIs) includeKPIs.checked = settings.defaultSections?.kpis ?? true;
                
                const includeCharts = document.getElementById('defaultIncludeCharts');
                if (includeCharts) includeCharts.checked = settings.defaultSections?.charts ?? true;
                
                const includeTables = document.getElementById('defaultIncludeTables');
                if (includeTables) includeTables.checked = settings.defaultSections?.tables ?? true;
                
                const includeAlerts = document.getElementById('defaultIncludeAlerts');
                if (includeAlerts) includeAlerts.checked = settings.defaultSections?.alerts ?? true;
                
                const includeLogo = document.getElementById('defaultIncludeLogo');
                if (includeLogo) includeLogo.checked = settings.includeLogo ?? true;
                
                const includeDate = document.getElementById('defaultIncludeDate');
                if (includeDate) includeDate.checked = settings.includeDate ?? true;
                
                const pageNumbers = document.getElementById('defaultPageNumbers');
                if (pageNumbers) pageNumbers.checked = settings.pageNumbers ?? true;
            }
        } catch (e) {
            console.error('Error loading PDF template settings:', e);
        }
    };
    
    // Cargar configuraciones al iniciar
    window.loadPdfTemplateSettings();
    
    console.log('Servyre IT v2.0 - Inventario');
}

// Run after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
