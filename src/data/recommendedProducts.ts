import { Product } from '../lib/utils';

/**
 * ПЕРШИЙ СПИСОК РЕКОМЕНДАЦІЙ:
 * «Хіти продажу та рекомендації експертів»
 * Перевірені якісні запчастини та сантехніка з високим рейтингом та офіційною гарантією.
 */
export const TOP_RECOMMENDED_PRODUCTS: Product[] = [
  {
    id: 'rec-top-1',
    name: 'Акумулятор автомобільний Premium Gold 12V 60Ah 540A',
    price: 3450,
    category: 'Акумулятори',
    description: 'Надійний пусковий струм навіть при сильних морозах. Кальцієва технологія пластин зі збільшеним ресурсом.',
    image: '/images/car_battery_clean.jpg',
    stock: 18,
    type: 'auto',
    brand: 'Premium Gold',
    article: 'PG-60AH',
    rating: 4.9,
    reviewCount: 38
  },
  {
    id: 'rec-top-2',
    name: 'Стартер редукторний 12V 2.7kW посилений МТЗ/ЮМЗ',
    price: 3890,
    category: 'Трактори МТЗ',
    description: 'Високий крутний момент для швидкого пуску дизельного двигуна Д-240, Д-65.',
    image: '/images/starter_clean.jpg',
    stock: 14,
    type: 'auto',
    brand: 'Jubana',
    article: 'JB-123708',
    rating: 5.0,
    reviewCount: 42
  },
  {
    id: 'rec-top-3',
    name: 'Змішувач для кухні з гнучким виливом Flexible Aqua Chrome',
    price: 1890,
    category: 'Змішувачі',
    description: 'Гнучкий силіконовий вилив із двома режимами струменя: аератор та потужний розпилювач для посуду.',
    image: '/images/plumbing_faucet_clean.jpg',
    stock: 22,
    type: 'plumbing',
    brand: 'AquaFit',
    article: 'AQ-7201',
    rating: 4.8,
    reviewCount: 29
  },
  {
    id: 'rec-top-4',
    name: 'Комплект гальмівних дискових колодок передніх Premium',
    price: 840,
    category: 'Гальмівна система',
    description: 'Безазбестовий керамічний фрикційний склад із низьким рівнем пилу та стабільним коефіцієнтом тертя.',
    image: '/images/disc_brake_pads_clean.jpg',
    stock: 35,
    type: 'auto',
    brand: 'ABS Brakes',
    article: 'BP-2108-FR',
    rating: 4.9,
    reviewCount: 51
  },
  {
    id: 'rec-top-5',
    name: 'Радіатор алюмінієвий секційний 500/100 (блок 10 секцій)',
    price: 2450,
    category: 'Опалення',
    description: 'Максимальна тепловіддача для автономного та центрального опалення, антикорозійне внутрішнє покриття.',
    image: '/images/heating_radiator_clean.jpg',
    stock: 12,
    type: 'plumbing',
    brand: 'Valtec',
    article: 'VT-404-10',
    rating: 4.9,
    reviewCount: 19
  },
  {
    id: 'rec-top-6',
    name: 'Генератор автомобільний 14V 73A посилений',
    price: 3200,
    category: 'Електрообладнання',
    description: 'Стабільна напруга бортової мережі на холостих обертах, захист від перегріву та пилозахищений діодний міст.',
    image: '/images/alternator_clean.jpg',
    stock: 9,
    type: 'auto',
    brand: 'КЗАТЭ',
    article: 'G-73A-PRO',
    rating: 4.8,
    reviewCount: 24
  },
  {
    id: 'rec-top-7',
    name: 'Супорт гальмівний передній дисковий у зборі лівий/правий',
    price: 1950,
    category: 'Гальмівна система',
    description: 'Повністю готовий до встановлення гідравлічний вузол зі штуцером прокачування та пильником поршня.',
    image: '/images/brake_caliper_clean.jpg',
    stock: 16,
    type: 'auto',
    brand: 'Fenox',
    article: 'CL-2110-L',
    rating: 4.7,
    reviewCount: 17
  },
  {
    id: 'rec-top-8',
    name: 'Душова колона з тропічним душем і термостатом Square Rain',
    price: 3650,
    category: 'Сантехніка',
    description: 'Латунний корпус зі стійким матовим хромуванням, захист від накипу EasyClean.',
    image: '/images/plumbing_shower_clean.jpg',
    stock: 11,
    type: 'plumbing',
    brand: 'Grohe Master',
    article: 'GM-980',
    rating: 5.0,
    reviewCount: 33
  },
  {
    id: 'rec-top-9',
    name: 'ШРКШ приводу колеса зовнішній з пильником і хомутами',
    price: 1050,
    category: 'Трансмісія та КПП',
    description: 'Загартована легована сталь, у комплекті графітове мастило та термостійкий пильник.',
    image: '/images/cv_joint_clean.jpg',
    stock: 20,
    type: 'auto',
    brand: 'GKN Drivetech',
    article: 'CVJ-2109-EXT',
    rating: 4.8,
    reviewCount: 22
  },
  {
    id: 'rec-top-10',
    name: 'Насос циркуляційний для опалення 25-60/180 чавунний',
    price: 2180,
    category: 'Опалення',
    description: 'Тришвидкісний енергоощадний режим, безшумна керамічна вісь ротора, монтажні гайки в комплекті.',
    image: '/images/plumbing_pump_clean.jpg',
    stock: 15,
    type: 'plumbing',
    brand: 'Aquario',
    article: 'CIRC-2560',
    rating: 4.9,
    reviewCount: 27
  }
];

/**
 * ДРУГИЙ СПИСОК РЕКОМЕНДАЦІЙ:
 * «Спеціальні рекомендації: сезонні пропозиції та вигідні комплекти»
 * Затребувані сезонні комплектуючі, розхідники та вигідні позиції з гарантією сумісності.
 */
export const SPECIAL_RECOMMENDED_PRODUCTS: Product[] = [
  {
    id: 'rec-special-1',
    name: 'Амортизатор підвіски масляний посилений газомасляний',
    price: 1420,
    category: 'Ходова частина та підвіска',
    description: 'Ефективне гасіння коливань на будь-якому дорожньому покритті, стійкість до пробоїв під навантаженням.',
    image: '/images/shock_strut_clean.jpg',
    stock: 24,
    type: 'auto',
    brand: 'KYB Excel',
    article: 'SH-334812',
    rating: 4.9,
    reviewCount: 31
  },
  {
    id: 'rec-special-2',
    name: 'Сифон для умивальника пляшковий з переливом і гофрою',
    price: 420,
    category: 'Сантехніка',
    description: 'Якісний первинний поліпропілен, подвійне ущільнення для повного захисту від протікань та запахів.',
    image: '/images/plumbing_siphon_clean.jpg',
    stock: 45,
    type: 'plumbing',
    brand: 'McAlpine',
    article: 'SIPH-40M',
    rating: 4.8,
    reviewCount: 20
  },
  {
    id: 'rec-special-3',
    name: 'Важіль передньої підвіски нижній з сайлентблоками',
    price: 1180,
    category: 'Ходова частина та підвіска',
    description: 'Штампований кований важіль з антикорозійним порошковим фарбуванням та заводським запресовуванням сайлентблоків.',
    image: '/images/control_arm_clean.jpg',
    stock: 19,
    type: 'auto',
    brand: 'Lemforder',
    article: 'ARM-FR-LOW',
    rating: 4.9,
    reviewCount: 26
  },
  {
    id: 'rec-special-4',
    name: 'Кран кульовий повнопрохідний латунний 3/4" посилений ричаг',
    price: 290,
    category: 'Труби та фітинги',
    description: 'Корпус із гарячепресованої латуні CW617N, робочий тиск до PN40, тефлонові сідельні кільця PTFE.',
    image: '/images/plumbing_valve_clean.jpg',
    stock: 60,
    type: 'plumbing',
    brand: 'Valtec Base',
    article: 'VT-217-05',
    rating: 5.0,
    reviewCount: 48
  },
  {
    id: 'rec-special-5',
    name: 'Карбюратор Solex модифікований двокамерний економний',
    price: 3750,
    category: 'Двигун та паливна система',
    description: 'Оптимізована тарова характеристика жиклерів для динамічного розгону та зниженої витрати палива.',
    image: '/images/carburetor_clean.jpg',
    stock: 8,
    type: 'auto',
    brand: 'ДААЗ Озон',
    article: 'SLX-21083',
    rating: 4.7,
    reviewCount: 19
  },
  {
    id: 'rec-special-6',
    name: 'Фільтр масляний повнопотоковий зі зворотним клапаном',
    price: 280,
    category: 'Фільтри та мастила',
    description: 'Спеціальний синтетичний фільтруючий папір з високою брудоємністю, захищає двигун від абразивного зносу.',
    image: '/images/oil_filter_clean.jpg',
    stock: 55,
    type: 'auto',
    brand: 'Mann Filter',
    article: 'W-914-2',
    rating: 5.0,
    reviewCount: 63
  },
  {
    id: 'rec-special-7',
    name: 'Насос водяний (помпа) охолодження з металевою крильчаткою',
    price: 1260,
    category: 'Система охолодження',
    description: 'Посилений дворядний підшипник і керамічно-графітовий сальник забезпечують довговічність без люфтів.',
    image: '/images/water_pump_clean.jpg',
    stock: 17,
    type: 'auto',
    brand: 'Hepa Pro',
    article: 'WP-2108-HE',
    rating: 4.8,
    reviewCount: 23
  },
  {
    id: 'rec-special-8',
    name: 'Кульова опора передньої підвіски посилена з тавотницею',
    price: 480,
    category: 'Ходова частина та підвіска',
    description: 'Кований корпус та полімерний вкладиш із термостійким мастилом, витримує удари на бездоріжжі.',
    image: '/images/ball_joint_clean.jpg',
    stock: 32,
    type: 'auto',
    brand: 'Белмаг Комфорт',
    article: 'BJ-2101-FR',
    rating: 4.8,
    reviewCount: 34
  },
  {
    id: 'rec-special-9',
    name: 'Ремінь приводу генератора зубчастий 10x950 термостійкий',
    price: 340,
    category: 'Двигун та паливна система',
    description: 'Високоякісний еластомер із кордом із поліестеру, стійкий до розтріскування, оливи та високих обертів.',
    image: '/images/drive_belt_clean.jpg',
    stock: 40,
    type: 'auto',
    brand: 'Gates PowerGrip',
    article: 'BLT-10x950',
    rating: 4.9,
    reviewCount: 28
  },
  {
    id: 'rec-special-10',
    name: 'Датчик положення колінчастого вала та тиску електронний',
    price: 410,
    category: 'Електрообладнання',
    description: 'Високоточний магнітний сенсор Холла, герметичний роз\'єм IP67 для стабільної роботи ЕБУ.',
    image: '/images/auto_sensor_clean.jpg',
    stock: 28,
    type: 'auto',
    brand: 'Bosch Sensors',
    article: 'SNR-2111-CKP',
    rating: 4.8,
    reviewCount: 15
  }
];

export const getTopRecommendations = (mode?: 'auto' | 'plumbing' | 'all'): Product[] => {
  if (!mode || mode === 'all') return TOP_RECOMMENDED_PRODUCTS;
  return TOP_RECOMMENDED_PRODUCTS.filter(p => p.type === mode);
};

export const getSpecialRecommendations = (mode?: 'auto' | 'plumbing' | 'all'): Product[] => {
  if (!mode || mode === 'all') return SPECIAL_RECOMMENDED_PRODUCTS;
  return SPECIAL_RECOMMENDED_PRODUCTS.filter(p => p.type === mode);
};
