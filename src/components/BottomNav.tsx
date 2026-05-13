import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, LayoutGrid, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { motion, AnimatePresence } from 'motion/react';

interface BottomNavProps {
  onCartOpen: () => void;
  onCategoriesOpen: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onCartOpen, onCategoriesOpen }) => {
  const location = useLocation();
  const { items } = useCart();
  const { wishlist } = useWishlist();

  const isActive = (path: string) => location.pathname === path;

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100]">
      <div className="bg-white/90 dark:bg-black/90 backdrop-blur-3xl border border-gray-100/50 dark:border-gray-800/50 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-none px-2 h-16 flex items-center justify-around">
        <Link 
          to="/" 
          className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
            isActive('/') ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          {isActive('/') && (
             <motion.div layoutId="nav-glow" className="absolute top-1 w-8 h-1 bg-blue-600 rounded-full" />
          )}
          <Home size={22} strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-wider">Головна</span>
        </Link>

        <button 
          onClick={onCategoriesOpen}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-blue-600 transition-all"
        >
          <LayoutGrid size={22} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-wider">Каталог</span>
        </button>

        <button 
          onClick={onCartOpen}
          className="flex flex-col items-center justify-center w-full h-full text-gray-400 active:text-blue-600 transition-all relative"
        >
          <div className="relative">
            <ShoppingCart size={22} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] font-black min-w-[16px] h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-black"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[7px] font-black mt-1 uppercase tracking-wider">Кошик</span>
        </button>

        <Link 
          to="/wishlist" 
          className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
            isActive('/wishlist') ? 'text-red-500' : 'text-gray-400'
          }`}
        >
          {isActive('/wishlist') && (
             <motion.div layoutId="nav-glow" className="absolute top-1 w-8 h-1 bg-red-500 rounded-full" />
          )}
          <Heart size={22} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : ""} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-wider">Вибране</span>
        </Link>

        <Link 
          to="/profile" 
          className={`flex flex-col items-center justify-center w-full h-full transition-all relative ${
            isActive('/profile') ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          {isActive('/profile') && (
             <motion.div layoutId="nav-glow" className="absolute top-1 w-8 h-1 bg-blue-600 rounded-full" />
          )}
          <User size={22} strokeWidth={isActive('/profile') ? 2.5 : 2} />
          <span className="text-[7px] font-black mt-1 uppercase tracking-wider">Профіль</span>
        </Link>
      </div>
    </div>
  );
};
