import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ShopProvider } from './context/ShopContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { Header } from './components/Header';
import { CustomerChatWidget } from './components/CustomerChatWidget';
import { CartDrawer } from './components/CartDrawer';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { LegalPage } from './pages/LegalPage';
import { Auth } from './pages/Auth';
import { WishlistPage } from './pages/WishlistPage';
import { ComparePage } from './pages/ComparePage';
import { ProfilePage } from './pages/ProfilePage';
import { BlogPage } from './pages/BlogPage';
import { ArticlePage } from './pages/ArticlePage';
import ProductPage from './pages/ProductPage';
import { WelcomeModal } from './components/WelcomeModal';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ArrowUp, Package, Settings as SettingsIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { BottomNav } from './components/BottomNav';
import { MaintenanceBanner } from './components/MaintenanceBanner';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './context/AuthContext';

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const { isAdmin } = useAuth();
  const headerRef = React.useRef<{ openSearch: () => void; openMobileMenu: () => void }>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleQuota = () => setIsQuotaExceeded(true);
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  React.useEffect(() => {
    // Migrate settings to Supabase
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('content')
        .select('*')
        .eq('key', 'settings')
        .single();
      
      if (data) {
        setIsMaintenance(data.value?.maintenanceMode || false);
      }
    };

    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('app_settings')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'content',
        filter: 'key=eq.settings'
      }, payload => {
        if (payload.new) {
          setIsMaintenance((payload.new as any).value?.maintenanceMode || false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isMaintenance && !isAdmin && 
      !window.location.pathname.startsWith('/admin') && 
      !window.location.pathname.startsWith('/auth') && 
      !window.location.pathname.startsWith('/checkout') && 
      !window.location.pathname.startsWith('/order-tracking') &&
      !sessionStorage.getItem('skip_maintenance')) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-8">
          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
            <SettingsIcon size={48} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Технічне обслуговування</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Наразі ми проводимо планові технічні роботи, щоб зробити наш магазин ще кращим для вас.
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/50 space-y-4">
            <p className="text-blue-800 dark:text-blue-300 font-bold text-sm">
              Товари в наявності та готові до відправки!
            </p>
            <button 
              onClick={() => {
                sessionStorage.setItem('skip_maintenance', 'true');
                window.location.reload();
              }}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              Перейти до покупок
            </button>
          </div>

          <div className="pt-8 text-sm text-gray-400 font-black uppercase tracking-widest">
            Ми скоро повернемося!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black font-['Inter',sans-serif] transition-colors duration-300">
      {!isAdminRoute && (
        <div className="sticky top-0 z-[110]">
          {isQuotaExceeded && (
            <div className="bg-red-600 text-white py-3 px-4 text-center text-sm font-black flex items-center justify-center gap-3 animate-slide-in">
              <Package size={18} />
              Вичерпано добовий ліміт запитів (Firestore Quota). Товари можуть тимчасово не відображатися.
              <button 
                onClick={() => setIsQuotaExceeded(false)}
                className="ml-4 opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}
          <MaintenanceBanner />
          <Header 
            ref={headerRef}
            onCartOpen={() => setIsCartOpen(true)} 
            onFilterOpen={() => {
              // This is a bit tricky since HomePage manages its own filter state.
              // We can use a custom event or a context if needed, but for now
              // let's assume we want to trigger the filter on the current page if it exists.
              const filterBtn = document.querySelector('[data-filter-trigger]') as HTMLButtonElement;
              if (filterBtn) filterBtn.click();
            }}
          />
        </div>
      )}
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-tracking/:id" element={<OrderTrackingPage />} />
          <Route path="/legal/:type" element={<LegalPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<ArticlePage />} />
          <Route path="/product/:id" element={<ProductPage />} />
        </Routes>

        <CartDrawer 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          onCheckout={() => {
            setIsCartOpen(false);
            navigate('/checkout');
          }}
        />

        {!isAdminRoute && (
          <BottomNav 
            onCartOpen={() => setIsCartOpen(prev => !prev)}
            onCategoriesOpen={() => headerRef.current?.openMobileMenu()}
          />
        )}

        <AnimatePresence>
          {showBackToTop && !isAdminRoute && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={scrollToTop}
              className="fixed bottom-24 right-8 z-50 p-4 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 hover:bg-blue-600 hover:text-white transition-all active:scale-90"
            >
              <ArrowUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>

        {!isAdminRoute && (
          <footer className="bg-slate-900 text-slate-300 pt-16 pb-28 md:pb-12 border-t border-slate-800 transition-colors">
            <div className="container mx-auto px-4 max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
                
                {/* Column 1: Store info & Direct Contacts */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white tracking-tight">AutoPlumb</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500 mb-1"></span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Спеціалізований інтернет-магазин запчастин для авто, тракторів МТЗ/ЮМЗ, а також систем опалення та сучасної сантехніки.
                  </p>
                  <div className="space-y-2 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Гаряча лінія:</span>
                      <a href="tel:+380689180637" className="font-bold text-white hover:text-blue-400 transition-colors">
                        +380 68 918 0637
                      </a>
                    </div>
                    <div className="text-slate-400">
                      Графік роботи: <span className="text-slate-200">Пн–Сб: 08:30 – 19:00</span>
                    </div>
                    <div className="text-slate-400">
                      Неділя: <span className="text-slate-200">прийом онлайн-замовлень</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Catalog Quick Links */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Каталог товарів</h4>
                  <ul className="space-y-2.5 text-xs text-slate-400">
                    <li>
                      <Link to="/" className="hover:text-white transition-colors">Запчастини для тракторів МТЗ / ЮМЗ</Link>
                    </li>
                    <li>
                      <Link to="/" className="hover:text-white transition-colors">Акумулятори та автоелектрика</Link>
                    </li>
                    <li>
                      <Link to="/" className="hover:text-white transition-colors">Автохімія, оливи та фільтри</Link>
                    </li>
                    <li>
                      <Link to="/" className="hover:text-white transition-colors">Змішувачі та комплектуючі</Link>
                    </li>
                    <li>
                      <Link to="/" className="hover:text-white transition-colors">Опалення, радіатори та котли</Link>
                    </li>
                    <li>
                      <Link to="/" className="hover:text-white transition-colors">Труби, фітинги та крани</Link>
                    </li>
                  </ul>
                </div>

                {/* Column 3: Customer Service */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Покупцям</h4>
                  <ul className="space-y-2.5 text-xs text-slate-400">
                    <li>
                      <Link to="/order-tracking/search" className="hover:text-white transition-colors">Відстежити замовлення</Link>
                    </li>
                    <li>
                      <Link to="/legal/terms" className="hover:text-white transition-colors">Доставка та оплата</Link>
                    </li>
                    <li>
                      <Link to="/legal/terms" className="hover:text-white transition-colors">Обмін та повернення 14 днів</Link>
                    </li>
                    <li>
                      <Link to="/legal/privacy" className="hover:text-white transition-colors">Політика конфіденційності</Link>
                    </li>
                    <li>
                      <Link to="/legal/terms" className="hover:text-white transition-colors">Публічна оферта</Link>
                    </li>
                    <li>
                      <Link to="/blog" className="hover:text-white transition-colors">Корисні статті та поради</Link>
                    </li>
                  </ul>
                </div>

                {/* Column 4: Shipping & Payment Guarantees */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Доставка та оплата</h4>
                  <div className="space-y-3 text-xs text-slate-400">
                    <p className="leading-relaxed">
                      Відправляємо замовлення щодня по всій території України службою <strong>Нова Пошта</strong>.
                    </p>
                    <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1.5">
                      <div className="font-semibold text-slate-200">Оплата при отриманні:</div>
                      <div className="text-[11px] text-slate-400">
                        Перевіряйте товар у відділенні пошти перед оплатою (накладений платіж).
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
                      <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Нова Пошта</span>
                      <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Накладений платіж</span>
                      <span className="px-2 py-1 bg-slate-800 rounded border border-slate-700">Visa / Mastercard</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom bar */}
              <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                <div>
                  © 2026 AutoPlumb. Офіційний інтернет-магазин запчастин та сантехніки. Всі права захищено.
                </div>
                <div className="flex items-center gap-6">
                  <Link to="/legal/privacy" className="hover:text-slate-300 transition-colors">Конфіденційність</Link>
                  <Link to="/legal/terms" className="hover:text-slate-300 transition-colors">Оферта</Link>
                  <Link to="/legal/cookies" className="hover:text-slate-300 transition-colors">Cookie</Link>
                </div>
              </div>
            </div>
          </footer>
        )}
        {!isAdminRoute && <CustomerChatWidget />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ShopProvider>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <Router>
                  <AppContent />
                </Router>
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </ShopProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
