/**
 * 매매 직전 공론장 진입 전 — 위반 원칙 미리보기용 카피.
 * `violation_details`가 있으면 서버 `reason`을 쓰고, 없으면 라벨 휴리스틱으로 보조한다.
 */

import type { OrderPrincipleViolationDetailDto } from '../types/stockmateApiV1';

export type OrderSide = 'buy' | 'sell';

function normLabel(s: string): string {
  return String(s || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 짧은 원칙 라벨 → 이번 주문 맥락에서 "왜 짚어봐야 하는지" 한 줄 (휴리스틱).
 */
export function explainPrincipleViolationOneLine(label: string, orderSide: OrderSide): string {
  const t = normLabel(label);
  const buy = orderSide === 'buy';
  const sell = !buy;

  if (/급등락/.test(t)) {
    return buy
      ? '당일 변동이 큰 타이밍에 신규 매수하면, 정해 둔 변동성·속도 규칙과 맞지 않을 수 있어요.'
      : '급변동일엔 호가·심리가 흔들려, 미리 정한 매도·시간 규칙과 어긋나기 쉬워요.';
  }
  if (/장 마감/.test(t)) {
    return '장 종료 직전엔 체결·스프레드 리스크가 커서, 마감 전 금지 구간과 겹칠 수 있어요.';
  }
  if (/장 시작/.test(t) || /개장/.test(t)) {
    return '개장 직후 변동성 구간은 “장 시작 후 대기”와 충돌할 수 있어요.';
  }
  if (/미국/.test(t)) {
    return '전일 야간 시장 급변 뒤엔 국내장 반응이 크기 때문에, 대기 원칙과 맞물릴 수 있어요.';
  }
  if (/단일 종목/.test(t) || /한도/.test(t)) {
    return buy
      ? '이번 주문이 한 종목 비중 상한을 넘기면, 포트폴리오 한도 원칙과 어긋날 수 있어요.'
      : '비중이 이미 높은데 추가 매도·매수 타이밍은 한도·분할 규칙과 함께 봐야 해요.';
  }
  if (/현금/.test(t)) {
    return buy
      ? '현금 버퍼를 깎는 매수면, 유동성 확보 원칙과 충돌할 수 있어요.'
      : '매도 후에도 현금 비중 목표를 맞추는지 확인할 가치가 있어요.';
  }
  if (/최대 종목/.test(t) || /종목 수/.test(t)) {
    return buy
      ? '보유 종목 수가 많을 때 신규 매수는, 동시 보유 상한과 맞는지 짚어봐야 해요.'
      : '종목 수·정리 우선순위와 맞는 매도인지 확인이 필요해요.';
  }
  if (/월 투자/.test(t) || /월간/.test(t)) {
    return buy
      ? '이번 달 누적 투입이 월간 한도에 닿을 수 있어, 한도 원칙과 비교해야 해요.'
      : '월간 흐름·재진입 타이밍이 한도·기록 규칙과 맞는지 볼 만해요.';
  }
  if (/신규/.test(t) && /진입/.test(t)) {
    return buy
      ? '첫 진입 비중 상한을 넘기면, 신규 종목 진입 규칙과 어긋날 수 있어요.'
      : '신규로 잡은 비중·손익 구간이 첫 진입·손절 규칙과 맞는지 확인이 필요해요.';
  }
  if (/손절/.test(t) && /기준/.test(t)) {
    return sell
      ? '손절선·익절선을 정해 뒀다면, 지금 가격이 그 기준과 맞는지가 핵심이에요.'
      : '매수 직후 손절선을 깨는 구간이면, 손절 원칙과 반대로 움직일 수 있어요.';
  }
  if (/물타기/.test(t)) {
    return buy
      ? '낙폭 구간 추가 매수는 물타기 금지 구간과 겹칠 수 있어요.'
      : '물타기 금지 구간에서의 매도·정리 순서가 원칙과 맞는지 짚어봐야 해요.';
  }
  if (/매도 사이드카|사이드카.*매도/.test(t)) {
    return '매도 사이드카·시장 안정화 구간에선, 매도 금지(대기) 규칙과 충돌할 수 있어요.';
  }
  if (/매수 사이드카|사이드카.*매수/.test(t)) {
    return '매수 사이드카 발동 시엔 신규 매수 금지 시간과 맞물릴 수 있어요.';
  }
  if (/최소 보유/.test(t)) {
    return sell
      ? '최소 보유 시간을 채우기 전 매도면, 보유 기간 원칙과 어긋날 수 있어요.'
      : '너무 빠른 재진입은 최소 보유·냉각 규칙과 겹칠 수 있어요.';
  }
  if (/공시/.test(t)) {
    return buy
      ? '공시를 확인하지 않은 매수는, 공시 확인 필수 원칙과 맞지 않을 수 있어요.'
      : '공시·이슈 전후 매도 타이밍이 원칙과 맞는지 볼 만해요.';
  }
  if (/뉴스/.test(t)) {
    return buy
      ? '뉴스·재료 확인 없이 매수하면, 뉴스 확인 필수 규칙과 충돌할 수 있어요.'
      : '뉴스 흐름과 다른 타이밍이면 원칙 재점검이 필요해요.';
  }
  if (/재무/.test(t)) {
    return buy
      ? '실적·재무 확인 전 매수는, 재무 확인 필수 원칙과 어긋날 수 있어요.'
      : '재무·밸류 전제와 맞지 않는 매도인지 짚어볼 가치가 있어요.';
  }
  if (/거래량/.test(t)) {
    return buy
      ? '거래량 급등일 추격 매수는, 거래량 급등 금지·추격 매수 점검과 맞물릴 수 있어요.'
      : '급등 거래량 구간의 매도는 감정·속도 원칙과 함께 봐야 해요.';
  }
  if (/일일 매매|하루/.test(t)) {
    return '당일 매매 횟수 상한을 넘기면, 과매매·멘탈 관리 원칙과 충돌할 수 있어요.';
  }
  if (/연속 손절|휴식/.test(t)) {
    return '연속 손절 후 휴식 구간이면, 쿨다운 원칙과 맞지 않는 주문일 수 있어요.';
  }
  if (/FOMO|관찰/.test(t)) {
    return buy
      ? '신고가·돌파 직후 바로 진입하면, 관찰 기간 원칙과 어긋날 수 있어요.'
      : '관찰 기간을 채우기 전 매도·스윙은 원칙 재확인이 필요해요.';
  }
  if (/분노|냉각/.test(t)) {
    return buy
      ? '손절 직후 짧은 시간 안 신규 매수는, 냉각·분노 매매 금지와 맞물릴 수 있어요.'
      : '감정이 올라간 직후 매도는 냉각 시간과 충돌할 수 있어요.';
  }
  if (/주말|금요일/.test(t)) {
    return '금요일 이후 시간·주말 계획 매매 금지와 맞는지, 장·시각 조건을 짚어봐야 해요.';
  }

  const sideWord = buy ? '매수' : '매도';
  return `이번 ${sideWord} 조건이 「${t || '해당 원칙'}」에 적어 둔 기준과 맞는지, 한 번 더 맞춰볼 필요가 있어요.`;
}

export type KimooniOrderPreview = {
  /** 상단 한 줄: 무엇을 먼저 볼지 */
  scoreLine: string;
  /** 불릿(최대 maxBullets) — 「원칙」— 이유 */
  bullets: string[];
  /** 공론장에서 이어서 볼 나머지 개수 */
  moreInForumCount: number;
  /** 공론장·후속 점검의 앵커 라벨 (저장 순위 1위) */
  primaryLabel: string | null;
};

const MAX_SHEET_BULLETS = 2;

/**
 * 키문이 주문 시트용: 순위대로 정렬된 위반 라벨만 쓰고, 화면은 maxBullets+나머지 안내로 제한.
 */
export function buildKimooniOrderViolationPreview(
  violatedPrinciples: string[],
  orderSide: OrderSide,
  interventionMessage: string | null | undefined,
  violationDetails?: OrderPrincipleViolationDetailDto[] | null,
): KimooniOrderPreview {
  const fromServer =
    violationDetails?.filter((d) => d.short_label?.trim() && d.reason?.trim()) ?? [];

  const seen = new Set<string>();
  const ordered: string[] = [];
  const reasonByLabel = new Map<string, string>();

  if (fromServer.length > 0) {
    for (const d of fromServer) {
      const n = normLabel(d.short_label);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      ordered.push(d.short_label.trim());
      reasonByLabel.set(n, d.reason.trim());
    }
  } else {
    for (const raw of violatedPrinciples) {
      const n = normLabel(raw);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      ordered.push(raw.trim());
    }
  }

  const primary = ordered.length > 0 ? normLabel(ordered[0]) : null;
  const sideWord = orderSide === 'buy' ? '매수' : '매도';

  const iv = normLabel(interventionMessage ?? '');
  const ivShort =
    iv.length > 0
      ? iv.length > 96
        ? `${iv.slice(0, 94)}…`
        : iv
      : '';

  let scoreLine: string;
  if (primary) {
    scoreLine =
      `저장해 둔 원칙 순위와 이번 ${sideWord} 점검 기준으로, 가장 먼저 볼 항목은 「${primary}」예요.` +
      (ivShort ? ` ${ivShort}` : '');
  } else if (ivShort) {
    scoreLine = ivShort;
  } else {
    scoreLine = `이번 ${sideWord}는 설정해 둔 기준과 맞는지, 한 번 더 짚어볼 만해요.`;
  }

  const bullets = ordered.slice(0, MAX_SHEET_BULLETS).map((label) => {
    const display = normLabel(label);
    const why =
      reasonByLabel.get(display) ?? explainPrincipleViolationOneLine(label, orderSide);
    return `「${display}」 — ${why}`;
  });

  const moreInForumCount = Math.max(0, ordered.length - MAX_SHEET_BULLETS);

  return {
    scoreLine,
    bullets,
    moreInForumCount,
    primaryLabel: primary,
  };
}

export type OrderPrincipleRecapItem = { label: string; reasonOneLine: string };

/** 점검방 리스트: 맞물릴 수 있는 원칙을 **전부** 한 줄씩(서버 reason 우선). */
export function buildOrderPrincipleRecapItemsForDebate(
  source:
    | {
        orderType?: 'buy' | 'sell';
        violatedPrinciples?: string[];
        violationDetails?: { short_label: string; reason: string }[];
      }
    | null
    | undefined,
): OrderPrincipleRecapItem[] {
  if (!source) return [];
  const side: OrderSide = source.orderType === 'sell' ? 'sell' : 'buy';
  const seen = new Set<string>();
  const out: OrderPrincipleRecapItem[] = [];

  const details = (source.violationDetails ?? []).filter((d) => normLabel(d.short_label));
  if (details.length > 0) {
    for (const d of details) {
      const label = normLabel(d.short_label);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      const r = normLabel(d.reason);
      out.push({
        label,
        reasonOneLine: r || explainPrincipleViolationOneLine(label, side),
      });
    }
    return out;
  }

  for (const raw of source.violatedPrinciples ?? []) {
    const label = normLabel(String(raw));
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({
      label,
      reasonOneLine: explainPrincipleViolationOneLine(String(raw), side),
    });
  }
  return out;
}
