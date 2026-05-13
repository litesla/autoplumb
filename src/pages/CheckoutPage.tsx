import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, CreditCard, Phone, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { auth } from '../lib/firebase';

export const CheckoutPage: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    payment: 'card',
    agreed: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) {
      alert('Будь ласка, погодьтеся з умовами використання та політикою конфіденційності');
      return;
    }
    setLoading(true);
    
    try {
      const { data, error } = await supabase.from('orders').insert({
        items: JSON.stringify(items),
        total_price: total,
        phone: formData.phone,
        delivery_address: formData.address,
        status: 'pending',
        user_id: auth.currentUser?.uid || null
      }).select().single();

      if (error) throw error;

      clearCart();
      navigate(`/order-tracking/${data.id}`);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Помилка при створенні замовлення');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-3xl font-black mb-4">Ваш кошик порожній</h2>
        <button onClick={() => navigate('/')} className="text-blue-600 font-bold hover:underline">Повернутися до покупок</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-12">
          <h1 className="text-4xl font-black text-gray-900">Оформлення замовлення</h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-blue-600 mb-2">
                <Phone size={20} />
                <h3 className="text-xl font-bold text-gray-900">Контактні дані</h3>
              </div>
              <input
                required
                type="tel"
                placeholder="Номер телефону"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-blue-600 mb-2">
                <MapPin size={20} />
                <h3 className="text-xl font-bold text-gray-900">Доставка</h3>
              </div>
              <textarea
                required
                placeholder="Адреса доставки (Місто, відділення Нової Пошти)"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-32"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-blue-600 mb-2">
                <CreditCard size={20} />
                <h3 className="text-xl font-bold text-gray-900">Оплата</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, payment: 'card'})}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    formData.payment === 'card' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="font-bold mb-1">Оплата карткою</div>
                  <div className="text-xs text-gray-500">Онлайн на сайті</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, payment: 'cash'})}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    formData.payment === 'cash' ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="font-bold mb-1">При отриманні</div>
                  <div className="text-xs text-gray-500">Накладений платіж</div>
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center h-6">
                <input
                  id="agreed"
                  type="checkbox"
                  required
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  checked={formData.agreed}
                  onChange={e => setFormData({...formData, agreed: e.target.checked})}
                />
              </div>
              <label htmlFor="agreed" className="text-sm text-gray-500 leading-relaxed cursor-pointer select-none">
                Я погоджуюсь з <Link to="/legal/terms" className="text-blue-600 font-bold hover:underline">Публічною офертою</Link> та <Link to="/legal/privacy" className="text-blue-600 font-bold hover:underline">Політикою конфіденційності</Link>
              </label>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Оформлення...' : `Підтвердити замовлення на ${total} грн`}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 p-12 rounded-[40px] h-fit sticky top-32">
          <h3 className="text-2xl font-black mb-8">Ваше замовлення</h3>
          <div className="space-y-6 mb-8">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">Кількість: {item.quantity}</div>
                </div>
                <div className="font-bold">{item.price * item.quantity} грн</div>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-gray-200 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-600">Разом до оплати:</span>
            <span className="text-3xl font-black text-blue-600">{total} грн</span>
          </div>
        </div>
      </div>
    </div>
  );
};
