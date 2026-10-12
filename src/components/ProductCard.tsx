import React, { useState } from 'react';
import { Product } from '../types';
import { formatRupiah, formatWeight } from '../lib/currency';
import { Star, ShoppingCart, Eye, Tag, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { dbStore } from '../data/dbStore';
import { useToast } from '../context/ToastContext';

interface ProductCardProps {
  product: Product;
  onOpenDetail: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetail }) => {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(() => dbStore.isInWishlist(product.id));

  const primaryImg = product.images.find((i) => i.isPrimary)?.url || product.images[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600';

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.price - (product.discountPrice || 0)) / product.price) * 100)
    : 0;

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = dbStore.toggleWishlist(product.id);
    setIsWishlisted(added);
    showToast(
      added ? `"${product.name}" ditambahkan ke Favorit` : `"${product.name}" dihapus dari Favorit`,
      added ? 'success' : 'info'
    );
  };

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-900/10 dark:border-slate-800 shadow-sm hover:border-slate-900 dark:hover:border-blue-500 transition-all duration-300 flex flex-col overflow-hidden relative">
      {/* Wishlist Button */}
      <button
        onClick={handleToggleWishlist}
        className={`absolute top-3 right-3 z-10 p-2.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-90 ${
          isWishlisted
            ? 'bg-rose-500 text-white'
            : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-white'
        }`}
        title={isWishlisted ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
      </button>

      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
        {hasDiscount && (
          <span className="bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <Tag className="w-3 h-3" /> -{discountPercent}%
          </span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
            Sisa {product.stock}
          </span>
        )}
        {product.stock === 0 && (
          <span className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg shadow-sm">
            Stok Habis
          </span>
        )}
      </div>

      {/* Image Container */}
      <div
        onClick={() => onOpenDetail(product)}
        className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer"
      >
        <img
          src={primaryImg}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(product);
            }}
            className="bg-white text-slate-900 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-1.5 hover:bg-slate-100 transition-all transform translate-y-2 group-hover:translate-y-0 active:scale-95"
          >
            <Eye className="w-4 h-4" /> Detail Produk
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            <span className="truncate">{product.categoryName || 'Produk'}</span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
              {formatWeight(product.weight)}
            </span>
          </div>

          <h3
            onClick={() => onOpenDetail(product)}
            className="font-extrabold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors mb-2 leading-snug tracking-tight"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        <div>
          {/* Rating & Sold count */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <div className="flex items-center text-amber-500 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-md text-[11px]">
              <Star className="w-3 h-3 fill-amber-500 mr-1" />
              {product.rating.toFixed(1)}
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Terjual {product.soldCount}
            </span>
          </div>

          {/* Pricing & Add to Cart */}
          <div className="flex items-end justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              {hasDiscount && (
                <div className="text-xs text-slate-400 line-through font-semibold">
                  {formatRupiah(product.price)}
                </div>
              )}
              <div className="font-black text-lg tracking-tight text-blue-600 dark:text-blue-400">
                {formatRupiah(product.discountPrice || product.price)}
              </div>
            </div>

            <button
              disabled={product.stock === 0}
              onClick={() => addToCart(product, 1)}
              className={`p-3 rounded-2xl transition-all ${
                product.stock === 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-lg active:scale-95'
              }`}
              title={product.stock === 0 ? 'Stok Habis' : 'Tambah ke Keranjang'}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
