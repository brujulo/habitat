import { TASA_USD_DOP } from '@/constants/mercado';
import type { Propiedad } from '@/data/properties';

export function formatUSD(valor: number) {
  return `US$${Math.round(valor).toLocaleString('en-US')}`;
}

export function formatUSDCorto(valor: number) {
  if (valor >= 1_000_000) return `US$${(valor / 1_000_000).toFixed(valor % 1_000_000 ? 2 : 0)}M`;
  if (valor >= 10_000) return `US$${Math.round(valor / 1000)}K`;
  return formatUSD(valor);
}

export function formatDOP(valorUSD: number) {
  return `RD$${Math.round(valorUSD * TASA_USD_DOP).toLocaleString('en-US')}`;
}

export function precioTexto(p: Propiedad, corto = false) {
  const base = corto ? formatUSDCorto(p.precio) : formatUSD(p.precio);
  return p.operacion === 'Alquiler' ? `${base}/mes` : base;
}

/** Cuota mensual aproximada (sistema francés). */
export function cuotaMensual(monto: number, tasaAnualPct: number, anos: number) {
  const r = tasaAnualPct / 100 / 12;
  const n = anos * 12;
  if (r === 0) return monto / n;
  return (monto * r) / (1 - Math.pow(1 + r, -n));
}

export function banosTexto(b: number) {
  return Number.isInteger(b) ? `${b}` : `${Math.floor(b)}½`;
}
