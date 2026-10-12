import React, { useState, useMemo } from 'react';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { ProductCard } from './components/ProductCard';
import { ProductFilterBar } from './components/ProductFilterBar';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutView } from './components/Checkout/CheckoutView';
import { AccountView } from './components/Account/AccountView';
import { AdminDashboardView } from './components/Admin/AdminDashboardView';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { Footer } from './components/Footer';
import { Product, Order } from './types';
import { dbStore } from './data/dbStore';
import { Sparkles, Flame, Tag, SearchX, ShoppingBag, Truck } from 'lucide-react';

function MainStoreApp() {
  const [activeView, setActiveView] = useState<'home' | 'catalog' | 'cart' | 'checkout' | 'account' | 'admin'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(5000000);

  // Selected Product for detail modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Tracking Modal State
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingWaybill, setTrackingWaybill] = useState('');
  const [trackingCourier, setTrackingCourier] = useState('jne');

  const handleOpenTrackingModal = (waybill?: string, courier?: string) => {
    const wb = typeof waybill === 'string' ? waybill : '';
    const cr = typeof courier === 'string' ? courier : 'jne';
    setTrackingWaybill(wb);
    setTrackingCourier(cr);
    setIsTrackingOpen(true);
  };

  const { isCartDrawerOpen, setIsCartDrawerOpen } = useCart();
  const { isAdmin } = useAuth();

  const products = dbStore.getProducts();
  const categories = dbStore.getCategories();

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Active check
      if (!p.isActive) return false;

      // Category check
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }

      // Search check
      if (
        searchQuery.trim() &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Stock check
      if (inStockOnly && p.stock <= 0) return false;

      // Max price check
      const effectivePrice = p.discountPrice || p.price;
      if (effectivePrice > maxPrice) return false;

      return true;
    }).sort((a, b) => {
      const priceA = a.discountPrice || a.price;
      const priceB = b.discountPrice || b.price;

      if (sortBy === 'price_low') return priceA - priceB;
      if (sortBy === 'price_high') return priceB - priceA;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      // popular
      return b.soldCount - a.soldCount;
    });
  }, [products, selectedCategory, searchQuery, inStockOnly, maxPrice, sortBy]);

  const handleOpenProductDetail = (prod: Product) => {
    setDetailProduct(prod);
    setIsDetailOpen(true);
  };

  const handleBuyNow = (prod: Product, qty: number, variant?: string) => {
    setActiveView('checkout');
  };

  const handleOrderSuccess = (order: Order) => {
    setActiveView('account');
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('popular');
    setInStockOnly(false);
    setMaxPrice(5000000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header Navbar */}
      <Navbar
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setActiveView('catalog');
        }}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenProductDetail={handleOpenProductDetail}
        onOpenTrackingModal={handleOpenTrackingModal}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {/* VIEW: HOME */}
        {activeView === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
            {/* Hero Section */}
            <HeroBanner
              categories={categories}
              onSelectCategory={(catId) => {
                setSelectedCategory(catId);
                setActiveView('catalog');
              }}
              onExploreClick={() => setActiveView('catalog')}
            />

            {/* Discounted Hot Deals Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                    <Flame className="w-5 h-5 fill-rose-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Promo Spesial Diskon
                    </h2>
                    <p className="text-xs text-slate-500">
                      Produk pilihan harga hemat garansi original
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('catalog')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products
                  .filter((p) => p.discountPrice && p.discountPrice < p.price)
                  .slice(0, 4)
                  .map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetail={handleOpenProductDetail}
                    />
                  ))}
              </div>
            </section>

            {/* Popular Products */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Produk Terlaris
                    </h2>
                    <p className="text-xs text-slate-500">
                      Favorit pelanggan dengan rating tertinggi
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('catalog')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Lihat Katalog
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.slice(0, 8).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetail={handleOpenProductDetail}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* VIEW: CATALOG */}
        {activeView === 'catalog' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Katalog Produk NusaStore
              </h1>
              <p className="text-xs text-slate-500">
                Temukan berbagai produk berkualitas tinggi dengan kalkulasi ongkir RajaOngkir akurat.
              </p>
            </div>

            {/* Filter Bar */}
            <ProductFilterBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              categories={categories}
              sortBy={sortBy}
              setSortBy={setSortBy}
              inStockOnly={inStockOnly}
              setInStockOnly={setInStockOnly}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              onReset={handleResetFilters}
            />

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                    Produk Tidak Ditemukan
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Coba sesuaikan pencarian atau atur ulang filter kategori dan rentang harga Anda.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-500"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenDetail={handleOpenProductDetail}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: CHECKOUT */}
        {activeView === 'checkout' && (
          <CheckoutView
            onBackToCart={() => setActiveView('catalog')}
            onOrderSuccess={handleOrderSuccess}
          />
        )}

        {/* VIEW: ACCOUNT */}
        {activeView === 'account' && (
          <AccountView onOpenTrackingModal={handleOpenTrackingModal} />
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {activeView === 'admin' && <AdminDashboardView />}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onProceedToCheckout={() => setActiveView('checkout')}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onBuyNow={handleBuyNow}
      />

      {/* Real-time Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialWaybill={trackingWaybill}
        initialCourier={trackingCourier}
      />

      {/* Footer */}
      <Footer
        onSelectCategory={(catId) => {
          setSelectedCategory(catId);
          setActiveView('catalog');
        }}
        setActiveView={setActiveView}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MainStoreApp />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
