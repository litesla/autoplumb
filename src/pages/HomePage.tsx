import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { RecommendationCarousel } from '../components/RecommendationCarousel';
import { TOP_RECOMMENDED_PRODUCTS, SPECIAL_RECOMMENDED_PRODUCTS } from '../data/recommendedProducts';
import { useShop } from '../context/ShopContext';
import { Product, getExpandedSearchTerms, getSearchKeywords } from '../lib/utils';
import { SlidersHorizontal, ArrowRight, Car, Droplets, Package, AlertTriangle, Settings, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { getSanitizedProductImage } from '../services/productImageService';

const ITEMS_PER_PAGE = 24;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring" as const, 
      stiffness: 300, 
      damping: 22 
    } 
  }
} as const;

export const HomePage: React.FC = () => {
  const { mode, setMode, searchQuery, selectedCategory, setSelectedCategory, priceRange, selectedBrands } = useShop();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'newest'>('popular');

  // СПИСКИ РЕКОМЕНДАЦІЙ ДЛЯ ГОЛОВНОЇ СТОРІНКИ
  const [topRecs, setTopRecs] = useState<Product[]>(TOP_RECOMMENDED_PRODUCTS);
  const [specialRecs, setSpecialRecs] = useState<Product[]>(SPECIAL_RECOMMENDED_PRODUCTS);

  useEffect(() => {
    const loadDynamicRecs = async () => {
      try {
        let recQuery = supabase
          .from('products')
          .select('*')
          .order('stock', { ascending: false });
        
        if (mode) {
          recQuery = recQuery.eq('type', mode);
        }

        const { data: dbItems } = await recQuery.limit(24);
        
        if (dbItems && dbItems.length >= 6) {
          const mapped = dbItems.map(item => ({
            ...item,
            image: getSanitizedProductImage(item),
            type: item.type || 'auto'
          })) as Product[];
          
          setTopRecs(mapped.slice(0, 10));
          if (mapped.length > 10) {
            setSpecialRecs(mapped.slice(10));
          }
        }
      } catch (err) {
        // Fallback already pre-populated with curated items
      }
    };
    loadDynamicRecs();
  }, [mode]);

  const fetchProducts = async (pageNumber: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setFetchError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      // Direct raw fetch for total count first to verify connection
      const { count: dbCount, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.warn('Count check failed or offline mode:', countError);
        // Resilient fallback to curated product catalog
        const fallbackCatalog = [...TOP_RECOMMENDED_PRODUCTS, ...SPECIAL_RECOMMENDED_PRODUCTS];
        const filtered = fallbackCatalog.filter(p => !mode || p.type === mode);
        setProducts(filtered);
        setTotalCount(filtered.length);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (dbCount !== null) setTotalCount(dbCount);

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Apply type restriction
      if (mode) {
        query = query.eq('type', mode);
      }

      // Apply category restriction
      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      // Apply price range restriction
      if (priceRange) {
        query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);
      }

      // Apply brand filtering
      if (selectedBrands && selectedBrands.length > 0) {
        query = query.in('brand', selectedBrands);
      }

      // Smart multi-word search query handling with layout conversion, stemming, and synonym lookups
      if (searchQuery) {
        const words = getSearchKeywords(searchQuery);
        if (words.length > 0) {
          words.forEach(word => {
            const expanded = getExpandedSearchTerms(word);
            if (expanded.length > 0) {
              const orConditions = expanded.map(term => 
                `name.ilike.%${term}%,description.ilike.%${term}%,brand.ilike.%${term}%,article.ilike.%${term}%`
              ).join(',');
              query = query.or(orConditions);
            }
          });
        } else {
          // Fallback if all words are stop words
          const expanded = getExpandedSearchTerms(searchQuery);
          if (expanded.length > 0) {
            const orConditions = expanded.map(term => 
              `name.ilike.%${term}%,description.ilike.%${term}%,brand.ilike.%${term}%,article.ilike.%${term}%`
            ).join(',');
            query = query.or(orConditions);
          }
        }
      }

      // Apply sorting
      if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else {
        // 'popular': in-stock products first, then recent items
        query = query.order('stock', { ascending: false }).order('created_at', { ascending: false });
      }

      // Apply range for pagination
      query = query.range(pageNumber * ITEMS_PER_PAGE, (pageNumber + 1) * ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase fetch error:', error);
      }

      // Only attempt fallback if there is a DB error or if the DB table itself is completely empty
      if (error || (isInitial && dbCount === 0)) {
        console.log('Attempting raw fallback because of error or empty database...');
        let rawQuery = supabase
          .from('products')
          .select('*', { count: 'exact' });
        if (mode) rawQuery = rawQuery.eq('type', mode);
        rawQuery = rawQuery.order('stock', { ascending: false });
        const { data: rawData, error: rawError, count: rawCount } = await rawQuery
          .range(pageNumber * ITEMS_PER_PAGE, (pageNumber + 1) * ITEMS_PER_PAGE - 1);
        
        if (rawError) {
          console.error('Raw fetch fallback failed:', rawError);
          throw rawError;
        }
        
        if (rawData && rawData.length > 0) {
          const mapped = rawData.map(item => {
            const rawImg = item.image_url || item.image || '';
            const cleanImg = getSanitizedProductImage({ ...item, image: rawImg });
            return { ...item, image: cleanImg, type: item.type || 'auto' };
          });
          if (isInitial) setProducts(mapped as Product[]);
          else setProducts(prev => [...prev, ...mapped as Product[]]);
          setHasMore(rawData.length === ITEMS_PER_PAGE);
          if (rawCount !== null) setTotalCount(rawCount);
          return;
        }
        
        if (isInitial) {
          setProducts([]);
          setTotalCount(0);
          setHasMore(false);
        }
        return;
      }

      if (data) {
        console.log(`Successfully fetched ${data.length} products.`);
        const mappedData = data.map(item => {
          const rawImg = item.image_url || item.image || '';
          const cleanImg = getSanitizedProductImage({ ...item, image: rawImg });
          return {
            ...item,
            image: cleanImg,
            type: item.type || 'auto'
          };
        }) as Product[];

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
  }, [mode, searchQuery, selectedCategory, priceRange[0], priceRange[1], JSON.stringify(selectedBrands), sortBy]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  // Keep available brands logic
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

  const quickCategoryList = mode === 'auto'
    ? ['Всі товари', 'Трактори МТЗ', 'Запчастини ЮМЗ', 'Акумулятори', 'Автохімія та оливи', 'Фільтри', 'Автоелектроніка', 'Автоінструменти']
    : ['Всі товари', 'Змішувачі', 'Опалення', 'Радіатори', 'Труби та фітинги', 'Водонагрівачі', 'Каналізація', 'Крани та арматура'];
  
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
      
      {/* ПЕРШИЙ СПИСОК РЕКОМЕНДАЦІЙ: Популярні товари */}
      <RecommendationCarousel
        id="recommended-top-scroll"
        title="Популярні товари"
        subtitle="Затребувані оригінальні автозапчастини та сантехніка"
        products={topRecs}
        currentMode={mode}
      />

      {/* ДРУГИЙ СПИСОК РЕКОМЕНДАЦІЙ: Спеціальні пропозиції */}
      <RecommendationCarousel
        id="recommended-special-scroll"
        title="Спеціальні пропозиції"
        subtitle="Комплектуючі, фільтри, елементи підвіски та сантехніка для дому"
        products={specialRecs}
        currentMode={mode}
      />

      <section id="products" className="py-8 md:py-12 bg-white dark:bg-black transition-colors relative">
        <div className="container mx-auto px-4">
          
          {/* Quick Categories Horizontal Scroll for Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 no-scrollbar">
            {quickCategoryList.map((cat) => {
              const isSelected = (cat === 'Всі товари' && !selectedCategory) || selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === 'Всі товари' ? null : cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Unified Catalog Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-zinc-800 gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {selectedCategory || (mode === 'auto' ? 'Каталог автозапчастин' : 'Каталог сантехніки')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Знайдено <span className="font-bold text-slate-900 dark:text-white tabular-nums">{totalCount}</span> товарів
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap sm:flex-nowrap">
              {/* Filter button */}
              <button 
                data-filter-trigger
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-700 dark:text-zinc-200 font-bold hover:text-blue-600 transition-all active:scale-95 text-xs shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal size={14} />
                <span>Фільтри</span>
                {(selectedBrands.length > 0 || (priceRange && (priceRange[0] > 0 || priceRange[1] < 50000))) && (
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                )}
              </button>

              {/* Sort selector dropdown */}
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-8 pr-7 py-2 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
                >
                  <option value="popular">За популярністю</option>
                  <option value="price_asc">Від дешевих до дорогих</option>
                  <option value="price_desc">Від дорогих до дешевих</option>
                  <option value="newest">Нові надходження</option>
                </select>
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Quick sorting tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-4 no-scrollbar text-xs font-semibold">
            {[
              { id: 'popular', label: 'Популярні' },
              { id: 'price_asc', label: 'Від дешевих' },
              { id: 'price_desc', label: 'Від дорогих' },
              { id: 'newest', label: 'Новинки' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSortBy(s.id as any)}
                className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-all whitespace-nowrap text-xs cursor-pointer ${
                  sortBy === s.id
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <FilterSidebar 
            isOpen={isFilterOpen} 
            onClose={() => setIsFilterOpen(false)} 
            availableBrands={availableBrands}
          />

          <div className="w-full">
            {fetchError ? (
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-12 rounded-[40px] text-center max-w-2xl mx-auto">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black text-red-900 dark:text-red-400 mb-2">Помилка з'єднання</h3>
                <p className="text-red-700/60 dark:text-red-400/60 font-medium mb-6 font-mono text-xs">{fetchError}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                    onClick={() => fetchProducts(0, true)}
                    className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    Спробувати ще раз
                  </button>
                  {isAdmin && (
                    <Link to="/admin?tab=diagnostics" className="text-red-600 font-bold hover:underline">
                      Діагностика →
                    </Link>
                  )}
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 aspect-[4/5] rounded-2xl" />
                ))}
              </div>
            ) : (
              <>
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8"
                >
                  {products.map(product => (
                    <motion.div key={product.id} variants={itemVariants} className="h-full">
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
                
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Товарів не знайдено</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto font-medium">
                  За вашим запитом або обраними фільтрами пропозицій не знайдено. Спробуйте змінити критерії або скинути фільтри.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-gray-200"
                  >
                    Скинути всі фільтри
                  </button>
                  {isAdmin && (
                    <Link 
                      to="/admin?tab=diagnostics" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                    >
                      <Settings size={18} />
                      Діагностика підключення
                    </Link>
                  )}
                </div>
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
