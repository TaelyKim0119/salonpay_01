import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';
import { formatNumber, formatDate } from '../utils/format';

// ── Service category colors ──
const SERVICE_CATEGORIES = [
  { keywords: ['염색', '컬러', 'color', 'Color', '글레이징', 'Balayage', 'balayage', '하이라이트', 'Highlight'], label: 'Color', color: '#8b5cf6', bg: 'bg-violet-100 text-violet-700' },
  { keywords: ['펌', 'パーマ', 'perm', 'Perm', '웨이브', '매직'], label: 'Perm', color: '#ec4899', bg: 'bg-pink-100 text-pink-700' },
  { keywords: ['커트', 'cut', 'Cut', 'Trim', 'trim', '레이어'], label: 'Cut', color: '#3b82f6', bg: 'bg-blue-100 text-blue-700' },
  { keywords: ['클리닉', '트리트먼트', 'Treatment', 'treatment', '케라틴', '스파', 'spa', '스케일링', '영양'], label: 'Care', color: '#10b981', bg: 'bg-emerald-100 text-emerald-700' },
];

function getServiceCategory(serviceName) {
  const name = serviceName || '';
  for (const cat of SERVICE_CATEGORIES) {
    if (cat.keywords.some(k => name.includes(k))) return cat;
  }
  return { label: 'Other', color: '#94a3b8', bg: 'bg-slate-100 text-slate-600' };
}

// ── Donut Pie Chart ──
function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  let cum = 0;
  const R = 36, IR = 22, CX = 50, CY = 50;

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 lg:w-32 lg:h-32">
      {data.map((d, i) => {
        if (d.value === 0) return null;
        const startAngle = (cum / total) * 360;
        cum += d.value;
        const endAngle = (cum / total) * 360;
        // Full circle case
        if (data.filter(x => x.value > 0).length === 1) {
          return <circle key={i} cx={CX} cy={CY} r={R} fill={d.color} />;
        }
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        const sr = ((startAngle - 90) * Math.PI) / 180;
        const er = ((endAngle - 90) * Math.PI) / 180;
        const x1 = CX + R * Math.cos(sr), y1 = CY + R * Math.sin(sr);
        const x2 = CX + R * Math.cos(er), y2 = CY + R * Math.sin(er);
        return (
          <path key={i} d={`M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${largeArc},1 ${x2},${y2} Z`}
            fill={d.color} stroke="white" strokeWidth="1.2" />
        );
      })}
      <circle cx={CX} cy={CY} r={IR} fill="white" />
      <text x={CX} y={CY - 2} textAnchor="middle" fill="#94a3b8" fontSize="5" fontWeight="600">TOTAL</text>
      <text x={CX} y={CY + 6} textAnchor="middle" fill="#1e293b" fontSize="8" fontWeight="800">{total}회</text>
    </svg>
  );
}

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SEASON_BG = [
  // index 0-11 = Jan-Dec, seasonal subtle background bands
  '#eef2ff', '#eef2ff', // Winter (Jan-Feb)
  '#ecfdf5', '#ecfdf5', '#ecfdf5', // Spring (Mar-May)
  '#fffbeb', '#fffbeb', '#fffbeb', // Summer (Jun-Aug)
  '#fff7ed', '#fff7ed', '#fff7ed', // Autumn (Sep-Nov)
  '#eef2ff', // Winter (Dec)
];

// ── Y축 금액 포맷 ──
function formatYLabel(val) {
  if (val >= 10000) return `${Math.round(val / 10000)}만`;
  if (val >= 1000) return `${Math.round(val / 1000)}천`;
  return `${val}`;
}

// 보기좋은 눈금 계산
function niceScale(maxVal) {
  if (maxVal <= 0) return { ticks: [0], niceMax: 100000 };
  const rough = maxVal * 1.15;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  let niceMax;
  if (residual <= 1.5) niceMax = 1.5 * mag;
  else if (residual <= 3) niceMax = 3 * mag;
  else if (residual <= 5) niceMax = 5 * mag;
  else if (residual <= 7.5) niceMax = 7.5 * mag;
  else niceMax = 10 * mag;
  const step = niceMax / 4;
  const ticks = [0, step, step * 2, step * 3, niceMax];
  return { ticks, niceMax };
}

// ── Brush-stroke checkmark ──
function BrushCheck({ size = 36 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none">
      {/* Brush-stroke V shape — thick, organic, slightly rough edges */}
      <path
        d="M10 26 Q12 24 16 28 Q20 32 24 36 Q28 28 34 18 Q36 14 38 12"
        stroke="#ec4899" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
      />
      {/* Thinner overlay for ink-bleed texture */}
      <path
        d="M11 25 Q14 24 17 29 Q21 34 24 37 Q29 27 35 17 Q37 13 39 11"
        stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"
      />
      {/* Paint splatter dots */}
      <circle cx="8" cy="28" r="1.2" fill="#ec4899" opacity="0.25" />
      <circle cx="40" cy="10" r="1" fill="#ec4899" opacity="0.2" />
      <circle cx="36" cy="8" r="0.7" fill="#f9a8d4" opacity="0.3" />
    </svg>
  );
}

// ── Timeline Chart Component (Pro Designer Style) ──
function StyleTimelineChart({ visits, year, onDotClick, trendTip }) {
  const monthData = useMemo(() => {
    const data = Array.from({ length: 12 }, () => []);
    visits.forEach(v => {
      const d = new Date(v.date);
      if (d.getFullYear() === year) {
        data[d.getMonth()].push({ ...v, category: getServiceCategory(v.service) });
      }
    });
    return data;
  }, [visits, year]);

  const monthlySpend = monthData.map(m => m.reduce((s, v) => s + (v.finalAmount || 0), 0));
  const maxSpend = Math.max(...monthlySpend);
  const { ticks, niceMax } = niceScale(maxSpend);

  const hasTip = trendTip && trendTip.month >= 0;
  const tipMonth = hasTip ? trendTip.month : -1;

  const W = 400, H = 160;
  const padTop = 14, padBot = 26, padLeft = 38, padRight = 12;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBot;
  const colW = chartW / 12;
  const baseY = padTop + chartH;

  const toY = (val) => baseY - (val / (niceMax || 1)) * chartH;

  const areaPoints = monthlySpend.map((spend, i) => ({
    x: padLeft + colW * i + colW / 2,
    y: Math.min(toY(spend), baseY),
  }));

  function smoothPath(pts) {
    if (pts.length < 2) return '';
    const clamp = (v) => Math.min(v, baseY);
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const cp1y = clamp(p1.y + (p2.y - p0.y) / 6);
      const cp2y = clamp(p2.y - (p3.y - p1.y) / 6);
      d += ` C${p1.x + (p2.x - p0.x) / 6},${cp1y} ${p2.x - (p3.x - p1.x) / 6},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  }

  const curvePath = smoothPath(areaPoints);
  const areaPath = curvePath
    ? `${curvePath} L${areaPoints[11].x},${baseY} L${areaPoints[0].x},${baseY} Z`
    : '';

  const now = new Date();
  const currentMonth = now.getFullYear() === year ? now.getMonth() : -1;

  const yTicks = ticks.filter((_, i) => i > 0 && i % 2 === 0).concat([ticks[ticks.length - 1]]);
  const uniqueYTicks = [...new Set(yTicks)];

  // 최근 방문 찾기 (사진 표시용)
  const latestVisitMonth = useMemo(() => {
    for (let i = 11; i >= 0; i--) {
      if (monthData[i].length > 0) return i;
    }
    return -1;
  }, [monthData]);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[340px]" style={{ height: 'auto' }}>
        <defs>
          <linearGradient id={`ag-${year}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
            <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`line-${year}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dotShadow">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#8b5cf6" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Clean grid lines */}
        {uniqueYTicks.map(val => {
          const y = toY(val);
          return (
            <g key={`y-${val}`}>
              <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
              <text x={padLeft - 6} y={y + 2} textAnchor="end" fill="#94a3b8" fontSize="5" fontWeight="500" fontFamily="Manrope, sans-serif">
                {formatYLabel(val)}
              </text>
            </g>
          );
        })}

        {/* Bottom axis */}
        <line x1={padLeft} y1={baseY} x2={padLeft + chartW} y2={baseY} stroke="#e2e8f0" strokeWidth="0.5" />

        {/* Current month highlight */}
        {currentMonth >= 0 && (
          <rect x={padLeft + colW * currentMonth} y={padTop} width={colW} height={chartH} fill="#8b5cf6" opacity="0.04" rx="3" />
        )}

        {/* Trend tip band */}
        {hasTip && (
          <rect x={padLeft + colW * tipMonth} y={padTop} width={colW} height={chartH}
            fill="#f490b1" opacity="0.06" rx="3" />
        )}

        {/* Gradient area fill */}
        {areaPath && <path d={areaPath} fill={`url(#ag-${year})`} />}

        {/* Main curve line with gradient */}
        {curvePath && <path d={curvePath} fill="none" stroke={`url(#line-${year})`} strokeWidth="1.8" strokeLinecap="round" />}

        {/* Data points with refined styling */}
        {monthData.map((monthVisits, mi) => {
          const cx = padLeft + colW * mi + colW / 2;
          if (monthVisits.length === 0) return null;

          const isLatest = mi === latestVisitMonth;

          return (
            <g key={`bar-${mi}`}>
              {monthVisits.map((visit, vi) => {
                const spend = monthlySpend[mi];
                const dotCy = toY(spend);
                const isFirst = vi === 0;
                return (
                  <g key={`d-${mi}-${vi}`} className="cursor-pointer" onClick={() => onDotClick && onDotClick(visit, mi)}>
                    {/* Hover area */}
                    <circle cx={cx} cy={dotCy} r="8" fill="transparent" />
                    {isFirst && (
                      <>
                        {/* Vertical line to axis */}
                        <line x1={cx} y1={dotCy} x2={cx} y2={baseY} stroke="#e2e8f0" strokeWidth="0.5" />
                        {/* Main dot - uniform small circle */}
                        <circle cx={cx} cy={dotCy} r="3" fill="#f490b1" />
                        {/* Spend label */}
                        {spend > 0 && (
                          <text x={cx} y={dotCy - 6} textAnchor="middle" fill="#64748b" fontSize="4.5" fontWeight="600" fontFamily="Manrope, sans-serif">
                            {Math.round(spend / 10000)}만
                          </text>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Trend pin */}
        {hasTip && (() => {
          const cx = padLeft + colW * tipMonth + colW / 2;
          return (
            <g>
              <line x1={cx} y1={baseY - 4} x2={cx} y2={padTop + 8} stroke="#ec4899" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.4" />
              <circle cx={cx} cy={baseY} r="3" fill="white" stroke="#ec4899" strokeWidth="1" />
              <circle cx={cx} cy={baseY} r="1.2" fill="#ec4899" />
              {/* Pin top */}
              <g transform={`translate(${cx}, ${padTop + 4})`}>
                <circle r="5" fill="#ec4899" opacity="0.1" />
                <circle r="3" fill="white" stroke="#ec4899" strokeWidth="0.8" />
                <text textAnchor="middle" y="1.5" fill="#ec4899" fontSize="3.5" fontWeight="bold">✦</text>
              </g>
            </g>
          );
        })()}

        {/* X-axis labels */}
        {MONTH_LABELS.map((label, i) => {
          const isNow = i === currentMonth;
          const hasData = monthData[i].length > 0;
          const isTipMonth = i === tipMonth;
          const cx = padLeft + colW * i + colW / 2;
          return (
            <g key={`x-${i}`}>
              <text
                x={cx} y={H - 6}
                textAnchor="middle"
                fill={isTipMonth ? '#ec4899' : isNow ? '#7c3aed' : hasData ? '#475569' : '#cbd5e1'}
                fontSize={isNow ? '6' : '5.5'}
                fontWeight={isTipMonth || isNow ? '700' : '400'}
                fontFamily="Manrope, sans-serif"
              >
                {label}월
              </text>
              {isNow && <rect x={cx - 3} y={H - 3} width="6" height="1.5" rx="0.75" fill="#7c3aed" />}
              {isTipMonth && !isNow && <rect x={cx - 3} y={H - 3} width="6" height="1.5" rx="0.75" fill="#ec4899" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}


// ── Coupon type config ──
const COUPON_TYPE = {
  birthday: { icon: 'cake', label: '생일 쿠폰', color: '#f59e0b', bg: '#fef3c7' },
  loyalty: { icon: 'loyalty', label: '로열티 쿠폰', color: '#8b5cf6', bg: '#ede9fe' },
  referral: { icon: 'group_add', label: '추천 쿠폰', color: '#10b981', bg: '#d1fae5' },
};


// ── Coupon Card Component ──
function CouponCard({ coupon, t, onShowQR }) {
  const cfg = COUPON_TYPE[coupon.type] || COUPON_TYPE.loyalty;
  const daysLeft = Math.ceil((new Date(coupon.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 14;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
      {/* Ticket notch */}
      <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 size-4 rounded-full bg-bg-light" />
      <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 size-4 rounded-full bg-bg-light" />

      <div className="flex items-stretch">
        {/* Left: accent + icon */}
        <div className="w-16 shrink-0 flex flex-col items-center justify-center gap-1.5 py-4" style={{ backgroundColor: cfg.bg }}>
          <span className="material-symbols-outlined text-2xl" style={{ color: cfg.color }}>{cfg.icon}</span>
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label.split(' ')[0]}</span>
        </div>

        {/* Right: info */}
        <div className="flex-1 p-3.5 flex flex-col justify-center">
          <p className="text-xl font-black text-slate-800 tracking-tight">
            {coupon.isPercent ? `${coupon.amount}%` : `${formatNumber(coupon.amount)}${t('won')}`}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{cfg.label}</p>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[11px] font-semibold ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`}>
              {isUrgent ? `D-${daysLeft}` : `~${coupon.expiryDate.slice(5)}`}
            </span>
            <button
              onClick={() => onShowQR(coupon)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              <span className="material-symbols-outlined text-sm">qr_code_2</span>
              QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QR Modal ──
function CouponQRModal({ coupon, salonName, onClose, t }) {
  if (!coupon) return null;
  const cfg = COUPON_TYPE[coupon.type] || COUPON_TYPE.loyalty;
  const qrValue = JSON.stringify({
    type: 'salonpay_coupon',
    couponId: coupon.id,
    customerId: coupon.customerId,
    amount: coupon.amount,
    isPercent: coupon.isPercent,
    expiryDate: coupon.expiryDate,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl lg:rounded-3xl p-6 pb-10 lg:pb-6 animate-in slide-in-from-bottom"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
        </button>

        <div className="flex flex-col items-center pt-2">
          {/* Icon */}
          <div className="size-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: cfg.bg }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: cfg.color }}>{cfg.icon}</span>
          </div>

          <p className="text-2xl font-black text-slate-800 mb-1">
            {coupon.isPercent ? `${coupon.amount}% OFF` : `${formatNumber(coupon.amount)}${t('won')}`}
          </p>
          <p className="text-xs text-slate-400 mb-5">{cfg.label} · ~{coupon.expiryDate}</p>

          {/* QR */}
          <div className="bg-white p-4 rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-100 mb-4">
            <QRCodeSVG
              value={qrValue}
              size={180}
              level="M"
              fgColor="#1e293b"
              bgColor="#ffffff"
              imageSettings={{
                src: '',
                height: 0,
                width: 0,
                excavate: false,
              }}
            />
          </div>

          <p className="text-[11px] text-slate-400 text-center mb-1">{t('scanQR') || '매장에서 QR코드를 스캔해주세요'}</p>
          {salonName && <p className="text-[10px] text-slate-300">{salonName}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const { t, formatDate: formatDateI18n } = useI18n();
  const { currentCustomer, currentSalon } = useApp();
  const [allVisits, setAllVisits] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [salonEvents, setSalonEvents] = useState([]);
  const [cashDiscountRate, setCashDiscountRate] = useState(null);
  const [pointEarnRate, setPointEarnRate] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [selectedDot, setSelectedDot] = useState(null); // { visit, month }
  const [qrCoupon, setQrCoupon] = useState(null);

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
      setAllVisits(customerVisits);
      const activeCoupons = await sheetsDB.getActiveCouponsByCustomerId(currentCustomer.id);
      setCoupons(activeCoupons);
      // Load settings (cash discount / point earn rate)
      try {
        const settings = await sheetsDB.getSettings();
        setCashDiscountRate(settings.cashDiscountRate ?? settings.CASH_DISCOUNT_RATE ?? 10);
        setPointEarnRate(settings.pointEarnRate ?? settings.POINT_EARN_RATE ?? 5);
      } catch { /* use defaults below */ }
      // Demo salon events
      if (sheetsDB.isDemoMode) {
        setSalonEvents([
          { id: 'ev1', icon: 'content_cut', title: '3월 커트 할인', desc: '모든 커트 시술 20% 할인', badge: 'HOT', badgeColor: 'bg-rose-500', endDate: '2026-03-31' },
          { id: 'ev2', icon: 'cake', title: '생일 고객 특별 혜택', desc: '생일 달 방문 시 10,000원 쿠폰 자동 발급', badge: 'BIRTHDAY', badgeColor: 'bg-amber-500', endDate: '상시' },
          { id: 'ev3', icon: 'group_add', title: '친구 추천 이벤트', desc: '추천인 & 신규 고객 모두 15% 할인 쿠폰 증정', badge: 'NEW', badgeColor: 'bg-emerald-500', endDate: '2026-04-30' },
        ]);
      }
    } catch (err) {
      console.error('데이터 로드 오류:', err);
    }
  };

  // Available years — always include current + last year
  const availableYears = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const years = new Set([thisYear, thisYear - 1]);
    allVisits.forEach(v => years.add(new Date(v.date).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [allVisits]);

  // Category legend data — 선택 연도 기준
  const usedCategories = useMemo(() => {
    const cats = new Map();
    allVisits.forEach(v => {
      if (new Date(v.date).getFullYear() !== chartYear) return;
      const cat = getServiceCategory(v.service);
      if (!cats.has(cat.label)) cats.set(cat.label, { ...cat, count: 0 });
      cats.get(cat.label).count++;
    });
    return [...cats.values()].sort((a, b) => b.count - a.count);
  }, [allVisits, chartYear]);

  // 선택 연도의 서비스 카테고리 분포 (파이 차트용)
  const categoryDistribution = useMemo(() => {
    const counts = {};
    allVisits.forEach(v => {
      if (new Date(v.date).getFullYear() !== chartYear) return;
      const cat = getServiceCategory(v.service);
      if (!counts[cat.label]) counts[cat.label] = { label: cat.label, color: cat.color, value: 0, amount: 0 };
      counts[cat.label].value++;
      counts[cat.label].amount += v.finalAmount || 0;
    });
    return Object.values(counts).sort((a, b) => b.value - a.value);
  }, [allVisits, chartYear]);

  // 작년 같은 시기 시술 기반 트렌드 팁 + 빈 달 타겟
  const trendTip = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const lastYear = curYear - 1;

    // 작년 같은 달 ± 1달 범위의 시술 찾기
    const lastYearVisits = allVisits.filter(v => {
      const d = new Date(v.date);
      return d.getFullYear() === lastYear && Math.abs(d.getMonth() - curMonth) <= 1;
    });
    if (lastYearVisits.length === 0) return null;

    const lastService = lastYearVisits[0];
    const cat = getServiceCategory(lastService.service);

    const TREND_MAP = {
      'Color': { trend: '밀크티 베이지 톤', reason: '자연스러운 톤 전환' },
      'Perm': { trend: '히피펌', reason: '내추럴 웨이브 트렌드' },
      'Cut': { trend: '레이어드 허쉬컷', reason: '볼륨감 연출 트렌드' },
      'Care': { trend: '두피 디톡스', reason: '두피부터 건강하게' },
    };
    const suggestion = TREND_MAP[cat.label] || TREND_MAP['Cut'];

    // 현재 연도일 때만 트렌드 추천 표시
    if (chartYear !== curYear) return null;

    const monthData = Array.from({ length: 12 }, (_, i) =>
      allVisits.some(v => {
        const d = new Date(v.date);
        return d.getFullYear() === curYear && d.getMonth() === i;
      })
    );
    // 현재 달 또는 그 이후 첫 빈 달
    let targetMonth = -1;
    for (let i = curMonth; i < 12; i++) {
      if (!monthData[i]) { targetMonth = i; break; }
    }
    // 현재 달 이전에도 확인
    if (targetMonth === -1) {
      for (let i = curMonth - 1; i >= 0; i--) {
        if (!monthData[i]) { targetMonth = i; break; }
      }
    }

    if (targetMonth === -1) return null;

    return {
      lastService: lastService.service,
      cat,
      trend: suggestion.trend,
      reason: suggestion.reason,
      month: targetMonth,
    };
  }, [allVisits, chartYear]);

  if (!currentCustomer) return null;

  const points = currentCustomer.points || 0;
  const statusLabel = points >= 5000 ? 'VIP' : points >= 2000 ? 'Gold Status' : 'Member';
  const firstLetter = (currentCustomer.name || '?').charAt(0).toUpperCase();

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
          <button
            onClick={() => { sheetsDB.clearCurrentSalon(); navigate('/'); }}
            className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 mb-24 lg:mb-8">

          {/* ──── HOME TAB ──── */}
          {activeTab === 'home' && (
            <>
              {/* Loyalty Card with Background Image */}
              <div className="px-6 lg:px-8 py-2">
                <div className="rounded-2xl shadow-xl shadow-primary/25 relative overflow-hidden" style={{ minHeight: '180px' }}>
                  {/* Background image */}
                  <img
                    src="/images/loyalty-bg.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  <div className="relative z-10 p-6 flex flex-col gap-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white/80 text-[10px] font-semibold uppercase tracking-[0.2em] mb-1.5">
                          {t('loyaltyPoints') || '사용가능 포인트'}
                        </p>
                        <p className="text-white text-3xl font-extrabold tracking-tight drop-shadow-lg">
                          {formatNumber(points)} <span className="text-sm font-normal opacity-80">pts</span>
                        </p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 shadow-lg">
                        <p className="text-white text-[11px] font-bold uppercase tracking-tight">{statusLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <span className="material-symbols-outlined text-white/90 text-sm">confirmation_number</span>
                          <span className="text-white/90 text-[11px] font-semibold">{coupons.length} {t('coupons')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                          <span className="material-symbols-outlined text-white/90 text-sm">history</span>
                          <span className="text-white/90 text-[11px] font-semibold">{allVisits.length}회 {t('visits')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Button removed - CTA is in Style Pick card */}

              {/* ── Style Timeline Chart ── */}
              <section className="px-6 lg:px-8 pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-slate-900 text-lg font-bold">{t('myStyleTimeline') || 'My Style Timeline'}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{t('monthlyServiceSpend') || '월별 시술 내역 & 지출'}</p>
                  </div>
                  {/* Year selector */}
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5">
                    {availableYears.slice(0, 3).map(y => (
                      <button
                        key={y}
                        onClick={() => { setChartYear(y); setSelectedDot(null); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                          chartYear === y
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 lg:p-5 relative">

                  {/* ── Style Pick — 프리미엄 매거진 카드 (반응형) ── */}
                  {trendTip && (
                    <div className="mb-4 style-pick-glow rounded-[18px]">
                      {/* Shimmer border wrapper */}
                      <div className="style-pick-border rounded-[18px] p-[2.5px]">
                        <div className="rounded-2xl overflow-hidden bg-white">
                          {/* 모바일: 세로 레이아웃 / PC: 가로 레이아웃 */}
                          <div className="flex flex-col lg:flex-row">
                            {/* 이미지 영역 */}
                            <div className="relative w-full lg:w-1/2 aspect-[16/10] lg:aspect-auto lg:min-h-[240px] overflow-hidden">
                              <img
                                src="/images/style-pick.png"
                                alt="Style Pick"
                                className="absolute inset-0 w-full h-full object-cover object-center scale-105 hover:scale-110 transition-transform duration-700"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-black/10 lg:to-black/30" />
                              {/* 뱃지 */}
                              <div className="absolute top-3 left-3 flex items-center gap-2">
                                <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-[10px] font-black text-slate-900 uppercase tracking-wider rounded-full shadow-lg">
                                  <span className="material-symbols-outlined text-primary text-[13px] align-middle mr-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                  {t('stylePick') || 'Style Pick'}
                                </span>
                                <span className="hot-badge px-2.5 py-1 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[10px] font-extrabold rounded-full shadow-lg shadow-rose-500/30">
                                  HOT
                                </span>
                              </div>
                              {/* 모바일 하단 트렌드명 */}
                              <div className="absolute bottom-3 left-4 right-4 lg:hidden">
                                <p className="text-white text-2xl font-extrabold tracking-tight drop-shadow-lg leading-tight">{trendTip.trend}</p>
                                <p className="text-white/80 text-xs mt-1 font-medium">{trendTip.reason}</p>
                              </div>
                            </div>

                            {/* 텍스트 + CTA */}
                            <div className="flex-1 p-4 lg:p-6 flex flex-col justify-center">
                              {/* PC 트렌드명 */}
                              <div className="hidden lg:block mb-3">
                                <p className="text-slate-900 text-2xl font-extrabold tracking-tight leading-tight">{trendTip.trend}</p>
                                <p className="text-primary/70 text-sm mt-1 font-semibold">{trendTip.reason}</p>
                              </div>

                              <p className="text-sm font-bold leading-relaxed bg-amber-300 text-slate-900 rounded-lg px-3 py-2 inline-block">
                                작년 이맘때 <span className="font-extrabold underline decoration-2 decoration-amber-600">{trendTip.lastService}</span> 하셨는데,{' '}
                                올해 유행하는 <span className="font-black text-amber-900">{trendTip.trend}</span> 해보시는 건 어때요?
                              </p>

                              {/* 예약 CTA 버튼 */}
                              <button
                                onClick={() => navigate('/booking')}
                                className="mt-4 w-full cta-shimmer text-white font-bold text-sm py-3.5 px-5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                              >
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                                {t('bookNow') || '지금 예약하기'}
                              </button>

                              {/* 쿠폰 CTA */}
                              {coupons.length > 0 && (
                                <button
                                  onClick={() => setActiveTab('coupons')}
                                  className="mt-2.5 flex items-center gap-2.5 w-full bg-amber-50 hover:bg-amber-100 rounded-xl p-3 border border-amber-200/60 transition-colors group"
                                >
                                  <span className="material-symbols-outlined text-amber-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                                  <div className="flex-1 text-left min-w-0">
                                    <p className="text-[12px] font-bold text-amber-900">
                                      {t('stylePickCoupon') || '쿠폰으로 더 저렴하게!'}
                                    </p>
                                    <p className="text-[10px] text-amber-600/70">{coupons.length}장 사용 가능</p>
                                  </div>
                                  <span className="material-symbols-outlined text-amber-400 group-hover:text-amber-600 text-lg transition-colors">chevron_right</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <StyleTimelineChart visits={allVisits} year={chartYear} trendTip={trendTip} onDotClick={(visit, month) => setSelectedDot(prev => prev?.visit?.id === visit.id ? null : { visit, month })} />

                  {/* Dot detail popup with style photo */}
                  {selectedDot && (() => {
                    const v = selectedDot.visit;
                    const cat = v.category || getServiceCategory(v.service);
                    // 최근 방문인지 확인
                    const sortedVisits = [...allVisits].sort((a, b) => new Date(b.date) - new Date(a.date));
                    const isLatestVisit = sortedVisits.length > 0 && sortedVisits[0].id === v.id;
                    return (
                      <div className="mt-3 rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                        {/* Style photo for latest visit — 세로 전체 표시 */}
                        {isLatestVisit && (
                          <div className="relative overflow-hidden">
                            <img
                              src="/images/style-photo.jpg"
                              alt={t('stylePhoto') || '스타일 사진'}
                              className="w-full object-contain"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                              <div>
                                <p className="text-white text-sm font-bold drop-shadow-lg">{v.service}</p>
                                <p className="text-white/80 text-[11px] drop-shadow">{v.date}</p>
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 backdrop-blur-sm text-white">
                                <span className="size-1.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.label}
                              </span>
                            </div>
                            <button onClick={() => setSelectedDot(null)} className="absolute top-2 right-2 size-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                              <span className="material-symbols-outlined text-white text-sm">close</span>
                            </button>
                          </div>
                        )}
                        <div className={`flex items-center gap-3 p-3.5 ${isLatestVisit ? 'border-t border-slate-50' : ''}`}>
                          {!isLatestVisit && (
                            <div className="size-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '12' }}>
                              <div className="size-3.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {!isLatestVisit && <p className="text-sm font-bold text-slate-800 truncate">{v.service}</p>}
                            {!isLatestVisit && <p className="text-[11px] text-slate-400">{v.date} · {cat.label}</p>}
                            {isLatestVisit && <p className="text-[11px] text-slate-500">최근 방문 스타일</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-primary">{formatNumber(v.finalAmount || 0)}{t('won')}</p>
                            <p className="text-[10px] text-slate-400">+{formatNumber(v.pointsEarned || 0)}P</p>
                          </div>
                          {!isLatestVisit && (
                            <button onClick={() => setSelectedDot(null)} className="ml-1 size-6 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                              <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Legend */}
                  {usedCategories.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-4 mt-3 pt-3 border-t border-slate-50">
                      {usedCategories.map(cat => (
                        <div key={cat.label} className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-[11px] text-slate-600 font-medium">{cat.label}</span>
                          <span className="text-[10px] text-slate-400">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </section>

              {/* ── Pie Chart: Category Distribution ── */}
              {categoryDistribution.length > 0 && (
                <section className="px-6 lg:px-8 pt-4 pb-2">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 lg:p-5">
                    <h4 className="text-sm font-bold text-slate-700 mb-4">{chartYear} {t('serviceDistribution') || '서비스 분포'}</h4>
                    <div className="flex items-center gap-6">
                      {/* Donut */}
                      <div className="shrink-0">
                        <DonutChart data={categoryDistribution} />
                      </div>
                      {/* Breakdown list */}
                      <div className="flex-1 flex flex-col gap-2.5">
                        {categoryDistribution.map(cat => {
                          const total = categoryDistribution.reduce((s, c) => s + c.value, 0);
                          const pct = Math.round((cat.value / total) * 100);
                          return (
                            <div key={cat.label}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                  <span className="text-xs font-semibold text-slate-700">{cat.label}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-500">{cat.value}회 <span className="text-slate-400 font-normal">({pct}%)</span></span>
                              </div>
                              {/* Progress bar */}
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              )}


              {/* ── My Coupons (compact horizontal) ── */}
              {coupons.length > 0 && (
                <section className="px-6 lg:px-8 pt-4 pb-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-slate-900 text-base font-bold">{t('myCoupons') || 'My Coupons'}</h3>
                    <button onClick={() => setActiveTab('coupons')} className="text-xs text-primary font-semibold">{t('viewAll') || '전체보기'}</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {coupons.map(coupon => (
                      <div key={coupon.id} className="shrink-0 w-[260px]">
                        <CouponCard coupon={coupon} t={t} onShowQR={setQrCoupon} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Salon Events + Benefits ── */}
              {(salonEvents.length > 0 || cashDiscountRate !== null) && (
                <section className="px-6 lg:px-8 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                    <h3 className="text-slate-900 text-base font-bold">
                      {currentSalon?.salonName
                        ? `${currentCustomer.name}님의 단골 ${currentSalon.salonName} 현 이벤트`
                        : t('events') || '이벤트'}
                    </h3>
                  </div>

                  {/* Cash Discount & Point Benefits */}
                  {cashDiscountRate !== null && (
                    <div className="flex gap-2.5 mb-3 lg:grid lg:grid-cols-2 lg:gap-3">
                      <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Cash Discount</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-700">{cashDiscountRate}%</p>
                        <p className="text-[11px] text-emerald-600/70 mt-1">현금 결제 시 할인</p>
                      </div>
                      <div className="flex-1 p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="size-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                            <span className="material-symbols-outlined text-violet-600 text-lg">toll</span>
                          </div>
                          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Point Earn</span>
                        </div>
                        <p className="text-2xl font-black text-violet-700">{pointEarnRate}%</p>
                        <p className="text-[11px] text-violet-600/70 mt-1">결제 금액 포인트 적립</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-3">
                    {salonEvents.map(ev => (
                      <div key={ev.id} className="flex gap-3 items-center p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl">{ev.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-bold text-slate-800 truncate">{ev.title}</p>
                            <span className={`shrink-0 px-1.5 py-0.5 ${ev.badgeColor} text-white text-[9px] font-bold rounded-full`}>{ev.badge}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{ev.desc}</p>
                          <p className="text-[10px] text-slate-300 mt-1">~{ev.endDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}





              {allVisits.length === 0 && coupons.length === 0 && (
                <section className="px-6 lg:px-8 py-8">
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                    <span className="material-symbols-outlined text-[48px] mb-2">calendar_today</span>
                    <p className="text-sm text-slate-400">{t('noHistory') || 'No visit history yet'}</p>
                  </div>
                </section>
              )}
            </>
          )}

          {/* ──── COUPONS TAB ──── */}
          {activeTab === 'coupons' && (
            <section className="px-6 lg:px-8 py-4">
              <h3 className="text-slate-900 text-xl font-bold mb-1">{t('myCoupons') || 'My Coupons'}</h3>
              <p className="text-xs text-slate-400 mb-5">{coupons.length}장 {t('couponCount')?.replace('{count}', '') || '사용 가능'}</p>

              {coupons.length > 0 ? (
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                  {coupons.map(coupon => {
                    const cfg = COUPON_TYPE[coupon.type] || COUPON_TYPE.loyalty;
                    const daysLeft = Math.ceil((new Date(coupon.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysLeft <= 14;

                    return (
                      <div key={coupon.id} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
                        {/* Ticket notches */}
                        <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 size-4 rounded-full bg-bg-light" />
                        <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 size-4 rounded-full bg-bg-light" />

                        <div className="p-5 flex gap-4">
                          {/* Left: Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="size-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                                <span className="material-symbols-outlined text-lg" style={{ color: cfg.color }}>{cfg.icon}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-600">{cfg.label}</span>
                              {isUrgent && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[9px] font-bold rounded-full">D-{daysLeft}</span>}
                            </div>
                            <p className="text-2xl font-black text-slate-800 mb-1">
                              {coupon.isPercent ? `${coupon.amount}% OFF` : `${formatNumber(coupon.amount)}${t('won')}`}
                            </p>
                            <p className="text-[11px] text-slate-400">유효기간: {coupon.expiryDate}</p>
                            <p className="text-[10px] text-slate-300 mt-0.5">발급: {coupon.createdAt}</p>
                          </div>

                          {/* Right: QR */}
                          <button
                            onClick={() => setQrCoupon(coupon)}
                            className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-3 rounded-xl border border-dashed border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                          >
                            <QRCodeSVG
                              value={JSON.stringify({ type: 'salonpay_coupon', couponId: coupon.id })}
                              size={56}
                              level="L"
                              fgColor="#64748b"
                            />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Scan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <span className="material-symbols-outlined text-[48px] mb-2">confirmation_number</span>
                  <p className="text-sm text-slate-400">{t('noCouponsAvailable') || '사용 가능한 쿠폰이 없습니다'}</p>
                </div>
              )}
            </section>
          )}

          {/* ──── HISTORY TAB ──── */}
          {activeTab === 'history' && (
            <section className="px-6 lg:px-8 py-4">
              <h3 className="text-slate-900 text-xl font-bold mb-1">{t('journey') || 'Style Journey'}</h3>
              <p className="text-xs text-slate-400 mb-6">{allVisits.length}회 {t('visitRecords') || '방문 기록'}</p>

              {allVisits.length > 0 ? (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />

                  {allVisits.map((visit, idx) => {
                    const cat = getServiceCategory(visit.service);
                    const d = new Date(visit.date);
                    const isNewMonth = idx === 0 || new Date(allVisits[idx - 1].date).getMonth() !== d.getMonth();

                    return (
                      <div key={visit.id}>
                        {/* Month divider */}
                        {isNewMonth && (
                          <div className="flex items-center gap-3 mb-3 mt-2">
                            <div className="size-[31px] rounded-full bg-primary/10 border-2 border-white flex items-center justify-center z-10">
                              <span className="text-[9px] font-black text-primary">{d.getMonth() + 1}월</span>
                            </div>
                            <span className="text-xs font-bold text-slate-300 uppercase">{d.getFullYear()}</span>
                          </div>
                        )}

                        {/* Visit card */}
                        <div className="flex items-start gap-3 ml-[11px] mb-2.5 relative">
                          {/* Dot */}
                          <div className="mt-3.5 size-[9px] rounded-full shrink-0 ring-2 ring-white z-10" style={{ backgroundColor: cat.color }} />

                          <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${cat.bg}`}><span className="size-1.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.label}</span>
                                  <span className="text-[11px] text-slate-400">{visit.date.slice(5)}</span>
                                </div>
                                <p className="text-slate-900 font-bold text-sm">{visit.service}</p>
                              </div>
                              <div className="text-right ml-3 shrink-0">
                                <p className="text-sm font-bold text-primary">+{formatNumber(visit.pointsEarned || 0)}P</p>
                                <p className="text-[11px] text-slate-400">{formatNumber(visit.finalAmount || 0)}{t('won')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <span className="material-symbols-outlined text-[48px] mb-2">calendar_today</span>
                  <p className="text-sm text-slate-400">No visit history</p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-100 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 flex justify-between items-center z-50">
          {[
            { key: 'home', icon: 'home', label: t('home') || '홈' },
            { key: 'history', icon: 'timeline', label: t('journey') || '스타일 여정' },
            { key: 'coupons', icon: 'confirmation_number', label: t('coupons') || '쿠폰' },
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
                <span className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >{tab.icon}</span>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* QR Modal */}
        <CouponQRModal
          coupon={qrCoupon}
          salonName={currentSalon?.salonName || ''}
          onClose={() => setQrCoupon(null)}
          t={t}
        />
      </div>
    </div>
  );
}
