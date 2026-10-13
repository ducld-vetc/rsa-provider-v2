
export interface CustomerData {
  phone: string;
  plate: string;
  name: string;
  vin: string;
  vehicleBrand: string;
  vehicleLine: string;
  payload: string;
  seats: string;
  servicePackage: string;
}

export interface AssistanceInfo {
  rescueName: string;
  rescuePhone: string;
  address: string;
  lng: string;
  lat: string;
  city: string;
  district: string;
  ward: string;
  note: string;
}

export interface ServiceSelection {
  serviceIds: string[];
  quantity: number;
  description: string;
  deposit: number;
}

export interface RescueUnit {
  id: string;
  name: string;
  partner: string;
  status: 'Accepted' | 'Rejected' | 'Pending';
  distance: number;
  time: number;
  address: string;
  contact1: string;
  contact2: string;
  vehicleType: string;
  overloaded?: boolean;
  driverBusy?: boolean;
  busyOrderCode?: string;
}

export interface StationInfo {
  partner: string;
  station: string;
  contact1: string;
  contact2: string;
  address: string;
  towingDestination: string;
  vehicleType: string;
}

export interface PricingData {
  estimatedPrice: string;
  distance: number;
  adjustments: {
    id: number;
    serviceName: string;
    fixedPrice: string;
    adjustmentType: string;
    coefficient: string;
    ceilingPrice: string;
    totalPrice: string;
  }[]
}
export interface FormData {
  orderId?: string;
  customer: CustomerData;
  assistance: AssistanceInfo;
  service: ServiceSelection;
  station: StationInfo;
  pricing: PricingData;
}

export interface OrderHistory {
  id: string;
  date: string;
  service: string;
  status: 'Completed' | 'Cancelled' | 'In Progress';
}

export enum Step {
  CUSTOMER_INFO = 1,
  PAYMENT_QR = 2,
  SEARCHING = 3,
  RESCUE_LIST = 3.5,
  STATION_INFO = 4,
  CONFIRMATION = 5,
  SUCCESS = 6,
  MONITORING = 10,
  SUPPORTING = 13,
  ORDER_MANAGEMENT = 11,
  GUEST_ORDER = 12,
  LIVE_MONITORING = 14,
  STATION_CREATE = 20,
  STATION_ORDERS = 21,
  STATION_MANAGEMENT = 22,
  STATION_COVERAGE = 23,
  STAFF_MANAGEMENT = 30,
  RESCUE_SUPERVISION = 15,
  RSA_DASHBOARD = 16,
  PRICING_POLICY = 40,
  BUSINESS_MANAGEMENT = 41,
  PACKAGE_PURCHASE_MANAGEMENT = 42,
  PAYMENT_REQUEST_MANAGEMENT = 43,
  LOCATION_SEARCH = 44,
  SHIFT_DEFINITION_MANAGEMENT = 45,
  SHIFT_MONTHLY_SCHEDULE = 46,
  FLOOD_ZONE_MANAGEMENT = 47,
  RESCUE_FEE_CONFIGURATION = 48,
  RESCUE_FEE_CRITERIA = 49,
  PARTNER_VEHICLES = 50,
  PARTNER_TOOL_CONFIG = 52,
  PARTNER_STAFF = 53,
  PARTNER_REPORTS = 54,
  PARTNER_ORG = 55,
  RESCUE_PROVIDER_MANAGEMENT = 56,
  RESCUE_STATION_ADMIN = 57,
  PACKAGE_IMPORT = 58,
  SERVICE_MANAGEMENT = 59,
  PACKAGE_CATALOG = 60,
  PARTNER_RESOURCE_BOARD = 61,
  PARTNER_SHIFT_CONFIG = 62,
  PARTNER_SHIFT_SCHEDULE = 63,
  PARTNER_MAINTENANCE = 64,
  APP_QUICK_CREATE = 65,
}

export interface MonitoringOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  plate: string;
  address: string;
  district: string;
  services: string[];
  waitingTime: number;
  status: 'Searching' | 'Expired' | 'NoPartner';
}
