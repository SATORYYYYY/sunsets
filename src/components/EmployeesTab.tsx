import React, { useState, useEffect } from 'react';
import { db, Employee } from '../lib/db';
import { Users, UserPlus, Lock, Unlock, Trash2, Search, Shield, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const EmployeesTab: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setEmployees(db.getEmployees());

    const unsubscribe = db.subscribe(() => {
      setEmployees(db.getEmployees());
    });
    return unsubscribe;
  }, []);

  const filteredEmployees = employees.filter(e =>
    e.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeePassword.trim()) return;

    setIsLoading(true);
    const result = await db.registerEmployee(newEmployeeName.trim(), newEmployeePassword.trim());
    setIsLoading(false);

    if (result.success) {
      setMessage('Сотрудник успешно добавлен');
      setNewEmployeeName('');
      setNewEmployeePassword('');
      setShowAddForm(false);
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(result.error || 'Ошибка добавления');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleToggleBlock = async (employee: Employee) => {
    const newStatus = !employee.isBlocked;
    await db.blockEmployee(employee.id, newStatus);
    setMessage(newStatus ? 'Доступ заблокирован' : 'Доступ разблокирован');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Удалить сотрудника "${employee.fullName}"?`)) return;

    const result = await db.deleteEmployee(employee.id);
    if (result) {
      setMessage('Сотрудник удален');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-500" />
            Сотрудники
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Управление сотрудниками и доступом
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Добавить сотрудника
        </button>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl text-sm font-medium ${
              message.includes('успешно') || message.includes('разблокирован')
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : message.includes('Ошибка') || message.includes('заблокирован') || message.includes('удален')
                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100 mb-4">
                Новый сотрудник
              </h3>
              <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                    Фамилия Имя
                  </label>
                  <input
                    type="text"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder="Иванов Иван"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={newEmployeePassword}
                    onChange={(e) => setNewEmployeePassword(e.target.value)}
                    placeholder="Минимум 4 символа"
                    minLength={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors"
                  >
                    {isLoading ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск сотрудника..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-4">
          <div className="text-2xl font-black text-orange-500">{employees.length}</div>
          <div className="text-xs text-gray-500">Всего сотрудников</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-4">
          <div className="text-2xl font-black text-green-500">
            {employees.filter(e => !e.isBlocked).length}
          </div>
          <div className="text-xs text-gray-500">Активных</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-4">
          <div className="text-2xl font-black text-rose-500">
            {employees.filter(e => e.isBlocked).length}
          </div>
          <div className="text-xs text-gray-500">Заблокированных</div>
        </div>
      </div>

      {/* Employees List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-zinc-800">
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">
                {searchQuery ? 'Сотрудники не найдены' : 'Нет сотрудников'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Попробуйте другой запрос' : 'Добавьте первого сотрудника'}
              </p>
            </div>
          ) : (
            filteredEmployees.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  employee.isBlocked ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                    employee.isBlocked
                      ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  }`}>
                    {employee.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className={`font-bold ${
                      employee.isBlocked ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-zinc-200'
                    }`}>
                      {employee.fullName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(employee.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {employee.isBlocked && (
                    <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-xs font-bold rounded-lg">
                      Заблокирован
                    </span>
                  )}

                  <button
                    onClick={() => handleToggleBlock(employee)}
                    className={`p-2 rounded-lg transition-colors ${
                      employee.isBlocked
                        ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600'
                        : 'hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600'
                    }`}
                    title={employee.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                  >
                    {employee.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => handleDelete(employee)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
