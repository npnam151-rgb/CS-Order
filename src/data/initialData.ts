import { Customer, ProductItem, AppConfig } from '../types';

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

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c_1', name: '8 lê đại hành', active: true, orderIndex: 1 },
  { id: 'c_2', name: 'Du mục', active: true, orderIndex: 2 },
  { id: 'c_3', name: 'Hàng quán', active: true, orderIndex: 3 },
  { id: 'c_4', name: 'Tự do', active: true, orderIndex: 4 },
  { id: 'c_5', name: 'Bia Ơi', active: true, orderIndex: 5 },
  { id: 'c_6', name: 'Bia Hơi Phố Cổ', active: true, orderIndex: 6 },
  { id: 'c_7', name: 'Cây Khế Quán', active: true, orderIndex: 7 },
  { id: 'c_8', name: 'Góc Phố 1982', active: true, orderIndex: 8 },
  { id: 'c_9', name: 'Hải Xồm - Tăng Bạt Hổ', active: true, orderIndex: 9 },
  { id: 'c_10', name: 'Thu Hằng - Kim Mã', active: true, orderIndex: 10 },
  { id: 'c_11', name: 'Lan Chín - Hai Bà Trưng', active: true, orderIndex: 11 },
  { id: 'c_12', name: 'Cường Hói - Thụy Khuê', active: true, orderIndex: 12 },
  { id: 'c_13', name: 'Chiến Béo - Nghi Tàm', active: true, orderIndex: 13 },
  { id: 'c_14', name: 'Vườn Bia 68', active: true, orderIndex: 14 },
  { id: 'c_15', name: 'Nhà Sàn Quán', active: true, orderIndex: 15 },
  { id: 'c_16', name: 'Bia Hơi Tây Hồ', active: true, orderIndex: 16 },
  { id: 'c_17', name: 'Ẩm Thực Du Ca', active: true, orderIndex: 17 },
  { id: 'c_18', name: 'Quán Gió Trúc Bạch', active: true, orderIndex: 18 },
  { id: 'c_19', name: 'Bia Hơi Đồng Đội', active: true, orderIndex: 19 },
  { id: 'c_20', name: 'Bia Hơi Ngon 36', active: true, orderIndex: 20 },
];

export const INITIAL_SALES_REPS: string[] = [
  'Nguyễn Văn Nam',
  'Trần Minh Tuấn',
  'Lê Hoàng Long',
  'Phạm Quốc Huy',
  'Vũ Đức Thắng',
];

export const DEFAULT_CONFIG: AppConfig = {
  scriptUrl: '',
  sheetName: 'Đặt Hàng',
  adminPin: '1234',
  salesReps: INITIAL_SALES_REPS,
};
