// Form Validation Module
// Provides real-time validation feedback

const ValidationRules = {
    required: (value) => value && value.trim().length > 0,
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    serialNumber: (value) => !value || /^[A-Za-z0-9\-]+$/.test(value),
    ipAddress: (value) => !value || /^(\d{1,3}\.){3}\d{1,3}$/.test(value),
    extension: (value) => !value || /^\d{3,5}$/.test(value),
    minLength: (min) => (value) => !value || value.length >= min,
    maxLength: (max) => (value) => !value || value.length <= max,
};

const ValidationMessages = {
    required: 'Este campo es obligatorio',
    email: 'Ingresa un correo válido',
    serialNumber: 'Solo letras, números y guiones',
    ipAddress: 'Ingresa una IP válida (ej: 192.168.1.1)',
    extension: 'Extensión de 3-5 dígitos',
    minLength: (min) => `Mínimo ${min} caracteres`,
    maxLength: (max) => `Máximo ${max} caracteres`,
};

export function validateField(input, rules = []) {
    const value = input.value;
    const errors = [];
    
    for (const rule of rules) {
        let isValid = true;
        let message = '';
        
        if (typeof rule === 'string') {
            if (ValidationRules[rule]) {
                isValid = ValidationRules[rule](value);
                message = ValidationMessages[rule];
            }
        } else if (typeof rule === 'object') {
            const { type, params } = rule;
            if (ValidationRules[type]) {
                const validator = ValidationRules[type](...params);
                isValid = validator(value);
                message = typeof ValidationMessages[type] === 'function' 
                    ? ValidationMessages[type](...params) 
                    : ValidationMessages[type];
            }
        }
        
        if (!isValid && message) {
            errors.push(message);
        }
    }
    
    return errors;
}

export function showFieldError(input, message) {
    clearFieldError(input);
    
    input.classList.add('field-error');
    input.classList.remove('field-success');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.textContent = message;
    
    input.parentElement.appendChild(errorDiv);
}

export function showFieldSuccess(input) {
    clearFieldError(input);
    input.classList.add('field-success');
    input.classList.remove('field-error');
}

export function clearFieldError(input) {
    input.classList.remove('field-error', 'field-success');
    const existingError = input.parentElement.querySelector('.field-error-message');
    if (existingError) existingError.remove();
}

export function initFieldValidation(formId, fieldsConfig) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const style = document.createElement('style');
    style.textContent = `
        .field-error {
            border-color: var(--danger, #EF4444) !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
        }
        .field-success {
            border-color: var(--success, #10B981) !important;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15) !important;
        }
        .field-error-message {
            color: var(--danger, #EF4444);
            font-size: 12px;
            margin-top: 4px;
            animation: shake 0.3s ease;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
    `;
    document.head.appendChild(style);
    
    Object.entries(fieldsConfig).forEach(([fieldId, rules]) => {
        const input = document.getElementById(fieldId);
        if (!input) return;
        
        input.addEventListener('blur', () => {
            const errors = validateField(input, rules);
            if (errors.length > 0) {
                showFieldError(input, errors[0]);
            } else if (input.value.trim()) {
                showFieldSuccess(input);
            }
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('field-error')) {
                const errors = validateField(input, rules);
                if (errors.length === 0) {
                    showFieldSuccess(input);
                }
            }
        });
    });
}

export function validateForm(formId, fieldsConfig) {
    let isValid = true;
    
    Object.entries(fieldsConfig).forEach(([fieldId, rules]) => {
        const input = document.getElementById(fieldId);
        if (!input) return;
        
        const errors = validateField(input, rules);
        if (errors.length > 0) {
            showFieldError(input, errors[0]);
            isValid = false;
        }
    });
    
    return isValid;
}
