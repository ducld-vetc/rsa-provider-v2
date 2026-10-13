import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Car,
  Check,
  FileText,
  Image as ImageIcon,
  MapPin,
  Package,
  Search,
  X,
} from 'lucide-react';
import {
  MOCK_VEHICLE_REGISTRY,
  normalizeVehicleQuery,
  VehicleRescuePackage,
  VehicleSearchResult,
} from './VehiclePlateSearchModal';

type Props = {
  isOpen: boolean;
  initialQuery?: string;
  /** plate | vin — nhãn ô tìm kiếm */
  searchMode?: 'plate' | 'vin' | 'auto';
  /**
   * true = màn Tạo đơn — bắt buộc chọn gói trước khi Lấy thông tin, rồi áp gói vào form.
   * false = Chi tiết/Sửa đơn — chỉ xem danh sách gói, không áp dụng gói.
   */
  applyPackage?: boolean;
  onClose: () => void;
  onApply: (vehicle: VehicleSearchResult, selectedPackage: VehicleRescuePackage | null) => void;
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-xs font-bold text-gray-800 mt-0.5 break-words">{value || '—'}</p>
  </div>
);

const packageStatusLabel = (status?: string) => {
  if (status === 'active') return { text: 'Đang hiệu lực', className: 'bg-green-50 text-green-700 border-green-200' };
  if (status === 'expired') return { text: 'Hết hạn', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { text: 'Không có gói', className: 'bg-red-50 text-red-600 border-red-200' };
};

const VehicleInfoLookupModal: React.FC<Props> = ({
  isOpen,
  initialQuery = '',
  searchMode = 'auto',
  applyPackage = false,
  onClose,
  onApply,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<VehicleSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const runSearch = (raw: string) => {
    const normalized = normalizeVehicleQuery(raw);
    if (!normalized) {
      setResults([]);
      setSelectedId(null);
      setSelectedPackageId(null);
      setSearched(true);
      return;
    }
    const matched = MOCK_VEHICLE_REGISTRY.filter((v) => {
      const plate = normalizeVehicleQuery(v.plate);
      const vin = normalizeVehicleQuery(v.vin);
      if (searchMode === 'vin') return vin.includes(normalized);
      if (searchMode === 'plate') return plate.includes(normalized);
      return plate.includes(normalized) || vin.includes(normalized);
    });
    setResults(matched);
    const first = matched[0] ?? null;
    setSelectedId(first?.id ?? null);
    // Chỉ auto-chọn khi đúng 1 gói; nhiều gói → bắt buộc user chọn
    const pkgs = first?.rescuePackages ?? [];
    setSelectedPackageId(pkgs.length === 1 ? pkgs[0].id : null);
    setSearched(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialQuery);
    setSearched(false);
    setResults([]);
    setSelectedId(null);
    setSelectedPackageId(null);
    setPreviewUrl(null);
    if (initialQuery.trim()) {
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialQuery, searchMode]);

  const selected = useMemo(
    () => results.find((v) => v.id === selectedId) ?? null,
    [results, selectedId]
  );

  const packages = selected?.rescuePackages ?? [];
  const selectedPackage = useMemo(
    () => packages.find((p) => p.id === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );

  const canApply = Boolean(selected) && (!applyPackage || Boolean(selectedPackageId));

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedId(vehicleId);
    const vehicle = results.find((v) => v.id === vehicleId);
    const pkgs = vehicle?.rescuePackages ?? [];
    setSelectedPackageId(pkgs.length === 1 ? pkgs[0].id : null);
  };

  const searchLabel =
    searchMode === 'vin' ? 'Số khung (VIN)' : searchMode === 'plate' ? 'Biển số xe' : 'BSX / Số khung';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-vetc-green" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                  Thông tin xe
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 border-b bg-white shrink-0">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                {searchLabel}
              </label>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch(query);
                  }}
                  placeholder={
                    searchMode === 'vin'
                      ? 'Nhập số khung để tra cứu...'
                      : 'Nhập BSX hoặc số khung...'
                  }
                  className="flex-1 border rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-vetc-green uppercase tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => runSearch(query)}
                  className="shrink-0 flex items-center gap-1.5 bg-vetc-green text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                >
                  <Search size={14} />
                  Tìm kiếm
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!searched ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  Nhập BSX hoặc số khung rồi bấm Tìm kiếm
                </div>
              ) : results.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Không tìm thấy xe với &quot;{query}&quot;
                </div>
              ) : (
                <>
                  {results.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {results.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVehicle(v.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                            selectedId === v.id
                              ? 'bg-green-50 border-vetc-green text-vetc-green'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {v.plate} · {v.model}
                        </button>
                      ))}
                    </div>
                  )}

                  {selected && (
                    <>
                      {/* Thông tin xe */}
                      <section className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                            Thông tin xe
                          </p>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <InfoRow label="BSX" value={selected.plate} />
                          <InfoRow label="Số khung" value={selected.vin} />
                          <InfoRow label="Hãng xe" value={selected.brand} />
                          <InfoRow label="Dòng" value={selected.model} />
                          <InfoRow label="Trọng tải" value={`${selected.loadTons} tấn`} />
                          <InfoRow label="Số chỗ" value={String(selected.seats)} />
                          <InfoRow label="Loại xe" value={selected.vehicleType} />
                        </div>
                      </section>

                      {/* Gói cứu hộ */}
                      <section className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Package size={12} className="text-vetc-green" />
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                              Gói cứu hộ của phương tiện
                              {packages.length > 0 && (
                                <span className="ml-1.5 normal-case tracking-normal text-gray-400 font-bold">
                                  ({packages.length})
                                </span>
                              )}
                            </p>
                          </div>
                          {!applyPackage && (
                            <span className="text-[9px] font-bold text-gray-400 italic">
                              Chỉ xem — không áp vào đơn đang sửa
                            </span>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          {packages.length === 0 ? (
                            <p className="px-1 py-2 text-xs text-gray-400 italic">Không có thông tin gói</p>
                          ) : (
                            packages.map((pkg) => {
                              const statusUi = packageStatusLabel(pkg.status);
                              const isSelectable =
                                applyPackage && (pkg.status === 'active' || pkg.status === 'none');
                              const isSelected = selectedPackageId === pkg.id;
                              const isExpired = pkg.status === 'expired';
                              return (
                                <button
                                  key={pkg.id}
                                  type="button"
                                  disabled={!applyPackage || isExpired}
                                  onClick={() => {
                                    if (isSelectable) setSelectedPackageId(pkg.id);
                                  }}
                                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                                    isSelected
                                      ? 'border-vetc-green bg-green-50/70 ring-2 ring-vetc-green/20'
                                      : isExpired
                                        ? 'border-gray-100 bg-gray-50 opacity-70'
                                        : 'border-gray-100 bg-white hover:border-gray-200'
                                  } ${applyPackage && isSelectable ? 'cursor-pointer' : ''} ${
                                    !applyPackage || isExpired ? 'cursor-default' : ''
                                  } ${applyPackage && isExpired ? 'cursor-not-allowed' : ''}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex items-start gap-2">
                                      {applyPackage && !isExpired && (
                                        <span
                                          className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                            isSelected
                                              ? 'border-vetc-green bg-vetc-green'
                                              : 'border-gray-300 bg-white'
                                          }`}
                                        >
                                          {isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                          )}
                                        </span>
                                      )}
                                      <div className="min-w-0">
                                        <p
                                          className={`text-sm font-black ${
                                            pkg.status === 'none' ? 'text-red-600' : 'text-gray-900'
                                          }`}
                                        >
                                          {pkg.name}
                                        </p>
                                        {pkg.status !== 'none' && pkg.validFrom && pkg.validTo && (
                                          <p className="text-[10px] text-gray-500 mt-0.5">
                                            Hiệu lực: {pkg.validFrom} → {pkg.validTo}
                                          </p>
                                        )}
                                        {pkg.status !== 'none' && (
                                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                                            {pkg.remainingServices != null &&
                                              pkg.totalServices != null && (
                                                <span className="text-[10px] font-bold text-gray-600">
                                                  Còn {pkg.remainingServices}/{pkg.totalServices} dịch vụ
                                                </span>
                                              )}
                                            {pkg.coverageKm != null && (
                                              <span className="text-[10px] font-bold text-gray-600">
                                                Phạm vi {pkg.coverageKm} KM
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span
                                      className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${statusUi.className}`}
                                    >
                                      {statusUi.text}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                          {applyPackage ? (
                            <p
                              className={`text-[10px] leading-relaxed ${
                                selectedPackageId
                                  ? 'text-vetc-green font-medium'
                                  : 'text-amber-700 font-medium'
                              }`}
                            >
                              {selectedPackageId
                                ? `Đã chọn: ${selectedPackage?.name}. Bấm «Lấy thông tin» để áp vào đơn.`
                                : packages.filter((p) => p.status !== 'expired').length > 1
                                  ? 'Vui lòng chọn 1 gói trước khi lấy thông tin.'
                                  : 'Vui lòng chọn gói (hoặc Không có) trước khi lấy thông tin.'}
                            </p>
                          ) : (
                            <p className="text-[10px] text-amber-700/80 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                              Gói cứu hộ chỉ được chọn/áp dụng khi <strong>Tạo đơn</strong>. Trên màn
                              chỉnh sửa chi tiết đơn chỉ xem thông tin gói gắn với xe.
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Lịch sử qua trạm */}
                      <section className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                          <MapPin size={12} className="text-vetc-green" />
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                            Lịch sử xe qua trạm gần nhất
                          </p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {(selected.stationPassHistory ?? []).length === 0 ? (
                            <p className="p-4 text-xs text-gray-400 italic">Chưa có lịch sử qua trạm</p>
                          ) : (
                            (selected.stationPassHistory ?? []).map((pass) => (
                              <div key={pass.id} className="px-4 py-3 flex items-start gap-3">
                                <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-vetc-green shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-gray-800">{pass.stationName}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    {pass.highway} · {pass.direction}
                                  </p>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 shrink-0 whitespace-nowrap">
                                  {pass.passedAt}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </section>

                      {/* Hình ảnh */}
                      <section className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                          <ImageIcon size={12} className="text-vetc-green" />
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                            Hình ảnh xe
                          </p>
                        </div>
                        <div className="p-3 flex flex-wrap gap-2">
                          {(selected.vehicleImages?.length
                            ? selected.vehicleImages
                            : [selected.imageUrl]
                          ).map((src) => (
                            <button
                              key={src}
                              type="button"
                              onClick={() => setPreviewUrl(src)}
                              className="w-24 h-20 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-vetc-green/40 transition-all"
                            >
                              <img src={src} alt="Xe" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-xl border border-gray-100 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                          <FileText size={12} className="text-blue-500" />
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                            Hình ảnh giấy tờ xe
                          </p>
                        </div>
                        <div className="p-3 flex flex-wrap gap-2">
                          {(selected.documentImages ?? []).length === 0 ? (
                            <p className="text-xs text-gray-400 italic px-1 py-2">Chưa có ảnh giấy tờ</p>
                          ) : (
                            (selected.documentImages ?? []).map((src) => (
                              <button
                                key={src}
                                type="button"
                                onClick={() => setPreviewUrl(src)}
                                className="w-24 h-20 rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-400/40 transition-all"
                              >
                                <img src={src} alt="Giấy tờ" className="w-full h-full object-cover" />
                              </button>
                            ))
                          )}
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="shrink-0 px-4 py-3 border-t bg-white flex flex-col sm:flex-row sm:items-center justify-end gap-2">
              {applyPackage && selected && !selectedPackageId && (
                <p className="text-[10px] text-amber-600 font-bold sm:mr-auto">
                  Chọn gói trước khi lấy thông tin
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!canApply}
                onClick={() => selected && onApply(selected, selectedPackage)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-vetc-green text-white text-xs font-black hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Check size={14} />
                Lấy thông tin
              </button>
            </div>

            {previewUrl && (
              <div
                className="absolute inset-0 z-10 bg-black/90 flex items-center justify-center p-4"
                onClick={() => setPreviewUrl(null)}
              >
                <button
                  type="button"
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
                  onClick={() => setPreviewUrl(null)}
                >
                  <X size={20} />
                </button>
                <img
                  src={previewUrl}
                  alt="Xem ảnh"
                  className="max-h-full max-w-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VehicleInfoLookupModal;
