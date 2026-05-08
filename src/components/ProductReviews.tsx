import React, { useState, useEffect } from 'react';
import { Star, User, MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export const ProductReviews: React.FC<{ productId: string }> = ({ productId }) => {
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'reviews';
    const q = query(
      collection(db, path),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
      setReviews(reviewsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const path = 'reviews';
    try {
      await addDoc(collection(db, path), {
        productId,
        userId: user.uid,
        userName: user.email?.split('@')[0] || 'Анонім',
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp()
      });
      setComment('');
      setRating(5);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!isAdmin) return;
    const path = `reviews/${reviewId}`;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  return (
    <div className="mt-24">
      <div className="flex flex-col md:flex-row items-baseline justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
            <MessageSquare size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Відгуки покупців</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Відгуки та оцінки
          </h2>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-4 bg-white dark:bg-gray-900 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="text-3xl font-black text-gray-900 dark:text-white">{averageRating}</div>
            <div className="flex text-yellow-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  size={20} 
                  fill={star <= Math.round(Number(averageRating)) ? "currentColor" : "none"} 
                />
              ))}
            </div>
            <div className="text-sm font-bold text-gray-400 dark:text-gray-500">
              {reviews.length} відгуків
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Review Form */}
        <div className="lg:col-span-1">
          {user ? (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none sticky top-24">
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Залишити відгук</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Ваша оцінка</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-xl transition-all ${rating >= star ? 'text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        <Star size={24} fill={rating >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Ваш коментар</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Поділіться враженнями від товару..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all min-h-[120px] resize-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  <span>Надіслати відгук</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800 text-center">
              <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <User size={32} className="text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Увійдіть, щоб залишити відгук</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">Тільки авторизовані користувачі можуть ділитися враженнями.</p>
              <a href="/auth" className="inline-block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-xl font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                Увійти в акаунт
              </a>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-[32px] animate-pulse" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800">
              <div className="text-gray-300 dark:text-gray-700 mb-4">
                <MessageSquare size={48} className="mx-auto opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ще немає жодного відгуку</h3>
              <p className="text-gray-500 dark:text-gray-400">Будьте першим, хто поділиться враженнями про цей товар!</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center font-black text-lg">
                        {review.userName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-gray-900 dark:text-white">{review.userName}</div>
                        <div className="text-xs font-bold text-gray-400 dark:text-gray-500">
                          {review.createdAt?.toDate().toLocaleDateString('uk-UA')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            size={16} 
                            fill={star <= review.rating ? "currentColor" : "none"} 
                          />
                        ))}
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(review.id)}
                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                    {review.comment}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
