import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Car, User, Image as ImageIcon, FileText } from 'lucide-react';

export type VehicleStationPass = {
  id: string;
  stationName: string;
  highway: string;
  direction: string;
  passedAt: string;
};

export type VehicleOwnerInfo = {
  name: string;
  phone: string;
  address: string;
  idNumber: string;
};

export type VehicleRescuePackage = {
  id: string;
  name: string;
  /** Không có | Active | Expired */
  status: 'active' | 'none' | 'expired';
  remainingServices?: number;
  totalServices?: number;
  validFrom?: string;
  validTo?: string;
  coverageKm?: number;
};

export type VehicleSearchResult = {
  id: string;
  plate: string;
  model: string;
  brand: string;
  seats: number;
  loadTons: string;
  vehicleType: string;
  vin: string;
  imageUrl: string;
  registrationUrl: string;
  registrationLabel: string;
  owner: VehicleOwnerInfo;
  /** Ảnh xe (fill vào hiện trường khi lấy thông tin) */
  vehicleImages?: string[];
  /** Ảnh/giấy tờ đăng ký xe */
  documentImages?: string[];
  /** Lịch sử xe qua trạm gần nhất */
  stationPassHistory?: VehicleStationPass[];
  /** Các gói cứu hộ gắn với phương tiện (có thể nhiều gói) */
  rescuePackages?: VehicleRescuePackage[];
};

const DEFAULT_STATION_HISTORY: VehicleStationPass[] = [
  {
    id: 'sp1',
    stationName: 'Trạm Thu phí Pháp Vân – Cầu Giẽ',
    highway: 'Cao tốc Pháp Vân – Cầu Giẽ',
    direction: 'Hà Nội → Ninh Bình',
    passedAt: '03/07/2026 14:12',
  },
  {
    id: 'sp2',
    stationName: 'Trạm Thu phí Cao Bồ',
    highway: 'QL1A',
    direction: 'Nam → Bắc',
    passedAt: '02/07/2026 09:45',
  },
  {
    id: 'sp3',
    stationName: 'Trạm Thu phí Bắc Thăng Long',
    highway: 'Vành đai 3',
    direction: 'Đông → Tây',
    passedAt: '01/07/2026 18:20',
  },
];

export const MOCK_VEHICLE_REGISTRY: VehicleSearchResult[] = [
  {
    id: 'v0',
    plate: '38A58531',
    brand: 'Toyota',
    model: 'Corolla Cross',
    seats: 5,
    loadTons: '1.4',
    vehicleType: 'Xe chở người',
    vin: 'R7C2X9M4A8',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=240&h=160&fit=crop',
    registrationUrl: '#',
    registrationLabel: 'DKX_38A58531.pdf',
    owner: {
      name: 'TRAN DINH LAN ANH',
      phone: '0960123123',
      address: '210 Phố Xã Đàn, Đống Đa, Hà Nội',
      idNumber: '001088056789',
    },
    vehicleImages: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&h=600&fit=crop',
      'https://picsum.photos/id/1071/800/600',
    ],
    documentImages: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1568667256549-094345960b4e?w=800&h=600&fit=crop',
    ],
    stationPassHistory: DEFAULT_STATION_HISTORY,
    rescuePackages: [
      {
        id: 'pkg-v0-1',
        name: 'Gói cơ bản 10 dịch vụ',
        status: 'active',
        remainingServices: 7,
        totalServices: 10,
        validFrom: '01/01/2026',
        validTo: '31/12/2026',
        coverageKm: 100,
      },
      {
        id: 'pkg-v0-2',
        name: 'Gói cao cấp 20 dịch vụ',
        status: 'active',
        remainingServices: 18,
        totalServices: 20,
        validFrom: '01/03/2026',
        validTo: '28/02/2027',
        coverageKm: 150,
      },
      {
        id: 'pkg-v0-3',
        name: 'Gói doanh nghiệp VETC',
        status: 'expired',
        remainingServices: 0,
        totalServices: 15,
        validFrom: '01/01/2025',
        validTo: '31/12/2025',
        coverageKm: 100,
      },
    ],
  },
  {
    id: 'v1',
    plate: '29E366666',
    brand: 'Toyota',
    model: 'Camry 2.5Q',
    seats: 5,
    loadTons: '1.5',
    vehicleType: 'Xe chở người',
    vin: 'R7C2X9M4A8',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=240&h=160&fit=crop',
    registrationUrl: '#',
    registrationLabel: 'DKX_29E366666.pdf',
    owner: {
      name: 'Vương Đăng Minh',
      phone: '0967419411',
      address: '192 Phố Hào Nam, Đống Đa, Hà Nội',
      idNumber: '001088012345',
    },
    vehicleImages: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop',
    ],
    documentImages: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
    ],
    stationPassHistory: DEFAULT_STATION_HISTORY,
    rescuePackages: [
      {
        id: 'pkg-v1-1',
        name: 'Gói cơ bản 10 dịch vụ',
        status: 'active',
        remainingServices: 4,
        totalServices: 10,
        validFrom: '15/03/2026',
        validTo: '14/03/2027',
        coverageKm: 100,
      },
      {
        id: 'pkg-v1-2',
        name: 'Gói ưu tiên khách hàng',
        status: 'active',
        remainingServices: 2,
        totalServices: 5,
        validFrom: '01/07/2026',
        validTo: '30/06/2027',
        coverageKm: 120,
      },
    ],
  },
  {
    id: 'v2',
    plate: '30A12345',
    brand: 'Honda',
    model: 'CR-V L',
    seats: 7,
    loadTons: '1.8',
    vehicleType: 'Xe chở người',
    vin: 'JHLRD7780PC012345',
    imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=240&h=160&fit=crop',
    registrationUrl: '#',
    registrationLabel: 'DKX_30A12345.pdf',
    owner: {
      name: 'Nguyễn Văn An',
      phone: '0912345678',
      address: '45 Láng Hạ, Ba Đình, Hà Nội',
      idNumber: '001079098765',
    },
    vehicleImages: [
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
    ],
    documentImages: [
      'https://images.unsplash.com/photo-1568667256549-094345960b4e?w=800&h=600&fit=crop',
    ],
    stationPassHistory: DEFAULT_STATION_HISTORY.slice(0, 2),
    rescuePackages: [
      {
        id: 'pkg-v2-1',
        name: 'Gói cao cấp 20 dịch vụ',
        status: 'active',
        remainingServices: 15,
        totalServices: 20,
        validFrom: '01/06/2026',
        validTo: '31/05/2027',
        coverageKm: 150,
      },
      {
        id: 'pkg-v2-2',
        name: 'Gói cơ bản 10 dịch vụ',
        status: 'active',
        remainingServices: 9,
        totalServices: 10,
        validFrom: '01/04/2026',
        validTo: '31/03/2027',
        coverageKm: 100,
      },
    ],
  },
  {
    id: 'v3',
    plate: '51F98765',
    brand: 'Hyundai',
    model: 'Porter H150',
    seats: 3,
    loadTons: '1.5',
    vehicleType: 'Xe chở hàng',
    vin: 'KMHXXA7BP7U123456',
    imageUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc1da5d9a?w=240&h=160&fit=crop',
    registrationUrl: '#',
    registrationLabel: 'DKX_51F98765.pdf',
    owner: {
      name: 'Trần Thị Bình',
      phone: '0987654321',
      address: '12 Nguyễn Văn Linh, Q.7, TP.HCM',
      idNumber: '079185012345',
    },
    vehicleImages: [
      'https://images.unsplash.com/photo-1601584115197-04ecc1da5d9a?w=800&h=600&fit=crop',
    ],
    documentImages: [
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
    ],
    stationPassHistory: DEFAULT_STATION_HISTORY.slice(1),
    rescuePackages: [
      {
        id: 'pkg-v3-none',
        name: 'Không có',
        status: 'none',
      },
    ],
  },
  {
    id: 'v4',
    plate: '29E366666',
    brand: 'Toyota',
    model: 'Camry 2.0G (bản đăng ký cũ)',
    seats: 5,
    loadTons: '1.4',
    vehicleType: 'Xe chở người',
    vin: 'JTNB11HK40K123456',
    imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=240&h=160&fit=crop',
    registrationUrl: '#',
    registrationLabel: 'DKX_29E366666_cu.pdf',
    owner: {
      name: 'Vương Đăng Minh',
      phone: '0967419411',
      address: '192 Phố Hào Nam, Đống Đa, Hà Nội',
      idNumber: '001088012345',
    },
    vehicleImages: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&h=600&fit=crop',
    ],
    documentImages: [
      'https://images.unsplash.com/photo-1568667256549-094345960b4e?w=800&h=600&fit=crop',
    ],
    stationPassHistory: DEFAULT_STATION_HISTORY.slice(0, 1),
    rescuePackages: [
      {
        id: 'pkg-v4-1',
        name: 'Gói cơ bản 10 dịch vụ',
        status: 'expired',
        remainingServices: 0,
        totalServices: 10,
        validFrom: '01/01/2025',
        validTo: '31/12/2025',
        coverageKm: 100,
      },
      {
        id: 'pkg-v4-none',
        name: 'Không có',
        status: 'none',
      },
    ],
  },
];

const normalizePlate = (value: string) => value.replace(/[\s\-.]/g, '').toUpperCase();
export const normalizeVehicleQuery = normalizePlate;

type Props = {
  isOpen: boolean;
  initialPlate?: string;
  onClose: () => void;
  onSelect: (vehicle: VehicleSearchResult) => void;
};

const VehiclePlateSearchModal: React.FC<Props> = ({
  isOpen,
  initialPlate = '',
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState(initialPlate);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<VehicleSearchResult[]>([]);

  const runSearch = (plate: string) => {
    const normalized = normalizePlate(plate);
    if (!normalized) {
      setResults([]);
      setSearched(true);
      return;
    }
    const matched = MOCK_VEHICLE_REGISTRY.filter((v) =>
      normalizePlate(v.plate).includes(normalized)
    );
    setResults(matched);
    setSearched(true);
  };

  React.useEffect(() => {
    if (isOpen) {
      setQuery(initialPlate);
      setSearched(false);
      setResults([]);
      if (initialPlate.trim()) {
        runSearch(initialPlate);
      }
    }
  }, [isOpen, initialPlate]);

  const resultCountLabel = useMemo(() => {
    if (!searched) return null;
    return `${results.length} kết quả`;
  }, [searched, results.length]);

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
            className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Car size={18} className="text-vetc-green" />
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">
                  Tra cứu thông tin phương tiện
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

            <div className="p-4 border-b bg-white">
              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">
                Biển số xe
              </label>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch(query);
                  }}
                  placeholder="Nhập BSX để tra cứu..."
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
              {resultCountLabel && (
                <p className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {resultCountLabel}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {!searched ? (
                <div className="py-16 text-center text-sm text-gray-400">
                  Nhập biển số xe và bấm Tìm kiếm
                </div>
              ) : results.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-500">
                  Không tìm thấy phương tiện với BSX &quot;{query}&quot;
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-green-50/60 text-gray-600 border-b">
                        <th className="p-2 text-left border font-bold whitespace-nowrap">BSX</th>
                        <th className="p-2 text-left border font-bold whitespace-nowrap">Dòng xe</th>
                        <th className="p-2 text-center border font-bold whitespace-nowrap">Số chỗ</th>
                        <th className="p-2 text-center border font-bold whitespace-nowrap">Trọng tải</th>
                        <th className="p-2 text-left border font-bold whitespace-nowrap">Loại xe</th>
                        <th className="p-2 text-left border font-bold whitespace-nowrap">Số khung</th>
                        <th className="p-2 text-center border font-bold whitespace-nowrap">Hình ảnh xe</th>
                        <th className="p-2 text-left border font-bold whitespace-nowrap">Đăng ký xe</th>
                        <th className="p-2 text-left border font-bold whitespace-nowrap">Thông tin chủ xe</th>
                        <th className="p-2 text-center border font-bold whitespace-nowrap">Chọn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((v) => (
                        <tr key={v.id} className="border-b hover:bg-gray-50 align-top">
                          <td className="p-2 border font-black text-gray-800 whitespace-nowrap">
                            {v.plate}
                          </td>
                          <td className="p-2 border">
                            <div className="font-bold text-gray-800">{v.brand}</div>
                            <div className="text-gray-500">{v.model}</div>
                          </td>
                          <td className="p-2 border text-center font-bold">{v.seats}</td>
                          <td className="p-2 border text-center font-bold">{v.loadTons} tấn</td>
                          <td className="p-2 border whitespace-nowrap">{v.vehicleType}</td>
                          <td className="p-2 border font-mono text-[10px]">{v.vin}</td>
                          <td className="p-2 border text-center">
                            <a
                              href={v.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex flex-col items-center gap-1 text-blue-600 hover:underline"
                            >
                              <img
                                src={v.imageUrl}
                                alt={v.plate}
                                className="w-16 h-11 object-cover rounded border"
                              />
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold">
                                <ImageIcon size={9} /> Xem
                              </span>
                            </a>
                          </td>
                          <td className="p-2 border">
                            <a
                              href={v.registrationUrl}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                            >
                              <FileText size={12} />
                              <span className="truncate max-w-[120px]">{v.registrationLabel}</span>
                            </a>
                          </td>
                          <td className="p-2 border min-w-[180px]">
                            <div className="flex items-start gap-1.5">
                              <User size={12} className="text-gray-400 mt-0.5 shrink-0" />
                              <div className="space-y-0.5">
                                <div className="font-bold text-gray-800">{v.owner.name}</div>
                                <div className="text-gray-600">{v.owner.phone}</div>
                                <div className="text-gray-500 leading-snug">{v.owner.address}</div>
                                <div className="text-gray-400">CCCD: {v.owner.idNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 border text-center">
                            <button
                              type="button"
                              onClick={() => onSelect(v)}
                              className="px-2.5 py-1.5 rounded bg-vetc-green text-white text-[10px] font-bold hover:bg-green-700 transition-colors"
                            >
                              Áp dụng
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VehiclePlateSearchModal;
