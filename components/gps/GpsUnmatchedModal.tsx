import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Radio,
  Search,
  Slash,
  Undo2,
} from 'lucide-react';
import {
  PartnerModal,
  partnerBtnBrand,
  partnerBtnNeutral,
  partnerInputClass as inputClass,
  partnerLabelClass as labelClass,
} from '../PartnerModal';
import {
  UNMATCHED_REASON_LABELS,
  type UnmatchedDeviceRecord,
  type UnmatchedReasonCode,
} from '../../data/gpsTrackingMockData';

interface GpsUnmatchedModalProps {
  open: boolean;
  onClose: () => void;
  devices: UnmatchedDeviceRecord[];
  onAssignToVehicle: (device: UnmatchedDeviceRecord, suggestedVehicleId?: string) => void;
  onIgnoreDevice: (deviceId: string, reason: string) => void;
  onUnignoreDevice: (deviceId: string) => void;
}

export const GpsUnmatchedModal: React.FC<GpsUnmatchedModalProps> = ({
  open,
  onClose,
  devices,
  onAssignToVehicle,
  onIgnoreDevice,
  onUnignoreDevice,
}) => {
  const [filterImei, setFilterImei] = useState('');
  const [filterPlate, setFilterPlate] = useState('');
  const [filterReason, setFilterReason] = useState<string>('ALL');
  const [filterState, setFilterState] = useState<'OPEN' | 'IGNORED' | 'RESOLVED' | 'ALL'>('OPEN');

  // State cho DLG-05 (Bỏ qua thiết bị)
  const [ignoringDevice, setIgnoringDevice] = useState<UnmatchedDeviceRecord | null>(null);
  const [ignoreReasonType, setIgnoreReasonType] = useState('Thiết bị không thuộc xe cứu hộ');
  const [ignoreNote, setIgnoreNote] = useState('');

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (filterState !== 'ALL' && d.state !== filterState) return false;
      if (filterReason !== 'ALL' && d.reason !== filterReason) return false;
      if (filterImei.trim() && !d.imei.toLowerCase().includes(filterImei.trim().toLowerCase())) return false;
      if (filterPlate.trim() && !d.midPlate.toLowerCase().includes(filterPlate.trim().toLowerCase())) return false;
      return true;
    });
  }, [devices, filterState, filterReason, filterImei, filterPlate]);

  const handleOpenIgnore = (d: UnmatchedDeviceRecord) => {
    setIgnoringDevice(d);
    setIgnoreReasonType('Thiết bị không thuộc xe cứu hộ');
    setIgnoreNote('');
  };

  const handleConfirmIgnore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ignoringDevice) return;
    const finalReason = ignoreReasonType === 'Khác' ? ignoreNote.trim() : `${ignoreReasonType}${ignoreNote ? ` — ${ignoreNote}` : ''}`;
    if (!finalReason) return;
    onIgnoreDevice(ignoringDevice.id, finalReason);
    setIgnoringDevice(null);
  };

  if (!open) return null;

  return (
    <>
      <PartnerModal
        open={open && !ignoringDevice}
        onClose={onClose}
        xl
        title="Thiết bị Xanh GPS chưa khớp (SCR-02)"
        icon={<Radio size={20} className="text-vetc-green" />}
        footer={
          <button type="button" onClick={onClose} className={partnerBtnNeutral}>
            Đóng
          </button>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Bộ lọc tra cứu (UI-40 đến UI-44) */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">IMEI (UI-40)</label>
                <input
                  type="text"
                  value={filterImei}
                  onChange={(e) => setFilterImei(e.target.value)}
                  placeholder="Nhập IMEI..."
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-xs outline-none focus:border-vetc-green"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Biển Xanh GPS (UI-41)</label>
                <input
                  type="text"
                  value={filterPlate}
                  onChange={(e) => setFilterPlate(e.target.value)}
                  placeholder="29C-555.01..."
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-xs outline-none focus:border-vetc-green"
                />
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Lý do chưa khớp (UI-42)</label>
                <select
                  value={filterReason}
                  onChange={(e) => setFilterReason(e.target.value)}
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-xs outline-none focus:border-vetc-green"
                >
                  <option value="ALL">Tất cả lý do</option>
                  {(Object.keys(UNMATCHED_REASON_LABELS) as UnmatchedReasonCode[]).map((k) => (
                    <option key={k} value={k}>
                      {UNMATCHED_REASON_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Trạng thái (UI-43)</label>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value as typeof filterState)}
                  className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-xs outline-none focus:border-vetc-green"
                >
                  <option value="OPEN">Chưa xử lý (OPEN)</option>
                  <option value="IGNORED">Đã bỏ qua (IGNORED)</option>
                  <option value="RESOLVED">Đã gắn (RESOLVED)</option>
                  <option value="ALL">Tất cả trạng thái</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bảng kết quả (UI-45) */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100/80 text-gray-600 font-bold border-b">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">STT</th>
                  <th className="px-3 py-2.5">IMEI</th>
                  <th className="px-3 py-2.5">Biển Xanh GPS</th>
                  <th className="px-3 py-2.5">Lý do</th>
                  <th className="px-3 py-2.5">Xe gợi ý (UI-45.1)</th>
                  <th className="px-3 py-2.5">Lần thấy cuối</th>
                  <th className="px-3 py-2.5">Tín hiệu</th>
                  <th className="px-3 py-2.5 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d, index) => {
                  const isIgnored = d.state === 'IGNORED';
                  const isResolved = d.state === 'RESOLVED';

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-3 py-3 text-center text-gray-500">{index + 1}</td>
                      <td className="px-3 py-3 font-mono font-bold text-gray-800">{d.imei}</td>
                      <td className="px-3 py-3 font-bold text-gray-700">
                        {d.midPlate || <span className="text-gray-400 font-normal">(trống)</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {d.reasonLabel}
                        </span>
                        {isIgnored && d.ignoreReason && (
                          <div className="text-[10px] text-gray-400 mt-1 italic">
                            Lý do bỏ qua: {d.ignoreReason}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {d.suggestions.length > 0 ? (
                          <div className="space-y-1">
                            {d.suggestions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => onAssignToVehicle(d, s.id)}
                                className="block font-semibold text-vetc-green hover:underline text-left text-[11px]"
                                title="Click để gắn ngay vào xe này"
                              >
                                {s.plate} ({s.stationName})
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-600 font-mono text-[11px]">{d.lastSeenAt}</td>
                      <td className="px-3 py-3 text-gray-700">
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {d.signalReason}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Đã gắn
                          </span>
                        ) : isIgnored ? (
                          <button
                            type="button"
                            onClick={() => onUnignoreDevice(d.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 text-[11px] font-bold transition-colors"
                          >
                            <Undo2 size={12} /> Bỏ bỏ qua
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onAssignToVehicle(d, d.suggestions[0]?.id)}
                              className="px-2.5 py-1 rounded bg-vetc-green text-white hover:bg-green-700 text-[11px] font-bold shadow-sm transition-all"
                            >
                              Gắn
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenIgnore(d)}
                              className="px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 text-[11px] font-bold transition-all"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                      Không có thiết bị chưa khớp phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PartnerModal>

      {/* DLG-05: Bỏ qua thiết bị */}
      {ignoringDevice && (
        <PartnerModal
          open={!!ignoringDevice}
          onClose={() => setIgnoringDevice(null)}
          title={`Bỏ qua thiết bị GPS · IMEI ${ignoringDevice.imei}`}
          icon={<Slash size={20} className="text-gray-600" />}
          footer={
            <>
              <button
                type="button"
                onClick={() => setIgnoringDevice(null)}
                className={partnerBtnNeutral}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmIgnore}
                disabled={ignoreReasonType === 'Khác' && ignoreNote.trim().length < 5}
                className={partnerBtnBrand}
              >
                Xác nhận Bỏ qua
              </button>
            </>
          }
        >
          <form onSubmit={handleConfirmIgnore} className="space-y-4 pt-1">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-700">
              Thiết bị bị bỏ qua sẽ không tham gia vào luồng tự động khớp (Auto Match) của hệ thống. Admin có thể "Bỏ bỏ qua" bất kỳ lúc nào.
            </div>

            <div>
              <label className={labelClass}>
                Lý do bỏ qua <span className="text-red-500">*</span>
              </label>
              <select
                value={ignoreReasonType}
                onChange={(e) => setIgnoreReasonType(e.target.value)}
                className={inputClass}
              >
                <option value="Thiết bị không thuộc xe cứu hộ">Thiết bị không thuộc xe cứu hộ</option>
                <option value="Thiết bị đã thu hồi">Thiết bị đã thu hồi</option>
                <option value="Khác">Khác (nhập chi tiết)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Ghi chú bổ sung {ignoreReasonType === 'Khác' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={ignoreNote}
                onChange={(e) => setIgnoreNote(e.target.value)}
                placeholder="Nhập ghi chú hoặc lý do chi tiết..."
                rows={3}
                className="w-full rounded-xl border border-[#e3e4e6] bg-[#f5f6f7] p-3 text-sm text-[#091b37] outline-none placeholder:text-[#8f9098] focus:border-[#25a55e] focus:bg-white"
              />
            </div>
          </form>
        </PartnerModal>
      )}
    </>
  );
};
