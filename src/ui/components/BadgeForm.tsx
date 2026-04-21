import { useState, type FormEvent } from "react";
import type { BadgeVM } from "../../services/vm";
import { Button } from "../primitives/Button";
import { TextInput } from "../primitives/TextInput";
import { TextArea } from "../primitives/TextArea";

export interface BadgeFormValues {
  key: string;
  label: string;
  description: string;
  iconUrl: string;
  color: string;
  priority: number;
}

interface BadgeFormProps {
  initial?: Partial<BadgeVM>;
  submitLabel?: string;
  requireKey?: boolean;
  onSubmit: (values: BadgeFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function BadgeForm({
  initial,
  submitLabel = "作成",
  requireKey = true,
  onSubmit,
  onCancel,
}: BadgeFormProps) {
  const [values, setValues] = useState<BadgeFormValues>({
    key: initial?.key ?? "",
    label: initial?.label ?? "",
    description: initial?.description ?? "",
    iconUrl: initial?.iconUrl ?? "",
    color: initial?.color ?? "blue",
    priority: initial?.priority ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handle}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {requireKey ? (
        <TextInput
          label="key (不変)"
          value={values.key}
          onChange={(e) => setValues((v) => ({ ...v, key: e.target.value }))}
          required
          maxLength={64}
        />
      ) : null}
      <TextInput
        label="label"
        value={values.label}
        onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
        required
        maxLength={64}
      />
      <TextArea
        label="description"
        value={values.description}
        onChange={(e) =>
          setValues((v) => ({ ...v, description: e.target.value }))
        }
        rows={2}
      />
      <TextInput
        label="icon URL"
        value={values.iconUrl}
        onChange={(e) => setValues((v) => ({ ...v, iconUrl: e.target.value }))}
        maxLength={1024}
      />
      <TextInput
        label="color (e.g. blue, gold)"
        value={values.color}
        onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}
        required
        maxLength={16}
      />
      <TextInput
        label="priority"
        type="number"
        min={0}
        value={values.priority}
        onChange={(e) =>
          setValues((v) => ({
            ...v,
            priority: Math.max(0, Number(e.target.value) || 0),
          }))
        }
      />
      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 12 }}>{error}</p>
      ) : null}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            キャンセル
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "送信中..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
