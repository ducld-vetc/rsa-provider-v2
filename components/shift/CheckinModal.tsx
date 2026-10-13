import React, { useState, useMemo } from 'react';
import {
  X,
  LogIn,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  ShieldCheck,
  Wrench,
  Clock,
  User,
  Info,
} from 'lucide-react';
import {
  VEHICLES,
  MASTER_TOOL_CATALOG,
  VEHICLE_TYPE_LABEL,
  type VehicleRecord,
} from '../../data/partnerRescueMockData';

export interface ToolInspectionItem {
  name: string;
  unit: string;
  standardQty: number;
  actualQty: number;
  condition: 'GOOD' | 'BROKEN' | 'MISSING';
  note?: string;
}

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: {
    id: string;
    driverId: string;
    driverName: string;
    driverPhone?: string;
    shiftName: string;
    date: string;
    startTime: string;
    endTime: string;
    vehiclePlate?: string;
    startKm?: number;
  };
  onConfirm: (data: {
    assignmentId: string;
    vehiclePlate: string;
    vehicleType?: string;
    startKm: number;
    toolCondition: 'GOOD' | 'BROKEN' | 'MISSING';
    toolItems: ToolInspectionItem[];
    checkinNote?: string;
  }) => void;
}

export const CheckinModal: React.FC<CheckinModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onConfirm,
}) => {
  if (!isOpen) return null;

  // Lọc xe: ưu tiên xe gán cho tài xế này, sau đó là các xe Sẵn sàng
  const availableVehicles = useMemo(() => {
    const assigned = VEHICLES.filter(
      (v) =>
        v.driverId === assignment.driverId ||
        v.driverIds?.includes(assignment.driverId)
    );
    const others = VEHICLES.filter(
      (v) =>
        v.driverId !== assignment.driverId &&
        !v.driverIds?.includes(assignment.driverId) &&
        v.status !== 'INACTIVE'
    );
    return { assigned, others };
  }, [assignment.driverId]);

  const defaultVehicle =
    availableVehicles.assigned[0] ||
    availableVehicles.others[0] ||
    VEHICLES[0];

  const [selectedPlate, setSelectedPlate] = useState(
    assignment.vehiclePlate || defaultVehicle?.plate || '29C-123.45'
  );

  const selectedVehicleObj = useMemo(() => {
    return (
      VEHICLES.find((v) => v.plate === selectedPlate) || defaultVehicle
    );
  }, [selectedPlate, defaultVehicle]);

  const [startKm, setStartKm] = useState<number>(
    assignment.startKm || 45200
  );
  const [hasPhoto, setHasPhoto] = useState(false);
  const [checkinNote, setCheckinNote] = useState('');

  // Danh sách công cụ kiểm tra
  const [tools, setTools] = useState<ToolInspectionItem[]>(() => {
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

  const hasIssues = tools.some(
    (t) => t.condition === 'BROKEN' || t.condition === 'MISSING'
  );
  const overallCondition = hasIssues ? 'MISSING' : 'GOOD';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startKm <= 0) {
      alert('Vui lòng nhập số km đồng hồ hợp lệ!');
      return;
    }
    onConfirm({
      assignmentId: assignment.id,
      vehiclePlate: selectedPlate,
      vehicleType: selectedVehicleObj
        ? VEHICLE_TYPE_LABEL[selectedVehicleObj.type]
        : undefined,
      startKm,
      toolCondition: overallCondition,
      toolItems: tools,
      checkinNote,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Check-in nhận ca làm việc
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-[#005d2d]">
                  FDD FL-M2-03 (APP-02)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {assignment.shiftName} · {assignment.startTime} – {assignment.endTime} ·{' '}
                <span className="font-semibold text-slate-700">{assignment.driverName}</span>
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
          {/* Bước 1: Chọn xe cứu hộ */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>1. Chọn phương tiện cứu hộ nhận ca (Bắt buộc)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {availableVehicles.assigned.length} xe được giao
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {availableVehicles.assigned.map((veh) => (
                <label
                  key={veh.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                    selectedPlate === veh.plate
                      ? 'border-[#01a651] bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selectedVehicle"
                      value={veh.plate}
                      checked={selectedPlate === veh.plate}
                      onChange={() => setSelectedPlate(veh.plate)}
                      className="text-[#01a651] focus:ring-[#01a651]"
                    />
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {veh.plate}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {veh.brand} · {VEHICLE_TYPE_LABEL[veh.type]}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">
                    Được giao
                  </span>
                </label>
              ))}

              {availableVehicles.others.slice(0, 4).map((veh) => (
                <label
                  key={veh.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                    selectedPlate === veh.plate
                      ? 'border-[#01a651] bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="selectedVehicle"
                      value={veh.plate}
                      checked={selectedPlate === veh.plate}
                      onChange={() => setSelectedPlate(veh.plate)}
                      className="text-[#01a651] focus:ring-[#01a651]"
                    />
                    <div>
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {veh.plate}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {veh.brand} · {VEHICLE_TYPE_LABEL[veh.type]}
                      </div>
                    </div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                    Xe trạm
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Bước 2: Số km đồng hồ & Ảnh đồng hồ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>2. Số km đồng hồ nhận ca (Bắt buộc)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  required
                  min={1}
                  value={startKm}
                  onChange={(e) => setStartKm(Number(e.target.value))}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#01a651]/20 focus:border-[#01a651]"
                  placeholder="Ví dụ: 45200"
                />
                <span className="text-slate-500 font-bold text-xs">km</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStartKm((v) => v + 50)}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:bg-slate-100 font-mono"
                >
                  +50 km
                </button>
                <button
                  type="button"
                  onClick={() => setStartKm((v) => v + 100)}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 hover:bg-slate-100 font-mono"
                >
                  +100 km
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
              <div>
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Ảnh đồng hồ km (Tùy chọn)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Chụp ảnh mặt taplo đồng hồ km lúc nhận ca
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHasPhoto(!hasPhoto)}
                className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  hasPhoto
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-dashed border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{hasPhoto ? '✓ Đã đính kèm ảnh taplo_checkin.jpg' : 'Đính kèm / Chụp ảnh đồng hồ'}</span>
              </button>
            </div>
          </div>

          {/* Bước 3: Kiểm kê công cụ trên xe */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>3. Kiểm kê trang bị & công cụ theo xe (Bàn giao đầu ca)</span>
                </label>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Đánh dấu Tốt / Hỏng / Thiếu so với số lượng tiêu chuẩn trang bị
                </p>
              </div>
              <button
                type="button"
                onClick={handleSetAllGood}
                className="px-2.5 py-1 bg-white border border-emerald-300 text-[#005d2d] rounded-lg text-[10px] font-bold hover:bg-emerald-50 transition"
              >
                ✓ Tất cả Đủ & Tốt
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-56 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Tên công cụ</th>
                    <th className="py-2 px-2 text-center w-20">Tiêu chuẩn</th>
                    <th className="py-2 px-2 text-center w-40">Tình trạng</th>
                    <th className="py-2 px-3 w-44">Ghi chú hỏng/thiếu</th>
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
                            <span className="text-[10px] text-slate-500 shrink-0">Có:</span>
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
                              placeholder="Lý do thiếu..."
                              value={item.note || ''}
                              onChange={(e) => handleToolNoteChange(idx, e.target.value)}
                              className="flex-1 px-1.5 py-0.5 border border-slate-200 rounded text-[10px]"
                            />
                          </div>
                        ) : item.condition === 'BROKEN' ? (
                          <input
                            type="text"
                            placeholder="Mô tả hỏng hóc..."
                            value={item.note || ''}
                            onChange={(e) => handleToolNoteChange(idx, e.target.value)}
                            className="w-full px-2 py-0.5 border border-rose-300 rounded text-[10px] text-rose-700 bg-rose-50/40"
                          />
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Đầy đủ, hoạt động tốt</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bước 4: Ghi chú nhận ca */}
          <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
            <label className="font-bold text-slate-800 text-xs">
              4. Ghi chú nhận ca làm (Tùy chọn)
            </label>
            <textarea
              rows={2}
              value={checkinNote}
              onChange={(e) => setCheckinNote(e.target.value)}
              placeholder="Ghi chú về tình trạng xe, nhiên liệu, thời tiết hoặc lưu ý khi nhận ca..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#01a651]/20 focus:border-[#01a651]"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dữ liệu sẽ được lưu vào lịch sử phương tiện & nhật ký ca trực</span>
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
                className="px-5 py-2 bg-[#01a651] hover:bg-[#008f45] text-white rounded-lg font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Xác nhận nhận ca (Check-in)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
