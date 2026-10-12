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
            
            {/* Mode Switcher: Segmented Control Tabs */}
            <div className="flex w-full sm:inline-flex p-1 bg-slate-200/70 dark:bg-zinc-900 rounded-lg border border-slate-300/50 dark:border-zinc-800">
              <button
                onClick={() => { setMode('auto'); setSelectedCategory(null); }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'auto'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Car size={15} />
                <span>Авто та МТЗ</span>
              </button>
              <button
                onClick={() => { setMode('plumbing'); setSelectedCategory(null); }}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'plumbing'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Droplets size={15} />
                <span>Сантехніка</span>
              </button>
            </div>

            {/* Natural, Solid Editorial Headline (No AI iridescent gradients) */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                {mode === 'auto' 
                  ? 'Запчастини для авто, тракторів МТЗ/ЮМЗ та сільгосптехніки' 
                  : 'Сантехніка, труби та системи опалення для дому і підприємств'}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                Складський асортимент у наявності. Швидка відправка Новою Поштою по всій Україні, гарантія якості та оплата при отриманні.
              </p>
            </div>

            {/* Quick Categories Bar */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                Популярні категорії:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      const el = document.getElementById('products');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium rounded-md border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA action to jump straight into products */}
            <div className="pt-2">
              <button
                onClick={() => {
                  const el = document.getElementById('products');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <span>Переглянути весь каталог</span>
                <ChevronRight size={14} />
              </button>
            </div>

          </div>

          {/* RIGHT: Featured Product Spotlight Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
              
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pb-3 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Товар дня
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={12} strokeWidth={2.5} />
                  <span>В наявності</span>
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {/* Product Image */}
                <div className="w-full h-56 bg-slate-50 dark:bg-zinc-800/40 rounded-xl overflow-hidden flex items-center justify-center p-3 border border-slate-100 dark:border-zinc-800/60">
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
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
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                    <span>{currentSlide.brand || 'AutoPlumb'}</span>
                    {currentSlide.article && <span> · Арт. {currentSlide.article}</span>}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                    {currentSlide.name}
                  </h3>
                  {currentSlide.description && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {currentSlide.description}
                    </p>
                  )}
                </div>

                {/* Pricing & Buy */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {currentSlide.price.toLocaleString('uk-UA')} <span className="text-xs font-normal text-slate-500">грн</span>
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleBuyNow(currentSlide, e)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
                  >
                    <ShoppingCart size={14} />
                    <span>Купити</span>
                  </button>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Trust & Advantages Bar (Essential for genuine retail e-commerce credibility) */}
      <div className="bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800/80 py-4">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shrink-0">
                <Truck size={20} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Швидка доставка</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Нова Пошта 1–2 дні</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shrink-0">
                <CreditCard size={20} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Оплата при отриманні</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">Накладений платіж</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shrink-0">
                <ShieldCheck size={20} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Гарантія та повернення</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">14 днів на обмін</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 shrink-0">
                <Headphones size={20} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Підбір деталей</div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">+380 68 918 0637</div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </section>
  );
};
