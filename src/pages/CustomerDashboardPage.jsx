import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';
import { formatNumber, formatDate } from '../utils/format';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { t, formatDate: formatDateI18n } = useI18n();
  const { currentCustomer, setCurrentCustomer } = useApp();
  const [visits, setVisits] = useState([]);
  const [couponsCount, setCouponsCount] = useState(0);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (!currentCustomer) {
      navigate('/');
      return;
    }
    loadData();
  }, [currentCustomer]);

  const loadData = async () => {
    try {
      const customerVisits = await sheetsDB.getVisitsByCustomerId(currentCustomer.id);
      setVisits(customerVisits.slice(0, 5));
      const coupons = await sheetsDB.getActiveCouponsByCustomerId(currentCustomer.id);
      setCouponsCount(coupons.length);
    } catch (err) {
      console.error('데이터 로드 오류:', err);
    }
  };

  if (!currentCustomer) return null;

  const points = currentCustomer.points || 0;
  const statusLabel = points >= 5000 ? 'VIP' : points >= 2000 ? 'Gold Status' : 'Member';
  const firstLetter = (currentCustomer.name || '?').charAt(0).toUpperCase();
  const latestVisit = visits[0];

  return (
    <div className="bg-bg-light font-display text-slate-900 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full max-w-md lg:max-w-5xl mx-auto flex-col bg-white overflow-x-hidden shadow-2xl">

        {/* Header */}
        <header className="flex items-center p-6 lg:px-8 justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-full border-2 border-primary/20 p-0.5">
              <div className="bg-primary rounded-full size-full flex items-center justify-center text-white font-bold text-lg">
                {firstLetter}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                {t('welcomeBack') || 'Welcome back'}
              </p>
              <h2 className="text-slate-900 text-lg font-bold leading-tight">{currentCustomer.name}</h2>
            </div>
          </div>
          <button className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-600">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </header>

        {/* Loyalty Card */}
        <div className="px-6 lg:px-8 py-2">
          <div className="loyalty-gradient rounded-xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden group">
            {/* Decorative Pattern */}
            <div className="absolute top-[-20%] right-[-10%] opacity-20 pointer-events-none text-white">
              <span className="material-symbols-outlined text-[120px] rotate-12">auto_awesome</span>
            </div>
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">
                    {t('loyaltyPoints') || 'Loyalty Points'}
                  </p>
                  <p className="text-white text-3xl font-extrabold tracking-tight">
                    {formatNumber(points)} <span className="text-sm font-normal opacity-90">pts</span>
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                  <p className="text-white text-xs font-bold uppercase tracking-tighter">{statusLabel}</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="flex -space-x-2">
                  <div className="size-8 rounded-full border-2 border-primary bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xs">redeem</span>
                  </div>
                  <div className="size-8 rounded-full border-2 border-primary bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-xs">local_activity</span>
                  </div>
                </div>
                <button className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform active:scale-95">
                  {t('viewRewards') || 'View Rewards'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: two-column grid for coupons + recent session */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:px-8">

        {/* Coupons Highlight */}
        <div className="px-6 lg:px-0 py-4">
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-4 rounded-xl h-full">
            <div className="flex items-center gap-3">
              <div className="bg-primary size-10 rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm leading-tight">
                  {t('myCoupons') || 'My Coupons'}
                </p>
                <p className="text-primary text-xs font-medium">
                  {couponsCount} {t('availableForUse') || 'Available for use'}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary">chevron_right</span>
          </div>
        </div>

        {/* Upcoming Appointment (latest visit) */}
        {latestVisit && (
          <div className="px-6 lg:px-0 py-4">
            <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm h-full">
              <div className="p-4 flex justify-between items-center h-full">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">spa</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{t('recentSession') || 'Recent Session'}</p>
                    <p className="text-slate-900 font-bold">{latestVisit.service}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
                      <p className="text-slate-500 text-xs">
                        {formatDate(latestVisit.date, formatDateI18n)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">+{formatNumber(latestVisit.pointsEarned || 0)}P</p>
                  <p className="text-xs text-slate-400">{formatNumber(latestVisit.finalAmount || 0)}{t('won')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>{/* end desktop grid */}

        {/* Visit List */}
        {visits.length > 1 && (
          <section className="px-6 lg:px-8 py-4 mb-24 lg:mb-8">
            <h3 className="text-slate-900 text-lg font-bold mb-4">
              {t('visitHistory') || 'Visit History'}
            </h3>
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
              {visits.slice(1).map((visit) => (
                <div key={visit.id} className="flex gap-4 items-center lg:bg-slate-50 lg:p-4 lg:rounded-xl">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">local_activity</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-bold text-sm truncate">{visit.service}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {formatDate(visit.date, formatDateI18n)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">+{formatNumber(visit.pointsEarned || 0)}P</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {visits.length === 0 && (
          <section className="px-6 lg:px-8 py-4 mb-24 lg:mb-8">
            <div className="flex flex-col items-center justify-center py-12 text-slate-300">
              <span className="material-symbols-outlined text-[48px] mb-2">calendar_today</span>
              <p className="text-sm text-slate-400">{t('noHistory') || 'No visit history'}</p>
            </div>
          </section>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 flex justify-between items-center z-50">
          {[
            { key: 'home', icon: 'home', label: t('home') || 'Home', active: true },
            { key: 'history', icon: 'history', label: t('history') || 'History' },
            { key: 'coupons', icon: 'confirmation_number', label: t('coupons') || 'Coupons' },
            { key: 'profile', icon: 'person', label: t('profile') || 'Profile' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 flex-col items-center gap-1 ${
                  isActive ? 'text-primary' : 'text-slate-400'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >{tab.icon}</span>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
