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

  const [following, setFollowing] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 早期リターン: 未認証 / target 未指定 / 自分自身。
    if (!targetSub || !meSub || targetSub === meSub) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFollowing(false);
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();

    setLoading(true);
    setFollowing(null);

    (async () => {
      try {
        let cursor: string | undefined = undefined;
        let found = false;
        // 上限ページは設けない (自分のフォロー数なので無制限で問題ない想定)。
        // 必要になったら別 PR で limit 引き上げ or キャッシュ化を検討。
        for (;;) {
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
          if (!res.next_cursor) break;
          cursor = res.next_cursor;
        }
        if (ctrl.signal.aborted) return;
        setFollowing(found);
        setLoading(false);
      } catch (e) {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        // プロフィール表示の阻害を避けるため、エラー時は false に倒す。
        // Toast は出さない (フォロー操作時のエラーは別途 useFollowToggle で出る)。
        console.error("useFollowState: failed to resolve following state", e);
        setFollowing(false);
        setLoading(false);
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [client, meSub, targetSub]);

  return { following, loading, setFollowing };
}
