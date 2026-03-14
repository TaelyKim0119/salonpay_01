/**
 * 살롱페이 v3.0 - Google Sheets Database Service
 */

import { CONFIG } from '../config/config';

class GoogleSheetsDB {
  constructor() {
    this.spreadsheetId = null;
    this.salonCode = null;
    this.salonInfo = null;
    this.cache = {};
    this.isInitialized = false;
    this.accessToken = null;
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
    return !!this.spreadsheetId;
  }

  // ========== 고객 관리 ==========

  async getAllCustomers() {
    this._ensureConnected();

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
    if (!this.spreadsheetId) {
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
