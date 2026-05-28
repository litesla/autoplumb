import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function triggerFlyToCart(imageSrc: string, clickEvent: React.MouseEvent) {
  if (typeof window === 'undefined') return;
  
  const cartBtn = document.getElementById('header-cart-btn') || document.querySelector('[data-mobile-cart]');
  if (!cartBtn) return;

  const targetRect = cartBtn.getBoundingClientRect();
  
  // Find source element (either the clicked card's image or fallback coordinates)
  const clickedTarget = clickEvent.target as HTMLElement;
  const card = clickedTarget.closest('.group') || clickedTarget.closest('div');
  const imgEl = card?.querySelector('img');
  
  let startX = clickEvent.clientX;
  let startY = clickEvent.clientY;
  let startWidth = 64;
  let startHeight = 64;

  if (imgEl) {
    const imgRect = imgEl.getBoundingClientRect();
    startX = imgRect.left + imgRect.width / 2;
    startY = imgRect.top + imgRect.height / 2;
    startWidth = imgRect.width;
    startHeight = imgRect.height;
  }

  // Create flyer element
  const flyer = document.createElement('div');
  flyer.style.position = 'fixed';
  flyer.style.left = `${startX - startWidth / 2}px`;
  flyer.style.top = `${startY - startHeight / 2}px`;
  flyer.style.width = `${startWidth}px`;
  flyer.style.height = `${startHeight}px`;
  flyer.style.backgroundImage = `url(${imageSrc})`;
  flyer.style.backgroundSize = 'cover';
  flyer.style.backgroundPosition = 'center';
  flyer.style.borderRadius = '50%';
  flyer.style.zIndex = '100000';
  flyer.style.pointerEvents = 'none';
  // Use a beautifully tuned cubic bezier curve for high elegance
  flyer.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
  flyer.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.4)';
  flyer.style.border = '2px solid rgba(255, 255, 255, 0.8)';

  document.body.appendChild(flyer);

  // Animate target
  requestAnimationFrame(() => {
    flyer.style.left = `${targetRect.left + targetRect.width / 2 - 12}px`;
    flyer.style.top = `${targetRect.top + targetRect.height / 2 - 12}px`;
    flyer.style.width = '24px';
    flyer.style.height = '24px';
    flyer.style.opacity = '0.3';
    flyer.style.transform = 'scale(0.2) rotate(360deg)';
  });

  setTimeout(() => {
    flyer.remove();
    // Add pop-once scale bounce animation class to cart
    cartBtn.classList.add('animate-ping-once');
    setTimeout(() => {
      cartBtn.classList.remove('animate-ping-once');
    }, 400);
  }, 800);
}

export interface Product {
  id: string | number;
  name: string;
  price: number;
  category: string;
  description: string;
  image: string;
  image_url?: string;
  images?: string[];
  stock: number;
  type: 'auto' | 'plumbing';
  brand?: string;
  article?: string;
  specs?: string;
  rating?: number;
  reviewCount?: number;
}

export interface OrderItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string | number;
  items: OrderItem[];
  total_price: number;
  phone: string;
  delivery_address: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  user_id?: string;
}

const EN_UA_LAYOUT: { [key: string]: string } = {
  'q':'й', 'w':'ц', 'e':'у', 'r':'к', 't':'е', 'y':'н', 'u':'г', 'i':'ш', 'o':'щ', 'p':'з', '[':'х', ']':'ї',
  'a':'ф', 's':'і', 'd':'в', 'f':'а', 'g':'п', 'h':'р', 'j':'о', 'k':'л', 'l':'д', ';':'ж', "'":'є',
  'z':'я', 'x':'ч', 'c':'с', 'v':'м', 'b':'и', 'n':'т', 'm':'ь', ',':'б', '.':'ю', '/':'.'
};

const UA_EN_LAYOUT: { [key: string]: string } = {};
Object.entries(EN_UA_LAYOUT).forEach(([en, ua]) => {
  UA_EN_LAYOUT[ua] = en;
});

const BRAND_TRANSLMS: { [key: string]: string } = {
  "бош": "bosch", "bosch": "бош",
  "кастрол": "castrol", "castrol": "кастрол",
  "шелл": "shell", "шел": "shell", "shell": "шел",
  "мотул": "motul", "motul": "мотул",
  "мобіль": "mobil", "mobil": "мобіль",
  "зік": "zic", "zic": "зік",
  "ельф": "elf", "elf": "ельф",
  "гроє": "grohe", "грое": "grohe", "grohe": "гроє",
  "рехау": "rehau", "rehau": "рехау",
  "кніпекс": "knipex", "knipex": "кніпекс",
  "хансгрое": "hansgrohe", "hansgrohe": "хансгрое",
  "дот": "dot", "dot": "дот",
  "тосол": "tosol", "tosol": "тосол",
  "антифриз": "antifreeze", "antifreeze": "антифриз",
  "вд": "wd", "wd": "вд",
  "вд-40": "wd-40", "wd-40": "вд-40"
};

export function convertLayout(str: string, toUa: boolean = true): string {
  const dictionary = toUa ? EN_UA_LAYOUT : UA_EN_LAYOUT;
  return str.split('').map(char => {
    const l = char.toLowerCase();
    if (dictionary[l]) {
      const trans = dictionary[l];
      return char === l ? trans : trans.toUpperCase();
    }
    return char;
  }).join('');
}

export function getStem(word: string): string {
  let w = word.trim().toLowerCase();
  
  // We only strip from Cyrillic words to prevent breaking English code/articles
  const isCyrillic = /[а-яіїєґ]/i.test(w);
  if (!isCyrillic) return w;

  if (w.length < 4) return w;

  // List of common Ukrainian noun/adj/verb endings to strip (longest first)
  const endings = [
    'иями', 'ями', 'ями', 'ові', 'еві', 'иму', 'іму',
    'име', 'іме', 'ому', 'ему', 'ими', 'иму', 'ою', 'ею', 'єю', 'ами', 'ями', 'ий', 'ій', 'ої', 'ім', 'ем', 'єм', 'их', 'іх',
    'ах', 'ях', 'ам', 'ям', 'ом', 'ем', 'єм', 'ик', 'ів', 'ій', 'ич', 'ок', 'ав', 'ив', 'иш', 'еш', 'єщ', 'ут', 'ют', 'ат', 'ят', 'ти', 'ть', 'ая', 'яя', 'ое', 'ее', 'у', 'ю', 'а', 'я', 'и', 'і', 'ї', 'о', 'е'
  ];

  for (const ending of endings) {
    if (w.endsWith(ending) && (w.length - ending.length) >= 3) {
      return w.slice(0, -ending.length);
    }
  }

  return w;
}

export function getSearchKeywords(query: string): string[] {
  if (!query) return [];
  
  // Replace slashes, commas, and other punctuation with spaces to allow matching individual parts
  // But keep hyphens since articles can be like "wd-40" or "mtz-80"
  let cleanQuery = query.toLowerCase().replace(/[/,\\;:+()]/g, ' ');

  const stopWords = new Set([
    "купити", "купить", "замовити", "заказать", "ціна", "цена", 
    "в", "на", "з", "для", "і", "та", "й", "не", "що", "це", "б", "ж", "а", "але", "чи", "або", "як", "про", "до", "по", "біля", "під", "над", "через", "при", "від"
  ]);

  return cleanQuery
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 0 && !stopWords.has(w));
}

export function getExpandedSearchTerms(word: string): string[] {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return [];

  const results = new Set<string>();
  
  // Create a pool of terms we want to check (original word + stemmed word)
  const termPool = new Set<string>();
  termPool.add(cleanWord);
  
  const stem = getStem(cleanWord);
  if (stem && stem !== cleanWord) {
    termPool.add(stem);
  }

  // Expand each term in the pool
  termPool.forEach(term => {
    results.add(term);

    // 1. Synonym / Translation lookup
    if (BRAND_TRANSLMS[term]) {
      results.add(BRAND_TRANSLMS[term]);
      // Also get stem of the brand translation if applicable
      const brandStem = getStem(BRAND_TRANSLMS[term]);
      if (brandStem) results.add(brandStem);
    }

    // 2. Transliteration / Layout conversion
    const hasCyrillic = /[а-яіїєґ]/i.test(term);
    if (hasCyrillic) {
      const converted = convertLayout(term, false);
      if (converted !== term) {
        results.add(converted);
        if (BRAND_TRANSLMS[converted]) results.add(BRAND_TRANSLMS[converted]);
      }
    } else {
      const converted = convertLayout(term, true);
      if (converted !== term) {
        results.add(converted);
        if (BRAND_TRANSLMS[converted]) results.add(BRAND_TRANSLMS[converted]);
      }
    }
  });

  return Array.from(results);
}
