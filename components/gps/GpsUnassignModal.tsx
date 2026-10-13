import React, { useMemo, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  PartnerModal,
  partnerBtnDanger,
  partnerBtnNeutral,
  partnerInputClass as inputClass,
  partnerLabelClass as labelClass,
} from '../PartnerModal';
import type { VehicleGpsStatus } from '../../data/gpsTrackingMockData';

interface GpsUnassignModalProps {
  open: boolean;
  onClose: () => void;
  vehicleStatus: VehicleGpsStatus | null;
  onConfirm: (data: { vehicleId: string; validTo: string; reason: string }) => void;
}

export const GpsUnassignModal: React.FC<GpsUnassignModalProps> = ({
  open,
  onClose,
  vehicleStatus,
  onConfirm,
}) => {
  const nowString = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const [validTo, setValidTo] = useState(nowString);
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (open) {
      setValidTo(nowString);
      setReason('');
    }
  }, [open, nowString]);

  const isValid = reason.trim().length >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleStatus || !isValid) return;

    onConfirm({
      vehicleId: vehicleStatus.vehicleId,
      validTo,
      reason: reason.trim(),
    });
    onClose();
  };

  if (!open || !vehicleStatus) return null;

  return (
    <PartnerModal
      open={open}
      onClose={onClose}
      title={`Gỡ thiết bị GPS · Xe ${vehicleStatus.plate}`}
      icon={<Trash2 size={20} className="text-red-600" />}
      footer={
        <>
          <button type="button" onClick={onClose} className={partnerBtnNeutral}>
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className={partnerBtnDanger}
          >
            Xác nhận Gỡ thiết bị
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Cảnh báo gỡ thiết bị */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-800">
              Gỡ IMEI <span className="font-mono">{vehicleStatus.imei}</span> khỏi xe {vehicleStatus.plate}?
            </div>
            <p className="mt-1 text-red-700">
              Sau khi gỡ, xe sẽ <strong>không còn nhận dữ liệu vị trí và tốc độ</strong> từ hệ thống Xanh GPS cho tới khi được gắn thiết bị mới.
            </p>
          </div>
        </div>

        {/* UI-25: Hiệu lực đến */}
        <div>
          <label className={labelClass}>
            Thời điểm có hiệu lực gỡ <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* UI-26: Lý do gỡ */}
        <div>
          <label className={labelClass}>
            Lý do gỡ thiết bị <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do gỡ thiết bị (ví dụ: Thiết bị hỏng, Xe bảo dưỡng, Thu hồi hộp GPS)..."
            rows={3}
            className="w-full rounded-xl border border-[#e3e4e6] bg-[#f5f6f7] p-3 text-sm text-[#091b37] outline-none placeholder:text-[#8f9098] focus:border-[#da2c39] focus:bg-white"
          />
          <span className="text-[11px] text-gray-500 block text-right">
            {reason.trim().length}/255 ký tự (tối thiểu 5 ký tự)
          </span>
        </div>
      </form>
    </PartnerModal>
  );
};
