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
  AIAnalysisPage
} from './pages';

// Services
import sheetsDB from './services/googleSheetsDB';

function AppContent() {
  useEffect(() => {
    // Google Sheets API 초기화
    const initGoogleAPI = async () => {
      try {
        // gapi 로드 대기
        const waitForGapi = () => new Promise((resolve) => {
          if (typeof window.gapi !== 'undefined') {
            resolve();
          } else {
            const checkInterval = setInterval(() => {
              if (typeof window.gapi !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
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
