import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  Store,
  MapPin,
  Phone,
  ChevronDown,
  Sparkles,
  PlusCircle,
} from 'lucide-react';
import { Customer, TableRowEntry, ProductItem } from '../types';

interface CustomerAutocompleteProps {
  customers: Customer[];
  products?: ProductItem[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  rows: TableRowEntry[];
  onOpenAdminCustomers?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onCustomerChosen?: () => void;
}

// Bỏ dấu tiếng Việt để tìm kiếm không dấu / có dấu đều trúng
function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export const CustomerAutocomplete: React.FC<CustomerAutocompleteProps> = ({
  customers,
  products = [],
  selectedCustomerId,
  onSelectCustomer,
  rows,
  onOpenAdminCustomers,
  inputRef,
  onCustomerChosen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = inputRef || internalInputRef;

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Active customers
  const activeCustomers = useMemo(() => {
    return customers.filter(c => c.active);
  }, [customers]);

  // Rows customer IDs set for fast check
  const customerOrderSummary = useMemo(() => {
    const summary = new Map<string, { totalQty: number; count: number }>();
    rows.forEach(r => {
      if (!r.customerId) return;
      let sum = 0;
      Object.values(r.quantities).forEach(q => {
        sum += q || 0;
      });
      summary.set(r.customerId, { totalQty: sum, count: (summary.get(r.customerId)?.count || 0) + 1 });
    });
    return summary;
  }, [rows]);

  // Filtered customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) {
      return activeCustomers;
    }
    const cleanQuery = removeVietnameseTones(searchTerm);

    return activeCustomers.filter(c => {
      const cleanName = removeVietnameseTones(c.name || '');
      const cleanCode = removeVietnameseTones(c.code || '');
      const cleanAddress = removeVietnameseTones(c.address || '');
      const cleanPhone = removeVietnameseTones(c.phone || '');

      return (
        cleanName.includes(cleanQuery) ||
        cleanCode.includes(cleanQuery) ||
        cleanAddress.includes(cleanQuery) ||
        cleanPhone.includes(cleanQuery)
      );
    });
  }, [activeCustomers, searchTerm]);

  // Quick picks: quán đã có đơn hôm nay hoặc 5 quán hàng đầu
  const quickPicks = useMemo(() => {
    const todayList = activeCustomers.filter(c => customerOrderSummary.has(c.id));
    if (todayList.length > 0) {
      return todayList.slice(0, 5);
    }
    return activeCustomers.slice(0, 5);
  }, [activeCustomers, customerOrderSummary]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCustomers]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer.id);
    setSearchTerm('');
    setIsOpen(false);
    if (onCustomerChosen) {
      onCustomerChosen();
    }
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer('');
    setSearchTerm('');
    setIsOpen(true);
    setTimeout(() => {
      actualInputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredCustomers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers.length > 0 && highlightedIndex < filteredCustomers.length) {
        handleSelect(filteredCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-2 relative">
      {/* Search Input Box */}
      <div className="relative">
        <div
          className={`flex items-center w-full px-3.5 py-2.5 rounded-xl border-2 transition-all shadow-xs bg-white ${
            isOpen
              ? 'border-amber-500 ring-3 ring-amber-500/20'
              : selectedCustomer
              ? 'border-amber-400 bg-amber-50/30'
              : 'border-slate-300 hover:border-amber-300'
          }`}
        >
          <Search className={`w-5 h-5 mr-2.5 shrink-0 ${isOpen || selectedCustomer ? 'text-amber-600' : 'text-slate-400'}`} />

          {selectedCustomer && !isOpen ? (
            <div
              className="flex-1 flex items-center justify-between min-w-0 cursor-pointer"
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => actualInputRef.current?.focus(), 50);
              }}
            >
              <div className="truncate">
                <span className="text-base font-bold text-slate-900 mr-2">
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.code && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 mr-2">
                    {selectedCustomer.code}
                  </span>
                )}
                {customerOrderSummary.has(selectedCustomer.id) && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Đã có đơn hôm nay ({customerOrderSummary.get(selectedCustomer.id)?.totalQty} bom/keg)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Bỏ chọn để tìm quán khác"
                >
                  <X className="w-4 h-4" />
                </button>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center min-w-0">
              <input
                ref={actualInputRef}
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Gõ tên quán, mã quán, địa chỉ... (tìm kiếm thông minh)"
                className="w-full text-sm sm:text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
              />
            </div>
          )}
        </div>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in-50 duration-150">
            {/* Header / Counter */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>
                {searchTerm.trim() ? (
                  <>Tìm thấy <strong className="text-amber-800">{filteredCustomers.length}</strong> quán khớp với "{searchTerm}"</>
                ) : (
                  <>Danh sách <strong className="text-amber-800">{activeCustomers.length}</strong> quán</>
                )}
              </span>
              <span className="hidden sm:inline text-slate-400">Dùng phím ↑ ↓ Enter để chọn nhanh</span>
            </div>

            {/* List */}
            <div ref={listRef} className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c, index) => {
                  const isSelected = c.id === selectedCustomerId;
                  const isHighlighted = index === highlightedIndex;
                  const summary = customerOrderSummary.get(c.id);

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-3.5 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                        isHighlighted
                          ? 'bg-amber-500 text-white'
                          : isSelected
                          ? 'bg-amber-50 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-sm sm:text-base ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                            {c.name}
                          </span>
                          {c.code && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                                isHighlighted ? 'bg-amber-600 text-amber-50' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {c.code}
                            </span>
                          )}
                          {summary && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                                isHighlighted ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              Đã có đơn ({summary.totalQty} bom/keg)
                            </span>
                          )}
                        </div>

                        {(c.address || c.phone) && (
                          <div
                            className={`flex items-center gap-3 text-xs mt-0.5 ${
                              isHighlighted ? 'text-amber-100' : 'text-slate-500'
                            }`}
                          >
                            {c.address && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {c.address}
                              </span>
                            )}
                            {c.phone && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Phone className="w-3 h-3 shrink-0" />
                                {c.phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isHighlighted ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </div>
                        ) : (
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                              isHighlighted ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-600'
                            }`}
                          >
                            Chọn
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Không tìm thấy quán nào khớp với "{searchTerm}"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Thử gõ không dấu hoặc kiểm tra lại tên quán.
                    </p>
                  </div>
                  {onOpenAdminCustomers && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAdminCustomers();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Thêm quán mới vào hệ thống (Admin)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Gõ tiếng Việt có dấu hoặc không dấu đều tìm được
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Select Chips: Quán hay đặt / Quán đã có đơn hôm nay */}
      {quickPicks.length > 0 && !selectedCustomer && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Chọn nhanh:
          </span>
          {quickPicks.map(c => {
            const hasOrder = customerOrderSummary.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                  hasOrder
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                }`}
                title={c.address || c.name}
              >
                <span>{c.name}</span>
                {hasOrder && <Check className="w-3 h-3 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
