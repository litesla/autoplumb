import React from 'react';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';

export const CartDrawer: React.FC<{ isOpen: boolean; onClose: () => void; onCheckout: () => void }> = ({ isOpen, onClose, onCheckout }) => {
  const { items, removeItem, updateQuantity, total } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={onClose}
                  className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={24} />
                </button>
                <ShoppingBag className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold dark:text-white">Кошик</h2>
              </div>
              <button onClick={onClose} className="hidden md:block p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-6 text-center">
                  <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-2">
                    <ShoppingBag size={48} className="opacity-20" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Ваш кошик порожній</h3>
                    <p className="text-sm font-medium max-w-[200px] mx-auto">Додайте товари, щоб почати покупки</p>
                  </div>
                  <button 
                    onClick={onClose}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Продовжити покупки
                  </button>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex space-x-4">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={`https://picsum.photos/seed/${item.id}/200/200`} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">{item.name}</h4>
                      <div className="text-blue-600 dark:text-blue-400 font-bold mb-3">{item.price} грн</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold dark:text-white">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-red-500 font-medium hover:underline"
                        >
                          Видалити
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Разом:</span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white">{total} грн</span>
                </div>
                <button 
                  onClick={onCheckout}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-600/20 dark:shadow-none hover:bg-blue-700 transition-all mb-3"
                >
                  Оформити замовлення
                </button>
                <button 
                  onClick={onClose}
                  className="w-full py-4 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all md:hidden"
                >
                  Продовжити покупки
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
