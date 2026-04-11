import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `stockmate_principle_violation_ledger_v1:${userId}`;

export type ViolationLedger = {
  /** 매매 직후 ‘원칙 위반’으로 집계한 누적 횟수 (주 5거래일 기준 설계와 맞춤) */
  globalStrikes: number;
  /** 원칙 라벨별 누적 */
  principleCounts: Record<string, number>;
  /**
   * 5회 도달 후 ‘수정 제안’ 흐름이면 true.
   * 이 상태에서 원칙 저장 시 −3 감면 없이 리셋(전면 수정으로 간주).
   */
  lockedNoDeduct3: boolean;
};

function defaultLedger(): ViolationLedger {
  return { globalStrikes: 0, principleCounts: {}, lockedNoDeduct3: false };
}

async function load(userId: string): Promise<ViolationLedger> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return defaultLedger();
  try {
    const p = JSON.parse(raw) as Partial<ViolationLedger>;
    return {
      globalStrikes: typeof p.globalStrikes === 'number' ? p.globalStrikes : 0,
      principleCounts:
        p.principleCounts && typeof p.principleCounts === 'object' ? p.principleCounts : {},
      lockedNoDeduct3: Boolean(p.lockedNoDeduct3),
    };
  } catch {
    return defaultLedger();
  }
}

async function save(userId: string, ledger: ViolationLedger) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(ledger));
}

/** 직후 화면 집계용 */
export async function readViolationLedger(userId: string): Promise<ViolationLedger> {
  return load(userId);
}

/**
 * 매매 직후 원칙 위반이 있을 때 1회 집계.
 * globalStrikes는 주문 1건당 +1, 라벨별로는 각 위반 항목 +1.
 * 5회 이상이면 lockedNoDeduct3 로 표시(이후 원칙 저장 시 −3 미적용).
 */
export async function recordPostTradeViolation(
  userId: string,
  violatedLabels: string[],
  opts?: { orderHadViolation?: boolean }
): Promise<ViolationLedger> {
  const trimmed = violatedLabels.map((s) => String(s).trim()).filter(Boolean);
  const hadViolation = Boolean(opts?.orderHadViolation) || trimmed.length > 0;
  if (!hadViolation) return load(userId);

  const ledger = await load(userId);
  ledger.globalStrikes += 1;
  const keys = trimmed.length > 0 ? trimmed : ['투자 원칙 위반(종합)'];
  for (const label of keys) {
    ledger.principleCounts[label] = (ledger.principleCounts[label] ?? 0) + 1;
  }
  if (ledger.globalStrikes >= 5) {
    ledger.lockedNoDeduct3 = true;
  }
  await save(userId, ledger);
  return ledger;
}

/**
 * 투자 원칙(리포트) 화면에서 저장했을 때.
 * −5회 제안 잠금 전: 누적 −3(최소 0).
 * 잠금(5회 제안) 후 저장: −3 없이 잠금 해제·카운트 초기화.
 */
export async function notifyPrinciplesSaved(userId: string): Promise<ViolationLedger> {
  const ledger = await load(userId);
  if (ledger.lockedNoDeduct3) {
    ledger.globalStrikes = 0;
    ledger.principleCounts = {};
    ledger.lockedNoDeduct3 = false;
  } else {
    ledger.globalStrikes = Math.max(0, ledger.globalStrikes - 3);
    if (ledger.globalStrikes === 0) {
      ledger.principleCounts = {};
    }
  }
  await save(userId, ledger);
  return ledger;
}
