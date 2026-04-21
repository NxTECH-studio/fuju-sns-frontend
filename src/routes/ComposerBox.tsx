import { useState } from "react";
import { useImages } from "../hooks/useImages";
import { useToast } from "../state/toastContext";
import { PostComposer } from "../ui/components/PostComposer";
import { ImageUploader } from "../ui/components/ImageUploader";

const MAX_ATTACHED_IMAGES = 4;

interface ComposerBoxProps {
  placeholder?: string;
  parentPostId?: string | null;
  onSubmit: (input: {
    content: string;
    imageIds?: string[];
    parentPostId?: string | null;
  }) => Promise<void>;
}

// Wraps PostComposer with image-attach behaviour. Keeps PostComposer UI
// pure (no fetch) by doing uploads here and passing IDs down as props.
export function ComposerBox({
  placeholder,
  parentPostId,
  onSubmit,
}: ComposerBoxProps) {
  const images = useImages();
  const toast = useToast();
  const [attached, setAttached] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handleSelectFile = async (file: File) => {
    if (busy) return;
    if (attached.length >= MAX_ATTACHED_IMAGES) {
      toast.show(`画像は最大 ${MAX_ATTACHED_IMAGES} 件まで`, "error");
      return;
    }
    setBusy(true);
    try {
      const vm = await images.upload(file);
      setAttached((prev) => [...prev, vm.id]);
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "アップロードに失敗しました",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const attachSlot = images.unavailable ? undefined : (
    <ImageUploader
      onSelect={(f) => void handleSelectFile(f)}
      disabled={busy || attached.length >= MAX_ATTACHED_IMAGES}
      label={busy ? "アップロード中..." : "画像を添付"}
    />
  );

  return (
    <PostComposer
      placeholder={placeholder}
      parentPostId={parentPostId}
      attachedImageIds={attached}
      attachSlot={attachSlot}
      onDetachImage={(id) =>
        setAttached((prev) => prev.filter((x) => x !== id))
      }
      onSubmit={async (input) => {
        if (busy) return;
        await onSubmit({
          ...input,
          imageIds: attached.length > 0 ? attached : undefined,
        });
        setAttached([]);
      }}
    />
  );
}
