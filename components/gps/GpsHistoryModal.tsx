import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  History,
  ShieldAlert,
} from 'lucide-react';
import {
  PartnerModal,
  partnerBtnBrand,
  partnerBtnNeutral,
  partnerInputClass as inputClass,
  partnerLabelClass as labelClass,
} from '../PartnerModal';
import type {
  GpsMappingAudit,
  GpsMappingPeriod,
  VehicleGpsStatus,
} from '../../data/gpsTrackingMockData';

interface GpsHistoryModalProps {
  open: boolean;
  onClose: () => void;
  vehicleStatus: VehicleGpsStatus | null;
  historyPeriods: GpsMappingPeriod[];
  auditLogs: GpsMappingAudit[];
  canCorrect?: boolean;
  onCorrectMapping?: (data: {
    periodId: string;
    imei: string;
    validFrom: string;
    validTo: string | null;
    reason: string;
  }) => void;
}

export const GpsHistoryModal: React.FC<GpsHistoryModalProps> = ({
  open,
  onClose,
  vehicleStatus,
  historyPeriods,
  auditLogs,
  canCorrect = true,
  onCorrectMapping,
}) => {
  const [showAudits, setShowAudits] = useState(false);
  const [correctingPeriod, setCorrectingPeriod] = useState<GpsMappingPeriod | null>(null);

  // Form state cho DLG-04 (Hiệu chỉnh hồi tố)
  const [correctImei, setCorrectImei] = useState('');
  const [correctFrom, setCorrectFrom] = useState('');
  const [correctTo, setCorrectTo] = useState('');
  const [correctReason, setCorrectReason] = useState('');

  const handleOpenCorrect = (p: GpsMappingPeriod) => {
    setCorrectingPeriod(p);
    setCorrectImei(p.imei);
    setCorrectFrom(p.validFrom);
    setCorrectTo(p.validTo ?? '');
    setCorrectReason('');
  };

  const handleSaveCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingPeriod || correctReason.trim().length < 5 || correctImei.trim().length < 8) return;

    if (onCorrectMapping) {
      onCorrectMapping({
        periodId: correctingPeriod.id,
        imei: correctImei.trim(),
        validFrom: correctFrom,
        validTo: correctTo ? correctTo : null,
        reason: correctReason.trim(),
      });
    }
    setCorrectingPeriod(null);
  };

  if (!open || !vehicleStatus) return null;

  return (
    <>
      <PartnerModal
        open={open && !correctingPeriod}
        onClose={onClose}
        xl
        title={`Lịch sử gắn thiết bị GPS · Xe ${vehicleStatus.plate}`}
        icon={<History size={20} className="text-vetc-green" />}
        footer={
          <button type="button" onClick={onClose} className={partnerBtnNeutral}>
            Đóng
          </button>
        }
      >
        <div className="space-y-6 pt-1">
          {/* Thông tin vắn tắt */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 text-xs">
            <div>
              <span className="text-gray-500 font-medium">Biển số:</span>{' '}
              <strong className="text-sm font-bold text-gray-800">{vehicleStatus.plate}</strong>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-gray-500 font-medium">Trạm:</span>{' '}
              <strong className="text-gray-700">{vehicleStatus.stationName}</strong>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Trạng thái hiện tại:</span>{' '}
              <span className="font-bold text-emerald-700">
                {vehicleStatus.imei ? `Đang gắn IMEI ${vehicleStatus.imei}` : 'Chưa gắn thiết bị'}
              </span>
            </div>
          </div>

          {/* UI-28: Bảng khoảng hiệu lực */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Các khoảng hiệu lực gắn GPS (Periods)
              </h4>
              <span className="text-[11px] text-gray-500">Mới nhất lên đầu</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100/80 text-gray-600 font-bold border-b">
                  <tr>
                    <th className="px-3 py-2.5">IMEI</th>
                    <th className="px-3 py-2.5">Từ</th>
                    <th className="px-3 py-2.5">Đến</th>
                    <th className="px-3 py-2.5">Nguồn</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái</th>
                    <th className="px-3 py-2.5">Người thực hiện</th>
                    <th className="px-3 py-2.5">Lý do</th>
                    {canCorrect && <th className="px-3 py-2.5 text-center w-16">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyPeriods.map((p) => {
                    const isSuperseded = p.status === 'SUPERSEDED';
                    const isCurrent = p.status === 'ACTIVE' && !p.validTo;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/80 transition-colors ${
                          isSuperseded ? 'bg-gray-50/50 text-gray-400 line-through' : ''
                        }`}
                      >
                        <td className="px-3 py-3 font-mono font-bold text-gray-800">
                          {p.imei}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-700">{p.validFrom}</td>
                        <td className="px-3 py-3">
                          {p.validTo ? (
                            <span className="font-medium text-gray-700">{p.validTo}</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                              Đang gắn
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-semibold text-gray-600">
                            {p.sourceLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isSuperseded ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-500">
                              Đã hiệu chỉnh
                            </span>
                          ) : isCurrent ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Hiệu lực
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                              Đã đóng
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-600">{p.createdByName}</td>
                        <td className="px-3 py-3 text-gray-600 max-w-[200px] truncate" title={p.reason}>
                          {p.reason}
                        </td>
                        {canCorrect && (
                          <td className="px-3 py-3 text-center">
                            {!isSuperseded && (
                              <button
                                type="button"
                                onClick={() => handleOpenCorrect(p)}
                                className="p-1 rounded text-orange-600 hover:bg-orange-50 transition-colors"
                                title="Hiệu chỉnh hồi tố (DLG-04)"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {historyPeriods.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                        Chưa có lịch sử gắn thiết bị cho xe này
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* UI-30: Nhật ký thao tác (Audit trail) collapse */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAudits(!showAudits)}
              className="w-full flex items-center justify-between p-3.5 bg-gray-50 text-xs font-bold text-gray-700 hover:bg-gray-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-gray-500" />
                <span>Nhật ký thao tác chi tiết (Audit Trail) ({auditLogs.length})</span>
              </div>
              {showAudits ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAudits && (
              <div className="overflow-x-auto p-3 bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b">
                    <tr>
                      <th className="px-2.5 py-2 font-semibold">Thời gian</th>
                      <th className="px-2.5 py-2 font-semibold">Người thực hiện</th>
                      <th className="px-2.5 py-2 font-semibold">Hành động</th>
                      <th className="px-2.5 py-2 font-semibold">Dữ liệu trước</th>
                      <th className="px-2.5 py-2 font-semibold">Dữ liệu sau</th>
                      <th className="px-2.5 py-2 font-semibold">Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/60">
                        <td className="px-2.5 py-2.5 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                          {a.actedAt}
                        </td>
                        <td className="px-2.5 py-2.5 font-medium text-gray-800">{a.actorName}</td>
                        <td className="px-2.5 py-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {a.actionLabel}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-500 font-mono text-[11px]">
                          {a.oldValue || '—'}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-800 font-mono text-[11px] font-semibold">
                          {a.newValue || '—'}
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600">{a.reason}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2.5 py-4 text-center text-gray-400">
                          Chưa có nhật ký ghi nhận
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PartnerModal>

      {/* DLG-04: Hiệu chỉnh hồi tố */}
      {correctingPeriod && (
        <PartnerModal
          open={!!correctingPeriod}
          onClose={() => setCorrectingPeriod(null)}
          title={`Hiệu chỉnh hồi tố · Xe ${vehicleStatus.plate}`}
          icon={<Edit2 size={20} className="text-amber-600" />}
          footer={
            <>
              <button
                type="button"
                onClick={() => setCorrectingPeriod(null)}
                className={partnerBtnNeutral}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={correctReason.trim().length < 5 || correctImei.trim().length < 8}
                className={partnerBtnBrand}
              >
                Lưu hiệu chỉnh
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveCorrection} className="space-y-4 pt-1">
            {/* Chú thích quan trọng theo BR-12 */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-800">Quy tắc hiệu chỉnh hồi tố (BR-12):</span>
                <p className="mt-1 text-amber-700 leading-relaxed">
                  Bản ghi cũ sẽ được giữ lại và chuyển sang trạng thái <strong>SUPERSEDED</strong> (không ghi đè).
                  Bản ghi mới sẽ được tạo với nguồn <strong>CORRECTION</strong>. Xe liên quan sẽ hiển thị trạng thái{' '}
                  <span className="font-bold text-amber-900">"Đang sửa"</span> cho đến khi nhận được dữ liệu hợp lệ đầu tiên từ thiết bị mới.
                </p>
              </div>
            </div>

            {/* UI-31: IMEI */}
            <div>
              <label className={labelClass}>
                IMEI thiết bị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={correctImei}
                onChange={(e) => setCorrectImei(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* UI-32 & UI-33: Khoảng thời gian hiệu lực */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Hiệu lực từ <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={correctFrom}
                  onChange={(e) => setCorrectFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Hiệu lực đến (để trống nếu đang gắn)</label>
                <input
                  type="datetime-local"
                  value={correctTo}
                  onChange={(e) => setCorrectTo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* UI-34: Lý do hiệu chỉnh */}
            <div>
              <label className={labelClass}>
                Lý do hiệu chỉnh <span className="text-red-500">*</span>
              </label>
              <textarea
                value={correctReason}
                onChange={(e) => setCorrectReason(e.target.value)}
                placeholder="Nhập lý do thực hiện hiệu chỉnh hồi tố (từ 5 đến 255 ký tự)..."
                rows={3}
                className="w-full rounded-xl border border-[#e3e4e6] bg-[#f5f6f7] p-3 text-sm text-[#091b37] outline-none placeholder:text-[#8f9098] focus:border-[#25a55e] focus:bg-white"
              />
              <span className="text-[11px] text-gray-500 block text-right">
                {correctReason.trim().length}/255 ký tự (tối thiểu 5 ký tự)
              </span>
            </div>
          </form>
        </PartnerModal>
      )}
    </>
  );
};
