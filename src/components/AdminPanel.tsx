import React, { useState, useEffect, useMemo } from 'react';
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
  Copy,
  Terminal,
  ShieldAlert,
  Users,
  Eye,
  Download,
  ExternalLink,
  RefreshCw,
  HelpCircle,
  FileSpreadsheet,
  Cloud,
  Laptop,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { Customer, ProductItem, AppConfig, OrderSubmission } from '../types';
import {
  APPS_SCRIPT_TEMPLATE,
  fetchSheetHistory,
  syncProductsToGoogleSheets,
  SheetHistoryRecord,
  fetchCustomersFromSheet,
} from '../services/googleSheets';

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
  initialTab?: 'customers' | 'products' | 'settings' | 'reports';
  onBackToOrder: () => void;
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
  initialTab = 'customers',
  onBackToOrder,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Security Question Recovery State
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [securityQuestionAnswerInput, setSecurityQuestionAnswerInput] = useState('');
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const [recoveryNewPin, setRecoveryNewPin] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'customers' | 'products' | 'settings' | 'reports'>(initialTab);

  // Customer Management states
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editingCustomerName, setEditingCustomerName] = useState('');
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);
  const [customerSyncMsg, setCustomerSyncMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Product Management states
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('bom');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductUnit, setEditingProductUnit] = useState('');
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [productSyncResult, setProductSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Google Sheets settings states
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl);
  const [sheetName, setSheetName] = useState(config.sheetName || 'Đặt bia sỉ');
  const [newSalesPerson, setNewSalesPerson] = useState('');
  const [newPin, setNewPin] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Security Question configuration states
  const [securityQuestionConfig, setSecurityQuestionConfig] = useState(
    config.securityQuestion || 'Tên trường cấp 1 của bạn là gì?'
  );
  const [securityAnswerConfig, setSecurityAnswerConfig] = useState(
    config.securityAnswer || 'chu van an'
  );
  const [pinUpdateMessage, setPinUpdateMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [securityQuestionUpdateMsg, setSecurityQuestionUpdateMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Google Sheet global history state (Tất cả đơn từ mọi thiết bị)
  const [sheetHistoryRecords, setSheetHistoryRecords] = useState<SheetHistoryRecord[]>([]);
  const [sheetHistoryHeaders, setSheetHistoryHeaders] = useState<string[]>([]);
  const [isLoadingSheetHistory, setIsLoadingSheetHistory] = useState(false);
  const [sheetHistoryError, setSheetHistoryError] = useState<string | null>(null);
  const [isLegacyScriptWarning, setIsLegacyScriptWarning] = useState(false);
  const [historySource, setHistorySource] = useState<'sheet' | 'local'>('sheet');

  // Filters for history
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [historyFilterRep, setHistoryFilterRep] = useState('');
  const [historySearchCust, setHistorySearchCust] = useState('');

  // Order detail drill-down state (local orders)
  const [selectedOrder, setSelectedOrder] = useState<OrderSubmission | null>(null);

  const activeProducts = products.filter(p => p.active);

  // Fetch history directly from Google Sheet
  const handleFetchSheetHistory = async () => {
    setIsLoadingSheetHistory(true);
    setSheetHistoryError(null);
    setIsLegacyScriptWarning(false);

    const res = await fetchSheetHistory(config.scriptUrl, config.sheetName || 'Đặt bia sỉ');
    setIsLoadingSheetHistory(false);

    if (res.success) {
      setSheetHistoryHeaders(res.headers);
      setSheetHistoryRecords(res.records);
    } else {
      if (res.isLegacyScript) {
        setIsLegacyScriptWarning(true);
      }
      setSheetHistoryError(res.message || 'Không thể tải lịch sử từ Google Sheet.');
    }
  };

  // Auto fetch from Google Sheet when entering Reports tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'reports' && config.scriptUrl) {
      handleFetchSheetHistory();
    }
  }, [isAuthenticated, activeTab, config.scriptUrl, config.sheetName]);

  // Authentication logic: STRICTLY match the current active PIN only
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const currentValidPin = (config.adminPin || '1234').trim();
    if (pinInput.trim() === currentValidPin) {
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

  // Đồng bộ danh sách quán trực tiếp từ sheet "Đặt Hàng"
  const handleSyncCustomersFromSheet = async () => {
    if (!config.scriptUrl || !config.scriptUrl.trim()) {
      setCustomerSyncMsg({
        success: false,
        text: 'Chưa cấu hình URL Google Sheet trong mục Cài Đặt.',
      });
      return;
    }

    setIsSyncingCustomers(true);
    setCustomerSyncMsg(null);
    try {
      const res = await fetchCustomersFromSheet(config.scriptUrl, 'Đặt Hàng');
      if (res.success && res.customers.length > 0) {
        onUpdateCustomers(res.customers);
        setCustomerSyncMsg({
          success: true,
          text: `Đồng bộ thành công ${res.customers.length} quán từ trang tính "Đặt Hàng"!`,
        });
      } else {
        setCustomerSyncMsg({
          success: false,
          text: res.message || 'Không thể đồng bộ quán từ sheet "Đặt Hàng".',
        });
      }
    } catch (e: any) {
      setCustomerSyncMsg({
        success: false,
        text: `Lỗi kết nối: ${e?.message || e}`,
      });
    } finally {
      setIsSyncingCustomers(false);
      setTimeout(() => {
        setCustomerSyncMsg(null);
      }, 6000);
    }
  };

  // Product sync to Google Sheets
  const handleSyncProductsToSheet = async (prodsToSync = products) => {
    if (!config.scriptUrl || !config.scriptUrl.trim()) {
      setProductSyncResult({
        success: false,
        message: 'Chưa cấu hình URL Google Sheet trong mục Cài Đặt. Vui lòng lưu cấu hình trước khi đồng bộ.',
      });
      return;
    }

    setIsSyncingProducts(true);
    setProductSyncResult(null);
    const res = await syncProductsToGoogleSheets(config.scriptUrl, config.sheetName, prodsToSync);
    setIsSyncingProducts(false);
    setProductSyncResult(res);
    setTimeout(() => {
      setProductSyncResult(null);
    }, 6000);
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

    const updated = [...products, newProd];
    onUpdateProducts(updated);
    setNewProductName('');

    // Tự động gửi lệnh đồng bộ cột sang Google Sheet ngay lập tức
    if (config.scriptUrl && config.scriptUrl.trim()) {
      handleSyncProductsToSheet(updated);
    }
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
      sheetName: sheetName.trim() || 'Đặt bia sỉ',
    };
    onUpdateConfig(updatedConfig);
    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 2500);
  };

  const handleUpdatePin = () => {
    const trimmed = newPin.trim();
    if (!trimmed) {
      setPinUpdateMessage({ success: false, text: 'Vui lòng nhập mã PIN mới trước khi lưu.' });
      return;
    }
    if (trimmed.length < 4) {
      setPinUpdateMessage({ success: false, text: 'Mã PIN nên có ít nhất 4 ký tự.' });
      return;
    }
    const updatedConfig: AppConfig = {
      ...config,
      adminPin: trimmed,
    };
    onUpdateConfig(updatedConfig);
    setNewPin('');
    setPinUpdateMessage({
      success: true,
      text: `✓ Đã cập nhật mã PIN mới thành công! Mã PIN cũ đã bị vô hiệu hóa hoàn toàn.`,
    });
    setTimeout(() => setPinUpdateMessage(null), 5000);
  };

  const handleUpdateSecurityQuestion = () => {
    if (!securityAnswerConfig.trim()) {
      setSecurityQuestionUpdateMsg({ success: false, text: 'Vui lòng nhập câu trả lời bảo mật.' });
      return;
    }
    const updatedConfig: AppConfig = {
      ...config,
      securityQuestion: securityQuestionConfig.trim() || 'Tên trường cấp 1 của bạn là gì?',
      securityAnswer: securityAnswerConfig.trim(),
    };
    onUpdateConfig(updatedConfig);
    setSecurityQuestionUpdateMsg({
      success: true,
      text: `✓ Đã cập nhật câu hỏi & câu trả lời bảo mật thành công!`,
    });
    setTimeout(() => setSecurityQuestionUpdateMsg(null), 4000);
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

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase().trim())
  );

  // Filtered Google Sheet records
  const filteredSheetRecords = useMemo(() => {
    return sheetHistoryRecords.filter(r => {
      if (historyFilterDate && !r.orderDate.includes(historyFilterDate)) {
        return false;
      }
      if (historyFilterRep && !r.salesRep.toLowerCase().includes(historyFilterRep.toLowerCase())) {
        return false;
      }
      if (historySearchCust && !r.customerName.toLowerCase().includes(historySearchCust.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [sheetHistoryRecords, historyFilterDate, historyFilterRep, historySearchCust]);

  // Product headers found in Google Sheet (columns after customer, before time)
  const sheetProductHeaders = useMemo(() => {
    return sheetHistoryHeaders.filter((h, idx) => {
      const hLower = String(h).trim().toLowerCase();
      return (
        idx >= 3 &&
        !hLower.includes('thời gian') &&
        !hLower.includes('ghi chú') &&
        !hLower.includes('time') &&
        !hLower.includes('note')
      );
    });
  }, [sheetHistoryHeaders]);

  // Totals calculated from filtered Google Sheet records
  const sheetTotalsByProduct = useMemo(() => {
    const totals: Record<string, number> = {};
    sheetProductHeaders.forEach(h => {
      totals[h] = 0;
    });
    filteredSheetRecords.forEach(r => {
      sheetProductHeaders.forEach(h => {
        totals[h] = (totals[h] || 0) + (r.quantities[h] || 0);
      });
    });
    return totals;
  }, [filteredSheetRecords, sheetProductHeaders]);

  // Unique Sales Reps found in sheet records
  const uniqueSheetSalesReps = useMemo(() => {
    const set = new Set<string>();
    sheetHistoryRecords.forEach(r => {
      if (r.salesRep) set.add(r.salesRep);
    });
    return Array.from(set);
  }, [sheetHistoryRecords]);

  // If not logged in, show PIN pad with custom Security Question recovery
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Quản Trị Hệ Thống</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Vui lòng nhập mã PIN quản trị để tiếp tục.
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
              placeholder="Nhập mã PIN"
              className="w-full text-center text-xl tracking-widest font-mono py-2.5 px-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            {pinError && (
              <p className="text-xs text-rose-600 mt-2 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Mã PIN không chính xác. Vui lòng thử lại.</span>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBackToOrder}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Quay lại Bảng Đặt Hàng
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Mở Khóa
            </button>
          </div>
        </form>

        {/* Security Question Forgot PIN Recovery */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          {!showForgotPin ? (
            <button
              type="button"
              onClick={() => {
                setShowForgotPin(true);
                setRecoveryError('');
                setRecoveryVerified(false);
                setSecurityQuestionAnswerInput('');
                setRecoveryNewPin('');
              }}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
            >
              Quên mã PIN?
            </button>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Xác thực câu hỏi bảo mật</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPin(false);
                    setRecoveryVerified(false);
                    setRecoveryError('');
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              {!recoveryVerified ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-900 block mb-0.5">
                      Câu hỏi bảo mật của bạn:
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      "{config.securityQuestion || 'Tên trường cấp 1 của bạn là gì?'}"
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Nhập câu trả lời bảo mật:
                    </label>
                    <input
                      type="text"
                      value={securityQuestionAnswerInput}
                      onChange={e => {
                        setSecurityQuestionAnswerInput(e.target.value);
                        setRecoveryError('');
                      }}
                      placeholder="Nhập câu trả lời..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {recoveryError && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {recoveryError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const validAns = (config.securityAnswer || 'chu van an').toLowerCase().trim();
                      if (securityQuestionAnswerInput.toLowerCase().trim() === validAns) {
                        setRecoveryVerified(true);
                        setRecoveryError('');
                      } else {
                        setRecoveryError('Câu trả lời bảo mật không chính xác!');
                      }
                    }}
                    className="w-full py-2 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Xác Thực Câu Trả Lời
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200">
                    ✓ Xác thực thành công! Vui lòng nhập mã PIN mới:
                  </div>
                  <input
                    type="password"
                    maxLength={10}
                    value={recoveryNewPin}
                    onChange={e => setRecoveryNewPin(e.target.value)}
                    placeholder="Nhập mã PIN mới (VD: 8888)"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const finalPin = recoveryNewPin.trim() || '1234';
                      onUpdateConfig({ ...config, adminPin: finalPin });
                      setIsAuthenticated(true);
                    }}
                    className="w-full py-2 px-3 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Lưu Mã PIN Mới & Mở Khóa Ngay
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
      {/* Admin Sub-navigation Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900">Bảng Điều Khiển Quản Trị (Admin)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý toàn diện: Điểm bán, Mặt hàng, Cài đặt kết nối Sheet và Lịch sử báo cáo toàn hệ thống.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToOrder}
            className="sm:hidden px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Quay lại Đơn
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Cài Đặt Sheet & Bảo Mật</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
            <span>Lịch Sử & Báo Cáo</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Quản lý Điểm Bán / Khách Hàng */}
      {activeTab === 'customers' && (
        <div className="p-6 space-y-5">
          {/* Notification Banner */}
          {customerSyncMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
                customerSyncMsg.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {customerSyncMsg.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{customerSyncMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setCustomerSyncMsg(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sheet Đặt Hàng Info Note */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Nguồn danh sách quán: Trang tính <strong>"Đặt Hàng"</strong> (Cột B: Mã, Cột C: Tên KH). Hiện có <strong>{customers.length} quán</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={handleSyncCustomersFromSheet}
              disabled={isSyncingCustomers}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Đọc trực tiếp danh sách quán từ trang tính 'Đặt Hàng' trong Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCustomers ? 'animate-spin' : ''}`} />
              <span>{isSyncingCustomers ? 'Đang đọc sheet...' : 'Đồng bộ từ Sheet "Đặt Hàng"'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <form onSubmit={handleAddCustomer} className="flex-1 flex gap-2 max-w-md">
              <input
                type="text"
                value={newCustomerName}
                onChange={e => setNewCustomerName(e.target.value)}
                placeholder="Thêm nhanh tên quán mới..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </form>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Tìm kiếm quán, mã..."
                  className="pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-48"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                onClick={onOpenBulkImport}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập Hàng Loạt</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3 w-20 text-center">Mã</th>
                  <th className="py-3 px-4">Tên Quán / Khách Hàng</th>
                  <th className="py-3 px-4 w-28 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 w-28 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((cust, idx) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">
                      {cust.orderIndex || idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                        {cust.code || '-'}
                      </span>
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
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCustomerId(null)}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
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
                        {cust.active ? 'Đang bật' : 'Tạm ẩn'}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStartEditCustomer(cust)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Sửa tên"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(cust.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Danh Mục Mặt Hàng ({products.length})</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các loại bia được mở bán. Khi thêm mặt hàng mới, hệ thống sẽ tự động chèn thêm cột vào Google Sheet.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleSyncProductsToSheet()}
              disabled={isSyncingProducts || !config.scriptUrl}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Đồng bộ danh sách cột sản phẩm sang Google Sheet ngay lập tức"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingProducts ? 'animate-spin' : ''}`} />
              <span>{isSyncingProducts ? 'Đang Đồng Bộ Cột...' : 'Đồng Bộ Cột Sang Google Sheet Ngay'}</span>
            </button>
          </div>

          {/* Sync Result Feedback */}
          {productSyncResult && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                productSyncResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              {productSyncResult.success ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
              <span>{productSyncResult.message}</span>
            </div>
          )}

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
                placeholder="VD: Bom 20L, Keg 2L, Thùng lon 330ml..."
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
              disabled={isSyncingProducts}
              className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors shrink-0 flex items-center justify-center gap-1 h-9.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm & Đồng Bộ Vào Sheet</span>
            </button>
          </form>

          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p>
              💡 <b>Cơ chế đồng bộ động chuẩn 100%:</b> Khi thêm mặt hàng mới tại đây, ứng dụng sẽ gửi lệnh tới Google Apps Script để tự động chèn thêm cột mới vào Dòng 2 của trang tính (trước cột <i>Thời gian gửi</i>) và tự động điền sẵn công thức <code>=SUM(...)</code> ở Dòng 1.
            </p>
            <p className="text-[11px] text-amber-800">
              Cột 2 (NV Sale) được bảo vệ tuyệt đối, đảm bảo số lượng của mặt hàng mới không bao giờ bị nhảy sang tên nhân viên.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên Mặt Hàng</th>
                  <th className="py-3 px-4 w-32">Đơn Vị Tính</th>
                  <th className="py-3 px-4 w-44">Tên Cột Trên Dòng 2 Sheet</th>
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
                    <td className="py-3 px-4 text-xs text-amber-900 font-mono font-bold">
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
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProductId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Tab 3: Cài Đặt Sheet & Bảo Mật */}
      {activeTab === 'settings' && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Connection & Security */}
            <div className="lg:col-span-5 space-y-5">
              {/* Google Sheets Config */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-amber-600" />
                    <span>Cấu Hình Google Sheets Toàn Hệ Thống</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Admin duy nhất cấu hình
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  Cấu hình này đã được thiết lập mặc định cho tất cả nhân viên. Người dùng bình thường không cần dán link hay cài đặt gì thêm.
                </p>

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
                    Tên Trang Tính (Sheet Name):
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={e => setSheetName(e.target.value)}
                    placeholder="Đặt bia sỉ"
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestScript}
                    disabled={testing || !scriptUrl.trim()}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{testing ? 'Đang Kiểm Tra...' : 'Kiểm Tra Kết Nối'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Lưu Cấu Hình
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
                    ✓ Đã lưu cấu hình Google Sheets thành công!
                  </div>
                )}
              </div>

              {/* Security & PIN Settings */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Bảo Mật & Đổi Mã PIN</span>
                </h3>

                {/* Change PIN */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Đổi Mã PIN Quản Trị Mới:
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      (Đang kích hoạt: ••••)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={10}
                      value={newPin}
                      onChange={e => {
                        setNewPin(e.target.value);
                        setPinUpdateMessage(null);
                      }}
                      placeholder="Nhập mã PIN mới..."
                      className="w-40 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleUpdatePin}
                      className="px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Lưu Mã PIN Mới
                    </button>
                  </div>
                  {pinUpdateMessage && (
                    <p
                      className={`text-xs mt-1.5 font-medium ${
                        pinUpdateMessage.success ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {pinUpdateMessage.text}
                    </p>
                  )}
                </div>

                {/* Security Question Setup */}
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <label className="text-xs font-semibold text-slate-800 block">
                    Cài Đặt Câu Hỏi Quên Mã PIN (Do bạn tự đặt):
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={securityQuestionConfig}
                      onChange={e => setSecurityQuestionConfig(e.target.value)}
                      placeholder="VD: Tên trường cấp 1 của bạn là gì?"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={securityAnswerConfig}
                        onChange={e => setSecurityAnswerConfig(e.target.value)}
                        placeholder="Nhập câu trả lời bảo mật bí mật..."
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleUpdateSecurityQuestion}
                        className="px-3.5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        Lưu Câu Hỏi
                      </button>
                    </div>
                  </div>
                  {securityQuestionUpdateMsg && (
                    <p
                      className={`text-xs mt-1 font-medium ${
                        securityQuestionUpdateMsg.success ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {securityQuestionUpdateMsg.text}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Khi quên mã PIN ngoài màn hình khóa, bạn chỉ cần trả lời đúng câu hỏi này là sẽ được tạo mã PIN mới.
                  </p>
                </div>
              </div>

              {/* Sales Reps List */}
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Danh Sách Nhân Viên Sale</span>
                </h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSalesPerson}
                    onChange={e => setNewSalesPerson(e.target.value)}
                    placeholder="Thêm tên nhân viên..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSalesPerson}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer"
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
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Google Apps Script Code & Guide */}
            <div className="lg:col-span-7 space-y-4">
              {/* Critical Update Banner */}
              <div className="p-4 bg-amber-500/10 border-2 border-amber-500 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Bản Cập Nhật Mã Apps Script Quan Trọng (Đã Sửa Triệt Để)</span>
                </div>
                <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                  <li><b>Tự động chèn cột cho mặt hàng mới:</b> Khi thêm mặt hàng trên app, script sẽ tự động tạo thêm cột ở Dòng 2 và tự điền công thức <code>=SUM(...)</code> ở Dòng 1.</li>
                  <li><b>Khóa cứng Cột B (NV Sale):</b> Đảm bảo số lượng sản phẩm mới không bao giờ bị nhảy sang hay đè lên tên nhân viên Sale.</li>
                </ul>
              </div>

              <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                      <span>Mã Google Apps Script Mới (Chống đè tên NV & Tự thêm cột)</span>
                    </h3>
                    <p className="text-xs text-amber-900 mt-0.5">
                      Đã hỗ trợ: Tự thêm cột trước 'Thời gian gửi', thêm SUM dòng 1, bảo toàn 100% Cột B NV Sale.
                    </p>
                  </div>
                  <button
                    onClick={handleCopyAppsScript}
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs shrink-0"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Đã Sao Chép!' : 'Sao Chép Mã Apps Script'}</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <p>
                    <b>Cách cập nhật vào Google Sheet (Chỉ mất 30 giây):</b>
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                    <li>Bấm nút <b>Sao Chép Mã Apps Script</b> màu cam ở trên.</li>
                    <li>Mở Google Sheet của bạn → vào menu <b>Tiện ích mở rộng (Extensions)</b> → <b>Apps Script</b>.</li>
                    <li>Xóa toàn bộ mã cũ trong file <code>Code.gs</code> và dán đoạn mã mới này vào.</li>
                    <li>Bấm nút <b>Triển khai (Deploy)</b> ở góc trên bên phải → chọn <b>Quản lý tùy chọn triển khai (Manage deployments)</b>.</li>
                    <li>Bấm vào <b>biểu tượng cây bút chì (Sửa/Edit)</b> → ở mục <i>Phiên bản (Version)</i>, chọn <b>Phiên bản mới (New version)</b> → Bấm <b>Triển khai (Deploy)</b>.</li>
                  </ol>

                  <div className="relative rounded-lg bg-slate-900 text-slate-200 p-3 text-xs font-mono max-h-64 overflow-y-auto border border-slate-800">
                    <pre>{APPS_SCRIPT_TEMPLATE}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Lịch Sử & Báo Cáo Toàn Bộ Từ Google Sheet */}
      {activeTab === 'reports' && (
        <div className="p-6 space-y-6">
          {/* Header & Source Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <span>Báo Cáo & Lịch Sử Đơn Hàng</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem toàn bộ đơn hàng được gửi từ tất cả thiết bị và nhân viên Sale theo thời gian thực.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFetchSheetHistory}
                disabled={isLoadingSheetHistory}
                className="px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheetHistory ? 'animate-spin' : ''}`} />
                <span>{isLoadingSheetHistory ? 'Đang Tải Sheet...' : 'Làm Mới Từ Google Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Warning banner if script on Google Sheet hasn't been upgraded to support getHistory */}
          {isLegacyScriptWarning && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-700" />
                <span>Google Apps Script cần được cập nhật để đọc trực tiếp dữ liệu từ Google Sheet</span>
              </div>
              <p>
                Google Apps Script hiện tại trên Google Sheet của bạn đang là phiên bản trước. Để Web App có thể tải toàn bộ danh sách đơn hàng từ mọi máy, bạn chỉ cần vào <b>Tab Cài Đặt Sheet</b> → bấm <b>Sao Chép Mã Apps Script</b> → dán vào Apps Script trên Google Sheet và bấm Triển khai (Deploy).
              </p>
            </div>
          )}

          {sheetHistoryError && !isLegacyScriptWarning && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              {sheetHistoryError}
            </div>
          )}

          {/* Metrics summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500 block">Tổng Đơn Trên Sheet</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {filteredSheetRecords.length}{' '}
                <span className="text-xs font-normal text-slate-400">/ {sheetHistoryRecords.length} dòng</span>
              </span>
            </div>

            {sheetProductHeaders.map(headerName => (
              <div key={headerName} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                <span className="text-xs font-medium text-amber-900 block truncate" title={headerName}>
                  {headerName}
                </span>
                <span className="text-2xl font-bold text-amber-950 font-mono tabular-nums mt-1 block">
                  {sheetTotalsByProduct[headerName] || 0}
                </span>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span>Bộ Lọc:</span>
            </div>

            {/* Filter Date */}
            <input
              type="date"
              value={historyFilterDate}
              onChange={e => setHistoryFilterDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              title="Lọc theo ngày đặt hàng"
            />

            {/* Filter Sales Rep */}
            <select
              value={historyFilterRep}
              onChange={e => setHistoryFilterRep(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Tất cả NV Sale</option>
              {uniqueSheetSalesReps.map(rep => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>

            {/* Search Customer */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={historySearchCust}
                onChange={e => setHistorySearchCust(e.target.value)}
                placeholder="Tìm tên quán..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {(historyFilterDate || historyFilterRep || historySearchCust) && (
              <button
                type="button"
                onClick={() => {
                  setHistoryFilterDate('');
                  setHistoryFilterRep('');
                  setHistorySearchCust('');
                }}
                className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Real-time Google Sheet Records Ledger */}
          <div className="space-y-2">
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm divide-y divide-slate-200 border-collapse">
                <thead className="bg-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">Dòng</th>
                    <th className="py-2.5 px-3 min-w-[100px] border-r border-slate-200">Ngày Đặt</th>
                    <th className="py-2.5 px-3 min-w-[130px] border-r border-slate-200">NV Sale</th>
                    <th className="py-2.5 px-4 min-w-[180px] border-r border-slate-200">Khách Hàng (Quán)</th>

                    {/* Dynamic columns from Google Sheet */}
                    {sheetProductHeaders.map(h => (
                      <th
                        key={h}
                        className="py-2.5 px-3 min-w-[100px] text-center border-r border-slate-200 bg-amber-100/60 text-amber-950 font-bold"
                      >
                        {h}
                      </th>
                    ))}

                    <th className="py-2.5 px-3 min-w-[140px] text-center">Thời Gian Gửi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingSheetHistory ? (
                    <tr>
                      <td
                        colSpan={sheetProductHeaders.length + 5}
                        className="py-12 text-center text-slate-400 space-y-2"
                      >
                        <RefreshCw className="w-6 h-6 mx-auto animate-spin text-amber-600" />
                        <p>Đang tải dữ liệu trực tiếp từ Google Sheet...</p>
                      </td>
                    </tr>
                  ) : filteredSheetRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={sheetProductHeaders.length + 5}
                        className="py-12 text-center text-slate-400"
                      >
                        Chưa có đơn hàng nào khớp với điều kiện lọc, hoặc Google Sheet chưa có dữ liệu.
                      </td>
                    </tr>
                  ) : (
                    filteredSheetRecords.map(r => (
                      <tr key={`${r.rowIndex}_${r.orderDate}_${r.customerName}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-100">
                          {r.rowIndex}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100">
                          {r.orderDate}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-medium border-r border-slate-100">
                          {r.salesRep}
                        </td>
                        <td className="py-2 px-4 font-bold text-slate-950 border-r border-slate-100">
                          {r.customerName}
                        </td>

                        {sheetProductHeaders.map(h => {
                          const qty = r.quantities[h] || 0;
                          return (
                            <td
                              key={h}
                              className={`py-2 px-3 text-center font-mono font-bold border-r border-slate-100 ${
                                qty > 0 ? 'text-amber-900 bg-amber-50/50' : 'text-slate-300'
                              }`}
                            >
                              {qty > 0 ? qty : 0}
                            </td>
                          );
                        })}

                        <td className="py-2 px-3 text-center text-slate-500 font-mono">
                          {r.timeSent || '—'}
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
