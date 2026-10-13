import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Check, 
  Car, 
  Droplets, 
  Layers 
} from 'lucide-react';
import { Product, triggerFlyToCart } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { getSanitizedProductImage, getCuratedFallback } from '../services/productImageService';
import { triggerHaptic } from '../lib/telegram';

interface RecommendationCarouselProps {
  id: string;
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeType?: 'primary' | 'accent' | 'hot' | 'sale';
  icon?: 'flame' | 'sparkles';
  products: Product[];
  currentMode?: 'auto' | 'plumbing' | null;
  onViewAll?: () => void;
}

export const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  id,
  title,
  subtitle,
  badgeText,
  badgeType = 'primary',
  icon = 'flame',
  products,
  currentMode,
  onViewAll
}) => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'plumbing'>('all');

  // Filter items if user toggled the internal tab
  const filteredProducts = products.filter(p => {
    if (filterType === 'all') return true;
    return p.type === filterType;
  });

  const scroll = (direction: 'left' | 'right') => {
    triggerHaptic('light');
    if (!scrollContainerRef.current) return;
    const scrollAmount = 340;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('medium');
    const cleanImg = getSanitizedProductImage(product);
    triggerFlyToCart(cleanImg, e);
    addItem({ ...product, image: cleanImg });
  };

  const getBadgeClasses = () => {
    switch (badgeType) {
      case 'hot':
        return 'bg-gradient-to-r from-amber-500/15 to-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/40';
      case 'sale':
        return 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/40';
      case 'accent':
        return 'bg-gradient-to-r from-violet-500/15 to-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/40';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/40';
    }
  };

  return (
    <section className="py-10 bg-slate-50/70 dark:bg-zinc-950/70 border-b border-slate-200/80 dark:border-zinc-800 transition-colors">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="space-y-1.5">
            {badgeText && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getBadgeClasses()}`}>
                  <span>{badgeText}</span>
                </span>
              </div>
            )}

            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium max-w-xl">
              {subtitle}
            </p>
          </div>

          {/* Controls: Segment tabs + Carousel arrows */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* Quick Segment Filter */}
            <div className="inline-flex p-1 bg-slate-200/70 dark:bg-zinc-900 rounded-lg border border-slate-300/40 dark:border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setFilterType('all');
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Layers size={13} />
                <span>Всі</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setFilterType('auto');
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'auto'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Car size={13} />
                <span>Авто</span>
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setFilterType('plumbing');
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'plumbing'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                }`}
              >
                <Droplets size={13} />
                <span>Сантехніка</span>
              </button>
            </div>

            {/* Left / Right arrows (Desktop & Tablet) */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => scroll('left')}
                aria-label="Попередні рекомендації"
                className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                onClick={() => scroll('right')}
                aria-label="Наступні рекомендації"
                className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Carousel Track */}
        <div
          id={id}
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-3 sm:gap-5 pb-3 sm:pb-4 pt-1 scrollbar-hide snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredProducts.map((product) => {
            const cleanImg = getSanitizedProductImage(product);
            const isInStock = product.stock === undefined || product.stock > 0;

            return (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                className="group shrink-0 w-[205px] sm:w-[280px] snap-start bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/90 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer overflow-hidden"
              >
                {/* Product Image Box */}
                <div className="relative aspect-square bg-slate-50 dark:bg-zinc-800/40 p-4 border-b border-slate-100 dark:border-zinc-800/60 overflow-hidden flex items-center justify-center">
                  <img
                    src={cleanImg}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fb = getCuratedFallback(product.name, product.type, product.category, product.id);
                      if (e.currentTarget.src !== fb) {
                        e.currentTarget.src = fb;
                      }
                    }}
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                    {product.type === 'auto' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                        АВТО
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white shadow-xs">
                        САНТЕХНІКА
                      </span>
                    )}
                  </div>

                  {/* In-Stock status */}
                  <div className="absolute bottom-2 left-2.5 flex items-center text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-white/90 dark:bg-zinc-900/90 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      <Check size={11} strokeWidth={2.5} />
                      <span>{isInStock ? 'В наявності' : 'Під замовлення'}</span>
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
                  <div>
                    {/* Brand & Article */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500 font-medium mb-1 truncate">
                      {product.brand && (
                        <span className="font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                          {product.brand}
                        </span>
                      )}
                      {product.brand && product.article && <span>·</span>}
                      {product.article && (
                        <span>Арт. {product.article}</span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {product.name}
                    </h4>

                    {/* Category */}
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 truncate">
                      {product.category}
                    </p>
                  </div>

                  {/* Price & Buy Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 mt-auto">
                    <div>
                      <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {product.price.toLocaleString('uk-UA')} <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">грн</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAddToCart(product, e)}
                      aria-label="Купити товар"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-blue-600 dark:bg-white dark:hover:bg-blue-500 text-white dark:text-slate-900 dark:hover:text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart size={13} />
                      <span className="hidden sm:inline">Купити</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
