import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Product, triggerFlyToCart } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  showButtons?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, showButtons = true }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const getFirstProductImage = (imgStr?: string) => {
    if (!imgStr) return '';
    const parts = imgStr.split(/,(?=\s*(?:https?:|data:))/i);
    return parts[0]?.trim() || '';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Navigate to product page unless a button or its child was clicked
    if (!(e.target as HTMLElement).closest('button')) {
      navigate(`/product/${product.id}`);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleanImg = getFirstProductImage(product.image) || `https://picsum.photos/seed/${product.id}/400/400`;
    triggerFlyToCart(cleanImg, e);
    addItem(product);
  };

  return (
    <motion.div 
      onClick={handleCardClick}
      whileHover={{ 
        scale: 1.025,
        y: -6,
        boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.15)"
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-300 h-full flex flex-col cursor-pointer"
    >
      <div className="aspect-square bg-gray-50 dark:bg-gray-800 relative overflow-hidden shrink-0">
        <img
          src={getFirstProductImage(product.image) || `https://picsum.photos/seed/${product.id}/400/400`}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
            onClick={handleAddToCart}
            className="p-3 md:p-2.5 bg-blue-600 text-white md:bg-gray-50 md:dark:bg-gray-800 md:text-gray-900 md:dark:text-white rounded-xl active:scale-90 transition-all shadow-lg shadow-blue-600/20 md:shadow-none hover:bg-blue-700 md:hover:bg-blue-100 md:dark:hover:bg-blue-900/50 cursor-pointer"
          >
            <ShoppingCart size={20} className="md:hidden" />
            <ShoppingCart size={18} className="hidden md:block" />
          </button>
        </div>
        
        {showButtons && (
          <div className="hidden md:grid grid-cols-2 gap-3 mt-4">
            <button 
              onClick={handleAddToCart}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors cursor-pointer active:scale-95"
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
              className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white py-3 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-95"
            >
              Замовити
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
