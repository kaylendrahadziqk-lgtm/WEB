import crypto from 'node:crypto';
import dns from 'node:dns';
import QRCode from 'qrcode';

// Enforce IPv4 DNS resolution for all outgoing requests so that
// the whitelisted IPv4 (34.34.254.128) is always used instead of IPv6.
dns.setDefaultResultOrder('ipv4first');

export interface AustinPayDeposit {
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

export interface AustinPayCreateResponse {
  success: boolean;
  deposit?: AustinPayDeposit;
  message?: string;
  isSimulated?: boolean;
}

export interface AustinPayCheckResponse {
  success: boolean;
  status: 'paid' | 'pending' | 'expired';
  message: string;
  isSimulated?: boolean;
}

// In-memory sandbox storage for preview/development when API key is unconfigured or IP not yet whitelisted
const simulatedDeposits = new Map<string, AustinPayDeposit>();

/**
 * Sign AustinPay request with HMAC-SHA256 according to official docs:
 * Payload: `${METHOD}\n${PATH}\n${BODY}\n${TIMESTAMP}`
 */
export function signAustinRequest(
  method: string,
  path: string,
  body: string,
  secret: string
): { timestamp: string; signature: string } {
  const timestamp = Date.now().toString();
  const payload = `${method.toUpperCase()}\n${path}\n${body}\n${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { timestamp, signature };
}

/**
 * Get AustinPay configuration
 */
export function getAustinConfig() {
  const apiKey = process.env.AUSTIN_API_KEY || '';
  const apiSecret = process.env.AUSTIN_API_SECRET || '';
  const baseUrl = process.env.AUSTIN_BASE_URL || 'https://austinstore.id';

  return {
    isConfigured: !!apiKey,
    baseUrl,
    hasSecret: !!apiSecret,
    serverIpV4: '34.34.254.128',
    docsUrl: 'https://www.austinx.cloud/api-docs',
  };
}

/**
 * Test connectivity and IP whitelist status directly against AustinPay API
 */
export async function testAustinConnection(): Promise<{
  success: boolean;
  message: string;
  account?: any;
}> {
  const apiKey = process.env.AUSTIN_API_KEY || '';
  const apiSecret = process.env.AUSTIN_API_SECRET || '';
  const baseUrl = process.env.AUSTIN_BASE_URL || 'https://austinstore.id';

  if (!apiKey) {
    return {
      success: false,
      message: 'API Key belum diset di .env',
    };
  }

  try {
    const path = '/api/account';
    const headers: Record<string, string> = {
      'X-API-Key': apiKey,
    };

    let targetUrl = `${baseUrl}${path}`;

    if (apiSecret) {
      const { timestamp, signature } = signAustinRequest('GET', path, '', apiSecret);
      headers['X-Timestamp'] = timestamp;
      headers['X-Signature'] = signature;
    } else {
      targetUrl = `${baseUrl}${path}?apikey=${encodeURIComponent(apiKey)}`;
    }

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.success) {
      return {
        success: true,
        message: 'Koneksi AustinPay Berhasil! IP 34.34.254.128 dan API Key telah aktif.',
        account: data.user || data.account || data,
      };
    }

    return {
      success: false,
      message: data?.message || `Gagal menghubungkan ke AustinPay (Status: ${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Network error: ' + err.message,
    };
  }
}

/**
 * Create dynamic QRIS payment using AustinPay API
 */
export async function createAustinDeposit(amount: number): Promise<AustinPayCreateResponse> {
  const apiKey = process.env.AUSTIN_API_KEY || '';
  const apiSecret = process.env.AUSTIN_API_SECRET || '';
  const baseUrl = process.env.AUSTIN_BASE_URL || 'https://austinstore.id';

  // If API key is configured, call the live AustinPay API
  if (apiKey) {
    try {
      const path = '/api/deposit/create';
      const body = JSON.stringify({ amount: Math.round(amount) });
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      };

      let targetUrl = `${baseUrl}${path}`;

      if (apiSecret) {
        const { timestamp, signature } = signAustinRequest('POST', path, body, apiSecret);
        headers['X-Timestamp'] = timestamp;
        headers['X-Signature'] = signature;
      } else {
        targetUrl = `${baseUrl}${path}?apikey=${encodeURIComponent(apiKey)}`;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body,
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data && data.success && data.deposit) {
        // Live AustinPay succeeded!
        return {
          success: true,
          deposit: data.deposit,
          isSimulated: false,
        };
      }

      console.warn(
        `[AustinPay API] Live response error: status ${response.status}`,
        data || '(no body)'
      );
    } catch (err: any) {
      console.error('[AustinPay API] Network error connecting to AustinPay:', err);
    }
  }

  // SANDBOX SIMULATION FALLBACK
  const transactionId = `APG-${Date.now().toString().slice(-8)}`;
  const fee = 250;
  const totalAmount = Math.round(amount) + fee;
  const expiredAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const qrString = `00020101021226610016ID.CO.AUSTINPAY.WWW01189360050300000000000208${transactionId}520454115303360540${totalAmount}5802ID5914NUSASTORE IND6007JAKARTA62210717${transactionId}6304`;

  const qrImage = await QRCode.toDataURL(qrString, {
    width: 320,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  const simulatedDeposit: AustinPayDeposit = {
    id: crypto.randomUUID(),
    transaction_id: transactionId,
    amount: totalAmount,
    unique_code: 0,
    fee,
    qr_string: qrString,
    qr_image: qrImage,
    expired_at: expiredAt,
    status: 'pending',
  };

  simulatedDeposits.set(transactionId, simulatedDeposit);

  return {
    success: true,
    deposit: simulatedDeposit,
    message: apiKey
      ? 'AustinPay Sandbox Mode (Koneksi langsung dipersiapkan)'
      : 'AustinPay Sandbox Mode (Masukkan API Key di .env untuk Live)',
    isSimulated: true,
  };
}

/**
 * Check payment status (Polling interval minimal 5 detik)
 */
export async function checkAustinDeposit(transactionId: string): Promise<AustinPayCheckResponse> {
  const apiKey = process.env.AUSTIN_API_KEY || '';
  const apiSecret = process.env.AUSTIN_API_SECRET || '';
  const baseUrl = process.env.AUSTIN_BASE_URL || 'https://austinstore.id';

  // If live and not in simulated store
  if (apiKey && !simulatedDeposits.has(transactionId)) {
    try {
      const path = `/api/deposit/check/${encodeURIComponent(transactionId)}`;
      const headers: Record<string, string> = {
        'X-API-Key': apiKey,
      };

      let targetUrl = `${baseUrl}${path}`;

      if (apiSecret) {
        const { timestamp, signature } = signAustinRequest('GET', path, '', apiSecret);
        headers['X-Timestamp'] = timestamp;
        headers['X-Signature'] = signature;
      } else {
        targetUrl = `${baseUrl}${path}?apikey=${encodeURIComponent(apiKey)}`;
      }

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data && data.success) {
        return {
          success: true,
          status: data.status,
          message: data.message || 'Status berhasil diperbarui',
          isSimulated: false,
        };
      }
    } catch (err) {
      console.error('[AustinPay API] Check status network error:', err);
    }
  }

  // Check in simulated store
  const existing = simulatedDeposits.get(transactionId);
  if (existing) {
    if (new Date() > new Date(existing.expired_at) && existing.status === 'pending') {
      existing.status = 'expired';
    }

    if (existing.status === 'paid') {
      return {
        success: true,
        status: 'paid',
        message: 'Deposit berhasil! Saldo telah ditambahkan.',
        isSimulated: true,
      };
    } else if (existing.status === 'expired') {
      return {
        success: true,
        status: 'expired',
        message: 'QRIS telah kedaluwarsa.',
        isSimulated: true,
      };
    } else {
      return {
        success: true,
        status: 'pending',
        message: 'Menunggu pembayaran...',
        isSimulated: true,
      };
    }
  }

  return {
    success: false,
    status: 'pending',
    message: 'Transaksi tidak ditemukan',
    isSimulated: true,
  };
}

/**
 * Cancel payment
 */
export async function cancelAustinDeposit(transactionId: string): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.AUSTIN_API_KEY || '';
  const apiSecret = process.env.AUSTIN_API_SECRET || '';
  const baseUrl = process.env.AUSTIN_BASE_URL || 'https://austinstore.id';

  if (apiKey && !simulatedDeposits.has(transactionId)) {
    try {
      const path = `/api/deposit/cancel/${encodeURIComponent(transactionId)}`;
      const headers: Record<string, string> = {
        'X-API-Key': apiKey,
      };

      let targetUrl = `${baseUrl}${path}`;

      if (apiSecret) {
        const { timestamp, signature } = signAustinRequest('POST', path, '', apiSecret);
        headers['X-Timestamp'] = timestamp;
        headers['X-Signature'] = signature;
      } else {
        targetUrl = `${baseUrl}${path}?apikey=${encodeURIComponent(apiKey)}`;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data) {
        return { success: !!data.success, message: data.message || 'Dibatalkan' };
      }
    } catch (err) {
      console.error('[AustinPay API] Cancel network error:', err);
    }
  }

  const existing = simulatedDeposits.get(transactionId);
  if (existing) {
    existing.status = 'expired';
    return { success: true, message: 'Transaksi berhasil dibatalkan' };
  }

  return { success: false, message: 'Transaksi tidak ditemukan' };
}

/**
 * Simulate payment success (testing trigger)
 */
export function simulateAustinSuccess(transactionId: string): boolean {
  const existing = simulatedDeposits.get(transactionId);
  if (existing) {
    existing.status = 'paid';
    return true;
  }
  return false;
}
