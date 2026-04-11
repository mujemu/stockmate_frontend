/**
 * 뉴스 알림 컨텍스트
 *
 * - interval: 알림 주기 (분 단위, 0 = 끄기)
 * - 타이머가 만료되면 백엔드에서 뉴스 브리프를 가져와 모달로 표시
 * - 어느 탭에 있든 앱 최상단에서 슬라이드 다운 모달이 나타남
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StockmateApiV1 } from '../services/stockmateApiV1';
import type { NewsBriefDto } from '../types/stockmateApiV1';

export type NewsInterval = 0 | 1 | 15 | 30 | 60 | 120; // 0 = 끄기, 1 = 테스트용

interface NewsAlertState {
  interval: NewsInterval;
  setInterval: (v: NewsInterval) => void;
  brief: NewsBriefDto | null;
  visible: boolean;
  dismiss: () => void;
  fetchNow: () => Promise<void>;
}

const NewsAlertContext = createContext<NewsAlertState>({
  interval: 0,
  setInterval: () => {},
  brief: null,
  visible: false,
  dismiss: () => {},
  fetchNow: async () => {},
});

const STORAGE_KEY = 'news_alert_interval';

export function NewsAlertProvider({ children }: { children: React.ReactNode }) {
  const [interval, setIntervalState] = useState<NewsInterval>(0);
  const [brief, setBrief] = useState<NewsBriefDto | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 저장된 설정 불러오기
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setIntervalState(Number(val) as NewsInterval);
    });
  }, []);

  const fetchNow = useCallback(async () => {
    try {
      const data = await StockmateApiV1.news.brief();
      setBrief(data);
      setVisible(true);
    } catch {
      // 네트워크 오류 등 조용히 무시
    }
  }, []);

  const setInterval = useCallback((v: NewsInterval) => {
    setIntervalState(v);
    AsyncStorage.setItem(STORAGE_KEY, String(v));
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  // 타이머 설정
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (interval === 0) return;

    const ms = interval * 60 * 1000;
    const schedule = () => {
      timerRef.current = setTimeout(async () => {
        await fetchNow();
        schedule(); // 반복
      }, ms);
    };
    schedule();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [interval, fetchNow]);

  return (
    <NewsAlertContext.Provider value={{ interval, setInterval, brief, visible, dismiss, fetchNow }}>
      {children}
    </NewsAlertContext.Provider>
  );
}

export function useNewsAlert() {
  return useContext(NewsAlertContext);
}