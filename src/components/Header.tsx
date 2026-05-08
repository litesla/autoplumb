import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Search, ShoppingCart, User, Menu, ChevronDown, Phone, MessageSquare, Tag, Percent, Sparkles, LogOut, Settings, X, ArrowRight, Heart, Moon, Sun, SlidersHorizontal } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product } from '../lib/utils';

export const Header = forwardRef<{ openSearch: () => void; openMobileMenu: () => void }, { onCartOpen: () => void; onFilterOpen?: () => void }>(({ onCartOpen, onFilterOpen }, ref) => {
  const { mode, setMode, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useShop();
  const { items } = useCart();
  const { wishlist } = useWishlist();
  const { user, isAdmin } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const headerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useImperativeHandle(ref, () => ({
    openSearch: () => {
      setIsMobileSearchOpen(true);
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
    },
    openMobileMenu: () => {
      setIsMobileMenuOpen(true);
    }
  }));

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const path = 'products';
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setAllProducts(productsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = allProducts
        .filter(p => p.type === mode)
        .filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5);
      setSearchSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allProducts, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat === 'Всі товари' ? null : cat);
    setActiveDropdown(null);
    navigate('/');
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.95 }
  };

  return (
    <header ref={headerRef} className="z-[100] w-full bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-gray-100/50 dark:border-gray-800/50 transition-all duration-500">
      <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4">
        <Link to="/" onClick={() => { setSelectedCategory(null); setSearchQuery(''); }} className="flex flex-col group">
          <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">AutoPlumb</span>
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 leading-none mt-1">Premium Store</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {/* Контакти */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('contacts')}
              className={`flex items-center space-x-2 text-sm font-bold transition-all py-2.5 px-4 rounded-2xl border-2 ${
                activeDropdown === 'contacts' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-100 dark:border-blue-800' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>Контакти</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'contacts' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'contacts' && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full left-0 mt-3 w-72 bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-5 space-y-4 z-50"
                >
                  <div className="space-y-4">
                    <a href="tel:+380671234567" className="flex items-center space-x-4 group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Phone size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">Київстар</div>
                        <div className="text-xs text-gray-500 font-medium">+380 67 123 4567</div>
                      </div>
                    </a>
                    <a href="tel:+380501234567" className="flex items-center space-x-4 group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Phone size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">Vodafone</div>
                        <div className="text-xs text-gray-500 font-medium">+380 50 123 4567</div>
                      </div>
                    </a>
                    <a href="tel:+380631234567" className="flex items-center space-x-4 group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Phone size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">Lifecell</div>
                        <div className="text-xs text-gray-500 font-medium">+380 63 123 4567</div>
                      </div>
                    </a>
                    <div 
                      onClick={() => {
                        alert('Чат з менеджером зараз недоступний. Будь ласка, зателефонуйте нам.');
                        setActiveDropdown(null);
                      }}
                      className="pt-3 border-t border-gray-50 dark:border-gray-800"
                    >
                      <div className="flex items-center space-x-4 group cursor-pointer p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                        <MessageSquare size={20} />
                        <div className="text-sm font-black">Онлайн-чат</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Категорії */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('categories')}
              className={`flex items-center space-x-2 text-sm font-bold transition-all py-2.5 px-4 rounded-2xl border-2 ${
                activeDropdown === 'categories' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-100 dark:border-blue-800' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>Категорії</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === 'categories' ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {activeDropdown === 'categories' && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute top-full left-0 mt-3 w-80 bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden z-50"
                >
                  <div className="p-5 border-b border-gray-50 dark:border-gray-800">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Пошук категорій..." 
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div className="p-3 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {['Всі товари', 'Акумулятори', 'Значки та емблеми', 'Автоаксесуари', 'Автоелектроніка', 'Автоінструменти'].map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className={`w-full text-left px-5 py-3.5 text-sm font-black rounded-2xl transition-all mb-1 ${
                          (cat === 'Всі товари' && !selectedCategory) || selectedCategory === cat
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Блог */}
          <Link 
            to="/blog"
            className="flex items-center space-x-2 text-sm font-bold transition-all py-2.5 px-4 rounded-2xl border-2 border-transparent text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span>Блог</span>
          </Link>
        </nav>

        <div className="flex-1 max-w-md mx-8 hidden lg:block">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Пошук товарів..."
              className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/20 rounded-2xl py-2.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all dark:text-white"
            />
            
            <AnimatePresence>
              {showSuggestions && searchSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden z-[60]"
                >
                  <div className="p-3">
                    {searchSuggestions.map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="w-full flex items-center space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all text-left group"
                      >
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
                          <img 
                            src={product.image || `https://picsum.photos/seed/${product.id}/100/100`} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">{product.name}</div>
                          <div className="text-xs text-gray-500 font-medium">{product.brand} • <span className="text-blue-600 font-black">{product.price} грн</span></div>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <ArrowRight size={14} />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                    <button 
                      onClick={() => setShowSuggestions(false)}
                      className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <span>Показати всі результати</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button 
            onClick={() => setIsMobileSearchOpen(true)}
            className="md:hidden flex items-center gap-2 p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl active:scale-90 border border-gray-100/50 dark:border-gray-800/50"
          >
            <Search size={20} />
          </button>

          {onFilterOpen && (
            <button 
              onClick={onFilterOpen}
              className="md:hidden flex items-center gap-2 p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-90 border border-gray-100 dark:border-gray-700"
            >
              <SlidersHorizontal size={20} />
            </button>
          )}

          <button 
            onClick={toggleTheme}
            className="flex items-center gap-2 p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-90 border border-gray-100 dark:border-gray-700"
            title={isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
          >
            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">
              {isDark ? 'Темна' : 'Світла'}
            </span>
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <div className="h-6 w-[1px] bg-gray-100 dark:bg-gray-800 hidden md:block" />

          <Link 
            to="/wishlist" 
            className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-all bg-gray-50 dark:bg-gray-800 rounded-2xl relative active:scale-90 hidden md:flex"
          >
            <Heart size={20} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : ""} />
            {wishlist.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                {wishlist.length}
              </span>
            )}
          </Link>

          <div className="relative hidden md:block">
            {user ? (
              <button 
                onClick={() => toggleDropdown('user')}
                className="flex items-center space-x-2 p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-90"
              >
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-600/20">
                  {user.email?.[0].toUpperCase()}
                </div>
              </button>
            ) : (
              <Link to="/auth" className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-all bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-90">
                <User size={20} />
              </Link>
            )}

            <AnimatePresence>
              {activeDropdown === 'user' && user && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-2"
                >
                  <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 mb-1">
                    <div className="text-xs text-gray-400 font-medium">Ви увійшли як</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.email}</div>
                  </div>
                  <Link 
                    to="/profile" 
                    onClick={() => setActiveDropdown(null)}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold text-sm"
                  >
                    <User size={18} />
                    <span>Мій профіль</span>
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setActiveDropdown(null)}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors font-bold text-sm"
                    >
                      <Settings size={18} />
                      <span>Адмін-панель</span>
                    </Link>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors font-bold text-sm"
                  >
                    <LogOut size={18} />
                    <span>Вийти</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={onCartOpen}
            className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-all bg-gray-50 dark:bg-gray-800 rounded-2xl relative active:scale-90"
          >
            <ShoppingCart size={20} />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                {items.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-all bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-90"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>


      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-full max-w-[280px] bg-white shadow-2xl z-[110] md:hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                <span className="text-xl font-black text-blue-600">Меню</span>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={toggleTheme}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {isDark ? 'Темна' : 'Світла'}
                    </span>
                    {isDark ? <Moon size={18} /> : <Sun size={18} />}
                  </button>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-gray-900">
                {/* Mobile Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Пошук товарів..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Категорії</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {['Всі товари', 'Акумулятори', 'Значки та емблеми', 'Автоаксесуари', 'Автоелектроніка', 'Автоінструменти'].map((cat) => (
                      <button 
                        key={cat}
                        onClick={() => {
                          handleCategoryClick(cat);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all ${
                          (cat === 'Всі товари' && !selectedCategory) || selectedCategory === cat
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Контакти</h3>
                  <div className="space-y-3">
                    <a href="tel:+380671234567" className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group active:scale-95 transition-all">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <Phone size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">Київстар</div>
                        <div className="text-xs text-gray-500 font-medium">+380 67 123 4567</div>
                      </div>
                    </a>
                    <Link 
                      to="/blog"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl group active:scale-95 transition-all"
                    >
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-gray-900 dark:text-white">Блог</div>
                        <div className="text-xs text-gray-500 font-medium">Цікаві статті та новини</div>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                {user ? (
                  <button 
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center space-x-3 py-4 bg-red-50 text-red-500 rounded-2xl font-bold"
                  >
                    <LogOut size={20} />
                    <span>Вийти з акаунта</span>
                  </button>
                ) : (
                  <Link 
                    to="/auth" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center space-x-3 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200"
                  >
                    <User size={20} />
                    <span>Увійти</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
        {isMobileSearchOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
            />
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 z-[120] p-4 shadow-2xl rounded-b-[32px]"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Пошук товарів..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/20 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all dark:text-white"
                  />
                </div>
                <button 
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              {searchSuggestions.length > 0 && (
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pb-4">
                  {searchSuggestions.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      onClick={() => setIsMobileSearchOpen(false)}
                      className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all"
                    >
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                        <img 
                          src={product.image || `https://picsum.photos/seed/${product.id}/100/100`} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-gray-900 dark:text-white truncate">{product.name}</div>
                        <div className="text-xs text-blue-600 font-black">{product.price} грн</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
});
