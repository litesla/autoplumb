import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, MapPin, Phone } from 'lucide-react';
import { Order } from '../lib/utils';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const path = `orders/${id}`;
    
    const unsubscribe = onSnapshot(doc(db, 'orders', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrder({
          id: docSnap.id,
          ...data,
          items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items
        } as Order);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, path);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Завантаження...</div>;
  if (!order) return <div className="min-h-screen flex items-center justify-center">Замовлення не знайдено</div>;

  const steps = [
    { key: 'pending', label: 'Прийнято', icon: Clock },
    { key: 'processing', label: 'В роботі', icon: Package },
    { key: 'shipped', label: 'Відправлено', icon: Truck },
    { key: 'delivered', label: 'Доставлено', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.status);

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[40px] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden"
      >
        <div className="bg-blue-600 p-12 text-white">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-black">Замовлення #{order.id}</h1>
            <span className="px-4 py-1 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold uppercase tracking-wider">
              {steps[currentStepIndex]?.label || order.status}
            </span>
          </div>
          
          <div className="grid grid-cols-4 gap-4 relative">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-white/20 -z-0" />
            <div 
              className="absolute top-5 left-0 h-0.5 bg-white transition-all duration-1000 -z-0" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />
            
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors duration-500 ${
                    isCompleted ? 'bg-white text-blue-600' : 'bg-blue-400 text-blue-200'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-xs font-bold transition-colors duration-500 ${
                    isCompleted ? 'text-white' : 'text-blue-200'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <h3 className="text-xl font-black text-gray-900">Деталі доставки</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gray-50 rounded-xl text-blue-600"><Phone size={20} /></div>
                <div>
                  <div className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Телефон</div>
                  <div className="font-bold text-gray-900">{order.phone}</div>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gray-50 rounded-xl text-blue-600"><MapPin size={20} /></div>
                <div>
                  <div className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Адреса</div>
                  <div className="font-bold text-gray-900">{order.delivery_address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-xl font-black text-gray-900">Ваші товари</h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">x{item.quantity}</div>
                  </div>
                  <div className="font-bold text-blue-600">{item.price * item.quantity} грн</div>
                </div>
              ))}
              <div className="pt-4 flex justify-between items-center">
                <span className="font-bold text-gray-400 uppercase tracking-wider">Разом</span>
                <span className="text-2xl font-black text-gray-900">{order.total_price} грн</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-12 bg-gray-50 border-t border-gray-100 flex justify-center">
          <Link to="/" className="text-blue-600 font-bold hover:underline">Повернутися на головну</Link>
        </div>
      </motion.div>
    </div>
  );
};
