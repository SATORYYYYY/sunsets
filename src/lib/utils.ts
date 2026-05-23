import type { MoneyBreakdown, Order, OrderLine, PaymentMethod } from './types'

export function nowLocalString(d = new Date()) {
  // yyyy-mm-dd hh:mm
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function rub(amount: number) {
  try {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${Math.round(amount)} ₽`
  }
}

export function uid(prefix = '') {
  return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

export function clampMoney(n: unknown) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.round(v)
}

export function calcOrderTotal(lines: OrderLine[]) {
  return lines.reduce((sum, l) => sum + l.qty * l.price, 0)
}

export function calcBreakdown(orders: Order[]): MoneyBreakdown {
  const res: MoneyBreakdown = { total: 0, cash: 0, card: 0, qr: 0 }
  for (const o of orders) {
    res.total += o.total
    res[o.paymentMethod] += o.total
  }
  return res
}

export function paymentLabel(m: PaymentMethod) {
  if (m === 'cash') return 'Наличка'
  if (m === 'card') return 'Карта'
  return 'QR-код'
}
