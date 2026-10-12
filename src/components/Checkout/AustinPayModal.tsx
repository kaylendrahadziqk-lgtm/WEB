import React, { useState, useEffect, useRef } from 'react';
import { formatRupiah } from '../../lib/currency';
import { useToast } from '../../context/ToastContext';
import {
  QrCode,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Download,
} from 'lucide-react';

export interface AustinPayDepositData {
  id: string;
  transaction_id: string;
  amount: number;
  unique_code: number;
  fee: number;
  qr_string: string;
  qr_image: string;
  expired_at: string;
  status: 'pending' | 'paid' | 'expired';
}

interface AustinPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositData: AustinPayDepositData | null;
  isSimulated?: boolean;
  onPaymentSuccess: (deposit: AustinPayDepositData) => void;
}

export const AustinPayModal: React.FC<AustinPayModalProps> = ({
  isOpen,
  onClose,
  depositData,
  isSimulated = false,
  onPaymentSuccess,
}) => {
  const { showToast } = useToast();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);
  const [isSimulatingPay, setIsSimulatingPay] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);

  // Initialize countdown timer based on expired_at
  useEffect(() => {
    if (!isOpen || !depositData) return;

    setIsPaid(false);
    setIsExpired(false);
    setPollCount(0);

    const expiryTime = new Date(depositData.expired_at).getTime();
    const calculateRemaining = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setSecondsRemaining(diff);
      if (diff <= 0) {
        setIsExpired(true);
      }
    };

    calculateRemaining();
    timerRef.current = setInterval(calculateRemaining, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, depositData]);

  // Polling AustinPay endpoint /api/payment/austin/check/:transactionId (Every 5 seconds as specified in AustinPay docs)
  useEffect(() => {
    if (!isOpen || !depositData || isPaid || isExpired) return;

    const checkStatus = async () => {
      setIsPolling(true);
      try {
        const res = await fetch(`/api/payment/austin/check/${depositData.transaction_id}`);
        const data = await res.json();
        setPollCount((prev) => prev + 1);

        if (data && data.success && data.status === 'paid') {
          setIsPaid(true);
          showToast('Pembayaran QRIS berhasil dikonfirmasi oleh AustinPay!', 'success');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerRef.current) clearInterval(timerRef.current);

          setTimeout(() => {
            onPaymentSuccess(depositData);
          }, 1500);
        } else if (data && data.status === 'expired') {
          setIsExpired(true);
          showToast('QRIS pembayaran telah kedaluwarsa.', 'error');
        }
      } catch (err) {
        console.error('Failed to poll AustinPay status:', err);
      } finally {
        setIsPolling(false);
      }
    };

    // Initial check after 3 seconds, then every 5 seconds
    const initialTimeout = setTimeout(checkStatus, 3000);
    pollIntervalRef.current = setInterval(checkStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, depositData, isPaid, isExpired, onPaymentSuccess, showToast]);

  if (!isOpen || !depositData) return null;

  // Format time MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      console.warn('Clipboard write warning:', err);
    }
    showToast(`${label} berhasil disalin!`, 'success');
  };

  // Simulate payment instant success
  const handleSimulatePayment = async () => {
    if (isSimulatingPay || isPaid) return;
    setIsSimulatingPay(true);
    try {
      const res = await fetch(`/api/payment/austin/simulate/${depositData.transaction_id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setIsPaid(true);
        showToast('Simulasi QRIS berhasil dibayar!', 'success');
        setTimeout(() => {
          onPaymentSuccess(depositData);
        }, 1200);
      }
    } catch (err) {
      console.error('Simulate payment error:', err);
      showToast('Gagal menjalankan simulasi pembayaran.', 'error');
    } finally {
      setIsSimulatingPay(false);
    }
  };

  // Cancel transaction
  const handleCancelPayment = async () => {
    try {
      await fetch(`/api/payment/austin/cancel/${depositData.transaction_id}`, {
        method: 'POST',
      });
    } catch (e) {
      // ignore
    }
    showToast('Pembayaran dibatalkan.', 'info');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-default relative pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  AustinPay QRIS
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                  Real-Time
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Payment Gateway Terintegrasi (austinx.cloud)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
            aria-label="Tutup"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-700 dark:text-slate-300">
          {/* PAID STATE */}
          {isPaid ? (
            <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Pembayaran Sukses!
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  AustinPay telah memverifikasi transaksi secara real-time.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                ID Transaksi: {depositData.transaction_id}
              </div>
              <p className="text-xs text-slate-400 animate-pulse">
                Mengalihkan ke ringkasan pesanan...
              </p>
            </div>
          ) : isExpired ? (
            /* EXPIRED STATE */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                QRIS Telah Kedaluwarsa
              </h4>
              <p className="text-xs text-slate-500">
                Batas waktu pembayaran 15 menit telah habis. Silakan buat pesanan baru.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold"
              >
                Kembali ke Checkout
              </button>
            </div>
          ) : (
            /* ACTIVE QRIS DISPLAY */
            <>
              {/* Sandbox notice if simulation */}
              {isSimulated && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[11px]">AustinPay Sandbox Active</p>
                    <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                      API Key belum diset di .env. Anda dapat mencoba alur pembayaran lengkap dengan tombol simulasi di bawah.
                    </p>
                  </div>
                </div>
              )}

              {/* Amount & Countdown Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Total Pembayaran QRIS
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {formatRupiah(depositData.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(depositData.amount), 'Nominal')}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" /> Salin
                    </button>
                  </div>
                  {depositData.fee > 0 && (
                    <span className="text-[10px] text-slate-400">
                      (Termasuk biaya transaksi: {formatRupiah(depositData.fee)})
                    </span>
                  )}
                </div>

                {/* Countdown Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Kedaluwarsa: {timeFormatted}</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-sm relative">
                <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-100">
                  {depositData.qr_image ? (
                    <img
                      src={depositData.qr_image}
                      alt="AustinPay QRIS"
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400">
                      Memuat QR...
                    </div>
                  )}
                </div>

                {/* Supported Payment Logos */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">BCA Mobile</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">Livin' Mandiri</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">BRImo</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">GoPay</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">OVO</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">DANA</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">ShopeePay</span>
                </div>

                {/* Real-time Status Radar Ping */}
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>
                    {isPolling ? 'Memeriksa status pembayaran...' : 'Menunggu pembayaran via QRIS...'}
                  </span>
                  {pollCount > 0 && (
                    <span className="text-[10px] text-slate-400">({pollCount}x poll)</span>
                  )}
                </div>
              </div>

              {/* Instructions Steps */}
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  Cara Membayar:
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                  <li>Buka aplikasi m-Banking atau E-Wallet pilihan Anda.</li>
                  <li>Pilih menu <b>Scan / QRIS</b> lalu arahkan kamera ke kode QR di atas.</li>
                  <li>Periksa nominal pembayaran dan konfirmasi dengan PIN Anda.</li>
                  <li>Halaman ini akan otomatis terupdate begitu pembayaran diterima!</li>
                </ol>
              </div>

              {/* Transaction Metadata Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1 font-mono">
                  Ref: {depositData.transaction_id}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(depositData.transaction_id, 'ID Transaksi')}
                    className="p-0.5 hover:text-slate-600"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
                <a
                  href="https://www.austinx.cloud/api-docs"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  AustinPay API Docs <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons Footer */}
        {!isPaid && !isExpired && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 justify-between">
            <button
              type="button"
              onClick={handleCancelPayment}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batalkan Transaksi
            </button>

            {/* Test Drive Button for Instant Sandbox Validation */}
            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={isSimulatingPay}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSimulatingPay ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Simulasi Bayar Berhasil (Test Drive)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
