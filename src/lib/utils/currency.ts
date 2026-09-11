/**
 * Indonesian Rupiah (IDR) Currency Utilities
 * Formats numbers into standard Indonesian Rupiah currency format.
 * Example: 7199000 -> "Rp 7.199.000"
 */

export function formatRupiah(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "Rp 0";
  }
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
}

export const formatIDR = formatRupiah;
