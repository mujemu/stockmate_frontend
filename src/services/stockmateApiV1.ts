/**
 * Stockmate 백엔드 API v1 — 스펙과 경로를 1:1로 맞춤.
 * 화면에서는 이 모듈만 호출하고, BASE_URL은 src/config/api.ts 에서 설정.
 */
import { http, httpV1 } from './httpClient';
import type {
  AgentReplyBody,
  AgentReplyDto,
  NewsBriefDto,
  OpenDebateBody,
  OpenDebateDto,
  AnalysisCreateBody,
  AnalysisResultDto,
  BehaviorLogCreateBody,
  BehaviorLogCreateResponse,
  BehaviorLogDto,
  ViolationsRemainingBody,
  ViolationsRemainingResponse,
  ForumTopicTitlePatchBody,
  RefreshOrderPrincipleSummaryResponse,
  ComplianceMonthDto,
  CreateUserBody,
  ForumPostCreateBody,
  ForumPostOutDto,
  ForumTopicCreateBody,
  ForumTopicOutDto,
  MonthlyReportDto,
  SurveySubmissionDto,
  PatchBehaviorLogDecisionBody,
  PatchBehaviorLogStateBody,
  PatchUserSettingsBody,
  PrincipleDefaultDto,
  PrinciplesReorderBody,
  PrinciplesSetupBody,
  PrinciplesStatusDto,
  SectorDetailDto,
  SectorSummaryDto,
  SurveyQuestionDto,
  SurveyStatusDto,
  SurveySubmitBody,
  UserDto,
  PaginatedForumTopics,
} from '../types/stockmateApiV1';

const V = '/api/v1';

export type HealthCheckResult = { status: number; data: unknown };

export const StockmateApiV1 = {
  system: {
    /** 캐시·프록시 우회용 쿼리 포함. 2xx가 아니면 axios가 reject. */
    async health(): Promise<HealthCheckResult> {
      const res = await http.get<unknown>('/health', { params: { _t: Date.now() } });
      return { status: res.status, data: res.data };
    },
    async info(): Promise<unknown> {
      const { data } = await http.get('/info');
      return data;
    },
  },

  users: {
    async create(body: CreateUserBody): Promise<UserDto> {
      const { data } = await httpV1.post<UserDto>(`${V}/users`, body);
      return data;
    },
    async get(userId: string): Promise<UserDto> {
      const { data } = await httpV1.get<UserDto>(`${V}/users/${userId}`);
      return data;
    },
    async patchSettings(userId: string, body: PatchUserSettingsBody): Promise<UserDto> {
      const { data } = await httpV1.patch<UserDto>(`${V}/users/${userId}/settings`, body);
      return data;
    },
  },

  survey: {
    async getQuestions(): Promise<SurveyQuestionDto[]> {
      const { data } = await httpV1.get<SurveyQuestionDto[]>(`${V}/survey/questions`);
      return data;
    },
    async submit(body: SurveySubmitBody): Promise<SurveySubmissionDto> {
      const { data } = await httpV1.post<SurveySubmissionDto>(`${V}/survey/submit`, body);
      return data;
    },
    async getStatus(userId: string): Promise<SurveyStatusDto> {
      const { data } = await httpV1.get<SurveyStatusDto>(`${V}/survey/${userId}/status`);
      return data;
    },
    async getResult(userId: string): Promise<unknown> {
      const { data } = await httpV1.get(`${V}/survey/${userId}/result`);
      return data;
    },
  },

  principles: {
    async getDefaults(): Promise<PrincipleDefaultDto[]> {
      const { data } = await httpV1.get<PrincipleDefaultDto[]>(`${V}/principles/defaults`);
      return data;
    },
    async getStatus(userId: string): Promise<PrinciplesStatusDto> {
      const { data } = await httpV1.get<PrinciplesStatusDto>(`${V}/principles/${userId}/status`);
      return data;
    },
    async setup(userId: string, body: PrinciplesSetupBody): Promise<unknown> {
      const { data } = await httpV1.post(`${V}/principles/${userId}/setup`, body);
      return data;
    },
    async reorder(userId: string, body: PrinciplesReorderBody): Promise<unknown> {
      const { data } = await httpV1.patch(`${V}/principles/${userId}/reorder`, body);
      return data;
    },
    async reset(userId: string): Promise<unknown> {
      const { data } = await httpV1.post(`${V}/principles/${userId}/reset`);
      return data;
    },
  },

  sectors: {
    async list(): Promise<SectorSummaryDto[]> {
      const { data } = await httpV1.get<SectorSummaryDto[]>(`${V}/sectors`);
      return data;
    },
    async get(sectorKey: string): Promise<SectorDetailDto> {
      const encoded = encodeURIComponent(sectorKey);
      const { data } = await httpV1.get<SectorDetailDto>(`${V}/sectors/${encoded}`);
      return data;
    },
    async listCompanies(sectorKey: string): Promise<unknown> {
      const encoded = encodeURIComponent(sectorKey);
      const { data } = await httpV1.get(`${V}/sectors/${encoded}/companies`);
      return data;
    },
    async getContext(sectorKey: string, stockCode?: string): Promise<unknown> {
      const encoded = encodeURIComponent(sectorKey);
      const { data } = await httpV1.get(`${V}/sectors/${encoded}/context`, {
        params: stockCode ? { stock_code: stockCode } : undefined,
      });
      return data;
    },
    async getCompanyByStockCode(stockCode: string): Promise<unknown> {
      const { data } = await httpV1.get(`${V}/sectors/companies/${stockCode}`);
      return data;
    },
  },

  behaviorLogs: {
    async create(body: BehaviorLogCreateBody): Promise<BehaviorLogCreateResponse> {
      const { data } = await httpV1.post<BehaviorLogCreateResponse>(`${V}/behavior-logs`, body);
      return data;
    },
    async patchState(logId: string, body: PatchBehaviorLogStateBody): Promise<unknown> {
      const { data } = await httpV1.patch(`${V}/behavior-logs/${logId}/state`, body);
      return data;
    },
    async patchDecision(logId: string, body: PatchBehaviorLogDecisionBody): Promise<unknown> {
      const { data } = await httpV1.patch(`${V}/behavior-logs/${logId}/decision`, body);
      return data;
    },
    async listByUser(userId: string, limit?: number): Promise<BehaviorLogDto[]> {
      const { data } = await httpV1.get<BehaviorLogDto[]>(`${V}/behavior-logs/user/${userId}`, {
        params: limit != null ? { limit } : undefined,
      });
      return data;
    },
    async listViolationsByUser(userId: string): Promise<BehaviorLogDto[]> {
      const { data } = await httpV1.get<BehaviorLogDto[]>(
        `${V}/behavior-logs/user/${userId}/violations`
      );
      return data;
    },
    async violationsRemaining(
      logId: string,
      body: ViolationsRemainingBody,
    ): Promise<ViolationsRemainingResponse> {
      const { data } = await httpV1.post<ViolationsRemainingResponse>(
        `${V}/behavior-logs/${logId}/violations-remaining`,
        body,
      );
      return data;
    },
  },

  analysis: {
    async run(body: AnalysisCreateBody): Promise<AnalysisResultDto> {
      const { data } = await httpV1.post<AnalysisResultDto>(`${V}/analysis`, body);
      return data;
    },
    async listByUser(userId: string, limit?: number): Promise<AnalysisResultDto[]> {
      const { data } = await httpV1.get<AnalysisResultDto[]>(`${V}/analysis/user/${userId}`, {
        params: limit != null ? { limit } : undefined,
      });
      return data;
    },
    async getById(analysisId: string): Promise<AnalysisResultDto> {
      const { data } = await httpV1.get<AnalysisResultDto>(`${V}/analysis/${analysisId}`);
      return data;
    },
  },

  reports: {
    async generateMonthly(userId: string, year: number, month: number): Promise<unknown> {
      const { data } = await httpV1.post(`${V}/reports/monthly/${userId}/${year}/${month}`);
      return data;
    },
    async getMonthly(userId: string, year: number, month: number): Promise<MonthlyReportDto> {
      const { data } = await httpV1.get<MonthlyReportDto>(
        `${V}/reports/monthly/${userId}/${year}/${month}`
      );
      return data;
    },
    async getMonthlyGuide(userId: string, year: number, month: number): Promise<unknown> {
      const { data } = await httpV1.get(`${V}/reports/monthly/${userId}/${year}/${month}/guide`);
      return data;
    },
    async listByUser(userId: string): Promise<unknown> {
      const { data } = await httpV1.get(`${V}/reports/user/${userId}`);
      return data;
    },
    async getCompliance(
      userId: string,
      params: { start: string; end: string }
    ): Promise<ComplianceMonthDto[]> {
      const { data } = await httpV1.get<ComplianceMonthDto[]>(
        `${V}/reports/user/${userId}/compliance`,
        { params }
      );
      return data;
    },
    async getPrincipleStats(
      userId: string,
      params: { year: number; month: number }
    ): Promise<unknown> {
      const { data } = await httpV1.get(`${V}/reports/user/${userId}/principle-stats`, { params });
      return data;
    },
  },

  forum: {
    async listTopics(params?: {
      sector_key?: string;
      stock_code?: string;
      /** true면 stock_code 가 없는(순수 업종) 토론만 — 자산 탭 업종 공론장 */
      sector_room_only?: boolean;
      /** 예: order_principle — 주문 전 원칙 점검 전용 방만 */
      room_kind?: string;
      /** true이고 stock_code 있으면 room_kind 가 비어 있는 일반 종목방만 */
      default_stock_room_only?: boolean;
      user_id?: string;
      page?: number;
      page_size?: number;
    }): Promise<PaginatedForumTopics> {
      const { data } = await httpV1.get<PaginatedForumTopics>(`${V}/forum/topics`, { params });
      return data;
    },
    async createTopic(body: ForumTopicCreateBody): Promise<ForumTopicOutDto> {
      const { data } = await httpV1.post<ForumTopicOutDto>(`${V}/forum/topics`, body);
      return data;
    },
    async getTopic(topicId: string): Promise<ForumTopicOutDto> {
      const { data } = await httpV1.get<ForumTopicOutDto>(`${V}/forum/topics/${topicId}`);
      return data;
    },
    async patchTopicTitle(topicId: string, body: ForumTopicTitlePatchBody): Promise<ForumTopicOutDto> {
      const { data } = await httpV1.patch<ForumTopicOutDto>(
        `${V}/forum/topics/${topicId}/title`,
        body,
      );
      return data;
    },
    async refreshOrderPrincipleSummary(
      topicId: string,
      userId: string,
      stockName?: string | null,
    ): Promise<RefreshOrderPrincipleSummaryResponse> {
      const { data } = await httpV1.post<RefreshOrderPrincipleSummaryResponse>(
        `${V}/forum/topics/${topicId}/refresh-order-principle-summary`,
        {},
        { params: { user_id: userId, stock_name: stockName ?? undefined } },
      );
      return data;
    },
    async deleteTopic(topicId: string, userId: string): Promise<unknown> {
      const { data } = await httpV1.delete(`${V}/forum/topics/${topicId}`, {
        params: { user_id: userId },
      });
      return data;
    },
    async listPosts(topicId: string): Promise<ForumPostOutDto[]> {
      const { data } = await httpV1.get<ForumPostOutDto[]>(`${V}/forum/topics/${topicId}/posts`);
      return data;
    },
    async createPost(topicId: string, body: ForumPostCreateBody): Promise<ForumPostOutDto> {
      const { data } = await httpV1.post<ForumPostOutDto>(
        `${V}/forum/topics/${topicId}/posts`,
        body
      );
      return data;
    },
    async deletePost(postId: string, userId: string): Promise<unknown> {
      const { data } = await httpV1.delete(`${V}/forum/posts/${postId}`, {
        params: { user_id: userId },
      });
      return data;
    },
    async agentReply(topicId: string, body: AgentReplyBody): Promise<AgentReplyDto> {
      const { data } = await httpV1.post<AgentReplyDto>(
        `${V}/forum/topics/${topicId}/agent-reply`,
        body
      );
      return data;
    },
    async openDebate(topicId: string, body: OpenDebateBody): Promise<OpenDebateDto> {
      const { data } = await httpV1.post<OpenDebateDto>(
        `${V}/forum/topics/${topicId}/open-debate`,
        body
      );
      return data;
    },
  },

  news: {
    async brief(): Promise<NewsBriefDto> {
      const { data } = await httpV1.get<NewsBriefDto>(`${V}/news/brief`);
      return data;
    },
  },
};
