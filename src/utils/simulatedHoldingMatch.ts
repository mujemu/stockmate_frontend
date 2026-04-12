import type { SimulatedHoldingDto } from '../types/stockmateApiV1';

/** 코드가 있으면 코드 우선, 없으면 종목명으로 매칭 */
export function findSimulatedHolding(
  rows: SimulatedHoldingDto[],
  stockName: string,
  stockCode?: string | null,
): SimulatedHoldingDto | null {
  const code = (stockCode ?? '').trim();
  if (code) {
    const byCode = rows.find((h) => (h.stock_code ?? '').trim() === code);
    if (byCode) return byCode;
  }
  const name = (stockName ?? '').trim();
  if (!name) return null;
  return rows.find((h) => h.stock_name.trim() === name) ?? null;
}
