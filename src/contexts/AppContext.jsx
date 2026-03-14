import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentSalon, setCurrentSalon] = useState(() => {
    try {
      const saved = localStorage.getItem('salonpay_current_salon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toast, setToast] = useState({ show: false, message: '' });

  const saveSalon = useCallback((salon) => {
    setCurrentSalon(salon);
    if (salon) {
      localStorage.setItem('salonpay_current_salon', JSON.stringify(salon));
    } else {
      localStorage.removeItem('salonpay_current_salon');
    }
  }, []);

  const clearSalon = useCallback(() => {
    setCurrentSalon(null);
    localStorage.removeItem('salonpay_current_salon');
  }, []);

  const showLoading = useCallback((message = '') => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage('');
  }, []);

  const showToast = useCallback((message, duration = 2500) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, duration);
  }, []);

  const value = {
    currentSalon,
    setCurrentSalon: saveSalon,
    clearSalon,
    currentCustomer,
    setCurrentCustomer,
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
    toast,
    showToast
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
