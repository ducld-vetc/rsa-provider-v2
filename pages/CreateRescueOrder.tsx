import React, {useEffect, useState} from 'react';
import {
  Building2,
  Calendar,
  ChevronRight,
  Copy,
  FileQuestion,
  Hash,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  Truck,
  User,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import {FormData, OrderHistory} from '../types';
import ImageUploadSection from '../shared/ImageUploadSection';
import ServiceSelectionField from '../shared/ServiceSelectionField';
import AISuggestionSection from '../shared/AISuggestionSection';
import MapSelectionModal from '../shared/MapSelectionModal';
import RescueHistoryModal from '../shared/RescueHistoryModal';
import UsageHistoryModal, {
  DEFAULT_PACKAGE_ORDERS,
  hasOrderCreatedToday,
} from '../shared/UsageHistoryModal';
import DuplicateRescueWarningModal from '../shared/DuplicateRescueWarningModal';
import PriorityCustomerBadge from '../shared/PriorityCustomerBadge';
import { FloodWarningBadge } from '../shared/OrderAlertBadges';
import { isPriorityCustomerPhone, normalizePhone } from '../shared/priorityCustomer';
import {analyzeIncident} from '../data/aiDataMock';
import VehicleInfoLookupModal from '../shared/VehicleInfoLookupModal';
import { VehicleRescuePackage, VehicleSearchResult } from '../shared/VehiclePlateSearchModal';
import WorkshopSelect from '../shared/WorkshopSelect';

interface CreateRescueOrderProps {
  data: FormData;
  onNext: () => void;
  onUpdateCustomer: (updates: Partial<FormData['customer']>) => void;
  onUpdateAssistance: (updates: Partial<FormData['assistance']>) => void;
  onUpdateService: (updates: Partial<FormData['service']>) => void;
  onUpdatePricing?: (updates: Partial<FormData['pricing']>) => void;
  role?: 'OSA' | 'CSKH' | 'STATION' | 'DRIVER';
}

const MOCK_HISTORY_DATA: OrderHistory[] = DEFAULT_PACKAGE_ORDERS;

const Label = ({ children, required = false }: { children?: React.ReactNode, required?: boolean }) => (
    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center">
      {children} {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const CreateRescueOrder: React.FC<CreateRescueOrderProps> = ({ data, onNext, onUpdateCustomer, onUpdateAssistance, onUpdateService, onUpdatePricing, role = 'CSKH' }) => {
  const [selectedServices, setSelectedServices] = useState<string[]>(data.service.serviceIds);
  const [description, setDescription] = useState(data.service.description);
  const [note, setNote] = useState(data.assistance.note);
  const [isSearching, setIsSearching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentHistory, setCurrentHistory] = useState<OrderHistory[]>([]);
  const [searchPlate, setSearchPlate] = useState(data.customer.plate);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isAiApplied, setIsAiApplied] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  // Contact
  const [customerContact, setCustomerContact] = useState('');
  // Duplicate rescue warning modal
  const [isDuplicateWarningOpen, setIsDuplicateWarningOpen] = useState(false);
  const [phoneContact, setPhoneContact] = useState('');
  const [priorityPhoneFromSearch, setPriorityPhoneFromSearch] = useState<string | null>(null);
  const [workshopStation, setWorkshopStation] = useState('');
  const [towingDestination, setTowingDestination] = useState('');
  const [towingLat, setTowingLat] = useState('');
  const [towingLng, setTowingLng] = useState('');
  const [estimatedDistance, setEstimatedDistance] = useState('');
  const [isVehicleLookupOpen, setIsVehicleLookupOpen] = useState(false);
  const [vehicleLookupMode, setVehicleLookupMode] = useState<'plate' | 'vin' | 'auto'>('auto');
  const [vehicleLookupQuery, setVehicleLookupQuery] = useState('');
  const [vehicleType, setVehicleType] = useState('Xe chở người');
  const [sceneImages, setSceneImages] = useState<string[]>([]);

  const openVehicleLookup = (mode: 'plate' | 'vin') => {
    const q = mode === 'plate' ? searchPlate : data.customer.vin;
    setVehicleLookupMode(mode);
    setVehicleLookupQuery(q);
    setIsVehicleLookupOpen(true);
  };

  const handleApplyVehicleInfo = (
    vehicle: VehicleSearchResult,
    selectedPackage: VehicleRescuePackage | null
  ) => {
    setSearchPlate(vehicle.plate);
    const packageName = selectedPackage
      ? selectedPackage.status === 'none' || selectedPackage.name === 'Không có'
        ? 'Không có'
        : selectedPackage.name
      : data.customer.servicePackage;
    onUpdateCustomer({
      plate: vehicle.plate,
      vin: vehicle.vin,
      vehicleBrand: vehicle.brand,
      vehicleLine: vehicle.model,
      payload: vehicle.loadTons,
      seats: String(vehicle.seats),
      name: vehicle.owner.name || data.customer.name,
      phone: vehicle.owner.phone || data.customer.phone,
      servicePackage: packageName,
    });
    if (vehicle.owner.name) {
      setCustomerContact(vehicle.owner.name);
      onUpdateAssistance({ rescueName: vehicle.owner.name });
    }
    if (vehicle.owner.phone) {
      setPhoneContact(vehicle.owner.phone);
      onUpdateAssistance({ rescuePhone: vehicle.owner.phone });
    }
    setVehicleType(vehicle.vehicleType);
    const imagesToFill = [
      ...(vehicle.vehicleImages ?? (vehicle.imageUrl ? [vehicle.imageUrl] : [])),
      ...(vehicle.documentImages ?? []),
    ].slice(0, 4);
    if (imagesToFill.length > 0) {
      setSceneImages(imagesToFill);
    }
    setIsVehicleLookupOpen(false);
  };

  const ENTERPRISE_OPTIONS = [
    { value: '', label: '-- Chọn doanh nghiệp --' },
    { value: 'VETC', label: 'VETC' },
    { value: 'FORD', label: 'Ford Việt Nam' },
    { value: 'TOYOTA', label: 'Toyota Việt Nam' },
    { value: 'HONDA', label: 'Honda Việt Nam' },
  ];
  const [selectedEnterprise, setSelectedEnterprise] = useState('');
  const [hasGuarantee, setHasGuarantee] = useState<'yes' | 'no'>('no');
  const [guaranteeNote, setGuaranteeNote] = useState('');

  const handleEnterpriseChange = (value: string) => {
    setSelectedEnterprise(value);
    if (!value) {
      setHasGuarantee('no');
      setGuaranteeNote('');
    }
  };

  // AI Analysis logic
  useEffect(() => {
    if (!description || description.trim().length < 5) {
      if (isAiApplied) setIsAiApplied(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsAiProcessing(true);
      setTimeout(() => {
        const suggestion = analyzeIncident(description);
        
        // Format services list
        const servicesList = suggestion.recommendedServices
          .map(s => `- ${s.name}: ${s.price} VNĐ`)
          .join('\n');

        const formattedNote = `[PHÂN TÍCH AI]: ${suggestion.analysis}\n\n[DỊCH VỤ ĐỀ XUẤT]:\n${servicesList}\n\n[HƯỚNG DẪN XỬ LÝ]: ${suggestion.solutionSteps}`;
        
        setNote(formattedNote);
        onUpdateAssistance({ note: formattedNote });
        setIsAiProcessing(false);
        setIsAiApplied(true);
      }, 600);
    }, 1000);
    return () => clearTimeout(timer);
  }, [description]);

  const simulateSearch = (type: 'phone' | 'plate', phoneOverride?: string) => {
    setIsSearching(true);
    setShowHistory(false);
    setIsHistoryModalOpen(false);
    if (type !== 'phone') {
      setPriorityPhoneFromSearch(null);
    }
    setTimeout(() => {
      const rawValue = type === 'plate' ? searchPlate : (phoneOverride ?? data.customer.phone);
      const normalizedValue = rawValue.toUpperCase().replace(/\W/g, '');
      const isMockPlate =
        normalizedValue === '38A58531' || normalizedValue === '38A58532';
      const isMockLegacyPhone = normalizedValue === '0960123123';
      const isPriorityPhone = type === 'phone' && isPriorityCustomerPhone(rawValue);

      if (isPriorityPhone) {
        const customerName =
          normalizePhone(rawValue) === '0967419411' ? 'Vương Đăng Minh' : 'NGUYỄN VĂN A';
        setPriorityPhoneFromSearch(rawValue);
        setCurrentHistory(MOCK_HISTORY_DATA);
        onUpdateCustomer({
          name: customerName,
          phone: rawValue,
          servicePackage: 'Gói cơ bản 10 dịch vụ',
          plate: type === 'plate' ? rawValue : '29E366666',
          vin: 'R7C2X9M4A8',
          vehicleBrand: 'TOYOTA',
          vehicleLine: 'Corolla Cross',
          payload: '1.4',
          seats: '5',
        });
        onUpdateAssistance({ rescueName: customerName, rescuePhone: rawValue });
        setCustomerContact(customerName);
        setPhoneContact(rawValue);
        if (type === 'plate') {
          setSearchPlate(rawValue);
        }
      } else if (isMockPlate || isMockLegacyPhone) {
        setPriorityPhoneFromSearch(null);
        setCurrentHistory(MOCK_HISTORY_DATA);
        onUpdateCustomer({
          name: 'TRAN DINH LAN ANH',
          phone: type === 'phone' ? rawValue : '0960123123',
          servicePackage: 'Gói cơ bản 10 dịch vụ',
          plate: type === 'plate' ? rawValue : '38A58531',
          vin: 'R7C2X9M4A8',
          vehicleBrand: 'TOYOTA',
          vehicleLine: 'Corolla Cross',
          payload: '1.4',
          seats: '5',
        });
        onUpdateAssistance({
          rescueName: 'TRAN DINH LAN ANH',
          rescuePhone: type === 'phone' ? rawValue : '0960123123',
        });
      } else {
        setPriorityPhoneFromSearch(null);
        setCurrentHistory([]);
        onUpdateCustomer({
          name: '',
          servicePackage: 'Không có',
          plate: type === 'plate' ? rawValue : data.customer.plate,
          phone: type === 'phone' ? rawValue : data.customer.phone,
          vin: '',
          vehicleBrand: '',
          vehicleLine: '',
          payload: '',
          seats: '',
        });
        onUpdateAssistance({
          rescueName: '',
          rescuePhone: type === 'phone' ? rawValue : data.customer.phone,
        });
      }
      setShowHistory(true);
      setIsSearching(false);
    }, 800);
  };

  const syncCustomerContact = () => {
    onUpdateCustomer({ name: customerContact, phone: phoneContact });
  }

  // Logic to slice history - Max 4 items on main screen
  const visibleHistory = currentHistory.slice(0, 4);

  /** Đơn gắn gói để mở Chi tiết gói + cảnh báo trong ngày */
  const packageOrders: OrderHistory[] =
    currentHistory.length > 0
      ? currentHistory
      : data.customer.servicePackage !== 'Không có'
        ? MOCK_HISTORY_DATA
        : [];
  const hasOrderToday = hasOrderCreatedToday(packageOrders);

  const SectionHeader = ({ title, number, icon, trailing }: { title: string, number: number, icon?: React.ReactNode, trailing?: React.ReactNode }) => (
      <div className="bg-vetc-green text-white px-4 py-2 rounded-t-lg font-bold text-sm flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="bg-white/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">{number}</span>
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {trailing}
          {icon && <div className="opacity-80">{icon}</div>}
        </div>
      </div>
  );

  const handleConfirmLocation = (address: string, coords: string) => {
    const parts = coords.split(',');
    const lat = parts[0] ? parts[0].trim() : '';
    const lng = parts[1] ? parts[1].trim() : '';
    
    onUpdateAssistance({
      address: address,
      lat: lat,
      lng: lng
    });
    setIsMapModalOpen(false);
  };

    // Location type state
  const [locationType, setLocationType] = useState('Đô thị');
  const [severityLevel, setSeverityLevel] = useState('Nhẹ');

  const isRequestPhonePriority = isPriorityCustomerPhone(phoneContact);
  const isContactPhonePriority = isPriorityCustomerPhone(data.customer.phone);
  const showPriorityCustomer =
    priorityPhoneFromSearch !== null || isRequestPhonePriority || isContactPhonePriority;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 space-y-6 pb-24">
        {/* CỘT CHÍNH - FULL WIDTH */}
        <div className="space-y-6">
            
            {/* THÔNG TIN SỰ CỐ */}
            <div className="border rounded-lg shadow-sm bg-white text-left">
              <SectionHeader
                title="Thông tin sự cố"
                number={1}
                icon={<User size={16} />}
                trailing={showPriorityCustomer ? <PriorityCustomerBadge /> : undefined}
              />
              <div className="p-4 space-y-4">
                {/* Name and phone */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-12 gap-y-4">
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Người yêu cầu <span className="text-red-500">*</span></label>
                    <input 
                      value={customerContact} 
                      onChange={(e) => setCustomerContact(e.target.value)} 
                      onBlur={() => {
                        if (!data.customer.name) {
                          onUpdateCustomer({ name: customerContact });
                        }
                      }}
                      className="flex-1 border rounded px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 flex-wrap">
                      SĐT yêu cầu <span className="text-red-500">*</span>
                      {isRequestPhonePriority && <PriorityCustomerBadge compact />}
                    </label>
                    <div className="relative flex-1">
                      <input
                        value={phoneContact}
                        onChange={(e) => setPhoneContact(e.target.value)}
                        onBlur={() => {
                          if (!data.customer.phone) {
                            onUpdateCustomer({ phone: phoneContact });
                          }
                        }}
                        className="w-full border rounded px-3 py-1.5 text-xs pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => simulateSearch('phone', phoneContact || data.customer.phone)}
                        className={`absolute right-2 top-1.5 text-gray-400 hover:text-vetc-green ${isSearching ? 'animate-spin' : ''}`}
                        title="Tra cứu theo SĐT"
                      >
                        <Search size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Người liên hệ <span className="text-red-500">*</span></label>
                    <input value={data.customer.name} onChange={(e) => onUpdateCustomer({ name: e.target.value })} className="flex-1 border rounded px-3 py-1.5 text-xs" />
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 flex-wrap">
                      SĐT liên hệ <span className="text-red-500">*</span>
                      {isContactPhonePriority && <PriorityCustomerBadge compact />}
                    </label>
                    <div className="relative flex-1">
                      <input
                        value={data.customer.phone}
                        onChange={(e) => onUpdateCustomer({ phone: e.target.value })}
                        className="w-full border rounded px-3 py-1.5 text-xs font-bold pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => simulateSearch('phone')}
                        className={`absolute right-2 top-1.5 text-gray-400 hover:text-vetc-green ${isSearching ? 'animate-spin' : ''}`}
                        title="Tra cứu theo SĐT"
                      >
                        <Search size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {priorityPhoneFromSearch && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                    <PriorityCustomerBadge />
                    <p className="text-[11px] text-amber-900 font-medium">
                      Số <span className="font-black">{priorityPhoneFromSearch}</span> thuộc danh sách khách hàng ưu tiên.
                    </p>
                  </div>
                )}
                {/* Doanh nghiệp & bảo lãnh */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-12 gap-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Doanh nghiệp</label>
                    <select
                      value={selectedEnterprise}
                      onChange={(e) => handleEnterpriseChange(e.target.value)}
                      className="flex-1 border rounded px-3 py-1.5 text-xs bg-white outline-none focus:border-vetc-green font-bold text-gray-700"
                    >
                      {ENTERPRISE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedEnterprise && (
                    <>
                      <div className="flex items-center">
                        <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Bảo lãnh</label>
                        <select
                          value={hasGuarantee}
                          onChange={(e) => setHasGuarantee(e.target.value as 'yes' | 'no')}
                          className="flex-1 border rounded px-3 py-1.5 text-xs bg-white outline-none focus:border-vetc-green font-bold text-gray-700"
                        >
                          <option value="no">Không</option>
                          <option value="yes">Có</option>
                        </select>
                      </div>
                      <div className="flex items-center md:col-span-2">
                        <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Ghi chú bảo lãnh</label>
                        <input
                          value={guaranteeNote}
                          onChange={(e) => setGuaranteeNote(e.target.value)}
                          placeholder="Nhập nội dung chi tiết bảo lãnh..."
                          className="flex-1 border rounded px-3 py-1.5 text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
                {/* Thông tin xe — dòng riêng */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-12 gap-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Biển số xe <span className="text-red-500">*</span></label>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <div className="relative flex-1 min-w-0">
                        <input
                          value={searchPlate}
                          onChange={(e) => setSearchPlate(e.target.value)}
                          className="w-full border rounded px-3 py-1.5 pr-8 text-xs font-bold uppercase"
                        />
                        <button
                          type="button"
                          onClick={() => simulateSearch('plate')}
                          className={`absolute right-2 top-1.5 text-gray-400 hover:text-vetc-green ${isSearching ? 'animate-spin' : ''}`}
                          title="Tìm theo BSX (gói / lịch sử)"
                        >
                          <Search size={14} />
                        </button>
                      </div>
                      <button
                        type="button"
                        title="Tra cứu thông tin xe theo BSX"
                        onClick={() => openVehicleLookup('plate')}
                        className="shrink-0 flex items-center gap-1 bg-white border border-vetc-green text-vetc-green px-2 py-1.5 rounded text-[10px] font-bold hover:bg-green-50 transition-all active:scale-95"
                      >
                        <Search size={12} />
                        Tra cứu
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Số khung (VIN)</label>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <div className="relative flex-1 min-w-0">
                        <input
                          value={data.customer.vin}
                          onChange={(e) => onUpdateCustomer({ vin: e.target.value })}
                          className="w-full border rounded px-3 py-1.5 pr-7 text-xs font-bold"
                        />
                        <Hash size={12} className="absolute right-2 top-2 text-gray-300" />
                      </div>
                      <button
                        type="button"
                        title="Tra cứu thông tin xe theo số khung"
                        onClick={() => openVehicleLookup('vin')}
                        className="shrink-0 flex items-center gap-1 bg-white border border-vetc-green text-vetc-green px-2 py-1.5 rounded text-[10px] font-bold hover:bg-green-50 transition-all active:scale-95"
                      >
                        <Search size={12} />
                        Tra cứu
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Hãng xe</label>
                    <div className="relative flex-1">
                      <input value={data.customer.vehicleBrand} onChange={(e) => onUpdateCustomer({ vehicleBrand: e.target.value })} className="flex-1 border rounded px-3 py-1.5 text-xs font-bold bg-gray-50" placeholder="TOYOTA" />
                      <Building2 size={12} className="absolute right-2 top-2 text-gray-300" />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Dòng xe</label>
                    <div className="relative flex-1">
                      <input value={data.customer.vehicleLine} onChange={(e) => onUpdateCustomer({ vehicleLine: e.target.value })} className="flex-1 border rounded px-3 py-1.5 text-xs font-bold bg-gray-50" placeholder="Corolla Cross" />
                      <Truck size={12} className="absolute right-2 top-2 text-gray-300" />
                    </div>
                  </div>
                </div>
                {/* Car info 2 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-12 gap-y-4">
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Trọng tải</label>
                    <div className="relative flex-1">
                      <input value={data.customer.payload} onChange={(e) => onUpdateCustomer({ payload: e.target.value })} className="flex-1 border rounded px-3 py-1.5 text-xs font-bold" />
                      <span className="absolute right-2 top-1.5 text-[9px] text-gray-400 font-bold">Tấn</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Số chỗ</label>
                    <div className="relative flex-1">
                      <input value={data.customer.seats} onChange={(e) => onUpdateCustomer({ seats: e.target.value })} className="flex-1 border rounded px-3 py-1.5 text-xs font-bold" />
                      <span className="absolute right-2 top-1.5 text-[9px] text-gray-400 font-bold">Chỗ</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Loại xe</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-48 border rounded px-3 py-1.5 text-xs bg-white outline-none focus:border-vetc-green font-bold text-gray-700"
                    >
                      <option value="Xe chở hàng">Xe chở hàng</option>
                      <option value="Xe chở người">Xe chở người</option>
                    </select>
                  </div>
                </div>
                {/* Package info */}
                <div className="pb-4 border-b border-gray-100 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-4">
                    <div className="flex items-center">
                      <label className="w-40 text-[10px] font-bold text-gray-500 uppercase">Gói cứu hộ sử dụng</label>
                      <div className="flex-1 flex items-center space-x-2">
                        <div className={`flex-1 border rounded px-3 py-1.5 text-xs font-bold flex items-center justify-between ${data.customer.servicePackage === 'Không có' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                          <span>{data.customer.servicePackage}</span>
                          {data.customer.servicePackage === 'Không có' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </div>
                        <button onClick={() => setIsPackageModalOpen(true)} className="text-[10px] text-blue-600 font-bold underline whitespace-nowrap">Chi tiết gói</button>
                      </div>
                    </div>
                  </div>
                  {hasOrderToday && (
                    <div className="flex items-center gap-1.5 text-amber-700 pl-0 md:pl-40">
                      <AlertTriangle size={13} className="shrink-0" />
                      <span className="text-[11px] font-bold">Đã phát sinh đơn trong ngày</span>
                    </div>
                  )}
                </div>
                {/* Location info */}
                <div className="flex items-center space-x-2">
                  <label className="w-36 text-[10px] font-bold text-gray-500 uppercase shrink-0">Vị trí sự cố <span className="text-red-500">*</span></label>
                  <div className="flex-1 flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-1">
                    <div className="relative w-[600px] shrink-0">
                      <input 
                        value={data.assistance.address} 
                        onChange={(e) => onUpdateAssistance({ address: e.target.value })} 
                        className="w-full border rounded px-2 py-1.5 pr-24 text-xs font-medium"
                        placeholder="Vị trí sự cố"
                      />
                      <FloodWarningBadge compact className="absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                    <button onClick={() => setIsMapModalOpen(true)} className="bg-vetc-green text-white px-4 py-1.5 rounded text-[11px] font-bold flex items-center justify-center hover:bg-green-700 transition-all active:scale-95 shadow-sm shrink-0" title="Bản đồ">
                      <MapPin size={14} />
                      <span>&nbsp;Bản đồ</span>
                    </button>
                    <div className="flex items-center space-x-1 shrink-0">
                      <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Lat</label>
                      <input 
                        value={data.assistance.lat} 
                        onChange={(e) => onUpdateAssistance({ lat: e.target.value })}
                        className="w-20 border rounded px-1 py-1.5 text-[10px] font-medium shrink-0 text-center" 
                        placeholder="Vĩ độ" 
                      />
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Long</label>
                      <input 
                        value={data.assistance.lng} 
                        onChange={(e) => onUpdateAssistance({ lng: e.target.value })}
                        className="w-20 border rounded px-1 py-1.5 text-[10px] font-medium shrink-0 text-center" 
                        placeholder="Kinh độ" 
                      />
                    </div>
                    <button
                      onClick={() => {
                        const coords = `${data.assistance.lat}, ${data.assistance.lng}`;
                        navigator.clipboard.writeText(coords);
                      }}
                      className="text-gray-400 hover:text-vetc-green transition-colors shrink-0"
                      title="Copy tọa độ"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Điểm xưởng */}
                <div className="flex items-center space-x-2">
                  <label className="w-36 text-[10px] font-bold text-gray-500 uppercase shrink-0">Điểm xưởng</label>
                  <div className="w-[280px] shrink-0">
                    <WorkshopSelect
                      value={workshopStation}
                      onChange={setWorkshopStation}
                      defaultAddress={towingDestination || data.assistance.address}
                      defaultLat={towingLat || data.assistance.lat}
                      defaultLng={towingLng || data.assistance.lng}
                      className="h-[31px] px-2 text-xs"
                    />
                  </div>
                </div>

                {/* Điểm kéo về */}
                <div className="flex items-center space-x-2">
                  <label className="w-36 text-[10px] font-bold text-gray-500 uppercase shrink-0">Điểm kéo về</label>
                  <div className="flex-1 flex items-center space-x-2 overflow-x-auto custom-scrollbar pb-1">
                    <div className="relative w-[600px] shrink-0">
                      <input
                          value={towingDestination}
                          onChange={(e) => setTowingDestination(e.target.value)}
                          className="w-full border rounded px-2 py-1.5 pr-24 text-xs font-medium"
                          placeholder="Địa chỉ điểm kéo về"
                      />
                      <FloodWarningBadge compact className="absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                    <button onClick={() => setIsMapModalOpen(true)} className="bg-vetc-green text-white px-4 py-1.5 rounded text-[11px] font-bold flex items-center justify-center hover:bg-green-700 transition-all active:scale-95 shadow-sm shrink-0" title="Bản đồ">
                      <MapPin size={14} />
                      <span>&nbsp;Bản đồ</span>
                    </button>
                    <div className="flex items-center space-x-1 shrink-0">
                      <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Lat</label>
                      <input
                        value={towingLat}
                        onChange={(e) => setTowingLat(e.target.value)}
                        className="w-20 border rounded px-1 py-1.5 text-[10px] font-medium shrink-0 text-center"
                        placeholder="Vĩ độ"
                      />
                    </div>
                    <div className="flex items-center space-x-1 shrink-0">
                      <label className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Long</label>
                      <input
                        value={towingLng}
                        onChange={(e) => setTowingLng(e.target.value)}
                        className="w-20 border rounded px-1 py-1.5 text-[10px] font-medium shrink-0 text-center"
                        placeholder="Kinh độ"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const coords = `${towingLat}, ${towingLng}`;
                        navigator.clipboard.writeText(coords);
                      }}
                      className="text-gray-400 hover:text-vetc-green transition-colors shrink-0"
                      title="Copy tọa độ"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Khoảng cách (Ước tính) */}
                <div className="flex items-center space-x-2">
                  <label className="w-36 text-[10px] font-bold text-gray-500 uppercase shrink-0">Khoảng cách<br/>(Ước tính)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      value={estimatedDistance}
                      onChange={(e) => setEstimatedDistance(e.target.value)}
                      className="w-48 border rounded px-3 py-1.5 text-xs font-medium outline-none focus:border-vetc-green bg-white"
                      placeholder="Khoảng cách (Ước tính)"
                    />
                    <span className="text-[10px] text-gray-500 font-bold uppercase">KM</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Loại vị trí</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {['Vùng núi', 'Cao tốc', 'Đô thị'].map((type) => (
                          <button
                              key={type}
                              onClick={() => setLocationType(type)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  locationType === type
                                      ? 'bg-vetc-green text-white border-vetc-green shadow-md'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-vetc-green hover:bg-green-50'
                              } ${'active:scale-95'}`}
                          >
                            {type}
                          </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <label className="w-40 text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Mức độ nghiêm trọng</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {[
                        { label: 'Nhẹ', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300', activeColor: 'bg-green-600 text-white border-green-600 shadow-md' },
                        { label: 'Mắc kẹt', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-md' },
                        { label: 'Nguy hiểm', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300', activeColor: 'bg-red-600 text-white border-red-600 shadow-md' }
                      ].map((level) => (
                          <button
                              key={level.label}
                              onClick={() => setSeverityLevel(level.label)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  severityLevel === level.label
                                      ? level.activeColor
                                      : level.color
                              } ${'active:scale-95'}`}
                          >
                            {level.label}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Added sections from Right Column */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                    {/* Mô tả chi tiết */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Mô tả chi tiết tình trạng sự cố <span className="text-red-500">*</span></label>
                          <AISuggestionSection description={description} onApply={(s) => { setDescription(s.analysis); onUpdateService({ description: s.analysis }); }} variant="ghost" />
                      </div>
                      <div className="relative">
                        <textarea rows={5} value={description} onChange={(e) => { setDescription(e.target.value); onUpdateService({ description: e.target.value }); }} placeholder="Mô tả cụ thể sự cố xe..." className="w-full border rounded-lg px-3 py-2 text-xs min-h-[80px] outline-none focus:border-indigo-500 transition-all text-left" />
                        {isAiProcessing && <div className="absolute bottom-2 right-2 flex items-center space-x-1 text-[9px] text-indigo-500 font-black uppercase"><Loader2 size={12} className="animate-spin" /><span>AI Analyzing...</span></div>}
                      </div>
                    </div>

                    {/* Services rescue */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block">Dịch vụ cứu hộ</label>
                        <div className="flex items-center space-x-6">
                          {data.customer.servicePackage === 'Không có' && (
                            <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black border border-red-100 italic shadow-sm">
                              Khách hàng chưa mua gói dịch vụ
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-500">Tổng cộng:</span>
                            <div className="bg-vetc-green text-white px-3 py-1 rounded-full text-[10px] font-black shadow-md flex items-center space-x-1">
                              <span>{selectedServices.length}</span>
                              <span className="text-[9px] font-bold uppercase">dịch vụ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <ServiceSelectionField selectedServices={selectedServices} onUpdate={(val) => { setSelectedServices(val); onUpdateService({ serviceIds: val }); }} showTitle={false} />
                    </div>

                    {/* Image */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-3">Hình ảnh hiện trường</label>
                      <ImageUploadSection onlyScene={true} sceneImages={sceneImages} />
                    </div>

                    {/* Note for OSA */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center mb-2"><MessageSquare size={14} className="mr-1.5 text-amber-600" /> Ghi chú điều phối (Auto-AI)</label>
                      <div className="relative">
                          {isAiApplied && (
                            <div className="absolute top-3 right-3 flex items-center text-amber-600 font-black uppercase tracking-tighter bg-amber-100/50 px-2 py-1 rounded pointer-events-none">
                              <Sparkles size={10} className="mr-1.5 animate-pulse" /> 
                              <span className="text-[9px]">RSA-AI</span>
                            </div>
                          )}
                          <textarea 
                              value={note}
                              onChange={(e) => {
                                  setNote(e.target.value);
                                  onUpdateAssistance({ note: e.target.value });
                              }}
                              placeholder="Thông tin điều phối sẽ hiển thị khi AI phân tích hoặc nhập thủ công..."
                              className={`w-full rounded-xl border-2 p-3 min-h-[100px] text-[11px] font-bold leading-relaxed transition-all outline-none resize-y ${
                                  isAiApplied 
                                    ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-inner focus:border-amber-500' 
                                    : 'border-gray-200 text-gray-700 focus:border-vetc-green focus:bg-white'
                                }`}
                              rows={8}
                          />
                      </div>
                    </div>

                </div>
              </div>
            </div>

            {/* History Rescue */}
            <div className="border rounded-lg shadow-sm bg-white text-left">
              <SectionHeader title="Lịch sử cứu hộ" number={2} icon={<History size={16} />}/>
              <div className="p-4">
                  <div className="flex items-center justify-end mb-3">
                    {currentHistory.length > 4 && (
                        <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                        >
                          <span>Xem toàn bộ ({currentHistory.length})</span>
                          <ChevronRight size={12} />
                        </button>
                    )}
                  </div>

                  <div className="min-h-[60px]">
                    {showHistory ? (
                        currentHistory.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {visibleHistory.map(h => (
                                  <div key={h.id} className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex flex-col justify-center hover:bg-gray-100 transition-colors cursor-default group">
                                    <div className="flex items-center justify-between mb-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${h.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {h.status === 'Completed' ? 'HOÀN THÀNH' : 'ĐÃ HỦY'}
                                  </span>
                                      <div className="flex items-center text-[9px] text-gray-400 font-bold">
                                        <Calendar size={10} className="mr-1" />
                                        <span>{h.date}</span>
                                      </div>
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-700 truncate" title={h.service}>{h.service}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5 group-hover:text-gray-500 transition-colors">#{h.id}</p>
                                  </div>
                              ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center space-x-2 py-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                              <FileQuestion size={16} className="text-gray-300" />
                              <p className="text-[11px] text-gray-400 font-medium">Khách hàng chưa có lịch sử cứu hộ</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-4 text-gray-300 italic text-[10px] font-bold uppercase flex items-center justify-center space-x-2 bg-gray-50/30 rounded-lg border border-transparent">
                          <Search size={14} className="opacity-50" />
                          <span>Tra cứu để xem lịch sử</span>
                        </div>
                    )}
                  </div>
              </div>
            </div>
        </div>
      </div>

      {/* Sticky Bottom Button Bar */}
      <div className="sticky bottom-[-24px] z-40 bg-white/95 backdrop-blur-md pt-4 pb-6 px-6 -mx-6 border-t flex justify-between items-center shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        {/*TODO for next phase*/}
        <div>
        {/*  {data.customer.servicePackage === 'Không có' && (*/}
        {/*    <div className="flex items-center space-x-4 animate-in fade-in slide-in-from-left-2 duration-300 bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm">*/}
        {/*      <label className="text-xs font-black text-red-600 uppercase tracking-wide whitespace-nowrap">Cọc tiền dự kiến</label>*/}
        {/*      <div className="relative w-48">*/}
        {/*        <input */}
        {/*          type="text" */}
        {/*          value={(data.service.deposit || 0).toLocaleString()} */}
        {/*          onChange={(e) => onUpdateService({ deposit: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} */}
        {/*          className="w-full border-2 border-red-200 rounded-lg pl-3 pr-10 py-2.5 text-base text-right font-black text-red-700 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none shadow-inner bg-white" */}
        {/*        />*/}
        {/*        <span className="absolute right-3 top-3 text-[10px] text-red-400 font-black">VNĐ</span>*/}
        {/*      </div>*/}
        {/*    </div>*/}
        {/*  )}*/}
        </div>
        <button 
          onClick={() => {
            if (data.customer.phone && data.customer.phone !== '0960123123') {
              setIsDuplicateWarningOpen(true);
            } else {
              onNext();
            }
          }} 
          disabled={selectedServices.length === 0} 
          className="bg-vetc-green text-white px-14 py-3 rounded-xl font-bold flex items-center space-x-2 shadow-lg hover:bg-green-700 active:scale-95 disabled:opacity-50 transition-all uppercase tracking-wide"
        >
          <span>Tạo đơn cứu hộ</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* MODAL SỐ LẦN SỬ DỤNG - COMPONENT */}
      <UsageHistoryModal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        currentPackage={data.customer.servicePackage}
        customerPlate={data.customer.plate}
        orders={packageOrders}
      />

      {/* MODAL BẢN ĐỒ */}
      <MapSelectionModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirm={handleConfirmLocation}
        initialAddress={data.assistance.address}
        initialCoords={`${data.assistance.lat}, ${data.assistance.lng}`}
      />

      {/* MODAL LỊCH SỬ CỨU HỘ */}
      <RescueHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        history={currentHistory}
        customerName={data.customer.name}
        customerPlate={data.customer.plate}
      />

      {/* MODAL CẢNH BÁO TRÙNG YÊU CẦU CỨU HỘ */}
      <DuplicateRescueWarningModal
        isOpen={isDuplicateWarningOpen}
        onClose={() => setIsDuplicateWarningOpen(false)}
        onConfirm={() => {
          setIsDuplicateWarningOpen(false);
          onNext();
        }}
        rescueOrderCode="RS12602020002"
        plate={data.customer.plate}
        address={data.assistance.address}
      />

      <VehicleInfoLookupModal
        isOpen={isVehicleLookupOpen}
        initialQuery={vehicleLookupQuery}
        searchMode={vehicleLookupMode}
        applyPackage
        onClose={() => setIsVehicleLookupOpen(false)}
        onApply={handleApplyVehicleInfo}
      />
    </div>
  );
};

export default CreateRescueOrder;
