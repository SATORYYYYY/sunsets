import React, { useState, useEffect, useMemo } from 'react';
import { db, Point, ActiveShift, ClosedShift, Order, Product } from '../lib/db';
import { exportShiftToExcel, exportShiftToWord } from '../lib/exporter';
import { Lock, LogOut, ShieldCheck, Play, Archive, BarChart3, Plus, Trash2, FileSpreadsheet, FileText, Calendar, Filter, Store, DollarSign, ShoppingCart, User, MessageSquare, PlusCircle, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminPanelProps {
  onLogin?: () => void;
  onBack?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogin, onBack }) => {
  const [currentUser, setCurrentUser] = useState(db.getCurrentUser());
  const [points, setPoints] = useState<Point[]>([]);
  const [activeShifts, setActiveShifts] = useState<Record<string, ActiveShift>>({});
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>([]);
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin sub-tabs: 'active' | 'closed' | 'analytics'
  const [subTab, setSubTab] = useState<'active' | 'closed' | 'analytics'>('active');

  // Analytics date filter
  const [analyticsFilter, setAnalyticsFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  // Selected active shift monitor
  const [monitoredPointId, setMonitoredPointId] = useState<string | null>(null);
  const [monitoredOrders, setMonitoredOrders] = useState<Order[]>([]);

  // Selected closed shift detail
  const [selectedClosedShift, setSelectedClosedShift] = useState<ClosedShift | null>(null);

  // Date filters for closed shifts
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Point Management state
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [newPointName, setNewPointName] = useState('');
  const [newPointProducts, setNewPointProducts] = useState<{ name: string; price: number }[]>([
    { name: '', price: 0 }
  ]);
  const [pointManageError, setPointManageError] = useState('');

  useEffect(() => {
    setPoints(db.getPoints());
    setActiveShifts(db.getActiveShifts());
    setClosedShifts(db.getClosedShifts());

    const user = db.getCurrentUser();
    console.log('🔄 AdminPanel: Current user from db:', user);
    setCurrentUser(user);

    const unsubscribe = db.subscribe(() => {
      const updatedUser = db.getCurrentUser();
      console.log('🔄 AdminPanel: User updated via subscription:', updatedUser);
      setCurrentUser(updatedUser);

      setPoints(db.getPoints());
      setActiveShifts(db.getActiveShifts());
      setClosedShifts(db.getClosedShifts());
    });
    return unsubscribe;
  }, []);

  // Real-time listener effect for monitored active shift orders
  useEffect(() => {
    if (monitoredPointId && activeShifts[monitoredPointId]) {
      const activeShiftId = activeShifts[monitoredPointId].id;
      setMonitoredOrders(db.getOrdersByShift(activeShiftId));

      const unsubscribe = db.subscribe(() => {
        if (activeShifts[monitoredPointId]) {
          const updatedShiftId = activeShifts[monitoredPointId].id;
          setMonitoredOrders(db.getOrdersByShift(updatedShiftId));
        }
      });
      return unsubscribe;
    } else {
      setMonitoredOrders([]);
    }
  }, [monitoredPointId, activeShifts]);

  // LOGIN HANDLERS
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Attempting login with:', { username, password });
    console.log('📋 Expected: Admin / Admin');

    if (username.trim() === 'Admin' && password.trim() === 'Admin') {
      console.log('✅ Login successful!');
      db.login(username.trim().toLowerCase(), 'admin', 'Директор Сети');
      setLoginError('');
      setUsername('');
      setPassword('');
      // Форсируем обновление состояния
      setTimeout(() => {
        setCurrentUser(db.getCurrentUser());
        if (onLogin) onLogin();
      }, 0);
    } else {
      console.log('❌ Login failed!');
      setLoginError('Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    db.logout();
    // Форсируем обновление состояния
    setTimeout(() => {
      const user = db.getCurrentUser();
      setCurrentUser(user);
      console.log('🚪 Logged out, current user:', user);
    }, 0);
  };

  // DATE FILTERING LOGIC
  const getFilteredClosedShifts = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return closedShifts.filter(shift => {
      const shiftDateStr = shift.endTime.split('T')[0];
      const shiftDate = new Date(shift.endTime);

      switch (dateFilter) {
        case 'today':
          return shiftDateStr === todayStr;
        case 'yesterday':
          return shiftDateStr === yesterdayStr;
        case 'week':
          return shiftDate >= sevenDaysAgo;
        case 'custom':
          if (customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999); // Include full end day
            return shiftDate >= start && shiftDate <= end;
          }
          return true;
        case 'all':
        default:
          return true;
      }
    });
  };

  const filteredClosedShifts = getFilteredClosedShifts();

  // POINT MANAGEMENT HANDLERS
  const handleAddProductRow = () => {
    setNewPointProducts(prev => [...prev, { name: '', price: 0 }]);
  };

  const handleRemoveProductRow = (idx: number) => {
    setNewPointProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProductRowChange = (idx: number, field: 'name' | 'price', val: any) => {
    setNewPointProducts(prev => {
      return prev.map((item, i) => {
        if (i === idx) {
          if (field === 'price') {
            const price = parseFloat(val);
            return { ...item, price: isNaN(price) ? 0 : price };
          }
          return { ...item, [field]: val };
        }
        return item;
      });
    });
  };

  const handleAddPointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🏪 Adding point:', newPointName);

    if (!newPointName.trim()) {
      setPointManageError('Введите название торговой точки');
      return;
    }

    // Filter valid products
    const validProducts = newPointProducts
      .filter(p => p.name.trim() !== '' && p.price > 0)
      .map(p => ({
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        name: p.name.trim(),
        price: p.price
      }));

    if (validProducts.length === 0) {
      setPointManageError('Добавьте хотя бы один товар с ценой больше 0');
      return;
    }

    try {
      const newPoint = await db.addPoint(newPointName.trim(), validProducts);
      console.log('✅ Point added successfully:', newPoint);

      // Reset form
      setNewPointName('');
      setNewPointProducts([{ name: '', price: 0 }]);
      setPointManageError('');
      setIsAddingPoint(false);
    } catch (error) {
      console.error('❌ Error adding point:', error);
      setPointManageError('Ошибка при добавлении точки. Попробуйте еще раз.');
    }
  };

  // Recalculate analytics when dependencies change
  const analytics = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (analyticsFilter) {
      case 'all':
        break;
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'custom':
        if (analyticsStartDate && analyticsEndDate) {
          startDate = new Date(analyticsStartDate);
          endDate = new Date(analyticsEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
    }

    let totalRev = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalQr = 0;
    let totalOrders = 0;

    const revenueByPoint: Record<string, number> = {};
    const ordersByPoint: Record<string, number> = {};

    closedShifts.forEach(shift => {
      const shiftDate = new Date(shift.endTime);

      if (startDate && endDate) {
        if (shiftDate < startDate || shiftDate > endDate) return;
      }

      totalRev += shift.revenue.total;
      totalCash += shift.revenue.cash;
      totalCard += shift.revenue.card;
      totalQr += shift.revenue.qr;
      totalOrders += shift.ordersCount;

      revenueByPoint[shift.pointName] = (revenueByPoint[shift.pointName] || 0) + shift.revenue.total;
      ordersByPoint[shift.pointName] = (ordersByPoint[shift.pointName] || 0) + shift.ordersCount;
    });

    return {
      totalRev,
      totalCash,
      totalCard,
      totalQr,
      totalOrders,
      revenueByPoint,
      ordersByPoint,
      startDate,
      endDate
    };
  }, [closedShifts, analyticsFilter, analyticsStartDate, analyticsEndDate]);

  // If NOT ADMIN, show login
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-rose-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">Вход в Админ-панель</h2>
            <p className="text-xs text-gray-400">
              Доступ разрешен только руководителям торговой сети SunSet.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900/30 flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                {loginError}
              </div>
            )}

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                ← Назад ко входу
              </button>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Логин администратора
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Пароль
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
              Авторизоваться
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Top Panel */}
      <div className="bg-gradient-to-r from-purple-900 via-orange-950 to-zinc-900 border border-purple-950 p-6 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white text-xl shadow-lg">
            👑
          </div>
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              Административная панель
              <span className="bg-purple-500 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                Director
              </span>
            </h2>
            <p className="text-xs text-purple-200 mt-0.5">
              Вы вошли как <span className="font-semibold text-orange-400">{currentUser.fullName}</span>. Управление точками, контроль смен и сквозная аналитика.
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer self-start md:self-center"
        >
          <LogOut className="w-4 h-4" />
          Выйти из админки
        </button>
      </div>

      {/* Admin Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => { setSubTab('active'); setMonitoredPointId(null); }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'active'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <Play className="w-4 h-4" />
          Открытые смены
          <span className="bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full">
            {Object.keys(activeShifts).length}
          </span>
        </button>

        <button
          onClick={() => { setSubTab('closed'); setSelectedClosedShift(null); }}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'closed'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          Закрытые смены
          <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
            {closedShifts.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('analytics')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            subTab === 'analytics'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Аналитика сети
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}

      {/* 1. ACTIVE SHIFTS MONITOR */}
      {subTab === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Active Shifts List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Текущие открытые смены
            </h3>

            {Object.keys(activeShifts).length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-sm text-gray-400 italic">Нет активных смен в данный момент.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.values(activeShifts).map(shift => {
                  const isMonitored = monitoredPointId === shift.pointId;
                  return (
                    <div
                      key={shift.id}
                      onClick={() => setMonitoredPointId(shift.pointId)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isMonitored
                          ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-300 dark:border-orange-900/50 shadow-sm'
                          : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-orange-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                          {shift.pointName}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          LIVE
                        </span>
                      </div>

                      <div className="mt-2 text-xs space-y-1 text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-orange-500" />
                          <span>{shift.employeeName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          <span>Начало: {new Date(shift.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Real-time Monitor Details */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Реалтайм-монитор продаж
            </h3>

            {!monitoredPointId || !activeShifts[monitoredPointId] ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl h-64 flex flex-col items-center justify-center">
                <Store className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Выберите активную смену слева, чтобы открыть монитор продаж в реальном времени.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6"
              >
                {/* Monitor Header */}
                <div className="flex justify-between items-start border-b border-gray-100 dark:border-zinc-800 pb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {activeShifts[monitoredPointId].pointName}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Сотрудник: <span className="font-semibold text-gray-700 dark:text-gray-300">{activeShifts[monitoredPointId].employeeName}</span> • Смена открыта в {new Date(activeShifts[monitoredPointId].startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Касса (в реальном времени)</span>
                    <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                      {monitoredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString()} ₽
                    </span>
                  </div>
                </div>

                {/* Opening Details Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Начальные остатки</span>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {Object.entries(activeShifts[monitoredPointId].initialInventory).map(([prodId, qty]) => {
                        const pt = points.find(p => p.id === monitoredPointId);
                        const prod = pt?.products.find(p => p.id === prodId);
                        return (
                          <div key={prodId} className="text-xs flex justify-between">
                            <span className="text-gray-500 truncate pr-2">{prod?.name || prodId}</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{qty} шт.</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Комментарий при открытии</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic">
                      {activeShifts[monitoredPointId].newComment || 'Комментарий отсутствует'}
                    </p>
                  </div>
                </div>

                {/* Live orders stream */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Поток продаж (onSnapshot Firestore)
                  </span>

                  {monitoredOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-4 text-center">Продаж за смену пока не зафиксировано.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {monitoredOrders
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map(order => (
                          <div key={order.id} className="p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl flex justify-between items-center text-xs">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                                <span>Чек #{order.id.substring(4, 9).toUpperCase()}</span>
                                <span className="text-[10px] text-gray-400 font-normal">
                                  {new Date(order.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-gray-500 mt-1">
                                {order.items.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                              </p>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              <div>
                                <span className="font-extrabold text-orange-600 dark:text-orange-400">{order.total} ₽</span>
                                <span className="text-[9px] text-gray-400 block uppercase font-bold">{order.paymentMethod}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* 2. CLOSED SHIFTS HISTORY & POINT MANAGEMENT */}
      {subTab === 'closed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns: Closed Shifts List & Filters */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Архив закрытых смен
                </h3>

                {/* Date Filter selector */}
                <div className="flex flex-wrap gap-1 bg-gray-50 dark:bg-zinc-950 p-1 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      dateFilter === 'all' ? 'bg-orange-500 text-white' : 'text-gray-500'
                    }`}
                  >
                    Все
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      dateFilter === 'today' ? 'bg-orange-500 text-white' : 'text-gray-500'
                    }`}
                  >
                    Сегодня
                  </button>
                  <button
                    onClick={() => setDateFilter('yesterday')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      dateFilter === 'yesterday' ? 'bg-orange-500 text-white' : 'text-gray-500'
                    }`}
                  >
                    Вчера
                  </button>
                  <button
                    onClick={() => setDateFilter('week')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      dateFilter === 'week' ? 'bg-orange-500 text-white' : 'text-gray-500'
                    }`}
                  >
                    7 дней
                  </button>
                  <button
                    onClick={() => setDateFilter('custom')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      dateFilter === 'custom' ? 'bg-orange-500 text-white' : 'text-gray-500'
                    }`}
                  >
                    Интервал
                  </button>
                </div>
              </div>

              {/* Custom Date Inputs */}
              {dateFilter === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Начало</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Конец</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
              )}

              {/* Closed Shifts List */}
              {filteredClosedShifts.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-8 text-center">Закрытых смен за выбранный период не найдено.</p>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredClosedShifts.map(shift => {
                    const isSelected = selectedClosedShift?.id === shift.id;
                    return (
                      <div
                        key={shift.id}
                        onClick={() => setSelectedClosedShift(shift)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-300 dark:border-orange-900/50 shadow-sm'
                            : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-orange-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">{shift.pointName}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(shift.endTime).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Закрыл: <span className="font-semibold text-gray-700 dark:text-gray-300">{shift.employeeName}</span> • Заказов: {shift.ordersCount} шт.
                          </p>
                        </div>

                        <div className="text-right flex items-center justify-between sm:justify-end gap-4">
                          <div>
                            <span className="text-[9px] text-gray-400 uppercase font-bold block">Выручка</span>
                            <span className="text-base font-black text-orange-600 dark:text-orange-400">
                              {shift.revenue.total.toLocaleString()} ₽
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); exportShiftToExcel(shift); }}
                              className="p-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 rounded-lg border border-gray-100 dark:bg-zinc-800 dark:border-zinc-700 cursor-pointer"
                              title="Скачать в Excel"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); exportShiftToWord(shift); }}
                              className="p-1.5 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg border border-gray-100 dark:bg-zinc-800 dark:border-zinc-700 cursor-pointer"
                              title="Скачать в Word"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Closed Shift Details */}
            <AnimatePresence>
              {selectedClosedShift && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-6"
                >
                  <div className="flex justify-between items-start border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        Отчет по смене: {selectedClosedShift.pointName}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Сотрудник: <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedClosedShift.employeeName}</span> • Период: {new Date(selectedClosedShift.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} – {new Date(selectedClosedShift.endTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ({new Date(selectedClosedShift.endTime).toLocaleDateString('ru-RU')})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!confirm('Удалить эту закрытую смену? Это действие нельзя отменить.')) return;
                          await db.deleteClosedShift(selectedClosedShift.id);
                          setSelectedClosedShift(null);
                        }}
                        className="text-rose-400 hover:text-rose-600 font-bold text-sm px-3 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      >
                        Удалить
                      </button>
                      <button
                        onClick={() => setSelectedClosedShift(null)}
                        className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                      >
                        ✕ Скрыть
                      </button>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-orange-500/5 rounded-xl border border-orange-100 dark:border-orange-900/20 text-center">
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Выручка</span>
                      <span className="text-base font-black text-orange-600 dark:text-orange-400">{selectedClosedShift.revenue.total.toLocaleString()} ₽</span>
                    </div>
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-center">
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Наличные</span>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{selectedClosedShift.revenue.cash.toLocaleString()} ₽</span>
                    </div>
                    <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-900/20 text-center">
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">Карта</span>
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">{selectedClosedShift.revenue.card.toLocaleString()} ₽</span>
                    </div>
                    <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-100 dark:border-purple-900/20 text-center">
                      <span className="text-[9px] text-gray-400 font-bold uppercase block">QR-код</span>
                      <span className="text-base font-black text-purple-600 dark:text-purple-400">{selectedClosedShift.revenue.qr.toLocaleString()} ₽</span>
                    </div>
                  </div>

                  {/* Comments Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <div>
                      <span className="font-bold text-gray-400 uppercase block mb-1">При открытии:</span>
                      <p className="text-gray-600 dark:text-gray-300 italic">{selectedClosedShift.openingComment || 'Без комментариев'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase block mb-1">При закрытии:</span>
                      <p className="text-gray-600 dark:text-gray-300 italic">{selectedClosedShift.closingComment || 'Без комментариев'}</p>
                    </div>
                  </div>

                  {/* Inventory Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Движение товаров по остаткам</span>
                    
                    <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-zinc-800 font-bold text-gray-600 dark:text-gray-300">
                            <th className="p-2.5">Товар</th>
                            <th className="p-2.5 text-center">Старт (шт)</th>
                            <th className="p-2.5 text-center">Конец (шт)</th>
                            <th className="p-2.5 text-center">Расход (шт)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                          {Object.keys({ ...selectedClosedShift.initialInventory, ...selectedClosedShift.finalInventory }).map(prodId => {
                            const pt = points.find(p => p.id === selectedClosedShift.pointId);
                            const prod = pt?.products.find(p => p.id === prodId);
                            const start = selectedClosedShift.initialInventory[prodId] || 0;
                            const end = selectedClosedShift.finalInventory[prodId] || 0;
                            const diff = start - end;

                            return (
                              <tr key={prodId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/10">
                                <td className="p-2.5 font-medium text-gray-700 dark:text-gray-300">{prod?.name || `Товар (${prodId})`}</td>
                                <td className="p-2.5 text-center">{start}</td>
                                <td className="p-2.5 text-center">{end}</td>
                                <td className="p-2.5 text-center font-bold text-orange-500">{diff}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Point Management */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Управление точками
                </h3>
                {!isAddingPoint && (
                  <button
                    onClick={() => setIsAddingPoint(true)}
                    className="text-xs text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Добавить
                  </button>
                )}
              </div>

              {isAddingPoint ? (
                <form onSubmit={handleAddPointSubmit} className="space-y-4 border-t border-gray-100 dark:border-zinc-800 pt-4">
                  {pointManageError && (
                    <div className="p-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] rounded-lg border border-rose-200">
                      {pointManageError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Название точки</label>
                    <input
                      type="text"
                      required
                      value={newPointName}
                      onChange={(e) => setNewPointName(e.target.value)}
                      placeholder="Например: Пончики 🍩"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Список товаров по умолчанию</span>
                    
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {newPointProducts.map((p, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <input
                            type="text"
                            required
                            placeholder="Название"
                            value={p.name}
                            onChange={(e) => handleProductRowChange(idx, 'name', e.target.value)}
                            className="flex-1 px-2 py-1 rounded border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 text-[11px]"
                          />
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Цена"
                            value={p.price || ''}
                            onChange={(e) => handleProductRowChange(idx, 'price', e.target.value)}
                            className="w-16 px-1.5 py-1 rounded border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 text-[11px] text-center"
                          />
                          {newPointProducts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProductRow(idx)}
                              className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddProductRow}
                      className="text-[10px] text-orange-500 hover:text-orange-600 font-semibold flex items-center gap-1 cursor-pointer mt-1"
                    >
                      + Добавить строку товара
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingPoint(false)}
                      className="flex-1 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-bold rounded-lg text-xs"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Создать точку
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  {points.map(p => (
                    <div key={p.id} className="p-3 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-700 dark:text-gray-300 block">{p.name}</span>
                        <span className="text-[10px] text-gray-400">{p.products.length} товаров по умолчанию</span>
                      </div>
                      <span className="text-[10px] bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                        ID: {p.id.split('-')[1]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. ANALYTICS DASHBOARD */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Период:</span>

              {(['all', 'today', 'week', 'month', 'year', 'custom'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setAnalyticsFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    analyticsFilter === filter
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {filter === 'all' && 'За всё время'}
                  {filter === 'today' && 'Сегодня'}
                  {filter === 'week' && 'За неделю'}
                  {filter === 'month' && 'За месяц'}
                  {filter === 'year' && 'За год'}
                  {filter === 'custom' && 'Выбрать дату'}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            {analyticsFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">С:</label>
                  <input
                    type="date"
                    value={analyticsStartDate}
                    onChange={(e) => setAnalyticsStartDate(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">По:</label>
                  <input
                    type="date"
                    value={analyticsEndDate}
                    onChange={(e) => setAnalyticsEndDate(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Current Period Display */}
            <div className="mt-3 text-xs text-gray-500">
              {analytics.startDate && analytics.endDate && (
                <span>
                  Период: {analytics.startDate.toLocaleDateString('ru-RU')} — {analytics.endDate.toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Общая выручка</span>
                <span className="text-2xl font-black text-orange-600 dark:text-orange-400 block mt-1">
                  {analytics.totalRev.toLocaleString()} ₽
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 text-lg">
                ₽
              </div>
            </div>

            {/* Orders */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Всего заказов</span>
                <span className="text-2xl font-black text-gray-800 dark:text-gray-100 block mt-1">
                  {analytics.totalOrders} шт.
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg">
                🛒
              </div>
            </div>

            {/* Average Ticket */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Средний чек</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                  {analytics.totalOrders > 0 ? Math.round(analytics.totalRev / analytics.totalOrders).toLocaleString() : 0} ₽
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-lg">
                📊
              </div>
            </div>

            {/* Active Points Count */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block tracking-wider">Всего точек</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block mt-1">
                  {points.length} точек
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 text-lg">
                🏪
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Chart 1: Revenue by Point */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Выручка по торговым точкам (руб)
              </h4>

              <div className="space-y-4">
                {points.map(p => {
                  const rev = analytics.revenueByPoint[p.name] || 0;
                  const maxRev = Math.max(...Object.values(analytics.revenueByPoint), 1);
                  const percentage = (rev / maxRev) * 100;

                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                        <span>{p.name}</span>
                        <span>{rev.toLocaleString()} ₽</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Chart 2: Payment Methods Share */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
              <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Доли способов оплаты в обороте
              </h4>

              <div className="flex items-center justify-center py-4">
                {/* Custom Styled Stacked Bar Representing Doughnut */}
                <div className="w-full max-w-xs space-y-4">
                  <div className="w-full h-8 rounded-2xl overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${analytics.totalRev > 0 ? (analytics.totalCash / analytics.totalRev) * 100 : 33}%` }}
                      className="bg-emerald-500 h-full"
                      title="Наличные"
                    ></div>
                    <div
                      style={{ width: `${analytics.totalRev > 0 ? (analytics.totalCard / analytics.totalRev) * 100 : 33}%` }}
                      className="bg-blue-500 h-full"
                      title="Карта"
                    ></div>
                    <div
                      style={{ width: `${analytics.totalRev > 0 ? (analytics.totalQr / analytics.totalRev) * 100 : 34}%` }}
                      className="bg-purple-500 h-full"
                      title="QR-код"
                    ></div>
                  </div>

                  {/* Legends */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/10">
                      <span className="font-extrabold text-emerald-600 block">Наличные</span>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{analytics.totalCash.toLocaleString()} ₽</span>
                      <span className="text-[9px] text-gray-400 font-semibold block">
                        {analytics.totalRev > 0 ? Math.round((analytics.totalCash / analytics.totalRev) * 100) : 0}%
                      </span>
                    </div>

                    <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/10">
                      <span className="font-extrabold text-blue-600 block">Карта</span>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{analytics.totalCard.toLocaleString()} ₽</span>
                      <span className="text-[9px] text-gray-400 font-semibold block">
                        {analytics.totalRev > 0 ? Math.round((analytics.totalCard / analytics.totalRev) * 100) : 0}%
                      </span>
                    </div>

                    <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/10">
                      <span className="font-extrabold text-purple-600 block">QR-код</span>
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{analytics.totalQr.toLocaleString()} ₽</span>
                      <span className="text-[9px] text-gray-400 font-semibold block">
                        {analytics.totalRev > 0 ? Math.round((analytics.totalQr / analytics.totalRev) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
