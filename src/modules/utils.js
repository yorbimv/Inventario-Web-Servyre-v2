export const sanitize = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

export const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    // If it's already formatted, return as is
    if (String(amount).includes('$')) return amount;
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

export const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substr(2, 9);
};
