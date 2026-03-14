import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';

export default function AdminRegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { accessToken, signIn } = useAuth();
  const { setCurrentSalon, showLoading, hideLoading, showToast } = useApp();
  const [salonName, setSalonName] = useState('');
  const [region, setRegion] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!salonName.trim() || !region.trim()) return;

    let token = accessToken;

    // 로그인이 안 되어 있으면 먼저 로그인
    if (!token) {
      try {
        const result = await signIn();
        token = result.accessToken;
      } catch (err) {
        showToast(t('loginRequired'));
        return;
      }
    }

    try {
      showLoading(t('loadingData'));

      const result = await sheetsDB.createSalonSpreadsheet(
        salonName.trim(),
        region.trim(),
        token
      );

      hideLoading();
      showToast(t('registrationComplete'));

      setCurrentSalon(result);
      navigate('/admin/salon-code');
    } catch (err) {
      hideLoading();
      console.error('등록 오류:', err);
      showToast('등록 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans lg:flex lg:items-center lg:justify-center">
      <div className="max-w-md mx-auto min-h-screen lg:min-h-0 bg-white shadow-2xl lg:rounded-2xl lg:my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/admin/login')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            {t('registerSalon') || 'Register Salon'}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-6 pt-10">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-accent text-[40px]">add_business</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {t('registerSalon') || 'Register Your Salon'}
          </h2>
          <p className="text-sm text-slate-400 text-center mb-10 leading-relaxed">
            {t('registerSalonDesc') || 'Set up your salon to start managing customers'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                {t('salonName') || 'Salon Name'}
              </label>
              <input
                type="text"
                placeholder={t('salonNamePlaceholder') || 'Enter salon name'}
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                {t('region') || 'Region'}
              </label>
              <input
                type="text"
                placeholder={t('regionPlaceholder') || 'Enter region'}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full py-3.5 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/25 hover:shadow-xl active:scale-[0.98] transition-all"
              >
                {t('registerAndStart') || 'Register & Start'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="w-full mt-3 py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                {t('back') || 'Back'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
