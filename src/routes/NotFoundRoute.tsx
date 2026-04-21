import { useNavigate } from "react-router";
import { Button } from "../ui/primitives/Button";
import { EmptyState } from "../ui/components/EmptyState";

export function NotFoundRoute() {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="404 - ページが見つかりません"
      description="URL を確認してください。"
      action={
        <Button variant="primary" onClick={() => navigate("/")}>
          Home に戻る
        </Button>
      }
    />
  );
}
