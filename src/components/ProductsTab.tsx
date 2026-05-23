import React, { useState, useEffect } from 'react';
import { db, Point, Product, InventoryItem } from '../lib/db';
import { Package, Plus, Edit2, Trash2, Store, Save, X, DollarSign, Boxes, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ProductsTab: React.FC = () => {
  const [points, setPoints] = useState<Point[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'inventory'>('products');

  // Form states for adding/editing product
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');

  // Form states for inventory
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [inventoryName, setInventoryName] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('');
  const [inventoryUnit, setInventoryUnit] = useState('шт');

  useEffect(() => {
    setPoints(db.getPoints());

    const unsubscribe = db.subscribe(() => {
      setPoints(db.getPoints());
    });
    return unsubscribe;
  }, []);

  const selectedPoint = points.find(p => p.id === selectedPointId);

  // Product handlers
  const handleAddProduct = async () => {
    if (!selectedPointId || !productName.trim() || !productPrice.trim()) return;

    const price = parseFloat(productPrice);
    if (isNaN(price) || price < 0) {
      alert('Введите корректную цену');
      return;
    }

    setIsLoading(true);
    await db.addProductToPoint(selectedPointId, productName.trim(), price);
    setIsLoading(false);

    resetProductForm();
  };

  const handleUpdateProduct = async () => {
    if (!selectedPointId || !editingProduct || !productName.trim() || !productPrice.trim()) return;

    const price = parseFloat(productPrice);
    if (isNaN(price) || price < 0) {
      alert('Введите корректную цену');
      return;
    }

    setIsLoading(true);
    await db.updateProduct(selectedPointId, editingProduct.id, productName.trim(), price);
    setIsLoading(false);

    resetProductForm();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedPointId) return;

    const product = selectedPoint?.products.find(p => p.id === productId);
    if (!confirm(`Удалить товар "${product?.name}"?`)) return;

    setIsLoading(true);
    await db.deleteProductFromPoint(selectedPointId, productId);
    setIsLoading(false);
  };

  // Inventory handlers
  const handleAddInventory = async () => {
    if (!selectedPointId || !inventoryName.trim() || !inventoryQuantity.trim()) return;

    const quantity = parseFloat(inventoryQuantity);
    if (isNaN(quantity) || quantity < 0) {
      alert('Введите корректное количество');
      return;
    }

    setIsLoading(true);
    await db.addInventoryToPoint(selectedPointId, inventoryName.trim(), quantity, inventoryUnit);
    setIsLoading(false);

    resetInventoryForm();
  };

  const handleUpdateInventory = async () => {
    if (!selectedPointId || !editingInventory || !inventoryName.trim() || !inventoryQuantity.trim()) return;

    const quantity = parseFloat(inventoryQuantity);
    if (isNaN(quantity) || quantity < 0) {
      alert('Введите корректное количество');
      return;
    }

    setIsLoading(true);
    await db.updateInventoryItem(selectedPointId, editingInventory.id, inventoryName.trim(), quantity, inventoryUnit);
    setIsLoading(false);

    resetInventoryForm();
  };

  const handleDeleteInventory = async (inventoryId: string) => {
    if (!selectedPointId) return;

    const item = selectedPoint?.inventory?.find(i => i.id === inventoryId);
    if (!confirm(`Удалить остаток "${item?.name}"?`)) return;

    setIsLoading(true);
    await db.deleteInventoryFromPoint(selectedPointId, inventoryId);
    setIsLoading(false);
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setShowForm(true);
    setShowInventoryForm(false);
  };

  const startEditInventory = (item: InventoryItem) => {
    setEditingInventory(item);
    setInventoryName(item.name);
    setInventoryQuantity(item.quantity.toString());
    setInventoryUnit(item.unit);
    setShowInventoryForm(true);
    setShowForm(false);
  };

  const resetProductForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
  };

  const resetInventoryForm = () => {
    setShowInventoryForm(false);
    setEditingInventory(null);
    setInventoryName('');
    setInventoryQuantity('');
    setInventoryUnit('шт');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-zinc-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            Товары и остатки
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Управление товарами и остатками на точках продаж
          </p>
        </div>
      </div>

      {/* Point Selector */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6">
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
          Выберите точку
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {points.map(point => (
            <button
              key={point.id}
              onClick={() => {
                setSelectedPointId(point.id);
                resetProductForm();
                resetInventoryForm();
              }}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                selectedPointId === point.id
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                  : 'border-gray-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-700'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedPointId === point.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
              }`}>
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-800 dark:text-zinc-200">{point.name}</div>
                <div className="text-xs text-gray-500">
                  {point.products?.length || 0} товаров • {point.inventory?.length || 0} остатков
                </div>
              </div>
            </button>
          ))}
        </div>

        {points.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет доступных точек</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      {selectedPoint && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
        >
          {/* Tab Header */}
          <div className="flex border-b border-gray-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-4 px-6 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'products'
                  ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-b-2 border-orange-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Package className="w-4 h-4" />
              Товары ({selectedPoint.products?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-4 px-6 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'inventory'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-b-2 border-emerald-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              Остатки ({selectedPoint.inventory?.length || 0})
            </button>
          </div>

          {/* Products Tab */}
          {activeTab === 'products' && (
            <>
              {/* Products Header */}
              <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100">
                    Товары для продажи
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedPoint.products?.length || 0} товаров в ассортименте
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetProductForm();
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить товар
                </button>
              </div>

              {/* Add/Edit Product Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-gray-200 dark:border-zinc-800 bg-orange-50/50 dark:bg-orange-950/10"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="font-bold text-gray-800 dark:text-zinc-200">
                          {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                        </h4>
                        <button
                          onClick={resetProductForm}
                          className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Название товара
                          </label>
                          <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Например: Кофе Американо"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Цена (₽)
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="number"
                              value={productPrice}
                              onChange={(e) => setProductPrice(e.target.value)}
                              placeholder="0"
                              min="0"
                              step="0.01"
                              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          onClick={resetProductForm}
                          className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={editingProduct ? handleUpdateProduct : handleAddProduct}
                          disabled={isLoading || !productName.trim() || !productPrice.trim()}
                          className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {isLoading ? 'Сохранение...' : (editingProduct ? 'Сохранить' : 'Добавить')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Products Table */}
              <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                {(!selectedPoint.products || selectedPoint.products.length === 0) ? (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">Нет товаров</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Добавьте первый товар, чтобы начать продажи
                    </p>
                  </div>
                ) : (
                  selectedPoint.products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 dark:text-zinc-200">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {product.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-black text-orange-600 dark:text-orange-400">
                            {product.price.toLocaleString('ru-RU')} ₽
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditProduct(product)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <>
              {/* Inventory Header */}
              <div className="p-6 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-zinc-100">
                    Остатки на точке
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedPoint.inventory?.length || 0} позиций остатков
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetInventoryForm();
                    setShowInventoryForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить остаток
                </button>
              </div>

              {/* Add/Edit Inventory Form */}
              <AnimatePresence>
                {showInventoryForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-gray-200 dark:border-zinc-800 bg-emerald-50/50 dark:bg-emerald-950/10"
                  >
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="font-bold text-gray-800 dark:text-zinc-200">
                          {editingInventory ? 'Редактировать остаток' : 'Новый остаток'}
                        </h4>
                        <button
                          onClick={resetInventoryForm}
                          className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Название позиции
                          </label>
                          <input
                            type="text"
                            value={inventoryName}
                            onChange={(e) => setInventoryName(e.target.value)}
                            placeholder="Например: Кофе в зернах"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Количество
                          </label>
                          <input
                            type="number"
                            value={inventoryQuantity}
                            onChange={(e) => setInventoryQuantity(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
                            Единица измерения
                          </label>
                          <select
                            value={inventoryUnit}
                            onChange={(e) => setInventoryUnit(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                          >
                            <option value="шт">шт — штуки</option>
                            <option value="кг">кг — килограммы</option>
                            <option value="г">г — граммы</option>
                            <option value="л">л — литры</option>
                            <option value="мл">мл — миллилитры</option>
                            <option value="упак">упак — упаковки</option>
                            <option value="порц">порц — порции</option>
                            <option value="короб">короб — коробки</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          onClick={resetInventoryForm}
                          className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={editingInventory ? handleUpdateInventory : handleAddInventory}
                          disabled={isLoading || !inventoryName.trim() || !inventoryQuantity.trim()}
                          className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-bold transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {isLoading ? 'Сохранение...' : (editingInventory ? 'Сохранить' : 'Добавить')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Inventory Table */}
              <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                {(!selectedPoint.inventory || selectedPoint.inventory.length === 0) ? (
                  <div className="p-12 text-center">
                    <Boxes className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">Нет остатков</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Добавьте первую позицию остатков
                    </p>
                  </div>
                ) : (
                  selectedPoint.inventory.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 dark:text-zinc-200">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-lg font-black text-emerald-600 dark:text-emerald-400">
                            <Scale className="w-4 h-4" />
                            {item.quantity.toLocaleString('ru-RU')} {item.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditInventory(item)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 rounded-lg transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInventory(item.id)}
                            className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};
