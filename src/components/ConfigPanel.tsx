import React, { useState, useEffect } from 'react';
import { db, FirebaseConfig } from '../lib/db';
import { Settings, Database, Server, Info, CheckCircle, AlertCircle, Eye, EyeOff, Save } from 'lucide-react';
import { motion } from 'framer-motion';

export const ConfigPanel: React.FC = () => {
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    enabled: false
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setConfig(db.getFirebaseConfig());
  }, []);

  const handleInputChange = (field: keyof FirebaseConfig, val: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveFirebaseConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-6 rounded-2xl border border-orange-500/20">
        <h2 className="text-2xl font-bold text-orange-950 dark:text-orange-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-orange-500" />
          Настройки базы данных
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          По умолчанию приложение работает в автономном режиме симуляции Firestore + Auth. Вы можете подключить собственную базу данных Firebase (Spark-тариф).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-4">
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4.5 h-4.5 text-orange-500" />
                Параметры Firebase SDK
              </h3>

              {/* Toggle Connection */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold">Режим Firebase:</span>
                <button
                  type="button"
                  onClick={() => handleInputChange('enabled', !config.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    config.enabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-zinc-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl border border-emerald-200 dark:border-emerald-900/30 flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5" />
                Настройки успешно сохранены! Перезагрузите страницу для активации режима.
              </div>
            )}

            {/* Config Inputs */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${config.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Firebase API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="AIzaSyA1..."
                    disabled={!config.enabled}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Auth Domain
                </label>
                <input
                  type="text"
                  value={config.authDomain}
                  onChange={(e) => handleInputChange('authDomain', e.target.value)}
                  placeholder="sunset-app.firebaseapp.com"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Project ID
                </label>
                <input
                  type="text"
                  value={config.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  placeholder="sunset-app"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Storage Bucket
                </label>
                <input
                  type="text"
                  value={config.storageBucket}
                  onChange={(e) => handleInputChange('storageBucket', e.target.value)}
                  placeholder="sunset-app.appspot.com"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Messaging Sender ID
                </label>
                <input
                  type="text"
                  value={config.messagingSenderId}
                  onChange={(e) => handleInputChange('messagingSenderId', e.target.value)}
                  placeholder="84729105829"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  App ID
                </label>
                <input
                  type="text"
                  value={config.appId}
                  onChange={(e) => handleInputChange('appId', e.target.value)}
                  placeholder="1:84729105829:web:9f8a7e6d5c4b3a2"
                  disabled={!config.enabled}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              Сохранить конфигурацию
            </button>
          </form>
        </div>

        {/* Instructions Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4.5 h-4.5 text-orange-500" />
              Инструкция по развертыванию
            </h4>

            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-3 leading-relaxed">
              <p>
                <b>Шаг 1:</b> Создайте проект в консоли Firebase на бесплатном тарифе Spark.
              </p>
              <p>
                <b>Шаг 2:</b> Активируйте <b>Cloud Firestore</b> и <b>Authentication</b> (Email/Password).
              </p>
              <p>
                <b>Шаг 3:</b> Создайте следующие коллекции в Firestore:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[10px] text-orange-600">
                <li>points</li>
                <li>active_shifts</li>
                <li>closed_shifts</li>
                <li>schedule_slots</li>
              </ul>
              <p>
                <b>Шаг 4:</b> Скопируйте ключи из раздела «Настройки проекта» (Web App SDK Setup) и вставьте в форму слева.
              </p>
              <p>
                <b>Шаг 5:</b> Включите тумблер «Режим Firebase» и нажмите сохранить. Готово!
              </p>
            </div>
          </div>

          <div className="p-4 bg-orange-50 dark:bg-orange-950/10 text-orange-700 dark:text-orange-400 rounded-2xl border border-orange-100 dark:border-orange-900/10 flex items-start gap-2.5">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-normal">
              <span className="font-bold block mb-0.5">Безопасность Spark-тарифа:</span>
              Благодаря клиентской генерации отчетов Excel и Word, нагрузка на Firebase Functions сведена к нулю, что гарантирует 100% бесплатную работу в лимитах тарифа Spark!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
