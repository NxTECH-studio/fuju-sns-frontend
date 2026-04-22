import { useRef, useState } from "react";
import { Button } from "../primitives/Button";

interface ImageUploaderProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
  label?: string;
}

export function ImageUploader({
  onSelect,
  disabled,
  label,
}: ImageUploaderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setName(file.name);
            onSelect(file);
            e.target.value = "";
          }
        }}
      />
      <Button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={disabled}
      >
        {label ?? "画像を選択"}
      </Button>
      {name ? (
        <span style={{ fontSize: 12, color: "var(--text)" }}>{name}</span>
      ) : null}
    </div>
  );
}
