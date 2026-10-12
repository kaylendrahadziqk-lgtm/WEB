import React from 'react';
import { ArrowRight, ShieldCheck, Truck, RefreshCw, CreditCard, Sparkles } from 'lucide-react';
import { Category } from '../types';

interface HeroBannerProps {
  categories: Category[];
  onSelectCategory: (catId: string) => void;
  onExploreClick: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  categories,
  onSelectCategory,
  onExploreClick,
}) => {
  return (
    <div className="space-y-10">
      {/* Bold Typography Hero Card */}
      <div className="relative rounded-3xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 p-8 sm:p-14 overflow-hidden shadow-sm">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-600/20 text-[10px] font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Platform E-Commerce Indonesia
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.92]">
            Belanja Produk <span className="font-serif-italic font-normal text-slate-400 dark:text-slate-500">Pilihan</span> dengan Ongkir <span className="text-blue-600 dark:text-blue-400 underline decoration-4 underline-offset-8">RajaOngkir</span> Akurat.
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base font-medium leading-relaxed max-w-xl">
            Dapatkan pengalaman belanja online super cepat, 100% produk original, dan kalkulasi ongkos kirim real-time ke seluruh kota & kabupaten di Indonesia.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onExploreClick}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-extrabold px-7 py-4 rounded-2xl shadow-xl transition-all flex items-center gap-2.5 text-xs uppercase tracking-widest group active:scale-95"
            >
              Jelajahi Katalog <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-5 py-3.5 rounded-2xl shadow-sm">
              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Dukungan Kurir: JNE, POS, TIKI, SiCepat, J&T</span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Highlights Grid - Crisp Bold Minimalist Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 shadow-sm flex items-start gap-3.5 hover:border-blue-600 transition-colors">
          <div className="p-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0 font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Jaminan Original</h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">100% Produk Garansi Asli</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 shadow-sm flex items-start gap-3.5 hover:border-blue-600 transition-colors">
          <div className="p-3 rounded-xl bg-blue-600 text-white shrink-0 font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Cek Ongkir Cepat</h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">RajaOngkir Multi Kurir</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 shadow-sm flex items-start gap-3.5 hover:border-blue-600 transition-colors">
          <div className="p-3 rounded-xl bg-emerald-600 text-white shrink-0 font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Pembayaran Transparan</h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Transfer & E-Wallet</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 shadow-sm flex items-start gap-3.5 hover:border-blue-600 transition-colors">
          <div className="p-3 rounded-xl bg-amber-500 text-white shrink-0 font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Garansi Retur</h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Proses Retur 7 Hari</p>
          </div>
        </div>
      </div>

      {/* Category Chips Bar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Katalog Lengkap</span>
            <h3 className="font-black text-xl tracking-tight text-slate-900 dark:text-slate-100">
              Kategori <span className="font-serif-italic font-normal text-slate-400">Populer</span>
            </h3>
          </div>
          <button
            onClick={onExploreClick}
            className="text-xs font-extrabold text-blue-600 hover:underline uppercase tracking-wider"
          >
            Lihat Semua &rarr;
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => onSelectCategory('all')}
            className="px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black tracking-wider uppercase shrink-0 shadow-md transition-all active:scale-95"
          >
            Semua Produk
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 hover:border-blue-600 text-slate-800 dark:text-slate-200 text-xs font-extrabold tracking-wider shrink-0 transition-all active:scale-95 hover:text-blue-600"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
