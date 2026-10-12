import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { TrackingDetail } from '../types';
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Phone,
  UserCheck,
  Copy,
  ExternalLink,
  ShieldCheck,
  Package,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWaybill?: string;
  initialCourier?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialWaybill = '',
  initialCourier = 'jne',
}) => {
  const { showToast } = useToast();
  const [waybill, setWaybill] = useState(initialWaybill);
  const [courierCode, setCourierCode] = useState(initialCourier);
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto query if initialWaybill is provided
  useEffect(() => {
    if (initialWaybill && isOpen) {
      setWaybill(initialWaybill);
      handleTrack(initialWaybill, initialCourier);
    }
  }, [initialWaybill, initialCourier, isOpen]);

  const handleTrack = async (wbToTrack?: string, cCode?: string) => {
    const targetWb = (wbToTrack || waybill).trim();
    const targetCourier = cCode || courierCode;

    if (!targetWb) {
      showToast('Silakan masukkan nomor resi pengiriman.', 'error');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/shipping/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waybill: targetWb,
          courierCode: targetCourier,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setTrackingData(json.data);
      } else {
        setErrorMsg(json.message || 'Data tracking resi tidak ditemukan.');
      }
    } catch (err: any) {
      console.error('Track request error:', err);
      setErrorMsg('Gagal terhubung ke API tracking. Menggunakan data simulasi real-time.');
    } finally {
      setLoading(false);
    }
  };

  const copyResi = async () => {
    if (trackingData?.waybill) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(trackingData.waybill);
        }
      } catch (err) {
        console.warn('Clipboard write restricted in iframe context:', err);
      }
      showToast('Nomor resi berhasil disalin!', 'success');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-500 text-white';
      case 'OUT FOR DELIVERY':
        return 'bg-amber-500 text-white';
      case 'ON TRANSIT':
      default:
        return 'bg-blue-600 text-white';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lacak Pesanan Real-Time"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Search Input Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border-2 border-slate-900/10 dark:border-slate-700 space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Cek Resi Kurir Indonesia (RajaOngkir Integrated)
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={courierCode}
              onChange={(e) => setCourierCode(e.target.value)}
              className="px-3.5 py-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600"
            >
              <option value="jne">🚚 JNE Express</option>
              <option value="sicepat">⚡ SiCepat Ekspres</option>
              <option value="pos">📮 POS Indonesia</option>
              <option value="tiki">📦 TIKI</option>
              <option value="jnt">🚀 J&T Express</option>
            </select>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Masukkan Nomor Resi (Contoh: JP9812739102)..."
                value={waybill}
                onChange={(e) => setWaybill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-blue-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            <button
              onClick={() => handleTrack()}
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Melacak...</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-blue-400" />
                  <span>Lacak Live</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1">
            <span>Resi Contoh Quick Demo:</span>
            <button
              onClick={() => {
                setWaybill('JP9281739201');
                setCourierCode('jne');
                handleTrack('JP9281739201', 'jne');
              }}
              className="text-blue-600 font-bold hover:underline bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded"
            >
              JP9281739201 (JNE)
            </button>
            <button
              onClick={() => {
                setWaybill('SC881029381');
                setCourierCode('sicepat');
                handleTrack('SC881029381', 'sicepat');
              }}
              className="text-blue-600 font-bold hover:underline bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded"
            >
              SC881029381 (SiCepat)
            </button>
          </div>
        </div>

        {/* Error state */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tracking Details View */}
        {trackingData && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Status Header Banner */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      Live Tracking Active
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                    {trackingData.courierName}
                    <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-1 rounded-lg text-slate-300">
                      {trackingData.serviceCode}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">{trackingData.statusLabel}</p>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1.5">
                  <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${getStatusColor(trackingData.status)}`}>
                    {trackingData.status}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                    <span>Resi: {trackingData.waybill}</span>
                    <button
                      onClick={copyResi}
                      className="p-1 hover:bg-white/20 rounded transition-colors text-white"
                      title="Salin Resi"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Steps Visualizer */}
              <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                <div className="space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-900 font-black flex items-center justify-center mx-auto text-xs shadow-md">
                    1
                  </div>
                  <span className="text-emerald-400 block">Dikemas</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-900 font-black flex items-center justify-center mx-auto text-xs shadow-md">
                    2
                  </div>
                  <span className="text-emerald-400 block">Dipickup</span>
                </div>
                <div className="space-y-1.5">
                  <div className={`w-6 h-6 rounded-full ${trackingData.status === 'ON TRANSIT' || trackingData.status === 'OUT FOR DELIVERY' || trackingData.status === 'DELIVERED' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'} font-black flex items-center justify-center mx-auto text-xs shadow-md`}>
                    3
                  </div>
                  <span className={trackingData.status === 'ON TRANSIT' || trackingData.status === 'OUT FOR DELIVERY' || trackingData.status === 'DELIVERED' ? 'text-blue-400' : 'text-slate-500'}>
                    Transit Hub
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className={`w-6 h-6 rounded-full ${trackingData.status === 'DELIVERED' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-400'} font-black flex items-center justify-center mx-auto text-xs shadow-md`}>
                    4
                  </div>
                  <span className={trackingData.status === 'DELIVERED' ? 'text-emerald-400' : 'text-slate-500'}>
                    Sampai
                  </span>
                </div>
              </div>
            </div>

            {/* Courier & Receiver Meta Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-900/10 dark:border-slate-800 space-y-1.5 shadow-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Informasi Pengiriman
                </span>
                <p className="font-extrabold text-slate-900 dark:text-slate-100">
                  Pengirim: {trackingData.senderName}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Asal: {trackingData.origin}
                </p>
                <p className="text-slate-500 font-medium">
                  {trackingData.estimateArrival}
                </p>
              </div>

              {trackingData.driverName && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-600/20 space-y-1.5 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Kurir Lapangan
                  </span>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100">
                    {trackingData.driverName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{trackingData.driverPhone}</span>
                  </p>
                  <span className="text-[10px] font-bold text-slate-500">
                    Layanan Siap Antar Alamat
                  </span>
                </div>
              )}
            </div>

            {/* Timeline Checkpoints */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Timeline Perjalanan Paket
              </h4>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {trackingData.checkpoints.map((cp, idx) => {
                  const isLatest = idx === trackingData.checkpoints.length - 1;
                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isLatest
                            ? 'bg-blue-600 border-white text-white shadow-md shadow-blue-500/50 scale-110'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                        }`}
                      >
                        {isLatest ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl border-2 transition-all ${
                          isLatest
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-600/30 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-900/5 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                          <span
                            className={`font-black uppercase tracking-wider ${
                              isLatest ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                            }`}
                          >
                            {cp.city_name || 'Transit Hub'}
                          </span>
                          <span className="font-mono text-slate-400 font-semibold">
                            {cp.manifest_date} • {cp.manifest_time}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {cp.manifest_description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
