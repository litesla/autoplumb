import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, User, LayoutGrid, Heart, Send } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../lib/telegram';
import { useTelegram } from '../hooks/useTelegram';

interface BottomNavProps {
  onCartOpen: () => void;
  onCategoriesOpen: () => void;
  onTelegramOpen?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  onCartOpen, 
  onCategoriesOpen, 
  onTelegramOpen 
}) => {
  const location = useLocation();
  const { items, total } = useCart();
  const { wishlist } = useWishlist();
  const { isTelegram } = useTelegram();

  const isActive = (path: string) => location.pathname === path;
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleNavClick = (path?: string) => {
    triggerHaptic('selection');
  };

  return (
    <nav 
      aria-label="Мобільна навігація"
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom,0.6rem))] pt-1 pointer-events-none"
    >
      <div className="pointer-events-auto max-w-md mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-zinc-800/80 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] px-2 h-16 flex items-center justify-around">
        
        {/* Головна */}
        <Link 
          to="/" 
          onClick={() => handleNavClick('/')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative py-1 ${
            isActive('/') ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isActive('/') && (
             <motion.div layoutId="nav-glow" className="absolute top-1 w-6 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
          )}
          <Home size={20} strokeWidth={isActive('/') ? 2.5 : 2} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Головна</span>
        </Link>

        {/* Каталог */}
        <button 
          onClick={() => {
            triggerHaptic('light');
            onCategoriesOpen();
          }}
          className="flex flex-col items-center justify-center flex-1 h-full text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all py-1"
        >
          <LayoutGrid size={20} />
          <span className="text-[10px] font-bold mt-1 tracking-tight">Каталог</span>
        </button>

        {/* Кошик */}
        <button 
          onClick={() => {
            triggerHaptic('medium');
            onCartOpen();
          }}
          className="flex flex-col items-center justify-center flex-1 h-full text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all relative py-1"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[9px] font-black min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-[10px] font-bold mt-1 tracking-tight">
            {cartCount > 0 ? `${total.toLocaleString('uk-UA')} ₴` : 'Кошик'}
          </span>
        </button>

        {/* Вибране */}
        <Link 
          to="/wishlist" 
          onClick={() => handleNavClick('/wishlist')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative py-1 ${
            isActive('/wishlist') ? 'text-rose-500 font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isActive('/wishlist') && (
             <motion.div layoutId="nav-glow" className="absolute top-1 w-6 h-1 bg-rose-500 rounded-full" />
          )}
          <div className="relative">
            <Heart size={20} className={wishlist.length > 0 ? "fill-rose-500 text-rose-500" : ""} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                {wishlist.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Вибране</span>
        </Link>

        {/* Telegram Mini App / Профіль */}
        {onTelegramOpen ? (
          <button
            onClick={() => {
              triggerHaptic('light');
              onTelegramOpen();
            }}
            className="flex flex-col items-center justify-center flex-1 h-full text-sky-500 hover:text-sky-600 active:scale-95 transition-all py-1"
          >
            <div className="relative">
              <Send size={19} className="-ml-0.5" />
              {isTelegram && (
                <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
              )}
            </div>
            <span className="text-[10px] font-black mt-1 tracking-tight">TG App</span>
          </button>
        ) : (
          <Link 
            to="/profile" 
            onClick={() => handleNavClick('/profile')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative py-1 ${
              isActive('/profile') ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {isActive('/profile') && (
               <motion.div layoutId="nav-glow" className="absolute top-1 w-6 h-1 bg-blue-600 rounded-full" />
            )}
            <User size={20} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">Профіль</span>
          </Link>
        )}

      </div>
    </nav>
  );
};
