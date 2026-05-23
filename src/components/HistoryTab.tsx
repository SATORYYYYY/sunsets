import React, { useState, useEffect } from 'react';
import { db, Point, ActiveShift, Order, OrderItem, Product } from '../lib/db';
import { History, Pencil, Trash2, Filter, AlertCircle, Clock, Banknote, CreditCard, QrCode, CheckCircle, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryTabProps {
  pointId: string;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ pointId }) => {
  const [point, setPoint] = useState<Point | null>(null);
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card' | 'qr'>('all');

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'card' | 'qr'>('cash');
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editError, setEditError] = useState('');

  // Dropdown to add product to order
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');

  useEffect(() => {
    const currentPoint = db.getPoints().find(p => p.id === pointId);
    const shift = db.getActiveShiftByPoint(pointId);
    
    setPoint(currentPoint || null);
    setActiveShift(shift || null);

    if (shift) {
      setOrders(db.getOrdersByShift(shift.id));
    }

    const unsubscribe = db.subscribe(() => {
      const updatedPoint = db.getPoints().find(p => p.id === pointId);
      const updatedShift = db.getActiveShiftByPoint(pointId);
      setPoint(updatedPoint || null);
      setActiveShift(updatedShift || null);

      if (updatedShift) {
        setOrders(db.getOrdersByShift(updatedShift.id));
      } else {
        setOrders([]);
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

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (paymentFilter === 'all') return true;
    return o.paymentMethod === paymentFilter;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Edit order modal setup
  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditPaymentMethod(order.paymentMethod);
    // Deep copy items so we don't modify the state directly
    setEditItems(order.items.map(it => ({ ...it })));
    setEditError('');
    setSelectedProductToAdd('');
  };

  const handleEditQtyChange = (productId: string, delta: number) => {
    setEditItems(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const handleEditPriceChange = (productId: string, val: string) => {
    const price = parseFloat(val);
    setEditItems(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          return { ...item, price: isNaN(price) ? 0 : price };
        }
        return item;
      });
    });
  };

  const handleRemoveItemFromEdit = (productId: string) => {
    setEditItems(prev => prev.filter(it => it.productId !== productId));
  };

  const handleAddProductToEditOrder = () => {
    if (!selectedProductToAdd) return;
    const prod = point.products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    // Check if product already exists in edit list
    const exists = editItems.some(it => it.productId === prod.id);
    if (exists) {
      setEditError('Этот товар уже есть в заказе. Вы можете изменить его количество.');
      return;
    }

    setEditItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: 1,
        price: prod.price
      }
    ]);
    setSelectedProductToAdd('');
    setEditError('');
  };

  const handleSaveEditOrder = () => {
    if (!editingOrder) return;

    if (editItems.length === 0) {
      setEditError('Заказ не может быть пустым. Если хотите отменить заказ, удалите его.');
      return;
    }

    // Validate prices
    for (const item of editItems) {
      if (item.price < 0) {
        setEditError('Цена товара не может быть отрицательной');
        return;
      }
    }

    // Save changes to DB
    db.updateOrder(editingOrder.id, {
      paymentMethod: editPaymentMethod,
      items: editItems
    });

    setEditingOrder(null);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('Вы уверены, что хотите полностью удалить этот заказ из истории?')) {
      db.deleteOrder(orderId);
      if (editingOrder?.id === orderId) {
        setEditingOrder(null);
      }
    }
  };

  // Get payment method badge
  const renderPaymentBadge = (method: 'cash' | 'card' | 'qr') => {
    switch (method) {
      case 'cash':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
            <Banknote className="w-3.5 h-3.5" />
            Наличка
          </span>
        );
      case 'card':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
            <CreditCard className="w-3.5 h-3.5" />
            Карта
          </span>
        );
      case 'qr':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/20">
            <QrCode className="w-3.5 h-3.5" />
            QR-код
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-6 rounded-2xl border border-orange-500/20">
        <div>
          <h2 className="text-2xl font-bold text-orange-950 dark:text-orange-100 flex items-center gap-2">
            <History className="w-6 h-6 text-orange-500" />
            История заказов
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Список проведенных заказов за текущую смену на точке <span className="font-bold">{point.name}</span>. Вы можете отфильтровать или отредактировать любой чек.
          </p>
        </div>

        {/* Payment Filters */}
        <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 self-start md:self-center">
          <button
            onClick={() => setPaymentFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              paymentFilter === 'all'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setPaymentFilter('cash')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              paymentFilter === 'cash'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Banknote className="w-3 h-3" /> Нал
          </button>
          <button
            onClick={() => setPaymentFilter('card')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              paymentFilter === 'card'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <CreditCard className="w-3 h-3" /> Карта
          </button>
          <button
            onClick={() => setPaymentFilter('qr')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
              paymentFilter === 'qr'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
            }`}
          >
            <QrCode className="w-3 h-3" /> QR
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">Заказов не найдено</h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
              За эту смену пока не было проведено продаж по выбранному типу оплаты.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredOrders.map(order => {
              const timeStr = new Date(order.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <motion.div
                  layout
                  key={order.id}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all"
                >
                  {/* Left: Metadata & Composition */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-black text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        #{order.id.substring(4, 9).toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        {timeStr}
                      </span>
                      {renderPaymentBadge(order.paymentMethod)}
                    </div>

                    {/* Items Composition */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-xs flex justify-between py-0.5 border-b border-gray-50 dark:border-zinc-800/30">
                          <span className="text-gray-600 dark:text-gray-300 pr-2 line-clamp-1">{item.productName}</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">
                            {item.quantity} шт. × {item.price} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Total & Edit Button */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 dark:border-zinc-800/50 gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Сумма чека</span>
                      <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                        {order.total.toLocaleString()} ₽
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenEditModal(order)}
                        className="p-2 bg-gray-50 hover:bg-orange-50 dark:bg-zinc-800 dark:hover:bg-orange-950/20 text-gray-600 hover:text-orange-600 dark:text-gray-300 dark:hover:text-orange-400 rounded-xl border border-gray-100 dark:border-zinc-700 transition-colors cursor-pointer"
                        title="Редактировать заказ"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 bg-gray-50 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/20 text-gray-600 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400 rounded-xl border border-gray-100 dark:border-zinc-700 transition-colors cursor-pointer"
                        title="Удалить заказ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT ORDER COMPREHENSIVE MODAL */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-xl border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Pencil className="w-5 h-5" />
                    Редактирование чека #{editingOrder.id.substring(4, 9).toUpperCase()}
                  </h3>
                  <p className="text-orange-100 text-xs mt-1">
                    Вы можете изменять состав, количество, цены и способ оплаты.
                  </p>
                </div>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="text-white hover:bg-white/10 p-2 rounded-full transition-colors font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {editError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5" />
                    {editError}
                  </div>
                )}

                {/* Edit Payment Method */}
                <div>
                  <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Способ оплаты
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditPaymentMethod('cash')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editPaymentMethod === 'cash'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-zinc-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      Наличные
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentMethod('card')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editPaymentMethod === 'card'
                          ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-zinc-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Карта
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPaymentMethod('qr')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        editPaymentMethod === 'qr'
                          ? 'bg-purple-500 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-zinc-950 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-zinc-800 hover:bg-gray-50'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      QR-код
                    </button>
                  </div>
                </div>

                {/* Edit Items Composition */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Состав заказа
                  </span>

                  <div className="space-y-2">
                    {editItems.map((item, idx) => (
                      <div
                        key={item.productId}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-200 dark:border-zinc-800/80 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block truncate">
                            {item.productName}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0 justify-between sm:justify-end">
                          {/* Price input (editable!) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">Цена:</span>
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleEditPriceChange(item.productId, e.target.value)}
                              className="w-16 px-1.5 py-1 text-xs font-bold text-center rounded bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-100"
                            />
                            <span className="text-[10px] text-gray-400">₽</span>
                          </div>

                          {/* Quantity +/- controls */}
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => handleEditQtyChange(item.productId, -1)}
                              className="w-6 h-6 rounded bg-gray-50 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs font-bold cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-gray-800 dark:text-gray-200">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEditQtyChange(item.productId, 1)}
                              className="w-6 h-6 rounded bg-gray-50 dark:bg-zinc-950 text-gray-700 dark:text-gray-300 hover:bg-gray-100 flex items-center justify-center text-xs font-bold cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-orange-500" />
                            </button>
                          </div>

                          {/* Delete Item from order */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromEdit(item.productId)}
                            className="text-rose-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                            title="Убрать из заказа"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Product to Order on the fly */}
                <div className="bg-orange-50/50 dark:bg-orange-950/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/20 space-y-2">
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase block tracking-wider">
                    Добавить другой товар в этот чек
                  </span>
                  
                  <div className="flex gap-2">
                    <select
                      value={selectedProductToAdd}
                      onChange={(e) => setSelectedProductToAdd(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="">-- Выберите товар --</option>
                      {point.products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price} ₽)
                        </option>
                      ))}
                    </select>
                    
                    <button
                      type="button"
                      onClick={handleAddProductToEditOrder}
                      disabled={!selectedProductToAdd}
                      className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:dark:bg-zinc-800 disabled:text-gray-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Добавить
                    </button>
                  </div>
                </div>

                {/* Recalculated Total Indicator */}
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Новая сумма заказа:</span>
                  <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                    {editItems.reduce((sum, it) => sum + it.price * it.quantity, 0).toLocaleString()} ₽
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 dark:bg-zinc-800/20 border-t border-gray-100 dark:border-zinc-800/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(editingOrder.id)}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs flex items-center gap-1 border border-rose-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Удалить чек
                </button>
                
                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingOrder(null)}
                    className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Отмена
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleSaveEditOrder}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
