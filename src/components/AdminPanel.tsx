import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Store,
  Package,
  Settings2,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Upload,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  Terminal,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Customer, ProductItem, AppConfig, OrderSubmission } from '../types';
import { APPS_SCRIPT_TEMPLATE } from '../services/googleSheets';

interface AdminPanelProps {
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  products: ProductItem[];
  onUpdateProducts: (products: ProductItem[]) => void;
  config: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  orderHistory: OrderSubmission[];
  onOpenBulkImport: () => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string }>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  customers,
  onUpdateCustomers,
  products,
  onUpdateProducts,
  config,
  onUpdateConfig,
  orderHistory,
  onOpenBulkImport,
  onTestConnection,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'customers' | 'products' | 'settings' | 'reports'>('customers');

  // Customer Management states
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingCustomerName, setEditingCustomerName] = useState('');

  // Product Management states
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('bom');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductUnit, setEditingProductUnit] = useState('');

  // Google Sheets settings states
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl);
  const [sheetName, setSheetName] = useState(config.sheetName || 'Đặt Hàng');
  const [newSalesPerson, setNewSalesPerson] = useState('');
  const [newPin, setNewPin] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Authentication logic
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === config.adminPin || pinInput === '1234') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Customer actions
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const newCust: Customer = {
      id: `c_${Date.now()}`,
      name: newCustomerName.trim(),
      active: true,
      orderIndex: customers.length + 1,
    };

    onUpdateCustomers([newCust, ...customers]);
    setNewCustomerName('');
  };

  const handleStartEditCustomer = (c: Customer) => {
    setEditingCustomerId(c.id);
    setEditingCustomerName(c.name);
  };

  const handleSaveEditCustomer = () => {
    if (!editingCustomerId || !editingCustomerName.trim()) return;
    const updated = customers.map(c =>
      c.id === editingCustomerId ? { ...c, name: editingCustomerName.trim() } : c
    );
    onUpdateCustomers(updated);
    setEditingCustomerId(null);
  };

  const handleDeleteCustomer = (id: string) => {
    onUpdateCustomers(customers.filter(c => c.id !== id));
  };

  const handleToggleCustomerActive = (id: string) => {
    onUpdateCustomers(
      customers.map(c => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  // Product actions
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const newProd: ProductItem = {
      id: `prod_${Date.now()}`,
      name: newProductName.trim(),
      unit: newProductUnit.trim() || 'bom',
      key: `prod_${Date.now()}`,
      active: true,
      orderIndex: products.length + 1,
    };

    onUpdateProducts([...products, newProd]);
    setNewProductName('');
  };

  const handleStartEditProduct = (p: ProductItem) => {
    setEditingProductId(p.id);
    setEditingProductName(p.name);
    setEditingProductUnit(p.unit);
  };

  const handleSaveEditProduct = () => {
    if (!editingProductId || !editingProductName.trim()) return;
    const updated = products.map(p =>
      p.id === editingProductId
        ? { ...p, name: editingProductName.trim(), unit: editingProductUnit.trim() }
        : p
    );
    onUpdateProducts(updated);
    setEditingProductId(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (products.length <= 1) return;
    onUpdateProducts(products.filter(p => p.id !== id));
  };

  const handleToggleProductActive = (id: string) => {
    onUpdateProducts(
      products.map(p => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  // Settings actions
  const handleSaveSettings = () => {
    const updatedConfig: AppConfig = {
      ...config,
      scriptUrl: scriptUrl.trim(),
      sheetName: sheetName.trim() || 'Đặt Hàng',
      adminPin: newPin.trim() ? newPin.trim() : config.adminPin,
    };
    onUpdateConfig(updatedConfig);
    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 2500);
  };

  const handleAddSalesPerson = () => {
    if (!newSalesPerson.trim()) return;
    const reps = [...config.salesReps, newSalesPerson.trim()];
    onUpdateConfig({ ...config, salesReps: reps });
    setNewSalesPerson('');
  };

  const handleRemoveSalesPerson = (name: string) => {
    const reps = config.salesReps.filter(r => r !== name);
    onUpdateConfig({ ...config, salesReps: reps });
  };

  const handleTestScript = async () => {
    if (!scriptUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await onTestConnection(scriptUrl.trim());
    setTesting(false);
    setTestResult(res);
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase().trim())
  );

  // Reports calculations
  const totalOrders = orderHistory.length;
  const totalVolumeByProduct: Record<string, number> = {};
  orderHistory.forEach(order => {
    order.rows.forEach(r => {
      Object.entries(r.quantities).forEach(([prodId, qty]) => {
        totalVolumeByProduct[prodId] = (totalVolumeByProduct[prodId] || 0) + (qty || 0);
      });
    });
  });

  // If not logged in, show PIN pad
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Đăng Nhập Quản Trị Viên</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Vui lòng nhập mã PIN quản trị để cấu hình điểm bán, mặt hàng và Google Sheets.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={10}
              value={pinInput}
              onChange={e => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Nhập mã PIN (Mặc định: 1234)"
              className="w-full text-center text-xl tracking-widest font-mono py-2.5 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-rose-600 mt-2 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Mã PIN không chính xác. Mã mặc định là 1234.</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs"
          >
            Mở Khóa Quản Trị
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Admin Sub-navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Bảng Điều Khiển Quản Trị (Admin)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý danh sách điểm bán, danh mục mặt hàng, cấu hình kết nối và báo cáo.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'customers'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-amber-600" />
            <span>Điểm Bán ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'products'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-amber-600" />
            <span>Mặt Hàng ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Cấu Hình Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Quản lý Điểm Bán / Khách Hàng */}
      {activeTab === 'customers' && (
        <div className="p-6 space-y-6">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Add single customer */}
            <form onSubmit={handleAddCustomer} className="flex-1 flex gap-2 max-w-md">
              <input
                type="text"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="Nhập tên quán mới (VD: Bia Hơi 999)..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </form>

            <div className="flex items-center gap-3">
              {/* Search */}
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                placeholder="Lọc tên quán..."
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-44"
              />

              {/* Bulk import */}
              <button
                onClick={onOpenBulkImport}
                className="px-4 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập 100+ Quán Hàng Loạt</span>
              </button>
            </div>
          </div>

          {/* Customer List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên Điểm Bán / Khách Hàng</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 w-32 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust, idx) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {editingCustomerId === cust.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingCustomerName}
                            onChange={e => setEditingCustomerName(e.target.value)}
                            className="px-2 py-1 text-sm border border-amber-500 rounded focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditCustomer}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCustomerId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span>{cust.name}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleCustomerActive(cust.id)}
                        className={`text-xs font-medium px-2 py-0.5 rounded cursor-pointer ${
                          cust.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500 line-through'
                        }`}
                      >
                        {cust.active ? 'Đang hoạt động' : 'Tạm ẩn'}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEditCustomer(cust)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Sửa tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa điểm bán"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Quản lý Mặt Hàng */}
      {activeTab === 'products' && (
        <div className="p-6 space-y-6">
          {/* Add product form */}
          <form
            onSubmit={handleAddProduct}
            className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
          >
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-slate-700">Tên Mặt Hàng Mới:</label>
              <input
                type="text"
                value={newProductName}
                onChange={e => setNewProductName(e.target.value)}
                placeholder="VD: Bom 20l, Keg 2L, Bia lon 330ml..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="w-36 space-y-1">
              <label className="text-xs font-bold text-slate-700">Đơn Vị Tính:</label>
              <input
                type="text"
                value={newProductUnit}
                onChange={e => setNewProductUnit(e.target.value)}
                placeholder="bom, két, thùng..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shrink-0 flex items-center justify-center gap-1 h-9.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Mặt Hàng</span>
            </button>
          </form>

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên Mặt Hàng</th>
                  <th className="py-3 px-4 w-32">Đơn Vị Tính</th>
                  <th className="py-3 px-4 w-40">Hiển Thị Trên Sheet</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 w-28 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod, idx) => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {editingProductId === prod.id ? (
                        <input
                          type="text"
                          value={editingProductName}
                          onChange={e => setEditingProductName(e.target.value)}
                          className="px-2 py-1 text-sm border border-amber-500 rounded focus:outline-none"
                        />
                      ) : (
                        <span>{prod.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {editingProductId === prod.id ? (
                        <input
                          type="text"
                          value={editingProductUnit}
                          onChange={e => setEditingProductUnit(e.target.value)}
                          className="w-20 px-2 py-1 text-sm border border-amber-500 rounded focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {prod.unit}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                      {prod.name} ({prod.unit})
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleProductActive(prod.id)}
                        className={`text-xs font-medium px-2 py-0.5 rounded cursor-pointer ${
                          prod.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500 line-through'
                        }`}
                      >
                        {prod.active ? 'Đang bật' : 'Đang ẩn'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingProductId === prod.id ? (
                          <>
                            <button
                              onClick={handleSaveEditProduct}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProductId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cấu hình Google Sheets & Quản trị */}
      {activeTab === 'settings' && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sheet URL & Connection */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-amber-600" />
                <span>Cấu Hình Web App URL Google Sheets</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  URL Ứng Dụng Web (Google Apps Script):
                </label>
                <input
                  type="url"
                  value={scriptUrl}
                  onChange={e => {
                    setScriptUrl(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Tên Tab Trang Tính (Sheet Name):
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value)}
                  placeholder="Đặt Hàng"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestScript}
                  disabled={testing || !scriptUrl.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{testing ? 'Đang Kiểm Tra...' : 'Kiểm Tra Kết Nối'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Lưu Thiết Lập
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              {saveSettingsSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200">
                  Đã lưu cấu hình Google Sheets thành công!
                </div>
              )}
            </div>

            {/* Sales Reps & Security PIN */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Danh Sách Nhân Viên Sale</span>
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSalesPerson}
                  onChange={e => setNewSalesPerson(e.target.value)}
                  placeholder="Thêm tên nhân viên kinh doanh..."
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddSalesPerson}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Thêm
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                {config.salesReps.map(rep => (
                  <span
                    key={rep}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    <span>{rep}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSalesPerson(rep)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Đổi Mã PIN Quản Trị:
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={10}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="Mã PIN mới (VD: 9999)"
                    className="w-40 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-800"
                  >
                    Đổi PIN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Báo Cáo & Thống Kê */}
      {activeTab === 'reports' && (
        <div className="p-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500 block">Tổng Lần Gửi Đơn</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {totalOrders}
              </span>
            </div>

            {products.map(prod => (
              <div key={prod.id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                <span className="text-xs font-medium text-amber-900 block truncate">
                  {prod.name} ({prod.unit})
                </span>
                <span className="text-2xl font-bold text-amber-950 font-mono tabular-nums mt-1 block">
                  {totalVolumeByProduct[prod.id] || 0}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Orders Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">Lịch Sử Các Lần Gửi Đơn Gần Đây:</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm divide-y divide-slate-200">
                <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Thời Gian</th>
                    <th className="py-2.5 px-3">Ngày Đặt Hàng</th>
                    <th className="py-2.5 px-3">NV Sale</th>
                    <th className="py-2.5 px-3 text-center">Số Điểm Bán</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        Chưa có đơn hàng nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    orderHistory.map(ord => (
                      <tr key={ord.id} className="hover:bg-slate-50 text-xs">
                        <td className="py-2 px-3 text-slate-500 font-mono">
                          {new Date(ord.submittedAt).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {ord.orderDate}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{ord.salesRep}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-amber-800">
                          {ord.totalCustomersWithOrder} quán
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              ord.status === 'synced'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ord.status === 'synced' ? 'Đã lưu Sheet' : 'Chưa lưu Sheet'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
