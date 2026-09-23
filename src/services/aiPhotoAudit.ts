// AI Photo Audit & Image Quality Diagnostic Service for AutoPlumb
export interface PhotoIssue {
  type: 'duplicate' | 'watermark' | 'offtopic' | 'missing' | 'good';
  severity: 'high' | 'medium' | 'low' | 'none';
  label: string;
  description: string;
  detail?: string;
}

export interface ProductPhotoAuditResult {
  id: string;
  name: string;
  category: string;
  brand: string;
  article: string;
  type: 'auto' | 'plumbing';
  currentImageUrl: string;
  issue: PhotoIssue;
  duplicateCount?: number;
  aiSuggestedKeywords?: string[];
  suggestedImageUrl?: string;
  googleSearchUrl?: string;
  isApproved?: boolean;
}

// Known domains that heavily watermark images or use promotional overlays
export const WATERMARK_DOMAINS = [
  'prom.ua',
  'promstatic.com',
  'olx.ua',
  'olxcdn.com',
  'exist.ua',
  'avto.pro',
  'cdn.riastatic.com',
  'auto.ria.com',
  'aliexpress',
  'shopee',
  'lazada',
  'vseosvita.ua', // educational site images
  'carservic.ru',
  'rbc.ua',
  'down-ph.img.susercontent.com',
];

// Domains/keywords where photos are typically whole vehicles or magazine articles rather than isolated spare parts
export const WHOLE_VEHICLE_PATTERNS = [
  'fahrzeugbilder.de',
  'parkers-images.bauersecure.com',
  'daxstreet.com',
  'cut-out/matiz.j',
  'car-engine-being-prof',
  'stufenheck',
  'car-review',
  'autobild',
  'drive2',
  'cars-directory',
];

// Curated high-resolution, watermark-free product photos on clean/neutral backgrounds
export const CLEAN_PRODUCT_IMAGES: Record<string, string[]> = {
  // Auto spare parts
  'карбюратор': [
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=800'
  ],
  'патрубок': [
    'https://images.unsplash.com/photo-1580983218765-f663bec07b37?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&q=80&w=800'
  ],
  'гальм': [
    'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800'
  ],
  'колодк': [
    'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?auto=format&fit=crop&q=80&w=800'
  ],
  'підшипник': [
    'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800'
  ],
  'масло': [
    'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800'
  ],
  'олива': [
    'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&q=80&w=800'
  ],
  'акумулятор': [
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800'
  ],
  'котушка': [
    'https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&q=80&w=800'
  ],
  'свічка': [
    'https://images.unsplash.com/photo-1580983218765-f663bec07b37?auto=format&fit=crop&q=80&w=800'
  ],
  'амортизатор': [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800'
  ],
  'фільтр': [
    'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?auto=format&fit=crop&q=80&w=800'
  ],
  'лампа': [
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800'
  ],
  'фара': [
    'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&q=80&w=800'
  ],
  'інструмент': [
    'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&q=80&w=800'
  ],
  'знімач': [
    'https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&q=80&w=800'
  ],
  'омивач': [
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800'
  ],
  'клапан': [
    'https://images.unsplash.com/photo-1580983218765-f663bec07b37?auto=format&fit=crop&q=80&w=800'
  ],

  // Plumbing
  'змішувач': [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800'
  ],
  'кран': [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'
  ],
  'душ': [
    'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800'
  ],
  'лійка': [
    'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800'
  ],
  'труба': [
    'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?auto=format&fit=crop&q=80&w=800'
  ],
  'фітинг': [
    'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800'
  ],
  'сифон': [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'
  ],
  'радіатор': [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800'
  ],
  'рушникосушка': [
    'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&q=80&w=800'
  ]
};

/**
 * Audit an individual product's photo and categorize its issue
 */
export function auditProductPhoto(
  product: {
    id: string;
    name: string;
    category?: string;
    brand?: string;
    article?: string;
    type?: 'auto' | 'plumbing';
    image_url?: string | null;
    specs?: string | null;
  },
  urlFrequencyMap: Map<string, number>,
  approvedIds: Set<string>
): ProductPhotoAuditResult {
  const currentImageUrl = (product.image_url || '').trim();
  const nameLower = (product.name || '').toLowerCase();
  const catLower = (product.category || '').toLowerCase();
  const isAuto = product.type === 'auto' || (!product.type && !catLower.includes('сантех'));
  const isApproved = approvedIds.has(product.id) || (product.specs && product.specs.includes('"photoApproved":true'));

  // If approved by admin, treat as good
  if (isApproved && currentImageUrl) {
    return {
      id: product.id,
      name: product.name,
      category: product.category || '',
      brand: product.brand || '',
      article: product.article || '',
      type: isAuto ? 'auto' : 'plumbing',
      currentImageUrl,
      isApproved: true,
      issue: {
        type: 'good',
        severity: 'none',
        label: 'Перевірено (Затверджено)',
        description: 'Це фото було схвалено адміністратором та захищене від авто-заміни.',
      },
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 1. Missing Image
  if (!currentImageUrl) {
    return {
      id: product.id,
      name: product.name,
      category: product.category || '',
      brand: product.brand || '',
      article: product.article || '',
      type: isAuto ? 'auto' : 'plumbing',
      currentImageUrl: '',
      issue: {
        type: 'missing',
        severity: 'high',
        label: 'Фото відсутнє',
        description: 'У товару взагалі немає фотографії.',
      },
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto),
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 2. Full Vehicle / Off-topic Photo Check
  // E.g., item is a spare part (carburetor, bearing, hose, starter), but photo is an exterior picture of a car
  const isSparePart = /(?:карбюратор|колодк|накладк|патрубок|підшипник|клапан|котушк|свічк|амортизатор|стартер|генератор|фільтр|вкладиш|насос|захист картера|реле|радіатор|змішувач|кран|лійка|сифон)/i.test(nameLower);
  const isOffTopicUrl = WHOLE_VEHICLE_PATTERNS.some(p => currentImageUrl.toLowerCase().includes(p));

  if (isSparePart && isOffTopicUrl) {
    return {
      id: product.id,
      name: product.name,
      category: product.category || '',
      brand: product.brand || '',
      article: product.article || '',
      type: isAuto ? 'auto' : 'plumbing',
      currentImageUrl,
      issue: {
        type: 'offtopic',
        severity: 'high',
        label: 'Не по темі (фото авто замість деталі)',
        description: 'Товар є запчастиною, але на фото зображено цілий автомобіль або сторонню статтю.',
        detail: 'Рекомендовано замінити на ізольоване фото самої деталі.',
      },
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto),
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 3. Duplicate Image Check
  const freq = urlFrequencyMap.get(currentImageUrl) || 1;
  if (freq > 1) {
    return {
      id: product.id,
      name: product.name,
      category: product.category || '',
      brand: product.brand || '',
      article: product.article || '',
      type: isAuto ? 'auto' : 'plumbing',
      currentImageUrl,
      duplicateCount: freq,
      issue: {
        type: 'duplicate',
        severity: freq > 5 ? 'high' : 'medium',
        label: `Повторюване фото (у ${freq} товарів)`,
        description: `Одне й те саме фото повторюється у ${freq} різних товарів каталогу.`,
        detail: 'Покупці бачать однакове зображення для різних деталей.',
      },
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto),
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 4. Watermark / Marketplace Check
  const hasWatermarkDomain = WATERMARK_DOMAINS.some(d => currentImageUrl.toLowerCase().includes(d));
  const hasWatermarkKeyword = /watermark|wm_|logo_overlay|olx-watermark/i.test(currentImageUrl);

  if (hasWatermarkDomain || hasWatermarkKeyword) {
    const domainMatch = WATERMARK_DOMAINS.find(d => currentImageUrl.toLowerCase().includes(d)) || 'маркетплейс';
    return {
      id: product.id,
      name: product.name,
      category: product.category || '',
      brand: product.brand || '',
      article: product.article || '',
      type: isAuto ? 'auto' : 'plumbing',
      currentImageUrl,
      issue: {
        type: 'watermark',
        severity: 'medium',
        label: `Можливий водяний знак (${domainMatch})`,
        description: `Фото завантажене з постачальника або маркетплейсу (${domainMatch}), де часто присутні логотипи або водяні знаки.`,
        detail: 'Краще замінити на чисте студійне фото без чужих написів.',
      },
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto),
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 5. Default: Good Quality Photo
  return {
    id: product.id,
    name: product.name,
    category: product.category || '',
    brand: product.brand || '',
    article: product.article || '',
    type: isAuto ? 'auto' : 'plumbing',
    currentImageUrl,
    issue: {
      type: 'good',
      severity: 'none',
      label: 'Якісне фото',
      description: 'Унікальне фото, відсутні відомі ознаки дублювання чи водяних знаків.',
    },
    googleSearchUrl: buildGoogleSearchUrl(product.name),
  };
}

/**
 * Builds a clean Google Images search URL with white background / product filters
 */
export function buildGoogleSearchUrl(productName: string): string {
  // Strip common technical suffixes like "Україна", "шт", packaging info for cleaner search
  const cleanSearchTerm = productName
    .replace(/\b(?:Україна|Росія|Польща|Китай|шт|к-т|уп|1шт|2шт|4шт|Республіка Корея)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Query: item name + "ізольований білий фон" or "купити деталь"
  return `https://www.google.com/search?tbm=isch&tbs=ic:trans,itp:photo&q=${encodeURIComponent(cleanSearchTerm + ' запчастина')}`;
}

/**
 * Finds a matching curated image from the clean library based on product keywords
 */
export function findCuratedSuggestion(nameLower: string, isAuto: boolean): string | undefined {
  for (const [key, urls] of Object.entries(CLEAN_PRODUCT_IMAGES)) {
    if (nameLower.includes(key)) {
      return urls[0];
    }
  }

  // Fallback category general photo
  if (!isAuto) {
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800';
  }
  return undefined;
}
