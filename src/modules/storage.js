import CryptoJS from 'crypto-js';
import { CONFIG } from '../config.js';

const MASTER_KEY = CONFIG.MASTER_KEY;
const STORAGE_KEY = CONFIG.STORAGE_KEY;

// --- Encryption Helpers ---
const encrypt = (data) => CryptoJS.AES.encrypt(JSON.stringify(data), MASTER_KEY).toString();
const decrypt = (ciphertext) => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
        const dec = bytes.toString(CryptoJS.enc.Utf8);
        return dec ? JSON.parse(dec) : null;
    } catch (e) { return null; }
};

// --- LocalStorage ---
export const saveToLocalStorage = (data) => {
    try {
        localStorage.setItem(STORAGE_KEY, encrypt(data));
        return true;
    } catch (e) {
        console.error('Error saving to LocalStorage', e);
        return false;
    }
};

export const loadFromLocalStorage = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        return decrypt(stored);
    }
    return null;
};

// --- FileSystem Operations ---
let fileHandle = null;

export const saveToDisk = async (data) => {
    try {
        if (!fileHandle) {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: 'inventario_servyre.json',
                types: [{
                    description: 'Archivo JSON de Inventario',
                    accept: { 'application/json': ['.json'] },
                }],
            });
        }

        const writable = await fileHandle.createWritable();
        // Option: Encrypt or save as plain JSON? 
        // User report suggests "Open File" like Excel, so plain JSON might be better for portability,
        // but for security consistent with current app, let's offer both or stick to JSON for now as per "Excel" analogy.
        // Let's save as JSON for now to allow external editing if needed, or encrypt if user wants security.
        // Given the "Audit" report mentioned "program de escritorio", plain JSON is usually expected for files.
        // However, the existing app encrypts. 
        // Let's save plain JSON for the file to be useful outside the app (like a backup).
        // If the user wants security, we can add a toggle. For now, plan JSON for maximum utility.

        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        return true;
    } catch (err) {
        console.error('Error saving to disk:', err);
        return false;
    }
};

export const loadFromDisk = async () => {
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'Archivo JSON de Inventario',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false
        });

        fileHandle = handle;
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate structure
        if (data.inventory && data.catalogs) {
            return data;
        } else {
            throw new Error('Formato de archivo inválido');
        }
    } catch (err) {
        console.error('Error loading from disk:', err);
        return null;
    }
};
