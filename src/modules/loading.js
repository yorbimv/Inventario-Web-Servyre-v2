// Loading States & Skeleton Screens
// Provides visual feedback during data loading

export const LoadingState = {
    table: () => {
        const tbody = document.getElementById('inventoryBody');
        if (!tbody) return;
        
        const skeletonRows = Array(5).fill(0).map(() => `
            <tr class="skeleton-row">
                <td><div class="skeleton skeleton-code"></div></td>
                <td><div class="skeleton skeleton-text"></div></td>
                <td><div class="skeleton skeleton-badge"></div></td>
                <td><div class="skeleton skeleton-text-sm"></div></td>
                <td><div class="skeleton skeleton-text-sm"></div></td>
                <td><div class="skeleton skeleton-text-sm"></div></td>
                <td><div class="skeleton skeleton-text-sm"></div></td>
                <td><div class="skeleton skeleton-badge"></div></td>
                <td><div class="skeleton skeleton-text-xs"></div></td>
                <td><div class="skeleton skeleton-actions"></div></td>
            </tr>
        `).join('');
        
        tbody.innerHTML = skeletonRows;
    },
    
    dashboard: (containerId = 'dashboardContainer') => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="skeleton-dashboard">
                <div class="skeleton-kpi-grid">
                    ${Array(4).fill(0).map(() => `
                        <div class="skeleton-card">
                            <div class="skeleton skeleton-icon"></div>
                            <div class="skeleton skeleton-number"></div>
                            <div class="skeleton skeleton-label"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="skeleton-charts-grid">
                    <div class="skeleton-card skeleton-chart">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-chart-area"></div>
                    </div>
                    <div class="skeleton-card skeleton-chart">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-chart-area"></div>
                    </div>
                </div>
            </div>
        `;
    },
    
    clear: () => {
        const tbody = document.getElementById('inventoryBody');
        if (tbody) tbody.innerHTML = '';
    }
};

// Add skeleton CSS
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
    .skeleton {
        background: linear-gradient(90deg, 
            var(--surface, #1a1a2e) 25%, 
            var(--surface-elevated, #2a2a3e) 50%, 
            var(--surface, #1a1a2e) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
    }
    
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    
    .skeleton-row td { padding: 12px 8px; }
    .skeleton-code { height: 24px; width: 80px; }
    .skeleton-text { height: 20px; width: 120px; }
    .skeleton-text-sm { height: 16px; width: 80px; }
    .skeleton-text-xs { height: 14px; width: 60px; }
    .skeleton-badge { height: 24px; width: 70px; border-radius: 12px; }
    .skeleton-actions { height: 32px; width: 40px; border-radius: 6px; }
    
    .skeleton-card {
        background: var(--card-bg, rgba(255,255,255,0.03));
        border: 1px solid var(--card-border, rgba(255,255,255,0.06));
        border-radius: var(--radius, 16px);
        padding: 1.5rem;
    }
    
    .skeleton-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .skeleton-icon { height: 40px; width: 40px; border-radius: 10px; margin-bottom: 0.5rem; }
    .skeleton-number { height: 32px; width: 60px; margin-bottom: 0.25rem; }
    .skeleton-label { height: 16px; width: 80px; }
    
    .skeleton-charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
    }
    
    .skeleton-chart { min-height: 300px; }
    .skeleton-title { height: 24px; width: 150px; margin-bottom: 1rem; }
    .skeleton-chart-area { height: 220px; border-radius: 8px; }
`;
document.head.appendChild(skeletonStyle);
