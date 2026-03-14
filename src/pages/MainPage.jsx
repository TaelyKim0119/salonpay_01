import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from '../components/common';

export default function MainPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentSalon } = useApp();
  const { isSignedIn } = useAuth();

  const handleCustomerClick = () => {
    if (currentSalon) {
      navigate('/customer/login');
    } else {
      navigate('/salon-code');
    }
  };

  const handleAdminClick = () => {
    if (isSignedIn) {
      navigate('/admin');
    } else {
      navigate('/admin/login');
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        {/* Header Section */}
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="text-slate-900 flex size-12 shrink-0 items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </div>
          <h2 className="text-slate-900 text-lg font-semibold leading-tight tracking-tight flex-1 text-center pr-12 uppercase tracking-widest text-xs opacity-60">
            SALONPAY
          </h2>
        </div>

        <div className="flex flex-col items-center px-6 pt-12 pb-8">
          <h1 className="text-slate-900 tracking-tight text-[32px] font-bold leading-tight text-center">
            {t('appTitle') || 'Welcome to'} <span className="text-accent">SalonPay</span>
          </h1>
          <p className="text-slate-600 text-base font-normal leading-relaxed mt-3 text-center max-w-xs">
            {t('appSubtitle') || 'Select your experience to begin your journey in premium beauty services.'}
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="px-6 space-y-6 max-w-xl mx-auto w-full">
          {/* Customer Role */}
          <div
            onClick={handleCustomerClick}
            className="group relative flex flex-col items-stretch justify-start rounded-xl shadow-sm border border-slate-200/50 bg-white overflow-hidden hover:border-accent/50 transition-all duration-300 cursor-pointer"
          >
            <div className="relative w-full h-48 flex items-center justify-center overflow-hidden bg-gradient-to-br from-rose-100 via-pink-50 to-orange-50">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-8"><span className="material-symbols-outlined text-primary text-6xl">spa</span></div>
                <div className="absolute bottom-6 left-6"><span className="material-symbols-outlined text-primary text-4xl">favorite</span></div>
              </div>
              <div className="relative z-10 bg-white/80 backdrop-blur-md p-5 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-accent !text-4xl">person_search</span>
              </div>
            </div>
            <div className="flex w-full grow flex-col items-stretch justify-center gap-2 p-6">
              <div className="flex items-center justify-between">
                <p className="text-slate-900 text-xl font-bold tracking-tight">
                  {t('customer') || 'Customer'}
                </p>
                <span className="text-xs font-semibold text-accent uppercase tracking-widest px-2 py-1 bg-accent/10 rounded">
                  Join
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('customerDesc') || 'Discover top-rated stylists, book instant appointments, and enjoy personalized beauty care.'}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); handleCustomerClick(); }}
                className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-lg h-12 bg-accent text-white text-sm font-semibold transition-opacity hover:opacity-90"
              >
                {t('continueCustomer') || 'Continue as Customer'}
              </button>
            </div>
          </div>

          {/* Salon Owner Role */}
          <div
            onClick={handleAdminClick}
            className="group relative flex flex-col items-stretch justify-start rounded-xl shadow-sm border border-slate-200/50 bg-white overflow-hidden hover:border-accent/50 transition-all duration-300 cursor-pointer"
          >
            <div className="relative w-full h-48 flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-orange-50">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-8"><span className="material-symbols-outlined text-accent text-6xl">analytics</span></div>
                <div className="absolute bottom-6 right-6"><span className="material-symbols-outlined text-accent text-4xl">storefront</span></div>
              </div>
              <div className="relative z-10 bg-white/80 backdrop-blur-md p-5 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-accent !text-4xl">dashboard_customize</span>
              </div>
            </div>
            <div className="flex w-full grow flex-col items-stretch justify-center gap-2 p-6">
              <div className="flex items-center justify-between">
                <p className="text-slate-900 text-xl font-bold tracking-tight">
                  {t('admin') || 'Salon Owner'}
                </p>
                <span className="text-xs font-semibold text-accent uppercase tracking-widest px-2 py-1 bg-accent/10 rounded">
                  Partner
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('adminDesc') || 'Manage your staff, track bookings, and grow your brand with our premium business tools.'}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); handleAdminClick(); }}
                className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-lg h-12 bg-slate-900 text-white text-sm font-semibold transition-opacity hover:opacity-90"
              >
                {t('registerSalon') || 'Register Your Salon'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 text-center">
          <p className="text-slate-400 text-xs">
            {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
            <button onClick={() => navigate('/admin/login')} className="text-accent font-medium hover:underline">
              {t('login') || 'Log in'}
            </button>
          </p>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
