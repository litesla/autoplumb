import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, collection, query, limit, getDocs, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Calendar, User, Clock, ArrowLeft, Share2, Bookmark, Facebook, Twitter, Link as LinkIcon, ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';
import { BlogPost } from './BlogPage';

export const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;

    const fetchPost = async () => {
      const postPath = `blog/${id}`;
      try {
        const docRef = doc(db, 'blog', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const postData = {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
          } as BlogPost;
          setPost(postData);
          
          // Fetch related posts
          const q = query(
            collection(db, 'blog'),
            where('category', '==', postData.category),
            limit(4)
          );
          const relatedSnap = await getDocs(q);
          setRelatedPosts(relatedSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as BlogPost))
            .filter(p => p.id !== id)
            .slice(0, 3)
          );
        } else {
          navigate('/blog');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, postPath);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        text: post?.excerpt,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Посилання скопійовано!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
        <img 
          src={post.image || `https://picsum.photos/seed/${post.id}/1920/1080`} 
          alt={post.title}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
          <div className="max-w-4xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center space-x-2 mb-6"
            >
              <Link to="/blog" className="px-4 py-2 bg-white/20 backdrop-blur-md text-white text-xs font-black rounded-full uppercase tracking-wider hover:bg-white/30 transition-all">
                {post.category}
              </Link>
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">• {post.readTime} читання</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight"
            >
              {post.title}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-6 text-white/80"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black">
                  {post.author[0]}
                </div>
                <div>
                  <div className="text-sm font-bold">{post.author}</div>
                  <div className="text-xs text-white/60">Автор статті</div>
                </div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="flex items-center space-x-2 text-sm font-bold">
                <Calendar size={18} />
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar Left - Social Share */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-32 space-y-4">
              <button onClick={handleShare} className="w-12 h-12 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600 rounded-2xl flex items-center justify-center transition-all">
                <Share2 size={20} />
              </button>
              <button className="w-12 h-12 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all">
                <Bookmark size={20} />
              </button>
              <div className="h-8 w-px bg-gray-100 dark:bg-gray-800 mx-auto my-4" />
              <button className="w-12 h-12 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-600 rounded-2xl flex items-center justify-center transition-all">
                <Facebook size={20} />
              </button>
              <button className="w-12 h-12 bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-blue-400 rounded-2xl flex items-center justify-center transition-all">
                <Twitter size={20} />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-11">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <div className="markdown-body">
                <Markdown>{post.content}</Markdown>
              </div>
            </div>

            {/* Tags / Footer */}
            <div className="mt-16 pt-16 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-8">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Поділитися:</span>
                  <div className="flex space-x-2">
                    <button onClick={handleShare} className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all">
                      <LinkIcon size={18} />
                    </button>
                    <button className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all">
                      <Facebook size={18} />
                    </button>
                    <button className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all">
                      <Twitter size={18} />
                    </button>
                  </div>
                </div>
                
                <button 
                  onClick={() => navigate('/blog')}
                  className="flex items-center space-x-2 text-blue-600 font-black hover:underline"
                >
                  <ArrowLeft size={18} />
                  <span>Повернутися до блогу</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Схожі статті</h2>
                <Link to="/blog" className="flex items-center space-x-2 text-blue-600 font-bold hover:underline">
                  <span>Всі статті</span>
                  <ChevronRight size={18} />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map(p => (
                  <Link 
                    key={p.id} 
                    to={`/blog/${p.id}`}
                    className="group bg-white dark:bg-gray-800 rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all"
                  >
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={p.image || `https://picsum.photos/seed/${p.id}/600/400`} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="font-black text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {p.title}
                      </h3>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
