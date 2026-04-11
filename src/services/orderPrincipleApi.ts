import { ORDER_PRINCIPLE_PATH } from '../config/orderPrincipleApiPaths';
import type { OrderPrincipleRequest, OrderPrincipleResult } from '../types/orderPrinciple';
import { http } from './httpClient';

function mockPrinciple(req: OrderPrincipleRequest): OrderPrincipleResult {
  const side = req.order_type === 'buy' ? '매수' : '매도';
  const isSell = req.order_type === 'sell';
  const suggest = req.quantity >= 2;
  if (suggest) {
    return {
      title: isSell ? '이번 매도 원칙은?' : '이번 매수 원칙은?',
      body: `${req.stock_name} ${side}는 ‘분할·기록’ 원칙과 비교해 볼 만해요. AI 분석(목업) 기준으로는 변동성 구간에서 한 번에 물량을 움직이는 패턴이에요.`,
      lead: '새로운 원칙 제안',
      variant: 'suggest',
      primaryCtaLabel: '원칙 수정하기',
      secondaryCtaLabel: '무시하기',
    };
  }
  return {
    title: isSell ? '이번 매도 원칙은?' : '이번 매수 원칙은?',
    body: `${req.stock_name} ${side}는 설정해 둔 ‘저점 분할·손절 기록’ 흐름과 잘 맞는 편이에요(목업 응답).`,
    lead: '원칙을 잘 지키셨어요.',
    variant: 'good',
    singleCtaLabel: '원칙 수정하기',
  };
}

function normalizeDto(data: Record<string, unknown>): OrderPrincipleResult {
  const variant = data.variant === 'suggest' ? 'suggest' : 'good';
  return {
    title: String(data.title ?? ''),
    body: String(data.body ?? data.message ?? ''),
    lead: String(data.lead ?? ''),
    variant,
    singleCtaLabel: data.single_cta_label != null ? String(data.single_cta_label) : undefined,
    primaryCtaLabel: data.primary_cta_label != null ? String(data.primary_cta_label) : undefined,
    secondaryCtaLabel: data.secondary_cta_label != null ? String(data.secondary_cta_label) : undefined,
  };
}

/**
 * 백엔드 투자분석/리포트 에이전트가 주문 맥락을 보고 원칙 카피를 생성하는 호출.
 * 엔드포인트가 없거나 실패하면 목업으로 폴백합니다.
 *
 * 백엔드가 내려줄 수 있는 JSON 예시 (필드명은 스네이크 케이스로 맞추고 normalizeDto에서 매핑):
 * {
 *   "title": "이번 매수 원칙은?",
 *   "body": "…에이전트 본문…",
 *   "lead": "원칙을 잘 지키셨어요.",
 *   "variant": "good",
 *   "single_cta_label": "원칙 수정하기"
 * }
 * variant가 "suggest"이면 primary_cta_label, secondary_cta_label 사용.
 */
export async function fetchOrderPrinciple(req: OrderPrincipleRequest): Promise<OrderPrincipleResult> {
  try {
    const { data } = await http.post<Record<string, unknown>>(ORDER_PRINCIPLE_PATH, req);
    if (data && typeof data === 'object') {
      const n = normalizeDto(data);
      if (n.title && n.body) return n;
    }
  } catch {
    /* 백엔드 미연결·404 시 목업 */
  }
  return mockPrinciple(req);
}
