/**
 * 매매 직전 점검방 진입 전 — 위반 원칙 미리보기용 카피.
 * 서버 `violation_details` 순서를 유지한다. 사용자 원칙 문장(+파라미터 치환)이 있으면 시트 불릿에 우선 사용한다.
 */

import { defaultParamsForRank, formatPrincipleTemplateText } from './principleUiSpecs';
import type {
  OrderPrincipleViolationDetailDto,
  PrinciplesStatusDto,
} from '../types/stockmateApiV1';

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
      ? '그날 주가가 크게 움직일 때 새로 사면, 미리 정한 ‘너무 빠르게 사지 않기’ 규칙과 어긋날 수 있어요.'
      : '주가가 크게 움직이는 날엔 마음이 흔들리기 쉬워서, 정해 둔 매도·시간 규칙과 안 맞을 수 있어요.';
  }
  if (/장 마감/.test(t)) {
    return '장 끝나기 직전엔 체결이 느리거나 사·팔 가격 차이가 커질 수 있어서, ‘마감 전에는 안 한다’는 규칙과 겹칠 수 있어요.';
  }
  if (/장 시작/.test(t) || /개장/.test(t)) {
    return '장이 막 연 직후엔 가격이 들쭉날쭉해서, ‘장 시작 후 잠깐 기다리기’ 규칙과 안 맞을 수 있어요.';
  }
  if (/미국/.test(t)) {
    return '밤새 해외 시장에서 크게 움직였다면 국내장도 반응이 클 수 있어서, ‘잠깐 기다리기’ 규칙과 안 맞을 수 있어요.';
  }
  if (/단일 종목/.test(t) || /한도/.test(t)) {
    return buy
      ? '이번 주문으로 한 종목 비중이 정한 한도를 넘기면, ‘한 종목에 너무 몰아넣지 않기’ 원칙과 어긋날 수 있어요.'
      : '이미 비중이 큰데 추가로 사거나 팔 타이밍이면, 한도와 나눠서 하기 규칙을 같이 봐야 해요.';
  }
  if (/현금/.test(t)) {
    return buy
      ? '바로 쓸 현금을 너무 줄이는 매수면, ‘급할 때 쓸 돈 남겨 두기’ 규칙과 안 맞을 수 있어요.'
      : '판 뒤에도 현금 비율 목표를 지키는지 한 번 볼 만해요.';
  }
  if (/최대 종목/.test(t) || /종목 수/.test(t)) {
    return buy
      ? '갖고 있는 종목이 많을 때 새로 사면, ‘동시에 너무 많이 갖지 않기’ 상한과 맞는지 봐야 해요.'
      : '종목 수와 정리 순서에 맞는 매도인지 확인이 필요해요.';
  }
  if (/월 투자/.test(t) || /월간/.test(t)) {
    return buy
      ? '이번 달에 넣은 돈이 월 한도에 닿을 수 있어서, 한도 규칙과 비교해야 해요.'
      : '이번 달 흐름이나 다시 들어갈 때가 한도·기록 규칙과 맞는지 볼 만해요.';
  }
  if (/신규/.test(t) && /진입/.test(t)) {
    return buy
      ? '처음 살 때 정한 비중을 넘기면, ‘새 종목 첫 살 때 규칙’과 어긋날 수 있어요.'
      : '새로 잡은 비중·손익 구간이 첫 살 때·손절 규칙과 맞는지 확인이 필요해요.';
  }
  if (/손절/.test(t) && /기준/.test(t)) {
    return sell
      ? '손절·익절 가격을 정해 두었다면, 지금 가격이 그 기준과 맞는지가 중요해요.'
      : '산 직후 손절 가격을 깨는 구간이면, 손절 규칙과 반대로 움직일 수 있어요.';
  }
  if (/물타기/.test(t)) {
    return buy
      ? '빠진 가격에 또 사는 건 ‘물타기 하지 않기’ 구간과 겹칠 수 있어요.'
      : '물타기 금지 구간에서의 매도·정리 순서가 원칙과 맞는지 봐야 해요.';
  }
  if (/매도 사이드카|사이드카.*매도/.test(t)) {
    return '시장이 흔들려 매도를 잠깐 막는 구간이면, ‘그때는 팔지 않기’ 규칙과 안 맞을 수 있어요.';
  }
  if (/매수 사이드카|사이드카.*매수/.test(t)) {
    return '시장이 흔들려 새 매수를 잠깐 막는 구간이면, ‘그 시간엔 새로 사지 않기’와 안 맞을 수 있어요.';
  }
  if (/최소 보유/.test(t)) {
    return sell
      ? '정한 최소 보유 시간을 채우기 전에 팔면, 보유 기간 규칙과 어긋날 수 있어요.'
      : '너무 빨리 다시 사 들어가면, ‘최소로 갖고 있을 시간’·‘잠깐 식히기’ 규칙과 겹칠 수 있어요.';
  }
  if (/공시/.test(t)) {
    return buy
      ? '회사 알림(공시)을 보지 않고 사면, ‘공시 꼭 보고 사기’ 원칙과 맞지 않을 수 있어요.'
      : '공시나 이슈 전후에 파는 타이밍이 원칙과 맞는지 볼 만해요.';
  }
  if (/뉴스/.test(t)) {
    return buy
      ? '뉴스나 이유를 확인하지 않고 사면, ‘뉴스 확인하고 사기’ 규칙과 안 맞을 수 있어요.'
      : '뉴스 흐름과 다른 타이밍이면 원칙을 다시 보는 게 좋아요.';
  }
  if (/재무/.test(t)) {
    return buy
      ? '실적·숫자를 보기 전에 사면, ‘재무 꼭 보고 사기’ 원칙과 어긋날 수 있어요.'
      : '회사 가치·숫자 전제와 맞지 않게 파는 건 아닌지 볼 만해요.';
  }
  if (/거래량/.test(t)) {
    return buy
      ? '거래량이 갑자기 크게 붙은 날, 너무 빨리 따라 사면, ‘그런 날 무리하게 사지 않기’ 점검과 안 맞을 수 있어요.'
      : '거래량이 급한 날 파는 건 감정·속도 규칙과 같이 봐야 해요.';
  }
  if (/일일 매매|하루/.test(t)) {
    return '하루에 너무 많이 사고팔면, ‘하루 횟수 제한’·‘마음 다스리기’ 규칙과 안 맞을 수 있어요.';
  }
  if (/연속 손절|휴식/.test(t)) {
    return '연속으로 손절한 뒤 쉬는 구간이면, ‘잠깐 쉬기’ 규칙과 맞지 않는 주문일 수 있어요.';
  }
  if (/FOMO|관찰/.test(t)) {
    return buy
      ? '가격이 새로 최고 찍은 직후 바로 사면, ‘한동안 지켜보기’ 규칙과 어긋날 수 있어요.'
      : '지켜볼 기간을 채우기 전에 팔거나 짧게 흔들면, 원칙을 다시 확인하는 게 좋아요.';
  }
  if (/분노|냉각/.test(t)) {
    return buy
      ? '손절한 직후 짧은 시간 안에 또 사면, ‘화난 상태·흥분한 상태에서 사지 않기’와 안 맞을 수 있어요.'
      : '감정이 올라간 직후에 파는 건, ‘잠깐 식히기’ 시간과 안 맞을 수 있어요.';
  }
  if (/주말|금요일/.test(t)) {
    return '금요일 장 끝난 뒤나 주말에 미리 짜 둔 매매 금지와 맞는지, 요일·시간을 한 번 더 보세요.';
  }

  const sideWord = buy ? '매수' : '매도';
  return `이번 ${sideWord} 조건이 「${t || '해당 원칙'}」에 적어 둔 기준과 맞는지, 한 번 더 맞춰볼 필요가 있어요.`;
}

/**
 * 주문 시트·점검방 연계용: 위반 `default_rank`마다 DB에 저장한 원칙 문장을 파라미터까지 반영해 한 줄씩 만든다.
 * 원칙 상태를 아직 못 불렀으면 서버 `reason`으로 대체한다.
 */
export function buildFormattedViolationLinesForOrderSheet(
  status: PrinciplesStatusDto | null | undefined,
  violationDetails: OrderPrincipleViolationDetailDto[] | null | undefined,
  orderSide: OrderSide,
): string[] {
  const details = violationDetails?.filter((d) => d?.short_label?.trim()) ?? [];
  if (details.length === 0) return [];

  const rankings = status?.rankings ?? [];
  const byDefaultRank = new Map<number, (typeof rankings)[number]>();
  for (const r of rankings) {
    byDefaultRank.set(r.default_rank, r);
  }
  const paramsRoot = status?.params ?? null;

  const lines: string[] = [];
  for (const d of details) {
    const dr = Number(d.default_rank);
    const row = byDefaultRank.get(dr);
    let line = '';
    if (row) {
      const bag = { ...defaultParamsForRank(dr), ...(paramsRoot?.[row.principle_id] ?? {}) };
      const template = (row.text || '').trim() || normLabel(d.short_label);
      line = formatPrincipleTemplateText(template, dr, bag).trim();
    }
    if (!line) {
      const fromServer = normLabel(d.reason);
      line = fromServer || explainPrincipleViolationOneLine(d.short_label, orderSide);
    }
    if (line) lines.push(line);
  }
  return lines;
}

export type KimooniOrderPreview = {
  /** 상단 한 줄: 무엇을 먼저 볼지 */
  scoreLine: string;
  /** 불릿(최대 maxBullets) — 원칙 짧은 라벨만 */
  bullets: string[];
  /** 점검방에서 이어서 볼 나머지 개수 */
  moreInForumCount: number;
  /** 점검방·후속 점검의 앵커 라벨 (저장 순위 1위) */
  primaryLabel: string | null;
  /** 짧은 라벨 목록(순서 유지) */
  keywords: string[];
};

const MAX_SHEET_BULLETS = 2;

/**
 * 키문이 주문 시트용: 순위대로 정렬된 위반 라벨만 쓰고, 화면은 maxBullets+나머지 안내로 제한.
 */
export function buildKimooniOrderViolationPreview(
  violatedPrinciples: string[],
  orderSide: OrderSide,
  _interventionMessage: string | null | undefined,
  violationDetails?: OrderPrincipleViolationDetailDto[] | null,
  /** 저장 원칙 문장(분·% 등 치환 완료). 있으면 불릿에 짧은 라벨 대신 이 문장을 쓴다. */
  formattedPrincipleLines?: string[] | null,
): KimooniOrderPreview {
  const fromServer = violationDetails?.filter((d) => d.short_label?.trim()) ?? [];

  const seen = new Set<string>();
  const ordered: string[] = [];

  if (fromServer.length > 0) {
    for (const d of fromServer) {
      const n = normLabel(d.short_label);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      ordered.push(d.short_label.trim());
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

  const useFormatted =
    Array.isArray(formattedPrincipleLines) && formattedPrincipleLines.some((s) => normLabel(s));

  let scoreLine: string;
  if (useFormatted) {
    scoreLine = `이번 ${sideWord}가 투자 원칙 화면에 적어 둔 문장과 맞는지, 아래를 기준으로 한 번 더 보면 좋아요.`;
  } else if (primary) {
    scoreLine = `이번 ${sideWord}에서 먼저 짚을 원칙은 「${primary}」예요.`;
  } else {
    scoreLine = `이번 ${sideWord}가 정해 둔 기준과 맞는지, 한 번 더 볼 만해요.`;
  }

  const bullets = useFormatted
    ? formattedPrincipleLines!.map((s) => normLabel(s)).filter(Boolean).slice(0, MAX_SHEET_BULLETS)
    : ordered.slice(0, MAX_SHEET_BULLETS).map((label) => {
        const display = normLabel(label);
        return `「${display}」`;
      });

  const bulletSourceLen = useFormatted
    ? formattedPrincipleLines!.map((s) => normLabel(s)).filter(Boolean).length
    : ordered.length;
  const moreInForumCount = Math.max(0, bulletSourceLen - MAX_SHEET_BULLETS);

  return {
    scoreLine,
    bullets,
    moreInForumCount,
    primaryLabel: primary,
    keywords: [...ordered],
  };
}

export type OrderPrincipleRecapItem = { label: string; reasonOneLine: string };

/** 점검방 리스트: 위반·점검 대상 원칙을 **전부** 짧은 라벨만(상세 한 줄 없음). */
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
  const seen = new Set<string>();
  const out: OrderPrincipleRecapItem[] = [];

  const details = (source.violationDetails ?? []).filter((d) => normLabel(d.short_label));
  if (details.length > 0) {
    for (const d of details) {
      const label = normLabel(d.short_label);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({ label, reasonOneLine: '' });
    }
    return out;
  }

  for (const raw of source.violatedPrinciples ?? []) {
    const label = normLabel(String(raw));
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ label, reasonOneLine: '' });
  }
  return out;
}
