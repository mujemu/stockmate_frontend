/**
 * 원칙 숫자 파라미터 — Supabase `user_principle_params`가 우선이고, AsyncStorage는 보조·오프라인 캐시.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrincipleDefaultDto } from '../types/stockmateApiV1';
import { defaultParamsForRank } from './principleUiSpecs';

export const principlePrefsStorageKey = (userId: string) => `stockmate_principle_prefs_v1:${userId}`;

export function mergeParamsFromDisk(
  defaults: PrincipleDefaultDto[],
  parsed: unknown,
): Record<string, Record<string, number>> {
  const next: Record<string, Record<string, number>> = {};
  const stored =
    parsed && typeof parsed === 'object' && 'params' in (parsed as object)
      ? (parsed as { params?: Record<string, Record<string, number>> }).params
      : null;
  for (const d of defaults) {
    const base = defaultParamsForRank(d.default_rank);
    const fromDisk = stored?.[d.id];
    next[d.id] = { ...base, ...(fromDisk && typeof fromDisk === 'object' ? fromDisk : {}) };
  }
  return next;
}

/** 서버(Supabase) params가 있으면 해당 원칙에 우선 적용하고, 없는 항목은 디스크 값 유지. */
export function mergeServerParamsOverDisk(
  defaults: PrincipleDefaultDto[],
  diskParsed: unknown,
  serverParams: Record<string, Record<string, number>> | null | undefined,
): Record<string, Record<string, number>> {
  const merged = mergeParamsFromDisk(defaults, diskParsed);
  if (!serverParams) return merged;
  const next = { ...merged };
  for (const d of defaults) {
    const sp = serverParams[d.id];
    if (sp && typeof sp === 'object') {
      const base = defaultParamsForRank(d.default_rank);
      next[d.id] = { ...base, ...merged[d.id], ...sp };
    }
  }
  return next;
}

export async function loadPrincipleParamsMap(
  userId: string,
  defaults: PrincipleDefaultDto[],
  serverParams?: Record<string, Record<string, number>> | null,
): Promise<Record<string, Record<string, number>>> {
  const raw = await AsyncStorage.getItem(principlePrefsStorageKey(userId));
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      parsed = null;
    }
  }
  return mergeServerParamsOverDisk(defaults, parsed, serverParams);
}
