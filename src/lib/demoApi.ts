import type { Order, Outlet, PaymentMethod, Product, Shift } from './types'
import { demoStore } from './storage'
import { calcOrderTotal, nowLocalString, uid } from './utils'

type Listener<T> = (value: T) => void

const listeners = new Set<() => void>()

function notify() {
  for (const l of Array.from(listeners)) l()
}

export function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function listOutlets(): Outlet[] {
  return demoStore.get().outlets
}

export function listProducts(outletId: string): Product[] {
  return demoStore
    .get()
    .products
    .filter((p) => p.outletId === outletId && p.active)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function createProduct(outletId: string, name: string, price: number): Product {
  const product: Product = {
    id: uid('p_'),
    outletId,
    name: name.trim(),
    price: Math.max(0, Math.round(price)),
    active: true,
    createdAt: Date.now(),
  }
  demoStore.set((db) => {
    db.products.push(product)
  })
  notify()
  return product
}

export function getPrevShiftComment(outletId: string): string | undefined {
  const { shifts } = demoStore.get()
  const closed = shifts
    .filter((s) => s.outletId === outletId && s.status === 'closed')
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
  return closed[0]?.closeComment
}

export function getOpenShiftByOutlet(outletId: string): Shift | undefined {
  const { shifts } = demoStore.get()
  return shifts.find((s) => s.outletId === outletId && s.status === 'open')
}

export function openShift(params: {
  outletId: string
  outletName: string
  cashierName?: string
  openedAt: Date
  openedStock: Record<string, number>
  openComment?: string
}): Shift {
  const existing = getOpenShiftByOutlet(params.outletId)
  if (existing) return existing

  const shift: Shift = {
    id: uid('s_'),
    outletId: params.outletId,
    outletName: params.outletName,
    cashierName: params.cashierName?.trim() || undefined,
    openedAt: params.openedAt.getTime(),
    openedAtLocal: nowLocalString(params.openedAt),
    openedStock: params.openedStock,
    prevComment: getPrevShiftComment(params.outletId),
    openComment: params.openComment?.trim() || undefined,
    status: 'open',
  }

  demoStore.set((db) => {
    db.shifts.push(shift)
  })
  notify()
  return shift
}

export function listOrders(shiftId: string): Order[] {
  return demoStore
    .get()
    .orders
    .filter((o) => o.shiftId === shiftId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function createOrder(params: {
  outletId: string
  shiftId: string
  paymentMethod: PaymentMethod
  lines: { productId: string; name: string; price: number; qty: number }[]
}): Order {
  const lines = params.lines.filter((l) => l.qty > 0)
  const total = calcOrderTotal(lines)
  const order: Order = {
    id: uid('ord_'),
    outletId: params.outletId,
    shiftId: params.shiftId,
    createdAt: Date.now(),
    createdAtLocal: nowLocalString(new Date()),
    paymentMethod: params.paymentMethod,
    lines,
    total,
  }

  demoStore.set((db) => {
    db.orders.push(order)
  })
  notify()
  return order
}

export function updateOrder(orderId: string, patch: Partial<Pick<Order, 'paymentMethod' | 'lines' | 'total'>>): Order | undefined {
  let updated: Order | undefined
  demoStore.set((db) => {
    const idx = db.orders.findIndex((o) => o.id === orderId)
    if (idx === -1) return
    const current = db.orders[idx]
    const next: Order = {
      ...current,
      ...patch,
      total: patch.total ?? calcOrderTotal(patch.lines ?? current.lines),
    }
    db.orders[idx] = next
    updated = next
  })
  notify()
  return updated
}

export function closeShift(params: {
  shiftId: string
  closedAt: Date
  closedStock: Record<string, number>
  closeComment?: string
}): Shift | undefined {
  let updated: Shift | undefined
  demoStore.set((db) => {
    const idx = db.shifts.findIndex((s) => s.id === params.shiftId)
    if (idx === -1) return
    const s = db.shifts[idx]
    const next: Shift = {
      ...s,
      status: 'closed',
      closedAt: params.closedAt.getTime(),
      closedAtLocal: nowLocalString(params.closedAt),
      closedStock: params.closedStock,
      closeComment: params.closeComment?.trim() || undefined,
    }
    db.shifts[idx] = next
    updated = next
  })
  notify()
  return updated
}

export function listOpenShifts(): Shift[] {
  return demoStore
    .get()
    .shifts
    .filter((s) => s.status === 'open')
    .sort((a, b) => b.openedAt - a.openedAt)
}

export function listClosedShifts(): Shift[] {
  return demoStore
    .get()
    .shifts
    .filter((s) => s.status === 'closed')
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
}

export function addOutlet(name: string): Outlet {
  const outlet: Outlet = { id: uid('o_'), name: name.trim() }
  demoStore.set((db) => {
    db.outlets.push(outlet)
  })
  notify()
  return outlet
}

export function addDefaultProducts(outletId: string, products: { name: string; price: number }[]) {
  demoStore.set((db) => {
    for (const p of products) {
      const product: Product = {
        id: uid('p_'),
        outletId,
        name: p.name.trim(),
        price: Math.max(0, Math.round(p.price)),
        active: true,
        createdAt: Date.now(),
      }
      db.products.push(product)
    }
  })
  notify()
}

export function getShift(shiftId: string): Shift | undefined {
  return demoStore.get().shifts.find((s) => s.id === shiftId)
}

export function getOrder(orderId: string): Order | undefined {
  return demoStore.get().orders.find((o) => o.id === orderId)
}

export function resetDemo() {
  demoStore.reset()
  notify()
}
