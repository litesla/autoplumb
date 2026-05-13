import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ChevronLeft, ChevronRight, ArrowLeft, Package, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductCard } from '../components/ProductCard';
import { ProductReviews } from '../components/ProductReviews';

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data) {
          const productData = { ...data, image: data.image_url } as Product;
          setProduct(productData);
          fetchRecommended(productData.category, data.id);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchRecommended = async (category: string, currentId: string) => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('category', category)
          .neq('id', currentId)
          .limit(12);
        
        if (data) {
          const productsData = data.map(doc => ({ ...doc, image: doc.image_url } as Product));
          setRecommendedProducts(productsData);
        }
      } catch (error) {
        console.error("Error fetching recommended products:", error);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Товар не знайдено</h2>
        <button 
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Повернутися на головну
        </button>
      </div>
    );
  }

  const images = [
    product.image || `https://picsum.photos/seed/${product.id}/800/800`,
    `https://picsum.photos/seed/${product.id}_alt1/800/800`,
    `https://picsum.photos/seed/${product.id}_alt2/800/800`,
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col transition-colors">
      <main className="flex-1 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs / Back button */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors mb-8 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Назад</span>
          </button>

          <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden flex flex-col lg:flex-row border border-transparent dark:border-gray-800">
            {/* Image Gallery */}
            <div className="lg:w-1/2 relative bg-gray-50 dark:bg-gray-800 flex items-center justify-center group min-h-[400px] lg:min-h-[600px]">
              <motion.img 
                key={currentImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={images[currentImage]} 
                alt={product.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              
              <button 
                onClick={() => setCurrentImage(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90 text-gray-900 dark:text-white"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={() => setCurrentImage(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-700 transition-all active:scale-90 text-gray-900 dark:text-white"
              >
                <ChevronRight size={24} />
              </button>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3">
                {images.map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentImage === i ? 'bg-blue-600 w-8' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`}
                  />
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {product.category}
                  </span>
                  {product.brand && (
                    <span className="text-xs font-black text-blue-500 uppercase tracking-widest">
                      {product.brand}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl lg:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-4">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">В наявності</span>
                  </div>
                  <span>•</span>
                  <span>Артикул: {product.article || `AP-${product.id}`}</span>
                </div>
              </div>

              <div className="text-5xl font-black text-blue-600 dark:text-blue-400 mb-10">
                {product.price.toLocaleString()} грн
              </div>

              <div className="flex-1 mb-10">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Package size={20} className="text-blue-600" />
                  <span>Опис товару</span>
                </h4>
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line text-lg">
                  {product.description || "Цей товар забезпечує високу якість та надійність. Ідеально підходить для професійного використання та домашніх потреб. Виготовлений з використанням сучасних технологій та матеріалів."}
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <ShieldCheck className="text-blue-600 dark:text-blue-400" size={24} />
                  <div className="text-xs">
                    <div className="font-bold text-gray-900 dark:text-white">Гарантія якості</div>
                    <div className="text-gray-500 dark:text-gray-400">100% оригінал</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                  <Truck className="text-blue-600 dark:text-blue-400" size={24} />
                  <div className="text-xs">
                    <div className="font-bold text-gray-900 dark:text-white">Швидка доставка</div>
                    <div className="text-gray-500 dark:text-gray-400">По всій Україні</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => addItem(product)}
                  className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3"
                >
                  <ShoppingCart size={24} />
                  <span>Додати до кошика</span>
                </button>
                <button 
                  onClick={() => {
                    addItem(product);
                    navigate('/checkout');
                  }}
                  className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Купити зараз
                </button>
              </div>
            </div>
          </div>

          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <div className="mt-24">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
                    <Sparkles size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">Рекомендовано</span>
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                    Схожі товари
                  </h2>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => navigate('/')}
                    className="hidden sm:flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors group mr-4"
                  >
                    <span>Всі товари</span>
                    <ArrowLeft size={20} className="rotate-180 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        const el = document.getElementById('recommended-scroll');
                        if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
                      }}
                      className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm text-gray-900 dark:text-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        const el = document.getElementById('recommended-scroll');
                        if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
                      }}
                      className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm text-gray-900 dark:text-white"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div 
                id="recommended-scroll"
                className="flex overflow-x-auto pb-8 gap-8 scrollbar-hide snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {recommendedProducts.map(recProduct => (
                  <motion.div
                    key={recProduct.id}
                    className="min-w-[280px] sm:min-w-[320px] snap-start"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <ProductCard product={recProduct} showButtons={false} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <ProductReviews productId={product.id.toString()} />
        </div>
      </main>
    </div>
  );
};

export default ProductPage;
