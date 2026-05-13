import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Product } from '../lib/utils';
import { useCart } from '../context/CartContext';

import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
  showButtons?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showButtons = true }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Navigate to product page unless a button or its child was clicked
    if (!(e.target as HTMLElement).closest('button')) {
      navigate(`/product/${product.id}`);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-300 h-full flex flex-col cursor-pointer"
    >
      <div className="aspect-square bg-gray-50 dark:bg-gray-800 relative overflow-hidden shrink-0">
        <img
          src={product.image || `https://picsum.photos/seed/${product.id}/400/400`}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider dark:text-white rounded-full shadow-sm">
            {product.category}
          </span>
        </div>
      </div>
      
      <div className="p-3 md:p-6 flex flex-col flex-1">
        {product.brand && (
          <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-blue-600/60 dark:text-blue-400/60 mb-1">
            {product.brand}
          </div>
        )}
        <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white mb-2 md:mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight md:leading-snug min-h-[2.5rem] md:min-h-[3.5rem]">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="text-base md:text-xl font-black text-gray-900 dark:text-white shrink-0">
            {product.price.toLocaleString()} <span className="text-[10px] md:text-xs">грн</span>
          </div>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product);
            }}
            className="p-3 md:p-2.5 bg-blue-600 text-white md:bg-gray-50 md:dark:bg-gray-800 md:text-gray-900 md:dark:text-white rounded-xl active:scale-95 transition-all shadow-lg shadow-blue-600/20 md:shadow-none"
          >
            <ShoppingCart size={20} className="md:hidden" />
            <ShoppingCart size={18} className="hidden md:block" />
          </button>
        </div>
        
        {showButtons && (
          <div className="hidden md:grid grid-cols-2 gap-3 mt-4">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addItem(product);
              }}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              <ShoppingCart size={18} />
              <span>В кошик</span>
            </button>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addItem(product);
                navigate('/checkout');
              }}
              className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white py-3 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Замовити
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
