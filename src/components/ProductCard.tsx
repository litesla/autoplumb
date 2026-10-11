import React, { useState } from 'react';
import { ShoppingCart, Check, Package } from 'lucide-react';
import { Product, triggerFlyToCart } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { getSanitizedProductImage, getCuratedFallback } from '../services/productImageService';

interface ProductCardProps {
  product: Product;
  showButtons?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showButtons = true }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const initialImage = getSanitizedProductImage(product);
  const [currentImg, setCurrentImg] = useState(initialImage);
  const [hasFailed, setHasFailed] = useState(false);

  // Sync state if product changes
  React.useEffect(() => {
    setCurrentImg(getSanitizedProductImage(product));
    setHasFailed(false);
  }, [product.id, product.image, product.image_url]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button')) {
      navigate(`/product/${product.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerFlyToCart(currentImg, e);
    addItem({ ...product, image: currentImg });
  };

  const handleImageError = () => {
    if (!hasFailed) {
      setHasFailed(true);
      const fallback = getCuratedFallback(product.name, product.type, product.category, product.id);
      setCurrentImg(fallback);
    }
  };

  const isInStock = (product.stock === undefined || product.stock > 0);

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 h-full flex flex-col cursor-pointer overflow-hidden"
    >
      {/* Product Image Container */}
      <div className="aspect-square bg-slate-50 dark:bg-zinc-800/50 relative overflow-hidden flex items-center justify-center p-3 border-b border-slate-100 dark:border-zinc-800/60">
        {currentImg ? (
          <img
            src={currentImg}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 dark:text-zinc-600 gap-1">
            <Package size={36} strokeWidth={1.5} />
            <span className="text-[11px]">Фото деталі</span>
          </div>
        )}
      </div>
      
      {/* Product Body */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          {/* Metadata line: Unboxed text with dot separators */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1.5 font-medium">
            <div className="flex items-center gap-1.5 truncate">
              {product.brand && <span className="font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">{product.brand}</span>}
              {product.brand && product.article && <span aria-hidden="true">·</span>}
              {product.article && <span className="tabular-nums">Арт. {product.article}</span>}
            </div>
            
            {isInStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                <Check size={12} strokeWidth={2.5} />
                <span>В наявності</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 shrink-0">
                Під замовлення
              </span>
            )}
          </div>

          {/* Product Title */}
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </div>

        {/* Pricing and Action row */}
        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 mt-auto">
          <div>
            <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {product.price.toLocaleString('uk-UA')} <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">грн</span>
            </div>
          </div>
          
          <button 
            onClick={handleAddToCart}
            aria-label="Додати в кошик"
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <ShoppingCart size={15} />
            <span className="hidden sm:inline">Купити</span>
          </button>
        </div>
      </div>
    </div>
  );
};
