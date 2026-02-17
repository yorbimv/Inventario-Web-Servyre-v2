/**
 * Logo Manager - Gestión de logo corporativo para reportes PDF
 * Permite subir, cambiar y gestionar el logo de la empresa
 */

export class LogoManager {
    constructor() {
        this.storageKey = 'servyre-brand-settings';
        this.maxSize = 500 * 1024; // 500KB
        this.allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        this.defaultSettings = {
            logoType: 'default',
            logoData: null,
            logoUpdated: null,
            companyName: 'SERVYRE IT',
            reportSubtitle: 'Reporte Ejecutivo de Activos IT',
            contactInfo: ''
        };
    }

    /**
     * Obtiene la configuración actual de marca
     */
    getSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return { ...this.defaultSettings, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error('Error loading brand settings:', e);
        }
        return { ...this.defaultSettings };
    }

    /**
     * Guarda la configuración de marca
     */
    saveSettings(settings) {
        try {
            const current = this.getSettings();
            const updated = { ...current, ...settings };
            localStorage.setItem(this.storageKey, JSON.stringify(updated));
            return true;
        } catch (e) {
            console.error('Error saving brand settings:', e);
            return false;
        }
    }

    /**
     * Procesa un archivo de logo subido
     */
    async processLogoFile(file) {
        // Validar tipo
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error('Formato no válido. Solo se permiten PNG y JPG.');
        }

        // Validar tamaño
        if (file.size > this.maxSize) {
            throw new Error(`El archivo es demasiado grande. Máximo ${this.maxSize / 1024}KB.`);
        }

        // Convertir a Base64
        try {
            const base64 = await this.fileToBase64(file);
            
            // Optimizar imagen si es necesario
            const optimized = await this.optimizeImage(base64);
            
            return {
                logoType: 'upload',
                logoData: optimized,
                logoUpdated: new Date().toISOString()
            };
        } catch (e) {
            throw new Error('Error al procesar la imagen: ' + e.message);
        }
    }

    /**
     * Convierte archivo a Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Optimiza la imagen redimensionándola si es necesario
     */
    optimizeImage(base64Data, maxWidth = 400, maxHeight = 200) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Calcular nuevas dimensiones manteniendo proporción
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                // Crear canvas y dibujar imagen redimensionada
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a Base64 con calidad reducida
                resolve(canvas.toDataURL('image/png', 0.8));
            };
            img.onerror = reject;
            img.src = base64Data;
        });
    }

    /**
     * Elimina el logo personalizado y vuelve al default
     */
    resetToDefault() {
        return this.saveSettings({
            logoType: 'default',
            logoData: null,
            logoUpdated: null
        });
    }

    /**
     * Renderiza el componente de gestión de logo
     */
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const settings = this.getSettings();
        
        container.innerHTML = `
            <div class="brand-settings-section">
                <h3 class="settings-section-title">
                    <i data-lucide="image"></i>
                    Logo de la Empresa
                </h3>
                
                <div class="logo-preview-container">
                    <div class="logo-preview" id="logoPreview">
                        ${settings.logoType === 'upload' && settings.logoData 
                            ? `<img src="${settings.logoData}" alt="Logo" class="logo-img">`
                            : `<div class="logo-placeholder">
                                <i data-lucide="building-2"></i>
                                <span>Sin logo personalizado</span>
                               </div>`
                        }
                    </div>
                    
                    <div class="logo-info">
                        <p class="logo-dimensions">Dimensiones recomendadas: 300 x 150 px</p>
                        <p class="logo-format">Formatos: PNG, JPG • Máximo: 500KB</p>
                    </div>
                </div>

                <div class="logo-upload-area" id="logoUploadArea">
                    <input type="file" id="logoFileInput" accept="image/png,image/jpeg,image/jpg" style="display: none;">
                    <div class="upload-content">
                        <i data-lucide="upload-cloud"></i>
                        <p class="upload-text">Arrastra tu logo aquí</p>
                        <p class="upload-or">o</p>
                        <button type="button" class="glass-btn" onclick="document.getElementById('logoFileInput').click()">
                            Seleccionar archivo
                        </button>
                    </div>
                </div>

                <div class="logo-actions" style="margin-top: 1rem;">
                    ${settings.logoType === 'upload' ? `
                        <button type="button" class="glass-btn" id="removeLogoBtn" style="color: var(--danger);">
                            <i data-lucide="trash-2"></i>
                            Eliminar logo
                        </button>
                    ` : ''}
                </div>

                <div class="notification-area" id="logoNotification"></div>
            </div>

            <div class="brand-settings-section" style="margin-top: 2rem;">
                <h3 class="settings-section-title">
                    <i data-lucide="type"></i>
                    Información del Reporte
                </h3>
                
                <div class="form-group">
                    <label>Nombre de la empresa</label>
                    <input type="text" id="companyNameInput" 
                           value="${settings.companyName}" 
                           class="settings-input"
                           placeholder="Ej: SERVYRE IT">
                </div>

                <div class="form-group">
                    <label>Subtítulo del reporte</label>
                    <input type="text" id="reportSubtitleInput" 
                           value="${settings.reportSubtitle}" 
                           class="settings-input"
                           placeholder="Ej: Reporte Ejecutivo de Activos">
                </div>

                <div class="form-group">
                    <label>Información de contacto (opcional)</label>
                    <input type="text" id="contactInfoInput" 
                           value="${settings.contactInfo || ''}" 
                           class="settings-input"
                           placeholder="Ej: contacto@servyre.com">
                </div>
            </div>

            <div class="settings-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="glass-btn" id="resetBrandBtn">
                    Restaurar valores
                </button>
                <button type="button" class="premium-btn primary" id="saveBrandBtn">
                    <i data-lucide="save"></i>
                    Guardar cambios
                </button>
            </div>
        `;

        this.attachEventListeners();
        
        // Renderizar iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    /**
     * Adjunta event listeners al componente
     */
    attachEventListeners() {
        const fileInput = document.getElementById('logoFileInput');
        const uploadArea = document.getElementById('logoUploadArea');
        const removeBtn = document.getElementById('removeLogoBtn');
        const saveBtn = document.getElementById('saveBrandBtn');
        const resetBtn = document.getElementById('resetBrandBtn');

        // Input de archivo
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.handleFileUpload(file);
                }
            });
        }

        // Drag and drop
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', async (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const file = e.dataTransfer.files[0];
                if (file) {
                    await this.handleFileUpload(file);
                }
            });
        }

        // Eliminar logo
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.resetToDefault();
                this.render(document.querySelector('.brand-settings-section').parentElement.id);
                this.showNotification('Logo eliminado', 'success');
            });
        }

        // Guardar cambios
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const settings = {
                    companyName: document.getElementById('companyNameInput').value,
                    reportSubtitle: document.getElementById('reportSubtitleInput').value,
                    contactInfo: document.getElementById('contactInfoInput').value
                };
                
                if (this.saveSettings(settings)) {
                    this.showNotification('Configuración guardada correctamente', 'success');
                } else {
                    this.showNotification('Error al guardar', 'error');
                }
            });
        }

        // Restaurar valores
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('¿Restaurar valores predeterminados?')) {
                    localStorage.removeItem(this.storageKey);
                    this.render(document.querySelector('.brand-settings-section').parentElement.id);
                    this.showNotification('Valores restaurados', 'success');
                }
            });
        }
    }

    /**
     * Maneja la subida de archivo
     */
    async handleFileUpload(file) {
        try {
            const result = await this.processLogoFile(file);
            this.saveSettings(result);
            this.render(document.querySelector('.brand-settings-section').parentElement.id);
            this.showNotification('Logo subido correctamente', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Muestra notificación
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('logoNotification');
        if (!container) return;

        const colors = {
            success: 'rgba(16, 185, 129, 0.9)',
            error: 'rgba(239, 68, 68, 0.9)',
            info: 'rgba(59, 130, 246, 0.9)'
        };

        const notification = document.createElement('div');
        notification.style.cssText = `
            margin-top: 1rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            background: ${colors[type]};
            color: white;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        container.innerHTML = '';
        container.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Exportar instancia singleton
export const logoManager = new LogoManager();
