import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';
import { formatNumber } from '../utils/format';

// ── Service category for pie chart ──
const SERVICE_CATS = [
  { keywords: ['염색', '컬러', 'color', 'Color', '글레이징', 'Balayage', 'balayage', '하이라이트', 'Highlight'], label: 'Color', color: '#8b5cf6' },
  { keywords: ['펌', 'パーマ', 'perm', 'Perm', '웨이브', '매직', 'ストレート'], label: 'Perm', color: '#ec4899' },
  { keywords: ['커트', 'cut', 'Cut', 'Trim', 'trim', '레이어', '컷'], label: 'Cut', color: '#3b82f6' },
  { keywords: ['클리닉', '트리트먼트', 'Treatment', 'treatment', '케라틴', '스파', 'spa', '스케일링', '영양', '두피'], label: 'Care', color: '#10b981' },
];
function getServiceCat(name) {
  for (const cat of SERVICE_CATS) {
    if (cat.keywords.some(k => (name || '').includes(k))) return cat;
  }
  return { label: 'Other', color: '#94a3b8' };
}

// ── Mini donut arcs for SVG ──
function miniDonutArcs(cx, cy, r, ir, segments, gapAngle = 0.04) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const active = segments.filter(s => s.value > 0);
  const gap = active.length > 1 ? gapAngle : 0;
  let cum = 0;
  return active.map((seg, i) => {
    const startAngle = (cum / total) * 2 * Math.PI - Math.PI / 2 + gap;
    cum += seg.value;
    const endAngle = (cum / total) * 2 * Math.PI - Math.PI / 2 - gap;
    if (endAngle <= startAngle) return null;
    const large = (endAngle - startAngle) > Math.PI ? 1 : 0;
    const sx = cx + r * Math.cos(startAngle);
    const sy = cy + r * Math.sin(startAngle);
    const ex = cx + r * Math.cos(endAngle);
    const ey = cy + r * Math.sin(endAngle);
    const six = cx + ir * Math.cos(startAngle);
    const siy = cy + ir * Math.sin(startAngle);
    const eix = cx + ir * Math.cos(endAngle);
    const eiy = cy + ir * Math.sin(endAngle);
    return (
      <path key={i}
        d={`M${sx},${sy} A${r},${r} 0 ${large} 1 ${ex},${ey} L${eix},${eiy} A${ir},${ir} 0 ${large} 0 ${six},${siy} Z`}
        fill={seg.color} opacity="0.85"
      />
    );
  });
}

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
  const [allVisits, setAllVisits] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('weekly');
  const [hoveredDot, setHoveredDot] = useState(null);

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
      const [allCustomers, dashStats, fetchedVisits] = await Promise.all([
        sheetsDB.getAllCustomers(),
        sheetsDB.getDashboardStats(),
        sheetsDB.getAllVisits()
      ]);

      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);
      setAllVisits(fetchedVisits);

      const sorted = [...fetchedVisits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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
        <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          <div className="lg:flex lg:gap-8">
          {/* Desktop: main content left, clients right */}
          <div className="flex-1 space-y-6 lg:space-y-8">

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

          {/* Summary Cards */}
          {(() => {
            const today = new Date();
            const thisYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const monthVisits = allVisits.filter(v => v.date && v.date.startsWith(thisYM));
            const monthRevenue = monthVisits.reduce((s, v) => s + (Number(v.amount) || 0), 0);
            const monthCustomerIds = [...new Set(monthVisits.map(v => v.customerId))];
            const monthClients = monthCustomerIds.length;
            const monthNewCustomers = monthCustomerIds.filter(cid => {
              const firstVisit = allVisits.filter(v => v.customerId === cid).sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
              return firstVisit && firstVisit.date && firstVisit.date.startsWith(thisYM);
            }).length;
            const monthCats = { Color: 0, Perm: 0, Cut: 0, Care: 0 };
            monthVisits.forEach(v => { const c = getServiceCat(v.service); if (monthCats[c.label] !== undefined) monthCats[c.label]++; });
            const monthTopCat = Object.entries(monthCats).sort((a, b) => b[1] - a[1])[0];
            const monthTopInfo = SERVICE_CATS.find(c => c.label === monthTopCat[0]);

            // 이번 주 (월~일)
            const dayOfWeek = today.getDay() || 7;
            const monday = new Date(today);
            monday.setDate(today.getDate() - dayOfWeek + 1);
            const weekDates = [];
            for (let i = 0; i < 7; i++) {
              const d = new Date(monday);
              d.setDate(monday.getDate() + i);
              weekDates.push(d.toISOString().slice(0, 10));
            }
            const weekVisits = allVisits.filter(v => v.date && weekDates.includes(v.date));
            const weekRevenue = weekVisits.reduce((s, v) => s + (Number(v.amount) || 0), 0);
            const weekCustomerIds = [...new Set(weekVisits.map(v => v.customerId))];
            const weekClients = weekCustomerIds.length;
            const weekNewCustomers = weekCustomerIds.filter(cid => {
              const allCidVisits = allVisits.filter(v => v.customerId === cid).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
              return allCidVisits.length > 0 && weekDates.includes(allCidVisits[0].date);
            }).length;
            const weekCats = { Color: 0, Perm: 0, Cut: 0, Care: 0 };
            weekVisits.forEach(v => { const c = getServiceCat(v.service); if (weekCats[c.label] !== undefined) weekCats[c.label]++; });
            const weekTopCat = Object.entries(weekCats).sort((a, b) => b[1] - a[1])[0];
            const weekTopInfo = SERVICE_CATS.find(c => c.label === weekTopCat[0]);

            // 데모용 fallback
            const mRev = monthRevenue || 12800000;
            const wRev = weekRevenue || 3250000;
            const mCli = monthClients || 42;
            const wCli = weekClients || 18;
            const mNew = monthNewCustomers || 8;
            const wNew = weekNewCustomers || 3;
            const mTop = monthTopInfo || SERVICE_CATS[0];
            const mTopCount = monthTopCat[1] || 15;
            const wTop = weekTopInfo || SERVICE_CATS[1];
            const wTopCount = weekTopCat[1] || 7;

            {/* 날짜 계산 */}
            const now = new Date();
            const mStart = `${now.getMonth() + 1}.1`;
            const mEnd = `${now.getMonth() + 1}.${now.getDate()}`;
            const wDay = now.getDay() || 7;
            const wStartDate = new Date(now); wStartDate.setDate(now.getDate() - wDay + 1);
            const wEndDate = new Date(now); wEndDate.setDate(now.getDate() - wDay + 7);
            const wStart = `${wStartDate.getMonth() + 1}.${wStartDate.getDate()}`;
            const wEnd = `${wEndDate.getMonth() + 1}.${wEndDate.getDate()}`;

            return (
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                {/* 이번달 매출 */}
                <div className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-50 rounded-lg">
                        <span className="material-symbols-outlined text-red-500 text-lg">calendar_month</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Month</span>
                        <p className="text-[11px] text-slate-300 font-medium">{mStart} ~ {mEnd}</p>
                      </div>
                    </div>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900">{formatNumber(Math.round(mRev / 10000))}<span className="text-sm font-bold text-slate-400 ml-0.5">만원</span></p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-slate-400 text-sm">group</span>{mCli}명</span>
                    <span className="text-slate-200">·</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-emerald-400 text-sm">person_add</span>신규 {mNew}명</span>
                  </div>
                  {/* Best Seller 강조 */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg" style={{ backgroundColor: mTop.color + '12' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: mTop.color + '25' }}>
                      <span className="material-symbols-outlined text-base" style={{ color: mTop.color }}>local_fire_department</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Seller</p>
                      <p className="text-sm font-extrabold" style={{ color: mTop.color }}>{mTop.label} <span className="text-slate-500 font-semibold text-xs">{mTopCount}건</span></p>
                    </div>
                  </div>
                </div>

                {/* 이번주 매출 */}
                <div className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 rounded-lg">
                        <span className="material-symbols-outlined text-blue-500 text-lg">date_range</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">This Week</span>
                        <p className="text-[11px] text-slate-300 font-medium">{wStart} ~ {wEnd}</p>
                      </div>
                    </div>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900">{formatNumber(Math.round(wRev / 10000))}<span className="text-sm font-bold text-slate-400 ml-0.5">만원</span></p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-slate-400 text-sm">group</span>{wCli}명</span>
                    <span className="text-slate-200">·</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-emerald-400 text-sm">person_add</span>신규 {wNew}명</span>
                  </div>
                  {/* Best Seller 강조 */}
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg" style={{ backgroundColor: wTop.color + '12' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: wTop.color + '25' }}>
                      <span className="material-symbols-outlined text-base" style={{ color: wTop.color }}>local_fire_department</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Best Seller</p>
                      <p className="text-sm font-extrabold" style={{ color: wTop.color }}>{wTop.label} <span className="text-slate-500 font-semibold text-xs">{wTopCount}건</span></p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Revenue Chart - full width */}
          <section className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div>
                  <h2 className="text-base lg:text-lg font-bold">{chartPeriod === 'weekly' ? (t('weeklyVisitTrends') || 'Weekly Revenue') : (t('monthlyRevenue') || 'Monthly Revenue')}</h2>
                  <p className="text-xs lg:text-sm text-slate-500">{chartPeriod === 'weekly' ? (t('visitTrendsDesc') || 'Last 7 days revenue breakdown') : (t('monthlyRevenueDesc') || 'Last 12 months revenue breakdown')}</p>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {['weekly', 'monthly'].map(p => (
                    <button key={p} onClick={() => setChartPeriod(p)}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-all ${chartPeriod === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                      {p === 'weekly' ? '7 Days' : '12 Months'}
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const today = new Date();
                let labels = [];
                let values = [];
                let periodVisits = [];
                const useDemo = sheetsDB.isDemoMode;

                const dummyWeekly = [
                    { amount: 420000, visits: [{ service: '커트', amount: 150000 }, { service: '염색', amount: 180000 }, { service: '트리트먼트', amount: 90000 }] },
                    { amount: 580000, visits: [{ service: '펌', amount: 200000 }, { service: '커트', amount: 120000 }, { service: '컬러', amount: 180000 }, { service: '클리닉', amount: 80000 }] },
                    { amount: 350000, visits: [{ service: '커트', amount: 180000 }, { service: '트리트먼트', amount: 100000 }, { service: '염색', amount: 70000 }] },
                    { amount: 670000, visits: [{ service: '발레아쥬', amount: 250000 }, { service: '펌', amount: 200000 }, { service: '커트', amount: 120000 }, { service: '스파', amount: 100000 }] },
                    { amount: 890000, visits: [{ service: '컬러 체인지', amount: 300000 }, { service: '디지털 펌', amount: 250000 }, { service: '커트', amount: 180000 }, { service: '클리닉', amount: 160000 }] },
                    { amount: 1250000, visits: [{ service: '하이라이트', amount: 350000 }, { service: 'S컬 펌', amount: 280000 }, { service: '커트', amount: 250000 }, { service: '영양 클리닉', amount: 200000 }, { service: '글레이징', amount: 170000 }] },
                    { amount: 730000, visits: [{ service: '펌', amount: 220000 }, { service: '커트', amount: 180000 }, { service: '염색', amount: 200000 }, { service: '두피 스케일링', amount: 130000 }] },
                ];

                const dummyMonthlyData = [
                  { amount: 8200000, visits: [{ service: '염색', amount: 3200000 }, { service: '펌', amount: 2100000 }, { service: '커트', amount: 1800000 }, { service: '클리닉', amount: 1100000 }] },
                  { amount: 6800000, visits: [{ service: '커트', amount: 2400000 }, { service: '컬러', amount: 2000000 }, { service: '펌', amount: 1500000 }, { service: '트리트먼트', amount: 900000 }] },
                  { amount: 9500000, visits: [{ service: '발레아쥬', amount: 3500000 }, { service: '펌', amount: 2800000 }, { service: '커트', amount: 2000000 }, { service: '스파', amount: 1200000 }] },
                  { amount: 11200000, visits: [{ service: '하이라이트', amount: 4000000 }, { service: '디지털 펌', amount: 3200000 }, { service: '커트', amount: 2500000 }, { service: '클리닉', amount: 1500000 }] },
                  { amount: 8700000, visits: [{ service: '염색', amount: 3000000 }, { service: '커트', amount: 2500000 }, { service: '펌', amount: 2000000 }, { service: '영양 클리닉', amount: 1200000 }] },
                  { amount: 9400000, visits: [{ service: '컬러 체인지', amount: 3300000 }, { service: '펌', amount: 2600000 }, { service: '커트', amount: 2200000 }, { service: '트리트먼트', amount: 1300000 }] },
                  { amount: 12800000, visits: [{ service: '발레아쥬', amount: 4500000 }, { service: 'S컬 펌', amount: 3500000 }, { service: '커트', amount: 2800000 }, { service: '두피 스케일링', amount: 2000000 }] },
                  { amount: 10500000, visits: [{ service: '글레이징', amount: 3800000 }, { service: '펌', amount: 2800000 }, { service: '커트', amount: 2400000 }, { service: '클리닉', amount: 1500000 }] },
                  { amount: 13800000, visits: [{ service: '하이라이트', amount: 5000000 }, { service: '디지털 펌', amount: 3800000 }, { service: '커트', amount: 3000000 }, { service: '영양 클리닉', amount: 2000000 }] },
                  { amount: 7600000, visits: [{ service: '커트', amount: 2800000 }, { service: '염색', amount: 2200000 }, { service: '펌', amount: 1600000 }, { service: '트리트먼트', amount: 1000000 }] },
                  { amount: 8900000, visits: [{ service: '컬러', amount: 3200000 }, { service: '펌', amount: 2400000 }, { service: '커트', amount: 2100000 }, { service: '스파', amount: 1200000 }] },
                  { amount: 11500000, visits: [{ service: '발레아쥬', amount: 4200000 }, { service: 'S컬 펌', amount: 3000000 }, { service: '커트', amount: 2600000 }, { service: '클리닉', amount: 1700000 }] },
                ];

                if (chartPeriod === 'weekly') {
                  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    const idx = 6 - i;
                    labels.push(dayNames[d.getDay()]);
                    if (useDemo) {
                      values.push(dummyWeekly[idx].amount);
                      periodVisits.push(dummyWeekly[idx].visits);
                    } else {
                      const ds = d.toISOString().slice(0, 10);
                      const dayV = allVisits.filter(v => v.date && v.date.startsWith(ds));
                      periodVisits.push(dayV);
                      values.push(dayV.reduce((s, v) => s + (Number(v.amount) || 0), 0));
                    }
                  }
                } else {
                  for (let i = 11; i >= 0; i--) {
                    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                    const idx = 11 - i;
                    labels.push(`${d.getMonth() + 1}월`);
                    if (useDemo) {
                      values.push(dummyMonthlyData[idx].amount);
                      periodVisits.push(dummyMonthlyData[idx].visits);
                    } else {
                      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const monthV = allVisits.filter(v => v.date && v.date.startsWith(ym));
                      periodVisits.push(monthV);
                      values.push(monthV.reduce((s, v) => s + (Number(v.amount) || 0), 0));
                    }
                  }
                }

                const hasData = values.some(v => v > 0);

                // 만원 단위 변환
                const valuesMan = values.map(v => Math.round(v / 10000));
                const maxVal = Math.max(...valuesMan, 1);
                const niceStep = chartPeriod === 'weekly' ? 50 : 500;
                const niceMax = Math.ceil(maxVal / niceStep) * niceStep || niceStep;
                const W = 500, H = 200, padL = 10, padR = 15, padT = 15, padB = 10;
                const chartW = W - padL - padR;
                const chartH = H - padT - padB;
                const n = valuesMan.length;
                const gap = chartW / (n - 1 || 1);

                const pts = valuesMan.map((v, i) => ({
                  x: padL + gap * i,
                  y: padT + chartH - (v / niceMax) * chartH
                }));

                // 각 기간별 카테고리 비율
                const pieDatas = periodVisits.map(visits => {
                  const cats = { Color: 0, Perm: 0, Cut: 0, Care: 0, Other: 0 };
                  visits.forEach(v => { cats[getServiceCat(v.service).label] += (Number(v.amount) || 0); });
                  return SERVICE_CATS.map(c => ({ label: c.label, color: c.color, value: cats[c.label] || 0 }))
                    .concat([{ label: 'Other', color: '#94a3b8', value: cats.Other || 0 }]);
                });

                const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
                  y: padT + chartH * (1 - r),
                  label: Math.round(niceMax * r)
                }));

                // Catmull-Rom smooth curve
                const smoothLine = (points) => {
                  if (points.length < 2) return '';
                  let d = `M${points[0].x},${points[0].y}`;
                  for (let i = 0; i < points.length - 1; i++) {
                    const p0 = points[i - 1] || points[i];
                    const p1 = points[i];
                    const p2 = points[i + 1];
                    const p3 = points[i + 2] || p2;
                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;
                    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                  }
                  return d;
                };

                const curvePath = smoothLine(pts);
                const areaPath = curvePath + ` L${pts[pts.length - 1].x},${padT + chartH} L${pts[0].x},${padT + chartH} Z`;
                const dotR = chartPeriod === 'weekly' ? 9 : 7;
                const innerR = chartPeriod === 'weekly' ? 5 : 4;

                // 최고/최저 매출 인덱스
                const maxIdx = valuesMan.indexOf(Math.max(...valuesMan));
                const minIdx = valuesMan.indexOf(Math.min(...valuesMan));
                const maxTopCat = [...pieDatas[maxIdx]].filter(s => s.value > 0).sort((a, b) => b.value - a.value)[0];
                const minTopCat = [...pieDatas[minIdx]].filter(s => s.value > 0).sort((a, b) => b.value - a.value)[0];

                return (
                  <>
                    <div className="flex h-52 lg:h-80 w-full">
                      {/* Y축 라벨 (SVG 바깥) */}
                      <div className="flex flex-col justify-between shrink-0 w-12 lg:w-14 text-right pr-2" style={{ paddingTop: `${(padT / H) * 100}%`, paddingBottom: `${(padB / H) * 100}%` }}>
                        {[...yTicks].reverse().map((tick, i) => (
                          <span key={i} className="text-[10px] lg:text-xs text-slate-400 font-medium leading-none">
                            {tick.label > 0 ? `${tick.label}만` : '0'}
                          </span>
                        ))}
                      </div>
                      {/* 차트 SVG */}
                      <div className="flex-1 min-w-0 relative" onMouseLeave={() => setHoveredDot(null)}>
                        <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.12" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                            <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                              <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodColor="#000" floodOpacity="0.1" />
                            </filter>
                          </defs>
                          {yTicks.map((tick, i) => (
                            i > 0 ? <line key={i} stroke="#f1f5f9" strokeWidth="0.5" x1={padL} x2={W - padR} y1={tick.y} y2={tick.y} /> : null
                          ))}
                          <path fill="url(#chartFill)" d={areaPath} />
                          <path d={curvePath} fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          {/* Mini donut pie around each dot */}
                          {pts.map((p, i) => (
                            <g key={i} filter="url(#dotShadow)" className="cursor-pointer"
                              onMouseEnter={() => setHoveredDot({ idx: i, x: p.x / W * 100, y: p.y / H * 100, label: labels[i], pie: pieDatas[i], total: valuesMan[i] })}>
                              {/* 최고/최저 강조 링 */}
                              {i === maxIdx && <circle cx={p.x} cy={p.y} r={dotR + 3} fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.7" />}
                              {i === minIdx && <circle cx={p.x} cy={p.y} r={dotR + 3} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.7" />}
                              <circle cx={p.x} cy={p.y} r={dotR + 0.5} fill="white" opacity="0.6" />
                              {miniDonutArcs(p.x, p.y, dotR, innerR, pieDatas[i])}
                              <circle cx={p.x} cy={p.y} r={innerR} fill="white" />
                              <circle cx={p.x} cy={p.y} r="1.2" fill="#8b5cf6" opacity="0.5" />
                              {/* 투명한 큰 hit area */}
                              <circle cx={p.x} cy={p.y} r={dotR + 4} fill="transparent" />
                            </g>
                          ))}
                          {/* Peak — 빨간 붓펜 상승 화살표 */}
                          <g>
                            <path d={`M${pts[maxIdx].x} ${pts[maxIdx].y - dotR - 4} l0 -12`}
                              stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                            <path d={`M${pts[maxIdx].x - 3.5} ${pts[maxIdx].y - dotR - 12} l3.5 -5 l3.5 5`}
                              stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
                            <text x={pts[maxIdx].x} y={pts[maxIdx].y - dotR - 23} textAnchor="middle" fill="#ef4444" fontSize="5.5" fontWeight="600" opacity="0.9">
                              {valuesMan[maxIdx]}만
                            </text>
                          </g>
                          {/* Low — 파란 붓펜 하강 화살표 */}
                          <g>
                            <path d={`M${pts[minIdx].x} ${pts[minIdx].y + dotR + 4} l0 12`}
                              stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                            <path d={`M${pts[minIdx].x - 3.5} ${pts[minIdx].y + dotR + 12} l3.5 5 l3.5 -5`}
                              stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
                            <text x={pts[minIdx].x} y={pts[minIdx].y + dotR + 27} textAnchor="middle" fill="#3b82f6" fontSize="5.5" fontWeight="600" opacity="0.9">
                              {valuesMan[minIdx]}만
                            </text>
                          </g>
                        </svg>
                        {/* Hover 툴팁 */}
                        {hoveredDot && (() => {
                          const top = pieDatas[hoveredDot.idx]
                            .filter(s => s.value > 0)
                            .sort((a, b) => b.value - a.value)[0];
                          if (!top) return null;
                          const topMan = Math.round(top.value / 10000);
                          const isRight = hoveredDot.x > 70;
                          return (
                            <div
                              className="absolute z-20 pointer-events-none bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2.5 min-w-[120px]"
                              style={{
                                left: isRight ? 'auto' : `${hoveredDot.x}%`,
                                right: isRight ? `${100 - hoveredDot.x}%` : 'auto',
                                top: `${Math.max(hoveredDot.y - 25, 0)}%`,
                                transform: isRight ? 'translateX(-4px)' : 'translateX(4px)',
                              }}
                            >
                              <p className="text-[10px] text-slate-400 font-semibold mb-1">{hoveredDot.label} · {hoveredDot.total}만원</p>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: top.color }} />
                                <span className="text-xs font-bold text-slate-800">{top.label}</span>
                                <span className="text-xs text-slate-500">{topMan}만원</span>
                              </div>
                              {pieDatas[hoveredDot.idx].filter(s => s.value > 0).slice(1, 3).map((s, si) => (
                                <div key={si} className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: s.color }} />
                                  <span className="text-[10px] text-slate-500">{s.label}</span>
                                  <span className="text-[10px] text-slate-400">{Math.round(s.value / 10000)}만</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {/* X labels */}
                    <div className="flex justify-between mt-2 pl-12 lg:pl-14 pr-1 text-[10px] lg:text-xs font-medium text-slate-400">
                      {labels.map((l, i) => <span key={i}>{l}</span>)}
                    </div>
                    {/* Legend */}
                    <div className="flex justify-center gap-4 mt-3">
                      {SERVICE_CATS.map(c => (
                        <div key={c.label} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                          <span className="text-[10px] text-slate-500 font-medium">{c.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* 이주 / 이번년 분포 오버레이 도넛 */}
                    {(() => {
                      // 이번 주 aggregate
                      const weekAgg = { Color: 0, Perm: 0, Cut: 0, Care: 0 };
                      const yearAgg = { Color: 0, Perm: 0, Cut: 0, Care: 0 };

                      if (chartPeriod === 'weekly') {
                        // 주간: 전체 7일 합산 = 이번주
                        periodVisits.forEach(visits => {
                          visits.forEach(v => {
                            const cat = getServiceCat(v.service);
                            if (weekAgg[cat.label] !== undefined) weekAgg[cat.label] += (Number(v.amount) || 0);
                          });
                        });
                        // 이번 해: allVisits 전체
                        const curYear = String(new Date().getFullYear());
                        const yearVisitsArr = sheetsDB.isDemoMode
                          ? dummyMonthlyData.flatMap(m => m.visits)
                          : allVisits.filter(v => v.date && v.date.startsWith(curYear));
                        yearVisitsArr.forEach(v => {
                          const cat = getServiceCat(v.service);
                          if (yearAgg[cat.label] !== undefined) yearAgg[cat.label] += (Number(v.amount) || 0);
                        });
                      } else {
                        // 월간: 이번주 = 직접 계산
                        const nowD = new Date();
                        const dow = nowD.getDay() || 7;
                        const mon = new Date(nowD); mon.setDate(nowD.getDate() - dow + 1);
                        const wkDates = [];
                        for (let i = 0; i < 7; i++) { const dd = new Date(mon); dd.setDate(mon.getDate() + i); wkDates.push(dd.toISOString().slice(0, 10)); }
                        if (sheetsDB.isDemoMode) {
                          const demoWk = dummyMonthlyData[11]?.visits || [];
                          demoWk.forEach(v => { const cat = getServiceCat(v.service); if (weekAgg[cat.label] !== undefined) weekAgg[cat.label] += (Number(v.amount) || 0); });
                        } else {
                          allVisits.filter(v => v.date && wkDates.includes(v.date)).forEach(v => {
                            const cat = getServiceCat(v.service); if (weekAgg[cat.label] !== undefined) weekAgg[cat.label] += (Number(v.amount) || 0);
                          });
                        }
                        // 이번 해: 12개월 전체 합산
                        periodVisits.forEach(visits => {
                          visits.forEach(v => {
                            const cat = getServiceCat(v.service);
                            if (yearAgg[cat.label] !== undefined) yearAgg[cat.label] += (Number(v.amount) || 0);
                          });
                        });
                      }

                      const weekSegs = SERVICE_CATS.map(c => ({ label: c.label, color: c.color, value: weekAgg[c.label] }));
                      const yearSegs = SERVICE_CATS.map(c => ({ label: c.label, color: c.color, value: yearAgg[c.label] }));
                      const weekTotal = weekSegs.reduce((s, x) => s + x.value, 0);
                      const yearTotal = yearSegs.reduce((s, x) => s + x.value, 0);

                      const OverlayDonut = ({ segs, total, title }) => {
                        const R = 36, IR = 22;
                        const size = R * 2 + 4;
                        return (
                          <div className="flex flex-col items-center">
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                              <circle cx={size / 2} cy={size / 2} r={R} fill="white" opacity="0.85" />
                              {miniDonutArcs(size / 2, size / 2, R, IR, segs, 0.06)}
                              <circle cx={size / 2} cy={size / 2} r={IR} fill="white" />
                              <text x={size / 2} y={size / 2 - 3} textAnchor="middle" fill="#334155" fontSize="8" fontWeight="800">
                                {total > 0 ? `${Math.round(total / 10000)}` : '0'}
                              </text>
                              <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fill="#94a3b8" fontSize="5.5" fontWeight="600">
                                만원
                              </text>
                            </svg>
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{title}</span>
                          </div>
                        );
                      };

                      return (
                        <div className="flex justify-center gap-6 lg:gap-10 mt-4 pt-4 border-t border-slate-50">
                          <OverlayDonut segs={weekSegs} total={weekTotal} title="This Week" />
                          <OverlayDonut segs={yearSegs} total={yearTotal} title="This Year" />
                        </div>
                      );
                    })()}
                    {/* 최고/최저 매출 인사이트 */}
                    <div className="flex gap-3 mt-5 pt-5 border-t border-slate-50">
                      {/* Peak */}
                      <div className="flex-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-white border border-red-100/60 p-4">
                        <div className="absolute -right-3 -top-3 opacity-[0.06]">
                          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M4 18 L10 10 Q12 7 14 10 L20 4" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M10 16 L10 4" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M5 8 L10 3 L15 8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Peak</span>
                          <span className="text-[10px] text-red-400 font-medium">{labels[maxIdx]}</span>
                        </div>
                        <p className="text-xl font-extrabold text-slate-900 tracking-tight">{valuesMan[maxIdx]}<span className="text-sm font-bold text-slate-400 ml-0.5">만원</span></p>
                        {maxTopCat && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: maxTopCat.color }} />
                            <span className="text-[11px] font-semibold text-slate-600">{maxTopCat.label}</span>
                            <span className="text-[11px] text-slate-400">{Math.round(maxTopCat.value / 10000)}만</span>
                          </div>
                        )}
                      </div>
                      {/* Low */}
                      <div className="flex-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100/60 p-4">
                        <div className="absolute -right-3 -top-3 opacity-[0.06]">
                          <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                            <path d="M4 4 L10 12 Q12 15 14 12 L20 18" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M10 4 L10 16" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M5 12 L10 17 L15 12" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Low</span>
                          <span className="text-[10px] text-blue-400 font-medium">{labels[minIdx]}</span>
                        </div>
                        <p className="text-xl font-extrabold text-slate-900 tracking-tight">{valuesMan[minIdx]}<span className="text-sm font-bold text-slate-400 ml-0.5">만원</span></p>
                        {minTopCat && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: minTopCat.color }} />
                            <span className="text-[11px] font-semibold text-slate-600">{minTopCat.label}</span>
                            <span className="text-[11px] text-slate-400">{Math.round(minTopCat.value / 10000)}만</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
          </section>

          {/* Top Customers */}
          <section className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-base lg:text-lg font-bold">{t('topCustomers') || 'Top Customers'}</h2>
              <button className="text-rose-accent text-xs font-semibold hover:underline">View all</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {customers.slice(0, 4).map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between cursor-pointer hover:bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-50 transition-colors"
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
                <div className="text-center py-8 text-slate-300 col-span-2">
                  <span className="material-symbols-outlined text-3xl mb-2">group</span>
                  <p className="text-sm text-slate-400">{t('noCustomers') || 'No customers yet'}</p>
                </div>
              )}
            </div>
          </section>

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

          </div>{/* end flex-1 main content */}

          {/* Desktop: Client sidebar */}
          <aside className="hidden lg:block w-80 shrink-0 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{t('customers') || 'Clients'}</h2>
                <span className="text-sm text-slate-500">{filteredCustomers.length}{t('people') || '명'}</span>
              </div>
              <div className="relative mb-4">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchCustomer') || 'Search...'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleCustomerClick(customer.id)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-rose-accent flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {customer.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{customer.name}</p>
                      <p className="text-[11px] text-slate-500">{customer.phone}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-8 text-slate-300">
                    <span className="material-symbols-outlined text-3xl mb-2">person_search</span>
                    <p className="text-sm text-slate-400">{searchQuery ? (t('noSearchResults') || 'No results') : (t('noCustomers') || 'No customers yet')}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          </div>{/* end lg:flex */}
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
