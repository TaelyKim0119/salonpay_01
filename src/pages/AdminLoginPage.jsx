import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import sheetsDB from '../services/googleSheetsDB';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { signIn } = useAuth();
  const { setCurrentSalon, showLoading, hideLoading, showToast } = useApp();

  const handleGoogleSignIn = async () => {
    try {
      showLoading(t('loadingData'));
      const result = await signIn();

      // gapi에 토큰 설정
      sheetsDB.setAccessToken(result.accessToken);

      // 기존 미용실 찾기
      const savedSalon = sheetsDB.restoreCurrentSalon();
      if (savedSalon) {
        setCurrentSalon(savedSalon);
        hideLoading();
        showToast(t('existingSalonFound'));
        navigate('/admin');
        return;
      }

      // Google Drive에서 검색
      const foundSalon = await sheetsDB.findMySalon(result.accessToken);
      hideLoading();

      if (foundSalon) {
        setCurrentSalon(foundSalon);
        showToast(t('existingSalonFound'));
        navigate('/admin');
      } else {
        navigate('/admin/register');
      }
    } catch (err) {
      hideLoading();
      console.error('로그인 오류:', err);
      showToast(t('loginRequired'));
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-slate-700">arrow_back</span>
          </button>
          <h1 className="text-[17px] font-bold text-slate-800 flex-1 text-center pr-10">
            {t('adminLogin') || 'Admin Login'}
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-16">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-8">
            <span className="material-symbols-outlined text-accent text-[40px]">admin_panel_settings</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {t('adminLogin') || 'Salon Owner Login'}
          </h2>
          <p className="text-sm text-slate-400 text-center mb-3 leading-relaxed max-w-[280px]">
            {t('adminLoginDesc') || 'Sign in with Google to manage your salon'}
          </p>
          <p className="text-xs text-slate-300 text-center mb-12 max-w-[260px]">
            {t('adminLoginSubtext') || 'Google Sheets will be used as your database'}
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span className="text-[15px]">{t('googleSignIn') || 'Sign in with Google'}</span>
          </button>

          {/* Info Box */}
          <div className="mt-6 w-full px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5">info</span>
              <p className="text-xs text-amber-700 leading-relaxed">
                {t('loginInfo') || 'Your salon data is stored in Google Sheets on your own Google account.'}
              </p>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full py-3 text-slate-500 font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            {t('back') || 'Back'}
          </button>
        </div>
      </div>
    </div>
  );
}
