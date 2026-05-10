import { useEffect, useState } from "react";
import { listFollowing } from "../api/endpoints/follows";
import { isAbortError } from "../api/error";
import { useFujuClient } from "./useFujuClient";
import { useMeReady } from "./useMeReady";

export interface FollowStateResult {
  // null = まだ判定中。確定後は true / false。
  following: boolean | null;
  loading: boolean;
  // 楽観反映時の書き戻し用 setter (FollowControl 経由で useFollowToggle と連結)。
  setFollowing: (next: boolean) => void;
}

// 同じ viewer から同じ target を短時間に複数回問い合わせる
// (プロフィール画面の遷移を繰り返す等) ケースのため、簡易キャッシュを置く。
// 楽観反映 (setFollowing) でも書き戻すので、トグル直後の再訪でも整合する。
type CacheKey = string;
const cacheKey = (meSub: string, targetSub: string): CacheKey =>
  `${meSub}::${targetSub}`;
const followCache = new Map<CacheKey, boolean>();

// 万一 backend が next_cursor を進めない不具合を起こしても無限ループしないよう
// 守りで上限を設ける。limit=50 × MAX_PAGES = 1000 件まで走査するイメージで、
// これ以上のフォロー数ならどのみち別アプローチ (backend に is_following) が必要。
const MAX_PAGES = 20;

// Swagger の GET /users/{sub} が is_following を返さないため、自分の following
// リストから target を線形探索することでフォロー済みか判定する。
// 自分のフォロー数の方が一般に少なく軽い (ヒットすれば早期終了)。
// limit=50 で開始し next_cursor を辿って全件走査する (現実的に数ページで終わる)。
export function useFollowState(
  targetSub: string | undefined
): FollowStateResult {
  const client = useFujuClient();
  const me = useMeReady();
  const meSub = me?.sub ?? null;

  const cached =
    targetSub && meSub && targetSub !== meSub
      ? followCache.get(cacheKey(meSub, targetSub)) ?? null
      : null;

  const [following, setFollowingState] = useState<boolean | null>(cached);
  const [loading, setLoading] = useState<boolean>(cached === null);

  // キャッシュにも書き戻すラッパー。useFollowToggle 経由の楽観反映でも
  // 次回以降の同 viewer × target の判定が即時化される。
  const setFollowing = (next: boolean) => {
    setFollowingState(next);
    if (targetSub && meSub && targetSub !== meSub) {
      followCache.set(cacheKey(meSub, targetSub), next);
    }
  };

  useEffect(() => {
    // 早期リターン: 未認証 / target 未指定 / 自分自身。
    if (!targetSub || !meSub || targetSub === meSub) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFollowingState(false);
      setLoading(false);
      return;
    }

    // キャッシュヒット時は再走査しない (派生状態は初期化時に取り込み済み)。
    if (followCache.has(cacheKey(meSub, targetSub))) {
      return;
    }

    const ctrl = new AbortController();

    setLoading(true);
    setFollowingState(null);

    (async () => {
      try {
        let cursor: string | undefined = undefined;
        let found = false;
        let pages = 0;
        for (;;) {
          if (ctrl.signal.aborted) return;
          const res = await listFollowing(
            client,
            meSub,
            { cursor, limit: 50 },
            ctrl.signal
          );
          if (ctrl.signal.aborted) return;
          if (res.data.some((u) => u.sub === targetSub)) {
            found = true;
            break;
          }
          pages += 1;
          // ページが進まない / 無限に続くケースのガード。
          if (!res.next_cursor || res.next_cursor === cursor) break;
          if (pages >= MAX_PAGES) {
            // 上限に達したら未フォロー扱い。本格的なケースは別 PR で
            // backend に is_following を返してもらうのが筋。
            console.warn(
              "useFollowState: MAX_PAGES reached without finding target",
              { meSub, targetSub, pages }
            );
            break;
          }
          cursor = res.next_cursor;
        }
        if (ctrl.signal.aborted) return;
        followCache.set(cacheKey(meSub, targetSub), found);
        setFollowingState(found);
        setLoading(false);
      } catch (e) {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        // プロフィール表示の阻害を避けるため、エラー時は false に倒す。
        // Toast は出さない (フォロー操作時のエラーは別途 useFollowToggle で出る)。
        // キャッシュには載せない (一過性のエラーである可能性が高いため)。
        console.error("useFollowState: failed to resolve following state", e);
        setFollowingState(false);
        setLoading(false);
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [client, meSub, targetSub]);

  return { following, loading, setFollowing };
}
