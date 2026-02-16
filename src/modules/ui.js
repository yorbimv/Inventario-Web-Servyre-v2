import { sanitize } from './utils.js';

export const elements = {
    inventoryBody: document.getElementById('inventoryBody'),
    modalOverlay: document.getElementById('modalOverlay'),
    detailModalOverlay: document.getElementById('detailModalOverlay'),
    detailModalBody: document.getElementById('detailModalBody'),
    catalogModalOverlay: document.getElementById('catalogModalOverlay'),
    inventoryForm: document.getElementById('inventoryForm'),
    // Stats
    totalAssetsEl: document.getElementById('totalAssets'),
    activeLocationsEl: document.getElementById('activeLocations'),
    // Form
    brandInput: document.getElementById('brand'),
    modelInput: document.getElementById('model'),
    locationInput: document.getElementById('location'),
    catalogBrandSelect: document.getElementById('catalogBrandSelect'),
    // Catalogs
    brandList: document.getElementById('brandList'),
    modelList: document.getElementById('modelList'),
    locationList: document.getElementById('locationList'),
    locationList2: document.getElementById('locationList2'),
    modelManagementSection: document.getElementById('modelManagementSection')
};

export const renderTable = (data) => {
    const { inventoryBody } = elements;
    inventoryBody.innerHTML = '';

    if (data.length === 0) {
        inventoryBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: var(--text-dim);">No hay registros encontrados.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'fade-in';
        tr.style.cursor = 'pointer';
        tr.dataset.id = item.id;

        const statusClass = item.status === 'Activo' ? 'badge-green' : item.status === 'Mantenimiento' ? 'badge-orange' : 'badge-danger';

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
            <td><span class="badge ${statusClass}">${sanitize(item.status)}</span></td>
            <td class="actions-cell">
                <button class="glass-btn btn-row-edit" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
                <button class="glass-btn btn-row-delete" title="Eliminar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </td>
        `;

        inventoryBody.appendChild(tr);
    });
};

export const updateStats = (count, locationsCount) => {
    elements.totalAssetsEl.textContent = count;
    elements.activeLocationsEl.textContent = locationsCount;
};

export const toggleModal = (modal, show = true) => {
    if (show) modal.classList.add('active');
    else modal.classList.remove('active');
};
