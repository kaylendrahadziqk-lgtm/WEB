import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatRupiah, formatWeight, generateOrderNumber } from '../../lib/currency';
import {
  RajaOngkirProvince,
  RajaOngkirCity,
  CourierServiceOption,
  Address,
  Order,
  ShippingDetail,
} from '../../types';
import { ShippingOptionSkeleton } from '../ui/Skeleton';
import {
  Truck,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Building2,
  ShieldCheck,
  Scale,
  Sparkles,
  Info,
  QrCode,
  Zap,
} from 'lucide-react';
import { dbStore } from '../../data/dbStore';
import { AustinPayModal, AustinPayDepositData } from './AustinPayModal';

interface CheckoutViewProps {
  onBackToCart: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  onBackToCart,
  onOrderSuccess,
}) => {
  const { cart, subtotalAmount, totalWeightGrams, discountAmount, clearCart } = useCart();
  const { user, primaryAddress, savePrimaryAddress } = useAuth();
  const { showToast } = useToast();

  // Buyer Info State
  const [buyerName, setBuyerName] = useState(user.name || '');
  const [buyerEmail, setBuyerEmail] = useState(user.email || '');
  const [buyerPhone, setBuyerPhone] = useState(user.phone || '081234567890');

  // Address Form State
  const [labelAddress, setLabelAddress] = useState(primaryAddress.label || 'Rumah');
  const [recipientName, setRecipientName] = useState(primaryAddress.recipientName || user.name);
  const [recipientPhone, setRecipientPhone] = useState(primaryAddress.phone || '081234567890');
  const [fullAddress, setFullAddress] = useState(primaryAddress.fullAddress || '');
  const [postalCode, setPostalCode] = useState(primaryAddress.postalCode || '12410');
  const [courierNotes, setCourierNotes] = useState(primaryAddress.courierNotes || '');

  // Cascading Region Data (Provinces & Cities)
  const [provinces, setProvinces] = useState<RajaOngkirProvince[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>(primaryAddress.provinceId || '6');
  const [cities, setCities] = useState<RajaOngkirCity[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>(primaryAddress.cityId || '153');

  // Shipping & Courier State
  const [selectedCourier, setSelectedCourier] = useState<string>('jne');
  const [shippingOptions, setShippingOptions] = useState<CourierServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<CourierServiceOption | null>(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState<boolean>(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'austinpay' | 'transfer' | 'cod' | 'simulasi'>('austinpay');
  const [selectedBank, setSelectedBank] = useState<string>('bca');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // AustinPay Modal State
  const [isAustinPayOpen, setIsAustinPayOpen] = useState<boolean>(false);
  const [austinDepositData, setAustinDepositData] = useState<AustinPayDepositData | null>(null);
  const [isAustinSimulated, setIsAustinSimulated] = useState<boolean>(false);
  const [pendingAustinOrder, setPendingAustinOrder] = useState<Order | null>(null);

  // Load Provinces on mount
  useEffect(() => {
    async function loadProvinces() {
      try {
        const res = await fetch('/api/shipping/provinces');
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setProvinces(data.data);
        }
      } catch (err) {
        console.error('Failed to load provinces:', err);
      }
    }
    loadProvinces();
  }, []);

  // Load Cities whenever selectedProvinceId changes
  useEffect(() => {
    if (!selectedProvinceId) return;
    async function loadCities() {
      try {
        const res = await fetch(`/api/shipping/cities?province=${selectedProvinceId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setCities(data.data);
          // Default to first city if current selected is not in list
          if (!data.data.some((c: RajaOngkirCity) => c.city_id === selectedCityId)) {
            if (data.data[0]) {
              setSelectedCityId(data.data[0].city_id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    }
    loadCities();
  }, [selectedProvinceId]);

  // Calculate RajaOngkir shipping costs whenever destinationCityId, courier, or total weight changes
  useEffect(() => {
    if (!selectedCityId) return;

    let isMounted = true;
    async function calculateCost() {
      setIsLoadingShipping(true);
      setShippingError(null);
      setSelectedService(null);

      try {
        const res = await fetch('/api/shipping/cost', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinationCityId: selectedCityId,
            weightGrams: totalWeightGrams || 500,
            courierCode: selectedCourier,
          }),
        });

        const json = await res.json();

        if (isMounted) {
          if (json.success && json.data && Array.isArray(json.data.options)) {
            setShippingOptions(json.data.options);
            // Default select first available option
            if (json.data.options.length > 0) {
              setSelectedService(json.data.options[0]);
            }
          } else {
            setShippingError(json.message || 'Pilihan pengiriman belum tersedia.');
            setShippingOptions([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setShippingError('Gagal terhubung ke layanan RajaOngkir. Mencoba kembali...');
          setShippingOptions([]);
        }
      } finally {
        if (isMounted) setIsLoadingShipping(false);
      }
    }

    calculateCost();
    return () => {
      isMounted = false;
    };
  }, [selectedCityId, selectedCourier, totalWeightGrams]);

  // Selected Province Object
  const currentProvinceObj = provinces.find((p) => p.province_id === selectedProvinceId);
  const currentCityObj = cities.find((c) => c.city_id === selectedCityId);

  // Grand Total Calculation
  const activeShippingCost = selectedService ? selectedService.cost : 0;
  const grandTotal = Math.max(0, subtotalAmount + activeShippingCost - discountAmount);

  // Final Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!buyerName || !buyerPhone || !buyerEmail) {
      showToast('Lengkapi data informasi pembeli!', 'error');
      return;
    }
    if (!fullAddress || !selectedCityId) {
      showToast('Lengkapi alamat pengiriman!', 'error');
      return;
    }
    if (!selectedService) {
      showToast('Pilih salah satu layanan kurir pengiriman!', 'error');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      // Save updated address to context & local storage
      const addressObj: Address = {
        id: `addr_${Date.now()}`,
        label: labelAddress,
        recipientName,
        phone: recipientPhone,
        provinceId: selectedProvinceId,
        provinceName: currentProvinceObj?.province || 'DKI Jakarta',
        cityId: selectedCityId,
        cityName: currentCityObj?.city_name || 'Jakarta Selatan',
        cityType: currentCityObj?.type || 'Kota',
        postalCode,
        fullAddress,
        courierNotes,
        isPrimary: true,
      };
      savePrimaryAddress(addressObj);

      // Construct Shipping detail snapshot
      const shippingDetailSnap: ShippingDetail = {
        courierCode: selectedService.code,
        courierName: selectedService.name,
        courierService: selectedService.service,
        shippingEstimate: selectedService.etd,
        cost: selectedService.cost,
        totalWeightGrams,
        originCityId: process.env.RAJAONGKIR_ORIGIN_CITY_ID || '153',
        destinationCityId: selectedCityId,
      };

      // Handle AustinPay Gateway Flow
      if (paymentMethod === 'austinpay') {
        const initialOrderData = {
          orderNumber: generateOrderNumber(),
          userId: user.id,
          customerName: buyerName,
          customerEmail: buyerEmail,
          customerPhone: buyerPhone,
          items: cart.map((c) => ({
            id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            productId: c.productId,
            productName: c.product.name,
            productImage: c.product.images[0]?.url || '',
            price: c.price,
            weight: c.weight,
            quantity: c.quantity,
            variantName: c.variantName,
          })),
          addressSnapshot: addressObj,
          subtotal: subtotalAmount,
          shippingCost: activeShippingCost,
          discount: discountAmount,
          grandTotal,
          status: 'Menunggu Pembayaran' as const,
          payment: {
            method: 'austinpay' as const,
            gateway: 'austinpay' as const,
            status: 'pending' as const,
          },
          shippingDetail: shippingDetailSnap,
          notes: courierNotes,
        };

        const createdOrder = dbStore.createOrder(initialOrderData);
        setPendingAustinOrder(createdOrder);

        const res = await fetch('/api/payment/austin/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: grandTotal }),
        });
        const data = await res.json();

        if (data && data.success && data.deposit) {
          setAustinDepositData(data.deposit);
          setIsAustinSimulated(!!data.isSimulated);
          setIsAustinPayOpen(true);
        } else {
          showToast(data?.message || 'Gagal membuat QRIS AustinPay. Silakan coba kembali.', 'error');
        }
        return;
      }

      // Bank accounts mapping for transfer
      const bankAccounts: Record<string, { bankName: string; accountNum: string }> = {
        bca: { bankName: 'BCA Virtual Account', accountNum: '880123984019283' },
        mandiri: { bankName: 'Mandiri Virtual Account', accountNum: '88129031238910' },
        bni: { bankName: 'BNI Virtual Account', accountNum: '88201923812901' },
        bri: { bankName: 'BRI Virtual Account', accountNum: '88301923891230' },
      };

      const paymentInfo = {
        method: paymentMethod,
        bankName: paymentMethod === 'transfer' ? bankAccounts[selectedBank]?.bankName : undefined,
        accountNumber: paymentMethod === 'transfer' ? bankAccounts[selectedBank]?.accountNum : undefined,
        accountHolder: 'PT NUSA STORE INDONESIA',
        status: paymentMethod === 'simulasi' ? ('success' as const) : ('pending' as const),
        paidAt: paymentMethod === 'simulasi' ? new Date().toISOString() : undefined,
      };

      // Create Order in DBStore with snapshot data
      const orderData = {
        orderNumber: generateOrderNumber(),
        userId: user.id,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerPhone: buyerPhone,
        items: cart.map((c) => ({
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId: c.productId,
          productName: c.product.name,
          productImage: c.product.images[0]?.url || '',
          price: c.price,
          weight: c.weight,
          quantity: c.quantity,
          variantName: c.variantName,
        })),
        addressSnapshot: addressObj,
        subtotal: subtotalAmount,
        shippingCost: activeShippingCost,
        discount: discountAmount,
        grandTotal,
        status: paymentMethod === 'simulasi' ? ('Dibayar' as const) : ('Menunggu Pembayaran' as const),
        payment: paymentInfo,
        shippingDetail: shippingDetailSnap,
        notes: courierNotes,
      };

      const createdOrder = dbStore.createOrder(orderData);
      showToast(`Pesanan #${createdOrder.orderNumber} berhasil dibuat!`, 'success');
      onOrderSuccess(createdOrder);
    } catch (err: any) {
      showToast('Gagal memproses pesanan: ' + err.message, 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleAustinPaymentSuccess = (deposit: AustinPayDepositData) => {
    if (!pendingAustinOrder) return;
    const updated = dbStore.updateOrderStatus(pendingAustinOrder.id, 'Dibayar');
    if (updated) {
      updated.payment = {
        method: 'austinpay',
        gateway: 'austinpay',
        transactionId: deposit.transaction_id,
        qrString: deposit.qr_string,
        qrImage: deposit.qr_image,
        fee: deposit.fee,
        totalPay: deposit.amount,
        status: 'success',
        paidAt: new Date().toISOString(),
      };
      dbStore.updateOrder(updated);
      clearCart();
      setIsAustinPayOpen(false);
      showToast('Pembayaran QRIS AustinPay berhasil diverifikasi!', 'success');
      onOrderSuccess(updated);
    }
  };

  const handleAustinModalClose = () => {
    setIsAustinPayOpen(false);
    if (pendingAustinOrder) {
      clearCart();
      showToast('Pesanan tersimpan. Anda dapat menyelesaikan pembayaran di menu Akun.', 'info');
      onOrderSuccess(pendingAustinOrder);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Back Link */}
      <button
        onClick={onBackToCart}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Keranjang
      </button>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Buyer Info */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Informasi Pembeli
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nomor HP / Whatsapp *
                </label>
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Alamat Email *
                </label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: Shipping Address with RajaOngkir Regions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <div className="flex-1 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Alamat Pengiriman RajaOngkir
                </h3>
                <span className="text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded-full font-bold">
                  Wilayah Bertingkat
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Label Alamat (e.g. Rumah, Kantor)
                </label>
                <input
                  type="text"
                  value={labelAddress}
                  onChange={(e) => setLabelAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Nama Penerima *
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Province Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Provinsi *
                </label>
                <select
                  value={selectedProvinceId}
                  onChange={(e) => setSelectedProvinceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                >
                  {provinces.map((prov) => (
                    <option key={prov.province_id} value={prov.province_id}>
                      {prov.province}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kota / Kabupaten *
                </label>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                >
                  {cities.map((city) => (
                    <option key={city.city_id} value={city.city_id}>
                      {city.type} {city.city_name} (Kode Pos: {city.postal_code || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Alamat Lengkap (Jalan, RT/RW, No. Rumah) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="e.g. Jl. RS Fatmawati No. 45, RT 02/RW 05, Cilandak Barat"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Catatan untuk Kurir (Opsional)
                </label>
                <input
                  type="text"
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  placeholder="e.g. Titip di pos satpam atau di samping pagar"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* STEP 3: Courier Selection & RajaOngkir Live Rates */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <div className="flex-1 flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Pilihan Kurir & Layanan Pengiriman
                </h3>
                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-blue-500" />
                  Total Berat: <strong>{formatWeight(totalWeightGrams)}</strong>
                </span>
              </div>
            </div>

            {/* Courier Tabs */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { code: 'jne', name: 'JNE Express' },
                { code: 'sicepat', name: 'SiCepat' },
                { code: 'pos', name: 'POS' },
                { code: 'tiki', name: 'TIKI' },
                { code: 'jnt', name: 'J&T' },
              ].map((courier) => (
                <button
                  key={courier.code}
                  type="button"
                  onClick={() => setSelectedCourier(courier.code)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    selectedCourier === courier.code
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                  }`}
                >
                  {courier.name}
                </button>
              ))}
            </div>

            {/* Shipping Service Options fetched from RajaOngkir API */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Layanan Kurir Tersedia ({selectedCourier.toUpperCase()}):
              </label>

              {isLoadingShipping ? (
                <div className="space-y-2">
                  <ShippingOptionSkeleton />
                  <ShippingOptionSkeleton />
                </div>
              ) : shippingError ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{shippingError}</span>
                </div>
              ) : shippingOptions.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 text-center">
                  Tidak ada layanan pengiriman untuk rute yang dipilih.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shippingOptions.map((option, idx) => {
                    const isSelected = selectedService?.service === option.service;
                    return (
                      <div
                        key={`${option.service}_${idx}`}
                        onClick={() => setSelectedService(option)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {option.service}
                            </span>
                            <span className="text-[10px] font-medium bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                              {option.etd}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {option.description}
                          </p>
                        </div>
                        <div className="font-bold text-xs text-blue-600 dark:text-blue-400 shrink-0">
                          {formatRupiah(option.cost)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* STEP 4: Payment Method */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-sm">
                4
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Metode Pembayaran
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* AustinPay Gateway Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod('austinpay')}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                  paymentMethod === 'austinpay'
                    ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Auto QRIS
                  </span>
                </div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  AustinPay
                  <span className="text-[10px] text-emerald-600 font-semibold">(Real-Time)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Scan BCA, Mandiri, GoPay, OVO, DANA
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-5 h-5 text-blue-600 mb-2" />
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Transfer Bank (VA)
                </div>
                <div className="text-[11px] text-slate-500">BCA, Mandiri, BNI, BRI</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Truck className="w-5 h-5 text-emerald-600 mb-2" />
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Bayar di Tempat (COD)
                </div>
                <div className="text-[11px] text-slate-500">Bayar saat barang sampai</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('simulasi')}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  paymentMethod === 'simulasi'
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Sparkles className="w-5 h-5 text-amber-500 mb-2" />
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Simulasi Instan
                </div>
                <div className="text-[11px] text-slate-500">Langsung status "Dibayar"</div>
              </button>
            </div>

            {paymentMethod === 'austinpay' && (
              <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  AustinPay Cloud Gateway (austinx.cloud / austinstore.id)
                </div>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
                  Kode QRIS dinamis akan langsung dibuat saat Anda menekan tombol di bawah. Cukup buka aplikasi Mobile Banking (BCA, Livin', BRImo, BNI) atau E-Wallet (GoPay, OVO, DANA, ShopeePay), lalu scan. Pembayaran langsung terdeteksi otomatis setiap 5 detik!
                </p>
              </div>
            )}

            {paymentMethod === 'transfer' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-700">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Bank Virtual Account:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['bca', 'mandiri', 'bni', 'bri'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBank(b)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold uppercase border ${
                        selectedBank === b
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
              Ringkasan Pesanan
            </h3>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 items-center text-xs">
                  <img
                    src={item.product.images[0]?.url}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.product.name}
                    </h5>
                    <p className="text-slate-500">
                      {item.quantity} x {formatRupiah(item.price)}
                    </p>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {formatRupiah(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal Produk</span>
                <span className="font-semibold">{formatRupiah(subtotalAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span>
                  Ongkos Kirim RajaOngkir ({selectedService?.name || 'Kurir'})
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {selectedService ? formatRupiah(selectedService.cost) : 'Pilih Kurir'}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Diskon Kupon</span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-800">
                <span>Total Pembayaran</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Place Order Submit */}
            <button
              type="submit"
              disabled={isSubmittingOrder || !selectedService}
              className={`w-full py-4 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-sm ${
                isSubmittingOrder || !selectedService
                  ? 'bg-slate-400 cursor-not-allowed'
                  : paymentMethod === 'austinpay'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 active:scale-95'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25 active:scale-95'
              }`}
            >
              {isSubmittingOrder ? (
                'Memproses Pesanan...'
              ) : paymentMethod === 'austinpay' ? (
                <>
                  <QrCode className="w-5 h-5" /> Bayar via AustinPay QRIS
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> Buat Pesanan Sekarang
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Transaksi Enkripsi Aman NusaStore
            </div>
          </div>
        </div>
      </form>

      {/* AustinPay Dynamic QRIS Modal */}
      <AustinPayModal
        isOpen={isAustinPayOpen}
        onClose={handleAustinModalClose}
        depositData={austinDepositData}
        isSimulated={isAustinSimulated}
        onPaymentSuccess={handleAustinPaymentSuccess}
      />
    </div>
  );
};
