import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, query, orderBy, setDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { MessageSquare, Send, Phone, User, Check, Clock, ShieldCheck } from 'lucide-react';

interface ChatSession {
  id: string;
  customerName: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount: number;
  status: 'active' | 'closed';
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'admin';
  text: string;
  createdAt: any;
}

export const AdminChatTab: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to all chat sessions
  useEffect(() => {
    const chatCol = collection(db, 'chats');
    const q = query(chatCol, orderBy('lastMessageAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeSessions: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        activeSessions.push({
          id: docSnap.id,
          customerName: data.customerName || 'Гість',
          customerPhone: data.customerPhone || '',
          lastMessage: data.lastMessage || '',
          lastMessageAt: data.lastMessageAt,
          unreadCount: data.unreadCount || 0,
          status: data.status || 'active',
        });
      });
      setSessions(activeSessions);
      setLoading(false);
    }, (error) => {
      console.error("Firestore sessions snapshot fail in Admin Chat Panel: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to selected session messages
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    const messagesCol = collection(db, 'chats', selectedSession.id, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderType: data.senderType,
          text: data.text,
          createdAt: data.createdAt,
        });
      });
      setMessages(msgs);

      // Reset unread count since admin is actively viewing this chat
      if (selectedSession.unreadCount > 0) {
        setDoc(doc(db, 'chats', selectedSession.id), { unreadCount: 0 }, { merge: true });
      }
    }, (error) => {
      console.error("Firestore messages snapshot fail in Admin Chat Panel: ", error);
    });

    return () => unsubscribe();
  }, [selectedSession?.id]);

  // Scroll to chat bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSession) return;

    const messageToSend = replyText.trim();
    setReplyText('');

    try {
      // 1. Add message structure
      const messagesCol = collection(db, 'chats', selectedSession.id, 'messages');
      await addDoc(messagesCol, {
        senderId: 'admin_support',
        senderName: 'Менеджер',
        senderType: 'admin',
        text: messageToSend,
        createdAt: serverTimestamp(),
      });

      // 2. Update parent session record state
      const chatDocRef = doc(db, 'chats', selectedSession.id);
      await setDoc(chatDocRef, {
        lastMessage: messageToSend,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0, // Admin has viewed, so reset unread count of unviewed messages 
      }, { merge: true });

    } catch (err) {
      console.error('Error sending reply in Admin Chat Tab: ', err);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      await setDoc(doc(db, 'chats', sessionId), { status: 'closed' }, { merge: true });
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error('Error closing session: ', err);
    }
  };

  // Human friendly formatting of firestore timestamp
  const formatTime = (ts: any) => {
    if (!ts) return '';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white">Онлайн Підтримка</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Спілкуйтеся з клієнтами у реальному часі</p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl dark:bg-blue-900/30 dark:text-blue-400">
          <ShieldCheck size={18} />
          <span className="text-xs font-black">Режим оператора</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-1 overflow-hidden h-[500px]">
        {/* Sessions Sidebar list */}
        <div className="w-80 border-r border-gray-150 dark:border-gray-750 flex flex-col h-full bg-gray-50/20 dark:bg-gray-900/10">
          <div className="p-4 border-b border-gray-150 dark:border-gray-750 bg-white dark:bg-gray-800">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Активні чати ({sessions.length})</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-750">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-400 font-medium">Завантаження сесій чату...</div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-medium">Немає активних чатів клієнтів</div>
            ) : (
              sessions.map((sess) => {
                const isSelected = selectedSession?.id === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className={`p-4 flex flex-col space-y-2 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/40 relative ${
                      isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 font-bold text-gray-900 dark:text-white text-sm">
                        <User size={14} className="text-gray-400" />
                        <span className="truncate max-w-[140px]">{sess.customerName}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold">{formatTime(sess.lastMessageAt)}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate pr-4">
                      {sess.lastMessage}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {sess.customerPhone ? (
                        <div className="text-[10px] text-gray-400 font-mono flex items-center space-x-1">
                          <Phone size={10} />
                          <span>{sess.customerPhone}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">Гість без контакту</span>
                      )}

                      {sess.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full">
                          Нове
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800">
          {selectedSession ? (
            <>
              {/* Target Session Header */}
              <div className="px-6 py-4 border-b border-gray-150 dark:border-gray-750 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                    Чат з: {selectedSession.customerName}
                  </h3>
                  {selectedSession.customerPhone && (
                    <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <Phone size={12} />
                      {selectedSession.customerPhone}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleCloseSession(selectedSession.id)}
                  className="px-3.5 py-1.5 text-xs bg-red-50 text-red-600 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 font-black transition-all"
                >
                  Закрити діалог
                </button>
              </div>

              {/* Message Scroll View */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-950/10 space-y-4">
                {messages.map((msg) => {
                  const isAdmin = msg.senderType === 'admin';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mb-1 px-1">
                        {isAdmin ? 'Ви (Менеджер)' : msg.senderName}
                      </span>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm font-medium shadow-sm transition-all break-words ${
                          isAdmin
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-650'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium px-1 mt-1 text-right">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-150 dark:border-gray-750 flex items-center space-x-3 bg-white dark:bg-gray-800">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Написати відповідь для ${selectedSession.customerName}...`}
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all text-gray-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 transition-all font-black shrink-0 shadow-md shadow-blue-600/15"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow animate-bounce">
                <MessageSquare size={28} />
              </div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Не обрано жодного діалогу</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-sm">
                Оберіть активну сесію зі списку ліворуч, щоб переглянути повідомлення клієнта та надати відповідь
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
