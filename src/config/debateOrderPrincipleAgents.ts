/**
 * 주문 전 점검방 — default_rank별 기자(키엉이)·회계사(키북이) 조력 여부.
 * 백엔드 `forum_agent._ORDER_PRINCIPLE_RANK_EXTRA_AGENTS` 와 동일해야 함.
 */

const RANK_EXTRA: Record<number, readonly ('eagle' | 'turtle')[]> = {
  1: ['eagle'],
  3: ['eagle'],
  4: ['eagle'],
  11: ['eagle', 'turtle'],
  12: ['eagle'],
  14: ['turtle'],
  15: ['eagle'],
  16: ['turtle'],
  17: ['eagle'],
  18: ['eagle', 'turtle'],
  21: ['eagle', 'turtle'],
};

export function extraAgentsForDefaultRank(defaultRank: number): Set<'eagle' | 'turtle'> {
  const ex = RANK_EXTRA[defaultRank];
  return new Set(ex ?? []);
}

/** 백엔드 `order_principle_reply_agent_ids` 와 동일: 항상 owl 먼저, 이어 조력 캐릭터 */
export function orderPrincipleReplyAgentIds(violationRanks: number[]): Array<'owl' | 'eagle' | 'turtle'> {
  const extras: ('eagle' | 'turtle')[] = [];
  for (const r of violationRanks) {
    const s = extraAgentsForDefaultRank(r);
    for (const a of ['eagle', 'turtle'] as const) {
      if (s.has(a) && !extras.includes(a)) extras.push(a);
    }
  }
  return ['owl', ...extras];
}
