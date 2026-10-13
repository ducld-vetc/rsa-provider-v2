import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  Eye,
  FileJson,
  FileSpreadsheet,
  GripVertical,
  History,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AppSelect from '../shared/AppSelect';
import {
  CRITERIA_CATALOG,
  CRITERIA_SYSTEM_CONFIG,
  feeCriterionDefinitions,
  FEE_SERVICE_CATALOG,
  FEE_SURCHARGE_CATALOG,
  FEE_SURCHARGE_GROUP_ORDER,
  SURCHARGE_CRITERIA_CATALOG,
  FEE_OBJECT_TYPE_LABELS,
  FEE_ORDER_TYPE_LABELS,
  FEE_STATUS_LABELS,
  FEE_TARGET_LABELS,
  FEE_CORPORATE_CUSTOMER_OPTIONS,
  FEE_PARTNER_OPTIONS,
  emptyPriceTable,
  rescueFeeTables,
  upsertPriceTable,
  clonePriceTable,
  getFeeTableAtVersion,
  getFeeVersionHistory,
  resolveFeeServiceType,
  resolveFeeServiceParent,
  resolveMatrixServiceHead,
  normalizePriceTableServiceHeads,
  isMatrixCategoryService,
  defaultPriceSegmentType,
  canUseTieredSegment,
  SERVICE_PRICING_MODE_LABELS,
  PRICE_SEGMENT_TYPE_LABELS,
  isTimeSurchargeCriterion,
  usesRetailMarkupOnlyPricing,
  RETAIL_MARKUP_DEFAULT_FACTOR,
  DEFAULT_TIME_RANGE,
  type FeeCriterion,
  type FeeRuleCondition,
  type FeeObjectType,
  type FeeOrderType,
  
  type FeeTableStatus,
  type FeeTarget,
  type PriceTable,
  type PriceSegmentType,
  type ServicePriceRule,
  type ServiceType,
  type SurchargeRule,
  type SurchargeType,
  type RoundMode,
  type ServicePricingMode,
} from '../data/rescueFeeMockData';
import {
  allowedOperatorsForCriterion,
  validateAdditionalCriteriaConditions,
  validatePriceTableForSave,
} from '../data/validatePriceTable';
import {
  formatFeeTableImportIssue,
  validateFeeTableImportPayload,
  validateFeeTableImportWorkbookSheets,
  type FeeTableImportIssue,
} from '../data/validateFeeTableImport';

type TabId = 'general' | 'matrix' | 'scope' | 'services' | 'criteria' | 'surcharges' | 'history';
type FormMode = 'create' | 'edit' | 'view';

const HISTORY_PAGE_SIZE = 5;
const HISTORY_CHANGES_PREVIEW = 3;

const StatusBadge: React.FC<{ status: FeeTableStatus }> = ({ status }) => {
  const color =
    status === 'ACTIVE'
      ? 'text-vetc-green'
      : status === 'EXPIRED'
        ? 'text-gray-600'
        : 'text-red-600';
  return <span className={color}>{FEE_STATUS_LABELS[status]}</span>;
};

type TableImportDemoCaseId =
  | 'ok'
  | 'json_invalid'
  | 'json_not_object'
  | 'missing_sheet'
  | 'empty_payload'
  | 'bad_object_type'
  | 'bad_service_code'
  | 'from_gte_to'
  | 'bad_surcharge_code'
  | 'between_missing'
  | 'multi_errors';

const TABLE_IMPORT_DEMO_CASES: Array<{
  id: TableImportDemoCaseId;
  label: string;
}> = [
  { id: 'ok', label: '✓ Hợp lệ — áp dụng được' },
  { id: 'json_invalid', label: 'File · JSON parse fail' },
  { id: 'json_not_object', label: 'File · JSON không phải object' },
  { id: 'missing_sheet', label: 'File · Thiếu sheet Excel (mô phỏng)' },
  { id: 'empty_payload', label: 'File · Không có dòng DichVu/PhuPhi' },
  { id: 'bad_object_type', label: 'ThongTin · objectType sai' },
  { id: 'bad_service_code', label: 'DichVu · serviceCode không thuộc catalog' },
  { id: 'from_gte_to', label: 'DichVu · from ≥ to' },
  { id: 'bad_surcharge_code', label: 'PhuPhi · surchargeCode không suy tiêu chí' },
  { id: 'between_missing', label: 'PhuPhi · BETWEEN thiếu from/to' },
  { id: 'multi_errors', label: 'Nhiều lỗi cùng lúc' },
];

const buildTableImportDemoBase = (): Record<string, unknown> => ({
  code: 'SUP-EXT-PARTNER',
  name: 'Bảng phí đối tác mẫu',
  target: 'PARTNER',
  objectType: 'PARTNER_EXTERNAL',
  orderType: 'PACKAGE',
  settings: {
    retailMarkupFactor: 0,
    roundMode: 'NEAREST_1000',
    stackSurcharges: true,
    includesVat: false,
  },
  services: [
    {
      serviceCode: 'ONSITE_BATTERY',
      pricingMode: 'FIXED',
      basePrice: 350000,
      from: '',
      fromOperator: '<',
      to: '',
      toOperator: '≤',
    },
    {
      serviceCode: 'TOWING_GARAGE',
      pricingMode: 'FIXED',
      basePrice: 100000,
      from: 0,
      fromOperator: '<',
      to: 10,
      toOperator: '≤',
    },
  ],
  surcharges: [
    {
      surchargeCode: 'TIME_REQUEST',
      type: 'COEFFICIENT',
      value: 1.15,
      operator: 'BETWEEN',
      criterionFrom: '22:00',
      fromOperator: '<',
      criterionTo: '06:00',
      toOperator: '≤',
    },
  ],
});

const FORM_TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: '1. Thông tin & tham số' },
  { id: 'matrix', label: '2. Đơn giá' },
  { id: 'surcharges', label: '3. Phụ phí' },
];

const HISTORY_TAB: { id: TabId; label: string } = {
  id: 'history',
  label: '4. Lịch sử bảng phí',
};

const SectionHeader: React.FC<{
  title: string;
  number?: number;
  actions?: React.ReactNode;
}> = ({ title, number, actions }) => (
  <div className="bg-vetc-green text-white px-4 py-2 rounded-t-lg font-bold text-sm flex items-center justify-between">
    <div className="flex items-center space-x-2">
      {number != null && (
        <span className="bg-white/20 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">
          {number}
        </span>
      )}
      <span>{title}</span>
    </div>
    {actions}
  </div>
);

const inputClass =
  'w-full border rounded px-3 py-1.5 text-sm outline-none focus:border-vetc-green placeholder:text-gray-400';
const labelClass = 'block text-xs font-semibold text-gray-600 mb-1';

/** Mặc định UI ma trận: từ không gồm (<), đến gồm (≤). Dữ liệu cũ thiếu field → engine vẫn coi cả hai biên inclusive. */
const DEFAULT_BETWEEN_BOUNDS = {
  fromInclusive: false,
  toInclusive: true,
} as const;

const boundToggleClass = (inclusive: boolean) =>
  `h-[30px] min-w-[30px] rounded border text-xs font-bold transition-colors ${
    inclusive
      ? 'bg-vetc-green text-white border-vetc-green'
      : 'bg-gray-50 text-gray-600 border-gray-300'
  }`;

const RangeBoundInputs: React.FC<{
  from: string | number;
  to: string | number;
  fromInclusive?: boolean;
  toInclusive?: boolean;
  unit?: string;
  className?: string;
  onChange: (patch: {
    value?: [string, string];
    fromInclusive?: boolean;
    toInclusive?: boolean;
  }) => void;
}> = ({ from, to, fromInclusive, toInclusive, unit, className, onChange }) => {
  const fromInc = fromInclusive !== false;
  const toInc = toInclusive !== false;
  const fromText = from === undefined || from === null ? '' : String(from);
  const toText = to === undefined || to === null ? '' : String(to);
  const boundPatch =
    fromInclusive !== undefined || toInclusive !== undefined
      ? {
          fromInclusive: fromInclusive ?? DEFAULT_BETWEEN_BOUNDS.fromInclusive,
          toInclusive: toInclusive ?? DEFAULT_BETWEEN_BOUNDS.toInclusive,
        }
      : {};

  return (
    <div
      className={
        className ?? 'grid grid-cols-[1fr_30px_auto_30px_1fr] items-center gap-1.5'
      }
    >
      <div className="relative min-w-0">
        <input
          type="number"
          className={`${inputClass} ${unit ? 'pr-8' : ''} text-right`}
          placeholder="Từ"
          value={fromText}
          onChange={(e) =>
            onChange({
              value: [e.target.value, toText],
              ...boundPatch,
            })
          }
        />
        {unit ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {unit}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className={boundToggleClass(fromInc)}
        title={fromInc ? 'Bao gồm biên dưới (≥)' : 'Không bao gồm biên dưới (>)'}
        onClick={() =>
          onChange({
            fromInclusive: !fromInc,
            toInclusive: toInclusive !== false,
          })
        }
      >
        {fromInc ? '≤' : '<'}
      </button>
      <span className="text-xs font-bold text-gray-400">~</span>
      <button
        type="button"
        className={boundToggleClass(toInc)}
        title={toInc ? 'Bao gồm biên trên (≤)' : 'Không bao gồm biên trên (<)'}
        onClick={() =>
          onChange({
            fromInclusive: fromInclusive !== false,
            toInclusive: !toInc,
          })
        }
      >
        {toInc ? '≤' : '<'}
      </button>
      <div className="relative min-w-0">
        <input
          type="number"
          className={`${inputClass} ${unit ? 'pr-8' : ''} text-right`}
          placeholder="Đến"
          value={toText}
          onChange={(e) =>
            onChange({
              value: [fromText, e.target.value],
              ...boundPatch,
            })
          }
        />
        {unit ? (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
};

const SERVICE_CONFIG: Record<ServiceType, { label: string; unit: string }> = {
  ONSITE: { label: 'Kích bình ắc quy', unit: 'lượt' },
  TOWING: { label: 'Kéo xe', unit: 'km' },
  CRANE: { label: 'Cẩu xe', unit: 'lượt' },
};
const SERVICE_OPTIONS = FEE_SERVICE_CATALOG;
const SURCHARGE_HEAD_OPTIONS = FEE_SURCHARGE_CATALOG;
const SERVICE_CODE_TO_DETAIL: Record<string, string> = {
  ONSITE_BATTERY: 'Kích bình ắc quy',
  ONSITE_SPARE_TIRE: 'Thay lốp dự phòng',
  TOWING_GARAGE: 'Kéo xe về gara',
  TOWING_LONG_DISTANCE: 'Kéo xe đường dài',
  CRANE_ROAD: 'Cẩu xe mặt đường',
  CRANE_BELOW_ROAD: 'Cẩu xe dưới mặt đường',
};
const SURCHARGE_CODE_TO_NAME: Record<string, string> = {
  TIME_REQUEST: 'Thời gian yêu cầu cứu hộ',
  TIME_EXECUTION: 'Thời gian thực hiện cứu hộ',
  HIGHWAY_ROUTE: 'Tuyến cao tốc',
  WEATHER_STORM: 'Thời tiết',
  HOLIDAY: 'Lễ/Tết',
};
const findServiceCode = (serviceDetail: string): string =>
  Object.entries(SERVICE_CODE_TO_DETAIL).find(([, detail]) => detail === serviceDetail)?.[0] ?? '';
const findSurchargeCode = (name: string): string =>
  Object.entries(SURCHARGE_CODE_TO_NAME).find(([, label]) => label === name)?.[0] ?? '';
const IMPORT_BASE_ROW_KEYS = new Set([
  'service',
  'dichvu',
  'servicedetail',
  'servicecode',
  'serviceType',
  'loaidichvu',
  'pricingmode',
  'cachtinh',
  'baseprice',
  'mucgia',
  'price',
  'from',
  'fromoperator',
  'frominclusive',
  'to',
  'tooperator',
  'toinclusive',
  'tu',
  'den',
  'payloadfrom',
  'payloadto',
  'loadfrom',
  'loadto',
  'trongtaitu',
  'trongtaiden',
  'seats',
  'seatcount',
  'socho',
  'vehicletype',
  'loaiptgapsuco',
  'rescuevehicletype',
  'loaiptcuuho',
  'conditions',
  'primarycriterion',
  'primary',
]);
const normalizeImportKey = (key: string): string =>
  key
    .trim()
    .replace(/\s+/g, '')
    .replace(/[-:]/g, '.')
    .replace(/_/g, '.')
    .toLowerCase();
const normalizeCriterionAlias = (key: string): string => {
  const cleaned = key.replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, '');
  if (cleaned === 'load.capacity') return 'load_capacity';
  if (cleaned === 'seat.number') return 'seat_number';
  return cleaned;
};
const toCodeToken = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
const buildSurchargeCriterionValueCode = (criterionKey: string, value: string): string =>
  `${toCodeToken(criterionKey)}__${toCodeToken(value)}`;
const resolveSurchargeCriterionValue = (
  criterionKey: string,
  rawValue: string,
  criterionValues?: readonly string[]
): string => {
  const value = rawValue.trim();
  if (!value) return '';
  if (!criterionValues?.length) return value;
  const direct = criterionValues.find((item) => item === value);
  if (direct) return direct;
  const byCode = criterionValues.find(
    (item) => buildSurchargeCriterionValueCode(criterionKey, item) === value
  );
  return byCode ?? value;
};
const parseBoundInclusive = (raw: unknown, fallbackInclusive: boolean): boolean => {
  const text = String(raw ?? '').trim().toLowerCase();
  if (!text) return fallbackInclusive;
  if (text === '<' || text === '>' || text === 'false' || text === '0' || text === 'open') {
    return false;
  }
  if (
    text === '≤' ||
    text === '≥' ||
    text === '<=' ||
    text === '>=' ||
    text === 'true' ||
    text === '1' ||
    text === 'close'
  ) {
    return true;
  }
  return fallbackInclusive;
};
const OBJECT_TYPE_OPTIONS_BY_TARGET: Record<
  FeeTarget,
  Array<{ value: FeeObjectType; label: string }>
> = {
  PARTNER: [
    { value: 'PARTNER_INTERNAL', label: 'Nội bộ (partner_type = INTERNAL)' },
    {
      value: 'PARTNER_EXTERNAL',
      label: "Bên ngoài (partner_type in ['THIRD_PARTY','QUICK_SERVICE'])",
    },
  ],
  CUSTOMER: [
    {
      value: 'CUSTOMER_INDIVIDUAL',
      label: 'Cá nhân (ro.corporate_customer_id is null)',
    },
    {
      value: 'CUSTOMER_BUSINESS',
      label: 'Doanh nghiệp (ro.corporate_customer_id is not null)',
    },
  ],
};
const ORDER_TYPE_OPTIONS: Array<{ value: FeeOrderType; label: string }> = [
  { value: 'PACKAGE', label: 'Đơn gói' },
  { value: 'SINGLE', label: 'Đơn lẻ' },
];
const defaultObjectTypeByTarget = (target: FeeTarget): FeeObjectType =>
  target === 'PARTNER' ? 'PARTNER_INTERNAL' : 'CUSTOMER_INDIVIDUAL';
const defaultSurchargeOperatorByCriterion = (criterionKey: string): FeeRuleCondition['operator'] =>
  isTimeSurchargeCriterion(criterionKey) ? 'BETWEEN' : '=';

const PRIMARY_CRITERION_BY_SERVICE: Partial<Record<ServiceType, string>> = {
  TOWING: 'Khoảng cách kéo xe',
  CRANE: 'Khoảng cách so với mặt đất',
};
const PRIMARY_CRITERION_CONFIG: Record<
  string,
  { key: string; valueType: 'LIST' | 'RANGE'; values: string[]; label: string }
> = {
  'Khoảng cách kéo xe': {
    key: 'distanceKm',
    valueType: 'RANGE',
    values: [],
    label: 'Khoảng cách kéo xe',
  },
  'Khoảng cách so với mặt đất': {
    key: 'roadDistance',
    valueType: 'RANGE',
    values: [],
    label: 'Khoảng cách so với mặt đất',
  },
  'Khoảng cách so với mặt đường': {
    key: 'roadDistance',
    valueType: 'RANGE',
    values: [],
    label: 'Khoảng cách so với mặt đất',
  },
  'Độ sâu / tư thế xe cẩu': {
    key: 'craneDepthBand',
    valueType: 'LIST',
    values: [
      'ROAD_OR_DEPTH_LT_5',
      'DEPTH_5_10',
      'DEPTH_10_30',
      'DEPTH_30_50',
      'DEPTH_50_100',
      'DEPTH_100_150',
      'DEPTH_GT_150_SIDE',
      'DEPTH_GT_150_UPRIGHT',
    ],
    label: 'Độ sâu / tư thế xe cẩu',
  },
};

type MatrixPrimaryConfig = {
  key: string;
  valueType: 'LIST' | 'RANGE';
  values: string[];
  label: string;
  /** PTI kéo: không dùng distanceKm BETWEEN — hiện km bao gồm / giá vượt */
  mode: 'RANGE' | 'LIST' | 'TOW_INCLUDED';
};

/** Primary cột ma trận: khoảng km / độ sâu; TOW_INCLUDED chỉ khi bảng cũ còn includedKm. */
const resolveMatrixPrimary = (rule: ServicePriceRule): MatrixPrimaryConfig | null => {
  if (rule.serviceType === 'TOWING') {
    const hasDistance = (rule.conditions ?? []).some((c) => c.criterionKey === 'distanceKm');
    if (hasDistance) {
      return { ...PRIMARY_CRITERION_CONFIG['Khoảng cách kéo xe'], mode: 'RANGE' };
    }
    if (rule.includedKm != null || rule.pricePerExtraKm != null) {
      return {
        key: 'distanceKm',
        valueType: 'RANGE',
        values: [],
        label: 'Km bao gồm / vượt',
        mode: 'TOW_INCLUDED',
      };
    }
    return { ...PRIMARY_CRITERION_CONFIG['Khoảng cách kéo xe'], mode: 'RANGE' };
  }
  if (rule.serviceType === 'CRANE') {
    const hasDepthBand = (rule.conditions ?? []).some((c) => c.criterionKey === 'craneDepthBand');
    if (hasDepthBand) {
      return { ...PRIMARY_CRITERION_CONFIG['Độ sâu / tư thế xe cẩu'], mode: 'LIST' };
    }
    return { ...PRIMARY_CRITERION_CONFIG['Khoảng cách so với mặt đất'], mode: 'RANGE' };
  }
  return null;
};
const getCriterionConfig = (label: string) =>
  feeCriterionDefinitions.find((definition) => definition.label === label) ??
  PRIMARY_CRITERION_CONFIG[label];

const formatConditionSummary = (condition: FeeRuleCondition): string => {
  const values = Array.isArray(condition.value)
    ? condition.value.map(String).map((value) => value.trim()).filter(Boolean)
    : [String(condition.value ?? '').trim()].filter(Boolean);
  if (condition.operator === 'BETWEEN' && values.length >= 2) {
    const fromOp = condition.fromInclusive === false ? '<' : '≤';
    const toOp = condition.toInclusive === false ? '<' : '≤';
    return `${condition.criterionLabel}: ${values[0]} ${fromOp} ~ ${toOp} ${values[1]}`;
  }
  const separator = condition.operator === 'BETWEEN' ? ' – ' : ', ';
  const formattedValue = values.join(separator);
  return formattedValue
    ? `${condition.criterionLabel}: ${formattedValue}`
    : condition.criterionLabel;
};

const ruleMatchesMatrixFilter = (
  rule: ServicePriceRule,
  filters: {
    keyword: string;
    serviceType: '' | ServiceType;
    serviceDetail: string;
    pricingMode: '' | ServicePricingMode;
    vehicleType: string;
    rescueVehicleType: string;
    seatNumber: string;
    loadCapacity: string;
  }
): boolean => {
  if (filters.serviceType && rule.serviceType !== filters.serviceType) return false;
  if (filters.serviceDetail && rule.serviceDetail !== filters.serviceDetail) return false;
  if (filters.pricingMode && (rule.pricingMode ?? 'FIXED') !== filters.pricingMode) {
    return false;
  }
  if (!ruleMatchesListCriterion(rule, ['vehicleType'], filters.vehicleType)) return false;
  if (!ruleMatchesListCriterion(rule, ['rescueVehicleType'], filters.rescueVehicleType)) {
    return false;
  }
  if (
    !ruleMatchesNumericCriterion(
      rule,
      ['seat_number', 'seats'],
      parseOptionalNumber(filters.seatNumber)
    )
  ) {
    return false;
  }
  if (
    !ruleMatchesNumericCriterion(
      rule,
      ['load_capacity', 'payload'],
      parseOptionalNumber(filters.loadCapacity)
    )
  ) {
    return false;
  }
  const keyword = filters.keyword.trim().toLowerCase();
  if (!keyword) return true;
  const haystack = [
    rule.serviceDetail,
    rule.serviceType,
    rule.pricingMode ?? 'FIXED',
    rule.unit ?? '',
    String(rule.basePrice ?? ''),
    ...(rule.conditions ?? []).map((condition) => formatConditionSummary(condition)),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword);
};

type MatrixFilterCondition = {
  criterionKey: string;
  operator: string;
  value: unknown;
};

const parseOptionalNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

const collectListCriterionOptions = (
  rules: { conditions?: MatrixFilterCondition[] }[],
  criterionKeys: string[],
  fallback: string[] = []
) => {
  const seen = new Set<string>(fallback);
  for (const rule of rules) {
    for (const condition of rule.conditions ?? []) {
      if (!criterionKeys.includes(condition.criterionKey)) continue;
      const values = Array.isArray(condition.value) ? condition.value : [condition.value];
      for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) seen.add(text);
      }
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b, 'vi'));
};

const ruleMatchesListCriterion = (
  rule: { conditions?: MatrixFilterCondition[] },
  criterionKeys: string[],
  selected: string
) => {
  if (!selected) return true;
  return (rule.conditions ?? []).some((condition) => {
    if (!criterionKeys.includes(condition.criterionKey)) return false;
    const values = Array.isArray(condition.value)
      ? condition.value.map(String)
      : [String(condition.value ?? '')];
    return values.includes(selected);
  });
};

const ruleMatchesNumericCriterion = (
  rule: { conditions?: MatrixFilterCondition[] },
  criterionKeys: string[],
  input: number | null
) => {
  if (input == null) return true;
  return (rule.conditions ?? []).some((condition) => {
    if (!criterionKeys.includes(condition.criterionKey)) return false;
    if (
      condition.operator === 'BETWEEN' &&
      Array.isArray(condition.value) &&
      condition.value.length >= 2
    ) {
      const from = Number(condition.value[0]);
      const to = Number(condition.value[1]);
      if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
      return input >= from && input <= to;
    }
    const values = Array.isArray(condition.value) ? condition.value : [condition.value];
    return values.some((value) => Number(value) === input);
  });
};

const parseMoneyInput = (value: string): number =>
  parseInt(value.replace(/\D/g, ''), 10) || 0;

const defaultValueForOperator = (
  operator: FeeRuleCondition['operator'],
  allowedValues?: string[]
): FeeRuleCondition['value'] => {
  if (operator === 'BETWEEN') return ['', ''];
  if (operator === 'IN') return [];
  return allowedValues?.[0] ?? '';
};

const betweenConditionDefaults = (): Pick<
  FeeRuleCondition,
  'operator' | 'value' | 'fromInclusive' | 'toInclusive'
> => ({
  operator: 'BETWEEN',
  value: ['', ''],
  ...DEFAULT_BETWEEN_BOUNDS,
});

const buildCriterion = (
  label: string,
  id = `cr-${Date.now()}`
): FeeCriterion => {
  const config = getCriterionConfig(label);
  if (!config) throw new Error(`Không tìm thấy cấu hình tiêu chí: ${label}`);
  return {
    id,
    key: config.key,
    label,
    operator: config.valueType === 'RANGE' ? 'BETWEEN' : 'IN',
    value: config.valueType === 'RANGE' ? ['', ''] : config.values,
    group: 'AND',
    role: 'PRICE',
    allowedValues: config.values,
    valueType: config.valueType,
  };
};

const buildPrimaryCondition = (serviceType: ServiceType): FeeRuleCondition | null => {
  const label = PRIMARY_CRITERION_BY_SERVICE[serviceType];
  if (!label) return null;
  const config = PRIMARY_CRITERION_CONFIG[label];
  if (config.valueType === 'RANGE') {
    return {
      criterionKey: config.key,
      criterionLabel: label,
      ...betweenConditionDefaults(),
    };
  }
  return {
    criterionKey: config.key,
    criterionLabel: label,
    operator: '=',
    value: config.values[0] ?? '',
  };
};

const ONSITE_SAMPLE_PRICES: Record<string, number> = {
  'Kích bình ắc quy': 350000,
  'Thay lốp dự phòng': 400000,
  'Cung cấp nhiên liệu (xăng, dầu, nước làm mát)': 300000,
  'Thủy kích': 1200000,
};

const createDemoServiceRules = (
  serviceDetail: string,
  serviceType: ServiceType
): ServicePriceRule[] => {
  const idPrefix = `sr-demo-${Date.now()}`;
  const vehicleCondition = (value: string): FeeRuleCondition => ({
    criterionKey: 'vehicleType',
    criterionLabel: 'Loại phương tiện gặp sự cố',
    operator: '=',
    value,
  });

  if (serviceType === 'TOWING') {
    return [
      { from: 0, to: 10, mode: 'FIXED' as const, price: 100000 },
      { from: 10, to: 20, mode: 'PER_UNIT' as const, price: 10000 },
      { from: 20, to: 50, mode: 'PER_UNIT' as const, price: 20000 },
    ].map((tier, index) => ({
      id: `${idPrefix}-${index}`,
      serviceType,
      serviceDetail,
      basePrice: tier.price,
      pricingMode: tier.mode,
      segmentType: 'TIERED' as const,
      unit: 'km',
      conditions: [
        {
          criterionKey: 'distanceKm',
          criterionLabel: 'Khoảng cách kéo xe',
          operator: 'BETWEEN',
          value: [tier.from, tier.to],
        },
        vehicleCondition(index === 0 ? 'Xe chở người' : 'Xe chở hàng'),
      ],
    }));
  }

  if (serviceType === 'CRANE') {
    return [
      { from: 0, to: 1, price: 900000, vehicle: 'Xe chở người' },
      { from: 1, to: 3, price: 1500000, vehicle: 'Xe chở hàng' },
      { from: 3, to: 5, price: 2000000, vehicle: 'Xe chở hàng' },
    ].map((tier, index) => ({
      id: `${idPrefix}-${index}`,
      serviceType,
      serviceDetail,
      basePrice: tier.price,
      pricingMode: 'FIXED' as const,
      segmentType: 'TIERED' as const,
      unit: 'lượt',
      conditions: [
        {
          criterionKey: 'roadDistance',
          criterionLabel: 'Khoảng cách so với mặt đường',
          operator: 'BETWEEN',
          value: [tier.from, tier.to],
        },
        vehicleCondition(tier.vehicle),
      ],
    }));
  }

  const basePrice = ONSITE_SAMPLE_PRICES[serviceDetail] ?? 450000;
  return [
    { vehicle: 'Xe chở người', price: basePrice },
    { vehicle: 'Xe chở hàng', price: Math.round(basePrice * 1.2) },
  ].map((sample, index) => ({
    id: `${idPrefix}-${index}`,
    serviceType,
    serviceDetail,
    basePrice: sample.price,
    pricingMode: 'FIXED' as const,
    segmentType: 'SINGLE' as const,
    unit: 'lượt',
    conditions: [vehicleCondition(sample.vehicle)],
  }));
};

const ensureRequiredCriteria = (table: PriceTable): PriceTable => {
  const byKey = new Map(
    feeCriterionDefinitions
      .filter((definition) => definition.status === 'ACTIVE')
      .map((definition) => [definition.key, definition])
  );
  /** Giữ nguyên priceCriteria của bảng (không strip key lạ); bổ sung valueType/allowedValues từ catalog khi thiếu. */
  return {
    ...table,
    priceCriteria: (table.priceCriteria ?? []).map((criterion) => {
      const def = byKey.get(criterion.key);
      if (!def) return criterion;
      return {
        ...criterion,
        label: criterion.label || def.label,
        valueType: criterion.valueType ?? def.valueType,
        allowedValues:
          criterion.allowedValues ??
          (def.values.length > 0 ? def.values : criterion.allowedValues),
      };
    }),
  };
};

const RescueFeeForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const mode: FormMode = location.pathname.includes('/create')
    ? 'create'
    : location.pathname.includes('/edit/')
      ? 'edit'
      : 'view';
  const readOnly = mode === 'view';
  const isEdit = mode === 'edit';
  const clonedTable = (location.state as { clonedTable?: PriceTable } | null)?.clonedTable;

  const liveTable = useMemo(
    () => (id ? rescueFeeTables.find((t) => t.id === id) : undefined),
    [id]
  );
  const versionParam = Number(searchParams.get('version'));
  const viewingVersion =
    liveTable && Number.isFinite(versionParam) && versionParam > 0
      ? versionParam
      : liveTable?.version;
  const isHistoricalView = Boolean(
    readOnly &&
      liveTable &&
      viewingVersion != null &&
      viewingVersion !== liveTable.version
  );

  const initial = useMemo(() => {
    if (clonedTable) {
      return normalizePriceTableServiceHeads(ensureRequiredCriteria(clonedTable));
    }
    if (id) {
      const source =
        readOnly && viewingVersion != null
          ? getFeeTableAtVersion(id, viewingVersion) ??
            rescueFeeTables.find((t) => t.id === id)
          : rescueFeeTables.find((t) => t.id === id);
      return normalizePriceTableServiceHeads(
        ensureRequiredCriteria(source ?? emptyPriceTable())
      );
    }
    return normalizePriceTableServiceHeads(
      ensureRequiredCriteria(
        emptyPriceTable({
          code: 'FEE-NEW',
          name: 'Bảng phí mới',
          applyFor: '',
          status: 'ACTIVE',
          objectType: 'PARTNER_INTERNAL',
          orderType: 'PACKAGE',
        })
      )
    );
  }, [id, clonedTable, readOnly, viewingVersion]);

  const [form, setForm] = useState<PriceTable>(initial);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [error, setError] = useState('');
  const [expandedRuleIds, setExpandedRuleIds] = useState<string[]>([]);
  const [criteriaRuleId, setCriteriaRuleId] = useState<string | null>(null);
  const [criteriaModalError, setCriteriaModalError] = useState('');
  const [importServiceDetail, setImportServiceDetail] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [tableImportOpen, setTableImportOpen] = useState(false);
  const [tableImportMode, setTableImportMode] = useState<'json' | 'excel'>('json');
  const [tableImportJsonText, setTableImportJsonText] = useState('');
  const [tableImportIssues, setTableImportIssues] = useState<FeeTableImportIssue[]>([]);
  const [tableImportFileName, setTableImportFileName] = useState('');
  const [tableImportDemoCase, setTableImportDemoCase] = useState<TableImportDemoCaseId | ''>('');
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [draggedPriceRuleId, setDraggedPriceRuleId] = useState<string | null>(null);
  const [dragOverPriceRuleId, setDragOverPriceRuleId] = useState<string | null>(null);
  const [matrixKeyword, setMatrixKeyword] = useState('');
  const [matrixServiceType, setMatrixServiceType] = useState<'' | ServiceType>('');
  const [matrixServiceDetail, setMatrixServiceDetail] = useState('');
  const [matrixPricingMode, setMatrixPricingMode] = useState<'' | ServicePricingMode>('');
  const [matrixVehicleType, setMatrixVehicleType] = useState('');
  const [matrixRescueVehicleType, setMatrixRescueVehicleType] = useState('');
  const [matrixSeatNumber, setMatrixSeatNumber] = useState('');
  const [matrixLoadCapacity, setMatrixLoadCapacity] = useState('');
  const [historyVisibleCount, setHistoryVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [expandedHistoryChanges, setExpandedHistoryChanges] = useState<Record<string, boolean>>(
    {}
  );

  const history = useMemo(
    () => (readOnly && id ? getFeeVersionHistory(id) : []),
    [readOnly, id]
  );
  const visibleHistory = useMemo(
    () => history.slice(0, historyVisibleCount),
    [history, historyVisibleCount]
  );
  const hasMoreHistory = historyVisibleCount < history.length;

  useEffect(() => {
    if (!readOnly) return;
    setForm(initial);
    setHistoryVisibleCount(HISTORY_PAGE_SIZE);
  }, [readOnly, initial]);

  useEffect(() => {
    if (!readOnly) return;
    setHistoryVisibleCount(HISTORY_PAGE_SIZE);
    setExpandedHistoryChanges({});
    setActiveTab('general');
  }, [id, readOnly]);

  const update = <K extends keyof PriceTable>(key: K, value: PriceTable[K]) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (readOnly) return;
    const payload: PriceTable = normalizePriceTableServiceHeads({
      ...form,
      updatedAt: new Date().toLocaleString('vi-VN'),
      updatedBy: 'admin',
    });
    const issue = validatePriceTableForSave(payload, rescueFeeTables);
    if (issue) {
      setError(issue.message);
      setActiveTab(issue.tab as TabId);
      return;
    }
    setError('');
    upsertPriceTable(payload);
    navigate('/rescue-fee-config');
  };

  const openVersion = (version: number) => {
    if (!liveTable) return;
    if (version === liveTable.version) {
      setSearchParams({});
    } else {
      setSearchParams({ version: String(version) });
    }
    setActiveTab('general');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToCurrentVersion = () => {
    setSearchParams({});
    setActiveTab('general');
  };

  const addServiceRule = () => {
    const rule: ServicePriceRule = {
      id: `sr-${Date.now()}`,
      serviceType: 'ONSITE',
      serviceDetail: SERVICE_CONFIG.ONSITE.label,
      basePrice: 0,
      pricingMode: 'FIXED',
      unit: SERVICE_CONFIG.ONSITE.unit,
      conditions: [],
    };
    update('serviceRules', [...form.serviceRules, rule]);
  };

  const addServiceHead = (serviceDetail: string) => {
    const parentEntry = FEE_SERVICE_CATALOG.find((item) =>
      item.children?.includes(serviceDetail)
    );
    const matrixHead =
      parentEntry && isMatrixCategoryService(parentEntry.type)
        ? parentEntry.value
        : serviceDetail;
    const serviceType = resolveFeeServiceType(serviceDetail);
    if (!serviceType) return;

    setForm((prev) => {
      const applied = new Set(prev.scope.appliedServices ?? []);
      if (parentEntry && isMatrixCategoryService(parentEntry.type)) {
        parentEntry.children?.forEach((child) => applied.delete(child));
        applied.add(parentEntry.value);
      } else {
        applied.add(serviceDetail);
        if (parentEntry) applied.delete(parentEntry.value);
      }
      const hasMatrixRules = prev.serviceRules.some(
        (rule) => resolveMatrixServiceHead(rule.serviceDetail) === matrixHead
      );
      return {
        ...prev,
        scope: { ...prev.scope, appliedServices: Array.from(applied) },
        serviceRules: hasMatrixRules
          ? prev.serviceRules
          : [
              ...prev.serviceRules,
              ...createDemoServiceRules(matrixHead, serviceType),
            ],
      };
    });
  };

  const removeServiceHead = (serviceDetail: string) => {
    const parentEntry = FEE_SERVICE_CATALOG.find((item) =>
      item.children?.includes(serviceDetail)
    );
    const matrixHead =
      parentEntry && isMatrixCategoryService(parentEntry.type)
        ? parentEntry.value
        : serviceDetail;
    const catalogSelf = FEE_SERVICE_CATALOG.find((item) => item.value === serviceDetail);

    setForm((prev) => {
      const applied = new Set(prev.scope.appliedServices ?? []);
      applied.delete(serviceDetail);

      if (parentEntry && isMatrixCategoryService(parentEntry.type)) {
        // Removing a child of Kéo/Cẩu does nothing to matrix if parent still selected
        const parentStillSelected = applied.has(parentEntry.value);
        if (parentStillSelected) {
          return {
            ...prev,
            scope: { ...prev.scope, appliedServices: Array.from(applied) },
          };
        }
      }

      if (parentEntry && !isMatrixCategoryService(parentEntry.type)) {
        // ONSITE child — drop only this child's matrix rules
        return {
          ...prev,
          scope: { ...prev.scope, appliedServices: Array.from(applied) },
          serviceRules: prev.serviceRules.filter(
            (rule) => resolveMatrixServiceHead(rule.serviceDetail) !== serviceDetail
          ),
        };
      }

      if (catalogSelf && isMatrixCategoryService(catalogSelf.type)) {
        catalogSelf.children?.forEach((child) => applied.delete(child));
      }

      return {
        ...prev,
        scope: { ...prev.scope, appliedServices: Array.from(applied) },
        serviceRules: prev.serviceRules.filter(
          (rule) => resolveMatrixServiceHead(rule.serviceDetail) !== matrixHead
        ),
      };
    });
  };

  const toggleServiceHead = (serviceDetail: string, checked: boolean) => {
    if (checked) addServiceHead(serviceDetail);
    else removeServiceHead(serviceDetail);
  };

  const toggleServiceParent = (parentValue: string, checked: boolean) => {
    const parent = SERVICE_OPTIONS.find((item) => item.value === parentValue);
    if (!parent?.children?.length) return;

    if (isMatrixCategoryService(parent.type)) {
      if (checked) {
        setForm((prev) => {
          const applied = new Set(prev.scope.appliedServices ?? []);
          parent.children!.forEach((child) => applied.delete(child));
          applied.add(parentValue);
          const hasMatrixRules = prev.serviceRules.some(
            (rule) => resolveMatrixServiceHead(rule.serviceDetail) === parentValue
          );
          return {
            ...prev,
            scope: { ...prev.scope, appliedServices: Array.from(applied) },
            serviceRules: hasMatrixRules
              ? prev.serviceRules
              : [
                  ...prev.serviceRules,
                  ...createDemoServiceRules(parentValue, parent.type).map((rule, index) => ({
                    ...rule,
                    id: `sr-demo-${Date.now()}-${index}`,
                  })),
                ],
          };
        });
        return;
      }
      setForm((prev) => {
        const removeSet = new Set<string>([parentValue, ...parent.children!]);
        const applied = (prev.scope.appliedServices ?? []).filter(
          (item) => !removeSet.has(item)
        );
        return {
          ...prev,
          scope: { ...prev.scope, appliedServices: applied },
          serviceRules: prev.serviceRules.filter(
            (rule) => resolveMatrixServiceHead(rule.serviceDetail) !== parentValue
          ),
        };
      });
      return;
    }

    // ONSITE group: chọn/bỏ từng dịch vụ con (mỗi con = một đầu ma trận)
    if (checked) {
      setForm((prev) => {
        const applied = new Set(prev.scope.appliedServices ?? []);
        applied.delete(parentValue);
        let nextRules = [...prev.serviceRules];
        const matrixHeads = new Set(
          nextRules.map((rule) => resolveMatrixServiceHead(rule.serviceDetail))
        );
        parent.children!.forEach((child, childIndex) => {
          applied.add(child);
          if (!matrixHeads.has(child)) {
            const generated = createDemoServiceRules(child, parent.type).map((rule, index) => ({
              ...rule,
              id: `sr-demo-${Date.now()}-${childIndex}-${index}`,
            }));
            nextRules = [...nextRules, ...generated];
            matrixHeads.add(child);
          }
        });
        return {
          ...prev,
          scope: { ...prev.scope, appliedServices: Array.from(applied) },
          serviceRules: nextRules,
        };
      });
      return;
    }
    setForm((prev) => {
      const removeSet = new Set<string>(parent.children!);
      return {
        ...prev,
        scope: {
          ...prev.scope,
          appliedServices: (prev.scope.appliedServices ?? []).filter(
            (item) => !removeSet.has(item)
          ),
        },
        serviceRules: prev.serviceRules.filter(
          (rule) => !removeSet.has(resolveMatrixServiceHead(rule.serviceDetail))
        ),
      };
    });
  };

  const selectAllServiceHeads = () => {
    setForm((prev) => {
      const applied = new Set(prev.scope.appliedServices ?? []);
      let nextRules = [...prev.serviceRules];
      const matrixHeads = new Set(
        nextRules.map((rule) => resolveMatrixServiceHead(rule.serviceDetail))
      );

      SERVICE_OPTIONS.forEach((option, optionIndex) => {
        if (option.children?.length) {
          if (isMatrixCategoryService(option.type)) {
            option.children.forEach((child) => applied.delete(child));
            applied.add(option.value);
            if (!matrixHeads.has(option.value)) {
              const generated = createDemoServiceRules(option.value, option.type).map(
                (rule, index) => ({
                  ...rule,
                  id: `sr-demo-${Date.now()}-${optionIndex}-${index}`,
                })
              );
              nextRules = [...nextRules, ...generated];
              matrixHeads.add(option.value);
            }
            return;
          }
          applied.delete(option.value);
          option.children.forEach((child, childIndex) => {
            applied.add(child);
            if (!matrixHeads.has(child)) {
              const generated = createDemoServiceRules(child, option.type).map(
                (rule, index) => ({
                  ...rule,
                  id: `sr-demo-${Date.now()}-${optionIndex}-${childIndex}-${index}`,
                })
              );
              nextRules = [...nextRules, ...generated];
              matrixHeads.add(child);
            }
          });
          return;
        }
        applied.add(option.value);
        if (!matrixHeads.has(option.value)) {
          const generated = createDemoServiceRules(option.value, option.type).map(
            (rule, index) => ({
              ...rule,
              id: `sr-demo-${Date.now()}-${optionIndex}-${index}`,
            })
          );
          nextRules = [...nextRules, ...generated];
          matrixHeads.add(option.value);
        }
      });

      return {
        ...prev,
        scope: { ...prev.scope, appliedServices: Array.from(applied) },
        serviceRules: nextRules,
      };
    });
  };

  const clearAllServiceHeads = () => {
    setForm((prev) => ({
      ...prev,
      scope: { ...prev.scope, appliedServices: [] },
      serviceRules: [],
    }));
  };

  const selectAllSurchargeHeads = () => {
    setForm((prev) => {
      const existing = new Set(prev.surchargeRules.map((rule) => rule.name));
      const additions: SurchargeRule[] = [];
      SURCHARGE_HEAD_OPTIONS.forEach((head, index) => {
        if (existing.has(head.name)) return;
        const isTime = isTimeSurchargeCriterion(head.criterionKey);
        const timeRange: [string, string] = [...DEFAULT_TIME_RANGE];
        additions.push({
          id: `su-${Date.now()}-${index}`,
          name: head.name,
          type: 'FIXED',
          value: 0,
          activeWhen: isTime
            ? `${head.criterionKey}=${timeRange[0]}-${timeRange[1]}`
            : `${head.criterionKey}=${head.value}`,
          conditions: [
            {
              criterionKey: head.criterionKey,
              criterionLabel: head.criterionLabel,
              operator: isTime ? 'BETWEEN' : '=',
              value: isTime ? timeRange : head.value,
            },
          ],
          stackable: true,
        });
      });
      if (!additions.length) return prev;
      return { ...prev, surchargeRules: [...prev.surchargeRules, ...additions] };
    });
  };

  const clearAllSurchargeHeads = () => {
    update('surchargeRules', []);
  };

  const addPriceLineForService = (serviceDetail: string) => {
    const matrixHead = resolveMatrixServiceHead(serviceDetail);
    const serviceType =
      form.serviceRules.find(
        (rule) => resolveMatrixServiceHead(rule.serviceDetail) === matrixHead
      )?.serviceType ??
      resolveFeeServiceType(matrixHead) ??
      'ONSITE';
    const primary = buildPrimaryCondition(serviceType);
    const siblingUsesTiered =
      canUseTieredSegment(serviceType) &&
      form.serviceRules.some(
        (rule) =>
          resolveMatrixServiceHead(rule.serviceDetail) === matrixHead &&
          (rule.segmentType ?? defaultPriceSegmentType(rule.serviceType)) === 'TIERED'
      );
    const segmentType = siblingUsesTiered
      ? 'TIERED'
      : defaultPriceSegmentType(serviceType);
    const rule: ServicePriceRule = {
      id: `sr-${Date.now()}`,
      serviceType,
      serviceDetail: matrixHead,
      basePrice: 0,
      pricingMode: 'FIXED',
      segmentType,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      unit: SERVICE_CONFIG[serviceType].unit,
      conditions: primary ? [primary] : [],
    };
    update('serviceRules', [...form.serviceRules, rule]);
  };

  const updateServiceRule = (ruleId: string, patch: Partial<ServicePriceRule>) => {
    update(
      'serviceRules',
      form.serviceRules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r))
    );
  };

  const applySegmentType = (ruleId: string, segmentType: PriceSegmentType) => {
    const rule = form.serviceRules.find((item) => item.id === ruleId);
    if (!rule) return;
    if (segmentType === 'TIERED' && !canUseTieredSegment(rule.serviceType)) return;

    const matrixHead = resolveMatrixServiceHead(rule.serviceDetail);
    const isTowOrCrane = canUseTieredSegment(rule.serviceType);
    const groupIsTiered =
      isTowOrCrane &&
      form.serviceRules.some(
        (item) =>
          resolveMatrixServiceHead(item.serviceDetail) === matrixHead &&
          (item.segmentType ?? defaultPriceSegmentType(item.serviceType)) === 'TIERED'
      );

    // Kéo/Cẩu đang Bậc thang → không cho chọn Đơn lẻ trên từng dòng
    if (isTowOrCrane && groupIsTiered && segmentType === 'SINGLE') return;

    const patchRule = (item: ServicePriceRule): ServicePriceRule => {
      const patch: Partial<ServicePriceRule> = { segmentType };
      if (segmentType === 'TIERED') {
        const primary = buildPrimaryCondition(item.serviceType);
        if (primary) {
          const others = (item.conditions ?? []).filter(
            (condition) => condition.criterionKey !== primary.criterionKey
          );
          const existingPrimary = (item.conditions ?? []).find(
            (condition) => condition.criterionKey === primary.criterionKey
          );
          patch.conditions = existingPrimary ? item.conditions : [primary, ...others];
        }
      } else if (item.serviceType === 'ONSITE') {
        patch.pricingMode = 'FIXED';
      }
      return { ...item, ...patch };
    };

    // Chọn Bậc thang → đồng bộ toàn bộ dòng cùng dịch vụ Kéo/Cẩu
    if (isTowOrCrane && segmentType === 'TIERED') {
      update(
        'serviceRules',
        form.serviceRules.map((item) =>
          resolveMatrixServiceHead(item.serviceDetail) === matrixHead
            ? patchRule(item)
            : item
        )
      );
      return;
    }

    updateServiceRule(ruleId, patchRule(rule));
  };

  const removeServiceRule = (ruleId: string) => {
    update(
      'serviceRules',
      form.serviceRules.filter((r) => r.id !== ruleId)
    );
  };

  const duplicateServiceRule = (ruleId: string) => {
    const source = form.serviceRules.find((rule) => rule.id === ruleId);
    if (!source) return;
    const copy: ServicePriceRule = {
      ...source,
      id: `sr-${Date.now()}`,
      conditions: (source.conditions ?? []).map((condition) => ({ ...condition })),
    };
    const index = form.serviceRules.findIndex((rule) => rule.id === ruleId);
    const next = [...form.serviceRules];
    next.splice(Math.max(index, 0) + 1, 0, copy);
    update('serviceRules', next);
  };

  const reorderServiceRules = (
    serviceDetail: string,
    fromId: string,
    toId: string
  ) => {
    if (fromId === toId) return;
    setForm((prev) => {
      const fromIndex = prev.serviceRules.findIndex((rule) => rule.id === fromId);
      const toIndex = prev.serviceRules.findIndex((rule) => rule.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const fromRule = prev.serviceRules[fromIndex];
      const toRule = prev.serviceRules[toIndex];
      if (
        resolveMatrixServiceHead(fromRule.serviceDetail) !== serviceDetail ||
        resolveMatrixServiceHead(toRule.serviceDetail) !== serviceDetail
      ) {
        return prev;
      }
      const next = [...prev.serviceRules];
      const [moved] = next.splice(fromIndex, 1);
      const insertAt = next.findIndex((rule) => rule.id === toId);
      next.splice(insertAt < 0 ? next.length : insertAt, 0, moved);
      return { ...prev, serviceRules: next };
    });
  };

  const buildConditionsSample = (): Record<string, unknown> => ({
    payload: [1.5, 3.5],
    seats: [4, 7],
    vehicleType: 'Xe chở người',
    rescueVehicleType: '',
  });

  const buildImportSample = (serviceDetail: string, serviceType: ServiceType) => {
    const conditions = buildConditionsSample();
    if (serviceType === 'TOWING') {
      return [
        {
          service: serviceDetail,
          primaryCriterion: {
            key: 'distanceKm',
            label: 'Khoảng cách kéo xe',
            unit: 'km',
            from: 0,
            to: 10,
            operator: '0 < x ≤ 10',
          },
          pricingMode: 'FIXED',
          basePrice: 100000,
          conditions,
        },
        {
          service: serviceDetail,
          primaryCriterion: {
            key: 'distanceKm',
            label: 'Khoảng cách kéo xe',
            unit: 'km',
            from: 10,
            to: 20,
            operator: '10 < x ≤ 20',
          },
          pricingMode: 'PER_UNIT',
          basePrice: 10000,
          conditions: {
            payload: [],
            seats: null,
            vehicleType: '',
            rescueVehicleType: 'Xe sàn trượt',
          },
        },
        {
          service: serviceDetail,
          primaryCriterion: {
            key: 'distanceKm',
            label: 'Khoảng cách kéo xe',
            unit: 'km',
            from: 20,
            to: 50,
            operator: '20 < x ≤ 50',
          },
          pricingMode: 'PER_UNIT',
          basePrice: 20000,
          conditions: {
            payload: [],
            seats: null,
            vehicleType: '',
            rescueVehicleType: '',
          },
        },
      ];
    }
    if (serviceType === 'CRANE') {
      return [
        {
          service: serviceDetail,
          primaryCriterion: {
            key: 'roadDistance',
            label: 'Khoảng cách so với mặt đường',
            unit: 'm',
            from: 0,
            to: 1,
            operator: '0 < x ≤ 1',
          },
          pricingMode: 'FIXED',
          basePrice: 900000,
          conditions,
        },
        {
          service: serviceDetail,
          primaryCriterion: {
            key: 'roadDistance',
            label: 'Khoảng cách so với mặt đường',
            unit: 'm',
            from: 1,
            to: 3,
            operator: '1 < x ≤ 3',
          },
          pricingMode: 'FIXED',
          basePrice: 1500000,
          conditions: {
            payload: [3.5, 7],
            seats: null,
            vehicleType: 'Xe chở hàng',
            rescueVehicleType: 'Xe cẩu, kéo',
          },
        },
      ];
    }
    return [
      {
        service: serviceDetail,
        primaryCriterion: null,
        pricingMode: 'FIXED',
        basePrice: 450000,
        conditions,
      },
      {
        service: serviceDetail,
        primaryCriterion: null,
        pricingMode: 'FIXED',
        basePrice: 650000,
        conditions: {
          payload: [],
          seats: [7, 16],
          vehicleType: 'Xe chở hàng',
          rescueVehicleType: '',
        },
      },
    ];
  };

  const openImportJson = (serviceDetail: string) => {
    const matrixHead = resolveMatrixServiceHead(serviceDetail);
    const serviceType =
      form.serviceRules.find(
        (rule) => resolveMatrixServiceHead(rule.serviceDetail) === matrixHead
      )?.serviceType ??
      resolveFeeServiceType(matrixHead) ??
      'ONSITE';
    setImportServiceDetail(matrixHead);
    setImportJsonText(JSON.stringify(buildImportSample(matrixHead, serviceType), null, 2));
    setImportError('');
  };

  const parseImportedConditions = (
    raw: Record<string, unknown> | undefined
  ): FeeRuleCondition[] => {
    if (!raw || typeof raw !== 'object') return [];
    return Object.entries(raw).flatMap(([key, value]) => {
      if (value === null || value === undefined || value === '') return [];
      if (Array.isArray(value) && value.length === 0) return [];
      const criterion =
        (form.priceCriteria ?? []).find((item) => item.key === key) ??
        feeCriterionDefinitions.find((item) => item.key === key);
      const label = criterion?.label ?? key;
      if (Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number' || item === '' || !Number.isNaN(Number(item)))) {
        return [
          {
            criterionKey: key,
            criterionLabel: label,
            operator: 'BETWEEN' as const,
            value: [value[0] as string | number, value[1] as string | number],
          },
        ];
      }
      if (Array.isArray(value)) {
        return [
          {
            criterionKey: key,
            criterionLabel: label,
            operator: 'IN' as const,
            value: value.map(String),
          },
        ];
      }
      return [
        {
          criterionKey: key,
          criterionLabel: label,
          operator: '=' as const,
          value: value as string | number,
        },
      ];
    });
  };
  const parseDynamicConditionColumns = (row: Record<string, unknown>): FeeRuleCondition[] => {
    const criterionMap = new Map(
      [
        ...(form.priceCriteria ?? []),
        ...feeCriterionDefinitions.map((item) => ({
          key: item.key,
          label: item.label,
          valueType: item.valueType,
        })),
      ].map((item) => [item.key.toLowerCase(), item])
    );
    const ranges = new Map<string, { from?: unknown; to?: unknown }>();
    const singles: Array<{ key: string; value: unknown }> = [];
    for (const [rawKey, value] of Object.entries(row)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      const normalized = normalizeImportKey(rawKey);
      if (IMPORT_BASE_ROW_KEYS.has(normalized)) continue;
      const dynamicMatch = /^cond(?:ition)?\.(.+)$/.exec(normalized);
      if (!dynamicMatch) continue;
      const payload = normalizeCriterionAlias(dynamicMatch[1] ?? '');
      if (!payload) continue;
      if (payload.endsWith('.from')) {
        const key = payload.slice(0, -'.from'.length);
        ranges.set(key, { ...(ranges.get(key) ?? {}), from: value });
        continue;
      }
      if (payload.endsWith('.to')) {
        const key = payload.slice(0, -'.to'.length);
        ranges.set(key, { ...(ranges.get(key) ?? {}), to: value });
        continue;
      }
      singles.push({ key: payload, value });
    }
    const conditions: FeeRuleCondition[] = [];
    for (const [criterionKey, range] of ranges.entries()) {
      if (range.from === undefined && range.to === undefined) continue;
      const criterion = criterionMap.get(criterionKey.toLowerCase());
      conditions.push({
        criterionKey,
        criterionLabel: criterion?.label ?? criterionKey,
        operator: 'BETWEEN',
        value: [range.from ?? '', range.to ?? ''],
      });
    }
    for (const item of singles) {
      const criterion = criterionMap.get(item.key.toLowerCase());
      const text = String(item.value ?? '').trim();
      if (!text) continue;
      if (text.includes(',')) {
        conditions.push({
          criterionKey: item.key,
          criterionLabel: criterion?.label ?? item.key,
          operator: 'IN',
          value: text
            .split(',')
            .map((part) => part.trim())
            .filter(Boolean),
        });
      } else {
        conditions.push({
          criterionKey: item.key,
          criterionLabel: criterion?.label ?? item.key,
          operator: '=',
          value: item.value as string | number,
        });
      }
    }
    return conditions;
  };

  const applyImportJson = () => {
    if (!importServiceDetail) return;
    try {
      const parsed = JSON.parse(importJsonText);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      if (rows.length === 0) {
        setImportError('JSON phải chứa ít nhất một dòng cấu hình');
        return;
      }
      const serviceType =
        form.serviceRules.find((rule) => rule.serviceDetail === importServiceDetail)?.serviceType ??
        resolveFeeServiceType(importServiceDetail) ??
        'ONSITE';
      const primaryConditionBase = buildPrimaryCondition(serviceType);
      const importedRules: ServicePriceRule[] = rows.map((row, index) => {
        const item = (row ?? {}) as Record<string, unknown>;
        const pricingMode: ServicePricingMode =
          item.pricingMode === 'PER_UNIT' ||
          /per[_\s-]?unit|đơn vị|don vi/i.test(String(item.pricingMode ?? item.CachTinh ?? ''))
            ? 'PER_UNIT'
            : 'FIXED';
        const segmentRaw = String(item.segmentType ?? item.LoaiDoanGia ?? '').trim();
        const segmentType: PriceSegmentType = /tiered|bậc thang|bac thang/i.test(segmentRaw)
          ? 'TIERED'
          : /single|đơn lẻ|don le/i.test(segmentRaw)
            ? 'SINGLE'
            : defaultPriceSegmentType(serviceType);
        const resolvedSegmentType =
          segmentType === 'TIERED' && !canUseTieredSegment(serviceType) ? 'SINGLE' : segmentType;
        const validFrom = String(item.validFrom ?? item.NgayHieuLuc ?? '').trim() || undefined;
        const validTo = String(item.validTo ?? item.NgayHetHan ?? '').trim() || undefined;
        const basePrice = Number(item.basePrice ?? item.price ?? 0) || 0;
        const conditions = parseImportedConditions(
          (item.conditions as Record<string, unknown> | undefined) ??
            (typeof item === 'object' && !Array.isArray(item)
              ? (item as Record<string, unknown>)
              : undefined)
        ).filter(
          (condition) =>
            condition.criterionKey !== 'distanceKm' &&
            condition.criterionKey !== 'roadDistance' &&
            condition.criterionKey !== 'from' &&
            condition.criterionKey !== 'to' &&
            condition.criterionKey !== 'basePrice' &&
            condition.criterionKey !== 'pricingMode' &&
            condition.criterionKey !== 'price'
        );
        const primarySource =
          (item.primaryCriterion as { from?: string | number; to?: string | number } | null | undefined) ??
          (item.primary as { from?: string | number; to?: string | number } | undefined);
        const fromValue = item.from ?? primarySource?.from;
        const toValue = item.to ?? primarySource?.to;
        const fromInclusive = parseBoundInclusive(
          item.fromInclusive ?? item.fromOperator ?? item.tuOperator,
          DEFAULT_BETWEEN_BOUNDS.fromInclusive
        );
        const toInclusive = parseBoundInclusive(
          item.toInclusive ?? item.toOperator ?? item.denOperator,
          DEFAULT_BETWEEN_BOUNDS.toInclusive
        );
        const primary =
          primaryConditionBase && (fromValue !== undefined || toValue !== undefined || primarySource)
            ? {
                ...primaryConditionBase,
                operator: 'BETWEEN' as const,
                value: [(fromValue ?? '') as string | number, (toValue ?? '') as string | number],
                fromInclusive,
                toInclusive,
              }
            : primaryConditionBase;
        return {
          id: `sr-import-${Date.now()}-${index}`,
          serviceType,
          serviceDetail: importServiceDetail,
          basePrice,
          pricingMode,
          segmentType: resolvedSegmentType,
          validFrom,
          validTo,
          unit: SERVICE_CONFIG[serviceType].unit,
          conditions: primary ? [primary, ...conditions] : conditions,
        };
      });
      update('serviceRules', [
        ...form.serviceRules.filter(
          (rule) => resolveMatrixServiceHead(rule.serviceDetail) !== importServiceDetail
        ),
        ...importedRules,
      ]);
      setImportServiceDetail(null);
      setImportError('');
      setError('');
    } catch {
      setImportError('JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.');
    }
  };

  const buildPartnerTableSample = () => ({
    code: form.code || 'SUP-EXT-PARTNER',
    name: form.name || 'Bảng phí đối tác',
    target: 'PARTNER',
    objectType: form.objectType || 'PARTNER_EXTERNAL',
    orderType: form.orderType === 'PACKAGE_SINGLE' ? 'PACKAGE' : form.orderType || 'PACKAGE',
    applyFor: form.applyFor || 'NCC đối tác',
    status: form.status || 'ACTIVE',
    settings: {
      retailMarkupFactor: form.settings.retailMarkupFactor,
      roundMode: form.settings.roundMode,
      stackSurcharges: form.settings.stackSurcharges,
      includesVat: form.settings.includesVat,
    },
    priceCriteria: ['payload', 'seats', 'vehicleType', 'rescueVehicleType'],
    services: [
      ...buildImportSample('Kích bình ắc quy', 'ONSITE'),
      ...buildImportSample('Kéo xe', 'TOWING'),
      ...buildImportSample('Cẩu xe', 'CRANE'),
    ].map((item) => ({
      ...item,
      serviceCode: findServiceCode(String(item.serviceDetail ?? item.service ?? '')),
    })),
    surcharges: [
      {
        surchargeCode: 'TIME_REQUEST',
        type: 'COEFFICIENT',
        value: 1.15,
        operator: 'BETWEEN',
        criterionFrom: '22:00',
        fromOperator: '<',
        criterionTo: '06:00',
        toOperator: '≤',
      },
      {
        surchargeCode: 'HIGHWAY_ROUTE',
        type: 'FIXED',
        value: 150000,
        operator: '=',
        criterionValue: 'ISHIGHWAY__CAO_TOC_BAC_NAM_PHIA_DONG_CT_01',
      },
    ],
  });

  const mapRowToServiceRule = (
    item: Record<string, unknown>,
    index: number
  ): ServicePriceRule | null => {
    const serviceCode = String(item.serviceCode ?? '').trim();
    const serviceDetail = String(
      item.service ??
        item.DichVu ??
        item.serviceDetail ??
        (serviceCode ? SERVICE_CODE_TO_DETAIL[serviceCode] : '') ??
        ''
    ).trim();
    if (!serviceDetail) return null;
    const serviceType =
      (item.serviceType as ServiceType | undefined) ??
      resolveFeeServiceType(serviceDetail) ??
      (String(item.LoaiDichVu ?? '').includes('Kéo')
        ? 'TOWING'
        : String(item.LoaiDichVu ?? '').includes('Cẩu')
          ? 'CRANE'
          : 'ONSITE');
    const pricingRaw = String(item.pricingMode ?? item.CachTinh ?? item.PhuongPhapTinh ?? 'FIXED');
    const pricingMode: ServicePricingMode =
      /per[_\s-]?unit|đơn vị|don vi/i.test(pricingRaw) ? 'PER_UNIT' : 'FIXED';
    const segmentRaw = String(
      item.segmentType ?? item.LoaiDoanGia ?? item.loaiDoanGia ?? ''
    ).trim();
    const segmentType: PriceSegmentType = /tiered|bậc thang|bac thang/i.test(segmentRaw)
      ? 'TIERED'
      : /single|đơn lẻ|don le/i.test(segmentRaw)
        ? 'SINGLE'
        : defaultPriceSegmentType(serviceType);
    const resolvedSegmentType =
      segmentType === 'TIERED' && !canUseTieredSegment(serviceType) ? 'SINGLE' : segmentType;
    const validFrom = String(item.validFrom ?? item.NgayHieuLuc ?? '').trim() || undefined;
    const validTo = String(item.validTo ?? item.NgayHetHan ?? '').trim() || undefined;
    const basePrice = Number(item.basePrice ?? item.MucGia ?? item.price ?? 0) || 0;
    const payloadFrom = item.payloadFrom ?? item.loadFrom ?? item.TrongTaiTu;
    const payloadTo = item.payloadTo ?? item.loadTo ?? item.TrongTaiDen;
    const seatValue = item.seats ?? item.seatCount ?? item.SoCho;
    const conditionsRaw =
      (item.conditions as Record<string, unknown> | undefined) ??
      ({
        payload:
          item.payload ??
          (payloadFrom !== undefined || payloadTo !== undefined
            ? [payloadFrom ?? '', payloadTo ?? '']
            : undefined),
        seats: seatValue,
        vehicleType: item.vehicleType ?? item.LoaiPTGapSuCo,
        rescueVehicleType: item.rescueVehicleType ?? item.LoaiPTCuuHo,
      } as Record<string, unknown>);
    const staticConditions = parseImportedConditions(conditionsRaw).filter(
      (condition) =>
        !['distanceKm', 'roadDistance', 'from', 'to', 'basePrice', 'pricingMode', 'price'].includes(
          condition.criterionKey
        )
    );
    const dynamicConditions = parseDynamicConditionColumns(item).filter(
      (condition) =>
        !['distanceKm', 'roadDistance', 'from', 'to', 'basePrice', 'pricingMode', 'price'].includes(
          condition.criterionKey
        )
    );
    const mergedConditions = [...staticConditions];
    for (const condition of dynamicConditions) {
      const idx = mergedConditions.findIndex((itemCond) => itemCond.criterionKey === condition.criterionKey);
      if (idx >= 0) mergedConditions[idx] = condition;
      else mergedConditions.push(condition);
    }
    const primaryConditionBase = buildPrimaryCondition(serviceType);
    const primarySource =
      (item.primaryCriterion as { from?: string | number; to?: string | number } | null | undefined) ??
      undefined;
    const fromValue = item.from ?? item.Tu ?? primarySource?.from;
    const toValue = item.to ?? item.Den ?? primarySource?.to;
    const fromInclusive = parseBoundInclusive(
      item.fromInclusive ?? item.fromOperator ?? item.tuOperator,
      DEFAULT_BETWEEN_BOUNDS.fromInclusive
    );
    const toInclusive = parseBoundInclusive(
      item.toInclusive ?? item.toOperator ?? item.denOperator,
      DEFAULT_BETWEEN_BOUNDS.toInclusive
    );
    const primary =
      primaryConditionBase && (fromValue !== undefined || toValue !== undefined || primarySource)
        ? {
            ...primaryConditionBase,
            operator: 'BETWEEN' as const,
            value: [(fromValue ?? '') as string | number, (toValue ?? '') as string | number],
            fromInclusive,
            toInclusive,
          }
        : primaryConditionBase;
    return {
      id: `sr-table-import-${Date.now()}-${index}`,
      serviceType,
      serviceDetail,
      basePrice,
      pricingMode,
      segmentType: resolvedSegmentType,
      validFrom,
      validTo,
      unit: SERVICE_CONFIG[serviceType].unit,
      conditions: primary ? [primary, ...mergedConditions] : mergedConditions,
    };
  };

  const mapRowToSurcharge = (
    item: Record<string, unknown>,
    index: number
  ): SurchargeRule | null => {
    const surchargeCode = String(item.surchargeCode ?? '').trim();
    const name = String(
      item.name ??
        item.TenPhuPhi ??
        (surchargeCode ? SURCHARGE_CODE_TO_NAME[surchargeCode] : '') ??
        ''
    ).trim();
    if (!name) return null;
    const catalog = SURCHARGE_HEAD_OPTIONS.find((entry) => entry.name === name);
    const typeRaw = String(item.type ?? item.Kieu ?? 'FIXED');
    const type: SurchargeType = /coeff|hệ số|he so/i.test(typeRaw) ? 'COEFFICIENT' : 'FIXED';
    /** criterionKey suy từ surchargeCode/catalog — không cấu hình trên file PhuPhi. */
    const criterionKey = String(catalog?.criterionKey ?? '').trim();
    const criterionMeta =
      SURCHARGE_CRITERIA_CATALOG.find((entry) => entry.key === criterionKey) ??
      SURCHARGE_CRITERIA_CATALOG.find((entry) => entry.label === criterionKey);
    const operator = String(
      item.operator ?? item.criterionOperator ?? defaultSurchargeOperatorByCriterion(criterionMeta?.key ?? criterionKey)
    ).toUpperCase() as FeeRuleCondition['operator'];
    const isTime = isTimeSurchargeCriterion(criterionMeta?.key ?? criterionKey);
    const fromInclusive = parseBoundInclusive(
      item.fromInclusive ?? item.fromOperator ?? item.criterionFromOperator,
      DEFAULT_BETWEEN_BOUNDS.fromInclusive
    );
    const toInclusive = parseBoundInclusive(
      item.toInclusive ?? item.toOperator ?? item.criterionToOperator,
      DEFAULT_BETWEEN_BOUNDS.toInclusive
    );
    const rawCriterionValue = String(
      item.criterionValue ??
        item.criterionValueCode ??
        item.conditionValue ??
        item.GiaTriTieuChi ??
        catalog?.value ??
        criterionMeta?.values[0] ??
        ''
    ).trim();
    const rawFrom = String(item.criterionFrom ?? item.from ?? '').trim();
    const rawTo = String(item.criterionTo ?? item.to ?? '').trim();
    const timeParts = rawCriterionValue.includes('-')
      ? rawCriterionValue.split('-').map((part) => part.trim())
      : [];
    const criterionValue =
      operator === 'BETWEEN' || isTime
        ? ([
            rawFrom || timeParts[0] || criterionMeta?.values[0] || DEFAULT_TIME_RANGE[0],
            rawTo || timeParts[1] || criterionMeta?.values[1] || DEFAULT_TIME_RANGE[1],
          ] as [string, string])
        : resolveSurchargeCriterionValue(
            criterionMeta?.key ?? criterionKey,
            rawCriterionValue,
            criterionMeta?.values
          ) ||
          criterionMeta?.values[0] ||
          '';
    const applicableRaw = item.applicableServices ?? item.DichVuApDung ?? item.services;
    const applicableServices = Array.isArray(applicableRaw)
      ? applicableRaw.map((entry) => String(entry).trim()).filter(Boolean)
      : typeof applicableRaw === 'string' && applicableRaw.trim() && !/^all$/i.test(applicableRaw.trim())
        ? applicableRaw.split(/[,;|]/).map((entry) => entry.trim()).filter(Boolean)
        : undefined;
    return {
      id: `su-table-import-${Date.now()}-${index}`,
      name,
      type,
      value: Number(item.value ?? item.GiaTri ?? 0) || 0,
      activeWhen: criterionMeta
        ? isTime
          ? `${criterionMeta.key}=${criterionValue[0]}-${criterionValue[1]}`
          : `${criterionMeta.key}=${criterionValue}`
        : `${criterionKey}=${rawCriterionValue}`,
      conditions: criterionMeta
        ? [
            {
              criterionKey: criterionMeta.key,
              criterionLabel: criterionMeta.label,
              operator: operator === 'BETWEEN' || isTime ? 'BETWEEN' : '=',
              value: criterionValue,
              ...(operator === 'BETWEEN' || isTime ? { fromInclusive, toInclusive } : {}),
            },
          ]
        : [],
      applicableServices:
        applicableServices && applicableServices.length > 0 ? applicableServices : undefined,
      stackable: true,
    };
  };

  const syncCriteriaFromRules = (rules: ServicePriceRule[]): FeeCriterion[] => {
    const keys = new Set<string>();
    rules.forEach((rule) => {
      (rule.conditions ?? []).forEach((condition) => {
        if (
          condition.criterionKey === 'distanceKm' ||
          condition.criterionKey === 'roadDistance'
        ) {
          return;
        }
        keys.add(condition.criterionKey);
      });
    });
    return Array.from(keys).flatMap((key) => {
      const definition = feeCriterionDefinitions.find((item) => item.key === key);
      if (!definition) return [];
      return [buildCriterion(definition.label, `cr-import-${key}`)];
    });
  };

  const openTableImport = (mode: 'json' | 'excel') => {
    setTableImportMode(mode);
    setTableImportOpen(true);
    setTableImportIssues([]);
    setTableImportFileName('');
    setTableImportDemoCase('');
    if (mode === 'json') {
      setTableImportJsonText(JSON.stringify(buildPartnerTableSample(), null, 2));
    } else {
      setTableImportJsonText('');
    }
  };

  const previewTableImportDemoCase = (caseId: TableImportDemoCaseId) => {
    setTableImportDemoCase(caseId);
    setTableImportMode('json');
    setTableImportFileName('');
    const surchargeNameToCriterion = new Map(
      FEE_SURCHARGE_CATALOG.map((item) => [item.name, item.criterionKey])
    );

    if (caseId === 'json_invalid') {
      setTableImportJsonText('{ "code": "BAD", "services": [');
      setTableImportIssues([
        {
          sheet: 'File',
          field: 'json',
          message: 'Unexpected end of JSON input',
        },
      ]);
      return;
    }

    if (caseId === 'json_not_object') {
      setTableImportJsonText(
        JSON.stringify([{ serviceCode: 'ONSITE_BATTERY', basePrice: 1 }], null, 2)
      );
      setTableImportIssues([
        {
          sheet: 'File',
          field: 'json',
          message: 'JSON bảng phí phải là một object',
        },
      ]);
      return;
    }

    if (caseId === 'missing_sheet') {
      setTableImportJsonText(
        JSON.stringify(
          {
            _demo: 'Mô phỏng Excel thiếu sheet — chưa đọc được payload',
            missingSheets: ['DichVu'],
          },
          null,
          2
        )
      );
      setTableImportIssues(
        validateFeeTableImportWorkbookSheets(['ThongTin', 'PhuPhi', 'HuongDan'])
      );
      return;
    }

    const base = buildTableImportDemoBase();
    let payload: Record<string, unknown> = base;

    if (caseId === 'empty_payload') {
      payload = { ...base, services: [], surcharges: [] };
    } else if (caseId === 'bad_object_type') {
      payload = {
        ...base,
        scope: { objectType: 'INVALID_TYPE', orderType: 'PACKAGE' },
      };
    } else if (caseId === 'bad_service_code') {
      payload = {
        ...base,
        services: [
          {
            serviceCode: 'UNKNOWN_SERVICE',
            pricingMode: 'FIXED',
            basePrice: 100000,
            from: '',
            fromOperator: '<',
            to: '',
            toOperator: '≤',
          },
        ],
      };
    } else if (caseId === 'from_gte_to') {
      payload = {
        ...base,
        services: [
          {
            serviceCode: 'TOWING_GARAGE',
            pricingMode: 'FIXED',
            basePrice: 100000,
            from: 20,
            fromOperator: '<',
            to: 10,
            toOperator: '≤',
          },
        ],
      };
    } else if (caseId === 'bad_surcharge_code') {
      payload = {
        ...base,
        surcharges: [
          {
            surchargeCode: 'UNKNOWN_SURCHARGE',
            type: 'FIXED',
            value: 50000,
            operator: '=',
            criterionValue: 'X',
          },
        ],
      };
    } else if (caseId === 'between_missing') {
      payload = {
        ...base,
        surcharges: [
          {
            surchargeCode: 'TIME_REQUEST',
            type: 'COEFFICIENT',
            value: 1.15,
            operator: 'BETWEEN',
            criterionFrom: '',
            criterionTo: '',
          },
        ],
      };
    } else if (caseId === 'multi_errors') {
      payload = {
        ...base,
        target: 'PARTNER',
        scope: { objectType: 'CUSTOMER_BUSINESS', orderType: 'WRONG' },
        services: [
          {
            serviceCode: 'BAD_CODE',
            pricingMode: 'FIXED',
            basePrice: 'abc',
            from: 30,
            fromOperator: '??',
            to: 10,
            toOperator: '≤',
          },
        ],
        surcharges: [
          {
            surchargeCode: 'NOPE',
            type: 'WEIRD',
            value: 'x',
            operator: 'BETWEEN',
          },
        ],
      };
    }

    setTableImportJsonText(JSON.stringify(payload, null, 2));
    if (caseId === 'ok') {
      setTableImportIssues([]);
      return;
    }
    setTableImportIssues(
      validateFeeTableImportPayload(payload, { surchargeNameToCriterion })
    );
  };

  const applyTableImportPayload = (payload: Record<string, unknown>): boolean => {
    const surchargeNameToCriterion = new Map(
      FEE_SURCHARGE_CATALOG.map((item) => [item.name, item.criterionKey])
    );
    const issues = validateFeeTableImportPayload(payload, { surchargeNameToCriterion });
    if (issues.length > 0) {
      setTableImportIssues(issues);
      return false;
    }

    const serviceRows = Array.isArray(payload.services)
      ? payload.services
      : Array.isArray(payload.DichVu)
        ? payload.DichVu
        : [];
    const surchargeRows = Array.isArray(payload.surcharges)
      ? payload.surcharges
      : Array.isArray(payload.PhuPhi)
        ? payload.PhuPhi
        : [];
    const importedRules = serviceRows
      .map((row, index) => mapRowToServiceRule((row ?? {}) as Record<string, unknown>, index))
      .filter((row): row is ServicePriceRule => Boolean(row));
    const importedSurcharges = surchargeRows
      .map((row, index) => mapRowToSurcharge((row ?? {}) as Record<string, unknown>, index))
      .filter((row): row is SurchargeRule => Boolean(row));

    if (importedRules.length === 0 && importedSurcharges.length === 0) {
      setTableImportIssues([
        {
          sheet: 'File',
          field: 'payload',
          message: 'Không tìm thấy dòng dịch vụ hoặc phụ phí hợp lệ',
        },
      ]);
      return false;
    }
    setTableImportIssues([]);

    const criteriaKeys = Array.isArray(payload.priceCriteria)
      ? payload.priceCriteria.map(String)
      : [];
    const nextCriteria =
      criteriaKeys.length > 0
        ? criteriaKeys.flatMap((key) => {
            const definition =
              feeCriterionDefinitions.find((item) => item.key === key) ??
              feeCriterionDefinitions.find((item) => item.label === key);
            return definition ? [buildCriterion(definition.label, `cr-import-${definition.key}`)] : [];
          })
        : syncCriteriaFromRules(importedRules);

    const target = (payload.target as FeeTarget | undefined) ?? form.target;

    setForm((prev) =>
      normalizePriceTableServiceHeads({
        ...prev,
        code: String(payload.code ?? prev.code),
        name: String(payload.name ?? prev.name),
        applyFor: String(payload.applyFor ?? prev.applyFor),
        target,
        objectType:
          (String(payload.objectType ?? prev.objectType ?? defaultObjectTypeByTarget(target)) ||
            defaultObjectTypeByTarget(target)) as FeeObjectType,
        orderType:
          (String(payload.orderType ?? prev.orderType ?? 'PACKAGE') || 'PACKAGE') as FeeOrderType,
        scope: {
          ...prev.scope,
          ...(payload.scope as Record<string, unknown> | undefined),
        },
        status: (payload.status as FeeTableStatus | undefined) ?? prev.status,
        settings: {
          ...prev.settings,
          retailMarkupFactor: Number(
            (payload.settings as { retailMarkupFactor?: number } | undefined)?.retailMarkupFactor ??
              prev.settings.retailMarkupFactor
          ),
          roundMode:
            ((payload.settings as { roundMode?: RoundMode } | undefined)?.roundMode as RoundMode) ??
            prev.settings.roundMode,
          stackSurcharges:
            (payload.settings as { stackSurcharges?: boolean } | undefined)?.stackSurcharges ??
            prev.settings.stackSurcharges,
          includesVat:
            (payload.settings as { includesVat?: boolean } | undefined)?.includesVat ??
            prev.settings.includesVat,
        },
        priceCriteria: nextCriteria,
        serviceRules: importedRules.length ? importedRules : prev.serviceRules,
        surchargeRules: importedSurcharges.length ? importedSurcharges : prev.surchargeRules,
      })
    );
    setTableImportOpen(false);
    setActiveTab('matrix');
    setError('');
    return true;
  };

  const applyTableImportJson = () => {
    try {
      const parsed = JSON.parse(tableImportJsonText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setTableImportIssues([
          {
            sheet: 'File',
            field: 'json',
            message: 'JSON bảng phí phải là một object',
          },
        ]);
        return;
      }
      applyTableImportPayload(parsed as Record<string, unknown>);
    } catch (err) {
      setTableImportIssues([
        {
          sheet: 'File',
          field: 'json',
          message:
            err instanceof Error
              ? err.message
              : 'JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.',
        },
      ]);
    }
  };

  const downloadPartnerExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const guideSheet = XLSX.utils.aoa_to_sheet([
      ['Sheet', 'MoTa'],
      ['ThongTin', 'Thông tin chung bảng phí (mỗi dòng = 1 trường field/value)'],
      ['DichVu', 'Các dòng giá dịch vụ — dùng key code, mỗi dòng = 1 dòng giá'],
      ['PhuPhi', 'Các dòng phụ phí có điều kiện — dùng key code, mỗi dòng = 1 dòng phụ phí'],
      [],
      ['GhiChu', 'Import all-or-nothing: có lỗi thì không áp dụng. Lỗi báo theo [Sheet] Dòng n · field: message'],
      [],
      ['Cot DichVu', 'Y Nghia'],
      ['serviceCode', 'Mã dịch vụ (VD: ONSITE_BATTERY, TOWING_GARAGE, CRANE_ROAD)'],
      ['pricingMode', 'FIXED | PER_UNIT (Cố định | Đơn vị)'],
      ['segmentType', 'TIERED | SINGLE (Bậc thang — chỉ Kéo/Cẩu | Đơn lẻ)'],
      ['basePrice', 'Mức giá (VNĐ)'],
      ['from', 'Tiêu chí chính Từ (km/m) — để trống nếu dịch vụ tại chỗ'],
      ['fromOperator', 'Toán tử biên dưới: < (không gồm) | ≤ (bao gồm)'],
      ['to', 'Tiêu chí chính Đến (km/m)'],
      ['toOperator', 'Toán tử biên trên: < (không gồm) | ≤ (bao gồm)'],
      ['cond.load_capacity.from', 'Tiêu chí bổ sung động: trọng tải từ (tấn)'],
      ['cond.load_capacity.to', 'Tiêu chí bổ sung động: trọng tải đến (tấn)'],
      ['cond.seat_number', 'Tiêu chí bổ sung động: số chỗ (1 giá trị hoặc a,b,c)'],
      ['cond.vehicleType', 'Tiêu chí bổ sung động: Xe chở người | Xe chở hàng'],
      ['cond.rescueVehicleType', 'Tiêu chí bổ sung động: Xe máy | Xe van | Xe sàn trượt | Xe cẩu, kéo'],
      ['Ghi chú', 'Có thể thêm cột cond.<criterionKey> hoặc cond.<criterionKey>.from/to, parser tự map'],
      [],
      ['Cot PhuPhi', 'Y Nghia'],
      ['surchargeCode', 'Mã phụ phí (VD: TIME_REQUEST, HIGHWAY_ROUTE, HOLIDAY) — parser tự suy tiêu chí từ catalog'],
      ['type', 'FIXED | COEFFICIENT'],
      ['value', 'Số tiền (FIXED) hoặc hệ số (VD: 1.15)'],
      ['operator', '= | BETWEEN'],
      ['criterionFrom', 'Giá trị từ cho BETWEEN (time/numeric)'],
      ['fromOperator', 'Toán tử biên dưới: < | ≤'],
      ['criterionTo', 'Giá trị đến cho BETWEEN (time/numeric)'],
      ['toOperator', 'Toán tử biên trên: < | ≤'],
      ['criterionValue', 'Giá trị dạng code cho LIST: <CRITERION_KEY>__<VALUE_CODE> (VD: WEATHER__BAO)'],
    ]);
    const infoSheet = XLSX.utils.aoa_to_sheet([
      ['field', 'value'],
      ['code', form.code || 'SUP-EXT-PARTNER'],
      ['name', form.name || 'Bảng phí đối tác mẫu'],
      ['target', form.target || 'PARTNER'],
      ['objectType', form.objectType ?? defaultObjectTypeByTarget(form.target)],
      ['orderType', form.orderType ?? 'PACKAGE'],
      ['retailMarkupFactor', form.settings.retailMarkupFactor],
      ['roundMode', form.settings.roundMode],
      ['stackSurcharges', form.settings.stackSurcharges ? 'true' : 'false'],
      ['includesVat', form.settings.includesVat ? 'true' : 'false'],
    ]);
    const serviceSheet = XLSX.utils.json_to_sheet([
      {
        serviceCode: 'ONSITE_BATTERY',
        pricingMode: 'FIXED',
        basePrice: 350000,
        from: '',
        fromOperator: '<',
        to: '',
        toOperator: '≤',
        'cond.load_capacity.from': 1.5,
        'cond.load_capacity.to': 3.5,
        'cond.seat_number': '5',
        'cond.vehicleType': 'Xe chở người',
        'cond.rescueVehicleType': '',
      },
      {
        serviceCode: 'ONSITE_SPARE_TIRE',
        pricingMode: 'FIXED',
        basePrice: 400000,
        from: '',
        fromOperator: '<',
        to: '',
        toOperator: '≤',
        'cond.load_capacity.from': '',
        'cond.load_capacity.to': '',
        'cond.seat_number': '',
        'cond.vehicleType': 'Xe chở người',
        'cond.rescueVehicleType': '',
      },
      {
        serviceCode: 'TOWING_GARAGE',
        pricingMode: 'FIXED',
        basePrice: 100000,
        from: 0,
        fromOperator: '<',
        to: 10,
        toOperator: '≤',
        'cond.load_capacity.from': '',
        'cond.load_capacity.to': '',
        'cond.seat_number': '',
        'cond.vehicleType': 'Xe chở người',
        'cond.rescueVehicleType': 'Xe sàn trượt',
      },
      {
        serviceCode: 'TOWING_GARAGE',
        pricingMode: 'PER_UNIT',
        basePrice: 10000,
        from: 10,
        fromOperator: '<',
        to: 20,
        toOperator: '≤',
        'cond.load_capacity.from': '',
        'cond.load_capacity.to': '',
        'cond.seat_number': '',
        'cond.vehicleType': 'Xe chở hàng',
        'cond.rescueVehicleType': 'Xe sàn trượt',
      },
      {
        serviceCode: 'TOWING_LONG_DISTANCE',
        pricingMode: 'PER_UNIT',
        basePrice: 15000,
        from: 20,
        fromOperator: '<',
        to: 50,
        toOperator: '≤',
        'cond.load_capacity.from': '',
        'cond.load_capacity.to': '',
        'cond.seat_number': '',
        'cond.vehicleType': 'Xe chở hàng',
        'cond.rescueVehicleType': 'Xe sàn trượt',
      },
      {
        serviceCode: 'CRANE_ROAD',
        pricingMode: 'FIXED',
        basePrice: 900000,
        from: 0,
        fromOperator: '<',
        to: 1,
        toOperator: '≤',
        'cond.load_capacity.from': '',
        'cond.load_capacity.to': '',
        'cond.seat_number': '',
        'cond.vehicleType': 'Xe chở người',
        'cond.rescueVehicleType': 'Xe cẩu, kéo',
      },
      {
        serviceCode: 'CRANE_BELOW_ROAD',
        pricingMode: 'FIXED',
        basePrice: 1500000,
        from: 1,
        fromOperator: '<',
        to: 3,
        toOperator: '≤',
        'cond.load_capacity.from': '',
        'cond.load_capacity.to': '',
        'cond.seat_number': '',
        'cond.vehicleType': 'Xe chở hàng',
        'cond.rescueVehicleType': 'Xe cẩu, kéo',
      },
    ]);
    const surchargeSheet = XLSX.utils.json_to_sheet([
      {
        surchargeCode: 'TIME_REQUEST',
        type: 'COEFFICIENT',
        value: 1.15,
        operator: 'BETWEEN',
        criterionFrom: '22:00',
        fromOperator: '<',
        criterionTo: '06:00',
        toOperator: '≤',
        criterionValue: '',
      },
      {
        surchargeCode: 'TIME_EXECUTION',
        type: 'COEFFICIENT',
        value: 1.1,
        operator: 'BETWEEN',
        criterionFrom: '18:00',
        fromOperator: '<',
        criterionTo: '22:00',
        toOperator: '≤',
        criterionValue: '',
      },
      {
        surchargeCode: 'HIGHWAY_ROUTE',
        type: 'FIXED',
        value: 150000,
        operator: '=',
        criterionFrom: '',
        fromOperator: '',
        criterionTo: '',
        toOperator: '',
        criterionValue: 'ISHIGHWAY__CAO_TOC_BAC_NAM_PHIA_DONG_CT_01',
      },
      {
        surchargeCode: 'HIGHWAY_ROUTE',
        type: 'FIXED',
        value: 180000,
        operator: '=',
        criterionFrom: '',
        fromOperator: '',
        criterionTo: '',
        toOperator: '',
        criterionValue: 'ISHIGHWAY__HA_NOI_HAI_PHONG_CT_04',
      },
      {
        surchargeCode: 'WEATHER_STORM',
        type: 'FIXED',
        value: 250000,
        operator: '=',
        criterionFrom: '',
        fromOperator: '',
        criterionTo: '',
        toOperator: '',
        criterionValue: 'WEATHER__BAO',
      },
      {
        surchargeCode: 'HOLIDAY',
        type: 'COEFFICIENT',
        value: 1.2,
        operator: '=',
        criterionFrom: '',
        fromOperator: '',
        criterionTo: '',
        toOperator: '',
        criterionValue: 'HOLIDAY__CO',
      },
    ]);
    XLSX.utils.book_append_sheet(wb, guideSheet, 'HuongDan');
    XLSX.utils.book_append_sheet(wb, infoSheet, 'ThongTin');
    XLSX.utils.book_append_sheet(wb, serviceSheet, 'DichVu');
    XLSX.utils.book_append_sheet(wb, surchargeSheet, 'PhuPhi');
    XLSX.writeFile(wb, 'mau_bang_phi_doi_tac.xlsx');
  };

  const parseExcelWorkbook = (workbook: XLSX.WorkBook): Record<string, unknown> => {
    const readSheet = (name: string) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return [];
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    };
    const infoRows = readSheet('ThongTin');
    const info: Record<string, unknown> = {};
    infoRows.forEach((row) => {
      const key = String(row.Truong ?? row.Field ?? row.field ?? row.key ?? '').trim();
      const value = row.GiaTri ?? row.Value ?? row.value;
      if (key) info[key] = value;
    });
    const stackRaw = String(info.stackSurcharges ?? '').toLowerCase();
    const vatRaw = String(info.includesVat ?? '').toLowerCase();
    return {
      code: info.code,
      name: info.name,
      target: info.target || 'PARTNER',
      objectType: info['objectType'] || info.objectType,
      orderType: info['orderType'] || info.orderType,
      status: info.status || 'ACTIVE',
      settings: {
        retailMarkupFactor: Number(info.retailMarkupFactor) || form.settings.retailMarkupFactor,
        roundMode: info.roundMode || form.settings.roundMode,
        stackSurcharges: !(
          stackRaw.includes('cao nhất') ||
          stackRaw.includes('cao nhat') ||
          stackRaw === 'false' ||
          stackRaw === '0'
        ),
        includesVat:
          vatRaw.includes('đã bao gồm') ||
          vatRaw.includes('da bao gom') ||
          vatRaw === 'true' ||
          vatRaw === '1' ||
          vatRaw === 'yes',
      },
      services: readSheet('DichVu'),
      surcharges: readSheet('PhuPhi'),
    };
  };

  const handleExcelFileSelected = async (file: File) => {
    setTableImportFileName(file.name);
    setTableImportIssues([]);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetIssues = validateFeeTableImportWorkbookSheets(workbook.SheetNames);
      if (sheetIssues.length > 0) {
        setTableImportIssues(sheetIssues);
        setTableImportJsonText('');
        return;
      }
      const payload = parseExcelWorkbook(workbook);
      setTableImportJsonText(JSON.stringify(payload, null, 2));
      setTableImportMode('json');
      setTableImportIssues([]);
    } catch {
      setTableImportIssues([
        {
          sheet: 'File',
          field: 'file',
          message: 'Không đọc được file Excel. Vui lòng dùng đúng template.',
        },
      ]);
    }
  };

  const toggleRule = (ruleId: string) => {
    setExpandedRuleIds((ids) =>
      ids.includes(ruleId) ? ids.filter((id) => id !== ruleId) : [...ids, ruleId]
    );
  };

  const addCriterion = () => {
    const selectedKeys = new Set((form.priceCriteria ?? []).map((criterion) => criterion.key));
    const available = feeCriterionDefinitions.find(
      (definition) =>
        definition.status === 'ACTIVE' && !selectedKeys.has(definition.key)
    );
    if (!available) return;
    const c = buildCriterion(available.label);
    update('priceCriteria', [...(form.priceCriteria ?? []), c]);
  };

  const toggleMatrixCriterion = (label: string, key: string, checked: boolean) => {
    const selected = (form.priceCriteria ?? []).find((criterion) => criterion.key === key);
    if (checked && !selected) {
      const criterion = buildCriterion(label);
      update('priceCriteria', [...(form.priceCriteria ?? []), criterion]);
      return;
    }
    if (!checked && selected) removeCriterion(selected.id);
  };

  const updateCriterion = (cid: string, patch: Partial<FeeCriterion>) => {
    update(
      'priceCriteria',
      (form.priceCriteria ?? []).map((c) => (c.id === cid ? { ...c, ...patch } : c))
    );
  };

  const changeCriterionDefinition = (
    cid: string,
    label: string
  ) => {
    const config = getCriterionConfig(label);
    if (!config) return;
    setForm((prev) => {
      const current = (prev.priceCriteria ?? []).find((criterion) => criterion.id === cid);
      if (!current) return prev;
      const duplicate = (prev.priceCriteria ?? []).some(
        (criterion) => criterion.id !== cid && criterion.key === config.key
      );
      if (duplicate) return prev;
      const nextCriterion: FeeCriterion = {
        ...current,
        label,
        key: config.key,
        valueType: config.valueType,
        allowedValues: config.values,
        operator: config.valueType === 'RANGE' ? 'BETWEEN' : 'IN',
        value: config.valueType === 'RANGE' ? ['', ''] : config.values,
      };
      return {
        ...prev,
        priceCriteria: (prev.priceCriteria ?? []).map((criterion) =>
          criterion.id === cid ? nextCriterion : criterion
        ),
        serviceRules: prev.serviceRules.map((rule) => ({
          ...rule,
          conditions: (rule.conditions ?? []).map((condition) =>
            condition.criterionKey === current.key
              ? {
                  criterionKey: config.key,
                  criterionLabel: label,
                  operator: config.valueType === 'RANGE' ? 'BETWEEN' : '=',
                  value: config.valueType === 'RANGE' ? ['', ''] : config.values[0] ?? '',
                }
              : condition
          ),
        })),
      };
    });
  };

  const removeCriterion = (cid: string) => {
    const removed = (form.priceCriteria ?? []).find((criterion) => criterion.id === cid);
    update('priceCriteria', (form.priceCriteria ?? []).filter((c) => c.id !== cid));
    if (removed) {
      update(
        'serviceRules',
        form.serviceRules.map((rule) => ({
          ...rule,
          conditions: (rule.conditions ?? []).filter(
            (condition) => condition.criterionKey !== removed.key
          ),
        }))
      );
    }
  };

  const isPrimaryCriterionInUse = (_criterionKey: string): boolean => false;

  const addSurchargeHead = (name: string) => {
    const head = SURCHARGE_HEAD_OPTIONS.find((item) => item.name === name);
    if (!head || form.surchargeRules.some((rule) => rule.name === name)) return;
    const isTime = isTimeSurchargeCriterion(head.criterionKey);
    const timeRange: [string, string] = [...DEFAULT_TIME_RANGE];
    const criterionValue = isTime ? timeRange : head.value;
    const rule: SurchargeRule = {
      id: `su-${Date.now()}`,
      name: head.name,
      type: 'FIXED',
      value: 0,
      activeWhen: isTime
        ? `${head.criterionKey}=${timeRange[0]}-${timeRange[1]}`
        : `${head.criterionKey}=${head.value}`,
      conditions: [
        {
          criterionKey: head.criterionKey,
          criterionLabel: head.criterionLabel,
          operator: isTime ? 'BETWEEN' : '=',
          value: criterionValue,
        },
      ],
      stackable: true,
    };
    update('surchargeRules', [...form.surchargeRules, rule]);
  };

  const removeSurchargeHead = (name: string) => {
    update(
      'surchargeRules',
      form.surchargeRules.filter((rule) => rule.name !== name)
    );
  };

  const updateSurcharge = (sid: string, patch: Partial<SurchargeRule>) => {
    update(
      'surchargeRules',
      form.surchargeRules.map((s) => (s.id === sid ? { ...s, ...patch } : s))
    );
  };

  const removeSurcharge = (sid: string) => {
    update(
      'surchargeRules',
      form.surchargeRules.filter((s) => s.id !== sid)
    );
  };

  const duplicateSurcharge = (sid: string) => {
    const source = form.surchargeRules.find((rule) => rule.id === sid);
    if (!source) return;
    const copy: SurchargeRule = {
      ...source,
      id: `su-${Date.now()}`,
      conditions: source.conditions.map((condition) => ({ ...condition })),
      holidayDates: source.holidayDates ? [...source.holidayDates] : undefined,
      applicableServices: source.applicableServices
        ? [...source.applicableServices]
        : undefined,
    };
    const index = form.surchargeRules.findIndex((rule) => rule.id === sid);
    const next = [...form.surchargeRules];
    next.splice(Math.max(index, 0) + 1, 0, copy);
    update('surchargeRules', next);
  };

  const addSurchargeLine = (name: string) => {
    const source = form.surchargeRules.find((rule) => rule.name === name);
    if (source) {
      duplicateSurcharge(source.id);
      return;
    }
    addSurchargeHead(name);
  };

  const toggleSurchargeHead = (name: string, checked: boolean) => {
    if (checked) addSurchargeHead(name);
    else removeSurchargeHead(name);
  };

  const addPriceCondition = (ruleId: string) => {
    const rule = form.serviceRules.find((item) => item.id === ruleId);
    if (!rule) return;
    const matrixPrimary = resolveMatrixPrimary(rule);
    const primaryKey =
      matrixPrimary && matrixPrimary.mode !== 'TOW_INCLUDED' ? matrixPrimary.key : '';
    const usedKeys = new Set((rule.conditions ?? []).map((condition) => condition.criterionKey));
    const criterion = (form.priceCriteria ?? []).find(
      (item) =>
        item.role !== 'SURCHARGE' &&
        item.key !== primaryKey &&
        !usedKeys.has(item.key)
    );
    if (!criterion) return;
    const useBetween = criterion.valueType === 'RANGE' || criterion.valueType === 'TIME';
    const condition: FeeRuleCondition = useBetween
      ? {
          criterionKey: criterion.key,
          criterionLabel: criterion.label,
          ...betweenConditionDefaults(),
        }
      : {
          criterionKey: criterion.key,
          criterionLabel: criterion.label,
          operator: '=',
          value: defaultValueForOperator('=', criterion.allowedValues),
        };
    updateServiceRule(ruleId, {
      conditions: [...(rule.conditions ?? []), condition],
    });
  };

  const syncServiceRule = (ruleId: string, serviceDetail: string) => {
    const serviceType = resolveFeeServiceType(serviceDetail);
    if (!serviceType) return;
    setForm((prev) => {
      return {
        ...prev,
        serviceRules: prev.serviceRules.map((rule) => {
          if (rule.id !== ruleId) return rule;
          const additionalConditions = (rule.conditions ?? []).filter(
            (condition) =>
              condition.criterionKey !== 'distanceKm' &&
              condition.criterionKey !== 'roadDistance' &&
              condition.criterionKey !== 'roadPosition'
          );
          const primaryCondition = buildPrimaryCondition(serviceType);
          return {
            ...rule,
            serviceType,
            serviceDetail,
            unit: SERVICE_CONFIG[serviceType].unit,
            pricingMode: serviceType === 'ONSITE' ? 'FIXED' : rule.pricingMode ?? 'FIXED',
            includedKm: undefined,
            pricePerExtraKm: undefined,
            conditions: primaryCondition
              ? [primaryCondition, ...additionalConditions]
              : additionalConditions,
          };
        }),
      };
    });
  };

  const updatePrimaryCondition = (
    ruleId: string,
    primaryKey: string,
    patch: Partial<FeeRuleCondition>
  ) => {
    const rule = form.serviceRules.find((item) => item.id === ruleId);
    if (!rule) return;
    const existingIndex = (rule.conditions ?? []).findIndex(
      (condition) => condition.criterionKey === primaryKey
    );
    if (existingIndex >= 0) {
      updatePriceCondition(ruleId, existingIndex, patch);
      return;
    }
    const matrixPrimary = resolveMatrixPrimary(rule);
    const primary: FeeRuleCondition =
      matrixPrimary?.mode === 'LIST'
        ? {
            criterionKey: matrixPrimary.key,
            criterionLabel: matrixPrimary.label,
            operator: '=',
            value: matrixPrimary.values[0] ?? '',
          }
        : buildPrimaryCondition(rule.serviceType) ?? {
            criterionKey: primaryKey,
            criterionLabel: primaryKey,
            operator: 'BETWEEN',
            value: ['', ''],
          };
    updateServiceRule(ruleId, {
      conditions: [{ ...primary, ...patch }, ...(rule.conditions ?? [])],
    });
  };

  const updatePriceCondition = (
    ruleId: string,
    index: number,
    patch: Partial<FeeRuleCondition>
  ) => {
    const rule = form.serviceRules.find((r) => r.id === ruleId);
    const next = [...(rule?.conditions ?? [])];
    next[index] = { ...next[index], ...patch };
    updateServiceRule(ruleId, { conditions: next });
  };

  const removePriceCondition = (ruleId: string, index: number) => {
    const rule = form.serviceRules.find((r) => r.id === ruleId);
    updateServiceRule(ruleId, {
      conditions: (rule?.conditions ?? []).filter((_, i) => i !== index),
    });
  };

  const setSurchargeCriterion = (sid: string, criterionKey: string) => {
    const meta = SURCHARGE_CRITERIA_CATALOG.find((c) => c.key === criterionKey);
    if (!meta) {
      updateSurcharge(sid, { conditions: [] });
      return;
    }
    const isTime = isTimeSurchargeCriterion(meta.key);
    const timeRange: [string, string] = [
      meta.values[0] ?? DEFAULT_TIME_RANGE[0],
      meta.values[1] ?? DEFAULT_TIME_RANGE[1],
    ];
    const value = isTime ? timeRange : meta.values[0] ?? '';
    updateSurcharge(sid, {
      name:
        FEE_SURCHARGE_CATALOG.find((item) => item.criterionKey === criterionKey)?.name ??
        meta.label,
      activeWhen: isTime
        ? `${criterionKey}=${timeRange[0]}-${timeRange[1]}`
        : `${criterionKey}=${meta.values[0]}`,
      conditions: [
        {
          criterionKey: meta.key,
          criterionLabel: meta.label,
          operator: isTime ? 'BETWEEN' : '=',
          value,
        },
      ],
    });
  };

  const setSurchargeConditionValue = (sid: string, value: string) => {
    const surcharge = form.surchargeRules.find((s) => s.id === sid);
    const current = surcharge?.conditions[0];
    if (!current) return;
    updateSurcharge(sid, {
      activeWhen: `${current.criterionKey}=${value}`,
      conditions: [{ ...current, value }],
    });
  };

  const setSurchargeTimeRange = (sid: string, from: string, to: string) => {
    const surcharge = form.surchargeRules.find((s) => s.id === sid);
    const current = surcharge?.conditions[0];
    if (!current) return;
    updateSurcharge(sid, {
      activeWhen: `${current.criterionKey}=${from}-${to}`,
      conditions: [
        {
          ...current,
          operator: 'BETWEEN',
          value: [from, to],
        },
      ],
    });
  };

  const usesMarkupOnly = usesRetailMarkupOnlyPricing(form);
  const skipsPriceMatrixTabs = usesMarkupOnly;
  const visibleTabs = (() => {
    const tabs = [...FORM_TABS];
    if (readOnly) tabs.push(HISTORY_TAB);
    if (skipsPriceMatrixTabs) {
      return tabs.filter((tab) => tab.id === 'general' || tab.id === 'history');
    }
    return tabs;
  })();

  const setRetailMarkupOnlyMode = (enabled: boolean) => {
    setForm((prev) => {
      if (enabled) {
        if (prev.target !== 'CUSTOMER') {
          return prev;
        }
        return {
          ...prev,
          objectType: 'CUSTOMER_INDIVIDUAL',
          orderType: 'SINGLE',
          serviceRules: [],
          surchargeRules: [],
          priceCriteria: [],
          settings: {
            ...prev.settings,
            retailMarkupFactor:
              Number(prev.settings.retailMarkupFactor) > 0
                ? prev.settings.retailMarkupFactor
                : RETAIL_MARKUP_DEFAULT_FACTOR,
          },
        };
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          retailMarkupFactor: 0,
        },
      };
    });
    if (enabled) {
      setActiveTab('general');
    }
  };
  const selectedServiceHeads: string[] = Array.from(
    new Set<string>([
      ...(form.scope.appliedServices ?? []),
      ...form.serviceRules
        .map((rule) => resolveMatrixServiceHead(rule.serviceDetail))
        .filter((detail) => {
          const catalog = SERVICE_OPTIONS.find((item) => item.value === detail);
          if (catalog && isMatrixCategoryService(catalog.type)) return true;
          return !catalog?.children?.length && !resolveFeeServiceParent(detail);
        }),
    ])
  );
  const matrixServiceHeads: string[] = Array.from(
    new Set(form.serviceRules.map((rule) => resolveMatrixServiceHead(rule.serviceDetail)))
  );
  const matrixFilters = {
    keyword: matrixKeyword,
    serviceType: matrixServiceType,
    serviceDetail: matrixServiceDetail,
    pricingMode: matrixPricingMode,
    vehicleType: matrixVehicleType,
    rescueVehicleType: matrixRescueVehicleType,
    seatNumber: matrixSeatNumber,
    loadCapacity: matrixLoadCapacity,
  };
  const hasMatrixFilter =
    Boolean(matrixKeyword.trim()) ||
    Boolean(matrixServiceType) ||
    Boolean(matrixServiceDetail) ||
    Boolean(matrixPricingMode) ||
    Boolean(matrixVehicleType) ||
    Boolean(matrixRescueVehicleType) ||
    Boolean(matrixSeatNumber.trim()) ||
    Boolean(matrixLoadCapacity.trim());
  const filteredMatrixRules = form.serviceRules.filter((rule) =>
    ruleMatchesMatrixFilter(
      {
        ...rule,
        serviceDetail: resolveMatrixServiceHead(rule.serviceDetail),
      },
      matrixFilters
    )
  );
  const filteredMatrixServiceHeads = matrixServiceHeads.filter((serviceDetail) =>
    filteredMatrixRules.some(
      (rule) => resolveMatrixServiceHead(rule.serviceDetail) === serviceDetail
    )
  );
  const clearMatrixFilters = () => {
    setMatrixKeyword('');
    setMatrixServiceType('');
    setMatrixServiceDetail('');
    setMatrixPricingMode('');
    setMatrixVehicleType('');
    setMatrixRescueVehicleType('');
    setMatrixSeatNumber('');
    setMatrixLoadCapacity('');
  };
  const matrixVehicleTypeOptions = useMemo(() => {
    const fromCriteria =
      (form.priceCriteria ?? [])
        .find((criterion) => criterion.key === 'vehicleType')
        ?.allowedValues ?? [];
    return collectListCriterionOptions(form.serviceRules, ['vehicleType'], fromCriteria);
  }, [form.priceCriteria, form.serviceRules]);
  const matrixRescueVehicleTypeOptions = useMemo(() => {
    const fromCriteria =
      (form.priceCriteria ?? [])
        .find((criterion) => criterion.key === 'rescueVehicleType')
        ?.allowedValues ?? [];
    return collectListCriterionOptions(
      form.serviceRules,
      ['rescueVehicleType'],
      fromCriteria
    );
  }, [form.priceCriteria, form.serviceRules]);
  const catalogSelectableServices = SERVICE_OPTIONS.flatMap((option) => {
    if (isMatrixCategoryService(option.type)) return [option.value];
    if (option.children?.length) return [...option.children];
    return [option.value];
  });
  const catalogKnownServices = new Set(
    SERVICE_OPTIONS.flatMap((option) => [option.value, ...(option.children ?? [])])
  );
  const orphanServiceHeads = selectedServiceHeads.filter(
    (service) => !catalogKnownServices.has(service)
  );
  const selectableServiceCount = catalogSelectableServices.length;
  const selectedSelectableCount = catalogSelectableServices.filter((service) =>
    selectedServiceHeads.includes(service)
  ).length;
  const selectedSurchargeHeads: string[] = Array.from(
    new Set<string>(form.surchargeRules.map((rule) => rule.name))
  );
  const allCatalogServicesSelected =
    catalogSelectableServices.length > 0 &&
    catalogSelectableServices.every((service) => selectedServiceHeads.includes(service));
  const allSurchargesSelected =
    SURCHARGE_HEAD_OPTIONS.length > 0 &&
    SURCHARGE_HEAD_OPTIONS.every((option) => selectedSurchargeHeads.includes(option.name));
  const surchargeGroups = selectedSurchargeHeads.map((name) => ({
    name,
    rules: form.surchargeRules.filter((rule) => rule.name === name),
  }));
  const surchargeCatalogGroups = FEE_SURCHARGE_GROUP_ORDER.map((group) => ({
    group,
    options: SURCHARGE_HEAD_OPTIONS.filter((option) => option.group === group),
  })).filter((entry) => entry.options.length > 0);
  const criteriaRule = form.serviceRules.find((rule) => rule.id === criteriaRuleId);
  const criteriaRulePrimary = criteriaRule ? resolveMatrixPrimary(criteriaRule) : null;
  const criteriaRulePrimaryKey =
    criteriaRulePrimary && criteriaRulePrimary.mode !== 'TOW_INCLUDED'
      ? criteriaRulePrimary.key
      : '';
  const criteriaRuleConditions = (criteriaRule?.conditions ?? [])
    .map((condition, index) => ({ condition, index }))
    .filter(({ condition }) => condition.criterionKey !== criteriaRulePrimaryKey);
  const criteriaRuleUsedKeys = new Set(
    criteriaRuleConditions.map(({ condition }) => condition.criterionKey)
  );
  const canAddCriteriaRuleCondition = (form.priceCriteria ?? []).some(
    (criterion) =>
      criterion.role !== 'SURCHARGE' &&
      criterion.key !== criteriaRulePrimaryKey &&
      !criteriaRuleUsedKeys.has(criterion.key)
  );

  const criteriaModalValidation = useMemo(
    () =>
      validateAdditionalCriteriaConditions(
        criteriaRuleConditions.map(({ condition }) => condition),
        form.priceCriteria ?? []
      ),
    [criteriaRuleConditions, form.priceCriteria]
  );

  useEffect(() => {
    if (readOnly || !criteriaRuleId || !criteriaRule) return;
    const priceCriteria = form.priceCriteria ?? [];
    let changed = false;
    const nextConditions = (criteriaRule.conditions ?? []).map((condition) => {
      if (condition.criterionKey === criteriaRulePrimaryKey) return condition;
      const criterion = priceCriteria.find((item) => item.key === condition.criterionKey);
      const allowed = allowedOperatorsForCriterion(criterion);
      if (allowed.includes(condition.operator)) return condition;
      changed = true;
      if (criterion?.valueType === 'RANGE' || criterion?.valueType === 'TIME') {
        return {
          ...condition,
          ...betweenConditionDefaults(),
          criterionKey: condition.criterionKey,
          criterionLabel: condition.criterionLabel,
        };
      }
      return {
        ...condition,
        operator: '=' as const,
        value: defaultValueForOperator('=', criterion?.allowedValues),
      };
    });
    if (changed) {
      updateServiceRule(criteriaRuleId, { conditions: nextConditions });
    }
    // Chỉ chuẩn hóa khi mở modal / đổi dòng
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaRuleId, readOnly]);

  useEffect(() => {
    if (!skipsPriceMatrixTabs) return;
    if (activeTab !== 'general' && activeTab !== 'history') {
      setActiveTab('general');
    }
  }, [skipsPriceMatrixTabs, activeTab]);

  const completeCriteriaModal = () => {
    const result = validateAdditionalCriteriaConditions(
      criteriaRuleConditions.map(({ condition }) => condition),
      form.priceCriteria ?? []
    );
    if (!result.ok) {
      setCriteriaModalError(result.message);
      return;
    }
    setCriteriaModalError('');
    setCriteriaRuleId(null);
  };

  const handleAddCriteriaRuleCondition = () => {
    if (!criteriaRule) return;
    const result = validateAdditionalCriteriaConditions(
      criteriaRuleConditions.map(({ condition }) => condition),
      form.priceCriteria ?? []
    );
    if (!result.ok) {
      setCriteriaModalError(
        `${result.message}. Hãy hoàn thiện trước khi thêm tiêu chí mới.`
      );
      return;
    }
    if (!canAddCriteriaRuleCondition) {
      setCriteriaModalError('Đã dùng hết tiêu chí có thể thêm cho dòng giá này');
      return;
    }
    setCriteriaModalError('');
    addPriceCondition(criteriaRule.id);
  };

  if (readOnly && id && !liveTable) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Không tìm thấy bảng phí.</p>
        <button
          type="button"
          onClick={() => navigate('/rescue-fee-config')}
          className="text-sm font-bold text-vetc-green"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 w-full min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/rescue-fee-config')}
            className="p-2 border rounded hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-800 uppercase tracking-tight">
              {readOnly
                ? 'Chi tiết bảng phí'
                : isEdit
                  ? 'Chỉnh sửa bảng phí'
                  : 'Tạo bảng phí'}
            </h1>
            {readOnly && (
              <p className="text-xs text-gray-500">
                {form.code} · v{form.version} ·{' '}
                {FEE_OBJECT_TYPE_LABELS[form.objectType] ?? form.objectType} ·{' '}
                {FEE_ORDER_TYPE_LABELS[form.orderType] ?? form.orderType}
                {form.settings.isFallback ? ' (fallback)' : ''}
                {isHistoricalView ? ' · đang xem bản cũ' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {readOnly ? (
            !isHistoricalView && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!form.id) return;
                    const copy = clonePriceTable(form.id);
                    if (copy) navigate('/rescue-fee-config/create', { state: { clonedTable: copy } });
                  }}
                  className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 rounded text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  <Copy size={14} /> Nhân bản
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/rescue-fee-config/edit/${form.id}`)}
                  className="inline-flex items-center gap-2 bg-vetc-green text-white px-4 py-2 rounded text-sm font-bold hover:bg-green-700"
                >
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              </>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => openTableImport('json')}
                className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-vetc-green hover:text-vetc-green"
              >
                <FileJson size={15} />
                Import JSON bảng
              </button>
              <button
                type="button"
                onClick={() => openTableImport('excel')}
                className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-vetc-green hover:text-vetc-green"
              >
                <FileSpreadsheet size={15} />
                Import Excel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 bg-vetc-green text-white px-5 py-2 rounded font-bold text-sm hover:bg-green-700 shadow-sm"
              >
                <Save size={16} />
                Lưu bảng phí
              </button>
            </>
          )}
        </div>
      </div>

      {isHistoricalView && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-bold">Đang xem version {form.version}</span>
            <span className="text-amber-800">
              {' '}
              (chỉ đọc) — nội dung bảng phí tại thời điểm phát hành, không chỉnh sửa được.
            </span>
          </div>
          <button
            type="button"
            onClick={backToCurrentVersion}
            className="shrink-0 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
          >
            Về bản hiện tại
          </button>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {!readOnly && (
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleExcelFileSelected(file);
          e.target.value = '';
        }}
      />
      )}

      {!readOnly && tableImportOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Import bảng phí đối tác</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Nạp toàn bộ dịch vụ, tiêu chí và phụ phí vào bảng hiện tại.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTableImportOpen(false)}
                className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setTableImportMode('json');
                  if (!tableImportJsonText) {
                    setTableImportJsonText(JSON.stringify(buildPartnerTableSample(), null, 2));
                  }
                }}
                className={`rounded px-3 py-1.5 text-xs font-bold ${
                  tableImportMode === 'json'
                    ? 'bg-vetc-green text-white'
                    : 'border bg-white text-gray-600'
                }`}
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => setTableImportMode('excel')}
                className={`rounded px-3 py-1.5 text-xs font-bold ${
                  tableImportMode === 'excel'
                    ? 'bg-vetc-green text-white'
                    : 'border bg-white text-gray-600'
                }`}
              >
                Excel
              </button>
              <div className="ml-auto flex min-w-[220px] max-w-full flex-1 items-center gap-2 sm:max-w-sm">
                <label className="whitespace-nowrap text-[10px] font-bold uppercase text-gray-500">
                  Demo lỗi
                </label>
                <select
                  value={tableImportDemoCase}
                  onChange={(e) => {
                    const value = e.target.value as TableImportDemoCaseId | '';
                    if (!value) {
                      setTableImportDemoCase('');
                      return;
                    }
                    previewTableImportDemoCase(value);
                  }}
                  className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 outline-none focus:border-vetc-green"
                >
                  <option value="">Chọn case để xem…</option>
                  {TABLE_IMPORT_DEMO_CASES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {tableImportMode === 'json' ? (
                <>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-gray-600">
                    JSON bảng phí <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={tableImportJsonText}
                    onChange={(e) => {
                      setTableImportJsonText(e.target.value);
                      setTableImportIssues([]);
                      setTableImportDemoCase('');
                    }}
                    rows={18}
                    spellCheck={false}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-gray-700 outline-none focus:border-vetc-green"
                  />
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                    Object gồm <code>code</code>, <code>name</code>, <code>target</code> (
                    {FEE_TARGET_LABELS.PARTNER}), <code>services[]</code>, <code>surcharges[]</code>,{' '}
                    <code>priceCriteria[]</code>. Import sẽ thay thế dòng giá/phụ phí tương ứng.
                    {tableImportDemoCase && tableImportDemoCase !== 'ok' && (
                      <span className="mt-1 block font-semibold text-amber-800">
                        Đang xem demo lỗi — banner đỏ bên dưới đã preview; bấm Áp dụng sẽ validate lại
                        (không ghi form nếu còn lỗi).
                      </span>
                    )}
                    {tableImportDemoCase === 'ok' && (
                      <span className="mt-1 block font-semibold text-vetc-green">
                        Case hợp lệ — bấm Áp dụng để nạp vào bảng phí.
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <FileSpreadsheet size={28} className="mx-auto text-vetc-green" />
                    <p className="mt-3 text-sm font-semibold text-gray-700">
                      Chọn file Excel bảng phí đối tác
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Hỗ trợ .xlsx, .xls, .csv · Sheet bắt buộc: ThongTin, DichVu, PhuPhi (HuongDan tùy chọn)
                    </p>
                    {tableImportFileName && (
                      <p className="mt-2 text-xs font-semibold text-vetc-green">
                        Đã chọn: {tableImportFileName}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => excelInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded bg-vetc-green px-4 py-2 text-xs font-bold text-white"
                      >
                        <Upload size={14} /> Chọn file
                      </button>
                      <button
                        type="button"
                        onClick={downloadPartnerExcelTemplate}
                        className="inline-flex items-center gap-2 rounded border bg-white px-4 py-2 text-xs font-bold text-gray-600"
                      >
                        <Download size={14} /> Tải template
                      </button>
                    </div>
                  </div>
                  {tableImportJsonText && (
                    <div>
                      <label className="mb-1 block text-[11px] font-bold uppercase text-gray-600">
                        Dữ liệu đã đọc từ Excel
                      </label>
                      <textarea
                        value={tableImportJsonText}
                        onChange={(e) => setTableImportJsonText(e.target.value)}
                        rows={12}
                        spellCheck={false}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-gray-700 outline-none focus:border-vetc-green"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {tableImportIssues.length > 0 && (
              <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-xs text-red-700">
                <p className="font-bold">
                  Không thể import — {tableImportIssues.length} lỗi
                </p>
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-4">
                  {tableImportIssues.map((issue, index) => (
                    <li key={`${issue.sheet}-${issue.field}-${issue.row ?? 'x'}-${index}`}>
                      {formatFeeTableImportIssue(issue)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setTableImportOpen(false)}
                className="rounded border bg-white px-4 py-2 text-xs font-bold text-gray-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={applyTableImportJson}
                disabled={!tableImportJsonText.trim()}
                className="rounded bg-vetc-green px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Áp dụng vào bảng phí
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg shadow-sm overflow-hidden bg-white">
        <div className="flex items-center overflow-x-auto border-b bg-gray-50/80">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-vetc-green text-vetc-green bg-green-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <div className="space-y-4 bg-gray-50 p-4">
            <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0 space-y-4">
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader title="Thông tin chung" number={1} />
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={labelClass}>Mã bảng *</label>
                  <input
                    className={inputClass}
                    value={form.code}
                    onChange={(e) => update('code', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Tên bảng *</label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Đối tượng tính</label>
                  <AppSelect
                    value={form.target}
                    options={[
                      { value: 'CUSTOMER', label: 'Khách hàng' },
                      { value: 'PARTNER', label: 'Đối tác cứu hộ' },
                    ]}
                    onChange={(value) => {
                      const target = value as FeeTarget;
                      setForm((prev) => ({
                        ...prev,
                        target,
                        objectType: defaultObjectTypeByTarget(target),
                        scope: {
                          ...prev.scope,
                          ...(target === 'CUSTOMER'
                            ? { partnerId: undefined, partnerName: undefined }
                            : { corporateCustomerId: undefined }),
                        },
                        settings: {
                          ...prev.settings,
                          retailMarkupFactor:
                            target === 'CUSTOMER' ? prev.settings.retailMarkupFactor : 0,
                        },
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Loại đối tượng</label>
                  <AppSelect
                    value={form.objectType ?? defaultObjectTypeByTarget(form.target)}
                    options={OBJECT_TYPE_OPTIONS_BY_TARGET[form.target]}
                    onChange={(value) => {
                      const nextType =
                        (value as FeeObjectType | '') || defaultObjectTypeByTarget(form.target);
                      setForm((prev) => ({
                        ...prev,
                        objectType: nextType,
                        scope: {
                          ...prev.scope,
                          ...(nextType === 'CUSTOMER_BUSINESS'
                            ? { partnerId: undefined, partnerName: undefined }
                            : nextType.startsWith('PARTNER_')
                              ? { corporateCustomerId: undefined }
                              : {
                                  partnerId: undefined,
                                  partnerName: undefined,
                                  corporateCustomerId: undefined,
                                }),
                        },
                      }));
                    }}
                  />
                </div>
                {form.objectType === 'CUSTOMER_BUSINESS' ||
                (form.objectType ?? '').startsWith('PARTNER_') ||
                (!form.objectType && form.target === 'PARTNER') ? (
                  <div>
                    <label className={labelClass}>
                      {(form.objectType ?? defaultObjectTypeByTarget(form.target)).startsWith(
                        'PARTNER_'
                      )
                        ? 'Đối tác cứu hộ'
                        : 'Doanh nghiệp'}
                    </label>
                    {(form.objectType ?? defaultObjectTypeByTarget(form.target)).startsWith(
                      'PARTNER_'
                    ) ? (
                      <AppSelect
                        value={form.scope.partnerId ?? ''}
                        placeholder="Chọn đối tác cứu hộ"
                        options={[
                          ...FEE_PARTNER_OPTIONS.map((item) => ({
                            value: item.id,
                            label: `${item.id} — ${item.name}`,
                          })),
                          ...(form.scope.partnerId &&
                          !FEE_PARTNER_OPTIONS.some((item) => item.id === form.scope.partnerId)
                            ? [
                                {
                                  value: form.scope.partnerId,
                                  label: `${form.scope.partnerId}${
                                    form.scope.partnerName
                                      ? ` — ${form.scope.partnerName}`
                                      : ''
                                  }`,
                                },
                              ]
                            : []),
                        ]}
                        onChange={(value) => {
                          const selected = FEE_PARTNER_OPTIONS.find((item) => item.id === value);
                          update('scope', {
                            ...form.scope,
                            partnerId: value || undefined,
                            partnerName:
                              selected?.name ?? (value ? form.scope.partnerName : undefined),
                            corporateCustomerId: undefined,
                          });
                        }}
                      />
                    ) : (
                      <AppSelect
                        value={form.scope.corporateCustomerId ?? ''}
                        placeholder="Chọn doanh nghiệp"
                        options={[
                          ...FEE_CORPORATE_CUSTOMER_OPTIONS.map((item) => ({
                            value: item.code,
                            label: `${item.code} — ${item.name}`,
                          })),
                          ...(form.scope.corporateCustomerId &&
                          !FEE_CORPORATE_CUSTOMER_OPTIONS.some(
                            (item) => item.code === form.scope.corporateCustomerId
                          )
                            ? [
                                {
                                  value: form.scope.corporateCustomerId,
                                  label: form.scope.corporateCustomerId,
                                },
                              ]
                            : []),
                        ]}
                        onChange={(value) =>
                          update('scope', {
                            ...form.scope,
                            corporateCustomerId: value || undefined,
                            partnerId: undefined,
                            partnerName: undefined,
                          })
                        }
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>Đối tượng áp dụng</label>
                    <input
                      className={`${inputClass} bg-gray-50 text-gray-500`}
                      value="Không áp dụng — khách cá nhân"
                      readOnly
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass}>Loại đơn</label>
                  <AppSelect
                    value={
                      form.orderType === 'PACKAGE_SINGLE'
                        ? 'PACKAGE'
                        : form.orderType ?? 'PACKAGE'
                    }
                    options={ORDER_TYPE_OPTIONS}
                    onChange={(value) =>
                      update('orderType', (value as FeeOrderType | '') || 'PACKAGE')
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Trạng thái</label>
                  <AppSelect
                    value={form.status}
                    options={(Object.keys(FEE_STATUS_LABELS) as FeeTableStatus[]).map((key) => ({
                      value: key,
                      label: FEE_STATUS_LABELS[key],
                    }))}
                    onChange={(value) => update('status', (value as FeeTableStatus) || 'ACTIVE')}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phiên bản</label>
                  <input
                    type="number"
                    className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-500`}
                    value={form.version}
                    readOnly
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Hiệu lực từ</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.validFrom}
                      onChange={(e) => update('validFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hiệu lực đến</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={form.validTo}
                      onChange={(e) => update('validTo', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader title="Tham số tính của bảng phí" number={2} />
              <div className="space-y-4 p-4">
                {form.target === 'CUSTOMER' && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={usesMarkupOnly}
                      onChange={(e) => setRetailMarkupOnlyMode(e.target.checked)}
                    />
                    <span className="text-sm leading-relaxed text-gray-700">
                      <span className="font-semibold text-gray-900">
                        Chỉ áp dụng hệ số giá khách lẻ
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Bật: đơn dùng hệ số × giá, không cấu hình ma trận dòng giá / phụ phí. Tắt:
                        cấu hình bảng phí đầy đủ — hai chế độ loại trừ nhau.
                      </span>
                    </span>
                  </label>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {form.target === 'CUSTOMER' && (
                <div>
                  <label className={labelClass}>Hệ số giá khách lẻ</label>
                  <input
                    type="number"
                    min="1"
                    step="0.05"
                    disabled={!usesMarkupOnly}
                    className={`${inputClass} ${!usesMarkupOnly ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
                    value={usesMarkupOnly ? form.settings.retailMarkupFactor : ''}
                    placeholder={usesMarkupOnly ? undefined : '—'}
                    onChange={(e) =>
                      update('settings', {
                        ...form.settings,
                        retailMarkupFactor: Number(e.target.value) || 1,
                      })
                    }
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    {usesMarkupOnly
                      ? 'Phí KH = giá NCC (hoặc Public theo policy) × hệ số'
                      : 'Chỉ nhập khi bật "Chỉ áp dụng hệ số giá khách lẻ"'}
                  </p>
                </div>
                )}
                <div>
                  <label className={labelClass}>Quy tắc làm tròn</label>
                  <AppSelect
                    value={form.settings.roundMode}
                    options={[
                      { value: 'NEAREST_1000', label: 'Đến 1.000 đồng' },
                      { value: 'NEAREST_100', label: 'Đến 100 đồng' },
                      { value: 'NONE', label: 'Không làm tròn' },
                    ]}
                    onChange={(value) =>
                      update('settings', {
                        ...form.settings,
                        roundMode: value as RoundMode,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Cách tính hệ số phụ phí</label>
                  <AppSelect
                    value={form.settings.stackSurcharges ? 'STACK' : 'MAX'}
                    options={[
                      { value: 'STACK', label: 'Nhân hệ số' },
                      { value: 'MAX', label: 'Hệ số cao nhất' },
                    ]}
                    onChange={(value) =>
                      update('settings', {
                        ...form.settings,
                        stackSurcharges: value === 'STACK',
                      })
                    }
                    disabled={readOnly || skipsPriceMatrixTabs}
                  />
                  {skipsPriceMatrixTabs && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      Không áp dụng — bảng chỉ dùng hệ số giá khách lẻ.
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Giá đã bao gồm VAT?</label>
                  <AppSelect
                    value={form.settings.includesVat ? 'INCLUDED' : 'EXCLUDED'}
                    options={[
                      { value: 'INCLUDED', label: 'Đã bao gồm VAT' },
                      { value: 'EXCLUDED', label: 'Chưa bao gồm VAT' },
                    ]}
                    onChange={(value) =>
                      update('settings', {
                        ...form.settings,
                        includesVat: value === 'INCLUDED',
                      })
                    }
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    Cờ khai báo trên bảng; mức giá cấu hình được hiểu theo lựa chọn này.
                  </p>
                </div>
                </div>
              </div>
              {skipsPriceMatrixTabs && (
                <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
                  <span className="font-bold">Chế độ chỉ hệ số:</span> không cấu hình{' '}
                  <span className="font-semibold">Đơn giá</span> và{' '}
                  <span className="font-semibold">Phụ phí</span>. Phí KH trên đơn =
                  giá cơ sở × hệ số{' '}
                  <span className="font-bold">{form.settings.retailMarkupFactor}</span>.
                </div>
              )}
              {!skipsPriceMatrixTabs && usesRetailMarkupOnlyPricing(form) && (
                <div className="border-t border-blue-100 bg-blue-50 px-4 py-3 text-[11px] leading-relaxed text-blue-900">
                  <span className="font-bold">Chế độ bảng phí đầy đủ:</span> cấu hình ma trận dòng
                  giá / phụ phí bên dưới. Không dùng hệ số giá khách lẻ trên bảng này.
                </div>
              )}
            </div>

            {!skipsPriceMatrixTabs && (
            <>
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader title="Danh mục áp dụng trong bảng phí" number={3} />
              <div className="space-y-4 p-4">
                <p className="text-xs text-gray-500">
                  Chọn trước các đầu dịch vụ và phụ phí. Hệ thống sẽ tạo dòng cấu hình tương ứng
                  tại tab 2 và tab 3.
                </p>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-gray-50/50 p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-gray-700">Đầu dịch vụ</div>
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {selectedSelectableCount}/{selectableServiceCount} dịch vụ đã chọn
                        </div>
                      </div>
                      {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          allCatalogServicesSelected
                            ? clearAllServiceHeads()
                            : selectAllServiceHeads()
                        }
                        className="shrink-0 rounded border border-vetc-green bg-white px-2.5 py-1 text-[10px] font-bold text-vetc-green hover:bg-green-50"
                      >
                        {allCatalogServicesSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {SERVICE_OPTIONS.filter((option) => option.children?.length).map(
                        (option) => {
                          const children = [...(option.children ?? [])];
                          const isCategoryOnly = isMatrixCategoryService(option.type);
                          const parentSelected =
                            selectedServiceHeads.includes(option.value) ||
                            form.serviceRules.some(
                              (rule) =>
                                resolveMatrixServiceHead(rule.serviceDetail) === option.value
                            );
                          const selectedChildren = children.filter((child) =>
                            selectedServiceHeads.includes(child)
                          );
                          const allChildrenSelected =
                            children.length > 0 && selectedChildren.length === children.length;
                          const someSelected = isCategoryOnly
                            ? parentSelected
                            : selectedChildren.length > 0;
                          const parentChecked = isCategoryOnly
                            ? parentSelected
                            : allChildrenSelected;

                          return (
                            <div
                              key={option.value}
                              className={`rounded-lg border p-3 ${
                                someSelected
                                  ? 'border-green-200 bg-green-50/40'
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-800">
                                <input
                                  type="checkbox"
                                  className="accent-vetc-green"
                                  checked={parentChecked}
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate =
                                        !isCategoryOnly &&
                                        someSelected &&
                                        !allChildrenSelected;
                                    }
                                  }}
                                  onChange={(e) =>
                                    toggleServiceParent(option.value, e.target.checked)
                                  }
                                />
                                <span className="font-bold">{option.value}</span>
                                {!isCategoryOnly && (
                                  <span className="text-[10px] font-medium text-gray-500">
                                    {selectedChildren.length}/{children.length} dịch vụ con
                                  </span>
                                )}
                              </label>
                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {children.map((child) => {
                                  if (isCategoryOnly) {
                                    return (
                                      <div
                                        key={child}
                                        className="rounded-lg border border-gray-100 bg-white/80 px-3 py-2 text-xs text-gray-600"
                                      >
                                        <span className="font-medium">{child}</span>
                                      </div>
                                    );
                                  }
                                  const checked = selectedServiceHeads.includes(child);
                                  return (
                                    <label
                                      key={child}
                                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                                        checked
                                          ? 'border-green-200 bg-green-50 text-green-800'
                                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        className="accent-vetc-green"
                                        checked={checked}
                                        onChange={(e) =>
                                          toggleServiceHead(child, e.target.checked)
                                        }
                                      />
                                      <span className="font-semibold">{child}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                      )}
                      {orphanServiceHeads.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                            Dịch vụ ngoài danh mục
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {orphanServiceHeads.map((service) => (
                              <label
                                key={service}
                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800"
                              >
                                <input
                                  type="checkbox"
                                  className="accent-vetc-green"
                                  checked
                                  onChange={(e) =>
                                    toggleServiceHead(service, e.target.checked)
                                  }
                                />
                                <span className="font-semibold">{service}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-gray-50/50 p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-gray-700">Đầu phụ phí</div>
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {selectedSurchargeHeads.length}/{SURCHARGE_HEAD_OPTIONS.length} phụ phí đã chọn
                        </div>
                      </div>
                      {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          allSurchargesSelected
                            ? clearAllSurchargeHeads()
                            : selectAllSurchargeHeads()
                        }
                        className="shrink-0 rounded border border-blue-500 bg-white px-2.5 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50"
                      >
                        {allSurchargesSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {surchargeCatalogGroups.map(({ group, options }) => (
                        <div key={group} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                            {group}
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {options.map((option) => {
                              const checked = selectedSurchargeHeads.includes(option.name);
                              return (
                                <label
                                  key={option.name}
                                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                                    checked
                                      ? 'border-blue-200 bg-blue-50 text-blue-800'
                                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    className="accent-vetc-green"
                                    checked={checked}
                                    onChange={(e) =>
                                      toggleSurchargeHead(option.name, e.target.checked)
                                    }
                                  />
                                  <span className="font-semibold">{option.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader
                title="Tiêu chí bổ sung"
                number={4}
                actions={
                  <button
                    type="button"
                    onClick={() => navigate('/rescue-fee-criteria')}
                    className="rounded border border-white/40 bg-white/10 px-3 py-1 text-[10px] font-bold text-white hover:bg-white/20"
                  >
                    Quản lý danh mục
                  </button>
                }
              />
              <div className="space-y-3 p-4">
                <p className="text-xs text-gray-500">
                  Khai báo các chiều tiêu chí dùng cho dòng giá và phụ phí ở các tab tiếp theo.
                  Giá trị lấy từ danh mục hệ thống.
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {feeCriterionDefinitions
                    .filter((definition) => definition.status === 'ACTIVE')
                    .filter(
                      (definition) =>
                        definition.key !== 'seat_number' && definition.key !== 'load_capacity'
                    )
                    .map((definition) => {
                      const selected = (form.priceCriteria ?? []).find(
                        (criterion) => criterion.key === definition.key
                      );
                      return (
                        <div
                          key={definition.id}
                          className={`rounded-lg border p-3 transition-colors ${
                            selected
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              className="accent-vetc-green"
                              checked={Boolean(selected)}
                              onChange={(e) =>
                                toggleMatrixCriterion(
                                  definition.label,
                                  definition.key,
                                  e.target.checked
                                )
                              }
                            />
                            <span className="min-w-0 flex-1 font-semibold leading-snug">
                              {definition.label}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
            </>
            )}
            </fieldset>
          </div>
        )}

        {activeTab === 'matrix' && !skipsPriceMatrixTabs && (
          <div className="space-y-4 bg-gray-50 p-4">
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader
                title="Đơn giá"
                number={1}
              />
              <div className="space-y-3 border-b bg-white px-4 py-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[200px] flex-1">
                    <label className={labelClass}>Tìm kiếm</label>
                    <div className="relative">
                      <Search
                        size={13}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        className={`${inputClass} pl-8`}
                        placeholder="Dịch vụ, tiêu chí, giá…"
                        value={matrixKeyword}
                        onChange={(e) => setMatrixKeyword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-[140px]">
                    <label className={labelClass}>Phương pháp tính</label>
                    <select
                      className={inputClass}
                      value={matrixPricingMode}
                      onChange={(e) =>
                        setMatrixPricingMode(e.target.value as '' | ServicePricingMode)
                      }
                    >
                      <option value="">Tất cả</option>
                      <option value="FIXED">{SERVICE_PRICING_MODE_LABELS.FIXED}</option>
                      <option value="PER_UNIT">{SERVICE_PRICING_MODE_LABELS.PER_UNIT}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <label className={labelClass}>Loại DV</label>
                    <select
                      className={inputClass}
                      value={matrixServiceType}
                      onChange={(e) =>
                        setMatrixServiceType(e.target.value as '' | ServiceType)
                      }
                    >
                      <option value="">Tất cả</option>
                      <option value="ONSITE">Hỗ trợ tại chỗ</option>
                      <option value="TOWING">Kéo xe</option>
                      <option value="CRANE">Cẩu xe</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Đầu dịch vụ</label>
                    <select
                      className={inputClass}
                      value={matrixServiceDetail}
                      onChange={(e) => setMatrixServiceDetail(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {matrixServiceHeads.map((serviceDetail) => (
                        <option key={serviceDetail} value={serviceDetail}>
                          {serviceDetail}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Loại xe khách</label>
                    <select
                      className={inputClass}
                      value={matrixVehicleType}
                      onChange={(e) => setMatrixVehicleType(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {matrixVehicleTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Loại xe cứu hộ</label>
                    <select
                      className={inputClass}
                      value={matrixRescueVehicleType}
                      onChange={(e) => setMatrixRescueVehicleType(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {matrixRescueVehicleTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Số chỗ</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={inputClass}
                      placeholder="VD: 5"
                      value={matrixSeatNumber}
                      onChange={(e) => setMatrixSeatNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Trọng tải</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputClass}
                        placeholder="VD: 2.5"
                        value={matrixLoadCapacity}
                        onChange={(e) => setMatrixLoadCapacity(e.target.value)}
                      />
                      {hasMatrixFilter && (
                        <button
                          type="button"
                          onClick={clearMatrixFilters}
                          className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-gray-600 hover:border-vetc-green hover:text-vetc-green"
                          title="Xóa lọc"
                        >
                          <X size={12} />
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500">
                  Hiển thị {filteredMatrixRules.length}/{form.serviceRules.length} dòng giá
                  {hasMatrixFilter ? ' (đã lọc)' : ''}
                </div>
              </div>
              <div className="space-y-4 p-4">
                {filteredMatrixServiceHeads.map((serviceDetail, serviceIndex) => {
                  const serviceRules = filteredMatrixRules.filter(
                    (rule) => resolveMatrixServiceHead(rule.serviceDetail) === serviceDetail
                  );
                  const serviceType = serviceRules[0]?.serviceType ?? 'ONSITE';
                  const totalServiceRules = form.serviceRules.filter(
                    (rule) => resolveMatrixServiceHead(rule.serviceDetail) === serviceDetail
                  ).length;
                  const serviceUsesTiered =
                    canUseTieredSegment(serviceType) &&
                    form.serviceRules.some(
                      (rule) =>
                        resolveMatrixServiceHead(rule.serviceDetail) === serviceDetail &&
                        (rule.segmentType ?? defaultPriceSegmentType(rule.serviceType)) ===
                          'TIERED'
                    );
                  return (
                    <div key={serviceDetail} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vetc-green text-xs font-black text-white">
                            {serviceIndex + 1}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-800">{serviceDetail}</div>
                            <div className="text-[10px] text-gray-500">
                              {SERVICE_CONFIG[serviceType].label} · {serviceRules.length}
                              {hasMatrixFilter && serviceRules.length !== totalServiceRules
                                ? `/${totalServiceRules}`
                                : ''}{' '}
                              dòng giá
                            </div>
                          </div>
                        </div>
                        {!readOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addPriceLineForService(serviceDetail)}
                            className="inline-flex items-center gap-1 rounded border border-vetc-green bg-white px-3 py-1.5 text-[10px] font-bold text-vetc-green hover:bg-green-50"
                            title="Thêm dòng phí mới cho dịch vụ này"
                          >
                            <Plus size={13} />
                            Thêm dòng
                          </button>
                          <button
                            type="button"
                            onClick={() => openImportJson(serviceDetail)}
                            className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-600 hover:border-vetc-green hover:text-vetc-green"
                          >
                            <FileJson size={13} />
                            Import JSON
                          </button>
                        </div>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1220px] border-collapse text-xs">
                          <thead>
                            <tr className="bg-white text-[10px] font-bold uppercase tracking-wide text-gray-600">
                              {!readOnly && (
                              <th className="w-[40px] border-b border-r px-2 py-2 text-center" title="Kéo thả để sắp xếp">
                                <GripVertical size={12} className="mx-auto text-gray-400" />
                              </th>
                              )}
                              <th className="w-[120px] border-b border-r px-3 py-2 text-left">Loại đoạn giá</th>
                              <th className="w-[300px] border-b border-r px-3 py-2 text-left">Tiêu chí chính</th>
                              <th className="w-[130px] border-b border-r px-3 py-2 text-left">Phương pháp tính</th>
                              <th className="w-[130px] border-b border-r px-3 py-2 text-right">Mức giá</th>
                              <th className={`border-b ${readOnly ? '' : 'border-r'} px-3 py-2 text-left`}>Tiêu chí bổ sung</th>
                              {!readOnly && (
                              <th className="w-[112px] border-b px-3 py-2 text-center">Thao tác</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                    {serviceRules.map((rule) => {
                      const primaryConfig = resolveMatrixPrimary(rule);
                      const configuredPrimary = primaryConfig
                        ? (rule.conditions ?? []).find(
                            (condition) => condition.criterionKey === primaryConfig.key
                          )
                        : null;
                      const fallbackPrimary =
                        primaryConfig && primaryConfig.mode === 'RANGE'
                          ? buildPrimaryCondition(rule.serviceType)
                          : primaryConfig && primaryConfig.mode === 'LIST'
                            ? ({
                                criterionKey: primaryConfig.key,
                                criterionLabel: primaryConfig.label,
                                operator: '=' as const,
                                value: primaryConfig.values[0] ?? '',
                              } satisfies FeeRuleCondition)
                            : null;
                      const primaryCondition =
                        primaryConfig?.mode === 'TOW_INCLUDED'
                          ? null
                          : configuredPrimary ?? fallbackPrimary;
                      const additionalConditions = (rule.conditions ?? [])
                        .map((condition, index) => ({ condition, index }))
                        .filter(({ condition }) => {
                          if (!primaryConfig || primaryConfig.mode === 'TOW_INCLUDED') return true;
                          return condition.criterionKey !== primaryConfig.key;
                        });
                      const primaryUnit = rule.serviceType === 'CRANE' ? 'm' : 'km';
                      const isDragging = draggedPriceRuleId === rule.id;
                      const isDragOver =
                        dragOverPriceRuleId === rule.id && draggedPriceRuleId !== rule.id;

                      return (
                        <tr
                          key={rule.id}
                          draggable={!readOnly}
                          onDragStart={() => {
                            if (readOnly) return;
                            setDraggedPriceRuleId(rule.id);
                          }}
                          onDragEnd={() => {
                            setDraggedPriceRuleId(null);
                            setDragOverPriceRuleId(null);
                          }}
                          onDragOver={(e) => {
                            if (readOnly) return;
                            e.preventDefault();
                            if (dragOverPriceRuleId !== rule.id) {
                              setDragOverPriceRuleId(rule.id);
                            }
                          }}
                          onDrop={(e) => {
                            if (readOnly) return;
                            e.preventDefault();
                            if (draggedPriceRuleId) {
                              reorderServiceRules(serviceDetail, draggedPriceRuleId, rule.id);
                            }
                            setDraggedPriceRuleId(null);
                            setDragOverPriceRuleId(null);
                          }}
                          className={`align-top even:bg-gray-50/40 ${
                            isDragging ? 'opacity-50' : ''
                          } ${isDragOver ? 'bg-green-50 ring-1 ring-inset ring-vetc-green/40' : ''}`}
                        >
                          {!readOnly && (
                          <td className="border-b border-r p-2">
                            <div
                              className="mx-auto flex h-[34px] w-full cursor-grab items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:cursor-grabbing"
                              title="Kéo để sắp xếp dòng giá"
                            >
                              <GripVertical size={14} />
                            </div>
                          </td>
                          )}
                          <td className="border-b border-r p-2">
                            <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
                            <AppSelect
                              value={
                                serviceUsesTiered
                                  ? 'TIERED'
                                  : rule.segmentType ??
                                    defaultPriceSegmentType(rule.serviceType)
                              }
                              disabled={
                                readOnly ||
                                !canUseTieredSegment(rule.serviceType) ||
                                serviceUsesTiered
                              }
                              options={
                                !canUseTieredSegment(rule.serviceType)
                                  ? [
                                      {
                                        value: 'SINGLE',
                                        label: PRICE_SEGMENT_TYPE_LABELS.SINGLE,
                                      },
                                    ]
                                  : serviceUsesTiered
                                    ? [
                                        {
                                          value: 'TIERED',
                                          label: PRICE_SEGMENT_TYPE_LABELS.TIERED,
                                        },
                                      ]
                                    : [
                                        {
                                          value: 'TIERED',
                                          label: PRICE_SEGMENT_TYPE_LABELS.TIERED,
                                        },
                                        {
                                          value: 'SINGLE',
                                          label: PRICE_SEGMENT_TYPE_LABELS.SINGLE,
                                        },
                                      ]
                              }
                              onChange={(value) =>
                                applySegmentType(rule.id, value as PriceSegmentType)
                              }
                              title={
                                !canUseTieredSegment(rule.serviceType)
                                  ? 'Dịch vụ hỗ trợ tại chỗ chỉ dùng Đơn lẻ'
                                  : serviceUsesTiered
                                    ? 'Kéo/Cẩu đang Bậc thang: mọi dòng cùng loại, không chọn Đơn lẻ'
                                    : 'Bậc thang: chuỗi khoảng cách. Đơn lẻ: một mức giá độc lập.'
                              }
                            />
                            </fieldset>
                          </td>
                          <td className="border-b border-r p-2">
                            <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
                            {primaryConfig?.mode === 'TOW_INCLUDED' ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-[72px] shrink-0 text-[10px] font-semibold text-gray-500">
                                    Km gồm
                                  </span>
                                  <div className="relative min-w-0 flex-1">
                                    <input
                                      type="number"
                                      className={`${inputClass} pr-8 text-right`}
                                      placeholder="10"
                                      title="Số km nằm trong giá mở cửa (vd. 10)"
                                      value={rule.includedKm ?? ''}
                                      onChange={(e) =>
                                        updateServiceRule(rule.id, {
                                          includedKm: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        })
                                      }
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                      km
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-[72px] shrink-0 text-[10px] font-semibold text-gray-500">
                                    Giá vượt
                                  </span>
                                  <div className="relative min-w-0 flex-1">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      className={`${inputClass} pr-8 text-right`}
                                      placeholder="20,000"
                                      title="Đơn giá mỗi km vượt mức Km gồm"
                                      value={
                                        rule.pricePerExtraKm
                                          ? rule.pricePerExtraKm.toLocaleString('en-US')
                                          : ''
                                      }
                                      onChange={(e) =>
                                        updateServiceRule(rule.id, {
                                          pricePerExtraKm:
                                            parseMoneyInput(e.target.value) || undefined,
                                        })
                                      }
                                    />
                                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
                                      đ/km
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[9px] leading-snug text-gray-400">
                                  Công thức: giá mở cửa + giá vượt × max(0, km − km gồm)
                                </div>
                              </div>
                            ) : primaryConfig?.mode === 'LIST' && primaryCondition ? (
                              <AppSelect
                                disabled={readOnly}
                                value={String(primaryCondition.value ?? '')}
                                options={primaryConfig.values.map((value) => ({
                                  value,
                                  label: value,
                                }))}
                                onChange={(value) =>
                                  updatePrimaryCondition(rule.id, primaryConfig.key, {
                                    operator: '=',
                                    criterionKey: primaryConfig.key,
                                    criterionLabel: primaryConfig.label,
                                    value,
                                  })
                                }
                              />
                            ) : !primaryConfig || !primaryCondition ? (
                              <div className="flex h-[34px] items-center rounded bg-gray-50 px-3 text-gray-400">
                                Không áp dụng
                              </div>
                            ) : (
                              <RangeBoundInputs
                                from={
                                  Array.isArray(primaryCondition.value)
                                    ? primaryCondition.value[0] ?? ''
                                    : primaryCondition.value ?? ''
                                }
                                to={
                                  Array.isArray(primaryCondition.value)
                                    ? primaryCondition.value[1] ?? ''
                                    : ''
                                }
                                fromInclusive={primaryCondition.fromInclusive}
                                toInclusive={primaryCondition.toInclusive}
                                unit={primaryUnit}
                                onChange={(patch) =>
                                  updatePrimaryCondition(rule.id, primaryConfig.key, {
                                    operator: 'BETWEEN',
                                    ...patch,
                                  })
                                }
                              />
                            )}
                            </fieldset>
                          </td>
                          <td className="border-b border-r p-2">
                            <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
                            <AppSelect
                              value={rule.serviceType === 'ONSITE' ? 'FIXED' : rule.pricingMode ?? 'FIXED'}
                              disabled={readOnly || rule.serviceType === 'ONSITE'}
                              options={[
                                { value: 'FIXED', label: SERVICE_PRICING_MODE_LABELS.FIXED },
                                { value: 'PER_UNIT', label: SERVICE_PRICING_MODE_LABELS.PER_UNIT },
                              ]}
                              onChange={(value) =>
                                updateServiceRule(rule.id, {
                                  pricingMode: value as ServicePricingMode,
                                  unit: SERVICE_CONFIG[rule.serviceType].unit,
                                })
                              }
                            />
                            </fieldset>
                          </td>
                          <td className="border-b border-r p-2">
                            <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
                            <input
                              type="text"
                              inputMode="numeric"
                              className={`${inputClass} text-right font-semibold`}
                              value={rule.basePrice ? rule.basePrice.toLocaleString('en-US') : ''}
                              onChange={(e) =>
                                updateServiceRule(rule.id, {
                                  basePrice: parseMoneyInput(e.target.value),
                                })
                              }
                              placeholder="0"
                            />
                            </fieldset>
                          </td>
                          <td className={`border-b ${readOnly ? '' : 'border-r'} p-2`}>
                            <div className="flex min-h-[34px] items-center gap-1.5">
                              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                                {additionalConditions.slice(0, 3).map(({ condition, index }) => (
                                  <span
                                    key={`${rule.id}-summary-${index}`}
                                    className="max-w-[320px] whitespace-normal break-words rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"
                                    title={formatConditionSummary(condition)}
                                  >
                                    {formatConditionSummary(condition)}
                                  </span>
                                ))}
                                {additionalConditions.length > 3 && (
                                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                                    +{additionalConditions.length - 3}
                                  </span>
                                )}
                                {additionalConditions.length === 0 && (
                                  <span className="text-[10px] text-gray-400">—</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCriteriaModalError('');
                                  setCriteriaRuleId(rule.id);
                                }}
                                title={
                                  readOnly
                                    ? `Xem tiêu chí bổ sung (${additionalConditions.length})`
                                    : `Cấu hình tiêu chí bổ sung (${additionalConditions.length})`
                                }
                                className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:border-vetc-green hover:text-vetc-green"
                              >
                                <SlidersHorizontal size={12} />
                                {additionalConditions.length > 0 && (
                                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-vetc-green px-0.5 text-[8px] font-bold leading-none text-white">
                                    {additionalConditions.length}
                                  </span>
                                )}
                              </button>
                            </div>
                          </td>
                          {!readOnly && (
                          <td className="border-b p-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => duplicateServiceRule(rule.id)}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                                title="Nhân bản dòng"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeServiceRule(rule.id)}
                                className="rounded p-1.5 text-red-500 hover:bg-red-50"
                                title="Xóa dòng"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                          )}
                        </tr>
                      );
                    })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                {form.serviceRules.length === 0 && (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-gray-400">
                    Chưa có đầu dịch vụ. Vui lòng chọn tại tab 1.
                  </div>
                )}
                {form.serviceRules.length > 0 && filteredMatrixRules.length === 0 && (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-gray-400">
                    Không có dòng giá khớp bộ lọc. Thử đổi điều kiện hoặc{' '}
                    <button
                      type="button"
                      onClick={clearMatrixFilters}
                      className="font-bold text-vetc-green hover:underline"
                    >
                      xóa lọc
                    </button>
                    .
                  </div>
                )}
              </div>
              {importServiceDetail && !readOnly && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
                  <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">
                          Import JSON — {importServiceDetail}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Dữ liệu import sẽ thay thế toàn bộ dòng giá của dịch vụ này.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportServiceDetail(null)}
                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto p-5">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase text-gray-600">
                          Điều kiện tính phí <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={importJsonText}
                          onChange={(e) => {
                            setImportJsonText(e.target.value);
                            setImportError('');
                          }}
                          rows={16}
                          spellCheck={false}
                          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-gray-700 outline-none focus:border-vetc-green"
                          placeholder={`[\n  {\n    "basePrice": 100000,\n    "pricingMode": "FIXED",\n    "from": 0,\n    "to": 10,\n    "conditions": {\n      "payload": [],\n      "seats": null,\n      "vehicleType": ""\n    }\n  }\n]`}
                        />
                      </div>
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
                        Mỗi dòng gồm: <code>primaryCriterion</code> (tiêu chí chính),{' '}
                        <code>pricingMode</code> (<code>FIXED</code>=Cố định,{' '}
                        <code>PER_UNIT</code>=Đơn vị), <code>segmentType</code> (
                        <code>TIERED</code>=Bậc thang / <code>SINGLE</code>=Đơn lẻ),{' '}
                        <code>basePrice</code> (mức giá),{' '}
                        <code>conditions</code> (tiêu chí bổ sung). Giá trị rỗng (
                        <code>[]</code>, <code>null</code>, <code>""</code>) sẽ bị bỏ qua.
                        Hiệu lực theo phiên bản bảng phí.
                      </div>
                      {importError && (
                        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {importError}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setImportServiceDetail(null)}
                        className="rounded border bg-white px-4 py-2 text-xs font-bold text-gray-600"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={applyImportJson}
                        className="rounded bg-vetc-green px-4 py-2 text-xs font-bold text-white"
                      >
                        Import dữ liệu
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {criteriaRule && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
                  <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b px-5 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">
                          {readOnly ? 'Xem tiêu chí bổ sung' : 'Tiêu chí bổ sung'} —{' '}
                          {criteriaRule.serviceDetail}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Các tiêu chí trong cùng dòng được kết hợp theo điều kiện AND.
                          {readOnly ? ' (chỉ xem)' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCriteriaModalError('');
                          setCriteriaRuleId(null);
                        }}
                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5">
                      <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
                      <div className="mb-3 hidden grid-cols-[minmax(0,1.4fr)_100px_minmax(0,1.5fr)_36px] gap-3 px-3 text-[10px] font-bold uppercase text-gray-500 md:grid">
                        <div>Tiêu chí</div>
                        <div>Toán tử</div>
                        <div>Giá trị</div>
                        <div />
                      </div>
                      <div className="space-y-2">
                        {criteriaRuleConditions.map(({ condition, index }, rowIndex) => {
                          const criterion = (form.priceCriteria ?? []).find(
                            (item) => item.key === condition.criterionKey
                          );
                          const hasListValues = (criterion?.allowedValues?.length ?? 0) > 0;
                          const selectedInValues = Array.isArray(condition.value)
                            ? condition.value.map(String)
                            : String(condition.value ?? '').trim()
                              ? [String(condition.value)]
                              : [];
                          const singleValue = Array.isArray(condition.value)
                            ? String(condition.value[0] ?? '')
                            : String(condition.value ?? '');
                          const operatorOptions = allowedOperatorsForCriterion(criterion).map(
                            (operator) => {
                              const labels: Record<FeeRuleCondition['operator'], string> = {
                                '=': 'Bằng',
                                IN: 'Thuộc danh sách',
                                BETWEEN: 'Từ – Đến',
                                '>=': '≥',
                                '<=': '≤',
                              };
                              return { value: operator, label: labels[operator] };
                            }
                          );
                          const rowError = criteriaModalValidation.rowErrors.find(
                            (issue) => issue.rowIndex === rowIndex
                          );
                          return (
                            <div
                              key={`${criteriaRule.id}-modal-${index}`}
                              className={`space-y-1 rounded-lg border p-3 ${
                                rowError
                                  ? 'border-red-300 bg-red-50/40'
                                  : 'border-gray-200 bg-gray-50/50'
                              }`}
                            >
                            <div
                              className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_100px_minmax(0,1.5fr)_36px] md:items-center"
                            >
                              <div className="min-w-0">
                                <div className="mb-1 text-[10px] font-bold uppercase text-gray-400 md:hidden">
                                  Tiêu chí
                                </div>
                                <AppSelect
                                  value={condition.criterionKey}
                                  options={(form.priceCriteria ?? [])
                                    .filter(
                                      (item) =>
                                        item.role !== 'SURCHARGE' &&
                                        item.key !== criteriaRulePrimaryKey
                                    )
                                    .map((item) => ({
                                      value: item.key,
                                      label: item.label,
                                      disabled:
                                        item.key !== condition.criterionKey &&
                                        criteriaRuleUsedKeys.has(item.key),
                                    }))}
                                  onChange={(value) => {
                                    const next = (form.priceCriteria ?? []).find(
                                      (item) => item.key === value
                                    );
                                    if (!next) return;
                                    if (next.valueType === 'RANGE' || next.valueType === 'TIME') {
                                      updatePriceCondition(criteriaRule.id, index, {
                                        criterionKey: next.key,
                                        criterionLabel: next.label,
                                        ...betweenConditionDefaults(),
                                      });
                                    } else {
                                      updatePriceCondition(criteriaRule.id, index, {
                                        criterionKey: next.key,
                                        criterionLabel: next.label,
                                        operator: '=',
                                        value: defaultValueForOperator('=', next.allowedValues),
                                      });
                                    }
                                    setCriteriaModalError('');
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="mb-1 text-[10px] font-bold uppercase text-gray-400 md:hidden">
                                  Toán tử
                                </div>
                                <AppSelect
                                  value={condition.operator}
                                  options={operatorOptions}
                                  onChange={(value) => {
                                    const operator = value as FeeRuleCondition['operator'];
                                    if (operator === 'BETWEEN') {
                                      updatePriceCondition(criteriaRule.id, index, {
                                        ...betweenConditionDefaults(),
                                      });
                                    } else {
                                      updatePriceCondition(criteriaRule.id, index, {
                                        operator,
                                        value: defaultValueForOperator(
                                          operator,
                                          criterion?.allowedValues
                                        ),
                                      });
                                    }
                                    setCriteriaModalError('');
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="mb-1 text-[10px] font-bold uppercase text-gray-400 md:hidden">
                                  Giá trị
                                </div>
                                {condition.operator === 'BETWEEN' ? (
                                  <RangeBoundInputs
                                    from={
                                      Array.isArray(condition.value)
                                        ? condition.value[0] ?? ''
                                        : ''
                                    }
                                    to={
                                      Array.isArray(condition.value)
                                        ? condition.value[1] ?? ''
                                        : ''
                                    }
                                    fromInclusive={condition.fromInclusive}
                                    toInclusive={condition.toInclusive}
                                    onChange={(patch) => {
                                      updatePriceCondition(criteriaRule.id, index, {
                                        operator: 'BETWEEN',
                                        ...patch,
                                      });
                                      setCriteriaModalError('');
                                    }}
                                  />
                                ) : condition.operator === 'IN' ? (
                                  hasListValues ? (
                                    <AppSelect
                                      value={selectedInValues[0] ?? ''}
                                      placeholder="Chọn giá trị từ danh sách"
                                      options={(criterion?.allowedValues ?? []).map((value) => ({
                                        value,
                                        label: value,
                                      }))}
                                      onChange={(value) => {
                                        updatePriceCondition(criteriaRule.id, index, {
                                          value: value ? [value] : [],
                                        });
                                        setCriteriaModalError('');
                                      }}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      className={inputClass}
                                      placeholder="Nhập giá trị"
                                      value={selectedInValues.join(', ')}
                                      onChange={(e) => {
                                        const parts = e.target.value
                                          .split(',')
                                          .map((item) => item.trim())
                                          .filter(Boolean);
                                        updatePriceCondition(criteriaRule.id, index, {
                                          value: parts,
                                        });
                                        setCriteriaModalError('');
                                      }}
                                    />
                                  )
                                ) : (
                                  <input
                                    type={
                                      condition.operator === '>=' || condition.operator === '<='
                                        ? 'number'
                                        : 'text'
                                    }
                                    className={inputClass}
                                    placeholder="Nhập giá trị"
                                    value={singleValue}
                                    onChange={(e) => {
                                      updatePriceCondition(criteriaRule.id, index, {
                                        value: e.target.value,
                                      });
                                      setCriteriaModalError('');
                                    }}
                                  />
                                )}
                              </div>
                              {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removePriceCondition(criteriaRule.id, index)}
                                className="flex h-8 w-8 items-center justify-center justify-self-end rounded text-red-500 hover:bg-red-50 md:justify-self-center"
                                title={`Xóa tiêu chí ${rowIndex + 1}`}
                              >
                                <Trash2 size={14} />
                              </button>
                              )}
                            </div>
                            {rowError && (
                              <p className="text-[11px] font-semibold text-red-600">
                                {rowError.message}
                              </p>
                            )}
                            </div>
                          );
                        })}
                        {criteriaRuleConditions.length === 0 && (
                          <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-gray-400">
                            Chưa có tiêu chí bổ sung cho dòng giá này.
                          </div>
                        )}
                      </div>
                      {criteriaModalError && !readOnly && (
                        <p className="mt-3 text-xs font-semibold text-red-600">{criteriaModalError}</p>
                      )}
                      {!readOnly && (
                      <button
                        type="button"
                        disabled={!canAddCriteriaRuleCondition}
                        onClick={handleAddCriteriaRuleCondition}
                        className="mt-4 inline-flex items-center gap-1 rounded border border-vetc-green px-3 py-2 text-xs font-bold text-vetc-green disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
                      >
                        <Plus size={14} />
                        Thêm tiêu chí
                      </button>
                      )}
                      </fieldset>
                    </div>

                    <div className="flex items-center justify-between border-t bg-gray-50 px-5 py-3">
                      <span className="text-xs text-gray-500">
                        Đã cấu hình {criteriaRuleConditions.length} tiêu chí bổ sung
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (readOnly) {
                            setCriteriaModalError('');
                            setCriteriaRuleId(null);
                            return;
                          }
                          completeCriteriaModal();
                        }}
                        className="rounded bg-vetc-green px-5 py-2 text-xs font-bold text-white hover:bg-green-700"
                      >
                        {readOnly ? 'Đóng' : 'Hoàn tất'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {false && form.serviceRules.map((rule, ruleIndex) => (
                <div key={rule.id} className="rounded-lg border shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-2 bg-gray-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => toggleRule(rule.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <ChevronDown
                        size={15}
                        className={`shrink-0 transition-transform ${
                          expandedRuleIds.includes(rule.id) ? 'rotate-180' : ''
                        }`}
                      />
                      <span className="w-7 shrink-0 text-xs font-bold text-gray-400">
                        #{ruleIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-700">
                        {rule.serviceDetail || 'Chưa chọn dịch vụ'}
                      </span>
                      <span className="shrink-0 text-xs font-black text-gray-800">
                        {rule.basePrice.toLocaleString('en-US')} đ
                        {rule.pricingMode === 'PER_UNIT' ? `/${rule.unit || 'đơn vị'}` : ''}
                      </span>
                      <span className="hidden max-w-[380px] flex-1 truncate text-[10px] text-blue-700 lg:block">
                        {(rule.conditions ?? []).length
                          ? (rule.conditions ?? [])
                              .map((condition) => {
                                const value = Array.isArray(condition.value)
                                  ? condition.value.join(' → ')
                                  : String(condition.value);
                                return `${condition.criterionLabel}: ${value}`;
                              })
                              .join(' · ')
                          : 'Giá mặc định'}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center justify-end gap-1 border-t pt-2 sm:border-0 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => duplicateServiceRule(rule.id)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-gray-600 hover:bg-white"
                        title="Nhân bản dòng"
                      >
                        <Copy size={13} /> Nhân bản
                      </button>
                      <button
                        type="button"
                        onClick={() => removeServiceRule(rule.id)}
                        className="p-1.5 text-red-500"
                        title="Xóa dòng"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {expandedRuleIds.includes(rule.id) && (
                  <div className="p-4 space-y-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className={labelClass}>Dịch vụ</label>
                        <select
                          className={`${inputClass} bg-white`}
                          value={rule.serviceDetail}
                          onChange={(e) => {
                            const option = SERVICE_OPTIONS.find((item) => item.value === e.target.value);
                            if (!option) return;
                            updateServiceRule(rule.id, {
                              serviceType: option.type,
                              serviceDetail: option.value,
                              unit: SERVICE_CONFIG[option.type].unit,
                              includedKm: undefined,
                              pricePerExtraKm: undefined,
                            });
                          }}
                        >
                          {SERVICE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.value}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Phương pháp tính</label>
                        <select
                          className={`${inputClass} bg-white`}
                          value={rule.pricingMode ?? 'FIXED'}
                          onChange={(e) =>
                            updateServiceRule(rule.id, {
                              pricingMode: e.target.value as ServicePricingMode,
                              unit: SERVICE_CONFIG[rule.serviceType].unit,
                            })
                          }
                        >
                          <option value="FIXED">{SERVICE_PRICING_MODE_LABELS.FIXED}</option>
                          <option value="PER_UNIT">{SERVICE_PRICING_MODE_LABELS.PER_UNIT}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>
                          {rule.pricingMode === 'PER_UNIT' ? 'Đơn giá' : 'Giá trọn gói'}
                        </label>
                        <input
                          type="number"
                          className={`${inputClass} text-right`}
                          value={rule.basePrice}
                          onChange={(e) =>
                            updateServiceRule(rule.id, { basePrice: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed bg-gray-50/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-gray-700">Tổ hợp tiêu chí áp dụng</div>
                          <div className="text-[10px] text-gray-400">
                            Để trống nếu đây là mức giá mặc định.
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!(form.priceCriteria ?? []).some((c) => c.role !== 'SURCHARGE')}
                          onClick={() => addPriceCondition(rule.id)}
                          className="text-xs font-bold text-vetc-green disabled:text-gray-300"
                        >
                          + Thêm điều kiện
                        </button>
                      </div>
                      {(rule.conditions ?? []).map((condition, conditionIndex) => {
                        const criterion = (form.priceCriteria ?? []).find(
                          (c) => c.key === condition.criterionKey
                        );
                        return (
                          <div
                            key={`${rule.id}-${conditionIndex}`}
                            className="mb-2 grid grid-cols-1 sm:grid-cols-[1fr_130px_1.5fr_36px] gap-2"
                          >
                            <select
                              className={`${inputClass} bg-white`}
                              value={condition.criterionKey}
                              onChange={(e) => {
                                const next = (form.priceCriteria ?? []).find((c) => c.key === e.target.value);
                                if (!next) return;
                                if (next.valueType === 'RANGE') {
                                  updatePriceCondition(rule.id, conditionIndex, {
                                    criterionKey: next.key,
                                    criterionLabel: next.label,
                                    ...betweenConditionDefaults(),
                                  });
                                } else {
                                  updatePriceCondition(rule.id, conditionIndex, {
                                    criterionKey: next.key,
                                    criterionLabel: next.label,
                                    operator: '=',
                                    value: next.allowedValues?.[0] ?? '',
                                  });
                                }
                              }}
                            >
                              {(form.priceCriteria ?? [])
                                .filter((c) => c.role !== 'SURCHARGE')
                                .map((c) => <option key={c.id} value={c.key}>{c.label}</option>)}
                            </select>
                            <select
                              className={`${inputClass} bg-white`}
                              value={condition.operator}
                              onChange={(e) => {
                                const operator = e.target.value as FeeRuleCondition['operator'];
                                if (operator === 'BETWEEN') {
                                  updatePriceCondition(rule.id, conditionIndex, {
                                    ...betweenConditionDefaults(),
                                  });
                                } else {
                                  updatePriceCondition(rule.id, conditionIndex, {
                                    operator,
                                    value: criterion?.allowedValues?.[0] ?? '',
                                  });
                                }
                              }}
                            >
                              <option value="=">=</option>
                              <option value="IN">IN</option>
                              <option value="BETWEEN">Từ – Đến</option>
                              <option value=">=">&gt;=</option>
                              <option value="<=">&lt;=</option>
                            </select>
                            {condition.operator === 'BETWEEN' ? (
                              <RangeBoundInputs
                                from={Array.isArray(condition.value) ? condition.value[0] ?? '' : ''}
                                to={Array.isArray(condition.value) ? condition.value[1] ?? '' : ''}
                                fromInclusive={condition.fromInclusive}
                                toInclusive={condition.toInclusive}
                                onChange={(patch) =>
                                  updatePriceCondition(rule.id, conditionIndex, {
                                    operator: 'BETWEEN',
                                    ...patch,
                                  })
                                }
                              />
                            ) : (
                              <select
                                className={`${inputClass} bg-white`}
                                value={String(condition.value)}
                                onChange={(e) =>
                                  updatePriceCondition(rule.id, conditionIndex, { value: e.target.value })
                                }
                              >
                                {(criterion?.allowedValues ?? []).map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => removePriceCondition(rule.id, conditionIndex)}
                              className="p-2 text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                      {(rule.conditions ?? []).length === 0 && (
                        <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600">
                          Giá mặc định
                        </span>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Giá dịch vụ" />
              <button
                type="button"
                onClick={addServiceRule}
                className="inline-flex items-center gap-1 bg-vetc-green text-white px-3 py-1.5 rounded text-xs font-bold"
              >
                <Plus size={14} /> Thêm dòng
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b text-gray-600">
                    <th className="p-2 border text-left">Loại DV</th>
                    <th className="p-2 border text-left">Chi tiết</th>
                    <th className="p-2 border text-right">Giá cơ bản</th>
                    <th className="p-2 border text-right">Km bao gồm</th>
                    <th className="p-2 border text-right">Giá/km vượt</th>
                    <th className="p-2 border text-left">Vị trí cẩu</th>
                    <th className="p-2 border w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.serviceRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="p-2 border">
                        <select
                          className={`${inputClass} bg-white`}
                          value={rule.serviceType}
                          onChange={(e) =>
                            updateServiceRule(rule.id, { serviceType: e.target.value as ServiceType })
                          }
                        >
                          <option value="ONSITE">Tại chỗ</option>
                          <option value="TOWING">Kéo xe</option>
                          <option value="CRANE">Cẩu</option>
                        </select>
                      </td>
                      <td className="p-2 border">
                        <input
                          className={inputClass}
                          value={rule.serviceDetail}
                          onChange={(e) => updateServiceRule(rule.id, { serviceDetail: e.target.value })}
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          className={`${inputClass} text-right`}
                          value={rule.basePrice}
                          onChange={(e) =>
                            updateServiceRule(rule.id, { basePrice: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          className={`${inputClass} text-right`}
                          value={rule.includedKm ?? ''}
                          onChange={(e) =>
                            updateServiceRule(rule.id, {
                              includedKm: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <input
                          type="number"
                          className={`${inputClass} text-right`}
                          value={rule.pricePerExtraKm ?? ''}
                          onChange={(e) =>
                            updateServiceRule(rule.id, {
                              pricePerExtraKm: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </td>
                      <td className="p-2 border">
                        <select
                          className={`${inputClass} bg-white`}
                          value={rule.roadPosition ?? ''}
                          onChange={(e) =>
                            updateServiceRule(rule.id, {
                              roadPosition: (e.target.value || undefined) as
                                | ServicePriceRule['roadPosition']
                                | undefined,
                            })
                          }
                        >
                          <option value="">—</option>
                          <option value="ROAD">Mặt đường</option>
                          <option value="BELOW_ROAD">Dưới mặt đường</option>
                          <option value="SLOPE">Taluy/mương</option>
                        </select>
                      </td>
                      <td className="p-2 border text-center">
                        <button type="button" onClick={() => removeServiceRule(rule.id)} className="text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'criteria' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeader title="Tiêu chí linh động" />
              <button
                type="button"
                onClick={addCriterion}
                className="inline-flex items-center gap-1 bg-vetc-green text-white px-3 py-1.5 rounded text-xs font-bold"
              >
                <Plus size={14} /> Thêm tiêu chí
              </button>
            </div>
            <div className="space-y-2">
              {form.criteria.length === 0 && (
                <p className="text-sm text-gray-400">Chưa có tiêu chí. Thêm tiêu chí để thu hẹp phạm vi bảng.</p>
              )}
              {form.criteria.map((c) => (
                <div key={c.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end border rounded p-3">
                  <div>
                    <label className={labelClass}>Nhãn</label>
                    <select
                      className={`${inputClass} bg-white`}
                      value={c.label}
                      onChange={(e) => updateCriterion(c.id, { label: e.target.value, key: e.target.value })}
                    >
                      {CRITERIA_CATALOG.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Toán tử</label>
                    <select
                      className={`${inputClass} bg-white`}
                      value={c.operator}
                      onChange={(e) =>
                        updateCriterion(c.id, { operator: e.target.value as FeeCriterion['operator'] })
                      }
                    >
                      <option value="=">=</option>
                      <option value="IN">IN</option>
                      <option value="BETWEEN">BETWEEN</option>
                      <option value=">=">&gt;=</option>
                      <option value="<=">&lt;=</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Giá trị</label>
                    <input
                      className={inputClass}
                      value={Array.isArray(c.value) ? c.value.join(',') : String(c.value)}
                      onChange={(e) => updateCriterion(c.id, { value: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nhóm</label>
                    <select
                      className={`${inputClass} bg-white`}
                      value={c.group ?? 'AND'}
                      onChange={(e) =>
                        updateCriterion(c.id, { group: e.target.value as 'AND' | 'OR' })
                      }
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => removeCriterion(c.id)} className="text-red-500 p-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'surcharges' && !skipsPriceMatrixTabs && (
          <div className="space-y-4 bg-gray-50 p-4">
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader
                title="Phụ phí"
                number={1}
                actions={
                  <span className="text-[10px] font-medium text-white/80">
                    Đầu phụ phí được chọn tại tab 1 · Áp dụng ALL dịch vụ trên bảng
                  </span>
                }
              />
              <div className="p-4">
            {form.surchargeRules.length === 0 ? (
              <div className="rounded border border-dashed px-4 py-8 text-center text-sm text-gray-400">
                Chưa có đầu phụ phí. Vui lòng chọn tại tab 1.
              </div>
            ) : (
              <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
              <div className="space-y-4">
                {surchargeGroups.map((group, groupIndex) => {
                  const first = group.rules[0];
                  const groupCriterionKey = first?.conditions[0]?.criterionKey;
                  const groupCriterionLabel =
                    first?.conditions[0]?.criterionLabel || 'Chưa gắn tiêu chí';
                  const isTimeGroup = isTimeSurchargeCriterion(groupCriterionKey);
                  return (
                    <div
                      key={group.name}
                      className="overflow-hidden rounded-lg border bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-3 border-b bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-vetc-green text-xs font-black text-white">
                            {groupIndex + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-gray-800">{group.name}</div>
                            <div className="text-[10px] text-gray-500">
                              {groupCriterionLabel} · {group.rules.length} dòng điều kiện
                            </div>
                          </div>
                        </div>
                        {!readOnly && (
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => addSurchargeLine(group.name)}
                              className="inline-flex items-center gap-1 rounded border border-vetc-green bg-white px-3 py-1.5 text-[10px] font-bold text-vetc-green hover:bg-green-50"
                              title="Thêm dòng điều kiện cùng loại"
                            >
                              <Plus size={13} />
                              Thêm dòng
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSurchargeHead(group.name)}
                              className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
                              title="Xóa nhóm phụ phí"
                            >
                              <Trash2 size={13} />
                              Xóa
                            </button>
                        </div>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-xs">
                          <thead>
                            <tr className="bg-white text-[10px] font-bold uppercase tracking-wide text-gray-600">
                              <th className="border-b border-r px-3 py-2 text-left">
                                {isTimeGroup ? 'Khoảng thời gian' : 'Giá trị tiêu chí'}
                              </th>
                              <th className="w-[160px] border-b border-r px-3 py-2 text-left">Kiểu</th>
                              <th className={`w-[140px] border-b ${readOnly ? '' : 'border-r'} px-3 py-2 text-right`}>
                                Giá trị / Hệ số
                              </th>
                              {!readOnly && (
                              <th className="w-[100px] border-b px-3 py-2 text-center">Thao tác</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {group.rules.map((s) => {
                              const isTimeCriterion = isTimeSurchargeCriterion(
                                s.conditions[0]?.criterionKey
                              );
                              const timeFrom = Array.isArray(s.conditions[0]?.value)
                                ? String(s.conditions[0]?.value[0] ?? '')
                                : '';
                              const timeTo = Array.isArray(s.conditions[0]?.value)
                                ? String(s.conditions[0]?.value[1] ?? '')
                                : '';
                              return (
                                <tr key={s.id} className="align-top even:bg-gray-50/40">
                                    <td className="border-b border-r p-2">
                                      {isTimeCriterion ? (
                                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                          <input
                                            type="time"
                                            className={inputClass}
                                            value={timeFrom}
                                            onChange={(e) =>
                                              setSurchargeTimeRange(
                                                s.id,
                                                e.target.value,
                                                timeTo
                                              )
                                            }
                                          />
                                          <span className="text-xs font-semibold text-gray-400">
                                            –
                                          </span>
                                          <input
                                            type="time"
                                            className={inputClass}
                                            value={timeTo}
                                            onChange={(e) =>
                                              setSurchargeTimeRange(
                                                s.id,
                                                timeFrom,
                                                e.target.value
                                              )
                                            }
                                          />
                                        </div>
                                      ) : (
                                        <AppSelect
                                          disabled={readOnly || !s.conditions.length}
                                          value={String(s.conditions[0]?.value ?? '')}
                                          placeholder="Chọn giá trị"
                                          options={(SURCHARGE_CRITERIA_CATALOG.find(
                                            (criterion) =>
                                              criterion.key === s.conditions[0]?.criterionKey
                                          )?.values ?? []).map((value) => ({
                                            value,
                                            label: value,
                                          }))}
                                          onChange={(value) =>
                                            setSurchargeConditionValue(s.id, value)
                                          }
                                        />
                                      )}
                                    </td>
                                    <td className="border-b border-r p-2">
                                      <AppSelect
                                        disabled={readOnly}
                                        value={s.type}
                                        options={[
                                          { value: 'FIXED', label: 'Cố định' },
                                          { value: 'COEFFICIENT', label: 'Hệ số' },
                                        ]}
                                        onChange={(value) =>
                                          updateSurcharge(s.id, {
                                            type: value as SurchargeType,
                                          })
                                        }
                                      />
                                    </td>
                                    <td className={`border-b ${readOnly ? '' : 'border-r'} p-2`}>
                                      <input
                                        type="number"
                                        step="0.01"
                                        className={`${inputClass} text-right font-semibold`}
                                        value={s.value}
                                        onChange={(e) =>
                                          updateSurcharge(s.id, {
                                            value: Number(e.target.value) || 0,
                                          })
                                        }
                                      />
                                    </td>
                                    {!readOnly && (
                                    <td className="border-b p-2">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => duplicateSurcharge(s.id)}
                                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
                                          title="Nhân bản dòng"
                                        >
                                          <Copy size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeSurcharge(s.id)}
                                          disabled={group.rules.length <= 1}
                                          className="rounded p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                                          title={
                                            group.rules.length <= 1
                                              ? 'Giữ ít nhất 1 dòng — dùng nút Xóa nhóm'
                                              : 'Xóa dòng'
                                          }
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </td>
                                    )}
                                  </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
              </fieldset>
            )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && readOnly && (
          <div className="space-y-4 bg-gray-50 p-4">
            <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <SectionHeader
                title="Lịch sử bảng phí"
                number={1}
                actions={
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white/80">
                    <History size={12} />
                    Toàn bộ version đã phát hành
                  </span>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs uppercase text-gray-600">
                      <th className="px-3 py-2 text-left">Phiên bản</th>
                      <th className="px-3 py-2 text-left">Trạng thái</th>
                      <th className="px-3 py-2 text-left">Hiệu lực</th>
                      <th className="px-3 py-2 text-left">Kích hoạt</th>
                      <th className="px-3 py-2 text-left">Nội dung thay đổi</th>
                      <th className="px-3 py-2 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                          Chưa có lịch sử bảng phí
                        </td>
                      </tr>
                    ) : (
                      visibleHistory.map((h) => {
                        const isViewing = form.version === h.version;
                        return (
                          <tr
                            key={h.id}
                            className={`border-b align-top ${
                              isViewing ? 'bg-green-50/50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-3 py-2 text-gray-600">
                              v{h.version}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              <StatusBadge status={h.status} />
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {h.validFrom || h.validTo
                                ? `${h.validFrom || '—'} → ${h.validTo || '—'}`
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {h.activatedAt || '—'}
                              {h.activatedBy ? (
                                <div className="text-gray-400">{h.activatedBy}</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {h.changes.length > 0 ? (
                                <div className="space-y-1">
                                  <ul className="list-disc space-y-0.5 pl-4">
                                    {(expandedHistoryChanges[h.id]
                                      ? h.changes
                                      : h.changes.slice(0, HISTORY_CHANGES_PREVIEW)
                                    ).map((c) => (
                                      <li key={c}>{c}</li>
                                    ))}
                                  </ul>
                                  {h.changes.length > HISTORY_CHANGES_PREVIEW && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedHistoryChanges((prev) => ({
                                          ...prev,
                                          [h.id]: !prev[h.id],
                                        }))
                                      }
                                      className="text-[11px] font-bold text-vetc-green hover:underline"
                                    >
                                      {expandedHistoryChanges[h.id]
                                        ? 'Thu gọn'
                                        : `Xem thêm ${h.changes.length - HISTORY_CHANGES_PREVIEW}`}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                h.note || '—'
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => openVersion(h.version)}
                                disabled={isViewing}
                                className={`inline-flex items-center justify-center rounded border p-1.5 ${
                                  isViewing
                                    ? 'cursor-default border-gray-200 bg-gray-100 text-gray-400'
                                    : 'border-vetc-green bg-white text-vetc-green hover:bg-green-50'
                                }`}
                                title={
                                  isViewing
                                    ? 'Đang xem version này'
                                    : `Xem chi tiết bảng phí version ${h.version}`
                                }
                                aria-label={
                                  isViewing
                                    ? 'Đang xem version này'
                                    : `Xem version ${h.version}`
                                }
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {history.length > 0 && (
                <div className="flex flex-col items-center gap-2 border-t bg-gray-50 px-4 py-3 sm:flex-row sm:justify-between">
                  <div className="text-xs text-gray-500">
                    Hiển thị {visibleHistory.length}/{history.length} version
                  </div>
                  {hasMoreHistory ? (
                    <button
                      type="button"
                      onClick={() =>
                        setHistoryVisibleCount((count) =>
                          Math.min(count + HISTORY_PAGE_SIZE, history.length)
                        )
                      }
                      className="rounded border border-vetc-green bg-white px-3 py-1.5 text-xs font-bold text-vetc-green hover:bg-green-50"
                    >
                      Xem thêm{' '}
                      {Math.min(HISTORY_PAGE_SIZE, history.length - historyVisibleCount)} version
                    </button>
                  ) : history.length > HISTORY_PAGE_SIZE ? (
                    <button
                      type="button"
                      onClick={() => setHistoryVisibleCount(HISTORY_PAGE_SIZE)}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
                    >
                      Thu gọn
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RescueFeeForm;
