import axios, { type AxiosError } from 'axios';
import { BASE_URL } from '../config/api';

/** 모든 API 호출은 이 인스턴스를 거치게 하면 베이스 URL·타임아웃·인터셉터를 한곳에서 관리할 수 있습니다. */
export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  headers: {
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  },
});

type ApiEnvelope = { success?: boolean; data?: unknown; error?: { message?: string } };

/**
 * FastAPI v1 라우터는 성공 시 `{ success, data, meta }` 래퍼를 씁니다.
 * 레거시 루트 경로(`/characters`, `/sessions` 등)는 그대로 `http`를 사용합니다.
 */
export const httpV1 = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
  headers: {
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  },
});

httpV1.interceptors.response.use(
  (res) => {
    const p = res.data as ApiEnvelope;
    if (p && typeof p === 'object' && p.success === true && 'data' in p) {
      res.data = p.data as unknown;
    }
    return res;
  },
  (err: AxiosError<ApiEnvelope>) => {
    const d = err.response?.data;
    if (d && typeof d === 'object' && d.success === false && d.error?.message) {
      return Promise.reject(new Error(d.error.message));
    }
    return Promise.reject(err);
  }
);
