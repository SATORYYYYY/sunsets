import React, { useState, useEffect } from 'react';
import { db, Point, ActiveShift, Product, OrderItem } from '../lib/db';
import { Plus, Minus, CreditCard, Banknote, QrCode, ShoppingBag, AlertCircle, Sparkles, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveShiftPageProps {
  pointId: string;
  onNavigateToTab: (tabIndex: number) => void;
}

export const ActiveShiftPage: React.FC<ActiveShiftPageProps> = ({ pointId, onNavigateToTab }) => {
  const [point, setPoint] = useState<Point | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [counters, setCounters] = useState<Record<string, number>>({}); // productId -> count
  
  // Add Product Modal State
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [addProductError, setAddProductError] = useState('');

  // Order success toast
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);

  useEffect(() => {
    const currentPoint = db.getPoints().find(p => p.id === pointId);
    const shift = db.getActiveShiftByPoint(pointId);
    
    setPoint(currentPoint || null);
    setActiveShift(shift || null);

    // Initialize counters for all products of this point
    if (currentPoint) {
      const initialCounters: Record<string, number> = {};
      currentPoint.products.forEach(p => {
        initialCounters[p.id] = 0;
      });
      setCounters(initialCounters);
    }

    const unsubscribe = db.subscribe(() => {
      const updatedPoint = db.getPoints().find(p => p.id === pointId);
      const updatedShift = db.getActiveShiftByPoint(pointId);
      setPoint(updatedPoint || null);
      setActiveShift(updatedShift || null);

      if (updatedPoint) {
        setCounters(prev => {
          const next = { ...prev };
          updatedPoint.products.forEach(p => {
            if (next[p.id] === undefined) {
              next[p.id] = 0;
            }
          });
          return next;
        });
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
        <button
          onClick={() => onNavigateToTab(1)} // Go back to Points tab
          className="mt-4 px-5 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer"
        >
          Открыть смену
        </button>
      </div>
    );
  }

  const handleIncrement = (productId: string) => {
    setCounters(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const handleDecrement = (productId: string) => {
    setCounters(prev => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) - 1)
    }));
  };

  const handleResetCounters = () => {
    const reset: Record<string, number> = {};
    point.products.forEach(p => {
      reset[p.id] = 0;
    });
    setCounters(reset);
  };

  // Calculate current total
  const currentTotal = point.products.reduce((sum, p) => {
    const qty = counters[p.id] || 0;
    return sum + p.price * qty;
  }, 0);

  // Submit order with confirmation
  const handlePayment = (method: 'cash' | 'card' | 'qr') => {
    const orderItems: OrderItem[] = [];

    point.products.forEach(p => {
      const qty = counters[p.id] || 0;
      if (qty > 0) {
        orderItems.push({
          productId: p.id,
          productName: p.name,
          quantity: qty,
          price: p.price
        });
      }
    });

    if (orderItems.length === 0) {
      alert('Пожалуйста, выберите хотя бы один товар для продажи (кол-во должно быть больше 0).');
      return;
    }

    // Confirmation dialog
    const methodNames: Record<string, string> = {
      'cash': 'Наличные',
      'card': 'Банковская карта',
      'qr': 'QR-код (СБП)'
    };

    const confirmMessage = `Вы выбрали оплату: ${methodNames[method]}\n\nСумма заказа: ${currentTotal.toLocaleString()} ₽\n\nПодтвердить продажу?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Submit order to DB
    db.addOrder(activeShift.id, point.id, orderItems, method);

    // Show success toast
    setLastOrderTotal(currentTotal);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);

    // NOTE: counters are NOT reset as per instructions:
    // "при этом счетчики не сбрасываются (можно продавать дальше)"
  };

  // Handle Add Product on the fly
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      setAddProductError('Введите название товара');
      return;
    }

    const price = parseFloat(newProductPrice);
    if (isNaN(price) || price <= 0) {
      setAddProductError('Введите корректную цену товара (больше 0)');
      return;
    }

    db.addProductToPoint(point.id, newProductName.trim(), price);
    
    // Reset state
    setNewProductName('');
    setNewProductPrice('');
    setAddProductError('');
    setIsAddProductOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Shift Info Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-2xl shadow-md">
            {point.name.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{point.name}</h2>
              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-900/20">
                СМЕНА АКТИВНА
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Сотрудник: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeShift.employeeName}</span> • Открыта с {new Date(activeShift.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={() => setIsAddProductOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold rounded-xl text-sm transition-all cursor-pointer border border-orange-500/20"
        >
          <Plus className="w-4 h-4" />
          Добавить продукт
        </button>
      </div>

      {/* Main Panel Grid: Left - Products, Right - Cart summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Ассортимент точки
            </h3>
            {currentTotal > 0 && (
              <button
                onClick={handleResetCounters}
                className="text-xs text-gray-400 hover:text-rose-500 font-medium transition-colors cursor-pointer"
              >
                Сбросить счетчики
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {point.products.map(prod => {
              const count = counters[prod.id] || 0;
              return (
                <motion.div
                  key={prod.id}
                  layoutId={`prod-card-${prod.id}`}
                  className={`p-4 rounded-2xl border transition-all flex justify-between items-center h-28 ${
                    count > 0
                      ? 'bg-orange-50/40 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/50 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex flex-col justify-between h-full pr-3 flex-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm line-clamp-2 leading-tight">
                      {prod.name}
                    </span>
                    <span className="text-sm font-black text-orange-600 dark:text-orange-400 mt-1">
                      {prod.price.toLocaleString()} ₽
                    </span>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-zinc-950 p-1.5 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <button
                      onClick={() => handleDecrement(prod.id)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        count > 0
                          ? 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800'
                          : 'text-gray-300 dark:text-zinc-700 cursor-not-allowed'
                      }`}
                      disabled={count === 0}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    
                    <span className={`w-6 text-center text-sm font-black ${count > 0 ? 'text-orange-600 dark:text-orange-400 scale-110' : 'text-gray-400'}`}>
                      {count}
                    </span>

                    <button
                      onClick={() => handleIncrement(prod.id)}
                      className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-500" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Payment Summary Block */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Оплата и проведение заказа
          </h3>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6">
            {/* Live Cart Preview */}
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase block tracking-wider">Текущий выбор</span>
              <div className="mt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {point.products.filter(p => (counters[p.id] || 0) > 0).length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-gray-300" />
                    Нет выбранных товаров
                  </p>
                ) : (
                  point.products
                    .filter(p => (counters[p.id] || 0) > 0)
                    .map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 dark:text-gray-300 line-clamp-1 pr-2">{p.name}</span>
                        <span className="font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
                          {counters[p.id]} x {p.price} ₽ = {(counters[p.id] * p.price).toLocaleString()} ₽
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Total Indicator */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-end">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Итого к оплате:</span>
              <span className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                {currentTotal.toLocaleString()} ₽
              </span>
            </div>

            {/* Payment Methods Buttons */}
            <div className="space-y-3">
              <span className="text-xs text-gray-400 font-semibold uppercase block tracking-wider">Способ оплаты</span>
              
              <div className="grid grid-cols-1 gap-2.5">
                {/* Cash */}
                <button
                  onClick={() => handlePayment('cash')}
                  disabled={currentTotal === 0}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-between transition-all border cursor-pointer ${
                    currentTotal > 0
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-sm hover:shadow-md'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-gray-200 dark:border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Banknote className="w-5 h-5" />
                    Наличные
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{currentTotal.toLocaleString()} ₽</span>
                </button>

                {/* Card */}
                <button
                  onClick={() => handlePayment('card')}
                  disabled={currentTotal === 0}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-between transition-all border cursor-pointer ${
                    currentTotal > 0
                      ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600 shadow-sm hover:shadow-md'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-gray-200 dark:border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Банковская карта
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{currentTotal.toLocaleString()} ₽</span>
                </button>

                {/* QR Code */}
                <button
                  onClick={() => handlePayment('qr')}
                  disabled={currentTotal === 0}
                  className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-between transition-all border cursor-pointer ${
                    currentTotal > 0
                      ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-sm hover:shadow-md'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 border-gray-200 dark:border-zinc-800 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR-код (СБП)
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{currentTotal.toLocaleString()} ₽</span>
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-gray-400 text-center italic mt-2 leading-snug">
              При клике формируется заказ и уходит в историю. Значения счетчиков слева не сбрасываются для возможности непрерывной продажи.
            </p>
          </div>
        </div>
      </div>

      {/* ADD PRODUCT ON THE FLY MODAL */}
      <AnimatePresence>
        {isAddProductOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Добавить товар на лету
                </h3>
                <button
                  onClick={() => setIsAddProductOpen(false)}
                  className="text-white hover:bg-white/10 p-1 rounded-full transition-colors font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="p-5 space-y-4">
                {addProductError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs rounded-lg border border-rose-200 dark:border-rose-900/30 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {addProductError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                    Название товара
                  </label>
                  <input
                    type="text"
                    required
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Например: Сэндвич с ветчиной"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                    Цена продажи (руб.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    placeholder="250"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors text-xs"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-lg transition-all text-xs"
                  >
                    Добавить
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUCCESS ORDER TOAST */}
      <AnimatePresence>
        {showSuccessToast && (
          <div className="fixed bottom-6 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-emerald-600 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  Заказ успешно зафиксирован!
                </div>
                <div className="text-xs text-emerald-100 mt-0.5">
                  Сумма заказа: {lastOrderTotal.toLocaleString()} ₽ • Передан в историю
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
