import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../config/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userPicture, setUserPicture] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);

  // Google Identity Services 초기화
  useEffect(() => {
    const initGoogleAuth = async () => {
      try {
        await waitForGoogleIdentityServices();

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          scope: CONFIG.SCOPES,
          callback: () => {} // Will be set during signIn
        });

        setTokenClient(client);
        restoreSession();
        setIsInitialized(true);
      } catch (error) {
        console.error('Google Auth 초기화 실패:', error);
        setIsInitialized(true);
      }
    };

    initGoogleAuth();
  }, []);

  const waitForGoogleIdentityServices = (timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkGoogle = () => {
        if (typeof window.google !== 'undefined' && window.google.accounts?.oauth2) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Google Identity Services 로드 시간 초과'));
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      checkGoogle();
    });
  };

  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('사용자 정보를 가져올 수 없습니다.');

      const userInfo = await response.json();
      setUserEmail(userInfo.email);
      setUserName(userInfo.name);
      setUserPicture(userInfo.picture);

      // 세션 저장
      saveSession(token, userInfo);

      return userInfo;
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      throw error;
    }
  };

  const saveSession = (token, userInfo) => {
    const sessionData = {
      accessToken: token,
      userEmail: userInfo.email,
      userName: userInfo.name,
      userPicture: userInfo.picture,
      timestamp: Date.now()
    };
    sessionStorage.setItem('salonpay_auth', JSON.stringify(sessionData));
  };

  const restoreSession = () => {
    try {
      const sessionData = sessionStorage.getItem('salonpay_auth');
      if (!sessionData) return false;

      const data = JSON.parse(sessionData);

      // 세션 유효성 검사 (1시간)
      if (Date.now() - data.timestamp > 60 * 60 * 1000) {
        sessionStorage.removeItem('salonpay_auth');
        return false;
      }

      setAccessToken(data.accessToken);
      setUserEmail(data.userEmail);
      setUserName(data.userName);
      setUserPicture(data.userPicture);

      // 토큰 유효성 검증
      validateToken(data.accessToken);

      return true;
    } catch (error) {
      console.error('세션 복원 실패:', error);
      return false;
    }
  };

  const validateToken = async (token) => {
    if (!token) return;

    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      if (!response.ok) {
        signOut();
      }
    } catch (error) {
      console.error('토큰 검증 실패:', error);
      signOut();
    }
  };

  const signIn = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        reject(new Error('AuthManager가 초기화되지 않았습니다.'));
        return;
      }

      tokenClient.callback = async (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        setAccessToken(response.access_token);

        try {
          const userInfo = await fetchUserInfo(response.access_token);
          resolve({
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            accessToken: response.access_token
          });
        } catch (error) {
          reject(error);
        }
      };

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }, [tokenClient]);

  const signOut = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        console.log('토큰 폐기됨');
      });
    }

    setAccessToken(null);
    setUserEmail(null);
    setUserName(null);
    setUserPicture(null);
    sessionStorage.removeItem('salonpay_auth');
  }, [accessToken]);

  const isSignedIn = !!accessToken && !!userEmail;

  const value = {
    accessToken,
    userEmail,
    userName,
    userPicture,
    isInitialized,
    isSignedIn,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
