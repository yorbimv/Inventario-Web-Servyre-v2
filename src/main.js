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

// --- CONFIGURATION & STATE ---
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
            resguardo: `SERV-${anioCompra}-${String(i).padStart(3, '0')}`,
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
    document.getElementById('tabDashboard').classList.add('active');
    document.getElementById('tabInventory').classList.remove('active');
    initDashboardPersonalizado(inventory, 'dashboardContainer');
};

const switchToInventory = () => {
    currentView = 'inventory';
    document.getElementById('dashboardContainer').style.display = 'none';
    document.getElementById('inventorySection').style.display = 'block';
    document.getElementById('tabInventory').classList.add('active');
    document.getElementById('tabDashboard').classList.remove('active');
};

document.getElementById('tabDashboard')?.addEventListener('click', switchToDashboard);
document.getElementById('tabInventory')?.addEventListener('click', switchToInventory);

// Initialize
switchToDashboard();

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
                    <span class="badge ${item.status === 'Activo' ? 'badge-green' : item.status === 'Mantenimiento' ? 'badge-orange' : item.status === 'Cancelado' ? 'badge-gray' : item.status === 'Para piezas' ? 'badge-orange' : 'badge-danger'}" style="font-size: 0.9rem; padding: 0.5rem 1.5rem;">${sanitize(item.status || '-').toUpperCase()}</span>
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

                <!-- Configuración de Red -->
                <div class="info-card" style="grid-column: span 2; border-left: 3px solid var(--primary);">
                    <label>Configuración de Red</label>
                    <div class="value" style="font-size: 0.85rem;">
                        <span>IP: <code>${sanitize(item.ipAddress || '-')}</code></span>
                        <span style="margin-left: 1rem;">Tipo: <span class="badge badge-blue" style="font-size: 0.65rem;">${sanitize(item.ipType || 'Sin asignar')}</span></span>
                    </div>
                </div>

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
                    <label>Observaciones</label>
                    <div class="value" style="font-size: 0.8rem; color: var(--text-dim);">${sanitize(item.notes || '-')}</div>
                </div>
            </div>
            
            <!-- Carrusel de Fotos -->
            ${(() => {
                const photos = item.photos ? item.photos.split(',').map(p => p.trim()).filter(p => p) : [];
                if (photos.length === 0) return '';
                
                const carouselId = 'photoCarousel_' + item.id;
                return `
                    <div class="photo-carousel-container" style="margin-top: 2rem; text-align: center;">
                        <h3 style="margin-bottom: 1rem; color: var(--text-dim);"><i data-lucide="image"></i> Galería de Fotos</h3>
                        <div class="photo-carousel" id="${carouselId}" style="position: relative; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; background: var(--card-bg);">
                            ${photos.map((photo, idx) => `
                                <div class="carousel-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="display: ${idx === 0 ? 'block' : 'none'}; padding: 1rem;">
                                    <img src="${photo}" alt="Foto ${idx + 1}" style="max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\'padding: 2rem; color: var(--text-dim);\'>No se pudo cargar la imagen</div>';">
                                </div>
                            `).join('')}
                        </div>
                        ${photos.length > 1 ? `
                            <button class="carousel-btn prev" onclick="window.moveCarousel('${carouselId}', -1)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; z-index: 10;">❮</button>
                            <button class="carousel-btn next" onclick="window.moveCarousel('${carouselId}', 1)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; z-index: 10;">❯</button>
                            <div class="carousel-dots" style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1rem;">
                                ${photos.map((_, idx) => `
                                    <span class="dot ${idx === 0 ? 'active' : ''}" onclick="window.goToSlide('${carouselId}', ${idx})" style="width: 10px; height: 10px; border-radius: 50%; background: var(--text-dim); cursor: pointer; opacity: 0.5; ${idx === 0 ? 'opacity: 1; background: var(--primary);' : ''}"></span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            })()}
            
            <!-- Historial de Usuarios -->
            ${(() => {
                const history = item.userHistory || [];
                if (history.length === 0) return '';
                
                return `
                    <div class="user-history-section" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
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
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };

    const titles = {
        success: 'Éxito',
        error: 'Error',
        warning: 'Advertencia',
        info: 'Información'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon ${type}">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
    }, 4000);
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
                        notes: '',
                        ipAddress: row['IP'] || '',
                        ipType: row['Tipo IP'] || ''
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
        
        // Detectar cambio de estado
        if (oldStatus && oldStatus !== newStatus) {
            showStatusChangeAlert(oldStatus, newStatus, itemData.fullName || itemData.serialNumber);
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
        
        // Mostrar alerta de modificación exitosa
        showModificationAlert(itemData.serialNumber);
        
        inventory[idx] = itemData;
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
        
        // Mostrar alerta de nuevo registro
        showNewRecordAlert(itemData.serialNumber);
        inventory.unshift(itemData);
    }

    saveToStorage(); renderTable();
    modalOverlay.classList.remove('active');
};

// Función para mostrar alerta de cambio de estado
function showStatusChangeAlert(oldStatus, newStatus, itemName) {
    const statusColors = {
        'Activo': '#10B981',
        'Mantenimiento': '#F59E0B',
        'Baja': '#EF4444',
        'Cancelado': '#6B7280',
        'Para piezas': '#F97316'
    };
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(26, 26, 46, 0.98);
        border: 2px solid ${statusColors[newStatus] || '#3B82F6'};
        border-radius: 12px;
        padding: 1rem 1.5rem;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        max-width: 350px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    `;
    
    alertDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
                width: 40px; height: 40px;
                background: ${statusColors[newStatus] || '#3B82F6'};
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                color: white; font-weight: bold;
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            </div>
            <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: #fff;">
                    Estado actualizado
                </div>
                <div style="font-size: 0.8rem; color: #9CA3AF;">
                    <span style="color: ${statusColors[oldStatus]}; text-decoration: line-through;">${oldStatus}</span>
                    →
                    <span style="color: ${statusColors[newStatus]}; font-weight: bold;">${newStatus}</span>
                </div>
                <div style="font-size: 0.75rem; color: #6B7280; margin-top: 4px;">
                    ${itemName || 'Equipo'}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Agregar animación CSS si no existe
    if (!document.getElementById('statusAlertStyle')) {
        const style = document.createElement('style');
        style.id = 'statusAlertStyle';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `;
        document.head.appendChild(style);
    }
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
    
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
    
    // Actualizar el dashboard si existe
    if (window.dashboard) {
        window.dashboard.render();
    }
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
