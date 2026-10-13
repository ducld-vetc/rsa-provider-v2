import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, Clock, Copy, MapPin, Navigation, Route, Square } from 'lucide-react';
import {
  GPS_PLAYBACK_DEMO_CASES,
  filterPointsInRange,
  formatClockRange,
  formatSegmentNarrative,
  fromDatetimeLocalValue,
  getRescueGpsPlaybackMock,
  segmentOverlapsRange,
  sortSegmentsByTime,
  toDatetimeLocalValue,
  type GpsPlaybackDemoCaseId,
  type GpsPlaybackLayer,
  type GpsPlaybackSegment,
  type GpsTrailPoint,
} from '../data/rescueGpsPlaybackMockData';
import { INITIAL_VEHICLE_GPS_DATA, type VehicleGpsStatus } from '../data/gpsTrackingMockData';

const MAP_FALLBACK: L.LatLngTuple = [21.0285, 105.8452];

const startIcon = L.divIcon({
  html: `<div style="width:22px;height:22px;background:#16A34A;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 6px rgba(22,163,74,0.45)"></div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  html: `<div style="width:26px;height:26px;background:#2563EB;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.4);display:flex;align-items:center;justify-content:center">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M5 17h14v-5H5z"/><circle cx="7.5" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/></svg>
  </div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    map.invalidateSize();
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FitJourney({ points }: { points: L.LatLngTuple[] }) {
  const map = useMap();
  const key = points.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
  }, [map, key, points]);
  return null;
}

interface RescueOrderGpsJourneyProps {
  plate?: string;
  footer?: React.ReactNode;
  gpsStatus?: VehicleGpsStatus;
}

const RescueOrderGpsJourney: React.FC<RescueOrderGpsJourneyProps> = ({ plate, footer, gpsStatus }) => {
  const [demoCase, setDemoCase] = useState<GpsPlaybackDemoCaseId>('with_data');
  const data = getRescueGpsPlaybackMock(demoCase);
  const windowStart = useMemo(() => new Date(data.windowStartIso), [data.windowStartIso]);
  const windowEnd = useMemo(() => new Date(data.windowEndIso), [data.windowEndIso]);

  const [fromLocal, setFromLocal] = useState(() => toDatetimeLocalValue(data.windowStartIso));
  const [toLocal, setToLocal] = useState(() => toDatetimeLocalValue(data.windowEndIso));
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const [copiedCoords, setCopiedCoords] = useState(false);
  const handleCopyCoords = (coordsStr: string) => {
    navigator.clipboard.writeText(coordsStr);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const currentGps = useMemo(() => {
    if (gpsStatus) return gpsStatus;
    if (plate) {
      const normalized = plate.replace(/[^a-zA-Z0-9]/g, '');
      const found = Object.values(INITIAL_VEHICLE_GPS_DATA).find(
        (v) => v.plate === plate || v.plateNormalized === normalized
      );
      if (found) return found;
    }
    return INITIAL_VEHICLE_GPS_DATA['v1'];
  }, [gpsStatus, plate]);

  const currentSignal = currentGps?.signal;

  useEffect(() => {
    setFromLocal(toDatetimeLocalValue(data.windowStartIso));
    setToLocal(toDatetimeLocalValue(data.windowEndIso));
    setSelectedSegmentId(null);
  }, [demoCase, data.windowStartIso, data.windowEndIso]);

  const parsedRange = useMemo(() => {
    const from = fromDatetimeLocalValue(fromLocal);
    const to = fromDatetimeLocalValue(toLocal);
    if (!from || !to) return { from: windowStart, to: windowEnd, valid: false as const };
    if (from >= to) return { from, to, valid: false as const };
    return { from, to, valid: true as const };
  }, [fromLocal, toLocal, windowStart, windowEnd]);

  const visibleSegments = useMemo(() => {
    if (!parsedRange.valid) return [];
    return sortSegmentsByTime(
      data.segments.filter((s) => segmentOverlapsRange(s, parsedRange.from, parsedRange.to))
    );
  }, [data.segments, parsedRange]);

  const selectedSegment = visibleSegments.find((s) => s.id === selectedSegmentId) ?? null;

  const mapRange = useMemo(() => {
    if (selectedSegment) {
      return { from: new Date(selectedSegment.startAt), to: new Date(selectedSegment.endAt), valid: true as const };
    }
    return parsedRange;
  }, [selectedSegment, parsedRange]);

  const visibleLayers = useMemo(() => {
    if (!mapRange.valid) {
      return data.layers.map((layer) => ({ ...layer, points: [] as GpsTrailPoint[] }));
    }
    return data.layers.map((layer) => ({
      ...layer,
      points: filterPointsInRange(layer.points, mapRange.from, mapRange.to),
    }));
  }, [data.layers, mapRange]);

  const allVisiblePoints = useMemo(
    () => visibleLayers.flatMap((layer) => layer.points.map((p) => [p.lat, p.lng] as L.LatLngTuple)),
    [visibleLayers]
  );

  const primaryLayer = visibleLayers.find((l) => l.points.length > 0);
  const startPoint = primaryLayer?.points[0];
  const endPoint = primaryLayer?.points[primaryLayer.points.length - 1];
  const hasGeometry = allVisiblePoints.length > 0;
  const rangeInvalid = !parsedRange.valid;

  const onFromChange = (value: string) => {
    setSelectedSegmentId(null);
    setFromLocal(value);
  };
  const onToChange = (value: string) => {
    setSelectedSegmentId(null);
    setToLocal(value);
  };

  const onSelectSegment = (id: string) => {
    setSelectedSegmentId((prev) => (prev === id ? null : id));
  };

  const plateLabel = plate || data.vehiclePlate;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 h-[560px] overflow-hidden">
      <div className="lg:col-span-8 bg-gray-100 relative group text-left min-h-[320px]">
        <MapContainer
          center={MAP_FALLBACK}
          zoom={14}
          className="h-full w-full absolute inset-0 z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateOnResize />
          <FitJourney points={allVisiblePoints} />
          {visibleLayers.map((layer) => (
            <JourneyLayer key={layer.provider} layer={layer} />
          ))}
          {startPoint && (
            <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
              <Tooltip direction="top" offset={[0, -8]}>
                Điểm đầu khoảng xem
              </Tooltip>
            </Marker>
          )}
          {endPoint && endPoint !== startPoint && (
            <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
              <Tooltip direction="top" offset={[0, -8]}>
                Điểm cuối khoảng xem · {plateLabel}
              </Tooltip>
            </Marker>
          )}
        </MapContainer>

        {!hasGeometry && (
          <div className="absolute inset-0 z-[350] flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 border border-dashed border-gray-200 rounded-xl px-4 py-3 text-center shadow-sm max-w-xs">
              <p className="text-xs font-bold text-gray-600">Không có hành trình trong khoảng đã chọn</p>
              <p className="text-[10px] text-gray-400 mt-1">Thử mở rộng Từ / Đến.</p>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 border-l flex flex-col bg-white overflow-hidden text-left min-h-0">
        {/* BLOCK VỊ TRÍ HIỆN TẠI (ĐÃ CHUYỂN TỪ BANNER XUỐNG ĐÂY) */}
        <div className="p-3 border-b bg-gradient-to-b from-emerald-50/40 via-white to-gray-50/70 space-y-2.5">
          {/* Hàng 1: Trạng thái GPS + Thời điểm cập nhật */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {!currentSignal?.signalLost && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${currentSignal?.signalLost ? 'bg-amber-500' : 'bg-emerald-600'}`}></span>
                </span>
                {currentSignal?.signalLost ? 'Mất tín hiệu' : 'GPS Trực tuyến'}
              </span>

              {currentSignal?.reason && (
                <span className="text-[10px] font-semibold text-gray-700 px-1.5 py-0.5 rounded bg-white border border-gray-200 shadow-xs">
                  {currentSignal.reason}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Clock size={11} className="text-gray-400" />
              <span>{currentSignal?.lastSeenAt || 'Vừa xong'}</span>
            </div>
          </div>

          {/* Hộp địa chỉ vị trí hiện tại */}
          <div className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-xs space-y-1.5">
            <div className="flex items-start gap-1.5">
              <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 leading-snug break-words">
                  {currentSignal?.address || 'Chưa có thông tin địa chỉ'}
                </div>
                {currentSignal?.lat && currentSignal?.lng && (
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-[11px] text-gray-500">
                    <span className="font-mono text-[10.5px]">
                      {currentSignal.lat.toFixed(4)}° N, {currentSignal.lng.toFixed(4)}° E
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCoords(`${currentSignal.lat}, ${currentSignal.lng}`)}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 transition px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                      title="Sao chép tọa độ"
                    >
                      {copiedCoords ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedCoords ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dòng phụ: Căn cứ ca & IMEI & Tag trạng thái */}
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-gray-500 pt-0.5">
            {currentSignal?.inShiftBasis && currentSignal.inShiftBasis !== '—' && (
              <span className="truncate max-w-[210px] text-gray-600" title={currentSignal.inShiftBasis}>
                Ca: <strong className="text-gray-800 font-medium">{currentSignal.inShiftBasis}</strong>
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              {currentGps?.imei && (
                <span className="font-mono text-[9.5px] text-gray-600 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  IMEI: {currentGps.imei}
                </span>
              )}
              {/* Giữ tag hành trình, bỏ hoàn toàn tab 'Không có dữ liệu' */}
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50/90 px-1.5 py-0.5 rounded border border-blue-200">
                Có hành trình
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-[#091b37]">Lịch sử hành trình · {plateLabel}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-gray-500">Từ</span>
                <input
                  type="datetime-local"
                  value={fromLocal}
                  onChange={(e) => onFromChange(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e4e6] bg-white px-2 py-1.5 text-[11px] text-[#091b37]"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-gray-500">Đến</span>
                <input
                  type="datetime-local"
                  value={toLocal}
                  onChange={(e) => onToChange(e.target.value)}
                  className="w-full rounded-lg border border-[#e3e4e6] bg-white px-2 py-1.5 text-[11px] text-[#091b37]"
                />
              </label>
            </div>
            {rangeInvalid && (
              <p className="text-[10px] text-amber-700">Thời gian bắt đầu phải trước thời gian kết thúc.</p>
            )}
          </div>
          {visibleSegments.length === 0 ? (
            <div className="py-10 px-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/80">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 text-gray-400 mb-3">
                <Route size={20} />
              </div>
              <p className="text-sm font-bold text-gray-600">Không có chặng trong khoảng</p>
              <p className="text-[11px] text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Đổi Từ / Đến để xem lịch sử khác.
              </p>
            </div>
          ) : (
            <div className="relative space-y-4">
              <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200" aria-hidden />
              {visibleSegments.map((segment) => (
                <JourneyIntervalRow
                  key={segment.id}
                  segment={segment}
                  selected={segment.id === selectedSegmentId}
                  onSelect={() => onSelectSegment(segment.id)}
                />
              ))}
            </div>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
};

function JourneyLayer({ layer }: { layer: GpsPlaybackLayer }) {
  if (layer.points.length < 2) return null;
  const path = layer.points.map((p) => [p.lat, p.lng] as L.LatLngTuple);
  return (
    <Polyline
      positions={path}
      pathOptions={{ color: layer.color, weight: 5, opacity: 0.9, lineJoin: 'round' }}
    />
  );
}

function JourneyIntervalRow({
  segment,
  selected,
  onSelect,
}: {
  segment: GpsPlaybackSegment;
  selected: boolean;
  onSelect: () => void;
}) {
  const isMove = segment.type === 'route';
  const Icon = isMove ? Navigation : Square;
  const dotClass = isMove ? 'bg-blue-500' : 'bg-amber-500';
  const labelClass = isMove ? 'text-blue-700' : 'text-amber-700';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative z-[1] flex w-full items-start gap-3 rounded-lg py-0.5 pr-2 text-left ${
        selected ? 'bg-blue-50/80' : 'hover:bg-gray-50/80'
      }`}
    >
      <div
        className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-md ${dotClass}`}
      >
        <Icon size={11} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-[#091b37]">
          {formatClockRange(segment.startAt, segment.endAt)}
          <span className="mx-1 font-semibold text-gray-400">=</span>
          <span className={labelClass}>{formatSegmentNarrative(segment)}</span>
        </p>
        <p className="mt-0.5 text-[10px] text-gray-400">{segment.statusDuration}</p>
      </div>
    </button>
  );
}

export default RescueOrderGpsJourney;
