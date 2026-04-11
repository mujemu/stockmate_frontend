/**
 * 투자 원칙 상세 UI — default_rank(1~23) 기준 파라미터 기본값·스테퍼 범위.
 * 서버 `default_principles.default_rank`와 동일 순서를 유지할 것.
 */

export type ParamField = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
};

export type PrincipleParamSpec = {
  defaultRank: number;
  mode: 'numeric' | 'compound' | 'toggle';
  fields: ParamField[];
};

/** 지수 선택 (미국 장 급변 후 대기) */
export const US_INDEX_LABELS = ['S&P 500', '나스닥 100', '다우'] as const;

function f(
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  suffix: string
): ParamField {
  return { key, label, min, max, step, suffix };
}

export const PRINCIPLE_PARAM_SPECS: PrincipleParamSpec[] = [
  { defaultRank: 1, mode: 'numeric', fields: [f('n', '변동폭', 1, 20, 1, '%')] },
  { defaultRank: 2, mode: 'numeric', fields: [f('n', '마감 전', 5, 120, 1, '분')] },
  { defaultRank: 3, mode: 'numeric', fields: [f('n', '개장 후', 5, 180, 1, '분')] },
  {
    defaultRank: 4,
    mode: 'compound',
    fields: [
      f('usIndex', '지수', 0, 2, 1, ''), // 0..2 → 라벨로 표시
      f('hours', '대기', 1, 48, 1, '시간'),
    ],
  },
  { defaultRank: 5, mode: 'numeric', fields: [f('n', '한도', 5, 40, 1, '%')] },
  { defaultRank: 6, mode: 'numeric', fields: [f('n', '최소 현금', 5, 50, 1, '%')] },
  { defaultRank: 7, mode: 'numeric', fields: [f('n', '최대 종목', 1, 30, 1, '개')] },
  { defaultRank: 8, mode: 'numeric', fields: [f('n', '월간 한도', 1, 30, 1, '%')] },
  { defaultRank: 9, mode: 'numeric', fields: [f('n', '첫 진입', 1, 20, 1, '%')] },
  { defaultRank: 10, mode: 'numeric', fields: [f('n', '손절선', 1, 20, 1, '%')] },
  { defaultRank: 11, mode: 'numeric', fields: [f('n', '구간', 1, 15, 1, '%')] },
  { defaultRank: 12, mode: 'numeric', fields: [f('n', '대기', 5, 180, 1, '분')] },
  { defaultRank: 13, mode: 'numeric', fields: [f('n', '최소 보유', 5, 480, 5, '분')] },
  { defaultRank: 14, mode: 'toggle', fields: [] },
  { defaultRank: 15, mode: 'numeric', fields: [f('n', '뉴스 기간', 1, 14, 1, '일')] },
  { defaultRank: 16, mode: 'toggle', fields: [] },
  { defaultRank: 17, mode: 'numeric', fields: [f('n', '대기', 5, 180, 1, '분')] },
  { defaultRank: 18, mode: 'numeric', fields: [f('n', '거래량 배수', 2, 10, 1, '배')] },
  { defaultRank: 19, mode: 'numeric', fields: [f('n', '일일 횟수', 1, 20, 1, '회')] },
  {
    defaultRank: 20,
    mode: 'compound',
    fields: [
      f('consecutive', '연속 손절', 2, 5, 1, '회'),
      f('restDays', '휴식', 1, 14, 1, '일'),
    ],
  },
  { defaultRank: 21, mode: 'numeric', fields: [f('n', '관찰', 1, 30, 1, '일')] },
  { defaultRank: 22, mode: 'numeric', fields: [f('n', '냉각', 1, 48, 1, '시간')] },
  { defaultRank: 23, mode: 'numeric', fields: [f('n', '금요일', 14, 18, 1, '시')] },
];

const specByRank: Map<number, PrincipleParamSpec> = new Map(
  PRINCIPLE_PARAM_SPECS.map((s) => [s.defaultRank, s])
);

export function getParamSpec(defaultRank: number): PrincipleParamSpec | undefined {
  return specByRank.get(defaultRank);
}

/** 스테퍼용 기본값 (키 → 값) */
export function defaultParamsForRank(defaultRank: number): Record<string, number> {
  switch (defaultRank) {
    case 1:
      return { n: 5 };
    case 2:
      return { n: 30 };
    case 3:
      return { n: 15 };
    case 4:
      return { usIndex: 0, hours: 12 };
    case 5:
      return { n: 20 };
    case 6:
      return { n: 10 };
    case 7:
      return { n: 5 };
    case 8:
      return { n: 10 };
    case 9:
      return { n: 5 };
    case 10:
      return { n: 7 };
    case 11:
      return { n: 5 };
    case 12:
      return { n: 30 };
    case 13:
      return { n: 60 };
    case 14:
      return { on: 1 };
    case 15:
      return { n: 3 };
    case 16:
      return { on: 1 };
    case 17:
      return { n: 30 };
    case 18:
      return { n: 3 };
    case 19:
      return { n: 5 };
    case 20:
      return { consecutive: 3, restDays: 3 };
    case 21:
      return { n: 5 };
    case 22:
      return { n: 6 };
    case 23:
      return { n: 15 };
    default:
      return {};
  }
}

export const CATEGORY_SECTION_ORDER = ['시간', '비중', '매도', '매수', '감정'] as const;

export type PrincipleSectionCategory = (typeof CATEGORY_SECTION_ORDER)[number];

/**
 * API/DB에 영문 enum 이름(TIME 등)으로 저장된 레거시 값을 화면 구역 키(한글)로 맞춘다.
 * 그렇지 않으면 `groupedByCategory`가 '시간' 버킷을 비워 두어 시간 원칙 블록이 통째로 안 보인다.
 */
export function normalizePrincipleCategory(raw: string): string {
  const t = (raw || '').trim();
  const legacy: Record<string, PrincipleSectionCategory> = {
    TIME: '시간',
    POSITION: '비중',
    SELL: '매도',
    BUY: '매수',
    EMOTION: '감정',
    시간: '시간',
    비중: '비중',
    매도: '매도',
    매수: '매수',
    감정: '감정',
  };
  if (t in legacy) return legacy[t];
  if ((CATEGORY_SECTION_ORDER as readonly string[]).includes(t)) return t;
  return t;
}

export function sectionTitle(category: string): string {
  switch (category) {
    case '시간':
      return '시간';
    case '비중':
      return '비중';
    case '매도':
      return '매도 조건';
    case '매수':
      return '매수 조건';
    case '감정':
      return '감정';
    default:
      return category;
  }
}
