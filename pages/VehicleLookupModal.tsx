import React, { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PartnerModal, partnerBtnBrand } from '../components/PartnerModal';
import {
  LOOKUP_CENTERS,
  RADIUS_OPTIONS,
  defaultLookupRange,
  type GeoPoint,
  type VehicleLookupQuery,
} from './vehicleAvailability';

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:999px;background:#0E8F47;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClick({ onPick }: { onPick: (point: GeoPoint) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) });
    },
  });
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

interface PlaceHit {
  label: string;
  point: GeoPoint;
}

function parseCoords(raw: string): GeoPoint | null {
  const match = raw.trim().match(/(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  let lat = Number(match[1]);
  let lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

async function searchPlaces(query: string): Promise<PlaceHit[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&accept-language=vi&countrycodes=vn`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('search');
  const data = (await response.json()) as { display_name?: string; lat?: string; lon?: string }[];
  return data.flatMap((item) => {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{ label: item.display_name || `${lat}, ${lng}`, point: { lat, lng } }];
  });
}

const CenterSearch: React.FC<{ label: string; onPick: (point: GeoPoint, label: string) => void }> = ({ label, onPick }) => {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [note, setNote] = useState('');
  const [searching, setSearching] = useState(false);
  const localHits = LOOKUP_CENTERS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())).map((item) => ({
    label: item.label,
    point: item.point,
  }));

  const pick = (hit: PlaceHit) => {
    onPick(hit.point, hit.label);
    setQuery(hit.label);
    setHits([]);
    setNote('');
  };

  const runSearch = async () => {
    const raw = query.trim();
    if (!raw || searching) return;
    const coords = parseCoords(raw);
    if (coords) {
      pick({ label: `${coords.lat}, ${coords.lng}`, point: coords });
      return;
    }
    const station = LOOKUP_CENTERS.find((item) => item.label.toLowerCase() === raw.toLowerCase());
    if (station) {
      pick({ label: station.label, point: station.point });
      return;
    }
    setSearching(true);
    setNote('');
    setHits([]);
    try {
      const next = await searchPlaces(raw);
      if (next.length === 0) setNote('Không thấy địa chỉ. Thử tọa độ 20.98, 105.85');
      else if (next.length === 1) pick(next[0]);
      else setHits(next);
    } catch {
      setNote('Không tìm được. Kiểm tra mạng hoặc nhập tọa độ lat, lng.');
    } finally {
      setSearching(false);
    }
  };

  const suggestions = hits.length > 0 ? hits : query.trim() ? localHits : [];

  return (
    <>
      <label className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Tâm tra cứu</label>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch();
        }}
      >
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHits([]);
            setNote('');
          }}
          placeholder="Địa chỉ hoặc lat, lng. Ví dụ 20.98, 105.85"
          aria-label="Tìm tâm tra cứu"
          className="h-10 min-w-0 flex-1 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-800 outline-none focus:border-[#0E8F47]"
        />
        <button type="submit" className="h-10 shrink-0 rounded-lg bg-[#0E8F47] px-3 text-xs font-bold text-white">
          {searching ? 'Đang tìm' : 'Tìm'}
        </button>
      </form>
      <p className="mt-2 text-xs text-gray-600">Đang chọn: {label}. Nhập địa chỉ, tọa độ, hoặc chạm bản đồ.</p>
      {note && <p className="mt-1 text-xs font-medium text-red-600">{note}</p>}
      {suggestions.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
          {suggestions.map((hit) => (
            <button
              key={`${hit.label}-${hit.point.lat}`}
              type="button"
              onClick={() => pick(hit)}
              className="block w-full border-b border-gray-100 px-3 py-2 text-left text-xs text-gray-800 last:border-b-0 hover:bg-emerald-50"
            >
              {hit.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
};

function FlyTo({ point }: { point: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([point.lat, point.lng], Math.max(map.getZoom(), 12), { duration: 0.4 });
  }, [map, point.lat, point.lng]);
  return null;
}

interface VehicleLookupModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (query: VehicleLookupQuery) => void;
}

const VehicleLookupModal: React.FC<VehicleLookupModalProps> = ({ open, onClose, onApply }) => {
  const initial = useMemo(() => defaultLookupRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [radiusKm, setRadiusKm] = useState(10);
  const [center, setCenter] = useState<GeoPoint>(LOOKUP_CENTERS[0].point);
  const [centerLabel, setCenterLabel] = useState(LOOKUP_CENTERS[0].label);

  const fromMs = from ? new Date(from).getTime() : NaN;
  const toMs = to ? new Date(to).getTime() : NaN;
  const rangeOk = Number.isFinite(fromMs) && Number.isFinite(toMs) && toMs > fromMs;

  return (
    <PartnerModal
      open={open}
      wide
      title="Tra cứu xe trống"
      onClose={onClose}
      footer={
        <button
          type="button"
          className={partnerBtnBrand}
          disabled={!rangeOk}
          onClick={() =>
            onApply({ from: fromMs, to: toMs, radiusKm, center, centerLabel })
          }
        >
          Xem kết quả
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Từ
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-2 text-sm font-semibold normal-case tracking-normal text-gray-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
          Đến
          <input
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-2 text-sm font-semibold normal-case tracking-normal text-gray-800"
          />
        </label>
      </div>
      {!rangeOk && <p className="mt-2 text-xs font-medium text-red-600">Thời điểm đến phải sau thời điểm từ.</p>}
      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Bán kính</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((km) => (
            <button
              key={km}
              type="button"
              onClick={() => setRadiusKm(km)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${radiusKm === km ? 'border-[#0E8F47] bg-emerald-50 text-[#0B6B37]' : 'border-gray-300 text-gray-600'}`}
            >
              {km} km
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <CenterSearch
          label={centerLabel}
          onPick={(point, label) => {
            setCenter(point);
            setCenterLabel(label);
          }}
        />
        <div className="mt-2 h-56 overflow-hidden rounded-xl border border-gray-200">
          <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-full w-full" zoomControl={false} attributionControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <InvalidateSize />
            <MapClick
              onPick={(point) => {
                setCenter(point);
                setCenterLabel(`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
              }}
            />
            <FlyTo point={center} />
            <Marker position={[center.lat, center.lng]} icon={pinIcon} />
            <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#0E8F47', weight: 1, fillOpacity: 0.08 }} />
          </MapContainer>
        </div>
      </div>
    </PartnerModal>
  );
};

export default VehicleLookupModal;
