import type { MoneyBreakdown, Order, Shift } from './types'
import { calcBreakdown, rub } from './utils'

function esc(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function buildShiftHtmlReport(shift: Shift, orders: Order[]) {
  const money = calcBreakdown(orders)
  const rows = orders
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((o) => {
      const lines = o.lines
        .map((l) => `${esc(l.name)} × ${l.qty} = ${rub(l.qty * l.price)}`)
        .join('<br/>')
      return `
<tr>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top">${esc(o.createdAtLocal)}</td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top">${esc(o.paymentMethod)}</td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;vertical-align:top">${lines}</td>
  <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top">${rub(o.total)}</td>
</tr>`
    })
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SunSet — Отчет по смене</title>
</head>
<body style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; padding: 24px;">
  <h1 style="margin:0 0 4px 0">SunSet — Отчет по смене</h1>
  <div style="color:#374151;margin:0 0 16px 0">${esc(shift.outletName)} • ${esc(shift.cashierName || '—')} • ${esc(shift.openedAtLocal)} → ${esc(shift.closedAtLocal || '')}</div>

  <h2 style="margin:24px 0 8px 0">Итоги</h2>
  <table style="border-collapse:collapse; width: 100%; max-width: 720px">
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Итого</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right"><b>${rub(money.total)}</b></td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Наличка</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${rub(money.cash)}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Карта</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${rub(money.card)}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">QR</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${rub(money.qr)}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">Кол-во заказов</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${orders.length}</td></tr>
  </table>

  <h2 style="margin:24px 0 8px 0">Заказы</h2>
  <table style="border-collapse:collapse; width: 100%">
    <thead>
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #9ca3af">Время</th>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #9ca3af">Оплата</th>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #9ca3af">Состав</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid #9ca3af">Сумма</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="4" style="padding:8px;color:#6b7280">Нет заказов</td></tr>`}
    </tbody>
  </table>

  <div style="margin-top:24px;color:#6b7280;font-size:12px">Сформировано в SunSet (демо-режим)</div>
</body>
</html>`

  return { html, money }
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function toCsv(shift: Shift, orders: Order[], money: MoneyBreakdown) {
  const lines: string[] = []
  lines.push(`Точка;${shift.outletName}`)
  lines.push(`Сотрудник;${shift.cashierName || ''}`)
  lines.push(`Открытие;${shift.openedAtLocal}`)
  lines.push(`Закрытие;${shift.closedAtLocal || ''}`)
  lines.push('')
  lines.push(`Итого;${money.total}`)
  lines.push(`Наличка;${money.cash}`)
  lines.push(`Карта;${money.card}`)
  lines.push(`QR;${money.qr}`)
  lines.push(`Заказов;${orders.length}`)
  lines.push('')
  lines.push('Время;Оплата;Товар;Кол-во;Цена;Сумма')
  for (const o of orders.slice().sort((a, b) => a.createdAt - b.createdAt)) {
    for (const l of o.lines) {
      lines.push(`${o.createdAtLocal};${o.paymentMethod};${l.name};${l.qty};${l.price};${l.qty * l.price}`)
    }
  }
  return lines.join('\n')
}
