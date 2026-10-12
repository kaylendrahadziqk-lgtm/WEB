import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  User as UserIcon,
  Moon,
  Sun,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Truck,
  Heart,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from './ui/Modal';
import { Product } from '../types';
import { dbStore } from '../data/dbStore';
import { formatRupiah } from '../lib/currency';

interface NavbarProps {
  onSelectCategory: (catId: string) => void;
  onOpenCart: () => void;
  activeView: 'home' | 'catalog' | 'cart' | 'checkout' | 'account' | 'admin';
  setActiveView: (view: 'home' | 'catalog' | 'cart' | 'checkout' | 'account' | 'admin') => void;
  onOpenProductDetail: (product: Product) => void;
  onOpenTrackingModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectCategory,
  onOpenCart,
  activeView,
  setActiveView,
  onOpenProductDetail,
  onOpenTrackingModal,
}) => {
  const { totalItemsCount } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { user, isAdmin, switchUserRole } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories = dbStore.getCategories();
  const allProducts = dbStore.getProducts();

  // Search filter
  const searchResults = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveView('home');
                  onSelectCategory('all');
                }}
                className="flex items-center gap-2 group focus:outline-none text-left"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-md group-hover:scale-105 transition-transform font-black text-lg tracking-tighter">
                  N
                </div>
                <div>
                  <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white block leading-none">
                    Nusa<span className="text-blue-600">Store.</span>
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mt-0.5">
                    RajaOngkir Integrated
                  </span>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-extrabold tracking-wider uppercase">
              <button
                onClick={() => {
                  setActiveView('home');
                  onSelectCategory('all');
                }}
                className={`transition-colors py-1 ${
                  activeView === 'home'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Beranda
              </button>
              <button
                onClick={() => {
                  setActiveView('catalog');
                  onSelectCategory('all');
                }}
                className={`transition-colors py-1 ${
                  activeView === 'catalog'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Katalog Produk
              </button>

              <button
                onClick={() => onOpenTrackingModal()}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 flex items-center gap-1.5"
              >
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span>Lacak Resi</span>
              </button>

              {/* Categories Dropdown */}
              <div className="relative group">
                <button className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 py-1">
                  <span>Kategori</span>
                  <ChevronRight className="w-3 h-3 group-hover:rotate-90 transition-transform" />
                </button>
                <div className="absolute top-full left-0 w-64 pt-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-2xl shadow-2xl p-2 space-y-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setActiveView('catalog');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 flex items-center justify-between transition-colors"
                      >
                        <span>{cat.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Search Input Bar */}
            <div className="flex-1 max-w-xs md:max-w-md relative hidden sm:block">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari produk, kategori..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white transition-all outline-none"
                />
              </div>

              {/* Live Search Autocomplete Dropdown */}
              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Hasil Pencarian ({searchResults.length})
                      </div>
                      {searchResults.slice(0, 6).map((product) => (
                        <div
                          key={product.id}
                          onClick={() => {
                            onOpenProductDetail(product);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                        >
                          <img
                            src={product.images[0]?.url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-blue-600 font-bold">
                              {formatRupiah(product.discountPrice || product.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada produk ditemukan untuk "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Control Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Ganti Mode Gelap/Terang"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Cart Button */}
              <button
                onClick={onOpenCart}
                className="relative p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Keranjang Belanja"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {totalItemsCount}
                  </span>
                )}
              </button>

              {/* Account / Admin Toggle Button */}
              <button
                onClick={() => {
                  if (isAdmin) {
                    setActiveView('admin');
                  } else {
                    setActiveView('account');
                  }
                }}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isAdmin
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{user.name.split(' ')[0]}</span>
                {isAdmin && (
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded">
                    ADMIN
                  </span>
                )}
              </button>

              {/* Role Switcher trigger */}
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Ganti Akun / Peran (Customer / Admin)"
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </button>

              {/* Mobile Burger Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-600 dark:text-slate-300 md:hidden hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => {
                setActiveView('home');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 font-semibold text-slate-800 dark:text-slate-200"
            >
              Beranda
            </button>
            <button
              onClick={() => {
                setActiveView('catalog');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 font-semibold text-slate-800 dark:text-slate-200"
            >
              Katalog Produk
            </button>
            <button
              onClick={() => {
                onOpenTrackingModal();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left py-2 font-bold text-blue-600 dark:text-blue-400"
            >
              <Truck className="w-4 h-4" /> Lacak Resi Real-Time
            </button>
            <button
              onClick={() => {
                setActiveView('account');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 font-semibold text-slate-800 dark:text-slate-200"
            >
              Akun Saya
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveView('admin');
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left py-2 font-bold text-amber-500"
              >
                Dashboard Admin
              </button>
            )}
          </div>
        )}
      </header>

      {/* Role / Auth Switcher Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title="Pilih Mode Pengguna"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simulasi login & hak akses untuk menguji fitur customer atau admin e-commerce NusaStore:
          </p>

          <div
            onClick={() => {
              switchUserRole('USER');
              setActiveView('home');
              setIsRoleModalOpen(false);
            }}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              !isAdmin
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Pelanggan (Customer)
              </div>
              <div className="text-xs text-slate-500">
                Beli produk, cek ongkir RajaOngkir, keranjang & checkout.
              </div>
            </div>
            {!isAdmin && (
              <span className="text-blue-600 font-bold text-xs bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                Aktif
              </span>
            )}
          </div>

          <div
            onClick={() => {
              switchUserRole('ADMIN');
              setActiveView('admin');
              setIsRoleModalOpen(false);
            }}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              isAdmin
                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                Administrator (Store Admin)
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xs text-slate-500">
                Kelola produk, stok, berat, kategori, pesanan & input nomor resi.
              </div>
            </div>
            {isAdmin && (
              <span className="text-amber-600 font-bold text-xs bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded">
                Aktif
              </span>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};
