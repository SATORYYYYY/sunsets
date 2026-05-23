import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db as firestore } from './firebase';

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // шт, кг, л, упаковка и т.д.
}

export interface Point {
  id: string;
  name: string;
  products: Product[];
  inventory: InventoryItem[]; // остатки на точке
}

export interface ActiveShift {
  id: string;
  pointId: string;
  pointName: string;
  employeeName: string;
  startTime: string;
  initialInventory: Record<string, number>; // productId -> quantity
  commentsFromPrevShift: string;
  newComment?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  shiftId: string;
  pointId: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'qr';
  timestamp: string;
}

export interface ClosedShift {
  id: string;
  pointId: string;
  pointName: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  initialInventory: Record<string, number>;
  finalInventory: Record<string, number>;
  commentsFromPrevShift: string;
  openingComment?: string;
  closingComment?: string;
  ordersCount: number;
  revenue: {
    total: number;
    cash: number;
    card: number;
    qr: number;
  };
  orders: Order[];
}

export interface ScheduleSlot {
  id: string;
  day: string; // Понедельник, Вторник, ...
  time: string; // 08:00 - 14:00, 14:00 - 20:00
  pointId: string;
  pointName: string;
  employees: string[]; // массив сотрудников на смене
  employeeTimes: Record<string, string>; // ФИО -> время смены (например "10:00 - 18:00")
  weekNumber: number; // 1 = текущая неделя, 2 = следующая неделя
}

export interface User {
  username: string;
  role: 'cashier' | 'admin';
  fullName: string;
}

export interface Employee {
  id: string;
  fullName: string;
  password: string;
  isBlocked: boolean;
  createdAt: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  enabled: boolean;
}

// Database state with Firebase
class SunsetDB {
  private points: Point[] = [];
  private activeShifts: Record<string, ActiveShift> = {}; // pointId -> ActiveShift
  private closedShifts: ClosedShift[] = [];
  private orders: Order[] = []; // All orders of active shifts
  private schedule: ScheduleSlot[] = [];
  private currentUser: User | null = null;
  private employees: Employee[] = [];
  private firebaseConfig: FirebaseConfig = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    enabled: false
  };

  private listeners = new Set<() => void>();
  private unsubscribers: Unsubscribe[] = [];

  constructor() {
    this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      // Load points
      const pointsSnapshot = await getDocs(collection(firestore, 'points'));
      this.points = pointsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Point));

      // Load active shifts
      const activeShiftsSnapshot = await getDocs(collection(firestore, 'activeShifts'));
      this.activeShifts = {};
      activeShiftsSnapshot.forEach(doc => {
        const shift = { id: doc.id, ...doc.data() } as ActiveShift;
        this.activeShifts[shift.pointId] = shift;
      });

      // Load closed shifts
      const closedShiftsSnapshot = await getDocs(
        query(collection(firestore, 'closedShifts'), orderBy('startTime', 'desc'))
      );
      this.closedShifts = closedShiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClosedShift));

      // Load orders
      const ordersSnapshot = await getDocs(collection(firestore, 'orders'));
      this.orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

      // Load schedule
      const scheduleSnapshot = await getDocs(collection(firestore, 'schedule'));
      this.schedule = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleSlot));

      // Load employees
      const employeesSnapshot = await getDocs(collection(firestore, 'employees'));
      this.employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));

      // Load current user from localStorage (keep this local)
      const user = localStorage.getItem('sunset_user');
      if (user) {
        this.currentUser = JSON.parse(user);
      }

      // Load firebase config from localStorage (keep this local)
      const config = localStorage.getItem('sunset_firebase_config');
      if (config) {
        this.firebaseConfig = JSON.parse(config);
      }

      // Set up real-time listeners
      this.setupRealtimeListeners();

      console.log('✅ Firebase initialized successfully');
    } catch (e: any) {
      console.error('❌ Error initializing Firebase:', e);

      // Fallback to LocalStorage if Firebase fails
      console.log('🔄 Falling back to LocalStorage');
      this.loadFromLocalStorage();

      // Show user-friendly error message
      if (e.message && e.message.includes('Missing or insufficient permissions')) {
        console.warn('⚠️ Firebase permissions error. Please update Firestore rules in Firebase Console.');
        console.warn('📝 Create firestore.rules file with allow read/write permissions');
      }
    }
  }

  private loadFromLocalStorage() {
    try {
      const pts = localStorage.getItem('sunset_points');
      if (pts) this.points = JSON.parse(pts);

      const active = localStorage.getItem('sunset_active_shifts');
      if (active) {
        const shifts = JSON.parse(active) as ActiveShift[];
        this.activeShifts = {};
        shifts.forEach(shift => {
          this.activeShifts[shift.pointId] = shift;
        });
      }

      const closed = localStorage.getItem('sunset_closed_shifts');
      if (closed) this.closedShifts = JSON.parse(closed);

      const ords = localStorage.getItem('sunset_orders');
      if (ords) this.orders = JSON.parse(ords);

      const sched = localStorage.getItem('sunset_schedule');
      if (sched) this.schedule = JSON.parse(sched);

      const emps = localStorage.getItem('sunset_employees');
      if (emps) this.employees = JSON.parse(emps);

      const user = localStorage.getItem('sunset_user');
      if (user) this.currentUser = JSON.parse(user);

      console.log('✅ Loaded data from LocalStorage');
    } catch (e) {
      console.error('Error loading from LocalStorage', e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('sunset_points', JSON.stringify(this.points));

      const activeShiftsArray = Object.values(this.activeShifts);
      localStorage.setItem('sunset_active_shifts', JSON.stringify(activeShiftsArray));

      localStorage.setItem('sunset_closed_shifts', JSON.stringify(this.closedShifts));
      localStorage.setItem('sunset_orders', JSON.stringify(this.orders));
      localStorage.setItem('sunset_schedule', JSON.stringify(this.schedule));
      localStorage.setItem('sunset_employees', JSON.stringify(this.employees));
    } catch (e) {
      console.error('Error saving to LocalStorage', e);
    }
  }

  private setupRealtimeListeners() {
    try {
      // Listen to points changes
      const pointsUnsub = onSnapshot(collection(firestore, 'points'), (snapshot) => {
        this.points = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Point));
        this.saveToLocalStorage(); // Also save to localStorage as backup
        this.notify();
      }, (error) => {
        console.error('Error listening to points:', error);
      });
      this.unsubscribers.push(pointsUnsub);

      // Listen to active shifts changes
      const activeShiftsUnsub = onSnapshot(collection(firestore, 'activeShifts'), (snapshot) => {
        this.activeShifts = {};
        snapshot.forEach(doc => {
          const shift = { id: doc.id, ...doc.data() } as ActiveShift;
          this.activeShifts[shift.pointId] = shift;
        });
        this.saveToLocalStorage();
        this.notify();
      }, (error) => {
        console.error('Error listening to active shifts:', error);
      });
      this.unsubscribers.push(activeShiftsUnsub);

      // Listen to closed shifts changes
      const closedShiftsUnsub = onSnapshot(
        query(collection(firestore, 'closedShifts'), orderBy('startTime', 'desc')),
        (snapshot) => {
          this.closedShifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClosedShift));
          this.saveToLocalStorage();
          this.notify();
        },
        (error) => {
          console.error('Error listening to closed shifts:', error);
        }
      );
      this.unsubscribers.push(closedShiftsUnsub);

      // Listen to orders changes
      const ordersUnsub = onSnapshot(collection(firestore, 'orders'), (snapshot) => {
        this.orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        this.saveToLocalStorage();
        this.notify();
      }, (error) => {
        console.error('Error listening to orders:', error);
      });
      this.unsubscribers.push(ordersUnsub);

      // Listen to schedule changes
      const scheduleUnsub = onSnapshot(collection(firestore, 'schedule'), (snapshot) => {
        this.schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleSlot));
        this.saveToLocalStorage();
        this.notify();
      }, (error) => {
        console.error('Error listening to schedule:', error);
      });
      this.unsubscribers.push(scheduleUnsub);

      // Listen to employees changes
      const employeesUnsub = onSnapshot(collection(firestore, 'employees'), (snapshot) => {
        this.employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        this.saveToLocalStorage();
        this.notify();
      }, (error) => {
        console.error('Error listening to employees:', error);
      });
      this.unsubscribers.push(employeesUnsub);

      console.log('✅ Real-time listeners set up');
    } catch (e) {
      console.error('Error setting up real-time listeners:', e);
    }
  }

  private notify() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Pub/Sub system for compatibility with existing components
  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // AUTH API
  public login(username: string, role: 'cashier' | 'admin', fullName: string): User {
    this.currentUser = { username, role, fullName };
    localStorage.setItem('sunset_user', JSON.stringify(this.currentUser));
    this.notify();
    return this.currentUser;
  }

  public logout() {
    this.currentUser = null;
    localStorage.removeItem('sunset_user');
    this.notify();
  }

  public getCurrentUser() {
    return this.currentUser;
  }

  // EMPLOYEE API
  public getEmployees(): Employee[] {
    return this.employees;
  }

  public async registerEmployee(fullName: string, password: string): Promise<{ success: boolean; error?: string }> {
    // Проверяем, есть ли уже сотрудник с таким именем
    const existingEmployee = this.employees.find(e => e.fullName.toLowerCase() === fullName.toLowerCase());
    if (existingEmployee) {
      return { success: false, error: 'Сотрудник с таким именем уже существует' };
    }

    const id = 'emp-' + Math.random().toString(36).substr(2, 9);
    const newEmployee: Employee = {
      id,
      fullName,
      password, // В реальном приложении нужно хешировать!
      isBlocked: false,
      createdAt: new Date().toISOString()
    };

    this.employees.push(newEmployee);

    try {
      await setDoc(doc(firestore, 'employees', id), newEmployee);
      console.log('✅ Employee registered in Firebase:', fullName);
    } catch (e) {
      console.error('❌ Error saving employee to Firebase:', e);
      this.saveToLocalStorage();
    }

    this.notify();
    return { success: true };
  }

  public async loginEmployee(fullName: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const employee = this.employees.find(e => e.fullName.toLowerCase() === fullName.toLowerCase());

    if (!employee) {
      return { success: false, error: 'Сотрудник не найден' };
    }

    if (employee.isBlocked) {
      return { success: false, error: 'Доступ заблокирован. Обратитесь к администратору' };
    }

    if (employee.password !== password) {
      return { success: false, error: 'Неверный пароль' };
    }

    // Успешный вход
    const user: User = {
      username: employee.id,
      role: 'cashier',
      fullName: employee.fullName
    };

    this.currentUser = user;
    localStorage.setItem('sunset_user', JSON.stringify(user));
    this.notify();

    return { success: true, user };
  }

  public async blockEmployee(employeeId: string, isBlocked: boolean): Promise<boolean> {
    const employee = this.employees.find(e => e.id === employeeId);
    if (!employee) return false;

    employee.isBlocked = isBlocked;

    try {
      await updateDoc(doc(firestore, 'employees', employeeId), { isBlocked });
      console.log('✅ Employee block status updated:', employeeId, isBlocked);
    } catch (e) {
      console.error('❌ Error updating employee block status:', e);
      this.saveToLocalStorage();
    }

    this.notify();
    return true;
  }

  public async deleteEmployee(employeeId: string): Promise<boolean> {
    const index = this.employees.findIndex(e => e.id === employeeId);
    if (index === -1) return false;

    this.employees.splice(index, 1);

    try {
      await deleteDoc(doc(firestore, 'employees', employeeId));
      console.log('✅ Employee deleted:', employeeId);
    } catch (e) {
      console.error('❌ Error deleting employee:', e);
      this.saveToLocalStorage();
    }

    this.notify();
    return true;
  }

  // POINTS API
  public getPoints(): Point[] {
    return this.points;
  }

  public async addPoint(name: string, products: Product[], inventory?: InventoryItem[]) {
    const id = 'pt-' + Math.random().toString(36).substr(2, 9);
    const newPoint: Point = { id, name, products, inventory: inventory || [] };

    try {
      // Save to Firebase
      await setDoc(doc(firestore, 'points', id), newPoint);
      console.log('✅ Point saved to Firebase:', newPoint.name);
    } catch (e) {
      console.error('❌ Error saving point to Firebase, using LocalStorage:', e);
      // Fallback to LocalStorage
      this.points.push(newPoint);
      this.saveToLocalStorage();
    }

    this.notify();
    return newPoint;
  }

  public async addProductToPoint(pointId: string, name: string, price: number) {
    const point = this.points.find(p => p.id === pointId);
    if (point) {
      const id = 'p-' + Math.random().toString(36).substr(2, 9);
      const newProduct = { id, name, price };
      point.products.push(newProduct);

      // Update Firebase
      await updateDoc(doc(firestore, 'points', pointId), { products: point.products });

      // If there is an active shift, we should also update its initial inventory with 0 for this new product
      const activeShift = this.activeShifts[pointId];
      if (activeShift) {
        activeShift.initialInventory[id] = 0;
        await updateDoc(doc(firestore, 'activeShifts', activeShift.id), {
          initialInventory: activeShift.initialInventory
        });
      }

      this.notify();
      return newProduct;
    }
    return null;
  }

  public async updateProduct(pointId: string, productId: string, name: string, price: number) {
    const point = this.points.find(p => p.id === pointId);
    if (point) {
      const productIndex = point.products.findIndex(p => p.id === productId);
      if (productIndex !== -1) {
        point.products[productIndex] = { id: productId, name, price };

        // Update Firebase
        try {
          await updateDoc(doc(firestore, 'points', pointId), { products: point.products });
          console.log('✅ Product updated in Firebase:', productId);
        } catch (e) {
          console.error('❌ Error updating product in Firebase:', e);
          this.saveToLocalStorage();
        }

        this.notify();
        return point.products[productIndex];
      }
    }
    return null;
  }

  public async deleteProductFromPoint(pointId: string, productId: string) {
    const point = this.points.find(p => p.id === pointId);
    if (point) {
      const productIndex = point.products.findIndex(p => p.id === productId);
      if (productIndex !== -1) {
        const deletedProduct = point.products[productIndex];
        point.products.splice(productIndex, 1);

        // Update Firebase
        try {
          await updateDoc(doc(firestore, 'points', pointId), { products: point.products });
          console.log('✅ Product deleted from Firebase:', productId);
        } catch (e) {
          console.error('❌ Error deleting product from Firebase:', e);
          this.saveToLocalStorage();
        }

        this.notify();
        return deletedProduct;
      }
    }
    return null;
  }

  // INVENTORY API
  public async addInventoryToPoint(pointId: string, name: string, quantity: number, unit: string) {
    const point = this.points.find(p => p.id === pointId);
    if (point) {
      // Инициализируем inventory если его нет
      if (!point.inventory) {
        point.inventory = [];
      }

      const id = 'inv-' + Math.random().toString(36).substr(2, 9);
      const newItem: InventoryItem = { id, name, quantity, unit };
      point.inventory.push(newItem);

      try {
        await updateDoc(doc(firestore, 'points', pointId), { inventory: point.inventory });
        console.log('✅ Inventory item added to Firebase:', name);
      } catch (e) {
        console.error('❌ Error adding inventory to Firebase:', e);
        this.saveToLocalStorage();
      }

      this.notify();
      return newItem;
    }
    return null;
  }

  public async updateInventoryItem(pointId: string, inventoryId: string, name: string, quantity: number, unit: string) {
    const point = this.points.find(p => p.id === pointId);
    if (point && point.inventory) {
      const itemIndex = point.inventory.findIndex(i => i.id === inventoryId);
      if (itemIndex !== -1) {
        point.inventory[itemIndex] = { id: inventoryId, name, quantity, unit };

        try {
          await updateDoc(doc(firestore, 'points', pointId), { inventory: point.inventory });
          console.log('✅ Inventory item updated in Firebase:', inventoryId);
        } catch (e) {
          console.error('❌ Error updating inventory in Firebase:', e);
          this.saveToLocalStorage();
        }

        this.notify();
        return point.inventory[itemIndex];
      }
    }
    return null;
  }

  public async deleteInventoryFromPoint(pointId: string, inventoryId: string) {
    const point = this.points.find(p => p.id === pointId);
    if (point && point.inventory) {
      const itemIndex = point.inventory.findIndex(i => i.id === inventoryId);
      if (itemIndex !== -1) {
        const deletedItem = point.inventory[itemIndex];
        point.inventory.splice(itemIndex, 1);

        try {
          await updateDoc(doc(firestore, 'points', pointId), { inventory: point.inventory });
          console.log('✅ Inventory item deleted from Firebase:', inventoryId);
        } catch (e) {
          console.error('❌ Error deleting inventory from Firebase:', e);
          this.saveToLocalStorage();
        }

        this.notify();
        return deletedItem;
      }
    }
    return null;
  }

  // ACTIVE SHIFTS API
  public getActiveShifts(): Record<string, ActiveShift> {
    return this.activeShifts;
  }

  public getActiveShiftByPoint(pointId: string): ActiveShift | undefined {
    return this.activeShifts[pointId];
  }

  public async startShift(
    pointId: string,
    employeeName: string,
    startTime: string,
    initialInventory: Record<string, number>,
    newComment?: string
  ) {
    const point = this.points.find(p => p.id === pointId);
    if (!point) throw new Error('Point not found');

    // Find the last closed shift for this point to load past comments
    const lastClosed = [...this.closedShifts]
      .filter(cs => cs.pointId === pointId)
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];

    const commentsFromPrevShift = lastClosed
      ? `${lastClosed.employeeName} (${new Date(lastClosed.endTime).toLocaleDateString()}): ${lastClosed.closingComment || 'Без комментариев'}`
      : 'Нет комментариев с прошлой смены';

    const id = 'shift-' + Math.random().toString(36).substr(2, 9);
    const activeShift: ActiveShift = {
      id,
      pointId,
      pointName: point.name,
      employeeName,
      startTime,
      initialInventory,
      commentsFromPrevShift,
      newComment
    };

    try {
      // Save to Firebase
      await setDoc(doc(firestore, 'activeShifts', id), activeShift);
      console.log('✅ Shift started in Firebase:', point.name);
    } catch (e) {
      console.error('❌ Error starting shift in Firebase, using LocalStorage:', e);
      // Fallback to LocalStorage
      this.activeShifts[pointId] = activeShift;
      this.saveToLocalStorage();
    }

    // Automatically update the schedule slot if it matches today and this employee
    const todayStr = new Date().toLocaleDateString('ru-RU', { weekday: 'long' });
    const capitalizedToday = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);
    const slot = this.schedule.find(
      s => s.pointId === pointId && s.day === capitalizedToday && (!s.employees || s.employees.length === 0)
    );
    if (slot) {
      slot.employees = [employeeName];
      try {
        await updateDoc(doc(firestore, 'schedule', slot.id), { employees: slot.employees });
      } catch (e) {
        console.error('❌ Error updating schedule in Firebase, using LocalStorage:', e);
        this.saveToLocalStorage();
      }
    }

    this.notify();
    return activeShift;
  }

  // ORDERS API
  public getOrdersByShift(shiftId: string): Order[] {
    return this.orders.filter(o => o.shiftId === shiftId);
  }

  public async addOrder(shiftId: string, pointId: string, items: OrderItem[], paymentMethod: 'cash' | 'card' | 'qr') {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order: Order = {
      id: 'ord-' + Math.random().toString(36).substr(2, 9),
      shiftId,
      pointId,
      items,
      total,
      paymentMethod,
      timestamp: new Date().toISOString()
    };

    // Save to Firebase
    await setDoc(doc(firestore, 'orders', order.id), order);

    this.notify();
    return order;
  }

  public async updateOrder(orderId: string, updatedFields: Partial<Order>) {
    const index = this.orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
      const order = this.orders[index];
      const updatedOrder = { ...order, ...updatedFields };

      // Recalculate total if items changed
      if (updatedFields.items) {
        updatedOrder.total = updatedFields.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      }

      // Update Firebase
      await updateDoc(doc(firestore, 'orders', orderId), updatedFields);

      this.notify();
      return updatedOrder;
    }
    return null;
  }

  public async deleteOrder(orderId: string) {
    // Delete from Firebase
    await deleteDoc(doc(firestore, 'orders', orderId));

    this.notify();
  }

  // CLOSE SHIFTS API
  public getClosedShifts(): ClosedShift[] {
    return this.closedShifts;
  }

  public async closeShift(
    pointId: string,
    endTime: string,
    finalInventory: Record<string, number>,
    closingComment?: string
  ) {
    const activeShift = this.activeShifts[pointId];
    if (!activeShift) throw new Error('No active shift found for this point');

    const shiftOrders = this.getOrdersByShift(activeShift.id);

    // Revenue calculations
    let cash = 0, card = 0, qr = 0;
    shiftOrders.forEach(o => {
      if (o.paymentMethod === 'cash') cash += o.total;
      else if (o.paymentMethod === 'card') card += o.total;
      else if (o.paymentMethod === 'qr') qr += o.total;
    });
    const total = cash + card + qr;

    const closedShift: ClosedShift = {
      id: activeShift.id,
      pointId: activeShift.pointId,
      pointName: activeShift.pointName,
      employeeName: activeShift.employeeName,
      startTime: activeShift.startTime,
      endTime,
      initialInventory: activeShift.initialInventory,
      finalInventory,
      commentsFromPrevShift: activeShift.commentsFromPrevShift,
      openingComment: activeShift.newComment,
      closingComment,
      ordersCount: shiftOrders.length,
      revenue: { total, cash, card, qr },
      orders: shiftOrders
    };

    // Save to closed shifts in Firebase
    await setDoc(doc(firestore, 'closedShifts', closedShift.id), closedShift);

    // Remove active shift from Firebase
    await deleteDoc(doc(firestore, 'activeShifts', activeShift.id));

    // Remove orders from active orders (they are now inside the closedShift.orders)
    for (const order of shiftOrders) {
      await deleteDoc(doc(firestore, 'orders', order.id));
    }

    this.notify();
    return closedShift;
  }

  public async deleteClosedShift(shiftId: string): Promise<boolean> {
    const index = this.closedShifts.findIndex(s => s.id === shiftId);
    if (index === -1) return false;

    const shift = this.closedShifts[index];
    this.closedShifts.splice(index, 1);

    try {
      // Delete from Firebase
      await deleteDoc(doc(firestore, 'closedShifts', shiftId));
      console.log('✅ Closed shift deleted from Firebase:', shiftId);
    } catch (e) {
      console.error('❌ Error deleting closed shift from Firebase:', e);
      this.saveToLocalStorage();
    }

    this.notify();
    return true;
  }

  // SCHEDULE API
  public getSchedule(): ScheduleSlot[] {
    return this.schedule;
  }

  public async claimScheduleSlot(slotId: string, employeeName: string, employeeTime?: string) {
    const slot = this.schedule.find(s => s.id === slotId);
    if (slot) {
      // Инициализируем массивы если их нет
      if (!slot.employees) {
        slot.employees = [];
      }
      if (!slot.employeeTimes) {
        slot.employeeTimes = {};
      }

      // Проверяем, что сотрудник еще не записан на эту смену
      if (!slot.employees.includes(employeeName)) {
        // Максимум 2 сотрудника на смену
        if (slot.employees.length < 2) {
          slot.employees.push(employeeName);
          // Сохраняем время смены для сотрудника
          if (employeeTime) {
            slot.employeeTimes[employeeName] = employeeTime;
          }
        } else {
          console.log('❌ Слот уже заполнен (2 сотрудника)');
          return false;
        }
      }

      try {
        // Update Firebase
        await updateDoc(doc(firestore, 'schedule', slotId), {
          employees: slot.employees,
          employeeTimes: slot.employeeTimes
        });
        console.log('✅ Schedule slot updated in Firebase:', slotId);
      } catch (e) {
        console.error('❌ Error updating schedule in Firebase, using LocalStorage:', e);
        // Fallback to LocalStorage
        this.saveToLocalStorage();
      }
      this.notify();
      return true;
    }
    return false;
  }

  public async releaseScheduleSlot(slotId: string, employeeName?: string) {
    const slot = this.schedule.find(s => s.id === slotId);
    if (slot) {
      if (slot.employees && slot.employees.length > 0) {
        if (employeeName) {
          // Удаляем конкретного сотрудника
          slot.employees = slot.employees.filter(name => name !== employeeName);
          // Удаляем время сотрудника
          if (slot.employeeTimes && slot.employeeTimes[employeeName]) {
            delete slot.employeeTimes[employeeName];
          }
        } else {
          // Удаляем последнего сотрудника (LIFO)
          const removedName = slot.employees.pop();
          // Удаляем время последнего сотрудника
          if (removedName && slot.employeeTimes && slot.employeeTimes[removedName]) {
            delete slot.employeeTimes[removedName];
          }
        }
      }

      try {
        // Update Firebase
        await updateDoc(doc(firestore, 'schedule', slotId), {
          employees: slot.employees || [],
          employeeTimes: slot.employeeTimes || {}
        });
      } catch (e) {
        console.error('❌ Error updating schedule in Firebase, using LocalStorage:', e);
        this.saveToLocalStorage();
      }
      this.notify();
      return true;
    }
    return false;
  }

  // UPDATE SLOT TIME (Admin)
  public async updateScheduleSlotTime(slotId: string, newTime: string): Promise<boolean> {
    const slot = this.schedule.find(s => s.id === slotId);
    if (slot) {
      slot.time = newTime;

      try {
        await updateDoc(doc(firestore, 'schedule', slotId), { time: newTime });
        console.log('✅ Schedule slot time updated in Firebase:', slotId);
      } catch (e) {
        console.error('❌ Error updating schedule slot time in Firebase:', e);
        this.saveToLocalStorage();
      }
      this.notify();
      return true;
    }
    return false;
  }

  // DELETE SCHEDULE SLOT (Admin)
  public async deleteScheduleSlot(slotId: string): Promise<boolean> {
    const index = this.schedule.findIndex(s => s.id === slotId);
    if (index !== -1) {
      const slot = this.schedule[index];
      this.schedule.splice(index, 1);

      try {
        await deleteDoc(doc(firestore, 'schedule', slotId));
        console.log('✅ Schedule slot deleted from Firebase:', slotId);
      } catch (e) {
        console.error('❌ Error deleting schedule slot from Firebase:', e);
        this.saveToLocalStorage();
      }
      this.notify();
      return true;
    }
    return false;
  }

  // CLEAR ALL SCHEDULE (Admin)
  public clearSchedule(): void {
    this.schedule = [];
    localStorage.removeItem('sunset_schedule');
    console.log('🗑️ Schedule cleared');
    this.notify();
  }

  // CLEAR ALL POINTS (Admin)
  public clearPoints(): void {
    this.points = [];
    localStorage.removeItem('sunset_points');
    console.log('🗑️ Points cleared');
    this.notify();
  }

  // FULL RESET - очищает только расписание и создаёт заново для ВСЕХ точек
  public async fullReset(): Promise<{ points: number; schedule: number }> {
    // Очищаем ТОЛЬКО расписание (точки сохраняем)
    this.clearSchedule();

    // Очищаем расписание в Firebase
    try {
      const scheduleSnap = await getDocs(collection(firestore, 'schedule'));
      for (const doc of scheduleSnap.docs) {
        await deleteDoc(doc.ref);
      }
    } catch (e) {
      console.log('Firebase schedule clear error:', e);
    }

    // Создаём расписание на 2 недели для ВСЕХ существующих точек
    const scheduleCount = this.generateScheduleForWeeksSync(2);

    // Сохраняем расписание в Firebase
    for (const slot of this.schedule) {
      try {
        await setDoc(doc(firestore, 'schedule', slot.id), slot);
      } catch (e) {
        console.log('Firebase schedule save error:', e);
      }
    }

    return { points: this.points.length, schedule: scheduleCount };
  }

  // Sync версии (без async)
  private addPointSync(name: string, products: { name: string; price: number }[], inventory?: InventoryItem[]): Point | null {
    const id = 'pt-' + Math.random().toString(36).substr(2, 9);
    const newPoint: Point = {
      id,
      name,
      inventory: inventory || [],
      products: products.map(p => ({
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        name: p.name,
        price: p.price
      }))
    };
    this.points.push(newPoint);
    this.saveToLocalStorage();
    this.notify();
    return newPoint;
  }

  private generateScheduleForWeeksSync(weeks: number = 2): number {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    // Время не задано по умолчанию - каждый сотрудник указывает своё
    const times = [''];

    // Определяем с какого номера недели начинать
    const currentMaxWeek = this.schedule.length > 0
      ? Math.max(...this.schedule.map(s => s.weekNumber))
      : 0;
    const startWeek = currentMaxWeek + 1;

    let count = 0;
    for (let week = startWeek; week < startWeek + weeks; week++) {
      for (const point of this.points) {
        // Проверяем есть ли уже слоты для этой точки в этот день/неделю
        for (const day of days) {
          const exists = this.schedule.find(
            s => s.day === day && s.pointId === point.id && s.weekNumber === week
          );
          if (exists) continue; // Пропускаем если уже есть

          const id = 'slot-' + Math.random().toString(36).substr(2, 9);
          this.schedule.push({
            id,
            day,
            time: '',
            pointId: point.id,
            pointName: point.name,
            employees: [],
            weekNumber: week
          });
          count++;
        }
      }
    }

    this.saveToLocalStorage();
    this.notify();
    return count;
  }

  // ADD NEW SCHEDULE SLOT (Admin)
  public async addScheduleSlot(day: string, time: string, pointId: string, pointName: string, weekNumber: number = 1): Promise<ScheduleSlot | null> {
    const existingSlot = this.schedule.find(
      s => s.day === day && s.time === time && s.pointId === pointId && s.weekNumber === weekNumber
    );
    if (existingSlot) {
      console.log('❌ Slot already exists for this day/time/point/week');
      return null;
    }

    const newSlot: ScheduleSlot = {
      id: 'sch-' + Math.random().toString(36).substr(2, 9),
      day,
      time,
      pointId,
      pointName,
      employees: [],
      employeeTimes: {},
      weekNumber
    };

    this.schedule.push(newSlot);

    try {
      await setDoc(doc(firestore, 'schedule', newSlot.id), newSlot);
      console.log('✅ New schedule slot added to Firebase:', newSlot.id);
    } catch (e) {
      console.error('❌ Error adding schedule slot to Firebase:', e);
      this.saveToLocalStorage();
    }
    this.notify();
    return newSlot;
  }

  // FIREBASE CONFIG API
  public getFirebaseConfig(): FirebaseConfig {
    return this.firebaseConfig;
  }

  public saveFirebaseConfig(config: FirebaseConfig) {
    this.firebaseConfig = config;
    localStorage.setItem('sunset_firebase_config', JSON.stringify(config));
    this.notify();
  }

  // SCHEDULE WEEK MANAGEMENT
  public getScheduleByWeek(weekNumber: number): ScheduleSlot[] {
    return this.schedule.filter(s => s.weekNumber === weekNumber);
  }

  public getWeekNumber(date: Date = new Date()): number {
    // Получаем номер недели начиная с понедельника
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Находим понедельник текущей недели
    const dayOfWeek = d.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diffToMonday);
    // Сохраняем как "базовую" дату недели 1
    const baseDate = new Date('2026-01-05'); // Первый понедельник года
    const daysSinceBase = Math.floor((d.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSinceBase / 7) + 1;
  }

  public async claimWeek(
    employeeName: string,
    weekNumber: number,
    slotsToClaim: string[] // массив id слотов для записи
  ) {
    const results: { slotId: string; success: boolean; error?: string }[] = [];

    for (const slotId of slotsToClaim) {
      const slot = this.schedule.find(s => s.id === slotId && s.weekNumber === weekNumber);
      if (!slot) {
        results.push({ slotId, success: false, error: 'Слот не найден' });
        continue;
      }

      if (!slot.employees) {
        slot.employees = [];
      }

      if (slot.employees.includes(employeeName)) {
        results.push({ slotId, success: false, error: 'Вы уже записаны' });
        continue;
      }

      if (slot.employees.length >= 2) {
        results.push({ slotId, success: false, error: 'Слот заполнен' });
        continue;
      }

      slot.employees.push(employeeName);

      try {
        await updateDoc(doc(firestore, 'schedule', slotId), { employees: slot.employees });
      } catch (e) {
        console.error('❌ Error updating slot:', e);
        this.saveToLocalStorage();
      }
    }

    this.notify();
    return results;
  }

  public async rollOverWeek() {
    // Находим все слоты недели 1 и удаляем их
    const week1Slots = this.schedule.filter(s => s.weekNumber === 1);

    // Удаляем слоты недели 1 из Firebase
    for (const slot of week1Slots) {
      try {
        await deleteDoc(doc(firestore, 'schedule', slot.id));
      } catch (e) {
        console.error('❌ Error deleting old slot:', e);
      }
    }

    // Обновляем слоты недели 2 -> неделя 1
    const week2Slots = this.schedule.filter(s => s.weekNumber === 2);
    for (const slot of week2Slots) {
      slot.weekNumber = 1;
      try {
        await updateDoc(doc(firestore, 'schedule', slot.id), { weekNumber: 1 });
      } catch (e) {
        console.error('❌ Error updating week number:', e);
        this.saveToLocalStorage();
      }
    }

    // Генерируем новые слоты для недели 2
    const nextWeekNumber = Math.max(...this.schedule.map(s => s.weekNumber)) + 1;
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

    for (const point of this.points) {
      // Создаем 2 смены на каждый день (утро и вечер)
      const times = ['08:00 - 14:00'];
      for (const day of days) {
        for (const time of times) {
          const id = 'slot-' + Math.random().toString(36).substr(2, 9);
          const newSlot: ScheduleSlot = {
            id,
            day,
            time,
            pointId: point.id,
            pointName: point.name,
            employees: [],
            weekNumber: nextWeekNumber
          };

          try {
            await setDoc(doc(firestore, 'schedule', id), newSlot);
          } catch (e) {
            console.error('❌ Error creating new slot:', e);
            this.saveToLocalStorage();
          }
        }
      }
    }

    this.notify();
  }

  public async generateScheduleForWeeks(weeks: number = 2) {
    // Получаем текущий максимальный номер недели
    const currentMaxWeek = this.schedule.length > 0
      ? Math.max(...this.schedule.map(s => s.weekNumber))
      : 0;

    const startWeek = currentMaxWeek + 1;
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    // Время не задано по умолчанию - каждый сотрудник указывает своё
    const times = [''];

    const newSlots: ScheduleSlot[] = [];

    for (let week = startWeek; week <= startWeek + weeks - 1; week++) {
      for (const point of this.points) {
        for (const day of days) {
          // Проверяем, нет ли уже слота для этой точки/дня/недели
          const exists = this.schedule.find(
            s => s.day === day && s.pointId === point.id && s.weekNumber === week
          );
          if (exists) continue; // Пропускаем если уже есть

          const id = 'slot-' + Math.random().toString(36).substr(2, 9);
          const slot: ScheduleSlot = {
            id,
            day,
            time: '',
            pointId: point.id,
            pointName: point.name,
            employees: [],
            weekNumber: week
          };
          newSlots.push(slot);
        }
      }
    }

    // Сохраняем новые слоты в Firebase
    for (const slot of newSlots) {
      try {
        await setDoc(doc(firestore, 'schedule', slot.id), slot);
      } catch (e) {
        console.error('❌ Error creating schedule slot:', e);
      }
    }

    this.notify();
    return newSlots.length;
  }

  // Cleanup
  public destroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.listeners.clear();
  }
}

export const db = new SunsetDB();