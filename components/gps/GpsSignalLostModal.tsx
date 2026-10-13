import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  History,
  Radio,
  Search,
  WifiOff,
} from 'lucide-react';
import {
  PartnerModal,
  partnerBtnNeutral,
} from '../PartnerModal';
import { STATION_OPTIONS } from '../../data/partnerRescueMockData';
import type { VehicleGpsStatus } from '../../data/gpsTrackingMockData';

interface GpsSignalLostModalProps {
  open: boolean;
  onClose: () => void;
  signalLostVehicles: VehicleGpsStatus[];
  onOpenHistory?: (v: VehicleGpsStatus) => void;
}

export const GpsSignalLostModal: React.FC<GpsSignalLostModalProps> = ({
  open,
  onClose,
  signalLostVehicles,
  onOpenHistory,
}) => {
  const [stationId, setStationId] = useState('');
  const [plateQuery, setPlateQuery] = useState('');

  const filtered = useMemo(() => {
    let list = signalLostVehicles.filter((v) => v.signal.signalLost);

    if (stationId) {
      list = list.filter((v) => v.stationId === stationId);
    }
    if (plateQuery.trim()) {
      list = list.filter((v) =>
        v.plate.toLowerCase().includes(plateQuery.trim().toLowerCase())
      );
    }

    // Sắp xếp mất lâu nhất lên đầu (BR-16)
    return [...list].sort((a, b) => (b.signal.lostSeconds ?? 0) - (a.signal.lostSeconds ?? 0));
  }, [signalLostVehicles, stationId, plateQuery]);

  if (!open) return null;

  return (
    <PartnerModal
      open={open}
      onClose={onClose}
      xl
      title="Danh sách xe mất tín hiệu GPS (quá 15 phút trong ca) · SCR-03"
      icon={<WifiOff size={20} className="text-red-600" />}
      footer={
        <button type="button" onClick={onClose} className={partnerBtnNeutral}>
          Đóng
        </button>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Banner cảnh báo quy chuẩn BR-16 */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-red-800">Quy chuẩn giám sát mất tín hiệu (BR-16):</span>
            <p className="mt-1 text-red-700 leading-relaxed">
              Bao gồm các phương tiện cứu hộ đang trong ca trực hoạt động (có đơn hàng chưa kết thúc hoặc trong khung giờ trực của trạm) nhưng không nhận được tín hiệu định vị GPS quá <strong>15 phút</strong>.
            </p>
          </div>
        </div>

        {/* Bộ lọc (UI-60, 61, 62, 63) */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Trạm cứu hộ (UI-61)</label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-xs outline-none focus:border-vetc-green"
              >
                <option value="">Tất cả các trạm</option>
                {STATION_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-600 font-semibold mb-1">Biển số xe (UI-62)</label>
              <input
                type="text"
                value={plateQuery}
                onChange={(e) => setPlateQuery(e.target.value)}
                placeholder="29C-123.45..."
                className="w-full border rounded-lg px-2.5 py-1.5 bg-white text-xs outline-none focus:border-vetc-green"
              />
            </div>
            <div className="flex items-end">
              <span className="text-[11px] text-gray-500 pb-1.5">
                Hiển thị: <strong>{filtered.length} xe mất tín hiệu</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Bảng danh sách xe mất tín hiệu (UI-64) */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100/80 text-gray-600 font-bold border-b">
              <tr>
                <th className="px-3 py-2.5 text-center w-10">STT</th>
                <th className="px-3 py-2.5">Xe (Biển số)</th>
                <th className="px-3 py-2.5">Trạm</th>
                <th className="px-3 py-2.5">IMEI</th>
                <th className="px-3 py-2.5">Lần thấy cuối</th>
                <th className="px-3 py-2.5 text-red-600 font-bold">Mất trong (UI-64.1)</th>
                <th className="px-3 py-2.5">Lý do</th>
                <th className="px-3 py-2.5">Căn cứ trong ca (UI-64.2)</th>
                <th className="px-3 py-2.5 text-center w-20">Lịch sử</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v, index) => (
                <tr key={v.vehicleId} className="hover:bg-red-50/40 transition-colors">
                  <td className="px-3 py-3 text-center text-gray-500">{index + 1}</td>
                  <td className="px-3 py-3 font-bold text-gray-800">
                    <div>{v.plate}</div>
                    <div className="text-[10px] text-gray-400 font-mono">Mã xe: {v.vehicleId}</div>
                  </td>
                  <td className="px-3 py-3 text-gray-700 font-medium">{v.stationName}</td>
                  <td className="px-3 py-3 font-mono font-bold text-gray-700">
                    {v.imei || <span className="text-gray-400 font-normal">—</span>}
                  </td>
                  <td className="px-3 py-3 font-mono text-gray-600 text-[11px]">{v.signal.lastSeenAt}</td>
                  <td className="px-3 py-3 font-bold text-red-600 text-xs">
                    {v.signal.lostDuration ?? 'Quá 15 phút'}
                  </td>
                  <td className="px-3 py-3 text-red-700 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {v.signal.reason}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-gray-100 font-medium text-gray-700">
                      {v.signal.inShiftBasis ?? 'Trực ca tiêu chuẩn'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {onOpenHistory && (
                      <button
                        type="button"
                        onClick={() => onOpenHistory(v)}
                        className="p-1 rounded text-gray-600 hover:text-vetc-green hover:bg-green-50 transition-colors"
                        title="Xem lịch sử GPS"
                      >
                        <History size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                    Không có phương tiện nào mất tín hiệu trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PartnerModal>
  );
};
