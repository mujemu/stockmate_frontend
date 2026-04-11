/**
 * 주문 완료 후 투자 원칙(키문이 카드) 전용 엔드포인트가 없으면,
 * 백엔드 스펙상 `POST /api/v1/behavior-logs` 응답의 `intervention_message` 또는
 * 분석 파이프라인 결과를 조합해 동일 UI를 채울 수 있습니다.
 */
export const ORDER_PRINCIPLE_PATH = '/ai/order-principle';
