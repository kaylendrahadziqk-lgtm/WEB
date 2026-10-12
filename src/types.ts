export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId?: string;
  label: string; // e.g. "Rumah", "Kantor"
  recipientName: string;
  phone: string;
  provinceId: string;
  provinceName: string;
  cityId: string;
  cityName: string;
  cityType?: string; // "Kota" | "Kabupaten"
  districtId?: string;
  districtName?: string;
  postalCode: string;
  fullAddress: string;
  courierNotes?: string;
  isPrimary?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  imageUrl?: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Merah - L", "32GB"
  sku?: string;
  priceDelta?: number;
  stock: number;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  weight: number; // in grams (e.g. 500 = 500g, 1200 = 1.2kg)
  sku: string;
  categoryId: string;
  categoryName?: string;
  isActive: boolean;
  images: ProductImage[];
  variants?: ProductVariant[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  variantId?: string;
  variantName?: string;
  quantity: number;
  price: number;
  weight: number;
}

export type OrderStatus =
  | 'Menunggu Pembayaran'
  | 'Dibayar'
  | 'Diproses'
  | 'Dikirim'
  | 'Selesai'
  | 'Dibatalkan';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  weight: number; // weight snapshot per item in grams
  quantity: number;
  variantName?: string;
}

export interface ShippingDetail {
  courierCode: string; // e.g. "jne", "pos", "tiki", "sicepat"
  courierName: string; // e.g. "JNE Express"
  courierService: string; // e.g. "REG", "YES", "CTC"
  shippingEstimate: string; // e.g. "1-2 Hari"
  cost: number;
  totalWeightGrams: number;
  originCityId: string;
  destinationCityId: string;
  trackingNumber?: string;
}

export interface Payment {
  method: 'transfer' | 'cod' | 'simulasi' | 'austinpay';
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  paidAt?: string;
  status: 'pending' | 'success' | 'failed';
  gateway?: 'austinpay';
  transactionId?: string; // e.g. "APG-1751000000"
  qrString?: string;
  qrImage?: string;
  expiredAt?: string;
  fee?: number;
  totalPay?: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "NS-20260728-0001"
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  addressSnapshot: Address;
  subtotal: number;
  shippingCost: number;
  discount: number;
  grandTotal: number;
  status: OrderStatus;
  payment: Payment;
  shippingDetail: ShippingDetail;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxDiscount?: number;
}

// RajaOngkir API Data Structures
export interface RajaOngkirProvince {
  province_id: string;
  province: string;
}

export interface RajaOngkirCity {
  city_id: string;
  province_id: string;
  province: string;
  type: string; // "Kota" | "Kabupaten"
  city_name: string;
  postal_code: string;
}

export interface RajaOngkirDistrict {
  subdistrict_id: string;
  province_id: string;
  province: string;
  city_id: string;
  city: string;
  type: string;
  subdistrict_name: string;
}

export interface CourierServiceOption {
  code: string; // "jne"
  name: string; // "JNE Express"
  service: string; // "REG"
  description: string; // "Layanan Reguler"
  cost: number; // 24000
  etd: string; // "1-2" atau "2-3 Hari"
  note?: string;
}

export interface StoreSettings {
  storeName: string;
  originCityId: string;
  originCityName: string;
  originProvinceName: string;
  useRealRajaOngkirApi: boolean;
  rajaOngkirApiKeyConfigured: boolean;
}

// Real-time Shipping Tracking Data Structures
export interface TrackingCheckpoint {
  manifest_code?: string;
  manifest_description: string;
  manifest_date: string;
  manifest_time: string;
  city_name?: string;
  status: 'manifested' | 'in_transit' | 'out_for_delivery' | 'delivered';
}

export interface TrackingDetail {
  waybill: string;
  courierCode: string;
  courierName: string;
  serviceCode: string;
  shippedDate: string;
  origin: string;
  destination: string;
  senderName: string;
  receiverName: string;
  status: 'MANIFESTED' | 'ON TRANSIT' | 'OUT FOR DELIVERY' | 'DELIVERED';
  statusLabel: string;
  estimateArrival: string;
  checkpoints: TrackingCheckpoint[];
  lastLocation?: string;
  driverName?: string;
  driverPhone?: string;
}

