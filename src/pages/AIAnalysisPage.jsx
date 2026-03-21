import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';
import {
  analyzeIndividualCustomer,
  analyzeOverallCustomers,
  analyzeRevenue,
  analyzeRetention,
  analyzeMarketing
} from '../services/aiAnalysis';

export default function AIAnalysisPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentSalon, showToast } = useApp();

  const [selectedType, setSelectedType] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    if (!currentSalon) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [currentSalon]);

  const loadData = async () => {
    try {
      const [data, dashStats, allVisits] = await Promise.all([
        sheetsDB.getAllCustomers(),
        sheetsDB.getDashboardStats(),
        sheetsDB.getAllVisits()
      ]);
      setCustomers(data);
      setStats(dashStats);
      setVisits(allVisits);
    } catch (err) {
      console.error('데이터 로드 오류:', err);
    }
  };

  const analysisTypes = [
    { id: 'individual', title: '개별 고객 분석', desc: '특정 고객의 방문 패턴과 맞춤 전략', needsCustomer: true },
    { id: 'overall', title: '전체 고객 분석', desc: '고객 세그먼트와 트렌드 분석', needsCustomer: false },
    { id: 'revenue', title: '매출 분석', desc: '서비스별 매출과 성장 전략', needsCustomer: false },
    { id: 'retention', title: '재방문 예측', desc: '이탈 위험 고객과 리텐션 전략', needsCustomer: false },
    { id: 'marketing', title: '마케팅 전략', desc: '시즌별 공략법과 프로모션 캘린더', needsCustomer: false }
  ];

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSelectedCustomer(null);
    setAnalysisResult(null);
  };

  const runAnalysis = async () => {
    if (!selectedType) return;
    if (selectedType.needsCustomer && !selectedCustomer) {
      showToast('분석할 고객을 선택해주세요');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const salonName = currentSalon?.salonName || '미용실';
      let result;

      switch (selectedType.id) {
        case 'individual': {
          const customerVisits = visits.filter(v => v.customerId === selectedCustomer.id);
          result = await analyzeIndividualCustomer(selectedCustomer, customerVisits, salonName);
          break;
        }
        case 'overall':
          result = await analyzeOverallCustomers(customers, stats, salonName);
          break;
        case 'revenue': {
          const monthlyData = calculateMonthlyData(visits);
          result = await analyzeRevenue(visits, stats, monthlyData, salonName);
          break;
        }
        case 'retention':
          result = await analyzeRetention(customers, visits, salonName);
          break;
        case 'marketing': {
          const mData = calculateMonthlyData(visits);
          result = await analyzeMarketing(visits, customers, stats, mData, salonName);
          break;
        }
      }

      setAnalysisResult(result);
    } catch (error) {
      console.error('분석 오류:', error);
      showToast(error.message || '분석 중 오류가 발생했습니다');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateMonthlyData = (visits) => {
    const monthlyMap = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { month: key, revenue: 0, visits: 0 };
    }
    visits.forEach(v => {
      const month = v.date?.slice(0, 7);
      if (monthlyMap[month]) {
        monthlyMap[month].revenue += v.finalAmount || 0;
        monthlyMap[month].visits += 1;
      }
    });
    return Object.values(monthlyMap);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.includes(searchQuery) || c.phone?.includes(searchQuery)
  );

  const renderMarkdown = (text) => {
    return text
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br/>');
  };

  // ─── Dashboard view (no type selected) ───
  if (!selectedType) {
    // Calculate segments
    const loyal = customers.filter(c => (c.visitCount || 0) >= 5).length;
    const dormant = customers.filter(c => (c.visitCount || 0) === 1).length;
    const newC = customers.length - loyal - dormant;
    const total = customers.length || 1;
    const loyalPct = Math.round((loyal / total) * 100);
    const newPct = Math.round((newC / total) * 100);
    const dormantPct = 100 - loyalPct - newPct;

    return (
      <div className="bg-bg-light font-display text-slate-900 antialiased min-h-screen">
        <div className="relative flex h-auto min-h-screen w-full max-w-md lg:max-w-6xl mx-auto flex-col bg-white overflow-x-hidden shadow-2xl">

          {/* Header */}
          <header className="flex items-center p-4 pb-2 justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-primary/10">
            <button onClick={() => navigate('/admin')} className="flex size-12 shrink-0 items-center justify-start">
              <span className="material-symbols-outlined cursor-pointer">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">Salon Intelligence Report</h2>
            <div className="flex w-12 items-center justify-end">
              <button className="flex items-center justify-center rounded-xl h-12 bg-transparent p-0">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-24">
            {/* Desktop: two-column layout for revenue + segments */}
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-8">

            {/* Revenue Section */}
            <section className="px-4 lg:px-0 py-6">
              <div className="flex flex-col gap-2 mb-4">
                <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Monthly Revenue & Client Growth</p>
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-extrabold leading-none">
                    {stats ? `${Math.round((stats.totalRevenue || 0) / 10000)}만` : '...'}
                  </p>
                  <div className="flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    <span className="text-sm font-bold">12.5%</span>
                  </div>
                </div>
              </div>
              {/* Chart */}
              <div className="relative h-48 w-full">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 150">
                  <defs>
                    <linearGradient id="paint0_linear_salon" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#paint0_linear_salon)" d="M0,120 C50,110 80,40 120,50 C160,60 180,90 220,80 C260,70 300,20 350,30 C380,36 400,10 400,10 L400,150 L0,150 Z" />
                  <path d="M0,120 C50,110 80,40 120,50 C160,60 180,90 220,80 C260,70 300,20 350,30 C380,36 400,10 400,10" fill="none" stroke="#8b5cf6" strokeLinecap="round" strokeWidth="3" />
                </svg>
                <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                </div>
              </div>
            </section>

            {/* AI Insight Box */}
            <section className="px-4 lg:px-0 mb-8">
              <div className="p-5 bg-white border-2 border-primary/30 rounded-xl shadow-[0_0_15px_rgba(244,144,177,0.2)]">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary mb-1">AI Intelligence Insight</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      AI 분석을 실행하면 매출 예측, 고객 이탈 위험, 마케팅 전략 등 <span className="font-bold text-slate-900 underline decoration-primary">맞춤 인사이트</span>를 제공합니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            </div>{/* end desktop two-column */}

            {/* Customer Segments */}
            <section className="px-4 lg:px-8 mb-8">
              <h3 className="text-lg font-bold mb-4">Customer Segments</h3>
              <div className="flex items-center justify-between gap-6 p-4 bg-primary/5 rounded-2xl">
                <div className="relative w-32 h-32 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="stroke-slate-200" cx="18" cy="18" fill="none" r="16" strokeWidth="3" />
                    <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${loyalPct}, 100`} strokeDashoffset="0" strokeWidth="3" />
                    <circle className="stroke-primary/50" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${newPct}, 100`} strokeDashoffset={`-${loyalPct}`} strokeWidth="3" />
                    <circle className="stroke-slate-300" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${dormantPct}, 100`} strokeDashoffset={`-${loyalPct + newPct}`} strokeWidth="3" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold leading-none">{customers.length}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm font-medium">Loyal</span>
                    </div>
                    <span className="text-sm font-bold">{loyalPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary/50" />
                      <span className="text-sm font-medium">New</span>
                    </div>
                    <span className="text-sm font-bold">{newPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                      <span className="text-sm font-medium">Dormant</span>
                    </div>
                    <span className="text-sm font-bold">{dormantPct}%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Analysis Type Buttons */}
            <section className="px-4 lg:px-8 mb-12">
              <h3 className="text-lg font-bold mb-4">AI Analysis</h3>
              <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
                {analysisTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type)}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary">auto_awesome</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{type.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{type.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                  </button>
                ))}
              </div>
            </section>
          </main>

          {/* Bottom Nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto flex border-t border-primary/10 bg-white/95 backdrop-blur-md px-4 pb-6 pt-3">
            <button onClick={() => navigate('/admin')} className="flex flex-1 flex-col items-center justify-center gap-1 text-slate-400">
              <span className="material-symbols-outlined">dashboard</span>
              <p className="text-[10px] font-bold uppercase tracking-wider">Dashboard</p>
            </button>
            <button className="flex flex-1 flex-col items-center justify-center gap-1 text-primary">
              <span className="material-symbols-outlined">analytics</span>
              <p className="text-[10px] font-bold uppercase tracking-wider">Analytics</p>
            </button>
          </nav>
        </div>
      </div>
    );
  }

  // ─── Customer Selection (individual) ───
  if (selectedType.needsCustomer && !selectedCustomer && !analysisResult) {
    return (
      <div className="bg-bg-light font-display min-h-screen lg:flex lg:items-start lg:justify-center">
        <div className="max-w-md lg:max-w-2xl mx-auto min-h-screen lg:min-h-0 bg-white shadow-2xl lg:rounded-2xl lg:my-8">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-primary/10 px-4 h-14 flex items-center lg:rounded-t-2xl">
          <button onClick={() => setSelectedType(null)} className="w-10 h-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold flex-1 text-center pr-10">분석할 고객 선택</h1>
        </div>
        <div className="px-4 lg:px-6 pt-4">
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[20px]">search</span>
            <input
              type="text"
              placeholder="이름 또는 전화번호 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>
          <div className="flex flex-col gap-2 pb-8">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => { setSelectedCustomer(customer); }}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {customer.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{customer.name}</p>
                  <p className="text-xs text-slate-400">{customer.phone}</p>
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {customer.visitCount}회
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ─── Analysis Ready / Running ───
  if (!analysisResult) {
    return (
      <div className="bg-bg-light font-display min-h-screen lg:flex lg:items-center lg:justify-center">
        <div className="max-w-md mx-auto min-h-screen lg:min-h-0 bg-white shadow-2xl lg:rounded-2xl lg:my-8">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-primary/10 px-4 h-14 flex items-center">
          <button
            onClick={() => selectedCustomer ? setSelectedCustomer(null) : setSelectedType(null)}
            className="w-10 h-10 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold flex-1 text-center pr-10">{selectedType.title}</h1>
        </div>
        <div className="flex flex-col items-center text-center px-6 pt-16">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined text-primary text-[48px]">auto_awesome</span>
          </div>
          <h2 className="text-[22px] font-extrabold text-slate-800 mb-2">{selectedType.title}</h2>
          {selectedCustomer && (
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-3">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold">
                {selectedCustomer.name?.charAt(0)}
              </div>
              <span className="text-sm font-semibold text-primary-dark">{selectedCustomer.name}</span>
            </div>
          )}
          <p className="text-sm text-slate-400 leading-relaxed mb-10 max-w-[260px]">{selectedType.desc}</p>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full max-w-[280px] py-4 rounded-2xl text-[15px] font-bold text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/30 hover:shadow-xl active:scale-[0.97] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                AI 분석 시작
              </>
            )}
          </button>
        </div>
        </div>
      </div>
    );
  }

  // ─── Analysis Result ───
  return (
    <div className="bg-bg-light font-display min-h-screen lg:flex lg:items-start lg:justify-center">
      <div className="max-w-md lg:max-w-3xl mx-auto min-h-screen lg:min-h-0 bg-white shadow-2xl lg:rounded-2xl lg:my-8">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-primary/10 px-4 h-14 flex items-center">
        <button
          onClick={() => { setAnalysisResult(null); setSelectedCustomer(null); setSelectedType(null); }}
          className="w-10 h-10 flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-slate-700">arrow_back</span>
        </button>
        <h1 className="text-[17px] font-bold flex-1 text-center pr-10">분석 결과</h1>
      </div>

      <div className="px-4 lg:px-8 pt-6 pb-24 lg:pb-8">
        {/* Result Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-extrabold text-slate-800">{selectedType.title} 결과</h2>
            <span className="text-[11px] text-slate-400">
              {new Date(analysisResult.timestamp).toLocaleString('ko-KR')}
            </span>
          </div>
        </div>

        {/* AI Insight Box */}
        <div className="relative border-2 border-primary/30 rounded-xl bg-white shadow-[0_0_20px_rgba(244,144,177,0.1)] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-dark" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
              <span className="text-sm font-bold text-primary-dark tracking-tight">AI Intelligence Insight</span>
            </div>
            <div
              className="text-sm text-slate-600 leading-[1.8] [&_h1]:text-lg [&_h1]:font-extrabold [&_h1]:text-slate-800 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-700 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-700 [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-slate-800 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_li]:mb-0.5"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisResult.analysis) }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => {
              navigator.clipboard.writeText(analysisResult.analysis);
              showToast('분석 결과가 복사되었습니다');
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.97] transition-all"
          >
            <span className="material-symbols-outlined text-lg">content_copy</span>
            복사하기
          </button>
          <button
            onClick={() => { setAnalysisResult(null); setSelectedCustomer(null); }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-sm font-bold text-white shadow-md shadow-primary/30 active:scale-[0.97] transition-all"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            다시 분석
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
