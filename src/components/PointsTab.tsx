import React, { useState, useEffect } from 'react';
import { db, Point, ActiveShift, ClosedShift, InventoryItem } from '../lib/db';
import { Store, User, Clock, ArrowRight, MessageSquare, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PointsTabProps {
  onSelectActiveShift: (pointId: string) => void;
}

export const PointsTab: React.FC<PointsTabProps> = ({ onSelectActiveShift }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [activeShifts, setActiveShifts] = useState<Record<string, ActiveShift>>({});
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>([]);
  const [currentUser, setCurrentUser] = useState(db.getCurrentUser());

  // Modal State
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [employeeName, setEmployeeName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [prevComment, setPrevComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPoints(db.getPoints());
    setActiveShifts(db.getActiveShifts());
    setClosedShifts(db.getClosedShifts());
    setCurrentUser(db.getCurrentUser());

    const unsubscribe = db.subscribe(() => {
      setPoints(db.getPoints());
      setActiveShifts(db.getActiveShifts());
      setClosedShifts(db.getClosedShifts());
      setCurrentUser(db.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  // Set default form values when opening modal
  const handleOpenStartShiftModal = (point: Point) => {
    setSelectedPoint(point);
    setEmployeeName(currentUser?.fullName || '');

    // Set start time to local ISO format: YYYY-MM-DDTHH:MM
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setStartTime(localISOTime);

    // Find the last closed shift for this point to load past inventory & comments
    const pointClosedShifts = closedShifts
      .filter(cs => cs.pointId === point.id)
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    const lastClosed = pointClosedShifts[0];

    // Используем остатки (inventory) точки вместо товаров (products)
    // Если остатков нет — автоматически создаём их из товаров
    let pointInventory = point.inventory || [];
    
    // Автоматическое создание остатков из товаров, если остатков ещё нет
    if (pointInventory.length === 0 && point.products.length > 0) {
      // Создаём остатки из товаров с дефолтным количеством 50
      point.products.forEach(prod => {
        db.addInventoryToPoint(point.id, prod.name, 50, 'шт');
      });
      // Обновляем локальный массив
      pointInventory = point.inventory || [];
    }

    if (lastClosed) {
      setPrevComment(`${lastClosed.employeeName} (${new Date(lastClosed.endTime).toLocaleDateString()}): ${lastClosed.closingComment || 'Без комментариев'}`);

      // Pre-fill inventory with the final inventory of the last closed shift
      const initialInv: Record<string, number> = {};
      pointInventory.forEach((item: InventoryItem) => {
        initialInv[item.id] = lastClosed.finalInventory[item.id] !== undefined ? lastClosed.finalInventory[item.id] : item.quantity;
      });
      setInventory(initialInv);
    } else {
      setPrevComment('Комментариев с прошлой смены нет (первый запуск торговой точки).');

      // Default to current inventory quantities
      const initialInv: Record<string, number> = {};
      pointInventory.forEach((item: InventoryItem) => {
        initialInv[item.id] = item.quantity;
      });
      setInventory(initialInv);
    }

    setNewComment('');
    setError('');
  };

  const handleInventoryChange = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    setInventory(prev => ({
      ...prev,
      [productId]: isNaN(num) ? 0 : num
    }));
  };

  const handleStartShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;

    if (!employeeName.trim()) {
      setError('Пожалуйста, введите ФИО сотрудника');
      return;
    }

    if (!startTime) {
      setError('Пожалуйста, укажите время начала смены');
      return;
    }

    // Validate that all inventory items are non-negative numbers
    for (const prodId of Object.keys(inventory)) {
      if (inventory[prodId] < 0) {
        setError('Количество товаров не может быть отрицательным');
        return;
      }
    }

    try {
      db.startShift(
        selectedPoint.id,
        employeeName,
        new Date(startTime).toISOString(),
        inventory,
        newComment
      );
      
      // Close modal and switch view to Active Shift for this point
      const pointId = selectedPoint.id;
      setSelectedPoint(null);
      onSelectActiveShift(pointId);
    } catch (err: any) {
      setError(err.message || 'Ошибка открытия смены');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 p-6 rounded-2xl border border-orange-500/20">
        <h2 className="text-2xl font-bold text-orange-950 dark:text-orange-100 flex items-center gap-2">
          <Store className="w-6 h-6 text-orange-500" />
          Торговые точки
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Выберите торговую точку, чтобы начать рабочую смену, или перейдите к управлению активной сменой.
        </p>
      </div>

      {/* Points Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {points.map(point => {
          const activeShift = activeShifts[point.id];
          const isOpen = !!activeShift;

          return (
            <motion.div
              whileHover={{ y: -4 }}
              key={point.id}
              onClick={() => {
                if (isOpen) {
                  onSelectActiveShift(point.id);
                } else {
                  handleOpenStartShiftModal(point);
                }
              }}
              className={`p-6 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between h-56 relative overflow-hidden group shadow-sm ${
                isOpen
                  ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-zinc-900 dark:to-orange-950/10 border-orange-300 dark:border-orange-900/50 hover:shadow-md'
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-zinc-700 hover:shadow-md'
              }`}
            >
              {/* Background Glow for Open Shifts */}
              {isOpen && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none group-hover:bg-orange-500/15 transition-all"></div>
              )}

              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {point.name}
                    </h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {point.products.length} товаров в ассортименте
                    </p>
                  </div>

                  {/* Status Badge */}
                  {isOpen ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/30 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                      Смена открыта
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Закрыто
                    </span>
                  )}
                </div>

                {/* Body Details */}
                <div className="mt-4 space-y-2">
                  {isOpen ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <User className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">{activeShift.employeeName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span>Начало: {new Date(activeShift.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">
                      Нажмите, чтобы сверить остатки и открыть новую рабочую смену на этой точке.
                    </p>
                  )}
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/50 flex justify-between items-center text-sm font-semibold">
                {isOpen ? (
                  <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Панель продаж <ArrowRight className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1 group-hover:text-orange-500 transition-colors">
                    Открыть смену <Plus className="w-4 h-4 text-orange-500" />
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* START SHIFT MODAL */}
      <AnimatePresence>
        {selectedPoint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <Store className="w-6 h-6" />
                    Открытие смены: {selectedPoint.name}
                  </h3>
                  <p className="text-orange-100 text-xs mt-1">
                    Заполните все данные для корректного ведения учета продаж и остатков.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPoint(null)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition-colors font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleStartShiftSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      ФИО сотрудника
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="Иванов Иван Иванович"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Время начала смены
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="datetime-local"
                        required
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Read-Only Previous Shift Comment */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-4 h-4 text-orange-500" />
                    Комментарий с прошлой смены (только чтение)
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic pl-5 border-l-2 border-orange-500">
                    {prevComment}
                  </p>
                </div>

                {/* Numeric Inventory Remains */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Остатки товаров на начало смены (проверка)
                  </span>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 -mt-1">
                    Сверьте фактическое количество товаров на точке и внесите стартовые значения.
                  </p>

                  {(!selectedPoint.inventory || selectedPoint.inventory.length === 0) ? (
                    <div className="p-6 text-center bg-gray-50 dark:bg-zinc-800/10 rounded-2xl border border-gray-100 dark:border-zinc-800">
                      <p className="text-sm text-gray-500">Нет остатков для проверки</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Добавьте остатки в разделе "Товары" → "Остатки"
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/50 dark:bg-zinc-800/10 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                      {selectedPoint.inventory.map((item: InventoryItem) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 pr-2 line-clamp-2">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="number"
                              min="0"
                              required
                              value={inventory[item.id] !== undefined ? inventory[item.id] : item.quantity}
                              onChange={(e) => handleInventoryChange(item.id, e.target.value)}
                              className="w-20 px-2.5 py-1.5 text-center text-xs font-bold rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            />
                            <span className="text-xs text-gray-400">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* New Comment */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Заметка / Новый комментарий при открытии
                  </label>
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Например: все приборы в наличии, сдачу принял, кофемашина прогрета..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-sm"
                  ></textarea>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800/50">
                  <button
                    type="button"
                    onClick={() => setSelectedPoint(null)}
                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Начать смену
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
