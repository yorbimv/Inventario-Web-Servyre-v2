import { elements } from './ui.js';
import { sanitize } from './utils.js';

export const renderCatalogItems = (catalogs, handlers) => {
    const { brandList, locationList, locationList2, modelList, modelManagementSection } = elements;

    // Brands
    brandList.innerHTML = '';
    catalogs.brands.forEach(b => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sanitize(b)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-action="delete-brand" data-val="${sanitize(b)}">&times;</button>`;
        brandList.appendChild(li);
    });

    // Locations - Sedes
    locationList.innerHTML = '';
    (catalogs.locations.sedes || []).forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sanitize(l)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-action="delete-location-sede" data-val="${sanitize(l)}">&times;</button>`;
        locationList.appendChild(li);
    });

    // Locations - Externo
    locationList2.innerHTML = '';
    (catalogs.locations.externo || []).forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${sanitize(l)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-action="delete-location-externo" data-val="${sanitize(l)}">&times;</button>`;
        locationList2.appendChild(li);
    });

    // Models
    const selB = elements.catalogBrandSelect.value;
    if (selB) {
        modelManagementSection.style.display = 'block';
        modelList.innerHTML = '';
        (catalogs.modelsByBrand[selB] || []).forEach(m => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${sanitize(m)}</span> <button class="close-btn" style="font-size:1.2rem; color:var(--danger)" data-action="delete-model" data-val="${sanitize(m)}" data-parent="${sanitize(selB)}">&times;</button>`;
            modelList.appendChild(li);
        });
    } else {
        modelManagementSection.style.display = 'none';
    }

    // Attach listeners
    // Note: We use global delegation or attach here. For simplicity, we can let UI handle delegation or attach here.
    // Let's attach here for now but securely.
    document.querySelectorAll('[data-action^="delete-"]').forEach(btn => {
        btn.onclick = (e) => {
            const action = btn.dataset.action;
            const val = btn.dataset.val;
            const parent = btn.dataset.parent;
            handlers.onDelete(action, val, parent);
        };
    });
};

export const syncFormSelects = (catalogs) => {
    const { locationInput, brandInput, catalogBrandSelect } = elements;

    // Locations
    locationInput.innerHTML = '<option value="">Seleccionar...</option>';
    const sedes = catalogs.locations.sedes || [];
    const externo = catalogs.locations.externo || [];

    if (sedes.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = 'SEDES';
        sedes.forEach(l => grp.add(new Option(l, l)));
        locationInput.add(grp);
    }

    if (externo.length > 0) {
        const grp = document.createElement('optgroup');
        grp.label = 'EXTERNO';
        externo.forEach(l => grp.add(new Option(l, l)));
        locationInput.add(grp);
    }

    // Brands
    const curBrand = brandInput.value;
    brandInput.innerHTML = '<option value="">Sel. Marca...</option>';

    // Preserve catalog select value if possible, or reset
    const curCatBrand = catalogBrandSelect.value;
    catalogBrandSelect.innerHTML = '<option value="">Marca para modelos...</option>';

    catalogs.brands.forEach(b => {
        brandInput.add(new Option(b, b));
        catalogBrandSelect.add(new Option(b, b));
    });

    brandInput.value = curBrand;
    if (curCatBrand) catalogBrandSelect.value = curCatBrand;
};
