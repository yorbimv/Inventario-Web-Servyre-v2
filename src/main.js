import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Initial Data & State
let inventory = JSON.parse(localStorage.getItem('servyre_inventory')) || [
  {
    id: '1',
    fullName: 'Jorge Meneses',
    email: 'jorge.meneses@servyre.com',
    deviceType: 'Laptop',
    brand: 'Dell',
    model: 'Latitude 5430',
    serialNumber: 'ABC-123-XYZ',
    ram: 16,
    storageType: 'SSD',
    storageCapacity: 512,
    status: 'Activo',
    hasPrinter: true,
    notes: 'Equipo nuevo de gerencia'
  },
  {
    id: '2',
    fullName: 'Ana García',
    email: 'ana.garcia@servyre.com',
    deviceType: 'Desktop',
    brand: 'HP',
    model: 'EliteDesk 800',
    serialNumber: 'HP-987-PRO',
    ram: 8,
    storageType: 'HDD',
    storageCapacity: 1000,
    status: 'Mantenimiento',
    hasPrinter: false,
    notes: 'Requiere cambio a SSD'
  }
];

// DOM Elements
const inventoryBody = document.getElementById('inventoryBody');
const inventoryForm = document.getElementById('inventoryForm');
const modalOverlay = document.getElementById('modalOverlay');
const addItemBtn = document.getElementById('addItemBtn');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const searchInput = document.getElementById('searchInput');
const modalTitle = document.getElementById('modalTitle');
const exportExcelBtn = document.getElementById('exportExcelBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');

// Helper: Save to LocalStorage
const saveToStorage = () => {
    localStorage.setItem('servyre_inventory', JSON.stringify(inventory));
};

// Render Table
const renderTable = (data = inventory) => {
    inventoryBody.innerHTML = '';
    
    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        
        const statusClass = item.status === 'Activo' ? 'badge-green' : 
                           item.status === 'Mantenimiento' ? 'badge-orange' : 'badge-blue';

        tr.innerHTML = `
            <td>
                <div style="font-weight: 600;">${item.fullName}</div>
                <div style="font-size: 0.8rem; color: var(--text-dim);">${item.email}</div>
            </td>
            <td>
                <span class="badge badge-blue">${item.deviceType}</span>
            </td>
            <td>
                <div>${item.brand}</div>
                <div style="font-size: 0.8rem; color: var(--text-dim);">${item.model}</div>
            </td>
            <td><code>${item.serialNumber}</code></td>
            <td>
                <div>${item.ram}GB RAM</div>
                <div style="font-size: 0.8rem; color: var(--text-dim);">${item.storageCapacity}GB ${item.storageType}</div>
            </td>
            <td>
                <span class="badge ${statusClass}">${item.status}</span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-secondary btn-icon edit-btn" data-id="${item.id}" title="Editar">✏️</button>
                    <button class="btn btn-secondary btn-icon delete-btn" data-id="${item.id}" title="Eliminar" style="color: var(--danger)">🗑️</button>
                </div>
            </td>
        `;
        inventoryBody.appendChild(tr);
    });

    // Attach row events
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => editItem(btn.dataset.id);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => deleteItem(btn.dataset.id);
    });
};

// Modal Logic
const openModal = (item = null) => {
    modalOverlay.classList.add('active');
    if (item) {
        modalTitle.innerText = 'Editar Registro';
        document.getElementById('itemId').value = item.id;
        document.getElementById('fullName').value = item.fullName;
        document.getElementById('email').value = item.email;
        document.getElementById('deviceType').value = item.deviceType;
        document.getElementById('brand').value = item.brand;
        document.getElementById('model').value = item.model;
        document.getElementById('serialNumber').value = item.serialNumber;
        document.getElementById('ram').value = item.ram;
        document.getElementById('storageType').value = item.storageType;
        document.getElementById('storageCapacity').value = item.storageCapacity;
        document.getElementById('status').value = item.status;
        document.getElementById('hasPrinter').checked = item.hasPrinter;
        document.getElementById('notes').value = item.notes;
    } else {
        modalTitle.innerText = 'Nuevo Registro de IT';
        inventoryForm.reset();
        document.getElementById('itemId').value = '';
    }
};

const hideModal = () => {
    modalOverlay.classList.remove('active');
};

// CRUD Operations
const saveItem = (e) => {
    e.preventDefault();
    const id = document.getElementById('itemId').value;
    
    const itemData = {
        id: id || Date.now().toString(),
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        deviceType: document.getElementById('deviceType').value,
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        serialNumber: document.getElementById('serialNumber').value,
        ram: parseInt(document.getElementById('ram').value),
        storageType: document.getElementById('storageType').value,
        storageCapacity: parseInt(document.getElementById('storageCapacity').value),
        status: document.getElementById('status').value,
        hasPrinter: document.getElementById('hasPrinter').checked,
        notes: document.getElementById('notes').value,
    };

    if (id) {
        const index = inventory.findIndex(i => i.id === id);
        inventory[index] = itemData;
    } else {
        inventory.unshift(itemData);
    }

    saveToStorage();
    renderTable();
    hideModal();
};

const editItem = (id) => {
    const item = inventory.find(i => i.id === id);
    if (item) openModal(item);
};

const deleteItem = (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
        inventory = inventory.filter(i => i.id !== id);
        saveToStorage();
        renderTable();
    }
};

// Search Logic
searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = inventory.filter(item => 
        item.fullName.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.serialNumber.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query)
    );
    renderTable(filtered);
};

// Export Logic
exportExcelBtn.onclick = () => {
    const dataToExport = inventory.map(item => ({
        'Nombre': item.fullName,
        'Email': item.email,
        'Tipo': item.deviceType,
        'Marca': item.brand,
        'Modelo': item.model,
        'Serie': item.serialNumber,
        'RAM (GB)': item.ram,
        'Disco': item.storageType,
        'Capacidad (GB)': item.storageCapacity,
        'Estado': item.status,
        'Impresora': item.hasPrinter ? 'Sí' : 'No',
        'Notas': item.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario IT");
    XLSX.writeFile(workbook, "Inventario_IT_Servyre.xlsx");
};

exportPdfBtn.onclick = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(20);
    doc.text("Inventario IT - Servyre", 14, 20);
    doc.setFontSize(10);
    doc.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 28);

    const headers = [["Nombre", "Correo", "Tipo", "Marca/Modelo", "Serie", "Specs", "Estado"]];
    const data = inventory.map(item => [
        item.fullName,
        item.email,
        item.deviceType,
        `${item.brand} ${item.model}`,
        item.serialNumber,
        `${item.ram}GB / ${item.storageCapacity}GB ${item.storageType}`,
        item.status
    ]);

    doc.autoTable({
        head: headers,
        body: data,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 }
    });

    doc.save("Inventario_IT_Servyre.pdf");
};

// Event Listeners
addItemBtn.onclick = () => openModal();
closeModal.onclick = hideModal;
cancelBtn.onclick = hideModal;
inventoryForm.onsubmit = saveItem;

// Close modal when clicking outside
window.onclick = (e) => {
    if (e.target === modalOverlay) hideModal();
};

// Initial Render
renderTable();
console.log('Servyre Inventario IT Loaded');
