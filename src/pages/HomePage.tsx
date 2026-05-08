import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { useShop } from '../context/ShopContext';
import { Product } from '../lib/utils';
import { Car, Droplets, Package, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';

export const HomePage: React.FC = () => {
  const { mode, setMode, searchQuery, selectedCategory, priceRange, selectedBrands } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    setLoading(true);
    setVisibleCount(50); // Reset visible count when mode changes
    const path = 'products';
    // Limit to 400 products to prevent quota exhaustion and performance issues
    const q = query(collection(db, path), where('type', '==', mode), limit(400));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      console.log(`Loaded ${productsData.length} products for mode: ${mode}`);
      if (productsData.length > 0) {
        console.log("Sample product:", productsData[0]);
      }
      setProducts(productsData);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [mode]);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery, selectedCategory, priceRange, selectedBrands]);

  const availableBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    const matchesBrand = selectedBrands.length === 0 || (product.brand && selectedBrands.includes(product.brand));
    
    return matchesSearch && matchesCategory && matchesPrice && matchesBrand;
  });

  return (
    <main>
      <Hero />
      
      <section id="products" className="py-12 bg-white dark:bg-black transition-colors relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 md:mb-12 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                {selectedCategory || 'Всі товари'}
              </h2>
              <p className="text-xs md:text-sm font-medium text-gray-400">
                Знайдено <span className="text-gray-900 dark:text-white">{filteredProducts.length}</span> товарів
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <button 
                data-filter-trigger
                onClick={() => setIsFilterOpen(true)}
                className="hidden md:flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50/30 transition-all shadow-sm active:scale-95"
              >
                <SlidersHorizontal size={16} />
                <span className="text-sm">Фільтри</span>
              </button>

              <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1 hidden md:block" />

              <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200/50 dark:border-gray-700/50 w-full md:w-auto">
                <button
                  onClick={() => setMode('auto')}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all ${
                    mode === 'auto' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Car size={16} />
                  <span className="text-sm">Авто</span>
                </button>
                <button
                  onClick={() => setMode('plumbing')}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all ${
                    mode === 'plumbing' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Droplets size={16} />
                  <span className="text-sm">Сантехніка</span>
                </button>
              </div>
            </div>
          </div>

          <FilterSidebar 
            isOpen={isFilterOpen} 
            onClose={() => setIsFilterOpen(false)} 
            availableBrands={availableBrands}
          />

          <div className="w-full">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 aspect-[4/5] rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
                  {filteredProducts.slice(0, visibleCount).map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                
                {filteredProducts.length > visibleCount && (
                  <div className="mt-16 flex justify-center">
                    <button
                      onClick={() => setVisibleCount(prev => prev + 50)}
                      className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-gray-200/50 flex items-center gap-3"
                    >
                      <Package size={20} />
                      Показати ще 50 товарів
                    </button>
                  </div>
                )}
              </>
            )}
            
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-24 bg-gray-50 dark:bg-gray-900 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-4">
                  <Package size={48} className="mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Нічого не знайдено</h3>
                <p className="text-gray-500 dark:text-gray-400">Спробуйте змінити параметри пошуку або фільтри</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gray-50 dark:bg-gray-900/50 transition-colors">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Car size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 dark:text-white">Швидка доставка</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Відправляємо замовлення щодня через Нову Пошту та Укрпошту по всій Україні.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Droplets size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 dark:text-white">Гарантія якості</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Тільки перевірені бренди та сертифікована продукція з офіційною гарантією.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <ArrowRight size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 dark:text-white">Підтримка 24/7</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Наші фахівці завжди готові допомогти вам з вибором потрібного товару.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
