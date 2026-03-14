import { useI18n } from '../../contexts/I18nContext';

const languages = [
  { code: 'ko', flag: '🇰🇷' },
  { code: 'en', flag: '🇺🇸' },
  { code: 'ja', flag: '🇯🇵' },
  { code: 'zh', flag: '🇨🇳' }
];

export default function LanguageSwitcher() {
  const { lang, setLanguage } = useI18n();

  return (
    <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm border border-slate-100">
      {languages.map(({ code, flag }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`text-base w-8 h-8 flex items-center justify-center rounded-full transition-all ${
            lang === code
              ? 'bg-accent/10 scale-110'
              : 'hover:bg-slate-50 opacity-60 hover:opacity-100'
          }`}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
