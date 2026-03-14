import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';
import { formatPhone } from '../utils/format';

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentSalon, setCurrentCustomer, showLoading, hideLoading, showToast } = useApp();
  const [phone, setPhone] = useState('');

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    // 자동 하이픈 추가
    if (value.length >= 7) {
      value = value.replace(/(\d{3})(\d{4})(\d{0,4})/, '$1-$2-$3');
    } else if (value.length >= 3) {
      value = value.replace(/(\d{3})(\d{0,4})/, '$1-$2');
    }

    setPhone(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedPhone = formatPhone(phone);

    showLoading(t('loadingData'));

    try {
      const customer = await sheetsDB.getCustomerByPhone(formattedPhone);
      hideLoading();

      if (customer) {
        setCurrentCustomer(customer);
        navigate('/customer/dashboard');
      } else {
        showToast(t('phoneNotFound'));
      }
    } catch (err) {
      hideLoading();
      showToast(t('phoneNotFound'));
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-display">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/salon-code')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            {t('hello') || 'Welcome'}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-6 pt-8">
          {/* Character / Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
              <span className="material-symbols-outlined text-primary text-[48px]">waving_hand</span>
            </div>
          </div>

          {/* Salon Badge */}
          {currentSalon && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <span className="material-symbols-outlined text-primary text-sm">storefront</span>
                <span className="text-sm font-bold text-primary">{currentSalon.salonName}</span>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {t('hello') || 'Hello!'}
          </h2>
          <p className="text-sm text-slate-400 text-center mb-10 leading-relaxed">
            {t('phonePrompt') || 'Enter your phone number to check in'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                {t('phoneLabel') || 'Phone Number'}
              </label>
              <input
                type="tel"
                placeholder={t('phonePlaceholder') || '010-0000-0000'}
                value={phone}
                onChange={handlePhoneChange}
                maxLength={13}
                autoComplete="tel"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-semibold tracking-wider text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl active:scale-[0.98] transition-all"
            >
              {t('search') || 'Search'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/salon-code')}
              className="w-full py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              {t('changeSalon') || 'Change Salon'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
