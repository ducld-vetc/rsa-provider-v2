import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  Car,
  ChevronDown,
  ClipboardList,
  DollarSign,
  GitBranch,
  History,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Package,
  PlayCircle,
  PlusCircle,
  Radio,
  Settings2,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  Users,
  Wrench,
} from 'lucide-react';
import { Step } from '../types';
import { getStoredPersona } from './PartnerScopeBar';

interface SidebarProps {
  isOpen: boolean;
  onNavigateRsaDashboard?: () => void;
  onNavigateRescueSupervision?: () => void;
  onNavigateSupporting?: () => void;
  onNavigateCreate?: () => void;
  onNavigateOrderManagement?: () => void;
  onNavigateGuestOrder?: () => void;
  onNavigateStationCreate?: () => void;
  onNavigateStationOrders?: () => void;
  onNavigateStationManagement?: () => void;
  onNavigateStationCoverage?: () => void;
  onNavigateStaffManagement?: () => void;
  onNavigatePricingPolicy?: () => void;
  onNavigateBusinessManagement?: () => void;
  onNavigatePackagePurchaseManagement?: () => void;
  onNavigatePackageImport?: () => void;
  onNavigatePaymentRequestManagement?: () => void;
  onNavigateLocationSearch?: () => void;
  onNavigateShiftDefinition?: () => void;
  onNavigateShiftMonthlySchedule?: () => void;
  onNavigateFloodZoneManagement?: () => void;
  onNavigateRescueFeeConfiguration?: () => void;
  onNavigateRescueFeeCriteria?: () => void;
  onNavigatePartner?: (path: string) => void;
  currentStep?: Step;
}

export type { SidebarProps };

const TOP_LEVEL_GROUPS = [
  'monitoring',
  'orders',
  'fleet',
  'workforce',
  'reports',
  'system',
] as const;

const GROUP_PATHS: Record<string, string[]> = {
  monitoring: [
    '/rsa-dashboard',
    '/rescue-supervision',
    '/supporting',
    '/partner/resource-board',
    '/partner/fleet-capacity',
  ],
  orders: [
    '/station/create',
    '/create',
    '/app/quick-create',
    '/partner/quick-order',
    '/station/management',
    '/station/coverage',
  ],
  fleetVehicles: [
    '/partner/vehicles',
    '/partner/tool-config',
    '/partner/vehicle-tools',
  ],
  fleetMaintenance: [
    '/partner/maintenance?tab=schedule',
    '/partner/maintenance?tab=requests',
    '/partner/maintenance?tab=orders',
    '/partner/maintenance?tab=history',
  ],
  fleet: [
    '/partner/vehicles',
    '/partner/tool-config',
    '/partner/vehicle-tools',
    '/partner/maintenance',
  ],
  workforce: [
    '/partner/staff',
    '/partner/shift-config',
    '/partner/shift-schedule',
    '/shift-definition-management',
    '/shift-monthly-schedule',
  ],
  reports: [
    '/partner/reports',
  ],
  system: [
    '/partner/org',
    '/admin/rescue-providers',
    '/admin/rescue-stations',
    '/admin/rescue-packages',
    '/admin/rescue-services',
    '/rescue-fee-config',
    '/rescue-fee-criteria',
    '/staff-management',
  ],
};

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onNavigatePartner,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const persona = getStoredPersona();
  const isAdmin = persona.role === 'BDH';

  const isItemActive = (path: string): boolean => {
    if (path.includes('?tab=')) {
      const [basePath, query] = path.split('?');
      const targetTab = new URLSearchParams(query).get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab') || 'schedule';
      return location.pathname.startsWith(basePath) && currentTab === targetTab;
    }
    if (path === '/rsa-dashboard') return location.pathname === '/rsa-dashboard';
    if (path === '/rescue-supervision') return location.pathname === '/rescue-supervision';
    if (path === '/supporting') return location.pathname === '/supporting';
    if (path === '/partner/resource-board') return location.pathname === '/partner/resource-board';
    if (path === '/partner/fleet-capacity') return location.pathname === '/partner/fleet-capacity';
    if (path === '/station/create') {
      return (
        location.pathname === '/station/create' ||
        location.pathname === '/create' ||
        location.pathname === '/payment' ||
        location.pathname === '/searching' ||
        location.pathname === '/rescue-list' ||
        location.pathname === '/station-info' ||
        location.pathname === '/confirmation'
      );
    }
    if (path === '/app/quick-create') return location.pathname === '/app/quick-create' || location.pathname === '/partner/quick-order';
    if (path === '/station/management') {
      return (
        location.pathname.startsWith('/station/management') ||
        location.pathname.startsWith('/station/details') ||
        location.pathname.startsWith('/station/orders') ||
        location.pathname === '/orders'
      );
    }
    if (path === '/station/coverage') return location.pathname.startsWith('/station/coverage');
    if (path === '/partner/vehicles') return location.pathname.startsWith('/partner/vehicles');
    if (path === '/partner/tool-config') {
      return location.pathname.startsWith('/partner/tool-config') || location.pathname.startsWith('/partner/vehicle-tools');
    }
    if (path === '/partner/staff') return location.pathname.startsWith('/partner/staff');
    if (path === '/partner/shift-config') {
      return location.pathname.startsWith('/partner/shift-config') || location.pathname.startsWith('/shift-definition-management');
    }
    if (path === '/partner/shift-schedule') {
      return location.pathname.startsWith('/partner/shift-schedule') || location.pathname.startsWith('/shift-monthly-schedule');
    }
    if (path === '/partner/reports') return location.pathname.startsWith('/partner/reports');
    if (path === '/partner/org') return location.pathname.startsWith('/partner/org');
    if (path === '/admin/rescue-providers') return location.pathname.startsWith('/admin/rescue-providers');
    if (path === '/admin/rescue-stations') return location.pathname.startsWith('/admin/rescue-stations');
    if (path === '/admin/rescue-packages') return location.pathname.startsWith('/admin/rescue-packages');
    if (path === '/admin/rescue-services') return location.pathname.startsWith('/admin/rescue-services');
    if (path === '/rescue-fee-config') {
      return location.pathname.startsWith('/rescue-fee-config') || location.pathname.startsWith('/rescue-fee-criteria');
    }
    if (path === '/staff-management') return location.pathname.startsWith('/staff-management');

    return location.pathname === path;
  };

  const findActiveGroupsForLocation = (): string[] | null => {
    // Check fleet submenus first
    if (GROUP_PATHS.fleetVehicles.some(p => isItemActive(p))) {
      return ['fleet', 'fleetVehicles'];
    }
    if (
      GROUP_PATHS.fleetMaintenance.some(p => isItemActive(p)) ||
      location.pathname.startsWith('/partner/maintenance')
    ) {
      return ['fleet', 'fleetMaintenance'];
    }
    // Check other top-level groups
    for (const groupId of TOP_LEVEL_GROUPS) {
      if (groupId === 'fleet') continue;
      if (GROUP_PATHS[groupId]?.some(p => isItemActive(p))) {
        return [groupId];
      }
    }
    return null;
  };

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const initial = findActiveGroupsForLocation();
    return initial && initial.length > 0 ? initial : ['monitoring'];
  });

  const lastLocationRef = useRef(location.pathname + location.search);

  // Sync open group on route changes so only the active menu is open
  useEffect(() => {
    const currentLoc = location.pathname + location.search;
    if (lastLocationRef.current !== currentLoc) {
      lastLocationRef.current = currentLoc;
      const matched = findActiveGroupsForLocation();
      if (matched && matched.length > 0) {
        setOpenGroups(matched);
      }
    }
  }, [location.pathname, location.search]);

  if (!isOpen) return null;

  const toggleGroup = (groupId: string) => {
    // Submenus inside fleet (fleetVehicles, fleetMaintenance)
    if (groupId === 'fleetVehicles' || groupId === 'fleetMaintenance') {
      if (openGroups.includes(groupId)) {
        setOpenGroups(['fleet']);
      } else {
        setOpenGroups(['fleet', groupId]);
      }
      return;
    }

    // Top-level groups: opening any group closes all other top-level groups
    if (openGroups.includes(groupId)) {
      setOpenGroups([]);
    } else {
      if (groupId === 'fleet') {
        const activeSub =
          GROUP_PATHS.fleetMaintenance.some(p => isItemActive(p)) ||
          location.pathname.startsWith('/partner/maintenance')
            ? 'fleetMaintenance'
            : 'fleetVehicles';
        setOpenGroups(['fleet', activeSub]);
      } else {
        setOpenGroups([groupId]);
      }
    }
  };

  const isGroupOpen = (groupId: string) => openGroups.includes(groupId);

  const handleNav = (path: string) => {
    // Determine which menu group this path belongs to and immediately open only that menu
    if (
      GROUP_PATHS.fleetVehicles.some(
        p => path === p || path.startsWith('/partner/vehicles') || path.startsWith('/partner/tool-config')
      )
    ) {
      setOpenGroups(['fleet', 'fleetVehicles']);
    } else if (
      GROUP_PATHS.fleetMaintenance.some(
        p => path === p || path.startsWith('/partner/maintenance')
      )
    ) {
      setOpenGroups(['fleet', 'fleetMaintenance']);
    } else {
      for (const groupId of TOP_LEVEL_GROUPS) {
        if (groupId === 'fleet') continue;
        if (GROUP_PATHS[groupId]?.some(p => path === p || path.startsWith(p.split('?')[0]))) {
          setOpenGroups([groupId]);
          break;
        }
      }
    }

    if (onNavigatePartner) {
      onNavigatePartner(path);
    } else {
      navigate(path);
    }
  };

  const renderNavItem = (
    path: string,
    label: string,
    Icon: React.ElementType,
    options?: {
      badge?: string;
      badgeColor?: string;
      pulse?: boolean;
      indent?: boolean;
    }
  ) => {
    const active = isItemActive(path);
    const indent = options?.indent !== false;

    return (
      <div
        key={path}
        onClick={() => handleNav(path)}
        className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-all duration-150 ${
          indent ? 'ml-3' : ''
        } ${
          active
            ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs border-r-3 border-[#00A859]'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 font-medium'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            size={15}
            className={`shrink-0 transition-colors ${
              active ? 'text-[#00A859]' : 'text-gray-400 group-hover:text-gray-600'
            }`}
          />
          <span className="truncate leading-tight">{label}</span>
        </div>

        {options?.badge && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tracking-tight ${
              options.badgeColor || 'bg-gray-100 text-gray-600'
            }`}
          >
            {options.pulse && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {options.badge}
          </span>
        )}
      </div>
    );
  };

  const renderSectionHeader = (
    id: string,
    title: string,
    Icon: React.ElementType,
    paths: string[]
  ) => {
    const isOpen = isGroupOpen(id);
    const hasActiveChild = paths.some(p => isItemActive(p));

    return (
      <button
        type="button"
        onClick={() => toggleGroup(id)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all duration-150 ${
          hasActiveChild
            ? 'text-gray-900 font-bold bg-emerald-50/70 shadow-xs'
            : isOpen
            ? 'text-gray-900 font-bold bg-gray-50'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-semibold'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
              hasActiveChild
                ? 'bg-emerald-100 text-[#00A859]'
                : isOpen
                ? 'bg-emerald-50 text-[#00A859]'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            <Icon size={14} />
          </div>
          <span className="text-[13px] tracking-tight">{title}</span>
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600' : 'text-gray-400'
          }`}
        />
      </button>
    );
  };

  const renderSubmenuHeader = (
    id: string,
    title: string,
    Icon: React.ElementType,
    paths: string[]
  ) => {
    const isOpen = isGroupOpen(id);
    const hasActiveChild = paths.some(p => isItemActive(p));

    return (
      <div
        onClick={() => toggleGroup(id)}
        className={`flex items-center justify-between px-3 py-1.5 ml-3 rounded-lg cursor-pointer text-[13px] transition-all duration-150 ${
          hasActiveChild
            ? 'text-emerald-800 font-semibold bg-emerald-50/70'
            : isOpen
            ? 'text-gray-900 font-semibold bg-gray-100/60'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-medium'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            size={14}
            className={`shrink-0 transition-colors ${
              hasActiveChild ? 'text-[#00A859]' : isOpen ? 'text-[#00A859]' : 'text-gray-400'
            }`}
          />
          <span className="truncate">{title}</span>
        </div>
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600' : 'text-gray-400'
          }`}
        />
      </div>
    );
  };

  return (
    <aside className="w-72 shrink-0 bg-white border-r flex flex-col h-screen select-none transition-all duration-300 shadow-sm z-30">
      {/* Brand Header */}
      <div className="h-14 px-4 border-b flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#00A859] rounded-lg flex items-center justify-center text-white font-black italic shadow-sm">
            V
          </div>
          <div className="flex flex-col">
            <span className="font-black text-gray-900 tracking-tight text-base leading-none">
              VETC FLEET
            </span>
            <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-0.5">
              Cứu hộ giao thông
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
          Portal
        </span>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2.5">
        {/* NHÓM 1: GIÁM SÁT & ĐIỀU PHỐI */}
        <div className="space-y-0.5">
          {renderSectionHeader('monitoring', 'Giám sát & Điều phối', Activity, [
            '/rsa-dashboard',
            '/rescue-supervision',
            '/supporting',
            '/partner/resource-board',
            '/partner/fleet-capacity',
          ])}
          {isGroupOpen('monitoring') && (
            <div className="space-y-0.5 pt-0.5 border-l-2 border-gray-100 ml-4 pl-1">
              {renderNavItem('/rsa-dashboard', 'Tổng quan vận hành', LayoutDashboard)}
              {renderNavItem('/rescue-supervision', 'Giám sát trực tiếp', Radio, {
                badge: 'LIVE',
                badgeColor: 'bg-emerald-100 text-emerald-800 font-black',
                pulse: true,
              })}
              {renderNavItem('/supporting', 'Đơn đang cứu hộ', PlayCircle)}
              {renderNavItem('/partner/resource-board', 'Bảng nguồn lực xe & tài xế', LayoutGrid, {
                badge: 'FL-M1-11',
                badgeColor: 'bg-blue-50 text-blue-700 font-semibold',
              })}
              {renderNavItem('/partner/fleet-capacity', 'Năng lực nhận đơn', BarChart3)}
            </div>
          )}
        </div>

        {/* NHÓM 2: QUẢN LÝ ĐƠN CỨU HỘ */}
        <div className="space-y-0.5">
          {renderSectionHeader('orders', 'Quản lý đơn cứu hộ', ClipboardList, [
            '/station/create',
            '/app/quick-create',
            '/station/management',
            '/station/coverage',
          ])}
          {isGroupOpen('orders') && (
            <div className="space-y-0.5 pt-0.5 border-l-2 border-gray-100 ml-4 pl-1">
              {renderNavItem('/station/create', 'Tạo đơn cứu hộ', PlusCircle)}
              {renderNavItem('/app/quick-create', 'Tạo nhanh App', Smartphone, {
                badge: 'FL-M3-04',
                badgeColor: 'bg-amber-50 text-amber-700 font-semibold',
              })}
              {renderNavItem('/station/management', 'Danh sách đơn cứu hộ', ClipboardList)}
              {renderNavItem('/station/coverage', 'Bản đồ độ phủ trạm', MapPin)}
            </div>
          )}
        </div>

        {/* NHÓM 3: QUẢN LÝ ĐỘI XE */}
        <div className="space-y-0.5">
          {renderSectionHeader('fleet', 'Quản lý đội xe', Car, [
            '/partner/vehicles',
            '/partner/tool-config',
            '/partner/maintenance?tab=schedule',
            '/partner/maintenance?tab=requests',
            '/partner/maintenance?tab=orders',
            '/partner/maintenance?tab=history',
          ])}
          {isGroupOpen('fleet') && (
            <div className="space-y-1 pt-0.5 border-l-2 border-gray-100 ml-4 pl-1">
              {/* Submenu: Hồ sơ phương tiện */}
              <div>
                {renderSubmenuHeader('fleetVehicles', 'Hồ sơ phương tiện', Car, [
                  '/partner/vehicles',
                  '/partner/tool-config',
                ])}
                {isGroupOpen('fleetVehicles') && (
                  <div className="space-y-0.5 mt-0.5 ml-4 pl-2 border-l border-gray-200">
                    {renderNavItem('/partner/vehicles', 'Danh sách phương tiện', Car, { indent: false })}
                    {renderNavItem('/partner/tool-config', 'Cấu hình công cụ xe', Settings2, {
                      indent: false,
                    })}
                  </div>
                )}
              </div>

              {/* Submenu: Quản lý bảo dưỡng */}
              <div>
                {renderSubmenuHeader('fleetMaintenance', 'Bảo dưỡng & Sửa chữa', Wrench, [
                  '/partner/maintenance?tab=schedule',
                  '/partner/maintenance?tab=requests',
                  '/partner/maintenance?tab=orders',
                  '/partner/maintenance?tab=history',
                ])}
                {isGroupOpen('fleetMaintenance') && (
                  <div className="space-y-0.5 mt-0.5 ml-4 pl-2 border-l border-gray-200">
                    {renderNavItem(
                      '/partner/maintenance?tab=schedule',
                      'Lịch bảo dưỡng',
                      Calendar,
                      { indent: false }
                    )}
                    {renderNavItem(
                      '/partner/maintenance?tab=requests',
                      'Yêu cầu sửa chữa',
                      AlertTriangle,
                      { indent: false }
                    )}
                    {renderNavItem(
                      '/partner/maintenance?tab=orders',
                      'Lệnh sửa chữa / bảo dưỡng',
                      ClipboardList,
                      { indent: false }
                    )}
                    {renderNavItem(
                      '/partner/maintenance?tab=history',
                      'Lịch sử bảo dưỡng',
                      History,
                      { indent: false }
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* NHÓM 4: NHÂN SỰ & CA TRỰC */}
        <div className="space-y-0.5">
          {renderSectionHeader(
            'workforce',
            'Nhân sự & Ca trực',
            Users,
            isAdmin
              ? ['/partner/staff', '/partner/shift-config', '/partner/shift-schedule']
              : ['/partner/staff', '/partner/shift-schedule']
          )}
          {isGroupOpen('workforce') && (
            <div className="space-y-0.5 pt-0.5 border-l-2 border-gray-100 ml-4 pl-1">
              {renderNavItem('/partner/staff', 'Danh sách nhân viên', Users)}
              {isAdmin && renderNavItem('/partner/shift-config', 'Cấu hình ca làm việc', Calendar)}
              {renderNavItem('/partner/shift-schedule', 'Lịch ca', CalendarDays)}
            </div>
          )}
        </div>

        {/* NHÓM 5: BÁO CÁO & THỐNG KÊ */}
        <div className="space-y-0.5">
          {renderSectionHeader('reports', 'Báo cáo & Thống kê', BarChart3, ['/partner/reports'])}
          {isGroupOpen('reports') && (
            <div className="space-y-0.5 pt-0.5 border-l-2 border-gray-100 ml-4 pl-1">
              {renderNavItem('/partner/reports', 'Báo cáo vận hành', BarChart3)}
            </div>
          )}
        </div>

        {/* NHÓM 6: CẤU HÌNH & QUẢN TRỊ */}
        <div className="space-y-0.5">
          {renderSectionHeader('system', 'Cấu hình & Quản trị', Settings2, [
            '/partner/org',
            '/admin/rescue-providers',
            '/admin/rescue-stations',
            '/admin/rescue-packages',
            '/admin/rescue-services',
            '/rescue-fee-config',
            '/staff-management',
          ])}
          {isGroupOpen('system') && (
            <div className="space-y-0.5 pt-0.5 border-l-2 border-gray-100 ml-4 pl-1">
              {renderNavItem('/partner/org', 'Cơ cấu tổ chức & Trạm', GitBranch)}
              {renderNavItem('/admin/rescue-providers', 'Quản lý đối tác cứu hộ', Store)}
              {renderNavItem('/admin/rescue-stations', 'Quản lý trạm cứu hộ', Building2)}
              {renderNavItem('/admin/rescue-packages', 'Cấu hình gói cứu hộ', Package)}
              {renderNavItem('/admin/rescue-services', 'Danh mục dịch vụ', Wrench)}
              {renderNavItem('/rescue-fee-config', 'Cấu hình phí cứu hộ', DollarSign)}
              {renderNavItem('/staff-management', 'Tài khoản & Phân quyền', ShieldCheck)}
            </div>
          )}
        </div>
      </nav>

      {/* Footer System Info */}
      <div className="p-3 border-t bg-gray-50/70 text-gray-500 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
          <span>Hệ thống RSA Fleet</span>
          <span className="text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">
            v2.5.0
          </span>
        </div>
        <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
          <span>VETC • Carpla</span>
          <span>Tháng 10/2026</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
