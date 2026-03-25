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
    <div className="min-h-screen bg-bg-light font-sans relative lg:flex lg:flex-col lg:items-center lg:justify-center">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative flex h-auto min-h-screen lg:min-h-0 w-full lg:max-w-5xl flex-col overflow-x-hidden">
        {/* Header Section */}
        <div className="flex items-center p-4 pb-2 justify-between">
          <div className="text-slate-900 flex size-12 shrink-0 items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </div>
          <h2 className="text-slate-900 text-lg font-semibold leading-tight tracking-tight flex-1 text-center pr-12 uppercase tracking-widest text-xs opacity-60">
            SALONPAY
          </h2>
        </div>

        <div className="flex flex-col items-center px-6 pt-12 lg:pt-16 pb-8">
          <h1 className="tracking-tight text-[40px] lg:text-[52px] font-extrabold leading-none text-center">
            <span className="bg-gradient-to-r from-primary via-primary-dark to-rose-accent bg-clip-text text-transparent">Salon</span><span className="text-slate-900">Pay</span>
          </h1>
          <div className="w-12 h-1 bg-gradient-to-r from-accent to-primary rounded-full mt-4 mb-4" />
          <p className="text-slate-500 text-base lg:text-lg font-normal leading-relaxed text-center max-w-xs lg:max-w-lg">
            {t('appSubtitle') || 'Select your experience to begin your journey in premium beauty services.'}
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="px-6 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8 max-w-xl lg:max-w-4xl mx-auto w-full">
          {/* Customer Role */}
          <div
            onClick={handleCustomerClick}
            className="group relative flex flex-col items-stretch justify-start rounded-2xl shadow-sm border border-slate-200/50 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="relative w-full h-56 lg:h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800&q=80&auto=format&fit=crop"
                alt="Beautiful Hairstyle"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-5 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg">spa</span>
                </div>
                <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Beauty & Care</span>
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
            className="group relative flex flex-col items-stretch justify-start rounded-2xl shadow-sm border border-slate-200/50 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            <div className="relative w-full h-56 lg:h-64 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=800&q=80&auto=format&fit=crop"
                alt="Modern Salon Interior"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <div className="absolute bottom-4 left-5 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg">insights</span>
                </div>
                <span className="text-white/90 text-xs font-bold uppercase tracking-widest">Manage & Grow</span>
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
