import type { ImageSourcePropType } from 'react-native';

/**
 * 종목코드 → `assets/logos/*.png` (Metro 정적 번들용 require)
 * 새 종목은 여기에 6자리 코드 한 줄 추가하면 됩니다.
 */
export const STOCK_LOGO_BY_CODE: Record<string, ImageSourcePropType> = {
  '005930': require('../../assets/logos/samsung_new.png'),
  '000660': require('../../assets/logos/skhynix_new.png'),
  '278470': require('../../assets/logos/apr.png'),
  '090430': require('../../assets/logos/amorepacific.png'),
  '039490': require('../../assets/logos/kiwoom.png'),
  '006400': require('../../assets/logos/scd.png'),
  '009150': require('../../assets/logos/samsung_new.png'),
  '032830': require('../../assets/logos/samsung.png'),
  '005380': require('../../assets/logos/hyundai.png'),
  '066570': require('../../assets/logos/lg.png'),
};

type NameRule = { test: (name: string) => boolean; source: ImageSourcePropType };

const NAME_RULES: NameRule[] = [
  { test: (n) => n.includes('삼성SDI') || n.includes('SDI'), source: require('../../assets/logos/scd.png') },
  { test: (n) => n.includes('SK하이닉스'), source: require('../../assets/logos/skhynix_new.png') },
  { test: (n) => n.includes('삼성전자'), source: require('../../assets/logos/samsung_new.png') },
  { test: (n) => n.includes('삼성전기'), source: require('../../assets/logos/samsung_new.png') },
  { test: (n) => n.includes('삼성생명'), source: require('../../assets/logos/samsung.png') },
  { test: (n) => n.includes('삼성E앤에이') || n.includes('삼성E&A'), source: require('../../assets/logos/samsung_new.png') },
  { test: (n) => n.includes('키움'), source: require('../../assets/logos/kiwoom.png') },
  { test: (n) => n.includes('에이피알'), source: require('../../assets/logos/apr.png') },
  { test: (n) => n.includes('아모레'), source: require('../../assets/logos/amorepacific.png') },
  { test: (n) => n.includes('현대'), source: require('../../assets/logos/hyundai.png') },
  { test: (n) => n.includes('LG'), source: require('../../assets/logos/lg.png') },
];

/**
 * 잔고·리스트 등에서 로고 이미지를 찾을 때 사용.
 * `stock_code` 우선, 없으면 `stock_name` 부분 문자열 규칙.
 */
export function resolveStockLogo(
  stockCode: string | null | undefined,
  stockName: string | null | undefined,
): ImageSourcePropType | null {
  const code = stockCode?.trim();
  if (code && STOCK_LOGO_BY_CODE[code]) {
    return STOCK_LOGO_BY_CODE[code];
  }
  const name = stockName?.trim() ?? '';
  if (!name) return null;
  for (const rule of NAME_RULES) {
    if (rule.test(name)) return rule.source;
  }
  return null;
}
