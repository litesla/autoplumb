import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Search,
  ExternalLink,
  Wand2,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  Check,
  Eye,
  Layers,
  Copy,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  auditProductPhoto,
  ProductPhotoAuditResult,
  buildGoogleSearchUrl,
  CLEAN_PRODUCT_IMAGES,
} from '../services/aiPhotoAudit';
import { Product } from '../lib/utils';

interface AdminAiPhotoStudioProps {
  products: Product[];
  onProductUpdated: (updatedProduct: Product) => void;
  onBatchUpdated?: () => void;
}

export const AdminAiPhotoStudio: React.FC<AdminAiPhotoStudioProps> = ({
  products,
  onProductUpdated,
  onBatchUpdated,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all_issues' | 'duplicate' | 'watermark' | 'offtopic' | 'missing' | 'good'>('all_issues');
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<Record<string, any>>({});
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [editingImageProductId, setEditingImageProductId] = useState<string | null>(null);
  const [customImageUrlInput, setCustomImageUrlInput] = useState('');
  const [previewModalItem, setPreviewModalItem] = useState<ProductPhotoAuditResult | null>(null);
  const [previewProposedUrl, setPreviewProposedUrl] = useState<string>('');
  const [approvedSet, setApprovedSet] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('autoplumb_approved_photos');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Calculate frequency of each image URL across all products to detect duplicates
  const urlFrequencyMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const url = (p.image || (p as any).image_url || '').trim();
      if (url) {
        map.set(url, (map.get(url) || 0) + 1);
      }
    });
    return map;
  }, [products]);

  // Run audit on all products
  const auditedProducts = useMemo(() => {
    return products.map((p) => {
      return auditProductPhoto(
        {
          id: String(p.id),
          name: p.name,
          category: p.category,
          brand: p.brand,
          article: p.article,
          type: p.type as any,
          image_url: p.image || (p as any).image_url,
          specs: (p as any).specs,
        },
        urlFrequencyMap,
        approvedSet
      );
    });
  }, [products, urlFrequencyMap, approvedSet]);

  // Counts by category
  const stats = useMemo(() => {
    let duplicate = 0;
    let watermark = 0;
    let offtopic = 0;
    let missing = 0;
    let good = 0;

    auditedProducts.forEach((item) => {
      switch (item.issue.type) {
        case 'duplicate':
          duplicate++;
          break;
        case 'watermark':
          watermark++;
          break;
        case 'offtopic':
          offtopic++;
          break;
        case 'missing':
          missing++;
          break;
        case 'good':
          good++;
          break;
      }
    });

    return {
      total: auditedProducts.length,
      allIssues: duplicate + watermark + offtopic + missing,
      duplicate,
      watermark,
      offtopic,
      missing,
      good,
    };
  }, [auditedProducts]);

  // Filtered view
  const filteredProducts = useMemo(() => {
    return auditedProducts.filter((item) => {
      // Filter by type
      if (selectedFilter === 'all_issues') {
        if (item.issue.type === 'good') return false;
      } else if (selectedFilter !== item.issue.type) {
        return false;
      }

      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesArticle = item.article.toLowerCase().includes(query);
        const matchesCategory = item.category.toLowerCase().includes(query);
        return matchesName || matchesArticle || matchesCategory;
      }

      return true;
    });
  }, [auditedProducts, selectedFilter, searchTerm]);

  // Save approved status to localStorage and database
  const handleApprovePhoto = async (id: string, currentUrl: string) => {
    const nextSet = new Set(approvedSet);
    nextSet.add(id);
    setApprovedSet(nextSet);
    try {
      localStorage.setItem('autoplumb_approved_photos', JSON.stringify(Array.from(nextSet)));
      await fetch('/api/ai/photos/update-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, imageUrl: currentUrl, markApproved: true }),
      });
      // update in local state
      const targetProd = products.find((p) => p.id === id);
      if (targetProd) {
        onProductUpdated({ ...targetProd, image: currentUrl });
      }
    } catch (e) {
      console.error('Failed to approve photo:', e);
    }
  };

  // Run AI analysis on specific product
  const handleAnalyzeWithAI = async (item: ProductPhotoAuditResult) => {
    setAnalyzingId(item.id);
    try {
      const res = await fetch('/api/ai/photos/analyze-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          category: item.category,
          brand: item.brand,
          article: item.article,
          type: item.type,
          currentImageUrl: item.currentImageUrl,
        }),
      });

      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setAiAnalysisResults((prev) => ({
        ...prev,
        [item.id]: data,
      }));
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Apply new photo to single product
  const handleApplyNewPhoto = async (id: string, newUrl: string) => {
    if (!newUrl) return;
    try {
      const res = await fetch('/api/ai/photos/update-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, imageUrl: newUrl, markApproved: true }),
      });
      if (res.ok) {
        const targetProd = products.find((p) => p.id === id);
        if (targetProd) {
          onProductUpdated({ ...targetProd, image: newUrl });
        }
        // Also mark as approved
        const nextSet = new Set(approvedSet);
        nextSet.add(id);
        setApprovedSet(nextSet);
        localStorage.setItem('autoplumb_approved_photos', JSON.stringify(Array.from(nextSet)));
      }
    } catch (e) {
      console.error('Failed to apply image:', e);
    }
  };

  // Batch Replace Selected Items with Suggested Clean Category Images
  const handleBatchFixSelected = async () => {
    if (selectedProductIds.length === 0) return;
    setIsApplyingBatch(true);
    setBatchProgress(0);

    try {
      const updates: Array<{ id: string; imageUrl: string }> = [];

      for (const id of selectedProductIds) {
        const item = auditedProducts.find((p) => p.id === id);
        if (item && item.suggestedImageUrl) {
          updates.push({ id: item.id, imageUrl: item.suggestedImageUrl });
        }
      }

      if (updates.length > 0) {
        await fetch('/api/ai/photos/batch-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });

        // Update local state
        updates.forEach((u) => {
          const targetProd = products.find((p) => p.id === u.id);
          if (targetProd) {
            onProductUpdated({ ...targetProd, image: u.imageUrl });
          }
        });

        if (onBatchUpdated) onBatchUpdated();
      }

      setSelectedProductIds([]);
    } catch (err) {
      console.error('Batch fix error:', err);
    } finally {
      setIsApplyingBatch(false);
      setBatchProgress(100);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-15 pointer-events-none">
          <Wand2 size={240} />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-blue-250">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>AI Автоматизація та Аудит Зображень</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Очищення та Покращення Фотографій Товарів
          </h2>
          <p className="text-sm sm:text-base text-blue-100 font-medium leading-relaxed">
            Система автоматично виявляє повторювані однакові зображення, водяні знаки маркетплейсів
            (prom.ua, olx тощо), фотографії цілих авто замість конкретних деталей та товари без фото.
            Ви можете в 1 клік підібрати або замінити їх на чисті студійні зображення.
          </p>
        </div>
      </div>

      {/* Diagnostics Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setSelectedFilter('all_issues')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'all_issues'
              ? 'bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Всі проблеми</span>
            <AlertTriangle size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.allIssues}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Потребують уваги</div>
        </button>

        <button
          onClick={() => setSelectedFilter('duplicate')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'duplicate'
              ? 'bg-orange-500/10 border-orange-500 shadow-md ring-2 ring-orange-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Повторювані</span>
            <Copy size={14} className="text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1">{stats.duplicate}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Однакові фото у різних</div>
        </button>

        <button
          onClick={() => setSelectedFilter('watermark')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'watermark'
              ? 'bg-yellow-500/10 border-yellow-500 shadow-md ring-2 ring-yellow-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-yellow-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Водяні знаки</span>
            <ShieldCheck size={14} className="text-yellow-500" />
          </div>
          <div className="text-2xl font-black text-yellow-600 mt-1">{stats.watermark}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Prom / OLX / Логотипи</div>
        </button>

        <button
          onClick={() => setSelectedFilter('offtopic')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'offtopic'
              ? 'bg-blue-500/10 border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Не по темі</span>
            <SlidersHorizontal size={14} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats.offtopic}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Авто замість деталі</div>
        </button>

        <button
          onClick={() => setSelectedFilter('missing')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'missing'
              ? 'bg-rose-500/10 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-rose-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Без фото</span>
            <ImageIcon size={14} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.missing}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Порожні картки</div>
        </button>

        <button
          onClick={() => setSelectedFilter('good')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            selectedFilter === 'good'
              ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
          }`}
        >
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>Якісні (ОК)</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.good}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-0.5">Чисті / Затверджені</div>
        </button>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Пошук за назвою деталі, категорією або артикулом..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                <CheckSquare size={14} className="text-blue-600" />
              ) : (
                <Square size={14} />
              )}
              <span>Вибрати всі ({filteredProducts.length})</span>
            </button>

            {selectedProductIds.length > 0 && (
              <button
                onClick={handleBatchFixSelected}
                disabled={isApplyingBatch}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Wand2 size={14} className={isApplyingBatch ? 'animate-spin' : ''} />
                <span>Замінити вибрані ({selectedProductIds.length}) на чисті фото</span>
              </button>
            )}
          </div>
        </div>

        {/* Informative notice */}
        <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
            <span>
              <b>Якісні фото залишаються незмінними:</b> автоматичні зміни застосовуються лише до
              вибраних вами проблемних карток. Якщо фото хороше, натисніть "Затвердити", щоб захистити його.
            </span>
          </div>
          <span className="font-bold text-gray-700 dark:text-gray-300 shrink-0">
            Знайдено: {filteredProducts.length} товарів
          </span>
        </div>
      </div>

      {/* Products Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.slice(0, 40).map((item) => {
          const isSelected = selectedProductIds.includes(item.id);
          const aiResult = aiAnalysisResults[item.id];
          const isCurrentAnalyzing = analyzingId === item.id;

          return (
            <motion.div
              key={item.id}
              layout
              className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 sm:p-5 shadow-sm transition-all relative ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                  : item.issue.type === 'good'
                  ? 'border-emerald-200 dark:border-emerald-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Select Checkbox */}
                <button
                  onClick={() => toggleSelectItem(item.id)}
                  className="mt-1 text-gray-400 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-blue-600" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>

                {/* Photo Preview & Issue Badge */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shrink-0 group">
                  {item.currentImageUrl ? (
                    <img
                      src={item.currentImageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        // Fallback on load failure
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                      <ImageIcon size={24} />
                      <span className="text-[9px] font-bold mt-1">Немає фото</span>
                    </div>
                  )}

                  {/* Status Overlay Badge */}
                  <div className="absolute top-1.5 left-1.5 right-1.5">
                    {item.issue.type === 'duplicate' && (
                      <span className="bg-orange-600/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <Copy size={9} /> {item.duplicateCount}x дубль
                      </span>
                    )}
                    {item.issue.type === 'watermark' && (
                      <span className="bg-yellow-600/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <AlertTriangle size={9} /> Водяний знак
                      </span>
                    )}
                    {item.issue.type === 'offtopic' && (
                      <span className="bg-blue-600/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <SlidersHorizontal size={9} /> Не по темі
                      </span>
                    )}
                    {item.issue.type === 'missing' && (
                      <span className="bg-rose-600/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <ImageIcon size={9} /> Без фото
                      </span>
                    )}
                    {item.issue.type === 'good' && (
                      <span className="bg-emerald-600/95 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <Check size={9} /> Схвалено
                      </span>
                    )}
                  </div>
                </div>

                {/* Product Meta */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap text-[10px]">
                    <span className="font-bold text-gray-400 uppercase tracking-wider">
                      {item.type === 'plumbing' ? 'Сантехніка' : 'Авто'}
                    </span>
                    {item.article && (
                      <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono font-bold">
                        {item.article}
                      </span>
                    )}
                    {item.brand && (
                      <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">
                        {item.brand}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                    {item.name}
                  </h3>

                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-600 dark:text-gray-300">Діагноз: </span>
                    <span className="font-medium">{item.issue.description}</span>
                  </div>

                  {/* AI Analyzed details box if available */}
                  {aiResult && (
                    <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 p-2.5 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-300">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Деталь: <b>{aiResult.physicalItem}</b></span>
                      </div>
                      <p className="text-[11px] text-purple-800 dark:text-purple-300 font-medium">
                        {aiResult.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {/* Google Images clean link */}
                    <a
                      href={aiResult?.googleSearchUrl || item.googleSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="Відкрити Google Картинки з фільтром на прозорий / білий фон"
                    >
                      <ExternalLink size={12} className="text-blue-500" />
                      <span>Знайти в Google</span>
                    </a>

                    {/* AI Deep Analysis Button */}
                    <button
                      onClick={() => handleAnalyzeWithAI(item)}
                      disabled={isCurrentAnalyzing}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Sparkles size={12} className={isCurrentAnalyzing ? 'animate-spin text-purple-600' : 'text-amber-500'} />
                      <span>{isCurrentAnalyzing ? 'Аналіз...' : 'AI Аналіз'}</span>
                    </button>

                    {/* Quick Replace with Clean Stock Category Image if available */}
                    {item.suggestedImageUrl && item.suggestedImageUrl !== item.currentImageUrl && (
                      <button
                        onClick={() => handleApplyNewPhoto(item.id, item.suggestedImageUrl!)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Wand2 size={12} className="text-emerald-600" />
                        <span>Встановити чисте фото</span>
                      </button>
                    )}

                    {/* Approve as Good Quality */}
                    {item.issue.type !== 'good' && (
                      <button
                        onClick={() => handleApprovePhoto(item.id, item.currentImageUrl)}
                        className="px-2.5 py-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 border border-gray-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Позначити це фото як якісне, щоб не замінювати його"
                      >
                        <Check size={12} className="text-emerald-600" />
                        <span>Затвердити (ОК)</span>
                      </button>
                    )}

                    {/* Manual URL input toggle */}
                    <button
                      onClick={() => {
                        setEditingImageProductId(editingImageProductId === item.id ? null : item.id);
                        setCustomImageUrlInput('');
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold px-2 py-1 hover:underline cursor-pointer"
                    >
                      Вставити URL
                    </button>
                  </div>

                  {/* Inline Manual URL Input */}
                  {editingImageProductId === item.id && (
                    <div className="pt-2 flex items-center gap-2 animate-slide-in">
                      <input
                        type="url"
                        placeholder="Вставте пряме посилання на фотографію (https://...)"
                        value={customImageUrlInput}
                        onChange={(e) => setCustomImageUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        onClick={() => {
                          if (customImageUrlInput) {
                            handleApplyNewPhoto(item.id, customImageUrlInput);
                            setEditingImageProductId(null);
                          }
                        }}
                        disabled={!customImageUrlInput}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                      >
                        Зберегти
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-3xl border border-gray-200 dark:border-gray-700 space-y-3">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <h3 className="text-lg font-black text-gray-900 dark:text-white">
            У цій категорії не виявлено проблемних фото!
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Усі відфільтровані товари мають унікальні, чисті та перевірені зображення.
          </p>
        </div>
      )}
    </div>
  );
};
