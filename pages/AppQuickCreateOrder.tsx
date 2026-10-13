/**
 * AppQuickCreateOrder.tsx
 * FL-M3-04 — Tạo nhanh yêu cầu cứu hộ trên App VETC cứu hộ
 * Giao diện MOBILE (Workfield Mobile App) dựa trên cấu trúc đầy đủ của /station/create (StationCreateOrder.tsx)
 * Đầy đủ 3 khối nghiệp vụ chuẩn:
 *   1. Thông tin sự cố & Khách hàng (SĐT, Biển số, Hãng xe, Vị trí GPS, Mức độ, Thời tiết, Mô tả + AI, Dịch vụ yêu cầu)
 *   2. Thông tin điều phối & Tự nhận việc (Self-Assign switch, Trạm, Tài xế, Xe, Điểm kéo về, Bảng chi phí & Dịch vụ thực tế, VAT)
 *   3. Hiện trường sự cố (Ảnh chụp hiện trường)
 *   4. Cảnh báo trùng đơn thông minh (BR-04, AC-03)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BatteryCharging,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Disc,
  Edit,
  Eye,
  Fuel,
  Info,
  Layers,
  LifeBuoy,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Truck,
  User,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import MapSelectionModal from '../shared/MapSelectionModal';
import { analyzeIncident, AISuggestion } from '../data/aiDataMock';

// ─── Constants & Mock Data ───
const QUICK_SERVICES = [
  { id: 'Kích bình ắc quy', name: 'Kích bình ắc quy', icon: BatteryCharging, price: '400,000' },
  { id: 'Thay lốp dự phòng', name: 'Thay lốp dự phòng', icon: Disc, price: '300,000' },
  { id: 'Cứu hộ kéo xe (Towing)', name: 'Kéo xe (Towing)', icon: Truck, price: '600,000' },
  { id: 'Cẩu xe tai nạn', name: 'Cẩu xe tai nạn', icon: Wrench, price: '1,200,000' },
  { id: 'Cung cấp nhiên liệu', name: 'Tiếp xăng / dầu', icon: Fuel, price: '250,000' },
  { id: 'Xe hết pin', name: 'Xe hết pin', icon: Zap, price: '350,000' },
];

const POPULAR_BRANDS = ['Toyota', 'Hyundai', 'VinFast', 'Kia', 'Ford', 'Honda', 'Mazda', 'Khác'];

const DRIVERS_MOCK = [
  { id: 'D1', name: 'Nguyễn Văn Tài', phone: '0911222333', vehiclePlate: '30G-888.88', vehicleType: 'Xe kéo cẩu', station: 'Carpla Service - CN Hà Nội' },
  { id: 'D2', name: 'Trần Minh Quang', phone: '0988777666', vehiclePlate: '29C-555.22', vehicleType: 'Xe sàn trượt', station: 'Carpla Service - CN Hà Nội' },
  { id: 'D3', name: 'Lê Văn Hùng', phone: '0944555111', vehiclePlate: '30E-123.45', vehicleType: 'Xe kéo cẩu', station: 'Cứu hộ 116 Hà Nội' },
];

interface ActualServiceRow {
  id: number;
  serviceName: string;
  fixedPrice: string;
  customerPaid: string;
}

const AppQuickCreateOrder: React.FC = () => {
  const navigate = useNavigate();

  // Mode hiển thị: Khung điện thoại mockup hoặc Chế độ rộng
  const [viewMode, setViewMode] = useState<'phone' | 'wide'>('phone');

  // ─── 1. Thông tin sự cố & Khách hàng ───
  const [phone, setPhone] = useState('0967419411');
  const [plate, setPlate] = useState('29E-366.66');
  const [customerName, setCustomerName] = useState('Khách hàng');
  const [contactPhone, setContactPhone] = useState('0967419411');
  const [vehicleBrand, setVehicleBrand] = useState('Toyota');
  const [vehicleLine, setVehicleLine] = useState('Corolla Cross');
  const [vin, setVin] = useState('R7C2X9M4A8');
  const [payload, setPayload] = useState('1.4');
  const [seats, setSeats] = useState('5');

  // Vị trí sự cố
  const [mapAddress, setMapAddress] = useState('Số 28 Trương Định, P. Giáp Bát, Q. Hoàng Mai, Hà Nội');
  const [mapCoords, setMapCoords] = useState('20.9854, 105.8521');
  const [locationType, setLocationType] = useState('Đô thị');
  const [severityLevel, setSeverityLevel] = useState('Nhẹ');
  const [weather, setWeather] = useState('Bình thường');

  // Mô tả sự cố & AI
  const [incidentDescription, setIncidentDescription] = useState(
    'Xe chết máy đỗ ven đường, đề yếu, ắc quy sụt điện. Cần kích bình ắc quy hoặc kéo xe về xưởng.'
  );
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Dịch vụ yêu cầu
  const [selectedServices, setSelectedServices] = useState<string[]>(['Kích bình ắc quy']);

  // ─── 2. Điều phối & Tự nhận việc (FL-M3-04) ───
  const [selfAssign, setSelfAssign] = useState(true);
  const [stationName, setStationName] = useState('Carpla Service - CN Hà Nội');
  const [selectedDriverId, setSelectedDriverId] = useState('D1');
  const [driverPhone, setDriverPhone] = useState('0911222333');
  const [rescueVehiclePlate, setRescueVehiclePlate] = useState('30G-888.88');
  const [rescueVehicleType, setRescueVehicleType] = useState('Xe kéo cẩu');
  const [towDestination, setTowDestination] = useState('Phường Việt Hưng, Quận Long Biên, Hà Nội');
  const [rescueDistance, setRescueDistance] = useState('8.5');

  // Tài chính & Dịch vụ thực tế
  const [vat, setVat] = useState('8');
  const [actualServices, setActualServices] = useState<ActualServiceRow[]>([
    { id: 1, serviceName: 'Kích bình ắc quy', fixedPrice: '400,000', customerPaid: '400,000' },
  ]);

  // ─── 3. Hình ảnh hiện trường ───
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80',
  ]);

  // ─── Modal & Feedback States ───
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<'incident' | 'destination'>('incident');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDuplicateDismissed, setIsDuplicateDismissed] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrderCode, setCreatedOrderCode] = useState('');

  // Auto update driver info when selecting driver
  useEffect(() => {
    const driver = DRIVERS_MOCK.find(d => d.id === selectedDriverId);
    if (driver) {
      setDriverPhone(driver.phone);
      setRescueVehiclePlate(driver.vehiclePlate);
      setRescueVehicleType(driver.vehicleType);
      setStationName(driver.station);
    }
  }, [selectedDriverId]);

  // Tính tổng tiền
  const sumAmount = actualServices.reduce((acc, row) => {
    const val = parseFloat(row.customerPaid.replace(/,/g, '')) || 0;
    return acc + val;
  }, 0);
  const vatAmount = Math.round((sumAmount * (parseFloat(vat) || 0)) / 100);
  const totalPayment = sumAmount + vatAmount;

  // Cảnh báo trùng đơn (BR-04, AC-03)
  const isDuplicateDetected =
    !isDuplicateDismissed &&
    (phone.replace(/\D/g, '') === '0967419411' ||
      plate.toUpperCase().replace(/\W/g, '') === '29E366666' ||
      plate.toUpperCase().replace(/\W/g, '') === '38A58531');

  const duplicateInfo = {
    code: 'RO-HN-20261004-8921',
    plate: plate,
    phone: phone,
    time: '08:15 hôm nay (cách đây 2 giờ)',
    status: 'Đang điều phối',
    station: 'Carpla Service - CN Hà Nội',
    driver: 'Trần Minh Quang (0988777666)',
  };

  // Toggle dịch vụ yêu cầu
  const toggleRequestedService = (name: string) => {
    setSelectedServices(prev =>
      prev.includes(name)
        ? prev.length > 1
          ? prev.filter(s => s !== name)
          : prev
        : [...prev, name]
    );
  };

  // Thêm dịch vụ thực tế
  const handleAddActualService = (name: string, price: string) => {
    setActualServices(prev => [
      ...prev,
      {
        id: Date.now(),
        serviceName: name,
        fixedPrice: price,
        customerPaid: price,
      },
    ]);
    setIsServiceModalOpen(false);
  };

  const handleRemoveActualService = (id: number) => {
    setActualServices(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateActualPrice = (id: number, val: string) => {
    const num = parseFloat(val.replace(/\D/g, '')) || 0;
    setActualServices(prev =>
      prev.map(r => (r.id === id ? { ...r, customerPaid: num.toLocaleString('en-US') } : r))
    );
  };

  // Lấy GPS điện thoại
  const handleDetectGps = () => {
    setMapAddress('Km 8+200 Quốc lộ 1A, Hoàng Liệt, Hoàng Mai, Hà Nội');
    setMapCoords('20.9742, 105.8415');
  };

  // Chụp thêm ảnh
  const handleAddPhoto = () => {
    if (photos.length >= 4) return;
    const sample = [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=400&q=80',
    ];
    setPhotos(prev => [...prev, sample[prev.length % sample.length]]);
  };

  // AI Phân tích
  const handleRunAi = () => {
    if (!incidentDescription.trim()) return;
    setIsAiProcessing(true);
    setTimeout(() => {
      const suggestion = analyzeIncident(incidentDescription);
      const suggestedRows = suggestion.recommendedServices.map((s, idx) => ({
        id: Date.now() + idx,
        serviceName: s.name,
        fixedPrice: s.price,
        customerPaid: s.price,
      }));
      setActualServices(prev => [...prev, ...suggestedRows]);
      setIsAiProcessing(false);
    }, 1000);
  };

  // Presets
  const handleFillSample = () => {
    setPhone('0912888999');
    setPlate('30A-998.89');
    setCustomerName('Nguyễn Văn Tuấn');
    setVehicleBrand('Hyundai');
    setVehicleLine('Tucson');
    setSelectedServices(['Thay lốp dự phòng']);
    setIncidentDescription('Xe bị cán đinh nổ lốp trước bên phụ, cần hỗ trợ thay tại chỗ.');
    setIsDuplicateDismissed(true);
  };

  const handleFillDuplicate = () => {
    setPhone('0967419411');
    setPlate('29E-366.66');
    setIsDuplicateDismissed(false);
  };

  // Submit Order
  const handleSubmit = (bypassDuplicate = false) => {
    if (!phone.trim()) {
      alert('Vui lòng nhập số điện thoại người yêu cầu');
      return;
    }
    if (!plate.trim()) {
      alert('Vui lòng nhập biển số xe gặp sự cố');
      return;
    }
    if (isDuplicateDetected && !bypassDuplicate) {
      setShowDuplicateModal(true);
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const code = `RO-WF-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      setCreatedOrderCode(code);
      setSubmitting(false);
      setShowSuccessModal(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 flex flex-col items-center animate-in fade-in duration-500">
      {/* ─── Top Control Toolbar ─── */}
      <div className="w-full max-w-[500px] mb-4 flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-gray-200 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[#00A859] font-black">
            <Smartphone size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-gray-800 leading-tight">App VETC Cứu Hộ</span>
            <span className="text-[10px] text-gray-400 font-medium">FL-M3-04 • Tạo nhanh hiện trường</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFillSample}
            title="Điền dữ liệu sự cố mẫu"
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>Đơn mẫu</span>
          </button>
          <button
            type="button"
            onClick={handleFillDuplicate}
            title="Thử luồng cảnh báo đơn trùng"
            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[11px] font-bold transition-all"
          >
            Trùng đơn
          </button>
          <button
            type="button"
            onClick={() => setViewMode(prev => (prev === 'phone' ? 'wide' : 'phone'))}
            title={viewMode === 'phone' ? 'Xem chế độ rộng' : 'Xem khung điện thoại'}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {viewMode === 'phone' ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {/* ─── Device Mockup Container ─── */}
      <div
        className={`w-full transition-all duration-300 ${
          viewMode === 'phone'
            ? 'max-w-[430px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-[6px] border-slate-700 relative'
            : 'max-w-[540px] bg-white rounded-3xl shadow-xl border border-gray-200 p-0 overflow-hidden'
        }`}
      >
        {/* Dynamic Island / Notch (chỉ hiện khi ở phone mode) */}
        {viewMode === 'phone' && (
          <div className="w-28 h-5 bg-black rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-2"></div>
            <div className="w-2 h-2 rounded-full bg-blue-950"></div>
          </div>
        )}

        {/* ─── Mobile Screen Content ─── */}
        <div className="bg-white rounded-[38px] overflow-hidden flex flex-col h-[820px] relative select-none">
          {/* Mobile Status Bar */}
          <div className="h-7 px-6 flex items-center justify-between text-[11px] font-bold text-gray-800 bg-[#00A859] text-white shrink-0">
            <span>09:41</span>
            <div className="flex items-center gap-1.5 opacity-90">
              <Wifi size={12} />
              <span className="text-[10px]">5G</span>
              <div className="w-4 h-2 border border-white rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-white rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* Mobile Header Bar */}
          <div className="bg-[#00A859] px-4 py-3 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/station/management')}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-sm font-black leading-tight">Tạo nhanh yêu cầu cứu hộ</h2>
                <span className="text-[10px] text-green-100 font-medium">Workfield • Trạm Carpla Hà Nội</span>
              </div>
            </div>
            <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              FL-M3-04
            </span>
          </div>

          {/* ─── Mobile Scrollable Body ─── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-4 bg-gray-50/70 text-left pb-28">
            {/* Cảnh báo đơn trùng (BR-04) */}
            {isDuplicateDetected && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl shadow-xs animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-amber-900 uppercase">
                        Cảnh báo đơn trùng
                      </span>
                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                        {duplicateInfo.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-1 leading-snug">
                      Biển số <strong>{duplicateInfo.plate}</strong> đang có đơn xử lý lúc {duplicateInfo.time}.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => navigate('/station/management')}
                        className="text-[10px] bg-white border border-amber-300 text-amber-900 px-2 py-1 rounded font-bold"
                      >
                        Xem đơn cũ
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDuplicateDismissed(true)}
                        className="text-[10px] bg-amber-600 text-white px-2.5 py-1 rounded font-bold"
                      >
                        Bỏ qua & Vẫn tạo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                KHỐI 1: THÔNG TIN SỰ CỐ & KHÁCH HÀNG (Chuẩn /station/create)
               ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center text-[10px] font-black">
                    1
                  </div>
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight">
                    Thông tin sự cố & Khách hàng
                  </span>
                </div>
                <span className="text-[10px] text-red-500 font-bold">* Bắt buộc</span>
              </div>

              {/* SĐT & Biển số xe */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                    <Phone size={11} className="text-[#00A859]" />
                    <span>SĐT Khách *</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="09xx..."
                    className="w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-vetc-green bg-gray-50/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                    <Car size={11} className="text-blue-600" />
                    <span>Biển số xe *</span>
                  </label>
                  <input
                    type="text"
                    value={plate}
                    onChange={e => setPlate(e.target.value)}
                    placeholder="30A-..."
                    className="w-full border rounded-xl px-2.5 py-1.5 text-xs font-black text-blue-700 uppercase outline-none focus:border-vetc-green bg-gray-50/50 tracking-wider"
                  />
                </div>
              </div>

              {/* Tên khách hàng & SĐT phụ */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Người yêu cầu</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Tên khách"
                    className="w-full border rounded-xl px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">SĐT liên hệ phụ</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="SĐT phụ"
                    className="w-full border rounded-xl px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green"
                  />
                </div>
              </div>

              {/* Hãng xe & Dòng xe */}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Hãng xe</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POPULAR_BRANDS.slice(0, 6).map(brand => (
                    <button
                      type="button"
                      key={brand}
                      onClick={() => setVehicleBrand(brand)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
                        vehicleBrand === brand
                          ? 'bg-[#00A859] text-white border-[#00A859]'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <input
                      type="text"
                      value={vehicleLine}
                      onChange={e => setVehicleLine(e.target.value)}
                      placeholder="Dòng xe (Sedan/SUV)"
                      className="w-full border rounded-xl px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={payload}
                      onChange={e => setPayload(e.target.value)}
                      placeholder="Tải trọng (tấn)"
                      className="w-full border rounded-xl px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green text-center"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={seats}
                      onChange={e => setSeats(e.target.value)}
                      placeholder="Số chỗ"
                      className="w-full border rounded-xl px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Vị trí sự cố + Lấy GPS + Bản đồ */}
              <div className="space-y-1.5 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <MapPin size={11} className="text-red-500" />
                    <span>Vị trí sự cố *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1"
                  >
                    <LocateFixed size={11} />
                    <span>GPS thiết bị</span>
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={mapAddress}
                    onChange={e => setMapAddress(e.target.value)}
                    className="flex-1 border rounded-xl px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-vetc-green bg-gray-50/50 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMapTarget('incident');
                      setIsMapModalOpen(true);
                    }}
                    className="bg-vetc-green text-white px-2.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 active:scale-95 shadow-2xs"
                  >
                    <Compass size={12} />
                    <span>Bản đồ</span>
                  </button>
                </div>
              </div>

              {/* Phân loại sự cố (Chips chọn nhanh giống /station/create) */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Loại vị trí</label>
                  <div className="flex gap-1">
                    {['Đô thị', 'Cao tốc', 'Vùng núi'].map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setLocationType(t)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold border ${
                          locationType === t
                            ? 'bg-vetc-green text-white border-vetc-green'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Mức độ sự cố</label>
                  <div className="flex gap-1">
                    {[
                      { l: 'Nhẹ', c: 'bg-green-600 text-white border-green-600' },
                      { l: 'Kẹt', c: 'bg-amber-500 text-white border-amber-500' },
                      { l: 'Nguy hiểm', c: 'bg-red-600 text-white border-red-600' },
                    ].map(item => (
                      <button
                        type="button"
                        key={item.l}
                        onClick={() => setSeverityLevel(item.l)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold border ${
                          severityLevel === item.l ? item.c : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mô tả sự cố + AI */}
              <div className="pt-1 border-t border-gray-100 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Mô tả tình trạng sự cố</label>
                  <button
                    type="button"
                    onClick={handleRunAi}
                    disabled={isAiProcessing}
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95"
                  >
                    {isAiProcessing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    <span>AI Phân tích</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={incidentDescription}
                  onChange={e => setIncidentDescription(e.target.value)}
                  className="w-full border rounded-xl px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green"
                />
              </div>

              {/* Dịch vụ yêu cầu */}
              <div className="space-y-1.5 pt-1 border-t border-gray-100">
                <label className="text-[10px] font-bold text-gray-500 uppercase block">Dịch vụ yêu cầu *</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {QUICK_SERVICES.map(srv => {
                    const active = selectedServices.includes(srv.id);
                    const Icon = srv.icon;
                    return (
                      <button
                        type="button"
                        key={srv.id}
                        onClick={() => toggleRequestedService(srv.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'bg-[#00A859] text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Icon size={13} />
                        </div>
                        <span className="text-[11px] leading-tight truncate">{srv.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                KHỐI 2: ĐIỀU PHỐI & TỰ NHẬN VIỆC (FL-M3-04 core feature)
               ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center text-[10px] font-black">
                    2
                  </div>
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight">
                    Điều phối & Tự nhận việc
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  FL-M3-04
                </span>
              </div>

              {/* Self-Assign Switch Card */}
              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00A859] text-white flex items-center justify-center shrink-0">
                    <Zap size={15} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">
                      Tôi tự nhận việc này ngay
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {selfAssign ? 'Trạng thái: ACCEPTED (Đã nhận việc)' : 'Trạng thái: ASSIGNING (Chờ điều phối)'}
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={selfAssign}
                    onChange={e => setSelfAssign(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00A859]"></div>
                </label>
              </div>

              {/* Trạm & Tài xế */}
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                    Trạm cứu hộ đảm nhiệm
                  </label>
                  <select
                    value={stationName}
                    onChange={e => setStationName(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-vetc-green bg-white"
                  >
                    <option value="Carpla Service - CN Hà Nội">Carpla Service - CN Hà Nội</option>
                    <option value="Cứu hộ 116 Hà Nội">Cứu hộ 116 Hà Nội</option>
                    <option value="Garage Thăng Long">Garage Thăng Long</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tài xế thực hiện *</label>
                    <select
                      value={selectedDriverId}
                      onChange={e => setSelectedDriverId(e.target.value)}
                      className="w-full border rounded-xl px-2 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-vetc-green bg-white"
                    >
                      {DRIVERS_MOCK.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">SĐT Tài xế</label>
                    <input
                      type="text"
                      value={driverPhone}
                      readOnly
                      className="w-full border rounded-xl px-2 py-1.5 text-xs text-gray-600 bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Xe cứu hộ</label>
                    <input
                      type="text"
                      value={rescueVehiclePlate}
                      onChange={e => setRescueVehiclePlate(e.target.value)}
                      className="w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Loại xe</label>
                    <input
                      type="text"
                      value={rescueVehicleType}
                      readOnly
                      className="w-full border rounded-xl px-2.5 py-1.5 text-xs text-gray-600 bg-gray-50"
                    />
                  </div>
                </div>

                {/* Điểm kéo về & Khoảng cách */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Điểm kéo về (Destination)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMapTarget('destination');
                        setIsMapModalOpen(true);
                      }}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Chọn bản đồ
                    </button>
                  </div>
                  <input
                    type="text"
                    value={towDestination}
                    onChange={e => setTowDestination(e.target.value)}
                    className="w-full border rounded-xl px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-vetc-green"
                  />
                </div>

                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-xl text-xs">
                  <span className="text-gray-500">Khoảng cách cứu hộ dự kiến:</span>
                  <div className="flex items-center gap-1 font-bold text-gray-800">
                    <input
                      type="text"
                      value={rescueDistance}
                      onChange={e => setRescueDistance(e.target.value)}
                      className="w-12 text-center border rounded px-1 py-0.5 bg-white font-bold"
                    />
                    <span>KM</span>
                  </div>
                </div>
              </div>

              {/* Bảng Dịch vụ thực tế & Khối tài chính */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-600 uppercase">Dịch vụ thực tế & Đơn giá</label>
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(true)}
                    className="text-[10px] bg-vetc-green text-white font-bold px-2 py-0.5 rounded-md flex items-center gap-1 active:scale-95 shadow-2xs"
                  >
                    <Plus size={11} />
                    <span>Thêm</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {actualServices.map(srv => (
                    <div
                      key={srv.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-gray-200 bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-gray-800 block truncate">{srv.serviceName}</span>
                        <span className="text-[10px] text-gray-400">Niêm yết: {srv.fixedPrice} đ</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="text"
                          value={srv.customerPaid}
                          onChange={e => handleUpdateActualPrice(srv.id, e.target.value)}
                          className="w-24 text-right border rounded-lg px-2 py-1 text-xs font-bold text-blue-700 bg-blue-50/50"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveActualService(srv.id)}
                          className="text-gray-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tổng thanh toán card */}
                <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-200 text-xs space-y-1 mt-2">
                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Tạm tính dịch vụ:</span>
                    <span className="font-bold text-gray-700">{sumAmount.toLocaleString('en-US')} đ</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 text-[11px]">
                    <span>Thuế VAT:</span>
                    <select
                      value={vat}
                      onChange={e => setVat(e.target.value)}
                      className="border rounded px-1 py-0.5 text-[10px] bg-white font-bold"
                    >
                      <option value="0">0%</option>
                      <option value="8">8%</option>
                      <option value="10">10%</option>
                    </select>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-200 font-bold">
                    <span className="text-gray-900">Tổng thanh toán:</span>
                    <span className="text-red-600 font-black">{totalPayment.toLocaleString('en-US')} VNĐ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                KHỐI 3: HIỆN TRƯỜNG SỰ CỐ (HÌNH ẢNH)
               ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl p-3.5 border border-gray-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center text-[10px] font-black">
                    3
                  </div>
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight">
                    Hiện trường sự cố (Hình ảnh)
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Tối đa 4 ảnh</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {photos.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-vetc-green hover:bg-green-50/50 flex flex-col items-center justify-center text-gray-400 hover:text-[#00A859] transition-all"
                  >
                    <Camera size={18} />
                    <span className="text-[9px] font-bold mt-1">Chụp ảnh</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Mobile Sticky Bottom Action Bar ─── */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-3.5 border-t border-gray-200 shadow-xl flex items-center justify-between z-20">
            <div className="flex flex-col text-left">
              <span className="text-[9px] text-gray-400 font-semibold uppercase">Tổng thanh toán:</span>
              <span className="text-sm font-black text-red-600 leading-none">
                {totalPayment.toLocaleString('en-US')} đ
              </span>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="bg-[#00A859] hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all uppercase tracking-wide disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <span>{selfAssign ? 'Tạo & Nhận việc ngay' : 'Tạo đơn (Gửi trạm)'}</span>
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Home Bar indicator (Phone mode only) */}
        {viewMode === 'phone' && (
          <div className="w-32 h-1 bg-slate-500 rounded-full mx-auto mt-2 opacity-60"></div>
        )}
      </div>

      {/* ─── Modal Thêm dịch vụ thực tế (Mobile Friendly Bottom Sheet) ─── */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border-t-4 border-vetc-green text-left">
            <div className="bg-vetc-green p-3.5 text-white flex items-center justify-between">
              <span className="text-xs font-bold uppercase">Chọn dịch vụ thực tế</span>
              <button type="button" onClick={() => setIsServiceModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-3 overflow-y-auto custom-scrollbar space-y-1.5">
              {QUICK_SERVICES.map(s => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => handleAddActualService(s.name, s.price)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-vetc-green hover:bg-green-50/40 text-left transition-all"
                >
                  <span className="text-xs font-bold text-gray-800">{s.name}</span>
                  <span className="text-xs font-black text-blue-600">{s.price} đ</span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t bg-gray-50 text-right">
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="px-4 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Cảnh báo đơn trùng (BR-04) ─── */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border-t-4 border-amber-500 text-left p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-sm text-gray-900">Xác nhận tạo đơn trùng</h3>
            </div>
            <p className="text-xs text-gray-600">
              Biển số <strong>{plate}</strong> đã có đơn <strong>{duplicateInfo.code}</strong> đang xử lý lúc {duplicateInfo.time}.
            </p>
            <div className="my-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-gray-700 space-y-0.5">
              <div>Trạng thái: <strong className="text-blue-700">{duplicateInfo.status}</strong></div>
              <div>Trạm: <span>{duplicateInfo.station}</span></div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setIsDuplicateDismissed(true);
                  handleSubmit(true);
                }}
                className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
              >
                Vẫn tạo đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Tạo đơn thành công ─── */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-5 border-t-4 border-[#00A859]">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-base font-black text-gray-900">
              {selfAssign ? 'Tạo đơn & Tự nhận việc thành công!' : 'Tạo đơn cứu hộ thành công!'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Đơn đã được ghi nhận vào hệ thống VETC Fleet:</p>
            <div className="my-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="font-mono font-black text-emerald-800 text-sm">{createdOrderCode}</span>
              <div className="text-[10px] text-emerald-700 mt-0.5">
                {selfAssign ? 'Trạng thái: ACCEPTED (Đang di chuyển)' : 'Trạng thái: ASSIGNING (Chờ điều phối)'}
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/station/management');
                }}
                className="flex-1 px-3 py-2 bg-vetc-green text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xem danh sách
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  handleFillSample();
                }}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-xl text-xs font-bold"
              >
                Tạo đơn khác
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Map Modal ─── */}
      <MapSelectionModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={(addr, coords) => {
          if (mapTarget === 'incident') {
            setMapAddress(addr);
            setMapCoords(coords);
          } else {
            setTowDestination(addr);
          }
          setIsMapModalOpen(false);
        }}
        initialAddress={mapTarget === 'incident' ? mapAddress : towDestination}
        initialCoords={mapCoords}
        title={mapTarget === 'incident' ? 'Chọn vị trí sự cố trên bản đồ' : 'Chọn điểm kéo xe về'}
      />
    </div>
  );
};

export default AppQuickCreateOrder;
