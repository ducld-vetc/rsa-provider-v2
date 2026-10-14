import React, { useMemo, useState } from 'react';
import PartnerScopeBar, { getStoredPersona } from '../components/PartnerScopeBar';
import {
  INITIAL_VEHICLE_GPS_DATA,
} from '../data/gpsTrackingMockData';
import {
  RESCUE_CAPABILITY_LABEL,
  STATION_OPTIONS,
  VEHICLES,
  inScope,
  type PartnerPersona,
  type RescueCapability,
  type VehicleRecord,
} from '../data/partnerRescueMockData';
import { fleetRowOf } from './vehicleFleetView';

const MIN_READY = 2;

const PartnerFleetCapacity: React.FC = () => {
  const [persona, setPersona] = useState<PartnerPersona>(getStoredPersona);
  const [vehicles] = useState<VehicleRecord[]>(VEHICLES);

  const rows = useMemo(() => {
    const scoped = vehicles.filter((v) => inScope(persona, v.stationId));
    const caps = Object.keys(RESCUE_CAPABILITY_LABEL) as RescueCapability[];
    return STATION_OPTIONS.map((station) => ({
      station,
      counts: caps.map((cap) =>
        scoped.filter(
          (v) =>
            v.stationId === station.id &&
            (v.rescueCapabilities ?? []).includes(cap) &&
            fleetRowOf(v, Boolean(INITIAL_VEHICLE_GPS_DATA[v.id]?.signal.signalLost)).eligible,
        ).length,
      ),
    }));
  }, [persona, vehicles]);

  const caps = Object.keys(RESCUE_CAPABILITY_LABEL) as RescueCapability[];

  return (
    <div className="w-full min-w-0 max-w-full space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Năng lực nhận đơn</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          Số xe đủ điều kiện nhận đơn theo trạm và loại cứu hộ. Ô đỏ là trạm đang dưới {MIN_READY} xe.
        </p>
      </div>
      <PartnerScopeBar persona={persona} onChange={setPersona} />
      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between bg-[#00A859] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
          <span>Trạm × loại cứu hộ</span>
          <span className="text-[11px] font-normal normal-case tracking-normal">Tối thiểu {MIN_READY} xe / ô</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-left font-bold">Trạm</th>
                {caps.map((key) => (
                  <th key={key} className="px-3 py-2 text-center font-bold">{RESCUE_CAPABILITY_LABEL[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ station, counts }) => (
                <tr key={station.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-800">{station.name}</td>
                  {counts.map((count, index) => {
                    const low = count < MIN_READY;
                    return (
                      <td key={caps[index]} className={`px-3 py-2 text-center font-bold ${low ? 'bg-red-50 text-red-700' : 'text-emerald-700'}`}>
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PartnerFleetCapacity;
