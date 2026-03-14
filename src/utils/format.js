/**
 * 숫자 포맷팅 (천 단위 콤마)
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 숫자 축약 표시
 */
export function formatCompactNumber(num, t) {
  if (num >= 10000000) return Math.round(num / 10000000) + (t?.('tenMillion') || '천만');
  if (num >= 1000000) return Math.round(num / 1000000) + (t?.('million') || '백만');
  if (num >= 10000) return Math.round(num / 10000) + (t?.('tenThousand') || '만');
  if (num >= 1000) return Math.round(num / 1000) + 'K';
  return num.toString();
}

/**
 * 전화번호 포맷팅
 */
export function formatPhone(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return phone;
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateStr, formatFn) {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return formatFn ? formatFn(month, day) : `${month}/${day}`;
}

/**
 * 서비스 아이콘 가져오기 (Material Symbols icon name)
 */
export function getServiceIcon(serviceName) {
  if (serviceName.includes('염색') || serviceName.includes('컬러')) {
    return 'auto_awesome';
  }
  if (serviceName.includes('펌')) {
    return 'waves';
  }
  return 'content_cut';
}

/**
 * 서비스 분류
 */
export function categorizeService(serviceName) {
  if (serviceName.includes('펌')) return '펌';
  if (serviceName.includes('염색') || serviceName.includes('컬러')) return '염색';
  if (serviceName.includes('클리닉') || serviceName.includes('케어')) return '클리닉';
  if (serviceName.includes('커트')) return '커트';
  return '기타';
}
