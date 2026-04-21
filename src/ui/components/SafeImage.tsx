import { useState, type ImgHTMLAttributes, type ReactNode } from "react";

interface SafeImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  src: string;
  alt: string;
  fallback?: ReactNode;
}

// <img> wrapper that swaps to a fallback when the remote URL fails to load.
// Unlike raw <img>, the browser's default broken-image icon never appears.
export function SafeImage({ fallback, ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback ?? null}</>;
  return <img {...rest} onError={() => setFailed(true)} />;
}
