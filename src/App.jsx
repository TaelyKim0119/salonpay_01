import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Contexts
import { I18nProvider } from './contexts/I18nContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';

// Common Components
import { Loading, Toast } from './components/common';

// Pages
import {
  MainPage,
  SalonCodePage,
  CustomerLoginPage,
  CustomerDashboardPage,
  AdminLoginPage,
  AdminRegisterPage,
  AdminDashboardPage,
  CustomerDetailPage,
  SalonCodeDisplayPage,
  AIAnalysisPage,
  CouponCreatePage,
  BookingPage
} from './pages';

// Services
import sheetsDB from './services/googleSheetsDB';

function AppContent() {
  useEffect(() => {
    // 저장된 미용실 복원 (데모 모드 포함)
    sheetsDB.restoreCurrentSalon();

    // Google Sheets API 초기화 (데모 모드가 아닐 때만 필요하지만, 전환 대비 항상 시도)
    const initGoogleAPI = async () => {
      try {
        const waitForGapi = () => new Promise((resolve, reject) => {
          if (typeof window.gapi !== 'undefined') {
            resolve();
          } else {
            let elapsed = 0;
            const checkInterval = setInterval(() => {
              elapsed += 100;
              if (typeof window.gapi !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
              } else if (elapsed > 10000) {
                clearInterval(checkInterval);
                reject(new Error('gapi load timeout'));
              }
            }, 100);
          }
        });

        await waitForGapi();
        await sheetsDB.initialize();
        console.log('Google Sheets API 초기화 완료');
      } catch (error) {
        console.error('Google API 초기화 오류:', error);
      }
    };

    initGoogleAPI();
  }, []);

  return (
    <div className="min-h-screen bg-bg-light">
      <Routes>
        {/* 메인 */}
        <Route path="/" element={<MainPage />} />

        {/* 고객 */}
        <Route path="/salon-code" element={<SalonCodePage />} />
        <Route path="/customer/login" element={<CustomerLoginPage />} />
        <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />

        {/* 관리자 */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/register" element={<AdminRegisterPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/customer/:customerId" element={<CustomerDetailPage />} />
        <Route path="/admin/salon-code" element={<SalonCodeDisplayPage />} />
        <Route path="/admin/ai-analysis" element={<AIAnalysisPage />} />
        <Route path="/admin/coupons" element={<CouponCreatePage />} />
        <Route path="/booking" element={<BookingPage />} />
      </Routes>

      {/* Global Components */}
      <Loading />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
