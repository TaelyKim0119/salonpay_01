import { createContext, useContext, useState, useCallback } from 'react';
import { translations, getDefaultLang } from '../config/i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(getDefaultLang);

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['ko'][key] || key;
  }, [lang]);

  const setLanguage = useCallback((newLang) => {
    setLang(newLang);
    localStorage.setItem('salonpay_lang', newLang);
  }, []);

  const formatDate = useCallback((month, day) => {
    const template = t('monthDay');
    return template.replace('{month}', parseInt(month)).replace('{day}', parseInt(day));
  }, [t]);

  const formatMonth = useCallback((month) => {
    const template = t('monthLabel');
    return template.replace('{month}', month);
  }, [t]);

  const value = {
    lang,
    setLanguage,
    t,
    formatDate,
    formatMonth
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
