import { Character, characterFromJson } from '../models/Character';
import { http } from './httpClient';
import { ensureStockmateUser } from './userSession';

export const ApiService = {
  async getCharacters(): Promise<Character[]> {
    const { data } = await http.get('/characters');
    return data.map(characterFromJson);
  },

  async searchCharacters(query: string): Promise<Character[]> {
    const { data } = await http.get('/characters/search', { params: { q: query } });
    return data.map(characterFromJson);
  },

  async registerCharacter(companyName: string, themeColor: string) {
    const { data } = await http.post('/characters/register', null, {
      params: { company_name: companyName, theme_color: themeColor },
    });
    return data;
  },

  async startSession(characterId: string, companyName: string) {
    const { id: userId } = await ensureStockmateUser();
    const { data } = await http.post('/sessions/start', {
      character_id: characterId,
      company_name: companyName,
      user_id: userId,
    });
    return data;
  },

  async chat(sessionId: string, message: string) {
    const { data } = await http.post(`/sessions/${sessionId}/chat`, {
      user_message: message,
    });
    return data;
  },

  async getSessions(companyName: string) {
    const { data } = await http.get('/sessions', { params: { company_name: companyName } });
    return data as any[];
  },

  async getReview(sessionId: string) {
    const { data } = await http.post(`/sessions/${sessionId}/review`);
    return data;
  },

  async getSuggestions(sessionId: string): Promise<string[]> {
    const { data } = await http.get(`/sessions/${sessionId}/suggestions`);
    return data.suggestions ?? [];
  },

  async getNews(characterId: string, display = 3, companyName = '') {
    const { data } = await http.get(`/news/naver/${characterId}`, {
      params: { display, company_name: companyName },
    });
    return (data.items ?? []) as any[];
  },

  async getNewsAnalyzed(characterId: string, excludeTitles: string[] = [], companyName = '') {
    const { data } = await http.post(`/news/naver/${characterId}/analyzed`, {
      exclude_titles: excludeTitles,
      company_name: companyName,
    });
    return data;
  },

  async getDisclosuresStructured(characterId: string, companyName = '', corpCode = '') {
    const { data } = await http.get(`/news/dart/${characterId}/explain-structured`, {
      params: { company_name: companyName, corp_code: corpCode },
    });
    return data;
  },

  async getAnalystReports(characterId: string, companyName = '') {
    const { data } = await http.get(`/news/analyst/${characterId}`, {
      params: { company_name: companyName },
    });
    return data;
  },

  async getStockInfo(characterId: string) {
    const { data } = await http.get(`/kiwoom/stock/${characterId}`);
    return data;
  },

  async placeOrder(params: {
    characterId: string;
    orderType: 'buy' | 'sell';
    quantity: number;
    price: number;
    marketOrder: boolean;
  }) {
    const { data } = await http.post('/kiwoom/order', {
      character_id: params.characterId,
      order_type: params.orderType,
      quantity: params.quantity,
      price: params.price,
      market_order: params.marketOrder,
    });
    return data;
  },
};
