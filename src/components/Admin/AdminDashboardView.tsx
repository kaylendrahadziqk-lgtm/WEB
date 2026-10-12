import React, { useState } from 'react';
import { dbStore } from '../../data/dbStore';
import { Product, Category, Order, OrderStatus } from '../../types';
import { formatRupiah, formatWeight } from '../../lib/currency';
import { Modal } from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Truck,
  CheckCircle2,
  Settings,
  X,
  Search,
  Scale,
  Building2,
  KeyRound,
  Printer,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Copy,
  AlertCircle,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'categories' | 'settings' | 'payment'>('overview');

  // Local state for product list & orders
  const [products, setProducts] = useState<Product[]>(() => dbStore.getProducts());
  const [orders, setOrders] = useState<Order[]>(() => dbStore.getOrders());
  const [categories, setCategories] = useState<Category[]>(() => dbStore.getCategories());
  const [settings, setSettings] = useState(() => dbStore.getStoreSettings());

  // AustinPay Diagnostic State
  const [austinConfig, setAustinConfig] = useState<{
    isConfigured: boolean;
    baseUrl: string;
    hasSecret: boolean;
    serverIpV4?: string;
    serverIpV6?: string;
    docsUrl: string;
  } | null>(null);
  const [testAmount, setTestAmount] = useState<number>(25000);
  const [isTestingAustin, setIsTestingAustin] = useState<boolean>(false);
  const [testQrResult, setTestQrResult] = useState<any>(null);
  const [testStatusCheck, setTestStatusCheck] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);

  React.useEffect(() => {
    fetch('/api/payment/austin/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAustinConfig(data.data);
      })
      .catch(() => {});
  }, []);

  // Product Form Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Order Update Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('Diproses');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // Calculate Metrics
  const totalRevenue = orders
    .filter((o) => o.status !== 'Dibatalkan')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  // AustinPay Diagnostic Handlers
  const handleTestGenerateQr = async () => {
    setIsTestingAustin(true);
    setTestQrResult(null);
    setTestStatusCheck(null);
    try {
      const res = await fetch('/api/payment/austin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: testAmount }),
      });
      const data = await res.json();
      if (data && data.success && data.deposit) {
        setTestQrResult(data.deposit);
        showToast('Test QRIS AustinPay berhasil digenerate!', 'success');
      } else {
        showToast(data?.message || 'Gagal generate test QRIS', 'error');
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setIsTestingAustin(false);
    }
  };

  const handleTestCheckStatus = async (transactionId: string) => {
    try {
      const res = await fetch(`/api/payment/austin/check/${transactionId}`);
      const data = await res.json();
      setTestStatusCheck(data);
      showToast(`Status: ${data.status} - ${data.message}`, data.status === 'paid' ? 'success' : 'info');
    } catch (e: any) {
      showToast('Error cek status: ' + e.message, 'error');
    }
  };

  const handleTestSimulatePay = async (transactionId: string) => {
    try {
      const res = await fetch(`/api/payment/austin/simulate/${transactionId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Simulasi bayar sukses! Cek polling status kembali.', 'success');
        handleTestCheckStatus(transactionId);
      }
    } catch (e: any) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/payment/austin/test-connection');
      const data = await res.json();
      setConnectionResult(data);
      if (data.success) {
        showToast('Koneksi AustinPay Berhasil! IP Server telah terdaftar di Whitelist.', 'success');
      } else {
        showToast(data.message || 'Koneksi ditolak oleh AustinPay', 'error');
      }
    } catch (e: any) {
      showToast('Gagal menguji koneksi: ' + e.message, 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (e) {
      // ignore
    }
    showToast(`${label} berhasil disalin!`, 'success');
  };

  // PRODUCT CRUD HANDLERS
  const handleOpenAddProduct = () => {
    setEditingProduct({
      name: '',
      slug: '',
      description: '',
      price: 150000,
      discountPrice: 0,
      stock: 20,
      weight: 500, // 500 grams default
      sku: `PROD-${Date.now().toString().slice(-4)}`,
      categoryId: categories[0]?.id || 'cat_01',
      categoryName: categories[0]?.name || 'Elektronik',
      isActive: true,
      images: [
        {
          id: 'img_new_1',
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          isPrimary: true,
        },
      ],
      rating: 5.0,
      reviewCount: 1,
      soldCount: 0,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Yakin ingin menghapus produk ini dari toko?')) {
      dbStore.deleteProduct(id);
      setProducts(dbStore.getProducts());
      showToast('Produk berhasil dihapus.', 'info');
    }
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) {
      showToast('Lengkapi nama dan harga produk!', 'error');
      return;
    }

    const catObj = categories.find((c) => c.id === editingProduct.categoryId);

    const productToSave: Product = {
      id: editingProduct.id || `prod_${Date.now()}`,
      name: editingProduct.name,
      slug: editingProduct.slug || editingProduct.name.toLowerCase().replace(/\s+/g, '-'),
      description: editingProduct.description || '',
      price: Number(editingProduct.price),
      discountPrice: editingProduct.discountPrice ? Number(editingProduct.discountPrice) : undefined,
      stock: Number(editingProduct.stock || 0),
      weight: Number(editingProduct.weight || 500),
      sku: editingProduct.sku || `SKU-${Date.now()}`,
      categoryId: editingProduct.categoryId || 'cat_01',
      categoryName: catObj?.name || 'Elektronik',
      isActive: editingProduct.isActive ?? true,
      images: editingProduct.images && editingProduct.images.length > 0
        ? editingProduct.images
        : [{ id: 'img_def', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' }],
      rating: editingProduct.rating || 5.0,
      reviewCount: editingProduct.reviewCount || 0,
      soldCount: editingProduct.soldCount || 0,
      createdAt: editingProduct.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.saveProduct(productToSave);
    setProducts(dbStore.getProducts());
    setIsProductModalOpen(false);
    showToast(`Produk "${productToSave.name}" berhasil disimpan!`, 'success');
  };

  // ORDER UPDATE HANDLER
  const handleUpdateOrderStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    dbStore.updateOrderStatus(
      selectedOrder.id,
      newStatus,
      trackingNumberInput.trim() || undefined
    );
    setOrders(dbStore.getOrders());
    setSelectedOrder(null);
    showToast(`Status pesanan #${selectedOrder.orderNumber} diperbarui menjadi ${newStatus}!`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            Dashboard Admin Store <span className="text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-400/20">ROLE: ADMIN</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola katalog produk, stok, berat pengiriman, pesanan masuk, dan resi RajaOngkir.
          </p>
        </div>

        <button
          onClick={handleOpenAddProduct}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" /> Tambah Produk Baru
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Ringkasan Dashboard
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Manajemen Produk ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          Manajemen Pesanan ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={`pb-3 transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'payment'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" /> Gateway AustinPay
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Pendapatan</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {formatRupiah(totalRevenue)}
                </h3>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-xl">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Pesanan</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {orders.length}
                </h3>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Produk Aktif</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {products.filter((p) => p.isActive).length}
                </h3>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Lokasi Asal Kirim</span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {settings.originCityName} (ID: {settings.originCityId})
                </h3>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Pesanan Terbaru Masuk
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="p-3">No. Pesanan</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Kurir</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.slice(0, 5).map((ord) => (
                    <tr key={ord.id}>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        #{ord.orderNumber}
                      </td>
                      <td className="p-3 font-semibold">{ord.customerName}</td>
                      <td className="p-3 font-bold text-blue-600">
                        {formatRupiah(ord.grandTotal)}
                      </td>
                      <td className="p-3">
                        {ord.shippingDetail.courierName} ({ord.shippingDetail.courierService})
                      </td>
                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                        {ord.status}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrder(ord);
                            setNewStatus(ord.status);
                            setTrackingNumberInput(ord.shippingDetail.trackingNumber || '');
                          }}
                          className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500"
                        >
                          Kelola
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Daftar Inventaris Produk Store
            </h3>
            <button
              onClick={handleOpenAddProduct}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Produk
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">Produk</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Harga Normal</th>
                  <th className="p-3">Diskon</th>
                  <th className="p-3">Berat</th>
                  <th className="p-3">Stok</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 flex items-center gap-2">
                      <img
                        src={p.images[0]?.url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{p.sku}</td>
                    <td className="p-3">{p.categoryName}</td>
                    <td className="p-3 font-semibold">{formatRupiah(p.price)}</td>
                    <td className="p-3 text-rose-500 font-bold">
                      {p.discountPrice ? formatRupiah(p.discountPrice) : '-'}
                    </td>
                    <td className="p-3 font-mono">{formatWeight(p.weight)}</td>
                    <td className="p-3 font-bold">{p.stock}</td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-blue-50 hover:text-blue-600"
                        title="Edit Produk"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Daftar Seluruh Pesanan Masuk
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">No. Pesanan</th>
                  <th className="p-3">Pelanggan</th>
                  <th className="p-3">Alamat Tujuan</th>
                  <th className="p-3">Kurir & Berat</th>
                  <th className="p-3">Total Pembayaran</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Nomor Resi</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      #{ord.orderNumber}
                    </td>
                    <td className="p-3">
                      <div className="font-bold">{ord.customerName}</div>
                      <div className="text-[10px] text-slate-400">{ord.customerPhone}</div>
                    </td>
                    <td className="p-3 max-w-xs truncate">
                      {ord.addressSnapshot.cityName}, {ord.addressSnapshot.provinceName}
                    </td>
                    <td className="p-3">
                      <div>{ord.shippingDetail.courierName} ({ord.shippingDetail.courierService})</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {formatWeight(ord.shippingDetail.totalWeightGrams)}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-blue-600">
                      {formatRupiah(ord.grandTotal)}
                    </td>
                    <td className="p-3 font-bold">{ord.status}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600">
                      {ord.shippingDetail.trackingNumber || '-'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setNewStatus(ord.status);
                          setTrackingNumberInput(ord.shippingDetail.trackingNumber || '');
                        }}
                        className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500"
                      >
                        Update Resi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUSTINPAY GATEWAY MANAGEMENT TAB */}
      {activeTab === 'payment' && (
        <div className="space-y-6">
          {/* Top Banner Card */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 border border-slate-700/60 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <QrCode className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black">AustinPay Payment Gateway</h3>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      austinConfig?.isConfigured
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {austinConfig?.isConfigured ? 'LIVE API CONNECTED' : 'SANDBOX SIMULATOR'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Integrasi REST API QRIS Dinamis & Webhook Real-time (austinx.cloud & austinstore.id).
                </p>
              </div>
            </div>

            <a
              href="https://www.austinx.cloud/api-docs"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-white/15 backdrop-blur-sm transition-all"
            >
              <ExternalLink className="w-4 h-4" /> Buka Dokumentasi API
            </a>
          </div>

          {/* 2 Column Settings & Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Configuration & IP Whitelist Guide */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Status & Parameter Integrasi
                </h4>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Gateway Provider:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">AustinPay (AustinX Cloud)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Base URL:</span>
                  <span className="font-mono font-bold text-blue-600">{austinConfig?.baseUrl || 'https://austinstore.id'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">API Key Status:</span>
                  <span className="font-bold">
                    {austinConfig?.isConfigured ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terpasang di .env
                      </span>
                    ) : (
                      <span className="text-amber-500">Belum diset (Mode Sandbox Aktif)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">HMAC-SHA256 Signature:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {austinConfig?.hasSecret ? 'Aktif (Header X-Signature)' : 'Opsional'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Interval Polling:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">5 Detik (Sesuai Ketentuan Docs)</span>
                </div>
              </div>

              {/* IP Whitelist Info Box */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    IP Server (Khusus IPv4 — Sesuai Format AustinPay)
                  </span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    {isTestingConnection ? 'Menguji...' : 'Uji Status Whitelist'}
                  </button>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">IPv4 Server (Telah Terdaftar di AustinPay):</span>
                    <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {austinConfig?.serverIpV4 || '34.34.254.128'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(austinConfig?.serverIpV4 || '34.34.254.128', 'IPv4')}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin IP
                  </button>
                </div>

                {connectionResult && (
                  <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    connectionResult.success
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                  }`}>
                    {connectionResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{connectionResult.message}</span>
                  </div>
                )}
              </div>

              {/* Step-by-step setup guide */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Langkah Menghubungkan API Key AustinPay:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 pl-1 leading-relaxed text-[11px]">
                  <li>
                    Buka <a href="https://austinstore.id" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">austinstore.id</a> lalu login ke akun merchant Anda.
                  </li>
                  <li>Masuk ke <b>Profil → API Key</b> lalu klik <b>Buat API Key</b>.</li>
                  <li>
                    Di bagian <b>Whitelist IP</b>, tambahkan IP server hosting aplikasi Anda (wajib oleh AustinPay).
                  </li>
                  <li>
                    Salin API Key ke file <code>.env</code> variabel <code>AUSTIN_API_KEY="apg_live_..."</code>.
                  </li>
                </ol>
              </div>
            </div>

            {/* Right: Live Interactive Test Console */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Konsol Pengujian API Gateway
                  </h4>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                  POST /api/deposit/create
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Uji Coba Deposit (Rp):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={testAmount}
                      onChange={(e) => setTestAmount(Number(e.target.value))}
                      className="flex-1 p-2.5 border rounded-xl bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleTestGenerateQr}
                      disabled={isTestingAustin}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                    >
                      {isTestingAustin ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim...
                        </>
                      ) : (
                        <>
                          <QrCode className="w-3.5 h-3.5" /> Test Generate QRIS
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Test QR Result */}
                {testQrResult && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Ref: {testQrResult.transaction_id}
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        {formatRupiah(testQrResult.amount)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      {testQrResult.qr_image && (
                        <img
                          src={testQrResult.qr_image}
                          alt="Test QR"
                          className="w-24 h-24 object-contain rounded-xl bg-white p-1 border shadow-sm"
                        />
                      )}
                      <div className="space-y-1.5 flex-1 text-[11px]">
                        <p className="text-slate-500">
                          Fee: <strong>{formatRupiah(testQrResult.fee)}</strong>
                        </p>
                        <p className="text-slate-500">
                          Status:{' '}
                          <span className="font-bold uppercase text-amber-600">
                            {testStatusCheck?.status || testQrResult.status}
                          </span>
                        </p>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleTestCheckStatus(testQrResult.transaction_id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Cek Status
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestSimulatePay(testQrResult.transaction_id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> Simulasi Lunas
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table of Orders Paid via AustinPay */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Daftar Transaksi Pesanan AustinPay
              </h4>
              <span className="text-xs text-slate-400">
                {orders.filter((o) => o.payment.method === 'austinpay').length} Transaksi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                    <th className="p-3">No. Pesanan</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Ref AustinPay</th>
                    <th className="p-3">Total Bayar</th>
                    <th className="p-3">Status Pesanan</th>
                    <th className="p-3">Status Pembayaran</th>
                    <th className="p-3 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders
                    .filter((o) => o.payment.method === 'austinpay')
                    .map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-blue-600">
                          #{ord.orderNumber}
                        </td>
                        <td className="p-3 font-semibold">{ord.customerName}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {ord.payment.transactionId || '-'}
                        </td>
                        <td className="p-3 font-bold text-emerald-600">
                          {formatRupiah(ord.grandTotal)}
                        </td>
                        <td className="p-3">
                          <span className="font-bold">{ord.status}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              ord.payment.status === 'success'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {ord.payment.status}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          {new Date(ord.createdAt).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  {orders.filter((o) => o.payment.method === 'austinpay').length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Belum ada transaksi dengan metode AustinPay. Coba buat pesanan di halaman checkout!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {editingProduct && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={editingProduct.id ? 'Edit Produk' : 'Tambah Produk Baru'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveProductSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Harga Normal (Rp) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Harga Diskon (Rp, Opsional)</label>
                <input
                  type="number"
                  value={editingProduct.discountPrice || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, discountPrice: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Berat Produk (GRAM) *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.weight || 500}
                  onChange={(e) => setEditingProduct({ ...editingProduct, weight: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Jumlah Stok *</label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">SKU Produk</label>
                <input
                  type="text"
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Kategori Produk</label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-semibold mb-1">URL Gambar Produk</label>
                <input
                  type="url"
                  value={editingProduct.images?.[0]?.url || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      images: [{ id: 'img_1', url: e.target.value, isPrimary: true }],
                    })
                  }
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold mb-1">Deskripsi Produk</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold"
              >
                Simpan Produk
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Order Status & Resi Update Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Kelola Status Pesanan #${selectedOrder.orderNumber}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateOrderStatusSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Status Pesanan Baru:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800 font-bold"
              >
                <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                <option value="Dibayar">Dibayar</option>
                <option value="Diproses">Diproses</option>
                <option value="Dikirim">Dikirim</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">
                Nomor Resi RajaOngkir ({selectedOrder.shippingDetail.courierName}):
              </label>
              <input
                type="text"
                placeholder="e.g. JNE882910394812 atau SOC19238120"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-white dark:bg-slate-800 font-mono uppercase"
              />
            </div>

            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border rounded-xl font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold"
              >
                Simpan Status
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
