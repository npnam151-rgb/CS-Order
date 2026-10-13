import { Customer, ProductItem, AppConfig, OrderSubmission } from '../types';
import { INITIAL_CUSTOMERS, INITIAL_PRODUCTS, DEFAULT_CONFIG } from '../data/initialData';

const CUSTOMERS_KEY = 'beer_order_customers_v1';
const PRODUCTS_KEY = 'beer_order_products_v1';
const CONFIG_KEY = 'beer_order_config_v1';
const HISTORY_KEY = 'beer_order_history_v1';
const DRAFT_PREFIX = 'beer_order_draft_';

export function getCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CUSTOMERS;
  } catch {
    return INITIAL_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

export function getProducts(): ProductItem[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (!raw) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PRODUCTS;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: ProductItem[]): void {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export function getConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AppConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getOrderHistory(): OrderSubmission[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addOrderSubmission(submission: OrderSubmission): void {
  const history = getOrderHistory();
  const updated = [submission, ...history].slice(0, 50); // keep last 50
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function updateOrderSubmissionStatus(id: string, status: 'synced' | 'failed', message?: string): void {
  const history = getOrderHistory();
  const updated = history.map(item => item.id === id ? { ...item, status, syncMessage: message } : item);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function getDraft(dateStr: string): Record<string, Record<string, number>> {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + dateStr);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDraft(dateStr: string, quantities: Record<string, Record<string, number>>): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + dateStr, JSON.stringify(quantities));
  } catch (e) {
    console.error('Failed to save draft', e);
  }
}

export function getDraftTableRows(dateStr: string): any[] | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + 'rows_' + dateStr);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraftTableRows(dateStr: string, rows: any[]): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + 'rows_' + dateStr, JSON.stringify(rows));
  } catch (e) {
    console.error('Failed to save draft rows', e);
  }
}

export function clearDraft(dateStr: string): void {
  localStorage.removeItem(DRAFT_PREFIX + dateStr);
  localStorage.removeItem(DRAFT_PREFIX + 'rows_' + dateStr);
}
