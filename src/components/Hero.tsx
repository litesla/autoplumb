import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { triggerFlyToCart, Product } from '../lib/utils';
import { Car, Droplets, ShoppingCart, Truck, ShieldCheck, CreditCard, Headphones, Check, ChevronRight } from 'lucide-react';
import { getSanitizedProductImage, getCuratedFallback } from '../services/productImageService';

const getFirstProductImage = (imgStr?: string, product?: any) => {
  if (product) return getSanitizedProductImage(product);
  if (!imgStr) return '';
  const parts = imgStr.split(/,(?=\s*(?:https?:|data:))/i);
  return parts[0]?.trim() || '';
};

export const Hero: React.FC = () => {
  const { mode, setMode, setSelectedCategory } = useShop();
  const { addItem } = useCart();
  
  const [slideIndex, setSlideIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fallbacks for offline or when database query completes
  const fallbackAuto: Product[] = [
    {
      id: "fallback-auto-1",
      name: "Акумулятор Premium Gold 12V 60Ah",
      price: 3450,
      category: "Акумулятори",
      description: "Надійний пуск у будь-який мороз. Збільшений ресурс пластин та високий пусковий струм.",
      image: "/images/car_battery_clean.jpg",
      stock: 12,
      type: "auto",
      brand: "Premium Gold",
      article: "PG-60AH"
    },
    {
      id: "fallback-auto-2",
      name: "Тяга навіски та зчеплення МТЗ посилена",
      price: 1290,
      category: "Трактори МТЗ",
      description: "Оригінальна заводська геометрія, зносостійка кована сталь, посилене з'єднання.",
      image: "/images/tractor_hitch_clean.jpg",
      stock: 25,
      type: "auto",
      brand: "МТЗ",
      article: "MTZ-014"
    }
  ];

  const fallbackPlumb: Product[] = [
    {
      id: "fallback-plumb-1",
      name: "Змішувач для кухні Flexible Aqua хромований",
      price: 1890,
      category: "Змішувачі",
      description: "Зручний гнучкий вилив з розпилювачем води на два режими роботи, керамічний картридж.",
      image: "/images/plumbing_faucet_clean.jpg",
      stock: 15,
      type: "plumbing",
      brand: "AquaFit",
      article: "AQ-7201"
    },
    {
      id: "fallback-plumb-2",
      name: "Радіатор алюмінієвий секційний 500/100",
      price: 2450,
      category: "Опалення",
      description: "Висока тепловіддача, європейський стандарт надійності та довговічності.",
      image: "/images/heating_radiator_clean.jpg",
      stock: 8,
      type: "plumbing",
      brand: "Valtec",
      article: "VT-404"
    }
  ];

  useEffect(() => {
    const fetchFeatured = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('type', mode)
          .limit(4);

        if (data && data.length > 0) {
          setFeaturedProducts(data.map(p => ({ 
            ...p, 
            image: getSanitizedProductImage(p)
          })) as Product[]);
        } else {
          setFeaturedProducts(mode === 'auto' ? fallbackAuto : fallbackPlumb);
        }
      } catch (err) {
        console.error("Error fetching featured products for Hero:", err);
        setFeaturedProducts(mode === 'auto' ? fallbackAuto : fallbackPlumb);
      } finally {
        setLoading(false);
        setSlideIndex(0);
      }
    };

    fetchFeatured();
  }, [mode]);

  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % featuredProducts.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredProducts]);

  const handleBuyNow = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanImg = getFirstProductImage(product.image, product);
    triggerFlyToCart(cleanImg, e);
    addItem({ ...product, image: cleanImg });
  };

  const currentSlide = featuredProducts[slideIndex] || (mode === 'auto' ? fallbackAuto[0] : fallbackPlumb[0]);

  // Quick categories for direct 1-click discovery
  const autoCategories = [
    "Трактори МТЗ", "Запчастини ЮМЗ", "Акумулятори", "Автохімія та оливи", "Фільтри", "Електрообладнання"
  ];

  const plumbCategories = [
    "Змішувачі", "Опалення", "Радіатори", "Труби та фітинги", "Водонагрівачі", "Каналізація"
  ];

  const quickCategories = mode === 'auto' ? autoCategories : plumbCategories;

  return (
    <section className="w-full bg-slate-50 dark:bg-zinc-950 border-b border-slate-200/80 dark:border-zinc-800">
      
      {/* Main Hero Container */}
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          
          {/* LEFT: Storefront Mission & Navigation */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            
            {/* Mode Switcher: Premium Segmented Control Tabs (Desktop & Tablet) */}
            <div className="hidden md:inline-flex w-full sm:w-auto p-1.5 bg-slate-200/60 dark:bg-zinc-900/90 rounded-2xl border border-slate-300/80 dark:border-zinc-800 shadow-sm backdrop-blur-sm">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => { setMode('auto'); setSelectedCategory(null); }}
                  className={`flex items-center justify-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                    mode === 'auto'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-md shadow-slate-300/40 dark:shadow-black/60 ring-1 ring-slate-900/5 dark:ring-white/10'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className={`p-1 rounded-lg transition-colors ${
                    mode === 'auto' 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' 
                      : 'text-slate-500 dark:text-zinc-400'
                  }`}>
                    <Car size={16} strokeWidth={2.2} />
                  </span>
                  <span>Авто та МТЗ</span>
                  <span className={`hidden sm:inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors ${
                    mode === 'auto'
                      ? 'bg-blue-100/70 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-slate-200/70 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    Каталог
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('plumbing'); setSelectedCategory(null); }}
                  className={`flex items-center justify-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
                    mode === 'plumbing'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-md shadow-slate-300/40 dark:shadow-black/60 ring-1 ring-slate-900/5 dark:ring-white/10'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className={`p-1 rounded-lg transition-colors ${
                    mode === 'plumbing' 
                      ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400' 
                      : 'text-slate-500 dark:text-zinc-400'
                  }`}>
                    <Droplets size={16} strokeWidth={2.2} />
                  </span>
                  <span>Сантехніка</span>
                  <span className={`hidden sm:inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors ${
                    mode === 'plumbing'
                      ? 'bg-cyan-100/70 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300'
                      : 'bg-slate-200/70 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    Опалення
                  </span>
                </button>
              </div>
            </div>

            {/* Natural, Solid Editorial Headline */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-xl sm:text-3xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.2]">
                {mode === 'auto' 
                  ? 'Запчастини для авто, тракторів МТЗ/ЮМЗ та сільгосптехніки' 
                  : 'Сантехніка, труби та системи опалення для дому і підприємств'}
              </h1>

              <p className="text-xs sm:text-base text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                Складський асортимент у наявності. Швидка відправка Новою Поштою по всій Україні, гарантія якості та оплата при отриманні.
              </p>
            </div>

            {/* Quick Categories Bar with Horizontal Scroll on Mobile */}
            <div className="space-y-1.5 sm:space-y-2 pt-1">
              <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                Популярні категорії:
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar">
                {quickCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      const el = document.getElementById('products');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[11px] sm:text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer active:scale-95"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA action to jump straight into products */}
            <div className="pt-1 sm:pt-2">
              <button
                onClick={() => {
                  const el = document.getElementById('products');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                <span>Переглянути весь каталог</span>
                <ChevronRight size={14} />
              </button>
            </div>

          </div>

          {/* RIGHT: Featured Product Spotlight Card */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-5 shadow-xs">
              
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>Товар дня</span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <Check size={12} strokeWidth={2.5} />
                  <span>В наявності</span>
                </span>
              </div>

              {/* Responsive layout: on mobile, compact horizontal card; on lg screen, full vertical showcase */}
              <div className="mt-3 sm:mt-4 flex flex-row lg:flex-col gap-3 sm:gap-4 items-center lg:items-stretch">
                {/* Product Image */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-full lg:h-56 shrink-0 bg-slate-50 dark:bg-zinc-800/40 rounded-xl overflow-hidden flex items-center justify-center p-2 sm:p-3 border border-slate-100 dark:border-zinc-800/60">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                  ) : (
                    <img
                      src={getFirstProductImage(currentSlide.image, currentSlide)}
                      alt={currentSlide.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const fallback = getCuratedFallback(currentSlide.name, currentSlide.type, currentSlide.category, currentSlide.id);
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                    />
                  )}
                </div>

                {/* Metadata & Title */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1.5">
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                      <span>{currentSlide.brand || 'AutoPlumb'}</span>
                      {currentSlide.article && <span> · Арт. {currentSlide.article}</span>}
                    </div>
                    <h3 className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {currentSlide.name}
                    </h3>
                    {currentSlide.description && (
                      <p className="hidden lg:block text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                        {currentSlide.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing & Buy */}
                  <div className="pt-2 sm:pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {currentSlide.price.toLocaleString('uk-UA')} <span className="text-[11px] font-normal text-slate-500">грн</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleBuyNow(currentSlide, e)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                    >
                      <ShoppingCart size={13} />
                      <span>Купити</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Trust & Advantages Bar (Essential retail credentials, cleanly formatted for mobile & desktop) */}
      <div className="bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800/80 py-3 sm:py-4">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            
            <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 shadow-2xs">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Truck size={17} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Швидка доставка</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">Нова Пошта 1–2 дні</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 shadow-2xs">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CreditCard size={17} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Оплата при отриманні</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">Накладений платіж</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 shadow-2xs">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldCheck size={17} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Гарантія якості</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">14 днів на повернення</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60 shadow-2xs">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <Headphones size={17} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold text-slate-900 dark:text-white leading-tight">Підбір деталей</div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-tight">+380 68 918 0637</div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </section>
  );
};
