import Image, { type ImageProps } from "next/image";

type SmartImageProps = Omit<ImageProps, "src"> & {
  /** Local path, remote https URL, or nothing (renders a neutral placeholder). */
  src: ImageProps["src"] | null | undefined;
};

const isRemote = (src: SmartImageProps["src"]) => typeof src === "string" && /^https?:/i.test(src);

/**
 * next/image that never throws on product photography:
 * - remote URLs (admins can paste any https link and next.config has no
 *   `remotePatterns`) are served `unoptimized`;
 * - a missing src renders a quiet bone-coloured box instead of crashing.
 */
export default function SmartImage({ src, alt, unoptimized, ...rest }: SmartImageProps) {
  if (!src) {
    const { fill, width, height, className } = rest;
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`${fill ? "absolute inset-0" : "inline-block"} bg-bone ${className ?? ""}`}
        style={fill ? undefined : { width: typeof width === "number" ? `${width}px` : width, height: typeof height === "number" ? `${height}px` : height }}
      />
    );
  }
  return <Image src={src} alt={alt} unoptimized={unoptimized ?? isRemote(src)} {...rest} />;
}
