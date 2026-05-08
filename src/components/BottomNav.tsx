import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, LayoutGrid, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { motion, AnimatePresence } from 'motion/react';

interface BottomNavProps {
  onCartOpen: () => void;
  onAIOpen: () => void;
  onCategoriesOpen: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onCartOpen, onAIOpen, onCategoriesOpen }) => {
  const location = useLocation();
  const { items } = useCart();
  const { wishlist } = useWishlist();

  const isActive = (path: string) => location.pathname === path;

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100]">
      <div className="bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-gray-100/50 dark:border-gray-800/50 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none px-2 h-16 flex items-center justify-around">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full transition-all ${
            isActive('/') ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <Home size={22} className={isActive('/') ? 'fill-blue-600/10' : ''} />
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Головна</span>
        </Link>

        <button 
          onClick={onCategoriesOpen}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-blue-600 transition-all"
        >
          <LayoutGrid size={22} />
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Каталог</span>
        </button>

        <button 
          onClick={onAIOpen}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-blue-600 transition-all"
        >
          <div className="relative">
            <Sparkles size={22} className="text-blue-600" />
          </div>
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter text-blue-600">AI</span>
        </button>

        <button 
          onClick={onCartOpen}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-blue-600 transition-all"
        >
          <div className="relative">
            <ShoppingCart size={22} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-lg shadow-blue-600/20"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Кошик</span>
        </button>

        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center w-full h-full transition-all ${
            isActive('/profile') ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <User size={22} className={isActive('/profile') ? 'fill-blue-600/10' : ''} />
          <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Профіль</span>
        </Link>
      </div>
    </div>
  );
};
