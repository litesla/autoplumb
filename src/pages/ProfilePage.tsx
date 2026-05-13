import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShoppingBag, Heart, MapPin, LogOut, ChevronRight, Package, Clock, CheckCircle, Truck, XCircle, Award, Sparkles, Phone, Mail, Save, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order, Product } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface UserProfile {
  fullName: string;
  phone: string;
  address: string;
  savedAddresses: string[];
}

export const ProfilePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'settings' | 'addresses'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    phone: '',
    address: '',
    savedAddresses: []
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newAddress, setNewAddress] = useState('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: false });
        
        if (data) {
          setOrders(data.map(o => ({
            ...o,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
          })) as Order[]);
        }
        setLoading(false);
      };

      fetchOrders();

      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.uid)
          .single();
        
        if (data) {
          setProfile({
            fullName: data.full_name || '',
            phone: data.phone || '',
            address: data.address || '',
            savedAddresses: data.saved_addresses || []
          });
        }
      };

      fetchProfile();
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.uid,
        full_name: profile.fullName,
        phone: profile.phone,
        address: profile.address,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setIsEditingProfile(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Помилка при збереженні профілю');
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim() || !user) return;
    
    const updatedAddresses = [...(profile.savedAddresses || []), newAddress.trim()];
    try {
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.uid,
        saved_addresses: updatedAddresses,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setProfile({ ...profile, savedAddresses: updatedAddresses });
      setNewAddress('');
      setIsAddingAddress(false);
    } catch (err) {
      console.error('Error adding address:', err);
      alert('Помилка при додаванні адреси');
    }
  };

  const handleDeleteAddress = async (index: number) => {
    if (!user) return;
    const updatedAddresses = profile.savedAddresses.filter((_, i) => i !== index);
    try {
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.uid,
        saved_addresses: updatedAddresses,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setProfile({ ...profile, savedAddresses: updatedAddresses });
    } catch (err) {
      console.error('Error deleting address:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-yellow-500" size={18} />;
      case 'processing': return <Package className="text-blue-500" size={18} />;
      case 'shipped': return <Truck className="text-purple-500" size={18} />;
      case 'delivered': return <CheckCircle className="text-green-500" size={18} />;
      case 'cancelled': return <XCircle className="text-red-500" size={18} />;
      default: return <Clock className="text-gray-500" size={18} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Очікує підтвердження';
      case 'processing': return 'В обробці';
      case 'shipped': return 'Відправлено';
      case 'delivered': return 'Доставлено';
      case 'cancelled': return 'Скасовано';
      default: return status;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6 lg:sticky lg:top-28">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-600/30 dark:shadow-none">
                      {user.email?.[0].toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 border-4 border-white dark:border-gray-800 rounded-full" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1 truncate px-2">
                  {profile.fullName || 'Мій Профіль'}
                </h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 truncate px-2">{user.email}</p>
                
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 py-3 text-red-500 font-black hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all active:scale-95"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Вийти</span>
                  </button>
                </div>
              </div>

              <nav className="bg-white dark:bg-gray-800 p-3 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 space-y-1">
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
                    activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <ShoppingBag size={18} />
                    <span className="text-sm">Замовлення</span>
                  </div>
                  {activeTab === 'orders' && <ChevronRight size={16} />}
                </button>
                <button 
                  onClick={() => setActiveTab('wishlist')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
                    activeTab === 'wishlist' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Heart size={18} />
                    <span className="text-sm">Обране</span>
                  </div>
                  {activeTab === 'wishlist' && <ChevronRight size={16} />}
                </button>
                <button 
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
                    activeTab === 'addresses' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MapPin size={18} />
                    <span className="text-sm">Адреси</span>
                  </div>
                  {activeTab === 'addresses' && <ChevronRight size={16} />}
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all ${
                    activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <User size={18} />
                    <span className="text-sm">Налаштування</span>
                  </div>
                  {activeTab === 'settings' && <ChevronRight size={16} />}
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Мої замовлення</h1>
                    <div className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 shadow-sm">
                      Всього: <span className="text-gray-900 dark:text-white">{orders.length}</span>
                    </div>
                  </div>
                  
                  {orders.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 p-16 rounded-[40px] text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700/50 text-gray-300 dark:text-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingBag size={48} />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Замовлень поки немає</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm mx-auto">Зробіть ваше перше замовлення, і воно з'явиться тут для відстеження.</p>
                      <button 
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Повернутися до покупок
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map(order => (
                        <motion.div 
                          key={order.id} 
                          layout
                          className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100 dark:border-gray-700">
                            <div className="space-y-1">
                              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Номер замовлення</div>
                              <div className="font-black text-xl text-gray-900 dark:text-white">#{order.id.toString().slice(-8).toUpperCase()}</div>
                              <div className="text-sm font-bold text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center space-x-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100/50 dark:border-gray-600/50">
                                {getStatusIcon(order.status)}
                                <span className="font-black text-sm text-gray-900 dark:text-white">{getStatusText(order.status)}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Разом</div>
                                <div className="text-2xl font-black text-blue-600">{order.total_price} <span className="text-sm uppercase tracking-tight">грн</span></div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center space-x-4 p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100/50 dark:border-gray-700/50">
                                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                  <img 
                                    src={item.image || `https://picsum.photos/seed/${item.id}/100/100`} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=AutoPlumb';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-black text-gray-900 dark:text-white truncate">{item.name}</div>
                                  <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">Кількість: {item.quantity}</div>
                                  <div className="text-sm font-black text-blue-600 mt-1">{item.price} грн</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button 
                              onClick={() => navigate(`/order-tracking?id=${order.id}`)}
                              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-black text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
                            >
                              Дізнатися де моє замовлення
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'wishlist' && (
                <motion.div
                  key="wishlist"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-8">Список бажань</h1>
                  
                  {wishlist.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 p-16 rounded-[40px] text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700/50 text-gray-300 dark:text-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Heart size={48} />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Тут поки порожньо</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm mx-auto">Додавайте товари, які вам подобаються, щоб повернутися до них пізніше.</p>
                      <button 
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Перейти до товарів
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {wishlist.map(product => (
                        <motion.div 
                          layout
                          key={product.id} 
                          className="bg-white dark:bg-gray-800 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-6 hover:shadow-md transition-all group"
                        >
                          <div className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                            <img src={product.image || `https://picsum.photos/seed/${product.id}/200/200`} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <h3 className="font-black text-gray-900 dark:text-white line-clamp-2 leading-snug">{product.name}</h3>
                              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/50 mt-1 inline-block">{product.category}</span>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-xl font-black text-blue-600">{product.price} <span className="text-xs">грн</span></span>
                              <button 
                                onClick={() => navigate(`/product/${product.id}`)}
                                className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                              >
                                <ChevronRight size={20} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'addresses' && (
                <motion.div
                  key="addresses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Адреси доставки</h1>
                    <button 
                      onClick={() => setIsAddingAddress(true)}
                      className="flex items-center space-x-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={18} />
                      <span>Додати нову</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {isAddingAddress && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border-2 border-blue-100 dark:border-blue-900/30 mb-8 overflow-hidden shadow-xl shadow-blue-50 dark:shadow-none"
                      >
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Нова адреса</h3>
                        <textarea
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="Місто, відділення пошти, назва вулиці..."
                          className="w-full bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[120px] font-bold text-gray-900 dark:text-white mb-6 resize-none"
                        />
                        <div className="flex justify-end space-x-3">
                          <button 
                            onClick={() => setIsAddingAddress(false)}
                            className="px-6 py-3 font-bold text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Скасувати
                          </button>
                          <button 
                            onClick={handleAddAddress}
                            className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                          >
                            Зберегти
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.savedAddresses && profile.savedAddresses.length > 0 ? (
                      profile.savedAddresses.map((addr, idx) => (
                        <motion.div 
                          layout
                          key={idx} 
                          className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm relative group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                              <MapPin size={24} />
                            </div>
                            <button 
                              onClick={() => handleDeleteAddress(idx)}
                              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <p className="font-bold text-gray-900 dark:text-white leading-relaxed">{addr}</p>
                        </motion.div>
                      ))
                    ) : (
                      <div className="md:col-span-2 py-16 text-center bg-white dark:bg-gray-800 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 font-bold italic">Ви ще не зберегли жодної адреси доставки.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Налаштування</h1>
                    {!isEditingProfile && (
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl font-black text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
                      >
                        Редагувати
                      </button>
                    )}
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm max-w-3xl">
                    <form onSubmit={handleSaveProfile} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">
                            <User size={12} />
                            <span>Повне ім'я</span>
                          </label>
                          <input 
                            disabled={!isEditingProfile}
                            value={profile.fullName}
                            onChange={e => setProfile({...profile, fullName: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-600/30 focus:bg-white dark:focus:bg-black rounded-2xl px-6 py-4 font-bold text-gray-900 dark:text-white transition-all disabled:opacity-40"
                            placeholder="Ваше ім'я та прізвище"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center space-x-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">
                            <Phone size={12} />
                            <span>Телефон</span>
                          </label>
                          <input 
                            disabled={!isEditingProfile}
                            value={profile.phone}
                            onChange={e => setProfile({...profile, phone: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-600/30 focus:bg-white dark:focus:bg-black rounded-2xl px-6 py-4 font-bold text-gray-900 dark:text-white transition-all disabled:opacity-40"
                            placeholder="+380 (__) __-___-__"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center space-x-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">
                          <Mail size={12} />
                          <span>Email (Неможливо змінити)</span>
                        </label>
                        <div className="w-full bg-gray-100/50 dark:bg-gray-900/50 border-2 border-transparent rounded-2xl px-6 py-4 font-black text-gray-400 dark:text-gray-600">
                          {user.email}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center space-x-2 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">
                          <MapPin size={12} />
                          <span>Основна адреса</span>
                        </label>
                        <textarea 
                          disabled={!isEditingProfile}
                          value={profile.address}
                          onChange={e => setProfile({...profile, address: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-600/30 focus:bg-white dark:focus:bg-black rounded-2xl px-6 py-4 font-bold text-gray-900 dark:text-white transition-all disabled:opacity-40 h-32 resize-none leading-relaxed"
                          placeholder="Ваша головна адреса для замовлень..."
                        />
                      </div>

                      {isEditingProfile && (
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                          <button 
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="w-full sm:w-auto px-10 py-4 font-black text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            Скасувати
                          </button>
                          <button 
                            type="submit"
                            className="w-full sm:w-auto bg-blue-600 text-white px-12 py-5 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
                          >
                            <Save size={20} />
                            <span>Зберегти налаштування</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
