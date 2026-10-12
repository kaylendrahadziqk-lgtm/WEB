import React, { useState, useEffect } from 'react';
import { Product, Review } from '../types';
import { formatRupiah, formatWeight } from '../lib/currency';
import { Modal } from './ui/Modal';
import {
  Star,
  ShoppingCart,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Plus,
  Minus,
  Scale,
  Heart,
  MessageSquarePlus,
  Send,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { dbStore } from '../data/dbStore';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (product: Product, qty: number, variant?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onBuyNow,
}) => {
  if (!product) return null;

  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [selectedImage, setSelectedImage] = useState<string>(
    product.images[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string>(
    product.variants?.[0]?.name || ''
  );
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');
  const [isWishlisted, setIsWishlisted] = useState(() => dbStore.isInWishlist(product.id));

  // Reviews state
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.images[0]?.url || '');
      setIsWishlisted(dbStore.isInWishlist(product.id));
      setReviewsList(dbStore.getReviews(product.id));
    }
  }, [product]);

  const hasDiscount = product.discountPrice && product.discountPrice < product.price;
  const currentPrice = product.discountPrice || product.price;

  const handleToggleWishlist = () => {
    const added = dbStore.toggleWishlist(product.id);
    setIsWishlisted(added);
    showToast(
      added ? `"${product.name}" ditambahkan ke Favorit` : `"${product.name}" dihapus dari Favorit`,
      added ? 'success' : 'info'
    );
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedVariant || undefined);
  };

  const handleBuyNowClick = () => {
    addToCart(product, quantity, selectedVariant || undefined);
    onClose();
    onBuyNow(product, quantity, selectedVariant || undefined);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      showToast('Silakan tulis ulasan/komentar Anda.', 'error');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const rev = dbStore.addReview({
        productId: product.id,
        userName: user.name || 'Pelanggan Setia',
        rating: newRating,
        comment: newComment.trim(),
      });

      setReviewsList((prev) => [rev, ...prev]);
      setNewComment('');
      showToast('Terima kasih atas ulasan Anda!', 'success');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="3xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-inner">
            <img
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleToggleWishlist}
              className={`absolute top-3 right-3 p-3 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 ${
                isWishlisted
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-rose-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImage === img.url
                      ? 'border-blue-600 scale-105 shadow-md'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info & Options */}
        <div className="flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs">
              <span className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider text-[10px]">
                {product.categoryName || 'Kategori'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-mono font-bold flex items-center gap-1 text-[11px]">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                {formatWeight(product.weight)}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tight">
              {product.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center gap-3 text-xs mb-4">
              <div className="flex items-center text-amber-500 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-md">
                <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" />
                {product.rating.toFixed(1)}
              </div>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold">
                {reviewsList.length} Ulasan
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold">
                Terjual {product.soldCount}
              </span>
            </div>

            {/* Price Box */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-2xl mb-4 border-2 border-slate-900/10 dark:border-slate-700">
              {hasDiscount && (
                <div className="text-xs text-slate-400 line-through mb-0.5 font-semibold">
                  {formatRupiah(product.price)}
                </div>
              )}
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                {formatRupiah(currentPrice)}
              </div>
            </div>

            {/* Variant selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Pilih Varian:
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.name)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                        selectedVariant === v.name
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Jumlah Produk:
              </span>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 border-slate-900/10 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-4 text-sm font-black text-slate-900 dark:text-slate-100">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= product.stock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-400 font-bold">
                  Stok: <strong className="text-slate-900 dark:text-slate-100">{product.stock}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={product.stock <= 0}
                onClick={handleAddToCart}
                className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" /> + Keranjang
              </button>
              <button
                disabled={product.stock <= 0}
                onClick={handleBuyNowClick}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-400" /> Beli Langsung
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100% Original
              </div>
              <div className="flex items-center justify-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-500" /> RajaOngkir
              </div>
              <div className="flex items-center justify-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-500" /> Garansi Toko
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
        <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
          <button
            onClick={() => setActiveTab('desc')}
            className={`text-xs font-extrabold uppercase tracking-wider pb-2 transition-all relative ${
              activeTab === 'desc'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Deskripsi Produk
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`text-xs font-extrabold uppercase tracking-wider pb-2 transition-all relative ${
              activeTab === 'reviews'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Ulasan Pembeli ({reviewsList.length})
          </button>
        </div>

        {activeTab === 'desc' && (
          <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-3">
            <p>{product.description}</p>
            <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-mono bg-slate-100 dark:bg-slate-800/60 p-3.5 rounded-2xl border">
              <div>SKU: {product.sku}</div>
              <div>Berat: {formatWeight(product.weight)}</div>
              <div>Kategori: {product.categoryName}</div>
              <div>Status: {product.stock > 0 ? 'Tersedia' : 'Habis'}</div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {/* Submit review form */}
            <form
              onSubmit={handleSubmitReview}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-900/10 dark:border-slate-700 space-y-3"
            >
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 text-blue-600" /> Tulis Ulasan Produk
              </h4>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Bintang:
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= newRating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                placeholder="Bagikan pengalaman belanja Anda dengan produk ini..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600"
              />

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider text-[11px] px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" /> Kirim Ulasan
              </button>
            </form>

            {/* List of reviews */}
            <div className="space-y-3">
              {reviewsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada ulasan untuk produk ini.</p>
              ) : (
                reviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs space-y-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        {rev.userName}
                      </span>
                      <span className="text-amber-500 flex items-center font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 mr-1" /> {rev.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">
                      {rev.comment}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(rev.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

