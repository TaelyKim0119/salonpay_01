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

  // Shared form content
  const formContent = (
    <>
      {/* Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[40px]">storefront</span>
        </div>
      </div>

      <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 text-center mb-2">
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

      {/* Demo hint */}
      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-400 mb-2">Want to try a demo?</p>
        <button
          type="button"
          onClick={() => { setCode('DEMO1234'); }}
          className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
        >
          Use code: DEMO1234
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg-light font-display">

      {/* ── Mobile ── */}
      <div className="lg:hidden max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col">
        {/* 상단 이미지 */}
        <div className="relative h-48 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"
            alt="Salon"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
          <button
            onClick={() => navigate('/')}
            className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="absolute bottom-4 left-6 text-[17px] font-bold text-slate-800">
            {t('enterSalonCode') || 'Salon Code'}
          </h1>
        </div>
        <div className="flex-1 flex flex-col px-6 pt-6">
          {formContent}
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left: Image Panel */}
        <div className="w-1/2 relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80"
            alt="Beauty Salon"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-12 z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30">
              <span className="material-symbols-outlined text-white text-[28px]">storefront</span>
            </div>
            <h1 className="text-white text-4xl font-extrabold tracking-tight mb-3">
              Welcome to <span className="font-logo italic text-white/90">SalonPay</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed mb-6 max-w-sm">
              {t('enterSalonCodeDesc') || 'Connect to your salon with a simple code and start earning loyalty points.'}
            </p>
            <div className="flex items-center gap-6 text-white/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-white/60">loyalty</span>
                <span className="text-xs font-bold uppercase tracking-wider">Points</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-white/60">confirmation_number</span>
                <span className="text-xs font-bold uppercase tracking-wider">Coupons</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-white/60">history</span>
                <span className="text-xs font-bold uppercase tracking-wider">History</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="w-1/2 flex items-center justify-center p-16 bg-white">
          <div className="w-full max-w-md">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-10"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span className="text-sm font-medium">{t('back') || 'Back'}</span>
            </button>
            {formContent}
          </div>
        </div>
      </div>
    </div>
  );
}
