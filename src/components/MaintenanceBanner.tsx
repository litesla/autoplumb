import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabaseClient';
import { AlertCircle, Truck } from 'lucide-react';

export const MaintenanceBanner: React.FC = () => {
  const [techBannerMode, setTechBannerMode] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('content')
        .select('*')
        .eq('key', 'settings')
        .single();
      
      if (data) {
        setTechBannerMode(data.value?.techBannerMode || false);
      }
    };

    fetchSettings();

    const channel = supabase
      .channel('tech_banner_settings')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'content',
        filter: 'key=eq.settings'
      }, payload => {
        if (payload.new) {
          setTechBannerMode((payload.new as any).value?.techBannerMode || false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AnimatePresence>
      {techBannerMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 z-[100] border-b border-white/10 shadow-md"
        >
          <div className="container mx-auto px-4 py-2.5 sm:py-3">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8 text-white text-center">
              <div className="flex items-center justify-center space-x-2 flex-wrap min-w-0">
                <AlertCircle size={16} className="text-blue-200 animate-pulse shrink-0" />
                <span className="font-bold text-xs sm:text-sm md:text-base whitespace-nowrap">
                  Технічні роботи:
                </span>
                <span className="text-white/90 text-[11px] sm:text-sm md:text-base font-semibold">
                  Редагуємо назви та додаємо нові фото товарів.
                </span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10 shrink-0">
                <Truck size={14} className="text-blue-200 animate-bounce shrink-0" />
                <span className="font-black text-[9px] sm:text-xs md:text-sm uppercase tracking-wider">
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
