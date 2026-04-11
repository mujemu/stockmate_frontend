import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import { useUserSession } from './UserSessionContext';

type PrinciplesSetupContextValue = {
  needsPrinciplesSetup: boolean;
  /** 원칙 저장 완료 등 이후 서버 상태를 다시 반영 */
  refreshNeedsPrinciplesSetup: () => Promise<void>;
};

const PrinciplesSetupContext = createContext<PrinciplesSetupContextValue | null>(null);

export function PrinciplesSetupProvider({
  needsPrinciplesSetup,
  setNeedsPrinciplesSetup,
  children,
}: {
  needsPrinciplesSetup: boolean;
  setNeedsPrinciplesSetup: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const { userId } = useUserSession();

  const refreshNeedsPrinciplesSetup = useCallback(async () => {
    if (!userId) {
      setNeedsPrinciplesSetup(false);
      return;
    }
    try {
      const ps = await StockmateApiV1.principles.getStatus(userId);
      setNeedsPrinciplesSetup(!ps.is_configured);
    } catch {
      setNeedsPrinciplesSetup(true);
    }
  }, [userId, setNeedsPrinciplesSetup]);

  const value = useMemo(
    () => ({ needsPrinciplesSetup, refreshNeedsPrinciplesSetup }),
    [needsPrinciplesSetup, refreshNeedsPrinciplesSetup],
  );

  return (
    <PrinciplesSetupContext.Provider value={value}>{children}</PrinciplesSetupContext.Provider>
  );
}

export function usePrinciplesSetup(): PrinciplesSetupContextValue {
  const ctx = useContext(PrinciplesSetupContext);
  if (!ctx) {
    return {
      needsPrinciplesSetup: false,
      refreshNeedsPrinciplesSetup: async () => {},
    };
  }
  return ctx;
}
