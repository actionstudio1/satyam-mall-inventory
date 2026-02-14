import { InventoryItem, Transaction, Category, TransactionType } from '../types';

const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzJ3tc5D9jBiybV824xnXYaye0bX5h2df1U7R4AA7DI0Je77LjIcdYFAgjkjgfSs9zT/exec';

export const getStoredConfig = (): string => localStorage.getItem('satyam_mall_sheet_url') || GOOGLE_SHEET_API_URL;
export const saveConfig = (url: string) => localStorage.setItem('satyam_mall_sheet_url', url);

// Cache keys
const CACHE_INVENTORY = 'satyam_mall_inventory_cache';
const CACHE_TRANSACTIONS = 'satyam_mall_transactions_cache';

// Get cached data
export const getCachedInventory = (): InventoryItem[] => {
  try {
    const cached = localStorage.getItem(CACHE_INVENTORY);
    return cached ? JSON.parse(cached) : [];
  } catch { return []; }
};

export const getCachedTransactions = (): Transaction[] => {
  try {
    const cached = localStorage.getItem(CACHE_TRANSACTIONS);
    return cached ? JSON.parse(cached) : [];
  } catch { return []; }
};

// User Login
export const loginUser = async (email: string, password: string): Promise<{ success: boolean; user?: { email: string; name: string; role: string }; message?: string }> => {
  try {
    const response = await fetch(getStoredConfig(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'login', email, password })
    });
    const result = await response.json();
    if (result.status === 'success') {
      return { success: true, user: result.user };
    }
    return { success: false, message: result.message || 'Login failed' };
  } catch {
    return { success: false, message: 'Connection error. Please try again.' };
  }
};

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  try {
    const response = await fetch(`${getStoredConfig()}?sheet=Inventory`);
    const data = await response.json();
    if (data.error) return getCachedInventory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = data.map((row: any, index: number) => ({
      id: String(row.id || index + 1),
      name: row.name || '',
      category: (row.category as Category) || Category.OTHERS,
      quantity: Number(row.quantity) || 0,
      unit: row.unit || 'pcs',
      minLevel: Number(row.minlevel || row.minLevel || 5)
    }));
    localStorage.setItem(CACHE_INVENTORY, JSON.stringify(items));
    return items;
  } catch {
    return getCachedInventory();
  }
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${getStoredConfig()}?sheet=Transactions`);
    const data = await response.json();
    if (data.error) return getCachedTransactions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = data.map((row: any, index: number) => ({
      id: String(index + 1),
      date: row.date || new Date().toISOString(),
      type: row.type as TransactionType,
      itemName: row.itemname || row.itemName || '',
      quantity: Number(row.quantity) || 0,
      unit: row.unit || '',
      location: row.location || '',
      personName: row.personname || row.personName || '',
      notes: row.notes || '',
      fileUrl: row.fileurl || row.fileUrl || ''
    }));
    localStorage.setItem(CACHE_TRANSACTIONS, JSON.stringify(transactions));
    return transactions;
  } catch {
    return getCachedTransactions();
  }
};

export const submitTransaction = async (transaction: Omit<Transaction, 'id' | 'date'> & { fileUrl?: string }): Promise<boolean> => {
  try {
    const response = await fetch(getStoredConfig(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'addTransaction', ...transaction })
    });
    const result = await response.json();
    return result.status === 'success';
  } catch {
    return false;
  }
};

export const updateInventoryQuantity = async (itemName: string, newQuantity: number): Promise<boolean> => {
  try {
    const response = await fetch(getStoredConfig(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'updateInventory', itemName, newQuantity })
    });
    const result = await response.json();
    return result.status === 'success';
  } catch {
    return false;
  }
};

export const uploadFileToDrive = async (file: File, itemName: string): Promise<{ success: boolean; fileUrl?: string; error?: string }> => {
  try {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: 'File too large (max 10MB)' };
    }

    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(getStoredConfig(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'uploadFile',
        fileName: `${itemName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${file.name}`,
        mimeType: file.type,
        fileData: base64Data
      })
    });

    const result = await response.json();
    if (result.status === 'success') {
      return { success: true, fileUrl: result.fileUrl };
    }
    return { success: false, error: result.message || 'Upload failed' };
  } catch (err) {
    console.error('Upload error:', err);
    return { success: false, error: 'Network error' };
  }
};
