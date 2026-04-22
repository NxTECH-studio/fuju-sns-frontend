import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";

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
  // Reset the failure state when the source changes so a new URL gets a
  // real attempt instead of showing the previous failure's fallback.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false);
  }, [rest.src]);
  if (failed) return <>{fallback ?? null}</>;
  return <img {...rest} onError={() => setFailed(true)} />;
}
