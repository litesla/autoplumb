import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { useShop } from '../context/ShopContext';
import { Product } from '../lib/utils';
import { SlidersHorizontal, ArrowRight, Car, Droplets, Package } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const ITEMS_PER_PAGE = 24;

export const HomePage: React.FC = () => {
  const { mode, setMode, searchQuery, selectedCategory, priceRange, selectedBrands } = useShop();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = async (pageNumber: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Try to filter by type, but handle case where column is missing
      if (mode) {
        query = query.eq('type', mode);
      }

      query = query
        .gte('price', priceRange[0])
        .lte('price', priceRange[1])
        .range(pageNumber * ITEMS_PER_PAGE, (pageNumber + 1) * ITEMS_PER_PAGE - 1);

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      if (selectedBrands.length > 0) {
        query = query.in('brand', selectedBrands);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,article.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        // If the error is about a missing column, try fetching without the type filter
        if (error.message?.includes('column') && error.message?.includes('type')) {
          console.warn('Type column missing, falling back to non-filtered query');
          const fallbackQuery = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .gte('price', priceRange[0])
            .lte('price', priceRange[1])
            .range(pageNumber * ITEMS_PER_PAGE, (pageNumber + 1) * ITEMS_PER_PAGE - 1);
          
          const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery;
          if (fallbackError) throw fallbackError;
          
          if (fallbackData) {
            const mappedData = fallbackData.map(item => ({
              ...item,
              image: item.image_url || item.image || '',
              type: item.type || 'auto'
            })) as Product[];

            if (isInitial) setProducts(mappedData);
            else setProducts(prev => [...prev, ...mappedData]);

            setHasMore(fallbackData.length === ITEMS_PER_PAGE);
            if (fallbackCount !== null) setTotalCount(fallbackCount);
          }
          return;
        }
        throw error;
      }

      if (data) {
        const mappedData = data.map(item => ({
          ...item,
          image: item.image_url || item.image || '',
          type: item.type || 'auto'
        })) as Product[];

        if (isInitial) {
          setProducts(mappedData);
        } else {
          setProducts(prev => [...prev, ...mappedData]);
        }

        setHasMore(data.length === ITEMS_PER_PAGE);
        if (count !== null) setTotalCount(count);
      }
    } catch (error) {
      console.error('Error fetching products from Supabase:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(0);
    fetchProducts(0, true);
  }, [mode, searchQuery, selectedCategory, priceRange, selectedBrands]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  // Keep availabe brands logic or fetch them separately from Supabase for efficiency
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase
        .from('products')
        .select('brand')
        .eq('type', mode)
        .not('brand', 'is', null);
      
      if (data) {
        const brands = Array.from(new Set(data.map(d => d.brand))).filter(Boolean) as string[];
        setAvailableBrands(brands);
      }
    };
    fetchBrands();
  }, [mode]);

  return (
    <main>
      <Hero />
      
      <section id="products" className="py-12 bg-white dark:bg-black transition-colors relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-16 gap-8">
            <div className="text-center md:text-left w-full md:w-auto">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">
                {selectedCategory || (mode === 'auto' ? 'Автотовари' : 'Сантехніка')}
              </h2>
              <p className="text-xs md:text-base font-bold text-gray-400 flex items-center justify-center md:justify-start gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                В базі <span className="text-gray-900 dark:text-white font-black">{totalCount}</span> пропозицій
              </p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto sticky top-20 md:relative z-40 py-2 bg-white/70 dark:bg-black/70 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none px-1 rounded-2xl">
              <button 
                data-filter-trigger
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center space-x-2 px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 font-black hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
              >
                <SlidersHorizontal size={18} />
                <span className="text-xs uppercase tracking-widest hidden sm:inline">Фільтри</span>
              </button>

              <div className="flex-1 md:flex-none flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setMode('auto')}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-3 px-6 py-2.5 rounded-xl font-black transition-all ${
                    mode === 'auto' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Car size={18} strokeWidth={mode === 'auto' ? 2.5 : 2} />
                  <span className="text-xs uppercase tracking-widest">Авто</span>
                </button>
                <button
                  onClick={() => setMode('plumbing')}
                  className={`flex-1 md:flex-none flex items-center justify-center space-x-3 px-6 py-2.5 rounded-xl font-black transition-all ${
                    mode === 'plumbing' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Droplets size={18} strokeWidth={mode === 'plumbing' ? 2.5 : 2} />
                  <span className="text-xs uppercase tracking-widest">Сантехніка</span>
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
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="mt-16 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-gray-200/50 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Package size={20} />
                      )}
                      Показати ще товарів
                    </button>
                  </div>
                )}
              </>
            )}
            
            {!loading && products.length === 0 && (
              <div className="text-center py-24 bg-gray-50 dark:bg-gray-900 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
                <div className="text-gray-400 mb-4">
                  <Package size={48} className="mx-auto opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Нічого не знайдено</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Спробуйте змінити параметри пошуку або фільтри</p>
                {isAdmin && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                      Ви адмін: можливо, потрібно знову запустити синхронізацію після оновлення формату даних.
                    </p>
                    <Link 
                      to="/admin" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                      Перейти в Адмін-панель
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                )}
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
