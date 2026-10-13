import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, MapPin, Phone } from 'lucide-react';
import { Order } from '../lib/utils';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data) {
          setOrder({
            ...data,
            items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items
          } as Order);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase fetch order notice:', err);
      }

      // Check local fallback
      try {
        const localOrders = JSON.parse(localStorage.getItem('local_user_orders') || '[]');
        const found = localOrders.find((o: any) => String(o.id) === String(id));
        if (found) {
          setOrder(found);
        }
      } catch (e) {
        console.error(e);
      }

      setLoading(false);
    };

    fetchOrder();

    const channel = supabase
      .channel(`order_tracking_${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, payload => {
        if (payload.new) {
          setOrder({
            ...payload.new,
            items: typeof payload.new.items === 'string' ? JSON.parse(payload.new.items) : payload.new.items
          } as Order);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-zinc-400 font-medium">
        Завантаження деталей замовлення...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Замовлення не знайдено</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-sm">
          Можливо, номер замовлення вказано невірно або воно ще обробляється.
        </p>
        <Link to="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
          Повернутися до каталогу
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: 'Прийнято', icon: Clock },
    { key: 'processing', label: 'В роботі', icon: Package },
    { key: 'shipped', label: 'Відправлено', icon: Truck },
    { key: 'delivered', label: 'Доставлено', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="container mx-auto px-4 py-8 sm:py-14 max-w-4xl pb-24 md:pb-14">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-10 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div>
              <div className="text-xs text-blue-200 uppercase tracking-widest font-bold mb-1">Статус замовлення</div>
              <h1 className="text-2xl sm:text-3xl font-black">Замовлення #{order.id}</h1>
            </div>
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider">
              {steps[currentStepIndex]?.label || order.status}
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 sm:gap-4 relative pt-2 pb-2">
            <div className="absolute top-7 left-4 right-4 h-0.5 bg-white/25 -z-0" />
            <div 
              className="absolute top-7 left-4 h-0.5 bg-white transition-all duration-1000 -z-0" 
              style={{ width: `${Math.max(0, (currentStepIndex / (steps.length - 1)) * 92)}%` }}
            />
            
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center relative z-10 text-center">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center mb-2 transition-colors duration-500 ${
                    isCompleted ? 'bg-white text-blue-600 shadow-md' : 'bg-blue-500/80 text-blue-100'
                  }`}>
                    <Icon size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold leading-tight ${
                    isCompleted ? 'text-white' : 'text-blue-200'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 sm:p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Truck size={18} className="text-blue-600" />
              <span>Деталі доставки</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-3.5 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Телефон</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{order.phone}</div>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3.5 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Адреса та відділення</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm whitespace-pre-line">{order.delivery_address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Package size={18} className="text-blue-600" />
              <span>Замовлені позиції</span>
            </h3>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-zinc-800 last:border-0">
                  <div className="pr-3">
                    <div className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{item.name}</div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400">Кількість: {item.quantity} шт.</div>
                  </div>
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-sm whitespace-nowrap">
                    {(item.price * item.quantity).toLocaleString('uk-UA')} грн
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                <span className="font-bold text-slate-500 dark:text-zinc-400 uppercase text-xs tracking-wider">Разом:</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {Number(order.total_price).toLocaleString('uk-UA')} грн
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-zinc-400 text-center sm:text-left">
            Менеджер зв'яжеться з вами за номером <strong className="text-slate-800 dark:text-zinc-200">{order.phone}</strong>
          </div>
          <Link 
            to="/" 
            className="w-full sm:w-auto text-center px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Повернутися до покупок
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
