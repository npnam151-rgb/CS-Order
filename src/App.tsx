/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Customer, ProductItem, AppConfig, OrderSubmission, OrderRowData, TableRowEntry } from './types';
import {
  getCustomers,
  saveCustomers,
  getProducts,
  saveProducts,
  getConfig,
  saveConfig,
  getOrderHistory,
  addOrderSubmission,
  clearDraft,
} from './services/storage';
import {
  buildSyncPayload,
  sendOrderToGoogleSheets,
  exportToCSV,
  testConnection,
} from './services/googleSheets';
import { Header } from './components/Header';
import { OrderMatrix } from './components/OrderMatrix';
import { AdminPanel } from './components/AdminPanel';
import { BulkImportModal } from './components/BulkImportModal';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'order' | 'admin'>('order');
  const [adminSubTab, setAdminSubTab] = useState<'customers' | 'products' | 'settings' | 'reports'>('customers');
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Persistent Core Data
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [products, setProducts] = useState<ProductItem[]>(() => getProducts());
  const [config, setConfig] = useState<AppConfig>(() => getConfig());
  const [orderHistory, setOrderHistory] = useState<OrderSubmission[]>(() => getOrderHistory());

  // Form State
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [orderDate, setOrderDate] = useState<string>(todayStr);
  const [salesRep, setSalesRep] = useState<string>(() => config.salesReps[0] || 'Nguyễn Văn Nam');

  // Table rows with dropdown - always starts completely empty on app open
  const [rows, setRows] = useState<TableRowEntry[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success: boolean; message: string } | null>(null);

  // When order date changes, clear table for new date
  const handleDateChange = (newDate: string) => {
    setOrderDate(newDate);
    setRows([]);
    setSubmitStatus(null);
  };

  // Add or update a customer's order row
  const handleAddOrUpdateCustomerRow = (
    customerId: string,
    quantities: Record<string, number>,
    notes?: string
  ) => {
    setRows(prev => {
      const existingIndex = prev.findIndex(r => r.customerId === customerId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantities,
          notes,
        };
        return updated;
      } else {
        const newRow: TableRowEntry = {
          rowId: `row_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          customerId,
          quantities,
          notes,
        };
        return [...prev, newRow];
      }
    });
  };

  // Remove single row
  const handleRemoveRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.rowId !== rowId));
  };

  // Clear all rows
  const handleClearAllRows = () => {
    setRows([]);
    clearDraft(orderDate);
    setSubmitStatus({
      success: true,
      message: 'Đã xóa trắng toàn bộ danh sách đặt hàng hôm nay.',
    });
  };

  // Customer map
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  // Compute active order count
  const activeOrderCount = useMemo(() => {
    return rows.filter(r => {
      if (!r.customerId) return false;
      return Object.values(r.quantities).some(q => q > 0);
    }).length;
  }, [rows]);

  // Submit to Google Sheets
  const handleSubmitToSheets = async () => {
    if (!salesRep.trim()) {
      setSubmitStatus({
        success: false,
        message: 'Vui lòng chọn hoặc nhập tên NV Sale đặt đơn trước khi gửi!',
      });
      return;
    }

    if (/^\d+$/.test(salesRep.trim())) {
      setSubmitStatus({
        success: false,
        message: `"${salesRep}" là chữ số, không phải tên nhân viên. Vui lòng chọn hoặc gõ đúng tên NV Sale trước khi gửi!`,
      });
      return;
    }

    const validRows = rows.filter(r => {
      if (!r.customerId) return false;
      return Object.values(r.quantities).some(q => q > 0);
    });

    if (validRows.length === 0) {
      setSubmitStatus({
        success: false,
        message: 'Chưa có quán nào được thêm số lượng để gửi đơn.',
      });
      return;
    }

    // Convert to OrderRowData
    const orderRows: OrderRowData[] = validRows.map(r => {
      const cust = customerMap.get(r.customerId);
      return {
        customerId: r.customerId,
        customerName: cust ? cust.name : 'Khách hàng',
        quantities: r.quantities,
        notes: r.notes,
      };
    });

    const payload = buildSyncPayload(orderDate, salesRep, products, orderRows, config.sheetName);

    setIsSubmitting(true);
    setSubmitStatus(null);

    const result = await sendOrderToGoogleSheets(config.scriptUrl, payload);
    setIsSubmitting(false);

    // Save to local history
    const submission: OrderSubmission = {
      id: `ord_${Date.now()}`,
      orderDate,
      salesRep,
      submittedAt: new Date().toISOString(),
      rows: orderRows,
      totals: {},
      totalCustomersWithOrder: orderRows.length,
      status: result.success ? 'synced' : 'failed',
      syncMessage: result.message,
    };

    addOrderSubmission(submission);
    setOrderHistory(getOrderHistory());

    if (result.success) {
      // Clear rows immediately after successful submit
      setRows([]);
      clearDraft(orderDate);
      setSubmitStatus({
        success: true,
        message: `${result.message} Bảng đã được xóa trắng sẵn sàng cho đợt tiếp theo.`,
      });

      setTimeout(() => {
        setSubmitStatus(null);
      }, 6000);
    } else {
      setSubmitStatus(result);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const validRows = rows.filter(r => {
      if (!r.customerId) return false;
      return Object.values(r.quantities).some(q => q > 0);
    });

    const orderRows: OrderRowData[] = validRows.map(r => {
      const cust = customerMap.get(r.customerId);
      return {
        customerId: r.customerId,
        customerName: cust ? cust.name : 'Khách hàng',
        quantities: r.quantities,
        notes: r.notes,
      };
    });

    exportToCSV(orderDate, salesRep, products, orderRows);
  };

  // Customer Management Updates
  const handleUpdateCustomers = (updated: Customer[]) => {
    setCustomers(updated);
    saveCustomers(updated);
  };

  // Product Management Updates
  const handleUpdateProducts = (updated: ProductItem[]) => {
    setProducts(updated);
    saveProducts(updated);
  };

  // Config Updates
  const handleUpdateConfig = (updated: AppConfig) => {
    setConfig(updated);
    saveConfig(updated);
  };

  // Bulk Import
  const handleBulkImport = (newCustomers: Customer[], replaceAll: boolean) => {
    let nextList: Customer[];
    if (replaceAll) {
      nextList = newCustomers;
      setRows([]);
    } else {
      nextList = [...customers, ...newCustomers];
    }
    handleUpdateCustomers(nextList);
  };

  // Open Admin with target tab
  const handleOpenAdmin = (tab?: 'customers' | 'products' | 'settings' | 'reports') => {
    if (tab) {
      setAdminSubTab(tab);
    }
    setCurrentTab('admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar with clean Order and Admin navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeOrderCount={activeOrderCount}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'order' && (
          <OrderMatrix
            customers={customers}
            products={products}
            salesReps={config.salesReps}
            orderDate={orderDate}
            onChangeOrderDate={handleDateChange}
            salesRep={salesRep}
            onChangeSalesRep={setSalesRep}
            rows={rows}
            onAddOrUpdateCustomerRow={handleAddOrUpdateCustomerRow}
            onRemoveRow={handleRemoveRow}
            onClearAllRows={handleClearAllRows}
            onSubmitToSheets={handleSubmitToSheets}
            onExportCSV={handleExportCSV}
            isSubmitting={isSubmitting}
            submitStatus={submitStatus}
            hasScriptConfigured={Boolean(config.scriptUrl && config.scriptUrl.trim())}
            onOpenAdmin={handleOpenAdmin}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            customers={customers}
            onUpdateCustomers={handleUpdateCustomers}
            products={products}
            onUpdateProducts={handleUpdateProducts}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            orderHistory={orderHistory}
            onOpenBulkImport={() => setIsBulkImportOpen(true)}
            onTestConnection={testConnection}
            initialTab={adminSubTab}
            onBackToOrder={() => setCurrentTab('order')}
          />
        )}
      </main>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
        existingCount={customers.length}
      />

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>CS Order · Hệ Thống Đặt Hàng Bia Hơi & Đồng Bộ Google Sheets</p>
      </footer>
    </div>
  );
}
