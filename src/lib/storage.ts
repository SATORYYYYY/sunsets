import type { Order, Outlet, Product, Shift } from './types'

const KEY = 'sunset_demo_v1'

type DemoDB = {
  outlets: Outlet[]
  products: Product[]
  shifts: Shift[]
  orders: Order[]
  admins: { email: string }[]
}

const seed: DemoDB = {
  outlets: [],
  products: [],
  shifts: [],
  orders: [],
  admins: [],
}

function load(): DemoDB {
  const raw = localStorage.getItem(KEY)
  if (!raw) return structuredClone(seed)
  try {
    const parsed = JSON.parse(raw) as DemoDB
    return { ...structuredClone(seed), ...parsed }
  } catch {
    return structuredClone(seed)
  }
}

function save(db: DemoDB) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export const demoStore = {
  reset() {
    const s = structuredClone(seed)
    save(s)
    return s
  },
  get() {
    return load()
  },
  set(mutator: (db: DemoDB) => void) {
    const db = load()
    mutator(db)
    save(db)
    return db
  },
}
