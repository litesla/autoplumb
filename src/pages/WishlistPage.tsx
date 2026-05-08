import React from 'react';
import { useWishlist } from '../context/WishlistContext';
import { ProductCard } from '../components/ProductCard';
import { Heart, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const WishlistPage: React.FC = () => {
  const { wishlist, removeFromWishlist } = useWishlist();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Назад</span>
        </button>

        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Список бажань</h1>
            <p className="text-gray-500 font-medium">Товари, які ви зберегли для майбутніх покупок</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-3">
            <Heart size={24} className="text-red-500 fill-red-500" />
            <span className="text-xl font-black text-gray-900">{wishlist.length}</span>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] p-16 text-center shadow-xl shadow-gray-200/50"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={48} className="text-gray-200" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">Ваш список бажань порожній</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">
              Додавайте товари, які вам сподобалися, щоб не загубити їх та повернутися до покупок пізніше.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center space-x-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <ShoppingBag size={20} />
              <span>Перейти до покупок</span>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <AnimatePresence mode="popLayout">
              {wishlist.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative group"
                >
                  <ProductCard product={product} />
                  <button 
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-xl shadow-lg hover:bg-red-500 hover:text-white transition-all active:scale-90 z-10"
                    title="Видалити зі списку"
                  >
                    <Heart size={20} className="fill-current" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
