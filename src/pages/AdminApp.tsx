import { useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, FolderDown, Lock, Plus, Store, Sunset } from 'lucide-react'
import { Button, Card, Input, Modal, Pill, Textarea } from '../components/ui'
import type { Order, Shift } from '../lib/types'
import {
  addDefaultProducts,
  addOutlet,
  getShift,
  listClosedShifts,
  listOpenShifts,
  listOrders,
  resetDemo,
  subscribe,
} from '../lib/demoApi'
import { buildShiftHtmlReport, downloadFile, toCsv } from '../lib/reports'
import { calcBreakdown, rub } from '../lib/utils'

type AdminTab = 'open' | 'closed' | 'outlets'

export default function AdminApp(props: { onExit: () => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    return subscribe(() => setTick((t) => t + 1))
  }, [])

  const [authed, setAuthed] = useState(() => localStorage.getItem('sunset_admin_authed') === '1')
  const [pass, setPass] = useState('')

  const [tab, setTab] = useState<AdminTab>('open')
  const openShifts = useMemo(() => listOpenShifts(), [tick])
  const closedShifts = useMemo(() => listClosedShifts(), [tick])

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const selectedShift: Shift | undefined = useMemo(() => (selectedShiftId ? getShift(selectedShiftId) : undefined), [selectedShiftId, tick])
  const selectedOrders: Order[] = useMemo(() => (selectedShift ? listOrders(selectedShift.id) : []), [selectedShift?.id, tick])
  const money = useMemo(() => calcBreakdown(selectedOrders), [selectedOrders])

  const [addOutletOpen, setAddOutletOpen] = useState(false)
  const [outletName, setOutletName] = useState('')
  const [defaultProducts, setDefaultProducts] = useState('')

  function downloadWord() {
    if (!selectedShift) return
    const report = buildShiftHtmlReport(selectedShift, selectedOrders)
    downloadFile(`SunSet_${selectedShift.outletName}_${selectedShift.closedAtLocal || selectedShift.openedAtLocal}.doc`, report.html, 'application/msword')
  }

  function downloadExcel() {
    if (!selectedShift) return
    const report = buildShiftHtmlReport(selectedShift, selectedOrders)
    const csv = toCsv(selectedShift, selectedOrders, report.money)
    downloadFile(`SunSet_${selectedShift.outletName}_${selectedShift.closedAtLocal || selectedShift.openedAtLocal}.csv`, csv, 'text/csv;charset=utf-8')
  }

  if (!authed) {
    return (
      <div className="min-h-dvh bg-[#070A12] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(251,191,36,0.18),transparent_60%),radial-gradient(900px_520px_at_110%_30%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(900px_520px_at_60%_110%,rgba(244,63,94,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-lg px-4 py-10">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/20">
              <Sunset className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white/60">Админ-панель</div>
              <div className="text-xl font-black tracking-tight">SunSet</div>
            </div>
          </div>

          <Card className="mt-6">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-base font-bold">Вход</div>
              <div className="text-xs text-white/60">В прототипе используется локальный пароль. В проде — Firebase Auth + роль admin.</div>
            </div>
            <div className="grid gap-3 p-5">
              <Input label="Пароль" value={pass} onChange={setPass} type="password" placeholder="admin" />
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => {
                  if (pass === 'admin') {
                    localStorage.setItem('sunset_admin_authed', '1')
                    setAuthed(true)
                  }
                }}>
                  <Lock className="h-4 w-4" />
                  Войти
                </Button>
                <Button variant="ghost" onClick={props.onExit}>Назад</Button>
              </div>
              <div className="text-xs text-white/50">Подсказка: пароль <b>admin</b>.</div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(251,191,36,0.18),transparent_60%),radial-gradient(900px_520px_at_110%_30%,rgba(59,130,246,0.16),transparent_55%),radial-gradient(900px_520px_at_60%_110%,rgba(244,63,94,0.12),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/20">
              <Sunset className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white/60">Директор</div>
              <div className="text-xl font-black tracking-tight">Админ-панель SunSet</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => {
              localStorage.removeItem('sunset_admin_authed')
              setAuthed(false)
              setPass('')
            }}>Выйти</Button>
            <Button variant="ghost" onClick={props.onExit}>Закрыть админку</Button>
            <Button variant="ghost" onClick={() => resetDemo()}>
              Сбросить демо
            </Button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-12">
          <Card className="md:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-base font-bold">Смены</div>
                <div className="text-xs text-white/60">Realtime список открытых и закрытых смен</div>
              </div>
              <div className="flex gap-2">
                <Button variant={tab === 'open' ? 'primary' : 'secondary'} onClick={() => setTab('open')}>
                  Открытые
                </Button>
                <Button variant={tab === 'closed' ? 'primary' : 'secondary'} onClick={() => setTab('closed')}>
                  Закрытые
                </Button>
                <Button variant={tab === 'outlets' ? 'primary' : 'secondary'} onClick={() => setTab('outlets')}>
                  Точки
                </Button>
              </div>
            </div>
            <div className="p-5">
              {tab === 'open' ? (
                <ShiftList shifts={openShifts} titleEmpty="Нет активных смен" onSelect={(id) => setSelectedShiftId(id)} />
              ) : tab === 'closed' ? (
                <ShiftList shifts={closedShifts} titleEmpty="Нет закрытых смен" onSelect={(id) => setSelectedShiftId(id)} />
              ) : (
                <div className="grid gap-3">
                  <Button variant="primary" onClick={() => setAddOutletOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Добавить точку
                  </Button>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                    Добавление точек и товаров в прототипе сохраняется в localStorage. В проде — коллекции outlets и products в Firestore.
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="md:col-span-7">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-base font-bold">Детали</div>
              <div className="text-xs text-white/60">Открытие, комментарии, заказы и итоги</div>
            </div>
            <div className="p-5">
              {!selectedShift ? (
                <div className="text-sm text-white/70">Выберите смену слева.</div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="amber">{selectedShift.outletName}</Pill>
                      <Pill>{selectedShift.cashierName || 'Без имени'}</Pill>
                      <Pill tone={selectedShift.status === 'open' ? 'amber' : 'slate'}>{selectedShift.status === 'open' ? 'Открыта' : 'Закрыта'}</Pill>
                    </div>
                    <div className="mt-1 grid gap-1 text-xs text-white/70">
                      <div>Открытие: <b className="text-white">{selectedShift.openedAtLocal}</b></div>
                      {selectedShift.closedAtLocal ? <div>Закрытие: <b className="text-white">{selectedShift.closedAtLocal}</b></div> : null}
                      {selectedShift.openComment ? <div>Комментарий при открытии: <span className="text-white">{selectedShift.openComment}</span></div> : null}
                      {selectedShift.closeComment ? <div>Комментарий при закрытии: <span className="text-white">{selectedShift.closeComment}</span></div> : null}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">Выручка</div>
                      <Pill>{rub(money.total)}</Pill>
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
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                      <span>Заказов: <b className="text-white">{selectedOrders.length}</b></span>
                      <span>Состав: realtime via listeners (демо)</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={downloadWord}>
                        <FolderDown className="h-4 w-4" />
                        Word
                      </Button>
                      <Button onClick={downloadExcel}>
                        <FolderDown className="h-4 w-4" />
                        Excel
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">Заказы</div>
                      <Pill>{selectedOrders.length}</Pill>
                    </div>
                    {selectedOrders.length === 0 ? (
                      <div className="text-sm text-white/70">Нет заказов.</div>
                    ) : (
                      <div className="grid gap-2">
                        {selectedOrders.slice(0, 10).map((o) => (
                          <div key={o.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-extrabold">{rub(o.total)}</div>
                              <span className="text-xs text-white/50">{o.createdAtLocal}</span>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-white/70">
                              {o.lines.map((l) => (
                                <div key={l.productId} className="flex items-center justify-between gap-3">
                                  <span className="truncate">{l.name}</span>
                                  <span className="shrink-0">{l.qty} × {rub(l.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {selectedOrders.length > 10 ? (
                          <div className="text-xs text-white/50">Показаны первые 10 заказов. (В проде — пагинация.)</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Modal
          open={addOutletOpen}
          title="Добавить точку"
          onClose={() => setAddOutletOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setAddOutletOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const name = outletName.trim()
                  if (!name) return
                  const outlet = addOutlet(name)
                  const parsed = defaultProducts
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((l) => {
                      const [n, p] = l.split(';').map((x) => x.trim())
                      return { name: n, price: Number(p) }
                    })
                    .filter((x) => x.name && Number.isFinite(x.price))
                  if (parsed.length) addDefaultProducts(outlet.id, parsed)
                  setOutletName('')
                  setDefaultProducts('')
                  setAddOutletOpen(false)
                }}
              >
                <Plus className="h-4 w-4" />
                Добавить
              </Button>
            </>
          }
        >
          <div className="grid gap-3">
            <Input label="Название точки" value={outletName} onChange={setOutletName} placeholder="Напр. Кофе" />
            <Textarea
              label="Товары по умолчанию (каждая строка: Название;Цена)"
              value={defaultProducts}
              onChange={setDefaultProducts}
              placeholder={'Американо;200\nКапучино;250'}
            />
            <div className="text-xs text-white/60">После создания точка появится у кассира во вкладке «Точки».</div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

function ShiftList(props: { shifts: Shift[]; titleEmpty: string; onSelect: (id: string) => void }) {
  if (!props.shifts.length) return <div className="text-sm text-white/70">{props.titleEmpty}</div>
  return (
    <div className="grid gap-2">
      {props.shifts.map((s) => (
        <button
          key={s.id}
          onClick={() => props.onSelect(s.id)}
          className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-amber-400/30 hover:bg-black/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/5 text-white/70">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold">{s.outletName}</div>
                <div className="text-xs text-white/60">{s.cashierName || 'Без имени'}</div>
              </div>
            </div>
            <Pill tone={s.status === 'open' ? 'amber' : 'slate'}>{s.status === 'open' ? 'Открыта' : 'Закрыта'}</Pill>
          </div>
          <div className="mt-2 text-xs text-white/60">
            {s.status === 'open' ? `Открытие: ${s.openedAtLocal}` : `Закрытие: ${s.closedAtLocal}`}
          </div>
        </button>
      ))}
    </div>
  )
}
