import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PartnerVehiclePreview from '../components/PartnerVehiclePreview';
import { VEHICLES } from '../data/partnerRescueMockData';
import { INITIAL_VEHICLE_GPS_DATA } from '../data/gpsTrackingMockData';

const PartnerVehicleProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vehicle = VEHICLES.find((v) => v.id === id);
  if (!vehicle) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
        Không tìm thấy phương tiện.
        <button type="button" className="mt-3 block w-full font-semibold text-[#0B6B37]" onClick={() => navigate('/partner/vehicles')}>
          Về danh sách
        </button>
      </div>
    );
  }
  const gps = INITIAL_VEHICLE_GPS_DATA[vehicle.id];
  const gpsLost = Boolean(gps?.signal.signalLost);
  return (
    <PartnerVehiclePreview
      vehicle={vehicle}
      gpsLost={gpsLost}
      gpsText={gpsLost ? 'Mất tín hiệu GPS' : 'GPS đang có tín hiệu'}
      lastLoc={gps?.signal.address || vehicle.parkAddress || '—'}
      onClose={() => navigate('/partner/vehicles')}
      onEdit={() => navigate(`/partner/vehicles/${vehicle.id}/edit`)}
      onTransfer={() => navigate(`/partner/vehicles/${vehicle.id}/edit`)}
      onPair={() => navigate(`/partner/vehicles/${vehicle.id}/edit`)}
      onStatus={() => navigate(`/partner/vehicles/${vehicle.id}/edit`)}
      onMaint={() => navigate(`/partner/vehicles/${vehicle.id}/edit`)}
    />
  );
};

export default PartnerVehicleProfile;
