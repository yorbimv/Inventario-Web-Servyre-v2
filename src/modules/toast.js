// Toast Notification System
// Replaces native alert() with styled notifications

const ToastType = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
`;
document.body.appendChild(toastContainer);

const toastIcons = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
};

const toastColors = {
    success: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', icon: '#10B981' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', icon: '#EF4444' },
    warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', icon: '#F59E0B' },
    info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', icon: '#3B82F6' }
};

export function showToast(message, type = ToastType.INFO, duration = 4000) {
    const toast = document.createElement('div');
    const colors = toastColors[type];
    
    toast.style.cssText = `
        background: ${colors.bg};
        border-left: 4px solid ${colors.border};
        border-radius: 8px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        animation: slideIn 0.3s ease;
        color: var(--text, #fff);
        font-size: 14px;
        line-height: 1.4;
    `;
    
    toast.innerHTML = `
        <span style="color: ${colors.icon}; display: flex; flex-shrink: 0;">${toastIcons[type]}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: var(--text-muted, #888);
            cursor: pointer;
            padding: 4px;
            display: flex;
            opacity: 0.7;
        ">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    
    return toast;
}

// Convenience methods
export const toast = {
    success: (msg, dur) => showToast(msg, ToastType.SUCCESS, dur),
    error: (msg, dur) => showToast(msg, ToastType.ERROR, dur),
    warning: (msg, dur) => showToast(msg, ToastType.WARNING, dur),
    info: (msg, dur) => showToast(msg, ToastType.INFO, dur)
};

// Add animations if not present
if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}
