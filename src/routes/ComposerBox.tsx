import { useState } from 'react';
import { useImages } from '../hooks/useImages';
import { useToast } from '../state/toastContext';
import { PostComposer } from '../ui/components/PostComposer';

interface ComposerBoxProps {
  placeholder?: string;
  parentPostId?: string | null;
  onSubmit: (input: {
    content: string;
    imageIds?: string[];
    parentPostId?: string | null;
  }) => Promise<void>;
}

// Wraps PostComposer with image-attach behaviour. Keeps PostComposer UI pure
// (no fetch) by doing uploads here and passing IDs down as props.
export function ComposerBox({ placeholder, parentPostId, onSubmit }: ComposerBoxProps) {
  const images = useImages();
  const toast = useToast();
  const [attached, setAttached] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handleAttach = async () => {
    if (images.unavailable) {
      toast.show('画像機能は現在無効です', 'error');
      return;
    }
    if (attached.length >= 4) {
      toast.show('画像は最大 4 件まで', 'error');
      return;
    }
    pickAndUpload();
  };

  const pickAndUpload = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const vm = await images.upload(file);
        setAttached((prev) => [...prev, vm.id]);
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'アップロードに失敗しました', 'error');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const handleSubmit = async (input: {
    content: string;
    imageIds?: string[];
    parentPostId?: string | null;
  }) => {
    await onSubmit(input);
    setAttached([]);
  };

  return (
    <PostComposer
      placeholder={placeholder}
      parentPostId={parentPostId}
      attachedImageIds={attached}
      onAttachImage={images.unavailable ? undefined : () => void handleAttach()}
      onDetachImage={(id) => setAttached((prev) => prev.filter((x) => x !== id))}
      onSubmit={async (input) => {
        if (busy) return;
        await handleSubmit({
          ...input,
          imageIds: attached.length > 0 ? attached : undefined,
        });
      }}
    />
  );
}

