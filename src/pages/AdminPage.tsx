import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Settings, Plus, Trash2, Edit, Upload, AlertTriangle, X, Download, CheckSquare, Square, ChevronRight, BookOpen, Sparkles, RotateCw, Wand2, ShieldAlert, ShieldCheck, Bell, Menu, MessageSquare } from 'lucide-react';
import { Product, Order } from '../lib/utils';
import { BlogPost } from './BlogPage';
import { AdminChatTab } from '../components/AdminChatTab';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { getColumnMapping, ColumnMapping } from '../services/geminiService';

export function cleanProductNameAndType(name: string, defaultType: string = 'auto') {
  let cleanName = name.trim();
  let finalType = defaultType;

  // 1. Plumbing Pattern: "Сантехніка — ", "Сантехніка - ", "Сантехніка—", etc.
  const prefixRegex = /^сантехніка\s*([-—–:·•/|\\~]+)?\s*/i;
  
  if (prefixRegex.test(cleanName)) {
    cleanName = cleanName.replace(prefixRegex, '').trim();
    finalType = 'plumbing';
  }

  // 2. Tractor / Spare parts Pattern:
  // e.g. "Запчастина для трактора МТЗ ЮМЗ: ", "Запчастини до тракторів", "МТЗ/ЮМЗ —", "МТЗ-ЮМЗ -", etc.
  const tractorPrefixRegex = /^(?:запчастини?\s+(?:до|для)\s+трактор(?:ів|а)(?:\s+(?:мтз|юмз))?(?:\s+(?:мтз|юмз))?|мтз\s*[\/\\-—–:·•]+\s*юмз|мтз\s+юмз|юмз|мтз)\s*([-—–:·•/|\\~]+)?\s*/i;
  
  if (tractorPrefixRegex.test(cleanName)) {
    cleanName = cleanName.replace(tractorPrefixRegex, '').trim();
  } else {
    // Fallback prefix matching for more general cases ("Запчастини для тракторів:", "Запчастина до трактора:")
    const fallbackTractorRegex = /^запчастини?\s+(?:до|для)\s+трактор(?:ів|а)(?:\s*мтз)?(?:\s*юмз)?[:\s]*/i;
    if (fallbackTractorRegex.test(cleanName)) {
      cleanName = cleanName.replace(fallbackTractorRegex, '').trim();
    }
  }

  // Capitalize first letter of cleanName
  if (cleanName) {
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }

  return { cleanName, finalType };
}

export function processAndConvertImageUrls(value: string): string {
  if (!value) return '';
  // Split only by commas that are followed by http or data: URL scheme to preserve parameter commas inside CDN images
  const parts = value.split(/,(?=\s*(?:https?:|data:))/i);
  const processedParts = parts.map(part => {
    let clean = part.trim();
    if (!clean) return '';

    // 1. Google Drive Link:
    // e.g. https://drive.google.com/file/d/12345/view?usp=sharing
    // or https://drive.google.com/open?id=12345
    const gdFileIdMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (clean.includes('drive.google.com') && gdFileIdMatch && gdFileIdMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${gdFileIdMatch[1]}`;
    }

    // 2. Google Images "imgres" link:
    // e.g. https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fimg.jpg&imgrefurl=...
    if (clean.includes('google.') && clean.includes('/imgres')) {
      try {
        const urlObj = new URL(clean);
        const imgUrlParam = urlObj.searchParams.get('imgurl');
        if (imgUrlParam) {
          return decodeURIComponent(imgUrlParam);
        }
      } catch (e) {
        const regexMatch = clean.match(/[?&]imgurl=([^&]+)/);
        if (regexMatch && regexMatch[1]) {
          return decodeURIComponent(regexMatch[1]);
        }
      }
    }

    // 3. Keep other links
    return clean;
  });

  return processedParts.filter(Boolean).join(', ');
}

export function getFirstImage(value?: string | null): string {
  if (!value) return '';
  const parts = value.split(/,(?=\s*(?:https?:|data:))/i);
  return parts[0]?.trim() || '';
}

export function splitImages(value?: string | null): string[] {
  if (!value) return [];
  return value.split(/,(?=\s*(?:https?:|data:))/i).map(s => s.trim()).filter(Boolean);
}

export function findHeaderRowIndex(rawData: any[][]): number {
  let bestIndex = 0;
  let maxScore = 0;

  for (let i = 0; i < Math.min(rawData.length, 30); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    const textColumnCount = row.filter(cell => cell !== undefined && cell !== null && cell.toString().trim().length > 0).length;
    if (textColumnCount < 3) continue;

    const rowText = row.map(c => c ? c.toString().toLowerCase() : "").join(' ');
    
    let score = 0;
    
    if (rowText.includes('назва') || rowText.includes('товар') || rowText.includes('наименование') || rowText.includes('name') || rowText.includes('seo')) {
      score += 10;
    }
    if (rowText.includes('ціна') || rowText.includes('цена') || rowText.includes('price') || rowText.includes('вартість') || rowText.includes('грн')) {
      score += 10;
    }
    if (rowText.includes('розділ') || rowText.includes('категор') || rowText.includes('category')) {
      score += 3;
    }
    if (rowText.includes('опис') || rowText.includes('description') || rowText.includes('seo')) {
      score += 3;
    }
    if (rowText.includes('бренд') || rowText.includes('brand') || rowText.includes('виробник') || rowText.includes('країна')) {
      score += 3;
    }
    if (rowText.includes('артикул') || rowText.includes('article') || rowText.includes('код')) {
      score += 3;
    }

    score += textColumnCount * 0.1;

    if (score > maxScore) {
      maxScore = score;
      bestIndex = i;
    }

    if (score >= 20) {
      return i;
    }
  }

  return bestIndex;
}

interface MultiImageUploaderProps {
  imagesString: string;
  onChange: (newVal: string) => void;
  label?: string;
}

const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({ imagesString, onChange, label }) => {
  const [compressing, setCompressing] = useState(false);

  const images = splitImages(imagesString);

  const compressAndConvertImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800; // Optimal size for database storage and snappy mobile loads
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.72); // Efficient Web Quality
            resolve(dataUrl);
          } else {
            resolve(e.target?.result as string || '');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setCompressing(true);
    try {
      const pFiles = Array.from(e.target.files);
      const convertedList: string[] = [];
      for (const file of pFiles) {
        const compressedB64 = await compressAndConvertImage(file);
        if (compressedB64) {
          convertedList.push(compressedB64);
        }
      }
      
      const updatedImages = [...images, ...convertedList];
      onChange(updatedImages.join(', '));
    } catch (err) {
      console.error('File conversion error:', err);
    } finally {
      setCompressing(false);
      // Reset input value so same file can be tapped again
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChange(updated.join(', '));
  };

  return (
    <div className="space-y-3 font-sans">
      {label && <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">{label}</label>}
      
      {/* Upload trigger zone optimized for mobile touch state */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50/50 dark:bg-zinc-800/40 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all hover:bg-white dark:hover:bg-zinc-800 active:scale-[0.98]">
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <div className="space-y-1">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2">
              <Upload size={20} className={compressing ? 'animate-bounce' : ''} />
            </div>
            <p className="text-xs sm:text-sm font-black text-gray-800 dark:text-zinc-200">
              {compressing ? 'Опрацювання фото...' : 'Додати фото з телефону / камери'}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
              Можна вибрати декілька зображень
            </p>
          </div>
        </label>
      </div>

      {/* Grid of existing/preview images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-zinc-950/60 rounded-2xl border border-gray-100 dark:border-zinc-800/80">
          {images.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 overflow-hidden group">
              <img 
                src={url} 
                alt={`Uploaded preview ${idx + 1}`} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                }}
              />
              
              {/* Badge representing position */}
              <div className="absolute bottom-1 left-1.5 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded-full font-black">
                #{idx + 1}
              </div>

              {/* Individual quick remove button */}
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg active:scale-90 transition-all cursor-pointer shadow-md"
                title="Видалити це фото"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual text input for power-users to paste links quickly */}
      <div className="space-y-1">
        <details className="text-gray-400 text-[10px]">
          <summary className="cursor-pointer font-bold select-none hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            Розширене керування або вставити посилання вручну
          </summary>
          <div className="mt-2 space-y-1">
            <textarea 
              value={imagesString}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[9px] text-gray-500 h-16 resize-none leading-relaxed"
              placeholder="https://img1.jpg, https://img2.jpg ..."
            />
          </div>
        </details>
      </div>

    </div>
  );
};

export const AdminPage: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'content' | 'settings' | 'blog' | 'diagnostics' | 'chat'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showDbOps, setShowDbOps] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const [visibleProductsCount, setVisibleProductsCount] = useState(50);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const [isConfirmingRegularImport, setIsConfirmingRegularImport] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<(string | number)[]>([]);
  const [heroContent, setHeroContent] = useState<any>(null);
  const [isSyncingUTR, setIsSyncingUTR] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState<any>(null);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [isFixingPlumbing, setIsFixingPlumbing] = useState(false);
  const [isFixingTractor, setIsFixingTractor] = useState(false);

  const handleFixPlumbingPrefixes = async () => {
    setIsFixingPlumbing(true);
    try {
      // Find all products that start with any casing of "сантехніка"
      const matching = products.filter(p => {
        const nameTrimmed = p.name.trim().toLowerCase();
        return nameTrimmed.startsWith('сантехніка') && nameTrimmed.length > 10;
      });

      if (matching.length === 0) {
        alert('Не знайдено товарів, які потребують виправлення.');
        setIsFixingPlumbing(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const p of matching) {
        const { cleanName, finalType } = cleanProductNameAndType(p.name, 'plumbing');
        
        let updatedCategory = p.category || 'Сантехніка';
        if (updatedCategory === 'Загальне' || updatedCategory === 'Загальна') {
          updatedCategory = 'Сантехніка';
        }

        const { error } = await supabase
          .from('products')
          .update({
            name: cleanName,
            type: finalType,
            category: updatedCategory
          })
          .eq('id', p.id);

        if (error) {
          console.error(`Error updating product ${p.id}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      alert(`Успішно виправлено: ${successCount} товарів. Помилок: ${errorCount}`);
      await refreshAllData();
    } catch (e: any) {
      console.error(e);
      alert('Помилка при виправленні товарів: ' + e.message);
    } finally {
      setIsFixingPlumbing(false);
    }
  };

  const handleFixTractorPrefixes = async () => {
    setIsFixingTractor(true);
    try {
      // Find all products where cleaning their name changes them
      const matching = products.filter(p => {
        const { cleanName } = cleanProductNameAndType(p.name, p.type);
        return cleanName !== p.name.trim();
      });

      if (matching.length === 0) {
        alert('Не знайдено товарів, які потребують виправлення тракторних префіксів.');
        setIsFixingTractor(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const p of matching) {
        const { cleanName } = cleanProductNameAndType(p.name, p.type);

        const { error } = await supabase
          .from('products')
          .update({
            name: cleanName
          })
          .eq('id', p.id);

        if (error) {
          console.error(`Error updating product ${p.id}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      alert(`Успішно очищено назви: ${successCount} товарів. Помилок: ${errorCount}`);
      await refreshAllData();
    } catch (e: any) {
      console.error(e);
      alert('Помилка при виправленні тракторних префіксів: ' + e.message);
    } finally {
      setIsFixingTractor(false);
    }
  };

  // Sound for notification
  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Sound play blocked by browser', e));
    } catch (e) {}
  };

  useEffect(() => {
    // Subscribe to new orders
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order received!', payload);
          setNewOrderNotification(payload.new);
          playNotificationSound();
          refreshAllData(); // Refresh list to show new order
          
          // Auto-hide after 10 seconds
          setTimeout(() => {
            setNewOrderNotification(null);
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState({ current: 0, total: 0 });
  const [importStatus, setImportStatus] = useState<string>('');
  const [deleteProgressStats, setDeleteProgressStats] = useState({ current: 0, total: 0 });
  const [shouldStopDeletion, setShouldStopDeletion] = useState(false);
  const [shouldStopImport, setShouldStopImport] = useState(false);
  const stopImportRef = React.useRef(false);
  const [isAiMapping, setIsAiMapping] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingImportData, setPendingImportData] = useState<any[] | null>(null);
  const [pendingProductsToImport, setPendingProductsToImport] = useState<any[]>([]);
  const [detectedMapping, setDetectedMapping] = useState<ColumnMapping | null>(null);
  const [customDbUrl, setCustomDbUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [customDbKey, setCustomDbKey] = useState(localStorage.getItem('supabase_key') || '');

  const saveCustomConfig = () => {
    if (!customDbUrl || !customDbKey) {
      alert('Будь ласка, введіть і URL, і Key');
      return;
    }
    localStorage.setItem('supabase_url', customDbUrl.trim());
    localStorage.setItem('supabase_key', customDbKey.trim());
    alert('Конфігурацію збережено! Перезавантажую сторінку...');
    window.location.reload();
  };

  const resetConfig = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    alert('Скинуто до системних налаштувань. Перезавантажую...');
    window.location.reload();
  };
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: '',
    description: '',
    image: '',
    stock: 1,
    type: 'auto' as 'auto' | 'plumbing',
    brand: '',
    article: '',
    specs: ''
  });
  const [editedProductIds, setEditedProductIds] = useState<(string | number)[]>(() => {
    try {
      const saved = localStorage.getItem('edited_product_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [clonedFromProductName, setClonedFromProductName] = useState<string | null>(null);
  const [newPost, setNewPost] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: 'Адміністратор',
    category: 'Поради',
    image: '',
    readTime: '5 хв'
  });
  const [blogSearch, setBlogSearch] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/auth');
    }
  }, [isAdmin, loading, navigate]);

  const [settings, setSettings] = useState({
    supportEmail: 'support@autoplumb.ua',
    phone: '+38 (067) 123-45-67',
    maintenanceMode: false,
    techBannerMode: false,
    notifications: true
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const lastErrorTimeRef = useRef<number>(0);

  const checkSupabaseConnection = async () => {
    try {
      const { error } = await supabase.from('products').select('*', { count: 'exact', head: true });
      if (error) {
        setFetchError(error.message);
        return false;
      }
      return true;
    } catch (e: any) {
      setFetchError(e.message || 'Connection failed');
      return false;
    }
  };

  const refreshAllData = async () => {
    if (!isAdmin) return;
    
    // Check cooldown
    const now = Date.now();
    if (now - lastErrorTimeRef.current < 30000) {
      console.warn('🔄 Supabase requests are on cooldown (30s) due to previous connection error.');
      setIsRefreshing(false);
      return;
    }

    setIsRefreshing(true);
    
    try {
      let prodQuery = supabase.from('products').select('*');
      const searchTrimmed = debouncedProductSearch.trim();
      if (searchTrimmed) {
        // Sanitize commas/parens to prevent breaking PostgREST or select query
        const sanitized = searchTrimmed.replace(/[,()]/g, '');
        if (sanitized) {
          const lower = sanitized.toLowerCase();
          let orConditions = `name.ilike.%${sanitized}%,article.ilike.%${sanitized}%,brand.ilike.%${sanitized}%,category.ilike.%${sanitized}%`;
          if (lower.includes('авт') || lower.includes('aut')) {
            orConditions += `,type.eq.auto`;
          }
          if (lower.includes('сант') || lower.includes('санх') || lower.includes('plum')) {
            orConditions += `,type.eq.plumbing`;
          }
          prodQuery = prodQuery.or(orConditions);
        }
      }

      const [resCount, resProducts, resOrders, resBlog] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        prodQuery.order('created_at', { ascending: false }).limit(200),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('blog').select('*').order('created_at', { ascending: false })
      ]);

      const errors = [resCount.error, resProducts.error, resOrders.error, resBlog.error].filter(Boolean);
      if (errors.length > 0) {
        console.error('Supabase errors detected:', errors);
        setFetchError(errors[0]?.message || 'Unknown error');
      } else {
        setFetchError(null);
      }

      if (resCount.count !== null) setTotalProductsCount(resCount.count);
      
      if (resProducts.data) {
        setProducts(resProducts.data.map(item => ({ 
          ...item, 
          image: item.image_url || item.image || '',
          type: item.type || 'auto' 
        })) as Product[]);
      }

      if (resOrders.data) {
        setOrders(resOrders.data.map(o => ({
          ...o,
          items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
        })) as Order[]);
      }

      if (resBlog.data) {
        setBlogPosts(resBlog.data.map(post => ({
          ...post,
          image: (post as any).image_url || (post as any).image || '',
          readTime: (post as any).read_time || (post as any).readTime || '',
          createdAt: (post as any).created_at || (post as any).createdAt || new Date().toISOString()
        })) as BlogPost[]);
      }

      fetchSettings();
      fetchHeroContent();
    } catch (err: any) {
      console.error('Error refreshing admin data:', err);
      setFetchError(err.message || 'Помилка підключення до Supabase');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [isAdmin, debouncedProductSearch]);

  const seedInitialData = async () => {
    const initialProducts = [
      { name: 'Giggle Coin', price: 1200, category: 'Аксесуари', description: 'Стильний аксесуар для вашого авто.', image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&q=80&w=400', stock: 10, type: 'auto', brand: 'AutoStyle', specs: '{"Матеріал": "Метал", "Колір": "Золото"}' },
      { name: 'Акумулятор Bosch S4 74Ah', price: 4199, category: 'Електроніка', description: 'Надійний акумулятор для будь-яких умов.', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=400', stock: 5, type: 'auto', brand: 'Bosch', specs: '{"Ємність": "74Ah", "Пусковий струм": "680A"}' },
      { name: 'Емблема BMW Original', price: 899, category: 'Декор', description: 'Оригінальна емблема для вашого BMW.', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=400', stock: 20, type: 'auto', brand: 'BMW', specs: '{"Діаметр": "82мм"}' },
      { name: 'Емблема Mercedes-Benz', price: 1299, category: 'Декор', description: 'Класична зірка Mercedes.', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=400', stock: 15, type: 'auto', brand: 'Mercedes', specs: '{"Тип": "Капотна"}' },
      { name: 'Моторна олива Castrol 5W-30', price: 1850, category: 'Мастила', description: 'Високоякісна олива для бензинових та дизельних двигунів.', image: 'https://images.unsplash.com/photo-1635850202422-3318d30ca702?auto=format&fit=crop&q=80&w=400', stock: 30, type: 'auto', brand: 'Castrol', specs: '{"Вязкість": "5W-30", "Обєм": "4л"}' },
      { name: 'Набір інструментів Intertool', price: 2450, category: 'Інструменти', description: 'Професійний набір з 82 предметів.', image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&q=80&w=400', stock: 8, type: 'auto', brand: 'Intertool', specs: '{"Кількість": "82 од."}' },
      { name: 'Змішувач для кухні Grohe', price: 3500, category: 'Змішувачі', description: 'Німецька якість для вашої кухні.', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400', stock: 8, type: 'plumbing', brand: 'Grohe', specs: '{"Тип": "Одноважільний", "Матеріал": "Латунь"}' },
      { name: 'Радіатор опалення 500x1000', price: 2800, category: 'Опалення', description: 'Ефективний сталевий радіатор.', image: 'https://images.unsplash.com/photo-1585131236039-5d539d1184b7?auto=format&fit=crop&q=80&w=400', stock: 12, type: 'plumbing', brand: 'Purmo', specs: '{"Розмір": "500x1000", "Тип": "22"}' },
      { name: 'Унітаз Cersanit Carina', price: 4200, category: 'Санфаянс', description: 'Компактний унітаз з мікроліфтом.', image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=400', stock: 5, type: 'plumbing', brand: 'Cersanit', specs: '{"Сидіння": "Мікроліфт"}' },
      { name: 'Душова система Hansgrohe', price: 12500, category: 'Душові', description: 'Преміальна душова система з термостатом.', image: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&q=80&w=400', stock: 3, type: 'plumbing', brand: 'Hansgrohe', specs: '{"Термостат": "Так"}' },
      { name: 'Труба металопластикова 16мм', price: 45, category: 'Труби', description: 'Ціна за метр. Надійна труба для опалення.', image: 'https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=400', stock: 100, type: 'plumbing', brand: 'Valtec', specs: '{"Діаметр": "16мм"}' }
    ];

    for (const { image, ...productRest } of initialProducts) {
      await supabase.from('products').insert({
        ...productRest,
        image_url: image,
        created_at: new Date().toISOString()
      });
    }
    alert('Товари успішно додані!');
  };

  const seedBlogPosts = async () => {
    const initialPosts = [
      {
        title: 'Як вибрати акумулятор для авто: Повний гід 2024',
        excerpt: 'Вибір акумулятора — відповідальний крок. Ми розповімо про ємність, пусковий струм та полярність, щоб ваше авто заводилося в будь-який мороз.',
        content: `## Як вибрати акумулятор для вашого автомобіля: Повний гайд

Вибір правильного акумулятора має вирішальне значення для надійної роботи вашого автомобіля. Ось основні фактори, які слід враховувати:

### 1. Ємність (Ah)
Це показник того, скільки енергії може зберігати акумулятор. Перевірте посібник користувача вашого авто, щоб дізнатися рекомендовану ємність. Для легкових авто це зазвичай 55-75 Ah.

### 2. Пусковий струм (A)
Це здатність акумулятора запускати двигун при низьких температурах. Чим вищий цей показник, тим легше буде завести авто взимку. Для дизельних двигунів потрібен вищий струм.

### 3. Габарити та полярність
Переконайтеся, що новий акумулятор підходить за розміром до посадкового місця і має правильне розташування клем. Полярність буває пряма (L+) та зворотна (R+).

### 4. Тип технології (EFB, AGM, Ca/Ca)
*   **Ca/Ca:** Стандартні необслуговувані АКБ.
*   **EFB:** Покращені АКБ для систем Start-Stop.
*   **AGM:** Найвитриваліші АКБ для сучасних авто з великою кількістю електроніки.

**Порада від експерта:** Завжди перевіряйте дату виготовлення. Акумулятор, який простояв на складі більше року, втрачає частину характеристик.`,
        author: 'Олександр Експерт',
        category: 'Поради',
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800',
        readTime: '7 хв'
      },
      {
        title: '5 ознак того, що вашу сантехніку пора міняти',
        excerpt: 'Не чекайте аварії! Розповідаємо про приховані симптоми зносу труб та змішувачів, які вбережуть вас від затоплення.',
        content: `## Коли пора дзвонити сантехніку?

Багато власників житла ігнорують дрібні несправності, поки вони не перетворюються на катастрофу. Ось 5 ознак того, що ваша сантехніка потребує оновлення:

1. **Зниження тиску води:** Це може свідчити про корозію або засмічення труб всередині.
2. **Поява іржі на з'єднаннях:** Навіть маленька пляма іржі — це майбутня дірка, яка чекає моменту, щоб лопнути.
3. **Постоянний шум у трубах:** Стук або гул при відкритті кранів часто вказує на нестабільність тиску або знос клапанів.
4. **Неприємний запах:** Можливі проблеми з сифонами або герметичністю каналізаційних з'єднань.
5. **Конденсат на трубах:** Надмірне запотівання труб може призвести до грибка та прискореної корозії.

**Порада:** Використовуйте тільки якісні запчастини та звертайтеся до професіоналів для монтажу складних систем.`,
        author: 'Майстер Сергій',
        category: 'Сантехніка',
        image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&q=80&w=800',
        readTime: '5 хв'
      },
      {
        title: 'Як підготувати авто до зими: Чек-лист',
        excerpt: 'Зима — це випробування для кожного вузла автомобіля. Дізнайтеся, як перевірити антифриз, гальма та масло.',
        content: `## Зимова підготовка: Безпека понад усе

Зима вимагає особливої уваги до технічного стану. Пройдіть по цих пунктах:

### Рідини
*   **Антифриз:** Перевірте температуру замерзання. Вона має бути не вище -35°C.
*   **Омивач:** Завчасно залийте "незамерзайка".
*   **Олива:** Якщо наближається термін заміни, краще зробити це до морозів.

### Шини та гальма
Зимова гума — це обов'язково. Перевірте також товщину гальмівних колодок, оскільки на слизькій дорозі гальмівний шлях збільшується.

### Гумові ущільнювачі
Обробіть дверні ущільнювачі силіконом, щоб вони не примерзали після мийки.

Будьте уважні на дорогах!`,
        author: 'АвтоЕксперт',
        category: 'Сезонне',
        image: 'https://images.unsplash.com/photo-1547483151-512140b077a9?auto=format&fit=crop&q=80&w=800',
        readTime: '10 хв'
      },
      {
        title: 'Ремонт змішувача: як замінити картридж самостійно',
        excerpt: 'Покрокова інструкція з ремонту одноважільного крана, яка допоможе вам зекономити на виклику майстра.',
        content: `## Ремонт змішувача власними руками

Якщо ваш кран почав прокапувати або важко повертається важіль — скоріше за все, пора міняти картридж.

### Вам знадобляться:
*   Шестигранний ключ (2.5 мм)
*   Розвідний ключ
*   Викрутка
*   Новий картридж (візьміть старий для прикладу)

### Етапи:
1. **Перекрийте воду.** Це найголовніше!
2. Зніміть декоративну заглушку під важелем.
3. Відкрутіть гвинт та зніміть важіль.
4. Відкрутіть декоративний ковпачок та притискну гайку.
5. Замініть картридж на новий.
6. Зберіть у зворотному порядку.

**Успіху!** Дрібний ремонт под силу кожному.`,
        author: 'Майстер Олексій',
        category: 'DIY',
        image: 'https://images.unsplash.com/photo-1542013936-6933-884638332954?auto=format&fit=crop&q=80&w=800',
        readTime: '6 хв'
      },
      {
        title: 'Чому скриплять гальма і що з цим робити?',
        excerpt: 'Неприємний звук при гальмуванні може бути як особливістю матеріалу, так і критичною несправністю.',
        content: `## Розбираємося зі скрипом гальм

Скрип при гальмуванні — одна з найпоширеніших скарг. Ось чому це стається:

### Основні причини:
*   **Природний знос:** Багато колодок мають металевий індикатор ("пискун"), який починає видавати звук, коли шар зношується до критичного.
*   **Склад колодки:** Деякі недорогі колодки мають багато металевої стружки в суміші, що спричиняє скрип навіть у нових деталях.
*   **Потрапляння бруду:** Дрібні камінці або пісок між диском і колодкою.
*   **Перегрів:** Якщо ви часто інтенсивно гальмуєте, матеріал колодки може "засклитися".

**Рішення:** Якщо скрип з'явився нещодавно, перевірте товщину колодок. Якщо вони в нормі, спробуйте промити гальмівні диски спеціальним очищувачем.`,
        author: 'Механік Дмитро',
        category: 'Авто',
        image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800',
        readTime: '4 хв'
      },
      {
        title: 'Як вибрати економний радіатор опалення',
        excerpt: 'Порівняння сталевих, чавунних та алюмінієвих радіаторів для квартири та приватного будинку.',
        content: `## Опалення з розумом: вибираємо радіатор

Вибір радіатора впливає не тільки на тепло, а й на ваші рахунки за енергоносії.

### Сталеві панельні радіатори
Ідеальні для автономного опалення. Швидко нагріваються і дозволяють точно регулювати температуру.

### Алюмінієві радіатори
Мають найвищу тепловіддачу. Легкі, але вибагливі до якості теплоносія (можуть кородувати при високому pH).

### Біметалеві радіатори
Найкращий вибір для багатоповерхівок з центральним опаленням. Сталева трубка всередині витримує високий тиск, а алюмінієва оболонка добре віддає тепло.

### Чавунні радіатори
Класика. Довго тримають тепло, але повільно нагріваються. Сучасні дизайнерські моделі виглядають приголомшливо.`,
        author: 'Інженер Віталій',
        category: 'Опалення',
        image: 'https://images.unsplash.com/photo-1585131236039-5d539d1184b7?auto=format&fit=crop&q=80&w=800',
        readTime: '8 хв'
      }
    ];

    try {
      for (const post of initialPosts) {
        const { error } = await supabase.from('blog').insert({
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          author: post.author,
          category: post.category,
          image_url: post.image,
          read_time: post.readTime,
          created_at: new Date().toISOString()
        });
        if (error) {
          console.error('Error inserting initial post:', error);
          // Continue with next post instead of stopping
        }
      }
      alert('Блог успішно заповнено професійними SEO статтями!');
      refreshAllData();
    } catch (err: any) {
      alert(`Помилка при заповненні блогу: ${err.message}`);
    }
  };

  const fetchHeroContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('key', 'hero')
        .single();
      if (data) {
        setHeroContent(data.value);
      }
    } catch (err) {
      console.error('Error fetching hero content:', err);
    }
  };

  const handleSaveHeroContent = async () => {
    try {
      const { error } = await supabase
        .from('content')
        .upsert({ key: 'hero', value: heroContent });
      if (error) throw error;
      alert('Контент Hero збережено!');
    } catch (err) {
      console.error('Error saving hero content:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('key', 'settings')
        .single();
      if (data) {
        setSettings(prev => ({ ...prev, ...data.value }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await supabase
        .from('content')
        .upsert({ key: 'settings', value: newSettings });
      console.log(`Setting ${key} updated to ${value}`);
    } catch (err) {
      console.error(`Error saving toggle ${key}:`, err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { error } = await supabase
        .from('content')
        .upsert({ key: 'settings', value: settings });
      if (error) throw error;
      alert('Налаштування збережено!');
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Ви впевнені, що хочете видалити ${selectedProducts.length} товарів?`)) return;

    try {
      const { error } = await supabase.from('products').delete().in('id', selectedProducts);
      if (error) throw error;
      setSelectedProducts([]);
      alert('Товари успішно видалені');
    } catch (err) {
      alert('Помилка при масовому видаленні');
    }
  };

  const handleDeleteAllProducts = async () => {
    setIsConfirmingDeleteAll(false);
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      // Supabase is better with many deletions if you use RPC or just delete all with a filter
      // For a simple 'delete all', it might be limited by RLS or timeout if it's 8000.
      // But we can try the direct approach:
      const { error, count } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes everything but that phantom id

      if (error) throw error;
      
      alert(`Всі товари успішно видалені.`);
      setTotalProductsCount(0);
      setProducts([]);
    } catch (err: any) {
      console.error('CRITICAL: Delete all error:', err);
      alert(`Помилка при видаленні: ${err.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleExportOrders = () => {
    const data = orders.map(o => ({
      ID: o.id,
      Phone: o.phone,
      Address: o.delivery_address,
      Total: o.total_price,
      Status: o.status,
      Date: new Date(o.created_at).toLocaleString(),
      Items: o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const data = [{
      "Назва": "Приклад товару",
      "Ціна": 1000,
      "Категорія": "Автотовари",
      "Артикул": "ART-123",
      "Бренд": "BrandName",
      "Опис": "Детальний опис товару",
      "Зображення": "https://example.com/image.jpg",
      "Тип": "auto",
      "Залишок": 10
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "products_template.xlsx");
  };

  const handleExportProducts = (targetProducts?: Product[]) => {
    const listToExport = targetProducts || products;
    const data = listToExport.map(p => ({
      "ID": p.id,
      "Назва": p.name,
      "Ціна (грн)": p.price,
      "Категорія": p.category,
      "Артикул": p.article || '',
      "Бренд": p.brand || '',
      "Опис": p.description || '',
      "Зображення (URL)": p.image || p.image_url || '',
      "Тип": p.type,
      "Кількість (Склад)": p.stock,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getChartData = () => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.created_at.startsWith(date));
      return {
        name: date.split('-').slice(1).join('.'),
        sales: dayOrders.reduce((sum, o) => sum + o.total_price, 0),
        count: dayOrders.length
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRefreshing(true); // Reuse refreshing state as loading indicator
    try {
      let parsedSpecs = null;
      if (newProduct.specs) {
        try {
          parsedSpecs = JSON.parse(newProduct.specs);
        } catch {
          parsedSpecs = newProduct.specs;
        }
      }

      const cleanImageUrl = processAndConvertImageUrls(newProduct.image);

      const { error } = await supabase.from('products').insert({
        name: newProduct.name,
        price: Number(newProduct.price),
        category: newProduct.category,
        description: newProduct.description,
        image_url: cleanImageUrl,
        stock: Number(newProduct.stock) || 1,
        type: newProduct.type,
        brand: newProduct.brand,
        article: newProduct.article,
        specs: parsedSpecs,
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, category: '', description: '', image: '', stock: 1, type: 'auto', brand: '', article: '', specs: '' });
      setClonedFromProductName(null);
      alert('Товар успішно додано до бази даних!');
      await refreshAllData(); // Force immediate refresh from DB
    } catch (err: any) {
      console.error('Add product error:', err);
      alert(`Помилка при додаванні: ${err.message || 'невідома помилка'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      setIsRefreshing(true);
      try {
        const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
        if (error) throw error;
        setProductToDelete(null);
        await refreshAllData();
      } catch (err: any) {
        console.error('Delete product error:', err);
        alert(`Помилка при видаленні: ${err.message}`);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsRefreshing(true);
    try {
      const { id, created_at, ...rawUpdateData } = editingProduct as any;
      
      const cleanImageUrl = processAndConvertImageUrls(rawUpdateData.image ?? '');
      
      // Clean up data to avoid sending invalid columns or id
      const updateData = {
        name: rawUpdateData.name,
        price: Number(rawUpdateData.price),
        category: rawUpdateData.category,
        description: rawUpdateData.description,
        image_url: cleanImageUrl,
        stock: Number(rawUpdateData.stock),
        type: rawUpdateData.type,
        brand: rawUpdateData.brand,
        article: rawUpdateData.article,
        specs: typeof rawUpdateData.specs === 'object' ? JSON.stringify(rawUpdateData.specs) : rawUpdateData.specs
      };

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      setEditingProduct(null);
      // Track recently edited product ID
      setEditedProductIds(prev => {
        const updated = Array.from(new Set([id, ...prev])).slice(0, 10);
        localStorage.setItem('edited_product_ids', JSON.stringify(updated));
        return updated;
      });
      alert('Зміни збережено для всіх користувачів!');
      await refreshAllData();
    } catch (err: any) {
      console.error('Update product error:', err);
      alert(`Помилка при збереженні: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateOrderStatus = async (id: string | number, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    if (error) {
      alert('Помилка при оновленні статусу');
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error, data } = await supabase.from('blog').insert({
        title: newPost.title,
        excerpt: newPost.excerpt,
        content: newPost.content,
        author: newPost.author,
        category: newPost.category,
        image_url: newPost.image,
        read_time: newPost.readTime,
        created_at: new Date().toISOString()
      }).select();

      if (error) {
        console.error('Supabase error creating post:', error);
        throw error;
      }
      
      setIsAddingPost(false);
      setNewPost({ title: '', excerpt: '', content: '', author: 'Адміністратор', category: 'Поради', image: '', readTime: '5 хв' });
      alert('Статтю успішно додано!');
      refreshAllData();
    } catch (err: any) {
      console.error('Full error object:', err);
      alert(`Помилка при додаванні статті: ${err.message || String(err)}`);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    const { id, ...data } = editingPost;
    const { error } = await supabase
      .from('blog')
      .update({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        author: data.author,
        category: data.category,
        image_url: (data as any).image_url || (data as any).image,
      read_time: (data as any).readTime || (data as any).read_time,
      created_at: (data as any).createdAt || (data as any).created_at || new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) {
    console.error('Update post error:', error);
    alert(`Помилка при оновленні статті: ${error.message}`);
  } else {
    setEditingPost(null);
    refreshAllData();
  }
};

  const handleDeletePost = async (id: string) => {
    if (confirm('Ви впевнені, що хочете видалити цю статтю?')) {
      const { error } = await supabase.from('blog').delete().eq('id', id);
      if (error) {
        alert('Помилка при видаленні статті');
      } else {
        setBlogPosts(prev => prev.filter(p => p.id !== id));
      }
    }
  };

  const handleSyncUTR = async () => {
    setIsSyncingUTR(true);
    try {
      const response = await fetch('/api/sync/utr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        alert('Синхронізація з UTR успішна!');
        console.log('UTR Data:', data);
      } else {
        alert(`Помилка: ${data.error || 'Невідома помилка'}`);
      }
    } catch (err) {
      alert('Помилка підключення до сервера');
    } finally {
      setIsSyncingUTR(false);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      alert('Будь ласка, виберіть файл формату Excel (.xlsx, .xls) або .csv');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const fileInput = e.target;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error('Не вдалося прочитати файл');

        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        
        // Use the first sheet by default
        const targetSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[targetSheetName];
        
        // Convert to JSON with raw headers to see what's actually there
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

        // Find the header row index (row with multiple columns with text)
        const headerRowIndex = findHeaderRowIndex(rawData);

        const allRows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "" }) as any[];
        
        if (allRows.length === 0) {
          alert('Файл порожній або не містить даних після заголовку.');
          setIsImporting(false);
          return;
        }

        // Pre-calculate column mapping for better performance
        const parsedKeys = allRows[0] ? Object.keys(allRows[0]) : [];
        const rawHeaders = rawData[headerRowIndex] ? rawData[headerRowIndex].map(h => h ? h.toString().trim() : "").filter(Boolean) : [];
        const headers = Array.from(new Set([...parsedKeys, ...rawHeaders]));

        const findMappedKey = (targetKeys: string[]) => {
          return headers.find(h => 
            targetKeys.some(tk => {
              const normH = h.toLowerCase().trim();
              const normTK = tk.toLowerCase().trim();
              return normH === normTK || normH.includes(normTK);
            })
          );
        };

        const fieldMapping = {
          name: findMappedKey(["Назва", "Назва товару", "Повна назва товару", "Name", "Наименование", "Title", "Товар", "SEO-назва товару", "SEO назва товару"]),
          price: findMappedKey(["Ціна", "Ціна (грн)", "Ціна продажу, грн", "Ціна продажу грн", "Ціна продажу", "Price", "Цена", "Cost"]),
          category: findMappedKey(["Категорія", "Category", "Категория", "Group", "Розділ / Категорія", "Розділ/Категорія", "Розділ", "Категорія"]),
          article: findMappedKey(["Артикул", "Оригінал (скорочено)", "Article", "Код", "Sku"]),
          brand: findMappedKey(["Бренд", "Виробник", "Brand", "Производитель", "Країна виробника", "Країна виробник", "Країна"]),
          description: findMappedKey(["Опис", "Опис товару (SEO)", "Опис для сайту", "Description", "Описание", "SEO", "Опис для сайту"]),
          image: findMappedKey(["Зображення", "Оригінал (посилання)", "Image", "Изображение", "Link", "URL", "Фото"]),
          type: findMappedKey(["Тип", "Місце на сайті", "Місце", "Type"]),
          stock: findMappedKey(["Залишок", "Stock", "Кількість", "Кол-во"])
        };

        let currentCategory = "Загальне";
        const productsToImport: any[] = [];

        allRows.forEach((p) => {
          const nameRaw = fieldMapping.name ? p[fieldMapping.name] : undefined;
          const name = nameRaw?.toString().trim() || "";
          
          if (!name || name === "" || name.includes('Позицій:')) return;

          const priceRaw = fieldMapping.price ? p[fieldMapping.price] : undefined;
          
          let cleanPrice = 0;
          if (typeof priceRaw === 'number') cleanPrice = priceRaw;
          else if (priceRaw) {
            const sanitized = priceRaw.toString().replace(/[₴$€\s]/g, '').replace(',', '.');
            cleanPrice = parseFloat(sanitized.replace(/[^0-9.]/g, '')) || 0;
          }

          // Recognition of Category Row (Image 2)
          const isCategoryMarker = name.startsWith('▶') || name.startsWith('►') || name.startsWith('•') || name.startsWith('⁃') || name.startsWith('>');
          const hasExplicitCategoryColumn = !!fieldMapping.category;
          
          if (isCategoryMarker || (!hasExplicitCategoryColumn && name && (isNaN(cleanPrice) || cleanPrice <= 0))) {
            const potentialCat = name.replace(/^[▶►•⁃>\s]+/, '').trim();
            if (potentialCat.length > 2 && potentialCat.length < 100) {
              currentCategory = potentialCat;
              return; // Skip category row itself
            }
          }

          // If it's a product row (must have name and price)
          if (name && !isNaN(cleanPrice) && cleanPrice > 0) {
            const categoryValue = fieldMapping.category ? p[fieldMapping.category] : undefined;
            const descriptionValue = fieldMapping.description ? p[fieldMapping.description] : undefined;
            const imageValue = fieldMapping.image ? p[fieldMapping.image] : undefined;
            const stockValue = fieldMapping.stock ? p[fieldMapping.stock] : undefined;
            const typeValue = fieldMapping.type ? p[fieldMapping.type] : undefined;
            const brandValue = fieldMapping.brand ? p[fieldMapping.brand] : undefined;
            const articleValue = fieldMapping.article ? p[fieldMapping.article] : undefined;

            // Determine type based on "Місце на сайті" or logic
            let finalType = 'auto'; // Default
            const typeStr = typeValue?.toString().toLowerCase() || '';
            const nameLower = name.toLowerCase();

            if (typeStr.includes('сантехніка') || typeStr.includes('plumbing') || nameLower.includes('труба') || nameLower.includes('кран') || nameLower.includes('сифон') || nameLower.includes('змішувач')) {
              finalType = 'plumbing';
            } else if (typeStr.includes('авто') || typeStr.includes('auto')) {
              finalType = 'auto';
            }

            // Apply special prefix stripping and dynamic section movement
            const { cleanName, finalType: resolvedType } = cleanProductNameAndType(name, finalType);

            productsToImport.push({
              name: cleanName,
              price: cleanPrice,
              category: categoryValue?.toString().trim() || (resolvedType === 'plumbing' && currentCategory === 'Загальне' ? 'Сантехніка' : currentCategory),
              description: descriptionValue?.toString() || (articleValue ? `Артикул: ${articleValue}` : ''),
              image_url: imageValue?.toString() || '',
              stock: Number(stockValue) || 1,
              type: resolvedType,
              brand: brandValue?.toString() || '',
              article: articleValue?.toString() || ''
            });
          }
        });

        if (productsToImport.length === 0) {
          alert(`Знайдено 0 товарів. Перевірте формат таблиці (Назва, Ціна).`);
          setIsImporting(false);
          return;
        }

        console.log('✅ Prepared products for import:', productsToImport.slice(0, 3));
        setPendingProductsToImport(productsToImport);
        setIsConfirmingRegularImport(true);
        setIsImporting(false); // Reset to allow button interaction again if needed
        if (fileInput) fileInput.value = '';
      } catch (err) {
        console.error('Import error:', err);
        alert('Помилка при зчитуванні файлу. Переконайтеся, що файл не захищений паролем.');
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const executeRegularImport = async () => {
    setIsConfirmingRegularImport(false);
    
    // Check cooldown
    const now = Date.now();
    if (now - lastErrorTimeRef.current < 30000) {
      alert('Зачекайте 30 секунд перед наступною спробою (діє захист від помилок з\'єднання).');
      return;
    }

    setIsImporting(true);
    setImportStatus('Початок імпорту...');
    setImportProgress(5);
    
    const productsToImport = pendingProductsToImport;
    const totalCount = productsToImport.length;
    
    setImportProgress(10);
    setImportStats({ current: 0, total: totalCount });
    setShouldStopImport(false);
    stopImportRef.current = false;
    setImportStatus(`Підготовка до імпорту ${totalCount} товарів (UPSERT)...`);
    
    // Final sanity check
    if (totalCount === 0) {
      alert('Помилка: Список товарів для імпорту порожній!');
      setIsImporting(false);
      return;
    }

    console.log(`🚀 Starting high-volume import: ${totalCount} products. Using UPSERT on 'name'.`);
    
    let importedCount = 0;
    const batchSize = 100; // Increased for performance
    
    for (let i = 0; i < totalCount; i += batchSize) {
      if (stopImportRef.current) {
        setImportStatus('Імпорт зупинено користувачем');
        break;
      }
      try {
        setImportStatus(`Завантаження пачки ${Math.floor(i/batchSize) + 1}... (${i}/${totalCount})`);
        const chunk = productsToImport.slice(i, i + batchSize);
        
        const batchData = chunk.map(p => ({
          name: p.name || 'Без назви',
          price: Number(p.price) || 0,
          category: p.category || 'Інше',
          description: p.description || '',
          stock: Number(p.stock) || 0,
          brand: p.brand || '',
          article: p.article || '',
          image_url: p.image_url || '',
          type: p.type || 'auto'
        }));

        const { error } = await supabase
          .from('products')
          .insert(batchData);
        
        if (error) {
          console.error(`❌ Batch ERROR at index ${i}:`, error);
          
          if (error.message?.includes('column') && error.message?.includes('does not exist')) {
            const missingCol = error.message.match(/'([^']+)'/)?.[1] || 'невідома колонка';
            alert(`ПОМИЛКА СТРУКТУРИ: Відсутня колонка "${missingCol}".`);
            setIsImporting(false);
            return;
          }
          
          // Network errors during batch
          if (error.message?.includes('Failed to fetch') || (error as any).status === 0) {
            lastErrorTimeRef.current = Date.now();
            throw new Error('Втрачено зв\'язок з сервером Supabase.');
          }

          throw new Error(error.message);
        }
        
        importedCount += chunk.length;
        setImportStats(prev => ({ ...prev, current: importedCount }));
        setImportProgress(Math.min(99, Math.round((importedCount / totalCount) * 100)));
        
      } catch (batchErr: any) {
        console.error(`🛑 Import CRASH at index ${i}:`, batchErr);
        alert(`ЗУПИНЕНО: ${batchErr.message}\n\nСпробуйте знову через 30 секунд.`);
        setIsImporting(false);
        return;
      }
    }

    setImportProgress(100);
    setImportStatus('Імпорт успішно завершено!');
    console.log('🏁 Import finished successfully.');
    setTimeout(() => {
      setIsImporting(false);
      refreshAllData();
    }, 1500);
  };

  const handleSmartImport = async (file: File) => {
    setIsImporting(true);
    setImportProgress(0);
    setIsAiMapping(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error('Не вдалося прочитати файл');

        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const targetSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[targetSheetName];
        
        // Get raw data to find headers
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        
        // Find a row that looks like a header (contains multiple columns with text)
        const headerRowIndex = findHeaderRowIndex(rawData);

        const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "" }) as any[];
        
        if (data.length === 0) {
          alert('Файл порожній.');
          setIsImporting(false);
          setIsAiMapping(false);
          return;
        }

        // Get mapping from AI
        const mapping = await getColumnMapping(data.slice(0, 10));
        
        if (!mapping || !mapping.name) {
          alert('Системі не вдалося автоматично розпізнати структуру файлу. Спробуйте звичайний імпорт.');
          setIsImporting(false);
          setIsAiMapping(false);
          return;
        }

        setDetectedMapping(mapping);
        setPendingImportData(data);
        setIsAiMapping(false);
      } catch (err) {
        console.error('Smart import error:', err);
        alert('Помилка при аналізі файлу.');
        setIsImporting(false);
        setIsAiMapping(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const executeSmartImport = async () => {
    if (!pendingImportData || !detectedMapping) return;

    // Check connection first
    const isConnected = await checkSupabaseConnection();
    if (!isConnected) return;

    try {
      let currentCategory = "Загальне";
      const processedProducts: any[] = [];

      pendingImportData.forEach((p) => {
        const name = p[detectedMapping.name]?.toString().trim();
        if (!name || name === "" || name.includes('Позицій:')) return;

        const price = p[detectedMapping.price];
        let cleanPrice = 0;
        if (typeof price === 'number') {
          cleanPrice = price;
        } else if (typeof price === 'string') {
          const sanitized = price.replace(/[₴$€\s]/g, '').replace(',', '.');
          cleanPrice = parseFloat(sanitized.replace(/[^0-9.]/g, ''));
        }

        // Recognition of Category Row
        const isCategoryMarker = name.startsWith('▶') || name.startsWith('►') || name.startsWith('•') || name.startsWith('⁃') || name.startsWith('>');
        const hasExplicitCategoryColumn = !!detectedMapping.category;
        
        if (isCategoryMarker || (!hasExplicitCategoryColumn && name && (isNaN(cleanPrice) || cleanPrice <= 0))) {
          const potentialCat = name.replace(/^[▶►•⁃>\s]+/, '').trim();
          if (potentialCat.length > 2 && potentialCat.length < 100) {
            currentCategory = potentialCat;
            return;
          }
        }

        // If it's a product row
        if (name && !isNaN(cleanPrice) && cleanPrice > 0) {
          const catVal = p[detectedMapping.category];
          const descVal = p[detectedMapping.description];
          const artVal = p[detectedMapping.article];
          const brandVal = p[detectedMapping.brand];
          const stockVal = p[detectedMapping.stock];
          const imgVal = p[detectedMapping.image];

          let initialType = (currentCategory.toLowerCase().includes('сантехніка') || name.toLowerCase().includes('змішувач') || name.toLowerCase().includes('кран') || name.toLowerCase().includes('труб') || name.toLowerCase().includes('сифон')) ? 'plumbing' : 'auto';

          const { cleanName, finalType: resolvedType } = cleanProductNameAndType(name, initialType);

          processedProducts.push({
            name: cleanName,
            price: cleanPrice,
            category: catVal?.toString().trim() || (resolvedType === 'plumbing' && currentCategory === 'Загальне' ? 'Сантехніка' : currentCategory),
            description: descVal?.toString() || (artVal ? `Артикул: ${artVal}` : ''),
            image_url: imgVal?.toString() || '',
            stock: Number(stockVal) || 1,
            type: resolvedType,
            brand: brandVal?.toString() || '',
            article: artVal?.toString() || ''
          });
        }
      });

      if (processedProducts.length === 0) {
        alert('Не знайдено товарів за цією схемою.');
        return;
      }

    setImportProgress(0);
    setImportStats({ current: 0, total: processedProducts.length });
    setImportStatus('Готуємо дані для завантаження...');
    setShouldStopImport(false);
    stopImportRef.current = false;
    
    let importedCount = 0;
    const batchSize = 50; 

    for (let i = 0; i < processedProducts.length; i += batchSize) {
      if (stopImportRef.current) {
        setImportStatus('Імпорт зупинено користувачем');
        console.warn('Smart import manually stopped.');
        break;
      }
      try {
        setImportStatus(`Завантаження пачки ${Math.floor(i/batchSize) + 1}...`);
        const chunk = processedProducts.slice(i, i + batchSize);
        const { error } = await supabase.from('products').insert(chunk);
        if (error) {
          console.error(`Smart batch error at ${i}:`, error);
          throw new Error(`Помилка Supabase (пакет ${Math.floor(i/batchSize) + 1}): ${error.message}`);
        }
        
        importedCount += chunk.length;
        setImportStatus(`Оброблено ${importedCount} з ${processedProducts.length}...`);
        setImportStats(prev => ({ ...prev, current: importedCount }));
        setImportProgress(Math.min(100, Math.round(((i + chunk.length) / processedProducts.length) * 100)));
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (batchErr: any) {
        console.error(`Smart batch FATAL at ${i}:`, batchErr);
        alert(`КРИТИЧНА ПОМИЛКА: ${batchErr.message}`);
        setIsImporting(false);
        return;
      }
    }

    setImportStatus('Імпорт завершено!');
    alert(`Розумний імпорт завершено!\nУспішно додано: ${importedCount} товарів.`);
      setPendingImportData(null);
      setDetectedMapping(null);
    } catch (err) {
      console.error('Final import error:', err);
      alert('Помилка при завантаженні даних.');
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-[80]">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            type="button"
          >
            <Menu size={22} />
          </button>
          <span className="text-xl font-black text-blue-600 tracking-tight">AdminPanel</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-gray-500">Live</span>
        </div>
      </header>

      {/* Mobile Sticky Tab Navigation */}
      <div className="md:hidden sticky top-[69px] z-[79] bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <LayoutDashboard size={14} />
          <span>Дашборд</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'products' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Package size={14} />
          <span>Товари</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'orders' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <ShoppingBag size={14} />
          <span>Замовлення</span>
        </button>
        <button
          onClick={() => setActiveTab('blog')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'blog' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <BookOpen size={14} />
          <span>Блог</span>
        </button>
        <button
          onClick={() => setActiveTab('content' as any)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === ('content' as any) ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Edit size={14} />
          <span>Контент</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'settings' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Settings size={14} />
          <span>Налаштування</span>
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'diagnostics' ? 'bg-red-600 text-white shadow-sm shadow-red-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Діагностика</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
            activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/10' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}
        >
          <MessageSquare size={14} />
          <span>Онлайн Чат</span>
        </button>
      </div>

      {/* Mobile Sidebar Slider Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[140] md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-[150] p-6 flex flex-col shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                <div className="text-2xl font-black text-blue-600">AdminPanel</div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <nav className="space-y-1.5 flex-1 overflow-y-auto">
                <button 
                  onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard size={20} />
                  <span>Дашборд</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('products'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'products' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Package size={20} />
                  <span>Товари</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('orders'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <ShoppingBag size={20} />
                  <span>Замовлення</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('blog'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'blog' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <BookOpen size={20} />
                  <span>Блог</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('content' as any); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === ('content' as any) ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Edit size={20} />
                  <span>Контент</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('chat'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'chat' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare size={20} />
                  <span>Онлайн Чат</span>
                </button>
              </nav>
              
              <div className="mt-8 space-y-1.5 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Settings size={20} />
                  <span>Налаштування</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('diagnostics'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
                    activeTab === 'diagnostics' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <AlertTriangle size={20} />
                  <span>Діагностика БД</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Persistent) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 p-6 flex-col shrink-0 min-h-screen sticky top-0 h-screen">
        <div className="text-2xl font-black text-blue-600 mb-12 tracking-tight">AdminPanel</div>
        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>Дашборд</span>
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'products' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package size={20} />
            <span>Товари</span>
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'orders' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={20} />
            <span>Замовлення</span>
          </button>
          <button 
            onClick={() => setActiveTab('blog')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'blog' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <BookOpen size={20} />
            <span>Блог</span>
          </button>
          <button 
            onClick={() => setActiveTab('content' as any)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === ('content' as any) ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Edit size={20} />
            <span>Контент</span>
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'chat' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <MessageSquare size={20} />
            <span>Онлайн Чат</span>
          </button>
        </nav>
        <div className="mt-8 space-y-2 border-t border-gray-150 pt-4">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} />
            <span>Налаштування</span>
          </button>
          <button 
            onClick={() => setActiveTab('diagnostics')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'diagnostics' ? 'bg-red-50 text-red-600' : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle size={20} />
            <span>Діагностика БД</span>
          </button>
        </div>
      </aside>

      {/* AI Mapping Confirmation Modal */}
      <AnimatePresence>
        {detectedMapping && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4 text-purple-600">
                <Sparkles size={24} />
                <h3 className="text-xl font-bold">Знайдено структуру колонок</h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Система автоматично визначила відповідність полів. Перевірте колонки:
              </p>
              
              <div className="space-y-3 mb-8">
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-500">Назва:</span>
                  <span className="font-medium">{detectedMapping.name || 'Не знайдено'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-500">Ціна:</span>
                  <span className="font-medium">{detectedMapping.price || 'Не знайдено'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-500">Категорія:</span>
                  <span className="font-medium">{detectedMapping.category || 'Не знайдено'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-500">Артикул:</span>
                  <span className="font-medium">{detectedMapping.article || 'Не знайдено'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-500">Фото (URL):</span>
                  <span className="font-medium">{detectedMapping.image || 'Не знайдено'}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDetectedMapping(null);
                    setPendingImportData(null);
                    setIsImporting(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Скасувати
                </button>
                <button
                  onClick={executeSmartImport}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  Почати імпорт
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Regular Import Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingRegularImport && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4 text-blue-600">
                <Upload size={24} />
                <h3 className="text-xl font-bold">Підтвердження імпорту</h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
                Знайдено <span className="font-black text-gray-900 dark:text-white px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">{pendingProductsToImport.length}</span> товарів. Ви готові розпочати заповнення бази даних?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsConfirmingRegularImport(false);
                    setPendingProductsToImport([]);
                    setIsImporting(false);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-bold text-gray-500"
                >
                  Скасувати
                </button>
                <button
                  onClick={executeRegularImport}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-200 active:scale-95"
                >
                  Почати завантаження
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Processing Modal */}
      <AnimatePresence>
        {isAiMapping && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-purple-100 dark:border-purple-900/30 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-t-4 border-purple-600 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-purple-600">
                  <Sparkles size={32} />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Авто-аналіз файлу...</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Зачекайте, ми визначаємо структуру вашої таблиці
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {isConfirmingDeleteAll && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmingDeleteAll(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setIsConfirmingDeleteAll(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-2">Видалити ВСЕ?</h3>
                <p className="text-gray-500 mb-8">
                  Ви збираєтеся видалити <span className="font-bold text-gray-900">ВСІ товари ({totalProductsCount})</span>. Цю дію неможливо буде скасувати.
                </p>
                
                <div className="flex w-full space-x-4">
                  <button
                    onClick={() => setIsConfirmingDeleteAll(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleDeleteAllProducts}
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
                  >
                    Видалити все
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-2">Ви впевнені?</h3>
                <p className="text-gray-500 mb-8">
                  Ви збираєтеся видалити товар <span className="font-bold text-gray-900">"{productToDelete.name}"</span>. Цю дію неможливо буде скасувати.
                </p>
                
                <div className="flex w-full space-x-4">
                  <button
                    onClick={() => setProductToDelete(null)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Order Notification */}
      <AnimatePresence>
        {newOrderNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 32, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[300] w-full max-w-md px-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-blue-500/30 overflow-hidden ring-1 ring-blue-500/20">
              <div className="p-6 flex items-start space-x-4">
                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-500/30 animate-bounce">
                  <Bell size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Нове замовлення!</h3>
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Зараз</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-bold mb-1">
                    Від: {newOrderNotification.phone}
                  </p>
                  <p className="text-xs text-gray-500 truncate mb-3">
                    Сума: <span className="text-blue-600 font-bold">{newOrderNotification.total_price} грн</span>
                  </p>
                  <div className="flex space-x-3">
                    <button 
                      onClick={() => {
                        setActiveTab('orders');
                        setNewOrderNotification(null);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all flex-1"
                    >
                      Переглянути
                    </button>
                    <button 
                      onClick={() => setNewOrderNotification(null)}
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all"
                    >
                      Закрити
                    </button>
                  </div>
                </div>
              </div>
              <div className="h-1 bg-blue-600/10 w-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                  className="h-full bg-blue-600"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 sm:px-10 py-4 sm:py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10 shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button 
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="sm:hidden p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                  <div>
                    <h3 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Редагування</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 hidden xs:block">ID: {editingProduct.id.toString().substring(0, 12)}...</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    type="submit"
                    form="edit-product-form"
                    className="sm:hidden bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-blue-600/10 active:scale-95 transition-all animate-none"
                  >
                    Оновити
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="hidden sm:block p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-2xl transition-all hover:rotate-90"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form id="edit-product-form" onSubmit={handleUpdateProduct} className="flex-1 overflow-y-auto pb-24 sm:pb-0">
                <div className="p-5 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
                  {/* Left Column: Form Fields */}
                  <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                    {/* General Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center space-x-2 text-blue-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Основна інформація</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Назва товару</label>
                            {editingProduct.name && (
                              <button 
                                type="button" 
                                onClick={() => setEditingProduct({...editingProduct, name: ''})}
                                className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5 cursor-pointer bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md"
                              >
                                Очистити
                              </button>
                            )}
                          </div>
                          <textarea 
                            required
                            rows={3}
                            value={editingProduct.name}
                            onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                            className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 sm:px-5 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-gray-950 dark:text-white text-xs sm:text-sm resize-none leading-relaxed"
                            placeholder="Введіть назву товару"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Опис товару</label>
                          <textarea 
                            value={editingProduct.description}
                            onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                            className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-32 sm:h-40 resize-none font-semibold text-gray-950 dark:text-white text-xs sm:text-sm leading-relaxed"
                            placeholder="Детальний опис товару..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Classification Section */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-center space-x-2 text-indigo-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Класифікація та ціна</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Категорія</label>
                          <input 
                            required
                            value={editingProduct.category}
                            onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                            className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-900 dark:text-white text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Тип товару</label>
                          <select 
                            value={editingProduct.type}
                            onChange={e => setEditingProduct({...editingProduct, type: e.target.value as any})}
                            className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-900 dark:text-white text-xs sm:text-sm appearance-none"
                          >
                            <option value="auto">Автотовари</option>
                            <option value="plumbing">Сантехніка</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Ціна (грн)</label>
                          <div className="relative">
                            <input 
                              type="number"
                              required
                              value={editingProduct.price}
                              onFocus={(e) => e.target.select()}
                              onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                              className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-4 pr-9 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-blue-600 dark:text-blue-400 text-sm sm:text-base"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs sm:text-sm">₴</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Склад (шт)</label>
                          <input 
                            type="number"
                            value={editingProduct.stock}
                            onFocus={(e) => e.target.select()}
                            onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                            className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-900 dark:text-white text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Артикул</label>
                      <input 
                        value={editingProduct.article || ''}
                        onChange={e => setEditingProduct({...editingProduct, article: e.target.value})}
                        className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono text-gray-600 dark:text-gray-400 text-xs sm:text-sm"
                        placeholder="Наприклад: 123-ABC"
                      />
                    </div>
                  </div>

                  {/* Right Column: Media Preview */}
                  <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                    <div className="flex items-center space-x-2 text-emerald-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Зображення товару</span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-4 sm:p-6 border border-gray-100 dark:border-gray-700 space-y-4 sm:space-y-6">
                      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
                        {editingProduct.image ? (
                          <div className="space-y-3 p-3">
                            <div className="aspect-square bg-gray-50 dark:bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 dark:border-gray-800 mb-2">
                              <img 
                                src={getFirstImage(editingProduct.image)} 
                                alt="Preview" 
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Invalid+URL';
                                }}
                              />
                            </div>
                            {splitImages(editingProduct.image).length > 1 && (
                              <div className="flex flex-wrap gap-1.5">
                                {splitImages(editingProduct.image).map((url, i) => (
                                  <div key={url} className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-250 flex-shrink-0">
                                    <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-10 px-4 space-y-2">
                            <Upload size={36} className="mx-auto text-gray-300" />
                            <p className="text-xs text-gray-400 font-bold">Немає зображення</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Керування фотографіями</label>
                          <a 
                            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(editingProduct.name)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-350 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <Sparkles size={12} className="text-amber-500 animate-pulse" />
                            <span>Шукати в Google Картинках</span>
                          </a>
                        </div>
                        <MultiImageUploader 
                          imagesString={editingProduct.image || ''}
                          onChange={(newVal) => setEditingProduct({...editingProduct, image: newVal})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Footer Buttons */}
                <div className="hidden sm:flex px-5 sm:px-10 py-4 sm:py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-850 flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:space-x-4 sticky bottom-0 z-10 backdrop-blur-md shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setEditingProduct(null)} 
                    className="px-6 py-2.5 sm:py-4 font-black text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm order-2 sm:order-1 text-center bg-gray-100 sm:bg-transparent rounded-xl"
                  >
                    Скасувати
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-8 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition-all active:scale-95 text-xs sm:text-sm order-1 sm:order-2"
                  >
                    Оновити товар
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Blog Post Modal */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingPost(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full h-full sm:h-auto max-h-[100dvh] sm:max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 sm:px-10 py-4 sm:py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10 shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button 
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="sm:hidden p-2 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 active:scale-95 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                  <div>
                    <h3 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Редагування статті</h3>
                    <p className="text-[10px] sm:text-xs text-gray-400 font-bold mt-0.5 hidden xs:block">SEO редактор</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    type="submit"
                    form="edit-blog-post-form"
                    className="sm:hidden bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-purple-600/10 active:scale-95 transition-all animate-none"
                  >
                    Зберегти
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="hidden sm:block p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-2xl transition-all hover:rotate-90"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form id="edit-blog-post-form" onSubmit={handleUpdatePost} className="flex-1 overflow-y-auto pb-24 sm:pb-0">
                <div className="p-5 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
                  {/* Left Column: Post Data */}
                  <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Заголовок статті</label>
                          {editingPost.title && (
                            <button 
                              type="button" 
                              onClick={() => setEditingPost({...editingPost, title: ''})}
                              className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5 cursor-pointer bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md"
                            >
                              Очистити
                            </button>
                          )}
                        </div>
                        <textarea 
                          required
                          rows={2}
                          value={editingPost.title}
                          onChange={e => setEditingPost({...editingPost, title: e.target.value})}
                          className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-gray-950 dark:text-white text-xs sm:text-sm resize-none leading-relaxed"
                          placeholder="Назва статті"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Категорія</label>
                        <input 
                          required
                          value={editingPost.category}
                          onChange={e => setEditingPost({...editingPost, category: e.target.value})}
                          className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-semibold text-gray-900 dark:text-white text-xs sm:text-sm"
                          placeholder="Наприклад: Поради, Новини..."
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Короткий опис (Excerpt)</label>
                      <textarea 
                        required
                        value={editingPost.excerpt}
                        onChange={e => setEditingPost({...editingPost, excerpt: e.target.value})}
                        className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-20 resize-none font-semibold text-gray-900 dark:text-white text-xs sm:text-sm"
                        placeholder="Короткий анонс для стрічки..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300">Контент статті (Markdown)</label>
                      <textarea 
                        required
                        value={editingPost.content}
                        onChange={e => setEditingPost({...editingPost, content: e.target.value})}
                        className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-64 sm:h-80 font-mono text-xs sm:text-sm leading-relaxed"
                        placeholder="Введіть повний текст статті з використанням Markdown і стилів..."
                      />
                    </div>
                  </div>

                  {/* Right Column: Settings & Image preview */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700 space-y-4">
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Параметри публікації</div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">Автор статті</label>
                        <input 
                          value={editingPost.author}
                          onChange={e => setEditingPost({...editingPost, author: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-850 dark:text-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">Час читання</label>
                        <input 
                          value={editingPost.readTime}
                          onChange={e => setEditingPost({...editingPost, readTime: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500">URL обкладинки</label>
                        <input 
                          value={editingPost.image}
                          onChange={e => setEditingPost({...editingPost, image: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 font-mono text-[10px] text-gray-500"
                          placeholder="https://..."
                        />
                      </div>

                      {editingPost.image && (
                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Перегляд обкладинки:</label>
                          <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-200 dark:bg-gray-950">
                            <img src={editingPost.image} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sticky Footer Buttons */}
                <div className="hidden sm:flex px-5 sm:px-10 py-4 sm:py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-850 flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 sm:space-x-4 sticky bottom-0 z-10 backdrop-blur-md shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setEditingPost(null)} 
                    className="px-6 py-2.5 sm:py-4 font-black text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-xs sm:text-sm order-2 sm:order-1 text-center bg-gray-100 sm:bg-transparent rounded-xl"
                  >
                    Скасувати
                  </button>
                  <button 
                    type="submit" 
                    className="bg-purple-600 text-white px-8 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black shadow-lg shadow-purple-600/10 hover:bg-purple-700 transition-all active:scale-95 text-xs sm:text-sm order-1 sm:order-2"
                  >
                    Зберегти зміни
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-12 overflow-y-auto max-w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 sm:space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900">Статистика</h1>
              <div className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 font-bold">Оновлено: {new Date().toLocaleTimeString()}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
              <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
                <div className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 font-bold mb-2">Всього замовлень</div>
                <div className="text-2xl sm:text-4xl font-black text-gray-900">{orders.length}</div>
              </div>
              <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
                <div className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 font-bold mb-2">Всього товарів</div>
                <div className="text-2xl sm:text-4xl font-black text-gray-900">{totalProductsCount || products.length}</div>
              </div>
              <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
                <div className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 font-bold mb-2">Виторг</div>
                <div className="text-2xl sm:text-4xl font-black text-blue-600">
                  {orders.reduce((sum, o) => sum + o.total_price, 0).toLocaleString()} грн
                </div>
              </div>
              <div className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm border border-gray-100">
                <div className="text-xs sm:text-sm text-gray-400 sm:text-gray-500 font-bold mb-2">Низький запас</div>
                <div className="text-2xl sm:text-4xl font-black text-red-500">
                  {products.filter(p => p.stock < 5).length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
              <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-lg sm:text-xl font-black mb-6 sm:mb-8">Динаміка продажів (7 днів)</h3>
                <div className="h-[260px] sm:h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{fontWeight: 'bold', fontSize: 12}}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-lg sm:text-xl font-black mb-6 sm:mb-8">Товари з низьким запасом</h3>
                <div className="space-y-3 sm:space-y-4">
                  {products.filter(p => p.stock < 5).slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 sm:p-4 bg-red-50 rounded-2xl gap-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 bg-white rounded-lg overflow-hidden border border-red-100 flex-shrink-0">
                          <img src={getFirstImage(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-gray-900 text-sm truncate">{p.name}</span>
                       </div>
                      <div className="text-red-600 font-black text-xs sm:text-sm flex-shrink-0">Залишок: {p.stock}</div>
                    </div>
                  ))}
                  {products.filter(p => p.stock < 5).length === 0 && (
                    <div className="text-center py-12 text-gray-400 font-bold">Всі товари в достатній кількості</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Управління товарами</span>
                    <span className="text-xs font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{products.length} шт</span>
                  </h1>
                  <p className="text-xs text-gray-400 mt-1 font-semibold">Додавайте, редагуйте та керуйте товарами наживо</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAddingProduct(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs sm:text-sm shadow-md shadow-blue-600/10 active:scale-95"
                  >
                    <Plus size={16} />
                    <span>Додати товар</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowDbOps(!showDbOps)}
                    className={`flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black border transition-all ${
                      showDbOps 
                        ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Settings size={14} className={showDbOps ? 'animate-spin' : ''} />
                    <span>Інструменти</span>
                  </button>
                </div>
              </div>

              {/* Search & Refresh Row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    placeholder="Пошук за назвою або артикулом..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full text-xs sm:text-sm font-semibold transition-all placeholder:text-gray-400"
                  />
                  <Package className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
                
                <button 
                  onClick={refreshAllData}
                  disabled={isRefreshing}
                  className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 rounded-xl transition-all shrink-0"
                  title="Оновити дані"
                >
                  <RotateCw className={isRefreshing ? 'animate-spin' : ''} size={16} />
                </button>
              </div>

              {/* Plumbing prefix fix alert banner */}
              {products.some(p => p.name.trim().toLowerCase().startsWith('сантехніка') && p.name.trim().length > 10) && (
                <div className="bg-amber-50/80 border border-amber-200/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-in">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-amber-900 leading-tight uppercase tracking-wider">Знайдено товари з префіксом "Сантехніка —"</h4>
                      <p className="text-[11px] text-amber-700/80 font-bold leading-relaxed">
                        Виявлено товари з префіксами типу "Сантехніка —" у назві та неправильним розділом "АВТО". 
                        Бажаєте автоматично прибрати ці префікси та перемістити товари до розділу "Сантехніка"?
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleFixPlumbingPrefixes}
                    disabled={isFixingPlumbing}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl px-4 py-2 text-xs font-extrabold shadow-md shadow-amber-600/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
                  >
                    {isFixingPlumbing ? (
                      <>
                        <RotateCw className="animate-spin text-white" size={12} />
                        <span>Виправлення...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={12} className="text-white" />
                        <span>Виправити автоматично ({products.filter(p => p.name.trim().toLowerCase().startsWith('сантехніка') && p.name.trim().length > 10).length} шт)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tractor prefix fix alert banner */}
              {products.some(p => {
                const { cleanName } = cleanProductNameAndType(p.name, p.type);
                return cleanName !== p.name.trim();
              }) && (
                <div className="bg-blue-50/80 border border-blue-200/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-slide-in">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-blue-600 shrink-0 mt-0.5 animate-pulse" size={18} />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-blue-900 leading-tight uppercase tracking-wider">Знайдено товари з префіксом тракторних деталей</h4>
                      <p className="text-[11px] text-blue-700/80 font-bold leading-relaxed">
                        Виявлено товари з зайвими фразами типу "Запчастина для трактора МТЗ ЮМЗ: ", "МТЗ/ЮМЗ —" у назвах.
                        Приберіть ці довгі префікси, щоб назва товару виглядала чистою і красивою для покупців!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleFixTractorPrefixes}
                    disabled={isFixingTractor}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl px-4 py-2 text-xs font-extrabold shadow-md shadow-blue-600/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
                  >
                    {isFixingTractor ? (
                      <>
                        <RotateCw className="animate-spin text-white" size={12} />
                        <span>Виправлення...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={12} className="text-white" />
                        <span>Очистити префікси ({products.filter(p => {
                          const { cleanName } = cleanProductNameAndType(p.name, p.type);
                          return cleanName !== p.name.trim();
                        }).length} шт)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Advanced database operations - Collapsible */}
              <AnimatePresence>
                {showDbOps && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-gray-100 pt-4"
                  >
                    <div className="bg-purple-50/20 border border-purple-100/30 p-4 rounded-2xl space-y-3">
                      <div className="text-xs font-black text-purple-700 uppercase tracking-wider mb-1">Імпорт, Експорт та Керування Базою Даних:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <label className={`flex items-center justify-center space-x-2 bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Upload size={14} className={isImporting ? 'animate-bounce' : ''} />
                          <span>{isImporting ? `Імпорт ${importProgress}%` : 'Імпорт XLSX'}</span>
                          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} className="hidden" disabled={isImporting} />
                        </label>

                        <button 
                          onClick={handleDownloadTemplate}
                          type="button"
                          className="flex items-center justify-center space-x-2 bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all text-gray-600"
                        >
                          <Download size={14} />
                          <span>Шаблон XLSX</span>
                        </button>

                        <button 
                          onClick={() => handleExportProducts()}
                          type="button"
                          className="flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100/50 text-emerald-700 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                        >
                          <Download size={14} />
                          <span>Експорт в Excel</span>
                        </button>

                        <label className={`flex items-center justify-center space-x-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Sparkles size={14} className={isAiMapping ? 'animate-pulse' : ''} />
                          <span>Смарт Імпорт</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSmartImport(file);
                            }}
                            disabled={isImporting}
                          />
                        </label>

                        <button 
                          onClick={async () => {
                            try {
                              const { count } = await supabase
                                .from('products')
                                .select('*', { count: 'exact', head: true });
                              if (count !== null) setTotalProductsCount(count);
                            } catch (e) {}
                              setIsConfirmingDeleteAll(true);
                          }}
                          type="button"
                          className="flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-3 py-2.5 rounded-xl text-xs font-semibold sm:font-bold transition-all"
                        >
                          <Trash2 size={14} />
                          <span>Видалити все</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected items tools */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-blue-50/40 border border-blue-100 p-3 rounded-xl animate-slide-in">
                  <span className="text-xs font-bold text-blue-700">Вибрано товарів: <span className="font-extrabold">{selectedProducts.length}</span></span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        const targetList = products.filter(p => selectedProducts.includes(p.id));
                        handleExportProducts(targetList);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Скачати в Excel ({selectedProducts.length} шт)</span>
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-1 bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                    >
                      <Trash2 size={12} />
                      <span>Видалити ({selectedProducts.length})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isAddingProduct && (
              <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-600/5 space-y-8">
                {/* AUTOFILL / CLONE SECTION */}
                <div className="bg-gradient-to-tr from-blue-50/70 to-indigo-50/40 p-6 rounded-2xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2 text-blue-700">
                      <Sparkles size={18} className="text-blue-600 animate-pulse" />
                      <h3 className="text-xs font-black uppercase tracking-wider">Швидке клонування / Автозаповнення</h3>
                    </div>
                    {clonedFromProductName && (
                      <span className="text-[10px] bg-emerald-600 text-white font-bold py-1 px-3 rounded-full flex items-center gap-1">
                        ✓ Скопійовано з: <b className="font-extrabold">{clonedFromProductName}</b>
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 font-medium">
                    Ви можете вибрати будь-який існуючий або нещодавно відредагований товар як шаблон, щоб миттєво заповнити форму новими даними.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Search Field */}
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Пошук серед усіх товарів для копіювання..."
                        value={templateSearchText}
                        onChange={(e) => setTemplateSearchText(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs text-gray-800"
                      />
                      <Package className="absolute left-3 top-3 text-gray-400" size={14} />
                      {templateSearchText && (
                        <button 
                          type="button" 
                          onClick={() => setTemplateSearchText('')}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 font-bold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick reset templates */}
                    <div className="flex gap-2 items-center md:justify-end text-xs">
                      {clonedFromProductName && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setNewProduct({ name: '', price: 0, category: '', description: '', image: '', stock: 1, type: 'auto', brand: '', article: '', specs: '' });
                            setClonedFromProductName(null);
                          }} 
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition-all"
                        >
                          Очистити форму
                        </button>
                      )}
                      <button 
                        type="button" 
                        onClick={() => setTemplateSearchText('')} 
                        disabled={!templateSearchText}
                        className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-600 text-[11px] disabled:opacity-50"
                      >
                        Скинути пошук
                      </button>
                    </div>
                  </div>

                  {/* Suggestion lists container */}
                  <div className="space-y-4">
                    {/* 1. Recently edited list */}
                    {editedProductIds.length > 0 && (
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" /> Нещодавно відредаговані товари:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {products
                            .filter(p => editedProductIds.includes(p.id))
                            .filter(p => !templateSearchText || p.name.toLowerCase().includes(templateSearchText.toLowerCase()) || p.article?.toLowerCase().includes(templateSearchText.toLowerCase()))
                            .map(p => (
                              <button
                                key={`edit-tmpl-${p.id}`}
                                type="button"
                                onClick={() => {
                                  setNewProduct({
                                    name: p.name,
                                    price: p.price,
                                    category: p.category,
                                    description: p.description || '',
                                    image: p.image || p.image_url || '',
                                    stock: p.stock || 1,
                                    type: p.type || 'auto',
                                    brand: p.brand || '',
                                    article: p.article || '',
                                    specs: typeof p.specs === 'object' ? JSON.stringify(p.specs) : (p.specs || '')
                                  });
                                  setClonedFromProductName(p.name);
                                }}
                                className="flex items-center space-x-2 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 p-2 rounded-xl transition-all shadow-sm max-w-[260px] text-left"
                              >
                                <div className="w-6 h-6 rounded bg-gray-50 overflow-hidden flex-shrink-0">
                                  <img src={getFirstImage(p.image) || `https://picsum.photos/seed/${p.id}/50/50`} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[10px] text-gray-800 truncate leading-tight">{p.name}</div>
                                  <div className="text-[8px] text-blue-600 font-black truncate">{p.price} грн • {p.brand || 'без бренду'}</div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* 2. Search / Filtered items */}
                    {templateSearchText ? (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Результати пошуку товарів-шаблонів:</div>
                        {products.filter(p => p.name.toLowerCase().includes(templateSearchText.toLowerCase()) || p.article?.toLowerCase().includes(templateSearchText.toLowerCase())).length === 0 ? (
                          <div className="text-[10px] text-gray-400 font-bold py-1">Товарів не знайдено за вашим запитом.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                            {products
                              .filter(p => p.name.toLowerCase().includes(templateSearchText.toLowerCase()) || p.article?.toLowerCase().includes(templateSearchText.toLowerCase()))
                              .slice(0, 15)
                              .map(p => (
                                <button
                                  key={`search-tmpl-${p.id}`}
                                  type="button"
                                  onClick={() => {
                                    setNewProduct({
                                      name: p.name,
                                      price: p.price,
                                      category: p.category,
                                      description: p.description || '',
                                      image: p.image || p.image_url || '',
                                      stock: p.stock || 1,
                                      type: p.type || 'auto',
                                      brand: p.brand || '',
                                      article: p.article || '',
                                      specs: typeof p.specs === 'object' ? JSON.stringify(p.specs) : (p.specs || '')
                                    });
                                    setClonedFromProductName(p.name);
                                  }}
                                  className="flex items-center space-x-2 bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-300 p-2 rounded-xl transition-all text-left shadow-sm min-w-0"
                                >
                                  <div className="w-7 h-7 rounded bg-gray-50 overflow-hidden flex-shrink-0">
                                    <img src={getFirstImage(p.image) || `https://picsum.photos/seed/${p.id}/50/50`} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-[10px] text-gray-800 truncate leading-none">{p.name}</div>
                                    <div className="text-[8px] text-gray-400 font-mono truncate mt-0.5">{p.article || 'немає арт.'} • {p.price} грн</div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 3. Predefined default lists (ті які там зараз) */
                      <div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Поточні товари (ті, які там зараз є):</div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                          {products
                            .slice(0, 6)
                            .map(p => (
                              <button
                                key={`curr-tmpl-${p.id}`}
                                type="button"
                                onClick={() => {
                                  setNewProduct({
                                    name: p.name,
                                    price: p.price,
                                    category: p.category,
                                    description: p.description || '',
                                    image: p.image || p.image_url || '',
                                    stock: p.stock || 1,
                                    type: p.type || 'auto',
                                    brand: p.brand || '',
                                    article: p.article || '',
                                    specs: typeof p.specs === 'object' ? JSON.stringify(p.specs) : (p.specs || '')
                                  });
                                  setClonedFromProductName(p.name);
                                }}
                                className="flex items-center space-x-1.5 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 py-1.5 px-3 rounded-full transition-all text-left shadow-sm text-[11px] font-bold text-gray-700"
                              >
                                <span className="opacity-75">📦</span> 
                                <span className="truncate max-w-[150px]">{p.name}</span>
                                <span className="text-[9px] text-blue-600">({p.price}₴)</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PRODUCT ACTION FORM */}
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-600">Назва</label>
                      {newProduct.name && (
                        <button 
                          type="button" 
                          onClick={() => setNewProduct({...newProduct, name: ''})}
                          className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5 cursor-pointer bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-md"
                        >
                          Очистити
                        </button>
                      )}
                    </div>
                    <textarea 
                      required
                      rows={2}
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed text-sm"
                      placeholder="Введіть повну назву товару..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Ціна (грн)</label>
                    <input 
                      type="number"
                      required
                      value={newProduct.price}
                      onFocus={(e) => e.target.select()}
                      onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Категорія</label>
                    <input 
                      required
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Тип</label>
                    <select 
                      value={newProduct.type}
                      onChange={e => setNewProduct({...newProduct, type: e.target.value as any})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                    >
                      <option value="auto">Автотовари</option>
                      <option value="plumbing">Сантехніка</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Бренд / Виробник</label>
                    <input 
                      value={newProduct.brand}
                      onChange={e => setNewProduct({...newProduct, brand: e.target.value})}
                      placeholder="Наприклад: Bosch, Grohe, ..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Артикул</label>
                    <input 
                      value={newProduct.article}
                      onChange={e => setNewProduct({...newProduct, article: e.target.value})}
                      placeholder="Наприклад: 123-ABC"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-gray-600">Опис</label>
                    <textarea 
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-24"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Кількість на складі</label>
                    <input 
                      type="number"
                      value={newProduct.stock}
                      onFocus={(e) => e.target.select()}
                      onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Технічні характеристики (JSON формат)</label>
                    <input 
                      value={newProduct.specs}
                      onChange={e => setNewProduct({...newProduct, specs: e.target.value})}
                      placeholder='Наприклад: {"Матеріал": "Сталь", "Довжина": "10м"}'
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-gray-600">Керування фотографіями</label>
                      <a 
                        href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(newProduct.name || 'змішувач автозапчастини')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Sparkles size={12} className="text-amber-500 animate-pulse" />
                        <span>Шукати в Google Картинках</span>
                      </a>
                    </div>
                    <MultiImageUploader 
                      imagesString={newProduct.image || ''}
                      onChange={(newVal) => setNewProduct({...newProduct, image: newVal})}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2 flex justify-end space-x-2 sm:space-x-4">
                    <button type="button" onClick={() => setIsAddingProduct(false)} className="px-4 sm:px-6 py-2.5 sm:py-3 font-bold text-gray-500 hover:text-gray-700 text-sm">Скасувати</button>
                    <button type="submit" className="bg-blue-600 text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-blue-700 text-sm">Зберегти товар</button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              {/* Mobile View: Cards Layout */}
              <div className="block md:hidden divide-y divide-gray-100">
                {products
                  .filter(p => 
                    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                    p.article?.toLowerCase().includes(productSearch.toLowerCase()) ||
                    p.brand?.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .slice(0, visibleProductsCount)
                  .map(p => (
                    <div 
                      key={p.id} 
                      className={`p-4 space-y-3 transition-colors ${selectedProducts.includes(p.id) ? 'bg-blue-50/20' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <button 
                          onClick={() => {
                            if (selectedProducts.includes(p.id)) setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                            else setSelectedProducts([...selectedProducts, p.id]);
                          }}
                          className={`mt-1 h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            selectedProducts.includes(p.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'
                          }`}
                        >
                          <CheckSquare size={14} className="stroke-[3]" />
                        </button>
                        
                        <div className="w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                          <img 
                            src={getFirstImage(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <a 
                            href={`/product/${p.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-black text-gray-950 hover:text-blue-600 break-words line-clamp-2"
                          >
                            {p.name}
                          </a>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              p.type === 'auto' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {p.type === 'auto' ? 'Авто' : 'Сантех'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-extrabold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{p.category}</span>
                            {p.article && (
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1 py-0.5 rounded">Арт: {p.article}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 bg-gray-50/40 px-2 py-1.5 rounded-xl">
                        <div className="text-sm font-black text-gray-900">{p.price} грн</div>
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => setEditingProduct(p)} 
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p)} 
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop View: Classical Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 w-12">
                        <button 
                          onClick={() => {
                            if (selectedProducts.length === products.length) setSelectedProducts([]);
                            else setSelectedProducts(products.map(p => p.id));
                          }}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          {selectedProducts.length === products.length ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </th>
                      <th className="px-6 py-4 font-bold text-gray-600">Товар</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Тип</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Категорія</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Ціна</th>
                      <th className="px-6 py-4 font-bold text-gray-600 text-right">Дії</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        p.article?.toLowerCase().includes(productSearch.toLowerCase())
                      )
                      .slice(0, visibleProductsCount)
                      .map(p => (
                      <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${selectedProducts.includes(p.id) ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => {
                              if (selectedProducts.includes(p.id)) setSelectedProducts(selectedProducts.filter(id => id !== p.id));
                              else setSelectedProducts([...selectedProducts, p.id]);
                            }}
                            className={`${selectedProducts.includes(p.id) ? 'text-blue-600' : 'text-gray-300 hover:text-gray-400'}`}
                          >
                            {selectedProducts.includes(p.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 shadow-sm shrink-0">
                              <img src={getFirstImage(p.image) || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <a 
                              href={`/product/${p.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {p.name}
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${p.type === 'auto' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {p.type === 'auto' ? 'Авто' : 'Сантех'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{p.category}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{p.price} грн</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => setEditingProduct(p)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit size={18} /></button>
                            <button onClick={() => handleDeleteProduct(p)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {products.length > visibleProductsCount && (
                <div className="p-12 border-t border-gray-100 flex justify-center">
                  <button
                    onClick={() => setVisibleProductsCount(prev => prev + 50)}
                    className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-gray-200/50 flex items-center gap-3"
                  >
                    <Package size={20} />
                    <span>Показати ще 50 товарів</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Замовлення</span>
                  <span className="text-xs font-black bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{orders.length} шт</span>
                </h1>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Переглядайте та оновлюйте поточні замовлення клієнтів</p>
              </div>
              
              <button 
                onClick={handleExportOrders}
                className="flex items-center justify-center space-x-2 bg-white border border-gray-200 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs sm:text-sm text-gray-700 w-full sm:w-auto active:scale-95 shadow-sm"
              >
                <Download size={14} />
                <span>Експорт у XLSX</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              {/* Mobile view: Orders Cards Layout */}
              <div className="block md:hidden divide-y divide-gray-100">
                {orders.map(o => (
                  <div key={o.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                        #{o.id.toString().substring(0, 8)}
                      </span>
                      
                      <div className="relative">
                        <select 
                          value={o.status}
                          onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer appearance-none pr-8 ${
                            o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                            o.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <option value="pending">Очікує</option>
                          <option value="processing">В роботі</option>
                          <option value="shipped">Відправлено</option>
                          <option value="delivered">Доставлено</option>
                          <option value="cancelled">Скасовано</option>
                        </select>
                        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 pr-3 ${
                          o.status === 'delivered' ? 'text-emerald-500' :
                          o.status === 'cancelled' ? 'text-red-500' :
                          'text-blue-500'
                        }`}>
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="text-sm font-black text-gray-900">{o.phone}</div>
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100/40">{o.delivery_address}</div>
                    </div>
                    
                    <div className="space-y-1 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/30">
                      <div className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Товари:</div>
                      <div className="space-y-1">
                        {o.items.map((i, index) => (
                          <div key={index} className="text-xs text-gray-700 flex justify-between">
                            <span className="font-semibold line-clamp-1">{i.name}</span>
                            <span className="font-extrabold shrink-0 text-gray-900 ml-2">x{i.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-xs font-bold text-gray-400">Загальна вартість:</span>
                      <span className="text-sm font-black text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg">{o.total_price} грн</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view: Classic Orders Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left min-w-[750px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-gray-600">ID</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Клієнт</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Товари</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Сума</th>
                      <th className="px-6 py-4 font-bold text-gray-600">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-gray-500">#{o.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{o.phone}</div>
                          <div className="text-xs text-gray-500">{o.delivery_address}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">{o.total_price} грн</td>
                        <td className="px-6 py-4">
                          <select 
                            value={o.status}
                            onChange={e => handleUpdateOrderStatus(o.id, e.target.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-full border-none focus:ring-0 cursor-pointer ${
                              o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                              o.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                              'bg-blue-50 text-blue-600'
                            }`}
                          >
                            <option value="pending">Очікує</option>
                            <option value="processing">В роботі</option>
                            <option value="shipped">Відправлено</option>
                            <option value="delivered">Доставлено</option>
                            <option value="cancelled">Скасовано</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-4xl font-black text-gray-900">Управління блогом</h1>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <button 
                  onClick={seedBlogPosts}
                  disabled={isRefreshing}
                  className="flex items-center space-x-2 bg-white border border-gray-200 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs sm:text-sm"
                >
                  <Sparkles size={18} className="text-blue-600" />
                  <span>Демо-статті</span>
                </button>
                <button 
                  onClick={async () => {
                    if (confirm('Бажаєте, щоб система автоматично написала нову корисну SEO-статтю для вашого блогу?')) {
                      setIsGeneratingPost(true);
                      try {
                        const response = await fetch('/api/blog/generate', { method: 'POST' });
                        const data = await response.json();
                        if (data.success) {
                          alert('Нову корисну статтю успішно створено та додано до блогу!');
                          refreshAllData();
                        } else {
                          console.error('Generation error:', data);
                          alert(`Помилка: ${data.error || 'Не вдалося створити статтю'}\n\nПорада: Перевірте вкладку "Діагностика БД", можливо таблиця "blog" ще не створена.`);
                        }
                      } catch (err: any) {
                        alert(`Помилка при автоматичному створенні статті: ${err.message}\n\nПереконайтеся, що сервер запущений та налаштований GEMINI_API_KEY.`);
                      } finally {
                        setIsGeneratingPost(false);
                      }
                    }
                  }}
                  disabled={isGeneratingPost}
                  className="flex items-center space-x-2 bg-purple-50 text-purple-600 border border-purple-100 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold hover:bg-purple-100 transition-all text-xs sm:text-sm"
                >
                  <Wand2 size={18} className={isGeneratingPost ? 'animate-bounce' : ''} />
                  <span>Генерація SEO-статті</span>
                </button>
                <button 
                  onClick={() => setIsAddingPost(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold hover:bg-blue-700 transition-all text-xs sm:text-sm"
                >
                  <Plus size={18} />
                  <span>Нова стаття</span>
                </button>
              </div>
            </div>

            {isAddingPost && (
              <div className="bg-white p-5 sm:p-8 rounded-3xl border border-blue-100 shadow-xl">
                <form onSubmit={handleAddPost} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Заголовок</label>
                      <input 
                        required
                        value={newPost.title}
                        onChange={e => setNewPost({...newPost, title: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Категорія</label>
                      <input 
                        required
                        value={newPost.category}
                        onChange={e => setNewPost({...newPost, category: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Короткий опис</label>
                    <textarea 
                      required
                      value={newPost.excerpt}
                      onChange={e => setNewPost({...newPost, excerpt: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Контент (Markdown)</label>
                    <textarea 
                      required
                      value={newPost.content}
                      onChange={e => setNewPost({...newPost, content: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-64 font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Автор</label>
                      <input 
                        value={newPost.author}
                        onChange={e => setNewPost({...newPost, author: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">Час читання</label>
                      <input 
                        value={newPost.readTime}
                        onChange={e => setNewPost({...newPost, readTime: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600">URL зображення</label>
                      <input 
                        value={newPost.image}
                        onChange={e => setNewPost({...newPost, image: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button type="button" onClick={() => setIsAddingPost(false)} className="px-6 py-3 font-bold text-gray-500">Скасувати</button>
                    <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Опублікувати</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {blogPosts.map(post => (
                <div key={post.id} className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                      <img src={post.image || `https://picsum.photos/seed/${post.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{post.title}</h3>
                      <div className="text-xs text-gray-400 font-semibold mt-0.5">{post.category} • {post.author} • {new Date(post.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-3 sm:space-x-1 border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingPost(post)} 
                      className="p-2 sm:p-1.5 text-gray-500 hover:text-blue-600 bg-gray-50 sm:bg-transparent rounded-xl border border-gray-100 sm:border-transparent transition-all hover:bg-white flex items-center justify-center h-10 w-10 sm:h-auto sm:w-auto"
                      title="Редагувати"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeletePost(post.id)} 
                      className="p-2 sm:p-1.5 text-gray-500 hover:text-red-500 bg-gray-50 sm:bg-transparent rounded-xl border border-gray-100 sm:border-transparent transition-all hover:bg-white flex items-center justify-center h-10 w-10 sm:h-auto sm:w-auto"
                      title="Видалити"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab as any) === 'content' && (
          <div className="space-y-6 sm:space-y-8">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900">Редактор контенту</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              {['auto', 'plumbing'].map(type => (
                <div key={type} className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-200 space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base sm:text-xl font-black uppercase tracking-wider text-gray-400">
                      {type === 'auto' ? 'Автотовари' : 'Сантехніка'}
                    </h3>
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${type === 'auto' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      Hero Section
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-gray-500">Badge Text</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                        value={heroContent?.[type]?.badge || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], badge: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-gray-500">Title</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                        value={heroContent?.[type]?.title || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], title: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-gray-500">Description</label>
                      <textarea 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-24" 
                        value={heroContent?.[type]?.description || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], description: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <label className="text-xs sm:text-sm font-bold text-gray-500">Button Text</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                        value={heroContent?.[type]?.button || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], button: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveHeroContent}
                className="bg-blue-600 text-white px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl font-black text-sm sm:text-base shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all w-full sm:w-auto text-center"
              >
                Зберегти всі зміни
              </button>
            </div>
          </div>
        )}
        {(activeTab as any) === 'settings' && (
          <div className="space-y-6 sm:space-y-8">
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900">Налаштування магазину</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
              <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-200 space-y-6">
                <h3 className="text-lg sm:text-xl font-bold">Загальні</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base">Технічний банер</div>
                      <div className="text-xs text-gray-400 sm:text-gray-500">Показати банер про тех. роботи (товар у наявності)</div>
                    </div>
                    <div 
                      onClick={() => handleToggleSetting('techBannerMode', !settings.techBannerMode)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${settings.techBannerMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.techBannerMode ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base">Режим обслуговування</div>
                      <div className="text-xs text-gray-400 sm:text-gray-500">Тимчасово закрити магазин для покупців</div>
                    </div>
                    <div 
                      onClick={() => handleToggleSetting('maintenanceMode', !settings.maintenanceMode)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${settings.maintenanceMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base">Сповіщення про замовлення</div>
                      <div className="text-xs text-gray-400 sm:text-gray-500">Отримувати email про нові замовлення</div>
                    </div>
                    <div 
                      onClick={() => handleToggleSetting('notifications', !settings.notifications)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors shrink-0 ${settings.notifications ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.notifications ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-200 space-y-6">
                <h3 className="text-lg sm:text-xl font-bold">Контакти</h3>
                <div className="space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-gray-500">Email підтримки</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                      value={settings.supportEmail} 
                      onChange={e => setSettings({...settings, supportEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-xs sm:text-sm font-bold text-gray-500">Телефон</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                      value={settings.phone} 
                      onChange={e => setSettings({...settings, phone: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={handleSaveSettings}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all text-sm sm:text-base mt-2"
                  >
                    Зберегти налаштування
                  </button>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-200 space-y-6 col-span-1 lg:col-span-2">
                <h3 className="text-lg sm:text-xl font-bold">Інтеграція з UTR (Order24)</h3>
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl space-y-4 animate-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-sm sm:text-base">Синхронізація прайс-листів</div>
                      <div className="text-xs sm:text-sm text-gray-400 sm:text-gray-500">Отримати актуальні товари та ціни з UTR API</div>
                    </div>
                    <button 
                      onClick={handleSyncUTR}
                      disabled={isSyncingUTR}
                      className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold transition-all text-xs sm:text-sm w-full sm:w-auto text-center ${
                        isSyncingUTR ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200/50'
                      }`}
                    >
                      {isSyncingUTR ? 'Синхронізація...' : 'Синхронізувати зараз'}
                    </button>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3">
                    <Package className="text-blue-500 shrink-0" size={20} />
                    <div className="text-xs text-blue-800">
                      Переконайтеся, що ви додали <code className="bg-blue-100 px-1 rounded font-bold">UTR_API_KEY</code> у налаштуваннях проекту.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-6 col-span-1 md:col-span-2">
                <h3 className="text-xl font-bold">API для розробників</h3>
                <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <code className="bg-blue-50 px-2 py-1 rounded font-bold">POST /api/external/products</code>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ви можете додавати товари через зовнішній API. Для авторизації використовуйте заголовок <code className="bg-gray-200 px-1 rounded">x-api-key</code>.
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase">Приклад запиту (JSON)</div>
                    <pre className="bg-gray-900 text-gray-300 p-4 rounded-xl text-xs overflow-x-auto">
{`{
  "name": "Новий товар",
  "price": 1000,
  "type": "auto",
  "category": "Запчастини",
  "description": "Опис товару",
  "stock": 10
}`}
                    </pre>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start space-x-3">
                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                    <div className="text-xs text-amber-800">
                      Ключ API налаштовується в системних змінних оточення (<code className="bg-amber-100 px-1 rounded">EXTERNAL_API_KEY</code>).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <AdminChatTab />
        )}

        {activeTab === ('diagnostics' as any) && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-gray-900">Діагностика бази даних</h1>
                <p className="text-gray-500 font-medium">Перевірка з'єднання та структури Supabase</p>
              </div>
              <button 
                onClick={refreshAllData}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all font-mono text-sm"
              >
                <RotateCw className={isRefreshing ? 'animate-spin' : ''} size={18} />
                <span>REFRESH_DIAGNOSTICS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <Settings className="text-blue-600" />
                  Налаштування сайту
                </h3>
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-100 p-6 rounded-[24px]">
                    <div className="flex items-start gap-4">
                      <div className="bg-green-100 p-3 rounded-xl">
                        <ShieldCheck className="text-green-600" size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-green-900 mb-1 uppercase text-sm">База підключена до коду</h4>
                        <p className="text-xs text-green-700/80 leading-relaxed font-medium">
                          Ваші ключі Supabase тепер "вшиті" безпосередньо в код додатка. 
                          Це означає, що <b>всі відвідувачі</b> сайту за замовчуванням бачать вашу базу даних 
                          <code> qllpx...</code> без необхідності налаштовувати щось вручну.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-4 ml-1">Активна конфігурація:</p>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[9px] text-gray-400 mb-1">PROJECT URL</div>
                        <div className="font-mono text-[11px] font-bold text-gray-700 break-all">https://qllpxployhzizlicxbss.supabase.co</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 mb-1">ANON KEY (PUBLIC)</div>
                        <div className="font-mono text-[11px] font-bold text-gray-700 break-all opacity-50">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...DvlD5...</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <ShieldCheck className="text-green-600" />
                  Виправлення видимості (RLS)
                </h3>
                <div className="flex-1 space-y-4">
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                    Якщо товари бачите тільки ви, а інші бачать "0" або помилку — потрібно відключити захист (RLS) у Supabase.
                  </p>
                  <div className="p-4 bg-gray-900 rounded-2xl">
                    <pre className="text-[10px] text-green-400 font-mono leading-tight whitespace-pre-wrap">
                      {`ALTER TABLE products DISABLE ROW LEVEL SECURITY;\n` +
                       `ALTER TABLE blog DISABLE ROW LEVEL SECURITY;\n` +
                       `ALTER TABLE content DISABLE ROW LEVEL SECURITY;\n` +
                       `ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;`}
                    </pre>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`ALTER TABLE products DISABLE ROW LEVEL SECURITY;\nALTER TABLE blog DISABLE ROW LEVEL SECURITY;\nALTER TABLE content DISABLE ROW LEVEL SECURITY;\nALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;`);
                      alert('SQL скопійовано! Вставте його в SQL Editor у вашому Supabase Dashboard.');
                    }}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl font-bold text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    СКОПІЮВАТИ SQL-КОМАНДУ
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <ShieldAlert className="text-blue-600" />
                  Статус підключення
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                    <div className="text-[10px] text-gray-400 uppercase font-black mb-1">Цільовий проект:</div>
                    <div className="font-mono text-[10px] break-all text-blue-600 font-bold leading-tight">
                      {localStorage.getItem('supabase_url') ? (
                        <span className="flex items-center gap-1">
                          <CheckSquare size={10} className="text-green-500" />
                          Власна база: {localStorage.getItem('supabase_url')?.split('//')[1]?.split('.')[0]}
                        </span>
                      ) : 'Демо-проект (qllpx...)'}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                    <div className="text-[10px] text-gray-400 uppercase font-black mb-1">Статус запиту:</div>
                    <div className="font-bold flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={totalProductsCount > 0 ? 'text-green-600' : 'text-red-500'}>
                          {totalProductsCount > 0 ? 'Дані отримано' : fetchError ? 'ПОМИЛКА ЗАПИТУ' : 'ПОРOЖНЯ БАЗА'}
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border text-xs">{totalProductsCount} товарів</span>
                      </div>
                      {fetchError && (
                        <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded-lg break-all mt-2 border border-red-100">
                          <b>Помилка:</b> {fetchError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs text-amber-700 leading-relaxed font-medium mb-3">
                      <b>Порада:</b> Якщо товарів 0, а помилки вище немає — база дійсно порожня. 
                      Зробіть імпорт у вкладці "Товари". Якщо є помилка <b>"401/403"</b> — ваш ключ <code>anon</code> невірний.
                    </p>
                    <div className="flex flex-col gap-2">
                       <button 
                        onClick={async () => {
                          const { data, error } = await supabase.from('products').select('*').limit(1);
                          if (error) {
                            alert(`Error detail: ${JSON.stringify(error, null, 2)}`);
                          } else {
                            alert(`Success! Data received: ${JSON.stringify(data, null, 2)}`);
                          }
                        }}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <Wand2 size={12} />
                        ТЕСТУВАТИ З'ЄДНАННЯ (ДЕТАЛЬНО)
                      </button>
                      <button 
                        onClick={async () => {
                          navigator.clipboard.writeText(`ALTER PUBLICATION supabase_realtime ADD TABLE orders;`);
                          alert('SQL скопійовано! Запустіть це в SQL Editor, щоб включити Realtime для замовлень.');
                        }}
                        className="w-full py-2 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        <Bell size={12} />
                        УВІМКНУТИ REALTIME (SQL)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-red-500">
                  <ShieldAlert />
                  Рішення "0 товарів"
                </h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Якщо в базі Є товари, але ви бачите 0 — це <b>RLS (Row Level Security)</b>. 
                    Скопіюйте SQL нижче, зайдіть в <b>SQL Editor</b> у Supabase і виконайте його:
                  </p>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-[10px] leading-relaxed">
                    ALTER TABLE products DISABLE ROW LEVEL SECURITY;<br/>
                    ALTER TABLE orders DISABLE ROW LEVEL SECURITY;<br/>
                    ALTER TABLE blog DISABLE ROW LEVEL SECURITY;<br/>
                    ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;
                  </div>
                  <button 
                    onClick={() => {
                      const sql = `ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;`;
                      navigator.clipboard.writeText(sql);
                      alert('SQL (для всіх таблиць) скопійовано! Зайдіть у Supabase -> SQL Editor -> Новий запит -> Вставте і натисніть Run.');
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    Скопіювати SQL для всього сайту
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center space-x-3 mb-6 text-blue-600 font-bold">
                <Package size={24} />
                <h3>Базовий SQL для структури</h3>
              </div>
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-400 uppercase">Таблиця Products</div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto">
                  {`ALTER TABLE products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'auto';
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS article TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;`}
                </pre>

                <div className="text-xs font-bold text-gray-400 uppercase mt-4">Таблиця Content (ВИРІШУЄ ПОМИЛКУ РЕДАКТОРА КОНТЕНТУ & HELPER)</div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 leading-relaxed font-semibold">
                  ⚠️ Якщо у вас не зберегаються налаштування сайту або налаштування розділу Hero, виконайте цей SQL запит у вашому Supabase, щоб створити таблицю dynamic-content:
                </div>
                <pre className="bg-gray-900 text-blue-400 p-4 rounded-xl text-xs overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content DISABLE ROW LEVEL SECURITY;`}
                </pre>

                <div className="text-xs font-bold text-gray-400 uppercase mt-4">Таблиця Blog (ДЛЯ СТАТЕЙ ТА НОВИН)</div>
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-800 leading-relaxed font-semibold">
                  ⚠️ Якщо ви бажаєте створити або переналаштувати таблицю для блогу, виконайте цей SQL:
                </div>
                <pre className="bg-gray-900 text-indigo-400 p-4 rounded-xl text-xs overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS blog (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  read_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE blog DISABLE ROW LEVEL SECURITY;`}
                </pre>
                
                <div className="text-xs font-bold text-gray-400 uppercase mt-4">Таблиця Orders (ВИРІШУЄ ПОМИЛКУ ОФОРМЛЕННЯ)</div>
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-xs text-amber-800 leading-relaxed font-semibold">
                  ⚠️ Якщо у користувачів виникає помилка при оформленні — це означає, що ваша таблиця orders має застарілу або неправильну структуру. Виконайте SQL скрипт нижче: він видалить стару пусту таблицю і створить правильну з усіма необхідними полями.
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-[10px] overflow-x-auto leading-tight font-mono">
{`DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  items TEXT NOT NULL,
  total_price NUMERIC NOT NULL,
  phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  user_id TEXT
);

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;`}
                </pre>
                <button 
                  onClick={() => {
                    const sql = `DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  items TEXT NOT NULL,
  total_price NUMERIC NOT NULL,
  phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  user_id TEXT
);

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;`;
                    navigator.clipboard.writeText(sql);
                    alert('SQL-скрипт копіювання успішно завершено! Вставте його в SQL Editor у Supabase та натисніть Run.');
                  }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  СКОПІЮВАТИ SQL ДЛЯ ОНОВЛЕННЯ ЗАМОВЛЕНЬ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-8 rounded-[32px]">
                <div className="flex items-center space-x-3 mb-4 text-amber-600">
                  <Settings size={24} />
                  <h4 className="font-bold">Налаштування на Netlify</h4>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-400 mb-4">
                  Якщо ви задеплоїли додаток на Netlify, вам потрібно вручну додати змінні оточення:
                </p>
                <ol className="text-xs text-amber-800 dark:text-amber-400 list-decimal ml-4 space-y-2">
                  <li>Зайдіть у дешборд <b>Netlify</b></li>
                  <li>Оберіть свій сайт → <b>Site configuration</b></li>
                  <li><b>Environment variables</b> → <b>Add a variable</b></li>
                  <li>Додайте <b>VITE_SUPABASE_URL</b> та його значення</li>
                  <li>Додайте <b>VITE_SUPABASE_ANON_KEY</b> та його значення</li>
                  <li>Додайте <b>GEMINI_API_KEY</b> для авто-генерації блогу</li>
                  <li>Перезапустіть деплой (Deploys → Trigger deploy)</li>
                </ol>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-8 rounded-[32px]">
                <div className="flex items-center space-x-3 mb-4 text-gray-600 dark:text-gray-400">
                  <RotateCw size={24} />
                  <h4 className="font-bold">Після виправлення</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Коли ви внесете зміни в базу або налаштування на Netlify:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 list-disc ml-4 space-y-2">
                  <li>Обов'язково оновіть сторінку в браузері</li>
                  <li>Використовуйте кнопку "Оновити" для перевірки з'єднання</li>
                  <li>Якщо помилки залишаються, перевірте чи немає зайвих пробілів у секретах</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* Global Progress Overlay */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-[40px] p-8 md:p-12 text-center max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-100 dark:text-gray-700"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray="364"
                    animate={{ strokeDashoffset: 364 - (importProgress / 100) * 364 }}
                    className="text-blue-600"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">{importProgress}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Триває обробка...</h3>
                
                {importStats.total > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between text-sm font-bold mb-1">
                      <span className="text-gray-500">Додано товарів:</span>
                      <span className="text-blue-600">{importStats.current} з {importStats.total}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-1">
                      {importStatus || 'Завантаження даних у систему...'}
                    </p>
                  </div>
                )}

                {deleteProgressStats.total > 0 && (
                  <p className="text-blue-600 font-bold bg-blue-50 dark:bg-blue-900/20 py-2 rounded-xl">
                    Видалено {deleteProgressStats.current} з {deleteProgressStats.total}
                  </p>
                )}

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Будь ласка, не закривайте сторінку.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-600"
                    animate={{ width: `${importProgress}%` }}
                  />
                </div>
                
                <button 
                  onClick={() => {
                    setShouldStopImport(true);
                    stopImportRef.current = true;
                    setShouldStopDeletion(true);
                    (window as any)._stopDeletionFlag = true;
                    setTimeout(() => {
                      setIsImporting(false);
                      setImportStatus('Зупинено');
                    }, 500);
                  }}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all text-sm"
                >
                  Зупинити процес
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
