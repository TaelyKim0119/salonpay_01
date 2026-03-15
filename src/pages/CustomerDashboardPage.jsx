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

// ── Timeline Chart Component ──
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

  // ── Compact chart ──
  const W = 400, H = 140;
  const padTop = 10, padBot = 22, padLeft = 38, padRight = 8;
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

  return (
    <div className="w-full overflow-x-auto -ml-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[340px]" style={{ height: 'auto' }}>
        <defs>
          <linearGradient id={`ag-${year}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Season bands */}
        {SEASON_BG.map((color, i) => (
          <rect key={i} x={padLeft + colW * i} y={padTop} width={colW} height={chartH} fill={color} opacity="0.4" />
        ))}

        {/* Current month */}
        {currentMonth >= 0 && (
          <rect x={padLeft + colW * currentMonth} y={padTop} width={colW} height={chartH} fill="#8b5cf6" opacity="0.08" rx="2" />
        )}

        {/* Trend tip highlight band */}
        {hasTip && (
          <rect x={padLeft + colW * tipMonth} y={padTop} width={colW} height={chartH}
            fill="#f490b1" opacity="0.1" rx="2" />
        )}

        {/* Y grid + labels */}
        {uniqueYTicks.map(val => {
          const y = toY(val);
          return (
            <g key={`y-${val}`}>
              <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#e2e8f0" strokeWidth="0.4" strokeDasharray="3 3" />
              <text x={padLeft - 4} y={y + 2} textAnchor="end" fill="#a1a1aa" fontSize="5.5" fontWeight="500">
                {formatYLabel(val)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={padLeft} y1={baseY} x2={padLeft + chartW} y2={baseY} stroke="#d1d5db" strokeWidth="0.6" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={baseY} stroke="#d1d5db" strokeWidth="0.6" />

        {/* Area + line */}
        {areaPath && <path d={areaPath} fill={`url(#ag-${year})`} />}
        {curvePath && <path d={curvePath} fill="none" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity="0.7" />}

        {/* Bars + color dots per month */}
        {monthData.map((monthVisits, mi) => {
          const cx = padLeft + colW * mi + colW / 2;
          if (monthVisits.length === 0) return null;

          const barH = Math.max((monthlySpend[mi] / (niceMax || 1)) * chartH, 2);
          const barW = colW * 0.4;

          return (
            <g key={`bar-${mi}`}>
              <rect x={cx - barW / 2} y={baseY - barH} width={barW} height={barH} rx="2"
                fill={monthVisits[0].category.color} opacity="0.12" />
              {monthVisits.map((visit, vi) => {
                const dy = baseY - barH - 6 - vi * 9;
                const dotCy = Math.max(padTop + 4, dy);
                return (
                  <g key={`d-${mi}-${vi}`} className="cursor-pointer" onClick={() => onDotClick && onDotClick(visit, mi)}>
                    <circle cx={cx} cy={dotCy} r="5" fill="transparent" />
                    <circle cx={cx} cy={dotCy} r="3.5" fill={visit.category.color} opacity="0.2" />
                    <circle cx={cx} cy={dotCy} r="2.5" fill={visit.category.color} stroke="white" strokeWidth="0.8" />
                  </g>
                );
              })}
              {monthlySpend[mi] > 0 && (
                <text
                  x={cx}
                  y={Math.max(padTop + 2, baseY - barH - 4 - monthVisits.length * 9)}
                  textAnchor="middle" fill="#64748b" fontSize="4.5" fontWeight="600" opacity="0.7"
                >
                  {Math.round(monthlySpend[mi] / 10000)}만
                </text>
              )}
            </g>
          );
        })}

        {/* ── Trend pin marker on empty month ── */}
        {hasTip && (() => {
          const cx = padLeft + colW * tipMonth + colW / 2;
          const topY = -2;
          const midY = (baseY + topY) / 2;
          const sw = colW * 1.2;
          return (
            <g>
              <path d={`M ${cx} ${baseY} C ${cx + sw} ${midY + 15}, ${cx - sw} ${midY - 15}, ${cx} ${topY}`}
                stroke="#ec4899" strokeWidth="0.8" strokeDasharray="3 2.5" opacity="0.4" fill="none" />
              <circle cx={cx} cy={baseY} r="3.5" fill="white" stroke="#ec4899" strokeWidth="1" />
              <circle cx={cx} cy={baseY} r="1.5" fill="#ec4899" />
            </g>
          );
        })()}

        {/* X-axis labels */}
        {MONTH_LABELS.map((label, i) => {
          const isNow = i === currentMonth;
          const hasData = monthData[i].length > 0;
          const isTipMonth = i === tipMonth;
          return (
            <g key={`x-${i}`}>
              <text
                x={padLeft + colW * i + colW / 2}
                y={H - 5}
                textAnchor="middle"
                fill={isTipMonth ? '#ec4899' : isNow ? '#7c3aed' : hasData ? '#64748b' : '#c4b5fd'}
                fontSize={isTipMonth ? '6' : isNow ? '6.5' : '5.5'}
                fontWeight={isTipMonth || isNow ? '800' : '500'}
              >
                {label}월
              </text>
              {isNow && <circle cx={padLeft + colW * i + colW / 2} cy={H - 1} r="1.2" fill="#7c3aed" />}
              {isTipMonth && !isNow && <circle cx={padLeft + colW * i + colW / 2} cy={H - 1} r="1.2" fill="#ec4899" />}
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

          <p className="text-[11px] text-slate-400 text-center mb-1">매장에서 QR코드를 스캔해주세요</p>
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
  const [activeTab, setActiveTab] = useState('home');
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [selectedDot, setSelectedDot] = useState(null); // { visit, month }
  const [qrCoupon, setQrCoupon] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null); // 닮은 스타 상세

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
              {/* Loyalty Card */}
              <div className="px-6 lg:px-8 py-2">
                <div className="loyalty-gradient rounded-xl p-6 shadow-lg shadow-primary/20 relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-10%] opacity-20 pointer-events-none text-white">
                    <span className="material-symbols-outlined text-[120px] rotate-12">auto_awesome</span>
                  </div>
                  <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">Loyalty Points</p>
                        <p className="text-white text-3xl font-extrabold tracking-tight">
                          {formatNumber(points)} <span className="text-sm font-normal opacity-90">pts</span>
                        </p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                        <p className="text-white text-xs font-bold uppercase tracking-tighter">{statusLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="material-symbols-outlined text-sm">confirmation_number</span>
                        <span className="text-xs font-medium">{coupons.length} coupons</span>
                      </div>
                      <div className="text-white/70 text-xs font-medium">
                        {allVisits.length}회 방문
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Button */}
              <div className="px-6 lg:px-8 pt-4">
                <button
                  onClick={() => navigate('/booking')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary/10 border border-primary/20 rounded-xl font-semibold text-primary hover:bg-primary/15 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                  <span className="text-sm">예약하기</span>
                </button>
              </div>

              {/* ── Style Timeline Chart ── */}
              <section className="px-6 lg:px-8 pt-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-slate-900 text-lg font-bold">My Style Timeline</h3>
                    <p className="text-xs text-slate-400 mt-0.5">월별 시술 내역 & 지출</p>
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

                  {/* ── Trend Recommendation — above chart ── */}
                  {trendTip && (
                    <div className="mb-3 border border-dashed border-pink-300 rounded-xl p-3 bg-pink-50/30">
                      <div className="flex gap-3 items-center">
                        {/* Brush check */}
                        <div className="shrink-0">
                          <BrushCheck size={32} />
                        </div>
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Style Pick</span>
                            <span className="text-[9px] text-slate-300">·</span>
                            <span className="text-[9px] text-slate-400">{trendTip.month + 1}월</span>
                          </div>
                          <p className="text-[12px] text-slate-600 leading-[1.5]">
                            작년 이맘때 <span className="font-bold text-slate-800">{trendTip.lastService}</span> 하셨는데, 올해 유행하는 <span className="font-bold text-pink-500">{trendTip.trend}</span> 해보시는 건 어때요?
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <StyleTimelineChart visits={allVisits} year={chartYear} trendTip={trendTip} onDotClick={(visit, month) => setSelectedDot(prev => prev?.visit?.id === visit.id ? null : { visit, month })} />

                  {/* Dot detail popup */}
                  {selectedDot && (() => {
                    const v = selectedDot.visit;
                    const cat = v.category || getServiceCategory(v.service);
                    return (
                      <div className="mt-2 flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80 animate-in fade-in">
                        <div className="size-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + '15' }}>
                          <div className="size-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{v.service}</p>
                          <p className="text-[11px] text-slate-400">{v.date} · {cat.label}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">{formatNumber(v.finalAmount || 0)}{t('won')}</p>
                          <p className="text-[10px] text-slate-400">+{formatNumber(v.pointsEarned || 0)}P</p>
                        </div>
                        <button onClick={() => setSelectedDot(null)} className="ml-1 size-6 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                          <span className="material-symbols-outlined text-slate-400 text-sm">close</span>
                        </button>
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
                    <h4 className="text-sm font-bold text-slate-700 mb-4">{chartYear}년 서비스 분포</h4>
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
                    <h3 className="text-slate-900 text-base font-bold">My Coupons</h3>
                    <button onClick={() => setActiveTab('coupons')} className="text-xs text-primary font-semibold">전체보기</button>
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

              {/* ── Salon Events ── */}
              {salonEvents.length > 0 && (
                <section className="px-6 lg:px-8 pt-4 pb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-lg">campaign</span>
                    <h3 className="text-slate-900 text-base font-bold">Events</h3>
                  </div>
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



              {/* ── 총 할인 혜택 ── */}
              {allVisits.length > 0 && (() => {
                const totalDiscount = allVisits.reduce((s, v) => s + (v.discount || 0), 0);
                const totalPointsUsed = allVisits.reduce((s, v) => s + (v.pointsUsed || 0), 0);
                const totalSaved = totalDiscount + totalPointsUsed;
                const usedCoupons = coupons.filter(c => c.isUsed).length;
                if (totalSaved === 0 && usedCoupons === 0) return null;
                return (
                  <section className="px-6 lg:px-8 pt-4 pb-2">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 shadow-lg shadow-emerald-500/20 relative overflow-hidden">
                      <div className="absolute top-[-10%] right-[-5%] opacity-15 pointer-events-none">
                        <span className="material-symbols-outlined text-white text-[100px]">savings</span>
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="material-symbols-outlined text-white/90 text-lg">local_offer</span>
                          <span className="text-white/80 text-xs font-bold uppercase tracking-wider">My Savings</span>
                        </div>
                        <p className="text-white text-3xl font-extrabold mb-1">
                          {formatNumber(totalSaved)}<span className="text-lg font-normal opacity-80">{t('won')}</span>
                        </p>
                        <p className="text-white/60 text-xs mb-4">총 할인 + 포인트 사용 혜택</p>
                        <div className="flex gap-4">
                          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl p-3">
                            <p className="text-white/60 text-[10px] font-semibold mb-1">쿠폰 할인</p>
                            <p className="text-white text-lg font-extrabold">{formatNumber(totalDiscount)}<span className="text-xs opacity-70">{t('won')}</span></p>
                          </div>
                          <div className="flex-1 bg-white/15 backdrop-blur-sm rounded-xl p-3">
                            <p className="text-white/60 text-[10px] font-semibold mb-1">포인트 사용</p>
                            <p className="text-white text-lg font-extrabold">{formatNumber(totalPointsUsed)}<span className="text-xs opacity-70">P</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* ── 나와 닮은 스타 헤어 ── */}
              {(() => {
                const STAR_DATA = [
                  {
                    id: 'cat',
                    faceType: '고양이상',
                    name: '한소희',
                    emoji: '🐱',
                    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
                    styles: [
                      { name: '레이어드 롱헤어', img: 'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=400&q=80', desc: '시크한 분위기의 긴 레이어드' },
                      { name: '숏컷 보브', img: 'https://images.unsplash.com/photo-1595959183082-7b570b7e1e6b?w=400&q=80', desc: '턱선 보브로 도도한 매력' },
                      { name: '웨이브 펌', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', desc: '내추럴 웨이브로 부드러운 이미지' },
                      { name: '다크 브라운 염색', img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80', desc: '깊이감 있는 다크톤 컬러' },
                    ],
                  },
                  {
                    id: 'dog',
                    faceType: '강아지상',
                    name: '수지',
                    emoji: '🐶',
                    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80',
                    styles: [
                      { name: 'C컬 펌', img: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&q=80', desc: '사랑스러운 안쪽 C컬' },
                      { name: '앞머리 + 긴 생머리', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80', desc: '청순한 앞머리 스타일' },
                      { name: '허쉬컷', img: 'https://images.unsplash.com/photo-1554519515-242161756769?w=400&q=80', desc: '볼륨감 있는 허쉬컷' },
                      { name: '애쉬 브라운', img: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80', desc: '따뜻한 애쉬 브라운 톤' },
                    ],
                  },
                  {
                    id: 'turtle',
                    faceType: '꼬북이상',
                    name: '신세경',
                    emoji: '🐢',
                    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
                    styles: [
                      { name: '단발 보브', img: 'https://images.unsplash.com/photo-1620122303020-87ec826cf70c?w=400&q=80', desc: '깔끔한 단발로 귀여운 매력' },
                      { name: '히피 펌', img: 'https://images.unsplash.com/photo-1596178060671-7a80dc8059ea?w=400&q=80', desc: '풍성한 히피 펌 스타일' },
                      { name: '투톤 하이라이트', img: 'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=400&q=80', desc: '포인트 하이라이트로 세련되게' },
                      { name: '묶음머리 + 앞머리', img: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&q=80', desc: '데일리 묶음머리 스타일링' },
                    ],
                  },
                ];

                return (
                  <section className="px-6 lg:px-8 pt-6 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-pink-500 text-lg">stars</span>
                      <h3 className="text-slate-900 text-base font-bold">나와 닮은 스타 헤어</h3>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">관상 타입별 연예인 헤어스타일을 참고해보세요</p>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {STAR_DATA.map(star => (
                        <button key={star.id} onClick={() => setSelectedStar(star)}
                          className="shrink-0 w-[140px] rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-md active:scale-[0.97] transition-all text-left">
                          <div className="h-[130px] relative overflow-hidden">
                            <img src={star.photo} alt={star.name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-2.5 right-2.5">
                              <span className="text-[10px] text-white/70 font-medium">{star.emoji} {star.faceType}</span>
                              <p className="text-sm font-bold text-white">{star.name}</p>
                            </div>
                          </div>
                          <div className="px-3 py-2.5 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">{star.styles.length} styles</span>
                            <span className="material-symbols-outlined text-pink-400 text-sm">arrow_forward</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })()}

              {/* 스타 헤어 상세 모달 */}
              {selectedStar && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center" onClick={() => setSelectedStar(null)}>
                  <div className="bg-white w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    {/* 헤더 */}
                    <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-3 border-b border-slate-100 rounded-t-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={selectedStar.photo} alt={selectedStar.name} className="w-10 h-10 rounded-full object-cover border-2 border-pink-200" />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{selectedStar.emoji} {selectedStar.name} 스타일</p>
                            <p className="text-[10px] text-slate-400">{selectedStar.faceType} · {selectedStar.styles.length} styles</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedStar(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
                          <span className="material-symbols-outlined text-slate-400">close</span>
                        </button>
                      </div>
                    </div>
                    {/* 스타일 그리드 */}
                    <div className="p-4 grid grid-cols-2 gap-3">
                      {selectedStar.styles.map((style, i) => (
                        <div key={i} className="rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm">
                          <div className="h-[160px] overflow-hidden">
                            <img src={style.img} alt={style.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          </div>
                          <div className="p-3">
                            <p className="text-[12px] font-bold text-slate-800 mb-0.5">{style.name}</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{style.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* 예약 버튼 */}
                    <div className="p-4 pt-0">
                      <button onClick={() => { setSelectedStar(null); navigate('/booking'); }}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">calendar_month</span>
                        이 스타일로 예약하기
                      </button>
                    </div>
                  </div>
                </div>
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
              <h3 className="text-slate-900 text-xl font-bold mb-1">My Coupons</h3>
              <p className="text-xs text-slate-400 mb-5">{coupons.length}장 사용 가능</p>

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
                  <p className="text-sm text-slate-400">사용 가능한 쿠폰이 없습니다</p>
                </div>
              )}
            </section>
          )}

          {/* ──── HISTORY TAB ──── */}
          {activeTab === 'history' && (
            <section className="px-6 lg:px-8 py-4">
              <h3 className="text-slate-900 text-xl font-bold mb-1">Style Journey</h3>
              <p className="text-xs text-slate-400 mb-6">{allVisits.length}회 방문 기록</p>

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
            { key: 'home', icon: 'home', label: t('home') || 'Home' },
            { key: 'history', icon: 'timeline', label: 'Journey' },
            { key: 'coupons', icon: 'confirmation_number', label: t('coupons') || 'Coupons' },
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
