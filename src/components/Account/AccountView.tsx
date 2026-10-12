import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbStore } from '../../data/dbStore';
import { Order, OrderStatus } from '../../types';
import { formatRupiah, formatWeight } from '../../lib/currency';
import { Modal } from '../ui/Modal';
import {
  User,
  ShoppingBag,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  Copy,
  ChevronRight,
  PackageCheck,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { AustinPayModal, AustinPayDepositData } from '../Checkout/AustinPayModal';

interface AccountViewProps {
  onOpenTrackingModal?: (waybill?: string, courier?: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onOpenTrackingModal }) => {
  const { user, primaryAddress } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'address'>('orders');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // AustinPay modal state for pending orders
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [isAustinPayOpen, setIsAustinPayOpen] = useState(false);
  const [austinDepositData, setAustinDepositData] = useState<AustinPayDepositData | null>(null);
  const [isAustinSimulated, setIsAustinSimulated] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const [orders, setOrders] = useState<Order[]>(() =>
    dbStore.getOrders().filter((o) => o.userId === user.id || true)
  );

  const handlePayWithAustin = async (order: Order) => {
    setIsCreatingPayment(true);
    setPayingOrder(order);
    try {
      const res = await fetch('/api/payment/austin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: order.grandTotal }),
      });
      const data = await res.json();
      if (data && data.success && data.deposit) {
        setAustinDepositData(data.deposit);
        setIsAustinSimulated(!!data.isSimulated);
        setIsAustinPayOpen(true);
      } else {
        showToast(data?.message || 'Gagal membuat QRIS pembayaran.', 'error');
      }
    } catch (err: any) {
      showToast('Koneksi ke payment gateway bermasalah: ' + err.message, 'error');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleAustinSuccess = (deposit: AustinPayDepositData) => {
    if (!payingOrder) return;
    const updated = dbStore.updateOrderStatus(payingOrder.id, 'Dibayar');
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
      setOrders(dbStore.getOrders());
      setIsAustinPayOpen(false);
      showToast('Pembayaran berhasil dikonfirmasi oleh AustinPay!', 'success');
      if (selectedOrder?.id === payingOrder.id) {
        setSelectedOrder(updated);
      }
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus === 'all') return true;
    return o.status === selectedStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Menunggu Pembayaran':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
      case 'Dibayar':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
      case 'Diproses':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300';
      case 'Dikirim':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300';
      case 'Selesai':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
      case 'Dibatalkan':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Nomor disalin ke clipboard!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* User Header Profile */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-5">
        <img
          src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
          alt=""
          className="w-20 h-20 rounded-full object-cover border-4 border-blue-600/20 shadow-md"
        />
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {user.name}
          </h2>
          <p className="text-xs text-slate-500 font-mono">{user.email} • {user.phone}</p>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold px-3 py-1 rounded-full text-[11px] mt-1">
            Pelanggan Setia NusaStore
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Riwayat Pesanan
        </button>
        <button
          onClick={() => setActiveTab('address')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'address'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" /> Alamat Pengiriman
        </button>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Status Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 text-xs scrollbar-none">
            {[
              { id: 'all', label: 'Semua Status' },
              { id: 'Menunggu Pembayaran', label: 'Menunggu Bayar' },
              { id: 'Dibayar', label: 'Dibayar' },
              { id: 'Diproses', label: 'Diproses' },
              { id: 'Dikirim', label: 'Dikirim' },
              { id: 'Selesai', label: 'Selesai' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3.5 py-2 rounded-xl font-semibold border shrink-0 transition-all ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Pesanan
              </h4>
              <p className="text-xs text-slate-500">
                Anda belum memiliki pesanan dengan filter ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        #{order.orderNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">
                        {new Date(order.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Order Items Preview */}
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img
                          src={item.productImage}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover border"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.productName}
                          </h4>
                          <p className="text-slate-500">
                            {item.quantity} x {formatRupiah(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500">Total Belanja:</span>{' '}
                      <strong className="text-base text-blue-600 dark:text-blue-400 font-black ml-1">
                        {formatRupiah(order.grandTotal)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === 'Menunggu Pembayaran' && (
                        <button
                          onClick={() => handlePayWithAustin(order)}
                          disabled={isCreatingPayment}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 text-xs transition-all cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Bayar QRIS
                        </button>
                      )}
                      {order.shippingDetail.trackingNumber && (
                        <button
                          onClick={() => {
                            if (onOpenTrackingModal) {
                              onOpenTrackingModal(
                                order.shippingDetail.trackingNumber,
                                order.shippingDetail.courierCode || 'jne'
                              );
                            }
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5" /> Lacak Live
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsInvoiceOpen(true);
                        }}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" /> Invoice
                      </button>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-1.5"
                      >
                        Detail Pesanan <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADDRESS TAB */}
      {activeTab === 'address' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Alamat Pengiriman Utama</h3>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded text-xs">Utama</span>
          </div>
          <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{primaryAddress.recipientName} ({primaryAddress.phone})</p>
            <p>{primaryAddress.fullAddress}</p>
            <p>{primaryAddress.cityName}, {primaryAddress.provinceName} - {primaryAddress.postalCode}</p>
            {primaryAddress.courierNotes && (
              <p className="italic text-slate-400">Catatan: {primaryAddress.courierNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && !isInvoiceOpen && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Detail Pesanan #${selectedOrder.orderNumber}`}
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Status Pesanan</span>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {selectedOrder.status}
                </div>
              </div>
              {selectedOrder.shippingDetail.trackingNumber && (
                <div className="text-right">
                  <span className="text-xs text-slate-400">Nomor Resi RajaOngkir</span>
                  <div
                    onClick={() => copyToClipboard(selectedOrder.shippingDetail.trackingNumber!)}
                    className="text-xs font-mono font-bold text-blue-600 flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    {selectedOrder.shippingDetail.trackingNumber} <Copy className="w-3 h-3" />
                  </div>
                </div>
              )}
            </div>

            {/* Courier Info */}
            <div className="p-4 border rounded-2xl space-y-2 text-xs bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" /> Kurir Pengiriman (RajaOngkir)
                </h4>
                {selectedOrder.shippingDetail.trackingNumber && onOpenTrackingModal && (
                  <button
                    onClick={() => {
                      onOpenTrackingModal(
                        selectedOrder.shippingDetail.trackingNumber,
                        selectedOrder.shippingDetail.courierCode || 'jne'
                      );
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[11px] shadow-sm flex items-center gap-1 active:scale-95"
                  >
                    <Truck className="w-3.5 h-3.5" /> Lacak Status Real-Time
                  </button>
                )}
              </div>
              <p>
                <strong>{selectedOrder.shippingDetail.courierName}</strong> - Layanan{' '}
                {selectedOrder.shippingDetail.courierService} (Est. {selectedOrder.shippingDetail.shippingEstimate})
              </p>
              <p className="text-slate-400">
                Total Berat: {formatWeight(selectedOrder.shippingDetail.totalWeightGrams)}
              </p>
            </div>

            {/* Address */}
            <div className="p-4 border rounded-2xl space-y-1 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" /> Alamat Tujuan
              </h4>
              <p className="font-bold">{selectedOrder.addressSnapshot.recipientName} ({selectedOrder.addressSnapshot.phone})</p>
              <p>{selectedOrder.addressSnapshot.fullAddress}, {selectedOrder.addressSnapshot.cityName}, {selectedOrder.addressSnapshot.provinceName}</p>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-700">Daftar Produk:</h4>
              {selectedOrder.items.map((i) => (
                <div key={i.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span>{i.productName} ({i.quantity}x)</span>
                  <span className="font-bold">{formatRupiah(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t flex justify-between font-bold text-sm">
              <span>Total Pembayaran</span>
              <span className="text-blue-600">{formatRupiah(selectedOrder.grandTotal)}</span>
            </div>

            {selectedOrder.status === 'Menunggu Pembayaran' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handlePayWithAustin(selectedOrder)}
                  disabled={isCreatingPayment}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 text-xs transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4" /> Bayar Sekarang via AustinPay QRIS
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Invoice Printable Modal */}
      {selectedOrder && isInvoiceOpen && (
        <Modal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          title={`Invoice #${selectedOrder.orderNumber}`}
          maxWidth="2xl"
        >
          <div className="p-6 bg-white text-slate-900 rounded-xl space-y-6 border" id="printable-invoice">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-2xl font-black text-blue-700">NusaStore</h1>
                <p className="text-xs text-slate-500">Toko Online Terpercaya Indonesia</p>
              </div>
              <div className="text-right text-xs">
                <h3 className="font-bold">INVOICE PESANAN</h3>
                <p className="font-mono text-slate-500">{selectedOrder.orderNumber}</p>
                <p className="text-slate-500">{new Date(selectedOrder.createdAt).toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-700">Tujuan Pengiriman:</h4>
                <p className="font-semibold">{selectedOrder.addressSnapshot.recipientName}</p>
                <p>{selectedOrder.addressSnapshot.fullAddress}</p>
                <p>{selectedOrder.addressSnapshot.cityName}, {selectedOrder.addressSnapshot.provinceName}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-700">Pengiriman:</h4>
                <p>Kurir: {selectedOrder.shippingDetail.courierName} ({selectedOrder.shippingDetail.courierService})</p>
                <p>No. Resi: {selectedOrder.shippingDetail.trackingNumber || 'Dalam Proses'}</p>
              </div>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-100 text-left">
                  <th className="p-2">Produk</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Harga</th>
                  <th className="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((it) => (
                  <tr key={it.id} className="border-b">
                    <td className="p-2">{it.productName}</td>
                    <td className="p-2 text-center">{it.quantity}</td>
                    <td className="p-2 text-right">{formatRupiah(it.price)}</td>
                    <td className="p-2 text-right font-bold">{formatRupiah(it.price * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-xs space-y-1 text-right pt-2 border-t">
              <div>Subtotal: {formatRupiah(selectedOrder.subtotal)}</div>
              <div>Ongkos Kirim RajaOngkir: {formatRupiah(selectedOrder.shippingCost)}</div>
              {selectedOrder.discount > 0 && <div>Diskon: -{formatRupiah(selectedOrder.discount)}</div>}
              <div className="text-base font-black text-blue-700 pt-1">
                Grand Total: {formatRupiah(selectedOrder.grandTotal)}
              </div>
            </div>

            <div className="text-center pt-4 border-t text-[11px] text-slate-400">
              Terima kasih telah berbelanja di NusaStore!
            </div>
          </div>
        </Modal>
      )}

      {/* AustinPay Dynamic QRIS Modal */}
      <AustinPayModal
        isOpen={isAustinPayOpen}
        onClose={() => setIsAustinPayOpen(false)}
        depositData={austinDepositData}
        isSimulated={isAustinSimulated}
        onPaymentSuccess={handleAustinSuccess}
      />
    </div>
  );
};
