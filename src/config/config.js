/**
 * 살롱페이 v3.0 - Configuration
 */

export const CONFIG = {
  // Google Cloud 프로젝트 설정
  GOOGLE_CLIENT_ID: '699843754832-sfe5lo7goujevf0iksek96io9jn614rl.apps.googleusercontent.com',

  // Google Sheets API 설정
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
  DISCOVERY_DOCS: [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  ],

  // 시트 이름
  SHEETS: {
    SALON_INFO: 'SalonInfo',
    CUSTOMERS: 'Customers',
    VISITS: 'Visits',
    COUPONS: 'Coupons',
    SETTINGS: 'Settings'
  },

  // 캐시 설정 (밀리초)
  CACHE: {
    CUSTOMER_DATA: 30 * 1000,
    VISITS: 30 * 1000,
    SETTINGS: 5 * 60 * 1000
  },

  // 기본 설정값
  DEFAULTS: {
    POINT_EARN_RATE: 5,
    CASH_DISCOUNT_RATE: 10,
    BIRTHDAY_COUPON_AMOUNT: 10000,
    CASH_TIERS: [300000, 500000, 1000000]
  },

  // 미용실 코드 접두어
  CODE_PREFIX: 'SP'
};

export const isConfigured = () => {
  return CONFIG.GOOGLE_CLIENT_ID !== 'YOUR_CLIENT_ID.apps.googleusercontent.com';
};
