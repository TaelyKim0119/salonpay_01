import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';
import { formatNumber } from '../utils/format';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signOut } = useAuth();
  const { currentSalon, clearSalon, showLoading, hideLoading, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalCustomers: 0,
    birthdayThisMonth: 0,
    returnRate: 0,
    totalRevenue: 0,
    monthlyVisits: 0
  });
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [recentVisits, setRecentVisits] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!currentSalon) {
      navigate('/admin/login');
      return;
    }
    loadDashboard();
  }, [currentSalon]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = customers.filter(c =>
        c.name?.includes(searchQuery) || c.phone?.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const loadDashboard = async () => {
    try {
      showLoading(t('loadingData'));
      const [allCustomers, dashStats, allVisits] = await Promise.all([
        sheetsDB.getAllCustomers(),
        sheetsDB.getDashboardStats(),
        sheetsDB.getAllVisits()
      ]);

      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);

      const sorted = [...allVisits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setRecentVisits(sorted.slice(0, 5));

      const today = new Date();
      const thisMonth = String(today.getMonth() + 1).padStart(2, '0');
      const birthdayThisMonth = allCustomers.filter(c =>
        c.birthday && c.birthday.startsWith(thisMonth)
      ).length;

      const returning = allCustomers.filter(c => c.visitCount >= 2);
      const returnRate = allCustomers.length > 0
        ? Math.round((returning.length / allCustomers.length) * 100) : 0;

      setStats({
        totalCustomers: allCustomers.length,
        birthdayThisMonth,
        returnRate,
        totalRevenue: dashStats.totalRevenue || 0,
        monthlyVisits: dashStats.monthlyVisits || 0
      });
      hideLoading();
    } catch (err) {
      hideLoading();
      console.error('대시보드 로드 오류:', err);
    }
  };

  const handleLogout = () => {
    signOut();
    clearSalon();
    navigate('/');
    showToast(t('logout'));
  };

  const handleCustomerClick = (customerId) => {
    navigate(`/admin/customer/${customerId}`);
  };

  const getCustomerName = (customerId) => {
    const c = customers.find(cust => cust.id === customerId);
    return c?.name || '-';
  };

  return (
    <div className="bg-bg-light font-sans text-slate-900 antialiased min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">

        {/* ═══ Header ═══ */}
        <header className="flex items-center justify-between px-4 lg:px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-rose-accent/10 p-2 rounded-lg text-rose-accent">
              <span className="material-symbols-outlined text-2xl">spa</span>
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold tracking-tight">{currentSalon?.salonName || t('admin')}</h1>
              <p className="text-[10px] lg:text-xs text-slate-500">Owner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={() => navigate('/admin/salon-code')} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-600">share</span>
            </button>
            <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-600">notifications</span>
            </button>
            <button
              onClick={handleLogout}
              className="h-10 w-10 rounded-full bg-rose-accent/20 border-2 border-rose-accent/50 flex items-center justify-center overflow-hidden text-rose-accent font-bold text-sm"
            >
              {currentSalon?.salonName?.charAt(0) || 'S'}
            </button>
          </div>
        </header>

        {/* ═══ Main Content ═══ */}
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto w-full">

          {/* ── Clients Tab (mobile) ── */}
          {activeTab === 'clients' && (
            <section className="lg:hidden space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t('customers') || 'Clients'}</h2>
                <span className="text-sm text-slate-500">{filteredCustomers.length}{t('people') || '명'}</span>
              </div>
              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchCustomer') || 'Search by name or phone...'}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              {/* Customer List */}
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer.id)}
                    className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer active:bg-slate-50 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-rose-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {customer.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatNumber(customer.points || 0)}P</p>
                      <p className="text-[10px] text-slate-400">{customer.visitCount || 0} {t('visits') || 'visits'}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-16 text-slate-300">
                    <span className="material-symbols-outlined text-4xl mb-2">person_search</span>
                    <p className="text-sm text-slate-400">{searchQuery ? (t('noSearchResults') || 'No results found') : (t('noCustomers') || 'No customers yet')}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Dashboard Tab ── */}
          <div className={`space-y-6 lg:space-y-8 ${activeTab !== 'dashboard' ? 'hidden lg:block' : ''}`}>

          {/* Summary Cards - 1col mobile, 3col desktop */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            {/* Revenue */}
            <div className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-3 lg:mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-600">payments</span>
                </div>
                <span className="text-emerald-600 text-xs font-semibold flex items-center bg-emerald-50 px-2 py-0.5 rounded-full">+12.5%</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">{t('monthlyRevenueTitle') || 'Monthly Revenue'}</p>
              <h3 className="text-2xl lg:text-3xl font-bold mt-1">{formatNumber(stats.totalRevenue)}{t('won')}</h3>
            </div>

            {/* Clients */}
            <div className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-3 lg:mb-4">
                <div className="p-2 bg-rose-accent/10 rounded-lg">
                  <span className="material-symbols-outlined text-rose-accent">group</span>
                </div>
                <span className="text-rose-accent text-xs font-semibold flex items-center bg-rose-accent/10 px-2 py-0.5 rounded-full">+4.2%</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">{t('totalCustomers') || 'Unique Clients'}</p>
              <h3 className="text-2xl lg:text-3xl font-bold mt-1">{formatNumber(stats.totalCustomers)}</h3>
            </div>

            {/* Retention */}
            <div className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-3 lg:mb-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <span className="material-symbols-outlined text-accent">analytics</span>
                </div>
                <span className="text-accent text-xs font-semibold flex items-center bg-accent/10 px-2 py-0.5 rounded-full">+2.1%</span>
              </div>
              <p className="text-slate-500 text-sm font-medium">{t('returnRate') || 'Retention Rate'}</p>
              <h3 className="text-2xl lg:text-3xl font-bold mt-1">{stats.returnRate}%</h3>
            </div>
          </section>

          {/* Chart + Top Customers - stacked mobile, side-by-side desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Weekly Visit Trends Chart */}
            <section className="lg:col-span-2 bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div>
                  <h2 className="text-base lg:text-lg font-bold">{t('weeklyVisitTrends') || 'Weekly Visit Trends'}</h2>
                  <p className="text-xs lg:text-sm text-slate-500">{t('visitTrendsDesc') || 'Visualizing salon foot traffic'}</p>
                </div>
                <select className="text-xs border-slate-200 rounded-lg px-2 py-1">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>
              </div>
              <div className="h-40 lg:h-64 w-full">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 200">
                  <defs>
                    <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="500" y1="40" y2="40" />
                  <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="500" y1="80" y2="80" />
                  <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="500" y1="120" y2="120" />
                  <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="500" y1="160" y2="160" />
                  <path fill="url(#chartFill)" d="M0,160 L70,140 L140,150 L210,80 L280,110 L350,40 L420,90 L500,60 L500,200 L0,200 Z" />
                  <path d="M0,160 L70,140 L140,150 L210,80 L280,110 L350,40 L420,90 L500,60" fill="none" stroke="#f472b6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                  {[70,140,210,280,350,420,500].map((cx, i) => {
                    const cy = [140,150,80,110,40,90,60][i];
                    return <circle key={i} cx={cx} cy={cy} fill="white" r="4" stroke="#f472b6" strokeWidth="2" />;
                  })}
                </svg>
              </div>
              <div className="flex justify-between mt-3 text-[10px] lg:text-xs font-medium text-slate-400 uppercase tracking-wider">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </section>

            {/* Top Customers */}
            <section className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-base lg:text-lg font-bold">{t('topCustomers') || 'Top Customers'}</h2>
                <button className="text-rose-accent text-xs font-semibold hover:underline">View all</button>
              </div>
              <div className="space-y-4 lg:space-y-6">
                {customers.slice(0, 4).map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                    onClick={() => handleCustomerClick(customer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-rose-accent flex items-center justify-center text-white font-bold text-sm">
                        {customer.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.visitCount || 0} Appointments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatNumber(customer.points || 0)}P</p>
                      <p className="text-[10px] text-emerald-500 font-bold uppercase">
                        {(customer.visitCount || 0) >= 10 ? 'VIP' : 'Regular'}
                      </p>
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <div className="text-center py-8 text-slate-300">
                    <span className="material-symbols-outlined text-3xl mb-2">group</span>
                    <p className="text-sm text-slate-400">{t('noCustomers') || 'No customers yet'}</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Recent Bookings - card list on mobile, table on desktop */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base lg:text-lg font-bold">{t('recentBookings') || 'Recent Bookings'}</h2>
              <button
                onClick={() => navigate('/admin/ai-analysis')}
                className="bg-accent hover:bg-accent/90 text-white px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors flex items-center gap-1 lg:gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span className="hidden sm:inline">New Booking</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

            {/* Mobile: card list */}
            <div className="lg:hidden p-4 space-y-2">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0">
                    <span className="material-symbols-outlined text-accent text-[18px]">content_cut</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{visit.service}</p>
                    <p className="text-[11px] text-slate-400">{getCustomerName(visit.customerId)} · {visit.date}</p>
                  </div>
                  <p className="text-sm font-bold shrink-0">{formatNumber(visit.finalAmount || 0)}{t('won')}</p>
                </div>
              ))}
              {recentVisits.length === 0 && (
                <div className="text-center py-10 text-slate-300">
                  <span className="material-symbols-outlined text-4xl">calendar_today</span>
                  <p className="text-sm text-slate-400 mt-2">{t('noHistory') || 'No bookings yet'}</p>
                </div>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {recentVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium">{visit.service}</td>
                      <td className="px-6 py-4">{getCustomerName(visit.customerId)}</td>
                      <td className="px-6 py-4 text-slate-500">{visit.date}</td>
                      <td className="px-6 py-4 font-bold">{formatNumber(visit.finalAmount || 0)}{t('won')}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </div>
        </main>

        {/* Settings Bottom Sheet */}
        {showSettings && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" onClick={() => setShowSettings(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="relative w-full max-w-md bg-white rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-[slideUp_0.3s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-bold mb-4">{t('settings') || 'Settings'}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => { setShowSettings(false); navigate('/admin/salon-code'); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent">qr_code_2</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{t('salonCode') || 'Salon Code'}</p>
                    <p className="text-xs text-slate-500">{t('shareSalonCode') || 'Share code with customers'}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
                </button>
                <button
                  onClick={() => { setShowSettings(false); navigate('/admin/ai-analysis'); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-rose-accent/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-rose-accent">auto_awesome</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{t('aiAnalysis') || 'AI Analysis'}</p>
                    <p className="text-xs text-slate-500">{t('aiAnalysisDesc') || 'AI-powered business insights'}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
                </button>
                <button
                  onClick={() => { setShowSettings(false); handleLogout(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-500">logout</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-600">{t('logout') || 'Logout'}</p>
                    <p className="text-xs text-slate-500">{t('logoutDesc') || 'Sign out of your account'}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav - mobile only */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-accent' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined" style={activeTab === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>grid_view</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('clients')} className={`flex flex-col items-center gap-1 ${activeTab === 'clients' ? 'text-accent' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined" style={activeTab === 'clients' ? { fontVariationSettings: "'FILL' 1" } : {}}>group</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Clients</span>
          </button>
          <button onClick={() => navigate('/admin/ai-analysis')} className="flex flex-col items-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">AI</span>
          </button>
          <button onClick={() => setShowSettings(true)} className={`flex flex-col items-center gap-1 ${showSettings ? 'text-accent' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
