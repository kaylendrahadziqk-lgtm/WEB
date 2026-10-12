/**
 * Format numbers as Indonesian Rupiah currency string.
 * Example: 150000 -> "Rp150.000"
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rp0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount).replace(/\s+/g, '');
}

/**
 * Format weight in grams into clean string representation.
 * Example: 500 -> "500 gram", 1500 -> "1,5 kg"
 */
export function formatWeight(grams: number): string {
  if (!grams || grams <= 0) return '0 gram';
  if (grams < 1000) {
    return `${grams} gram`;
  }
  const kg = (grams / 1000).toFixed(1).replace('.0', '');
  return `${kg} kg`;
}

/**
 * Generate unique order number with date prefix
 * Example: NS-20260728-1042
 */
export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `NS-${dateStr}-${randomSuffix}`;
}

/**
 * Helper to slugify string
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}
