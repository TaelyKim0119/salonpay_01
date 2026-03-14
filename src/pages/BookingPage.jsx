import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';

const SERVICES = [
  { label: '커트', icon: 'content_cut' },
  { label: '염색', icon: 'palette' },
  { label: '펌', icon: 'waves' },
  { label: '클리닉 / 케어', icon: 'spa' },
  { label: '기타', icon: 'more_horiz' },
];

const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00',
];

export default function BookingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentSalon, currentCustomer, showLoading, hideLoading, showToast } = useApp();

  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [memo, setMemo] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [existingBookings, setExistingBookings] = useState([]);

  // 고객 로그인 상태면 이름/전화 자동 채움
  const isCustomer = !!currentCustomer;
  const isAdmin = !isCustomer;

  useEffect(() => {
    if (currentCustomer) {
      setName(currentCustomer.name || '');
      setPhone(currentCustomer.phone || '');
    }
    // 오늘 날짜 기본값
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const all = await sheetsDB.getAllBookings();
      setExistingBookings(all);
    } catch (e) { console.error(e); }
  };

  // 선택한 날짜에 이미 예약된 시간
  const bookedTimes = existingBookings
    .filter(b => b.date === date && b.status !== 'cancelled')
    .map(b => b.time);

  const handleSubmit = async () => {
    if (!service || !date || !time) {
      showToast('서비스, 날짜, 시간을 선택해주세요');
      return;
    }
    if (!name.trim()) {
      showToast('이름을 입력해주세요');
      return;
    }

    try {
      showLoading('예약 등록 중...');
      await sheetsDB.createBooking({
        customerId: currentCustomer?.id || '',
        customerName: name.trim(),
        phone: phone.trim(),
        service,
        date,
        time,
        memo: memo.trim(),
      });
      hideLoading();
      showToast('예약이 완료되었습니다!');

      if (isCustomer) {
        navigate('/customer/dashboard');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      hideLoading();
      console.error(err);
      showToast('예약 실패');
    }
  };

  // 최소 날짜 = 오늘
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-bg-light font-sans">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-14 border-b border-slate-100">
          <button
            onClick={() => navigate(isCustomer ? '/customer/dashboard' : '/admin')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            New Booking
          </h1>
        </div>

        <div className="flex-1 px-5 py-6 overflow-y-auto space-y-6">
          {/* Salon Info */}
          {currentSalon && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
              <span className="material-symbols-outlined text-accent text-lg">storefront</span>
              <span className="text-sm font-bold text-slate-700">{currentSalon.salonName}</span>
            </div>
          )}

          {/* 고객 정보 */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">고객 정보</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="이름"
                readOnly={isCustomer}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 ${isCustomer ? 'text-slate-500' : ''}`}
              />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="전화번호"
                readOnly={isCustomer}
                className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 ${isCustomer ? 'text-slate-500' : ''}`}
              />
            </div>
          </div>

          {/* 서비스 선택 */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">서비스</h3>
            <div className="flex flex-wrap gap-2">
              {SERVICES.map(s => (
                <button
                  key={s.label}
                  onClick={() => setService(s.label)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    service === s.label
                      ? 'bg-accent text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">날짜</h3>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={e => { setDate(e.target.value); setTime(''); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {/* 시간 */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">시간</h3>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map(slot => {
                const isBooked = bookedTimes.includes(slot);
                return (
                  <button
                    key={slot}
                    disabled={isBooked}
                    onClick={() => setTime(slot)}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      time === slot
                        ? 'bg-accent text-white shadow-sm'
                        : isBooked
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">메모 <span className="text-slate-400 font-normal">(선택)</span></h3>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="요청사항이 있으면 적어주세요"
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          {/* 예약 요약 */}
          {service && date && time && (
            <div className="bg-accent/5 border border-accent/15 rounded-xl p-4">
              <h3 className="text-sm font-bold text-accent mb-2">예약 요약</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="text-slate-400 w-14 inline-block">서비스</span> {service}</p>
                <p><span className="text-slate-400 w-14 inline-block">날짜</span> {date}</p>
                <p><span className="text-slate-400 w-14 inline-block">시간</span> {time}</p>
                {name && <p><span className="text-slate-400 w-14 inline-block">고객</span> {name}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={!service || !date || !time || !name.trim()}
            className="w-full bg-accent hover:bg-accent/90 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">event_available</span>
            예약하기
          </button>
        </div>
      </div>
    </div>
  );
}
