import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';

export default function SalonCodePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { setCurrentSalon, showLoading, hideLoading, showToast } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError('');
    showLoading(t('loadingData'));

    try {
      const result = await sheetsDB.connectBySalonCode(code.trim());
      hideLoading();

      if (result.success) {
        setCurrentSalon(result.salon);
        showToast(t('salonConnected'));
        navigate('/customer/login');
      } else {
        setError(t('invalidSalonCode'));
      }
    } catch (err) {
      hideLoading();
      setError(t('invalidSalonCode'));
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-display">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            {t('enterSalonCode') || 'Salon Code'}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-6 pt-12">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[40px]">storefront</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {t('enterSalonCode') || 'Enter Salon Code'}
          </h2>
          <p className="text-sm text-slate-400 text-center mb-10 leading-relaxed">
            {t('enterSalonCodeDesc') || 'Enter the code provided by your salon'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                {t('salonCode') || 'Salon Code'}
              </label>
              <input
                type="text"
                placeholder={t('salonCodePlaceholder') || 'e.g. SP12ABCD'}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoComplete="off"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-bold tracking-[3px] text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all uppercase"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="material-symbols-outlined text-rose-500 text-lg">error</span>
                <span className="text-sm text-rose-600 font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl active:scale-[0.98] transition-all"
            >
              {t('connect') || 'Connect'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              {t('back') || 'Back'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
