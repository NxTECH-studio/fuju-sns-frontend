import { Button } from "../primitives/Button";

interface PagerProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export function Pager({ hasMore, loading, onLoadMore }: PagerProps) {
  if (!hasMore) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
      <Button onClick={onLoadMore} disabled={loading}>
        {loading ? "読み込み中..." : "もっと見る"}
      </Button>
    </div>
  );
}
