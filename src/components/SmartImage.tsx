import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Images uploaded to the site (/uploads/...) go through Next's image optimizer:
 * AVIF/WebP, resized to the size each screen needs, cached for a year.
 * Images from other websites are shown as-is (the optimizer is not opened to
 * any outside address, so it cannot be abused).
 */
type Props = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  /** The main image of the page (Largest Contentful Paint): loads first, no lazy loading. */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

const optimizable = (src: string) => src.startsWith("/") && !src.startsWith("//") && !/\.svg($|\?)/i.test(src);

export function SmartImage({ src, alt, width, height, fill, sizes, priority, className, style }: Props) {
  if (optimizable(src)) {
    return fill ? (
      <Image src={src} alt={alt} fill sizes={sizes ?? "100vw"} priority={priority} className={className} style={style} />
    ) : (
      <Image src={src} alt={alt} width={width ?? 400} height={height ?? 400} sizes={sizes} priority={priority} className={className} style={style} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style } : style}
    />
  );
}
