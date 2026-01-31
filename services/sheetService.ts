import { InventoryItem, Transaction, Category, TransactionType } from '../types';

const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyCpvRJc3IjuvRJClmjXdVQU_3CLu-WOVNQU9auzRYH8MDvOQRmNLZk70w9GL4OyonA5Q/exec';
const GOOGLE_DRIVE_FOLDER_ID = '1miMudOBbLVGNop-1VRbsHYsc3jKaJG7B';

export const getStoredConfig = (): string => localStorage.getItem('satyam_mall_sheet_url') || GOOGLE_SHEET_API_URL;
export const saveConfig = (url: string) => localStorage.setItem('satyam_mall_sheet_url', url);

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
    if (data.error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any, index: number) => ({
      id: String(row.id || index + 1),
      name: row.name || '',
      category: (row.category as Category) || Category.OTHERS,
      quantity: Number(row.quantity) || 0,
      unit: row.unit || 'pcs',
      minLevel: Number(row.minlevel || row.minLevel || 5)
    }));
  } catch {
    return [];
  }
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${getStoredConfig()}?sheet=Transactions`);
    const data = await response.json();
    if (data.error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((row: any, index: number) => ({
      id: String(index + 1),
      date: row.date || new Date().toISOString(),
      type: row.type as TransactionType,
      itemName: row.itemname || row.itemName || '',
      quantity: Number(row.quantity) || 0,
      unit: row.unit || '',
      location: row.location || '',
      personName: row.personname || row.personName || '',
      notes: row.notes || ''
    }));
  } catch {
    return [];
  }
};

export const submitTransaction = async (transaction: Omit<Transaction, 'id' | 'date'>): Promise<boolean> => {
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

export const uploadFileToDrive = async (file: File, itemName: string): Promise<{ success: boolean; fileUrl?: string }> => {
  try {
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
        fileName: `${itemName}_${Date.now()}_${file.name}`,
        mimeType: file.type,
        fileData: base64Data,
        folderId: GOOGLE_DRIVE_FOLDER_ID
      })
    });
    const result = await response.json();
    return result.status === 'success' ? { success: true, fileUrl: result.fileUrl } : { success: false };
  } catch {
    return { success: false };
  }
};
