/**
 * 주문 전 점검방 — default_rank별 기자(키문이)·회계사(키북이) 조력 여부.
 * 백엔드 `forum_agent._ORDER_PRINCIPLE_RANK_EXTRA_AGENTS` 와 동일해야 함.
 */

const RANK_EXTRA: Record<number, readonly ('owl' | 'turtle')[]> = {
  1: ['owl'],
  3: ['owl'],
  4: ['owl'],
  11: ['owl', 'turtle'],
  12: ['owl'],
  14: ['turtle'],
  15: ['owl'],
  16: ['turtle'],
  17: ['owl'],
  18: ['owl', 'turtle'],
  21: ['owl', 'turtle'],
};

export function extraAgentsForDefaultRank(defaultRank: number): Set<'owl' | 'turtle'> {
  const ex = RANK_EXTRA[defaultRank];
  return new Set(ex ?? []);
}

/** 백엔드 `order_principle_reply_agent_ids` 와 동일: 항상 octopus 먼저, 이어 조력 캐릭터 */
export function orderPrincipleReplyAgentIds(violationRanks: number[]): Array<'octopus' | 'owl' | 'turtle'> {
  const extras: ('owl' | 'turtle')[] = [];
  for (const r of violationRanks) {
    const s = extraAgentsForDefaultRank(r);
    for (const a of ['owl', 'turtle'] as const) {
      if (s.has(a) && !extras.includes(a)) extras.push(a);
    }
  }
  return ['octopus', ...extras];
}
