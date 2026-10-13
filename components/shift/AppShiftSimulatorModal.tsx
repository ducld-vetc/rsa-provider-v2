import React, { useState, useMemo } from 'react';
import {
  X,
  Smartphone,
  Calendar,
  Clock,
  Truck,
  CheckCircle2,
  LogIn,
  LogOut,
  ChevronRight,
  User,
  ShieldCheck,
  AlertCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import type { ShiftAssignmentItem } from '../../pages/ShiftMonthlySchedule';
import { shiftStatusBadgeStyles, shiftStatusLabels } from '../../pages/ShiftMonthlySchedule';

interface AppShiftSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: ShiftAssignmentItem[];
  drivers: { id: string; name: string; phone: string; code: string }[];
  onTriggerCheckin: (assignment: ShiftAssignmentItem) => void;
  onTriggerCheckout: (assignment: ShiftAssignmentItem) => void;
}

export const AppShiftSimulatorModal: React.FC<AppShiftSimulatorModalProps> = ({
  isOpen,
  onClose,
  assignments,
  drivers,
  onTriggerCheckin,
  onTriggerCheckout,
}) => {
  if (!isOpen) return null;

  const defaultDriverId = drivers[0]?.id || 'drv-1';
  const [activeDriverId, setActiveDriverId] = useState(defaultDriverId);
  const [mobileTab, setMobileTab] = useState<'today' | 'upcoming' | 'history'>('today');

  const currentDriver = useMemo(() => {
    return drivers.find((d) => d.id === activeDriverId) || drivers[0];
  }, [activeDriverId, drivers]);

  // Lọc ca của tài xế này
  const driverAssignments = useMemo(() => {
    return assignments.filter((a) => a.driverId === activeDriverId);
  }, [assignments, activeDriverId]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Ca hôm nay
  const todayShift = useMemo(() => {
    return driverAssignments.find((a) => a.date === todayStr) || driverAssignments[0];
  }, [driverAssignments, todayStr]);

  // Ca sắp tới (14 ngày tới)
  const upcomingShifts = useMemo(() => {
    return driverAssignments.filter((a) => a.date >= todayStr);
  }, [driverAssignments, todayStr]);

  // Ca đã qua (30 ngày qua)
  const historyShifts = useMemo(() => {
    return driverAssignments.filter((a) => a.date < todayStr || a.status === 'COMPLETED');
  }, [driverAssignments, todayStr]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative max-w-md w-full flex flex-col items-center">
        {/* Top Control Bar */}
        <div className="w-full mb-3 flex items-center justify-between bg-slate-800/90 text-white px-4 py-2 rounded-xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">Mô phỏng App Tài xế (FL-M2-03)</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activeDriverId}
              onChange={(e) => setActiveDriverId(e.target.value)}
              className="bg-slate-700 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:outline-none"
              title="Đổi tài xế đăng nhập app"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  Tài xế: {d.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khung điện thoại iPhone mockup */}
        <div className="w-[360px] sm:w-[380px] h-[680px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700 flex flex-col overflow-hidden relative">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-end pr-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* Màn hình điện thoại bên trong */}
          <div className="flex-1 bg-slate-50 rounded-[34px] overflow-hidden flex flex-col relative">
            {/* Status bar */}
            <div className="pt-2 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-800 shrink-0">
              <span>09:41</span>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="text-[10px]">5G</span>
                <div className="w-4 h-2 border border-slate-600 rounded-xs flex items-center p-0.5">
                  <div className="w-2.5 h-full bg-slate-700 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* App Header */}
            <div className="bg-[#005d2d] text-white px-4 pt-4 pb-3 shadow-sm shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                    {currentDriver?.name?.split(' ').pop()?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <div className="font-bold text-xs">{currentDriver?.name}</div>
                    <div className="text-[10px] text-emerald-200">
                      Tài xế cứu hộ · {currentDriver?.phone}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Online
                </span>
              </div>

              {/* Title tab */}
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-sm">Ca làm việc của tôi</span>
                <span className="text-[10px] text-emerald-200">FDD FL-M2-03</span>
              </div>

              {/* Navigation Tabs trong App */}
              <div className="mt-2.5 grid grid-cols-3 bg-black/20 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setMobileTab('today')}
                  className={`py-1.5 rounded-md transition ${
                    mobileTab === 'today'
                      ? 'bg-white text-[#005d2d] shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('upcoming')}
                  className={`py-1.5 rounded-md transition ${
                    mobileTab === 'upcoming'
                      ? 'bg-white text-[#005d2d] shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  14 ngày tới
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('history')}
                  className={`py-1.5 rounded-md transition ${
                    mobileTab === 'history'
                      ? 'bg-white text-[#005d2d] shadow-xs'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  30 ngày qua
                </button>
              </div>
            </div>

            {/* App Body Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* TAB 1: HÔM NAY */}
              {mobileTab === 'today' && (
                <div className="space-y-3">
                  {todayShift ? (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
                      {/* Badge trạng thái */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#005d2d]">
                          Ca làm hôm nay
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            shiftStatusBadgeStyles[todayShift.status]
                          }`}
                        >
                          {shiftStatusLabels[todayShift.status]}
                        </span>
                      </div>

                      {/* Thông tin ca */}
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900">
                          {todayShift.shiftName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold font-mono">
                            {todayShift.startTime} – {todayShift.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                          <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Xe: <strong className="font-mono text-slate-800">{todayShift.vehiclePlate || '29C-123.45'}</strong></span>
                        </div>
                      </div>

                      {/* Khối trạng thái Checkin / Checkout */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        {todayShift.checkinAt ? (
                          <div className="flex items-center justify-between text-emerald-700">
                            <span className="flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              Đã nhận ca (Check-in):
                            </span>
                            <strong className="font-mono">{todayShift.checkinAt}</strong>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Chưa nhận ca (Chưa check-in)</span>
                            <span className="text-[10px] italic">Bắt buộc khi vào ca</span>
                          </div>
                        )}

                        {todayShift.startKm && (
                          <div className="flex items-center justify-between text-slate-600 text-[11px]">
                            <span>Km nhận ca:</span>
                            <strong className="font-mono">
                              {todayShift.startKm.toLocaleString('vi-VN')} km
                            </strong>
                          </div>
                        )}

                        {todayShift.checkoutAt && (
                          <div className="flex items-center justify-between text-blue-700 pt-1 border-t border-slate-200">
                            <span className="flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              Đã bàn giao (Check-out):
                            </span>
                            <strong className="font-mono">{todayShift.checkoutAt}</strong>
                          </div>
                        )}

                        {todayShift.endKm && (
                          <div className="flex items-center justify-between text-blue-900 text-[11px]">
                            <span>Km cuối ca:</span>
                            <strong className="font-mono">
                              {todayShift.endKm.toLocaleString('vi-VN')} km (Chạy{' '}
                              {todayShift.endKm - (todayShift.startKm || 0)} km)
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Các nút bấm hành động trên Mobile */}
                      <div className="pt-1 space-y-2">
                        {!todayShift.checkinAt ? (
                          <button
                            type="button"
                            onClick={() => onTriggerCheckin(todayShift)}
                            className="w-full py-3 bg-[#01a651] hover:bg-[#008f45] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                          >
                            <LogIn className="w-4 h-4" />
                            <span>Check-in nhận ca (Chọn xe & Km)</span>
                          </button>
                        ) : !todayShift.checkoutAt ? (
                          <button
                            type="button"
                            onClick={() => onTriggerCheckout(todayShift)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Check-out kết thúc ca & bàn giao xe</span>
                          </button>
                        ) : (
                          <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-center font-bold text-xs border border-emerald-200 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Ca làm đã hoàn thành đầy đủ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
                      <p className="text-slate-500 text-xs">
                        Hôm nay bạn không có ca làm việc nào được phân công.
                      </p>
                    </div>
                  )}

                  {/* Hướng dẫn quy trình */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Quy tắc ca làm (BR-W02 & BR-W07):</span>
                    </div>
                    <ul className="list-disc list-inside text-[10px] text-amber-800 space-y-0.5">
                      <li>Check-in từ 30 phút trước giờ bắt đầu đến trước giờ hết ca.</li>
                      <li>Bắt buộc kiểm tra số km đồng hồ và công cụ theo xe.</li>
                      <li>Checkout từ khi đã check-in đến 2 giờ sau giờ hết ca.</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: 14 NGÀY TỚI */}
              {mobileTab === 'upcoming' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 px-1">
                    Lịch phân công 14 ngày tới ({upcomingShifts.length} ca)
                  </div>
                  {upcomingShifts.map((sh) => (
                    <div
                      key={sh.id}
                      className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          {sh.shiftName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            shiftStatusBadgeStyles[sh.status]
                          }`}
                        >
                          {shiftStatusLabels[sh.status]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Ngày: <strong className="text-slate-800">{sh.date}</strong></span>
                        <span className="font-mono">{sh.startTime} – {sh.endTime}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>Xe: {sh.vehiclePlate || '29C-123.45'}</span>
                        {sh.checkinAt ? (
                          <span className="text-emerald-700 font-bold">✓ Đã checkin {sh.checkinAt}</span>
                        ) : (
                          <span>Chưa check-in</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: 30 NGÀY QUA */}
              {mobileTab === 'history' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 px-1">
                    Lịch sử ca đã hoàn thành ({historyShifts.length} ca)
                  </div>
                  {historyShifts.map((sh) => (
                    <div
                      key={sh.id}
                      className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          {sh.shiftName} · {sh.date}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Hoàn thành
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        {sh.startTime} – {sh.endTime}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>In: {sh.checkinAt || '06:50'} · Out: {sh.checkoutAt || '15:10'}</span>
                        <strong className="text-blue-700 font-mono">
                          +{sh.endKm && sh.startKm ? (sh.endKm - sh.startKm) : 85} km
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Home Indicator */}
            <div className="p-2 flex justify-center bg-slate-50 shrink-0">
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
