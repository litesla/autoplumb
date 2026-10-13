import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, CreditCard, Phone, MapPin, User, Check, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { auth } from '../lib/firebase';

export const CheckoutPage: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    deliveryMethod: 'nova_poshta',
    city: '',
    address: '',
    payment: 'cash',
    comment: '',
    agreed: true
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreed) {
      alert('Будь ласка, погодьтеся з умовами використання та політикою конфіденційності');
      return;
    }

    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      alert('Будь ласка, вкажіть коректний номер телефону (наприклад: +380 67 123 45 67)');
      return;
    }

    setLoading(true);
    setNotice(null);

    const deliveryMethodLabel = 
      formData.deliveryMethod === 'nova_poshta' ? 'Нова Пошта' :
      formData.deliveryMethod === 'ukrposhta' ? 'Укрпошта' : 'Самовивіз зі складу';

    const fullDeliveryInfo = [
      formData.city ? `Місто: ${formData.city}` : '',
      `Спосіб: ${deliveryMethodLabel}`,
      `Адреса/відділення: ${formData.address || 'Самовивіз'}`,
      formData.fullName ? `Одержувач: ${formData.fullName}` : '',
      formData.comment ? `Коментар: ${formData.comment}` : ''
    ].filter(Boolean).join('\n');

    const generatedOrderId = Date.now();

    const orderPayload = {
      items: JSON.stringify(items),
      total_price: total,
      phone: formData.phone.trim(),
      customer_name: formData.fullName.trim() || 'Клієнт',
      delivery_address: fullDeliveryInfo,
      status: 'pending',
      user_id: auth.currentUser?.uid || null
    };

    let confirmedId: string | number = generatedOrderId;

    try {
      // 1. Try insert with customer_name
      let { data, error } = await supabase.from('orders').insert(orderPayload).select().single();

      // 2. If table doesn't have customer_name column, retry without it
      if (error && error.message && error.message.includes('customer_name')) {
        const fallbackPayload = {
          items: JSON.stringify(items),
          total_price: total,
          phone: formData.phone.trim(),
          delivery_address: fullDeliveryInfo,
          status: 'pending',
          user_id: auth.currentUser?.uid || null
        };
        const retryResult = await supabase.from('orders').insert(fallbackPayload).select().single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (data && data.id) {
        confirmedId = data.id;
      }
    } catch (err) {
      console.warn('Supabase order creation note:', err);
    }

    // Always store in local orders backup so the order can never be lost!
    try {
      const existing = JSON.parse(localStorage.getItem('local_user_orders') || '[]');
      const newLocalOrder = {
        id: confirmedId,
        items,
        total_price: total,
        phone: formData.phone.trim(),
        customer_name: formData.fullName.trim() || 'Клієнт',
        delivery_address: fullDeliveryInfo,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('local_user_orders', JSON.stringify([newLocalOrder, ...existing]));
    } catch (err) {
      console.error(err);
    }

    clearCart();
    setLoading(false);
    navigate(`/order-tracking/${confirmedId}`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-black transition-colors">
        <div className="w-20 h-20 bg-blue-50 dark:bg-zinc-800/80 rounded-3xl flex items-center justify-center mb-5 text-blue-600 dark:text-blue-400">
          <Truck size={36} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">Ваш кошик порожній</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm mb-6">
          Виберіть автозапчастини або сантехніку в каталозі, щоб оформити замовлення.
        </p>
        <Link 
          to="/" 
          className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          Перейти до каталогу
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black py-8 sm:py-12 pb-24 md:pb-14 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-6 text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Назад до покупок</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-8 tracking-tight">
          Оформлення замовлення
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Contact Info */}
              <div className="bg-white dark:bg-zinc-900 p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 mb-2">
                  <User size={20} />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Контактні дані</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Прізвище та ім'я <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="наприклад: Іван Мельник"
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Номер телефону <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      placeholder="+380 (__) ___-__-__"
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Менеджер зателефонує за цим номером для підтвердження наявності.
                  </p>
                </div>
              </div>

              {/* 2. Delivery */}
              <div className="bg-white dark:bg-zinc-900 p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 mb-2">
                  <Truck size={20} />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Спосіб доставки</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'nova_poshta' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.deliveryMethod === 'nova_poshta'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">Нова Пошта</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Відділення / Поштомат (1–2 дні)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'ukrposhta' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.deliveryMethod === 'ukrposhta'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">Укрпошта</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">По всій Україні (2–4 дні)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'pickup' })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.deliveryMethod === 'pickup'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">Самовивіз</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Зі складу (Безкоштовно)</div>
                  </button>
                </div>

                {formData.deliveryMethod !== 'pickup' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                        Місто або селище <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="наприклад: Київ, Львів, Вінниця, Полтава..."
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                        Номер відділення або адреса <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        placeholder="Вкажіть номер відділення Нової Пошти / поштомату або точну адресу"
                        className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all h-24"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Коментар до замовлення (необов'язково)
                  </label>
                  <input
                    type="text"
                    placeholder="Уточнення щодо сумісності, часу дзвінка тощо"
                    className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    value={formData.comment}
                    onChange={e => setFormData({ ...formData, comment: e.target.value })}
                  />
                </div>
              </div>

              {/* 3. Payment */}
              <div className="bg-white dark:bg-zinc-900 p-5 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 mb-2">
                  <CreditCard size={20} />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Спосіб оплати</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payment: 'cash' })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.payment === 'cash'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Накладений платіж</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">Оплата готівкою або карткою при отриманні</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payment: 'card' })}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.payment === 'card'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500 ring-2 ring-blue-600/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Онлайн карткою / IBAN</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">Реквізити для оплати після перевірки наявності</div>
                  </button>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-start space-x-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800">
                <input
                  id="agreed"
                  type="checkbox"
                  required
                  className="w-4 h-4 mt-0.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  checked={formData.agreed}
                  onChange={e => setFormData({ ...formData, agreed: e.target.checked })}
                />
                <label htmlFor="agreed" className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed cursor-pointer select-none">
                  Я погоджуюсь з <Link to="/legal/terms" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Публічною офертою</Link> та <Link to="/legal/privacy" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Політикою конфіденційності</Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Оформлення замовлення...' : `Підтвердити замовлення • ${total.toLocaleString('uk-UA')} грн`}
              </button>
            </form>
          </div>

          {/* Cart Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm sticky top-24 space-y-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Ваше замовлення ({items.reduce((acc, i) => acc + i.quantity, 0)})
              </h3>

              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-zinc-800/80 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.name}</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">
                        {item.quantity} × {item.price.toLocaleString('uk-UA')} грн
                      </div>
                    </div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                      {(item.price * item.quantity).toLocaleString('uk-UA')} грн
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
                  <span>Доставка:</span>
                  <span className="font-bold text-slate-700 dark:text-zinc-300">За тарифами перевізника</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-base font-bold text-slate-700 dark:text-zinc-300">Разом до оплати:</span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {total.toLocaleString('uk-UA')} грн
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                <span>Безпечне замовлення. Оплата після перевірки товару при отриманні.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CheckoutPage;
