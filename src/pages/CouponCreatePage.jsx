import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';

const TEMPLATES = [
  { id: 'birthday', label: 'Birthday', icon: 'cake', defaultAmount: 10000, defaultPercent: false },
  { id: 'loyalty', label: 'Loyalty', icon: 'favorite', defaultAmount: 15, defaultPercent: true },
  { id: 'winback', label: 'Win-back', icon: 'replay', defaultAmount: 20, defaultPercent: true },
  { id: 'special', label: 'Special', icon: 'auto_awesome', defaultAmount: 5000, defaultPercent: false },
];

const AUDIENCES = [
  { id: 'all', label: 'All Clients', icon: 'groups' },
  { id: 'birthday', label: 'Birthday', icon: 'cake' },
  { id: 'new', label: 'New', icon: 'person_add' },
  { id: 'loyal', label: 'Loyal', icon: 'star' },
  { id: 'inactive', label: 'Inactive', icon: 'snooze' },
  { id: 'select', label: 'Select', icon: 'checklist' },
];

export default function CouponCreatePage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentSalon, showLoading, hideLoading, showToast } = useApp();

  const [template, setTemplate] = useState('birthday');
  const [audience, setAudience] = useState('all');
  const [isPercent, setIsPercent] = useState(false);
  const [amount, setAmount] = useState(10000);
  const [validDays, setValidDays] = useState(30);
  const [customers, setCustomers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  // 템플릿 선택 시 기본값
  useEffect(() => {
    const tmpl = TEMPLATES.find(t => t.id === template);
    if (tmpl) {
      setAmount(tmpl.defaultAmount);
      setIsPercent(tmpl.defaultPercent);
    }
  }, [template]);

  // 생일 대상 선택 시 자동으로 이번달 생일자 선택
  useEffect(() => {
    if (audience === 'birthday') {
      const thisMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      const birthdayIds = customers
        .filter(c => c.birthday && c.birthday.substring(0, 2) === thisMonth)
        .map(c => c.id);
      setSelectedIds(birthdayIds);
    } else if (audience === 'all') {
      setSelectedIds(customers.map(c => c.id));
    } else if (audience === 'new') {
      setSelectedIds(customers.filter(c => (c.visitCount || 0) <= 2).map(c => c.id));
    } else if (audience === 'loyal') {
      setSelectedIds(customers.filter(c => (c.visitCount || 0) >= 8).map(c => c.id));
    } else if (audience === 'inactive') {
      setSelectedIds(customers.filter(c => (c.visitCount || 0) >= 3 && (c.visitCount || 0) <= 5).map(c => c.id));
    }
  }, [audience, customers]);

  const loadCustomers = async () => {
    try {
      const list = await sheetsDB.getAllCustomers();
      setCustomers(list);
    } catch (err) {
      console.error(err);
    }
  };

  const expiryDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + validDays);
    return d.toISOString().split('T')[0];
  })();

  const discountText = isPercent ? `${amount}%` : `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}만원`;

  const handleIssue = async () => {
    if (selectedIds.length === 0) {
      showToast('대상 고객을 선택해주세요');
      return;
    }
    try {
      showLoading('쿠폰 발행 중...');
      await sheetsDB.createCouponsForMultiple(selectedIds, {
        type: template,
        amount,
        isPercent,
        expiryDate,
      });
      hideLoading();
      showToast(`${selectedIds.length}명에게 쿠폰 발행 완료!`);
      navigate('/admin');
    } catch (err) {
      hideLoading();
      console.error(err);
      showToast('쿠폰 발행 실패');
    }
  };

  const toggleCustomer = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredList = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  const selectedTemplate = TEMPLATES.find(t => t.id === template);

  // ── Shared form content ──
  const formContent = (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Select Template</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => setTemplate(tmpl.id)}
              className="flex flex-col items-center gap-2 min-w-[72px]"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                template === tmpl.id
                  ? 'bg-accent/20 border-2 border-accent'
                  : 'bg-slate-100 border-2 border-transparent'
              }`}>
                <span className={`material-symbols-outlined text-2xl ${
                  template === tmpl.id ? 'text-accent' : 'text-slate-400'
                }`}>{tmpl.icon}</span>
              </div>
              <span className={`text-[11px] font-semibold ${
                template === tmpl.id ? 'text-accent' : 'text-slate-400'
              }`}>{tmpl.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Audience */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Target Audience</h3>
        <div className="flex gap-2 flex-wrap">
          {AUDIENCES.map(aud => (
            <button
              key={aud.id}
              onClick={() => {
                setAudience(aud.id);
                if (aud.id === 'select') setShowSelectModal(true);
              }}
              className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-medium transition-all ${
                audience === aud.id
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-accent/5 text-accent border border-accent/15 hover:bg-accent/10'
              }`}
            >
              <span className="material-symbols-outlined text-base">{aud.icon}</span>
              {aud.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {audience === 'birthday' && `이번달 생일 고객 ${selectedIds.length}명`}
          {audience === 'all' && `전체 고객 ${selectedIds.length}명`}
          {audience === 'new' && `신규 고객 (2회 이하) ${selectedIds.length}명`}
          {audience === 'loyal' && `단골 고객 (8회 이상) ${selectedIds.length}명`}
          {audience === 'inactive' && `비활성 고객 ${selectedIds.length}명`}
          {audience === 'select' && `선택된 고객 ${selectedIds.length}명`}
        </p>
      </div>

      {/* Coupon Preview */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Coupon Preview</h3>
        <div className="relative w-full aspect-[1.7/1] rounded-xl overflow-hidden bg-accent p-1 shadow-xl shadow-accent/20">
          <div className="w-full h-full border border-white/30 rounded-lg flex flex-col items-center justify-between p-5 relative">
            <div className="absolute top-3 right-3 opacity-20">
              <span className="material-symbols-outlined text-white text-4xl">content_cut</span>
            </div>
            <div className="text-center z-10">
              <p className="text-white/70 uppercase tracking-[0.2em] text-[9px] font-bold mb-1">
                {selectedTemplate?.label || 'Special'} Coupon
              </p>
              <h1 className="text-white text-3xl lg:text-4xl font-extrabold leading-none tracking-tight">
                {discountText} OFF
              </h1>
              <p className="text-white/80 text-sm italic mt-1">Any Salon Service</p>
            </div>
            <div className="flex flex-col items-center w-full gap-2.5 z-10">
              <div className="w-full flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-white/25" />
                <span className="text-white/50 text-[9px] uppercase tracking-widest">Valid for {validDays} days</span>
                <div className="h-[1px] flex-1 bg-white/25" />
              </div>
              <div className="flex items-center justify-between w-full px-1">
                <div>
                  <p className="text-white font-bold text-xs">{currentSalon?.salonName || 'My Salon'}</p>
                  <p className="text-white/60 text-[9px]">~ {expiryDate}</p>
                </div>
                <div className="bg-white/90 p-1 rounded">
                  <span className="material-symbols-outlined text-accent text-xl">qr_code_2</span>
                </div>
              </div>
            </div>
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white" />
            <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-3">
        {/* Discount Type Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-500 text-lg">tune</span>
            <span className="text-sm font-medium">Discount Type</span>
          </div>
          <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
            <button onClick={() => { setIsPercent(false); setAmount(10000); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${!isPercent ? 'bg-accent text-white' : 'text-slate-400'}`}>
              ₩ 금액
            </button>
            <button onClick={() => { setIsPercent(true); setAmount(15); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${isPercent ? 'bg-accent text-white' : 'text-slate-400'}`}>
              % 비율
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-500 text-lg">edit</span>
            <span className="text-sm font-medium">Discount Value</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setAmount(a => Math.max(isPercent ? 5 : 1000, a - (isPercent ? 5 : 5000)))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <span className="material-symbols-outlined text-base">remove</span>
            </button>
            <span className="text-accent font-bold text-sm min-w-[50px] text-center">
              {isPercent ? `${amount}%` : `${(amount / 10000).toFixed(amount % 10000 === 0 ? 0 : 1)}만원`}
            </span>
            <button onClick={() => setAmount(a => Math.min(isPercent ? 50 : 100000, a + (isPercent ? 5 : 5000)))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <span className="material-symbols-outlined text-base">add</span>
            </button>
          </div>
        </div>

        {/* Valid Days */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-500 text-lg">calendar_today</span>
            <span className="text-sm font-medium">Valid Period</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setValidDays(d => Math.max(7, d - 7))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <span className="material-symbols-outlined text-base">remove</span>
            </button>
            <span className="text-sm font-bold text-slate-800 min-w-[50px] text-center">{validDays}일</span>
            <button onClick={() => setValidDays(d => Math.min(180, d + 7))}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <span className="material-symbols-outlined text-base">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Issue Button */}
      <button
        onClick={handleIssue}
        disabled={selectedIds.length === 0}
        className="w-full bg-accent hover:bg-accent/90 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/25 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <span>{selectedIds.length}명에게 쿠폰 발행</span>
        <span className="material-symbols-outlined text-lg">send</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-light font-sans">
      {/* ── Mobile ── */}
      <div className="lg:hidden max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col">
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            Create Coupon
          </h1>
        </div>
        <div className="flex-1 px-5 pb-8 overflow-y-auto">
          {formContent}
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left: Preview Panel */}
        <div className="w-1/2 relative overflow-hidden bg-gradient-to-br from-accent/5 via-white to-accent/10 flex items-center justify-center p-16">
          <div className="w-full max-w-md">
            {/* Large Coupon Preview */}
            <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden bg-accent p-1.5 shadow-2xl shadow-accent/30">
              <div className="w-full h-full border border-white/30 rounded-xl flex flex-col items-center justify-between p-8 relative">
                <div className="absolute top-5 right-5 opacity-20">
                  <span className="material-symbols-outlined text-white text-6xl">content_cut</span>
                </div>
                <div className="text-center z-10">
                  <p className="text-white/70 uppercase tracking-[0.25em] text-[11px] font-bold mb-2">
                    {selectedTemplate?.label || 'Special'} Coupon
                  </p>
                  <h1 className="text-white text-5xl font-extrabold leading-none tracking-tight">
                    {discountText} OFF
                  </h1>
                  <p className="text-white/80 text-lg italic mt-2">Any Salon Service</p>
                </div>
                <div className="flex flex-col items-center w-full gap-3 z-10">
                  <div className="w-full flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-white/25" />
                    <span className="text-white/50 text-[10px] uppercase tracking-widest">Valid for {validDays} days</span>
                    <div className="h-[1px] flex-1 bg-white/25" />
                  </div>
                  <div className="flex items-center justify-between w-full px-2">
                    <div>
                      <p className="text-white font-bold text-sm">{currentSalon?.salonName || 'My Salon'}</p>
                      <p className="text-white/60 text-[10px]">Expires: {expiryDate}</p>
                    </div>
                    <div className="bg-white/90 p-1.5 rounded-md">
                      <span className="material-symbols-outlined text-accent text-2xl">qr_code_2</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f8f6f6]" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#f8f6f6]" />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                <p className="text-2xl font-extrabold text-accent">{selectedIds.length}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Recipients</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                <p className="text-2xl font-extrabold text-slate-800">{discountText}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Discount</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-slate-100">
                <p className="text-2xl font-extrabold text-slate-800">{validDays}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Days Valid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="w-1/2 flex items-start justify-center p-16 bg-white overflow-y-auto max-h-screen">
          <div className="w-full max-w-md">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-8"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              <span className="text-sm font-medium">Back to Dashboard</span>
            </button>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Create Coupon</h2>
            <p className="text-sm text-slate-400 mb-8">고객에게 할인 쿠폰을 발행하세요</p>
            {formContent}
          </div>
        </div>
      </div>

      {/* ── Customer Select Modal ── */}
      {showSelectModal && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40" onClick={() => setShowSelectModal(false)}>
          <div className="bg-white w-full max-w-md lg:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-base font-bold">고객 선택</h3>
              <button onClick={() => setShowSelectModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="이름 또는 전화번호 검색"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
              {filteredList.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleCustomer(c.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    selectedIds.includes(c.id) ? 'bg-accent/5 border border-accent/20' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedIds.includes(c.id) ? 'bg-accent border-accent' : 'border-slate-300'
                  }`}>
                    {selectedIds.includes(c.id) && <span className="material-symbols-outlined text-white text-sm">check</span>}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-[11px] text-slate-400">{c.phone}</p>
                  </div>
                  {c.birthday && (
                    <span className="text-[10px] text-slate-300">{c.birthday.substring(0, 2)}/{c.birthday.substring(2)}생</span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setShowSelectModal(false)}
                className="w-full bg-accent text-white font-bold py-3 rounded-xl"
              >
                {selectedIds.length}명 선택 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
