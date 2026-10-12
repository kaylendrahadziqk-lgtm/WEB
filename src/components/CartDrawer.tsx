import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatRupiah, formatWeight } from '../lib/currency';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  X,
  Scale,
  ShieldCheck,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotalAmount,
    totalWeightGrams,
    appliedCoupon,
    discountAmount,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');

  if (!isOpen) return null;

  const handleApplyCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponInput.trim()) {
      applyCoupon(couponInput);
      setCouponInput('');
    }
  };

  const grandTotal = Math.max(0, subtotalAmount - discountAmount);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 cursor-default relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Keranjang Belanja
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {cart.length} Jenis Produk ({cart.reduce((s, c) => s + c.quantity, 0)} Item)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shrink-0 z-20"
              aria-label="Tutup keranjang"
            >
              <X className="w-5 h-5 pointer-events-none" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                    Keranjang Masih Kosong
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Jelajahi berbagai produk pilihan kami dan tambahkan ke keranjang belanja Anda.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-center gap-3.5"
                >
                  <img
                    src={item.product.images[0]?.url}
                    alt={item.product.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.product.name}
                    </h4>
                    {item.variantName && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                        Varian: {item.variantName}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatRupiah(item.price)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({formatWeight(item.weight * item.quantity)})
                      </span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 space-y-4">
              {/* Weight summary notice for RajaOngkir */}
              <div className="flex items-center justify-between text-xs bg-blue-50/80 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/50 dark:border-blue-900/50 text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Scale className="w-4 h-4 text-blue-600" /> Total Berat Produk:
                </div>
                <span className="font-mono font-bold">{formatWeight(totalWeightGrams)}</span>
              </div>

              {/* Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/50 p-2.5 rounded-xl text-xs">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                      <Tag className="w-4 h-4" /> Kupon {appliedCoupon.code} Aktif
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs font-semibold text-rose-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCouponSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Punya Kode Kupon? (e.g. NUSA20)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl text-xs hover:bg-slate-800"
                    >
                      Pakai
                    </button>
                  </form>
                )}
              </div>

              {/* Calculations */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal Produk</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatRupiah(subtotalAmount)}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Diskon Kupon</span>
                    <span>-{formatRupiah(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Sementara</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  onClose();
                  onProceedToCheckout();
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
              >
                Lanjut ke Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
