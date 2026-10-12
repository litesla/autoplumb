import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getTelegramWebApp, 
  isRunningInTelegram, 
  getTelegramUser, 
  triggerHaptic, 
  initTelegramMiniApp 
} from '../lib/telegram';
import { TelegramUser, TelegramWebApp } from '../types/telegram';

export function useTelegram() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      setWebApp(tg);
      setIsTelegram(isRunningInTelegram());
      setUser(getTelegramUser());
      initTelegramMiniApp();

      // Listen to theme change events from Telegram client
      const handleThemeChange = () => {
        if (!localStorage.getItem('theme')) {
          if (tg.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      };

      tg.onEvent?.('themeChanged', handleThemeChange);
      return () => {
        tg.offEvent?.('themeChanged', handleThemeChange);
      };
    }
  }, []);

  // Sync Telegram native BackButton with React Router
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg?.BackButton) return;

    const isRoot = location.pathname === '/' || location.pathname === '';

    const handleBackClick = () => {
      triggerHaptic('light');
      navigate(-1);
    };

    if (!isRoot) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBackClick);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handleBackClick);
    };
  }, [location.pathname, navigate]);

  const showAlert = useCallback((message: string) => {
    const tg = getTelegramWebApp();
    if (tg?.showAlert) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  }, []);

  const openTelegramLink = useCallback((url: string) => {
    const tg = getTelegramWebApp();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, []);

  const openLink = useCallback((url: string) => {
    const tg = getTelegramWebApp();
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, []);

  return {
    webApp,
    isTelegram,
    user,
    haptic: triggerHaptic,
    showAlert,
    openTelegramLink,
    openLink
  };
}
