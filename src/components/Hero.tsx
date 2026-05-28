import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { triggerFlyToCart, Product } from '../lib/utils';
import { Car, Droplets, ShoppingCart, Sparkles, Zap, ChevronRight, Check } from 'lucide-react';

const getFirstProductImage = (imgStr?: string) => {
  if (!imgStr) return '';
  const parts = imgStr.split(/,(?=\s*(?:https?:|data:))/i);
  return parts[0]?.trim() || '';
};

export const Hero: React.FC = () => {
  const { mode, setMode } = useShop();
  const { addItem } = useCart();
  
  const [slideIndex, setSlideIndex] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured products based on current active shop mode
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
            image: p.image_url || p.image || `https://picsum.photos/seed/${p.id}/400/400`
          })) as Product[]);
        } else {
          // Dynamic fallback when Database is empty
          setFeaturedProducts(mode === 'auto' ? fallbackAuto : fallbackPlumb);
        }
      } catch (err) {
        console.error("Error fetching featured products for Hero:", err);
        setFeaturedProducts(mode === 'auto' ? fallbackAuto : fallbackPlumb);
      } finally {
        setLoading(false);
        setSlideIndex(0); // Reset slide on category mode shift
      }
    };

    fetchFeatured();
  }, [mode]);

  // Fallbacks for offline / brand-new DB setup
  const fallbackAuto: Product[] = [
    {
      id: "fallback-auto-1",
      name: "Акумулятор Premium Gold 12V 60Ah",
      price: 3450,
      category: "Акумулятори",
      description: "Надійний пуск у будь-який мороз. Збільшений термін роботи та високий пусковий струм.",
      image: "https://images.unsplash.com/photo-1620843111007-88ebf23fcfe8?auto=format&fit=crop&q=80&w=600",
      stock: 12,
      type: "auto",
      brand: "Premium Gold"
    },
    {
      id: "fallback-auto-2",
      name: "Емблема решітки радіатора МТЗ",
      price: 299,
      category: "Аксесуари",
      description: "Оригінальний вигляд, зносостійкий метал з хромуванням високої якості.",
      image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&q=80&w=600",
      stock: 25,
      type: "auto",
      brand: "МТЗ"
    }
  ];

  const fallbackPlumb: Product[] = [
    {
      id: "fallback-plumb-1",
      name: "Змішувач для кухні Flexible Aqua",
      price: 1890,
      category: "Змішувачі",
      description: "Зручний гнучкий вилив з розпилювачем води на два режими роботи.",
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600",
      stock: 15,
      type: "plumbing",
      brand: "AquaFit"
    },
    {
      id: "fallback-plumb-2",
      name: "Колектор поліпропіленовий на 4 виходи",
      price: 1240,
      category: "Опалення",
      description: "Рівномірний розподіл води та найкращий контроль тиску у системі.",
      image: "https://images.unsplash.com/photo-1605647540924-852290f6b0d5?auto=format&fit=crop&q=80&w=600",
      stock: 8,
      type: "plumbing",
      brand: "Valtec"
    }
  ];

  // Rotate banner slide elegantly every 5.5 seconds (only when multi-slide available)
  useEffect(() => {
    if (featuredProducts.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % featuredProducts.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [featuredProducts]);

  const handleBuyNow = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanImg = getFirstProductImage(product.image) || `https://picsum.photos/seed/${product.id}/400/400`;
    triggerFlyToCart(cleanImg, e);
    addItem(product);
  };

  const currentSlide = featuredProducts[slideIndex] || (mode === 'auto' ? fallbackAuto[0] : fallbackPlumb[0]);

  return (
    <section className="relative w-full bg-slate-50 dark:bg-zinc-950 py-5 sm:py-8 md:py-12 border-b border-gray-100 dark:border-zinc-900 overflow-hidden">
      
      {/* Decorative ambient gradients - Hidden on mobile for peak rendering speed and battery life */}
      <div className="hidden md:block absolute top-1/4 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden md:block absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-center">
          
          {/* LEFT SIDE: Brand presentation and Mode Toggle */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
            
            {/* Minimalist Pill Accent */}
            <div className="inline-flex items-center bg-blue-50/75 dark:bg-zinc-900 border border-blue-100/40 dark:border-zinc-800 px-2.5 py-0.5 rounded-full">
              <span className="text-[9px] font-black uppercase tracking-wider text-blue-900/80 dark:text-blue-400">
                Кращі ціни в Україні
              </span>
            </div>

            {/* Title with crisp font tracking */}
            <h1 className="text-[22px] sm:text-4xl lg:text-5xl font-black text-gray-950 dark:text-white tracking-tight leading-tight">
              AutoPlumb — інтернет-магазин <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-600 dark:from-blue-400 dark:to-emerald-400">
                запчастин та сантехніки
              </span>
            </h1>

            <p className="text-[11px] sm:text-sm text-gray-400 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-semibold">
              Швидке та зручне замовлення деталей до тракторів МТЗ/ЮМЗ, автомобілів, а також імпортної сантехніки та систем опалення з швидкою доставкою.
            </p>

            {/* MOBILITY OPTIMIZED SEGMENTED CONTROL / TABS
                Instead of huge blocks, this replaces it with a beautiful, fast iOS-style switcher.
                Saves tons of screen height on mobile and feels instantly professional! */}
            <div className="max-w-md mx-auto lg:mx-0 pt-2 px-1">
              <div className="relative bg-gray-100 dark:bg-zinc-900 p-1 rounded-2xl flex border border-gray-200/40 dark:border-zinc-800/80">
                
                {/* Mode Button: Auto */}
                <button
                  onClick={() => setMode('auto')}
                  className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'auto'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-zinc-200'
                  }`}
                >
                  <Car size={14} className="shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Запчастини</span>
                    <span className="hidden sm:inline">Автозапчастини ({fallbackAuto.length})</span>
                  </span>
                </button>

                {/* Mode Button: Plumbing */}
                <button
                  onClick={() => setMode('plumbing')}
                  className={`flex-1 py-2 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'plumbing'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/15'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-zinc-200'
                  }`}
                >
                  <Droplets size={14} className="shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Сантехніка</span>
                    <span className="hidden sm:inline">Сантехніка та опалення</span>
                  </span>
                </button>
                
              </div>
            </div>

            {/* Quick action button for direct store check */}
            <div className="flex justify-center lg:justify-start pt-1 pb-2">
              <button
                onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                className="group inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-gray-200/40 dark:border-zinc-800/60 text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300 rounded-full transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <span>Переглянути весь асортимент</span>
                <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>

          {/* RIGHT SIDE: Single beautiful featured product card (highly optimized for mobile screens) */}
          <div className="lg:col-span-12 xl:col-span-5 flex justify-center w-full px-1">
            <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl shadow-xl shadow-gray-200/40 dark:shadow-none p-4 sm:p-5 relative group/card transition-all duration-300 hover:shadow-gray-200/60 dark:hover:border-zinc-700">
              
              {/* Product Layout: Always column-based for perfect mobile proportion */}
              <div className="flex flex-col gap-3.5 items-stretch">
                
                {/* Product Visual */}
                <div className="w-full h-44 sm:h-56 md:h-64 lg:h-auto lg:aspect-square rounded-2xl bg-gray-50 dark:bg-zinc-805 overflow-hidden shrink-0 relative">
                  
                  {/* Floating Department Badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${
                      mode === 'auto' 
                        ? 'bg-blue-50/90 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40' 
                        : 'bg-emerald-50/90 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40'
                    }`}>
                      {mode === 'auto' ? 'Запчастини' : 'Сантехніка'}
                    </span>
                  </div>

                  {loading ? (
                    <div className="w-full h-full animate-pulse bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <img
                      src={getFirstProductImage(currentSlide.image)}
                      alt={currentSlide.name}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Product Metadata & Info */}
                <div className="flex-1 min-w-0 space-y-2 flex flex-col justify-between">
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                      <span className="text-gray-400 dark:text-zinc-500 truncate max-w-[120px]">{currentSlide.brand}</span>
                      <span className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5 shrink-0">
                        <Zap size={9} className="fill-current animate-pulse" />
                        Популярне
                      </span>
                    </div>

                    <h3 className="font-bold text-sm sm:text-base text-gray-950 dark:text-white leading-snug truncate">
                      {currentSlide.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 dark:text-zinc-500 font-medium line-clamp-2 leading-snug">
                      {currentSlide.description}
                    </p>
                  </div>

                  {/* Pricing and Action row */}
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-850 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-base sm:text-lg font-black text-gray-950 dark:text-white">
                        {currentSlide.price} <span className="text-[10px] font-semibold text-gray-400">грн</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleBuyNow(currentSlide, e)}
                      disabled={loading}
                      className={`px-4 py-2.5 text-xs font-black text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                        mode === 'auto'
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                      }`}
                    >
                      <ShoppingCart size={13} />
                      <span>Купити</span>
                    </button>
                  </div>

                </div>

              </div>

              {/* Pagination Dots */}
              {featuredProducts.length > 1 && (
                <div className="flex justify-center space-x-1 mt-3">
                  {featuredProducts.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSlideIndex(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === slideIndex 
                          ? mode === 'auto' ? 'bg-blue-500 w-3' : 'bg-emerald-500 w-3'
                          : 'bg-gray-200 dark:bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

    </section>
  );
};
