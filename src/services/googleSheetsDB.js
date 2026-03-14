/**
 * 살롱페이 v3.0 - Google Sheets Database Service
 */

import { CONFIG } from '../config/config';

// ========== DEMO DATA ==========
const DEMO_SALON_CODE = 'DEMO1234';
const DEMO_SALON = {
  code: DEMO_SALON_CODE,
  spreadsheetId: 'demo_spreadsheet',
  salonName: 'Violet Hair Studio',
  region: 'Gangnam, Seoul'
};

const DEMO_CUSTOMERS = [
  { id: 'c1', name: '김서연', phone: '010-1234-5678', birthday: '0315', points: 8500, visitCount: 12, memo: 'VIP 단골', createdAt: '2025-06-10', updatedAt: '2026-03-10' },
  { id: 'c2', name: '이지은', phone: '010-2345-6789', birthday: '0822', points: 3200, visitCount: 6, memo: '펌 선호', createdAt: '2025-09-15', updatedAt: '2026-03-05' },
  { id: 'c3', name: '박하윤', phone: '010-3456-7890', birthday: '1105', points: 1500, visitCount: 3, memo: '', createdAt: '2025-12-01', updatedAt: '2026-02-20' },
  { id: 'c4', name: '정민지', phone: '010-4567-8901', birthday: '0428', points: 5800, visitCount: 9, memo: '염색 전문', createdAt: '2025-07-20', updatedAt: '2026-03-12' },
  { id: 'c5', name: '최유나', phone: '010-5678-9012', birthday: '0710', points: 900, visitCount: 2, memo: '신규 고객', createdAt: '2026-01-15', updatedAt: '2026-02-28' },
  { id: 'c6', name: 'Emily Chen', phone: '010-6789-0123', birthday: '0203', points: 4200, visitCount: 7, memo: 'Balayage lover', createdAt: '2025-08-05', updatedAt: '2026-03-08' },
  { id: 'c7', name: '田中美咲', phone: '010-7890-1234', birthday: '0920', points: 2100, visitCount: 4, memo: '일본 고객', createdAt: '2025-11-10', updatedAt: '2026-03-01' },
  { id: 'c8', name: '송예린', phone: '010-8901-2345', birthday: '1225', points: 6700, visitCount: 11, memo: '클리닉 정기', createdAt: '2025-05-20', updatedAt: '2026-03-14' },
];

const DEMO_VISITS = [
  { id: 'v1', customerId: 'c1', date: '2026-03-10', service: '발레아쥬 염색', amount: 250000, discount: 0, pointsUsed: 0, pointsEarned: 12500, paymentMethod: 'card', finalAmount: 250000, createdAt: '2026-03-10' },
  { id: 'v2', customerId: 'c1', date: '2026-02-15', service: '커트 + 트리트먼트', amount: 80000, discount: 5000, pointsUsed: 0, pointsEarned: 3750, paymentMethod: 'cash', finalAmount: 75000, createdAt: '2026-02-15' },
  { id: 'v3', customerId: 'c1', date: '2026-01-20', service: '디지털 펌', amount: 180000, discount: 0, pointsUsed: 2000, pointsEarned: 8900, paymentMethod: 'card', finalAmount: 178000, createdAt: '2026-01-20' },
  { id: 'v4', customerId: 'c2', date: '2026-03-05', service: 'S컬 펌', amount: 200000, discount: 0, pointsUsed: 0, pointsEarned: 10000, paymentMethod: 'card', finalAmount: 200000, createdAt: '2026-03-05' },
  { id: 'v5', customerId: 'c2', date: '2026-01-28', service: '커트', amount: 35000, discount: 0, pointsUsed: 0, pointsEarned: 1750, paymentMethod: 'cash', finalAmount: 35000, createdAt: '2026-01-28' },
  { id: 'v6', customerId: 'c3', date: '2026-02-20', service: '매직 셋팅펌', amount: 150000, discount: 0, pointsUsed: 0, pointsEarned: 7500, paymentMethod: 'card', finalAmount: 150000, createdAt: '2026-02-20' },
  { id: 'v7', customerId: 'c4', date: '2026-03-12', service: '풀 컬러 체인지', amount: 300000, discount: 10000, pointsUsed: 0, pointsEarned: 14500, paymentMethod: 'card', finalAmount: 290000, createdAt: '2026-03-12' },
  { id: 'v8', customerId: 'c4', date: '2026-02-10', service: '뿌리 염색 + 글레이징', amount: 120000, discount: 0, pointsUsed: 0, pointsEarned: 6000, paymentMethod: 'cash', finalAmount: 120000, createdAt: '2026-02-10' },
  { id: 'v9', customerId: 'c4', date: '2026-01-05', service: '커트 + 클리닉', amount: 90000, discount: 0, pointsUsed: 1000, pointsEarned: 4450, paymentMethod: 'card', finalAmount: 89000, createdAt: '2026-01-05' },
  { id: 'v10', customerId: 'c5', date: '2026-02-28', service: '커트', amount: 40000, discount: 0, pointsUsed: 0, pointsEarned: 2000, paymentMethod: 'card', finalAmount: 40000, createdAt: '2026-02-28' },
  { id: 'v11', customerId: 'c6', date: '2026-03-08', service: 'Balayage Highlight', amount: 280000, discount: 0, pointsUsed: 0, pointsEarned: 14000, paymentMethod: 'card', finalAmount: 280000, createdAt: '2026-03-08' },
  { id: 'v12', customerId: 'c6', date: '2026-02-01', service: 'Trim + Deep Treatment', amount: 70000, discount: 0, pointsUsed: 0, pointsEarned: 3500, paymentMethod: 'cash', finalAmount: 70000, createdAt: '2026-02-01' },
  { id: 'v13', customerId: 'c7', date: '2026-03-01', service: 'ストレートパーマ', amount: 160000, discount: 0, pointsUsed: 0, pointsEarned: 8000, paymentMethod: 'card', finalAmount: 160000, createdAt: '2026-03-01' },
  { id: 'v14', customerId: 'c8', date: '2026-03-14', service: '두피 스케일링 + 헤드스파', amount: 100000, discount: 0, pointsUsed: 0, pointsEarned: 5000, paymentMethod: 'card', finalAmount: 100000, createdAt: '2026-03-14' },
  { id: 'v15', customerId: 'c8', date: '2026-02-22', service: '영양 클리닉', amount: 80000, discount: 5000, pointsUsed: 0, pointsEarned: 3750, paymentMethod: 'cash', finalAmount: 75000, createdAt: '2026-02-22' },
  { id: 'v16', customerId: 'c8', date: '2026-01-30', service: '커트 + 염색', amount: 180000, discount: 0, pointsUsed: 3000, pointsEarned: 8850, paymentMethod: 'card', finalAmount: 177000, createdAt: '2026-01-30' },
  { id: 'v17', customerId: 'c1', date: '2025-12-20', service: '글로시 염색', amount: 200000, discount: 0, pointsUsed: 0, pointsEarned: 10000, paymentMethod: 'card', finalAmount: 200000, createdAt: '2025-12-20' },
  { id: 'v18', customerId: 'c4', date: '2025-12-05', service: '하이라이트 + 커트', amount: 220000, discount: 0, pointsUsed: 0, pointsEarned: 11000, paymentMethod: 'card', finalAmount: 220000, createdAt: '2025-12-05' },
  // ── 2025년 추가 더미 (c1 김서연) ──
  { id: 'v19', customerId: 'c1', date: '2025-02-14', service: '커트 + 볼륨 펌', amount: 170000, discount: 0, pointsUsed: 0, pointsEarned: 8500, paymentMethod: 'card', finalAmount: 170000, createdAt: '2025-02-14' },
  { id: 'v20', customerId: 'c1', date: '2025-03-22', service: '애쉬 베이지 염색', amount: 180000, discount: 0, pointsUsed: 0, pointsEarned: 9000, paymentMethod: 'card', finalAmount: 180000, createdAt: '2025-03-22' },
  { id: 'v21', customerId: 'c1', date: '2025-05-10', service: '커트', amount: 35000, discount: 0, pointsUsed: 0, pointsEarned: 1750, paymentMethod: 'cash', finalAmount: 35000, createdAt: '2025-05-10' },
  { id: 'v22', customerId: 'c1', date: '2025-06-18', service: '레이어드 컷 + 클리닉', amount: 95000, discount: 0, pointsUsed: 0, pointsEarned: 4750, paymentMethod: 'card', finalAmount: 95000, createdAt: '2025-06-18' },
  { id: 'v23', customerId: 'c1', date: '2025-07-25', service: '하이라이트 발레아쥬', amount: 260000, discount: 0, pointsUsed: 0, pointsEarned: 13000, paymentMethod: 'card', finalAmount: 260000, createdAt: '2025-07-25' },
  { id: 'v24', customerId: 'c1', date: '2025-09-05', service: '영양 트리트먼트', amount: 80000, discount: 0, pointsUsed: 0, pointsEarned: 4000, paymentMethod: 'cash', finalAmount: 80000, createdAt: '2025-09-05' },
  { id: 'v25', customerId: 'c1', date: '2025-10-12', service: 'S컬 펌', amount: 200000, discount: 0, pointsUsed: 0, pointsEarned: 10000, paymentMethod: 'card', finalAmount: 200000, createdAt: '2025-10-12' },
  { id: 'v26', customerId: 'c1', date: '2025-11-08', service: '뿌리 염색 + 글레이징', amount: 130000, discount: 0, pointsUsed: 0, pointsEarned: 6500, paymentMethod: 'card', finalAmount: 130000, createdAt: '2025-11-08' },
  // ── 2025년 추가 더미 (c4 정민지) ──
  { id: 'v27', customerId: 'c4', date: '2025-03-15', service: '풀 컬러 체인지', amount: 280000, discount: 0, pointsUsed: 0, pointsEarned: 14000, paymentMethod: 'card', finalAmount: 280000, createdAt: '2025-03-15' },
  { id: 'v28', customerId: 'c4', date: '2025-06-20', service: '커트 + 트리트먼트', amount: 85000, discount: 0, pointsUsed: 0, pointsEarned: 4250, paymentMethod: 'cash', finalAmount: 85000, createdAt: '2025-06-20' },
  { id: 'v29', customerId: 'c4', date: '2025-09-10', service: '디지털 펌', amount: 190000, discount: 0, pointsUsed: 0, pointsEarned: 9500, paymentMethod: 'card', finalAmount: 190000, createdAt: '2025-09-10' },
  // ── 2025년 추가 더미 (c8 송예린) ──
  { id: 'v30', customerId: 'c8', date: '2025-04-20', service: '두피 스케일링', amount: 70000, discount: 0, pointsUsed: 0, pointsEarned: 3500, paymentMethod: 'card', finalAmount: 70000, createdAt: '2025-04-20' },
  { id: 'v31', customerId: 'c8', date: '2025-07-15', service: '매직 셋팅펌', amount: 160000, discount: 0, pointsUsed: 0, pointsEarned: 8000, paymentMethod: 'card', finalAmount: 160000, createdAt: '2025-07-15' },
  { id: 'v32', customerId: 'c8', date: '2025-10-05', service: '글로시 염색', amount: 200000, discount: 0, pointsUsed: 0, pointsEarned: 10000, paymentMethod: 'card', finalAmount: 200000, createdAt: '2025-10-05' },
];

const DEMO_COUPONS = [
  { id: 'cp1', customerId: 'c1', type: 'birthday', amount: 10000, isPercent: false, expiryDate: '2026-04-15', isUsed: false, usedAt: null, createdAt: '2026-03-01' },
  { id: 'cp2', customerId: 'c1', type: 'loyalty', amount: 15, isPercent: true, expiryDate: '2026-06-30', isUsed: false, usedAt: null, createdAt: '2026-03-10' },
  { id: 'cp3', customerId: 'c4', type: 'birthday', amount: 10000, isPercent: false, expiryDate: '2026-05-28', isUsed: false, usedAt: null, createdAt: '2026-04-01' },
  { id: 'cp4', customerId: 'c6', type: 'referral', amount: 20000, isPercent: false, expiryDate: '2026-04-30', isUsed: false, usedAt: null, createdAt: '2026-02-15' },
  { id: 'cp5', customerId: 'c8', type: 'loyalty', amount: 10, isPercent: true, expiryDate: '2026-05-31', isUsed: false, usedAt: null, createdAt: '2026-03-14' },
];

class GoogleSheetsDB {
  constructor() {
    this.spreadsheetId = null;
    this.salonCode = null;
    this.salonInfo = null;
    this.cache = {};
    this.isInitialized = false;
    this.accessToken = null;
    this.isDemoMode = false;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      if (typeof window.gapi === 'undefined') {
        reject(new Error('Google API not loaded'));
        return;
      }

      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: CONFIG.DISCOVERY_DOCS
          });
          this.isInitialized = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  setAccessToken(token) {
    this.accessToken = token;
    if (token && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
    }
  }

  // ========== 미용실 코드 시스템 ==========

  _getSavedSalons() {
    try {
      return JSON.parse(localStorage.getItem('salonpay_saved_salons') || '[]');
    } catch {
      return [];
    }
  }

  _saveSalonLocally(salonData) {
    const salons = this._getSavedSalons();
    const existing = salons.findIndex(s => s.code === salonData.code);

    if (existing >= 0) {
      salons[existing] = salonData;
    } else {
      salons.unshift(salonData);
    }

    localStorage.setItem('salonpay_saved_salons', JSON.stringify(salons.slice(0, 10)));
  }

  _saveCurrentSalon() {
    if (this.salonInfo) {
      localStorage.setItem('salonpay_current_salon', JSON.stringify(this.salonInfo));
    }
  }

  restoreCurrentSalon() {
    try {
      const saved = localStorage.getItem('salonpay_current_salon');
      if (saved) {
        this.salonInfo = JSON.parse(saved);
        this.spreadsheetId = this.salonInfo.spreadsheetId;
        this.salonCode = this.salonInfo.code;
        // 데모 모드 복원
        if (this.salonCode === DEMO_SALON_CODE) {
          this.isDemoMode = true;
        }
        return this.salonInfo;
      }
    } catch (error) {
      console.error('미용실 복원 오류:', error);
    }
    return null;
  }

  clearCurrentSalon() {
    this.spreadsheetId = null;
    this.salonCode = null;
    this.salonInfo = null;
    this.isDemoMode = false;
    localStorage.removeItem('salonpay_current_salon');
    this._clearCache();
  }

  // ========== 미용실 등록 ==========

  async createSalonSpreadsheet(salonName, region, accessToken) {
    this.setAccessToken(accessToken);

    // 스프레드시트 생성
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title: `살롱페이 - ${salonName}` },
        sheets: [
          { properties: { title: CONFIG.SHEETS.SALON_INFO } },
          { properties: { title: CONFIG.SHEETS.CUSTOMERS } },
          { properties: { title: CONFIG.SHEETS.VISITS } },
          { properties: { title: CONFIG.SHEETS.COUPONS } },
          { properties: { title: CONFIG.SHEETS.SETTINGS } }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`스프레드시트 생성 실패: ${errorData.error?.message || response.status}`);
    }

    const data = await response.json();
    this.spreadsheetId = data.spreadsheetId;
    this.salonCode = this.spreadsheetId;

    // 초기 데이터 설정
    await this._initializeSpreadsheet(salonName, region, accessToken);

    // 공개 설정
    await this._makeSpreadsheetPublic(this.spreadsheetId, accessToken);

    this.salonInfo = {
      code: this.salonCode,
      spreadsheetId: this.spreadsheetId,
      salonName,
      region
    };

    this._saveSalonLocally(this.salonInfo);
    this._saveCurrentSalon();

    return this.salonInfo;
  }

  async _initializeSpreadsheet(salonName, region, accessToken) {
    const requests = [
      {
        range: `${CONFIG.SHEETS.SALON_INFO}!A1:B6`,
        values: [
          ['key', 'value'],
          ['salonName', salonName],
          ['region', region],
          ['salonCode', this.salonCode],
          ['createdAt', new Date().toISOString()]
        ]
      },
      {
        range: `${CONFIG.SHEETS.CUSTOMERS}!A1:I1`,
        values: [['id', 'name', 'phone', 'birthday', 'points', 'visitCount', 'memo', 'createdAt', 'updatedAt']]
      },
      {
        range: `${CONFIG.SHEETS.VISITS}!A1:K1`,
        values: [['id', 'customerId', 'date', 'service', 'amount', 'discount', 'pointsUsed', 'pointsEarned', 'paymentMethod', 'finalAmount', 'createdAt']]
      },
      {
        range: `${CONFIG.SHEETS.COUPONS}!A1:I1`,
        values: [['id', 'customerId', 'type', 'amount', 'isPercent', 'expiryDate', 'isUsed', 'usedAt', 'createdAt']]
      },
      {
        range: `${CONFIG.SHEETS.SETTINGS}!A1:B5`,
        values: [
          ['key', 'value'],
          ['pointEarnRate', CONFIG.DEFAULTS.POINT_EARN_RATE],
          ['cashDiscountRate', CONFIG.DEFAULTS.CASH_DISCOUNT_RATE],
          ['birthdayCouponAmount', CONFIG.DEFAULTS.BIRTHDAY_COUPON_AMOUNT],
          ['cashTiers', JSON.stringify(CONFIG.DEFAULTS.CASH_TIERS)]
        ]
      }
    ];

    await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      resource: { valueInputOption: 'RAW', data: requests }
    });
  }

  async _makeSpreadsheetPublic(spreadsheetId, accessToken) {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
    } catch (error) {
      console.error('공개 설정 오류:', error);
    }
  }

  // ========== 미용실 연결 ==========

  async connectBySalonCode(code) {
    const inputCode = code.trim().toUpperCase();

    // 데모 모드 체크
    if (inputCode === DEMO_SALON_CODE) {
      this.isDemoMode = true;
      this.salonInfo = { ...DEMO_SALON };
      this.spreadsheetId = DEMO_SALON.spreadsheetId;
      this.salonCode = DEMO_SALON.code;
      this._saveCurrentSalon();
      return { success: true, salon: this.salonInfo };
    }

    let spreadsheetId = inputCode;

    // 짧은 코드인 경우 로컬에서 검색
    if (inputCode.length <= 12) {
      const savedSalons = this._getSavedSalons();
      const found = savedSalons.find(s =>
        s.spreadsheetId.slice(-8).toUpperCase() === inputCode ||
        s.spreadsheetId.toUpperCase() === inputCode
      );
      if (found) {
        this.salonInfo = found;
        this.spreadsheetId = found.spreadsheetId;
        this.salonCode = found.code;
        this._saveCurrentSalon();
        return { success: true, salon: found };
      }
      if (inputCode.length <= 8) {
        return { success: false, error: '코드를 찾을 수 없습니다.' };
      }
    }

    // 전체 스프레드시트 ID로 시도
    try {
      const salon = await this.connectToSalonPublic(spreadsheetId);
      return { success: true, salon };
    } catch (error) {
      return { success: false, error: '미용실을 찾을 수 없습니다.' };
    }
  }

  async connectToSalonPublic(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: `${CONFIG.SHEETS.SALON_INFO}!A2:B6`
    });

    const rows = response.result.values || [];
    const info = {};
    rows.forEach(row => {
      if (row[0] && row[1]) info[row[0]] = row[1];
    });

    this.salonCode = spreadsheetId;
    this.salonInfo = {
      code: spreadsheetId,
      spreadsheetId: spreadsheetId,
      salonName: info.salonName || '미용실',
      region: info.region || ''
    };

    this._saveSalonLocally(this.salonInfo);
    this._saveCurrentSalon();

    return this.salonInfo;
  }

  async findMySalon(accessToken) {
    if (this.isDemoMode) return this.salonInfo;
    this.setAccessToken(accessToken);

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains '살롱페이' and mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name)`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.files?.length > 0) {
        return this.connectToSalon(data.files[0].id);
      }
    } catch (error) {
      console.error('미용실 찾기 오류:', error);
    }
    return null;
  }

  async connectToSalon(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CONFIG.SHEETS.SALON_INFO}!A2:B6`
    });

    const rows = response.result.values || [];
    const info = {};
    rows.forEach(row => {
      if (row[0] && row[1]) info[row[0]] = row[1];
    });

    this.salonCode = info.salonCode;
    this.salonInfo = {
      code: this.salonCode,
      spreadsheetId: this.spreadsheetId,
      salonName: info.salonName,
      region: info.region
    };

    this._saveSalonLocally(this.salonInfo);
    this._saveCurrentSalon();

    return this.salonInfo;
  }

  isConnected() {
    return !!this.spreadsheetId || this.isDemoMode;
  }

  // ========== 고객 관리 ==========

  async getAllCustomers() {
    this._ensureConnected();
    if (this.isDemoMode) return [...DEMO_CUSTOMERS];

    const cacheKey = 'customers';
    const cached = this._getCache(cacheKey, CONFIG.CACHE.CUSTOMER_DATA);
    if (cached) return cached;

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CONFIG.SHEETS.CUSTOMERS}!A2:I`
    });

    const rows = response.result.values || [];
    const customers = rows.map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      birthday: row[3] || '',
      points: parseInt(row[4]) || 0,
      visitCount: parseInt(row[5]) || 0,
      memo: row[6] || '',
      createdAt: row[7],
      updatedAt: row[8]
    }));

    this._setCache(cacheKey, customers);
    return customers;
  }

  async getCustomerByPhone(phone) {
    const customers = await this.getAllCustomers();
    return customers.find(c => c.phone === phone);
  }

  async getCustomerById(customerId) {
    const customers = await this.getAllCustomers();
    return customers.find(c => c.id === customerId);
  }

  // ========== 방문 기록 ==========

  async getAllVisits() {
    this._ensureConnected();
    if (this.isDemoMode) return [...DEMO_VISITS];

    const cacheKey = 'visits';
    const cached = this._getCache(cacheKey, CONFIG.CACHE.VISITS);
    if (cached) return cached;

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CONFIG.SHEETS.VISITS}!A2:K`
    });

    const rows = response.result.values || [];
    const visits = rows.map(row => ({
      id: row[0],
      customerId: row[1],
      date: row[2],
      service: row[3],
      amount: parseInt(row[4]) || 0,
      discount: parseInt(row[5]) || 0,
      pointsUsed: parseInt(row[6]) || 0,
      pointsEarned: parseInt(row[7]) || 0,
      paymentMethod: row[8],
      finalAmount: parseInt(row[9]) || 0,
      createdAt: row[10]
    }));

    this._setCache(cacheKey, visits);
    return visits;
  }

  async getVisitsByCustomerId(customerId) {
    const visits = await this.getAllVisits();
    return visits
      .filter(v => v.customerId === customerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // ========== 쿠폰 ==========

  async getAllCoupons() {
    this._ensureConnected();
    if (this.isDemoMode) return [...DEMO_COUPONS];

    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${CONFIG.SHEETS.COUPONS}!A2:I`
    });

    const rows = response.result.values || [];
    return rows.map(row => ({
      id: row[0],
      customerId: row[1],
      type: row[2],
      amount: parseInt(row[3]) || 0,
      isPercent: row[4] === 'TRUE',
      expiryDate: row[5],
      isUsed: row[6] === 'TRUE',
      usedAt: row[7] || null,
      createdAt: row[8]
    }));
  }

  async getActiveCouponsByCustomerId(customerId) {
    const coupons = await this.getAllCoupons();
    const today = new Date().toISOString().split('T')[0];
    return coupons.filter(c =>
      c.customerId === customerId &&
      !c.isUsed &&
      c.expiryDate >= today
    );
  }

  // ========== 설정 ==========

  async getSettings() {
    this._ensureConnected();
    if (this.isDemoMode) return { ...CONFIG.DEFAULTS };

    const cacheKey = 'settings';
    const cached = this._getCache(cacheKey, CONFIG.CACHE.SETTINGS);
    if (cached) return cached;

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${CONFIG.SHEETS.SETTINGS}!A2:B`
      });

      const rows = response.result.values || [];
      const settings = {};

      rows.forEach(row => {
        const key = row[0];
        let value = row[1];
        try { value = JSON.parse(value); } catch { if (!isNaN(value)) value = parseFloat(value); }
        settings[key] = value;
      });

      this._setCache(cacheKey, settings);
      return settings;
    } catch {
      return CONFIG.DEFAULTS;
    }
  }

  // ========== 통계 ==========

  async getDashboardStats() {
    const customers = await this.getAllCustomers();
    const visits = await this.getAllVisits();

    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7);

    const monthlyVisits = visits.filter(v => v.date.startsWith(thisMonth));
    const totalRevenue = monthlyVisits.reduce((sum, v) => sum + v.finalAmount, 0);
    const cashVisits = monthlyVisits.filter(v => v.paymentMethod === 'cash');
    const cashRatio = monthlyVisits.length > 0
      ? Math.round((cashVisits.length / monthlyVisits.length) * 100)
      : 0;
    const savedFees = Math.round(cashVisits.reduce((sum, v) => sum + v.finalAmount, 0) * 0.025);

    return {
      totalCustomers: customers.length,
      monthlyVisits: monthlyVisits.length,
      totalRevenue,
      cashRatio,
      savedFees
    };
  }

  // ========== 유틸리티 ==========

  _generateId() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  _ensureConnected() {
    if (!this.spreadsheetId && !this.isDemoMode) {
      throw new Error('미용실에 연결되지 않았습니다.');
    }
  }

  _getCache(key, maxAge) {
    const item = this.cache[key];
    if (item && Date.now() - item.timestamp < maxAge) {
      return item.data;
    }
    return null;
  }

  _setCache(key, data) {
    this.cache[key] = { data, timestamp: Date.now() };
  }

  _clearCache(prefix) {
    if (prefix) {
      Object.keys(this.cache).forEach(key => {
        if (key.startsWith(prefix)) delete this.cache[key];
      });
    } else {
      this.cache = {};
    }
  }
}

// 싱글톤 인스턴스
export const sheetsDB = new GoogleSheetsDB();
export default sheetsDB;
