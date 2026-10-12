import React, { useState } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  Smartphone, 
  Sparkles, 
  Bot, 
  X, 
  CheckCircle2, 
  Zap, 
  Vibrate, 
  Share2 
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { motion, AnimatePresence } from 'motion/react';

interface TelegramMiniAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramMiniAppModal: React.FC<TelegramMiniAppModalProps> = ({ isOpen, onClose }) => {
  const { isTelegram, user, haptic, openTelegramLink } = useTelegram();
  const [copied, setCopied] = useState(false);
  const [testHapticDone, setTestHapticDone] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = () => {
    haptic('medium');
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestHaptic = () => {
    haptic('success');
    setTestHapticDone(true);
    setTimeout(() => setTestHapticDone(false), 1500);
  };

  const handleShareToTelegram = () => {
    haptic('light');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent('🛍️ AutoPlumb — інтернет-магазин автозапчастин та сантехніки прямо в Telegram!')}`;
    openTelegramLink(shareUrl);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 overflow-hidden z-10 my-8"
        >
          {/* Header decorative accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600" />

          {/* Close button */}
          <button 
            onClick={() => {
              haptic('light');
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Icon & Title */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Send size={24} className="-ml-0.5 mt-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Telegram Mini App</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Готово
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Повна підтримка запуску інтернет-магазину всередині Telegram
              </p>
            </div>
          </div>

          {/* Status Banner */}
          {isTelegram ? (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">
                  Ви зараз у Telegram Mini App!
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {user?.first_name ? `Користувач: ${user.first_name} ${user.last_name || ''} (@${user.username || 'user'})` : 'Додаток працює нативно у веб-клієнті Telegram.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-5 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl flex items-start gap-3">
              <Sparkles size={18} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-zinc-300">
                <p className="font-bold text-blue-700 dark:text-blue-300">
                  Додаток адаптовано для смартфонів та Telegram
                </p>
                <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-zinc-400">
                  Працюють тактильні відгуки (Haptics), нативна кнопка назад (BackButton), авто-розширення на весь екран та швидке оформлення замовлення.
                </p>
              </div>
            </div>
          )}

          {/* Web App URL Box for BotFather */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
              <span>URL веб-додатку для підключення:</span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">1-клік копіювання</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-700 dark:text-zinc-200 truncate select-all">
                {currentUrl}
              </div>
              <button
                onClick={handleCopyUrl}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-md shadow-blue-500/20"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-200" />
                    <span>Скопійовано!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Копіювати</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step-by-step setup in BotFather */}
          <div className="space-y-3 mb-6 bg-slate-50/70 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Bot size={15} className="text-blue-500" />
              Як підключити через @BotFather (за 1 хвилину):
            </h4>
            <ol className="text-xs text-slate-600 dark:text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Відкрийте офіційного бота <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">@BotFather</a> в Telegram
              </li>
              <li>
                Надішліть команду <code className="bg-slate-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded font-mono text-blue-600 dark:text-blue-400">/newapp</code> (або створіть бота через <code className="bg-slate-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded font-mono">/newbot</code>)
              </li>
              <li>
                Оберіть вашого бота, введіть заголовок (<span className="text-slate-800 dark:text-slate-200 font-medium">AutoPlumb</span>) та опис
              </li>
              <li>
                Коли BotFather запитає Web App URL — вставте <span className="font-bold text-blue-600 dark:text-blue-400">скопійовану адресу</span>
              </li>
              <li>
                Введіть коротку назву (наприклад <code className="bg-slate-200 dark:bg-zinc-700 px-1 rounded">shop</code>) — і готово!
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleShareToTelegram}
              className="w-full py-3 px-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Share2 size={16} />
              <span>Поділитися в TG</span>
            </button>

            <button
              onClick={handleTestHaptic}
              className="w-full py-3 px-4 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Vibrate size={16} className={testHapticDone ? 'text-emerald-500 animate-bounce' : 'text-slate-500'} />
              <span>{testHapticDone ? 'Вібрація спрацювала!' : 'Тест Haptic (вібрація)'}</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 text-center">
            <button 
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-semibold"
            >
              Зрозуміло, закрити
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
