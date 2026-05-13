import React from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { supabase } from '../lib/supabaseClient';

export const Hero: React.FC = () => {
  const { mode } = useShop();
  const [dynamicContent, setDynamicContent] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchHero = async () => {
      const { data } = await supabase
        .from('content')
        .select('*')
        .eq('key', 'hero')
        .single();
      
      if (data) {
        setDynamicContent(data.value);
      }
    };

    fetchHero();

    const channel = supabase
      .channel('hero_content')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'content',
        filter: 'key=eq.hero'
      }, payload => {
        if (payload.new) {
          setDynamicContent((payload.new as any).value);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const defaultContent = {
    auto: {
      badge: "Преміум Автотовари",
      title: "AutoPlumb: Автотовари",
      description: "Відкрийте для себе професійні автотовари та комплектуючі, що поєднують якість, функціональність та інновації.",
      button: "Переглянути Каталог"
    },
    plumbing: {
      badge: "Надійна Сантехніка",
      title: "AutoPlumb: Сантехніка",
      description: "Якісні рішення для вашого дому. Від змішувачів до складних систем опалення та водопостачання.",
      button: "Вибрати Сантехніку"
    }
  };

  const current = (dynamicContent && dynamicContent[mode]) ? dynamicContent[mode] : defaultContent[mode];

  return (
    <section className="relative py-12 md:py-32 overflow-hidden">
      {/* Background with floating elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-black dark:to-gray-900 -z-10 transition-colors duration-500" />
      
      <div className="container mx-auto px-4 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 mb-6 text-[10px] font-black tracking-[0.2em] text-blue-600 dark:text-blue-400 uppercase bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100/50 dark:border-blue-800/50 rounded-full"
          >
            {current.badge}
          </motion.span>
          
          <h1 className="text-4xl md:text-8xl font-black text-gray-900 dark:text-white mb-6 md:mb-8 tracking-tighter leading-[0.9]">
            {current.title.split(':').map((part: string, i: number) => (
              <span key={i} className={i === 1 ? "text-blue-600 dark:text-blue-400 block mt-1 md:mt-2" : ""}>
                {part}{i === 0 && ":"}
              </span>
            ))}
          </h1>
          
          <p className="max-w-2xl mx-auto text-sm md:text-xl text-gray-500 dark:text-gray-400 mb-8 md:mb-12 leading-relaxed font-medium px-4">
            {current.description}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 max-w-sm mx-auto sm:max-w-none">
            <button 
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 md:px-8 md:py-4 bg-blue-600 text-white font-black text-base rounded-2xl shadow-2xl shadow-blue-600/40 active:scale-95 transition-all text-center"
            >
              {current.button}
            </button>
            
            <button 
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 md:px-8 md:py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-black text-base rounded-2xl border border-gray-100 dark:border-gray-800 active:scale-95 transition-all text-center md:shadow-sm"
            >
              Контакти
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
