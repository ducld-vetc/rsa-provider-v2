/**
 * ShiftDefinitionManagement.tsx
 * Route: /partner/shift-config (Provider portal)
 * Style: 100% Khớp bố cục rsa-provider-portal/src/pages/employeeManagement/shiftConfig
 * Gồm:
 *  1. Bảng cấu hình ca làm việc
 *  2. Card Form cấu hình ca làm (ShiftConfigForm: Tên ca, Mã ca, Khung giờ, Min/Max, Giờ nghỉ, Đối tượng áp dụng, Ngày trong tuần)
 *  3. Bảng cấu hình ca làm việc (ShiftConfigTable: UI-22 với đầy đủ cột và thao tác)
 */
import React, { useMemo, useState } from 'react';
import {
  Calendar, Clock, Plus, Pencil, Trash2, X, Check, AlertTriangle,
  ChevronDown, Moon, Sun, Users, Copy, Search,
  CheckCircle2, Layers, Settings2, Info, ArrowRight,
  RefreshCw, ShieldAlert, Coffee, Building2, MapPin,
} from 'lucide-react';
import {
  MOCK_STATIONS_FOR_SHIFT,
  type ShiftDefinition,
  type ShiftType,
} from '../data/shiftConfigMockData';
import { useShiftConfig } from '../context/ShiftConfigContext';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import { ROLE_LABEL, type PartnerPersona } from '../data/partnerRescueMockData';

// ─── Helpers & Types ──────────────────────────────────────────────────────────

const toMin = (t: string) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const isNightShiftTime = (start: string, end: string) => toMin(end) <= toMin(start);

export interface BreakItem {
  id: string;
  startTime: string;
  endTime: string;
  description: string;
}

export interface ApplicableStationItem {
  partnerId: string;
  partnerName: string;
  stationId: string;
  stationName: string;
}

const WEEKDAYS = [
  { id: 'T2', label: 'Thứ 2' },
  { id: 'T3', label: 'Thứ 3' },
  { id: 'T4', label: 'Thứ 4' },
  { id: 'T5', label: 'Thứ 5' },
  { id: 'T6', label: 'Thứ 6' },
  { id: 'T7', label: 'Thứ 7' },
  { id: 'CN', label: 'Chủ nhật' },
];

const MOCK_PARTNERS = [
  { id: 'p-vetc', name: 'VETC Cứu hộ giao thông' },
  { id: 'p-carpla', name: 'Carpla Fleet Service' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ShiftDefinitionManagement: React.FC = () => {
  const { shiftDefinitions, setShiftDefinitions } = useShiftConfig();
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const isAdmin = persona.role === 'BDH';



  // State Form tạo / sửa (theo ShiftConfigForm của provider portal)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shiftKey, setShiftKey] = useState('');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [minStaff, setMinStaff] = useState<number>(1);
  const [maxStaff, setMaxStaff] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Giờ nghỉ giữa ca (work_shift_break)
  const [breaks, setBreaks] = useState<BreakItem[]>([]);
  const [newBreakStart, setNewBreakStart] = useState('12:00');
  const [newBreakEnd, setNewBreakEnd] = useState('13:00');
  const [newBreakDesc, setNewBreakDesc] = useState('Nghỉ trưa');

  // Đối tượng áp dụng (work_shift_station)
  const [appliedTargets, setAppliedTargets] = useState<ApplicableStationItem[]>([
    { partnerId: 'p-vetc', partnerName: 'VETC Cứu hộ', stationId: 'stn-hn1', stationName: 'Trạm HN - Hoàng Mai' },
    { partnerId: 'p-vetc', partnerName: 'VETC Cứu hộ', stationId: 'stn-hn2', stationName: 'Trạm HN - Cầu Giấy' },
  ]);
  const [targetPartnerId, setTargetPartnerId] = useState('p-vetc');
  const [targetStationId, setTargetStationId] = useState(MOCK_STATIONS_FOR_SHIFT[0].id);

  // Ngày áp dụng trong tuần
  const [operatingDays, setOperatingDays] = useState<string[]>(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);

  // Table filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DAY' | 'NIGHT' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  // DRIVER shifts: loại bỏ ca gãy ngoài phạm vi T10
  const driverShifts = useMemo(
    () => shiftDefinitions.filter(d => d.role === 'DRIVER' && !d.isOvertime && d.type !== 'SPLIT'),
    [shiftDefinitions]
  );

  const filteredShifts = useMemo(() => {
    return driverShifts.filter(s => {
      const matchQ = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     s.shiftKey.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQ) return false;
      if (filterType === 'DAY') return !s.isNightShift;
      if (filterType === 'NIGHT') return s.isNightShift;
      if (filterType === 'ACTIVE') return s.status === 'active';
      if (filterType === 'INACTIVE') return s.status === 'inactive';
      return true;
    });
  }, [driverShifts, searchQuery, filterType]);

  // Tính giờ làm thực tế
  const calcHours = useMemo(() => {
    const isNight = isNightShiftTime(startTime, endTime);
    let totalMins = isNight
      ? (24 * 60 - toMin(startTime)) + toMin(endTime)
      : toMin(endTime) - toMin(startTime);

    let totalBreakMins = 0;
    breaks.forEach(b => {
      let bMin = toMin(b.endTime) - toMin(b.startTime);
      if (bMin < 0) bMin += 24 * 60;
      totalBreakMins += bMin;
    });

    const workMins = Math.max(0, totalMins - totalBreakMins);
    const workHours = (workMins / 60).toFixed(1).replace('.0', '');
    return {
      workHours,
      totalBreakMins,
      isNight,
    };
  }, [startTime, endTime, breaks]);

  // Cảnh báo khi sửa (EX-07, EVT-02)
  const originalShift = useMemo(
    () => (editingId ? driverShifts.find(d => d.id === editingId) : null),
    [editingId, driverShifts]
  );

  const hasTimeChangeWarning = useMemo(() => {
    if (!originalShift) return false;
    return originalShift.timeStart !== startTime || originalShift.timeEnd !== endTime;
  }, [originalShift, startTime, endTime]);

  const hasOverstaffWarning = useMemo(() => {
    if (!originalShift || maxStaff === undefined) return false;
    return originalShift.maxStaff !== undefined && maxStaff < originalShift.maxStaff;
  }, [originalShift, maxStaff]);

  // Form handlers
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormError('');
    setShiftKey('');
    setName('');
    setStartTime('08:00');
    setEndTime('16:00');
    setMinStaff(1);
    setMaxStaff(undefined);
    setStatus('active');
    setBreaks([]);
    setOperatingDays(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (shift: ShiftDefinition) => {
    setEditingId(shift.id);
    setFormError('');
    setShiftKey(shift.shiftKey);
    setName(shift.name);
    setStartTime(shift.timeStart);
    setEndTime(shift.timeEnd);
    setMinStaff(shift.minStaff ?? 1);
    setMaxStaff(shift.maxStaff);
    setStatus(shift.status);
    if (shift.breakStart && shift.breakEnd) {
      setBreaks([
        {
          id: 'brk-1',
          startTime: shift.breakStart,
          endTime: shift.breakEnd,
          description: 'Nghỉ giữa ca',
        },
      ]);
    } else {
      setBreaks([]);
    }
    setOperatingDays(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // UI-23: Nhân bản mở form Thêm mới với dữ liệu ca cũ, mã ca để trống
  const handleDuplicate = (shift: ShiftDefinition) => {
    setEditingId(null);
    setFormError('');
    setShiftKey(''); // Để trống cho người dùng nhập mã ca mới
    setName(`${shift.name} (Bản sao)`);
    setStartTime(shift.timeStart);
    setEndTime(shift.timeEnd);
    setMinStaff(shift.minStaff ?? 1);
    setMaxStaff(shift.maxStaff);
    setStatus('active');
    if (shift.breakStart && shift.breakEnd) {
      setBreaks([{ id: 'brk-1', startTime: shift.breakStart, endTime: shift.breakEnd, description: 'Nghỉ giữa ca' }]);
    } else {
      setBreaks([]);
    }
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddBreak = () => {
    if (!newBreakStart || !newBreakEnd) {
      setFormError('Vui lòng chọn thời gian bắt đầu và kết thúc nghỉ');
      return;
    }
    setBreaks(prev => [
      ...prev,
      {
        id: `brk-${Date.now()}`,
        startTime: newBreakStart,
        endTime: newBreakEnd,
        description: newBreakDesc || 'Nghỉ giữa ca',
      },
    ]);
    showToast('Đã thêm khoảng nghỉ giữa ca');
  };

  const handleRemoveBreak = (id: string) => {
    setBreaks(prev => prev.filter(b => b.id !== id));
  };

  const handleAddTarget = () => {
    const partner = MOCK_PARTNERS.find(p => p.id === targetPartnerId);
    const station = MOCK_STATIONS_FOR_SHIFT.find(s => s.id === targetStationId);
    if (!partner || !station) return;

    if (appliedTargets.some(t => t.stationId === station.id)) {
      setFormError('Trạm này đã có trong danh sách áp dụng');
      return;
    }
    setAppliedTargets(prev => [
      ...prev,
      {
        partnerId: partner.id,
        partnerName: partner.name,
        stationId: station.id,
        stationName: station.name,
      },
    ]);
    setFormError('');
  };

  const handleRemoveTarget = (stationId: string) => {
    setAppliedTargets(prev => prev.filter(t => t.stationId !== stationId));
  };

  const handleSaveForm = () => {
    const key = shiftKey.trim().toUpperCase();
    if (!editingId) {
      if (!/^[A-Z0-9_-]{1,20}$/.test(key)) {
        setFormError('Mã ca bắt buộc, tối đa 20 ký tự (chữ in hoa, số, _, -)');
        return;
      }
      if (shiftDefinitions.some(d => d.shiftKey.toUpperCase() === key)) {
        setFormError('Mã ca đã tồn tại trong hệ thống. Vui lòng chọn mã khác.');
        return;
      }
    }
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên ca làm việc');
      return;
    }
    if (minStaff < 1 || minStaff > 50) {
      setFormError('Số người tối thiểu phải từ 1 đến 50 người');
      return;
    }
    if (maxStaff !== undefined && (maxStaff < minStaff || maxStaff > 50)) {
      setFormError('Số người tối đa phải ≥ tối thiểu và ≤ 50 (để trống = không giới hạn)');
      return;
    }
    if (operatingDays.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 ngày áp dụng trong tuần');
      return;
    }
    if (appliedTargets.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 trạm áp dụng');
      return;
    }

    setFormError('');
    const night = isNightShiftTime(startTime, endTime);
    const firstBreak = breaks[0];

    if (editingId) {
      setShiftDefinitions(prev =>
        prev.map(d =>
          d.id === editingId
            ? {
                ...d,
                name,
                timeStart: startTime,
                timeEnd: endTime,
                minStaff,
                maxStaff,
                status,
                isNightShift: night,
                breakStart: firstBreak ? firstBreak.startTime : undefined,
                breakEnd: firstBreak ? firstBreak.endTime : undefined,
              }
            : d
        )
      );
      showToast(`Đã cập nhật cấu hình ca [${key}] ${name}`);
    } else {
      const newShift: ShiftDefinition = {
        id: `driver-${key.toLowerCase()}-${Date.now()}`,
        role: 'DRIVER',
        shiftKey: key,
        name,
        type: 'TIME_SLOT',
        timeStart: startTime,
        timeEnd: endTime,
        minStaff,
        maxStaff,
        status: 'active',
        isNightShift: night,
        breakStart: firstBreak ? firstBreak.startTime : undefined,
        breakEnd: firstBreak ? firstBreak.endTime : undefined,
      };
      setShiftDefinitions(prev => [...prev, newShift]);
      showToast(`Đã tạo cấu hình ca mới [${key}] ${name}`);
    }

    setIsFormOpen(false);
  };

  // Vô hiệu hóa ca (DLG-03)
  const handleDisableShift = (id: string) => {
    setShiftDefinitions(prev => prev.map(d => (d.id === id ? { ...d, status: 'inactive' } : d)));
    setDeleteConfirmId(null);
    showToast('Đã vô hiệu hóa ca. Các lịch tương lai của ca chuyển Chờ xếp lại');
  };

  // Bật lại ca (BR-11)
  const handleReactivate = (id: string) => {
    setShiftDefinitions(prev => prev.map(d => (d.id === id ? { ...d, status: 'active' } : d)));
    showToast('Đã bật lại ca. Lịch chờ xếp lại trở về Đã lên lịch');
  };

  const shiftToDisable = useMemo(
    () => driverShifts.find(d => d.id === deleteConfirmId),
    [driverShifts, deleteConfirmId]
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-gray-800">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-[#00A859]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Access Denied Warning (AC-09) */}
      {!isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-600 shrink-0" />
            <span>
              <strong>Lưu ý quyền hạn (AC-09):</strong> Bạn đang ở vai trò <strong>{ROLE_LABEL[persona.role]} ({persona.title})</strong>. Màn hình Cấu hình ca làm chỉ hiển thị và cho phép thao tác đối với <strong>Admin (Ban điều hành)</strong>. Bạn có thể chuyển vai trò ở góc trái bên dưới để kiểm tra.
            </span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Quản lý nhân viên</span>
            <span>»</span>
            <span className="text-[#00A859] font-bold">Cấu hình ca làm</span>
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-[#00A859]" size={22} />
            Cấu hình ca làm việc
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg transition shadow-sm"
            >
              <Plus size={15} />
              <span>Tạo cấu hình ca</span>
            </button>
          )}
        </div>
      </div>


      {/* Nội dung chính */}
      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* ── MODAL DLG-01: POPUP TẠO / SỬA CẤU HÌNH CA LÀM (Popup DLG-01) ── */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden border">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/90 shrink-0">
                <div>
                  <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <Clock size={16} className="text-[#00A859]" />
                    <span>{editingId ? 'Sửa cấu hình ca làm việc' : 'Tạo cấu hình ca làm việc mới'}</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Thiết lập các thông số cho mẫu ca làm việc bao gồm cả giờ nghỉ giữa ca và đối tượng áp dụng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
              {/* Warnings when editing (EX-07, EVT-02) */}
              {hasTimeChangeWarning && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <span className="font-bold">Cảnh báo đổi khung giờ:</span> Các lịch tương lai đã phân công cho ca này sẽ được cập nhật khung giờ mới và gửi thông báo cho tài xế (BR-07).
                  </div>
                </div>
              )}

              {hasOverstaffWarning && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-orange-800 flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-orange-600" />
                  <div>
                    <span className="font-bold">Cảnh báo giảm tối đa (EX-07):</span> Bạn đang giảm số lượng tối đa. Nếu số người đã xếp ở ca tương lai vượt mức tối đa mới, ca sẽ hiển thị cảnh báo "Thừa người".
                  </div>
                </div>
              )}

              {/* Hàng 1: Mã ca, Tên ca, Giờ bắt đầu, Giờ kết thúc */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Mã ca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: C1, C2, CD..."
                    value={shiftKey}
                    onChange={e => setShiftKey(e.target.value.toUpperCase())}
                    disabled={!!editingId}
                    title={editingId ? 'Mã ca không sửa được sau khi tạo' : undefined}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono uppercase font-bold focus:border-[#00A859] outline-none disabled:bg-gray-100 disabled:text-gray-500"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    {editingId ? 'Mã ca cố định' : 'Tối đa 20 ký tự [A-Z0-9_-]'}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Tên ca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Ca sáng cứu hộ..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold focus:border-[#00A859] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Giờ bắt đầu ca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold focus:border-[#00A859] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Giờ kết thúc ca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold focus:border-[#00A859] outline-none"
                  />
                  <div className="mt-1">
                    {calcHours.isNight ? (
                      <span className="inline-flex items-center gap-1 text-violet-700 font-bold bg-violet-50 px-2 py-0.5 rounded text-[10px]">
                        <Moon size={10} /> Ca đêm (qua nửa đêm)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                        <Sun size={10} /> Ca ngày
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hàng 2: Tối thiểu, Tối đa, Giờ làm thực */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Số người tối thiểu (người) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={minStaff}
                    onChange={e => setMinStaff(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-bold focus:border-[#00A859] outline-none bg-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">1 đến 50 (mặc định 1)</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Số người tối đa (người)
                  </label>
                  <input
                    type="number"
                    min={minStaff}
                    max={50}
                    placeholder="Trống = không giới hạn"
                    value={maxStaff ?? ''}
                    onChange={e => setMaxStaff(e.target.value === '' ? undefined : parseInt(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 font-bold focus:border-[#00A859] outline-none bg-white"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Phải ≥ tối thiểu</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Giờ làm thực tế (tính toán)
                  </label>
                  <div className="py-2 text-xs font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-[#00A859] text-base font-black">{calcHours.workHours} giờ</span>
                    {calcHours.totalBreakMins > 0 && (
                      <span className="text-gray-400 font-normal">
                        (nghỉ {calcHours.totalBreakMins} phút)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Block 3: Đối tượng áp dụng (Đơn vị / Trạm) */}
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                      <Building2 size={15} className="text-[#00A859]" />
                      <span>Đối tượng áp dụng (Đơn vị / Trạm)</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Chọn các Trạm của Đơn vị mà cấu hình ca này sẽ áp dụng.
                    </p>
                  </div>
                </div>

                {/* Danh sách trạm đã gán */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {appliedTargets.map(t => (
                    <span
                      key={t.stationId}
                      className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-800 px-2.5 py-1 rounded-lg font-semibold text-xs"
                    >
                      <MapPin size={11} className="text-gray-400" />
                      <span>{t.stationName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTarget(t.stationId)}
                        className="text-gray-400 hover:text-red-500 transition ml-1"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {appliedTargets.length === 0 && (
                    <span className="text-gray-400 italic text-[11px]">Chưa chọn trạm áp dụng nào</span>
                  )}
                </div>

                {/* Hàng chọn thêm trạm */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t items-end">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Đơn vị</label>
                    <select
                      value={targetPartnerId}
                      onChange={e => setTargetPartnerId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs font-semibold outline-none focus:border-[#00A859]"
                    >
                      {MOCK_PARTNERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Trạm</label>
                    <select
                      value={targetStationId}
                      onChange={e => setTargetStationId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-xs font-semibold outline-none focus:border-[#00A859]"
                    >
                      {MOCK_STATIONS_FOR_SHIFT.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleAddTarget}
                      className="w-full py-2 px-3 border border-gray-300 hover:border-[#00A859] hover:text-[#00A859] text-gray-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus size={13} />
                      <span>+ Thêm trạm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Block 4: Giờ nghỉ giữa ca */}
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                    <Coffee size={15} className="text-amber-600" />
                    <span>Giờ nghỉ giữa ca</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Thời gian nghỉ giữa ca sẽ được trừ khỏi tổng giờ làm việc thực tế của ca.
                  </p>
                </div>

                {/* Danh sách khoảng nghỉ */}
                <div className="space-y-1.5">
                  {breaks.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200"
                    >
                      <div className="flex items-center gap-2 font-mono font-bold text-xs text-gray-800">
                        <Clock size={12} className="text-gray-400" />
                        <span>{b.startTime} – {b.endTime}</span>
                        <span className="text-gray-500 font-sans text-[11px] font-normal">({b.description})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBreak(b.id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {breaks.length === 0 && (
                    <div className="text-gray-400 italic text-[11px]">Không có giờ nghỉ giữa ca</div>
                  )}
                </div>

                {/* Hàng thêm khoảng nghỉ */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t items-end">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Nghỉ từ</label>
                    <input
                      type="time"
                      value={newBreakStart}
                      onChange={e => setNewBreakStart(e.target.value)}
                      className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-[#00A859]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Đến</label>
                    <input
                      type="time"
                      value={newBreakEnd}
                      onChange={e => setNewBreakEnd(e.target.value)}
                      className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-bold outline-none focus:border-[#00A859]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Mô tả nghỉ</label>
                    <input
                      type="text"
                      placeholder="VD: Nghỉ trưa..."
                      value={newBreakDesc}
                      onChange={e => setNewBreakDesc(e.target.value)}
                      className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-medium outline-none focus:border-[#00A859]"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddBreak}
                      className="w-full py-1.5 px-3 border border-gray-300 hover:border-[#00A859] hover:text-[#00A859] text-gray-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus size={13} />
                      <span>Thêm giờ nghỉ</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Block 5: Ngày áp dụng trong tuần */}
              <div>
                <label className="font-bold text-gray-700 block mb-1.5">
                  Ngày áp dụng trong tuần <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 flex-wrap items-center">
                  {WEEKDAYS.map(w => {
                    const isChecked = operatingDays.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          const next = isChecked
                            ? operatingDays.filter(x => x !== w.id)
                            : [...operatingDays, w.id];
                          setOperatingDays(next);
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition ${
                          isChecked
                            ? 'bg-[#00A859] text-white border-[#00A859]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                  <div className="h-4 w-px bg-gray-200 mx-1" />
                  <button
                    type="button"
                    onClick={() => setOperatingDays(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])}
                    className="text-[11px] text-[#00A859] font-bold hover:underline"
                  >
                    Chọn tất cả
                  </button>
                </div>
              </div>

              {/* Block 6: Trạng thái (khi sửa) */}
              {editingId && (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Trạng thái cấu hình</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('active')}
                      className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                        status === 'active' ? 'bg-[#00A859] text-white border-[#00A859]' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      Hoạt động
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('inactive')}
                      className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                        status === 'inactive' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      Đã hủy (Không dùng tạo ca mới)
                    </button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-semibold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t bg-gray-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                className="px-5 py-2 rounded-lg bg-[#00A859] text-white font-black uppercase tracking-wider hover:bg-[#008f4c] transition text-xs shadow-sm flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>{editingId ? 'Cập nhật cấu hình' : 'Tạo cấu hình mới'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

        {/* ── CARD 2: BẢNG CẤU HÌNH CA LÀM (ShiftConfigTable - CHUẨN UI-22) ─────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header & Controls */}
          <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[#00A859]" />
              <h2 className="text-sm font-black text-gray-900">
                Danh sách cấu hình ca làm việc ({filteredShifts.length} ca)
              </h2>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search box */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm mã hoặc tên ca..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:border-[#00A859] outline-none w-48 transition bg-white"
                />
              </div>

              {/* Filter Type */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                {(['ALL', 'DAY', 'NIGHT', 'ACTIVE', 'INACTIVE'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-2.5 py-1 rounded-md transition ${
                      filterType === f ? 'bg-white text-gray-800 shadow-xs font-bold' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {f === 'ALL' ? 'Tất cả' :
                     f === 'DAY' ? 'Ca ngày' :
                     f === 'NIGHT' ? 'Ca đêm' :
                     f === 'ACTIVE' ? 'Hoạt động' : 'Đã hủy'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Render (UI-22 Standard) */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[950px]">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px]">
                  <th className="p-3 w-24">Mã ca</th>
                  <th className="p-3 min-w-[150px]">Tên ca</th>
                  <th className="p-3 min-w-[140px]">Khung giờ</th>
                  <th className="p-3 w-28">Giờ nghỉ</th>
                  <th className="p-3 w-28">Giờ làm thực</th>
                  <th className="p-3 w-32 text-center">Tối thiểu – tối đa</th>
                  <th className="p-3 min-w-[130px]">Đối tượng</th>
                  <th className="p-3 min-w-[100px]">Ngày áp dụng</th>
                  <th className="p-3 w-28 text-center">Đang áp dụng</th>
                  <th className="p-3 w-28 text-center">Trạng thái</th>
                  <th className="p-3 w-28 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredShifts.map(shift => {
                  const isNight = shift.isNightShift ?? isNightShiftTime(shift.timeStart, shift.timeEnd);
                  const isActive = shift.status === 'active';

                  return (
                    <tr
                      key={shift.id}
                      className={`hover:bg-gray-50/70 transition-colors ${!isActive ? 'bg-gray-50/40 text-gray-400' : ''}`}
                    >
                      {/* Mã ca */}
                      <td className="p-3">
                        <span className={`inline-block font-mono font-black text-xs px-2 py-0.5 rounded ${
                          isNight ? 'bg-violet-100 text-violet-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {shift.shiftKey}
                        </span>
                      </td>

                      {/* Tên ca */}
                      <td className="p-3 font-bold text-gray-900">
                        {shift.name}
                        {shift.description && (
                          <div className="text-[10px] text-gray-400 font-normal">{shift.description}</div>
                        )}
                      </td>

                      {/* Khung giờ */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800 font-mono">
                            {shift.timeStart} – {shift.timeEnd}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {isNight ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.2 rounded">
                              <Moon size={9} /> Ca đêm
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                              <Sun size={9} /> Ca ngày
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Giờ nghỉ */}
                      <td className="p-3 text-gray-600 font-mono">
                        {shift.breakStart && shift.breakEnd ? (
                          <span>{shift.breakStart} – {shift.breakEnd}</span>
                        ) : (
                          <span className="text-gray-400 font-sans">—</span>
                        )}
                      </td>

                      {/* Giờ làm thực */}
                      <td className="p-3 font-semibold text-gray-800">
                        {(() => {
                          const isNight = isNightShiftTime(shift.timeStart, shift.timeEnd);
                          let totalMins = isNight
                            ? (24 * 60 - toMin(shift.timeStart)) + toMin(shift.timeEnd)
                            : toMin(shift.timeEnd) - toMin(shift.timeStart);
                          if (shift.breakStart && shift.breakEnd) {
                            let bMin = toMin(shift.breakEnd) - toMin(shift.breakStart);
                            if (bMin < 0) bMin += 24 * 60;
                            totalMins -= bMin;
                          }
                          const h = (Math.max(0, totalMins) / 60).toFixed(1).replace('.0', '');
                          return `${h} giờ`;
                        })()}
                      </td>

                      {/* Tối thiểu – tối đa */}
                      <td className="p-3 text-center">
                        <span className="font-bold text-gray-800">
                          {shift.minStaff ?? 1} – {shift.maxStaff || '∞'}
                        </span>
                        <span className="text-[10px] text-gray-400 block">người</span>
                      </td>

                      {/* Đối tượng áp dụng */}
                      <td className="p-3 text-gray-600">
                        <span className="inline-block bg-gray-100 rounded px-1.5 py-0.5 text-[10px] font-medium text-gray-700">
                          {appliedTargets.length} trạm
                        </span>
                      </td>

                      {/* Ngày áp dụng */}
                      <td className="p-3 text-gray-600">
                        <span className="text-[11px] font-medium">T2 – CN</span>
                      </td>

                      {/* Đang áp dụng */}
                      <td className="p-3 text-center font-bold text-gray-700">
                        {isActive ? '3 nhân viên' : '0 nhân viên'}
                      </td>

                      {/* Trạng thái (Hoạt động / Đã hủy) */}
                      <td className="p-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {isActive ? 'Hoạt động' : 'Đã hủy'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Nhân bản (item 9, UI-23) */}
                          <button
                            disabled={!isAdmin}
                            onClick={() => handleDuplicate(shift)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition disabled:opacity-30"
                            title="Nhân bản ca này"
                          >
                            <Copy size={13} />
                          </button>

                          {/* Sửa */}
                          <button
                            disabled={!isAdmin}
                            onClick={() => handleOpenEdit(shift)}
                            className="p-1 hover:bg-emerald-50 rounded text-gray-500 hover:text-[#00A859] transition disabled:opacity-30"
                            title="Chỉnh sửa cấu hình"
                          >
                            <Pencil size={13} />
                          </button>

                          {/* Vô hiệu hóa (item 10, DLG-03) / Bật lại */}
                          {isActive ? (
                            <button
                              disabled={!isAdmin}
                              onClick={() => setDeleteConfirmId(shift.id)}
                              className="p-1 hover:bg-rose-50 rounded text-gray-500 hover:text-rose-600 transition disabled:opacity-30"
                              title="Vô hiệu hóa ca"
                            >
                              <Trash2 size={13} />
                            </button>
                          ) : (
                            <button
                              disabled={!isAdmin}
                              onClick={() => handleReactivate(shift.id)}
                              className="p-1 hover:bg-emerald-50 rounded text-gray-500 hover:text-[#00A859] transition disabled:opacity-30"
                              title="Bật lại ca"
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-gray-400 text-xs">
                      Không tìm thấy ca làm việc nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* ── MODAL DLG-03: VÔ HIỆU HÓA CA LÀM VIỆC (item 10: hiện N, nút trái Đóng) ── */}
      {deleteConfirmId && shiftToDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Vô hiệu hóa ca "{shiftToDisable.name}"?
                </h3>
                <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                  Bạn có chắc muốn vô hiệu hóa "<strong>{shiftToDisable.name}</strong>"? Hiện đang có <strong>3</strong> nhân viên áp dụng ca làm này. Cấu hình này sẽ không được dùng để tạo ca mới.
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Các lịch tương lai của ca sẽ chuyển trạng thái <strong>Đang chờ (Chờ xếp lại)</strong> và tài xế được thông báo.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                Đóng
              </button>
              <button
                onClick={() => handleDisableShift(deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-700 shadow-sm"
              >
                Vô hiệu hóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Persona Switcher */}
      <PartnerScopeBar persona={persona} onChange={setPersona} />
    </div>
  );
};

export default ShiftDefinitionManagement;
