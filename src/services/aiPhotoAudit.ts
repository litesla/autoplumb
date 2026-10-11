// AI Photo Audit & Image Quality Diagnostic Service for AutoPlumb
import {
  WATERMARK_DOMAINS as BASE_WATERMARK_DOMAINS,
  WHOLE_VEHICLE_PATTERNS as BASE_WHOLE_VEHICLE_PATTERNS,
  CURATED_CATEGORY_PHOTOS,
  getCuratedFallback,
  isSpecsPhotoApproved
} from './productImageService';

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
export const WATERMARK_DOMAINS = BASE_WATERMARK_DOMAINS;

// Domains/keywords where photos are typically whole vehicles or magazine articles rather than isolated spare parts
export const WHOLE_VEHICLE_PATTERNS = BASE_WHOLE_VEHICLE_PATTERNS;

// Clean product images map
export const CLEAN_PRODUCT_IMAGES: Record<string, string[]> = CURATED_CATEGORY_PHOTOS;

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
  const isApproved = approvedIds.has(product.id) || isSpecsPhotoApproved(product.specs);

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
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto, product.category, product.id),
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 2. Full Vehicle / Off-topic Photo Check
  // E.g., item is a spare part (carburetor, bearing, hose, starter), but photo is an exterior picture of a car
  const isSparePart = /(?:карбюратор|колодк|накладк|патрубок|підшипник|клапан|котушк|свічк|амортизатор|стартер|генератор|фільтр|вкладиш|насос|захист картера|реле|радіатор|змішувач|кран|лійка|сифон|бачок)/i.test(nameLower);
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
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto, product.category, product.id),
      googleSearchUrl: buildGoogleSearchUrl(product.name),
    };
  }

  // 3. Duplicate Image Check
  const freq = urlFrequencyMap.get(currentImageUrl) || 1;
  const isCleanLocal = currentImageUrl.startsWith('/images/');

  // If a verified clean local image is used, small repetition across catalog is normal and acceptable
  if (freq > (isCleanLocal ? 15 : 2)) {
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
        severity: freq > 8 ? 'high' : 'medium',
        label: `Повторюване фото (у ${freq} товарів)`,
        description: `Одне й те саме фото повторюється у ${freq} різних товарів каталогу.`,
        detail: 'Покупці бачать однакове зображення для різних деталей.',
      },
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto, product.category, product.id),
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
      suggestedImageUrl: findCuratedSuggestion(nameLower, isAuto, product.category, product.id),
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
 * Finds a matching curated image from the clean library based on product keywords and deterministic seed
 */
export function findCuratedSuggestion(
  nameLower: string,
  isAuto: boolean,
  category: string = '',
  id: string | number = ''
): string {
  return getCuratedFallback(nameLower, isAuto ? 'auto' : 'plumbing', category, id);
}
