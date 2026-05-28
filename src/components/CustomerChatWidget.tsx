import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, X, Send, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'admin';
  text: string;
  createdAt: any;
}

export const CustomerChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or restore session
  useEffect(() => {
    let storedChatId = localStorage.getItem('support_chat_id');
    let storedName = localStorage.getItem('support_chat_name') || '';
    let storedPhone = localStorage.getItem('support_chat_phone') || '';

    if (!storedChatId) {
      storedChatId = 'chat_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('support_chat_id', storedChatId);
    }

    setChatId(storedChatId);
    if (storedName) {
      setCustomerName(storedName);
      setCustomerPhone(storedPhone);
      setIsRegistered(true);
    }

    // Listen to global open chat event from header
    const handleOpenChat = () => {
      setIsOpen(true);
      setUnreadCount(0);
    };

    window.addEventListener('open-customer-chat', handleOpenChat);
    return () => {
      window.removeEventListener('open-customer-chat', handleOpenChat);
    };
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!chatId) return;

    const messagesCol = collection(db, 'chats', chatId, 'messages');
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

      // Increment unread count if widget is closed and there is a new admin reply
      if (!isOpen && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.senderType === 'admin') {
          setUnreadCount((prev) => prev + 1);
        }
      }
    }, (error) => {
      console.error("Firestore onSnapshot subscription failed in Chat Widget: ", error);
    });

    return () => unsubscribe();
  }, [chatId, isOpen]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    localStorage.setItem('support_chat_name', customerName);
    localStorage.setItem('support_chat_phone', customerPhone);
    setIsRegistered(true);

    // Initial silent message in the database to initialize the session
    const chatDocRef = doc(db, 'chats', chatId);
    setDoc(chatDocRef, {
      customerName,
      customerPhone,
      lastMessage: 'Чат розпочато',
      lastMessageAt: serverTimestamp(),
      status: 'active',
      unreadCount: 0,
    }, { merge: true });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const messageToSend = inputText.trim();
    setInputText('');

    try {
      // 1. Add message to the collection
      const messagesCol = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesCol, {
        senderId: chatId,
        senderName: customerName,
        senderType: 'customer',
        text: messageToSend,
        createdAt: serverTimestamp(),
      });

      // 2. Update parent chat doc
      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(chatDocRef, {
        customerName,
        customerPhone,
        lastMessage: messageToSend,
        lastMessageAt: serverTimestamp(),
        status: 'active',
        unreadCount: 1, // Admin has a new unread message now
      }, { merge: true });

    } catch (err) {
      console.error('Error sending message manually: ', err);
    }
  };

  return (
    <div className="font-sans">
      <AnimatePresence>
        {/* Floating Toggle Button */}
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <button
              id="chat-toggle-btn"
              onClick={() => {
                setIsOpen(true);
                setUnreadCount(0);
              }}
              className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-750 transition-all hover:scale-110 active:scale-95 duration-200 relative group border-2 border-white dark:border-gray-800 cursor-pointer"
            >
              <MessageCircle size={28} className="animate-pulse" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow">
                  {unreadCount}
                </span>
              )}
              <span className="absolute right-full mr-3 bg-gray-900/90 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none font-bold">
                Маєте запитання? Напишіть нам!
              </span>
            </button>
          </motion.div>
        )}

        {/* Support Chat Window & Backdrop */}
        {isOpen && (
          <>
            {/* Backdrop for mobile to allow click-outside-to-close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 sm:hidden"
            />

            <motion.div
              id="support-chat-window"
              initial={{ opacity: 0, scale: 0.85, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 60 }}
              transition={{ type: 'spring', damping: 22, stiffness: 220 }}
              className="fixed bottom-6 right-6 w-80 sm:w-96 h-[510px] bg-white dark:bg-gray-900 rounded-[28px] shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden z-50 origin-bottom-right"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex items-center justify-between shadow-md relative">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping" />
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm tracking-wide">MOTO-LIDER ЧАТ</h4>
                    <p className="text-[10px] text-blue-100 opacity-90">Менеджери онлайн</p>
                  </div>
                </div>
                
                {/* Beautiful circle close button matching cart drawer style */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 -mr-1 text-white hover:bg-white/15 dark:hover:bg-gray-800/40 rounded-full transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-white/10 active:scale-90"
                  aria-label="Закрити чат"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 dark:bg-gray-950/30">
                {!isRegistered ? (
                  /* Registration Form */
                  <form onSubmit={handleRegister} className="h-full flex flex-col justify-center space-y-4 px-2">
                    <div className="text-center space-y-2 mb-2">
                      <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                        <MessageSquare size={24} />
                      </div>
                      <h5 className="font-black text-gray-900 dark:text-white text-base">Зв'яжіться з нами!</h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Введіть Ваше ім'я та телефон, щоб розпочати живе листування
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
                          Ваше ім'я <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Олександр"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1">
                          Номер телефону
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+380"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-600/10 active:scale-95 text-sm"
                    >
                      Почати чат
                    </button>
                  </form>
                ) : (
                  /* Conversation Messages list */
                  <div className="space-y-3.5">
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500 leading-relaxed font-medium">
                        Напишіть своє перше повідомлення тут. Наші менеджери дадуть відповідь якомога швидше!
                      </div>
                    )}
                    {messages.map((msg) => {
                      const isAdmin = msg.senderType === 'admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                        >
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mb-1 px-1">
                            {isAdmin ? 'Менеджер' : msg.senderName}
                          </span>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm transition-all break-words ${
                              isAdmin
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-850'
                                : 'bg-blue-600 text-white rounded-tr-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input Box */}
              {isRegistered && (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center space-x-2.5"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Введіть повідомлення..."
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-all text-gray-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-blue-600 text-white rounded-full disabled:opacity-40 disabled:scale-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all text-sm flex items-center justify-center cursor-pointer shadow shadow-blue-600/10"
                  >
                    <Send size={16} />
                  </button>
                </form>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
