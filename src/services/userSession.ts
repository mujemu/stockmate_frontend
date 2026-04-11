import AsyncStorage from '@react-native-async-storage/async-storage';
import { StockmateApiV1 } from './stockmateApiV1';

const KEY_ID = '@stockmate/v1_user_id';
const KEY_EMAIL = '@stockmate/v1_user_email';

/**
 * AsyncStorage에 user id가 없으면 `POST /api/v1/users`로 get-or-create 후 저장합니다.
 * v1 API·행동 로그·리포트 등에 동일 id를 씁니다.
 */
export async function ensureStockmateUser(): Promise<{ id: string; email: string }> {
  const [id, email] = await Promise.all([
    AsyncStorage.getItem(KEY_ID),
    AsyncStorage.getItem(KEY_EMAIL),
  ]);
  if (id && email) {
    return { id, email };
  }
  const anonEmail =
    email ||
    `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@anonymous.stockmate`;
  const user = await StockmateApiV1.users.create({ email: anonEmail });
  await AsyncStorage.multiSet([
    [KEY_ID, user.id],
    [KEY_EMAIL, user.email],
  ]);
  return { id: user.id, email: user.email };
}

export async function clearStockmateUser(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_ID, KEY_EMAIL]);
}
