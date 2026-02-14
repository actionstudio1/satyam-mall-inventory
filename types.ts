export enum Category {
  HOUSEKEEPING = 'Housekeeping',
  PANTRY = 'Pantry',
  STATIONERY = 'Stationery',
  OTHERS = 'Others'
}

export enum TransactionType {
  ISSUE = 'ISSUE', // Giving items to floors
  RECEIVE = 'RECEIVE' // Buying/Stocking items
}

export enum FloorLocation {
  BASEMENT = 'Basement',
  GROUND = 'Ground Floor',
  FIRST = '1st Floor',
  SECOND = '2nd Floor',
  THIRD = '3rd Floor',
  FOURTH = '4th Floor',
  FIFTH = '5th Floor',
  SIXTH = '6th Floor',
  SEVENTH = '7th Floor',
  OFFICE = 'Main Office',
  STORE = 'Store Room'
}

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  quantity: number;
  unit: string; // e.g., pcs, liters, kg
  minLevel: number; // For low stock alerts
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  itemName: string;
  quantity: number;
  unit?: string;
  location: FloorLocation | string;
  personName: string; // Who took it or who delivered it
  notes?: string;
  fileUrl?: string; // Uploaded invoice/photo URL
}

export interface SheetConfig {
  scriptUrl: string;
}