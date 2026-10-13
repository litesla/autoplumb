import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ShoppingCart, User, Menu, ChevronDown, Phone, MessageSquare, Tag, Percent, Sparkles, LogOut, Settings, X, ArrowRight, Heart, Moon, Sun, SlidersHorizontal, Truck, Clock, Car, Droplets } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { Product, getExpandedSearchTerms, getSearchKeywords } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { getSanitizedProductImage, getCuratedFallback } from '../services/productImageService';

const getFirstProductImage = (imgStr?: string, product?: any) => {
  if (product) return getSanitizedProductImage(product);
  if (!imgStr) return '';
  const parts = imgStr.split(/,(?=\s*(?:https?:|data:))/i);
  return parts[0]?.trim() || '';
};

export const Header = forwardRef<{ openSearch: () => void; openMobileMenu: () => void }, { onCartOpen: () => void; onFilterOpen?: () => void }>(({ onCartOpen, onFilterOpen }, ref) => {
  const { mode, setMode, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useShop();
  const { items, total } = useCart();
  const { wishlist } = useWishlist();
  const { user, isAdmin } = useAuth();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const headerRef = useRef<HTMLDivElement>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [phoneCopied, setPhoneCopied] = useState<string | null>(null);

  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>, rawNum: string, operator: string) => {
    // Copy clean formatting format to clipboard automatically
    const formattedNum = "+380 68 918 0637";
    navigator.clipboard.writeText(formattedNum).then(() => {
      setPhoneCopied(operator);
      setTimeout(() => setPhoneCopied(null), 2000);
    }).catch(err => {
      console.error("Could not copy number: ", err);
    });
    // On mobile screens, the normal execution of the href (tel:link) will occur
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    navigate('/');
    // Scroll to products section if we're on home page
    if (window.location.pathname === '/') {
      const productsSection = document.getElementById('products');
      productsSection?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && searchSuggestions[activeSuggestionIndex]) {
        e.preventDefault();
        const selected = searchSuggestions[activeSuggestionIndex];
        navigate(`/product/${selected.id}`);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

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
    const fetchSuggestions = async () => {
      if (searchQuery.length > 1) {
        let query = supabase
          .from('products')
          .select('*')
          .eq('type', mode);

        const words = getSearchKeywords(searchQuery);
        if (words.length > 0) {
          words.forEach(word => {
            const expanded = getExpandedSearchTerms(word);
            if (expanded.length > 0) {
              const orConditions = expanded.map(term => 
                `name.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%,article.ilike.%${term}%`
              ).join(',');
              query = query.or(orConditions);
            }
          });
        } else {
          const expanded = getExpandedSearchTerms(searchQuery);
          if (expanded.length > 0) {
            const orConditions = expanded.map(term => 
              `name.ilike.%${term}%,brand.ilike.%${term}%,description.ilike.%${term}%,article.ilike.%${term}%`
            ).join(',');
            query = query.or(orConditions);
          }
        }

        const { data, error } = await query.limit(8);

        if (error) {
          console.error('Error fetching search suggestions:', error);
          return;
        }

        if (data) {
          const mapped = data.map(item => ({ ...item, image: item.image_url || item.image })) as Product[];
          setSearchSuggestions(mapped);
          setShowSuggestions(true);
          setActiveSuggestionIndex(-1);
        }
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setShowSuggestions(false);
      }
    };
    const handleSlashShortcut = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleSlashShortcut);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleSlashShortcut);
    };
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
    <>
      {/* Top Utility Bar */}
      <div className="hidden lg:block bg-slate-900 text-slate-300 text-xs py-2 border-b border-slate-800">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock size={13} className="text-blue-400" />
              <span>Графік: <strong className="text-slate-200">Пн–Сб 08:30 – 19:00</strong></span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Truck size={13} className="text-emerald-400" />
              <span>Відправка Новою Поштою щодня по всій Україні</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-slate-400">
            <Link to="/order-tracking/search" className="hover:text-white transition-colors">
              Відстежити замовлення
            </Link>
            <Link to="/blog" className="hover:text-white transition-colors">
              Блог та поради
            </Link>
            <a 
              href="tel:+380689180637" 
              className="font-bold text-white hover:text-blue-400 transition-colors flex items-center gap-1.5"
            >
              <Phone size={12} className="text-blue-400" />
              <span>+380 68 918 0637</span>
            </a>
          </div>
        </div>
      </div>

      <header ref={headerRef} className="z-[100] w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 transition-all duration-300">
      <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-2 sm:gap-4">
        <Link to="/" onClick={() => { setSelectedCategory(null); setSearchQuery(''); }} className="flex items-center gap-1.5 group shrink-0">
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">AutoPlumb</span>
          <span className="w-2 h-2 rounded-full bg-blue-600 mb-1"></span>
        </Link>

        {/* Desktop Department Switcher */}
        <div className="hidden xl:flex items-center p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shrink-0">
          <button
            onClick={() => { setMode('auto'); setSelectedCategory(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'auto'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Car size={13} />
            <span>Авто/МТЗ</span>
          </button>
          <button
            onClick={() => { setMode('plumbing'); setSelectedCategory(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'plumbing'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Droplets size={13} />
            <span>Сантехніка</span>
          </button>
        </div>

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
                    <a 
                      href="tel:+380689180637" 
                      onClick={(e) => handlePhoneClick(e, '+380689180637', 'Київстар')}
                      className="flex items-center space-x-4 group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all relative"
                    >
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Phone size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-gray-900 dark:text-white">Київстар</div>
                        <div className="text-xs text-gray-500 font-medium">+380 68 918 0637</div>
                      </div>
                      {phoneCopied === 'Київстар' && (
                        <span className="absolute right-2 px-2.5 py-1 bg-green-500 text-white rounded-full text-[10px] font-black animate-pulse">
                          Скопійовано!
                        </span>
                      )}
                    </a>
                    <a 
                      href="tel:+380689180637" 
                      onClick={(e) => handlePhoneClick(e, '+380689180637', 'Vodafone')}
                      className="flex items-center space-x-4 group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all relative"
                    >
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Phone size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-gray-900 dark:text-white">Vodafone</div>
                        <div className="text-xs text-gray-500 font-medium">+380 68 918 0637</div>
                      </div>
                      {phoneCopied === 'Vodafone' && (
                        <span className="absolute right-2 px-2.5 py-1 bg-green-500 text-white rounded-full text-[10px] font-black animate-pulse">
                          Скопійовано!
                        </span>
                      )}
                    </a>
                    <a 
                      href="tel:+380689180637" 
                      onClick={(e) => handlePhoneClick(e, '+380689180637', 'Lifecell')}
                      className="flex items-center space-x-4 group cursor-pointer p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all relative"
                    >
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
                        <Phone size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-gray-900 dark:text-white">Lifecell</div>
                        <div className="text-xs text-gray-500 font-medium">+380 68 918 0637</div>
                      </div>
                      {phoneCopied === 'Lifecell' && (
                        <span className="absolute right-2 px-2.5 py-1 bg-green-500 text-white rounded-full text-[10px] font-black animate-pulse">
                          Скопійовано!
                        </span>
                      )}
                    </a>
                    <div 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-customer-chat'));
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

        <div className="flex-1 max-w-md lg:max-w-xl mx-2 lg:mx-6 hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Пошук товарів за назвою, брендом, артикулом..."
              className="w-full bg-slate-50 dark:bg-zinc-800 border-2 border-transparent focus:border-blue-500/20 rounded-2xl py-2.5 pl-12 pr-10 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-900 dark:text-white"
            />
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/70 dark:bg-zinc-700/80 rounded absolute right-3.5 top-1/2 -translate-y-1/2 select-none pointer-events-none">
              /
            </kbd>
            
            <AnimatePresence>
              {showSuggestions && searchQuery.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden z-[60]"
                >
                  <div className="p-3">
                    {searchSuggestions.length > 0 ? (
                      searchSuggestions.map((product, index) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          onClick={() => setShowSuggestions(false)}
                          onMouseEnter={() => setActiveSuggestionIndex(index)}
                          className={`w-full flex items-center space-x-4 p-3 rounded-2xl transition-all text-left group ${
                            activeSuggestionIndex === index 
                              ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-100 dark:ring-blue-800' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-700">
                            <img 
                              src={getFirstProductImage(product.image, product)} 
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const fallback = getCuratedFallback(product.name, product.type, product.category, product.id);
                                if (e.currentTarget.src !== fallback) {
                                  e.currentTarget.src = fallback;
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-black truncate transition-colors ${
                              activeSuggestionIndex === index ? 'text-blue-600' : 'text-gray-900 dark:text-white group-hover:text-blue-600'
                            }`}>{product.name}</div>
                            <div className="text-xs text-gray-500 font-medium">
                              {product.brand && <span className="text-gray-900 dark:text-gray-300 mr-2">{product.brand}</span>}
                              {product.brand && <span className="opacity-30">•</span>}
                              <span className="text-blue-600 font-black ml-2">{product.price} грн</span>
                            </div>
                          </div>
                          <div className={`p-2 rounded-lg transition-all ${
                            activeSuggestionIndex === index ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-600 group-hover:text-white'
                          }`}>
                            <ArrowRight size={14} />
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Search size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Нічого не знайдено</p>
                        <p className="text-xs text-gray-500 mt-1">Спробуйте інші ключові слова</p>
                      </div>
                    )}
                  </div>
                  {searchSuggestions.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                      <button 
                        type="submit"
                        className="text-xs font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <span>Показати всі результати для "{searchQuery}"</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4">
          {/* Quick Hotline Call Button on Mobile */}
          <a 
            href="tel:+380689180637"
            onClick={(e) => handlePhoneClick(e, '+380689180637', 'MobileTop')}
            className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-xs"
            title="Подзвонити: +380 68 918 0637"
          >
            <Phone size={13} className="shrink-0" />
            <span className="text-[11px] font-extrabold hidden xs:inline">068 918 0637</span>
            <span className="text-[11px] font-extrabold xs:hidden">Дзвінок</span>
          </a>

          {onFilterOpen && (
            <button 
              onClick={onFilterOpen}
              className="md:hidden flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-gray-50 dark:bg-zinc-800 rounded-xl active:scale-90 border border-gray-100 dark:border-zinc-700"
              aria-label="Фільтри"
            >
              <SlidersHorizontal size={18} />
            </button>
          )}

          <button 
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-gray-50 dark:bg-zinc-800 rounded-xl active:scale-90 border border-gray-100 dark:border-zinc-700"
            title={isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
          >
            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:block">
              {isDark ? 'Темна' : 'Світла'}
            </span>
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
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
            id="header-cart-btn"
            onClick={onCartOpen}
            className="hidden md:flex items-center gap-2.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            aria-label="Кошик покупок"
          >
            <div className="relative">
              <ShoppingCart size={19} />
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-amber-400 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </div>
            <div className="text-left hidden lg:block pr-0.5">
              <div className="text-[10px] text-blue-100 font-semibold uppercase tracking-wider leading-none">Кошик</div>
              <div className="text-xs font-bold leading-tight tabular-nums">{total.toLocaleString('uk-UA')} грн</div>
            </div>
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-all bg-gray-50 dark:bg-gray-800 rounded-xl active:scale-90"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Dedicated Search & Department Bar */}
      <div className="md:hidden px-3.5 pb-2.5 pt-0 border-t border-slate-100 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95">
        <div className="flex items-center gap-2 mb-2">
          {/* Quick Department Switch */}
          <div className="flex-1 flex bg-slate-200/60 dark:bg-zinc-900 p-1 rounded-xl border border-slate-300/70 dark:border-zinc-800 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => { setMode('auto'); setSelectedCategory(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
                mode === 'auto'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`p-0.5 rounded transition-colors ${
                mode === 'auto' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-400'
              }`}>
                <Car size={14} strokeWidth={mode === 'auto' ? 2.5 : 2} />
              </span>
              <span className="text-xs font-bold truncate">Авто та МТЗ</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('plumbing'); setSelectedCategory(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
                mode === 'plumbing'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className={`p-0.5 rounded transition-colors ${
                mode === 'plumbing' ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-zinc-400'
              }`}>
                <Droplets size={14} strokeWidth={mode === 'plumbing' ? 2.5 : 2} />
              </span>
              <span className="text-xs font-bold truncate">Сантехніка</span>
            </button>
          </div>
        </div>

        {/* Quick Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Пошук деталі, бренду чи артикулу..."
            className="w-full bg-slate-100/90 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700/80 rounded-xl py-2 pl-9 pr-8 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-850 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

    </header>
    {createPortal(
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[140] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed left-0 top-0 h-full w-full max-w-[320px] sm:max-w-[360px] bg-white dark:bg-zinc-900 shadow-2xl z-[150] md:hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-slate-900 dark:text-white">AutoPlumb</span>
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={toggleTheme}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-bold"
                  >
                    {isDark ? <Moon size={16} /> : <Sun size={16} />}
                  </button>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-slate-500"
                    aria-label="Закрити меню"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white dark:bg-zinc-900">
                {/* Department Selector */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Відділ магазину
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-xl">
                    <button
                      onClick={() => { setMode('auto'); setSelectedCategory(null); }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        mode === 'auto'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                      }`}
                    >
                      <Car size={14} />
                      <span>Авто / МТЗ</span>
                    </button>
                    <button
                      onClick={() => { setMode('plumbing'); setSelectedCategory(null); }}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                        mode === 'plumbing'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                      }`}
                    >
                      <Droplets size={14} />
                      <span>Сантехніка</span>
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      {mode === 'auto' ? 'Категорії запчастин' : 'Категорії сантехніки'}
                    </span>
                    {selectedCategory && (
                      <button
                        onClick={() => { setSelectedCategory(null); setIsMobileMenuOpen(false); }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold"
                      >
                        Скинути
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    {(mode === 'auto' ? [
                      'Всі товари',
                      'Трактори МТЗ',
                      'Запчастини ЮМЗ',
                      'Акумулятори',
                      'Автохімія та оливи',
                      'Фільтри',
                      'Автоелектроніка',
                      'Автоінструменти',
                      'Автоаксесуари'
                    ] : [
                      'Всі товари',
                      'Змішувачі',
                      'Опалення',
                      'Радіатори',
                      'Труби та фітинги',
                      'Водонагрівачі',
                      'Каналізація',
                      'Крани та арматура'
                    ]).map((cat) => {
                      const isCatSelected = (cat === 'Всі товари' && !selectedCategory) || selectedCategory === cat;
                      return (
                        <button 
                          key={cat}
                          onClick={() => {
                            handleCategoryClick(cat);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-between ${
                            isCatSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black border border-blue-200 dark:border-blue-800'
                              : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span>{cat}</span>
                          {isCatSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Hotline & Info */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Підтримка та замовлення
                  </div>
                  
                  <a 
                    href="tel:+380689180637" 
                    onClick={(e) => handlePhoneClick(e, '+380689180637', 'DrawerPhone')}
                    className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40"
                  >
                    <div className="p-2 bg-emerald-600 text-white rounded-lg">
                      <Phone size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-black">+380 68 918 0637</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Пн–Сб: 08:30 – 19:00</div>
                    </div>
                  </a>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/order-tracking/search"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-center text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600"
                    >
                      Відстежити
                    </Link>
                    <Link
                      to="/blog"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-center text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600"
                    >
                      Блог і поради
                    </Link>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Profile/Auth */}
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                {user ? (
                  <>
                    <Link 
                      to="/profile" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-xl font-bold transition-all text-xs"
                    >
                      <User size={15} />
                      <span>Мій профіль ({user.email?.split('@')[0]})</span>
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center justify-center space-x-2 py-2 bg-blue-600 text-white rounded-xl font-bold transition-all text-xs shadow-xs"
                      >
                        <Settings size={15} />
                        <span>Адмін-панель</span>
                      </Link>
                    )}
                    <button 
                      onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-center space-x-2 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold transition-all text-xs"
                    >
                      <LogOut size={15} />
                      <span>Вийти</span>
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/auth" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-sm"
                  >
                    <User size={16} />
                    <span>Увійти / Реєстрація</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    {createPortal(
      <AnimatePresence>
        {isMobileSearchOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSearchOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140]"
            />
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 z-[150] p-4 shadow-2xl rounded-b-[32px] overflow-hidden"
            >
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Пошук за назвою, брендом або артикулом..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500/20 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all dark:text-white"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl active:scale-90"
                >
                  <X size={20} />
                </button>
              </form>

              {searchQuery.length > 1 && (
                <div className="max-h-[60vh] overflow-y-auto space-y-2 pb-4 px-2 no-scrollbar">
                  {searchSuggestions.length > 0 ? (
                    searchSuggestions.map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => setIsMobileSearchOpen(false)}
                        className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-all border border-gray-100 dark:border-gray-800"
                      >
                        <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-800">
                          <img 
                            src={getFirstProductImage(product.image, product)} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const fallback = getCuratedFallback(product.name, product.type, product.category, product.id);
                              if (e.currentTarget.src !== fallback) {
                                e.currentTarget.src = fallback;
                              }
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-gray-900 dark:text-white truncate">{product.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              {product.brand || 'No Brand'}
                            </span>
                            <span className="text-xs text-blue-600 font-black">{product.price} грн</span>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <Search size={32} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-500 font-bold">Нічого не знайдено</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
});
