export const createInitialState = () => ({
    inventory: [],
    catalogs: {
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
    }
});
