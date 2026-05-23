import React, { useState, useEffect } from 'react';
import { db, ScheduleSlot, Point } from '../lib/db';
import { Calendar, UserPlus, Info, CheckCircle, Clock, X, Store, Users, Plus, ChevronLeft, ChevronRight, CalendarCheck, Edit3, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ScheduleTab: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [currentUser, setCurrentUser] = useState(db.getCurrentUser());
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [tempUserName, setTempUserName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [selectedSlotForName, setSelectedSlotForName] = useState<ScheduleSlot | null>(null);
  const [nameError, setNameError] = useState<string>('');
  const [customEndTime, setCustomEndTime] = useState<string>(''); // Время окончания смены
  const [customStartTime, setCustomStartTime] = useState<string>(''); // Время начала смены
  const [selectedPointForWeek, setSelectedPointForWeek] = useState<Point | null>(null);
  const [showWeekBooking, setShowWeekBooking] = useState<boolean>(false);
  const [weekBookingSlots, setWeekBookingSlots] = useState<ScheduleSlot[]>([]);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [editTime, setEditTime] = useState<string>('');

  useEffect(() => {
    setSchedule(db.getSchedule());
    setPoints(db.getPoints());
    setCurrentUser(db.getCurrentUser());

    const unsubscribe = db.subscribe(() => {
      setSchedule(db.getSchedule());
      setPoints(db.getPoints());
      setCurrentUser(db.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  // Получаем уникальные номера недель из расписания
  const weekNumbers = [...new Set(schedule.map(s => s.weekNumber))].sort((a, b) => a - b);
  const currentWeekNumber = weekNumbers.length > 0 ? weekNumbers[0] : 1;
  const nextWeekNumber = weekNumbers.length > 1 ? weekNumbers[1] : currentWeekNumber + 1;

  const handleClaimSlot = (slot: ScheduleSlot) => {
    // Если пользователь не авторизован, показываем форму ввода ФИО и времени
    const slotEmployees = slot.employees || [];
    const isAlreadyClaimed = currentUser && slotEmployees.includes(currentUser.fullName);
    const isFull = slotEmployees.length >= 2;

    if (isAlreadyClaimed || isFull) return;

    // Если пользователь авторизован - сразу записываем с временем
    if (currentUser) {
      // Проверяем, указано ли время
      if (!customStartTime || !customEndTime) {
        setSelectedSlotForName(slot);
        setShowNameInput(true);
        setNameError('');
        return;
      }
      const employeeTime = `${customStartTime} - ${customEndTime}`;
      db.claimScheduleSlot(slot.id, currentUser.fullName, employeeTime);
      setCustomStartTime('');
      setCustomEndTime('');
    } else {
      // Если не авторизован - показываем форму ввода ФИО
      setSelectedSlotForName(slot);
      setShowNameInput(true);
      setNameError('');
    }
  };

  const handleClaimWithName = async () => {
    if (!selectedSlotForName) return;

    // Если пользователь авторизован - используем его ФИО, иначе запрашиваем
    const employeeName = currentUser?.fullName || tempUserName.trim();

    if (!employeeName) {
      setNameError('Пожалуйста, введите ваше ФИО');
      return;
    }

    if (!customStartTime || !customEndTime) {
      setNameError('Пожалуйста, укажите время начала и окончания смены');
      return;
    }

    // Проверяем ФИО только для неавторизованных
    if (!currentUser) {
      const nameParts = employeeName.split(/\s+/);
      if (nameParts.length < 2) {
        setNameError('Пожалуйста, введите полное ФИО (минимум Имя и Фамилия)');
        return;
      }
    }

    const slotEmployees = selectedSlotForName.employees || [];
    if (slotEmployees.length >= 2) {
      setNameError('На эту смену уже записаны 2 сотрудника');
      return;
    }

    // Формируем время смены
    const employeeTime = `${customStartTime} - ${customEndTime}`;

    try {
      // Записываем сотрудника с временем
      if (!currentUser) {
        db.login(employeeName.toLowerCase(), 'cashier', employeeName);
      }
      await db.claimScheduleSlot(selectedSlotForName.id, employeeName, employeeTime);
      setTempUserName('');
      setCustomStartTime('');
      setCustomEndTime('');
      setShowNameInput(false);
      setSelectedSlotForName(null);
      setNameError('');
    } catch (error) {
      setNameError('Ошибка при записи. Попробуйте еще раз.');
    }
  };

  const handleReleaseSlot = (slot: ScheduleSlot, employeeName?: string) => {
    const nameToRelease = employeeName || currentUser?.fullName;
    if (nameToRelease) {
      db.releaseScheduleSlot(slot.id, nameToRelease);
    }
  };

  // Запись на всю неделю для одной точки
  const openWeekBooking = (point: Point) => {
    const weekSlots = schedule.filter(
      s => s.weekNumber === selectedWeek && s.pointId === point.id
    );
    setSelectedPointForWeek(point);
    setWeekBookingSlots(weekSlots);
    setShowWeekBooking(true);
  };

  const bookEntireWeek = async () => {
    if (!currentUser) {
      setShowWeekBooking(false);
      setShowNameInput(true);
      setNameError('');
      return;
    }

    // Проверяем, указано ли время для записи на неделю
    if (!customStartTime || !customEndTime) {
      setShowWeekBooking(false);
      setShowNameInput(true);
      setNameError('');
      return;
    }

    const emptySlots = weekBookingSlots.filter(
      s => !s.employees.includes(currentUser.fullName) && s.employees.length < 2
    );

    const employeeTime = `${customStartTime} - ${customEndTime}`;

    for (const slot of emptySlots) {
      await db.claimScheduleSlot(slot.id, currentUser.fullName, employeeTime);
    }

    setCustomStartTime('');
    setCustomEndTime('');
    setShowWeekBooking(false);
    setSelectedPointForWeek(null);
    setWeekBookingSlots([]);
  };

  const bookEntireWeekWithName = async () => {
    if (!tempUserName.trim() || weekBookingSlots.length === 0) return;

    const nameParts = tempUserName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setNameError('Пожалуйста, введите полное ФИО');
      return;
    }

    const emptySlots = weekBookingSlots.filter(
      s => !s.employees.includes(tempUserName.trim()) && s.employees.length < 2
    );

    db.login('temp', 'cashier', tempUserName.trim());

    for (const slot of emptySlots) {
      await db.claimScheduleSlot(slot.id, tempUserName.trim());
    }

    setTempUserName('');
    setShowNameInput(false);
    setShowWeekBooking(false);
    setSelectedPointForWeek(null);
    setWeekBookingSlots([]);
    setNameError('');
  };

  const handleRolloverWeek = () => {
    if (currentUser?.role !== 'admin') {
      alert('Только администратор может пересоздавать расписание');
      return;
    }
    if (confirm('Прокрутить неделю? Текущая неделя станет архивной, а следующая — текущей.')) {
      db.rollOverWeek();
    }
  };

  // Редактирование времени слота
  const handleEditSlotTime = (slot: ScheduleSlot) => {
    if (currentUser?.role !== 'admin') return;
    setEditingSlot(slot);
    setEditTime(slot.time);
  };

  const saveSlotTime = () => {
    if (!editingSlot || !editTime.trim()) return;
    db.updateScheduleSlotTime(editingSlot.id, editTime.trim());
    setEditingSlot(null);
    setEditTime('');
  };

  // Удаление слота
  const handleDeleteSlot = (slot: ScheduleSlot) => {
    if (currentUser?.role !== 'admin') return;
    if (confirm(`Удалить слот "${slot.pointName} - ${slot.day}"?`)) {
      db.deleteScheduleSlot(slot.id);
    }
  };

  // Добавление нового слота
  const [showAddSlot, setShowAddSlot] = useState<boolean>(false);
  const [newSlotDay, setNewSlotDay] = useState<string>('Понедельник');
  const [newSlotTime, setNewSlotTime] = useState<string>('10:00 - 18:00');
  const [newSlotPointId, setNewSlotPointId] = useState<string>('');
  const [newSlotWeek, setNewSlotWeek] = useState<number>(1);

  const handleAddSlot = () => {
    if (!newSlotPointId || !newSlotDay || !newSlotTime.trim()) {
      alert('Заполните все поля');
      return;
    }
    const point = points.find(p => p.id === newSlotPointId);
    if (point) {
      db.addScheduleSlot(newSlotDay, newSlotTime.trim(), newSlotPointId, point.name, newSlotWeek);
      setShowAddSlot(false);
      setNewSlotPointId('');
      setNewSlotDay('Понедельник');
      setNewSlotTime('10:00 - 18:00');
      setNewSlotWeek(1);
    }
  };

  // Фильтруем слоты по выбранной неделе
  const filteredSchedule = schedule.filter(s => s.weekNumber === selectedWeek);

  const isOccupied = (slot: ScheduleSlot) => slot.employees && slot.employees.length > 0;
  const isFull = (slot: ScheduleSlot) => slot.employees && slot.employees.length >= 2;
  const isMySlot = (slot: ScheduleSlot) => currentUser && slot.employees?.includes(currentUser.fullName);

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-6 rounded-2xl border border-orange-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-orange-900 dark:text-orange-100 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-orange-500" />
              График смен
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Нажмите на точку чтобы записаться на смену. Можно встать вдвоём.
            </p>
          </div>

          {/* Week Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWeek(currentWeekNumber)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                selectedWeek === currentWeekNumber
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950/20'
              }`}
            >
              <CalendarCheck className="w-4 h-4 inline mr-1" />
              Неделя {currentWeekNumber}
            </button>
            {weekNumbers.length > 1 && (
              <button
                onClick={() => setSelectedWeek(nextWeekNumber)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  selectedWeek === nextWeekNumber
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-950/20'
                }`}
              >
                Неделя {nextWeekNumber}
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {currentUser?.role === 'admin' && (
<button
              onClick={async () => {
                if (confirm('Пересоздать расписание для всех точек? Точки сохранятся, но слоты будут обновлены.')) {
                  const result = await db.fullReset();
                  alert(`Создано ${result.schedule} слотов для ${result.points} точек`);
                }
              }}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Пересоздать расписание
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => {
                  const count = db.generateScheduleForWeeks(2);
                  alert(`Создано ${count} слотов для записи`);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Добавить недели
              </button>
              <button
                onClick={handleRolloverWeek}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                Прокрутить неделю →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Points with Week Booking */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {points.map(point => {
          const pointSlots = filteredSchedule.filter(s => s.pointId === point.id);
          const availableSlots = pointSlots.filter(s => !isFull(s));
          const mySlots = pointSlots.filter(s => isMySlot(s));

          return (
            <div
              key={point.id}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{point.name}</h3>
                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-lg font-medium">
                  {availableSlots.length} свободно
                </span>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <div>Всего слотов: {pointSlots.length}</div>
                <div>Ваших записей: {mySlots.length}</div>
              </div>

              {/* Quick Book Week Button */}
              {availableSlots.length > 0 && (
                <button
                  onClick={() => openWeekBooking(point)}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Записаться на всю неделю
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Schedule Grid */}
      <div className="space-y-6">
        {days.map(day => {
          const daySlots = filteredSchedule.filter(s => s.day === day);

          if (daySlots.length === 0) return null;

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden"
            >
              <div className="bg-gray-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-gray-200 dark:border-zinc-800">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                  {day}
                </h3>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {daySlots.map(slot => {
                  const occupied = isOccupied(slot);
                  const full = isFull(slot);
                  const mine = isMySlot(slot);
                  const employees = slot.employees || [];

                  return (
                    <div
                      key={slot.id}
                      onClick={() => currentUser?.role !== 'admin' && !full && handleClaimSlot(slot)}
                      className={`p-3 rounded-xl border transition-all relative ${
                        mine
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/30 cursor-default'
                          : full
                          ? 'bg-gray-100 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 cursor-not-allowed'
                          : occupied
                          ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30 hover:shadow-md hover:scale-[1.02] cursor-pointer'
                          : 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/30 hover:shadow-md hover:scale-[1.02] cursor-pointer'
                      }`}
                    >
                      {/* Admin Controls */}
                      {currentUser?.role === 'admin' && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSlotTime(slot);
                            }}
                            className="p-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors"
                            title="Изменить время"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSlot(slot);
                            }}
                            className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors"
                            title="Удалить слот"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {slot.pointName}
                        </span>
                        {slot.time && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            {slot.time}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {employees.map((emp, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 text-xs ${
                              emp === currentUser?.fullName ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${
                              emp === currentUser?.fullName ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}>
                              {emp.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="truncate block">{emp}</span>
                              {slot.employeeTimes?.[emp] && (
                                <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {slot.employeeTimes[emp]}
                                </span>
                              )}
                            </div>
                            {(emp === currentUser?.fullName || currentUser?.role === 'admin') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReleaseSlot(slot, emp);
                                }}
                                className="ml-auto text-rose-400 hover:text-rose-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {!occupied && (
                          <div className="text-[10px] text-emerald-500 flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            Нажмите чтобы записаться
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center text-[10px]">
                        <span className="text-gray-400">{employees.length}/2</span>
                        {full && <span className="text-rose-500">Мест нет</span>}
                        {mine && <span className="text-emerald-500">Вы записаны</span>}
                        {currentUser?.role !== 'admin' && !full && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaimSlot(slot);
                            }}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            Записаться
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal: Book Entire Week */}
      <AnimatePresence>
        {showWeekBooking && selectedPointForWeek && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowWeekBooking(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Запись на всю неделю
                    </h3>
                    <p className="text-sm opacity-90">
                      {selectedPointForWeek.name} • Неделя {selectedWeek}
                    </p>
                  </div>
                  <button onClick={() => setShowWeekBooking(false)} className="p-1 hover:bg-white/20 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {weekBookingSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Нет слотов для этой недели
                  </div>
                ) : (
                  <div className="space-y-2">
                    {weekBookingSlots.map(slot => {
                      const full = isFull(slot);
                      const mine = isMySlot(slot);

                      return (
                        <div
                          key={slot.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            mine
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                              : full
                              ? 'bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700'
                              : 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{slot.day}</span>
                            {slot.time && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600 dark:text-gray-300">{slot.time}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {mine ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                Вы записаны
                              </span>
                            ) : full ? (
                              <span className="text-xs text-gray-400">Занято</span>
                            ) : (
                              <span className="text-xs text-emerald-500">Свободно</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-3">
                {/* Время для записи на неделю */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Начало смены</label>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={e => setCustomStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Конец смены</label>
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={e => setCustomEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 text-sm"
                    />
                  </div>
                </div>

                {currentUser ? (
                  <button
                    onClick={bookEntireWeek}
                    disabled={!customStartTime || !customEndTime}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    <CalendarCheck className="w-5 h-5" />
                    Записаться на все свободные смены ({weekBookingSlots.filter(s => !isFull(s) && !isMySlot(s)).length})
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={tempUserName}
                      onChange={e => setTempUserName(e.target.value)}
                      placeholder="Ваше ФИО (Иванов Иван)"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100"
                    />
                    {nameError && (
                      <p className="text-xs text-rose-500">{nameError}</p>
                    )}
                    <button
                      onClick={bookEntireWeekWithName}
                      disabled={!tempUserName.trim() || !customStartTime || !customEndTime}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                    >
                      <CalendarCheck className="w-5 h-5" />
                      Записаться на все свободные смены
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Slot Time (Admin) */}
      <AnimatePresence>
        {editingSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditingSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-500" />
                  Изменить время слота
                </h3>
                <button
                  onClick={() => setEditingSlot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl mb-4">
                <div className="text-sm"><b>{editingSlot.pointName}</b></div>
                <div className="text-xs text-gray-500">{editingSlot.day} • Неделя {editingSlot.weekNumber}</div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Время смены <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    placeholder="10:00 - 18:00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1">Пример: 10:00 - 18:00, 14:00 - 22:00</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={saveSlotTime}
                    disabled={!editTime.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Add New Slot (Admin) */}
      <AnimatePresence>
        {showAddSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddSlot(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-500" />
                  Добавить слот
                </h3>
                <button
                  onClick={() => setShowAddSlot(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Точка <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSlotPointId}
                    onChange={e => setNewSlotPointId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                  >
                    <option value="">Выберите точку</option>
                    {points.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    День недели <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSlotDay}
                    onChange={e => setNewSlotDay(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                  >
                    {days.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Время смены <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSlotTime}
                    onChange={e => setNewSlotTime(e.target.value)}
                    placeholder="10:00 - 18:00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Неделя <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSlotWeek}
                    onChange={e => setNewSlotWeek(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                  >
                    <option value={1}>Неделя 1 (текущая)</option>
                    <option value={2}>Неделя 2 (следующая)</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddSlot(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleAddSlot}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-medium"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Enter Name */}
      <AnimatePresence>
        {showNameInput && selectedSlotForName && !showWeekBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowNameInput(false);
              setTempUserName('');
              setCustomStartTime('');
              setCustomEndTime('');
              setSelectedSlotForName(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-zinc-800"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-500" />
                  Запись на смену
                </h3>
                <button
                  onClick={() => {
                    setShowNameInput(false);
                    setTempUserName('');
                    setCustomStartTime('');
                    setCustomEndTime('');
                    setSelectedSlotForName(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl mb-4">
                <div className="text-sm"><b>{selectedSlotForName.pointName}</b></div>
                <div className="text-xs text-gray-500">{selectedSlotForName.day}</div>
              </div>

              <div className="space-y-3">
                {/* Показываем ФИО только для неавторизованных */}
                {!currentUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ваше ФИО <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tempUserName}
                      onChange={e => {
                        setTempUserName(e.target.value);
                        setNameError('');
                      }}
                      placeholder="Иванов Иван Иванович"
                      className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 ${
                        nameError ? 'border-rose-300' : 'border-gray-200 dark:border-zinc-700'
                      }`}
                      autoFocus
                    />
                    {nameError && (
                      <p className="text-xs text-rose-500 mt-1">{nameError}</p>
                    )}
                  </div>
                )}

                {/* Для авторизованных показываем только их имя */}
                {currentUser && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Сотрудник
                    </label>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                      {currentUser.fullName}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Начало смены <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={e => {
                        setCustomStartTime(e.target.value);
                        setNameError('');
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Окончание смены <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={e => {
                        setCustomEndTime(e.target.value);
                        setNameError('');
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNameInput(false);
                      setTempUserName('');
                      setCustomStartTime('');
                      setCustomEndTime('');
                      setSelectedSlotForName(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleClaimWithName}
                    disabled={(!currentUser && !tempUserName.trim()) || !customStartTime || !customEndTime}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
                  >
                    Записаться
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};