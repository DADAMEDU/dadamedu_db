import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 배포/로컬 실행 시 .env 설정을 빠뜨리면 바로 알 수 있도록 명확히 에러를 낸다.
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
