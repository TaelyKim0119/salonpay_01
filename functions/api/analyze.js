/**
 * Cloudflare Pages Function - AI 고객 분석
 * OpenAI API를 사용한 미용실 고객 분석 보고서 생성
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = await request.json();
    const { type, data, salonName } = body;

    // OpenAI API 키 (Cloudflare 환경변수에서 가져옴)
    const OPENAI_API_KEY = env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API 키가 설정되지 않았습니다.' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 분석 타입별 프롬프트 생성
    const prompt = generatePrompt(type, data, salonName);

    // OpenAI API 호출
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 미용실 비즈니스 전문 컨설턴트입니다.
데이터를 분석하여 실행 가능한 인사이트와 구체적인 액션 아이템을 제공합니다.
한국어로 답변하며, 이모지를 적절히 사용해 가독성을 높여주세요.
답변은 마크다운 형식으로 구조화해주세요.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(errorData.error?.message || 'OpenAI API 오류');
    }

    const result = await openaiResponse.json();
    const analysis = result.choices[0].message.content;

    return new Response(
      JSON.stringify({
        success: true,
        type,
        analysis,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('분석 오류:', error);
    return new Response(
      JSON.stringify({ error: error.message || '분석 중 오류가 발생했습니다.' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS 요청 처리 (CORS preflight)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * 분석 타입별 프롬프트 생성
 */
function generatePrompt(type, data, salonName) {
  const salon = salonName || '미용실';

  switch (type) {
    case 'individual':
      return generateIndividualPrompt(data, salon);
    case 'overall':
      return generateOverallPrompt(data, salon);
    case 'revenue':
      return generateRevenuePrompt(data, salon);
    case 'retention':
      return generateRetentionPrompt(data, salon);
    case 'marketing':
      return generateMarketingPrompt(data, salon);
    default:
      throw new Error('지원하지 않는 분석 타입입니다.');
  }
}

/**
 * 개별 고객 분석 프롬프트
 */
function generateIndividualPrompt(data, salon) {
  const { customer, visits } = data;

  return `
## ${salon} - 개별 고객 분석 요청

### 고객 정보
- 이름: ${customer.name}
- 전화번호: ${customer.phone}
- 생일: ${customer.birthday || '미등록'}
- 총 방문 횟수: ${customer.visitCount}회
- 현재 적립금: ${customer.points?.toLocaleString() || 0}P
- 메모: ${customer.memo || '없음'}

### 최근 방문 기록 (최대 10건)
${visits.map(v => `- ${v.date}: ${v.service} (${v.finalAmount?.toLocaleString()}원, ${v.paymentMethod === 'cash' ? '현금' : '카드'})`).join('\n')}

### 분석 요청사항
1. **고객 프로필 요약**: 이 고객의 특성을 한 문장으로 요약
2. **방문 패턴 분석**: 방문 주기, 선호 서비스, 평균 결제금액
3. **고객 등급 판단**: VIP/일반/이탈위험 중 판단 및 근거
4. **맞춤 추천**: 이 고객에게 추천할 서비스나 프로모션
5. **액션 아이템**: 원장님이 취해야 할 구체적 행동 3가지
`;
}

/**
 * 전체 고객 분석 프롬프트
 */
function generateOverallPrompt(data, salon) {
  const { customers, stats } = data;

  const customerSummary = customers.slice(0, 50).map(c =>
    `${c.name}: 방문${c.visitCount}회, ${c.points}P, 생일:${c.birthday || '미등록'}`
  ).join('\n');

  return `
## ${salon} - 전체 고객 분석 요청

### 기본 통계
- 총 고객 수: ${stats.totalCustomers}명
- 이번 달 방문 고객: ${stats.monthlyVisits}명
- 재방문율: ${stats.returnRate}%
- 이번 달 매출: ${stats.totalRevenue?.toLocaleString()}원

### 고객 목록 (상위 50명)
${customerSummary}

### 분석 요청사항
1. **고객 세그먼트 분석**: 고객군을 3-4개로 분류하고 각 특성 설명
2. **트렌드 분석**: 현재 고객 트렌드와 주목할 패턴
3. **강점과 약점**: ${salon}의 고객 관리 강점과 개선점
4. **성장 기회**: 매출 증대를 위한 구체적 기회 3가지
5. **이번 주 액션 플랜**: 당장 실행할 수 있는 액션 아이템 5가지
`;
}

/**
 * 매출 분석 프롬프트
 */
function generateRevenuePrompt(data, salon) {
  const { visits, stats, monthlyData } = data;

  const serviceSummary = {};
  visits.forEach(v => {
    if (!serviceSummary[v.service]) {
      serviceSummary[v.service] = { count: 0, revenue: 0 };
    }
    serviceSummary[v.service].count++;
    serviceSummary[v.service].revenue += v.finalAmount || 0;
  });

  const serviceReport = Object.entries(serviceSummary)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([service, data]) => `- ${service}: ${data.count}건, ${data.revenue.toLocaleString()}원`)
    .join('\n');

  return `
## ${salon} - 매출 분석 요청

### 이번 달 매출 현황
- 총 매출: ${stats.totalRevenue?.toLocaleString()}원
- 방문 건수: ${stats.monthlyVisits}건
- 평균 객단가: ${Math.round(stats.totalRevenue / (stats.monthlyVisits || 1)).toLocaleString()}원
- 현금 결제 비율: ${stats.cashRatio}%
- 카드 수수료 절약: ${stats.savedFees?.toLocaleString()}원

### 서비스별 매출
${serviceReport}

### 월별 추이 (최근 6개월)
${monthlyData?.map(m => `- ${m.month}: ${m.revenue?.toLocaleString()}원 (${m.visits}건)`).join('\n') || '데이터 없음'}

### 분석 요청사항
1. **매출 구조 분석**: 주력 서비스와 매출 의존도
2. **객단가 분석**: 현재 객단가 수준과 개선 방안
3. **서비스 믹스 최적화**: 추가 추천할 서비스 조합
4. **가격 정책 제안**: 가격 조정이나 패키지 상품 아이디어
5. **매출 증대 전략**: 다음 달 매출 10% 증가를 위한 구체적 전략 3가지
`;
}

/**
 * 재방문/이탈 예측 프롬프트
 */
function generateRetentionPrompt(data, salon) {
  const { customers, visits } = data;

  // 마지막 방문일 기준 분류
  const today = new Date();
  const riskCustomers = customers.filter(c => {
    const lastVisit = visits
      .filter(v => v.customerId === c.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (!lastVisit) return true;

    const daysSinceLastVisit = Math.floor((today - new Date(lastVisit.date)) / (1000 * 60 * 60 * 24));
    return daysSinceLastVisit > 60; // 60일 이상 미방문
  });

  const riskList = riskCustomers.slice(0, 20).map(c => {
    const customerVisits = visits.filter(v => v.customerId === c.id);
    const lastVisit = customerVisits.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return `- ${c.name} (${c.phone}): 마지막 방문 ${lastVisit?.date || '기록없음'}, 총 ${c.visitCount}회 방문`;
  }).join('\n');

  return `
## ${salon} - 재방문 예측 및 이탈 분석

### 이탈 위험 고객 (60일 이상 미방문)
총 ${riskCustomers.length}명

${riskList}

### 전체 고객 현황
- 총 고객: ${customers.length}명
- 이탈 위험 고객: ${riskCustomers.length}명 (${Math.round(riskCustomers.length / customers.length * 100)}%)
- 활성 고객: ${customers.length - riskCustomers.length}명

### 분석 요청사항
1. **이탈 위험도 평가**: 가장 우선적으로 관리해야 할 고객 5명과 그 이유
2. **이탈 원인 추정**: 고객들이 이탈하는 주요 원인 분석
3. **재방문 유도 전략**: 고객별 맞춤 재방문 유도 방안
4. **리텐션 메시지**: 각 고객에게 보낼 카카오톡/문자 메시지 예시
5. **예방 시스템**: 향후 이탈을 예방하기 위한 관리 시스템 제안
`;
}

/**
 * 시즌별 마케팅 전략 프롬프트
 */
function generateMarketingPrompt(data, salon) {
  const { visits, customers, stats, monthlyData } = data;

  // 월별 서비스 분포 계산
  const monthlyServices = {};
  visits.forEach(v => {
    const month = v.date?.slice(5, 7);
    if (!monthlyServices[month]) {
      monthlyServices[month] = {};
    }
    const service = v.service || '기타';
    if (!monthlyServices[month][service]) {
      monthlyServices[month][service] = { count: 0, revenue: 0 };
    }
    monthlyServices[month][service].count++;
    monthlyServices[month][service].revenue += v.finalAmount || 0;
  });

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const seasonalReport = Object.entries(monthlyServices)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([month, services]) => {
      const serviceList = Object.entries(services)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([svc, d]) => `${svc}(${d.count}건, ${d.revenue.toLocaleString()}원)`)
        .join(', ');
      return `- ${monthNames[parseInt(month) - 1]}: ${serviceList}`;
    }).join('\n');

  // 현금 vs 카드 비율
  const cashVisits = visits.filter(v => v.paymentMethod === 'cash').length;
  const cardVisits = visits.filter(v => v.paymentMethod === 'card').length;

  // 현재 월
  const currentMonth = new Date().getMonth() + 1;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  return `
## ${salon} - 시즌별 마케팅 전략 분석 요청

### 현재 시점
- 현재: ${currentMonth}월
- 다음 달: ${nextMonth}월

### 월별 서비스 이용 현황 (실제 데이터)
${seasonalReport}

### 매출 추이 (최근 6개월)
${monthlyData?.map(m => `- ${m.month}: ${m.revenue?.toLocaleString()}원 (${m.visits}건)`).join('\n') || '데이터 없음'}

### 고객 현황
- 총 고객: ${customers?.length || stats?.totalCustomers || 0}명
- 현금 결제: ${cashVisits}건 / 카드 결제: ${cardVisits}건
- 재방문율: ${stats?.returnRate || 0}%

### 분석 요청사항 (반드시 모든 항목에 대해 구체적으로 답변)

1. **월별 시즌 캘린더 (12개월 전체)**
   - 각 월별로 어떤 서비스가 성수기/비수기인지 분석
   - 예: "1월은 새해 이미지 변신으로 염색 수요 급증", "6월은 여름 앞두고 매직/클리닉 수요 증가"
   - 미용업계 일반 트렌드 + 이 살롱의 실제 데이터를 결합해서 분석

2. **지금 당장 해야 할 마케팅 (이번 달 & 다음 달)**
   - 현재 ${currentMonth}월과 다음 ${nextMonth}월에 집중해야 할 서비스
   - 구체적인 프로모션 아이디어 3가지 (할인율, 패키지 구성, 타겟 고객 포함)
   - SNS 게시물 아이디어 2가지 (인스타그램/카카오 채널)

3. **서비스별 공략 타이밍**
   - 염색: 언제 밀어야 하는지, 어떤 고객을 타겟해야 하는지
   - 펌: 성수기 시즌과 공략법
   - 클리닉/트리트먼트: 업셀링 전략
   - 커트: 객단가 올리는 방법

4. **이벤트 & 프로모션 연간 계획표**
   - 월별 추천 이벤트 (발렌타인데이, 어버이날, 크리스마스 등 활용)
   - 비수기 극복 전략
   - VIP 고객 전용 시즌 혜택

5. **실전 마케팅 메시지 템플릿**
   - 이번 달 카카오톡/문자 발송 메시지 3가지
   - 인스타그램 캡션 2가지
   - 리뷰 유도 메시지 1가지
`;
}
