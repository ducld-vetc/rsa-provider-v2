import React, { useEffect, useState } from 'react';
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FreeVehicleHit, GeoPoint } from './vehicleAvailability';

const COLORS = ['#0E8F47', '#1D4ED8', '#B45309', '#7C3AED', '#BE123C', '#0F766E'];

const centerIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:999px;background:#da2c39;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function plateIcon(plate: string, color: string, active: boolean) {
  const width = Math.max(78, plate.length * 7 + 16);
  const height = 24;
  return L.divIcon({
    className: 'vehicle-lookup-plate',
    html: `<div style="box-sizing:border-box;width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${active ? color : '#091b37'};color:#fff;font:700 11px/1 sans-serif;border-radius:6px;border:2px solid #fff;box-shadow:0 1px 4px rgba(9,27,55,.28)">${plate}</div>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height + 6],
  });
}

function FitView({ points }: { points: GeoPoint[] }) {
  const map = useMap();
  const signature = points.map((point) => `${point.lat},${point.lng}`).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds.pad(0.15), { animate: false });
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [map, signature]);
  return null;
}

function ring(center: GeoPoint, radiusKm: number): GeoPoint[] {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((center.lat * Math.PI) / 180));
  return [
    { lat: center.lat + dLat, lng: center.lng },
    { lat: center.lat - dLat, lng: center.lng },
    { lat: center.lat, lng: center.lng + dLng },
    { lat: center.lat, lng: center.lng - dLng },
  ];
}

interface VehicleLookupResultProps {
  hits: FreeVehicleHit[];
  center: GeoPoint;
  radiusKm: number;
  onShowList: () => void;
}

const VehicleLookupResult: React.FC<VehicleLookupResultProps> = ({ hits, center, radiusKm, onShowList }) => {
  const [activeId, setActiveId] = useState(hits[0]?.vehicle.id ?? '');
  const viewPoints = [center, ...ring(center, radiusKm), ...hits.flatMap((hit) => hit.track)];

  return (
    <div className="relative h-[560px] overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onShowList}
        className="absolute right-3 top-3 z-[1000] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm"
      >
        Danh sách
      </button>
      <div className="h-full w-full">
        <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitView points={viewPoints} />
          <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#da2c39', weight: 1, fillOpacity: 0.06 }} />
          <Marker position={[center.lat, center.lng]} icon={centerIcon} />
          {hits.map((hit, index) => {
            const color = COLORS[index % COLORS.length];
            const active = hit.vehicle.id === activeId;
            return (
              <React.Fragment key={hit.vehicle.id}>
                <Polyline
                  positions={hit.track.map((point) => [point.lat, point.lng])}
                  pathOptions={{ color, weight: active ? 5 : 3, opacity: 0.9 }}
                  eventHandlers={{ click: () => setActiveId(hit.vehicle.id) }}
                />
                <Marker
                  position={[hit.point.lat, hit.point.lng]}
                  icon={plateIcon(hit.vehicle.plate, color, active)}
                  eventHandlers={{ click: () => setActiveId(hit.vehicle.id) }}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default VehicleLookupResult;
