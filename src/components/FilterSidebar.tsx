import React from 'react';
import { useShop } from '../context/ShopContext';
import { X, Filter, Check, RotateCcw, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  availableBrands: string[];
}

export const FilterControls: React.FC<{
  availableBrands: string[];
  isDesktop?: boolean;
}> = ({ availableBrands, isDesktop = false }) => {
  const { mode, setMode, selectedCategory, setSelectedCategory, priceRange, setPriceRange, selectedBrands, setSelectedBrands, resetFilters } = useShop();

  const handlePricePreset = (min: number, max: number) => {
    setPriceRange([min, max]);
  };

  const hasActiveFilters = selectedBrands.length > 0 || priceRange[0] > 0 || priceRange[1] < 50000 || selectedCategory !== null;

  const autoCategories = [
    'Всі товари', 'Трактори МТЗ', 'Запчастини ЮМЗ', 'Акумулятори', 'Автохімія та оливи', 'Фільтри', 'Електрообладнання'
  ];

  const plumbCategories = [
    'Всі товари', 'Змішувачі', 'Опалення', 'Радіатори', 'Труби та фітинги', 'Водонагрівачі', 'Каналізація'
  ];

  const currentCategories = mode === 'auto' ? autoCategories : plumbCategories;

  return (
    <div className="space-y-6">
      {/* Category Navigation (Especially useful on Desktop Sidebar) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Категорії ({mode === 'auto' ? 'Авто/МТЗ' : 'Сантехніка'})
          </h3>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              Скинути
            </button>
          )}
        </div>

        <div className="space-y-1">
          {currentCategories.map(cat => {
            const isSelected = (cat === 'Всі товари' && !selectedCategory) || selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'Всі товари' ? null : cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{cat}</span>
                {isSelected && <Check size={14} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Filter */}
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
          Ціна (грн)
        </h3>

        {/* Quick price chips */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handlePricePreset(0, 500)}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
              priceRange[0] === 0 && priceRange[1] === 500
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
            }`}
          >
            До 500 ₴
          </button>
          <button
            type="button"
            onClick={() => handlePricePreset(500, 1500)}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
              priceRange[0] === 500 && priceRange[1] === 1500
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
            }`}
          >
            500 – 1 500 ₴
          </button>
          <button
            type="button"
            onClick={() => handlePricePreset(1500, 5000)}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
              priceRange[0] === 1500 && priceRange[1] === 5000
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
            }`}
          >
            1 500 – 5 000 ₴
          </button>
          <button
            type="button"
            onClick={() => handlePricePreset(0, 50000)}
            className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
              priceRange[0] === 0 && priceRange[1] === 50000
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
            }`}
          >
            Всі ціни
          </button>
        </div>

        {/* Manual inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">Від (грн)</label>
            <input 
              type="number" 
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Math.max(0, Number(e.target.value)), priceRange[1]])}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">До (грн)</label>
            <input 
              type="number" 
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Math.max(0, Number(e.target.value))])}
              className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
          className="w-full h-2 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
      </div>

      {/* Brands Filter */}
      {availableBrands.length > 0 && (
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
              Бренди ({availableBrands.length})
            </h3>
            {selectedBrands.length > 0 && (
              <button 
                onClick={() => setSelectedBrands([])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Очистити
              </button>
            )}
          </div>
          
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {availableBrands.map(brand => {
              const isChecked = selectedBrands.includes(brand);
              return (
                <label 
                  key={brand} 
                  className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                >
                  <span className={`text-xs ${isChecked ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-slate-700 dark:text-zinc-300'}`}>
                    {brand}
                  </span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isChecked 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                  }`}>
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset button */}
      {hasActiveFilters && (
        <div className="pt-2">
          <button 
            onClick={resetFilters}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Скинути всі фільтри</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const DesktopFilterSidebar: React.FC<{ availableBrands: string[] }> = ({ availableBrands }) => {
  return (
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0">
      <div className="sticky top-24 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Filter size={16} />
          </div>
          <span className="font-extrabold text-sm text-slate-900 dark:text-white">Фільтр товарів</span>
        </div>
        <FilterControls availableBrands={availableBrands} isDesktop={true} />
      </div>
    </aside>
  );
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ isOpen, onClose, availableBrands }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[120]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="lg:hidden fixed right-0 top-0 h-full w-full max-w-[340px] bg-white dark:bg-zinc-900 shadow-2xl z-[130] flex flex-col border-l border-slate-200 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Filter size={18} />
                </div>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">Фільтри</span>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                aria-label="Закрити фільтри"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <FilterControls availableBrands={availableBrands} isDesktop={false} />
            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
              <button 
                onClick={onClose}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all text-center cursor-pointer active:scale-95"
              >
                Показати результати
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
