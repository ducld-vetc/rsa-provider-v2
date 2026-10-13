import React, { useState, useMemo } from 'react';
import {
  X,
  LogOut,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  Wrench,
  Clock,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import { MASTER_TOOL_CATALOG } from '../../data/partnerRescueMockData';
import type { ToolInspectionItem } from './CheckinModal';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    driverId: string;
    driverName: string;
    shiftName: string;
    date: string;
    startTime: string;
    endTime: string;
    vehiclePlate?: string;
    vehicleType?: string;
    checkinAt?: string;
    startKm?: number;
    toolItems?: ToolInspectionItem[];
  };
  onConfirm: (data: {
    assignmentId: string;
    endKm: number;
    toolCondition: 'GOOD' | 'BROKEN' | 'MISSING';
    toolItems: ToolInspectionItem[];
    checkoutNote?: string;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const startKm = assignment.startKm || 45200;
  const [endKm, setEndKm] = useState<number>(startKm + 85);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState('');

  // Danh sách công cụ bàn giao
  const [tools, setTools] = useState<ToolInspectionItem[]>(() => {
    if (assignment.toolItems && assignment.toolItems.length > 0) {
      return assignment.toolItems;
    }
    return MASTER_TOOL_CATALOG.map((t) => ({
      name: t.name,
      unit: t.unit,
      standardQty: t.standardQty,
      actualQty: t.standardQty,
      condition: 'GOOD',
      note: '',
    }));
  });

  const handleToolConditionChange = (
    index: number,
    cond: 'GOOD' | 'BROKEN' | 'MISSING'
  ) => {
    setTools((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const actual =
          cond === 'MISSING' ? Math.max(0, item.standardQty - 1) : item.standardQty;
        return {
          ...item,
          condition: cond,
          actualQty: actual,
        };
      })
    );
  };

  const handleToolQtyChange = (index: number, qty: number) => {
    setTools((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, actualQty: Math.max(0, qty) } : item
      )
    );
  };

  const handleToolNoteChange = (index: number, note: string) => {
    setTools((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, note } : item))
    );
  };

  const handleSetAllGood = () => {
    setTools((prev) =>
      prev.map((item) => ({
        ...item,
        condition: 'GOOD',
        actualQty: item.standardQty,
        note: '',
      }))
    );
  };

  const kmDifference = endKm - startKm;
  const isKmValid = kmDifference >= 0;

  const hasIssues = tools.some(
    (t) => t.condition === 'BROKEN' || t.condition === 'MISSING'
  );
  const overallCondition = hasIssues ? 'MISSING' : 'GOOD';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKmValid) {
      alert(`Số km lúc kết thúc ca (${endKm}) không được nhỏ hơn số km nhận ca (${startKm})!`);
      return;
    }
    onConfirm({
      assignmentId: assignment.id,
      endKm,
      toolCondition: overallCondition,
      toolItems: tools,
      checkoutNote,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Check-out kết thúc ca làm việc
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                  FDD FL-M2-03 (APP-03)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {assignment.shiftName} · {assignment.driverName} · Xe:{' '}
                <span className="font-bold text-slate-800 font-mono">
                  {assignment.vehiclePlate || '29C-123.45'}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Tóm tắt ca làm & Xe đã nhận */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <span className="text-[10px] text-slate-500 block">Phương tiện:</span>
              <strong className="text-slate-900 font-mono text-xs">
                {assignment.vehiclePlate || '29C-123.45'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Giờ nhận ca (Check-in):</span>
              <strong className="text-emerald-700 font-bold">
                ✓ {assignment.checkinAt || '06:50'}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Km lúc nhận ca:</span>
              <strong className="text-slate-900 font-mono">
                {startKm.toLocaleString('vi-VN')} km
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Thời gian kết thúc:</span>
              <strong className="text-blue-700 font-bold">
                {assignment.endTime} (Hôm nay)
              </strong>
            </div>
          </div>

          {/* Bước 1: Số km kết thúc ca & Tính quãng đường */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span>1. Số km đồng hồ kết thúc ca (Bắt buộc)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Phải ≥ {startKm.toLocaleString('vi-VN')} km
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={startKm}
                    value={endKm}
                    onChange={(e) => setEndKm(Number(e.target.value))}
                    className={`flex-1 px-3 py-2 bg-white border rounded-lg text-slate-900 font-bold font-mono text-sm focus:outline-none focus:ring-2 ${
                      !isKmValid
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                    }`}
                  />
                  <span className="text-slate-500 font-bold text-xs">km</span>
                </div>
                {!isKmValid && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Số km kết thúc không được nhỏ hơn km nhận ca!</span>
                  </p>
                )}
                <div className="flex items-center gap-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setEndKm((v) => v + 30)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:bg-slate-100 font-mono"
                  >
                    +30 km
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndKm((v) => v + 80)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:bg-slate-100 font-mono"
                  >
                    +80 km
                  </button>
                  <button
                    type="button"
                    onClick={() => setEndKm((v) => v + 150)}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:bg-slate-100 font-mono"
                  >
                    +150 km
                  </button>
                </div>
              </div>

              {/* Box hiển thị Quãng đường đã chạy */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-700 block font-medium">
                    Quãng đường đã chạy trong ca:
                  </span>
                  <div className="text-xl font-black text-blue-900 font-mono">
                    {isKmValid ? `+${kmDifference.toLocaleString('vi-VN')} km` : '—'}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Ảnh đồng hồ */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setHasPhoto(!hasPhoto)}
                className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  hasPhoto
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-dashed border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  {hasPhoto
                    ? '✓ Đã đính kèm ảnh taplo_checkout.jpg'
                    : 'Đính kèm ảnh chụp đồng hồ km kết thúc ca'}
                </span>
              </button>
            </div>
          </div>

          {/* Bước 2: Kiểm kê công cụ bàn giao cuối ca */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>2. Kiểm kê trang bị & công cụ bàn giao lại (Cuối ca)</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Xác nhận tình trạng công cụ trên xe trước khi bàn giao cho trạm / ca sau
                </p>
              </div>
              <button
                type="button"
                onClick={handleSetAllGood}
                className="px-2.5 py-1 bg-white border border-blue-300 text-blue-800 rounded-lg text-[10px] font-bold hover:bg-blue-50 transition"
              >
                ✓ Tất cả Đủ & Tốt
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-52 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Tên công cụ</th>
                    <th className="py-2 px-2 text-center w-20">Tiêu chuẩn</th>
                    <th className="py-2 px-2 text-center w-40">Tình trạng</th>
                    <th className="py-2 px-3 w-44">Ghi chú bàn giao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {tools.map((item, idx) => (
                    <tr key={item.name} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-slate-600">
                        {item.standardQty} {item.unit}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <div className="inline-flex rounded-md shadow-2xs overflow-hidden border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleToolConditionChange(idx, 'GOOD')}
                            className={`px-2 py-1 text-[10px] font-bold transition ${
                              item.condition === 'GOOD'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Tốt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToolConditionChange(idx, 'BROKEN')}
                            className={`px-2 py-1 text-[10px] font-bold transition border-l border-r border-slate-200 ${
                              item.condition === 'BROKEN'
                                ? 'bg-rose-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Hỏng
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToolConditionChange(idx, 'MISSING')}
                            className={`px-2 py-1 text-[10px] font-bold transition ${
                              item.condition === 'MISSING'
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Thiếu
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {item.condition === 'MISSING' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500 shrink-0">Còn:</span>
                            <input
                              type="number"
                              min={0}
                              max={item.standardQty}
                              value={item.actualQty}
                              onChange={(e) => handleToolQtyChange(idx, Number(e.target.value))}
                              className="w-14 px-1.5 py-0.5 border border-amber-300 rounded text-[11px] font-mono text-center"
                            />
                            <input
                              type="text"
                              placeholder="Lý do..."
                              value={item.note || ''}
                              onChange={(e) => handleToolNoteChange(idx, e.target.value)}
                              className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px]"
                            />
                          </div>
                        ) : item.condition === 'BROKEN' ? (
                          <input
                            type="text"
                            placeholder="Mô tả sự cố..."
                            value={item.note || ''}
                            onChange={(e) => handleToolNoteChange(idx, e.target.value)}
                            className="w-full px-2 py-0.5 border border-rose-300 rounded text-[10px] text-rose-700 bg-rose-50/40"
                          />
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Đầy đủ, sẵn sàng</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bước 3: Ghi chú bàn giao xe & ca làm */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
            <label className="font-bold text-slate-800 text-xs">
              3. Ghi chú bàn giao ca trực (Tùy chọn)
            </label>
            <textarea
              rows={2}
              value={checkoutNote}
              onChange={(e) => setCheckoutNote(e.target.value)}
              placeholder="Ghi chú về số cuốc hoàn thành, tình trạng nhiên liệu, vệ sinh xe hoặc lưu ý bàn giao cho ca kế tiếp..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Ca trực sẽ chuyển sang trạng thái "Đã hoàn thành"</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!isKmValid}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Xác nhận kết thúc ca (Check-out)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
