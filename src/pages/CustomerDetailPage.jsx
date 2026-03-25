import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import sheetsDB from '../services/googleSheetsDB';
import { formatNumber, formatDate } from '../utils/format';

export default function CustomerDetailPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const { t, formatDate: formatDateI18n } = useI18n();

  const [customer, setCustomer] = useState(null);
  const [visits, setVisits] = useState([]);
  const [couponsCount, setCouponsCount] = useState(0);

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      const [customerData, customerVisits, coupons] = await Promise.all([
        sheetsDB.getCustomerById(customerId),
        sheetsDB.getVisitsByCustomerId(customerId),
        sheetsDB.getActiveCouponsByCustomerId(customerId)
      ]);

      setCustomer(customerData);
      setVisits(customerVisits);
      setCouponsCount(coupons.length);
    } catch (err) {
      console.error('고객 정보 로드 오류:', err);
    }
  };

  if (!customer) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const firstLetter = (customer.name || '?').charAt(0).toUpperCase();
  const customerPhotoIdx = ((customerId || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 5) + 1;
  const customerPhoto = `/images/customer-${customerPhotoIdx}.png`;
  const totalDays = customer.createdAt
    ? Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const getServiceIcon = (service) => {
    const s = (service || '').toLowerCase();
    if (s.includes('염색') || s.includes('color') || s.includes('balayage')) return 'auto_awesome';
    if (s.includes('커트') || s.includes('cut') || s.includes('bob')) return 'content_cut';
    if (s.includes('펌') || s.includes('perm') || s.includes('wave')) return 'waves';
    if (s.includes('트리트먼트') || s.includes('treatment') || s.includes('scalp') || s.includes('케어')) return 'spa';
    return 'history_edu';
  };

  /** 사진이 있는 visit인지 판단 — 시각적 변화가 큰 서비스(염색, 펌, 하이라이트 등) */
  const hasPhoto = (service) => {
    const s = (service || '').toLowerCase();
    return s.includes('염색') || s.includes('color') || s.includes('balayage')
      || s.includes('펌') || s.includes('perm') || s.includes('wave')
      || s.includes('하이라이트') || s.includes('highlight')
      || s.includes('글레이징') || s.includes('glaz')
      || s.includes('컬러') || s.includes('colour');
  };

  return (
    <div className="bg-bg-light text-slate-900 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg-light/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center p-4 justify-between max-w-md lg:max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">Style Journey</h1>
          <button className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-slate-700">more_horiz</span>
          </button>
        </div>
      </div>

      <main className="max-w-md lg:max-w-4xl mx-auto pb-24 lg:pb-8">
        {/* User Profile Header */}
        <div className="flex p-6 lg:p-8">
          <div className="flex w-full flex-col gap-4 items-center">
            <div className="flex gap-4 flex-col lg:flex-row items-center">
              <div className="relative">
                <div className="rounded-full min-h-24 w-24 border-4 border-white shadow-lg overflow-hidden">
                  <img src={customerPhoto} alt={customer.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 bg-accent p-1.5 rounded-full border-2 border-white">
                  <span className="material-symbols-outlined text-white text-sm block">verified</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-slate-900 text-2xl font-bold leading-tight tracking-tight text-center">{customer.name}</p>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  {customer.phone} · {visits.length} {t('transformations') || 'Visits'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 px-4 lg:px-0 mb-8">
          <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
            <p className="text-rose-accent text-xl font-bold">{customer.visitCount || 0}</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">{t('visits') || 'Visits'}</p>
          </div>
          <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
            <p className="text-rose-accent text-xl font-bold">{formatNumber(customer.points || 0)}</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">{t('points') || 'Points'}</p>
          </div>
          <div className="flex-1 bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-center">
            <p className="text-rose-accent text-xl font-bold">{totalDays}</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">{t('days') || 'Days'}</p>
          </div>
        </div>

        <h2 className="text-slate-900 text-xl font-bold px-6 lg:px-0 pb-4">{t('styleEvolution') || 'Style Evolution'}</h2>

        {/* Timeline */}
        <div className="relative px-6 lg:px-0">
          {/* Central Line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-[2px] bg-slate-200" />

          {visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300 ml-8">
              <span className="material-symbols-outlined text-[48px] mb-3">calendar_today</span>
              <p className="text-sm text-slate-400">{t('noVisitHistory') || 'No visit history yet'}</p>
            </div>
          ) : (
            visits.map((visit, index) => (
              <div key={visit.id} className="relative flex gap-6 mb-10">
                <div className="z-10 mt-1 flex-shrink-0">
                  <div className="relative">
                    {/* Sparkle effects for photo visits */}
                    {hasPhoto(visit.service) && (
                      <>
                        {/* Ping ring */}
                        <div className="absolute inset-0 rounded-full bg-primary/30 node-photo-ping" />
                        {/* Twinkle stars */}
                        <span className="absolute -top-1 -right-1 text-primary text-[10px] node-twinkle-1">&#10022;</span>
                        <span className="absolute -bottom-0.5 -left-1 text-primary-light text-[8px] node-twinkle-2">&#10022;</span>
                        <span className="absolute -top-0.5 -left-1.5 text-rose-accent text-[9px] node-twinkle-3">&#10022;</span>
                      </>
                    )}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-bg-light ${
                      hasPhoto(visit.service)
                        ? 'bg-primary node-photo-glow cursor-pointer'
                        : index === 0 ? 'bg-rose-accent' : 'bg-slate-300'
                    }`}>
                      <span className="material-symbols-outlined text-white text-sm">
                        {hasPhoto(visit.service) ? 'photo_camera' : getServiceIcon(visit.service)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-slate-900 font-bold text-lg">{visit.service}</p>
                      <p className={`text-sm font-semibold italic ${index === 0 ? 'text-rose-accent' : 'text-slate-500'}`}>
                        {formatDate(visit.date, formatDateI18n)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {visit.paymentMethod && (
                          <span className="text-slate-400">{visit.paymentMethod} · </span>
                        )}
                        {formatNumber(visit.finalAmount || 0)}{t('won')}
                      </p>
                      <span className="text-accent font-bold text-sm">+{formatNumber(visit.pointsEarned || 0)}P</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200">
        <div className="flex max-w-md mx-auto h-20 items-stretch">
          <button
            onClick={() => navigate('/admin')}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400"
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-accent">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Journey</span>
          </button>
          <div className="flex flex-1 items-center justify-center">
            <button className="bg-accent h-12 w-12 rounded-full flex items-center justify-center text-white shadow-lg shadow-accent/30">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Book</span>
          </button>
          <button className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
