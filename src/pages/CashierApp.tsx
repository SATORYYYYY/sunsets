import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, History, LayoutGrid, LogOut, Store, Sunset, XCircle } from 'lucide-react'
import { Button, Card, Modal, Pill, Textarea, Input } from '../components/ui'
import type { Order, PaymentMethod, Product, Shift } from '../lib/types'
import {
  closeShift,
  createOrder,
  createProduct,
  openShift,
  updateOrder,
  getOpenShiftByOutlet,
  getPrevShiftComment,
  getShift,
  listOrders,
  listOutlets,
  listProducts,
  resetDemo,
  subscribe,
} from '../lib/demoApi'
import { calcBreakdown, paymentLabel, rub } from '../lib/utils'
import { buildShiftHtmlReport, downloadFile, toCsv } from '../lib/reports'

type Tab = 'schedule' | 'outlets' | 'history' | 'close'

function paymentTone(m: PaymentMethod) {
  if (m === 'cash') return 'amber'
  if (m === 'card') return 'slate'
  return 'rose'
}

export default function CashierApp() {
  const [tab, setTab] = useState<Tab>('outlets')
  const [activeShiftId, setActiveShiftId] = useState<string | null>(() => localStorage.getItem('sunset_active_shift') || null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1))
  }, [])

  const activeShift: Shift | undefined = useMemo(() => {
    if (!activeShiftId) return undefined
    return getShift(activeShiftId)
  }, [activeShiftId, tick])

  useEffect(() => {
    if (activeShift?.status === 'closed') {
      localStorage.removeItem('sunset_active_shift')
      setActiveShiftId(null)
      setTab('outlets')
    }
  }, [activeShift?.status])

  const outlets = useMemo(() => listOutlets(), [tick])

  const [openModalOutletId, setOpenModalOutletId] = useState<string | null>(null)
  const openOutlet = useMemo(() => outlets.find((o) => o.id === openModalOutletId) || null, [openModalOutletId, outlets])

  const [cashierName, setCashierName] = useState('')
  const [openedAtLocal, setOpenedAtLocal] = useState(() => new Date().toISOString().slice(0, 16))
  const [openedStockText, setOpenedStockText] = useState('')
  const [openComment, setOpenComment] = useState('')

  const prevComment = useMemo(() => (openOutlet ? getPrevShiftComment(openOutlet.id) : undefined), [openOutlet, tick])

  const products: Product[] = useMemo(() => {
    if (!activeShift) return []
    return listProducts(activeShift.outletId)
  }, [activeShift?.outletId, tick])

  const orders: Order[] = useMemo(() => {
    if (!activeShift) return []
    return listOrders(activeShift.id)
  }, [activeShift?.id, tick])

  const money = useMemo(() => calcBreakdown(orders), [orders])

  const [counts, setCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    // ensure keys exist, do not reset existing counts
    if (!products.length) return
    setCounts((c) => {
      const next = { ...c }
      for (const p of products) if (next[p.id] == null) next[p.id] = 0
      return next
    })
  }, [products.map((p) => p.id).join('|')])

  const [addProductOpen, setAddProductOpen] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductPrice, setNewProductPrice] = useState('')

  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const editOrder = useMemo(() => (editOrderId ? orders.find((o) => o.id === editOrderId) : undefined), [editOrderId, orders])

  const [historyFilter, setHistoryFilter] = useState<'all' | PaymentMethod>('all')

  const filteredOrders = useMemo(() => {
    if (historyFilter === 'all') return orders
    return orders.filter((o) => o.paymentMethod === historyFilter)
  }, [orders, historyFilter])

  const [closeAtLocal, setCloseAtLocal] = useState(() => new Date().toISOString().slice(0, 16))
  const [closeStockText, setCloseStockText] = useState('')
  const [closeComment, setCloseComment] = useState('')

  function parseStock(text: string) {
    // format: item=number per line
    const res: Record<string, number> = {}
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    for (const line of lines) {
      const [kRaw, vRaw] = line.split('=').map((x) => x.trim())
      if (!kRaw) continue
      const v = Number(vRaw)
      res[kRaw] = Number.isFinite(v) ? v : 0
    }
    return res
  }

  function openShiftFlow(outletId: string) {
    const outlet = outlets.find((o) => o.id === outletId)
    if (!outlet) return

    const existing = getOpenShiftByOutlet(outletId)
    if (existing) {
      localStorage.setItem('sunset_active_shift', existing.id)
      setActiveShiftId(existing.id)
      setTab('history')
      setOpenModalOutletId(null)
      return
    }

    const openedAt = new Date(openedAtLocal)
    const shift = {
      outletId: outlet.id,
      outletName: outlet.name,
      cashierName: cashierName.trim() || undefined,
      openedAt,
      openedStock: parseStock(openedStockText),
      openComment: openComment.trim() || undefined,
    }

    const created = openShift(shift)
    localStorage.setItem('sunset_active_shift', created.id)
    setActiveShiftId(created.id)
    setTab('history')
    setOpenModalOutletId(null)
  }

  function addQty(productId: string, delta: number) {
    setCounts((c) => ({ ...c, [productId]: Math.max(0, (c[productId] || 0) + delta) }))
  }

  function buildLines() {
    return products
      .map((p) => ({ productId: p.id, name: p.name, price: p.price, qty: counts[p.id] || 0 }))
      .filter((l) => l.qty > 0)
  }

  function makeOrder(method: PaymentMethod) {
    if (!activeShift) return
    const lines = buildLines()
    if (!lines.length) return
    createOrder({ outletId: activeShift.outletId, shiftId: activeShift.id, paymentMethod: method, lines })
    setTab('history')
  }

  function doCloseShift() {
    if (!activeShift) return
    const closedAt = new Date(closeAtLocal)
    closeShift({ shiftId: activeShift.id, closedAt, closedStock: parseStock(closeStockText), closeComment: closeComment.trim() || undefined })
  }

  function downloadWord() {
    if (!activeShift) return
    const report = buildShiftHtmlReport(activeShift, orders)
    downloadFile(`SunSet_${activeShift.outletName}_${activeShift.closedAtLocal || activeShift.openedAtLocal}.doc`, report.html, 'application/msword')
  }

  function downloadExcel() {
    if (!activeShift) return
    const report = buildShiftHtmlReport(activeShift, orders)
    const csv = toCsv(activeShift, orders, report.money)
    downloadFile(`SunSet_${activeShift.outletName}_${activeShift.closedAtLocal || activeShift.openedAtLocal}.csv`, csv, 'text/csv;charset=utf-8')
  }

  return (
    <div className="min-h-dvh bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(251,191,36,0.18),transparent_60%),radial-gradient(900px_520px_at_110%_30%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(900px_520px_at_60%_110%,rgba(244,63,94,0.12),transparent_55%)]" />

      <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/20">
              <Sunset className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white/60">Сотрудник</div>
              <div className="text-xl font-black tracking-tight">SunSet</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeShift ? (
              <>
                <Pill tone="amber">{activeShift.outletName}</Pill>
                <Pill>{activeShift.cashierName || 'Без имени'}</Pill>
                <Pill>{activeShift.openedAtLocal}</Pill>
                <Button
                  variant="ghost"
                  onClick={() => {
                    localStorage.removeItem('sunset_active_shift')
                    setActiveShiftId(null)
                    setTab('outlets')
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Выйти из смены
                </Button>
              </>
            ) : (
              <Pill tone="slate">Смена не открыта</Pill>
            )}

            <Button
              variant="ghost"
              onClick={() => {
                resetDemo()
                localStorage.removeItem('sunset_active_shift')
                setActiveShiftId(null)
                setTab('outlets')
              }}
              className="text-white/70"
            >
              <XCircle className="h-4 w-4" />
              Сбросить демо
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-12">
          <Card className="md:col-span-8">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="text-base font-bold">Активная смена</div>
              {activeShift ? (
                <Button variant="primary" onClick={() => setAddProductOpen(true)}>
                  + Добавить продукт
                </Button>
              ) : null}
            </div>
            <div className="p-5">
              {!activeShift ? (
                <div className="grid gap-3 text-white/70">
                  <div className="text-sm">Откройте смену в вкладке «Точки», чтобы начать продажи.</div>
                  <div className="grid gap-2 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                    <div className="font-semibold text-white">Подсказка</div>
                    <div>Это интерактивный прототип. Данные сохраняются в localStorage и имитируют Firestore realtime.</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((p) => (
                      <div key={p.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-extrabold leading-tight">{p.name}</div>
                            <div className="mt-1 text-xs text-white/60">{rub(p.price)}</div>
                          </div>
                          <Pill tone="slate">{counts[p.id] || 0} шт</Pill>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button onClick={() => addQty(p.id, -1)} className="flex-1">
                            –
                          </Button>
                          <Button onClick={() => addQty(p.id, +1)} className="flex-1" variant="primary">
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">Оплата</div>
                        <div className="text-xs text-white/60">Формирует заказ из текущих счетчиков (счетчики не сбрасываются)</div>
                      </div>
                      <Pill tone="amber">{rub(money.total)}</Pill>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button variant="primary" onClick={() => makeOrder('cash')}>
                        Наличка
                      </Button>
                      <Button variant="secondary" onClick={() => makeOrder('card')}>
                        Карта
                      </Button>
                      <Button variant="secondary" onClick={() => makeOrder('qr')}>
                        QR-код
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="md:col-span-4">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-base font-bold">Выручка</div>
              <div className="text-xs text-white/60">Текущая смена • realtime (демо)</div>
            </div>
            <div className="grid gap-3 p-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-semibold text-white/60">Итого</div>
                <div className="mt-1 text-2xl font-black">{rub(money.total)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[11px] font-semibold text-white/60">Нал</div>
                  <div className="mt-1 text-sm font-extrabold">{rub(money.cash)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[11px] font-semibold text-white/60">Карта</div>
                  <div className="mt-1 text-sm font-extrabold">{rub(money.card)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <div className="text-[11px] font-semibold text-white/60">QR</div>
                  <div className="mt-1 text-sm font-extrabold">{rub(money.qr)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-bold">Заказов</div>
                  <Pill>{orders.length}</Pill>
                </div>
                <div className="mt-2 text-xs text-white/60">Редактирование заказов доступно во вкладке «История».</div>
              </div>
            </div>
          </Card>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070A12]/85 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-4 px-2 py-2">
            <TabButton active={tab === 'schedule'} onClick={() => setTab('schedule')} icon={<CalendarDays className="h-5 w-5" />} label="График" />
            <TabButton active={tab === 'outlets'} onClick={() => setTab('outlets')} icon={<Store className="h-5 w-5" />} label="Точки" />
            <TabButton active={tab === 'history'} onClick={() => setTab('history')} icon={<History className="h-5 w-5" />} label="История" />
            <TabButton active={tab === 'close'} onClick={() => setTab('close')} icon={<LayoutGrid className="h-5 w-5" />} label="Закрытие" />
          </div>
        </nav>

        <div className="mt-6">
          {tab === 'schedule' ? (
            <ScheduleTab />
          ) : tab === 'outlets' ? (
            <OutletsTab
              outlets={outlets}
              onOpen={(id) => {
                setOpenModalOutletId(id)
                setOpenedAtLocal(new Date().toISOString().slice(0, 16))
                setOpenedStockText('')
                setCashierName('')
                setOpenComment('')
              }}
            />
          ) : tab === 'history' ? (
            <HistoryTab
              shift={activeShift}
              orders={filteredOrders}
              allOrders={orders}
              filter={historyFilter}
              onFilter={setHistoryFilter}
              onEdit={(id) => setEditOrderId(id)}
            />
          ) : (
            <CloseTab
              shift={activeShift}
              orders={orders}
              closeAtLocal={closeAtLocal}
              setCloseAtLocal={setCloseAtLocal}
              closeStockText={closeStockText}
              setCloseStockText={setCloseStockText}
              closeComment={closeComment}
              setCloseComment={setCloseComment}
              onCloseShift={doCloseShift}
              onWord={downloadWord}
              onExcel={downloadExcel}
            />
          )}
        </div>
      </div>

      <Modal
        open={!!openOutlet}
        title={openOutlet ? `Начало смены — ${openOutlet.name}` : 'Начало смены'}
        onClose={() => setOpenModalOutletId(null)}
        footer={
          <>
            <Button onClick={() => setOpenModalOutletId(null)} variant="ghost">
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!openOutlet) return
                openShiftFlow(openOutlet.id)
              }}
            >
              Начать смену
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Input label="ФИО / Имя" value={cashierName} onChange={setCashierName} placeholder="Напр. Иван П." />
          <label className="grid gap-1">
            <div className="text-xs font-semibold text-white/70">Время начала смены</div>
            <input
              type="datetime-local"
              value={openedAtLocal}
              onChange={(e) => setOpenedAtLocal(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
            />
          </label>
          <Textarea
            label="Остатки (формат: товар=число, каждая строка)"
            value={openedStockText}
            onChange={setOpenedStockText}
            placeholder={'Кукуруза=12\nМасло=3'}
          />
          <Textarea label="Комментарий с прошлой смены" value={prevComment || ''} onChange={() => {}} readOnly />
          <Textarea label="Новый комментарий" value={openComment} onChange={setOpenComment} placeholder="Напр. не работает терминал" />
        </div>
      </Modal>

      <Modal
        open={addProductOpen}
        title="Добавить продукт"
        onClose={() => setAddProductOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddProductOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!activeShift) return
                if (!newProductName.trim()) return
                const price = Number(newProductPrice)
                if (!Number.isFinite(price)) return
                createProduct(activeShift.outletId, newProductName, price)
                setNewProductName('')
                setNewProductPrice('')
                setAddProductOpen(false)
              }}
            >
              Добавить
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Input label="Название" value={newProductName} onChange={setNewProductName} placeholder="Напр. Лимонад" />
          <Input label="Цена" value={newProductPrice} onChange={setNewProductPrice} placeholder="Напр. 250" type="number" />
          <div className="text-xs text-white/60">Продукт добавится к ассортименту этой точки.</div>
        </div>
      </Modal>

      <EditOrderModal order={editOrder} open={!!editOrder} onClose={() => setEditOrderId(null)} />
    </div>
  )
}

function TabButton(props: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={props.onClick}
      className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
        props.active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      {props.icon}
      {props.label}
    </button>
  )
}

function ScheduleTab() {
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  const slots = ['08:00', '12:00', '16:00', '20:00']

  return (
    <Card>
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-base font-bold">График</div>
        <div className="text-xs text-white/60">Шахматка (визуализация занятости — на будущее)</div>
      </div>
      <div className="overflow-auto p-5">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-2">
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className="rounded-xl border border-white/10 bg-black/20 p-2 text-center text-xs font-bold">
                {d.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </div>
            ))}
            {slots.map((s) => (
              <div key={s} className="contents">
                <div className="rounded-xl border border-white/10 bg-black/20 p-2 text-xs font-bold text-white/70">{s}</div>
                {days.map((d) => (
                  <div key={d.toISOString() + s} className="h-12 rounded-xl border border-white/10 bg-white/5" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function OutletsTab(props: { outlets: { id: string; name: string }[]; onOpen: (id: string) => void }) {
  return (
    <Card>
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-base font-bold">Точки</div>
        <div className="text-xs text-white/60">Выберите точку для открытия смены</div>
      </div>
      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.outlets.map((o) => (
            <button
              key={o.id}
              onClick={() => props.onOpen(o.id)}
              className="group rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-amber-400/30 hover:bg-black/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">{o.name}</div>
                  <div className="mt-1 text-xs text-white/60">Открыть смену</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-white/70 transition group-hover:bg-amber-400/15 group-hover:text-amber-200">
                  <Store className="h-5 w-5" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

function HistoryTab(props: {
  shift?: Shift
  orders: Order[]
  allOrders: Order[]
  filter: 'all' | PaymentMethod
  onFilter: (f: 'all' | PaymentMethod) => void
  onEdit: (id: string) => void
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-base font-bold">История заказов</div>
          <div className="text-xs text-white/60">За текущую смену • редактирование доступно</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={props.filter === 'all' ? 'primary' : 'secondary'} onClick={() => props.onFilter('all')}>
            Все ({props.allOrders.length})
          </Button>
          <Button variant={props.filter === 'cash' ? 'primary' : 'secondary'} onClick={() => props.onFilter('cash')}>
            Наличка
          </Button>
          <Button variant={props.filter === 'card' ? 'primary' : 'secondary'} onClick={() => props.onFilter('card')}>
            Карта
          </Button>
          <Button variant={props.filter === 'qr' ? 'primary' : 'secondary'} onClick={() => props.onFilter('qr')}>
            QR
          </Button>
        </div>
      </div>
      <div className="p-5">
        {!props.shift ? (
          <div className="text-sm text-white/70">Смена не открыта.</div>
        ) : props.orders.length === 0 ? (
          <div className="text-sm text-white/70">Пока нет заказов.</div>
        ) : (
          <div className="grid gap-3">
            {props.orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold">{rub(o.total)}</div>
                      <Pill tone={paymentTone(o.paymentMethod)}>{paymentLabel(o.paymentMethod)}</Pill>
                      <span className="text-xs text-white/50">{o.createdAtLocal}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-white/70">
                      {o.lines.map((l) => (
                        <div key={l.productId} className="flex items-center justify-between gap-3">
                          <span className="truncate">{l.name}</span>
                          <span className="shrink-0">{l.qty} × {rub(l.price)} = {rub(l.qty * l.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => props.onEdit(o.id)}>
                    Редактировать
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function CloseTab(props: {
  shift?: Shift
  orders: Order[]
  closeAtLocal: string
  setCloseAtLocal: (s: string) => void
  closeStockText: string
  setCloseStockText: (s: string) => void
  closeComment: string
  setCloseComment: (s: string) => void
  onCloseShift: () => void
  onWord: () => void
  onExcel: () => void
}) {
  const money = calcBreakdown(props.orders)

  return (
    <Card>
      <div className="border-b border-white/10 px-5 py-4">
        <div className="text-base font-bold">Закрытие смены</div>
        <div className="text-xs text-white/60">Формирует отчет и сохраняет закрытую смену (демо)</div>
      </div>
      <div className="p-5">
        {!props.shift ? (
          <div className="text-sm text-white/70">Смена не открыта.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="grid gap-3">
              <label className="grid gap-1">
                <div className="text-xs font-semibold text-white/70">Время закрытия смены</div>
                <input
                  type="datetime-local"
                  value={props.closeAtLocal}
                  onChange={(e) => props.setCloseAtLocal(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/60"
                />
              </label>
              <Textarea
                label="Запись остатков (формат: товар=число, каждая строка)"
                value={props.closeStockText}
                onChange={props.setCloseStockText}
                placeholder={'Кукуруза=8\nМасло=1'}
              />
              <Textarea label="Комментарий при закрытии" value={props.closeComment} onChange={props.setCloseComment} placeholder="Напр. касса сверена" />
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" onClick={props.onCloseShift}>
                  Закрыть смену
                </Button>
                <Button onClick={props.onWord}>Скачать Word</Button>
                <Button onClick={props.onExcel}>Скачать Excel (CSV)</Button>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-xs font-semibold text-white/60">Авторасчет выручки</div>
                <div className="mt-2 grid gap-2">
                  <Row label="Итого" value={rub(money.total)} strong />
                  <Row label="Наличка" value={rub(money.cash)} />
                  <Row label="Карта" value={rub(money.card)} />
                  <Row label="QR" value={rub(money.qr)} />
                  <Row label="Заказов" value={String(props.orders.length)} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                После закрытия отчет «уходит директору»: смена станет видна во вкладке «Админ».
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function Row(props: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-white/70">{props.label}</div>
      <div className={`${props.strong ? 'text-white font-extrabold' : 'text-white/90 font-bold'}`}>{props.value}</div>
    </div>
  )
}

function EditOrderModal(props: { order?: Order; open: boolean; onClose: () => void }) {
  const [raw, setRaw] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')

  useEffect(() => {
    if (!props.order) return
    setMethod(props.order.paymentMethod)
    setRaw(JSON.stringify(props.order.lines, null, 2))
  }, [props.order?.id])

  return (
    <Modal
      open={props.open}
      title="Редактирование заказа"
      onClose={props.onClose}
      footer={
        <>
          <Button variant="ghost" onClick={props.onClose}>
            Закрыть
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!props.order) return
              try {
                const parsed = JSON.parse(raw) as any
                if (!Array.isArray(parsed)) return
                const lines = parsed
                  .map((l) => ({
                    productId: String(l.productId ?? ''),
                    name: String(l.name ?? ''),
                    price: Number(l.price ?? 0),
                    qty: Number(l.qty ?? 0),
                  }))
                  .filter((l) => l.name && Number.isFinite(l.price) && Number.isFinite(l.qty))
                updateOrder(props.order.id, { paymentMethod: method, lines })
                props.onClose()
              } catch {
                // ignore
              }
            }}
          >
            Сохранить
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-2">
          <div className="text-xs font-semibold text-white/70">Способ оплаты</div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant={method === 'cash' ? 'primary' : 'secondary'} onClick={() => setMethod('cash')}>
              Нал
            </Button>
            <Button variant={method === 'card' ? 'primary' : 'secondary'} onClick={() => setMethod('card')}>
              Карта
            </Button>
            <Button variant={method === 'qr' ? 'primary' : 'secondary'} onClick={() => setMethod('qr')}>
              QR
            </Button>
          </div>
        </div>
        <label className="grid gap-1">
          <div className="text-xs font-semibold text-white/70">Состав (JSON)</div>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="min-h-56 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white outline-none focus:border-amber-400/60"
          />
          <div className="text-xs text-white/50">Можно менять цену/кол-во/позиции — как в ТЗ. Формат: массив объектов {'{'}name, qty, price, productId{'}'}.</div>
        </label>
      </div>
    </Modal>
  )
}
