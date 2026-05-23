import { useState, useEffect } from 'react';
import { db, Point, ActiveShift, User } from './lib/db';
import { ScheduleTab } from './components/ScheduleTab';
import { PointsTab } from './components/PointsTab';
import { ActiveShiftPage } from './components/ActiveShiftPage';
import { HistoryTab } from './components/HistoryTab';
import { CloseShiftTab } from './components/CloseShiftTab';
import { AdminPanel } from './components/AdminPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { ProductsTab } from './components/ProductsTab';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeesTab } from './components/EmployeesTab';
import {
  Calendar,
  Store,
  ShoppingBag,
  History,
  Lock,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  X,
  User as UserIcon,
  Sparkles,
  Database,
  LogOut,
  Package,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [activePointId, setActivePointId] = useState<string | null>(null);
  const [activeShifts, setActiveShifts] = useState<Record<string, ActiveShift>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(db.getCurrentUser());
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showEmployeeLogin, setShowEmployeeLogin] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  useEffect(() => {
    setActiveShifts(db.getActiveShifts());
    setCurrentUser(db.getCurrentUser());

    const currentActiveShifts = db.getActiveShifts();
    const activeKeys = Object.keys(currentActiveShifts);
    if (activeKeys.length > 0 && !activePointId) {
      setActivePointId(activeKeys[0]);
    }

    const unsubscribe = db.subscribe(() => {
      setActiveShifts(db.getActiveShifts());
      setCurrentUser(db.getCurrentUser());
    });
    return unsubscribe;
  }, [activePointId]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSelectActiveShift = (pointId: string) => {
    setActivePointId(pointId);
    setActiveTab(3);
  };

  const handleShiftClosed = () => {
    setActivePointId(null);
    setActiveTab(1);
  };

  const handleLogout = () => {
    console.log('🚪 App: Logging out user');
    db.logout();
    // Явно обновляем состояние после выхода
    setCurrentUser(null);
    setActiveTab(1); // Переходим на главную
    console.log('✅ App: User logged out, currentUser:', null);
  };

  const handleToggleRole = () => {
    if (currentUser?.role === 'admin') {
      db.login('Иван Иванов', 'cashier', 'Иван Иванов');
      setCurrentUser(db.getCurrentUser());
      setActiveTab(1);
    } else {
      setActiveTab(7);
    }
  };

  const isShiftActive = activePointId && activeShifts[activePointId];

  const cashierTabs = [
    { id: 0, label: 'График', icon: Calendar, component: <ScheduleTab /> },
    { id: 1, label: 'Точки', icon: Store, component: <PointsTab onSelectActiveShift={handleSelectActiveShift} /> },
    { id: 2, label: 'Товары', icon: Package, component: <ProductsTab /> },
    {
      id: 3,
      label: 'Продажи',
      icon: ShoppingBag,
      component: activePointId ? (
        <ActiveShiftPage pointId={activePointId} onNavigateToTab={setActiveTab} />
      ) : null,
      disabled: !isShiftActive
    },
    {
      id: 4,
      label: 'История',
      icon: History,
      component: activePointId ? <HistoryTab pointId={activePointId} /> : null,
      disabled: !isShiftActive
    },
    {
      id: 5,
      label: 'Закрытие',
      icon: Lock,
      component: activePointId ? (
        <CloseShiftTab pointId={activePointId} onShiftClosed={handleShiftClosed} />
      ) : null,
      disabled: !isShiftActive
    }
  ];

  const adminTabs = [
    ...cashierTabs,
    { id: 6, label: 'Сотрудники', icon: Users, component: <EmployeesTab /> },
    { id: 7, label: 'Админка', icon: ShieldCheck, component: <AdminPanel /> },
    { id: 8, label: 'Настройки БД', icon: Database, component: <ConfigPanel /> }
  ];

  const currentTabs = currentUser?.role === 'admin' ? adminTabs : [...cashierTabs, { id: 6, label: 'Админка', icon: ShieldCheck, component: <AdminPanel /> }];

  // Если пользователь не авторизован - показываем экран входа
  if (!currentUser) {
    if (showEmployeeLogin) {
      return (
        <EmployeeLogin
          onLogin={() => {
            setShowEmployeeLogin(false);
            setCurrentUser(db.getCurrentUser());
          }}
          onAdminLogin={() => {
            setShowEmployeeLogin(false);
            setShowAdminLogin(true);
          }}
        />
      );
    }

    if (showAdminLogin) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
          <div className="w-full max-w-md">
            <AdminPanel
              onLogin={() => {
                setShowAdminLogin(false);
                setCurrentUser(db.getCurrentUser());
              }}
              onBack={() => {
                setShowAdminLogin(false);
                setShowEmployeeLogin(true);
              }}
            />
          </div>
        </div>
      );
    }

    // По умолчанию показываем вход для сотрудников
    return (
      <EmployeeLogin
        onLogin={() => setCurrentUser(db.getCurrentUser())}
        onAdminLogin={() => setShowAdminLogin(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 flex flex-col transition-colors duration-300">

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800/80 px-6 py-4 flex items-center justify-between shadow-sm">

        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-orange-500 to-rose-500 blur-sm opacity-70"></div>
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow-md">
              SS
            </div>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">
              SunSet
            </h1>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider -mt-0.5">
              Shift Management
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">

          {/* Active Shift Selector */}
          {Object.keys(activeShifts).length > 1 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-orange-500/5 dark:bg-orange-950/20 border border-orange-500/20 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-gray-400 font-medium">Точка:</span>
              <select
                value={activePointId || ''}
                onChange={(e) => {
                  setActivePointId(e.target.value);
                  if (activeTab < 2 || activeTab > 5) {
                    setActiveTab(3);
                  }
                }}
                className="font-bold text-orange-600 dark:text-orange-400 bg-transparent border-none focus:outline-none"
              >
                {Object.values(activeShifts).map(shift => (
                  <option key={shift.pointId} value={shift.pointId}>
                    {shift.pointName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Role Toggler (for testing) */}
          <button
            onClick={handleToggleRole}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500/10 to-rose-500/10 hover:from-orange-500/20 hover:to-rose-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentUser?.role === 'admin' ? 'Админ' : 'Сотрудник'}</span>
          </button>

          {/* Dark / Light Mode Switcher */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={darkMode ? 'Светлая тема' : 'Темная тема'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          {/* User Profile Info */}
          <div className="flex items-center gap-2 border-l border-gray-200 dark:border-zinc-800 pl-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 block">
                {currentUser?.fullName || 'Гость'}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-bold block -mt-0.5">
                {currentUser?.role === 'admin' ? 'Директор' : 'Сотрудник'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 dark:text-gray-400 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden lg:block w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800/80 p-4 space-y-6 flex-shrink-0">
          <div className="space-y-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider px-3">
              Разделы системы
            </span>

            <nav className="space-y-1">
              {currentTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDisabled = tab.disabled;

                return (
                  <button
                    key={tab.id}
                    disabled={isDisabled}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                        : isDisabled
                        ? 'text-gray-300 dark:text-zinc-800 cursor-not-allowed'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:text-gray-800 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-orange-500'}`} />
                    <span>{tab.label}</span>

                    {tab.id === 1 && Object.keys(activeShifts).length > 0 && (
                      <span className="absolute right-3 top-2.5 w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mini Active Shift Details in Sidebar */}
          {isShiftActive && activePointId && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/5 to-rose-500/5 dark:from-zinc-950 dark:to-orange-950/10 border border-orange-500/10 space-y-2">
              <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">
                Активная точка
              </span>
              <div className="font-bold text-sm text-gray-800 dark:text-zinc-200">
                {activeShifts[activePointId].pointName}
              </div>
              <p className="text-[10px] text-gray-400">
                Смена открыта кассиром {activeShifts[activePointId].employeeName.split(' ')[0]}
              </p>

              <button
                onClick={() => setActiveTab(5)}
                className="w-full py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-[10px] rounded-lg border border-orange-500/10 transition-colors cursor-pointer"
              >
                Закрыть смену
              </button>
            </div>
          )}
        </aside>

        {/* MOBILE SIDE NAVIGATION OVERLAY */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm pt-20"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                className="w-72 h-full bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 p-6 space-y-6"
              >
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Разделы системы
                  </span>

                  <nav className="space-y-1.5">
                    {currentTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      const isDisabled = tab.disabled;

                      return (
                        <button
                          key={tab.id}
                          disabled={isDisabled}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-orange-500 text-white shadow-md'
                              : isDisabled
                              ? 'text-gray-300 dark:text-zinc-800 cursor-not-allowed'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-orange-500'}`} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN WORKSPACE CONTENT AREA */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentTabs.find(t => t.id === activeTab)?.component || (
                <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200">
                  <p className="text-sm text-gray-400">Выберите раздел в меню слева.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <footer className="lg:hidden sticky bottom-0 z-40 bg-white/95 dark:bg-zinc-900/95 border-t border-gray-200 dark:border-zinc-800/80 px-4 py-2 flex justify-around items-center shadow-lg backdrop-blur-md">
        {currentTabs
          .filter(t => t.id <= 4)
          .map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDisabled = tab.disabled;

            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md'
                    : isDisabled
                    ? 'text-gray-300 dark:text-zinc-800 cursor-not-allowed'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold">{tab.label}</span>
              </button>
            );
          })}
        <button
          onClick={() => setActiveTab(7)}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 7 ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[9px] font-bold">Админ</span>
        </button>
      </footer>
    </div>
  );
}

export default App;