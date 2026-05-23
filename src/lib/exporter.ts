import { ClosedShift, Order } from './db';

/**
 * Utility to format Date strings nicely
 */
export const formatDateTime = (isoString: string) => {
  const d = new Date(isoString);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Generates and downloads a beautifully formatted Excel/XLS spreadsheet for a closed shift.
 */
export const exportShiftToExcel = (shift: ClosedShift) => {
  const title = `Отчет по закрытию смены - ${shift.pointName}`;
  const filename = `Shift_Report_${shift.pointName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${shift.endTime.split('T')[0]}`;
  
  let content = `\uFEFF`; // UTF-8 BOM so Excel opens Cyrillic characters correctly
  
  // Custom styled HTML table that Excel interprets beautifully
  content += `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .title { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
        .subtitle { font-size: 12px; color: #4b5563; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th { background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; text-align: left; font-weight: bold; }
        td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        .section-header { font-size: 14px; font-weight: bold; color: #1e3a8a; background-color: #eff6ff; padding: 8px; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #3b82f6; }
        .total-row { font-weight: bold; background-color: #f9fafb; }
        .num { text-align: right; }
      </style>
    </head>
    <body>
      <div class="title">${title}</div>
      <div class="subtitle">Сформировано: ${formatDateTime(new Date().toISOString())}</div>
      
      <div class="section-header">Основная информация</div>
      <table>
        <tr>
          <th>Параметр</th>
          <th>Значение</th>
        </tr>
        <tr>
          <td>Торговая точка</td>
          <td><b>${shift.pointName}</b></td>
        </tr>
        <tr>
          <td>Сотрудник (кассир)</td>
          <td>${shift.employeeName}</td>
        </tr>
        <tr>
          <td>Начало смены</td>
          <td>${formatDateTime(shift.startTime)}</td>
        </tr>
        <tr>
          <td>Конец смены</td>
          <td>${formatDateTime(shift.endTime)}</td>
        </tr>
        <tr>
          <td>Комментарий при открытии</td>
          <td>${shift.openingComment || '—'}</td>
        </tr>
        <tr>
          <td>Комментарий при закрытии</td>
          <td>${shift.closingComment || '—'}</td>
        </tr>
      </table>

      <div class="section-header">Финансовый отчет</div>
      <table>
        <tr style="background-color: #f9fafb; font-weight: bold;">
          <th>Тип оплаты</th>
          <th class="num">Сумма (руб.)</th>
        </tr>
        <tr>
          <td>Наличные</td>
          <td class="num">${shift.revenue.cash.toLocaleString()} ₽</td>
        </tr>
        <tr>
          <td>Банковская карта</td>
          <td class="num">${shift.revenue.card.toLocaleString()} ₽</td>
        </tr>
        <tr>
          <td>QR-код (СБП)</td>
          <td class="num">${shift.revenue.qr.toLocaleString()} ₽</td>
        </tr>
        <tr class="total-row" style="background-color: #fef3c7;">
          <td>ИТОГО ВЫРУЧКА</td>
          <td class="num">${shift.revenue.total.toLocaleString()} ₽</td>
        </tr>
        <tr>
          <td>Всего заказов</td>
          <td class="num">${shift.ordersCount} шт.</td>
        </tr>
      </table>

      <div class="section-header">Остатки товаров на торговой точке</div>
      <table>
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th>Товар</th>
            <th class="num">Начало смены (шт.)</th>
            <th class="num">Конец смены (шт.)</th>
            <th class="num">Расход (шт.)</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Add inventory rows - используем inventory вместо products
  const mockDbPoints = localStorage.getItem('sunset_points');
  let inventoryMap: Record<string, string> = {};
  if (mockDbPoints) {
    try {
      const points = JSON.parse(mockDbPoints);
      points.forEach((p: any) => {
        // Используем inventory (остатки) вместо products
        if (p.inventory) {
          p.inventory.forEach((inv: any) => {
            inventoryMap[inv.id] = inv.name;
          });
        }
        // Fallback на products если inventory нет
        if (p.products) {
          p.products.forEach((prod: any) => {
            if (!inventoryMap[prod.id]) {
              inventoryMap[prod.id] = prod.name;
            }
          });
        }
      });
    } catch (e) {}
  }

  // Merge inventory items from inventory keys
  const allInventoryIds = Array.from(new Set([
    ...Object.keys(shift.initialInventory),
    ...Object.keys(shift.finalInventory)
  ]));

  allInventoryIds.forEach(invId => {
    const name = inventoryMap[invId] || `Товар (${invId})`;
    const start = shift.initialInventory[invId] || 0;
    const end = shift.finalInventory[invId] || 0;
    const diff = start - end;
    content += `
      <tr>
        <td>${name}</td>
        <td class="num">${start}</td>
        <td class="num">${end}</td>
        <td class="num" style="${diff < 0 ? 'color: red;' : ''}">${diff}</td>
      </tr>
    `;
  });

  content += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates and downloads a beautifully styled Word Document (as rich HTML-doc) for a closed shift.
 */
export const exportShiftToWord = (shift: ClosedShift) => {
  const title = `ОТЧЕТ О ЗАКРЫТИИ СМЕНЫ — ${shift.pointName.toUpperCase()}`;
  const filename = `Shift_Report_${shift.pointName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${shift.endTime.split('T')[0]}`;

  const mockDbPoints = localStorage.getItem('sunset_points');
  let inventoryMap: Record<string, string> = {};
  if (mockDbPoints) {
    try {
      const points = JSON.parse(mockDbPoints);
      points.forEach((p: any) => {
        // Используем inventory (остатки) вместо products
        if (p.inventory) {
          p.inventory.forEach((inv: any) => {
            inventoryMap[inv.id] = inv.name;
          });
        }
        // Fallback на products если inventory нет
        if (p.products) {
          p.products.forEach((prod: any) => {
            if (!inventoryMap[prod.id]) {
              inventoryMap[prod.id] = prod.name;
            }
          });
        }
      });
    } catch (e) {}
  }

  // Generate HTML for inventory table
  let inventoryRows = '';
  const allInventoryIds = Array.from(new Set([
    ...Object.keys(shift.initialInventory),
    ...Object.keys(shift.finalInventory)
  ]));

  allInventoryIds.forEach(invId => {
    const name = inventoryMap[invId] || `Товар (${invId})`;
    const start = shift.initialInventory[invId] || 0;
    const end = shift.finalInventory[invId] || 0;
    const diff = start - end;
    inventoryRows += `
      <tr>
        <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">${name}</td>
        <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: center;">${start}</td>
        <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: center;">${end}</td>
        <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: center; font-weight: bold;">${diff}</td>
      </tr>
    `;
  });

  // Generate HTML for orders list if available
  let ordersListHtml = '';
  if (shift.orders && shift.orders.length > 0) {
    ordersListHtml += `
      <h3 style="font-family: Arial, sans-serif; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px; margin-top: 20px;">СПИСОК ЗАКАЗОВ ЗА СМЕНУ</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: left;">Время</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: left;">Состав заказа</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: center;">Тип</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: right;">Сумма</th>
          </tr>
        </thead>
        <tbody>
    `;

    shift.orders.forEach(ord => {
      const timeStr = new Date(ord.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const itemsStr = ord.items.map(it => `${it.productName} (x${it.quantity})`).join(', ');
      const paymentTranslate = ord.paymentMethod === 'cash' ? 'Нал' : ord.paymentMethod === 'card' ? 'Карта' : 'QR';
      ordersListHtml += `
        <tr>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 10pt;">${timeStr}</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 10pt;">${itemsStr}</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: center;">${paymentTranslate}</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 10pt; text-align: right; font-weight: bold;">${ord.total} ₽</td>
        </tr>
      `;
    });

    ordersListHtml += `
        </tbody>
      </table>
    `;
  }

  const bodyHtml = `
    <div style="margin: 20px;">
      <h1 style="text-align: center; font-family: Arial, sans-serif; color: #1e3a8a; margin-bottom: 5px;">${title}</h1>
      <p style="text-align: center; font-family: Arial, sans-serif; font-size: 10pt; color: #555555; margin-top: 0; margin-bottom: 25px;">
        Сгенерировано в системе SunSet: ${formatDateTime(new Date().toISOString())}
      </p>

      <h3 style="font-family: Arial, sans-serif; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px;">1. СВОДНАЯ ИНФОРМАЦИЯ</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
        <tr>
          <td style="width: 40%; border: 1px solid #000000; padding: 6px; font-size: 11pt; background-color: #f9fafb; font-weight: bold;">Торговая точка</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; font-weight: bold;">${shift.pointName}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; background-color: #f9fafb; font-weight: bold;">Сотрудник (кассир)</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">${shift.employeeName}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; background-color: #f9fafb; font-weight: bold;">Время открытия смены</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">${formatDateTime(shift.startTime)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; background-color: #f9fafb; font-weight: bold;">Время закрытия смены</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">${formatDateTime(shift.endTime)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; background-color: #f9fafb; font-weight: bold;">Комментарий при открытии</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; font-style: italic;">${shift.openingComment || 'Комментарий отсутствует'}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; background-color: #f9fafb; font-weight: bold;">Комментарий при закрытии</td>
          <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; font-style: italic;">${shift.closingComment || 'Комментарий отсутствует'}</td>
        </tr>
      </table>

      <h3 style="font-family: Arial, sans-serif; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px; margin-top: 20px;">2. ФИНАНСОВЫЕ ИТОГИ</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: left;">Способ оплаты</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: right;">Сумма (руб.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">Наличный расчет</td>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: right;">${shift.revenue.cash.toLocaleString()} ₽</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">Безналичный расчет (терминал)</td>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: right;">${shift.revenue.card.toLocaleString()} ₽</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt;">Оплата по QR-коду (СБП)</td>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: right;">${shift.revenue.qr.toLocaleString()} ₽</td>
          </tr>
          <tr style="background-color: #eff6ff; font-weight: bold;">
            <td style="border: 1px solid #000000; padding: 8px; font-size: 12pt;">ОБЩАЯ ВЫРУЧКА ЗА СМЕНУ</td>
            <td style="border: 1px solid #000000; padding: 8px; font-size: 12pt; text-align: right; color: #1e3a8a;">${shift.revenue.total.toLocaleString()} ₽</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; font-weight: bold;">Всего выполненных заказов</td>
            <td style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: right; font-weight: bold;">${shift.ordersCount} шт.</td>
          </tr>
        </tbody>
      </table>

      <h3 style="font-family: Arial, sans-serif; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px; margin-top: 20px;">3. ДВИЖЕНИЕ ТОВАРОВ (ОСТАТКИ)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: left;">Название товара</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: center;">Остаток на начало (шт)</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: center;">Остаток на конец (шт)</th>
            <th style="border: 1px solid #000000; padding: 6px; font-size: 11pt; text-align: center;">Расход (продано, шт)</th>
          </tr>
        </thead>
        <tbody>
          ${inventoryRows}
        </tbody>
      </table>

      ${ordersListHtml}

      <div style="margin-top: 40px; font-family: Arial, sans-serif; font-size: 11pt;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="border: none; width: 50%;">Сдал сменополучатель / кассир: _________________</td>
            <td style="border: none; width: 50%; text-align: right;">Принял директор / администратор: _________________</td>
          </tr>
          <tr>
            <td style="border: none; font-size: 9pt; color: #555555;">(подпись, ФИО)</td>
            <td style="border: none; font-size: 9pt; color: #555555; text-align: right;">(подпись, ФИО)</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><title>${title}</title><style>body { font-family: Arial, sans-serif; line-height: 1.4; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 6px; text-align: left; } th { background-color: #f4f4f4; }</style></head><body>`;
  const footer = `</body></html>`;
  const content = `\uFEFF` + header + bodyHtml + footer;
  
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
