import { TelegramUser, TelegramWebApp } from '../types/telegram';

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

export const isRunningInTelegram = (): boolean => {
  const tg = getTelegramWebApp();
  if (!tg) return false;
  // If platform is not unknown or initData is present
  return Boolean(tg.initData || (tg.platform && tg.platform !== 'unknown'));
};

export const getTelegramUser = (): TelegramUser | null => {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
};

/**
 * Trigger subtle haptic vibrations supported natively by Telegram clients
 * Falls back safely to navigator.vibrate on mobile browsers if available
 */
export const triggerHaptic = (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light'
) => {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        tg.HapticFeedback.notificationOccurred(type);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
      return;
    } catch {
      // ignore
    }
  }

  // Fallback to standard web vibration API on mobile browsers
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'heavy' || type === 'error') navigator.vibrate(25);
      else if (type === 'medium' || type === 'warning') navigator.vibrate(15);
      else navigator.vibrate(8);
    } catch {
      // ignore
    }
  }
};

/**
 * Initialize Telegram Mini App parameters: expand screen, setup colors and listeners
 */
export const initTelegramMiniApp = () => {
  const tg = getTelegramWebApp();
  if (!tg) return;

  try {
    // Notify Telegram that the app is ready
    tg.ready();

    // Expand the app to take up full available height
    tg.expand();

    // Enable closing confirmation to prevent accidental closing on swipe down
    tg.enableClosingConfirmation();

    // Sync header / background colors
    const isDark = tg.colorScheme === 'dark' || document.documentElement.classList.contains('dark');
    const headerColor = isDark ? '#09090b' : '#ffffff';
    const bgColor = isDark ? '#09090b' : '#f8fafc';

    if (tg.setHeaderColor) tg.setHeaderColor(headerColor);
    if (tg.setBackgroundColor) tg.setBackgroundColor(bgColor);

    // Apply colorScheme to HTML if not explicitly overridden by user
    if (!localStorage.getItem('theme')) {
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (tg.colorScheme === 'light') {
        document.documentElement.classList.remove('dark');
      }
    }
  } catch (err) {
    console.warn('Error initializing Telegram Mini App:', err);
  }
};
