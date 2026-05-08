import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ShopProvider } from './context/ShopContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { Header } from './components/Header';
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
import { AIConsultant } from './components/AIConsultant';
import { useNavigate, Link } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { BottomNav } from './components/BottomNav';
import { MaintenanceBanner } from './components/MaintenanceBanner';
import { db } from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './context/AuthContext';
import { Settings } from 'lucide-react';

const AppContent = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const { isAdmin } = useAuth();
  const headerRef = React.useRef<{ openSearch: () => void; openMobileMenu: () => void }>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'content', 'settings'), (doc) => {
      if (doc.exists()) {
        setIsMaintenance(doc.data().maintenanceMode || false);
      }
    });

    return () => unsub();
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
            <Settings size={48} />
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
      <ErrorBoundary>
        <div className="sticky top-0 z-[110]">
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

        <BottomNav 
          onCartOpen={() => setIsCartOpen(prev => !prev)}
          onAIOpen={() => setIsAIOpen(true)}
          onCategoriesOpen={() => headerRef.current?.openMobileMenu()}
        />

        <AnimatePresence>
          {showBackToTop && (
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

        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-16 transition-colors">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left">
                <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">AutoPlumb</div>
                <p className="text-gray-400 text-sm font-medium">© 2026 AutoPlumb. Всі права захищені.</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                <Link to="/legal/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Політика конфіденційності</Link>
                <Link to="/legal/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Публічна оферта</Link>
                <Link to="/legal/cookies" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Файли Cookie</Link>
              </div>
            </div>
          </div>
        </footer>
        <WelcomeModal />
        <AIConsultant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      </ErrorBoundary>
    </div>
  );
};

export default function App() {
  return (
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
  );
}
