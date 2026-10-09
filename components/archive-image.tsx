/* Local archive photos are blob URLs, which the image optimizer cannot fetch. */
/* eslint-disable @next/next/no-img-element */

import type { ImgHTMLAttributes } from "react";

export function ArchiveImage({ alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt={alt} {...props} />;
}
