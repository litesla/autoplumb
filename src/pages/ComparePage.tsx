import React from 'react';
import { useCompare } from '../context/CompareContext';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { ArrowLeft, X, ShoppingBag, Scale, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const ComparePage: React.FC = () => {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const { addItem } = useCart();
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
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Порівняння товарів</h1>
            <p className="text-gray-500 font-medium">Порівняйте характеристики та оберіть найкраще</p>
          </div>
          {compareList.length > 0 && (
            <button 
              onClick={clearCompare}
              className="flex items-center space-x-2 px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-600 font-bold hover:text-red-600 hover:border-red-100 hover:bg-red-50/30 transition-all shadow-sm active:scale-95"
            >
              <Trash2 size={18} />
              <span>Очистити список</span>
            </button>
          )}
        </div>

        {compareList.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] p-16 text-center shadow-xl shadow-gray-200/50"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Scale size={48} className="text-gray-200" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">Ваш список порівняння порожній</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">
              Додавайте товари до порівняння, щоб краще зрозуміти їхні переваги та обрати ідеальний варіант.
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
          <div className="bg-white rounded-[40px] shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-8 text-left bg-gray-50/50 border-b border-gray-100 min-w-[200px]">
                      <span className="text-xs font-black uppercase tracking-widest text-gray-400">Характеристика</span>
                    </th>
                    {compareList.map(product => (
                      <th key={product.id} className="p-8 border-b border-gray-100 min-w-[300px] relative group">
                        <button 
                          onClick={() => removeFromCompare(product.id)}
                          className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                        <div className="text-left">
                          <Link to={`/product/${product.id}`} className="block group/item">
                            <div className="aspect-square bg-gray-50 rounded-2xl mb-4 overflow-hidden">
                              <img 
                                src={product.image || `https://picsum.photos/seed/${product.id}/400/400`} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">{product.brand}</div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 line-clamp-2 min-h-[3.5rem] group-hover/item:text-blue-600 transition-colors">{product.name}</h3>
                          </Link>
                          <div className="text-2xl font-black text-blue-600 mb-6">{product.price.toLocaleString()} грн</div>
                          <button 
                            onClick={() => addItem(product)}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center space-x-2"
                          >
                            <ShoppingBag size={18} />
                            <span>В кошик</span>
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-8 font-bold text-gray-900 bg-gray-50/50 border-b border-gray-100">Категорія</td>
                    {compareList.map(product => (
                      <td key={product.id} className="p-8 text-gray-600 border-b border-gray-100">{product.category}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-8 font-bold text-gray-900 bg-gray-50/50 border-b border-gray-100">Бренд</td>
                    {compareList.map(product => (
                      <td key={product.id} className="p-8 text-gray-600 border-b border-gray-100">{product.brand || '—'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-8 font-bold text-gray-900 bg-gray-50/50 border-b border-gray-100">Тип</td>
                    {compareList.map(product => (
                      <td key={product.id} className="p-8 text-gray-600 border-b border-gray-100">
                        {product.type === 'auto' ? 'Автотовари' : 'Сантехніка'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-8 font-bold text-gray-900 bg-gray-50/50 border-b border-gray-100 align-top">Опис</td>
                    {compareList.map(product => (
                      <td key={product.id} className="p-8 text-gray-500 border-b border-gray-100 text-sm leading-relaxed">
                        <div className="line-clamp-6">{product.description}</div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
