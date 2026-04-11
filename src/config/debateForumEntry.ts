/**
 * 공론장(DebateRoom) 진입 경로별 성격 — 토픽 시드 문구·제목에 반영.
 * 종목별 / 섹터별 / 뉴스 / 주문 전 원칙 점검 은 각각 논의 초점이 달라야 함.
 */

export type DebateForumEntrySource =
  | 'stock'
  | 'sector'
  | 'news'
  | 'order_principle_check';

export type OrderPrincipleViolationDetailIntro = {
  short_label: string;
  default_rank: number;
  reason: string;
};

export type DebateOrderContextForIntro = {
  fromOrderFlow?: boolean;
  orderType?: 'buy' | 'sell';
  violatedPrinciples?: string[];
  interventionMessage?: string;
  topViolation?: string;
  /** POST /behavior-logs 의 violation_details (서버 사유) */
  violationDetails?: OrderPrincipleViolationDetailIntro[];
};

export type BuildDebateForumSeedArgs = {
  entry: DebateForumEntrySource;
  stockName?: string | null;
  stockCode?: string | null;
  sectorKey?: string | null;
  orderContext?: DebateOrderContextForIntro | null;
  /** forumEntrySource === 'news' 일 때 뉴스 불릿 문장 */
  newsBulletText?: string | null;
};

function lines(...parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join('\n');
}

/** 네비게이션에서 누락 시 보조 추론 (가능하면 forumEntrySource 를 명시할 것) */
export function inferDebateForumEntrySource(p: {
  forumEntrySource?: DebateForumEntrySource | null;
  orderContext?: DebateOrderContextForIntro | null;
  stockCode?: string | null;
  stockName?: string | null;
  sectorKey?: string | null;
  newsBulletText?: string | null;
}): DebateForumEntrySource {
  if (p.forumEntrySource) return p.forumEntrySource;
  if (p.orderContext?.fromOrderFlow) return 'order_principle_check';
  if (p.newsBulletText?.trim()) return 'news';
  if ((p.stockCode || p.stockName) && !p.sectorKey) return 'news';
  if (p.sectorKey && !p.stockCode && !p.stockName) return 'sector';
  return 'stock';
}

/**
 * 신규 토론방 생성 시 제목·본문(첫 안내에 들어갈 content) — API createTopic.content
 */
export function buildDebateForumSeedTopic(a: BuildDebateForumSeedArgs): { title: string; content: string } {
  const sn = a.stockName?.trim() || null;
  const sc = a.stockCode?.trim() || null;
  const sk = a.sectorKey?.trim() || null;
  const oc = a.orderContext;
  const bullet = a.newsBulletText?.trim() || null;

  switch (a.entry) {
    case 'order_principle_check': {
      const title = sn ? `${sn} · 주문 전 원칙 점검` : sc ? `종목 ${sc} · 주문 전 원칙 점검` : '주문 전 원칙 점검';
      /** 본문은 DB not-null용 최소값만 — 실제 안내는 앱에서 CLI 패널로 표시 */
      return { title, content: '·' };
    }
    case 'stock': {
      const title = sn ? `${sn} 종목 토론` : sc ? `종목 토론 · ${sc}` : '종목 토론';
      const content = lines(
        '[이 방의 성격 — 종목별 공론장]',
        '한 종목의 밸류·업황·공시·이슈를 중심으로 깊게 다루는 방입니다.',
        '같은 섹터의 다른 종목은 비교·근거 제시용으로만 언급하고, 논의의 축은 항상 이 종목에 맞춰 주세요.',
        '',
        sn || sc || sk
          ? `대상: ${sn ?? '—'} (코드: ${sc ?? '—'}) / 섹터: ${sk ?? '—'}`
          : null,
        '',
        '의견은 자유롭게 남기되, 매매 권유가 아닌 논리·근거 위주로 부탁드립니다.',
      );
      return { title, content };
    }
    case 'sector': {
      const title = sk ? `${sk} 토론` : '업종 토론';
      /** DB not-null용 최소 본문 — 앱에서는 업종 공론 안내 버블을 숨기고 개시 발언으로 시작 */
      const content = sk
        ? `[업종 공론장] ${sk} 업종 전체 이야기입니다. 아래에서 키엉이·키북이·키문이가 차례로 짧게 시작합니다.`
        : '[업종 공론장] 아래 대화로 시작합니다.';
      return { title, content };
    }
    case 'news': {
      const title = sn ? `${sn} · 뉴스 맥락 토론` : sc ? `뉴스 맥락 · ${sc}` : '뉴스 맥락 토론';
      const content = lines(
        '[이 방의 성격 — 뉴스 탭(브리핑)에서 연 공론장]',
        '뉴스·속보 한 줄을 출발점으로, 과장 여부·사실 관계·주가 반영도를 함께 검증하는 방입니다.',
        '키엉이는 “시장에서 어떻게 읽히는지”, 키북이는 “숫자·공시와 맞는지”, 키문이는 “내 원칙·리스크 관점에서 어떻게 볼지”를 나눕니다.',
        '',
        bullet ? `【뉴스에서 넘어온 문장】\n${bullet}` : null,
        '',
        sn || sc
          ? `관련 종목: ${sn ?? '—'} (코드: ${sc ?? '—'})`
          : null,
      );
      return { title, content };
    }
    default: {
      const title = '공론장 토론';
      return {
        title,
        content: '[이 방의 성격]\n맥락 정보가 부족합니다. 아래에서 주제를 정리해 대화를 시작해 주세요.',
      };
    }
  }
}
