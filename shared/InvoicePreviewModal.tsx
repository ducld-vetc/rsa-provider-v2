import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Loader2, Plus, Printer, Trash2, X } from 'lucide-react';

export interface InvoiceLineItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

/** Payload gửi sang hệ thống eInvoice bên ngoài để gen file. */
export interface EInvoiceGenerateRequest {
  buyer: {
    name: string;
    company: string;
    taxCode: string;
    budgetCode: string;
    address: string;
    phone: string;
    paymentMethod: string;
    email: string;
  };
  items: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
}

export interface EInvoiceGenerateResult {
  fileUrl: string;
  fileName?: string;
}

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerType: string;
  customerName?: string;
  customerPhone?: string;
  mapAddress?: string;
  companyName?: string;
  taxCode?: string;
  invoiceEmail?: string;
  mode?: 'preview' | 'export' | 'adjust' | 'replace';
  onConfirmExport?: () => void;
  isExporting?: boolean;
  /**
   * Gọi hệ thống eInvoice bên ngoài để gen file preview/xuất.
   * Nếu không truyền, dùng mock trả về PDF demo.
   */
  onGenerateFile?: (payload: EInvoiceGenerateRequest) => Promise<EInvoiceGenerateResult>;
}

const fieldInput =
  'w-full min-w-0 rounded border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-[#00A859] focus:ring-1 focus:ring-[#00A859]/20';

const cellInput =
  'w-full min-w-0 rounded border border-gray-200 bg-white px-1.5 py-1.5 text-[12px] text-gray-800 outline-none focus:border-[#00A859] focus:ring-1 focus:ring-[#00A859]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const formatVnd = (value: number, fractionDigits = 2) => {
  if (!Number.isFinite(value)) return '0';
  const fixed = value.toFixed(fractionDigits);
  const [intPart, decPart] = fixed.split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (fractionDigits === 0) return withDots;
  const trimmed = decPart.replace(/0+$/, '');
  return trimmed ? `${withDots},${trimmed}` : withDots;
};

/** Parse chuỗi kiểu VN: 185.185,19 → 185185.19 */
const parseVndInput = (raw: string): number => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(',');
  const normalized = hasComma
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/\./g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

/** Format khi đang gõ: giữ phần thập phân nếu user đang nhập dấu phẩy */
const formatVndTyping = (raw: string): string => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return '';
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx === -1) {
    const intDigits = cleaned.replace(/\./g, '').replace(/^0+(?=\d)/, '') || '0';
    return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const intRaw = cleaned.slice(0, commaIdx).replace(/\./g, '');
  const decRaw = cleaned.slice(commaIdx + 1).replace(/[^\d]/g, '').slice(0, 4);
  const intDigits = intRaw.replace(/^0+(?=\d)/, '') || '0';
  const withDots = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots},${decRaw}`;
};

const buildInitialItems = (): InvoiceLineItem[] => [
  {
    id: 'line-1',
    name: 'Cứu hộ RSA',
    unit: 'Gói',
    quantity: 1,
    unitPrice: 185185.19,
    taxRate: 8,
  },
];

/** Mock: giả lập gọi hệ thống eInvoice → trả link file. Thay bằng API thật qua prop onGenerateFile. */
const mockGenerateEInvoiceFile = async (
  _payload: EInvoiceGenerateRequest
): Promise<EInvoiceGenerateResult> => {
  await new Promise((r) => setTimeout(r, 1200));
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return {
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileName: `HDDT-VETC-${stamp}.pdf`,
  };
};

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  customerType,
  customerName,
  customerPhone,
  mapAddress,
  companyName = '',
  taxCode = '',
  invoiceEmail = '',
  mode = 'preview',
  onConfirmExport,
  isExporting = false,
  onGenerateFile,
}) => {
  const [buyerName, setBuyerName] = useState('');
  const [buyerCompany, setBuyerCompany] = useState('');
  const [buyerTaxCode, setBuyerTaxCode] = useState('');
  const [buyerBudgetCode, setBuyerBudgetCode] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản');
  const [items, setItems] = useState<InvoiceLineItem[]>(buildInitialItems);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [formDirty, setFormDirty] = useState(false);
  /** Chuỗi đang gõ cho đơn giá / số lượng theo từng dòng (để giữ dấu . và , khi nhập). */
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [taxDrafts, setTaxDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const isBusiness = customerType === 'Doanh nghiệp';
    setBuyerName(customerName || 'Trần Thị Thanh Phượng');
    setBuyerCompany(isBusiness ? companyName || 'CÔNG TY TNHH ABC' : companyName || '');
    setBuyerTaxCode(isBusiness ? taxCode || '0123456789' : taxCode || '');
    setBuyerBudgetCode('');
    setBuyerAddress(mapAddress || '133/21 NGUYỄN THỊ NHỎ, Phường 09, Quận Tân Bình, Thành phố Hồ Chí Minh');
    setBuyerPhone(customerPhone || '0979388399');
    setBuyerEmail(invoiceEmail || 'nguyenvana@email.com');
    setPaymentMethod('Chuyển khoản');
    setItems(buildInitialItems());
    setIsGenerating(false);
    setGenerateError('');
    setPreviewFileUrl(null);
    setPreviewFileName('');
    setFormDirty(false);
    setPriceDrafts({});
    setQtyDrafts({});
    setTaxDrafts({});
  }, [isOpen, customerType, customerName, customerPhone, mapAddress, companyName, taxCode, invoiceEmail]);

  const markDirty = () => {
    setFormDirty(true);
  };

  const computedRows = useMemo(
    () =>
      items.map((item) => {
        const pretax = item.quantity * item.unitPrice;
        const tax = pretax * (item.taxRate / 100);
        const total = pretax + tax;
        return { ...item, pretax, tax, total };
      }),
    [items]
  );

  const totals = useMemo(
    () =>
      computedRows.reduce(
        (acc, row) => ({
          pretax: acc.pretax + row.pretax,
          tax: acc.tax + row.tax,
          total: acc.total + row.total,
        }),
        { pretax: 0, tax: 0, total: 0 }
      ),
    [computedRows]
  );

  const updateItem = (id: string, patch: Partial<InvoiceLineItem>) => {
    markDirty();
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    markDirty();
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        name: '',
        unit: 'Gói',
        quantity: 1,
        unitPrice: 0,
        taxRate: 8,
      },
    ]);
  };

  const removeItem = (id: string) => {
    markDirty();
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const buildPayload = (): EInvoiceGenerateRequest => ({
    buyer: {
      name: buyerName,
      company: buyerCompany,
      taxCode: buyerTaxCode,
      budgetCode: buyerBudgetCode,
      address: buyerAddress,
      phone: buyerPhone,
      paymentMethod,
      email: buyerEmail,
    },
    items: items.map(({ name, unit, quantity, unitPrice, taxRate }) => ({
      name,
      unit,
      quantity,
      unitPrice,
      taxRate,
    })),
  });

  const handleGeneratePreview = async () => {
    if (!buyerName.trim()) {
      setGenerateError('Vui lòng nhập họ tên người mua hàng.');
      return;
    }
    if (!buyerEmail.trim()) {
      setGenerateError('Vui lòng nhập email nhận hóa đơn.');
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setGenerateError('Vui lòng nhập tên hàng hóa / dịch vụ cho mọi dòng.');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');
    try {
      const generate = onGenerateFile ?? mockGenerateEInvoiceFile;
      const result = await generate(buildPayload());
      setPreviewFileUrl(result.fileUrl);
      setPreviewFileName(result.fileName || 'hoa-don-dien-tu.pdf');
      setFormDirty(false);
    } catch (err) {
      setPreviewFileUrl(null);
      setGenerateError(err instanceof Error ? err.message : 'Không tạo được file preview từ hệ thống eInvoice.');
    } finally {
      setIsGenerating(false);
    }
  };

  const moneyLocked = mode === 'adjust';

  if (!isOpen) return null;

  const needsRegen = Boolean(previewFileUrl) && formDirty;
  const showPreviewPane = isGenerating || Boolean(previewFileUrl);
  const confirmLabel =
    mode === 'adjust'
      ? isExporting
        ? 'Đang lưu...'
        : 'Lưu điều chỉnh'
      : mode === 'replace'
        ? isExporting
          ? 'Đang thay thế...'
          : 'Thay thế hóa đơn'
        : isExporting
          ? 'Đang xuất...'
          : 'Xuất hóa đơn';
  const titleLabel =
    mode === 'adjust'
      ? 'Điều chỉnh hóa đơn điện tử'
      : mode === 'replace'
        ? 'Thay thế hóa đơn điện tử'
        : mode === 'export'
          ? 'Xuất hóa đơn điện tử'
          : 'Xem trước hóa đơn điện tử';
  const lockedCell =
    'w-full min-w-0 rounded border border-gray-100 bg-gray-50 px-1.5 py-1.5 text-[12px] text-gray-500 cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm animate-in fade-in duration-300 sm:p-4">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 ${
          showPreviewPane ? 'max-h-[94vh] max-w-[1440px]' : 'max-h-[94vh] max-w-[920px]'
        }`}
      >        <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2.5">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800">{titleLabel}</h3>
            <p className="text-[11px] font-medium text-gray-500">
              {moneyLocked
                ? 'Chỉ chỉnh thông tin không liên quan tiền. SL / đơn giá / thuế bị khóa.'
                : mode === 'replace'
                  ? 'Thay thế toàn bộ hóa đơn đã xuất — có thể sửa cả thông tin tiền tệ.'
                  : 'Nhập thông tin → Preview file eInvoice → Xuất hóa đơn.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 rounded bg-[#00A859] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#008f4c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang gen...</span>
                </>
              ) : (
                <>
                  <FileText size={14} />
                  <span>Preview</span>
                </>
              )}
            </button>
            {mode === 'export' || mode === 'adjust' || mode === 'replace' ? (
              <button
                type="button"
                onClick={onConfirmExport}
                disabled={isExporting || !previewFileUrl || needsRegen || isGenerating}
                title={
                  !previewFileUrl || needsRegen
                    ? 'Bắt buộc Preview thành công trước khi tiếp tục'
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                <span>{confirmLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => previewFileUrl && window.open(previewFileUrl, '_blank', 'noopener,noreferrer')}
                disabled={!previewFileUrl}
                className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Printer size={14} />
                <span>In hóa đơn</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-gray-300 p-1.5 text-gray-700 transition-colors hover:bg-gray-400"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Form nhập liệu — full width khi chưa preview */}
          <div
            className={`custom-scrollbar flex min-h-0 w-full flex-col overflow-y-auto bg-gray-50 ${
              showPreviewPane
                ? 'border-r border-gray-200 lg:w-[58%] lg:max-w-[820px]'
                : ''
            }`}
          >
            <div className={`space-y-3 p-3 ${showPreviewPane ? '' : 'mx-auto w-full max-w-[880px]'}`}>
              <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-gray-700">Người mua hàng</h4>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
                  <label className="block space-y-1 md:col-span-2 xl:col-span-2">
                    <span className="text-[11px] font-semibold text-gray-500">Họ tên người mua hàng</span>
                    <input
                      value={buyerName}
                      onChange={(e) => {
                        markDirty();
                        setBuyerName(e.target.value);
                      }}
                      className={fieldInput}
                    />
                  </label>
                  <label className="block space-y-1 md:col-span-2 xl:col-span-2">
                    <span className="text-[11px] font-semibold text-gray-500">Đơn vị mua hàng</span>
                    <input
                      value={buyerCompany}
                      onChange={(e) => {
                        markDirty();
                        setBuyerCompany(e.target.value);
                      }}
                      className={fieldInput}
                      placeholder="Để trống nếu cá nhân"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500">Mã số thuế</span>
                    <input
                      value={buyerTaxCode}
                      onChange={(e) => {
                        markDirty();
                        setBuyerTaxCode(e.target.value);
                      }}
                      className={fieldInput}
                      placeholder="—"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500">Mã QHNS</span>
                    <input
                      value={buyerBudgetCode}
                      onChange={(e) => {
                        markDirty();
                        setBuyerBudgetCode(e.target.value);
                      }}
                      className={fieldInput}
                      placeholder="—"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500">Điện thoại</span>
                    <input
                      value={buyerPhone}
                      onChange={(e) => {
                        markDirty();
                        setBuyerPhone(e.target.value);
                      }}
                      className={fieldInput}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-gray-500">Hình thức thanh toán</span>
                    <input
                      value={paymentMethod}
                      onChange={(e) => {
                        markDirty();
                        setPaymentMethod(e.target.value);
                      }}
                      className={fieldInput}
                    />
                  </label>
                  <label className="block space-y-1 md:col-span-2 xl:col-span-4">
                    <span className="text-[11px] font-semibold text-gray-500">Địa chỉ</span>
                    <textarea
                      value={buyerAddress}
                      onChange={(e) => {
                        markDirty();
                        setBuyerAddress(e.target.value);
                      }}
                      rows={2}
                      className={`${fieldInput} resize-y`}
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-gray-700">Email nhận hóa đơn</h4>
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-gray-500">Email</span>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => {
                      markDirty();
                      setBuyerEmail(e.target.value);
                    }}
                    className={fieldInput}
                    placeholder="email@company.com"
                  />
                </label>
                <p className="text-[11px] text-gray-400">
                  Hóa đơn điện tử sẽ được gửi về email này sau khi xuất thành công.
                </p>
              </section>

              <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wide text-gray-700">Hàng hóa / dịch vụ</h4>
                  {!moneyLocked && (
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex shrink-0 items-center gap-1 rounded border border-dashed border-gray-300 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:border-[#00A859] hover:text-[#00A859]"
                    >
                      <Plus size={13} />
                      Thêm dòng
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[820px] table-fixed border-collapse text-left text-[12px]">
                    <colgroup>
                      <col className="w-10" />
                      <col />
                      <col className="w-[72px]" />
                      <col className="w-[72px]" />
                      <col className="w-[120px]" />
                      <col className="w-[72px]" />
                      <col className="w-[110px]" />
                      <col className="w-[110px]" />
                      <col className="w-10" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-100 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                        <th className="px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2">Tên hàng hóa / dịch vụ</th>
                        <th className="px-2 py-2">ĐVT</th>
                        <th className="px-2 py-2 text-center">SL</th>
                        <th className="px-2 py-2 text-right">Đơn giá</th>
                        <th className="px-2 py-2 text-center">Thuế%</th>
                        <th className="px-2 py-2 text-right">Tiền thuế</th>
                        <th className="px-2 py-2 text-right">Thành tiền</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {computedRows.map((row, index) => (
                        <tr key={row.id} className="border-t border-gray-100 align-middle odd:bg-white even:bg-gray-50/70">
                          <td className="px-2 py-2 text-center text-gray-400">{index + 1}</td>
                          <td className="px-2 py-2 align-middle">
                            <textarea
                              value={row.name}
                              onChange={(e) => updateItem(row.id, { name: e.target.value })}
                              rows={2}
                              className={`${cellInput} min-h-[40px] resize-y`}
                              placeholder="Tên hàng hóa / dịch vụ"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.unit}
                              onChange={(e) => updateItem(row.id, { unit: e.target.value })}
                              className={`${cellInput} text-center`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            {moneyLocked ? (
                              <div className={`${lockedCell} text-center`}>
                                {Number.isInteger(row.quantity)
                                  ? formatVnd(row.quantity, 0)
                                  : formatVnd(row.quantity)}
                              </div>
                            ) : (
                              <input
                                inputMode="decimal"
                                value={
                                  qtyDrafts[row.id] ??
                                  (Number.isInteger(row.quantity)
                                    ? formatVnd(row.quantity, 0)
                                    : formatVnd(row.quantity))
                                }
                                onChange={(e) => {
                                  const typed = formatVndTyping(e.target.value);
                                  setQtyDrafts((prev) => ({ ...prev, [row.id]: typed }));
                                  updateItem(row.id, { quantity: parseVndInput(typed) });
                                }}
                                onBlur={() => {
                                  setQtyDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[row.id];
                                    return next;
                                  });
                                }}
                                className={`${cellInput} text-center`}
                              />
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {moneyLocked ? (
                              <div className={`${lockedCell} text-right tabular-nums`}>{formatVnd(row.unitPrice)}</div>
                            ) : (
                              <input
                                inputMode="decimal"
                                value={priceDrafts[row.id] ?? formatVnd(row.unitPrice)}
                                onChange={(e) => {
                                  const typed = formatVndTyping(e.target.value);
                                  setPriceDrafts((prev) => ({ ...prev, [row.id]: typed }));
                                  updateItem(row.id, { unitPrice: parseVndInput(typed) });
                                }}
                                onBlur={() => {
                                  setPriceDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[row.id];
                                    return next;
                                  });
                                }}
                                className={`${cellInput} text-right tabular-nums`}
                              />
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {moneyLocked ? (
                              <div className={`${lockedCell} text-center`}>{formatVnd(row.taxRate)}</div>
                            ) : (
                              <input
                                inputMode="decimal"
                                value={taxDrafts[row.id] ?? formatVnd(row.taxRate)}
                                onChange={(e) => {
                                  const typed = formatVndTyping(e.target.value);
                                  setTaxDrafts((prev) => ({ ...prev, [row.id]: typed }));
                                  updateItem(row.id, { taxRate: parseVndInput(typed) });
                                }}
                                onBlur={() => {
                                  setTaxDrafts((prev) => {
                                    const next = { ...prev };
                                    delete next[row.id];
                                    return next;
                                  });
                                }}
                                className={`${cellInput} text-center`}
                              />
                            )}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-gray-600">
                            {formatVnd(row.tax)}
                          </td>
                          <td className="px-2 py-2 text-right font-semibold tabular-nums text-gray-800">
                            {formatVnd(row.total, 0)}
                          </td>
                          <td className="px-1 py-2 text-center">
                            {!moneyLocked && (
                              <button
                                type="button"
                                onClick={() => removeItem(row.id)}
                                disabled={items.length <= 1}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                title="Xóa dòng"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-emerald-50/80 font-bold">
                        <td colSpan={6} className="px-2 py-2.5 text-gray-700">
                          Tổng (ước tính)
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-700">
                          {formatVnd(totals.tax)}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-[#00A859]">
                          {formatVnd(totals.total, 0)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[11px] text-gray-400">
                  Số liệu chính thức lấy từ file do hệ thống eInvoice gen.
                </p>
              </section>

              {generateError && (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                  {generateError}
                </p>
              )}
            </div>
          </div>

          {/* Viewer file từ link hệ thống ngoài — chỉ hiện khi đang gen / đã có file */}
          {showPreviewPane && (
          <div className="flex min-h-[360px] min-w-0 flex-1 flex-col bg-gray-100">
            {isGenerating && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <Loader2 size={32} className="animate-spin text-[#00A859]" />
                <p className="font-bold text-gray-700">Đang gen file từ hệ thống eInvoice...</p>
                <p className="text-[12px] text-gray-500">Vui lòng đợi phản hồi link file.</p>
              </div>
            )}

            {previewFileUrl && !isGenerating && (
              <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-800">{previewFileName}</p>
                    {needsRegen && (
                      <p className="text-[11px] font-semibold text-amber-600">
                        Form đã đổi — cần tạo lại preview để khớp nội dung mới.
                      </p>
                    )}
                  </div>
                  <a
                    href={previewFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:border-[#00A859] hover:text-[#00A859]"
                  >
                    <ExternalLink size={13} />
                    Mở link file
                  </a>
                </div>
                <iframe
                  title="eInvoice preview file"
                  src={previewFileUrl}
                  className="min-h-0 w-full flex-1 bg-white"
                />
              </>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoicePreviewModal;
