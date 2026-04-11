export type PrototypeStep = {
  name: string;
  title: string;
  subtitle?: string;
};

// TODO: 이 배열을 "플로우 이미지 순서"대로 수정하면, 화면 이동도 그대로 따라갑니다.
export const PROTOTYPE_FLOW: PrototypeStep[] = [
  { name: 'FlowLogin', title: '로그인' },
  { name: 'FlowPortfolioLink', title: '포트폴리오 연동' },
  { name: 'FlowSelectStock', title: '종목 선택' },
  { name: 'FlowCreateMate', title: '주식 메이트 생성' },
  { name: 'FlowHome', title: '메인(홈)' },
  { name: 'FlowChat', title: '채팅' },
  { name: 'FlowReview', title: '복기' },
  { name: 'FlowOrder', title: '주문' },
  { name: 'FlowDone', title: '완료' },
];

