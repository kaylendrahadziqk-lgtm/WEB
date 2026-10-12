import React, { useState } from 'react';
import { ShoppingBag, ShieldCheck, Truck, Headphones, Send, Heart } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface FooterProps {
  onSelectCategory: (catId: string) => void;
  setActiveView: (view: 'home' | 'catalog' | 'cart' | 'checkout' | 'account' | 'admin') => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory, setActiveView }) => {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      showToast('Terima kasih telah berlangganan newsletter NusaStore!', 'success');
      setEmail('');
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 transition-colors pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-white text-slate-900 flex items-center justify-center font-black text-lg">
                N
              </div>
              <span className="text-2xl font-black text-white tracking-tighter">
                Nusa<span className="text-blue-500">Store.</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Platform e-commerce lokal Indonesia dengan katalog produk terlengkap, jaminan 100% original, dan kalkulator ongkos kirim otomatis RajaOngkir.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Navigasi Toko
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    setActiveView('home');
                    onSelectCategory('all');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Beranda
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('catalog');
                    onSelectCategory('all');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Katalog Produk
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('account')}
                  className="hover:text-blue-400 transition-colors"
                >
                  Akun & Riwayat Pesanan
                </button>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Kategori Terpopuler
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('cat_01');
                    setActiveView('catalog');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Elektronik & Gadget
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('cat_02');
                    setActiveView('catalog');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Fashion Pria & Wanita
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onSelectCategory('cat_05');
                    setActiveView('catalog');
                  }}
                  className="hover:text-blue-400 transition-colors"
                >
                  Kopi & Kuliner Nusantara
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Berlangganan Promo
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Dapatkan info promo diskon dan kode kupon gratis ongkir langsung ke email Anda.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                required
                placeholder="Alamat email Anda..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 text-xs font-bold rounded-2xl bg-slate-800 border-2 border-slate-700 text-white outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl shadow-md transition-all font-black text-xs uppercase tracking-wider active:scale-95 flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            © 2026 <strong>NusaStore Official</strong>. Hak Cipta Dilindungi.
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            Dibuat dengan <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> untuk Indonesia
          </div>
        </div>
      </div>
    </footer>
  );
};
