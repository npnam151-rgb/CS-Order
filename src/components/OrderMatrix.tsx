import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  User,
  Plus,
  Minus,
  Trash2,
  Send,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  Settings,
  ChevronDown,
  Edit3,
  CheckCircle2,
  Store,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Customer, ProductItem, TableRowEntry } from '../types';

interface OrderMatrixProps {
  customers: Customer[];
  products: ProductItem[];
  salesReps: string[];
  orderDate: string;
  onChangeOrderDate: (date: string) => void;
  salesRep: string;
  onChangeSalesRep: (name: string) => void;
  rows: TableRowEntry[];
  onAddOrUpdateCustomerRow: (customerId: string, quantities: Record<string, number>, notes?: string) => void;
  onRemoveRow: (rowId: string) => void;
  onClearAllRows: () => void;
  onSubmitToSheets: () => Promise<void>;
  onExportCSV: () => void;
  isSubmitting: boolean;
  submitStatus: { success: boolean; message: string } | null;
  hasScriptConfigured: boolean;
  onOpenAdmin: (tab?: 'customers' | 'products' | 'settings' | 'reports') => void;
}

export const OrderMatrix: React.FC<OrderMatrixProps> = ({
  customers,
  products,
  salesReps,
  orderDate,
  onChangeOrderDate,
  salesRep,
  onChangeSalesRep,
  rows,
  onAddOrUpdateCustomerRow,
  onRemoveRow,
  onClearAllRows,
  onSubmitToSheets,
  onExportCSV,
  isSubmitting,
  submitStatus,
  hasScriptConfigured,
  onOpenAdmin,
}) => {
  const activeProducts = useMemo(() => products.filter(p => p.active), [products]);
  const activeCustomers = useMemo(() => customers.filter(c => c.active), [customers]);

  // Map customerId -> Customer
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  // Current single customer input state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [currentQuantities, setCurrentQuantities] = useState<Record<string, number>>({});
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [formValidationMsg, setFormValidationMsg] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const customerSelectRef = useRef<HTMLSelectElement>(null);

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => {
        setConfirmReset(false);
      }, 4000);
    } else {
      setConfirmReset(false);
      onClearAllRows();
    }
  };

  // When customer dropdown changes
  const handleSelectCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    setFormValidationMsg(null);

    // If this customer is already in the list, pre-fill their existing quantities so user can edit!
    const existing = rows.find(r => r.customerId === cId);
    if (existing) {
      setCurrentQuantities({ ...existing.quantities });
      setCurrentNotes(existing.notes || '');
      setIsEditingExisting(true);
    } else {
      // Clear quantities for fresh entry
      setCurrentQuantities({});
      setCurrentNotes('');
      setIsEditingExisting(false);
    }
  };

  // Step quantity for current single customer input
  const handleStepCurrentQty = (productId: string, delta: number) => {
    const current = currentQuantities[productId] || 0;
    const nextVal = Math.max(0, current + delta);
    setCurrentQuantities(prev => {
      const next = { ...prev };
      if (nextVal === 0) {
        delete next[productId];
      } else {
        next[productId] = nextVal;
      }
      return next;
    });
    setFormValidationMsg(null);
  };

  // Input quantity directly
  const handleInputCurrentQty = (productId: string, valStr: string) => {
    const num = parseInt(valStr, 10);
    const nextVal = isNaN(num) || num < 0 ? 0 : num;
    setCurrentQuantities(prev => {
      const next = { ...prev };
      if (nextVal === 0) {
        delete next[productId];
      } else {
        next[productId] = nextVal;
      }
      return next;
    });
    setFormValidationMsg(null);
  };

  // Click (+) Thêm khách tiếp theo
  const handleAddNextCustomer = () => {
    if (!selectedCustomerId) {
      setFormValidationMsg('Vui lòng chọn Quán / Khách hàng từ menu Dropdown trước!');
      customerSelectRef.current?.focus();
      return;
    }

    const hasAnyQty = activeProducts.some(p => (currentQuantities[p.id] || 0) > 0);
    if (!hasAnyQty) {
      setFormValidationMsg('Vui lòng nhập số lượng (Bom 50L, Bom 30L hoặc Keg 1L) cho khách này!');
      return;
    }

    // Save to list
    onAddOrUpdateCustomerRow(selectedCustomerId, currentQuantities, currentNotes);

    // Reset current form for NEXT customer
    setSelectedCustomerId('');
    setCurrentQuantities({});
    setCurrentNotes('');
    setFormValidationMsg(null);
    setIsEditingExisting(false);

    // Focus back on customer select
    setTimeout(() => {
      customerSelectRef.current?.focus();
    }, 50);
  };

  // Reset current single form
  const handleResetCurrentForm = () => {
    setSelectedCustomerId('');
    setCurrentQuantities({});
    setCurrentNotes('');
    setFormValidationMsg(null);
    setIsEditingExisting(false);
  };

  // Load a row from summary table back into form to edit
  const handleEditRow = (row: TableRowEntry) => {
    setSelectedCustomerId(row.customerId);
    setCurrentQuantities({ ...row.quantities });
    setCurrentNotes(row.notes || '');
    setIsEditingExisting(true);
    setFormValidationMsg(null);
    // Smooth scroll to top form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    customerSelectRef.current?.focus();
  };

  // Totals calculations
  const { totalsByProduct, totalItemsCount } = useMemo(() => {
    const totals: Record<string, number> = {};
    activeProducts.forEach(p => {
      totals[p.id] = 0;
    });

    let totalItems = 0;

    rows.forEach(r => {
      if (!r.customerId) return;
      activeProducts.forEach(p => {
        const qty = r.quantities[p.id] || 0;
        if (qty > 0) {
          totals[p.id] = (totals[p.id] || 0) + qty;
          totalItems += qty;
        }
      });
    });

    return {
      totalsByProduct: totals,
      totalItemsCount: totalItems,
    };
  }, [rows, activeProducts]);

  const setToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    onChangeOrderDate(`${y}-${m}-${d}`);
  };

  return (
    <div className="space-y-6">
      {/* Basic Date and Sales Rep Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Order Date (Column A) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Ngày đặt hàng (Cột A)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={orderDate}
                onChange={e => onChangeOrderDate(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <button
                type="button"
                onClick={setToday}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shrink-0 cursor-pointer"
              >
                Hôm nay
              </button>
            </div>
          </div>

          {/* Sales Rep (Column B) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-600" />
              <span>NV Sale đặt đơn (Cột B)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="sales-reps-list"
                value={salesRep}
                onChange={e => onChangeSalesRep(e.target.value)}
                placeholder="Chọn hoặc gõ tên nhân viên sale..."
                className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <datalist id="sales-reps-list">
                {salesReps.map(rep => (
                  <option key={rep} value={rep} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. SINGLE CUSTOMER INPUT CARD (NHẬP TỪNG KHÁCH - ĐỠ RỐI) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border-2 border-amber-400 shadow-md p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditingExisting ? 'Chỉnh Sửa Đơn Hàng Của Quán' : 'Nhập Đơn Từng Khách Hàng (Dropdown)'}
              </h2>
              <p className="text-xs text-slate-500">
                Chọn quán từ menu Dropdown, chọn số lượng bia rồi nhấn nút <b>(+) Thêm khách tiếp theo</b>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenAdmin('customers')}
            className="text-xs text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            title="Thêm hoặc sửa danh sách quán trong Admin"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quản lý quán trong Admin</span>
          </button>
        </div>

        {/* Step 1: Customer Dropdown Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Chọn Quán / Khách hàng (Cột C):
          </label>
          <div className="relative">
            <select
              ref={customerSelectRef}
              value={selectedCustomerId}
              onChange={e => handleSelectCustomer(e.target.value)}
              className="w-full py-3 pl-4 pr-10 text-base font-semibold rounded-xl border-2 border-amber-300 bg-amber-50/40 text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer shadow-xs transition-all"
            >
              <option value="">
                -- Bấm vào đây để chọn quán ({activeCustomers.length} quán trong Dropdown) --
              </option>
              {activeCustomers.map(c => {
                const isAlreadyInList = rows.some(r => r.customerId === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {isAlreadyInList ? '✓ (Đã có trong danh sách hôm nay)' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-5 h-5 text-amber-700 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Step 2: Product Quantities Steppers */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Nhập số lượng từng loại (Bom 50l, Bom 30l, Keg1L...):
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeProducts.map(prod => {
              const qty = currentQuantities[prod.id] || 0;
              return (
                <div
                  key={prod.id}
                  className={`p-3 rounded-xl border transition-all ${
                    qty > 0
                      ? 'border-amber-400 bg-amber-50/70 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-900">
                      {prod.name}
                    </span>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      {prod.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleStepCurrentQty(prod.id, -1)}
                      disabled={qty === 0}
                      className="w-10 h-10 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-lg transition-colors active:scale-95 cursor-pointer shadow-2xs"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      max="9999"
                      value={qty === 0 ? '' : qty}
                      placeholder="0"
                      onChange={e => handleInputCurrentQty(prod.id, e.target.value)}
                      className={`w-20 h-10 text-center font-mono tabular-nums text-lg font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white transition-colors ${
                        qty > 0 ? 'border-amber-500 text-amber-950 font-black' : 'border-slate-300 text-slate-700'
                      }`}
                    />

                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => handleStepCurrentQty(prod.id, 1)}
                      className="w-10 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center font-bold text-lg transition-colors active:scale-95 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation warning */}
        {formValidationMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formValidationMsg}</span>
          </div>
        )}

        {/* Big (+) Button: Thêm khách tiếp theo */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(selectedCustomerId || Object.keys(currentQuantities).length > 0) && (
              <button
                type="button"
                onClick={handleResetCurrentForm}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy / Xóa ô nhập này
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddNextCustomer}
            className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.98] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>
              {isEditingExisting
                ? 'Lưu Thay Đổi & Nhập Khách Tiếp Theo'
                : '(+) THÊM KHÁCH NÀY & NHẬP KHÁCH TIẾP THEO'}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. LIVE ORDER SUMMARY TABLE (BẢNG CÁC QUÁN ĐÃ LÊN ĐƠN) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <span>Danh Sách Các Quán Đã Lên Đơn Hôm Nay:</span>
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full font-mono">
                {rows.length} quán
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu hiển thị chuẩn theo đúng biểu mẫu Google Sheet (Ngày, NV Sale, Khách hàng, Bom 50L, Bom 30L, Keg1L...)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {rows.length > 0 && (
              <button
                type="button"
                onClick={handleResetClick}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  confirmReset
                    ? 'bg-rose-600 text-white hover:bg-rose-700 ring-2 ring-rose-300'
                    : 'bg-slate-100 text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-200'
                }`}
                title={confirmReset ? 'Bấm lần nữa để xác nhận xóa sạch toàn bộ đơn hôm nay' : 'Đặt lại bảng về 0 quán'}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${confirmReset ? 'animate-spin' : ''}`} />
                <span>{confirmReset ? 'Xác nhận xóa hết?' : 'Xóa trắng / Reset bảng'}</span>
              </button>
            )}
          </div>
        </div>

        {/* The Spreadsheet-style table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-300">
              <tr>
                <th className="py-3 px-3 w-12 text-center border-r border-slate-200">
                  STT
                </th>
                <th className="py-3 px-4 min-w-[200px] border-r border-slate-200">
                  Khách Hàng (Cột C)
                </th>

                {/* Product Columns matching screenshot: Bom 50l (bom), Bom 30l (bom), Keg1L (két) */}
                {activeProducts.map(prod => (
                  <th
                    key={prod.id}
                    className="py-3 px-4 min-w-[130px] text-center border-r border-slate-200 bg-amber-50/50 text-amber-950"
                  >
                    <div className="font-bold text-sm">
                      {prod.name} <span className="text-xs font-normal text-amber-800">({prod.unit})</span>
                    </div>
                  </th>
                ))}

                <th className="py-3 px-4 min-w-[100px] text-center border-r border-slate-200">
                  Tổng Quán
                </th>
                <th className="py-3 px-3 w-28 text-center">
                  Thao Tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-sm">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeProducts.length + 4}
                    className="py-12 text-center text-slate-400 space-y-2"
                  >
                    <Store className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-slate-600">Chưa có khách nào được thêm.</p>
                    <p className="text-xs">
                      Hãy chọn quán ở khung phía trên và bấm <b>(+) THÊM KHÁCH NÀY & NHẬP KHÁCH TIẾP THEO</b>.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const customer = customerMap.get(row.customerId);
                  const custName = customer ? customer.name : 'Chưa chọn';
                  const rowSum = activeProducts.reduce(
                    (acc, p) => acc + (row.quantities[p.id] || 0),
                    0
                  );

                  return (
                    <tr
                      key={row.rowId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* STT */}
                      <td className="py-2.5 px-3 text-center text-xs text-slate-400 font-mono tabular-nums border-r border-slate-100">
                        {index + 1}
                      </td>

                      {/* Customer Name */}
                      <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-100">
                        <span className="text-slate-900">{custName}</span>
                      </td>

                      {/* Products */}
                      {activeProducts.map(prod => {
                        const qty = row.quantities[prod.id] || 0;
                        return (
                          <td
                            key={prod.id}
                            className="py-2.5 px-4 border-r border-slate-100 text-center font-mono tabular-nums text-sm font-bold"
                          >
                            {qty > 0 ? (
                              <span className="text-amber-950 bg-amber-100 px-2.5 py-1 rounded font-black">
                                {qty}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="py-2.5 px-4 text-center font-mono tabular-nums text-sm font-bold border-r border-slate-100 text-slate-800">
                        {rowSum > 0 ? (
                          <span className="text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                            {rowSum}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditRow(row)}
                            title="Sửa số lượng quán này"
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveRow(row.rowId)}
                            title="Xóa quán này khỏi danh sách"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer */}
            {rows.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-bold text-sm shadow-md">
                <tr>
                  <td className="py-3 px-3 text-center border-r border-slate-800 text-xs text-slate-400">
                    ∑
                  </td>
                  <td className="py-3 px-4 border-r border-slate-800">
                    <span>TỔNG CỘNG ĐƠN HÀNG ({rows.length} quán)</span>
                  </td>

                  {activeProducts.map(prod => (
                    <td
                      key={prod.id}
                      className="py-3 px-4 text-center border-r border-slate-800 font-mono tabular-nums text-amber-400 text-base"
                    >
                      {totalsByProduct[prod.id] || 0}{' '}
                      <span className="text-xs font-normal text-slate-400">{prod.unit}</span>
                    </td>
                  ))}

                  <td className="py-3 px-4 text-center font-mono tabular-nums text-white text-base">
                    {totalItemsCount}
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Script configuration alert if not configured */}
      {!hasScriptConfigured && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Chưa lưu Web App URL Google Sheets. Bạn có thể cài đặt kết nối trong module Admin hoặc tải file Excel/CSV.
            </span>
          </div>
          <button
            onClick={() => onOpenAdmin('settings')}
            className="px-3 py-1 font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            Cài Đặt Sheet Trong Admin
          </button>
        </div>
      )}

      {/* Submit notification status */}
      {submitStatus && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            submitStatus.success
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {submitStatus.success ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{submitStatus.message}</span>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span>
            Ngày: <b className="text-slate-900 font-mono">{orderDate}</b>
          </span>
          <span>·</span>
          <span>
            NV Sale: <b className="text-slate-900">{salesRep || 'Chưa chọn'}</b>
          </span>
          <span>·</span>
          <span>
            Đã nhập: <b className="text-amber-800 font-bold">{rows.length} quán</b>
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Export CSV */}
          <button
            type="button"
            onClick={onExportCSV}
            disabled={rows.length === 0}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Tải Excel / CSV</span>
          </button>

          {/* Primary CTA: Send to Google Sheets */}
          <button
            type="button"
            onClick={onSubmitToSheets}
            disabled={isSubmitting || rows.length === 0}
            className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang Gửi Vào Google Sheet...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Gửi Đơn Vào Google Sheet ({rows.length} Quán)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
