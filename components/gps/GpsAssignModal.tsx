import React, { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, Radio, ShieldAlert } from 'lucide-react';
import {
  PartnerModal,
  partnerBtnBrand,
  partnerBtnNeutral,
  partnerInputClass as inputClass,
  partnerLabelClass as labelClass,
} from '../PartnerModal';
import type { UnmatchedDeviceRecord, VehicleGpsStatus } from '../../data/gpsTrackingMockData';

interface GpsAssignModalProps {
  open: boolean;
  onClose: () => void;
  vehicleStatus: VehicleGpsStatus | null;
  unmatchedDevices: UnmatchedDeviceRecord[];
  initialImei?: string;
  unmatchedId?: string;
  onConfirm: (data: {
    vehicleId: string;
    imei: string;
    validFrom: string;
    reason: string;
    mode: 'ASSIGN' | 'REPLACE';
    unmatchedId?: string;
    acceptUnknownImei: boolean;
  }) => void;
}

export const GpsAssignModal: React.FC<GpsAssignModalProps> = ({
  open,
  onClose,
  vehicleStatus,
  unmatchedDevices,
  initialImei = '',
  unmatchedId,
  onConfirm,
}) => {
  const isReplace = !!vehicleStatus?.imei;

  const nowString = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const [imei, setImei] = useState(initialImei);
  const [validFrom, setValidFrom] = useState(nowString);
  const [reason, setReason] = useState('');
  const [acceptUnknown, setAcceptUnknown] = useState(false);
  const [selectedUnmatched, setSelectedUnmatched] = useState<UnmatchedDeviceRecord | null>(() => {
    if (initialImei) {
      return unmatchedDevices.find((u) => u.imei === initialImei) ?? null;
    }
    return null;
  });

  // Reset form when modal opens or initial values change
  React.useEffect(() => {
    if (open) {
      setImei(initialImei);
      setValidFrom(nowString);
      setReason('');
      setAcceptUnknown(false);
      const hit = unmatchedDevices.find((u) => u.imei === initialImei);
      setSelectedUnmatched(hit ?? null);
    }
  }, [open, initialImei, nowString, unmatchedDevices]);

  // Kiểm tra thời gian hồi tố (BR-12)
  const isBackdated = useMemo(() => {
    if (!validFrom) return false;
    const selected = new Date(validFrom).getTime();
    const threshold = Date.now() - 5 * 60 * 1000;
    return selected < threshold;
  }, [validFrom]);

  // Kiểm tra tính hợp lệ
  const isValid = imei.trim().length >= 8 && reason.trim().length >= 5;

  const handleSelectUnmatched = (device: UnmatchedDeviceRecord) => {
    setSelectedUnmatched(device);
    setImei(device.imei);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleStatus || !isValid) return;

    onConfirm({
      vehicleId: vehicleStatus.vehicleId,
      imei: imei.trim(),
      validFrom,
      reason: reason.trim(),
      mode: isReplace ? 'REPLACE' : 'ASSIGN',
      unmatchedId: selectedUnmatched?.id ?? unmatchedId,
      acceptUnknownImei: acceptUnknown,
    });
    onClose();
  };

  if (!open || !vehicleStatus) return null;

  return (
    <PartnerModal
      open={open}
      onClose={onClose}
      wide
      title={`${isReplace ? 'Đổi thiết bị' : 'Gắn thiết bị'} Xanh GPS · Xe ${vehicleStatus.plate}`}
      icon={<Radio size={20} className="text-vetc-green" />}
      footer={
        <>
          <button type="button" onClick={onClose} className={partnerBtnNeutral}>
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className={partnerBtnBrand}
          >
            {isReplace ? 'Xác nhận Đổi thiết bị' : 'Xác nhận Gắn thiết bị'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* UI-19: Thiết bị hiện tại (khi mode Đổi) */}
        {isReplace && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
            <span className="block font-bold text-blue-800 text-[11px] uppercase tracking-wider mb-1">
              Thiết bị GPS hiện tại
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-gray-800">{vehicleStatus.imei}</span>
              <span className="text-gray-600">
                Gắn từ: <strong>{vehicleStatus.validFrom ?? 'Trước đây'}</strong>
              </span>
            </div>
            <p className="mt-1 text-[11px] text-blue-700">
              Khi đổi thiết bị mới, thiết bị cũ sẽ tự động đóng hiệu lực tại thời điểm hiệu lực mới.
            </p>
          </div>
        )}

        {/* UI-20: Chọn hoặc nhập IMEI */}
        <div>
          <label className={labelClass}>
            IMEI thiết bị GPS <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={imei}
              onChange={(e) => {
                setImei(e.target.value);
                const hit = unmatchedDevices.find((u) => u.imei === e.target.value.trim());
                setSelectedUnmatched(hit ?? null);
              }}
              placeholder="Nhập số IMEI (ví dụ: 861200055501)..."
              className={inputClass}
              autoFocus
            />

            {/* Gợi ý từ danh sách thiết bị chưa khớp */}
            {unmatchedDevices.filter((u) => u.state === 'OPEN').length > 0 && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2 text-xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                  Gợi ý thiết bị chưa khớp (click để chọn):
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {unmatchedDevices
                    .filter((u) => u.state === 'OPEN')
                    .map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelectUnmatched(d)}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors ${
                          imei === d.imei
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold'
                            : 'hover:bg-white text-gray-700'
                        }`}
                      >
                        <span className="font-mono">{d.imei}</span>
                        <span className="text-[11px] text-gray-500">
                          {d.midPlate ? `Biển Xanh: ${d.midPlate}` : d.reasonLabel} · {d.signalReason}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Chi tiết thiết bị được chọn */}
            {selectedUnmatched && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 flex items-start gap-2">
                <Radio size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-800">
                    Biển Xanh GPS: {selectedUnmatched.midPlate || '(Chưa có biển)'} · Lần thấy:{' '}
                    {selectedUnmatched.lastSeenAt}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Trạng thái tín hiệu: {selectedUnmatched.signalReason} · Lý do chưa khớp:{' '}
                    {selectedUnmatched.reasonLabel}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* UI-21: Hiệu lực từ */}
        <div>
          <label className={labelClass}>
            Hiệu lực từ <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className={inputClass}
          />
          {isBackdated && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle size={14} className="shrink-0 text-amber-600" />
              <span>
                Thời điểm hiệu lực trong quá khứ: Hệ thống sẽ áp dụng cơ chế <strong>Hiệu chỉnh hồi tố (BR-12)</strong>.
              </span>
            </div>
          )}
        </div>

        {/* UI-22: Lý do bắt buộc */}
        <div>
          <label className={labelClass}>
            Lý do gắn/đổi thiết bị <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do thực hiện (từ 5 đến 255 ký tự)..."
            rows={3}
            className="w-full rounded-xl border border-[#e3e4e6] bg-[#f5f6f7] p-3 text-sm text-[#091b37] outline-none placeholder:text-[#8f9098] focus:border-[#25a55e] focus:bg-white"
          />
          <span className="text-[11px] text-gray-500 block text-right">
            {reason.trim().length}/255 ký tự (tối thiểu 5 ký tự)
          </span>
        </div>

        {/* UI-23: Checkbox Vẫn gắn */}
        <label className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50/60 p-3 cursor-pointer text-xs text-gray-700 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={acceptUnknown}
            onChange={(e) => setAcceptUnknown(e.target.checked)}
            className="mt-0.5 rounded text-vetc-green focus:ring-vetc-green"
          />
          <div>
            <span className="font-semibold text-gray-800">
              Vẫn gắn dù Xanh GPS chưa trả tín hiệu từ IMEI này
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Áp dụng cho thiết bị phần cứng mới lắp đặt trên xe cứu hộ và đang chờ kỹ thuật viên kích hoạt.
            </p>
          </div>
        </label>
      </form>
    </PartnerModal>
  );
};
