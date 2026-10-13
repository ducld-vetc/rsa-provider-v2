import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {AnimatePresence, motion} from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Building2,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Banknote,
  Bell,
  Download,
  Edit,
  Eye,
  FileText,
  Hash,
  Info,
  LifeBuoy,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  Smartphone,
  Sparkles,
  Star,
  Pencil,
  Table2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  User,
  UserCheck,
  UserX,
  Video,
  Wrench,
  X
} from 'lucide-react';
import ImageUploadSection from '../shared/ImageUploadSection';
import RescueVehicleCameraSection from '../shared/RescueVehicleCameraSection';
import RescueGpsPlaybackSection from '../shared/RescueGpsPlaybackSection';
import ServiceSelectionField from '../shared/ServiceSelectionField';
import AISuggestionSection from '../shared/AISuggestionSection';
import RescueList from './RescueList';
import ManualStationSearch from '../components/ManualStationSearch';
import MapSelectionModal from '../shared/MapSelectionModal';
import CancellationDialog from '../shared/CancellationDialog';
import InvoicePreviewModal from '../shared/InvoicePreviewModal';
import CustomerPaymentModal, {
  CustomerPaymentSession,
  CustomerPaymentType
} from '../shared/CustomerPaymentModal';
import CustomerFeeChangeWarningModal, {
  CustomerFeeWarningType
} from '../shared/CustomerFeeChangeWarningModal';
import GuaranteeRateChangeWarningModal from '../shared/GuaranteeRateChangeWarningModal';
import ManualFeeRecalcWarningModal from '../shared/ManualFeeRecalcWarningModal';
import UnpaidDepositRemainingWarningModal from '../shared/UnpaidDepositRemainingWarningModal';
import ProviderPaymentConfirmDialog from '../shared/ProviderPaymentConfirmDialog';
import UsageHistoryModal, {
  DEFAULT_PACKAGE_ORDERS,
  hasOrderCreatedToday,
} from '../shared/UsageHistoryModal';
import StatusUpdateModal, { STATUS_OPTIONS } from '../shared/StatusUpdateModal';
import type { OrderDetailsNavState } from '../data/orderListDemoData';
import ShareLocationWebviewModal from '../shared/ShareLocationWebviewModal';
import DetailedRatingCard from '../shared/DetailedRatingCard';
import RatingHistoryModal from '../shared/RatingHistoryModal';
import VehicleInfoLookupModal from '../shared/VehicleInfoLookupModal';
import { VehicleRescuePackage, VehicleSearchResult } from '../shared/VehiclePlateSearchModal';
import PriorityCustomerBadge from '../shared/PriorityCustomerBadge';
import { OrderWarningBadge, FloodWarningBadge, CustomerUpdatedBadge, CustomerUpdateStatusBadge } from '../shared/OrderAlertBadges';
import { isPriorityCustomerPhone } from '../shared/priorityCustomer';
import { RatingType, RATING_TYPE_LABELS } from '../shared/ratingTypes';
import { INITIAL_RATING_HISTORIES, RATING_DEMO_CASES } from '../data/ratingMockData';
import {AISuggestion, analyzeIncident} from '../data/aiDataMock';
import {FormData, RescueUnit} from '../types';
import Searching from "./Searching";
import PartnerSelect from '../components/PartnerSelect';
import PaymentRequestSection from '../shared/PaymentRequestSection';
import DriverSelect from '../components/DriverSelect';
import WorkshopSelect from '../shared/WorkshopSelect';
import { INITIAL_WORKSHOP_STATIONS, WorkshopStation } from '../data/workshopStations';
import { MOCK_RESCUE_SERVICES, SERVICE_CATEGORY_LABEL } from '../data/rescueServiceMockData';
import type { FixedSponsorRule, SponsorCategory } from '../data/rescuePackageMockData';
import {
  calculateRescueFees,
  getRetailMarkupFactor,
  formatMoneyVi,
  getActiveIncidentalFeeOptions,
  formatTimeRangeLabel,
  isTimeSurchargeCriterion,
  inferServiceType,
  rescueFeeTables,
  FEE_OBJECT_TYPE_LABELS,
  FEE_STATUS_LABELS,
  type FeeSnapshot,
  type FeeRuleCondition,
  type FeeCalculationInput,
  type PriceTable,
  type SurchargeBreakdownItem,
} from '../data/rescueFeeMockData';

interface ActualService {
  id: string;
  name: string;
  price: string;
  isCustom?: boolean;
}

const DRIVERS_MOCK = [
  { id: 'D1', name: 'Nguyễn Văn Tài', phone: '0911222333' },
  { id: 'D2', name: 'Trần Minh Quang', phone: '0988777666' },
  { id: 'D3', name: 'Lê Văn Hùng', phone: '0944555111' },
  { id: 'D4', name: 'Phạm Đức Anh', phone: '0900111222' }
];

type OrderPaymentStatus = 'PENDING' | 'DEPOSITED' | 'PAID';

const PAYMENT_STATUS_CONFIG: Record<OrderPaymentStatus, { label: string; color: string; dot: string }> = {
  PENDING: {
    label: 'Chờ thanh toán',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500'
  },
  DEPOSITED: {
    label: 'Đã cọc tiền',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500'
  },
  PAID: {
    label: 'Đã thanh toán',
    color: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500'
  }
};

const resolveOrderPaymentStatus = (
  totalDue: number,
  paid: number,
  deposited: number,
  remaining: number
): OrderPaymentStatus => {
  if (totalDue > 0 && remaining === 0 && paid >= totalDue) return 'PAID';
  if (deposited > 0 || paid > 0) return 'DEPOSITED';
  return 'PENDING';
};

type CustomerUpdateRequestStatus = 'idle' | 'pushing' | 'waiting' | 'completed';

const formatDateTimeVi = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const CUSTOMER_SUBMITTED_ADDRESS =
  'Vị trí hiện tại — Ngõ 192 Phố Hào Nam, Phường Ô Chợ Dừa, Quận Đống Đa, Hà Nội';
const CUSTOMER_SUBMITTED_COORDS = '21.026412, 105.826015';
const CUSTOMER_SUBMITTED_IMAGES = [
  'https://picsum.photos/id/111/800/600',
  'https://picsum.photos/id/133/800/600',
  'https://picsum.photos/id/146/800/600',
];
const CUSTOMER_SUBMITTED_DESCRIPTION =
  '- Hiện tượng: Xe không đề được, đèn báo lỗi sáng.\n' +
  '- Khả năng di chuyển: Không di chuyển được, đang dừng bên đường.\n' +
  '- Dấu hiệu bất thường: Có tiếng kêu lạ khi đề máy.\n' +
  '- Phán đoán nguyên nhân: Có thể ắc quy yếu / hệ thống điện.\n' +
  '- Thời điểm: Vừa xảy ra, khách hàng gửi từ app.';

const TRIP_PACKAGE_NAME = 'Bảo hiểm chuyến đi DIG + CHUBB';

/** Bảo lãnh FIXED theo gói TRIP — một dòng = một quỹ (nhóm dùng chung hoặc đúng một dịch vụ). */
const PACKAGE_FIXED_SPONSOR: Record<string, FixedSponsorRule[]> = {
  [TRIP_PACKAGE_NAME]: [
    { categories: ['RESCUE_SERVICE', 'TOW_SERVICE'], serviceId: null, amount: 1_500_000 },
    { categories: ['REPAIR_SERVICE'], serviceId: 2, amount: 300_000 },
    { categories: ['REPAIR_SERVICE'], serviceId: 5, amount: 300_000 },
  ],
};

const TRIP_SPONSOR_ENTERPRISE = 'CHUBB';

const categoryLabel = (code: SponsorCategory) => SERVICE_CATEGORY_LABEL[code] ?? code;

const describeSponsorRule = (rule: FixedSponsorRule) => {
  if (rule.serviceId != null) {
    const service = MOCK_RESCUE_SERVICES.find((item) => item.id === rule.serviceId);
    return {
      kind: 'Dịch vụ' as const,
      name: service?.name ?? `Dịch vụ #${rule.serviceId}`,
      note: 'Bảo lãnh riêng dịch vụ',
    };
  }
  return {
    kind: 'Loại dịch vụ' as const,
    name: rule.categories.map(categoryLabel).join(', '),
    note: rule.categories.length > 1 ? 'Một quỹ dùng chung' : 'Bảo lãnh theo loại dịch vụ',
  };
};

const PACKAGE_LIST = [
  {
    id: 'TRIP',
    name: TRIP_PACKAGE_NAME,
    packageType: 'TRIP' as const,
    details: [
      { stt: 1, name: 'Kích bình ắc quy', used: 0, limit: 1 },
      { stt: 2, name: 'Thay lốp dự phòng', used: 0, limit: 1 },
      { stt: 3, name: 'Cứu hộ', used: 0, limit: 100 },
      { stt: 4, name: 'Cẩu kéo', used: 0, limit: 100 }
    ]
  },
  {
    id: 'BASIC',
    name: 'Gói cơ bản 10 dịch vụ',
    packageType: 'ALWAYS' as const,
    details: [
      { stt: 1, name: 'Kích bình ắc quy', used: 1, limit: 100 },
      { stt: 2, name: 'Sự cố kỹ thuật khác khiến xe không di chuyển', used: 0, limit: 100 },
      { stt: 3, name: 'Hỗ trợ 24/7, không giới hạn số lần sử dụng', used: 0, limit: 100 },
      { stt: 4, name: 'Miễn phí kéo xe trong phạm vi 100 km', used: 0, limit: 100 }
    ]
  },
  {
    id: 'PREMIUM',
    name: 'Gói nâng cao Premium',
    packageType: 'ALWAYS' as const,
    details: [
      { stt: 1, name: 'Kích bình ắc quy', used: 2, limit: 100 },
      { stt: 2, name: 'Thay lốp dự phòng', used: 1, limit: 100 },
      { stt: 3, name: 'Cứu hộ thủy kích', used: 0, limit: 10 },
      { stt: 4, name: 'Kéo xe không giới hạn khoảng cách', used: 0, limit: 100 }
    ]
  }
];

const ADJUSTMENT_OPTIONS = [
  { 
    category: 'Thời gian', 
    options: [
      { label: 'Ngày', coef: 1.0 }, 
      { label: 'Đêm', coef: 1.2 }
    ] 
  },
  { 
    category: 'Vị trí', 
    options: [
      { label: 'Cao tốc', coef: 1.2 }, 
      { label: 'Đường đèo', coef: 1.5 }
    ] 
  },
  { 
    category: 'Thời tiết', 
    options: [
      { label: 'Mưa to', coef: 1.1 }, 
      { label: 'Bão', coef: 1.3 }
    ] 
  },
  { 
    category: 'Khoảng cách', 
    options: [
      { label: '<10km', coef: 1.0 }, 
      { label: '<20 km', coef: 1.2 }, 
      { label: '<50km', coef: 1.5 }, 
      { label: '<100km', coef: 2.0 }
    ] 
  },
];

type AdjustmentRow = {
  id: number;
  serviceName: string;
  fixedPrice: string;
  adjustmentType: string;
  partnerAdjustmentType?: string;
  /** Hệ số phía KH */
  customerCoefficient: string;
  /** Hệ số phía NCC */
  partnerCoefficient: string;
  /** @deprecated dùng partnerCoefficient — giữ để tương thích edit logic cũ */
  coefficient: string;
  ceilingPrice: string;
  discount: string;
  totalPrice: string;
  customerPaid: string;
  /** Phí KH cá nhân — khi thủ công tách riêng */
  customerPaidKhcn?: string;
  /** Phí KH doanh nghiệp — khi thủ công tách riêng */
  customerPaidKhdn?: string;
  isCustom?: boolean;
  isCustomerFeeManual?: boolean;
  isPartnerFeeManual?: boolean;
  customerSource?: string;
  partnerSource?: string;
  customerSurchargeItems?: SurchargeBreakdownItem[];
  partnerSurchargeItems?: SurchargeBreakdownItem[];
  customerCoefficientFormula?: string;
  partnerCoefficientFormula?: string;
};

const parseMoney = (value: string) => parseFloat(value.replace(/,/g, '')) || 0;

const formatMoneyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('en-US');
};

const applyVatAfterTax = (beforeTax: number, vatPercent: number) =>
  Math.round(beforeTax * (1 + vatPercent / 100));

const applyVatBeforeTax = (afterTax: number, vatPercent: number) =>
  vatPercent > 0 ? afterTax / (1 + vatPercent / 100) : afterTax;

const calculateCustomerTotal = (rows: AdjustmentRow[]) =>
  rows.reduce((sum, row) => sum + parseMoney(row.customerPaid), 0);

const calculateProviderTotal = (rows: AdjustmentRow[]) =>
  rows.reduce((sum, row) => sum + parseMoney(row.totalPrice), 0);

type GuaranteeType = 'rate' | 'fixed';

type GuaranteeSplitConfig = {
  active: boolean;
  type: GuaranteeType;
  rate: number;
  amount: number;
};

type PendingGuaranteeChange =
  | { kind: 'rate'; value: string }
  | { kind: 'amount'; value: string }
  | { kind: 'type'; value: GuaranteeType };

const GUARANTEE_TYPE_OPTIONS: { value: GuaranteeType; label: string }[] = [
  { value: 'rate', label: 'Theo tỷ lệ' },
  { value: 'fixed', label: 'Số tiền bảo lãnh cố định' },
];

/** Tách tổng phí KH thành Phí KHCN / Phí KHDN theo tỷ lệ bảo lãnh */
const splitCustomerFeeByRate = (total: number, rate: number) => {
  if (rate <= 0) {
    return { khcn: total, khdn: 0 };
  }
  const khdn = Math.round((total * rate) / 100);
  return { khcn: total - khdn, khdn };
};

/** Phân bổ số tiền bảo lãnh cố định theo tỷ trọng phí từng dòng */
const allocateFixedGuaranteeAmounts = (rowTotals: number[], amount: number): number[] => {
  const grand = rowTotals.reduce((sum, total) => sum + total, 0);
  const cap = Math.min(Math.max(0, amount), grand);
  if (cap <= 0 || grand <= 0) return rowTotals.map(() => 0);

  let remaining = cap;
  return rowTotals.map((total, index) => {
    const isLast = index === rowTotals.length - 1;
    const share = isLast
      ? Math.min(remaining, total)
      : Math.min(Math.round((cap * total) / grand), remaining, total);
    remaining -= share;
    return share;
  });
};

const resolveAllRowKhFees = (
  rows: AdjustmentRow[],
  config: GuaranteeSplitConfig
): Map<number, { khcn: number; khdn: number }> => {
  const result = new Map<number, { khcn: number; khdn: number }>();
  const autoRows: AdjustmentRow[] = [];

  for (const row of rows) {
    if (
      row.isCustomerFeeManual &&
      row.customerPaidKhcn != null &&
      row.customerPaidKhdn != null
    ) {
      result.set(row.id, {
        khcn: parseMoney(row.customerPaidKhcn),
        khdn: parseMoney(row.customerPaidKhdn),
      });
    } else {
      autoRows.push(row);
    }
  }

  if (!config.active) {
    for (const row of autoRows) {
      result.set(row.id, { khcn: parseMoney(row.customerPaid), khdn: 0 });
    }
    return result;
  }

  if (config.type === 'rate') {
    for (const row of autoRows) {
      result.set(row.id, splitCustomerFeeByRate(parseMoney(row.customerPaid), config.rate));
    }
    return result;
  }

  const totals = autoRows.map((row) => parseMoney(row.customerPaid));
  const khdnShares = allocateFixedGuaranteeAmounts(totals, config.amount);
  autoRows.forEach((row, index) => {
    result.set(row.id, {
      khcn: totals[index] - khdnShares[index],
      khdn: khdnShares[index],
    });
  });
  return result;
};

const hasManualFeeOverrides = (rows: AdjustmentRow[]) =>
  rows.some(
    (row) =>
      row.isCustomerFeeManual === true ||
      row.isPartnerFeeManual === true ||
      row.customerSource === 'Thủ công' ||
      row.partnerSource === 'Thủ công'
  );

const mapUiWeatherToEngine = (label: string): NonNullable<FeeCalculationInput['weather']> => {
  const normalized = label.toLowerCase();
  if (normalized.includes('thiên') || normalized.includes('bão')) return 'STORM';
  if (normalized.includes('mưa') || normalized.includes('ngập')) return 'RAIN';
  return 'NORMAL';
};

const mapUiSeverityToEngine = (label: string): NonNullable<FeeCalculationInput['severity']> => {
  if (label === 'Nguy hiểm') return 'HIGH';
  if (label === 'Mắc kẹt') return 'MEDIUM';
  return 'LOW';
};

type FeeCriteriaPatch = Partial<{
  weather: string;
  severityLevel: string;
  rescueDistance: string;
  selectedEnterprise: string;
  partnerName: string;
  stationName: string;
}>;

type PendingFeeCriteriaChange = {
  description: string;
  patch: FeeCriteriaPatch;
};

/** Phân bổ tổng mới theo tỷ lệ hiện tại; dòng cuối nhận phần dư để khớp đúng tổng. */
const distributeTotalAcrossRows = (
  rows: AdjustmentRow[],
  targetTotal: number,
  getAmount: (row: AdjustmentRow) => number,
  applyAmount: (row: AdjustmentRow, amount: number) => AdjustmentRow
): AdjustmentRow[] => {
  if (rows.length === 0) return rows;
  const safeTarget = Math.max(0, Math.round(targetTotal));
  const currentTotal = rows.reduce((sum, row) => sum + getAmount(row), 0);

  if (currentTotal <= 0) {
    const base = Math.floor(safeTarget / rows.length);
    let remainder = safeTarget - base * rows.length;
    return rows.map((row) => {
      const amount = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return applyAmount(row, amount);
    });
  }

  const ratio = safeTarget / currentTotal;
  let allocated = 0;
  return rows.map((row, index) => {
    if (index === rows.length - 1) {
      return applyAmount(row, Math.max(0, safeTarget - allocated));
    }
    const next = Math.round(getAmount(row) * ratio);
    allocated += next;
    return applyAmount(row, next);
  });
};

const partnerCoefOf = (row: AdjustmentRow) =>
  parseFloat(row.partnerCoefficient ?? row.coefficient) || 0;

const parseAdjustmentLabels = (value?: string) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const formatSurchargeRate = (item: SurchargeBreakdownItem): string => {
  if (item.type === 'FIXED') {
    return `+${item.value.toLocaleString('en-US')}đ`;
  }
  return `×${Number(item.value)}`;
};

const formatSurchargeTypeLabel = (type: SurchargeBreakdownItem['type']): string =>
  type === 'FIXED' ? 'Cố định' : 'Hệ số';

const buildItemsFromAdjustmentLabels = (labels: string[]): SurchargeBreakdownItem[] => {
  const items: SurchargeBreakdownItem[] = [];
  labels.forEach((label) => {
    ADJUSTMENT_OPTIONS.forEach((cat) => {
      const opt = cat.options.find((o) => o.label === label);
      if (opt) {
        items.push({ name: label, type: 'COEFFICIENT', value: opt.coef });
      }
    });
  });
  return items;
};

const buildCoefFormulaFromItems = (items: SurchargeBreakdownItem[]): string => {
  const coefs = items.filter((i) => i.type === 'COEFFICIENT').map((i) => i.value);
  if (coefs.length === 0) return 'Không có hệ số phụ phí (×1)';
  if (coefs.length === 1) return `Hệ số = ${coefs[0]} (lấy max khi chọn nhiều loại)`;
  const max = Math.max(...coefs);
  return `Lấy hệ số lớn nhất: max(${coefs.join(', ')}) = ${max}`;
};

const CoefficientWithTooltip = ({
  value,
  items,
  formula,
  highlight,
  tone = 'neutral',
}: {
  value?: string;
  items: SurchargeBreakdownItem[];
  formula?: string;
  highlight?: boolean;
  tone?: 'customer' | 'neutral';
}) => {
  const hasDetail = items.length > 0 || Boolean(formula);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeBelow: boolean }>({
    top: 0,
    left: 0,
    placeBelow: false,
  });

  const textTone = highlight
    ? 'text-amber-700'
    : tone === 'customer'
      ? 'text-blue-700'
      : 'text-gray-700';

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const estimatedHeight = 16 + (items.length > 0 ? 28 + items.length * 18 : 0) + (formula ? 40 : 0);
      const placeBelow = rect.top < estimatedHeight + 12;
      setCoords({
        top: placeBelow ? rect.bottom + 8 : rect.top - 8,
        left: Math.min(Math.max(rect.left + rect.width / 2, 140), window.innerWidth - 140),
        placeBelow,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, items.length, formula]);

  return (
    <div
      ref={triggerRef}
      className={`inline-flex items-center justify-center gap-1 ${textTone}`}
      onMouseEnter={() => hasDetail && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hasDetail && setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {value != null && value !== '' ? <span className="font-bold">{value}</span> : null}
      {hasDetail ? (
        <Info
          size={11}
          className={`shrink-0 cursor-help opacity-70 hover:opacity-100 ${
            tone === 'customer' ? 'text-blue-500' : 'text-gray-500'
          }`}
          aria-label={
            items.length
              ? `Loại phụ phí: ${items
                  .map((i) => `${i.name} ${formatSurchargeTypeLabel(i.type)} ${formatSurchargeRate(i)}`)
                  .join('; ')}`
              : formula
          }
        />
      ) : null}
      {open &&
        hasDetail &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform: coords.placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            }}
            className="pointer-events-none z-[9999] w-max max-w-[280px] rounded-md bg-gray-900 px-2.5 py-2 text-left text-[10px] font-medium leading-relaxed text-white shadow-lg"
          >
            {items.length > 0 ? (
              <div className="mb-1.5">
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-300">
                  Loại phụ phí & tỷ lệ
                </div>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li
                      key={`${item.name}-${item.type}-${item.value}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-white">• {item.name}</span>
                      <span className="shrink-0 text-right text-gray-200">
                        <span className="text-gray-400">{formatSurchargeTypeLabel(item.type)}</span>{' '}
                        <span className="font-bold text-amber-300">{formatSurchargeRate(item)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {formula ? (
              <div className={items.length > 0 ? 'border-t border-gray-700 pt-1.5' : ''}>
                <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-300">
                  Cách tính hệ số
                </div>
                <div className="text-gray-100">{formula}</div>
              </div>
            ) : null}
            <div
              className={`absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-transparent ${
                coords.placeBelow
                  ? 'bottom-full border-b-4 border-b-gray-900'
                  : 'top-full border-t-4 border-t-gray-900'
              }`}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

const applyTotalPriceToRow = (
  row: AdjustmentRow,
  totalPrice: number,
  options?: { retailMarkup?: number; preserveCustomerPaid?: boolean }
): AdjustmentRow => {
  const fixed = parseMoney(row.fixedPrice);
  const coef = partnerCoefOf(row);
  const diff = fixed * coef - totalPrice;
  const markup = options?.retailMarkup ?? getRetailMarkupFactor();

  let customerPaid = row.customerPaid;
  if (!options?.preserveCustomerPaid && !row.isCustomerFeeManual) {
    customerPaid = Math.round(totalPrice * markup).toLocaleString('en-US');
  }

  const next: AdjustmentRow = {
    ...row,
    totalPrice: totalPrice.toLocaleString('en-US'),
    customerPaid,
    discount: diff.toLocaleString('en-US'),
  };
  if (!options?.preserveCustomerPaid && !row.isCustomerFeeManual) {
    delete next.customerPaidKhcn;
    delete next.customerPaidKhdn;
  }
  return next;
};

const recalculateRowsFromFixedPrices = (rows: AdjustmentRow[]): AdjustmentRow[] =>
  rows.map((row) => {
    if (row.isPartnerFeeManual) {
      return applyTotalPriceToRow(row, parseMoney(row.totalPrice), { preserveCustomerPaid: true });
    }
    const fixed = parseMoney(row.fixedPrice);
    const coef = partnerCoefOf(row) || 1;
    return applyTotalPriceToRow(row, Math.round(fixed * coef), {
      preserveCustomerPaid: row.isCustomerFeeManual,
    });
  });

const computeUpdatedRows = (
  rows: AdjustmentRow[],
  id: number,
  field: string,
  value: string
): AdjustmentRow[] =>
  rows.map(row => {
    if (row.id !== id) return row;

    let processedValue = value;
    if (['fixedPrice', 'discount', 'customerPaid', 'ceilingPrice', 'totalPrice'].includes(field)) {
      const isNegative = value.trim().startsWith('-');
      const numericPart = value.replace(/[^0-9.]/g, '');
      const num = parseFloat(numericPart) || 0;
      processedValue = (isNegative ? -num : num).toLocaleString('en-US');
    }

    let updatedRow = { ...row, [field]: processedValue };

    if (field === 'totalPrice') {
      const numericPrice = parseMoney(processedValue);
      if (!updatedRow.isCustomerFeeManual) {
        updatedRow.customerPaid = Math.round(
          numericPrice * getRetailMarkupFactor()
        ).toLocaleString('en-US');
      }
    }

    if (field === 'partnerCoefficient' || field === 'coefficient') {
      updatedRow.partnerCoefficient = processedValue;
      updatedRow.coefficient = processedValue;
    }

    if (field === 'customerCoefficient') {
      const fixed = parseMoney(updatedRow.fixedPrice);
      const custCoef = parseFloat(processedValue) || 0;
      updatedRow.customerPaid = Math.round(fixed * custCoef).toLocaleString('en-US');
    }

    if (field === 'adjustmentType') {
      const selectedLabels = processedValue.split(',').map(s => s.trim()).filter(s => s !== '');
      let maxCoef = 1.0;

      selectedLabels.forEach(label => {
        ADJUSTMENT_OPTIONS.forEach(cat => {
          const opt = cat.options.find(o => o.label === label);
          if (opt && opt.coef > maxCoef) {
            maxCoef = opt.coef;
          }
        });
      });

      const coefStr = maxCoef.toFixed(2);
      updatedRow.coefficient = coefStr;
      updatedRow.partnerCoefficient = coefStr;
      const detailItems = buildItemsFromAdjustmentLabels(selectedLabels);
      updatedRow.partnerSurchargeItems = detailItems;
      updatedRow.partnerAdjustmentType = selectedLabels.join(', ');
      updatedRow.partnerCoefficientFormula = buildCoefFormulaFromItems(detailItems);
    }

    if (
      field === 'fixedPrice' ||
      field === 'coefficient' ||
      field === 'partnerCoefficient' ||
      field === 'totalPrice' ||
      field === 'adjustmentType'
    ) {
      const fixed = parseMoney(updatedRow.fixedPrice);
      const coef = partnerCoefOf(updatedRow);
      if (
        (field === 'fixedPrice' ||
          field === 'coefficient' ||
          field === 'partnerCoefficient' ||
          field === 'adjustmentType') &&
        !updatedRow.isPartnerFeeManual
      ) {
        const nextTotal = Math.round(fixed * coef);
        updatedRow.totalPrice = nextTotal.toLocaleString('en-US');
        if (!updatedRow.isCustomerFeeManual) {
          updatedRow.customerPaid = Math.round(
            nextTotal * getRetailMarkupFactor()
          ).toLocaleString('en-US');
        }
      }
      const total = parseMoney(updatedRow.totalPrice);
      const diff = fixed * coef - total;
      updatedRow.discount = diff.toLocaleString('en-US');
    }

    return updatedRow;
  });

const AdjustmentTypeSelect = ({
                                value,
                                onChange,
                                disabled
                              }: {
  value: string,
  onChange: (val: string) => void,
  disabled: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const selectedOptions = value ? value.split(',').map(s => s.trim()).filter(s => s !== '') : [];

  useLayoutEffect(() => {
    const updateCoords = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    updateCoords();
    if (isOpen) {
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  const toggleOption = (option: string) => {
    let newOptions;
    if (selectedOptions.includes(option)) {
      newOptions = selectedOptions.filter(o => o !== option);
    } else {
      newOptions = [...selectedOptions, option];
    }
    onChange(newOptions.join(', '));
  };

  return (
      <div className="relative" ref={triggerRef}>
        <div
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className={`flex items-start justify-between gap-1 px-2 py-1 border rounded cursor-pointer min-h-[34px] transition-all ${disabled ? 'bg-gray-50 text-gray-500 border-gray-100' : 'bg-white border-gray-200 hover:border-vetc-green'}`}
        >
          <div className="flex min-h-[22px] flex-1 flex-wrap gap-1">
            {selectedOptions.length === 0 && (
              <span className="text-[10px] italic text-gray-400">Chon...</span>
            )}
            {selectedOptions.map((opt) => (
              <span
                key={opt}
                className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-100"
                title={opt}
              >
                {opt}
              </span>
            ))}
          </div>
          {!disabled && (
            <ChevronDown
              size={12}
              className={`text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </div>

        <AnimatePresence>
          {isOpen && !disabled && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'fixed',
                      top: coords.top,
                      left: coords.left,
                      minWidth: '240px',
                      transformOrigin: 'top left'
                    }}
                    className="mt-1 bg-white border rounded-lg shadow-2xl z-[101] p-2 max-h-80 overflow-y-auto"
                >
                  {ADJUSTMENT_OPTIONS.map((cat) => (
                      <div key={cat.category} className="mb-2 last:mb-0">
                        <div className="text-[9px] font-black text-gray-400 uppercase mb-1 px-1 border-b border-gray-50 pb-0.5">{cat.category}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {cat.options.map((opt) => (
                              <label
                                  key={opt.label}
                                  className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${selectedOptions.includes(opt.label) ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${selectedOptions.includes(opt.label) ? 'bg-vetc-green border-vetc-green' : 'bg-white border-gray-300'}`}>
                                    {selectedOptions.includes(opt.label) && <Check size={10} className="text-white" />}
                                  </div>
                                  <input
                                      type="checkbox"
                                      className="hidden"
                                      checked={selectedOptions.includes(opt.label)}
                                      onChange={() => toggleOption(opt.label)}
                                  />
                                  <span className={`text-[10px] ${selectedOptions.includes(opt.label) ? 'text-green-700 font-bold' : 'text-gray-600'}`}>{opt.label}</span>
                                </div>
                                <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1 rounded">x{opt.coef.toFixed(1)}</span>
                              </label>
                          ))}
                        </div>
                      </div>
                  ))}
                  {selectedOptions.length > 0 && (
                      <div className="mt-2 pt-2 border-t flex justify-between items-center px-1">
                        <button
                            onClick={() => onChange('')}
                            className="text-[9px] text-red-500 font-bold hover:underline"
                        >
                          Xóa tất cả
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="bg-vetc-green text-white px-3 py-1 rounded text-[9px] font-bold"
                        >
                          Xong
                        </button>
                      </div>
                  )}
                </motion.div>
              </>
          )}
        </AnimatePresence>
      </div>
  );
};

const AVAILABLE_SERVICES = [
  'Kích bình ắc quy',
  'Thay lốp dự phòng',
  'Cung cấp nhiên liệu',
  'Cứu hộ kéo xe (Towing)',
  'Sửa chữa tại chỗ (Mobile Mechanic)',
  'Mở khóa xe (Locksmith)',
  'Xe hết pin',
  'Đâm, lật, tai nạn',
  'Dịch vụ khác'
];

const CANCEL_REASONS = [
  "Không còn cần dịch vụ",
  "Tìm được dịch vụ khác",
  "Tài xế đến quá chậm",
  "Giá cả không phù hợp",
  "Lý do khác"
];

const SectionHeader = ({ title, number, icon }: { title: string, number: number, icon?: React.ReactNode }) => (
    <div className="bg-vetc-green text-white px-4 py-2 rounded-t-lg font-bold text-sm flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="bg-white/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">{number}</span>
        <span>{title}</span>
      </div>
      {icon && <div className="opacity-80">{icon}</div>}
    </div>
);

const Label = ({ children, required = false }: { children?: React.ReactNode, required?: boolean }) => (
    <label className="text-[11px] font-bold text-gray-600 uppercase mb-1 flex items-center">
      {children} {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
);

const Input = ({
                 value,
                 defaultValue,
                 readOnly = false,
                 placeholder = "",
                 className = "",
                 onChange,
                 onBlur
               }: {
  value?: string,
  defaultValue?: string,
  readOnly?: boolean,
  placeholder?: string,
  className?: string,
  onChange?: (val: string|any) => void,
  onBlur?: () => void
}) => (
    <input
        type="text"
        value={value}
        defaultValue={defaultValue}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        className={`w-full border rounded px-3 py-1.5 text-xs outline-none focus:border-vetc-green transition-all ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-100' : 'bg-white'} ${className}`}
    />
);

const formatConditionValue = (condition: FeeRuleCondition): string => {
  if (isTimeSurchargeCriterion(condition.criterionKey) && condition.operator === 'BETWEEN') {
    return formatTimeRangeLabel(condition.value);
  }
  if (condition.operator === 'BETWEEN' && Array.isArray(condition.value)) {
    return `từ ${condition.value[0]} đến ${condition.value[1]}`;
  }
  const valueText = Array.isArray(condition.value)
    ? condition.value.join(', ')
    : String(condition.value ?? '');
  return `${condition.operator} ${valueText}`;
};

const AppliedPriceTableView: React.FC<{ table: PriceTable }> = ({ table }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px]">
      <div className="rounded border bg-gray-50 px-3 py-2">
        <div className="text-gray-500">Mã / phiên bản</div>
        <div className="font-bold text-gray-800">
          {table.code} · v{table.version}
        </div>
      </div>
      <div className="rounded border bg-gray-50 px-3 py-2">
        <div className="text-gray-500">Loại bảng</div>
        <div className="font-bold text-gray-800">{FEE_OBJECT_TYPE_LABELS[table.objectType]}</div>
      </div>
      <div className="rounded border bg-gray-50 px-3 py-2">
        <div className="text-gray-500">Trạng thái</div>
        <div className="font-bold text-gray-800">{FEE_STATUS_LABELS[table.status]}</div>
      </div>
      <div className="rounded border bg-gray-50 px-3 py-2">
        <div className="text-gray-500">Hiệu lực</div>
        <div className="font-bold text-gray-800">
          {table.validFrom} — {table.validTo}
        </div>
      </div>
    </div>

    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        Ma trận giá dịch vụ ({table.serviceRules.length})
      </div>
      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-[720px] border-collapse text-[11px]">
          <thead>
            <tr className="bg-gray-50 text-gray-600 border-b">
              <th className="p-2 text-left font-bold">Dịch vụ</th>
              <th className="p-2 text-left font-bold">Tiêu chí</th>
              <th className="p-2 text-right font-bold">Giá</th>
              <th className="p-2 text-right font-bold">Km gồm</th>
              <th className="p-2 text-right font-bold">Giá/km vượt</th>
            </tr>
          </thead>
          <tbody>
            {table.serviceRules.map((rule) => (
              <tr key={rule.id} className="border-b align-top">
                <td className="p-2 font-semibold text-gray-800">{rule.serviceDetail}</td>
                <td className="p-2">
                  {(rule.conditions ?? []).length === 0 ? (
                    <span className="text-gray-400">Giá mặc định</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {(rule.conditions ?? []).map((condition, index) => (
                        <span
                          key={`${rule.id}-${condition.criterionKey}-${index}`}
                          className="rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700"
                        >
                          {condition.criterionLabel} {formatConditionValue(condition)}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-2 text-right font-bold text-gray-800">
                  {formatMoneyVi(rule.basePrice)}
                  {rule.pricingMode === 'PER_UNIT' ? `/${rule.unit || 'đv'}` : ''}
                </td>
                <td className="p-2 text-right">{rule.includedKm ?? '—'}</td>
                <td className="p-2 text-right">
                  {rule.pricePerExtraKm != null ? formatMoneyVi(rule.pricePerExtraKm) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        Phụ phí ({table.surchargeRules.length})
      </div>
      {table.surchargeRules.length === 0 ? (
        <p className="text-[11px] text-gray-400">Không có phụ phí</p>
      ) : (
        <div className="space-y-2">
          {table.surchargeRules.map((surcharge) => (
            <div
              key={surcharge.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border bg-gray-50 px-3 py-2 text-[11px]"
            >
              <div className="min-w-0">
                <div className="font-bold text-gray-800">{surcharge.name}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {surcharge.conditions.map((condition, index) => (
                    <span
                      key={`${surcharge.id}-${condition.criterionKey}-${index}`}
                      className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-blue-700"
                    >
                      {condition.criterionLabel} {formatConditionValue(condition)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 font-bold text-amber-700">
                {surcharge.type === 'COEFFICIENT'
                  ? `×${surcharge.value}`
                  : `+${formatMoneyVi(surcharge.value)}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AppliedFeeTablesModal: React.FC<{
  open: boolean;
  onClose: () => void;
  snapshot: FeeSnapshot | null;
}> = ({ open, onClose, snapshot }) => {
  const navigate = useNavigate();
  const partnerTable = useMemo(
    () =>
      snapshot?.partnerTableId
        ? rescueFeeTables.find((table) => table.id === snapshot.partnerTableId) ?? null
        : null,
    [snapshot]
  );
  const customerTable = useMemo(
    () =>
      snapshot?.customerTableId
        ? rescueFeeTables.find((table) => table.id === snapshot.customerTableId) ?? null
        : null,
    [snapshot]
  );

  const [activeTab, setActiveTab] = useState<'PARTNER' | 'CUSTOMER'>('PARTNER');

  useEffect(() => {
    if (open) setActiveTab('PARTNER');
  }, [open]);

  const configTableId =
    activeTab === 'PARTNER'
      ? snapshot?.partnerTableId
      : snapshot?.customerTableId || snapshot?.partnerTableId;

  const handleOpenFeeConfig = () => {
    if (!configTableId) {
      onClose();
      navigate('/rescue-fee-config');
      return;
    }
    onClose();
    navigate(`/rescue-fee-config/${configTableId}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-t-4 border-vetc-green bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between bg-vetc-green px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Table2 size={20} />
            <div>
              <h3 className="text-sm font-bold">Bảng phí đang áp dụng</h3>
              <p className="text-[10px] text-white/80">
                Theo snapshot tính phí của đơn
                {snapshot?.calculatedAt
                  ? ` · ${new Date(snapshot.calculatedAt).toLocaleString('vi-VN')}`
                  : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-white/20"
            aria-label="Đóng"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex gap-2 border-b bg-gray-50 px-4 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('PARTNER')}
            className={`rounded-t-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
              activeTab === 'PARTNER'
                ? 'bg-white text-vetc-green border border-b-white border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bảng NCC
            {snapshot?.partnerTableCode ? ` · ${snapshot.partnerTableCode}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER')}
            className={`rounded-t-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wide ${
              activeTab === 'CUSTOMER'
                ? 'bg-white text-blue-700 border border-b-white border-gray-200 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Bảng KH
            {snapshot?.customerFeeMode === 'RETAIL_MARKUP'
              ? ' · Markup'
              : snapshot?.customerTableCode
                ? ` · ${snapshot.customerTableCode}`
                : ''}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'PARTNER' ? (
            partnerTable ? (
              <AppliedPriceTableView table={partnerTable} />
            ) : (
              <p className="text-sm text-gray-500">Không tìm thấy bảng phí NCC trên snapshot.</p>
            )
          ) : snapshot?.customerFeeMode === 'RETAIL_MARKUP' ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
              <div className="font-bold">Khách lẻ — hệ số markup</div>
              <p className="mt-1 text-xs leading-relaxed">
                Đơn không dùng bảng phí KH riêng. Phí KH = Giá NCC ×{' '}
                <span className="font-bold">
                  {snapshot.retailMarkupFactor ?? getRetailMarkupFactor()}
                </span>
                .
              </p>
              {partnerTable ? (
                <p className="mt-2 text-[11px] text-blue-800">
                  Tham chiếu bảng NCC: {partnerTable.code} — {partnerTable.name}
                </p>
              ) : null}
            </div>
          ) : customerTable ? (
            <AppliedPriceTableView table={customerTable} />
          ) : (
            <p className="text-sm text-gray-500">Không tìm thấy bảng phí KH trên snapshot.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-gray-50 px-4 py-3">
          <button
            type="button"
            onClick={handleOpenFeeConfig}
            className="inline-flex items-center gap-1.5 rounded bg-vetc-green px-4 py-2 text-xs font-bold text-white hover:bg-green-700"
          >
            <Settings size={14} />
            Xem cấu hình phí
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const GuestOrderDetails: React.FC<{
  role?: 'OSA' | 'ADMIN' | 'CSKH' | 'STATION' | 'DRIVER';
}> = ({ role = 'CSKH' }) => {
  const location = useLocation();
  const navState = (location.state ?? null) as OrderDetailsNavState | null;

  const [viewMode, setViewMode] = useState<'list' | 'tabs'>('list');
  const [activeTab, setActiveTab] = useState('general');

  const [selectedServices, setSelectedServices] = useState<string[]>(['Xe hết pin', 'Kích bình ắc quy', 'Đâm, lật, tai nạn']);
  const [actualServices, setActualServices] = useState<ActualService[]>([
    { id: '1', name: 'Xe hết pin', price: '200,000' },
    { id: '2', name: 'Kích bình ắc quy', price: '100,000' }
  ]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isFeeTableModalOpen, setIsFeeTableModalOpen] = useState(false);
  const [isOtherServiceFormOpen, setIsOtherServiceFormOpen] = useState(false);
  const [otherServiceKey, setOtherServiceKey] = useState('');
  const [otherServicePrice, setOtherServicePrice] = useState('');
  const otherServiceOptions = getActiveIncidentalFeeOptions();
  const [incidentDescription, setIncidentDescription] = useState(
      '- Hiện tượng: Xe không đề được, đề yếu.\n' +
      '- Khả năng di chuyển: Không di chuyển được.\n' +
      '- Dấu hiệu bất thường: Không có mùi khét, không rò rỉ.\n' +
      '- Phán đoán nguyên nhân: chưa rõ.\n' +
      '- Thời điểm: Đỗ qua đêm, sáng ra không nổ.'
  );
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isAiApplied, setIsAiApplied] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [customerType, setCustomerType] = useState('Cá nhân');
  const [selectedPackage, setSelectedPackage] = useState('Gói cơ bản 10 dịch vụ');
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('D1');
  const [driverPhone, setDriverPhone] = useState('0911222333');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isManualSearchModalOpen, setIsManualSearchModalOpen] = useState(false);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoicePreviewMode, setInvoicePreviewMode] = useState<'preview' | 'export' | 'adjust' | 'replace'>('preview');
  const [isExportingInvoice, setIsExportingInvoice] = useState(false);
  /** Sample case: đơn đã xuất hóa đơn thành công */
  const [invoiceDownloadUrl, setInvoiceDownloadUrl] = useState<string | null>(
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  );
  const [invoiceEmail, setInvoiceEmail] = useState('nguyenvana@email.com');
  const [invoiceCode] = useState('1C25TRA-136');
  const [invoiceExportedAt] = useState('10/09/2026 14:32');
  const [invoiceExportCount] = useState(1);
  const [invoiceExportedBy] = useState('Nguyễn Văn A');
  const [stateFindStation, setStateFindStation] = useState<'search' | 'list'>('search');

  // Location type state
  const [locationType, setLocationType] = useState('Đô thị');

  // Rescue Info State
  const [partnerName, setPartnerName] = useState('CARPLA - CARPLA SERVICE');
  const [stationName, setStationName] = useState('Carpla Service - CN Hà Nội');
  const [rescueVehicleType, setRescueVehicleType] = useState('Xe kéo cẩu');
  const [rescueLicensePlate, setRescueLicensePlate] = useState('30G-888.88');
  const [rescueDistance, setRescueDistance] = useState('8');
  const committedRescueDistanceRef = useRef('8');
  const [towingDestination, setTowingDestination] = useState('Ngõ 119 Hồ Đắc Di, Khu tập thể Nam Đồng, Phường Kim Liên, Quận Đống Đa, Thành phố Hà Nội, 11415, Việt Nam');
  const [towingCoords, setTowingCoords] = useState('21.01088443501316, 105.82813622447911');
  const [workshopStation, setWorkshopStation] = useState('Carpla Service Thái Bình');
  const [workshopStations, setWorkshopStations] = useState<WorkshopStation[]>(INITIAL_WORKSHOP_STATIONS);
  const [estimatedDistance, setEstimatedDistance] = useState('2.37');
  const [roadsideDistance, setRoadsideDistance] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advancePerson, setAdvancePerson] = useState('');

  const ENTERPRISE_OPTIONS = [
    { value: '', label: '-- Chọn doanh nghiệp --' },
    { value: 'VETC', label: 'VETC' },
    { value: 'FORD', label: 'Ford Việt Nam' },
    { value: 'TOYOTA', label: 'Toyota Việt Nam' },
    { value: 'HONDA', label: 'Honda Việt Nam' },
    { value: 'CHUBB', label: 'CHUBB BẢO HIỂM' },
  ];
  const [selectedEnterprise, setSelectedEnterprise] = useState('');
  const [hasGuarantee, setHasGuarantee] = useState<'yes' | 'no'>('no');
  const [guaranteeType, setGuaranteeType] = useState<GuaranteeType>('rate');
  const [guaranteeNote, setGuaranteeNote] = useState('');
  const [guaranteeRate, setGuaranteeRate] = useState('');
  const [guaranteeRateDraft, setGuaranteeRateDraft] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [guaranteeAmountDraft, setGuaranteeAmountDraft] = useState('');
  const [isSponsorDetailOpen, setIsSponsorDetailOpen] = useState(false);
  const [isGuaranteeRateWarningOpen, setIsGuaranteeRateWarningOpen] = useState(false);
  const [pendingGuaranteeChange, setPendingGuaranteeChange] = useState<PendingGuaranteeChange | null>(null);
  const [enterpriseEstimatedCost, setEnterpriseEstimatedCost] = useState('0');

  const selectedEnterpriseLabel =
    ENTERPRISE_OPTIONS.find((opt) => opt.value === selectedEnterprise)?.label ?? '';
  const canEditEnterpriseFees = role === 'ADMIN' && isEditing;
  const packageFixedSponsorRules =
    selectedPackage !== 'Không có' ? PACKAGE_FIXED_SPONSOR[selectedPackage] ?? [] : [];
  const hasPackageFixedSponsor = packageFixedSponsorRules.length > 0;
  const packageFixedSponsorTotal = packageFixedSponsorRules.reduce((sum, rule) => sum + rule.amount, 0);
  const isTripPackage = PACKAGE_LIST.some(
    (item) => item.name === selectedPackage && item.packageType === 'TRIP',
  );
  const tripGuaranteeLocked = isTripPackage;

  useEffect(() => {
    if (!isTripPackage) return;
    setSelectedEnterprise(TRIP_SPONSOR_ENTERPRISE);
    setHasGuarantee('yes');
    setGuaranteeType('fixed');
    const formatted = formatMoneyInput(String(packageFixedSponsorTotal));
    setGuaranteeAmount(formatted);
    setGuaranteeAmountDraft(formatted);
  }, [isTripPackage, packageFixedSponsorTotal, selectedPackage]);

  const resetGuaranteeFields = () => {
    setHasGuarantee('no');
    setGuaranteeType('rate');
    setGuaranteeNote('');
    setGuaranteeRate('');
    setGuaranteeRateDraft('');
    setGuaranteeAmount('');
    setGuaranteeAmountDraft('');
  };

  const handleEnterpriseChange = (value: string) => {
    if (PACKAGE_LIST.some((item) => item.name === selectedPackage && item.packageType === 'TRIP')) return;
    setSelectedEnterprise(value);
    if (!value) {
      resetGuaranteeFields();
      setEnterpriseEstimatedCost('0');
    }
  };

  const handleGuaranteeChange = (value: 'yes' | 'no') => {
    if (PACKAGE_LIST.some((item) => item.name === selectedPackage && item.packageType === 'TRIP')) return;
    setHasGuarantee(value);
    if (value === 'no') {
      setGuaranteeType('rate');
      setGuaranteeRate('');
      setGuaranteeRateDraft('');
      setGuaranteeAmount('');
      setGuaranteeAmountDraft('');
    }
  };

  const handleGuaranteeTypeDraftChange = (value: GuaranteeType) => {
    if (!isEditing || tripGuaranteeLocked || value === guaranteeType || isGuaranteeRateWarningOpen) return;
    const hasExistingValue = Boolean(guaranteeRate) || parseMoney(guaranteeAmount) > 0;
    if (hasExistingValue) {
      setPendingGuaranteeChange({ kind: 'type', value });
      setIsGuaranteeRateWarningOpen(true);
      return;
    }
    setGuaranteeType(value);
  };

  const normalizeGuaranteeRate = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10);
    if (num < 1) return '';
    if (num > 100) return '100';
    return String(num);
  };

  const handleGuaranteeRateDraftChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setGuaranteeRateDraft('');
      return;
    }
    const num = parseInt(digits, 10);
    if (num > 100) {
      setGuaranteeRateDraft('100');
      return;
    }
    setGuaranteeRateDraft(digits);
  };

  const handleGuaranteeRateBlur = () => {
    if (!isEditing || isGuaranteeRateWarningOpen) return;

    const normalized = normalizeGuaranteeRate(guaranteeRateDraft);
    setGuaranteeRateDraft(normalized);

    if (normalized === guaranteeRate) return;

    setPendingGuaranteeChange({ kind: 'rate', value: normalized });
    setIsGuaranteeRateWarningOpen(true);
  };

  const handleGuaranteeAmountDraftChange = (value: string) => {
    setGuaranteeAmountDraft(formatMoneyInput(value));
  };

  const handleGuaranteeAmountBlur = () => {
    if (!isEditing || isGuaranteeRateWarningOpen) return;

    const normalized = formatMoneyInput(guaranteeAmountDraft);
    setGuaranteeAmountDraft(normalized);

    if (normalized === guaranteeAmount) return;

    setPendingGuaranteeChange({ kind: 'amount', value: normalized });
    setIsGuaranteeRateWarningOpen(true);
  };

  const handleConfirmGuaranteeRateChange = () => {
    if (!pendingGuaranteeChange) return;
    if (pendingGuaranteeChange.kind === 'rate') {
      setGuaranteeRate(pendingGuaranteeChange.value);
      setGuaranteeRateDraft(pendingGuaranteeChange.value);
    } else if (pendingGuaranteeChange.kind === 'amount') {
      setGuaranteeAmount(pendingGuaranteeChange.value);
      setGuaranteeAmountDraft(pendingGuaranteeChange.value);
    } else {
      setGuaranteeType(pendingGuaranteeChange.value);
    }
    setPendingGuaranteeChange(null);
    setIsGuaranteeRateWarningOpen(false);
  };

  const handleCancelGuaranteeRateChange = () => {
    setGuaranteeRateDraft(guaranteeRate);
    setGuaranteeAmountDraft(guaranteeAmount);
    setPendingGuaranteeChange(null);
    setIsGuaranteeRateWarningOpen(false);
  };

  const handleEnterpriseEstimatedCostChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setEnterpriseEstimatedCost('');
      return;
    }
    setEnterpriseEstimatedCost(parseInt(digits, 10).toLocaleString('en-US'));
  };

  // Adjustment Coefficients Data state — khởi tạo từ engine bảng phí
  const mapBreakdownLinesToRows = (
    lines: ReturnType<typeof calculateRescueFees>['lines'],
    idOffset = 0
  ): AdjustmentRow[] =>
    lines.map((line, idx) => ({
      id: idOffset + idx + 1,
      serviceName: line.serviceName,
      fixedPrice: formatMoneyVi(line.fixedPrice),
      adjustmentType: line.adjustmentLabels.join(', '),
      partnerAdjustmentType: (line.partnerAdjustmentLabels || []).join(', '),
      customerCoefficient: String(line.coefficient),
      partnerCoefficient: String(line.partnerCoefficient),
      coefficient: String(line.partnerCoefficient),
      ceilingPrice: '0',
      discount: formatMoneyVi(line.discount),
      totalPrice: formatMoneyVi(line.partnerAmount),
      customerPaid: formatMoneyVi(line.customerAmount),
      isCustom: false,
      isCustomerFeeManual: false,
      isPartnerFeeManual: false,
      customerSource: line.customerSource,
      partnerSource: line.partnerSource,
      customerSurchargeItems: line.customerSurchargeItems ?? [],
      partnerSurchargeItems: line.partnerSurchargeItems ?? [],
      customerCoefficientFormula: line.customerCoefficientFormula,
      partnerCoefficientFormula: line.partnerCoefficientFormula,
    }));

  const buildInitialFeeRows = (): { rows: AdjustmentRow[]; snapshot: FeeSnapshot | null } => {
    const breakdown = calculateRescueFees({
      customerType: 'PACKAGE',
      partnerType: 'INTERNAL',
      packageBenefitAmount: 800000,
      weather: 'NORMAL',
      isNight: true,
      lines: [
        { serviceName: 'Xe hết pin', serviceType: 'ONSITE' },
        { serviceName: 'Kích bình ắc quy', serviceType: 'ONSITE' },
        { serviceName: 'Đâm, tai nạn, lật', serviceType: 'ONSITE' },
      ],
    });

    return { rows: mapBreakdownLinesToRows(breakdown.lines), snapshot: breakdown.snapshot };
  };

  const initialFeeBundle = buildInitialFeeRows();
  const [adjustmentRows, setAdjustmentRows] = useState<AdjustmentRow[]>(initialFeeBundle.rows);
  const [feeSnapshot, setFeeSnapshot] = useState<FeeSnapshot | null>(initialFeeBundle.snapshot);
  const [customerTotalOverride, setCustomerTotalOverride] = useState<string | null>(null);
  const [feeCriteriaOutOfSync, setFeeCriteriaOutOfSync] = useState(false);
  const [isManualFeeRecalcWarningOpen, setIsManualFeeRecalcWarningOpen] = useState(false);
  const [pendingFeeCriteriaChange, setPendingFeeCriteriaChange] =
    useState<PendingFeeCriteriaChange | null>(null);
  const pendingFeeCriteriaExtraApplyRef = useRef<(() => void) | null>(null);
  /** Sticky flag — tránh miss modal vì state dòng chưa kịp sync khi đổi tiêu chí ngay sau sửa phí */
  const manualFeeTouchedRef = useRef(false);

  const markManualFeeTouched = () => {
    manualFeeTouchedRef.current = true;
  };

  const clearManualFeeTouched = () => {
    manualFeeTouchedRef.current = false;
  };

  // One order must use a single customer fee table source.
  const customerFeeSourceText =
    feeSnapshot?.customerFeeMode === 'BUSINESS'
      ? selectedEnterprise || feeSnapshot.customerTableCode || 'VETC'
      : 'VETC';
  const partnerFeeSourceText =
    feeSnapshot?.partnerTableCode?.includes('INT') ||
    partnerName.toLowerCase().includes('vetc') ||
    partnerName.toLowerCase().includes('carpla')
      ? 'VETC'
      : 'NCC';

  // Map States
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapAddress, setMapAddress] = useState(
    navState?.address ??
      'Hanoi Metro Cafe & Canteen, 192, Phố Hào Nam, Phường Ô Chợ Dừa, Quận Đống Đa, Thành phố Hà Nội, 10060, Việt Nam'
  );
  const [displayOrderId, setDisplayOrderId] = useState(navState?.orderId ?? 'RS12602020002');
  const [customerName, setCustomerName] = useState(navState?.customerName ?? 'Vương Đăng Minh');
  const [customerPhone, setCustomerPhone] = useState(navState?.customerPhone ?? '0967419411');
  const [vehiclePlate, setVehiclePlate] = useState(navState?.plate ?? '29E366666');
  const [vehicleVin, setVehicleVin] = useState('R7C2X9M4A8');
  const [vehicleBrand, setVehicleBrand] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Sedan');
  const [vehicleLoadTons, setVehicleLoadTons] = useState('1');
  const [vehicleSeats, setVehicleSeats] = useState('5');
  const [vehicleType, setVehicleType] = useState('Xe chở hàng');
  const [isVehicleSearchOpen, setIsVehicleSearchOpen] = useState(false);
  const [vehicleLookupMode, setVehicleLookupMode] = useState<'plate' | 'vin' | 'auto'>('plate');
  const [vehicleLookupQuery, setVehicleLookupQuery] = useState('');
  const [sceneImages, setSceneImages] = useState<string[]>([]);

  const openVehicleLookup = (mode: 'plate' | 'vin') => {
    setVehicleLookupMode(mode);
    setVehicleLookupQuery(mode === 'plate' ? vehiclePlate : vehicleVin);
    setIsVehicleSearchOpen(true);
  };

  const handleApplyVehicleInfo = (
    vehicle: VehicleSearchResult,
    _selectedPackage: VehicleRescuePackage | null
  ) => {
    setVehiclePlate(vehicle.plate);
    setVehicleVin(vehicle.vin);
    setVehicleBrand(vehicle.brand);
    setVehicleModel(vehicle.model);
    setVehicleLoadTons(vehicle.loadTons);
    setVehicleSeats(String(vehicle.seats));
    setVehicleType(vehicle.vehicleType);
    if (vehicle.owner.name) setCustomerName(vehicle.owner.name);
    if (vehicle.owner.phone) setCustomerPhone(vehicle.owner.phone);
    const imagesToFill = [
      ...(vehicle.vehicleImages ?? (vehicle.imageUrl ? [vehicle.imageUrl] : [])),
      ...(vehicle.documentImages ?? []),
    ].slice(0, 4);
    if (imagesToFill.length > 0) {
      setSceneImages(imagesToFill);
    }
    setIsVehicleSearchOpen(false);
  };
  const [mapCoords, setMapCoords] = useState("21.0277350565601, 105.827792697257");

  // Cancellation States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isEditCancelReasonModalOpen, setIsEditCancelReasonModalOpen] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [orderCancelReason, setOrderCancelReason] = useState('Không còn cần dịch vụ');

  const [severityLevel, setSeverityLevel] = useState('Nhẹ');
  const [weather, setWeather] = useState('Bình thường');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activePaymentType, setActivePaymentType] = useState<CustomerPaymentType>('deposit');
  const [depositPaymentSession, setDepositPaymentSession] = useState<CustomerPaymentSession>({ method: null });
  const [remainingPaymentSession, setRemainingPaymentSession] = useState<CustomerPaymentSession>({ method: null });
  const DEPOSIT_AMOUNT = 50_000;
  const isDepositPaid =
    depositPaymentSession.pushStatus === 'success' ||
    depositPaymentSession.paymentCheckStatus === 'paid' ||
    depositPaymentSession.cashStatus === 'confirmed';
  const paidAmount = isDepositPaid ? DEPOSIT_AMOUNT : 0;
  const [refundAmount, setRefundAmount] = useState(0);
  const hasDeposited = isDepositPaid;
  const hasPartialPayment = hasDeposited || paidAmount > 0;
  const [isUnpaidDepositWarningOpen, setIsUnpaidDepositWarningOpen] = useState(false);
  const [isFeeWarningOpen, setIsFeeWarningOpen] = useState(false);
  const [editBaselineTotal, setEditBaselineTotal] = useState(0);
  const [pendingFeeChange, setPendingFeeChange] = useState<{
    type: CustomerFeeWarningType;
    oldTotal: number;
    newTotal: number;
  } | null>(null);

  const openPaymentModal = (type: CustomerPaymentType) => {
    if (type === 'remaining' && DEPOSIT_AMOUNT > 0 && !isDepositPaid) {
      setIsUnpaidDepositWarningOpen(true);
      return;
    }
    setActivePaymentType(type);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmUnpaidDepositRemaining = () => {
    setIsUnpaidDepositWarningOpen(false);
    setActivePaymentType('remaining');
    setIsPaymentModalOpen(true);
  };
  const [isProviderPaymentConfirmOpen, setIsProviderPaymentConfirmOpen] = useState(false);
  const [isDistanceWarningOpen, setIsDistanceWarningOpen] = useState(false);

  const hasPackage = selectedPackage !== 'Không có';
  const packageOrders = hasPackage ? DEFAULT_PACKAGE_ORDERS : [];
  const hasOrderToday = hasOrderCreatedToday(packageOrders);
  const isOverDistance = parseFloat(estimatedDistance) > 100;

  const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEstimatedDistance(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 100 && hasPackage) {
      setIsDistanceWarningOpen(true);
    }
  };

  const handleRoadsideDistanceChange = (value: string) => {
    const normalized = value.replace(',', '.');
    if (normalized === '' || /^\d*\.?\d*$/.test(normalized)) {
      setRoadsideDistance(normalized);
    }
  };
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [isShareLocationWebviewOpen, setIsShareLocationWebviewOpen] = useState(false);
  /** Demo webview: normal | thiếu vị trí cứu hộ (auto GPS) */
  const [webviewDemoMode, setWebviewDemoMode] = useState<'normal' | 'missing-rescue'>('normal');
  const [currentStatus, setCurrentStatus] = useState(navState?.portalStatusId ?? 'EXECUTE-RESCUING');
  const [customerUpdateStatus, setCustomerUpdateStatus] = useState<CustomerUpdateRequestStatus>('idle');
  const [customerUpdatePushedAt, setCustomerUpdatePushedAt] = useState<string | null>(null);
  const [customerUpdateCompletedAt, setCustomerUpdateCompletedAt] = useState<string | null>(null);
  const customerUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCustomerUpdated = customerUpdateStatus === 'completed';

  const openShareLocationWebview = (mode: 'normal' | 'missing-rescue' = 'normal') => {
    setWebviewDemoMode(mode);
    setIsShareLocationWebviewOpen(true);
  };

  const clearCustomerUpdateTimer = () => {
    if (customerUpdateTimerRef.current) {
      clearTimeout(customerUpdateTimerRef.current);
      customerUpdateTimerRef.current = null;
    }
  };

  const applyCustomerSubmittedUpdate = () => {
    setMapAddress(CUSTOMER_SUBMITTED_ADDRESS);
    setMapCoords(CUSTOMER_SUBMITTED_COORDS);
    setSceneImages(CUSTOMER_SUBMITTED_IMAGES);
    setIncidentDescription(CUSTOMER_SUBMITTED_DESCRIPTION);
    setCustomerUpdateCompletedAt(formatDateTimeVi(new Date()));
    setCustomerUpdateStatus('completed');
  };

  const handlePushCustomerUpdateRequest = () => {
    if (customerUpdateStatus === 'pushing') return;
    clearCustomerUpdateTimer();
    setCustomerUpdateStatus('pushing');
    customerUpdateTimerRef.current = setTimeout(() => {
      setCustomerUpdatePushedAt(formatDateTimeVi(new Date()));
      setCustomerUpdateStatus('waiting');
      customerUpdateTimerRef.current = setTimeout(() => {
        applyCustomerSubmittedUpdate();
      }, 1800);
    }, 800);
  };

  useEffect(() => {
    return () => clearCustomerUpdateTimer();
  }, []);

  useEffect(() => {
    if (!navState) return;
    setDisplayOrderId(navState.orderId);
    setCurrentStatus(navState.portalStatusId);
    setCustomerName(navState.customerName);
    setCustomerPhone(navState.customerPhone);
    setVehiclePlate(navState.plate);
    setMapAddress(navState.address);
  }, [navState]);
  const [ratingHistories, setRatingHistories] = useState(INITIAL_RATING_HISTORIES);
  const [ratingHistoryModal, setRatingHistoryModal] = useState<{
    isOpen: boolean;
    type: RatingType | null;
  }>({ isOpen: false, type: null });
  const [expandedRatings, setExpandedRatings] = useState<Record<string, boolean>>({
    customer_vetc: true,
    customer_driver: true,
    customer_workshop: false,
    rescue_customer: false,
    vetc_rescue: false,
  });

  const handleSaveRatingVersion = (
    type: RatingType,
    data: {
      stars: number;
      category: string;
      content: string;
      attachments: { name: string; url?: string }[];
      targetLabel?: string;
    }
  ) => {
    setRatingHistories((prev) => {
      const history = prev[type];
      const nextVersion = history.length + 1;
      return {
        ...prev,
        [type]: [
          ...history,
          {
            id: `${type}-v${nextVersion}-${Date.now()}`,
            version: nextVersion,
            targetLabel: data.targetLabel || RATING_TYPE_LABELS[type],
            ratedAt: new Date().toLocaleString('vi-VN'),
            stars: data.stars,
            content: data.content,
            attachments: data.attachments,
            category: data.category,
            updatedBy: 'CSKH — Nguyễn Thị Lan',
          },
        ],
      };
    });
  };

  const RATING_CARD_CONFIG: {
    type: RatingType;
    categories: string[];
    feedback?: boolean;
  }[] = [
    { type: 'customer_vetc', categories: ['Bình thường', 'Khen ngợi', 'Góp ý nhẹ', 'Khiếu nại'], feedback: true },
    { type: 'customer_driver', categories: ['Bình thường', 'Khen ngợi', 'Góp ý nhẹ', 'Khiếu nại'], feedback: true },
    { type: 'customer_workshop', categories: ['Bình thường', 'Khen ngợi', 'Góp ý nhẹ', 'Khiếu nại'], feedback: true },
    { type: 'rescue_customer', categories: ['Bình thường', 'Khách hàng nhiệt tình', 'Khách hàng khó tính', 'Sai lệch thông tin'], feedback: true },
    { type: 'vetc_rescue', categories: ['Bình thường', 'Đúng giờ, chuyên nghiệp', 'Chậm trễ', 'Thái độ không tốt', 'Vi phạm quy trình'], feedback: false },
  ];
  const [vat, setVat] = useState('8');


  // Calculate Max Coefficient for Highlighting
  const maxCoefficient =
    adjustmentRows.length > 0
      ? Math.max(
          ...adjustmentRows.flatMap((r) => [
            parseFloat(r.customerCoefficient) || 0,
            parseFloat(r.partnerCoefficient ?? r.coefficient) || 0,
          ])
        )
      : 0;

  // Tổng phí = tổng các dòng; sửa tổng phía trên sẽ phân bổ lại xuống bảng (2 chiều)
  const providerTotal = calculateProviderTotal(adjustmentRows);
  const displayProviderTotal = providerTotal;

  const providerVatValue = parseFloat(vat) || 0;
  const totalProviderPriceBeforeTax = displayProviderTotal / (1 + providerVatValue / 100);

  const grossCustomerTotal = calculateCustomerTotal(adjustmentRows);

  const vatRate = parseFloat(vat) || 0;
  const guaranteeRateNum = parseInt(guaranteeRate, 10) || 0;
  const guaranteeAmountNum = parseMoney(guaranteeAmount);
  const isGuaranteeActive =
    hasGuarantee === 'yes' &&
    !!selectedEnterprise &&
    (guaranteeType === 'rate' ? guaranteeRateNum > 0 : guaranteeAmountNum > 0);
  const guaranteeSplitConfig: GuaranteeSplitConfig = {
    active: isGuaranteeActive,
    type: guaranteeType,
    rate: guaranteeRateNum,
    amount: guaranteeAmountNum,
  };
  const rowKhFeeMap = resolveAllRowKhFees(adjustmentRows, guaranteeSplitConfig);
  const getRowKhFees = (row: AdjustmentRow) =>
    rowKhFeeMap.get(row.id) ?? { khcn: parseMoney(row.customerPaid), khdn: 0 };

  const tableTotals = {
    customerPaid: grossCustomerTotal,
    customerPaidKhcn: adjustmentRows.reduce(
      (sum, row) => sum + getRowKhFees(row).khcn,
      0
    ),
    customerPaidKhdn: adjustmentRows.reduce(
      (sum, row) => sum + getRowKhFees(row).khdn,
      0
    ),
    totalPrice: providerTotal,
    discount: adjustmentRows.reduce((sum, row) => {
      const d = parseMoney(row.discount);
      return sum + (row.discount.trim().startsWith('-') ? Math.abs(d) : -d);
    }, 0),
  };

  const enterpriseAfterTax = isGuaranteeActive
    ? tableTotals.customerPaidKhdn
    : applyVatAfterTax(parseMoney(enterpriseEstimatedCost), vatRate);

  const enterpriseBeforeTax = isGuaranteeActive
    ? applyVatBeforeTax(enterpriseAfterTax, vatRate)
    : parseMoney(enterpriseEstimatedCost);

  const individualCustomerPrice = tableTotals.customerPaidKhcn;

  const remainingAmount = refundAmount > 0 ? 0 : Math.max(0, individualCustomerPrice - paidAmount);
  const orderPaymentStatus = resolveOrderPaymentStatus(
    individualCustomerPrice,
    paidAmount,
    DEPOSIT_AMOUNT,
    remainingAmount
  );
  const paymentStatusInfo = PAYMENT_STATUS_CONFIG[orderPaymentStatus];
  const headerPrimaryBtnClass =
    'bg-vetc-green text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-lg transition-all active:scale-95 group';
  const headerBellBtnClass =
    customerUpdateStatus === 'completed'
      ? 'bg-vetc-green text-white hover:bg-green-700 shadow-lg'
      : customerUpdateStatus === 'waiting' || customerUpdateStatus === 'pushing'
        ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg'
        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 shadow-sm';

  const handleStartEditing = () => {
    setEditBaselineTotal(individualCustomerPrice);
    setCustomerTotalOverride(null);
    setIsEditing(true);
  };

  const handleProviderTotalChange = (value: string) => {
    if (!isEditing || adjustmentRows.length === 0) return;
    const newTotal = parseMoney(formatMoneyInput(value));
    setCustomerTotalOverride(null);
    markManualFeeTouched();
    setAdjustmentRows((prev) =>
      distributeTotalAcrossRows(
        prev,
        newTotal,
        (row) => parseMoney(row.totalPrice),
        (row, amount) => ({
          ...applyTotalPriceToRow(row, amount, {
            preserveCustomerPaid: row.isCustomerFeeManual,
          }),
          isPartnerFeeManual: true,
          partnerSource: 'Thủ công',
        })
      )
    );
  };

  const handleCustomerTotalChange = (value: string) => {
    if (!isEditing || adjustmentRows.length === 0) return;
    const newKhcnTotal = parseMoney(formatMoneyInput(value));
    setCustomerTotalOverride(null);
    markManualFeeTouched();
    setAdjustmentRows((prev) =>
      distributeTotalAcrossRows(
        prev,
        newKhcnTotal,
        (row) => getRowKhFees(row).khcn,
        (row, khcnAmount) => {
          const current = getRowKhFees(row);
          const khdn = isGuaranteeActive ? current.khdn : 0;
          const total = khcnAmount + khdn;
          return {
            ...row,
            customerPaid: total.toLocaleString('en-US'),
            customerPaidKhcn: khcnAmount.toLocaleString('en-US'),
            customerPaidKhdn: khdn.toLocaleString('en-US'),
            isCustomerFeeManual: true,
            customerSource: 'Thủ công',
          };
        }
      )
    );
  };

  const handleRefreshProviderTotal = () => {
    const recalculated = recalculateRowsFromFixedPrices(adjustmentRows);
    setAdjustmentRows(recalculated);
    setCustomerTotalOverride(null);
  };

  const finalizeSave = () => {
    if (hasPartialPayment && individualCustomerPrice < DEPOSIT_AMOUNT) {
      setRefundAmount(Math.max(0, DEPOSIT_AMOUNT - individualCustomerPrice));
    } else if (individualCustomerPrice >= paidAmount) {
      setRefundAmount(0);
    }
    setCustomerTotalOverride(null);
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    const newTotal = individualCustomerPrice;
    const oldTotal = editBaselineTotal;

    if (hasPartialPayment && newTotal < DEPOSIT_AMOUNT) {
      setPendingFeeChange({ type: 'decrease', oldTotal, newTotal });
      setIsFeeWarningOpen(true);
      return;
    }

    if (hasPartialPayment && newTotal > oldTotal) {
      setPendingFeeChange({ type: 'increase', oldTotal, newTotal });
      setIsFeeWarningOpen(true);
      return;
    }

    finalizeSave();
  };

  const handleConfirmFeeChange = () => {
    if (!pendingFeeChange) return;
    if (pendingFeeChange.type === 'decrease') {
      setRefundAmount(Math.max(0, DEPOSIT_AMOUNT - pendingFeeChange.newTotal));
    }
    setPendingFeeChange(null);
    setIsFeeWarningOpen(false);
    setIsEditing(false);
  };

  const handleCancelFeeChange = () => {
    setPendingFeeChange(null);
    setIsFeeWarningOpen(false);
  };

  useEffect(() => {
    if (!incidentDescription || incidentDescription.trim().length < 5) {
      return;
    }
    const timer = setTimeout(() => {
      setIsAiProcessing(true);
      setTimeout(() => {
        const suggestion = analyzeIncident(incidentDescription);

        // Format services list
        const servicesList = suggestion.recommendedServices
            .map(s => `- ${s.name}: ${s.price} VNĐ`)
            .join('\n');

        const formattedNote = `[PHÂN TÍCH AI]: ${suggestion.analysis}\n\n[DỊCH VỤ ĐỀ XUẤT]:\n${servicesList}\n\n[HƯỚNG DẪN XỬ LÝ]: ${suggestion.solutionSteps}`;

        setVerificationNotes(formattedNote);
        setIsAiProcessing(false);
        setIsAiApplied(true);
      }, 600);
    }, 1000);
    return () => clearTimeout(timer);
  }, [incidentDescription]);

  // Update driver phone when selected driver changes
  useEffect(() => {
    const driver = DRIVERS_MOCK.find(d => d.id === selectedDriverId);
    if (driver) {
      setDriverPhone(driver.phone);
    }
  }, [selectedDriverId]);

  const handleUpdateServices = (newSelection: string[]) => {
    setSelectedServices(newSelection);
  };

  const handleExportInvoice = () => {
    setInvoicePreviewMode(invoiceDownloadUrl ? 'adjust' : 'export');
    setIsInvoicePreviewOpen(true);
  };

  const handleReplaceInvoice = () => {
    setInvoicePreviewMode('replace');
    setIsInvoicePreviewOpen(true);
  };

  const handleViewInvoice = () => {
    if (invoiceDownloadUrl) {
      window.open(invoiceDownloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmExportInvoice = () => {
    setIsExportingInvoice(true);
    setTimeout(() => {
      setIsExportingInvoice(false);
      setInvoiceDownloadUrl('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
      setIsInvoicePreviewOpen(false);
    }, 1500);
  };

  const handleAddService = (serviceName: string, customPrice?: string) => {
    const defaultPrice = customPrice && customPrice.trim() !== '' ? formatMoneyInput(customPrice) : '500,000';
    const defaultCoefficient = '1';
    const partnerAmount = parseMoney(defaultPrice);
    const customerAmount = Math.round(partnerAmount * getRetailMarkupFactor());

    const markupCoef = String(getRetailMarkupFactor());
    const newRow: AdjustmentRow = {
      id: Date.now(),
      serviceName: serviceName,
      fixedPrice: defaultPrice,
      adjustmentType: '',
      partnerAdjustmentType: '',
      customerCoefficient: markupCoef,
      partnerCoefficient: defaultCoefficient,
      coefficient: defaultCoefficient,
      ceilingPrice: '0',
      discount: '0',
      totalPrice: defaultPrice,
      customerPaid: customerAmount.toLocaleString('en-US'),
      isCustom: serviceName === 'Dịch vụ khác' || Boolean(customPrice),
      isCustomerFeeManual: false,
      isPartnerFeeManual: Boolean(customPrice),
      customerSource: customPrice ? 'Thủ công' : customerFeeSourceText,
      partnerSource: customPrice ? 'Thủ công' : partnerFeeSourceText,
    };
    if (customPrice) markManualFeeTouched();
    setCustomerTotalOverride(null);
    setAdjustmentRows((prev) => [...prev, newRow]);
    setOtherServiceKey('');
    setOtherServicePrice('');
    setIsOtherServiceFormOpen(false);
    setIsServiceModalOpen(false);
  };

  const handleSelectServiceFromModal = (serviceName: string) => {
    if (serviceName === 'Dịch vụ khác') {
      setIsOtherServiceFormOpen(true);
      return;
    }
    handleAddService(serviceName);
  };

  const handleSaveOtherService = () => {
    const selectedOtherService = otherServiceOptions.find((opt) => opt.value === otherServiceKey);
    const normalizedName = selectedOtherService?.label?.trim() ?? '';
    const normalizedPrice = parseMoney(otherServicePrice);
    if (!normalizedName || normalizedPrice <= 0) return;
    handleAddService(normalizedName, otherServicePrice);
  };

  const handleRemoveService = (id: string) => {
    setActualServices(actualServices.filter(s => s.id !== id));
  };

  const handlePriceChange = (id: string, newPrice: string) => {
    setActualServices(actualServices.map(s => s.id === id ? { ...s, price: newPrice } : s));
  };

  const handleNameChange = (id: string, newName: string) => {
    setActualServices(actualServices.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const applyAISuggestion = (suggestion: AISuggestion) => {
    const newActualServices = suggestion.recommendedServices.map(s => ({
      id: Math.random().toString(36).substr(2, 9),
      name: s.name,
      price: s.price
    }));

    setActualServices([...actualServices, ...newActualServices]);

    // Check if services are already in verificationNotes to avoid duplication if applied multiple times or if effect already ran
    setVerificationNotes(prev => {
      // If we want to append info about applied action
      const separator = prev ? "\n\n" : "";
      return `${prev}${separator}[ĐÃ ÁP DỤNG]: Đã thêm ${suggestion.recommendedServices.length} dịch vụ đề xuất vào danh sách chi phí.`;
    });
    setIsAiApplied(true);
  };

  const handleConfirmLocation = (address: string, coords: string) => {
    setMapAddress(address);
    setMapCoords(coords);
    setIsMapModalOpen(false);
  };

  const handleConfirmCancel = () => {
    const finalReason = selectedCancelReason === 'Lý do khác' ? cancelReason : selectedCancelReason;
    console.log("Order cancelled for reason:", finalReason);
    setOrderCancelReason(finalReason);
    setCurrentStatus('FINISH-CANCELLED');
    setIsCancelModalOpen(false);
    setSelectedCancelReason('');
    setCancelReason('');
  };

  const handleOpenCancelModal = () => {
    setSelectedCancelReason('');
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleOpenEditCancelReasonModal = () => {
    if (CANCEL_REASONS.includes(orderCancelReason)) {
      setSelectedCancelReason(orderCancelReason);
      setCancelReason('');
    } else if (orderCancelReason) {
      setSelectedCancelReason('Lý do khác');
      setCancelReason(orderCancelReason);
    } else {
      setSelectedCancelReason('');
      setCancelReason('');
    }
    setIsEditCancelReasonModalOpen(true);
  };

  const handleConfirmEditCancelReason = () => {
    const finalReason = selectedCancelReason === 'Lý do khác' ? cancelReason.trim() : selectedCancelReason;
    setOrderCancelReason(finalReason);
    setIsEditCancelReasonModalOpen(false);
    setSelectedCancelReason('');
    setCancelReason('');
  };

  const handleCloseCancelDialog = () => {
    setIsCancelModalOpen(false);
    setIsEditCancelReasonModalOpen(false);
    setSelectedCancelReason('');
    setCancelReason('');
  };

  const isOrderCancelled = currentStatus === 'FINISH-CANCELLED';

  const handleProviderPriceChange = (id: number, value: string) => {
    setCustomerTotalOverride(null);
    markManualFeeTouched();
    const nextPrice = Math.max(0, parseMoney(formatMoneyInput(value)));
    setAdjustmentRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...applyTotalPriceToRow(row, nextPrice, {
                preserveCustomerPaid: row.isCustomerFeeManual,
              }),
              isPartnerFeeManual: true,
              partnerSource: 'Thủ công',
            }
          : row
      )
    );
  };

  const handleCustomerKhcnChange = (id: number, value: string) => {
    if (!isEditing) return;
    setCustomerTotalOverride(null);
    markManualFeeTouched();
    setAdjustmentRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const current = getRowKhFees(row);
        const khcn = parseMoney(formatMoneyInput(value));
        const khdn = isGuaranteeActive ? current.khdn : 0;
        const total = khcn + khdn;
        return {
          ...row,
          customerPaid: total.toLocaleString('en-US'),
          customerPaidKhcn: khcn.toLocaleString('en-US'),
          customerPaidKhdn: khdn.toLocaleString('en-US'),
          isCustomerFeeManual: true,
          customerSource: 'Thủ công',
        };
      })
    );
  };

  const handleCustomerKhdnChange = (id: number, value: string) => {
    if (!isEditing || !isGuaranteeActive) return;
    setCustomerTotalOverride(null);
    markManualFeeTouched();
    setAdjustmentRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const current = getRowKhFees(row);
        const khdn = parseMoney(formatMoneyInput(value));
        const khcn = current.khcn;
        const total = khcn + khdn;
        return {
          ...row,
          customerPaid: total.toLocaleString('en-US'),
          customerPaidKhcn: khcn.toLocaleString('en-US'),
          customerPaidKhdn: khdn.toLocaleString('en-US'),
          isCustomerFeeManual: true,
          customerSource: 'Thủ công',
        };
      })
    );
  };

  const handleRemoveAdjustmentRow = (id: number) => {
    if (!isEditing) return;
    setCustomerTotalOverride(null);
    setAdjustmentRows((prev) => prev.filter((row) => row.id !== id));
  };

  const applyFeeCriteriaPatch = (patch: FeeCriteriaPatch) => {
    if (patch.weather != null) setWeather(patch.weather);
    if (patch.severityLevel != null) setSeverityLevel(patch.severityLevel);
    if (patch.rescueDistance != null) {
      setRescueDistance(patch.rescueDistance);
      committedRescueDistanceRef.current = patch.rescueDistance;
    }
    if (patch.partnerName != null) setPartnerName(patch.partnerName);
    if (patch.stationName != null) setStationName(patch.stationName);
    if (patch.selectedEnterprise != null) {
      setSelectedEnterprise(patch.selectedEnterprise);
      if (!patch.selectedEnterprise) {
        resetGuaranteeFields();
        setEnterpriseEstimatedCost('0');
      }
    }
  };

  const buildFeeCalculationInput = (patch: FeeCriteriaPatch = {}): FeeCalculationInput => {
    const nextWeather = patch.weather ?? weather;
    const nextSeverity = patch.severityLevel ?? severityLevel;
    const nextDistance = parseFloat(patch.rescueDistance ?? rescueDistance) || 0;
    const nextEnterprise = patch.selectedEnterprise ?? selectedEnterprise;
    const nextPartner = patch.partnerName ?? partnerName;
    const isInternal =
      nextPartner.toLowerCase().includes('vetc') ||
      nextPartner.toLowerCase().includes('carpla');

    const catalogLines = adjustmentRows
      .filter((row) => !row.isCustom)
      .map((row) => ({
        serviceName: row.serviceName,
        serviceType: inferServiceType(row.serviceName),
        distanceKm: nextDistance,
      }));

    return {
      customerType: nextEnterprise ? 'RETAIL_BUSINESS' : 'PACKAGE',
      partnerType: isInternal ? 'INTERNAL' : 'EXTERNAL',
      corporateCustomerId: nextEnterprise || undefined,
      partnerName: nextPartner,
      packageBenefitAmount: nextEnterprise ? undefined : 800000,
      weather: mapUiWeatherToEngine(nextWeather),
      severity: mapUiSeverityToEngine(nextSeverity),
      isNight: true,
      lines:
        catalogLines.length > 0
          ? catalogLines
          : [{ serviceName: 'Xe hết pin', serviceType: 'ONSITE', distanceKm: nextDistance }],
    };
  };

  const recalculateFeesFromEngine = (patch: FeeCriteriaPatch = {}) => {
    const breakdown = calculateRescueFees(buildFeeCalculationInput(patch));
    const customRows = adjustmentRows.filter((row) => row.isCustom);
    const engineRows = mapBreakdownLinesToRows(breakdown.lines);
    const maxEngineId = engineRows.reduce((max, row) => Math.max(max, row.id), 0);
    const preservedCustom = customRows.map((row, index) => ({
      ...row,
      id: maxEngineId + index + 1,
    }));
    setAdjustmentRows([...engineRows, ...preservedCustom]);
    setFeeSnapshot(breakdown.snapshot);
    setCustomerTotalOverride(null);
    setFeeCriteriaOutOfSync(false);
    clearManualFeeTouched();
  };

  const requestFeeCriteriaChange = (
    description: string,
    patch: FeeCriteriaPatch,
    extraApply?: () => void
  ) => {
    const applyAll = () => {
      applyFeeCriteriaPatch(patch);
      extraApply?.();
    };

    const hasManual =
      manualFeeTouchedRef.current || hasManualFeeOverrides(adjustmentRows);

    // Không có phí thủ công → áp tiêu chí ngay (kể cả ngoài chế độ Cập nhật)
    if (!hasManual) {
      applyAll();
      setFeeCriteriaOutOfSync(false);
      return;
    }

    // Có phí thủ công → luôn hỏi, kể cả khi đang xem (một số CTA vẫn bấm được)
    setPendingFeeCriteriaChange({ description, patch });
    pendingFeeCriteriaExtraApplyRef.current = extraApply ?? null;
    setIsManualFeeRecalcWarningOpen(true);
  };

  const closeManualFeeRecalcWarning = () => {
    setIsManualFeeRecalcWarningOpen(false);
    setPendingFeeCriteriaChange(null);
    pendingFeeCriteriaExtraApplyRef.current = null;
  };

  const handleCancelFeeCriteriaChange = () => {
    // Distance may have been typed ahead of confirm — revert to last committed value.
    setRescueDistance(committedRescueDistanceRef.current);
    closeManualFeeRecalcWarning();
  };

  const handleKeepManualAfterCriteriaChange = () => {
    if (!pendingFeeCriteriaChange) return;
    applyFeeCriteriaPatch(pendingFeeCriteriaChange.patch);
    pendingFeeCriteriaExtraApplyRef.current?.();
    setFeeCriteriaOutOfSync(true);
    closeManualFeeRecalcWarning();
  };

  const handleRecalculateAfterCriteriaChange = () => {
    if (!pendingFeeCriteriaChange) return;
    const { patch } = pendingFeeCriteriaChange;
    applyFeeCriteriaPatch(patch);
    pendingFeeCriteriaExtraApplyRef.current?.();
    recalculateFeesFromEngine(patch);
    closeManualFeeRecalcWarning();
  };

  const handleEnterpriseFeeAwareChange = (value: string) => {
    if (value === selectedEnterprise) return;
    const fromLabel =
      ENTERPRISE_OPTIONS.find((opt) => opt.value === selectedEnterprise)?.label || 'Không có';
    const toLabel = ENTERPRISE_OPTIONS.find((opt) => opt.value === value)?.label || 'Không có';
    requestFeeCriteriaChange(`Doanh nghiệp: ${fromLabel} → ${toLabel}`, {
      selectedEnterprise: value,
    });
  };

  const handleWeatherChange = (next: string) => {
    if (next === weather) return;
    requestFeeCriteriaChange(`Thời tiết: ${weather} → ${next}`, { weather: next });
  };

  const handleSeverityChange = (next: string) => {
    if (next === severityLevel) return;
    requestFeeCriteriaChange(`Mức độ nghiêm trọng: ${severityLevel} → ${next}`, {
      severityLevel: next,
    });
  };

  const handleRescueDistanceBlur = () => {
    const next = rescueDistance.trim() || '0';
    if (next === committedRescueDistanceRef.current) return;

    const hasManual =
      manualFeeTouchedRef.current || hasManualFeeOverrides(adjustmentRows);

    if (!hasManual) {
      committedRescueDistanceRef.current = next;
      setRescueDistance(next);
      return;
    }

    const previous = committedRescueDistanceRef.current;
    setRescueDistance(previous);
    requestFeeCriteriaChange(
      `Khoảng cách cứu hộ: ${previous} km → ${next} km`,
      { rescueDistance: next }
    );
  };

  const handlePartnerFeeAwareChange = (next: string) => {
    if (next === partnerName) return;
    requestFeeCriteriaChange(`Đối tác cứu hộ: ${partnerName} → ${next}`, {
      partnerName: next,
    });
  };

  const handleAdjustmentChange = (id: number, field: string, value: string) => {
    if (field === 'totalPrice') return;
    setCustomerTotalOverride(null);
    const updatedRows = computeUpdatedRows(adjustmentRows, id, field, value);
    const shouldMarkSupplierManual = [
      'fixedPrice',
      'coefficient',
      'partnerCoefficient',
      'adjustmentType',
    ].includes(field);
    const shouldMarkCustomerManual = field === 'customerCoefficient';
    if (shouldMarkSupplierManual || shouldMarkCustomerManual) {
      markManualFeeTouched();
    }
    setAdjustmentRows(
      updatedRows.map((row) => {
        if (row.id !== id) return row;
        let next = row;
        if (shouldMarkSupplierManual) {
          next = { ...next, isPartnerFeeManual: true, partnerSource: 'Thủ công' };
        }
        if (shouldMarkCustomerManual) {
          next = { ...next, isCustomerFeeManual: true, customerSource: 'Thủ công' };
        }
        return next;
      })
    );
  };

  const handleRescueSelect = (unit: RescueUnit) => {
    requestFeeCriteriaChange(
      `Đơn vị cứu hộ: ${stationName} → ${unit.name} (${unit.distance} km)`,
      {
        partnerName: unit.partner,
        stationName: unit.name,
        rescueDistance: unit.distance.toString(),
      },
      () => {
        if (unit.vehicleType) setRescueVehicleType(unit.vehicleType);
        setIsSearchModalOpen(false);
      }
    );
  };

  const handleManualRescueSelect = (station: any) => {
    const nextDistance = String(station.distance).replace(' km', '');
    requestFeeCriteriaChange(
      `Đơn vị cứu hộ: ${stationName} → ${station.name} (${nextDistance} km)`,
      {
        partnerName: station.partner,
        stationName: station.name,
        rescueDistance: nextDistance,
      },
      () => setIsManualSearchModalOpen(false)
    );
  };

  const selectedDriver = DRIVERS_MOCK.find(d => d.id === selectedDriverId);

  // Helper to determine visibility
  const isVisible = (tabId: string) => viewMode === 'list' || activeTab === tabId;

  const scrollToSection = (tabId: string) => {
    setActiveTab(tabId);
    
    // Use a small timeout to ensure the DOM has updated (especially in tabs mode)
    // before attempting to scroll to the element.
    setTimeout(() => {
      const element = document.getElementById(`section-${tabId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  // Tabs Configuration
  const TABS = [
    { id: 'general', label: 'Thông tin sự cố', icon: <User size={16}/> },
    { id: 'orchestration', label: 'Điều phối cứu hộ', icon: <LifeBuoy size={16}/> },
    { id: 'fees', label: 'Thông tin phí', icon: <Banknote size={16}/> },
    { id: 'process', label: 'Quá trình cứu hộ', icon: <Activity size={16}/> },
    { id: 'images', label: 'Hình ảnh', icon: <Camera size={16}/> },
    { id: 'camera', label: 'Camera xe', icon: <Video size={16}/> },
    { id: 'monitoring', label: 'Giám sát & Thực thi', icon: <ShieldCheck size={16}/> },
    { id: 'invoice', label: 'Hóa đơn', icon: <FileText size={16}/> },
    { id: 'payment-request', label: 'Đề nghị thanh toán', icon: <CreditCard size={16}/> },
  ];

  // Mock data for Searching/RescueList component
  const mockFormData: FormData = {
    orderId: displayOrderId,
    customer: {
      phone: customerPhone,
      plate: vehiclePlate,
      name: customerName,
      vin: 'R7C2X9M4A8',
      vehicleBrand: 'Toyota',
      vehicleLine: 'Sedan',
      payload: '1',
      seats: '5',
      servicePackage: selectedPackage
    },
    assistance: {
      rescueName: customerName,
      rescuePhone: customerPhone,
      address: mapAddress,
      lng: mapCoords.split(',')[1]?.trim() || '',
      lat: mapCoords.split(',')[0].trim() || '',
      city: 'Hà Nội',
      district: '',
      ward: '',
      note: incidentDescription
    },
    service: {
      serviceIds: selectedServices,
      quantity: 1,
      description: incidentDescription,
      deposit: 0
    },
    station: {
      partner: partnerName,
      station: stationName,
      contact1: '',
      contact2: '',
      address: '',
      towingDestination: '',
      vehicleType: rescueVehicleType
    },
    pricing: {
      estimatedPrice: '527,500',
      distance: parseFloat(rescueDistance),
      adjustments: adjustmentRows // Syncing mock data with state
    }
  };

  const isPriorityCustomer = isPriorityCustomerPhone(customerPhone);
  const hasOrderWarning = true;
  const isFloodedArea = true;

  const shareLocationUrl = `https://vetc.com.vn/share-location/${mockFormData.orderId}`;
  const parseCoords = (raw: string): { lat?: number; lng?: number } => {
    const [latStr, lngStr] = raw.split(',').map((s) => s.trim());
    const lat = Number(latStr);
    const lng = Number(lngStr);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
  };
  const rescueCoords = parseCoords(mapCoords);
  const towCoords = parseCoords(towingCoords);
  /** Demo: trạm & tài xế lệch nhẹ so với điểm cứu hộ để hiển thị trên map webview */
  const stationCoords =
    rescueCoords.lat != null && rescueCoords.lng != null
      ? { lat: rescueCoords.lat + 0.012, lng: rescueCoords.lng - 0.008 }
      : {};
  const driverCoords =
    rescueCoords.lat != null && rescueCoords.lng != null
      ? { lat: rescueCoords.lat + 0.005, lng: rescueCoords.lng + 0.006 }
      : {};

  return (
      <div className="space-y-6 animate-in fade-in duration-700 max-w-[1600px] mx-auto pb-20">
        {/* Top Sticky Header Row */}
        <div className="sticky top-0 z-20 flex flex-col bg-white/95 backdrop-blur-md border rounded-xl shadow-md border-l-4 border-l-vetc-green text-left">
          <div className="flex items-center justify-between p-4 gap-3 flex-wrap">
            <div className="flex items-center space-x-6">

              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Mã đơn hàng (Cố định)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-gray-900 tracking-tight">{displayOrderId}</span>
                  <span className={`${selectedPackage === 'Không có' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'} px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight`}>
                    {selectedPackage === 'Không có' ? 'Đơn Lẻ' : 'Đơn gói'}
                  </span>
                  <div className="inline-flex items-center gap-1">
                    {isPriorityCustomer && <PriorityCustomerBadge iconOnly />}
                    {hasOrderWarning && <OrderWarningBadge iconOnly />}
                    {isFloodedArea && <FloodWarningBadge iconOnly />}
                    {customerUpdateStatus === 'waiting' && (
                      <CustomerUpdateStatusBadge iconOnly status="waiting" time={customerUpdatePushedAt} />
                    )}
                    {isCustomerUpdated && (
                      <CustomerUpdateStatusBadge
                        iconOnly
                        status="completed"
                        time={customerUpdateCompletedAt}
                        onClick={() => scrollToSection('general')}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-100 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Trạng thái hiện tại</span>
                <button 
                  onClick={() => isEditing && setIsStatusUpdateModalOpen(true)}
                  disabled={!isEditing}
                  className={`flex items-center space-x-2 transition-opacity text-left group ${isEditing ? 'hover:opacity-80' : 'cursor-default'}`}
                >
                  {(() => {
                    const statusInfo = STATUS_OPTIONS.flatMap(g => g.items).find(i => i.id === currentStatus) || { label: currentStatus, color: 'bg-gray-50 text-gray-600 border-gray-100', dot: 'bg-gray-400' };
                    return (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${statusInfo.color} ${isEditing ? 'cursor-pointer group-hover:shadow-sm' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse mr-2 ${statusInfo.dot}`}></div>
                        <span>{statusInfo.label}</span>
                        {isEditing && <Pencil size={10} className="ml-2 text-gray-400 group-hover:text-current transition-colors" />}
                      </span>
                    );
                  })()}
                </button>
              </div>

              <div className="h-10 w-px bg-gray-100 hidden md:block"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Trạng thái thanh toán</span>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold border w-fit ${paymentStatusInfo.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-2 ${paymentStatusInfo.dot}`}></div>
                  <span>{paymentStatusInfo.label}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              {!isOrderCancelled && (
                    <button
                        type="button"
                        onClick={handlePushCustomerUpdateRequest}
                        disabled={customerUpdateStatus === 'pushing'}
                        className={`relative flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold transition-all active:scale-95 group disabled:opacity-70 disabled:cursor-wait ${headerBellBtnClass}`}
                        title={
                          customerUpdateStatus === 'pushing'
                            ? 'Đang gửi thông báo...'
                            : customerUpdateStatus === 'waiting'
                              ? `Đã gửi thông báo${customerUpdatePushedAt ? ` lúc ${customerUpdatePushedAt}` : ''} — đang chờ khách hàng`
                              : isCustomerUpdated
                                ? `Gửi lại thông báo${customerUpdateCompletedAt ? ` · KH cập nhật lúc ${customerUpdateCompletedAt}` : ''}`
                                : 'Yêu cầu KH cập nhật vị trí, ảnh và mô tả'
                        }
                        aria-label="Yêu cầu KH cập nhật"
                    >
                      {customerUpdateStatus === 'pushing' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Bell size={14} className="group-hover:scale-110 transition-transform" />
                      )}
                      {(customerUpdateStatus === 'waiting' || isCustomerUpdated) && (
                        <span
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm animate-pulse"
                          title={isCustomerUpdated ? 'Khách hàng đã cập nhật mới' : 'Đang chờ khách hàng'}
                        />
                      )}
                    </button>
              )}
              {isEditing && (
                  <button
                      className="flex items-center space-x-2 px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-50 transition-all active:scale-95 group"
                  >
                    <Check size={14} className="group-hover:scale-110 transition-transform" />
                    <span>Xác nhận</span>
                  </button>
              )}

              {isEditing && (
                  <button
                      onClick={handleOpenCancelModal}
                      className="flex items-center space-x-2 px-6 py-2 border-2 border-red-500 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-all active:scale-95 group"
                  >
                    <X size={14} className="group-hover:scale-110 transition-transform" />
                    <span>Hủy</span>
                  </button>
              )}

              {isEditing ? (
                  <>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex items-center space-x-2 px-6 py-2 border-2 border-gray-400 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all active:scale-95 group"
                    >
                      <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
                      <span>Hủy thay đổi</span>
                    </button>
                    <button
                        onClick={handleSaveChanges}
                        className={`flex items-center space-x-2 px-6 py-2 ${headerPrimaryBtnClass}`}
                    >
                      <Save size={14} className="group-hover:scale-110 transition-transform" />
                      <span>Lưu thay đổi</span>
                    </button>
                  </>
              ) : (
                  <button
                      onClick={handleStartEditing}
                      className={`flex items-center space-x-2 px-6 py-2 ${headerPrimaryBtnClass}`}
                    >
                    <Edit size={14} className="group-hover:scale-110 transition-transform" />
                    <span>Cập nhật</span>
                  </button>
              )}
            </div>
          </div>

          {/* Tab Navigation Bar */}
          {viewMode === 'tabs' || viewMode === 'list' && (
              <div className="flex items-center px-4 border-t bg-gray-50/50 overflow-x-auto custom-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => scrollToSection(tab.id)}
                        className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-vetc-green text-vetc-green bg-green-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                ))}
              </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 text-left">
          {/* 1. Thông tin sự cố */}
          <div id="section-general" className={`scroll-mt-40 ${isVisible('general') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <SectionHeader title="Thông tin sự cố" number={1} icon={<User size={16} />} />
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <div className="lg:col-span-2">
                  <Label>Thu thập vị trí</Label>
                  <div className="flex items-center space-x-2 bg-gray-50 border rounded px-3 py-1.5">
                    <span className="text-xs text-blue-600 font-medium truncate flex-1">{shareLocationUrl}</span>
                    <button
                      type="button"
                      onClick={() => openShareLocationWebview('normal')}
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border border-vetc-green text-vetc-green text-[10px] font-bold hover:bg-green-50 transition-colors"
                      title="Xem trước giao diện Webview khách hàng"
                    >
                      <Smartphone size={12} />
                      Webview
                    </button>
                    <button
                      type="button"
                      onClick={() => openShareLocationWebview('missing-rescue')}
                      className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border border-amber-400 text-amber-700 text-[10px] font-bold hover:bg-amber-50 transition-colors"
                      title="Demo: khách chưa có vị trí cứu hộ — tự lấy GPS"
                    >
                      <AlertTriangle size={12} />
                      Demo thiếu vị trí
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(shareLocationUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`${copied ? 'text-vetc-green' : 'text-gray-400'} hover:text-vetc-green transition-colors active:scale-90 flex items-center space-x-1 shrink-0`}
                      title="Copy link"
                    >
                      {copied ? <span className="text-[10px] font-bold">Đã sao chép!</span> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div className="lg:col-span-2"></div>
                <div>
                  <Label required>Người yêu cầu</Label>
                  <Input defaultValue={customerName} readOnly={true} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label required>SĐT yêu cầu</Label>
                    {isPriorityCustomer && <PriorityCustomerBadge compact />}
                  </div>
                  <Input defaultValue={customerPhone} readOnly={true} />
                </div>
                <div>
                  <Label>Người liên hệ</Label>
                  <Input defaultValue={customerName} readOnly={!isEditing} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label>SĐT liên hệ</Label>
                    {isPriorityCustomer && <PriorityCustomerBadge compact />}
                  </div>
                  <Input defaultValue={customerPhone} readOnly={!isEditing} />
                </div>

                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
                  <div>
                    <Label>Doanh nghiệp</Label>
                    <select
                      value={selectedEnterprise}
                      disabled={!isEditing || tripGuaranteeLocked}
                      onChange={(e) => handleEnterpriseFeeAwareChange(e.target.value)}
                      title={tripGuaranteeLocked ? 'Gói TRIP lấy doanh nghiệp bảo lãnh từ gói, không đổi trên đơn' : undefined}
                      className={`w-full border rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-vetc-green transition-all ${!isEditing || tripGuaranteeLocked ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    >
                      {ENTERPRISE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {selectedEnterprise && (
                    <>
                      <div>
                        <Label>Bảo lãnh</Label>
                        <select
                          value={hasGuarantee}
                          disabled={!isEditing || tripGuaranteeLocked}
                          onChange={(e) => handleGuaranteeChange(e.target.value as 'yes' | 'no')}
                          title={tripGuaranteeLocked ? 'Gói TRIP luôn có bảo lãnh theo cấu hình gói' : undefined}
                          className={`w-full border rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-vetc-green transition-all ${!isEditing || tripGuaranteeLocked ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                        >
                          <option value="no">Không</option>
                          <option value="yes">Có</option>
                        </select>
                      </div>
                      {hasGuarantee === 'yes' && (
                        <>
                          <div>
                            <Label required>Hình thức bảo lãnh</Label>
                            <select
                              value={guaranteeType}
                              disabled={!isEditing || tripGuaranteeLocked}
                              onChange={(e) => handleGuaranteeTypeDraftChange(e.target.value as GuaranteeType)}
                              title={tripGuaranteeLocked ? 'Hình thức bảo lãnh lấy từ gói TRIP, không đổi trên đơn' : undefined}
                              className={`w-full border rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-vetc-green transition-all ${!isEditing || tripGuaranteeLocked ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            >
                              {GUARANTEE_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          {guaranteeType === 'rate' ? (
                            <div>
                              <Label required>Tỷ lệ bảo lãnh</Label>
                              <div className="relative">
                                <Input
                                  value={guaranteeRateDraft}
                                  onChange={handleGuaranteeRateDraftChange}
                                  onBlur={handleGuaranteeRateBlur}
                                  placeholder="1 – 100"
                                  readOnly={!isEditing}
                                  className="w-full text-right font-bold pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">%</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Label required>Số tiền bảo lãnh</Label>
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1 min-w-0">
                                  <Input
                                    value={hasPackageFixedSponsor ? formatMoneyInput(String(packageFixedSponsorTotal)) : guaranteeAmountDraft}
                                    onChange={handleGuaranteeAmountDraftChange}
                                    onBlur={handleGuaranteeAmountBlur}
                                    placeholder="Nhập số tiền"
                                    readOnly={!isEditing || tripGuaranteeLocked || hasPackageFixedSponsor}
                                    title={tripGuaranteeLocked || hasPackageFixedSponsor ? 'Tổng số tiền bảo lãnh theo gói TRIP, không đổi trên đơn' : undefined}
                                    className="w-full text-right font-bold pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">đ</span>
                                </div>
                                {hasPackageFixedSponsor && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setIsSponsorDetailOpen(true);
                                    }}
                                    className="shrink-0 text-[10px] text-blue-600 font-bold underline whitespace-nowrap"
                                  >
                                    Xem chi tiết
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className={hasGuarantee === 'yes' ? 'md:col-span-2 lg:col-span-4' : 'lg:col-span-2'}>
                        <Label>Ghi chú bảo lãnh</Label>
                        <Input
                          value={guaranteeNote}
                          onChange={(val) => setGuaranteeNote(String(val))}
                          placeholder="Nhập nội dung chi tiết bảo lãnh..."
                          readOnly={!isEditing}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
                  <div>
                    <Label required>Biển số xe</Label>
                    <div className="flex gap-2">
                      <Input
                        value={vehiclePlate}
                        onChange={(val) => setVehiclePlate(String(val).toUpperCase())}
                        readOnly={!isEditing}
                        className="flex-1 min-w-0 uppercase tracking-wide font-bold"
                      />
                      <button
                        type="button"
                        title="Tra cứu thông tin xe theo BSX"
                        disabled={!isEditing}
                        onClick={() => openVehicleLookup('plate')}
                        className="shrink-0 flex items-center gap-1 bg-white border border-vetc-green text-vetc-green px-2.5 py-1.5 rounded text-[10px] font-bold hover:bg-green-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        <Search size={14} />
                        <span className="hidden sm:inline">Tra cứu</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Số khung (Vin)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={vehicleVin}
                        onChange={setVehicleVin}
                        readOnly={!isEditing}
                        className="flex-1 min-w-0"
                      />
                      <button
                        type="button"
                        title="Tra cứu thông tin xe theo số khung"
                        disabled={!isEditing}
                        onClick={() => openVehicleLookup('vin')}
                        className="shrink-0 flex items-center gap-1 bg-white border border-vetc-green text-vetc-green px-2.5 py-1.5 rounded text-[10px] font-bold hover:bg-green-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        <Search size={14} />
                        <span className="hidden sm:inline">Tra cứu</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Hãng xe</Label>
                    <Input
                      value={vehicleBrand}
                      onChange={setVehicleBrand}
                      readOnly={!isEditing}
                    />
                  </div>
                  <div>
                    <Label>Dòng xe</Label>
                    <Input
                      value={vehicleModel}
                      onChange={setVehicleModel}
                      readOnly={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label>Trọng tải</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={vehicleLoadTons}
                      onChange={setVehicleLoadTons}
                      readOnly={!isEditing}
                    />
                    <span className="text-[10px] text-gray-400 font-bold uppercase">tấn</span>
                  </div>
                </div>
                <div>
                  <Label>Số chỗ</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={vehicleSeats}
                      onChange={setVehicleSeats}
                      readOnly={!isEditing}
                    />
                    <span className="text-[10px] text-gray-400 font-bold uppercase">chỗ</span>
                  </div>
                </div>
                <div>
                  <Label>Loại xe</Label>
                  <div className="flex items-center space-x-2">
                    <select
                      disabled={!isEditing}
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className={`w-48 border rounded px-3 py-1.5 text-xs outline-none focus:border-vetc-green font-bold text-gray-700 ${!isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                    >
                      <option value="Xe chở hàng">Xe chở hàng</option>
                      <option value="Xe chở người">Xe chở người</option>
                    </select>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div>
                    <Label>
                      <span className="flex items-center gap-2 flex-wrap">
                        Gói dịch vụ
                        {hasOrderToday && (
                          <span className="inline-flex items-center gap-1 normal-case tracking-normal text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            <AlertTriangle size={11} className="shrink-0" />
                            Cảnh báo đơn
                          </span>
                        )}
                      </span>
                    </Label>
                    <div className="flex-1 flex items-center space-x-2">
                      <div className={`flex-1 relative`}>
                        <select
                            value={selectedPackage}
                            disabled={!isEditing}
                            title={isEditing ? 'Chọn gói. Gói TRIP khóa doanh nghiệp và bảo lãnh theo cấu hình gói' : 'Gói cứu hộ chỉ được chọn khi Tạo đơn'}
                            onChange={(e) => {
                              setSelectedPackage(e.target.value);
                            }}
                            className={`w-full border rounded pl-3 pr-10 py-1.5 text-xs font-bold outline-none appearance-none transition-all ${!isEditing ? 'cursor-not-allowed' : 'cursor-pointer'} ${selectedPackage === 'Không có' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                        >
                          {PACKAGE_LIST.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          <option value="Không có">Không có</option>
                        </select>
                        <div className="absolute right-2 top-2 pointer-events-none text-gray-400">
                          {selectedPackage === 'Không có' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </div>
                      </div>
                      <button
                          onClick={() => {
                            setIsPackageModalOpen(true);
                          }}
                          className="text-[10px] text-blue-600 font-bold underline whitespace-nowrap px-2"
                      >
                        Chi tiết gói
                      </button>
                    </div>
                  </div>
                </div>
                {/* Vị trí sự cố */}
                <div className="lg:col-span-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <Label required>Vị trí sự cố</Label>
                        {isFloodedArea && <FloodWarningBadge compact />}
                        <CustomerUpdatedBadge compact updated={isCustomerUpdated} />
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0 text-left">
                          <input
                              readOnly
                              value={mapAddress}
                              className="w-full border rounded px-3 py-1.5 text-xs outline-none pr-8 bg-gray-50 font-medium"
                          />
                          <MapPin size={14} className="absolute right-2.5 top-2 text-red-500" />
                        </div>
                        <button
                            onClick={() => setIsMapModalOpen(true)}
                            disabled={!isEditing}
                            className={`bg-vetc-green text-white px-4 py-1.5 rounded text-[11px] font-bold shrink-0 hover:bg-green-700 transition-all flex items-center space-x-2 active:scale-95 shadow-sm ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <MapPin size={14} />
                          <span>Bản đồ</span>
                        </button>
                      </div>
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Lat</Label>
                      <Input value={mapCoords.split(',')[0].trim()} readOnly />
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Long</Label>
                      <div className="flex items-center space-x-2">
                        <Input value={mapCoords.split(',')[1]?.trim() || ''} readOnly />
                        <button
                            onClick={() => {
                              navigator.clipboard.writeText(mapCoords);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-gray-400 hover:text-vetc-green transition-colors shrink-0"
                            title="Copy tọa độ"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Điểm xưởng */}
                <div className="lg:col-span-1">
                  <Label>Điểm xưởng</Label>
                  <WorkshopSelect
                    value={workshopStation}
                    onChange={setWorkshopStation}
                    disabled={!isEditing}
                    defaultAddress={towingDestination}
                    defaultLat={towingCoords.split(',')[0]?.trim() || ''}
                    defaultLng={towingCoords.split(',')[1]?.trim() || ''}
                    stations={workshopStations}
                    onStationsChange={setWorkshopStations}
                    className="h-[31px] px-3 text-xs"
                  />
                </div>

                {/* Điểm kéo về */}
                <div className="lg:col-span-4">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <Label>Điểm kéo xe về</Label>
                        {isFloodedArea && <FloodWarningBadge compact />}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0 text-left">
                          <input
                              readOnly={!isEditing}
                              value={towingDestination}
                              onChange={(e) => setTowingDestination(e.target.value)}
                              className={`w-full border rounded px-3 py-1.5 text-xs outline-none pr-8 font-medium ${!isEditing ? 'bg-gray-50' : 'bg-white focus:border-vetc-green'}`}
                          />
                          <MapPin size={14} className="absolute right-2.5 top-2 text-red-500" />
                        </div>
                        <button
                            disabled={!isEditing}
                            className={`bg-vetc-green text-white px-4 py-1.5 rounded text-[11px] font-bold shrink-0 hover:bg-green-700 transition-all flex items-center space-x-2 active:scale-95 shadow-sm ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <MapPin size={14} />
                          <span>Bản đồ</span>
                        </button>
                      </div>
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Lat</Label>
                      <Input value={towingCoords.split(',')[0].trim()} readOnly />
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Long</Label>
                      <div className="flex items-center space-x-2">
                        <Input value={towingCoords.split(',')[1]?.trim() || ''} readOnly />
                        <button
                            onClick={() => {
                              navigator.clipboard.writeText(towingCoords);
                            }}
                            className="text-gray-400 hover:text-vetc-green transition-colors shrink-0"
                            title="Copy tọa độ"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khoảng cách & vị trí mặt đường */}
                <div className="lg:col-span-2">
                  <Label>Khoảng cách (Ước tính)</Label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Input
                        value={estimatedDistance}
                        readOnly={!isEditing}
                        onChange={handleDistanceChange}
                        className={isOverDistance && hasPackage ? '!border-orange-400 !bg-orange-50' : ''}
                      />
                      {isOverDistance && hasPackage && (
                        <AlertCircle size={14} className="absolute right-2 top-2 text-orange-500" />
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">KM</span>
                  </div>
                  {isOverDistance && hasPackage && (
                    <button
                      onClick={() => setIsDistanceWarningOpen(true)}
                      className="text-[10px] text-orange-600 font-bold mt-1 hover:underline flex items-center space-x-1"
                    >
                      <AlertCircle size={10} />
                      <span>Vượt quá phạm vi gói ({(parseFloat(estimatedDistance) - 100).toFixed(1)} km ngoài gói)</span>
                    </button>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <Label>Vị trí với mặt đường</Label>
                  <div className="flex items-center space-x-2 max-w-xs">
                    <Input
                      value={roadsideDistance}
                      onChange={handleRoadsideDistanceChange}
                      readOnly={!isEditing}
                      placeholder="0"
                      className="text-right"
                    />
                    <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">Mét</span>
                  </div>
                </div>

                {/* Loại vị trí / Mức độ / Thời tiết — 1 dòng */}
                <div className="lg:col-span-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4">
                    <div>
                      <Label>Loại vị trí</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {['Vùng núi', 'Cao tốc', 'Đô thị'].map((type) => (
                            <button
                                key={type}
                                disabled={!isEditing}
                                onClick={() => setLocationType(type)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    locationType === type
                                        ? 'bg-vetc-green text-white border-vetc-green shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-vetc-green hover:bg-green-50'
                                } ${!isEditing ? 'opacity-60 cursor-not-allowed hover:border-gray-200 hover:bg-white' : 'active:scale-95'}`}
                            >
                              {type}
                            </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Mức độ nghiêm trọng</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {[
                          { label: 'Nhẹ', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300', activeColor: 'bg-green-600 text-white border-green-600 shadow-md' },
                          { label: 'Mắc kẹt', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-md' },
                          { label: 'Nguy hiểm', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300', activeColor: 'bg-red-600 text-white border-red-600 shadow-md' }
                        ].map((level) => (
                            <button
                                key={level.label}
                                disabled={!isEditing}
                                onClick={() => handleSeverityChange(level.label)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    severityLevel === level.label
                                        ? level.activeColor
                                        : level.color
                                } ${!isEditing ? 'opacity-60 cursor-not-allowed hover:border-gray-200 hover:bg-white' : 'active:scale-95'}`}
                            >
                              {level.label}
                            </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Thời tiết</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {[
                          { label: 'Bình thường', color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300', activeColor: 'bg-green-600 text-white border-green-600 shadow-md' },
                          { label: 'Mưa bão', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-md' },
                          { label: 'Ngập lụt', color: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-300', activeColor: 'bg-sky-600 text-white border-sky-600 shadow-md' },
                          { label: 'Thiên tai', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300', activeColor: 'bg-red-600 text-white border-red-600 shadow-md' }
                        ].map((level) => (
                            <button
                                key={level.label}
                                disabled={!isEditing}
                                onClick={() => handleWeatherChange(level.label)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    weather === level.label
                                        ? level.activeColor
                                        : level.color
                                } ${!isEditing ? 'opacity-60 cursor-not-allowed hover:border-gray-200 hover:bg-white' : 'active:scale-95'}`}
                            >
                              {level.label}
                            </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Label required>Mô tả chi tiết tình trạng sự cố</Label>
                      <CustomerUpdatedBadge compact updated={isCustomerUpdated} />
                    </div>
                    <AISuggestionSection
                        description={incidentDescription}
                        onApply={applyAISuggestion}
                    />
                  </div>
                  <div className="relative">
                  <textarea
                      rows={5}
                      value={incidentDescription}
                      readOnly={!isEditing}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                      className={`w-full border rounded px-3 py-1.5 text-xs min-h-[60px] outline-none focus:border-vetc-green text-left ${!isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                  ></textarea>
                    {isAiProcessing && (
                        <div className="absolute bottom-2 right-2 flex items-center space-x-1 text-[9px] text-indigo-500 font-black uppercase">
                          <Loader2 size={12} className="animate-spin" />
                          <span>AI Analyzing...</span>
                        </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 hidden">
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center mb-2">
                    <MessageSquare size={14} className="mr-1.5 text-amber-600" /> Ghi chú điều phối (Auto-AI)</label>
                  <div className={`rounded-xl border-2 p-3 min-h-[200px] text-[11px] font-bold leading-relaxed transition-all ${
                      isAiApplied
                          ? 'border-amber-300 bg-amber-50 text-amber-900 shadow-inner'
                          : isEditing
                              ? 'border-gray-300 bg-white text-gray-700'
                              : 'border-gray-200 bg-gray-50 text-gray-500 italic'
                  }`}>
                    {isAiApplied && <div className="flex items-center text-amber-600 mb-2 font-black uppercase tracking-tighter"><Sparkles size={12} className="mr-1.5 animate-pulse" /> Đề xuất từ hệ thống RSA-AI</div>}
                    {isEditing ? (
                        <textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            className="w-full bg-transparent outline-none resize-none min-h-[160px]"
                            placeholder="Nhập ghi chú thêm..."
                        />
                    ) : (
                        <div className="whitespace-pre-wrap">
                          {verificationNotes || "Chưa có ghi chú điều phối..."}
                        </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-4 pt-4 border-t border-gray-50">
                  <div className="space-y-1">
                    <Label required>Dịch vụ yêu cầu</Label>
                    <ServiceSelectionField
                        selectedServices={selectedServices}
                        onUpdate={handleUpdateServices}
                        showTitle={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Thông tin điều phối cứu hộ */}
          <div id="section-orchestration" className={`scroll-mt-40 ${isVisible('orchestration') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <SectionHeader title="Thông tin điều phối cứu hộ" number={2} icon={<Truck size={16} />} />
              <div className="p-5 space-y-6">
                <div className="flex items-center space-x-4">
                  <button
                      onClick={() => setIsSearchModalOpen(true)}
                      className="bg-vetc-green text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-green-700 transition-all flex items-center space-x-2 active:scale-95"
                  >
                    <Shuffle size={14} />
                    <span>Điều phối tự động</span>
                  </button>

                  <button
                      disabled={!isEditing}
                      onClick={() => setIsManualSearchModalOpen(true)}
                      className={`bg-white border-2 border-vetc-green text-vetc-green px-5 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-green-50 transition-all flex items-center space-x-2 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Search size={14} />
                    <span>Tìm trạm thủ công</span>
                  </button>

                  <span className="text-[10px] text-gray-400 italic">Hệ thống sẽ gợi ý trạm gần nhất dựa trên vị trí sự cố</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-gray-50 text-left">
                  <div className="lg:col-span-1">
                    <Label required>Đối tác cung cấp</Label>
                    <PartnerSelect 
                      value={partnerName}
                      onChange={handlePartnerFeeAwareChange}
                      onCreate={(data) => {
                        setStationName(data.stationName);
                        setRescueVehicleType(data.stationSupportedVehicleTypes.join(', '));
                        setSelectedDriverId(data.driverName); 
                        setDriverPhone(data.driverPhone);
                      }}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <Label required>Trạm cứu hộ cụ thể</Label>
                    <select
                        disabled={!isEditing}
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-xs bg-white outline-none focus:border-vetc-green font-bold disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="Carpla Service - CN Hà Nội">Carpla Service - CN Hà Nội</option>
                      <option value="Cứu hộ 116 Hà Nội">Cứu hộ 116 Hà Nội</option>
                      <option value="Garage Thăng Long">Garage Thăng Long</option>
                      <option value="Cứu hộ ABC">Cứu hộ ABC</option>
                    </select>
                  </div>

                  <div>
                    <Label>Loại xe cứu hộ</Label>
                    <select
                        disabled={!isEditing}
                        value={rescueVehicleType}
                        onChange={(e) => setRescueVehicleType(e.target.value)}
                        className="w-full border rounded px-3 py-1.5 text-xs bg-white outline-none text-left disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="Xe kéo cẩu">Xe kéo cẩu</option>
                      <option value="Xe sàn trượt">Xe sàn trượt</option>
                      <option value="Xe cẩu quay">Xe cẩu quay</option>
                      <option value="<= 2.5 tấn">{'<= 2.5 tấn'}</option>
                      <option value="<= 1.4 tấn">{'<= 1.4 tấn'}</option>
                    </select>
                  </div>
                  <div>
                    <Label>Biển số xe cứu hộ</Label>
                    <Input value={rescueLicensePlate} onChange={setRescueLicensePlate} readOnly={!isEditing} />
                  </div>
                  <div>
                    <Label required>Tài xế thực hiện</Label>
                    <DriverSelect 
                      value={selectedDriverId}
                      onChange={(id, name, phone) => {
                        setSelectedDriverId(id);
                        if (phone) setDriverPhone(phone);
                      }}
                      disabled={!isEditing}
                      drivers={DRIVERS_MOCK}
                    />
                  </div>
                  <div>
                    <Label>SĐT Tài xế</Label>
                    <Input
                        value={driverPhone}
                        onChange={(val) => setDriverPhone(val)}
                        readOnly={!isEditing}
                        className="font-bold"
                    />
                  </div>

                  <div className="min-w-0 max-w-xs">
                    <Label>Điểm xưởng</Label>
                    <WorkshopSelect
                      value={workshopStation}
                      onChange={setWorkshopStation}
                      disabled={!isEditing}
                      defaultAddress={towingDestination}
                      defaultLat={towingCoords.split(',')[0]?.trim() || ''}
                      defaultLng={towingCoords.split(',')[1]?.trim() || ''}
                      stations={workshopStations}
                      onStationsChange={setWorkshopStations}
                      className="h-[31px] px-3 text-xs"
                    />
                  </div>
                  <div className="min-w-0 lg:col-span-2">
                    <Label required>Điểm kéo về (Destination)</Label>
                    <div className="flex gap-2">
                      <Input value={towingDestination} onChange={setTowingDestination} className="flex-1 min-w-0" readOnly={!isEditing} />
                      <button
                          onClick={() => setIsMapModalOpen(true)}
                          disabled={!isEditing}
                          className={`bg-vetc-green text-white px-4 py-1.5 rounded text-[11px] font-bold shrink-0 hover:bg-green-700 transition-all flex items-center space-x-2 active:scale-95 shadow-sm ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <MapPin size={14} />
                        <span>Bản đồ</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label required>Kinh độ / Vĩ độ</Label>
                    <div className="flex space-x-2">
                      <Input value={mapCoords.split(',')[0].trim()} readOnly={!isEditing} />
                      <Input value={mapCoords.split(',')[1]?.trim() || ''} readOnly={!isEditing} />
                    </div>
                  </div>
                  <div>
                    <Label>Khoảng cách (Ước tính)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={rescueDistance}
                        onChange={setRescueDistance}
                        onBlur={handleRescueDistanceBlur}
                        className="font-bold"
                        readOnly={!isEditing}
                      />
                      <span className="text-[10px] font-bold text-gray-400">KM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Thông tin phí */}
          <div id="section-fees" className={`scroll-mt-40 ${isVisible('fees') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <SectionHeader title="Thông tin phí" number={3} icon={<Banknote size={16} />} />
              <div className="p-5 space-y-6">
                {feeSnapshot && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
                    <div className="font-bold uppercase tracking-wide text-[10px] mb-1">Snapshot bảng phí</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        NCC: <span className="font-semibold">{feeSnapshot.partnerTableCode}</span> —{' '}
                        {feeSnapshot.partnerTableName} (v{feeSnapshot.partnerVersion})
                      </div>
                      <div>
                        KH:{' '}
                        <span className="font-semibold">
                          {feeSnapshot.customerFeeMode === 'RETAIL_MARKUP'
                            ? `Hệ số lẻ ×${feeSnapshot.retailMarkupFactor ?? getRetailMarkupFactor()}`
                            : `${feeSnapshot.customerTableCode ?? '—'} — ${feeSnapshot.customerTableName ?? ''}`}
                        </span>
                      </div>
                    </div>
                    {feeCriteriaOutOfSync ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                        <span>
                          Tiêu chí đã đổi nhưng đang <span className="font-bold">giữ phí thủ công</span> — phí có thể không còn khớp bảng phí.
                        </span>
                        <button
                          type="button"
                          disabled={!isEditing}
                          onClick={() => recalculateFeesFromEngine()}
                          className={`inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-amber-600 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <RefreshCw size={11} /> Tính lại phí
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                {/* Provider Payment Section */}
                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1 h-3 bg-blue-500 mr-2 rounded-full"></span>
                    Trả cho NCC
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div className="min-w-0">
                      <Label>Tổng thanh toán (Trước thuế)</Label>
                      <Input
                          value={Math.round(totalProviderPriceBeforeTax).toLocaleString('en-US')}
                          readOnly={!isEditing}
                          className="w-full font-bold text-gray-800 text-right bg-gray-50"
                      />
                    </div>

                    <div className="min-w-0">
                      <Label>Thuế VAT (%)</Label>
                      <select
                          value={vat}
                          disabled={!isEditing}
                          onChange={(e) => setVat(e.target.value)}
                          className={`w-full border rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-vetc-green transition-all bg-white ${!isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <option value="0">0%</option>
                        <option value="8">8%</option>
                        <option value="10">10%</option>
                      </select>
                    </div>

                    <div className="min-w-0">
                      <Label>Tổng thanh toán (Sau thuế)</Label>
                      <div className="flex gap-2">
                        <Input
                            value={displayProviderTotal.toLocaleString('en-US')}
                            onChange={handleProviderTotalChange}
                            readOnly={!isEditing}
                            className="flex-1 min-w-0 font-black text-red-600 text-right bg-red-50"
                        />
                        <button
                            type="button"
                            disabled={!isEditing}
                            onClick={handleRefreshProviderTotal}
                            title="Tính lại theo giá cố định × hệ số"
                            className={`shrink-0 bg-green-600 text-white px-2.5 py-1.5 rounded text-[10px] font-bold shadow-sm flex items-center justify-center transition-all hover:bg-green-700 active:scale-95 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      {isEditing ? (
                        <p className="mt-1 text-[9px] text-gray-500 leading-snug">
                          Đồng bộ với cột Giá NCC trong bảng bên dưới (phân bổ theo tỷ lệ).
                        </p>
                      ) : null}
                    </div>
                    <div className="hidden lg:block" aria-hidden="true" />
                  </div>
                </div>

                {/* Customer Payment Section */}
                <div className="pt-4 border-t border-gray-100 space-y-6">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1 h-3 bg-vetc-green mr-2 rounded-full"></span>
                    Khách hàng trả phí
                  </h3>

                  {/* Cá nhân */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-wider flex items-center">
                      <span className="w-1 h-2.5 bg-vetc-green mr-2 rounded-full"></span>
                      Cá nhân
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                      <div className="min-w-0">
                        <Label required>Chi phí tạm tính</Label>
                        <Input defaultValue="400,000" className="w-full font-black text-gray-800 text-right" readOnly={!isEditing} />
                      </div>
                      <div className="min-w-0">
                        <Label>Thuế VAT (%)</Label>
                        <select
                            value={vat}
                            disabled={!isEditing}
                            onChange={(e) => setVat(e.target.value)}
                            className={`w-full border rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-vetc-green transition-all bg-white ${!isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <option value="0">0%</option>
                          <option value="8">8%</option>
                          <option value="10">10%</option>
                        </select>
                      </div>
                      <div className="min-w-0">
                        <Label>Tổng thanh toán (Sau thuế)</Label>
                        <Input
                            value={individualCustomerPrice.toLocaleString('en-US')}
                            onChange={handleCustomerTotalChange}
                            readOnly={!isEditing}
                            className="w-full font-black text-red-600 text-right bg-red-50"
                        />
                        {isEditing ? (
                          <p className="mt-1 text-[9px] text-gray-500 leading-snug">
                            Đồng bộ với cột Phí KHCN trong bảng bên dưới (phân bổ theo tỷ lệ).
                          </p>
                        ) : null}
                      </div>
                      <div className="hidden lg:block" aria-hidden="true" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-gray-100">
                      <div className="min-w-0">
                        <Label>Tiền đã cọc</Label>
                        <div className="flex gap-2">
                          <Input
                              value={DEPOSIT_AMOUNT.toLocaleString('en-US')}
                              className="flex-1 min-w-0 text-right text-green-600 font-bold bg-gray-50"
                              readOnly
                          />
                          <button
                              title="Thanh toán tiền cọc"
                              disabled={isEditing}
                              className={`shrink-0 bg-green-600 text-white px-2.5 py-1.5 rounded text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition-all hover:bg-green-700 active:scale-95 whitespace-nowrap ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => openPaymentModal('deposit')}
                          >
                            <CreditCard size={14} />
                            <span>Thanh toán</span>
                          </button>
                        </div>
                        {hasDeposited && isEditing && (
                          <p className="text-[9px] text-amber-600 font-medium mt-1">Đã cọc — không thể chỉnh sửa</p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Label>Đã thanh toán</Label>
                        <Input
                            value={paidAmount.toLocaleString('en-US')}
                            className="w-full text-right text-blue-600 font-bold"
                            readOnly
                        />
                      </div>

                      <div className="min-w-0">
                        <Label>Còn lại</Label>
                        <div className="flex gap-2">
                          <Input
                              value={remainingAmount.toLocaleString('en-US')}
                              readOnly
                              className="flex-1 min-w-0 text-right font-black"
                          />
                          <button
                              title="Thanh toán phần còn lại"
                              disabled={isEditing}
                              className={`shrink-0 bg-green-600 text-white px-2.5 py-1.5 rounded text-[10px] font-bold shadow-sm flex items-center justify-center gap-1 transition-all hover:bg-green-700 active:scale-95 whitespace-nowrap ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              onClick={() => openPaymentModal('remaining')}
                          >
                            <CreditCard size={14} />
                            <span>Thanh toán</span>
                          </button>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <Label>Tiền hoàn</Label>
                        <Input
                            value={refundAmount.toLocaleString('en-US')}
                            className="w-full text-right text-amber-600 font-bold bg-gray-50"
                            readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* Doanh nghiệp — hiện khi đã chọn DN ở section 1; chỉ Admin được sửa */}
                  {selectedEnterprise && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-wider flex items-center">
                        <span className="w-1 h-2.5 bg-blue-500 mr-2 rounded-full"></span>
                        Doanh nghiệp — {selectedEnterpriseLabel}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <div className="min-w-0">
                          <Label required>Chi phí tạm tính</Label>
                          <Input
                              value={
                                isGuaranteeActive
                                  ? Math.round(enterpriseBeforeTax).toLocaleString('en-US')
                                  : enterpriseEstimatedCost
                              }
                              onChange={handleEnterpriseEstimatedCostChange}
                              className="w-full font-black text-gray-800 text-right"
                              readOnly={!canEditEnterpriseFees || isGuaranteeActive}
                          />
                        </div>
                        <div className="min-w-0">
                          <Label>Thuế VAT (%)</Label>
                          <select
                              value={vat}
                              disabled={!canEditEnterpriseFees || isGuaranteeActive}
                              onChange={(e) => setVat(e.target.value)}
                              className={`w-full border rounded px-3 py-1.5 text-xs font-bold outline-none focus:border-vetc-green transition-all bg-white ${!canEditEnterpriseFees || isGuaranteeActive ? 'cursor-not-allowed opacity-60 bg-gray-50' : ''}`}
                          >
                            <option value="0">0%</option>
                            <option value="8">8%</option>
                            <option value="10">10%</option>
                          </select>
                        </div>
                        <div className="min-w-0">
                          <Label required>Tổng thanh toán (Sau thuế)</Label>
                          <Input
                              value={enterpriseAfterTax.toLocaleString('en-US')}
                              readOnly
                              className="w-full font-black text-red-600 text-right bg-red-50"
                          />
                        </div>
                        <div className="hidden lg:block" aria-hidden="true" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Actual Services & Fees */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1 h-3 bg-vetc-green mr-2 rounded-full"></span>
                    Dịch vụ thực tế & Chi phí
                  </h3>
                  <div className="space-y-3">
                    {isEditing ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-900">
                        <span className="font-bold">Sửa phí trên dòng:</span> chỉ chỉnh <span className="font-semibold">Phí KHCN</span>
                        {isGuaranteeActive ? (
                          <>
                            {' '}/ <span className="font-semibold">Phí KHDN</span>
                          </>
                        ) : null}
                        {' '}/ <span className="font-semibold">Giá NCC</span>.
                        Hệ số &amp; loại phụ phí chỉ xem (tooltip) — cấu hình ở bảng phí / chức năng tính lại phía trên.
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          <li>
                            Sửa <span className="font-semibold">Phí KHCN</span>
                            {isGuaranteeActive ? (
                              <>
                                {' '}/ <span className="font-semibold">Phí KHDN</span>
                              </>
                            ) : null}
                            {' '}→ gắn nhãn <span className="font-semibold">Thủ công</span>; không đổi Giá NCC / hệ số; tổng cá nhân &amp; DN phía trên = cộng các dòng.
                            {!isGuaranteeActive && (
                              <> Khi chưa bảo lãnh, toàn bộ phí KH nằm ở <span className="font-semibold">Phí KHCN</span>.</>
                            )}
                            {isGuaranteeActive && guaranteeType === 'rate' && (
                              <> Khi có bảo lãnh {guaranteeRateNum}%, mặc định tách theo tỷ lệ; sửa tay sẽ giữ số đã nhập.</>
                            )}
                            {isGuaranteeActive && guaranteeType === 'fixed' && (
                              <> Khi có bảo lãnh số tiền cố định {guaranteeAmountNum.toLocaleString('en-US')} đ, mặc định phân bổ Phí KHDN theo số tiền này; sửa tay sẽ giữ số đã nhập.</>
                            )}
                          </li>
                          <li>
                            Sửa <span className="font-semibold">Giá NCC</span> → <span className="font-semibold">Thủ công</span>; không nhân lại giá cố định × hệ số. Nếu phí KH chưa thủ công thì KH = Giá NCC × markup khách lẻ; nếu KH đã thủ công thì giữ nguyên.
                          </li>
                        </ul>
                      </div>
                    ) : null}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-[11px]">
                        <thead>
                        <tr className="bg-green-50/50 text-gray-600 border-b">
                          <th className="p-2 text-center border font-bold w-10">STT</th>
                          <th className="p-2 text-left border font-bold w-80">Tên dịch vụ</th>
                          <th className="p-2 text-right border font-bold w-40">
                            Phí KHCN
                            <div className="text-[9px] font-semibold text-blue-600 normal-case tracking-normal">Cá nhân</div>
                          </th>
                          <th className="p-2 text-right border font-bold w-40">
                            Phí KHDN
                            <div className="text-[9px] font-semibold text-indigo-600 normal-case tracking-normal">Doanh nghiệp</div>
                          </th>
                          <th className="p-2 text-center border font-bold w-24">
                            Hệ số
                            <div className="text-[9px] font-semibold text-blue-600 normal-case tracking-normal">Phí KH</div>
                          </th>
                          <th className="p-2 text-right border font-bold w-48">Giá NCC</th>
                          <th className="p-2 text-center border font-bold w-24">
                            Hệ số
                            <div className="text-[9px] font-semibold text-gray-600 normal-case tracking-normal">Giá NCC</div>
                          </th>
                          <th className="p-2 text-right border font-bold w-40">Chênh lệch giá</th>
                          <th className="p-2 text-right border font-bold w-40">Giá cố định</th>
                          <th className="p-2 text-center border font-bold w-20">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody>
                        {adjustmentRows.map((row, idx) => {
                          const customerCoef = parseFloat(row.customerCoefficient) || 0;
                          const partnerCoef = parseFloat(row.partnerCoefficient ?? row.coefficient) || 0;
                          const isMaxCustomer = customerCoef === maxCoefficient && maxCoefficient > 1;
                          const isMaxPartner = partnerCoef === maxCoefficient && maxCoefficient > 1;
                          const { khcn, khdn } = getRowKhFees(row);
                          return (
                              <tr key={row.id} className={`border-b hover:bg-gray-50 transition-colors`}>
                                <td className="p-2 border text-center font-medium">{idx + 1}</td>
                                <td className="p-2 border font-bold text-gray-800">
                                  {row.isCustom ? (
                                    <Input
                                      value={row.serviceName}
                                      onChange={(val) => handleAdjustmentChange(row.id, 'serviceName', val)}
                                      readOnly={!isEditing}
                                      className={`font-bold text-gray-800 ${!isEditing ? 'bg-gray-50' : ''}`}
                                    />
                                  ) : (
                                    row.serviceName
                                  )}
                                </td>
                                <td className="p-2 border text-right font-medium">
                                  {isEditing ? (
                                    <div className="space-y-1">
                                      <Input
                                        value={khcn.toLocaleString('en-US')}
                                        onChange={(val) => handleCustomerKhcnChange(row.id, val)}
                                        readOnly={false}
                                        className="text-right font-bold text-blue-600"
                                      />
                                      <div className="flex justify-end">
                                        <span className={`text-[9px] font-semibold ${row.isCustomerFeeManual ? 'text-amber-700' : 'text-blue-700'}`}>
                                          {row.isCustomerFeeManual
                                            ? 'Thủ công'
                                            : row.customerSource || customerFeeSourceText}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="text-right font-bold text-blue-600">
                                        {khcn.toLocaleString('en-US')}
                                      </div>
                                      <div className="flex justify-end">
                                        <span className={`text-[9px] font-semibold ${row.isCustomerFeeManual ? 'text-amber-700' : 'text-blue-700'}`}>
                                          {row.isCustomerFeeManual
                                            ? 'Thủ công'
                                            : row.customerSource || customerFeeSourceText}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 border text-right font-medium">
                                  {isEditing && isGuaranteeActive ? (
                                    <Input
                                      value={khdn.toLocaleString('en-US')}
                                      onChange={(val) => handleCustomerKhdnChange(row.id, val)}
                                      readOnly={false}
                                      className="text-right font-bold text-indigo-600"
                                    />
                                  ) : (
                                    <div className={`text-right font-bold ${khdn > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                      {khdn > 0 ? khdn.toLocaleString('en-US') : '—'}
                                    </div>
                                  )}
                                </td>
                                <td className={`p-2 text-center border ${isMaxCustomer ? 'bg-amber-50' : ''}`}>
                                  <CoefficientWithTooltip
                                    value={row.customerCoefficient}
                                    items={row.customerSurchargeItems ?? []}
                                    formula={row.customerCoefficientFormula}
                                    highlight={isMaxCustomer}
                                    tone="customer"
                                  />
                                </td>
                                <td className="p-2 border text-right font-medium">
                                  {isEditing ? (
                                    <div className="space-y-1">
                                      <Input
                                        value={row.totalPrice}
                                        onChange={(val) => handleProviderPriceChange(row.id, val)}
                                        readOnly={adjustmentRows.length === 1}
                                        className={`text-right font-bold text-gray-800 ${adjustmentRows.length === 1 ? 'bg-gray-50' : ''}`}
                                      />
                                      <div className="flex justify-end">
                                        <span className={`text-[9px] font-semibold ${row.isPartnerFeeManual ? 'text-amber-700' : 'text-gray-700'}`}>
                                          {row.isPartnerFeeManual
                                            ? 'Thủ công'
                                            : row.partnerSource || partnerFeeSourceText}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="text-right font-bold text-gray-800">
                                        {row.totalPrice}
                                      </div>
                                      <div className="flex justify-end">
                                        <span className={`text-[9px] font-semibold ${row.isPartnerFeeManual ? 'text-amber-700' : 'text-gray-700'}`}>
                                          {row.isPartnerFeeManual
                                            ? 'Thủ công'
                                            : row.partnerSource || partnerFeeSourceText}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className={`p-2 text-center border ${isMaxPartner ? 'bg-amber-50' : ''}`}>
                                  <CoefficientWithTooltip
                                    value={row.partnerCoefficient ?? row.coefficient}
                                    items={row.partnerSurchargeItems ?? []}
                                    formula={row.partnerCoefficientFormula}
                                    highlight={isMaxPartner}
                                    tone="neutral"
                                  />
                                </td>
                                <td className="p-2 border text-right font-medium">
                                  <div className={`flex items-center justify-end space-x-1 font-bold ${
                                      row.discount.trim().startsWith('-')
                                          ? 'text-red-600'
                                          : parseFloat(row.discount.replace(/,/g, '')) > 0
                                              ? 'text-green-600'
                                              : 'text-gray-500'
                                  }`}>
                                    {row.discount.trim().startsWith('-') ? (
                                        <>
                                          <TrendingUp size={12} />
                                          <span>+{row.discount.replace('-', '').trim()}</span>
                                        </>
                                    ) : parseFloat(row.discount.replace(/,/g, '')) > 0 ? (
                                        <>
                                          <TrendingDown size={12} />
                                          <span>-{row.discount.trim()}</span>
                                        </>
                                    ) : (
                                        <span>0</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2 border text-right font-medium text-gray-700">
                                  <div className="text-right font-bold text-gray-700">{row.fixedPrice}</div>
                                </td>
                                <td className="p-2 border text-center">
                                  <button
                                      disabled={!isEditing}
                                      onClick={() => handleRemoveAdjustmentRow(row.id)}
                                      className={`p-1 text-gray-400 hover:text-red-500 rounded transition-colors ${!isEditing ? 'cursor-not-allowed' : ''}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                          );
                        })}
                        </tbody>
                        <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                          <td className="p-2 border text-center" colSpan={2}>
                            <span className="text-[10px] uppercase tracking-wider text-gray-600">Tổng cộng</span>
                          </td>
                          <td className="p-2 border text-right text-blue-600">
                            {tableTotals.customerPaidKhcn.toLocaleString('en-US')}
                          </td>
                          <td className="p-2 border text-right text-indigo-600">
                            {tableTotals.customerPaidKhdn > 0
                              ? tableTotals.customerPaidKhdn.toLocaleString('en-US')
                              : '—'}
                          </td>
                          <td className="p-2 border" />
                          <td className="p-2 border text-right text-gray-800">
                            {tableTotals.totalPrice.toLocaleString('en-US')}
                          </td>
                          <td className="p-2 border" />
                          <td className={`p-2 border text-right ${
                            tableTotals.discount > 0
                              ? 'text-green-600'
                              : tableTotals.discount < 0
                                ? 'text-red-600'
                                : 'text-gray-500'
                          }`}>
                            {tableTotals.discount === 0
                              ? '0'
                              : tableTotals.discount > 0
                                ? `-${Math.abs(tableTotals.discount).toLocaleString('en-US')}`
                                : `+${Math.abs(tableTotals.discount).toLocaleString('en-US')}`}
                          </td>
                          <td className="p-2 border" colSpan={2} />
                        </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                          type="button"
                          onClick={() => setIsFeeTableModalOpen(true)}
                          className="text-[10px] text-vetc-green bg-white border border-vetc-green px-4 py-2 rounded-lg font-bold hover:bg-green-50 shadow-sm flex items-center transition-all active:scale-95"
                      >
                        <Table2 size={12} className="mr-1.5" /> Xem bảng phí
                      </button>
                      <button
                          disabled={!isEditing}
                          onClick={() => setIsServiceModalOpen(true)}
                          className={`text-[10px] text-white bg-vetc-green px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center transition-all active:scale-95 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Plus size={12} className="mr-1.5" /> Thêm dịch vụ thực tế
                      </button>
                    </div>
                  </div>
                </div>

                {/* Advance Payment */}
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <span className="w-1 h-3 bg-vetc-green mr-2 rounded-full"></span>
                    Tạm ứng
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div className="lg:col-span-1">
                      <Label>Tạm ứng</Label>
                      <Input
                          value={advanceAmount}
                          onChange={setAdvanceAmount}
                          readOnly={!isEditing}
                          className="text-right font-bold"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <Label>Người tạm ứng</Label>
                      <Input
                          value={advancePerson}
                          onChange={setAdvancePerson}
                          readOnly={!isEditing}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* 4. Quá trình cứu hộ */}
          <div id="section-process" className={`scroll-mt-40 ${isVisible('process') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <SectionHeader title="Quá trình cứu hộ" number={4} icon={<Activity size={18} />} />
              <div className="grid grid-cols-1 lg:grid-cols-12 h-[600px]">
                {/* Map Container */}
                <div className="lg:col-span-8 bg-gray-100 relative group text-left">
                  <iframe
                      src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d15000!2d105.8452!3d21.0285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      className="grayscale-[0.1] contrast-[1.05]"
                  ></iframe>

                  {/* Overlay Map UI */}
                  <div className="absolute top-4 left-4 flex flex-col space-y-2">
                    <div className="bg-white/95 p-3 rounded-xl shadow-lg border border-gray-100 backdrop-blur-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <Truck size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Vị trí xe cứu hộ</p>
                          <p className="text-xs font-bold text-gray-800 mt-1">Cách hiện trường 2.5 km</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4">
                  </div>

                  <div className="absolute bottom-6 right-6 flex flex-col space-y-2">
                    <button className="bg-white p-2 rounded-lg shadow-xl hover:bg-gray-50 active:scale-95 transition-all"><Plus size={20} /></button>
                    <button className="bg-white p-2 rounded-lg shadow-xl hover:bg-gray-50 active:scale-95 transition-all border-t"><X size={20} /></button>
                  </div>
                </div>

                {/* Timeline — VnetGPS map/playback */}
                <div className="lg:col-span-4 border-l flex flex-col bg-white overflow-hidden text-left min-h-0">
                  <RescueGpsPlaybackSection />
                  <div className="p-4 bg-gray-50 border-t shrink-0">
                    {!isOrderCancelled && (
                    <button 
                      onClick={() => setIsStatusUpdateModalOpen(true)}
                      className="w-full bg-vetc-green text-white py-2.5 rounded-xl font-bold text-xs shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <Pencil size={14} />
                      <span>Cập nhật trạng thái thủ công</span>
                    </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Hình ảnh sự cố & Quá trình thực hiện */}
          <div id="section-images" className={`scroll-mt-40 ${isVisible('images') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <SectionHeader title="Hình ảnh sự cố & Quá trình thực hiện" number={5} icon={<Camera size={18} />} />
              <div className="p-6">
                <ImageUploadSection
                  readOnly={!isEditing}
                  sceneImages={sceneImages}
                  sceneBadge={<CustomerUpdatedBadge compact updated={isCustomerUpdated} />}
                  sceneCustomerMarked={isCustomerUpdated}
                />
              </div>
            </div>
          </div>

          {/* 6. Camera xe cứu hộ (VnetGPS) */}
          <div id="section-camera" className={`scroll-mt-40 ${isVisible('camera') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
              <SectionHeader title="Camera xe cứu hộ" number={6} icon={<Video size={18} />} />
              <div className="p-6">
                <RescueVehicleCameraSection readOnly={!isEditing} />
              </div>
            </div>
          </div>

          {/* 7. Thông tin giám sát, thực thi */}
          <div id="section-monitoring" className={`scroll-mt-40 ${isVisible('monitoring') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden text-left">
              <SectionHeader title="Thông tin giám sát, thực thi" number={7} icon={<ShieldCheck size={18} />} />
              <div className="p-5 space-y-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3">
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">
                    Demo các trường hợp đánh giá
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {RATING_DEMO_CASES.map((item) => (
                      <div key={item.type} className="flex items-start space-x-2 text-[10px] text-blue-900">
                        <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span>
                          <strong className="font-bold">{RATING_TYPE_LABELS[item.type]}:</strong>{' '}
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Cột trái: Đánh giá từ Khách hàng */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đánh giá từ Khách hàng</span>
                    </div>
                    {RATING_CARD_CONFIG.filter((c) => c.type.startsWith('customer_')).map((config) => (
                      <DetailedRatingCard
                        key={config.type}
                        title={RATING_TYPE_LABELS[config.type]}
                        versions={ratingHistories[config.type]}
                        categories={config.categories}
                        feedback={config.feedback}
                        isExpanded={expandedRatings[config.type]}
                        onToggle={() => setExpandedRatings((prev) => ({ ...prev, [config.type]: !prev[config.type] }))}
                        onSaveVersion={(data) => handleSaveRatingVersion(config.type, data)}
                        onViewHistory={() => setRatingHistoryModal({ isOpen: true, type: config.type })}
                        {...(config.type === 'customer_workshop'
                          ? {
                              targetOptions: workshopStations.map((s) => s.name),
                              targetSelectLabel: 'Xưởng dịch vụ',
                              defaultTarget: workshopStation || workshopStations[0]?.name,
                            }
                          : {})}
                      />
                    ))}
                  </div>

                  {/* Cột phải: Đánh giá nội bộ */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Đánh giá nội bộ</span>
                    </div>
                    {RATING_CARD_CONFIG.filter((c) => !c.type.startsWith('customer_')).map((config) => (
                      <DetailedRatingCard
                        key={config.type}
                        title={RATING_TYPE_LABELS[config.type]}
                        versions={ratingHistories[config.type]}
                        categories={config.categories}
                        feedback={config.feedback}
                        isExpanded={expandedRatings[config.type]}
                        onToggle={() => setExpandedRatings((prev) => ({ ...prev, [config.type]: !prev[config.type] }))}
                        onSaveVersion={(data) => handleSaveRatingVersion(config.type, data)}
                        onViewHistory={() => setRatingHistoryModal({ isOpen: true, type: config.type })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7. Thông tin hóa đơn */}
          <div id="section-invoice" className={`scroll-mt-40 ${isVisible('invoice') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden text-left">
              <SectionHeader title="Thông tin hóa đơn" number={8} icon={<FileText size={18} />} />
              <div className="p-5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                  <div>
                    <Label required>Đối tượng xuất hóa đơn</Label>
                    <select
                        disabled={!isEditing}
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        className={`w-full border rounded px-3 py-1.5 text-xs bg-white outline-none focus:border-vetc-green font-bold text-gray-800 ${!isEditing ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    >
                      <option>Cá nhân</option>
                      <option>Doanh nghiệp</option>
                    </select>
                  </div>
                  <div className={customerType === 'Cá nhân' ? 'opacity-50' : ''}>
                    <Label required={customerType === 'Doanh nghiệp'}>Tên doanh nghiệp / Công ty</Label>
                    <div className="relative">
                      <Building2 size={12} className="absolute left-3 top-2 text-gray-400" />
                      <Input
                          placeholder="Nhập tên đầy đủ của công ty..."
                          className="pl-8"
                          readOnly={!isEditing || customerType === 'Cá nhân'}
                      />
                    </div>
                  </div>
                  <div className={customerType === 'Cá nhân' ? 'opacity-50' : ''}>
                    <Label required={customerType === 'Doanh nghiệp'}>Mã số thuế</Label>
                    <Input
                        placeholder="Nhập MST..."
                        readOnly={!isEditing || customerType === 'Cá nhân'}
                    />
                  </div>
                  <div>
                    <Label>Email nhận hóa đơn</Label>
                    <div className="relative">
                      <Mail size={12} className="absolute left-3 top-2 text-gray-400" />
                      <Input
                        placeholder="email@company.com"
                        className="pl-8"
                        readOnly={!isEditing}
                        value={invoiceEmail}
                        onChange={(e) => setInvoiceEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <Label>Căn cước công dân</Label>
                    <Input placeholder="Nhập thông tin căn cước công dân" readOnly={!isEditing} />
                  </div>
                  <div className="lg:col-span-3">
                    <Label>Địa chỉ xuất hóa đơn</Label>
                    <Input placeholder="Nhập địa chỉ chính xác trên giấy phép kinh doanh..." readOnly={!isEditing} />
                  </div>
                </div>

                {invoiceDownloadUrl ? (
                  <div className="overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-white shadow-sm">
                    <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#00A859]">
                            <Check size={16} strokeWidth={2.5} />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-gray-800">Hóa đơn đã xuất</p>
                            <p className="text-[11px] font-medium text-gray-500">Có thể điều chỉnh thông tin phi tiền tệ hoặc thay thế toàn bộ hóa đơn</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Mã hóa đơn</p>
                            <p className="mt-0.5 text-xs font-bold text-gray-800">{invoiceCode}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Người xuất</p>
                            <p className="mt-0.5 truncate text-xs font-bold text-gray-800" title={invoiceExportedBy}>{invoiceExportedBy}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Lần xuất</p>
                            <p className="mt-0.5 text-xs font-bold text-gray-800">Lần {invoiceExportCount}</p>
                          </div>
                          <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Thời điểm xuất</p>
                            <p className="mt-0.5 text-xs font-bold text-gray-800">{invoiceExportedAt}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
                        <button
                          type="button"
                          onClick={handleViewInvoice}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#00A859] px-4 text-xs font-bold text-white transition-colors hover:bg-[#008f4c]"
                        >
                          <Eye size={14} />
                          Xem hóa đơn
                        </button>
                        <button
                          type="button"
                          onClick={handleExportInvoice}
                          disabled={isExportingInvoice}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition-colors hover:border-[#00A859] hover:text-[#00A859] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Pencil size={14} />
                          Điều chỉnh
                        </button>
                        <button
                          type="button"
                          onClick={handleReplaceInvoice}
                          disabled={isExportingInvoice}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition-colors hover:border-[#00A859] hover:text-[#00A859] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <RefreshCw size={14} />
                          Thay thế
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Chưa xuất hóa đơn</p>
                      <p className="text-[11px] font-medium text-gray-500">Kiểm tra thông tin pháp nhân rồi xuất eInvoice</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInvoicePreviewMode('preview');
                          setIsInvoicePreviewOpen(true);
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition-colors hover:border-[#00A859] hover:text-[#00A859]"
                      >
                        <Eye size={14} />
                        Xem trước
                      </button>
                      <button
                        type="button"
                        onClick={handleExportInvoice}
                        disabled={isExportingInvoice}
                        className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#00A859] px-4 text-xs font-bold text-white transition-colors hover:bg-[#008f4c] ${isExportingInvoice ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isExportingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                        {isExportingInvoice ? 'Đang tạo...' : 'Xuất hóa đơn'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 8. Đề nghị thanh toán */}
          <div id="section-payment-request" className={`scroll-mt-40 ${isVisible('payment-request') ? 'block' : 'hidden'}`}>
            <div className="border rounded-lg shadow-sm bg-white overflow-hidden text-left">
              <SectionHeader title="Đề nghị thanh toán" number={9} icon={<CreditCard size={18} />} />
              <div className="p-4">
                <PaymentRequestSection disabled={currentStatus !== 'FINISH-COMPLETED'} />
              </div>
            </div>
          </div>
        </div>

        <UsageHistoryModal
            isOpen={isPackageModalOpen}
            onClose={() => setIsPackageModalOpen(false)}
            currentPackage={selectedPackage}
            customerPlate={mockFormData.customer.plate}
            orders={packageOrders}
        />

        {isSponsorDetailOpen && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
            onClick={() => setIsSponsorDetailOpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border-t-4 border-vetc-green"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-vetc-green p-4 flex items-center justify-between text-white">
                <div>
                  <h3 className="font-bold text-lg">Chi tiết bảo lãnh theo gói</h3>
                  <p className="text-[11px] text-white/80 mt-0.5">{selectedPackage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSponsorDetailOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="p-5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase text-gray-400 border-b">
                      <th className="py-2 pr-3">Loại</th>
                      <th className="py-2 pr-3">Dịch vụ / loại dịch vụ</th>
                      <th className="py-2 text-right">Số tiền bảo lãnh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageFixedSponsorRules.map((rule, index) => {
                      const detail = describeSponsorRule(rule);
                      return (
                        <tr key={`${detail.kind}-${index}`} className="border-b border-gray-100">
                          <td className="py-2.5 pr-3 font-bold text-gray-700 whitespace-nowrap">{detail.kind}</td>
                          <td className="py-2.5 pr-3">
                            <div className="font-bold text-gray-800">{detail.name}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{detail.note}</div>
                          </td>
                          <td className="py-2.5 text-right font-bold text-gray-800 whitespace-nowrap">
                            {rule.amount.toLocaleString('en-US')} đ
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="pt-3 font-bold text-gray-600 uppercase text-[10px]">Tổng</td>
                      <td className="pt-3 text-right font-bold text-vetc-green whitespace-nowrap">
                        {packageFixedSponsorTotal.toLocaleString('en-US')} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>,
          document.body
        )}

        <AppliedFeeTablesModal
          open={isFeeTableModalOpen}
          onClose={() => setIsFeeTableModalOpen(false)}
          snapshot={feeSnapshot}
        />

        {/* Actual Service Selection Modal */}
        {isServiceModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border-t-4 border-vetc-green">
                <div className="bg-vetc-green p-4 flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <Settings size={22} className="animate-spin-slow" />
                    <h3 className="font-bold text-lg">Thêm dịch vụ thực tế</h3>
                  </div>
                  <button
                      onClick={() => setIsServiceModalOpen(false)}
                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="p-6 bg-gray-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {AVAILABLE_SERVICES.map((serviceName) => (
                        <button
                            key={serviceName}
                            onClick={() => handleSelectServiceFromModal(serviceName)}
                            className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-vetc-green hover:shadow-md transition-all text-left group active:scale-95"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-vetc-green group-hover:bg-vetc-green group-hover:text-white transition-colors">
                              {serviceName === 'Dịch vụ khác' ? <Edit size={16} /> : <Wrench size={16} />}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{serviceName}</span>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-vetc-green group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                  </div>
                  {isOtherServiceFormOpen && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Dịch vụ khác</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label required>Loại phí phát sinh</Label>
                          <select
                            value={otherServiceKey}
                            onChange={(e) => {
                              const selectedKey = e.target.value;
                              setOtherServiceKey(selectedKey);
                              const selectedOption = otherServiceOptions.find((opt) => opt.value === selectedKey);
                              if (selectedOption) {
                                setOtherServicePrice(selectedOption.suggestedPrice.toLocaleString('en-US'));
                              } else {
                                setOtherServicePrice('');
                              }
                            }}
                            className="w-full border rounded px-3 py-1.5 text-xs outline-none focus:border-vetc-green bg-white"
                          >
                            <option value="">-- Chọn loại phí --</option>
                            {otherServiceOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.suggestedPrice.toLocaleString('en-US')})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label required>Giá NCC</Label>
                          <Input
                            value={otherServicePrice}
                            onChange={(val) => setOtherServicePrice(formatMoneyInput(val))}
                            placeholder="Nhập số tiền"
                            className="text-right"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveOtherService}
                          disabled={!otherServiceKey || parseMoney(otherServicePrice) <= 0}
                          className="px-4 py-2 rounded-lg bg-vetc-green text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                        >
                          Lưu dịch vụ
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t flex justify-end space-x-3">
                  <button
                      onClick={() => setIsServiceModalOpen(false)}
                      className="px-6 py-2 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-colors text-sm"
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>
            </div>
        )}

        <VehicleInfoLookupModal
          isOpen={isVehicleSearchOpen}
          initialQuery={vehicleLookupQuery}
          searchMode={vehicleLookupMode}
          applyPackage={false}
          onClose={() => setIsVehicleSearchOpen(false)}
          onApply={handleApplyVehicleInfo}
        />

        <CustomerPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            paymentType={activePaymentType}
            amount={activePaymentType === 'deposit' ? DEPOSIT_AMOUNT.toLocaleString('en-US') : remainingAmount.toLocaleString('en-US')}
            session={activePaymentType === 'deposit' ? depositPaymentSession : remainingPaymentSession}
            onSessionChange={activePaymentType === 'deposit' ? setDepositPaymentSession : setRemainingPaymentSession}
            allowCashPayment={role === 'ADMIN'}
        />

        <UnpaidDepositRemainingWarningModal
            isOpen={isUnpaidDepositWarningOpen}
            onClose={() => setIsUnpaidDepositWarningOpen(false)}
            onConfirm={handleConfirmUnpaidDepositRemaining}
            depositAmount={DEPOSIT_AMOUNT}
            totalAmount={individualCustomerPrice}
            remainingAmount={remainingAmount}
        />

        <ManualFeeRecalcWarningModal
          isOpen={isManualFeeRecalcWarningOpen}
          changeDescription={pendingFeeCriteriaChange?.description ?? ''}
          onCancel={handleCancelFeeCriteriaChange}
          onKeepManual={handleKeepManualAfterCriteriaChange}
          onRecalculate={handleRecalculateAfterCriteriaChange}
        />

        <CustomerFeeChangeWarningModal
            isOpen={isFeeWarningOpen}
            onClose={handleCancelFeeChange}
            onConfirm={handleConfirmFeeChange}
            type={pendingFeeChange?.type ?? 'increase'}
            oldTotal={pendingFeeChange?.oldTotal ?? 0}
            newTotal={pendingFeeChange?.newTotal ?? 0}
            excessRefund={pendingFeeChange?.type === 'decrease' ? Math.max(0, DEPOSIT_AMOUNT - (pendingFeeChange?.newTotal ?? 0)) : 0}
            additionalAmount={pendingFeeChange?.type === 'increase' ? (pendingFeeChange?.newTotal ?? 0) - (pendingFeeChange?.oldTotal ?? 0) : 0}
        />

        <GuaranteeRateChangeWarningModal
            isOpen={isGuaranteeRateWarningOpen}
            onClose={handleCancelGuaranteeRateChange}
            onConfirm={handleConfirmGuaranteeRateChange}
            kind={pendingGuaranteeChange?.kind ?? 'rate'}
            oldValue={
              pendingGuaranteeChange?.kind === 'amount'
                ? guaranteeAmount
                : pendingGuaranteeChange?.kind === 'type'
                  ? guaranteeType
                  : guaranteeRate
            }
            newValue={pendingGuaranteeChange?.value ?? ''}
            enterpriseLabel={selectedEnterpriseLabel}
        />

        {/* Cancellation Dialog */}
        <CancellationDialog
            isOpen={isCancelModalOpen || isEditCancelReasonModalOpen}
            onClose={handleCloseCancelDialog}
            onConfirm={isEditCancelReasonModalOpen ? handleConfirmEditCancelReason : handleConfirmCancel}
            selectedReason={selectedCancelReason}
            setSelectedReason={setSelectedCancelReason}
            otherReason={cancelReason}
            setOtherReason={setCancelReason}
            cancelReasons={CANCEL_REASONS}
            variant={isEditCancelReasonModalOpen ? 'editReason' : 'cancel'}
        />

        {/* Map Selection Modal */}
        <MapSelectionModal
            isOpen={isMapModalOpen}
            onClose={() => setIsMapModalOpen(false)}
            onConfirm={handleConfirmLocation}
            initialAddress={mapAddress}
            initialCoords={mapCoords}
        />

        {/* Rescue List Modal (Previously Searching Modal) */}
        {isSearchModalOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] overflow-hidden relative h-[80vh] flex flex-col">
                <div className="absolute top-4 right-4 z-20">
                  <button
                      onClick={() => setIsSearchModalOpen(false)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-gray-50">
                  {stateFindStation === 'search' &&
                      <Searching
                          data={mockFormData}
                          onComplete={() => {setStateFindStation('list')}}
                          onManualEntry={() => {
                            setIsSearchModalOpen(false);
                            setIsManualSearchModalOpen(true);
                          }}
                          onBack={() => setIsSearchModalOpen(false)}
                      />
                  }
                  {stateFindStation === 'list' &&
                      <RescueList
                          data={mockFormData}
                          onSelect={handleRescueSelect}
                          onManualEntry={() => setIsSearchModalOpen(false)}
                          onBack={() => setIsSearchModalOpen(false)}
                          onExpandSearch={() => console.log('Expand search')}
                      />
                  }
                </div>
              </div>
            </div>
        )}

        {/* Manual Station Search Modal */}
        {isManualSearchModalOpen && (
            <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl overflow-hidden relative flex flex-col max-h-[85vh]">
                <ManualStationSearch
                    onSelect={handleManualRescueSelect}
                    onClose={() => setIsManualSearchModalOpen(false)}
                    selectedStationName={stationName}
                />
              </div>
            </div>
        )}

        {/* INVOICE PREVIEW MODAL */}
        <InvoicePreviewModal
            isOpen={isInvoicePreviewOpen}
            onClose={() => setIsInvoicePreviewOpen(false)}
            customerType={customerType}
            customerName={mockFormData.customer.name}
            customerPhone={mockFormData.customer.phone}
            mapAddress={mapAddress}
            invoiceEmail={invoiceEmail}
            mode={invoicePreviewMode}
            onConfirmExport={handleConfirmExportInvoice}
            isExporting={isExportingInvoice}
        />

        <ProviderPaymentConfirmDialog
            isOpen={isProviderPaymentConfirmOpen}
            onClose={() => setIsProviderPaymentConfirmOpen(false)}
            onConfirm={() => setIsProviderPaymentConfirmOpen(false)}
            partnerName={partnerName}
        />

        <RatingHistoryModal
          isOpen={ratingHistoryModal.isOpen}
          onClose={() => setRatingHistoryModal({ isOpen: false, type: null })}
          title={ratingHistoryModal.type ? RATING_TYPE_LABELS[ratingHistoryModal.type] : ''}
          orderCode={displayOrderId}
          versions={ratingHistoryModal.type ? ratingHistories[ratingHistoryModal.type] : []}
        />

        <StatusUpdateModal
          isOpen={isStatusUpdateModalOpen}
          onClose={() => setIsStatusUpdateModalOpen(false)}
          currentStatus={currentStatus}
          onUpdate={(newStatus) => {
            setCurrentStatus(newStatus);
            setIsStatusUpdateModalOpen(false);
          }}
        />

        <ShareLocationWebviewModal
          isOpen={isShareLocationWebviewOpen}
          onClose={() => {
            setIsShareLocationWebviewOpen(false);
            setWebviewDemoMode('normal');
          }}
          data={{
            orderId:
              webviewDemoMode === 'missing-rescue'
                ? `${mockFormData.orderId ?? displayOrderId}-NOLOC`
                : mockFormData.orderId ?? displayOrderId,
            plate: mockFormData.customer.plate,
            orderTypeLabel: selectedPackage === 'Không có' ? 'Đơn lẻ' : 'Đơn gói',
            customerName: mockFormData.assistance.rescueName,
            customerPhone: mockFormData.assistance.rescuePhone,
            rescueAddress: webviewDemoMode === 'missing-rescue' ? '' : mapAddress,
            towingDestination,
            rescueLat: webviewDemoMode === 'missing-rescue' ? undefined : rescueCoords.lat,
            rescueLng: webviewDemoMode === 'missing-rescue' ? undefined : rescueCoords.lng,
            towingLat: towCoords.lat,
            towingLng: towCoords.lng,
            stationLat:
              webviewDemoMode === 'missing-rescue' ? undefined : stationCoords.lat,
            stationLng:
              webviewDemoMode === 'missing-rescue' ? undefined : stationCoords.lng,
            driverLat: webviewDemoMode === 'missing-rescue' ? undefined : driverCoords.lat,
            driverLng: webviewDemoMode === 'missing-rescue' ? undefined : driverCoords.lng,
            driverName:
              webviewDemoMode === 'missing-rescue'
                ? undefined
                : selectedDriver?.name ?? 'Nguyễn Văn Tài',
            driverPhone: webviewDemoMode === 'missing-rescue' ? undefined : driverPhone,
            driverVehicleType:
              webviewDemoMode === 'missing-rescue' ? undefined : rescueVehicleType,
            driverVehiclePlate:
              webviewDemoMode === 'missing-rescue' ? undefined : '29C-568.99',
            stationName: webviewDemoMode === 'missing-rescue' ? undefined : stationName,
            currentStatus:
              webviewDemoMode === 'missing-rescue' ? 'WAITING_CONFIRM' : currentStatus,
            services: selectedServices,
            createdAt: '15:26 - 03/07/2026',
            customerRatings: {
              customer_vetc: ratingHistories.customer_vetc,
              customer_driver: ratingHistories.customer_driver,
              customer_workshop: ratingHistories.customer_workshop,
            },
          }}
        />

        {/* Distance Warning Modal */}
        {isDistanceWarningOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsDistanceWarningOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Cảnh báo vượt phạm vi gói</h3>
                  <p className="text-white/80 text-[11px]">Khoảng cách ước tính vượt giới hạn</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Gói dịch vụ hiện tại</span>
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">{selectedPackage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Phạm vi gói</span>
                    <span className="text-xs font-bold text-gray-700">100 KM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Khoảng cách ước tính</span>
                    <span className="text-xs font-bold text-orange-600">{estimatedDistance} KM</span>
                  </div>
                  <div className="border-t border-orange-200 pt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold">Phần vượt gói</span>
                    <span className="text-sm font-black text-red-600">{(parseFloat(estimatedDistance) - 100).toFixed(1)} KM</span>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Khoảng cách ước tính <strong>{estimatedDistance} KM</strong> vượt quá phạm vi <strong>100 KM</strong> trong gói <strong>{selectedPackage}</strong>. 
                    Phần khoảng cách vượt <strong>{(parseFloat(estimatedDistance) - 100).toFixed(1)} KM</strong> sẽ <strong className="text-red-600">phát sinh chi phí ngoài gói</strong> và được tính theo đơn giá chuẩn.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsDistanceWarningOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Đã hiểu
                  </button>
                  <button
                    onClick={() => {
                      setEstimatedDistance('100');
                      setIsDistanceWarningOpen(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:shadow-lg transition-all active:scale-95"
                  >
                    Đặt lại 100 KM
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
  );
};

export default GuestOrderDetails;
