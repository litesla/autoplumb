import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { AlertCircle, Truck } from 'lucide-react';

export const MaintenanceBanner: React.FC = () => {
  const [techBannerMode, setTechBannerMode] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'content', 'settings'), (doc) => {
      if (doc.exists()) {
        setTechBannerMode(doc.data().techBannerMode || false);
      }
    });

    return () => unsub();
  }, []);

  return (
    <AnimatePresence>
      {techBannerMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 overflow-hidden z-[100] border-b border-white/10"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8 text-white">
              <div className="flex items-center space-x-2">
                <AlertCircle size={18} className="text-blue-200 animate-pulse" />
                <span className="font-bold text-sm md:text-base">
                  Технічні роботи:
                </span>
                <span className="text-white/80 text-sm md:text-base font-medium">
                  Редагуємо назви та додаємо нові фото товарів.
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-1 rounded-full border border-white/10">
                <Truck size={16} className="text-blue-200" />
                <span className="font-black text-xs md:text-sm uppercase tracking-wider">
                  Всі товари в наявності та готові до відправки!
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
