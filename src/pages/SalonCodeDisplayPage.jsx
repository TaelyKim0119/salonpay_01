import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useApp } from '../contexts/AppContext';

export default function SalonCodeDisplayPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { currentSalon, showToast } = useApp();

  if (!currentSalon) {
    navigate('/');
    return null;
  }

  const shortCode = currentSalon.spreadsheetId?.slice(-8).toUpperCase() || '';
  const shareLink = `${window.location.origin}?salon=${currentSalon.spreadsheetId}`;

  const copySalonCode = () => {
    navigator.clipboard.writeText(shortCode).then(() => {
      showToast(t('codeCopied'));
    }).catch(() => {
      showToast('코드: ' + shortCode);
    });
  };

  const copySalonLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      showToast(t('codeCopied'));
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(t('codeCopied'));
    });
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans lg:flex lg:items-center lg:justify-center">
      <div className="max-w-md mx-auto min-h-screen lg:min-h-0 bg-white shadow-2xl lg:rounded-2xl lg:my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/admin')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            Salon Code
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-12">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-accent text-[40px]">qr_code_2</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {currentSalon.salonName || 'My Salon'}
          </h2>
          <p className="text-sm text-slate-400 mb-8">
            고객에게 이 코드를 알려주세요
          </p>

          {/* Code Display */}
          <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 mb-4">
            <p className="text-center text-3xl font-extrabold tracking-[6px] text-slate-800 mb-4">
              {shortCode}
            </p>
            <button
              onClick={copySalonCode}
              className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/25 hover:shadow-xl active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-lg">content_copy</span>
              코드 복사
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">또는</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Link Share */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-slate-500 font-semibold mb-2">공유 링크</p>
            <p className="text-xs text-slate-400 break-all mb-3 leading-relaxed">{shareLink}</p>
            <button
              onClick={copySalonLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              링크 복사
            </button>
          </div>

          {/* Dashboard Button */}
          <button
            onClick={() => navigate('/admin')}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            {t('goToDashboard') || 'Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
