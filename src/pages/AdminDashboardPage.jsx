import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
function getCustomerLevel(totalSpent) {
  if (totalSpent >= 1000000) return { label: 'Diamond', short: 'D', icon: 'diamond', color: '#8b5cf6', bg: 'bg-violet-50', ring: 'ring-violet-200' };
  if (totalSpent >= 500000) return { label: 'Gold', short: 'G', icon: 'star', color: '#f59e0b', bg: 'bg-amber-50', ring: 'ring-amber-200' };
  if (totalSpent >= 200000) return { label: 'Silver', short: 'S', icon: 'workspace_premium', color: '#64748b', bg: 'bg-slate-100', ring: 'ring-slate-200' };
  return { label: 'Bronze', short: 'B', icon: 'loyalty', color: '#d97706', bg: 'bg-orange-50', ring: 'ring-orange-200' };
}

function getCustomerTotalSpent(customerId, visits) {
  return visits.filter(v => v.customerId === customerId).reduce((s, v) => s + (Number(v.amount) || 0), 0);
}

function getCustomerCats(customerId, visits) {
  const custVisits = visits.filter(v => v.customerId === customerId);
  const cats = [];
  const seen = new Set();
  for (let i = custVisits.length - 1; i >= 0 && cats.length < 3; i--) {
    const cat = getServiceCat(custVisits[i].service);
    if (!seen.has(cat.label)) { seen.add(cat.label); cats.push(cat); }
  }
  return cats;
}

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
  const [bookings, setBookings] = useState([]);
  const [allCoupons, setAllCoupons] = useState([]);
  const [couponSort, setCouponSort] = useState('rate'); // 'rate' | 'issued' | 'speed'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('weekly');
  const [hoveredDot, setHoveredDot] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null); // 모바일 차트 확대 모달

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
      const [allCustomers, dashStats, fetchedVisits, fetchedBookings, fetchedCoupons] = await Promise.all([
        sheetsDB.getAllCustomers(),
        sheetsDB.getDashboardStats(),
        sheetsDB.getAllVisits(),
        sheetsDB.getAllBookings(),
        sheetsDB.getAllCoupons()
      ]);
      setBookings(fetchedBookings.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));
      setAllCoupons(fetchedCoupons);

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
                {filteredCustomers.map((customer) => {
                  const totalSpent = getCustomerTotalSpent(customer.id, allVisits);
                  const level = getCustomerLevel(totalSpent);
                  const cats = getCustomerCats(customer.id, allVisits);
                  return (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerClick(customer.id)}
                      className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-pointer active:bg-slate-50 transition-colors"
                    >
                      <div className={`w-11 h-11 rounded-full ${level.bg} ring-2 ${level.ring} flex items-center justify-center shrink-0`}>
                        <span className="text-sm font-black" style={{ color: level.color }}>{level.short}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold truncate">{customer.name}</p>
                          {cats.map((cat, ci) => (
                            <div key={ci} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} title={cat.label} />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-bold" style={{ color: level.color }}>{level.label} Class</span>
                          <span className="text-slate-200">·</span>
                          <span className="text-[10px] text-slate-400">{customer.phone}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">{formatNumber(Math.round(totalSpent / 10000))}<span className="text-[10px] text-slate-400 ml-0.5">만</span></p>
                        <p className="text-[10px] text-slate-400">{customer.visitCount || 0}회</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                    </div>
                  );
                })}
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
              <section className="rounded-2xl overflow-hidden shadow-md border border-slate-100 relative">
                {/* 배경 이미지 — PC: 전체 배경 / 모바일: 상단 */}
                <div className="relative w-full aspect-[16/7] lg:aspect-[21/9] overflow-hidden">
                  <img src="/images/admin-hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/60 to-slate-900/30" />

                  {/* 살롱 이름 뱃지 */}
                  <div className="absolute top-3 right-3 lg:top-4 lg:right-5">
                    <span className="px-3 py-1.5 bg-white/15 backdrop-blur-md text-[10px] font-bold text-white/90 uppercase tracking-widest rounded-full border border-white/20">
                      {currentSalon?.salonName || 'Salon'}
                    </span>
                  </div>

                  {/* 사진 위에 매출 데이터 오버레이 */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5 lg:p-7">
                    {/* This Month */}
                    <div className="mb-4 lg:mb-5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-orange-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">This Month</span>
                        <span className="text-[10px] text-white/25 ml-1">{mStart} ~ {mEnd}</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <p className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-none drop-shadow-lg">
                          {formatNumber(Math.round(mRev / 10000))}<span className="text-sm lg:text-base font-semibold text-white/40 ml-1">만원</span>
                        </p>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-white/40">{mCli}명</span>
                          <span className="text-emerald-400">+{mNew} new</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: mTop.color + '30', color: mTop.color }}>{mTop.label} {mTopCount}건</span>
                        </div>
                      </div>
                    </div>

                    {/* 구분선 */}
                    <div className="border-t border-white/10 mb-4 lg:mb-5 w-2/3" />

                    {/* This Week */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-blue-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>date_range</span>
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">This Week</span>
                        <span className="text-[10px] text-white/25 ml-1">{wStart} ~ {wEnd}</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <p className="text-2xl lg:text-4xl font-black text-white/90 tracking-tight leading-none drop-shadow-lg">
                          {formatNumber(Math.round(wRev / 10000))}<span className="text-xs lg:text-sm font-semibold text-white/30 ml-1">만원</span>
                        </p>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-white/40">{wCli}명</span>
                          <span className="text-emerald-400">+{wNew} new</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: wTop.color + '30', color: wTop.color }}>{wTop.label} {wTopCount}건</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Revenue Chart - full width */}
          <section id="chart-revenue-src" className="bg-white p-5 lg:p-8 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <div>
                  <h2 className="text-base lg:text-lg font-bold">{chartPeriod === 'weekly' ? (t('weeklyVisitTrends') || 'Weekly Revenue') : (t('monthlyRevenue') || 'Monthly Revenue')}</h2>
                  <p className="text-xs lg:text-sm text-slate-500">{chartPeriod === 'weekly' ? (t('visitTrendsDesc') || 'Last 7 days revenue breakdown') : (t('monthlyRevenueDesc') || 'Last 12 months revenue breakdown')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {['weekly', 'monthly'].map(p => (
                      <button key={p} onClick={() => setChartPeriod(p)}
                        className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-all ${chartPeriod === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                        {p === 'weekly' ? '7 Days' : '12 Months'}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setExpandedChart('revenue')}
                    className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                    <span className="material-symbols-outlined text-slate-500 text-[16px]">open_in_full</span>
                  </button>
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
                const dotR = chartPeriod === 'weekly' ? 8 : 6;

                // 각 포인트의 최다 판매 카테고리 색상
                const topCatColors = pieDatas.map(pie => {
                  const sorted = [...pie].filter(s => s.value > 0).sort((a, b) => b.value - a.value);
                  return sorted[0] || { label: 'Other', color: '#94a3b8', value: 0 };
                });

                // 최고/최저 매출 인덱스
                const maxIdx = valuesMan.indexOf(Math.max(...valuesMan));
                const minIdx = valuesMan.indexOf(Math.min(...valuesMan));

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
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.08" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                            {/* 수채화 필터 */}
                            <filter id="watercolor" x="-40%" y="-40%" width="180%" height="180%">
                              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                              <feDisplacementMap in="blur" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced" />
                              <feComposite in="displaced" in2="SourceGraphic" operator="atop" />
                            </filter>
                            <filter id="wcGlow" x="-60%" y="-60%" width="220%" height="220%">
                              <feGaussianBlur stdDeviation="3" result="glow" />
                              <feMerge>
                                <feMergeNode in="glow" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          {yTicks.map((tick, i) => (
                            i > 0 ? <line key={i} stroke="#f1f5f9" strokeWidth="0.5" x1={padL} x2={W - padR} y1={tick.y} y2={tick.y} /> : null
                          ))}
                          <path fill="url(#chartFill)" d={areaPath} />
                          <path d={curvePath} fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" opacity="0.6" />
                          {/* 수채화 동그라미 */}
                          {pts.map((p, i) => {
                            const col = topCatColors[i].color;
                            const isMax = i === maxIdx;
                            const isMin = i === minIdx;
                            const r = isMax || isMin ? dotR + 2 : dotR;
                            return (
                              <g key={i} className="cursor-pointer"
                                onMouseEnter={() => setHoveredDot({ idx: i, x: p.x / W * 100, y: p.y / H * 100, label: labels[i], pie: pieDatas[i], total: valuesMan[i] })}>
                                {/* 수채화 번짐 (glow) */}
                                <circle cx={p.x} cy={p.y} r={r + 4} fill={col} opacity="0.12" filter="url(#wcGlow)" />
                                {/* 수채화 메인 원 */}
                                <circle cx={p.x} cy={p.y} r={r} fill={col} opacity="0.55" filter="url(#watercolor)" />
                                {/* 중심 하이라이트 */}
                                <circle cx={p.x - 1} cy={p.y - 1} r={r * 0.35} fill="white" opacity="0.5" />
                                {/* Peak/Low 표시 */}
                                {isMax && <>
                                  <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.6" />
                                  <text x={p.x} y={p.y - r - 8} textAnchor="middle" fill="#ef4444" fontSize="5.5" fontWeight="700" opacity="0.85">{valuesMan[i]}만</text>
                                  <text x={p.x} y={p.y - r - 15} textAnchor="middle" fill="#ef4444" fontSize="4.5" fontWeight="800" opacity="0.7">Peak</text>
                                </>}
                                {isMin && <>
                                  <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.6" />
                                  <text x={p.x} y={p.y + r + 12} textAnchor="middle" fill="#3b82f6" fontSize="5.5" fontWeight="700" opacity="0.85">{valuesMan[i]}만</text>
                                  <text x={p.x} y={p.y + r + 19} textAnchor="middle" fill="#3b82f6" fontSize="4.5" fontWeight="800" opacity="0.7">Low</text>
                                </>}
                                {/* hit area */}
                                <circle cx={p.x} cy={p.y} r={r + 6} fill="transparent" />
                              </g>
                            );
                          })}
                        </svg>
                        {/* Hover 툴팁 */}
                        {hoveredDot && (() => {
                          const sorted = [...pieDatas[hoveredDot.idx]].filter(s => s.value > 0).sort((a, b) => b.value - a.value);
                          if (!sorted.length) return null;
                          const isRight = hoveredDot.x > 70;
                          return (
                            <div
                              className="absolute z-20 pointer-events-none bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 px-3 py-2.5 min-w-[120px]"
                              style={{
                                left: isRight ? 'auto' : `${hoveredDot.x}%`,
                                right: isRight ? `${100 - hoveredDot.x}%` : 'auto',
                                top: `${Math.max(hoveredDot.y - 25, 0)}%`,
                                transform: isRight ? 'translateX(-4px)' : 'translateX(4px)',
                              }}
                            >
                              <p className="text-[10px] text-slate-400 font-semibold mb-1.5">{hoveredDot.label} · {hoveredDot.total}만원</p>
                              {sorted.slice(0, 3).map((s, si) => (
                                <div key={si} className="flex items-center gap-1.5 mt-0.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color, opacity: si === 0 ? 1 : 0.5 }} />
                                  <span className={`text-xs ${si === 0 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{s.label}</span>
                                  <span className="text-xs text-slate-400">{Math.round(s.value / 10000)}만</span>
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
                        {topCatColors[maxIdx] && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topCatColors[maxIdx].color }} />
                            <span className="text-[11px] font-semibold text-slate-600">{topCatColors[maxIdx].label}</span>
                            <span className="text-[11px] text-slate-400">{Math.round(topCatColors[maxIdx].value / 10000)}만</span>
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
                        {topCatColors[minIdx] && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: topCatColors[minIdx].color }} />
                            <span className="text-[11px] font-semibold text-slate-600">{topCatColors[minIdx].label}</span>
                            <span className="text-[11px] text-slate-400">{Math.round(topCatColors[minIdx].value / 10000)}만</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
          </section>

          {/* Top & At-Risk Customers */}
          {(() => {
            // Top 5: 총 매출 기준
            const topCustomers = [...customers]
              .sort((a, b) => getCustomerTotalSpent(b.id, allVisits) - getCustomerTotalSpent(a.id, allVisits))
              .slice(0, 5);

            // At-Risk 분석
            const today = new Date();
            const atRiskList = customers.map(c => {
              const cVisits = allVisits
                .filter(v => v.customerId === c.id)
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              const lastVisitDate = cVisits[0]?.date ? new Date(cVisits[0].date) : null;
              const daysSince = lastVisitDate ? Math.floor((today - lastVisitDate) / 86400000) : 999;
              const totalSpent = getCustomerTotalSpent(c.id, allVisits);
              const visitCount = c.visitCount || 0;

              // 평균 방문 주기 계산
              let avgInterval = 30;
              if (cVisits.length >= 2) {
                const dates = cVisits.map(v => new Date(v.date)).sort((a, b) => a - b);
                const intervals = [];
                for (let i = 1; i < dates.length; i++) intervals.push((dates[i] - dates[i - 1]) / 86400000);
                avgInterval = Math.round(intervals.reduce((s, x) => s + x, 0) / intervals.length);
              }

              // 서비스 히스토리 분석
              const colorVisits = cVisits.filter(v => getServiceCat(v.service).label === 'Color');
              const permVisits = cVisits.filter(v => getServiceCat(v.service).label === 'Perm');
              const cutVisits = cVisits.filter(v => getServiceCat(v.service).label === 'Cut');
              const careVisits = cVisits.filter(v => getServiceCat(v.service).label === 'Care');
              const lastColorDate = colorVisits[0]?.date ? new Date(colorVisits[0].date) : null;
              const lastPermDate = permVisits[0]?.date ? new Date(permVisits[0].date) : null;
              const lastCareDate = careVisits[0]?.date ? new Date(careVisits[0].date) : null;
              const daysSinceColor = lastColorDate ? Math.floor((today - lastColorDate) / 86400000) : 999;
              const daysSincePerm = lastPermDate ? Math.floor((today - lastPermDate) / 86400000) : 999;
              const daysSinceCare = lastCareDate ? Math.floor((today - lastCareDate) / 86400000) : 999;

              // 고객 성향 파악
              const isColorLover = colorVisits.length >= 2;
              const isPermLover = permVisits.length >= 2;
              const isHighSpender = totalSpent >= 500000;
              const isTrendSensitive = cVisits.length >= 4 && [...new Set(cVisits.map(v => v.service))].length >= 4;

              // 위험 점수 & 이유 & 조언
              let riskScore = 0;
              const reasons = [];
              const coupons = [];

              // 1) 오래 안옴
              if (daysSince > avgInterval * 2) {
                riskScore += 40;
                reasons.push({ icon: 'schedule', text: `${daysSince}일째 미방문 (평균 ${avgInterval}일 주기)`, severity: 'high' });
                coupons.push({ type: 'winback', text: `"${c.name}님, 오랜만이에요!" Win-back 20% 쿠폰`, icon: 'replay' });
              } else if (daysSince > avgInterval * 1.5) {
                riskScore += 20;
                reasons.push({ icon: 'schedule', text: `${daysSince}일 미방문 — 주기보다 늦어지는 중`, severity: 'mid' });
                coupons.push({ type: 'loyalty', text: `재방문 감사 10% 할인 쿠폰`, icon: 'favorite' });
              }

              // 2) 염색 고객: 뿌리 리터치 시기
              if (isColorLover && daysSinceColor > 35) {
                riskScore += 25;
                reasons.push({ icon: 'palette', text: `염색한 지 ${daysSinceColor}일 — 뿌리 리터치 시기`, severity: daysSinceColor > 60 ? 'high' : 'mid' });
                coupons.push({ type: 'special', text: `뿌리 염색 15% 할인 쿠폰 + 문자 알림`, icon: 'palette' });
              }

              // 3) 펌 고객: 펌 유지 시기
              if (isPermLover && daysSincePerm > 75) {
                riskScore += 20;
                reasons.push({ icon: 'waves', text: `펌한 지 ${daysSincePerm}일 — 컬 유지/리펌 시기`, severity: 'mid' });
                coupons.push({ type: 'special', text: `리펌 or 셋팅 20% 할인 쿠폰`, icon: 'waves' });
              }

              // 4) 트렌드 민감 고객: 신규 스타일 추천
              if (isTrendSensitive && daysSince > 21) {
                riskScore += 15;
                reasons.push({ icon: 'trending_up', text: '다양한 시술 경험 — 트렌드에 민감', severity: 'low' });
                coupons.push({ type: 'special', text: `이달의 신규 스타일 체험 쿠폰`, icon: 'auto_awesome' });
              }

              // 5) 방문 빈도 감소
              if (cVisits.length >= 6) {
                const recent3 = cVisits.slice(0, 3).map(v => new Date(v.date));
                const prev3 = cVisits.slice(3, 6).map(v => new Date(v.date));
                const recentSpan = (recent3[0] - recent3[2]) / 86400000;
                const prevSpan = (prev3[0] - prev3[2]) / 86400000;
                if (recentSpan > prevSpan * 1.8) {
                  riskScore += 25;
                  reasons.push({ icon: 'trending_down', text: '방문 간격이 점점 넓어지고 있음', severity: 'mid' });
                }
              }

              // 6) 매출 감소
              if (cVisits.length >= 4) {
                const recent2Amt = cVisits.slice(0, 2).reduce((s, v) => s + (Number(v.amount) || 0), 0);
                const prev2Amt = cVisits.slice(2, 4).reduce((s, v) => s + (Number(v.amount) || 0), 0);
                if (prev2Amt > 0 && recent2Amt < prev2Amt * 0.6) {
                  riskScore += 20;
                  reasons.push({ icon: 'savings', text: '이전보다 낮은 금액 시술만 이용', severity: 'mid' });
                  coupons.push({ type: 'special', text: `프리미엄 시술 체험 쿠폰`, icon: 'auto_awesome' });
                }
              }

              // 7) 고가치 고객 이탈 위험
              if (isHighSpender && daysSince > 45) {
                riskScore += 15;
                reasons.push({ icon: 'diamond', text: `누적 ${Math.round(totalSpent / 10000)}만원 고객 — VIP 관리 필요`, severity: 'high' });
                if (!coupons.some(cp => cp.type === 'special')) coupons.push({ type: 'special', text: `VIP 전용 특별 서비스 쿠폰`, icon: 'star' });
              }

              // 8) 클리닉/케어 주기
              if (careVisits.length >= 1 && daysSinceCare > 40) {
                riskScore += 10;
                reasons.push({ icon: 'spa', text: `마지막 케어 ${daysSinceCare}일 전 — 관리 주기 지남`, severity: 'low' });
                coupons.push({ type: 'special', text: `두피/모발 클리닉 할인 쿠폰`, icon: 'spa' });
              }

              // 9) 생일 놓침
              if (c.birthday) {
                const bMonth = parseInt(c.birthday.substring(0, 2));
                const thisMonth = today.getMonth() + 1;
                if (bMonth === thisMonth && daysSince > 14) {
                  riskScore += 10;
                  reasons.push({ icon: 'cake', text: `이번달 생일! 축하 연락 필요`, severity: 'low' });
                  coupons.push({ type: 'birthday', text: `생일 축하 1만원 쿠폰 + 문자`, icon: 'cake' });
                }
              }

              // 10) 커트만 하는 고객: 업셀링 기회
              if (cutVisits.length >= 3 && colorVisits.length === 0 && permVisits.length === 0 && daysSince > 25) {
                riskScore += 10;
                reasons.push({ icon: 'content_cut', text: '커트만 이용 — 컬러/펌 경험 없음', severity: 'low' });
                coupons.push({ type: 'special', text: `첫 염색/펌 30% 할인 체험 쿠폰`, icon: 'palette' });
              }

              if (coupons.length === 0 && riskScore > 0) {
                coupons.push({ type: 'loyalty', text: '재방문 감사 쿠폰', icon: 'favorite' });
              }

              return { ...c, daysSince, riskScore, reasons, coupons, totalSpent, lastVisit: cVisits[0]?.date || null };
            })
              .filter(c => c.riskScore > 0)
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 5);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Top 5 */}
                <section className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-amber-500 text-lg">emoji_events</span>
                    <h2 className="text-base font-bold">Top Customers</h2>
                  </div>
                  <div className="space-y-2">
                    {topCustomers.map((customer, idx) => {
                      const totalSpent = getCustomerTotalSpent(customer.id, allVisits);
                      const level = getCustomerLevel(totalSpent);
                      const cats = getCustomerCats(customer.id, allVisits);
                      return (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerClick(customer.id)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors border border-slate-50"
                        >
                          <span className="text-[11px] font-black text-slate-300 w-4">{idx + 1}</span>
                          <div className={`w-9 h-9 rounded-full ${level.bg} ring-2 ${level.ring} flex items-center justify-center shrink-0`}>
                            <span className="text-[10px] font-black" style={{ color: level.color }}>{level.short}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-bold truncate">{customer.name}</p>
                              {cats.map((cat, ci) => (
                                <div key={ci} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: level.color }}>{level.label} Class</span>
                          </div>
                          <p className="text-sm font-bold shrink-0">{formatNumber(Math.round(totalSpent / 10000))}<span className="text-[10px] text-slate-400">만</span></p>
                        </div>
                      );
                    })}
                    {customers.length === 0 && (
                      <div className="text-center py-8 text-slate-300">
                        <span className="material-symbols-outlined text-3xl mb-2">group</span>
                        <p className="text-sm text-slate-400">{t('noCustomers') || 'No customers yet'}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* At-Risk 5 */}
                <section className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-red-100/50">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-red-400 text-lg">warning</span>
                    <h2 className="text-base font-bold">At-Risk Customers</h2>
                  </div>
                  <div className="space-y-3">
                    {atRiskList.map((c) => {
                      const level = getCustomerLevel(c.totalSpent);
                      const severityColor = c.riskScore >= 40 ? '#ef4444' : c.riskScore >= 20 ? '#f59e0b' : '#64748b';
                      return (
                        <div key={c.id} className="rounded-xl border border-slate-100 overflow-hidden">
                          {/* Header */}
                          <div
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => handleCustomerClick(c.id)}
                          >
                            <div className="relative">
                              <div className={`w-9 h-9 rounded-full ${level.bg} ring-2 ${level.ring} flex items-center justify-center shrink-0`}>
                                <span className="text-[10px] font-black" style={{ color: level.color }}>{level.short}</span>
                              </div>
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: severityColor }}>
                                <span className="material-symbols-outlined text-white text-[8px]">priority_high</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{c.name}</p>
                              <span className="text-[10px] text-slate-400">마지막 방문: {c.lastVisit || '없음'}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: severityColor + '15', color: severityColor }}>
                              {c.riskScore >= 40 ? 'High' : c.riskScore >= 20 ? 'Mid' : 'Low'}
                            </span>
                          </div>
                          {/* Reasons */}
                          <div className="px-3 pb-2 space-y-1">
                            {c.reasons.map((r, ri) => (
                              <div key={ri} className="flex items-center gap-2 py-1">
                                <span className="material-symbols-outlined text-sm" style={{ color: r.severity === 'high' ? '#ef4444' : r.severity === 'mid' ? '#f59e0b' : '#94a3b8' }}>{r.icon}</span>
                                <span className="text-[11px] text-slate-600">{r.text}</span>
                              </div>
                            ))}
                          </div>
                          {/* Coupon Strategy */}
                          {c.coupons.length > 0 && (
                            <div className="px-3 pb-3">
                              {c.coupons.slice(0, 2).map((cp, ci) => (
                                <button
                                  key={ci}
                                  onClick={(e) => { e.stopPropagation(); navigate('/admin/coupons'); }}
                                  className="flex items-center gap-2 w-full mt-1 px-3 py-2 bg-accent/5 border border-accent/15 rounded-lg hover:bg-accent/10 transition-colors text-left"
                                >
                                  <span className="material-symbols-outlined text-accent text-sm">{cp.icon}</span>
                                  <span className="text-[11px] font-semibold text-accent flex-1">{cp.text}</span>
                                  <span className="material-symbols-outlined text-accent/50 text-sm">arrow_forward</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {atRiskList.length === 0 && (
                      <div className="text-center py-8 text-slate-300">
                        <span className="material-symbols-outlined text-3xl mb-2">verified</span>
                        <p className="text-sm text-emerald-500 font-medium">모든 고객이 건강합니다!</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            );
          })()}

          {/* Bookings */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-5 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base lg:text-lg font-bold">Bookings</h2>
              <button
                onClick={() => navigate('/booking')}
                className="bg-accent hover:bg-accent/90 text-white px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors flex items-center gap-1 lg:gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span className="hidden sm:inline">New Booking</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>

            {/* 예약 리스트 */}
            <div className="p-4 lg:p-5 space-y-2">
              {bookings.filter(b => b.status !== 'cancelled').slice(0, 8).map((bk) => {
                const statusMap = {
                  pending: { label: 'Pending', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700' },
                  confirmed: { label: 'Confirmed', color: '#10b981', bg: 'bg-emerald-50 text-emerald-700' },
                  completed: { label: 'Done', color: '#6366f1', bg: 'bg-indigo-50 text-indigo-700' },
                };
                const st = statusMap[bk.status] || statusMap.pending;
                const isPast = bk.date < new Date().toISOString().split('T')[0];

                return (
                  <div key={bk.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${isPast ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-accent text-lg">event</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate">{bk.customerName || '(이름없음)'}</p>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${st.bg}`}>{st.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{bk.service} · {bk.date} {bk.time}</p>
                      {bk.memo && <p className="text-[10px] text-slate-300 mt-0.5">"{bk.memo}"</p>}
                    </div>
                    {bk.status === 'pending' && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={async () => { await sheetsDB.updateBookingStatus(bk.id, 'confirmed'); setBookings(prev => prev.map(b => b.id === bk.id ? { ...b, status: 'confirmed' } : b)); showToast('예약 확정!'); }}
                          className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                          title="확정"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                        </button>
                        <button
                          onClick={async () => { await sheetsDB.updateBookingStatus(bk.id, 'cancelled'); setBookings(prev => prev.map(b => b.id === bk.id ? { ...b, status: 'cancelled' } : b)); showToast('예약 취소'); }}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="취소"
                        >
                          <span className="material-symbols-outlined text-red-400 text-base">close</span>
                        </button>
                      </div>
                    )}
                    {bk.status === 'confirmed' && !isPast && (
                      <button
                        onClick={async () => { await sheetsDB.updateBookingStatus(bk.id, 'completed'); setBookings(prev => prev.map(b => b.id === bk.id ? { ...b, status: 'completed' } : b)); showToast('완료 처리'); }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-bold hover:bg-indigo-100 transition-colors shrink-0"
                      >
                        완료
                      </button>
                    )}
                  </div>
                );
              })}
              {bookings.filter(b => b.status !== 'cancelled').length === 0 && (
                <div className="text-center py-10 text-slate-300">
                  <span className="material-symbols-outlined text-4xl">calendar_today</span>
                  <p className="text-sm text-slate-400 mt-2">예약이 없습니다</p>
                </div>
              )}
            </div>
          </section>
          {/* ── Coupon Response Analysis ── */}
          {(() => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const typeLabels = { birthday: 'Birthday', loyalty: 'Loyalty', winback: 'Win-back', special: 'Special', referral: 'Referral' };
            const typeColors = { birthday: '#ec4899', loyalty: '#f59e0b', winback: '#8b5cf6', special: '#3b82f6', referral: '#10b981' };
            const typeIcons = { birthday: 'cake', loyalty: 'favorite', winback: 'replay', special: 'auto_awesome', referral: 'group_add' };

            if (allCoupons.length === 0) return null;

            // ── 이번달 / 이번주 기간 계산 ──
            const thisYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const mStart = `${today.getMonth() + 1}.1`;
            const mEnd = `${today.getMonth() + 1}.${today.getDate()}`;
            const dayOfWeek = today.getDay() || 7;
            const wMonday = new Date(today); wMonday.setDate(today.getDate() - dayOfWeek + 1);
            const wSunday = new Date(wMonday); wSunday.setDate(wMonday.getDate() + 6);
            const wStart = `${wMonday.getMonth() + 1}.${wMonday.getDate()}`;
            const wEnd = `${wSunday.getMonth() + 1}.${wSunday.getDate()}`;
            const weekDates = [];
            for (let i = 0; i < 7; i++) { const d = new Date(wMonday); d.setDate(wMonday.getDate() + i); weekDates.push(d.toISOString().slice(0, 10)); }

            const monthCoupons = allCoupons.filter(c => c.createdAt && c.createdAt.startsWith(thisYM));
            const weekCoupons = allCoupons.filter(c => c.createdAt && weekDates.includes(c.createdAt));

            const calcStats = (list) => ({
              total: list.length,
              used: list.filter(c => c.isUsed).length,
              expired: list.filter(c => !c.isUsed && c.expiryDate < todayStr).length,
              active: list.filter(c => !c.isUsed && c.expiryDate >= todayStr).length,
              rate: list.length > 0 ? Math.round((list.filter(c => c.isUsed).length / list.length) * 100) : 0,
            });
            const mStats = calcStats(monthCoupons);
            const wStats = calcStats(weekCoupons);

            // ── 최근 3개월 쿠폰 종합 데이터 ──
            const months3 = [];
            for (let i = 0; i < 3; i++) {
              const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
              const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              months3.push({ ym, label: `${d.getMonth() + 1}월` });
            }
            const coupons3m = allCoupons.filter(c => c.createdAt && months3.some(m => c.createdAt.startsWith(m.ym)));
            // 타입별 종합: 발행수, 사용수, 사용률, 반응시간
            const typeStatsMap = {};
            coupons3m.forEach(c => {
              if (!typeStatsMap[c.type]) typeStatsMap[c.type] = { issued: 0, used: 0, days: [] };
              typeStatsMap[c.type].issued++;
              if (c.isUsed && c.usedAt) {
                typeStatsMap[c.type].used++;
                typeStatsMap[c.type].days.push(Math.max(0, Math.round((new Date(c.usedAt) - new Date(c.createdAt)) / 86400000)));
              }
            });
            const responseData = Object.entries(typeStatsMap).map(([type, s]) => ({
              type,
              issued: s.issued,
              used: s.used,
              rate: s.issued > 0 ? Math.round((s.used / s.issued) * 100) : 0,
              avg: s.days.length > 0 ? Math.round(s.days.reduce((a, b) => a + b, 0) / s.days.length) : null,
              min: s.days.length > 0 ? Math.min(...s.days) : null,
              max: s.days.length > 0 ? Math.max(...s.days) : null,
              count: s.days.length,
              days: s.days,
            }));
            // 정렬
            const sortedData = [...responseData].sort((a, b) => {
              if (couponSort === 'rate') return b.rate - a.rate;
              if (couponSort === 'issued') return b.issued - a.issued;
              return (a.avg || 999) - (b.avg || 999); // speed: 빠른 순
            });
            const maxDays = Math.max(...responseData.filter(r => r.max !== null).map(r => r.max), 1);
            const bestPerformer = [...responseData].sort((a, b) => b.rate - a.rate)[0];
            // month3Data for AI eval
            const month3Data = months3.map(m => {
              const mc = allCoupons.filter(c => c.createdAt && c.createdAt.startsWith(m.ym));
              return { ...m, total: mc.length, used: mc.filter(c => c.isUsed).length };
            });

            // ── AI 평가 생성 ──
            const monthRates = month3Data.map(m => ({ label: m.label, rate: m.total > 0 ? Math.round((m.used / m.total) * 100) : 0, total: m.total }));
            const bestMonth = [...monthRates].sort((a, b) => b.rate - a.rate)[0];
            const thisMonthRate = monthRates[0];
            const lastMonthRate = monthRates[1];

            // 시즌 이벤트 감지
            const monthNum = today.getMonth() + 1;
            const seasonEvents = {
              1: '새해 프로모션', 2: '발렌타인데이', 3: '화이트데이',
              4: '봄시즌', 5: '가정의 달', 6: '여름 준비 시즌',
              7: '여름 바캉스', 8: '휴가 시즌', 9: '가을 시즌',
              10: '할로윈', 11: '블프 시즌', 12: '크리스마스/연말'
            };
            const fastestType = responseData[0];

            let evalIcon = 'insights';
            let evalColor = '#8b5cf6';
            let evalTitle = '';
            let evalDesc = '';

            if (thisMonthRate.rate >= (lastMonthRate?.rate || 0) && thisMonthRate.rate > 0) {
              evalIcon = 'trending_up';
              evalColor = '#10b981';
              evalTitle = `${thisMonthRate.label} 쿠폰 사용률 ${thisMonthRate.rate}% — ${bestMonth.label === thisMonthRate.label ? '최고치!' : '상승세!'}`;
              evalDesc = `${seasonEvents[monthNum]} 효과로 쿠폰 반응이 좋아요.${fastestType ? ` ${typeLabels[fastestType.type] || fastestType.type} 쿠폰이 평균 ${fastestType.avg}일만에 사용되어 반응이 가장 빠릅니다.` : ''} 이 흐름을 유지하며 타겟 쿠폰을 더 적극 활용해보세요.`;
            } else if (thisMonthRate.rate < (lastMonthRate?.rate || 0)) {
              evalIcon = 'trending_down';
              evalColor = '#f59e0b';
              evalTitle = `${thisMonthRate.label} 사용률 ${thisMonthRate.rate}% — 지난달 대비 하락`;
              evalDesc = `지난달(${lastMonthRate.rate}%) 대비 떨어졌어요. 유효기간을 짧게 설정하거나 문자 알림을 보내면 사용률을 올릴 수 있어요.${fastestType ? ` ${typeLabels[fastestType.type] || fastestType.type} 쿠폰(평균 ${fastestType.avg}일)에 집중해보세요.` : ''}`;
            } else {
              evalTitle = '쿠폰 데이터가 쌓이고 있어요';
              evalDesc = '다음달이면 더 정확한 트렌드 분석이 가능해요. 다양한 타입의 쿠폰을 발행해서 고객 반응을 테스트해보세요.';
            }

            return (
              <section id="chart-coupon-src" className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-500 text-lg">confirmation_number</span>
                    <h2 className="text-base font-bold">Coupon Analysis</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/admin/coupons')} className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-0.5">
                      쿠폰 발행<span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                    <button onClick={() => setExpandedChart('coupon')}
                      className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                      <span className="material-symbols-outlined text-slate-500 text-[16px]">open_in_full</span>
                    </button>
                  </div>
                </div>

                {/* ── 전체 쿠폰 현황 도넛 차트 ── */}
                {(() => {
                  const totalAll = allCoupons.length;
                  const usedAll = allCoupons.filter(c => c.isUsed).length;
                  const expiredAll = allCoupons.filter(c => !c.isUsed && c.expiryDate < todayStr).length;
                  const activeAll = allCoupons.filter(c => !c.isUsed && c.expiryDate >= todayStr).length;
                  const segs = [
                    { label: '사용됨', value: usedAll, color: '#10b981', icon: 'check_circle' },
                    { label: '진행중', value: activeAll, color: '#3b82f6', icon: 'hourglass_top' },
                    { label: '만료', value: expiredAll, color: '#ef4444', icon: 'timer_off' },
                  ];
                  const r = 46, cx = 56, cy = 56, stroke = 14;
                  const circumference = 2 * Math.PI * r;
                  let offset = 0;
                  const useRate = totalAll > 0 ? Math.round((usedAll / totalAll) * 100) : 0;
                  return (
                    <div className="mb-5 p-4 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                      <div className="flex items-center gap-4">
                        {/* 도넛 */}
                        <div className="relative shrink-0" style={{ width: 112, height: 112 }}>
                          <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
                            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                            {totalAll > 0 && segs.map((seg, si) => {
                              if (seg.value === 0) return null;
                              const pct = seg.value / totalAll;
                              const dashLen = pct * circumference;
                              const gap = segs.filter(s => s.value > 0).length > 1 ? 3 : 0;
                              const el = (
                                <circle key={si} cx={cx} cy={cy} r={r} fill="none"
                                  stroke={seg.color} strokeWidth={stroke}
                                  strokeDasharray={`${Math.max(dashLen - gap, 1)} ${circumference - Math.max(dashLen - gap, 1)}`}
                                  strokeDashoffset={-offset}
                                  strokeLinecap="round" className="transition-all duration-700" />
                              );
                              offset += dashLen;
                              return el;
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-extrabold text-slate-800">{totalAll}</span>
                            <span className="text-[9px] text-slate-400 font-semibold">총 발행</span>
                          </div>
                        </div>
                        {/* 범례 + 수치 */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {segs.map((seg, si) => {
                            const pct = totalAll > 0 ? Math.round((seg.value / totalAll) * 100) : 0;
                            return (
                              <div key={si}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                                  <span className="text-[11px] text-slate-500 flex-1">{seg.label}</span>
                                  <span className="text-[13px] font-extrabold text-slate-700">{seg.value}</span>
                                  <span className="text-[11px] font-bold w-9 text-right" style={{ color: seg.color }}>{pct}%</span>
                                </div>
                                <div className="ml-[18px] h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: seg.color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Best Performer 하이라이트 ── */}
                {bestPerformer && bestPerformer.rate > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-500 text-base">emoji_events</span>
                      <span className="text-[12px] font-extrabold text-emerald-700">
                        {typeLabels[bestPerformer.type]} 쿠폰: {bestPerformer.rate}% 전환{bestPerformer.rate === 100 ? ' 완료' : ''}
                      </span>
                      {bestPerformer.avg !== null && (
                        <span className="text-[10px] text-emerald-500 ml-auto">평균 {bestPerformer.avg}일 반응</span>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 쿠폰 타입별 분석 ── */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">쿠폰 타입별 분석</p>
                    <div className="flex gap-1">
                      {[
                        { key: 'rate', label: '사용률순', icon: 'percent' },
                        { key: 'issued', label: '발행순', icon: 'sort' },
                        { key: 'speed', label: '반응순', icon: 'speed' },
                      ].map(f => (
                        <button key={f.key} onClick={() => setCouponSort(f.key)}
                          className={`text-[9px] px-2 py-1 rounded-md font-semibold flex items-center gap-0.5 transition-all ${couponSort === f.key ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{f.icon}</span>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {sortedData.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-4">쿠폰 데이터가 없어요</p>
                  ) : (
                    <div className="space-y-3">
                      {sortedData.map((r, ri) => {
                        const color = typeColors[r.type] || '#94a3b8';
                        const rateColor = r.rate >= 80 ? '#10b981' : r.rate >= 50 ? '#3b82f6' : r.rate >= 25 ? '#f59e0b' : '#94a3b8';
                        const speedColor = r.avg !== null ? (r.avg <= 5 ? '#10b981' : r.avg <= 14 ? '#f59e0b' : '#ef4444') : '#94a3b8';
                        const barW = r.issued > 0 ? Math.max(r.rate, 4) : 0;
                        return (
                          <div key={r.type} className="p-3 rounded-xl border border-slate-50 bg-gradient-to-br from-white to-slate-50/50 hover:border-slate-200 transition-all">
                            {/* 헤더: 아이콘 + 이름 + 사용률 */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '15' }}>
                                <span className="material-symbols-outlined text-sm" style={{ color }}>{typeIcons[r.type] || 'confirmation_number'}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[12px] font-bold text-slate-700">{typeLabels[r.type] || r.type}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400">{r.issued}건 발행 · {r.used}건 사용</span>
                                  {r.avg !== null && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: speedColor + '15', color: speedColor }}>
                                      ~{r.avg}일
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xl font-extrabold" style={{ color: rateColor }}>{r.rate}</span>
                                <span className="text-[11px] font-bold" style={{ color: rateColor }}>%</span>
                              </div>
                            </div>
                            {/* 사용률 바 + 퍼센트 표시 */}
                            <div className="relative">
                              <div className="h-5 bg-slate-100 rounded-lg overflow-hidden relative">
                                <div className="absolute inset-y-0 left-0 rounded-lg transition-all" style={{ width: `${barW}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
                                {r.count > 0 && r.days.map((d, di) => (
                                  <div key={di} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full border border-white" style={{ left: `${Math.min(Math.max((d / maxDays) * 60 + 40, 2), 98)}%`, backgroundColor: color, opacity: 0.7 }} />
                                ))}
                                {r.used > 0 && (
                                  <div className="absolute inset-0 flex items-center px-2">
                                    <span className="text-[9px] font-bold" style={{ color: barW > 40 ? 'white' : color }}>{r.used}/{r.issued}</span>
                                  </div>
                                )}
                              </div>
                              {/* 막대 끝에 퍼센트 */}
                              <span className="absolute right-0 -top-0.5 text-[10px] font-extrabold" style={{ color: rateColor }}>{r.rate}%</span>
                            </div>
                            {r.avg !== null && (
                              <div className="flex justify-between mt-1.5">
                                <span className="text-[9px] text-slate-300">반응: 최소 {r.min}일 · 최대 {r.max}일</span>
                                <span className="text-[9px] font-semibold" style={{ color: speedColor }}>평균 {r.avg}일</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── AI 평가 ── */}
                <div className="p-4 rounded-xl border border-slate-100 bg-gradient-to-r from-violet-50/50 via-white to-emerald-50/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: evalColor + '15' }}>
                      <span className="material-symbols-outlined text-base" style={{ color: evalColor }}>{evalIcon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-800 mb-1">{evalTitle}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{evalDesc}</p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          </div>

          </div>{/* end flex-1 main content */}

          {/* Desktop: Client sidebar */}
          <aside className="hidden lg:block w-80 shrink-0 space-y-4">
            {/* Weekly/Monthly Insights */}
            {(() => {
              const today = new Date();
              const dayOfWeek = today.getDay() || 7;
              const monday = new Date(today); monday.setDate(today.getDate() - dayOfWeek + 1);
              const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);

              // 이번주 / 지난주 날짜
              const thisWeekDates = [];
              const lastWeekDates = [];
              for (let i = 0; i < 7; i++) {
                const tw = new Date(monday); tw.setDate(monday.getDate() + i); thisWeekDates.push(tw.toISOString().slice(0, 10));
                const lw = new Date(prevMonday); lw.setDate(prevMonday.getDate() + i); lastWeekDates.push(lw.toISOString().slice(0, 10));
              }

              // 이번달 / 지난달
              const thisYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
              const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              const prevYM = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

              // 카테고리별 집계
              const countCats = (visits) => {
                const cats = { Color: 0, Perm: 0, Cut: 0, Care: 0 };
                visits.forEach(v => { const c = getServiceCat(v.service); if (cats[c.label] !== undefined) cats[c.label]++; });
                return cats;
              };
              const revCats = (visits) => {
                const cats = { Color: 0, Perm: 0, Cut: 0, Care: 0 };
                visits.forEach(v => { const c = getServiceCat(v.service); if (cats[c.label] !== undefined) cats[c.label] += (Number(v.amount) || 0); });
                return cats;
              };

              const twVisits = allVisits.filter(v => v.date && thisWeekDates.includes(v.date));
              const lwVisits = allVisits.filter(v => v.date && lastWeekDates.includes(v.date));
              const tmVisits = allVisits.filter(v => v.date && v.date.startsWith(thisYM));
              const lmVisits = allVisits.filter(v => v.date && v.date.startsWith(prevYM));

              const twCats = countCats(twVisits);
              const lwCats = countCats(lwVisits);
              const tmCats = countCats(tmVisits);
              const lmCats = countCats(lmVisits);
              const twRev = revCats(twVisits);
              const lwRev = revCats(lwVisits);

              // 인사이트 생성
              const insights = [];

              // 주간 카테고리 비교
              SERVICE_CATS.forEach(cat => {
                const tw = twCats[cat.label] || 0;
                const lw = lwCats[cat.label] || 0;
                if (lw > 0 && tw < lw * 0.6) {
                  const drop = Math.round((1 - tw / lw) * 100);
                  insights.push({
                    type: 'warning',
                    icon: 'trending_down',
                    color: '#ef4444',
                    title: `${cat.label} 고객 ${drop}% 감소`,
                    desc: `이번주 ${tw}건 vs 지난주 ${lw}건`,
                    advice: cat.label === 'Color' ? '날씨나 계절 영향일 수 있어요. 염색 할인 쿠폰으로 고객을 유도해보세요.'
                      : cat.label === 'Perm' ? '펌 수요 감소 중. 시즌 트렌드 펌 프로모션을 고려해보세요.'
                      : cat.label === 'Care' ? '클리닉 방문 감소. 두피 진단 무료 이벤트로 재방문을 유도하세요.'
                      : '커트 손님이 줄었어요. 커트 + 케어 패키지 할인 쿠폰을 발행해보세요.',
                    couponText: `${cat.label} ${drop > 40 ? '20%' : '10%'} 할인 쿠폰 발행`,
                    couponIcon: cat.label === 'Color' ? 'palette' : cat.label === 'Perm' ? 'waves' : cat.label === 'Care' ? 'spa' : 'content_cut',
                  });
                } else if (lw > 0 && tw > lw * 1.3) {
                  const up = Math.round((tw / lw - 1) * 100);
                  insights.push({
                    type: 'positive',
                    icon: 'trending_up',
                    color: '#10b981',
                    title: `${cat.label} 고객 ${up}% 증가!`,
                    desc: `이번주 ${tw}건 vs 지난주 ${lw}건`,
                    advice: `${cat.label} 수요가 높아요! 프리미엄 ${cat.label} 메뉴를 추천하거나 업셀링 기회로 활용하세요.`,
                    couponText: null,
                  });
                }
              });

              // 전체 매출 비교
              const twTotal = twVisits.reduce((s, v) => s + (Number(v.amount) || 0), 0);
              const lwTotal = lwVisits.reduce((s, v) => s + (Number(v.amount) || 0), 0);
              if (lwTotal > 0 && twTotal < lwTotal * 0.7) {
                const drop = Math.round((1 - twTotal / lwTotal) * 100);
                // 가장 적게 줄어든(또는 유지된) 카테고리 찾기
                let bestCat = SERVICE_CATS[0];
                let bestRatio = 0;
                SERVICE_CATS.forEach(cat => {
                  const ratio = (lwRev[cat.label] || 1) > 0 ? (twRev[cat.label] || 0) / (lwRev[cat.label] || 1) : 0;
                  if (ratio > bestRatio) { bestRatio = ratio; bestCat = cat; }
                });
                insights.push({
                  type: 'alert',
                  icon: 'monitoring',
                  color: '#f59e0b',
                  title: `주간 매출 ${drop}% 하락`,
                  desc: `${Math.round(twTotal / 10000)}만 vs 지난주 ${Math.round(lwTotal / 10000)}만`,
                  advice: `${bestCat.label}은 비교적 유지 중이에요. ${bestCat.label} 고객 대상 추가 예약을 유도하고, 약한 카테고리엔 프로모션을 걸어보세요.`,
                  couponText: '타겟 프로모션 쿠폰 발행',
                  couponIcon: 'campaign',
                });
              }

              // 월간 비교
              if (lmVisits.length > 0) {
                const tmTotal = tmVisits.length;
                const lmTotal = lmVisits.length;
                if (tmTotal < lmTotal * 0.5 && today.getDate() > 14) {
                  insights.push({
                    type: 'warning',
                    icon: 'event_busy',
                    color: '#ef4444',
                    title: `이번달 방문 고객 수 부족`,
                    desc: `현재 ${tmTotal}명 (지난달 전체 ${lmTotal}명)`,
                    advice: '이번달 후반전이에요. 미방문 고객 대상 일괄 쿠폰 발행으로 남은 기간 매출을 끌어올리세요.',
                    couponText: '미방문 고객 일괄 쿠폰 발행',
                    couponIcon: 'group_add',
                  });
                }
              }

              // 데모모드일때 인사이트 샘플
              if (sheetsDB.isDemoMode && insights.length === 0) {
                insights.push(
                  {
                    type: 'warning', icon: 'trending_down', color: '#ef4444',
                    title: 'Color 고객 45% 감소',
                    desc: '이번주 3건 vs 지난주 6건',
                    advice: '비 오는 날씨가 계속되면서 염색 예약이 줄었어요. 우천 시 10% 할인 쿠폰을 발행하면 효과적이에요.',
                    couponText: '염색 우천 할인 쿠폰 발행', couponIcon: 'palette',
                  },
                  {
                    type: 'positive', icon: 'trending_up', color: '#10b981',
                    title: 'Cut 고객 30% 증가!',
                    desc: '이번주 8건 vs 지난주 6건',
                    advice: '커트 수요가 높아요! 커트 + 트리트먼트 패키지로 객단가를 높여보세요.',
                    couponText: null,
                  },
                  {
                    type: 'alert', icon: 'lightbulb', color: '#f59e0b',
                    title: '이번주 제안',
                    desc: '데이터 기반 전략',
                    advice: '트렌드 민감 고객 3명이 30일+ 미방문 중이에요. 신규 스타일 소개 문자와 체험 쿠폰으로 재방문을 유도하세요.',
                    couponText: '트렌드 고객 체험 쿠폰', couponIcon: 'auto_awesome',
                  }
                );
              }

              if (insights.length === 0) return null;

              return (
                <div className="rounded-2xl overflow-hidden shadow-md border border-slate-100">
                  {/* 헤더 — 전구 사진 배경 */}
                  <div className="relative h-28 lg:h-32 overflow-hidden">
                    <img src="/images/insights-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/40" />
                    <div className="absolute inset-0 flex items-center px-5 lg:px-6">
                      <div>
                        <p className="text-amber-300/80 text-[10px] font-bold uppercase tracking-widest mb-1">Data-driven</p>
                        <h2 className="text-white text-lg lg:text-xl font-black tracking-tight">Weekly Insights</h2>
                        <p className="text-white/40 text-[11px] mt-0.5">이번 주 살롱 데이터 분석 리포트</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-white/30 text-[10px]">{insights.length}개 인사이트</p>
                      </div>
                    </div>
                  </div>

                  {/* 인사이트 카드들 */}
                  <div className="bg-white p-4 lg:p-5 space-y-3">
                    {insights.slice(0, 4).map((ins, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 overflow-hidden hover:shadow-sm transition-shadow">
                        <div className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {/* 아이콘 */}
                            <div className="shrink-0 mt-0.5 size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ins.color + '12' }}>
                              <span className="material-symbols-outlined text-base" style={{ color: ins.color, fontVariationSettings: "'FILL' 1" }}>{ins.icon}</span>
                            </div>
                            {/* 텍스트 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[12px] font-bold text-slate-800">{ins.title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: ins.color + '15', color: ins.color }}>
                                  {ins.type === 'positive' ? 'UP' : ins.type === 'warning' ? 'DOWN' : 'TIP'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mb-1.5">{ins.desc}</p>
                              <p className="text-[11px] text-slate-600 leading-relaxed">{ins.advice}</p>
                            </div>
                          </div>
                        </div>
                        {ins.couponText && (
                          <button
                            onClick={() => navigate('/admin/coupons')}
                            className="flex items-center gap-2 w-full px-4 py-2.5 bg-slate-50 border-t border-slate-100 hover:bg-slate-100 transition-colors text-left group"
                          >
                            <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>{ins.couponIcon}</span>
                            <span className="text-[11px] font-semibold text-slate-600 flex-1">{ins.couponText}</span>
                            <span className="material-symbols-outlined text-slate-300 text-sm group-hover:text-slate-500 transition-colors">chevron_right</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Popular Services (Pie Chart per Month) ── */}
            {(() => {
              const today = new Date();
              const monthlyData = [];
              for (let i = 0; i < 3; i++) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = `${d.getMonth() + 1}월`;
                const monthVisits = allVisits.filter(v => v.date && v.date.startsWith(ym));
                const serviceMap = {};
                monthVisits.forEach(v => {
                  const name = v.service || 'Other';
                  if (!serviceMap[name]) serviceMap[name] = { count: 0, revenue: 0, cat: getServiceCat(name) };
                  serviceMap[name].count++;
                  serviceMap[name].revenue += (Number(v.amount) || 0);
                });
                const ranked = Object.entries(serviceMap)
                  .map(([name, data]) => ({ name, ...data }))
                  .sort((a, b) => b.revenue - a.revenue);
                const totalRev = ranked.reduce((s, r) => s + r.revenue, 0);
                monthlyData.push({ ym, label, visits: monthVisits.length, ranked, totalRev });
              }

              const useDemo = sheetsDB.isDemoMode;
              const demoData = [
                { label: `${today.getMonth() + 1}월`, visits: 38, totalRev: 6850000, ranked: [
                  { name: '발레아쥬 염색', count: 9, revenue: 2700000, cat: { label: 'Color', color: '#8b5cf6' } },
                  { name: 'S컬 펌', count: 7, revenue: 1960000, cat: { label: 'Perm', color: '#ec4899' } },
                  { name: '커트', count: 12, revenue: 1440000, cat: { label: 'Cut', color: '#3b82f6' } },
                  { name: '두피 클리닉', count: 5, revenue: 750000, cat: { label: 'Care', color: '#10b981' } },
                ]},
                { label: `${(today.getMonth()) || 12}월`, visits: 42, totalRev: 8420000, ranked: [
                  { name: '디지털 펌', count: 10, revenue: 2800000, cat: { label: 'Perm', color: '#ec4899' } },
                  { name: '하이라이트', count: 8, revenue: 2400000, cat: { label: 'Color', color: '#8b5cf6' } },
                  { name: '커트', count: 14, revenue: 1680000, cat: { label: 'Cut', color: '#3b82f6' } },
                  { name: '영양 클리닉', count: 6, revenue: 900000, cat: { label: 'Care', color: '#10b981' } },
                  { name: '매직 셋팅펌', count: 4, revenue: 640000, cat: { label: 'Perm', color: '#ec4899' } },
                ]},
                { label: `${(today.getMonth() - 1) || 12}월`, visits: 35, totalRev: 6900000, ranked: [
                  { name: '컬러 체인지', count: 8, revenue: 2400000, cat: { label: 'Color', color: '#8b5cf6' } },
                  { name: '볼륨 펌', count: 6, revenue: 1680000, cat: { label: 'Perm', color: '#ec4899' } },
                  { name: '커트', count: 11, revenue: 1320000, cat: { label: 'Cut', color: '#3b82f6' } },
                  { name: '두피 스케일링', count: 5, revenue: 650000, cat: { label: 'Care', color: '#10b981' } },
                  { name: '글레이징', count: 5, revenue: 850000, cat: { label: 'Color', color: '#8b5cf6' } },
                ]},
              ];

              const data = useDemo ? demoData : monthlyData.filter(m => m.visits > 0);
              if (data.length === 0) return null;

              // 파이차트 arc 생성
              const pieArcs = (items, total, cx, cy, r) => {
                if (total === 0) return null;
                let cum = 0;
                return items.map((item, i) => {
                  const startAngle = (cum / total) * 2 * Math.PI - Math.PI / 2;
                  cum += item.revenue;
                  const endAngle = (cum / total) * 2 * Math.PI - Math.PI / 2;
                  const gap = items.length > 1 ? 0.03 : 0;
                  const sa = startAngle + gap;
                  const ea = endAngle - gap;
                  if (ea <= sa) return null;
                  const large = (ea - sa) > Math.PI ? 1 : 0;
                  const ir = r * 0.55;
                  const sx = cx + r * Math.cos(sa), sy = cy + r * Math.sin(sa);
                  const ex = cx + r * Math.cos(ea), ey = cy + r * Math.sin(ea);
                  const six = cx + ir * Math.cos(sa), siy = cy + ir * Math.sin(sa);
                  const eix = cx + ir * Math.cos(ea), eiy = cy + ir * Math.sin(ea);
                  return (
                    <path key={i}
                      d={`M${sx},${sy} A${r},${r} 0 ${large} 1 ${ex},${ey} L${eix},${eiy} A${ir},${ir} 0 ${large} 0 ${six},${siy} Z`}
                      fill={item.cat.color} opacity={i === 0 ? 0.85 : 0.55 + i * -0.08}
                    />
                  );
                });
              };

              return (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-pink-500 text-lg">local_fire_department</span>
                    <h2 className="text-sm font-bold">Popular Services</h2>
                  </div>
                  <div className="space-y-5">
                    {data.slice(0, 3).map((month, mi) => {
                      const top = (month.ranked || []).slice(0, 5);
                      const totalRev = month.totalRev || top.reduce((s, r) => s + r.revenue, 0);
                      return (
                        <div key={mi}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[12px] font-extrabold text-slate-800">{month.label}</span>
                            <span className="text-[10px] text-slate-300">{month.visits}건</span>
                            {mi === 0 && <span className="text-[9px] font-bold text-white bg-accent px-1.5 py-0.5 rounded-full ml-1">NOW</span>}
                          </div>
                          {/* Pie + Legend */}
                          <div className="flex items-center gap-4">
                            <div className="shrink-0 relative">
                              <svg width="80" height="80" viewBox="0 0 80 80">
                                {pieArcs(top, totalRev, 40, 40, 36)}
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-extrabold text-slate-600">{formatNumber(Math.round(totalRev / 10000))}만</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              {top.slice(0, 5).map((svc, si) => {
                                const pct = totalRev > 0 ? Math.round((svc.revenue / totalRev) * 100) : 0;
                                return (
                                  <div key={si} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: svc.cat.color, opacity: si === 0 ? 1 : 0.6 }} />
                                    <span className="text-[11px] text-slate-600 truncate flex-1">{svc.name}</span>
                                    <span className="text-[10px] font-bold text-slate-500 shrink-0">{pct}%</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {mi < Math.min(data.length, 3) - 1 && <div className="border-t border-slate-50 mt-4" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Client List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
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
                {filteredCustomers.map((customer) => {
                  const totalSpent = getCustomerTotalSpent(customer.id, allVisits);
                  const level = getCustomerLevel(totalSpent);
                  const cats = getCustomerCats(customer.id, allVisits);
                  return (
                    <div
                      key={customer.id}
                      onClick={() => handleCustomerClick(customer.id)}
                      className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-full ${level.bg} ring-1.5 ${level.ring} flex items-center justify-center shrink-0`}>
                        <span className="text-[10px] font-black" style={{ color: level.color }}>{level.short}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-bold truncate">{customer.name}</p>
                          {cats.map((cat, ci) => (
                            <div key={ci} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: level.color }}>{level.label} Class</span>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                    </div>
                  );
                })}
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
                  onClick={() => { setShowSettings(false); navigate('/admin/coupons'); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-500">confirmation_number</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">쿠폰 발행</p>
                    <p className="text-xs text-slate-500">생일/할인 쿠폰 만들기</p>
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
      {/* 모바일 차트 확대 Portal */}
      {expandedChart && createPortal(
        <div className="lg:hidden fixed inset-0 z-[9999] bg-white flex flex-col" onClick={() => setExpandedChart(null)}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-sm font-bold text-slate-800">
              {expandedChart === 'revenue' ? (chartPeriod === 'weekly' ? 'Weekly Revenue' : 'Monthly Revenue') : 'Coupon Analysis'}
            </span>
            <button onClick={() => setExpandedChart(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            {expandedChart === 'revenue' && (
              <div ref={el => {
                if (el && document.getElementById('chart-revenue-src')) {
                  el.innerHTML = document.getElementById('chart-revenue-src').innerHTML;
                }
              }} />
            )}
            {expandedChart === 'coupon' && (
              <div ref={el => {
                if (el && document.getElementById('chart-coupon-src')) {
                  el.innerHTML = document.getElementById('chart-coupon-src').innerHTML;
                }
              }} />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
