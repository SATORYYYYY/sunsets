export type PaymentMethod = 'cash' | 'card' | 'qr'

export type Outlet = {
  id: string
  name: string
}

export type Product = {
  id: string
  outletId: string
  name: string
  price: number
  active: boolean
  createdAt: number
}

export type ShiftStatus = 'open' | 'closed'

export type Shift = {
  id: string
  outletId: string
  outletName: string
  cashierName?: string
  openedAt: number
  openedAtLocal: string
  openedStock: Record<string, number>
  prevComment?: string
  openComment?: string
  status: ShiftStatus
  closedAt?: number
  closedAtLocal?: string
  closedStock?: Record<string, number>
  closeComment?: string
}

export type OrderLine = {
  productId: string
  name: string
  price: number
  qty: number
}

export type Order = {
  id: string
  outletId: string
  shiftId: string
  createdAt: number
  createdAtLocal: string
  paymentMethod: PaymentMethod
  lines: OrderLine[]
  total: number
}

export type MoneyBreakdown = {
  total: number
  cash: number
  card: number
  qr: number
}
