import { createClient } from '@supabase/supabase-js';
import { TOP_RECOMMENDED_PRODUCTS, SPECIAL_RECOMMENDED_PRODUCTS } from '../data/recommendedProducts';
import { fallbackBlogPosts } from '../data/fallbackPosts';

// Fallback in-memory and localStorage backed data store
const STORAGE_PREFIX = 'autoplumb_db_';
const memoryCache = new Map<string, any>();

function getStorage<T>(key: string, defaultVal: T): T {
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (item) {
        const parsed = JSON.parse(item);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {}
  }
  memoryCache.set(key, defaultVal);
  return defaultVal;
}

function setStorage<T>(key: string, val: T): void {
  memoryCache.set(key, val);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {}
}

// Initial mock tables
const initialProducts = [...TOP_RECOMMENDED_PRODUCTS, ...SPECIAL_RECOMMENDED_PRODUCTS].map((p, idx) => ({
  ...p,
  id: p.id || `prod-${idx + 1}`,
  image_url: p.image || '',
  created_at: new Date(Date.now() - idx * 3600000).toISOString(),
  specs: (p as any).specs || {},
  type: p.type || 'auto'
}));

const initialContent = [
  {
    id: 'settings',
    key: 'settings',
    value: {
      maintenanceMode: false,
      techBannerMode: false,
      storeName: 'AutoPlumb',
      phone: '+380 (67) 000-00-00',
      address: 'Київ, вул. Автотранспортна, 12'
    },
    created_at: new Date().toISOString()
  }
];

const initialBlog = fallbackBlogPosts.map((b, idx) => ({
  ...b,
  image_url: b.image || '',
  created_at: b.createdAt || new Date(Date.now() - idx * 86400000).toISOString()
}));

// Local table cache
function getTableData(table: string): any[] {
  if (table === 'products') return getStorage('products', initialProducts);
  if (table === 'content') return getStorage('content', initialContent);
  if (table === 'blog') return getStorage('blog', initialBlog);
  if (table === 'orders') return getStorage('orders', []);
  if (table === 'reviews') return getStorage('reviews', []);
  if (table === 'user_profiles') return getStorage('user_profiles', []);
  return getStorage(table, []);
}

function saveTableData(table: string, data: any[]): void {
  setStorage(table, data);
  // Notify listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('autoplumb_db_change', { detail: { table, data } }));
  }
}

// Evaluate condition on an item
function matchesCondition(item: any, col: string, op: string, rawVal: string): boolean {
  const val = decodeURIComponent(rawVal || '');
  const itemVal = item[col];

  switch (op) {
    case 'eq':
      return String(itemVal ?? '') === val;
    case 'neq':
      return String(itemVal ?? '') !== val;
    case 'gt':
      return Number(itemVal) > Number(val);
    case 'gte':
      return Number(itemVal) >= Number(val);
    case 'lt':
      return Number(itemVal) < Number(val);
    case 'lte':
      return Number(itemVal) <= Number(val);
    case 'like':
    case 'ilike': {
      const cleanVal = val.replace(/^%/, '').replace(/%$/, '').toLowerCase();
      return String(itemVal ?? '').toLowerCase().includes(cleanVal);
    }
    case 'in': {
      // format: (val1,val2,...)
      const cleaned = val.replace(/^\(/, '').replace(/\)$/, '');
      const parts = cleaned.split(',').map(s => s.trim());
      return parts.includes(String(itemVal ?? ''));
    }
    default:
      return true;
  }
}

// Filter engine for PostgREST URLs
function executeQuery(table: string, url: URL, method: string, bodyJson?: any, headers?: Headers): {
  data: any;
  status: number;
  totalCount: number;
  start: number;
  end: number;
  isSingle: boolean;
} {
  let items = [...getTableData(table)];
  const isSingle = headers?.get('accept')?.includes('application/vnd.pgrst.object+json') ?? false;

  // 1. DELETE
  if (method === 'DELETE') {
    const toKeep: any[] = [];
    url.searchParams.forEach((paramVal, col) => {
      if (['select', 'order', 'limit', 'offset', 'apikey'].includes(col)) return;
      const dotIdx = paramVal.indexOf('.');
      if (dotIdx > 0) {
        const op = paramVal.slice(0, dotIdx);
        const rawVal = paramVal.slice(dotIdx + 1);
        items = items.filter(it => !matchesCondition(it, col, op, rawVal));
      }
    });
    saveTableData(table, items);
    return { data: [], status: 200, totalCount: 0, start: 0, end: 0, isSingle: false };
  }

  // 2. POST (Insert)
  if (method === 'POST') {
    const newItems = Array.isArray(bodyJson) ? bodyJson : [bodyJson || {}];
    const inserted = newItems.map((it, idx) => ({
      id: it.id || `item_${Date.now()}_${idx}`,
      created_at: it.created_at || new Date().toISOString(),
      ...it
    }));
    items.unshift(...inserted);
    saveTableData(table, items);
    return { data: isSingle ? inserted[0] : inserted, status: 201, totalCount: inserted.length, start: 0, end: inserted.length, isSingle };
  }

  // 3. PATCH / PUT (Update/Upsert)
  if (method === 'PATCH' || method === 'PUT') {
    const updates = bodyJson || {};
    let updatedCount = 0;
    const filterCols: Array<{ col: string; op: string; rawVal: string }> = [];

    url.searchParams.forEach((paramVal, col) => {
      if (['select', 'order', 'limit', 'offset', 'apikey'].includes(col)) return;
      const dotIdx = paramVal.indexOf('.');
      if (dotIdx > 0) {
        filterCols.push({ col, op: paramVal.slice(0, dotIdx), rawVal: paramVal.slice(dotIdx + 1) });
      }
    });

    items = items.map(it => {
      const match = filterCols.length === 0 || filterCols.every(f => matchesCondition(it, f.col, f.op, f.rawVal));
      if (match) {
        updatedCount++;
        return { ...it, ...updates, updated_at: new Date().toISOString() };
      }
      return it;
    });

    if (updatedCount === 0 && (method === 'PUT' || updates.id || updates.key)) {
      items.push({ id: updates.id || `item_${Date.now()}`, ...updates });
    }

    saveTableData(table, items);
    return { data: isSingle ? updates : [updates], status: 200, totalCount: items.length, start: 0, end: items.length, isSingle };
  }

  // 4. GET / HEAD: Filters
  url.searchParams.forEach((paramVal, col) => {
    if (['select', 'order', 'limit', 'offset', 'apikey'].includes(col)) return;

    if (col === 'or') {
      // PostgREST or format: (cond1,cond2,...) e.g. (name.ilike.%foo%,brand.ilike.%foo%)
      const cleaned = paramVal.replace(/^\(/, '').replace(/\)$/, '');
      const orParts = cleaned.split(',');
      items = items.filter(it => {
        return orParts.some(part => {
          const firstDot = part.indexOf('.');
          const secondDot = part.indexOf('.', firstDot + 1);
          if (firstDot > 0 && secondDot > firstDot) {
            const c = part.slice(0, firstDot);
            const op = part.slice(firstDot + 1, secondDot);
            const v = part.slice(secondDot + 1);
            return matchesCondition(it, c, op, v);
          }
          return false;
        });
      });
      return;
    }

    const dotIdx = paramVal.indexOf('.');
    if (dotIdx > 0) {
      const op = paramVal.slice(0, dotIdx);
      const rawVal = paramVal.slice(dotIdx + 1);
      items = items.filter(it => matchesCondition(it, col, op, rawVal));
    }
  });

  // Ordering
  const orderParam = url.searchParams.get('order');
  if (orderParam) {
    const [orderCol, direction] = orderParam.split('.');
    const isDesc = direction === 'desc';
    items.sort((a, b) => {
      const valA = a[orderCol];
      const valB = b[orderCol];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }
      return isDesc
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }

  const totalCount = items.length;

  // Pagination / Ranges
  let start = 0;
  let end = Math.max(0, totalCount - 1);

  const rangeHeader = headers?.get('range');
  if (rangeHeader) {
    const match = rangeHeader.match(/(\d+)-(\d+)/);
    if (match) {
      start = parseInt(match[1], 10);
      end = parseInt(match[2], 10);
    }
  } else {
    const limitParam = url.searchParams.get('limit');
    const offsetParam = url.searchParams.get('offset');
    if (offsetParam) start = parseInt(offsetParam, 10);
    if (limitParam) end = start + parseInt(limitParam, 10) - 1;
  }

  const sliced = items.slice(start, end + 1);

  if (isSingle) {
    if (items.length > 0) {
      return { data: items[0], status: 200, totalCount, start, end, isSingle: true };
    } else {
      return {
        data: { code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' },
        status: 406,
        totalCount: 0,
        start: 0,
        end: 0,
        isSingle: true
      };
    }
  }

  return {
    data: method === 'HEAD' ? [] : sliced,
    status: rangeHeader ? 206 : 200,
    totalCount,
    start,
    end,
    isSingle: false
  };
}

// Resilient Custom Fetch Handler
export async function customSupabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : input?.toString?.() || '';
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));

  // Always try live fetch to Supabase first!
  try {
    const fetchFn = typeof window !== 'undefined' ? window.fetch : (globalThis as any).fetch;
    if (typeof fetchFn === 'function') {
      const response = await fetchFn(input, init);
      return response;
    }
  } catch (netErr) {
    console.warn('Direct Supabase fetch failed, using fallback:', netErr);
    // Proceed to mock fallback below
  }

  try {
    const url = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');

    // Handle PostgREST database queries
    if (url.pathname.includes('/rest/v1/')) {
      const pathAfterRest = url.pathname.slice(url.pathname.indexOf('/rest/v1/') + 9);
      const tableName = pathAfterRest.split('/')[0].split('?')[0];

      let bodyJson: any = null;
      if (init?.body && typeof init.body === 'string') {
        try {
          bodyJson = JSON.parse(init.body);
        } catch {}
      }

      const res = executeQuery(tableName, url, method, bodyJson, headers);

      const respHeaders = new Headers();
      respHeaders.set('Content-Type', 'application/json');
      respHeaders.set(
        'Content-Range',
        res.totalCount > 0 ? `${res.start}-${Math.min(res.end, res.totalCount - 1)}/${res.totalCount}` : '*/0'
      );

      return new Response(JSON.stringify(res.data), {
        status: res.status,
        headers: respHeaders
      });
    }

    // Handle Auth endpoints smoothly
    if (url.pathname.includes('/auth/v1/')) {
      if (url.pathname.includes('/user')) {
        return new Response(JSON.stringify({ id: 'guest', email: 'guest@example.com' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ session: null, user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default safe fallback response
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' }
    });
  } catch (err) {
    // Under no circumstances allow an unhandled network rejection to escape
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' }
    });
  }
}

// Supabase client instance configuration
const configuredUrl =
  (typeof window !== 'undefined' && localStorage.getItem('supabase_url')) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://qllpxployhzizlicxbss.supabase.co';

const configuredKey =
  (typeof window !== 'undefined' && localStorage.getItem('supabase_key')) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbHB4cGxveWh6aXpsaWN4YnNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYxNTIsImV4cCI6MjA5NDE4MjE1Mn0.DvlD5gCVPaTdg64ibGcIucsCjLJiIUk4PMNFxSqECiM';

export const supabase = createClient(configuredUrl, configuredKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    fetch: customSupabaseFetch
  }
});

// Resilient mock realtime channels to prevent failed websocket connections
const activeChannels = new Map<string, any>();

supabase.channel = (name: string, _opts?: any): any => {
  if (activeChannels.has(name)) {
    return activeChannels.get(name);
  }

  const channelSubscribers: Array<{ event: string; table: string; callback: (payload: any) => void }> = [];

  const listener = (e: any) => {
    const detail = (e as CustomEvent)?.detail;
    if (detail && detail.table) {
      channelSubscribers.forEach(sub => {
        if (!sub.table || sub.table === detail.table) {
          sub.callback({
            new: detail.data?.[0] || detail.data,
            old: null,
            eventType: 'UPDATE',
            table: detail.table
          });
        }
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('autoplumb_db_change', listener);
  }

  const mockChannel = {
    name,
    on: (_type: string, filter: any, callback?: (payload: any) => void) => {
      if (callback) {
        channelSubscribers.push({
          event: filter?.event || '*',
          table: filter?.table || '',
          callback
        });
      }
      return mockChannel;
    },
    subscribe: (callback?: (status: string, err?: any) => void) => {
      if (callback) {
        setTimeout(() => callback('SUBSCRIBED'), 10);
      }
      return mockChannel;
    },
    unsubscribe: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('autoplumb_db_change', listener);
      }
      activeChannels.delete(name);
      return Promise.resolve('ok');
    }
  };

  activeChannels.set(name, mockChannel);
  return mockChannel as any;
};

supabase.removeChannel = (channel: any): any => {
  if (channel && typeof channel.unsubscribe === 'function') {
    channel.unsubscribe();
  }
  return Promise.resolve('ok');
};
