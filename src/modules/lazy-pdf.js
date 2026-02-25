// Lazy PDF Loader - Only load jsPDF when needed
// Improves initial page load time significantly

let jsPDFInstance = null;
let autoTableInstance = null;

export async function loadPdfLibs() {
    if (jsPDFInstance && autoTableInstance) {
        return { jsPDF: jsPDFInstance, autoTable: autoTableInstance };
    }
    
    // Show loading toast
    const { toast } = await import('./toast.js');
    toast.info('Cargando generador de PDF...', 2000);
    
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
    ]);
    
    jsPDFInstance = jsPDF;
    autoTableInstance = autoTable;
    
    return { jsPDF, autoTable };
}

export async function generatePdfWithLoader(options) {
    const { jsPDF, autoTable } = await loadPdfLibs();
    
    // Use jsPDF and autoTable here
    const doc = new jsPDF();
    
    if (options.onReady) {
        options.onReady(doc, autoTable);
    }
    
    return doc;
}
