import React, { useState, useEffect } from 'react';
import { db, Point, ActiveShift, Order, ClosedShift, InventoryItem } from '../lib/db';
import { exportShiftToExcel, exportShiftToWord } from '../lib/exporter';
import { ShieldAlert, Clock, CheckCircle, FileSpreadsheet, FileText, AlertCircle, RefreshCw, BarChart3, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CloseShiftTabProps {
  pointId: string;
  onShiftClosed: () => void;
}

export const CloseShiftTab: React.FC<CloseShiftTabProps> = ({ pointId, onShiftClosed }) => {
  const [point, setPoint] = useState<Point | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Closing shift form state
  const [endTime, setEndTime] = useState('');
  const [finalInventory, setFinalInventory] = useState<Record<string, number>>({});
  const [closingComment, setClosingComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const currentPoint = db.getPoints().find(p => p.id === pointId);
    const shift = db.getActiveShiftByPoint(pointId);

    setPoint(currentPoint || null);
    setActiveShift(shift || null);

    if (shift) {
      setOrders(db.getOrdersByShift(shift.id));

      // Initialize final inventory with the calculated remains (Initial - Sold)
      if (currentPoint) {
        const initialInv = shift.initialInventory;
        const finalInv: Record<string, number> = {};

        // Используем inventory (остатки) вместо products
        const inventory = currentPoint.inventory || [];

        // Calculate sold quantities for each inventory item
        // Продажи теперь отслеживаются по ID остатков
        const soldMap: Record<string, number> = {};
        inventory.forEach((item: InventoryItem) => { soldMap[item.id] = 0; });

        const shiftOrders = db.getOrdersByShift(shift.id);
        shiftOrders.forEach(ord => {
          ord.items.forEach(item => {
            // Ищем соответствие между productId и inventory item
            // Если товар продан, уменьшаем соответствующий остаток
            if (soldMap[item.productId] !== undefined) {
              soldMap[item.productId] += item.quantity;
            }
          });
        });

        inventory.forEach((item: InventoryItem) => {
          const startingVal = initialInv[item.id] !== undefined ? initialInv[item.id] : item.quantity;
          const soldVal = soldMap[item.id] || 0;
          finalInv[item.id] = Math.max(0, startingVal - soldVal);
        });

        setFinalInventory(finalInv);
      }
    }

    // Set end time to local ISO format: YYYY-MM-DDTHH:MM
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setEndTime(localISOTime);

    const unsubscribe = db.subscribe(() => {
      const updatedPoint = db.getPoints().find(p => p.id === pointId);
      const updatedShift = db.getActiveShiftByPoint(pointId);
      setPoint(updatedPoint || null);
      setActiveShift(updatedShift || null);
      if (updatedShift) {
        setOrders(db.getOrdersByShift(updatedShift.id));
      }
    });

    return unsubscribe;
  }, [pointId]);

  if (!point || !activeShift) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Смена не найдена</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Для данной торговой точки сейчас нет активной рабочей смены.
        </p>
      </div>
    );
  }

  // Calculate sold quantities for comparison using inventory items
  const soldMap: Record<string, number> = {};
  const inventory = point.inventory || [];
  inventory.forEach((item: InventoryItem) => { soldMap[item.id] = 0; });
  orders.forEach(ord => {
    ord.items.forEach(item => {
      // Проверяем, есть ли такой ID в остатках
      if (soldMap[item.productId] !== undefined) {
        soldMap[item.productId] += item.quantity;
      }
    });
  });

  // Financial calculations
  let cash = 0, card = 0, qr = 0;
  orders.forEach(o => {
    if (o.paymentMethod === 'cash') cash += o.total;
    else if (o.paymentMethod === 'card') card += o.total;
    else if (o.paymentMethod === 'qr') qr += o.total;
  });
  const totalRevenue = cash + card + qr;

  const handleInventoryChange = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    setFinalInventory(prev => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : num
    }));
  };

  const handleExportExcel = () => {
    const closedShiftReport: ClosedShift = {
      id: activeShift.id,
      pointId: activeShift.pointId,
      pointName: activeShift.pointName,
      employeeName: activeShift.employeeName,
      startTime: activeShift.startTime,
      endTime: new Date(endTime).toISOString(),
      initialInventory: activeShift.initialInventory,
      finalInventory,
      commentsFromPrevShift: activeShift.commentsFromPrevShift,
      openingComment: activeShift.newComment,
      closingComment,
      ordersCount: orders.length,
      revenue: { total: totalRevenue, cash, card, qr },
      orders: orders
    };
    exportShiftToExcel(closedShiftReport);
  };

  const handleExportWord = () => {
    const closedShiftReport: ClosedShift = {
      id: activeShift.id,
      pointId: activeShift.pointId,
      pointName: activeShift.pointName,
      employeeName: activeShift.employeeName,
      startTime: activeShift.startTime,
      endTime: new Date(endTime).toISOString(),
      initialInventory: activeShift.initialInventory,
      finalInventory,
      commentsFromPrevShift: activeShift.commentsFromPrevShift,
      openingComment: activeShift.newComment,
      closingComment,
      ordersCount: orders.length,
      revenue: { total: totalRevenue, cash, card, qr },
      orders: orders
    };
    exportShiftToWord(closedShiftReport);
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!endTime) {
      setError('Укажите время закрытия смены');
      return;
    }

    // Validate inventory is non-negative
    for (const prodId of Object.keys(finalInventory)) {
      if (finalInventory[prodId] < 0) {
        setError('Остатки не могут быть отрицательными');
        return;
      }
    }

    if (confirm('Вы уверены, что хотите закрыть смену? Отчет автоматически будет отправлен директору в Firestore, а активная смена на точке завершится.')) {
      try {
        db.closeShift(
          point.id,
          new Date(endTime).toISOString(),
          finalInventory,
          closingComment
        );
        onShiftClosed(); // Callback to parent to redirect
      } catch (err: any) {
        setError(err.message || 'Ошибка при закрытии смены');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 p-6 rounded-2xl border border-orange-500/20">
        <h2 className="text-2xl font-bold text-orange-950 dark:text-orange-100 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-orange-500" />
          Закрытие смены
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Финальная сверка кассы и остатков на точке <span className="font-bold">{point.name}</span>. Проверьте выручку, скачайте отчеты и закройте смену.
        </p>
      </div>

      <form onSubmit={handleCloseShiftSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Grid Layout: Left - Inventory check, Right - Financial summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Inventory remains form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Сверка товарных остатков
                </h3>
                <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                  Вносите фактические остатки
                </span>
              </div>

              <div className="space-y-3">
                {inventory.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50 dark:bg-zinc-950/40 rounded-2xl border border-gray-100 dark:border-zinc-800/80">
                    <p className="text-sm text-gray-500">Нет остатков для сверки</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Добавьте остатки в разделе "Товары" → "Остатки"
                    </p>
                  </div>
                ) : (
                  inventory.map((item: InventoryItem) => {
                    const initial = activeShift.initialInventory[item.id] !== undefined ? activeShift.initialInventory[item.id] : item.quantity;
                    const sold = soldMap[item.id] || 0;
                    const calculated = Math.max(0, initial - sold);
                    const actual = finalInventory[item.id] !== undefined ? finalInventory[item.id] : calculated;
                    const diff = actual - calculated;

                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-gray-50/50 dark:bg-zinc-950/40 rounded-2xl border border-gray-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm block truncate">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-2.5 text-xs text-gray-400 mt-1">
                            <span>Старт: <b className="text-gray-600 dark:text-gray-300 font-semibold">{initial} {item.unit}</b></span>
                            <span>•</span>
                            <span>Продано: <b className="text-orange-500 font-semibold">{sold} {item.unit}</b></span>
                            <span>•</span>
                            <span>Расчетный остаток: <b className="text-gray-600 dark:text-gray-300 font-semibold">{calculated} {item.unit}</b></span>
                          </div>
                        </div>

                        {/* Actual Remains Input */}
                        <div className="flex items-center gap-3 justify-between sm:justify-end flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-gray-400 uppercase font-bold">Факт:</label>
                            <input
                              type="number"
                              min="0"
                              required
                              value={finalInventory[item.id] !== undefined ? finalInventory[item.id] : calculated}
                              onChange={(e) => handleInventoryChange(item.id, e.target.value)}
                              className="w-20 px-2 py-1.5 text-center text-xs font-bold rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                            <span className="text-xs text-gray-400">{item.unit}</span>
                          </div>

                          {/* Deficit / Surplus Indicator */}
                          <div className="w-16 text-right">
                            {diff < 0 ? (
                              <span className="text-xs font-bold text-rose-500" title="Недостача">
                                {diff} {item.unit}
                              </span>
                            ) : diff > 0 ? (
                              <span className="text-xs font-bold text-emerald-500" title="Излишек">
                                +{diff} {item.unit}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-gray-400">ОК</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Closing comments & end time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Время закрытия смены
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-4.5 h-4.5 text-gray-400" />
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Комментарий / Заметка при закрытии
                </label>
                <textarea
                  rows={2}
                  value={closingComment}
                  onChange={(e) => setClosingComment(e.target.value)}
                  placeholder="Например: касса сошлась, оборудование вымыто, точка закрыта..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Right: Revenue Summary and Closure Actions */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Финансовый итог смены
                </h3>
              </div>

              {/* Revenue Breakdown */}
              <div className="space-y-4">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 dark:from-zinc-950 dark:to-orange-950/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-center">
                  <span className="text-xs text-gray-400 font-bold uppercase block tracking-wider">Общая выручка</span>
                  <span className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight block mt-1">
                    {totalRevenue.toLocaleString()} ₽
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold mt-1 block">
                    Всего заказов: {orders.length} шт.
                  </span>
                </div>

                {/* Cash */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>Наличные (Нал)</span>
                    <span>{cash.toLocaleString()} ₽</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${totalRevenue > 0 ? (cash / totalRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>Карта (Терминал)</span>
                    <span>{card.toLocaleString()} ₽</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${totalRevenue > 0 ? (card / totalRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* QR */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
                    <span>QR-код (СБП)</span>
                    <span>{qr.toLocaleString()} ₽</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${totalRevenue > 0 ? (qr / totalRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Exporters block */}
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2.5">
                <span className="text-[11px] text-gray-400 font-bold uppercase block tracking-wider">
                  Экспорт отчета (Word / Excel)
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Word
                  </button>
                </div>
              </div>

              {/* Submit / Close Shift Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                Закрыть смену и отправить
              </button>

              <p className="text-[10px] text-gray-400 text-center italic leading-snug">
                После закрытия смены отчет мгновенно сохраняется в Firestore и становится доступен директору в админ-панели.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
