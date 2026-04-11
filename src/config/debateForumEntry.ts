/**
 * 공론장(DebateRoom) 진입 경로별 성격 — 토픽 시드 문구·제목에 반영.
 * 종목별 / 섹터별 / 뉴스 / 주문 전 원칙 점검 은 각각 논의 초점이 달라야 함.
 */

export type DebateForumEntrySource =
  | 'stock'
  | 'sector'
  | 'news'
  | 'order_principle_check';

export type DebateOrderContextForIntro = {
  fromOrderFlow?: boolean;
  orderType?: 'buy' | 'sell';
  violationScore?: number;
  violatedPrinciples?: string[];
  interventionMessage?: string;
  topViolation?: string;
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
      const orderSide = oc?.orderType === 'sell' ? '매도' : oc?.orderType === 'buy' ? '매수' : '매수/매도';
      const score = oc?.violationScore != null ? `${oc.violationScore}점` : '—';
      const intervention = oc?.interventionMessage?.trim();
      const topV = oc?.topViolation?.trim();
      const vlist = oc?.violatedPrinciples?.filter(Boolean).length
        ? oc!.violatedPrinciples!.join(', ')
        : null;
      const content = lines(
        '[이 방의 성격 — 주문 직전 원칙 점검에서 연 토론방]',
        '매수·매도 확인 화면에서 키문이가 행동 로그·투자 원칙을 요약했고, 그 결과를 바탕으로 공론장으로 안내되었습니다.',
        '',
        '【무엇이 문제로 지적됐는지】',
        `· 검토하려던 주문: ${orderSide}`,
        `· 시스템이 산출한 위반·경고 점수: ${score} (60점 이상이면 원칙과의 충돌 가능성이 크다고 안내합니다)`,
        intervention ? `· 키문이 코멘트(개입 메시지): ${intervention}` : '· 키문이 코멘트: (별도 개입 문구 없음)',
        topV ? `· 우선 점검 원칙: ${topV}` : null,
        vlist ? `· 함께 표시된 관련 원칙: ${vlist}` : null,
        '',
        '【이 방에서 할 일】',
        '이 방은 **키문이(원칙 코치)만** 응답합니다. 매수·매도 지시는 하지 않으며,',
        '아래에 정리된 점검 내용과 본인이 설정한 투자 원칙을 연결해 스스로 판단할 수 있도록 질문으로 돕습니다.',
        '',
        '【참고 맥락】',
        sn || sc || sk
          ? `종목: ${sn ?? '—'} / 종목코드: ${sc ?? '—'} / 섹터: ${sk ?? '—'}`
          : null,
      );
      return { title, content };
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
      const sectorVoice =
        sk === '금융'
          ? '금리·NIM·배당·규제·부실채권 등 금융 업종 공통 변수가 중심입니다. 키엉이는 정책·수급 이슈, 키북이는 자본·수익성 지표, 키문이는 레버리지·원칙(비중·분할) 관점에서 질문합니다.'
          : sk === '정보기술'
            ? '반도체·IT 업황 사이클, HBM·AI, 수출 규제 등이 중심입니다. 키엉이는 업황·뉴스, 키북이는 CAPEX·재고·가격 지표, 키문이는 변동성·추격매수 편향을 짚습니다.'
            : sk === '필수소비재'
              ? '브랜드·해외 소비·원자재·면세 등 방어 업종 공통 테마가 중심입니다. 키엉이는 소비·유통 이슈, 키북이는 마진·해외매출 비중, 키문이는 “방어주=무조건 안전” 맹신을 질문합니다.'
              : '동일 업종·테마 안의 사이클·정책·밸류를 논의하는 업종 공론장입니다.';
      const content = lines(
        `[이 방의 성격 — ${sk ?? '업종'} 공론장 (종목 전용 방이 아님)]`,
        '한 기업 실적만 파헤치는 종목 토론과 달리, 이 방은 같은 업종 안에서 공통으로 작동하는 사이클·정책·밸류 밴드·리더/팔로워 관계를 다룹니다.',
        sk === '금융'
          ? '금융 업종은 은행·증권·보험 등 여러 하위 업권이 함께 움직입니다. 특정 증권사 한 곳만 이야기하는 것이 아니라, 금리·NIM·배당·규제·부실채권 등 업종 공통 변수를 중심으로 논의해 주세요.'
          : null,
        sectorVoice,
        '',
        '개별 종목 이슈는 “이 업종 전체에 왜 중요한지”와 연결해 말해 주세요. 특정 종목 매매를 권유하는 표현은 삼가 주세요.',
        '',
        sk ? `대상 업종: ${sk}` : null,
      );
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
