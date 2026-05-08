import React from 'react';
import { useShop } from '../context/ShopContext';
import { X, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  availableBrands: string[];
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ isOpen, onClose, availableBrands }) => {
  const { priceRange, setPriceRange, selectedBrands, setSelectedBrands, resetFilters } = useShop();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full md:max-w-[320px] bg-white dark:bg-gray-900 shadow-2xl z-[110] flex flex-col border-l border-gray-100 dark:border-gray-800"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter size={20} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-xl font-black text-gray-900 dark:text-white">Фільтри</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors dark:text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-gray-900">
                {/* Ціна */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ціна (грн)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Від</label>
                      <input 
                        type="number" 
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">До</label>
                      <input 
                        type="number" 
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold dark:text-white"
                      />
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="50000" 
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400"
                  />
                </div>

                {/* Бренди */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Бренди</h3>
                  <div className="space-y-2">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={selectedBrands.includes(brand)}
                            onChange={() => {
                              if (selectedBrands.includes(brand)) {
                                setSelectedBrands(selectedBrands.filter(b => b !== brand));
                              } else {
                                setSelectedBrands([...selectedBrands, brand]);
                              }
                            }}
                            className="peer appearance-none w-5 h-5 border-2 border-gray-200 dark:border-gray-700 rounded-md checked:bg-blue-600 dark:checked:bg-blue-500 checked:border-blue-600 dark:checked:border-blue-500 transition-all"
                          />
                          <X size={12} className="absolute left-1 top-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                        </div>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-3 bg-white dark:bg-gray-900">
                <button 
                  onClick={resetFilters}
                  className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                >
                  Скинути
                </button>
                <button 
                  onClick={onClose}
                  className="flex-[2] py-3 px-4 bg-gray-900 dark:bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-200 dark:shadow-none hover:bg-black dark:hover:bg-blue-700 transition-all active:scale-95"
                >
                  Застосувати
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
