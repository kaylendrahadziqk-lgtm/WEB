import express from 'express';
import path from 'path';
import dns from 'node:dns';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

// Force IPv4 resolution so outbound requests use whitelisted IPv4 (34.34.254.128)
dns.setDefaultResultOrder('ipv4first');
import {
  getRajaOngkirProvinces,
  getRajaOngkirCities,
  calculateRajaOngkirCost,
  trackRajaOngkirWaybill,
  DEFAULT_STORE_SETTINGS,
} from './src/lib/rajaongkir';
import {
  getAustinConfig,
  createAustinDeposit,
  checkAustinDeposit,
  cancelAustinDeposit,
  simulateAustinSuccess,
  testAustinConnection,
} from './src/lib/austinpay';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API HEALTH
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NusaStore API',
      timestamp: new Date().toISOString(),
      rajaOngkirConfigured: !!process.env.RAJAONGKIR_API_KEY,
    });
  });

  // RAJAONGKIR ENDPOINTS
  // 1. GET /api/shipping/provinces
  app.get('/api/shipping/provinces', async (req, res) => {
    try {
      const provinces = await getRajaOngkirProvinces();
      res.json({ success: true, data: provinces });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data provinsi pengiriman.',
        error: error.message,
      });
    }
  });

  // 2. GET /api/shipping/cities?province=ID
  app.get('/api/shipping/cities', async (req, res) => {
    try {
      const provinceId = (req.query.province as string) || '';
      const cities = await getRajaOngkirCities(provinceId);
      res.json({ success: true, data: cities });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil data kota/kabupaten pengiriman.',
        error: error.message,
      });
    }
  });

  // 3. GET /api/shipping/couriers
  app.get('/api/shipping/couriers', (req, res) => {
    res.json({
      success: true,
      data: [
        { code: 'jne', name: 'JNE Express', logo: '🚚' },
        { code: 'sicepat', name: 'SiCepat Ekspres', logo: '⚡' },
        { code: 'pos', name: 'POS Indonesia', logo: '📮' },
        { code: 'tiki', name: 'TIKI', logo: '📦' },
        { code: 'jnt', name: 'J&T Express', logo: '🚀' },
      ],
    });
  });

  // 4. POST /api/shipping/cost
  app.post('/api/shipping/cost', async (req, res) => {
    try {
      const { destinationCityId, weightGrams, courierCode, originCityId } = req.body;

      if (!destinationCityId) {
        return res.status(400).json({
          success: false,
          message: 'ID Kota/Kabupaten tujuan harus diisi.',
        });
      }

      const storeOrigin = originCityId || process.env.RAJAONGKIR_ORIGIN_CITY_ID || DEFAULT_STORE_SETTINGS.originCityId;
      const validWeight = Math.max(100, Number(weightGrams) || 1000);
      const activeCourier = (courierCode || 'jne').toLowerCase();

      const options = await calculateRajaOngkirCost({
        originCityId: storeOrigin,
        destinationCityId: String(destinationCityId),
        weightGrams: validWeight,
        courierCode: activeCourier,
      });

      res.json({
        success: true,
        data: {
          originCityId: storeOrigin,
          destinationCityId: String(destinationCityId),
          weightGrams: validWeight,
          courierCode: activeCourier,
          options,
        },
      });
    } catch (error: any) {
      console.error('API /api/shipping/cost error:', error);
      res.status(500).json({
        success: false,
        message: 'Pilihan pengiriman belum tersedia. Silakan coba kembali atau pilih alamat lain.',
        error: error.message,
      });
    }
  });

  // 5. POST /api/shipping/track (Real-time Resi Tracking)
  app.post('/api/shipping/track', async (req, res) => {
    try {
      const { waybill, courierCode } = req.body;
      if (!waybill) {
        return res.status(400).json({
          success: false,
          message: 'Nomor resi pengiriman (waybill) harus diisi.',
        });
      }

      const activeCourier = (courierCode || 'jne').toLowerCase();
      const trackingResult = await trackRajaOngkirWaybill(String(waybill).trim(), activeCourier);

      res.json({
        success: true,
        data: trackingResult,
      });
    } catch (error: any) {
      console.error('API /api/shipping/track error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal melacak nomor resi. Silakan coba beberapa saat lagi.',
        error: error.message,
      });
    }
  });

  // AUSTINPAY PAYMENT GATEWAY ENDPOINTS (https://www.austinx.cloud/api-docs)
  // 1. GET /api/payment/austin/config
  app.get('/api/payment/austin/config', (req, res) => {
    const config = getAustinConfig();
    res.json({
      success: true,
      data: config,
    });
  });

  // 1b. GET /api/payment/austin/test-connection (Tes koneksi IP Whitelist ke AustinPay)
  app.get('/api/payment/austin/test-connection', async (req, res) => {
    try {
      const result = await testAustinConnection();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Gagal menguji koneksi: ' + error.message,
      });
    }
  });

  // 2. POST /api/payment/austin/create
  app.post('/api/payment/austin/create', async (req, res) => {
    try {
      const { amount } = req.body;
      const validAmount = Number(amount);
      if (!validAmount || validAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Nominal pembayaran tidak valid.',
        });
      }

      const result = await createAustinDeposit(validAmount);
      res.json(result);
    } catch (error: any) {
      console.error('API /api/payment/austin/create error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat QRIS pembayaran AustinPay.',
        error: error.message,
      });
    }
  });

  // 3. GET /api/payment/austin/check/:transactionId
  app.get('/api/payment/austin/check/:transactionId', async (req, res) => {
    try {
      const { transactionId } = req.params;
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID harus disertakan.',
        });
      }

      const statusResult = await checkAustinDeposit(transactionId);
      res.json(statusResult);
    } catch (error: any) {
      console.error('API /api/payment/austin/check error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengecek status pembayaran.',
        error: error.message,
      });
    }
  });

  // 4. POST /api/payment/austin/cancel/:transactionId
  app.post('/api/payment/austin/cancel/:transactionId', async (req, res) => {
    try {
      const { transactionId } = req.params;
      const cancelResult = await cancelAustinDeposit(transactionId);
      res.json(cancelResult);
    } catch (error: any) {
      console.error('API /api/payment/austin/cancel error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membatalkan transaksi.',
        error: error.message,
      });
    }
  });

  // 5. POST /api/payment/austin/simulate/:transactionId (Simulasi Instant Pembayaran Sukses)
  app.post('/api/payment/austin/simulate/:transactionId', (req, res) => {
    const { transactionId } = req.params;
    const ok = simulateAustinSuccess(transactionId);
    if (ok) {
      res.json({
        success: true,
        message: 'Simulasi pembayaran sukses berhasil diaktifkan.',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Transaksi simulasi tidak ditemukan.',
      });
    }
  });

  // STORE CONFIG ENDPOINT
  app.get('/api/store/config', (req, res) => {
    res.json({
      storeName: 'NusaStore',
      originCityId: process.env.RAJAONGKIR_ORIGIN_CITY_ID || '153',
      originCityName: 'Jakarta Selatan',
      hasApiKey: !!process.env.RAJAONGKIR_API_KEY,
    });
  });

  // Vite Middleware in Development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NusaStore E-Commerce Server running on http://localhost:${PORT}`);
  });
}

startServer();
