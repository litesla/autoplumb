import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, Settings, Plus, Trash2, Edit, Upload, AlertTriangle, X, Download, CheckSquare, Square, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { Product, Order } from '../lib/utils';
import { BlogPost } from './BlogPage';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, getDoc, setDoc, serverTimestamp, writeBatch, limit, getCountFromServer, where, getDocs } from 'firebase/firestore';
import { getColumnMapping, ColumnMapping } from '../services/geminiService';

export const AdminPage: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'content' | 'settings' | 'blog'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [visibleProductsCount, setVisibleProductsCount] = useState(50);
  const [orders, setOrders] = useState<Order[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isConfirmingDeleteAll, setIsConfirmingDeleteAll] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<(string | number)[]>([]);
  const [heroContent, setHeroContent] = useState<any>(null);
  const [isSyncingUTR, setIsSyncingUTR] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [deleteProgressStats, setDeleteProgressStats] = useState({ current: 0, total: 0 });
  const [shouldStopDeletion, setShouldStopDeletion] = useState(false);
  const [isAiMapping, setIsAiMapping] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any[] | null>(null);
  const [detectedMapping, setDetectedMapping] = useState<ColumnMapping | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: '',
    description: '',
    image: '',
    stock: 1,
    type: 'auto' as 'auto' | 'plumbing'
  });
  const [newPost, setNewPost] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: 'Адміністратор',
    category: 'Поради',
    image: '',
    readTime: '5 хв'
  });

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

  useEffect(() => {
    if (isAdmin) {
      const productsPath = 'products';
      
      // Get total count efficiently
      getCountFromServer(collection(db, productsPath)).then(snapshot => {
        setTotalProductsCount(snapshot.data().count);
      });

      // Optimized real-time listener for products (defaults to 100 recent)
      let productQuery;
      if (productSearch) {
        // Simple search by article or prefix if possible? 
        // Firestore doesn't support easy case-insensitive substring search without third party.
        // We'll stick to a slightly larger limit but non-real-time search or just keep it simple.
        productQuery = query(collection(db, productsPath), limit(1000));
      } else {
        productQuery = query(collection(db, productsPath), orderBy('created_at', 'desc'), limit(100));
      }

      const unsubProducts = onSnapshot(productQuery, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
        setProducts(productsData);
        
        // Seed initial data if empty (only check if count was 0)
        if (productsData.length === 0 && totalProductsCount === 0) {
          // Double check with actual count to be sure
          getCountFromServer(collection(db, productsPath)).then(snap => {
            if (snap.data().count === 0) seedInitialData();
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, productsPath);
      });

      const ordersPath = 'orders';
      const unsubOrders = onSnapshot(query(collection(db, ordersPath), orderBy('created_at', 'desc')), (snapshot) => {
        setOrders(snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
            created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString()
          };
        }) as Order[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, ordersPath);
      });

      const blogPath = 'blog';
      const unsubBlog = onSnapshot(query(collection(db, blogPath), orderBy('createdAt', 'desc')), (snapshot) => {
        setBlogPosts(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        })) as BlogPost[]);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, blogPath);
      });

      fetchSettings();
      fetchHeroContent();

      return () => {
        unsubProducts();
        unsubOrders();
        unsubBlog();
      };
    }
  }, [isAdmin]);

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

    for (const product of initialProducts) {
      await addDoc(collection(db, 'products'), {
        ...product,
        created_at: serverTimestamp()
      });
    }
  };

  const seedBlogPosts = async () => {
    const initialPosts = [
      {
        title: 'Як вибрати акумулятор для авто: Повний гід',
        excerpt: 'Вибір акумулятора — відповідальний крок. Ми розповімо, на що звернути увагу, щоб ваше авто заводилося в будь-який мороз.',
        content: `## Як вибрати акумулятор для вашого автомобіля

Вибір правильного акумулятора має вирішальне значення для надійної роботи вашого автомобіля. Ось основні фактори, які слід враховувати:

### 1. Ємність (Ah)
Це показник того, скільки енергії може зберігати акумулятор. Перевірте посібник користувача вашого авто, щоб дізнатися рекомендовану ємність.

### 2. Пусковий струм (A)
Це здатність акумулятора запускати двигун при низьких температурах. Чим вищий цей показник, тим легше буде завести авто взимку.

### 3. Розміри та полярність
Переконайтеся, що новий акумулятор підходить за розміром до посадкового місця і має правильне розташування клем (пряма або зворотна полярність).

### 4. Бренд та гарантія
Обирайте перевірені бренди, такі як Bosch, Varta або Exide. Вони пропонують кращу надійність та тривалу гарантію.

**Порада від експерта:** Завжди перевіряйте дату виготовлення. Акумулятор, який простояв на складі більше року, може втратити частину своєї ємності.`,
        author: 'Олександр Експерт',
        category: 'Поради',
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800',
        readTime: '5 хв'
      },
      {
        title: 'Топ-5 помилок при виборі змішувача для кухні',
        excerpt: 'Змішувач — це не тільки дизайн, а й функціональність. Уникайте цих помилок, щоб ваша кухня була зручною та стильною.',
        content: `## Вибір змішувача для кухні: Чого не варто робити

Кухня — це серце дому, а змішувач — один із найбільш використовуваних інструментів. Ось 5 поширених помилок при його виборі:

1. **Невідповідність розміру мийки:** Занадто високий змішувач може створювати бризки, а занадто низький — заважати мити великі каструлі.
2. **Ігнорування матеріалу:** Дешеві силумінові змішувачі швидко виходять з ладу. Обирайте латунь або нержавіючу сталь.
3. **Неправильний тип кріплення:** Переконайтеся, що змішувач підходить до отвору у вашій мийці або стільниці.
4. **Забуваєте про функціональність:** Висувний вилив значно полегшує миття овочів та самої мийки.
5. **Економія на бренді:** Відомі виробники (Grohe, Hansgrohe) гарантують наявність запчастин навіть через 10 років.

Обирайте розумно, і ваша сантехніка служитиме вам роками!`,
        author: 'Марія Дизайнер',
        category: 'Сантехніка',
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
        readTime: '4 хв'
      }
    ];

    for (const post of initialPosts) {
      await addDoc(collection(db, 'blog'), {
        ...post,
        createdAt: serverTimestamp()
      });
    }
    alert('Блог успішно заповнено!');
  };

  const fetchHeroContent = async () => {
    const path = 'content/hero';
    try {
      const docRef = doc(db, 'content', 'hero');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setHeroContent(docSnap.data());
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const handleSaveHeroContent = async () => {
    const path = 'content/hero';
    try {
      await setDoc(doc(db, 'content', 'hero'), heroContent);
      alert('Контент Hero збережено!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const fetchSettings = async () => {
    const path = 'content/settings';
    try {
      const docRef = doc(db, 'content', 'settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          ...prev,
          ...data
        }));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Auto-save toggle to Firestore
    const path = 'content/settings';
    try {
      await setDoc(doc(db, 'content', 'settings'), newSettings);
      console.log(`Setting ${key} updated to ${value}`);
    } catch (err) {
      console.error(`Error saving toggle ${key}:`, err);
    }
  };

  const handleSaveSettings = async () => {
    const path = 'content/settings';
    try {
      await setDoc(doc(db, 'content', 'settings'), settings);
      alert('Налаштування збережено!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Ви впевнені, що хочете видалити ${selectedProducts.length} товарів?`)) return;

    try {
      await Promise.all(selectedProducts.map(id => 
        deleteDoc(doc(db, 'products', id.toString()))
      ));
      setSelectedProducts([]);
      alert('Товари успішно видалені');
    } catch (err) {
      alert('Помилка при масовому видаленні');
    }
  };

  const handleDeleteAllProducts = async () => {
    console.log('Started handleDeleteAllProducts');
    setIsConfirmingDeleteAll(false);
    setIsImporting(true);
    setImportProgress(0);
    setShouldStopDeletion(false);
    
    let totalDeleted = 0;
    let startTotal = 0;
    
    try {
      // 1. Refresh total count before starting
      const totalSnap = await getCountFromServer(collection(db, 'products'));
      startTotal = totalSnap.data().count;
      setTotalProductsCount(startTotal);
      setDeleteProgressStats({ current: 0, total: startTotal });
      
      if (startTotal === 0) {
        alert('База даних уже порожня.');
        setIsImporting(false);
        return;
      }

      console.log(`Attempting to delete ${startTotal} products...`);

      let hasMore = true;
      const batchLimit = 250; // Further lowered for maximum stability
      
      while (hasMore) {
        // Check if user clicked STOP
        if ((window as any)._stopDeletionFlag) {
          console.log('Deletion stopped by user');
          break;
        }

        // Query next batch
        const q = query(collection(db, 'products'), limit(batchLimit));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log('No more products to delete');
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => {
          batch.delete(d.ref);
        });
        
        await batch.commit();
        totalDeleted += snapshot.size;
        
        // Update progress
        const progress = Math.min(100, Math.round((totalDeleted / (startTotal || totalDeleted)) * 100));
        setImportProgress(progress);
        setDeleteProgressStats({ current: totalDeleted, total: startTotal });
        
        console.log(`Deleted ${totalDeleted} of ~${startTotal}`);

        // Give breathing room
        await new Promise(resolve => setTimeout(resolve, 400));
        
        if (snapshot.size < batchLimit) {
          hasMore = false;
        }
      }
      
      if ((window as any)._stopDeletionFlag) {
        alert(`Видалення зупинено користувачем. Видалено ${totalDeleted} товарів.`);
      } else {
        alert(`Операцію успішно завершено! Видалено ${totalDeleted} товарів.`);
      }
      setTotalProductsCount(0);
    } catch (err: any) {
      console.error('CRITICAL: Delete all error:', err);
      const errStr = err?.message || err?.toString() || '';
      const isQuotaError = errStr.includes('Quota exceeded') || errStr.includes('resource-exhausted') || errStr.includes('quota-exceeded');
      
      let friendlyError = '';
      if (isQuotaError) {
        friendlyError = `ВИЧЕРПАНО ЛІМІТ: Ви використали добову квоту безкоштовних операцій Google Firestore (20,000 записів). \n\nВдалося видалити ${totalDeleted} товарів. Решта товарів буде доступна для видалення ЗАВТРА, коли Google оновить ваш безкоштовний ліміт.`;
        // Set a global flag for the session to show a persistent warning if needed
        try { sessionStorage.setItem('firestore_quota_exhausted', 'true'); } catch(e) {}
      } else if (errStr.includes('offline') || errStr.includes('network')) {
        friendlyError = `Проблема з мережею. Процес зупинився на ${totalDeleted} товарі. Перевірте інтернет та спробуйте ще раз.`;
      } else {
        friendlyError = `Помилка при видаленні: ${errStr}. Вдалося видалити ${totalDeleted} товарів.`;
      }
      
      alert(friendlyError);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setDeleteProgressStats({ current: 0, total: 0 });
      (window as any)._stopDeletionFlag = false;
      try {
        const finalSnap = await getCountFromServer(collection(db, 'products'));
        setTotalProductsCount(finalSnap.data().count);
      } catch (e) {}
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
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        stock: Number(newProduct.stock) || 1,
        created_at: serverTimestamp()
      });
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, category: '', description: '', image: '', stock: 1, type: 'auto' });
      alert('Товар успішно додано!');
    } catch (err) {
      alert('Помилка при додаванні товару');
    }
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await deleteDoc(doc(db, 'products', productToDelete.id.toString()));
        setProductToDelete(null);
      } catch (err) {
        console.error('Delete product error:', err);
        handleFirestoreError(err, OperationType.DELETE, `products/${productToDelete.id}`);
        alert('Помилка при видаленні товару');
      }
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const { id, ...data } = editingProduct;
    await updateDoc(doc(db, 'products', id.toString()), data);
    setEditingProduct(null);
  };

  const handleUpdateOrderStatus = async (id: string | number, status: string) => {
    await updateDoc(doc(db, 'orders', id.toString()), { status });
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'blog'), {
        ...newPost,
        createdAt: serverTimestamp()
      });
      setIsAddingPost(false);
      setNewPost({ title: '', excerpt: '', content: '', author: 'Адміністратор', category: 'Поради', image: '', readTime: '5 хв' });
      alert('Статтю успішно додано!');
    } catch (err) {
      alert('Помилка при додаванні статті');
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    const { id, ...data } = editingPost;
    await updateDoc(doc(db, 'blog', id.toString()), data);
    setEditingPost(null);
  };

  const handleDeletePost = async (id: string) => {
    if (confirm('Ви впевнені, що хочете видалити цю статтю?')) {
      await deleteDoc(doc(db, 'blog', id));
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

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) throw new Error('Не вдалося прочитати файл');

        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        console.log('Available sheets:', workbook.SheetNames);
        
        // Use the first sheet by default
        const targetSheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[targetSheetName];
        
        // Convert to JSON with raw headers to see what's actually there
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
        console.log('Raw rows (first 10):', rawData.slice(0, 10));

        // Find the header row index (row with multiple columns with text)
        let headerRowIndex = -1;
        let maxColumnsWithText = 0;
        
        for (let i = 0; i < Math.min(rawData.length, 30); i++) {
          const row = rawData[i];
          const textColumnCount = row.filter(cell => cell && cell.toString().trim().length > 1).length;
          
          // Check for "назва" or "товар" as a strong hint
          const rowText = row.join(' ').toLowerCase();
          const hasNameHint = rowText.includes('назва') || rowText.includes('товар') || rowText.includes('наименование');
          
          if (textColumnCount >= 3 && (textColumnCount > maxColumnsWithText || hasNameHint)) {
            maxColumnsWithText = textColumnCount;
            headerRowIndex = i;
            if (hasNameHint) break; // Strong match
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 0; // Fallback
        }

        console.log('Found header at row:', headerRowIndex + 1);
        const allRows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: "" }) as any[];
        
        const getVal = (item: any, keys: string[]) => {
          if (!item) return undefined;
          const itemKeys = Object.keys(item);
          const foundKey = itemKeys.find(k => 
            keys.some(target => {
              const normalizedK = k.toString().toLowerCase().trim();
              const normalizedTarget = target.toLowerCase().trim();
              return normalizedK === normalizedTarget || normalizedK.includes(normalizedTarget);
            })
          );
          return foundKey ? item[foundKey] : undefined;
        };

        let currentCategory = "Загальне";
        const productsToImport: any[] = [];

        allRows.forEach((p) => {
          const nameRaw = getVal(p, ["Назва товару", "Повна назва товару", "Name", "Назва", "Наименование", "Title", "Товар", "name"]);
          const name = nameRaw?.toString().trim() || "";
          
          if (!name || name === "" || name.includes('Позицій:')) return;

          const priceRaw = getVal(p, ["Ціна продажу грн", "Ціна продажу, грн", "Price", "Ціна", "Цена", "Cost", "price", "Ціна (грн)"]);
          
          let cleanPrice = 0;
          if (typeof priceRaw === 'number') cleanPrice = priceRaw;
          else if (typeof priceRaw === 'string') {
            const sanitized = priceRaw.replace(/[₴$€\s]/g, '').replace(',', '.');
            cleanPrice = parseFloat(sanitized.replace(/[^0-9.]/g, ''));
          }

          // Recognition of Category Row (Image 2)
          // Look for markers like ▶, symbols, or rows with only name and no price
          const isCategoryMarker = name.startsWith('▶') || name.startsWith('►') || name.startsWith('•') || name.startsWith('⁃') || name.startsWith('>');
          
          // If it's a category marker OR has name but absolutely no price/article/brand info
          if (isCategoryMarker || (name && (isNaN(cleanPrice) || cleanPrice <= 0))) {
            const potentialCat = name.replace(/^[▶►•⁃>\s]+/, '').trim();
            // Basic sanity check: category name shouldn't be TOO long
            if (potentialCat.length > 2 && potentialCat.length < 100) {
              currentCategory = potentialCat;
              console.log('Sticky category changed to:', currentCategory);
              return; // Skip category row itself
            }
          }

          // If it's a product row (must have name and price)
          if (name && !isNaN(cleanPrice) && cleanPrice > 0) {
            const categoryFromCols = getVal(p, ["Категорія", "Category", "Категория", "Group", "category"]);
            const description = getVal(p, ["Опис для сайту", "Description", "Опис", "Описание", "description", "Опис (SEO)"]);
            const image = getVal(p, ["Image", "Зображення", "Изображение", "image", "Link", "URL", "Посилання", "Фото"]);
            const stock = getVal(p, ["Stock", "Кількість", "Кол-во", "Залишок", "stock"]);
            const typeVal = getVal(p, ["Type", "Тип", "type"]);
            const brand = getVal(p, ["Країна виробника", "Brand", "Бренд", "Производитель", "Виробник", "brand"]);
            const article = getVal(p, ["Оригінал (скорочено)", "Article", "Артикул", "Код", "Sku", "article"]);

            productsToImport.push({
              name,
              price: cleanPrice,
              category: categoryFromCols?.toString().trim() || currentCategory,
              description: description?.toString() || (article ? `Артикул: ${article}` : ''),
              image: image?.toString() || '',
              stock: Number(stock) || 1,
              type: (typeVal?.toString().toLowerCase() === 'plumbing' || typeVal?.toString().toLowerCase() === 'сантехніка' || name.toLowerCase().includes('труба') || name.toLowerCase().includes('кран')) ? 'plumbing' : 'auto',
              brand: brand?.toString() || '',
              article: article?.toString() || ''
            });
          }
        });

        console.log('Products ready to import:', productsToImport.length);

        if (productsToImport.length === 0) {
          alert(`Знайдено 0 товарів. Перевірте формат таблиці (Назва, Ціна).`);
          setIsImporting(false);
          return;
        }

        if (!confirm(`Знайдено ${productsToImport.length} товарів. Почати імпорт?`)) {
          setIsImporting(false);
          return;
        }

        console.log(`Starting import of ${productsToImport.length} products...`);
        
        let autoCount = 0;
        let plumbingCount = 0;
        let importedCount = 0;
        const batchSize = 250;
        
        for (let i = 0; i < productsToImport.length; i += batchSize) {
          try {
            const batch = writeBatch(db);
            const chunk = productsToImport.slice(i, i + batchSize);
            
            chunk.forEach((p) => {
              if (p.type === 'auto') autoCount++;
              else plumbingCount++;

              const newDocRef = doc(collection(db, 'products'));
              batch.set(newDocRef, {
                ...p,
                created_at: serverTimestamp()
              });
              importedCount++;
            });

            await batch.commit();
            setImportProgress(Math.min(100, Math.round(((i + chunk.length) / productsToImport.length) * 100)));
            await new Promise(resolve => setTimeout(resolve, 800));
          } catch (batchErr) {
            console.error(`Error in batch starting at ${i}:`, batchErr);
            if (batchErr?.toString().includes('Quota exceeded')) {
              alert('Добову квоту Firestore вичерпано. Імпорт зупинено.');
              break;
            }
          }
        }

        alert(`Імпорт завершено!\nВсього знайдено: ${productsToImport.length}\nУспішно імпортовано: ${importedCount}\n- Авто: ${autoCount}\n- Сантехніка: ${plumbingCount}`);
        e.target.value = ''; 
      } catch (err) {
        console.error('Import error:', err);
        alert('Помилка при імпорті. Переконайтеся, що файл не захищений паролем і має коректні заголовки.');
      } finally {
        setIsImporting(false);
        setImportProgress(0);
      }
    };
    reader.readAsArrayBuffer(file);
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
        let headerRowIndex = 0;
        let maxColumnsWithText = 0;
        
        // Search first 20 rows for the best header candidate
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const row = rawData[i];
          const textColumnCount = row.filter(cell => cell && cell.toString().trim().length > 1).length;
          
          if (textColumnCount >= 3 && textColumnCount > maxColumnsWithText) {
            maxColumnsWithText = textColumnCount;
            headerRowIndex = i;
          }
        }

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
          alert('AI не вдалося розпізнати структуру файлу. Спробуйте звичайний імпорт.');
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
        
        if (isCategoryMarker || (name && (isNaN(cleanPrice) || cleanPrice <= 0))) {
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

          processedProducts.push({
            name,
            price: cleanPrice,
            category: catVal?.toString().trim() || currentCategory,
            description: descVal?.toString() || (artVal ? `Артикул: ${artVal}` : ''),
            image: imgVal?.toString() || '',
            stock: Number(stockVal) || 1,
            type: (currentCategory.toLowerCase().includes('сантехніка') || name.toLowerCase().includes('змішувач') || name.toLowerCase().includes('кран')) ? 'plumbing' : 'auto',
            brand: brandVal?.toString() || '',
            article: artVal?.toString() || ''
          });
        }
      });

      if (processedProducts.length === 0) {
        alert('Не знайдено товарів за цією схемою.');
        return;
      }

      let autoCount = 0;
      let plumbingCount = 0;
      let importedCount = 0;
      const batchSize = 250;

      for (let i = 0; i < processedProducts.length; i += batchSize) {
        try {
          const batch = writeBatch(db);
          const chunk = processedProducts.slice(i, i + batchSize);
          
          chunk.forEach((p) => {
            if (p.type === 'auto') autoCount++;
            else plumbingCount++;

            const newDocRef = doc(collection(db, 'products'));
            batch.set(newDocRef, {
              ...p,
              created_at: serverTimestamp()
            });
            importedCount++;
          });

          await batch.commit();
          setImportProgress(Math.min(100, Math.round(((i + chunk.length) / processedProducts.length) * 100)));
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (batchErr) {
          console.error(`Smart batch error at ${i}:`, batchErr);
          if (batchErr?.toString().includes('Quota exceeded')) {
            alert('Квоту вичерпано. Зупинка імпорту.');
            break;
          }
        }
      }

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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="text-2xl font-black text-blue-600 mb-12">AdminPanel</div>
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
        </nav>
          <button 
            onClick={() => setActiveTab('settings' as any)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${
              activeTab === ('settings' as any) ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} />
            <span>Налаштування</span>
          </button>
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
                <h3 className="text-xl font-bold">AI розпізнав структуру</h3>
              </div>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Перевірте, чи правильно AI визначив колонки:
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
              <h3 className="text-xl font-bold mb-2">AI аналізує файл...</h3>
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

      {/* Edit Product Modal */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingProduct(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-10 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Редагування товару</h3>
                  <p className="text-sm text-gray-500 font-medium">ID: {editingProduct.id}</p>
                </div>
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="p-3 bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-2xl transition-all hover:rotate-90"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProduct} className="flex-1 overflow-y-auto">
                <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                  {/* Left Column: Form Fields */}
                  <div className="lg:col-span-7 space-y-8">
                    {/* General Section */}
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 text-blue-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        <span className="text-xs font-black uppercase tracking-widest">Основна інформація</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Назва товару</label>
                          <input 
                            required
                            value={editingProduct.name}
                            onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                            placeholder="Введіть назву товару"
                          />
                        </div>

                        <div className="col-span-2 space-y-2">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Опис</label>
                          <textarea 
                            value={editingProduct.description}
                            onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all h-40 resize-none font-medium text-gray-900 dark:text-white"
                            placeholder="Детальний опис товару..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Classification Section */}
                    <div className="space-y-6">
                      <div className="flex items-center space-x-2 text-indigo-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        <span className="text-xs font-black uppercase tracking-widest">Класифікація та ціна</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Категорія</label>
                          <input 
                            required
                            value={editingProduct.category}
                            onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Тип</label>
                          <select 
                            value={editingProduct.type}
                            onChange={e => setEditingProduct({...editingProduct, type: e.target.value as any})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white appearance-none"
                          >
                            <option value="auto">Автотовари</option>
                            <option value="plumbing">Сантехніка</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Ціна (грн)</label>
                          <div className="relative">
                            <input 
                              type="number"
                              required
                              value={editingProduct.price}
                              onFocus={(e) => e.target.select()}
                              onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl pl-5 pr-12 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-black text-blue-600 dark:text-blue-400 text-xl"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-gray-400">₴</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Склад (шт)</label>
                          <input 
                            type="number"
                            value={editingProduct.stock}
                            onFocus={(e) => e.target.select()}
                            onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Артикул</label>
                      <input 
                        value={editingProduct.article || ''}
                        onChange={e => setEditingProduct({...editingProduct, article: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono text-gray-600 dark:text-gray-400"
                        placeholder="Наприклад: 123-ABC"
                      />
                    </div>
                  </div>

                  {/* Right Column: Media Preview */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center space-x-2 text-emerald-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span className="text-xs font-black uppercase tracking-widest">Зображення товару</span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-[32px] p-6 border border-gray-100 dark:border-gray-700 space-y-6">
                      <div className="aspect-square bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-gray-200 dark:border-gray-700">
                        {editingProduct.image ? (
                          <img 
                            src={editingProduct.image} 
                            alt="Preview" 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Invalid+URL';
                            }}
                          />
                        ) : (
                          <div className="text-center p-8 space-y-3">
                            <Upload size={48} className="mx-auto text-gray-300" />
                            <p className="text-sm text-gray-400 font-medium">Немає зображення</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">URL зображення</label>
                        <input 
                          value={editingProduct.image}
                          onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs text-gray-500"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed uppercase tracking-wider">
                          Підказка: Використовуйте тільки URL прямих посилань на зображення (JPG, PNG, WEBP).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Footer Buttons */}
                <div className="px-10 py-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end items-center space-x-6 sticky bottom-0 z-10 backdrop-blur-md">
                  <button 
                    type="button" 
                    onClick={() => setEditingProduct(null)} 
                    className="px-8 py-4 font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Скасувати
                  </button>
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    Оновити товар
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-12 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-gray-900">Статистика</h1>
              <div className="text-sm text-gray-500 font-bold">Оновлено: {new Date().toLocaleTimeString()}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="text-gray-500 font-bold mb-2">Всього замовлень</div>
                <div className="text-4xl font-black text-gray-900">{orders.length}</div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="text-gray-500 font-bold mb-2">Всього товарів</div>
                <div className="text-4xl font-black text-gray-900">{totalProductsCount || products.length}</div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="text-gray-500 font-bold mb-2">Виторг</div>
                <div className="text-4xl font-black text-blue-600">
                  {orders.reduce((sum, o) => sum + o.total_price, 0).toLocaleString()} грн
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="text-gray-500 font-bold mb-2">Низький запас</div>
                <div className="text-4xl font-black text-red-500">
                  {products.filter(p => p.stock < 5).length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black mb-8">Динаміка продажів (7 днів)</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getChartData()}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        itemStyle={{fontWeight: 'bold'}}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black mb-8">Товари з низьким запасом</h3>
                <div className="space-y-4">
                  {products.filter(p => p.stock < 5).slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-lg overflow-hidden border border-red-100">
                          <img src={p.image || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-gray-900">{p.name}</span>
                      </div>
                      <div className="text-red-600 font-black">Залишок: {p.stock}</div>
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
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-4xl font-black text-gray-900">Управління товарами</h1>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Пошук товарів..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
                  />
                  <Package className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
                {selectedProducts.length > 0 && (
                  <button 
                    onClick={handleBulkDelete}
                    className="flex items-center space-x-2 bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={18} />
                    <span>Видалити ({selectedProducts.length})</span>
                  </button>
                )}
                <label className={`flex items-center space-x-2 bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-gray-50 transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Upload size={18} className={isImporting ? 'animate-bounce' : ''} />
                  <span>{isImporting ? `Імпорт ${importProgress}%` : 'Імпорт XLSX'}</span>
                  <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} className="hidden" disabled={isImporting} />
                </label>
                <label className={`flex items-center space-x-2 bg-purple-50 text-purple-600 border border-purple-100 px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-purple-100 transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Sparkles size={18} className={isAiMapping ? 'animate-pulse' : ''} />
                  <span>Розумний імпорт (AI)</span>
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
              const snap = await getCountFromServer(collection(db, 'products'));
              setTotalProductsCount(snap.data().count);
            } catch (e) {}
            setIsConfirmingDeleteAll(true);
          }}
          className="flex items-center space-x-2 bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition-all"
        >
          <Trash2 size={18} />
          <span>Видалити все</span>
        </button>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  <Plus size={18} />
                  <span>Додати товар</span>
                </button>
              </div>
            </div>

            {isAddingProduct && (
              <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl shadow-blue-600/5">
                <form onSubmit={handleAddProduct} className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600">Назва</label>
                    <input 
                      required
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="auto">Автотовари</option>
                      <option value="plumbing">Сантехніка</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
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
                    <label className="text-sm font-bold text-gray-600">URL зображення</label>
                    <input 
                      value={newProduct.image}
                      onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end space-x-4">
                    <button type="button" onClick={() => setIsAddingProduct(false)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700">Скасувати</button>
                    <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700">Зберегти</button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
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
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                            <img src={p.image || `https://picsum.photos/seed/${p.id}/100/100`} className="w-full h-full object-cover" />
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
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-gray-900">Замовлення</h1>
              <button 
                onClick={handleExportOrders}
                className="flex items-center space-x-2 bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                <Download size={18} />
                <span>Експорт XLSX</span>
              </button>
            </div>
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
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
        )}

        {activeTab === 'blog' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-gray-900">Управління блогом</h1>
              <div className="flex space-x-4">
                <button 
                  onClick={seedBlogPosts}
                  className="flex items-center space-x-2 bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  <Sparkles size={18} className="text-blue-600" />
                  <span>Заповнити демо-даними</span>
                </button>
                <button 
                  onClick={() => setIsAddingPost(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                >
                  <Plus size={18} />
                  <span>Нова стаття</span>
                </button>
              </div>
            </div>

            {isAddingPost && (
              <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl">
                <form onSubmit={handleAddPost} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
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
                <div key={post.id} className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden">
                      <img src={post.image || `https://picsum.photos/seed/${post.id}/100/100`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{post.title}</h3>
                      <div className="text-xs text-gray-500">{post.category} • {post.author} • {new Date(post.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingPost(post)} className="p-2 text-gray-400 hover:text-blue-600"><Edit size={18} /></button>
                    <button onClick={() => handleDeletePost(post.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab as any) === 'content' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black text-gray-900">Редактор контенту</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {['auto', 'plumbing'].map(type => (
                <div key={type} className="bg-white p-8 rounded-[32px] border border-gray-200 space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black uppercase tracking-wider text-gray-400">
                      {type === 'auto' ? 'Автотовари' : 'Сантехніка'}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${type === 'auto' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      Hero Section
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Badge Text</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" 
                        value={heroContent?.[type]?.badge || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], badge: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Title</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" 
                        value={heroContent?.[type]?.title || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], title: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Description</label>
                      <textarea 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-24" 
                        value={heroContent?.[type]?.description || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], description: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Button Text</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" 
                        value={heroContent?.[type]?.button || ''} 
                        onChange={e => setHeroContent({...heroContent, [type]: {...heroContent[type], button: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveHeroContent}
                className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Зберегти всі зміни
              </button>
            </div>
          </div>
        )}
        {(activeTab as any) === 'settings' && (
          <div className="space-y-8">
            <h1 className="text-4xl font-black text-gray-900">Налаштування магазину</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold">Загальні</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <div className="font-bold">Технічний банер</div>
                      <div className="text-xs text-gray-500">Показати банер про тех. роботи (товар у наявності)</div>
                    </div>
                    <div 
                      onClick={() => handleToggleSetting('techBannerMode', !settings.techBannerMode)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.techBannerMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.techBannerMode ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <div className="font-bold">Режим обслуговування</div>
                      <div className="text-xs text-gray-500">Тимчасово закрити магазин для покупців</div>
                    </div>
                    <div 
                      onClick={() => handleToggleSetting('maintenanceMode', !settings.maintenanceMode)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.maintenanceMode ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div>
                      <div className="font-bold">Сповіщення про замовлення</div>
                      <div className="text-xs text-gray-500">Отримувати email про нові замовлення</div>
                    </div>
                    <div 
                      onClick={() => handleToggleSetting('notifications', !settings.notifications)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${settings.notifications ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${settings.notifications ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-6">
                <h3 className="text-xl font-bold">Контакти</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500">Email підтримки</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" 
                      value={settings.supportEmail} 
                      onChange={e => setSettings({...settings, supportEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-500">Телефон</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3" 
                      value={settings.phone} 
                      onChange={e => setSettings({...settings, phone: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={handleSaveSettings}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Зберегти налаштування
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-200 space-y-6 col-span-1 md:col-span-2">
                <h3 className="text-xl font-bold">Інтеграція з UTR (Order24)</h3>
                <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">Синхронізація прайс-листів</div>
                      <div className="text-sm text-gray-500">Отримати актуальні товари та ціни з UTR API</div>
                    </div>
                    <button 
                      onClick={handleSyncUTR}
                      disabled={isSyncingUTR}
                      className={`px-8 py-3 rounded-xl font-bold transition-all ${
                        isSyncingUTR ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                      }`}
                    >
                      {isSyncingUTR ? 'Синхронізація...' : 'Синхронізувати зараз'}
                    </button>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3">
                    <Package className="text-blue-500 shrink-0" size={20} />
                    <div className="text-xs text-blue-800">
                      Переконайтеся, що ви додали <code className="bg-blue-100 px-1 rounded">UTR_API_KEY</code> у налаштуваннях проекту.
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
                {deleteProgressStats.total > 0 && (
                  <p className="text-blue-600 font-bold">
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
                    (window as any)._stopDeletionFlag = true;
                    // Also immediately close if it really hangs
                    setTimeout(() => setIsImporting(false), 2000);
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
