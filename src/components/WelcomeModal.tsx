import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShoppingBag, ShieldCheck, X } from 'lucide-react';

export const WelcomeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl z-[110] overflow-hidden p-10 border border-gray-100 dark:border-gray-800"
          >
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>

            <div className="text-center space-y-8">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-[24px] flex items-center justify-center mx-auto">
                <Sparkles size={40} />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Вітаємо в AutoPlumb!</h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Ваш надійний партнер у світі автотоварів та сантехніки. Ми підготували для вас найкращі пропозиції.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 text-left">
                <div className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-blue-600 dark:text-blue-400">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Великий асортимент</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Понад 5000 товарів у наявності</div>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white">Гарантія якості</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Тільки сертифікована продукція</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Почати покупки
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
