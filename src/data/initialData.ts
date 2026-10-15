import { Customer, ProductItem, AppConfig } from '../types';
import { SHEET_CUSTOMERS } from './sheetCustomers';

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod_bom50',
    name: 'Bom 50l',
    unit: 'bom',
    key: 'bom_50l',
    active: true,
    orderIndex: 1,
  },
  {
    id: 'prod_bom30',
    name: 'Bom 30l',
    unit: 'bom',
    key: 'bom_30l',
    active: true,
    orderIndex: 2,
  },
  {
    id: 'prod_keg1l',
    name: 'Keg1L',
    unit: 'két',
    key: 'keg_1l',
    active: true,
    orderIndex: 3,
  },
];

export const INITIAL_CUSTOMERS: Customer[] = SHEET_CUSTOMERS;

export const INITIAL_SALES_REPS: string[] = [
  'Nguyễn Văn Nam',
  'Trần Minh Tuấn',
  'Lê Hoàng Long',
  'Phạm Quốc Huy',
  'Vũ Đức Thắng',
];

export const DEFAULT_CONFIG: AppConfig = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxd3j7Zucajx4i9F2GNr0RW-z9vsFN1za3re-tEW55DX-qwTOZ7RQ9puQ-xshXhqnqp/exec',
  sheetName: 'Đặt bia sỉ',
  adminPin: '1234',
  securityQuestion: 'Tên trường cấp 1 của bạn là gì?',
  securityAnswer: 'chu van an',
  recoveryEmail: 'npnam151@gmail.com',
  salesReps: INITIAL_SALES_REPS,
};
