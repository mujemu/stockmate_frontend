/** 백엔드 /api/v1 및 루트 /health, /info 스펙과 맞춘 타입 */

export type UserDto = {
  id: string;
  email: string;
  chatbot_enabled: boolean;
  created_at: string;
};

export type CreateUserBody = { email: string };
export type PatchUserSettingsBody = { chatbot_enabled: boolean };

export type SurveyOptionDto = {
  id: string;
  label: string;
  order_no: number;
};

export type SurveyQuestionDto = {
  id: string;
  order_no: number;
  category: string;
  question_text: string;
  description?: string | null;
  min_selections: number;
  max_selections: number;
  options: SurveyOptionDto[];
};

export type SurveyAnswerItem = {
  question_id: string;
  selected_option_ids: string[];
};

export type SurveySubmitBody = {
  user_id: string;
  answers: SurveyAnswerItem[];
};

export type SurveyStatusDto = {
  user_id: string;
  is_completed: boolean;
  completed_at?: string | null;
};

export type PrincipleDefaultDto = {
  id: string;
  default_rank: number;
  text: string;
  category: string;
  short_label: string;
  description?: string | null;
};

export type PrincipleRankingItem = {
  rank: number;
  principle_id: string;
  text: string;
  category: string;
  short_label: string;
  default_rank: number;
};

export type PrinciplesStatusDto = {
  user_id: string;
  is_configured: boolean;
  rankings: PrincipleRankingItem[];
  configured_at?: string | null;
  /** 서버가 내려주면 월간 수정 잔여 등에 사용 */
  updated_at?: string | null;
  /** Supabase `user_principle_params` — 원칙 id → 파라미터 맵 */
  params?: Record<string, Record<string, number>> | null;
};

/** `POST /api/v1/holdings/user/{user_id}/apply-trade` */
export type SimulatedTradeApplyBody = {
  side: 'buy' | 'sell';
  stock_code?: string | null;
  stock_name: string;
  quantity: number;
  limit_price_won: number;
};

/** `GET /api/v1/holdings/user/{user_id}/simulated` */
export type SimulatedHoldingDto = {
  stock_code: string | null;
  stock_name: string;
  quantity: number;
  total_cost_won: number;
  last_mark_won: number;
  eval_won: number;
  pnl_won: number;
  pnl_pct: number;
};

export type PrincipleSetupRankItem = { principle_id: string; rank: number };
export type PrinciplesSetupBody = {
  rankings: PrincipleSetupRankItem[];
  params?: Record<string, Record<string, number>>;
};
export type PrinciplesReorderBody = { rankings: PrincipleSetupRankItem[] };

/** `GET /api/v1/sectors` — 백엔드 SectorSummaryOut (`key` = 섹터 식별자) */
export type SectorSummaryDto = {
  id: string;
  key: string;
  display_name: string;
  description: string;
  company_count: number;
};

/** `GET /api/v1/sectors/{key}` — CompanyOut */
export type SectorCompanyDto = {
  id: string;
  sector_key: string;
  name: string;
  stock_code: string;
  dart_code?: string | null;
  market_cap_rank?: number | null;
  business_description?: string | null;
};

/** `GET /api/v1/sectors/{key}` — SectorOut */
export type SectorDetailDto = {
  id: string;
  key: string;
  display_name: string;
  description: string;
  analysis_focus: string;
  key_metrics: string[];
  risk_factors: string[];
  market_drivers: string[];
  industry_keywords: string[];
  companies: SectorCompanyDto[];
  created_at: string;
  updated_at: string;
};

/** 백엔드 behavior_log.BehaviorType (소문자 스네이크) */
export type BehaviorType =
  | 'view_sector'
  | 'quick_enter'
  | 'more_thinking'
  | 'issues_only'
  | 'check_numbers'
  | 'skip'
  | 'no_principle'
  | 'against_principle'
  | 'normal_buy'
  | 'normal_sell'
  | 'panic_sell'
  | 'greed_buy'
  | 'rule_break'
  | 'hold';

export type InterventionState = 'created' | 'delivered' | 'read' | 'decided';

export type UserDecision =
  | 'continue'
  | 'cancel'
  | 'ask_more'
  | 'claim_compliance'
  | 'reconsider';

export type BehaviorLogDto = {
  id: string;
  user_id: string;
  stock_code: string | null;
  stock_name: string | null;
  sector_key: string | null;
  behavior_type: string;
  is_rule_violation: boolean;
  user_memo: string | null;
  context_data?: Record<string, unknown> | null;
  intervention_sent: boolean;
  user_decision: string | null;
  intervention_state: string | null;
  logged_at: string;
};

export type BehaviorLogCreateBody = {
  user_id: string;
  behavior_type: BehaviorType;
  stock_code?: string | null;
  stock_name?: string | null;
  sector_key?: string | null;
  user_memo?: string | null;
  context_data?: Record<string, unknown> | null;
};

/** POST /behavior-logs — 원칙별 서버 생성 충돌 사유 */
export type OrderPrincipleViolationDetailDto = {
  short_label: string;
  default_rank: number;
  reason: string;
};

export type BehaviorLogCreateResponse = {
  log: BehaviorLogDto;
  intervention_message: string | null;
  violated_principles: string[] | null;
  violation_details?: OrderPrincipleViolationDetailDto[] | null;
  force_check_required?: boolean | null;
  strike_count?: number | null;
  branch_suggestion?: 'exception_handling' | 'claim_compliance' | 'reconsider' | null;
  force_check_room?: boolean | null;
  check_room_required?: boolean | null;
  require_check_room?: boolean | null;
};

export type PatchBehaviorLogStateBody = { state: InterventionState };
export type PatchBehaviorLogDecisionBody = { decision: UserDecision };

export type BehaviorLogSimulatedFillBody = {
  user_id: string;
  quantity: number;
  limit_price_won: number;
};

export type ViolationsRemainingBody = {
  user_id: string;
  excluded_short_labels: string[];
};

export type ViolationsRemainingResponse = {
  violations: OrderPrincipleViolationDetailDto[];
};

export type ForumTopicTitlePatchBody = {
  user_id: string;
  title: string;
};

export type RefreshOrderPrincipleSummaryResponse = {
  title: string;
};

export type AnalysisCreateBody = {
  user_id: string;
  sector: string;
  stock_code: string | null;
};

export type AnalysisResultDto = {
  id: string;
  user_id: string;
  sector: string;
  stock_code: string | null;
  news_digest: string;
  financial_summary: string;
  investment_view: string;
  created_at: string;
};

export type ComplianceMonthDto = {
  year: number;
  month: number;
  total: number;
  violations: number;
  compliance_rate: number;
};

/** `GET /api/v1/reports/user/{user_id}/principle-stats` */
export type PrincipleStatMonthDto = {
  principle_id: string;
  violation_count: number;
  /** 모의 체결 시 '점검에서 제외된' 순위권 원칙(한 건당 1회) */
  practice_ok_count?: number;
  rank: number | null;
  text: string;
  category: string;
};

/** 백엔드 forum_topics.room_kind — 주문 전 원칙 점검 전용 방 */
export type ForumRoomKind = 'order_principle';

export type ForumTopicCreateBody = {
  user_id: string;
  title: string;
  content: string;
  sector_key?: string | null;
  stock_code?: string | null;
  room_kind?: ForumRoomKind | null;
};

export type ForumPostCreateBody = {
  user_id: string;
  content: string;
};

/** `GET /api/v1/forum/topics` — PaginatedResponse.data */
export type PaginatedForumTopics = {
  items: ForumTopicSummaryDto[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
};

/** `GET /api/v1/reports/monthly/...` — MonthlyReportOut */
export type MonthlyReportDto = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  coaching_text: string;
  strengths: string[];
  improvements: string[];
  principle_score: number | null;
  behavior_count: number;
  violation_count: number;
  created_at: string;
};

/** `GET|POST /api/v1/forum/topics/:id` — ForumTopicOut */
export type ForumTopicOutDto = {
  id: string;
  user_id: string;
  sector_key: string | null;
  stock_code: string | null;
  /** 구버전 API 응답에는 없을 수 있음 */
  room_kind?: ForumRoomKind | null;
  title: string;
  content: string;
  view_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
};

/** 목록 항목 — ForumTopicSummaryOut */
export type ForumTopicSummaryDto = {
  id: string;
  user_id: string;
  sector_key: string | null;
  stock_code: string | null;
  room_kind?: ForumRoomKind | null;
  title: string;
  view_count: number;
  post_count: number;
  created_at: string;
};

/** `GET|POST .../posts` — ForumPostOut */
export type ForumPostOutDto = {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

/** 주문 점검방 — 위반 후보 원칙(랭크). 서버가 기자·회계사 조력 여부를 판단한다. */
export type OrderPrincipleViolationRankItemDto = {
  default_rank: number;
  short_label?: string | null;
};

/** `POST .../agent-reply` */
export type AgentReplyBody = {
  user_message: string;
  agent_id?: 'owl' | 'turtle' | 'octopus' | null;
  stock_name?: string | null;
  order_principle_violations?: OrderPrincipleViolationRankItemDto[] | null;
};

export type AgentReplyDto = {
  agent_id: 'owl' | 'turtle' | 'octopus';
  agent_name: string;
  content: string;
  post: ForumPostOutDto;
  /** 주문 점검방: 키문이 이후 키엉이·키북이 조력 발언(순서대로) */
  extra_replies?: AgentReplyDto[];
  /** 점검방 키문이: 서버가 본문 뒤 블록에서 파싱한 후속 질문 3개 */
  order_cli_suggestions?: string[] | null;
};

export type OpenDebateBody = { stock_name?: string | null };
export type OpenDebateDto = { replies: AgentReplyDto[] };

export type NewsBulletDto = {
  text: string;
  stock_name: string;
  stock_code: string;
};

export type NewsBriefDto = {
  bullets: NewsBulletDto[];
  agent_name: string;
  agent_id: 'owl' | 'turtle' | 'octopus';
};

export type SurveySubmissionDto = {
  id: string;
  user_id: string;
  is_completed: boolean;
  completed_at?: string | null;
  score_breakdown?: { default_rank: number; score: number }[] | null;
};
