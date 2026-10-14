import React, { useState, useEffect } from 'react';
import { Home, ChevronRight } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Step, FormData, RescueUnit, MonitoringOrder } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StepperOSA from './components/StepperOSA';
import StepperCSKH from './components/StepperCSKH';
import CreateRescueOrder from './pages/CreateRescueOrder';
import FindRescueStation from './pages/FindRescueStation';
import RescueConfirmation from './pages/RescueConfirmation';
import CreateRescueOrderComplete from './pages/CreateRescueOrderComplete';
import Searching from './pages/Searching';
import RescueList from './pages/RescueList';
import PaymentQR from './pages/PaymentQR';
import Supporting from './pages/Supporting';
import OrderManagement from './pages/OrderManagement';
import GuestOrderDetails from './pages/GuestOrderDetails';
import type { OrderDetailsNavState } from './data/orderListDemoData';
import StationCreateOrder from './pages/StationCreateOrder';
import StationOrderDetail from './pages/StationOrderDetail';
import StationManagement from './pages/StationManagement';
import StaffManagement2 from './pages/StaffManagement2';
import RescueSupervision from './pages/RescueSupervision';
import RsaDashboardOverview from './pages/RsaDashboardOverview';
import PricingPolicyCreate from './pages/PricingPolicyCreate';
import BusinessManagement from './pages/BusinessManagement';
import BusinessForm from './pages/BusinessForm';
import PackagePurchaseManagement from './pages/PackagePurchaseManagement';
import PackageImportManagement from './pages/PackageImportManagement';
import PaymentRequestManagement from './pages/PaymentRequestManagement';
import PaymentRequestDetail from './pages/PaymentRequestDetail';
import LocationSearch, { LocationSearchPrefill } from './pages/LocationSearch';
import ShiftDefinitionManagement from './pages/ShiftDefinitionManagement';
import ShiftMonthlySchedule from './pages/ShiftMonthlySchedule';
import FloodZoneManagement from './pages/FloodZoneManagement';
import RescueFeeConfiguration from './pages/RescueFeeConfiguration';
import RescueFeeForm from './pages/RescueFeeForm';
import RescueFeeCriteriaManagement from './pages/RescueFeeCriteriaManagement';
import PartnerVehicleList from './pages/PartnerVehicleList';
import PartnerVehicleDetail from './pages/PartnerVehicleDetail';
import PartnerToolConfig from './pages/PartnerToolConfig';
import PartnerStaff from './pages/PartnerStaff';
import PartnerStaffDetail from './pages/PartnerStaffDetail';
import PartnerReports from './pages/PartnerReports';
import PartnerOrgConfig from './pages/PartnerOrgConfig';
import PartnerResourceBoard from './pages/PartnerResourceBoard';
import PartnerFleetCapacity from './pages/PartnerFleetCapacity';
import PartnerMaintenance from './pages/PartnerMaintenance';
import StationCoverageReport from './pages/station-coverage/StationCoverageReport';
import RescueProviderList from './pages/rescue-partner-admin/RescueProviderList';
import { RescueProviderCreate, RescueProviderEdit, RescueProviderView } from './pages/rescue-partner-admin/RescueProviderForm';
import RescueStationAdminList from './pages/rescue-partner-admin/RescueStationAdminList';
import { RescueStationAdminCreate, RescueStationAdminEdit, RescueStationAdminView } from './pages/rescue-partner-admin/RescueStationAdminForm';
import RescueServiceList from './pages/rescue-service/RescueServiceList';
import { RescueServiceCreate, RescueServiceEdit, RescueServiceView } from './pages/rescue-service/RescueServiceForm';
import RescuePackageList from './pages/rescue-package/RescuePackageList';
import { RescuePackageCreate, RescuePackageEdit, RescuePackageView } from './pages/rescue-package/RescuePackageForm';
import AppQuickCreateOrder from './pages/AppQuickCreateOrder';
import { ShiftConfigProvider } from './context/ShiftConfigContext';
import ErrorBoundary from './components/ErrorBoundary';

const initialData: FormData = {
  orderId: '',
  customer: {
    phone: '0967419411',
    plate: '38A58531',
    name: 'TRAN DINH LAN ANH',
    vin: 'R7C2X9M4A8',
    vehicleBrand: 'Toyota',
    vehicleLine: 'Corolla Cross',
    payload: '1.4',
    seats: '5',
    servicePackage: 'Gói cơ bản 10 dịch vụ'
  },
  assistance: {
    rescueName: 'TRAN DINH LAN ANH',
    rescuePhone: '0967419411',
    address: '20, Phố Hội Vũ, Khu phố cổ, Hà Nội, 11017, Việt Nam',
    lng: '105.8452',
    lat: '21.0285',
    city: 'Hà Nội',
    district: 'Quận Long Biên',
    ward: 'P.Long Biên',
    note: ''
  },
  service: {
    serviceIds: ['Xe hết pin', 'Kích bình ắc quy', 'Đâm, lật, tai nạn'],
    quantity: 1,
    description: '- Hiện tượng: Xe không đề được, đề yếu.\n' +
        '- Khả năng di chuyển: Không di chuyển được.\n' +
        '- Dấu hiệu bất thường: Không có mùi khét, không rò rỉ.\n' +
        '- Phán đoán nguyên nhân: chưa rõ.\n' +
        '- Thời điểm: Đỗ qua đêm, sáng ra không nổ.',
    deposit: 200000
  },
  station: {
    partner: 'CARPLA - CARPLA SERVICE',
    station: 'Carpla Service - CN Hà Nội',
    contact1: 'LÊ VŨ LONG - 1900998865',
    contact2: 'Mr. Hoàn - 936499296',
    address: 'Phường Việt Hưng, Hà Nội, 11810, Việt Nam',
    towingDestination: 'Phường Việt Hưng, Hà Nội, 11810, Việt Nam',
    vehicleType: '<= 1.4 tấn'
  },
  pricing: {
    estimatedPrice: '527,500',
    distance: 8,
    adjustments: []
  }
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<FormData>(initialData);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [lastDashboardStep, setLastDashboardStep] = useState<string | null>(null);
  const [role, setRole] = useState<'OSA' | 'ADMIN' | 'CSKH' | 'STATION' | 'DRIVER'>('CSKH');

  // Helper to map URL path to Step enum for Sidebar/Stepper compatibility
  const getStepFromPath = (path: string): Step => {
    if (path.includes('/app/quick-create') || path.includes('/partner/quick-order')) return Step.APP_QUICK_CREATE;
    if (path.includes('/admin/rescue-providers')) return Step.RESCUE_PROVIDER_MANAGEMENT;
    if (path.includes('/admin/rescue-stations')) return Step.RESCUE_STATION_ADMIN;
    if (path.includes('/admin/rescue-services')) return Step.SERVICE_MANAGEMENT;
    if (path.includes('/admin/rescue-packages')) return Step.PACKAGE_CATALOG;
    if (path.includes('/partner/vehicles')) return Step.PARTNER_VEHICLES;
    if (path.includes('/partner/maintenance')) return Step.PARTNER_MAINTENANCE;
    if (path.includes('/partner/tool-config') || path.includes('/partner/vehicle-tools')) return Step.PARTNER_TOOL_CONFIG;
    if (path.includes('/partner/staff')) return Step.PARTNER_STAFF;
    if (path.includes('/partner/fleet-capacity')) return Step.PARTNER_FLEET_CAPACITY;
    if (path.includes('/partner/resource-board')) return Step.PARTNER_RESOURCE_BOARD;
    if (path.includes('/partner/shift-config')) return Step.PARTNER_SHIFT_CONFIG;
    if (path.includes('/partner/shift-schedule')) return Step.PARTNER_SHIFT_SCHEDULE;
    if (path.includes('/partner/reports')) return Step.PARTNER_REPORTS;
    if (path.includes('/partner/org')) return Step.PARTNER_ORG;
    if (path.includes('/shift-definition-management')) return Step.SHIFT_DEFINITION_MANAGEMENT;
    if (path.includes('/shift-monthly-schedule')) return Step.SHIFT_MONTHLY_SCHEDULE;
    if (path.includes('/flood-zone-management')) return Step.FLOOD_ZONE_MANAGEMENT;
    if (path.includes('/rescue-fee-criteria')) return Step.RESCUE_FEE_CRITERIA;
    if (path.includes('/rescue-fee-config')) return Step.RESCUE_FEE_CONFIGURATION;
    if (path.includes('/location-search')) return Step.LOCATION_SEARCH;
    if (path.includes('/pricing-policy')) return Step.PRICING_POLICY;
    if (path.includes('/payment-request-management')) return Step.PAYMENT_REQUEST_MANAGEMENT;
    if (path.includes('/package-import')) return Step.PACKAGE_IMPORT;
    if (path.includes('/package-purchase-management')) return Step.PACKAGE_PURCHASE_MANAGEMENT;
    if (path.includes('/business-management')) return Step.BUSINESS_MANAGEMENT;
    if (path.includes('/rsa-dashboard')) return Step.RSA_DASHBOARD;
    if (path.includes('/rescue-supervision')) return Step.RESCUE_SUPERVISION;
    if (path.includes('/monitoring')) return Step.MONITORING;
    if (path.includes('/supporting')) return Step.SUPPORTING;
    if (path.includes('/orders')) return Step.ORDER_MANAGEMENT;
    if (path.includes('/details')) return Step.GUEST_ORDER;
    if (path.includes('/station/create')) return Step.STATION_CREATE;
    if (path.includes('/station/coverage')) return Step.STATION_COVERAGE;
    if (path.includes('/station/management')) return Step.STATION_MANAGEMENT;
    if (path.includes('/staff-management')) return Step.STAFF_MANAGEMENT;
    if (path.includes('/station/details') || path.includes('/station/orders')) return Step.STATION_ORDERS;
    if (path === '/create') return Step.CUSTOMER_INFO;
    if (path === '/payment') return Step.PAYMENT_QR;
    if (path === '/searching') return Step.SEARCHING;
    if (path === '/rescue-list') return Step.RESCUE_LIST;
    if (path === '/station-info') return Step.STATION_INFO;
    if (path === '/confirmation') return Step.CONFIRMATION;
    if (path === '/success') return Step.SUCCESS;
    return Step.CUSTOMER_INFO;
  };

  const currentStep = getStepFromPath(location.pathname);

  const generateOrderId = (plate: string) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RS-${plate.replace(/\W/g, '')}-${dateStr}-${random}`;
  };

  const updateCustomerData = (updates: Partial<typeof formData.customer>) => {
    setFormData(prev => ({
      ...prev,
      customer: { ...prev.customer, ...updates }
    }));
  };

  const updateAssistanceData = (updates: Partial<typeof formData.assistance>) => {
    setFormData(prev => ({
      ...prev,
      assistance: { ...prev.assistance, ...updates }
    }));
  };

  const updateServiceData = (updates: Partial<typeof formData.service>) => {
    setFormData(prev => ({
      ...prev,
      service: { ...prev.service, ...updates }
    }));
  };

  const updateStationData = (updates: Partial<typeof formData.station>) => {
    setFormData(prev => ({
      ...prev,
      station: { ...prev.station, ...updates }
    }));
  };

  const updatePricingData = (updates: Partial<typeof formData.pricing>) => {
    setFormData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, ...updates }
    }));
  };

  const handleRescueUnitSelect = (unit: RescueUnit) => {
    setFormData(prev => ({
      ...prev,
      station: {
        ...prev.station,
        partner: unit.partner,
        station: unit.name,
        address: unit.address,
        contact1: unit.contact1,
        contact2: unit.contact2,
        vehicleType: unit.vehicleType
      },
      pricing: {
        ...prev.pricing,
        distance: unit.distance
      }
    }));
    navigate('/details');
  };

  const skipToManualEntry = () => {
    navigate('/details');
  };

  const handleExpandSearch = () => {
    navigate('/searching');
  };

  const handleHandover = (step?: Step) => {
    if (step === Step.SUCCESS) {
      navigate('/success');
    } else {
      navigate('/details');
    }
  };

  const nextStep = () => {
    const path = location.pathname;

    if (path === '/create' || path === '/') {
      const newOrderId = formData.orderId || generateOrderId(formData.customer.plate);
      setFormData(prev => ({ ...prev, orderId: newOrderId }));

      // TODO Keep for next phase
      // const hasNoPackage = formData.customer.servicePackage === "Không có";
      //
      // if (role === 'CSKH') {
      //   navigate(hasNoPackage ? '/payment' : '/success');
      // } else {
      //   navigate(hasNoPackage ? '/payment' : '/searching');
      // }
      navigate('/details');
    } else if (path === '/payment') {
      if (role === 'OSA') {
        navigate('/searching');
      } else {
        navigate('/details');
      }
    } else if (path === '/searching') {
      navigate('/rescue-list');
    } else if (path === '/rescue-list') {
      navigate('/details');
    } else if (path === '/station-info') {
        navigate('/confirmation');
    } else if (path === '/confirmation') {
        navigate('/success');
    }
  };

  const prevStep = () => {
    if (lastDashboardStep && (location.pathname === '/station-info' || location.pathname === '/create')) {
      const path = lastDashboardStep;
      setLastDashboardStep(null);
      navigate(path);
      return;
    }

    const path = location.pathname;
    const hasNoPackage = formData.customer.servicePackage === "Không có";

    if (path === '/payment') {
      navigate('/create');
    } else if (path === '/searching') {
      navigate(hasNoPackage ? '/payment' : '/create');
    } else if (path === '/rescue-list') {
      navigate('/searching');
    } else if (path === '/details') {
      if (role === 'OSA') {
        navigate('/searching');
      } else {
        navigate(hasNoPackage ? '/payment' : '/create');
      }
    } else if (path === '/station-info') {
        navigate('/rescue-list');
    } else if (path === '/confirmation') {
        navigate(role === 'CSKH' && !hasNoPackage ? '/create' : '/station-info'); // Simplified logic
    }
  };

  const resetFlow = () => {
    setFormData(initialData);
    navigate('/create');
    setLastDashboardStep(null);
  };

  const handleCancelOrder = () => {
    if (lastDashboardStep) {
      navigate(lastDashboardStep);
      setLastDashboardStep(null);
    } else {
      resetFlow();
    }
  };

  // Navigation Handlers
  const handleNavigateToRsaDashboard = () => navigate('/rsa-dashboard');
  const handleNavigateToRescueSupervision = () => navigate('/rescue-supervision');
  const handleNavigateToSupporting = () => navigate('/supporting');
  const handleNavigateToOrderManagement = () => navigate('/orders');
  const handleNavigateToGuestOrder = () => navigate('/details');
  const handleNavigateToCreate = () => navigate('/create');
  const handleNavigateToStationCreate = () => navigate('/station/create');
  const handleNavigateToStationOrders = () => navigate('/station/orders');
  const handleNavigateToStationManagement = () => navigate('/station/management');
  const handleNavigateToStationCoverage = () => navigate('/station/coverage');
  const handleNavigateToStaffManagement = () => navigate('/staff-management');
  const handleNavigateToPricingPolicy = () => navigate('/pricing-policy');
  const handleNavigateToBusinessManagement = () => navigate('/business-management');
  const handleNavigateToPackagePurchaseManagement = () => navigate('/package-purchase-management');
  const handleNavigateToPackageImport = () => navigate('/package-import');
  const handleNavigateToPaymentRequestManagement = () => navigate('/payment-request-management');
  const handleNavigateToLocationSearch = () => navigate('/location-search');
  const handleNavigateToShiftDefinition = () => navigate('/shift-definition-management');
  const handleNavigateToShiftMonthlySchedule = () => navigate('/shift-monthly-schedule');
  const handleNavigateToFloodZoneManagement = () => navigate('/flood-zone-management');
  const handleNavigateToRescueFeeConfiguration = () => navigate('/rescue-fee-config');
  const handleNavigateToRescueFeeCriteria = () => navigate('/rescue-fee-criteria');

  const handleCreateOrderFromLocation = (p: LocationSearchPrefill) => {
    setFormData(prev => ({
      ...prev,
      assistance: {
        ...prev.assistance,
        address: p.incidentAddress,
        lat: String(p.lat),
        lng: String(p.lng),
      },
      station: {
        ...prev.station,
        ...(p.originIsStation && p.originName
          ? { station: p.originName, address: p.originAddress ?? prev.station.address }
          : {}),
        ...(p.towDestinationName ? { towingDestination: p.towDestinationName } : {}),
      },
      pricing: {
        ...prev.pricing,
        ...(p.distanceKm ? { distance: p.distanceKm } : {}),
      },
    }));
    navigate('/create');
  };
  const handleViewDetails = (nav: OrderDetailsNavState) => {
    navigate('/details', { state: nav });
  };

  const handleCoordinateOrder = (order: MonitoringOrder) => {
    setLastDashboardStep(location.pathname);
    setFormData(prev => ({
      ...prev,
      orderId: order.orderId,
      customer: {
        ...prev.customer,
        name: order.customerName,
        phone: order.phone,
        plate: order.plate,
        vehicleBrand: 'Toyota',
        vehicleLine: `Xe ${order.plate}`,
      },
      assistance: {
        ...prev.assistance,
        rescueName: order.customerName,
        rescuePhone: order.phone,
        address: order.address,
        district: order.district,
      },
      service: {
        ...prev.service,
        serviceIds: order.services,
      }
    }));
    navigate('/details');
  };

  const handleVerifyOrder = (order: MonitoringOrder) => {
    setLastDashboardStep(location.pathname);
    setFormData(prev => ({
      ...prev,
      orderId: order.orderId,
      customer: {
        ...prev.customer,
        name: order.customerName,
        phone: order.phone,
        plate: order.plate,
        vehicleBrand: 'Toyota',
        vehicleLine: `Xe ${order.plate}`,
      },
      assistance: {
        ...prev.assistance,
        rescueName: order.customerName,
        rescuePhone: order.phone,
        address: order.address,
        district: order.district,
      },
      service: {
        ...prev.service,
        serviceIds: order.services,
      }
    }));
    navigate('/create');
  };

  // Logic to hide Stepper
  const hideStepperSteps = [
    Step.SUPPORTING,
    Step.ORDER_MANAGEMENT,
    Step.GUEST_ORDER,
    Step.RESCUE_SUPERVISION,
    Step.RSA_DASHBOARD,
    Step.SUCCESS,
    Step.STATION_CREATE,
    Step.STATION_MANAGEMENT,
    Step.STATION_COVERAGE,
    Step.STAFF_MANAGEMENT,
    Step.PRICING_POLICY,
    Step.BUSINESS_MANAGEMENT,
    Step.PACKAGE_PURCHASE_MANAGEMENT,
    Step.PACKAGE_IMPORT,
    Step.PAYMENT_REQUEST_MANAGEMENT,
    Step.LOCATION_SEARCH,
    Step.SHIFT_DEFINITION_MANAGEMENT,
    Step.SHIFT_MONTHLY_SCHEDULE,
    Step.FLOOD_ZONE_MANAGEMENT,
    Step.RESCUE_FEE_CONFIGURATION,
    Step.RESCUE_FEE_CRITERIA,
    Step.PARTNER_VEHICLES,
    Step.PARTNER_FLEET_CAPACITY,
    Step.PARTNER_MAINTENANCE,
    Step.PARTNER_TOOL_CONFIG,
    Step.PARTNER_STAFF,
    Step.PARTNER_REPORTS,
    Step.PARTNER_ORG,
    Step.RESCUE_PROVIDER_MANAGEMENT,
    Step.RESCUE_STATION_ADMIN,
    Step.SERVICE_MANAGEMENT,
    Step.PACKAGE_CATALOG,
    Step.APP_QUICK_CREATE,
  ];
  
  const isStepperVisible = !hideStepperSteps.includes(currentStep);

  const getBreadcrumbLabels = () => {
    if (currentStep === Step.RSA_DASHBOARD) return ['Giám sát & Điều phối', 'Tổng quan vận hành'];
    if (currentStep === Step.RESCUE_SUPERVISION) return ['Giám sát & Điều phối', 'Giám sát trực tiếp'];
    if (currentStep === Step.SUPPORTING) return ['Giám sát & Điều phối', 'Đơn đang cứu hộ'];
    if (currentStep === Step.PARTNER_RESOURCE_BOARD) return ['Giám sát & Điều phối', 'Bảng nguồn lực xe & tài xế'];
    if (currentStep === Step.PARTNER_FLEET_CAPACITY) return ['Giám sát & Điều phối', 'Năng lực nhận đơn'];
    if (currentStep === Step.STATION_CREATE) return ['Quản lý đơn cứu hộ', 'Tạo đơn cứu hộ'];
    if (currentStep === Step.APP_QUICK_CREATE) return ['Quản lý đơn cứu hộ', 'Tạo nhanh App (FL-M3-04)'];
    if (currentStep === Step.STATION_MANAGEMENT) return ['Quản lý đơn cứu hộ', 'Danh sách đơn cứu hộ'];
    if (currentStep === Step.STATION_COVERAGE) return ['Quản lý đơn cứu hộ', 'Bản đồ độ phủ trạm'];
    if (currentStep === Step.STATION_ORDERS) return ['Quản lý đơn cứu hộ', 'Chi tiết đơn'];
    if (currentStep === Step.ORDER_MANAGEMENT) return ['Quản lý đơn cứu hộ', 'Quản lý đơn hàng'];
    if (currentStep === Step.GUEST_ORDER) return ['Quản lý đơn cứu hộ', 'Chi tiết đơn hàng'];
    if (currentStep === Step.STAFF_MANAGEMENT) return ['Cấu hình & Quản trị', 'Tài khoản & Phân quyền'];
    if (currentStep === Step.PRICING_POLICY) return ['Cấu hình & Quản trị', 'Chính sách giá VETC'];
    if (currentStep === Step.BUSINESS_MANAGEMENT) {
      if (location.pathname.includes('/create')) return ['Cấu hình & Quản trị', 'Thêm mới doanh nghiệp'];
      if (location.pathname.includes('/edit/')) return ['Cấu hình & Quản trị', 'Chỉnh sửa doanh nghiệp'];
      return ['Cấu hình & Quản trị', 'Quản lý doanh nghiệp'];
    }
    if (currentStep === Step.PACKAGE_PURCHASE_MANAGEMENT) {
      return ['Cấu hình & Quản trị', 'Quản lý mua gói'];
    }
    if (currentStep === Step.PACKAGE_IMPORT) {
      return ['Cấu hình & Quản trị', 'Gói cứu hộ', 'Import gói cứu hộ'];
    }
    if (currentStep === Step.LOCATION_SEARCH) {
      return ['Quản lý đơn cứu hộ', 'Tìm kiếm vị trí'];
    }
    if (currentStep === Step.SHIFT_DEFINITION_MANAGEMENT || currentStep === Step.PARTNER_SHIFT_CONFIG) {
      return ['Nhân sự & Ca trực', 'Cấu hình ca làm việc'];
    }
    if (currentStep === Step.SHIFT_MONTHLY_SCHEDULE || currentStep === Step.PARTNER_SHIFT_SCHEDULE) {
      return ['Nhân sự & Ca trực', 'Lịch ca theo tháng'];
    }
    if (currentStep === Step.FLOOD_ZONE_MANAGEMENT) {
      return ['Cấu hình & Quản trị', 'Quản lý khu vực ngập lụt'];
    }
    if (currentStep === Step.RESCUE_FEE_CONFIGURATION) {
      if (location.pathname.includes('/create')) return ['Cấu hình & Quản trị', 'Cấu hình phí', 'Tạo bảng phí'];
      if (location.pathname.includes('/edit/')) return ['Cấu hình & Quản trị', 'Cấu hình phí', 'Chỉnh sửa bảng phí'];
      if (location.pathname.match(/\/rescue-fee-config\/[^/]+$/)) {
        return ['Cấu hình & Quản trị', 'Cấu hình phí', 'Chi tiết bảng phí'];
      }
      return ['Cấu hình & Quản trị', 'Cấu hình phí cứu hộ'];
    }
    if (currentStep === Step.RESCUE_FEE_CRITERIA) {
      return ['Cấu hình & Quản trị', 'Cấu hình phí', 'Danh mục tiêu chí'];
    }
    if (currentStep === Step.PARTNER_VEHICLES) {
      if (location.pathname === '/partner/vehicles/new' || location.pathname.endsWith('/vehicles/new')) {
        return ['Quản lý đội xe', 'Hồ sơ phương tiện', 'Danh sách phương tiện', 'Thêm mới xe'];
      }
      if (location.pathname.endsWith('/edit')) {
        return ['Quản lý đội xe', 'Hồ sơ phương tiện', 'Danh sách phương tiện', 'Cập nhật xe'];
      }
      if (location.pathname.match(/\/partner\/vehicles\/[^/]+$/)) {
        return ['Quản lý đội xe', 'Hồ sơ phương tiện', 'Danh sách phương tiện', 'Chi tiết xe'];
      }
      return ['Quản lý đội xe', 'Hồ sơ phương tiện', 'Danh sách phương tiện'];
    }
    if (currentStep === Step.PARTNER_TOOL_CONFIG) return ['Quản lý đội xe', 'Hồ sơ phương tiện', 'Cấu hình công cụ xe'];
    if (currentStep === Step.PARTNER_MAINTENANCE) {
      const tab = new URLSearchParams(location.search).get('tab') || location.pathname.split('/partner/maintenance/')[1];
      if (tab === 'requests') return ['Quản lý đội xe', 'Bảo dưỡng & Sửa chữa', 'Yêu cầu sửa chữa'];
      if (tab === 'orders') return ['Quản lý đội xe', 'Bảo dưỡng & Sửa chữa', 'Lệnh sửa chữa / bảo dưỡng'];
      if (tab === 'history') return ['Quản lý đội xe', 'Bảo dưỡng & Sửa chữa', 'Lịch sử bảo dưỡng'];
      return ['Quản lý đội xe', 'Bảo dưỡng & Sửa chữa', 'Lịch bảo dưỡng'];
    }
    if (currentStep === Step.PARTNER_STAFF) {
      if (location.pathname.endsWith('/partner/staff/new')) {
        return ['Nhân sự & Ca trực', 'Danh sách nhân viên', 'Thêm nhân viên'];
      }
      if (location.pathname.match(/\/partner\/staff\/[^/]+$/)) {
        return ['Nhân sự & Ca trực', 'Danh sách nhân viên', 'Chi tiết nhân viên'];
      }
      return ['Nhân sự & Ca trực', 'Danh sách nhân viên'];
    }
    if (currentStep === Step.PARTNER_REPORTS) return ['Báo cáo & Thống kê', 'Báo cáo vận hành'];
    if (currentStep === Step.PARTNER_ORG) return ['Cấu hình & Quản trị', 'Cơ cấu tổ chức & Trạm'];
    if (currentStep === Step.RESCUE_PROVIDER_MANAGEMENT) {
      if (location.pathname.endsWith('/admin/rescue-providers/new')) {
        return ['Cấu hình & Quản trị', 'Quản lý đối tác cứu hộ', 'Thêm mới đối tác'];
      }
      if (location.pathname.endsWith('/edit')) {
        return ['Cấu hình & Quản trị', 'Quản lý đối tác cứu hộ', 'Chỉnh sửa đối tác'];
      }
      if (location.pathname.match(/\/admin\/rescue-providers\/[^/]+$/)) {
        return ['Cấu hình & Quản trị', 'Quản lý đối tác cứu hộ', 'Xem chi tiết đối tác'];
      }
      return ['Cấu hình & Quản trị', 'Quản lý đối tác cứu hộ'];
    }
    if (currentStep === Step.RESCUE_STATION_ADMIN) {
      if (location.pathname.endsWith('/admin/rescue-stations/new')) {
        return ['Cấu hình & Quản trị', 'Quản lý trạm cứu hộ', 'Thêm mới trạm cứu hộ'];
      }
      if (location.pathname.endsWith('/edit')) {
        return ['Cấu hình & Quản trị', 'Quản lý trạm cứu hộ', 'Chỉnh sửa trạm cứu hộ'];
      }
      if (location.pathname.match(/\/admin\/rescue-stations\/[^/]+$/)) {
        return ['Cấu hình & Quản trị', 'Quản lý trạm cứu hộ', 'Chi tiết trạm cứu hộ'];
      }
      return ['Cấu hình & Quản trị', 'Quản lý trạm cứu hộ'];
    }
    if (currentStep === Step.SERVICE_MANAGEMENT) {
      if (location.pathname.endsWith('/admin/rescue-services/new')) {
        return ['Cấu hình & Quản trị', 'Danh mục dịch vụ', 'Thêm mới dịch vụ'];
      }
      if (location.pathname.endsWith('/edit')) {
        return ['Cấu hình & Quản trị', 'Danh mục dịch vụ', 'Chỉnh sửa dịch vụ'];
      }
      if (location.pathname.match(/\/admin\/rescue-services\/[^/]+$/)) {
        return ['Cấu hình & Quản trị', 'Danh mục dịch vụ', 'Chi tiết dịch vụ'];
      }
      return ['Cấu hình & Quản trị', 'Danh mục dịch vụ'];
    }
    if (currentStep === Step.PACKAGE_CATALOG) {
      if (location.pathname.endsWith('/admin/rescue-packages/new')) {
        return ['Cấu hình & Quản trị', 'Cấu hình gói cứu hộ', 'Thêm mới gói'];
      }
      if (location.pathname.endsWith('/edit')) {
        return ['Cấu hình & Quản trị', 'Cấu hình gói cứu hộ', 'Chỉnh sửa gói'];
      }
      if (location.pathname.match(/\/admin\/rescue-packages\/[^/]+$/)) {
        return ['Cấu hình & Quản trị', 'Cấu hình gói cứu hộ', 'Chi tiết gói'];
      }
      return ['Cấu hình & Quản trị', 'Cấu hình gói cứu hộ'];
    }
    if (currentStep === Step.PAYMENT_REQUEST_MANAGEMENT) {
      if (location.pathname.includes('/payment-request-management/')) {
        return ['Cấu hình & Quản trị', 'Quản lý thanh toán', 'Tạo đề nghị thanh toán'];
      }
      return ['Cấu hình & Quản trị', 'Quản lý thanh toán', 'Đề nghị thanh toán'];
    }
    return ['Quản lý đơn cứu hộ', 'Tạo đơn cứu hộ'];
  };

  const breadcrumbLabels = getBreadcrumbLabels();

  return (
    <div className="flex h-screen w-full min-w-0 overflow-hidden bg-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onNavigateRsaDashboard={handleNavigateToRsaDashboard}
        onNavigateRescueSupervision={handleNavigateToRescueSupervision}
        onNavigateSupporting={handleNavigateToSupporting}
        onNavigateOrderManagement={handleNavigateToOrderManagement}
        onNavigateGuestOrder={handleNavigateToGuestOrder}
        onNavigateCreate={handleNavigateToCreate}
        onNavigateStationCreate={handleNavigateToStationCreate}
        onNavigateStationOrders={handleNavigateToStationOrders}
        onNavigateStationManagement={handleNavigateToStationManagement}
        onNavigateStationCoverage={handleNavigateToStationCoverage}
        onNavigateStaffManagement={handleNavigateToStaffManagement}
        onNavigatePricingPolicy={handleNavigateToPricingPolicy}
        onNavigateBusinessManagement={handleNavigateToBusinessManagement}
        onNavigatePackagePurchaseManagement={handleNavigateToPackagePurchaseManagement}
        onNavigatePackageImport={handleNavigateToPackageImport}
        onNavigatePaymentRequestManagement={handleNavigateToPaymentRequestManagement}
        onNavigateLocationSearch={handleNavigateToLocationSearch}
        onNavigateShiftDefinition={handleNavigateToShiftDefinition}
        onNavigateShiftMonthlySchedule={handleNavigateToShiftMonthlySchedule}
        onNavigateFloodZoneManagement={handleNavigateToFloodZoneManagement}
        onNavigateRescueFeeConfiguration={handleNavigateToRescueFeeConfiguration}
        onNavigateRescueFeeCriteria={handleNavigateToRescueFeeCriteria}
        onNavigatePartner={(path) => navigate(path)}
        currentStep={currentStep}
      />

      <div className="flex flex-col flex-1 min-w-0 w-full overflow-hidden">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
          role={role}
          onRoleChange={setRole}
        />

        <main className={`flex-1 min-h-0 overflow-x-hidden p-4 min-w-0 w-full ${
          currentStep === Step.RESCUE_SUPERVISION ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
        }`}>
          <div className={`w-full min-w-0 max-w-none space-y-4 ${
            currentStep === Step.RESCUE_SUPERVISION ? 'flex min-h-0 flex-1 flex-col' : ''
          }`}>
            <div className="bg-[#00A859] text-white px-4 py-2 rounded shadow-sm flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-sm shrink-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 min-w-0">
                <Home size={16} className="shrink-0" />
                <ChevronRight size={14} className="shrink-0" />
                <span>Trang chủ</span>
                {breadcrumbLabels.map((label) => (
                  <React.Fragment key={label}>
                    <ChevronRight size={14} className="shrink-0" />
                    <span className="min-w-0">{label}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 shrink-0">
                <span className="font-bold">rsa_test1</span>
                <span>Thứ hai - 02/02/2026</span>
              </div>
            </div>

            <div className={`bg-white rounded-lg shadow-md w-full min-w-0 p-4 sm:p-6 ${
              currentStep === Step.RESCUE_SUPERVISION
                ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                : 'min-h-[calc(100vh-140px)]'
            }`}>
              {/* TODO Keep for next phase*/}
              {/*{isStepperVisible && (*/}
              {/*  <div className="mb-8">*/}
              {/*    {role === 'OSA' ? (*/}
              {/*      <StepperOSA */}
              {/*        currentStep={currentStep} */}
              {/*        servicePackage={formData.customer.servicePackage} */}
              {/*      />*/}
              {/*    ) : (*/}
              {/*      <StepperCSKH */}
              {/*        currentStep={currentStep} */}
              {/*        servicePackage={formData.customer.servicePackage} */}
              {/*      />*/}
              {/*    )}*/}
              {/*  </div>*/}
              {/*)}*/}
              
              <div className={`w-full min-w-0 ${currentStep === Step.RESCUE_SUPERVISION ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
              <ErrorBoundary>
              <ShiftConfigProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/create" replace />} />
                <Route path="/create" element={
                  <CreateRescueOrder 
                    data={formData} 
                    onNext={nextStep} 
                    onUpdateCustomer={updateCustomerData} 
                    onUpdateAssistance={updateAssistanceData} 
                    onUpdateService={updateServiceData}
                    onUpdatePricing={updatePricingData}
                    role={role}
                  />
                } />
                <Route path="/payment" element={
                  <PaymentQR 
                    data={formData} 
                    onConfirm={nextStep} 
                    onHandover={handleHandover} 
                    onBack={prevStep} 
                    onCancel={handleCancelOrder}
                    role={role}
                  />
                } />
                <Route path="/searching" element={
                  <Searching data={formData} onComplete={nextStep} onManualEntry={skipToManualEntry} onBack={prevStep} />
                } />
                <Route path="/rescue-list" element={
                  <RescueList 
                    data={formData}
                    onSelect={handleRescueUnitSelect} 
                    onManualEntry={skipToManualEntry} 
                    onBack={prevStep}
                    onExpandSearch={handleExpandSearch}
                  />
                } />
                <Route path="/station-info" element={
                  <FindRescueStation 
                    data={formData} 
                    onNext={nextStep} 
                    onBack={prevStep} 
                    onCancel={handleCancelOrder}
                    onUpdateStation={updateStationData}
                  />
                } />
                <Route path="/confirmation" element={
                  <RescueConfirmation data={formData} onNext={nextStep} onBack={prevStep} />
                } />
                <Route path="/success" element={
                  <CreateRescueOrderComplete data={formData} onReset={resetFlow} onViewList={handleNavigateToOrderManagement} />
                } />
                <Route path="/rsa-dashboard" element={
                  <RsaDashboardOverview />
                } />
                <Route path="/rescue-supervision" element={
                  <div className="flex h-full min-h-0 flex-1 flex-col">
                    <RescueSupervision role={role} />
                  </div>
                } />
                <Route path="/supporting" element={
                  <Supporting onCoordinate={handleCoordinateOrder} onVerify={handleVerifyOrder} />
                } />
                <Route path="/orders" element={
                  <OrderManagement onViewDetails={handleViewDetails} />
                } />
                <Route path="/details" element={
                  <GuestOrderDetails key={location.key} role={role} />
                } />
                <Route path="/station/create" element={
                  <StationCreateOrder />
                } />
                <Route path="/station/details" element={
                  <StationOrderDetail />
                } />
                <Route path="/station/management" element={
                  <StationManagement role={role} />
                } />
                <Route path="/station/coverage" element={
                  <StationCoverageReport />
                } />
                <Route path="/staff-management" element={
                  <StaffManagement2 role={role} />
                } />
                <Route path="/station/orders" element={
                  <StationOrderDetail />
                } />
                <Route path="/pricing-policy" element={
                  <PricingPolicyCreate />
                } />
                <Route path="/business-management" element={
                  <BusinessManagement />
                } />
                <Route path="/business-management/create" element={
                  <BusinessForm />
                } />
                <Route path="/business-management/edit/:id" element={
                  <BusinessForm />
                } />
                <Route path="/package-purchase-management" element={
                  <PackagePurchaseManagement />
                } />
                <Route path="/package-import" element={
                  <PackageImportManagement />
                } />
                <Route path="/payment-request-management" element={
                  <PaymentRequestManagement />
                } />
                <Route path="/payment-request-management/:orderId" element={
                  <PaymentRequestDetail />
                } />
                <Route path="/location-search" element={
                  <LocationSearch onCreateOrder={handleCreateOrderFromLocation} />
                } />
                <Route path="/shift-definition-management" element={
                  <ShiftDefinitionManagement />
                } />
                <Route path="/shift-monthly-schedule" element={
                  <ShiftMonthlySchedule />
                } />
                <Route path="/flood-zone-management" element={
                  <FloodZoneManagement />
                } />
                <Route path="/rescue-fee-config" element={
                  <RescueFeeConfiguration />
                } />
                <Route path="/rescue-fee-config/create" element={
                  <RescueFeeForm />
                } />
                <Route path="/rescue-fee-config/edit/:id" element={
                  <RescueFeeForm />
                } />
                <Route path="/rescue-fee-config/:id" element={
                  <RescueFeeForm />
                } />
                <Route path="/rescue-fee-criteria" element={
                  <RescueFeeCriteriaManagement />
                } />
                <Route path="/partner/vehicles/new" element={<PartnerVehicleDetail />} />
                <Route path="/partner/vehicles/:id/edit" element={<PartnerVehicleDetail />} />
                <Route path="/partner/vehicles/:id" element={<PartnerVehicleDetail />} />
                <Route path="/partner/vehicles" element={<PartnerVehicleList />} />
                <Route path="/partner/maintenance" element={<PartnerMaintenance />} />
                <Route path="/partner/maintenance/:subTab" element={<PartnerMaintenance />} />
                <Route path="/partner/vehicle-tools" element={<PartnerToolConfig />} />
                <Route path="/partner/tool-config" element={<PartnerToolConfig />} />
                <Route path="/partner/staff/new" element={<PartnerStaffDetail key="staff-new" />} />
                <Route path="/partner/staff/:id" element={<PartnerStaffDetail key="staff-detail" />} />
                <Route path="/partner/staff" element={<PartnerStaff />} />
                <Route path="/partner/resource-board" element={<PartnerResourceBoard />} />
                <Route path="/partner/fleet-capacity" element={<PartnerFleetCapacity />} />
                <Route path="/partner/quick-order" element={<AppQuickCreateOrder />} />
                <Route path="/app/quick-create" element={<AppQuickCreateOrder />} />
                <Route path="/partner/shift-config" element={<ShiftDefinitionManagement />} />
                <Route path="/partner/shift-schedule" element={<ShiftMonthlySchedule />} />
                <Route path="/partner/reports" element={<PartnerReports />} />
                <Route path="/partner/org" element={<PartnerOrgConfig />} />
                <Route path="/admin/rescue-providers/new" element={<RescueProviderCreate />} />
                <Route path="/admin/rescue-providers/:id/edit" element={<RescueProviderEdit />} />
                <Route path="/admin/rescue-providers/:id" element={<RescueProviderView />} />
                <Route path="/admin/rescue-providers" element={<RescueProviderList />} />
                <Route path="/admin/rescue-stations/new" element={<RescueStationAdminCreate />} />
                <Route path="/admin/rescue-stations/:id/edit" element={<RescueStationAdminEdit />} />
                <Route path="/admin/rescue-stations/:id" element={<RescueStationAdminView />} />
                <Route path="/admin/rescue-stations" element={<RescueStationAdminList />} />
                <Route path="/admin/rescue-services/new" element={<RescueServiceCreate />} />
                <Route path="/admin/rescue-services/:id/edit" element={<RescueServiceEdit />} />
                <Route path="/admin/rescue-services/:id" element={<RescueServiceView />} />
                <Route path="/admin/rescue-services" element={<RescueServiceList />} />
                <Route path="/admin/rescue-packages/new" element={<RescuePackageCreate />} />
                <Route path="/admin/rescue-packages/:id/edit" element={<RescuePackageEdit />} />
                <Route path="/admin/rescue-packages/:id" element={<RescuePackageView />} />
                <Route path="/admin/rescue-packages" element={<RescuePackageList />} />
              </Routes>
              </ShiftConfigProvider>
              </ErrorBoundary>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;