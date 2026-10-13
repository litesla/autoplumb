import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Link as LinkIcon, Sparkles, X, Check, Search, Trash2, ImagePlus, ExternalLink, RefreshCw } from 'lucide-react';
import { Product } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';
import { getCuratedFallback, getSanitizedProductImage } from '../services/productImageService';
import { getFirstImage, splitImages, processAndConvertImageUrls } from '../pages/AdminPage';

interface QuickPhotoModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
}

// Preset catalog photos for instant 1-tap replacement on phones
const QUICK_PRESETS: Record<string, { label: string; url: string }[]> = {
  auto: [
    { label: 'Акумулятор 60Ah', url: '/images/car_battery_clean.jpg' },
    { label: 'Тяга МТЗ посилена', url: '/images/tractor_hitch_clean.jpg' },
    { label: 'Гальмівні колодки', url: '/images/disc_brake_pads_clean.jpg' },
    { label: 'Гальмівні накладки', url: '/images/brake_linings_clean.jpg' },
    { label: 'Гальмівні колодки барабанні', url: '/images/brake_shoes_clean.jpg' },
    { label: 'Супорт гальмівний', url: '/images/brake_caliper_clean.jpg' },
    { label: 'Олива моторна 5W-40', url: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&q=80&w=600' },
    { label: 'Фільтр масляний', url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=600' },
  ],
  plumbing: [
    { label: 'Змішувач кухні гнучкий', url: '/images/plumbing_faucet_clean.jpg' },
    { label: 'Змішувач ванної хром', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600' },
    { label: 'Радіатор опалення', url: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?auto=format&fit=crop&q=80&w=600' },
    { label: 'Труба та фітинги', url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80&w=600' },
    { label: 'Кульовий кран латунний', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600' },
    { label: 'Водонагрівач бойлер', url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=600' },
  ]
};

export const QuickPhotoModal: React.FC<QuickPhotoModalProps> = ({ product, onClose, onSuccess }) => {
  if (!product) return null;

  const [activeTab, setActiveTab] = useState<'camera' | 'url' | 'presets'>('camera');
  const [currentImageStr, setCurrentImageStr] = useState<string>(product.image || '');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const imagesList = splitImages(currentImageStr);
  const mainImage = getFirstImage(currentImageStr);

  // Compress image to fast web format (JPEG 800px max, 0.75 quality)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
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
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve((e.target?.result as string) || '');
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>, mode: 'replace' | 'add' = 'replace') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedB64 = await compressImage(file);
      if (compressedB64) {
        if (mode === 'replace') {
          setCurrentImageStr(compressedB64);
        } else {
          const updated = [...imagesList, compressedB64].join(', ');
          setCurrentImageStr(updated);
        }
      }
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    const clean = processAndConvertImageUrls(urlInput.trim());
    setCurrentImageStr(clean);
    setUrlInput('');
  };

  const handleApplyCuratedFallback = () => {
    const fallback = getCuratedFallback(product.name, product.type, product.category, product.id);
    if (fallback) {
      setCurrentImageStr(fallback);
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setCurrentImageStr(presetUrl);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updated = imagesList.filter((_, idx) => idx !== indexToRemove);
    setCurrentImageStr(updated.join(', '));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanValue = processAndConvertImageUrls(currentImageStr);
      
      const { error } = await supabase
        .from('products')
        .update({ image: cleanValue })
        .eq('id', product.id);

      if (error) {
        console.error('Error updating image in Supabase:', error);
        alert('Помилка оновлення фото в базі даних: ' + error.message);
        return;
      }

      const updatedProduct: Product = {
        ...product,
        image: cleanValue
      };

      setSuccessToast('Фото успішно оновлено!');
      onSuccess(updatedProduct);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Не вдалося зберегти фото.');
    } finally {
      setIsSaving(false);
    }
  };

  const relevantPresets = QUICK_PRESETS[product.type === 'plumbing' ? 'plumbing' : 'auto'] || QUICK_PRESETS.auto;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal / Mobile Sheet */}
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] z-10"
      >
        {/* Header with drag indicator for mobile */}
        <div className="pt-3 pb-2 px-5 border-b border-gray-100 dark:border-zinc-800 shrink-0">
          <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-2 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Camera size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">Швидка зміна фото</h3>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium line-clamp-1">
                  {product.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Live Preview Card */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-3 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3">
            <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 shrink-0 flex items-center justify-center relative">
              {isCompressing ? (
                <div className="flex flex-col items-center justify-center text-blue-600">
                  <RefreshCw size={20} className="animate-spin" />
                  <span className="text-[9px] font-bold mt-1">Очищення...</span>
                </div>
              ) : mainImage ? (
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain p-1"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=Недійсне+фото';
                  }}
                />
              ) : (
                <div className="text-gray-400 flex flex-col items-center">
                  <Camera size={22} className="opacity-40" />
                  <span className="text-[9px] font-bold">Без фото</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                  product.type === 'auto' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300'
                }`}>
                  {product.type === 'auto' ? 'Авто / МТЗ' : 'Сантехніка'}
                </span>
                {product.article && (
                  <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                    Арт: {product.article}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-semibold">{product.price} грн</p>
            </div>
          </div>

          {/* Secondary Thumbnail gallery if product has multiple images */}
          {imagesList.length > 1 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-gray-500 dark:text-zinc-400">Всі фотографії товару ({imagesList.length}):</div>
              <div className="flex flex-wrap gap-2">
                {imagesList.map((img, idx) => (
                  <div key={idx} className="relative group w-12 h-12 rounded-lg bg-gray-100 dark:bg-zinc-800 overflow-hidden border border-gray-200 dark:border-zinc-700 shrink-0">
                    <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-0.5 right-0.5 p-1 bg-red-600/90 text-white rounded-md text-[9px] hover:bg-red-700"
                      title="Видалити це фото"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs for Quick Photo Input */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
              }`}
            >
              <Camera size={14} />
              <span>Камера / Файл</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
              }`}
            >
              <LinkIcon size={14} />
              <span>Посилання URL</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
              }`}
            >
              <Sparkles size={14} />
              <span>Шаблони</span>
            </button>
          </div>

          {/* TAB 1: Mobile Camera / File upload */}
          {activeTab === 'camera' && (
            <div className="space-y-2.5">
              {/* Native Mobile Camera Button (capture="environment") */}
              <label className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer">
                <Camera size={18} strokeWidth={2.2} />
                <span>Зняти на камеру смартфона</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileSelected(e, 'replace')}
                  className="hidden"
                />
              </label>

              {/* Gallery / File Picker */}
              <label className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-white dark:bg-zinc-800 border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-blue-500 text-gray-700 dark:text-zinc-200 rounded-xl font-bold text-xs sm:text-sm active:scale-[0.98] transition-all cursor-pointer">
                <Upload size={16} />
                <span>Вибрати з галереї або файлів</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelected(e, 'replace')}
                  className="hidden"
                />
              </label>

              {/* Quick Google Search helper button */}
              <a
                href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${product.name} ${product.article || ''}`.trim())}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors"
              >
                <Search size={14} />
                <span>Знайти якісне фото в Google Картинках</span>
                <ExternalLink size={12} className="opacity-70" />
              </a>
            </div>
          )}

          {/* TAB 2: Direct URL Input */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">Пряме посилання на зображення (URL):</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                  >
                    Застосувати
                  </button>
                </div>
              </div>

              {/* Clipboard paste helper */}
              {navigator.clipboard && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text && (text.startsWith('http') || text.startsWith('data:'))) {
                        setUrlInput(text);
                      }
                    } catch (e) {}
                  }}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <LinkIcon size={12} />
                  <span>Вставити з буфера обміну</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 3: Category Presets & Auto-Match */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              {/* 1-Tap Auto Smart Match */}
              <button
                type="button"
                onClick={handleApplyCuratedFallback}
                className="w-full py-2.5 px-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Автоматично підібрати фото з нашого каталогу</span>
              </button>

              <div className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Популярні чисті фото:
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {relevantPresets.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-zinc-800 text-left transition-all active:scale-95"
                  >
                    <img src={preset.url} className="w-10 h-10 object-contain rounded-lg bg-gray-50 dark:bg-zinc-900 shrink-0" referrerPolicy="no-referrer" />
                    <span className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 line-clamp-2 leading-tight">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer with Instant Save Button */}
        <div className="p-4 bg-gray-50 dark:bg-zinc-800/80 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Скасувати
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isCompressing}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Збереження в базу...</span>
              </>
            ) : successToast ? (
              <>
                <Check size={16} />
                <span>{successToast}</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Зберегти нове фото</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
