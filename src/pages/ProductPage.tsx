import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Product } from '../lib/utils';
import { getSanitizedProductGallery, getCuratedFallback } from '../services/productImageService';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ChevronLeft, ChevronRight, ArrowLeft, Package, ShieldCheck, Truck, Check } from 'lucide-react';
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
  const [isAdded, setIsAdded] = useState(false);

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
          .order('created_at', { ascending: false })
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

  // Helper to get clean, high-resolution images for a product
  const getProductImages = (prod: Product) => {
    return getSanitizedProductGallery(prod);
  };

  const images = getProductImages(product);

  const handleMainImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const fallback = getCuratedFallback(product?.name || '', product?.type || 'auto', product?.category || '', product?.id || '');
    if (e.currentTarget.src !== fallback) {
      e.currentTarget.src = fallback;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col transition-colors">
      <main className="flex-1 pt-16 sm:pt-20 pb-24 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs / Back button */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors mb-6 group cursor-pointer"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Назад</span>
          </button>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:flex-row border border-slate-200/80 dark:border-zinc-800">
            {/* Image Gallery */}
            <div className="lg:w-1/2 flex flex-col bg-slate-50 dark:bg-zinc-800/40 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-zinc-800">
              <div className="relative flex-1 flex items-center justify-center group min-h-[300px] sm:min-h-[380px] lg:min-h-[440px] p-4 sm:p-6">
                <motion.img 
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={images[currentImage]} 
                  alt={product.name} 
                  className="w-full h-full object-contain max-h-[360px] lg:max-h-[440px]"
                  referrerPolicy="no-referrer"
                  onError={handleMainImageError}
                />
                
                <button 
                  onClick={() => setCurrentImage(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full shadow-md hover:bg-white dark:hover:bg-zinc-700 transition-all active:scale-90 text-gray-900 dark:text-white cursor-pointer"
                  aria-label="Попереднє фото"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentImage(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full shadow-md hover:bg-white dark:hover:bg-zinc-700 transition-all active:scale-90 text-gray-900 dark:text-white cursor-pointer"
                  aria-label="Наступне фото"
                >
                  <ChevronRight size={20} />
                </button>

                {/* Mobile Dots */}
                <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
                  {images.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${currentImage === i ? 'bg-blue-600 w-6' : 'bg-gray-300 dark:bg-gray-600'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Desktop Thumbnails */}
              {images.length > 1 && (
                <div className="hidden sm:flex items-center justify-center gap-2.5 p-4 border-t border-slate-200/60 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`w-14 h-14 rounded-xl border-2 p-1 bg-white dark:bg-zinc-800 transition-all cursor-pointer overflow-hidden ${
                        currentImage === i
                          ? 'border-blue-600 ring-2 ring-blue-500/20 scale-105'
                          : 'border-slate-200 dark:border-zinc-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Мініатюра ${i + 1}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:w-1/2 p-5 sm:p-8 lg:p-12 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center space-x-2.5 mb-3">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-bold uppercase tracking-wider rounded-lg">
                    {product.category}
                  </span>
                  {product.brand && (
                    <span className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                      {product.brand}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-3">
                  {product.name}
                </h1>
                <div className="flex items-center space-x-3 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">В наявності</span>
                  </div>
                  <span>•</span>
                  <span>Артикул: {product.article || `AP-${product.id}`}</span>
                </div>
              </div>

              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-6 tabular-nums tracking-tight">
                {product.price.toLocaleString('uk-UA')} <span className="text-lg font-normal text-slate-500">грн</span>
              </div>

              <div className="flex-1 mb-6">
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-2 text-sm">
                  <Package size={17} className="text-blue-600" />
                  <span>Опис товару</span>
                </h4>
                <div className="text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                  {product.description || "Оригінальна заводська деталь. Відповідає європейським стандартам якості та надійності. Швидка відправка по Україні."}
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center space-x-2.5 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                  <ShieldCheck className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Гарантія якості</div>
                    <div className="text-slate-500 dark:text-zinc-400 text-[11px]">100% оригінал</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2.5 p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl">
                  <Truck className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Швидка доставка</div>
                    <div className="text-slate-500 dark:text-zinc-400 text-[11px]">Нова Пошта 1–2 дні</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    addItem(product);
                    setIsAdded(true);
                    setTimeout(() => setIsAdded(false), 2000);
                  }}
                  className={`flex-1 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    isAdded 
                      ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-600/20'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={18} />
                      <span>Додано до кошика!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      <span>Додати до кошика</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    addItem(product);
                    navigate('/checkout');
                  }}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base active:scale-[0.98] transition-all cursor-pointer"
                >
                  Купити зараз
                </button>
              </div>
            </div>
          </div>

          {/* Sticky Mobile Buy Bar */}
          <div className="sm:hidden fixed bottom-16 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-medium">Ціна товару</div>
              <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {product.price.toLocaleString('uk-UA')} <span className="text-xs font-normal text-slate-500">грн</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  addItem(product);
                  setIsAdded(true);
                  setTimeout(() => setIsAdded(false), 2000);
                }}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white active:scale-95 shadow-md shadow-blue-600/20'
                }`}
              >
                {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
                <span>{isAdded ? 'Додано' : 'У кошик'}</span>
              </button>
              <button
                onClick={() => {
                  addItem(product);
                  navigate('/checkout');
                }}
                className="px-3.5 py-2.5 bg-slate-900 dark:bg-zinc-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
              >
                Купити
              </button>
            </div>
          </div>

          {/* Recommended Products */}
          {recommendedProducts.length > 0 && (
            <div className="mt-12 sm:mt-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
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
