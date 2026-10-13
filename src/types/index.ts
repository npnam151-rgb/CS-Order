export interface Customer {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  active: boolean;
  orderIndex: number;
}

export interface ProductItem {
  id: string;
  name: string;
  unit: string; // 'bom', 'két', 'thùng', 'lon', etc.
  key: string;
  active: boolean;
  orderIndex: number;
}

export interface OrderRowData {
  customerId: string;
  customerName: string;
  quantities: Record<string, number>; // key: product.id -> number
  notes?: string;
}

export interface TableRowEntry {
  rowId: string;
  customerId: string; // selected from customer dropdown
  quantities: Record<string, number>;
  notes?: string;
}

export interface OrderSubmission {
  id: string;
  orderDate: string; // YYYY-MM-DD
  salesRep: string;
  submittedAt: string; // ISO string
  rows: OrderRowData[];
  totals: Record<string, number>; // product.id -> sum
  totalCustomersWithOrder: number;
  status: 'synced' | 'pending' | 'failed';
  syncMessage?: string;
  sheetUrl?: string;
}

export interface AppConfig {
  scriptUrl: string;
  sheetName: string;
  adminPin: string;
  salesReps: string[];
}
