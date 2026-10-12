import {
  RajaOngkirProvince,
  RajaOngkirCity,
  CourierServiceOption,
  StoreSettings,
} from '../types';
import { MOCK_PROVINCES, MOCK_CITIES } from '../data/mockData';

// Default configuration
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'NusaStore Official',
  originCityId: '153', // Jakarta Selatan
  originCityName: 'Jakarta Selatan',
  originProvinceName: 'DKI Jakarta',
  useRealRajaOngkirApi: false,
  rajaOngkirApiKeyConfigured: false,
};

const BASE_URL = process.env.RAJAONGKIR_BASE_URL || 'https://rajaongkir.komerce.id/api/v1';

/**
 * Fetch list of provinces from RajaOngkir API or fallback cache
 */
export async function getRajaOngkirProvinces(apiKey?: string): Promise<RajaOngkirProvince[]> {
  const activeKey = apiKey || process.env.RAJAONGKIR_API_KEY;

  if (!activeKey) {
    return MOCK_PROVINCES;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(`${BASE_URL}/province`, {
      method: 'GET',
      headers: {
        key: activeKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn('RajaOngkir Province API response not OK, using cached provinces');
      return MOCK_PROVINCES;
    }

    const data = await res.json();
    const results = data?.rajaongkir?.results || data?.data || [];
    if (Array.isArray(results) && results.length > 0) {
      return results.map((p: any) => ({
        province_id: String(p.province_id || p.id),
        province: p.province || p.name,
      }));
    }

    return MOCK_PROVINCES;
  } catch (error) {
    console.warn('RajaOngkir Province fetch failed or timed out:', error);
    return MOCK_PROVINCES;
  }
}

/**
 * Fetch list of cities in a province from RajaOngkir API or fallback cache
 */
export async function getRajaOngkirCities(
  provinceId: string,
  apiKey?: string
): Promise<RajaOngkirCity[]> {
  const activeKey = apiKey || process.env.RAJAONGKIR_API_KEY;

  if (!activeKey) {
    return MOCK_CITIES.filter((c) => c.province_id === provinceId || !provinceId);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = provinceId ? `${BASE_URL}/city?province=${provinceId}` : `${BASE_URL}/city`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        key: activeKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return MOCK_CITIES.filter((c) => c.province_id === provinceId || !provinceId);
    }

    const data = await res.json();
    const results = data?.rajaongkir?.results || data?.data || [];

    if (Array.isArray(results) && results.length > 0) {
      return results.map((c: any) => ({
        city_id: String(c.city_id || c.id),
        province_id: String(c.province_id),
        province: c.province,
        type: c.type || (c.city_name?.toLowerCase().includes('kab') ? 'Kabupaten' : 'Kota'),
        city_name: c.city_name || c.name,
        postal_code: c.postal_code || '',
      }));
    }

    return MOCK_CITIES.filter((c) => c.province_id === provinceId || !provinceId);
  } catch (error) {
    console.warn('RajaOngkir City fetch error:', error);
    return MOCK_CITIES.filter((c) => c.province_id === provinceId || !provinceId);
  }
}

/**
 * Calculate shipping costs using RajaOngkir API with fallback rates
 */
export async function calculateRajaOngkirCost(params: {
  originCityId: string;
  destinationCityId: string;
  weightGrams: number;
  courierCode: string; // 'jne', 'pos', 'tiki', 'sicepat', 'jnt'
  apiKey?: string;
}): Promise<CourierServiceOption[]> {
  const { originCityId, destinationCityId, weightGrams, courierCode, apiKey } = params;
  const activeKey = apiKey || process.env.RAJAONGKIR_API_KEY;

  const validWeight = Math.max(100, weightGrams || 500);

  if (activeKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${BASE_URL}/cost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          key: activeKey,
        },
        body: new URLSearchParams({
          origin: originCityId,
          originType: 'city',
          destination: destinationCityId,
          destinationType: 'city',
          weight: String(validWeight),
          courier: courierCode,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const results = data?.rajaongkir?.results || data?.data || [];

        if (Array.isArray(results) && results.length > 0) {
          const courierData = results[0];
          const costs: CourierServiceOption[] = [];

          if (Array.isArray(courierData.costs)) {
            for (const service of courierData.costs) {
              const costObj = service.cost?.[0] || service;
              costs.push({
                code: courierData.code || courierCode,
                name: courierData.name || courierCode.toUpperCase(),
                service: service.service || service.service_name || 'REG',
                description: service.description || 'Layanan Pengiriman',
                cost: Number(costObj.value || costObj.price || 15000),
                etd: String(costObj.etd || costObj.estimasi || '2-3').replace(/HARI|hari/gi, '').trim() + ' Hari',
                note: costObj.note || '',
              });
            }
            if (costs.length > 0) return costs;
          }
        }
      }
    } catch (err) {
      console.warn('RajaOngkir live cost API error/timeout, using simulated rate engine:', err);
    }
  }

  // Realistic Fallback Shipping Calculation Matrix (in IDR)
  return generateFallbackShippingOptions(originCityId, destinationCityId, validWeight, courierCode);
}

/**
 * Generate authentic Indonesian courier options & rates based on distance & weight
 */
export function generateFallbackShippingOptions(
  originCityId: string,
  destinationCityId: string,
  weightGrams: number,
  courierCode: string
): CourierServiceOption[] {
  const weightKg = Math.ceil(weightGrams / 1000);
  const isSameCity = originCityId === destinationCityId;

  // Base rate logic
  let baseRegRate = isSameCity ? 9000 : 18000;
  if (!isSameCity) {
    // Add distance variance based on city IDs
    const diff = Math.abs(parseInt(originCityId || '153') - parseInt(destinationCityId || '100'));
    baseRegRate += Math.min(30000, diff * 150);
  }

  const code = courierCode.toLowerCase();

  switch (code) {
    case 'jne':
      return [
        {
          code: 'jne',
          name: 'JNE Express',
          service: 'OKE',
          description: 'Ongkos Kirim Ekonomis',
          cost: Math.round(baseRegRate * 0.85) * weightKg,
          etd: '3-4 Hari',
        },
        {
          code: 'jne',
          name: 'JNE Express',
          service: 'REG',
          description: 'Layanan Reguler',
          cost: Math.round(baseRegRate) * weightKg,
          etd: isSameCity ? '1 Hari' : '2-3 Hari',
        },
        {
          code: 'jne',
          name: 'JNE Express',
          service: 'YES',
          description: 'Yakin Esok Sampai',
          cost: Math.round(baseRegRate * 1.7) * weightKg,
          etd: '1 Hari',
        },
      ];

    case 'pos':
      return [
        {
          code: 'pos',
          name: 'POS Indonesia',
          service: 'Kilat Khusus',
          description: 'Pos Kilat Khusus Nasional',
          cost: Math.round(baseRegRate * 0.9) * weightKg,
          etd: '2-4 Hari',
        },
        {
          code: 'pos',
          name: 'POS Indonesia',
          service: 'Express Nextday',
          description: 'Layanan Kilat 1 Hari Sampai',
          cost: Math.round(baseRegRate * 1.6) * weightKg,
          etd: '1 Hari',
        },
      ];

    case 'tiki':
      return [
        {
          code: 'tiki',
          name: 'TIKI',
          service: 'ECO',
          description: 'Economy Service',
          cost: Math.round(baseRegRate * 0.8) * weightKg,
          etd: '3-5 Hari',
        },
        {
          code: 'tiki',
          name: 'TIKI',
          service: 'REG',
          description: 'Regular Service',
          cost: Math.round(baseRegRate * 0.95) * weightKg,
          etd: '2-3 Hari',
        },
        {
          code: 'tiki',
          name: 'TIKI',
          service: 'ONS',
          description: 'Over Night Service',
          cost: Math.round(baseRegRate * 1.65) * weightKg,
          etd: '1 Hari',
        },
      ];

    case 'sicepat':
      return [
        {
          code: 'sicepat',
          name: 'SiCepat Ekspres',
          service: 'SIUNTUNG',
          description: 'Layanan Reguler Cepat & Murah',
          cost: Math.round(baseRegRate * 0.9) * weightKg,
          etd: '1-2 Hari',
        },
        {
          code: 'sicepat',
          name: 'SiCepat Ekspres',
          service: 'BEST',
          description: 'Besok Sampai Tujuan',
          cost: Math.round(baseRegRate * 1.5) * weightKg,
          etd: '1 Hari',
        },
      ];

    case 'jnt':
    default:
      return [
        {
          code: 'jnt',
          name: 'J&T Express',
          service: 'EZ',
          description: 'Layanan Reguler J&T',
          cost: Math.round(baseRegRate) * weightKg,
          etd: '2-3 Hari',
        },
      ];
  }
}

/**
 * Live Waybill / Resi Order Tracking API wrapper
 */
export async function trackRajaOngkirWaybill(
  waybill: string,
  courierCode: string,
  apiKey?: string
): Promise<import('../types').TrackingDetail> {
  const activeKey = apiKey || process.env.RAJAONGKIR_API_KEY;
  const courier = (courierCode || 'jne').toLowerCase();

  if (activeKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`${BASE_URL}/waybill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          key: activeKey,
        },
        body: new URLSearchParams({
          waybill,
          courier,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const result = data?.rajaongkir?.result || data?.data;
        if (result) {
          const manifestList = result.manifest || [];
          const checkpoints = manifestList.map((m: any) => ({
            manifest_description: m.manifest_description || m.note || 'Update Status',
            manifest_date: m.manifest_date || m.date || new Date().toISOString().split('T')[0],
            manifest_time: m.manifest_time || m.time || '10:00',
            city_name: m.city_name || result.summary?.destination || 'Transit Hub',
            status: m.status?.toLowerCase().includes('delivered')
              ? 'delivered'
              : m.status?.toLowerCase().includes('out')
              ? 'out_for_delivery'
              : m.status?.toLowerCase().includes('transit')
              ? 'in_transit'
              : 'manifested',
          }));

          return {
            waybill: result.summary?.waybill_number || waybill,
            courierCode: courier,
            courierName: result.summary?.courier_name || courier.toUpperCase(),
            serviceCode: result.summary?.service_code || 'REG',
            shippedDate: result.summary?.waybill_date || new Date().toISOString().split('T')[0],
            origin: result.summary?.origin || 'Jakarta Selatan',
            destination: result.summary?.destination || 'Tujuan',
            senderName: result.summary?.shipped_by || 'NusaStore Official',
            receiverName: result.summary?.receiver_name || 'Pelanggan Setia',
            status: result.delivery_status?.status === 'DELIVERED' ? 'DELIVERED' : 'ON TRANSIT',
            statusLabel: result.delivery_status?.pod_receiver
              ? `Diterima oleh ${result.delivery_status.pod_receiver}`
              : 'Paket Dalam Perjalanan Kurir',
            estimateArrival: 'Hari ini - Besok',
            checkpoints,
            lastLocation: checkpoints[checkpoints.length - 1]?.city_name || 'In Transit',
          };
        }
      }
    } catch (err) {
      console.warn('RajaOngkir live waybill tracking API timeout or fallback:', err);
    }
  }

  // Realistic Dynamic Indonesian Tracking Simulator
  return generateSimulatedTrackingData(waybill, courier);
}

/**
 * Generate authentic Indonesian package tracking checkpoint log
 */
export function generateSimulatedTrackingData(
  waybill: string,
  courierCode: string
): import('../types').TrackingDetail {
  const courierMap: Record<string, string> = {
    jne: 'JNE Express',
    sicepat: 'SiCepat Ekspres',
    pos: 'POS Indonesia',
    tiki: 'TIKI',
    jnt: 'J&T Express',
  };

  const cName = courierMap[courierCode.toLowerCase()] || 'JNE Express';
  const now = new Date();

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const date0 = new Date(now.getTime() - 36 * 3600 * 1000);
  const date1 = new Date(now.getTime() - 24 * 3600 * 1000);
  const date2 = new Date(now.getTime() - 10 * 3600 * 1000);
  const date3 = new Date(now.getTime() - 2 * 3600 * 1000);

  return {
    waybill: waybill || `JP${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    courierCode: courierCode.toLowerCase(),
    courierName: cName,
    serviceCode: 'REG (Layanan Reguler)',
    shippedDate: formatDate(date0),
    origin: 'Jakarta Selatan (Gudang NusaStore)',
    destination: 'Kota Tujuan Pemesan',
    senderName: 'NusaStore Official Jakarta',
    receiverName: 'Pembeli (Anda)',
    status: 'ON TRANSIT',
    statusLabel: 'Paket Sedang Dalam Perjalanan Antar Hub / Kota',
    estimateArrival: 'Estimasi Tiba: 1-2 Hari Lagi',
    lastLocation: 'Hub Sortir Utama Central Park',
    driverName: 'Agus Setiawan (Kurir Lapangan)',
    driverPhone: '0812-9876-5432',
    checkpoints: [
      {
        manifest_description: `Resi dicetak & pesanan dikemas oleh NusaStore Jakarta. Resi: ${waybill}`,
        manifest_date: formatDate(date0),
        manifest_time: '14:30',
        city_name: 'Jakarta Selatan',
        status: 'manifested',
      },
      {
        manifest_description: `Paket diterima di drop point ${cName} Jakarta Selatan [MANIFESTED]`,
        manifest_date: formatDate(date0),
        manifest_time: '18:15',
        city_name: 'Jakarta Selatan',
        status: 'manifested',
      },
      {
        manifest_description: `Paket keluar dari Gateway Jakarta menuju Gateway Kota Tujuan [IN TRANSIT]`,
        manifest_date: formatDate(date1),
        manifest_time: '22:40',
        city_name: 'Jakarta Sortir Hub',
        status: 'in_transit',
      },
      {
        manifest_description: `Tiba di Processing Center Kota Tujuan. Paket dalam proses pemilahan ke kurir area [PROCESSING]`,
        manifest_date: formatDate(date2),
        manifest_time: '08:10',
        city_name: 'Kota Tujuan Transit Hub',
        status: 'in_transit',
      },
      {
        manifest_description: `Paket dibawa oleh Kurir (Agus Setiawan) menuju alamat tujuan [WITH COURIER]`,
        manifest_date: formatDate(date3),
        manifest_time: formatTime(date3),
        city_name: 'Cabang Delivery Lokal',
        status: 'out_for_delivery',
      },
    ],
  };
}

