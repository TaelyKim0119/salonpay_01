/**
 * AI 분석 서비스
 * Cloudflare Pages Functions를 통해 OpenAI API 호출
 */

// API 엔드포인트 (배포 시 자동으로 /api/analyze로 매핑됨)
const API_URL = import.meta.env.PROD
  ? '/api/analyze'
  : 'http://localhost:8788/api/analyze'; // 로컬 개발용

/**
 * AI 분석 요청
 */
async function requestAnalysis(type, data, salonName) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        data,
        salonName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '분석 요청 실패');
    }

    return await response.json();
  } catch (error) {
    console.error('AI 분석 오류:', error);
    throw error;
  }
}

/**
 * 개별 고객 분석
 * @param {Object} customer - 고객 정보
 * @param {Array} visits - 방문 기록
 * @param {string} salonName - 미용실 이름
 */
export async function analyzeIndividualCustomer(customer, visits, salonName) {
  return requestAnalysis('individual', { customer, visits }, salonName);
}

/**
 * 전체 고객 분석
 * @param {Array} customers - 전체 고객 목록
 * @param {Object} stats - 통계 데이터
 * @param {string} salonName - 미용실 이름
 */
export async function analyzeOverallCustomers(customers, stats, salonName) {
  return requestAnalysis('overall', { customers, stats }, salonName);
}

/**
 * 매출 분석
 * @param {Array} visits - 방문 기록
 * @param {Object} stats - 통계 데이터
 * @param {Array} monthlyData - 월별 데이터
 * @param {string} salonName - 미용실 이름
 */
export async function analyzeRevenue(visits, stats, monthlyData, salonName) {
  return requestAnalysis('revenue', { visits, stats, monthlyData }, salonName);
}

/**
 * 재방문/이탈 예측
 * @param {Array} customers - 전체 고객 목록
 * @param {Array} visits - 방문 기록
 * @param {string} salonName - 미용실 이름
 */
export async function analyzeRetention(customers, visits, salonName) {
  return requestAnalysis('retention', { customers, visits }, salonName);
}

/**
 * 시즌별 마케팅 전략
 * @param {Array} visits - 방문 기록
 * @param {Array} customers - 전체 고객 목록
 * @param {Object} stats - 통계 데이터
 * @param {Array} monthlyData - 월별 데이터
 * @param {string} salonName - 미용실 이름
 */
export async function analyzeMarketing(visits, customers, stats, monthlyData, salonName) {
  return requestAnalysis('marketing', { visits, customers, stats, monthlyData }, salonName);
}

export default {
  analyzeIndividualCustomer,
  analyzeOverallCustomers,
  analyzeRevenue,
  analyzeRetention,
  analyzeMarketing
};
