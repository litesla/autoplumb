import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Cookie } from 'lucide-react';

const LEGAL_CONTENT = {
  privacy: {
    title: 'Політика конфіденційності',
    icon: <Shield className="text-blue-600" size={32} />,
    content: `
      <h3>1. Загальні положення</h3>
      <p>Ця Політика конфіденційності визначає порядок отримання, зберігання, обробки та використання персональних даних користувачів сайту AutoPlumb.</p>
      
      <h3>2. Які дані ми збираємо</h3>
      <p>Ми збираємо наступні дані:</p>
      <ul>
        <li>Ім'я та прізвище;</li>
        <li>Номер телефону;</li>
        <li>Адреса електронної пошти;</li>
        <li>Адреса доставки (місто, номер відділення Нової Пошти);</li>
        <li>Інформація про замовлення.</li>
      </ul>

      <h3>3. Мета збору даних</h3>
      <p>Ваші дані використовуються виключно для:</p>
      <ul>
        <li>Оформлення та виконання ваших замовлень;</li>
        <li>Зв'язку з вами щодо статусу замовлення;</li>
        <li>Покращення якості обслуговування;</li>
        <li>Надсилання інформаційних повідомлень (за вашою згодою).</li>
      </ul>

      <h3>4. Захист даних</h3>
      <p>Ми вживаємо всіх необхідних технічних та організаційних заходів для захисту ваших персональних даних від несанкціонованого доступу, зміни або видалення.</p>
    `
  },
  terms: {
    title: 'Публічна оферта',
    icon: <FileText className="text-indigo-600" size={32} />,
    content: `
      <h3>1. Предмет договору</h3>
      <p>Продавець зобов'язується передати у власність Покупця товар, а Покупець зобов'язується оплатити і прийняти товар на умовах даного Договору.</p>
      
      <h3>2. Оформлення замовлення</h3>
      <p>Замовлення здійснюється Покупцем через кошик на сайті або за телефоном, вказаним на сайті.</p>

      <h3>3. Оплата та доставка</h3>
      <p>Оплата товару здійснюється готівкою при отриманні (накладений платіж) або за реквізитами. Доставка здійснюється службами доставки по всій території України.</p>

      <h3>4. Повернення товару</h3>
      <p>Покупець має право повернути товар належної якості протягом 14 днів з моменту покупки, якщо товар не був у вжитку та збережено його товарний вигляд.</p>
    `
  },
  cookies: {
    title: 'Політика Cookie',
    icon: <Cookie className="text-emerald-600" size={32} />,
    content: `
      <h3>Що таке файли cookie?</h3>
      <p>Файли cookie — це невеликі текстові файли, які зберігаються у вашому браузері під час відвідування нашого сайту.</p>
      
      <h3>Як ми їх використовуємо</h3>
      <p>Ми використовуємо cookie для:</p>
      <ul>
        <li>Збереження товарів у вашому кошику;</li>
        <li>Запам'ятовування ваших налаштувань (наприклад, обраний режим "Авто" чи "Сантехніка");</li>
        <li>Аналізу відвідуваності сайту для його покращення.</li>
      </ul>

      <h3>Як вимкнути cookie</h3>
      <p>Ви можете вимкнути файли cookie у налаштуваннях вашого браузера, проте це може вплинути на функціональність сайту.</p>
    `
  }
};

export const LegalPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const pageData = LEGAL_CONTENT[type as keyof typeof LEGAL_CONTENT];

  if (!pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Сторінку не знайдено</h1>
          <Link to="/" className="text-blue-600 hover:underline">Повернутися на головну</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Назад до магазину
        </Link>

        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gray-50 rounded-2xl">
              {pageData.icon}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              {pageData.title}
            </h1>
          </div>

          <div 
            className="prose prose-blue max-w-none 
              prose-h3:text-xl prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4
              prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-li:text-gray-600 prose-li:mb-2"
            dangerouslySetInnerHTML={{ __html: pageData.content }}
          />
        </div>

        <div className="mt-12 text-center text-gray-400 text-sm">
          Останнє оновлення: 20 березня 2026 року
        </div>
      </div>
    </div>
  );
};
