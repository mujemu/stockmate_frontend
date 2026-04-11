export type OrderPrincipleVariant = 'good' | 'suggest';

/** 백엔드가 내려주는 JSON을 이 형태로 맞추거나, 프론트에서 매핑합니다. */
export type OrderPrincipleResult = {
  title: string;
  body: string;
  lead: string;
  variant: OrderPrincipleVariant;
  /** 단일 버튼 모드 */
  singleCtaLabel?: string;
  /** 이중 버튼 모드 */
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
};

export type OrderPrincipleRequest = {
  stock_name: string;
  order_type: 'buy' | 'sell';
  quantity: number;
  price: number;
};
