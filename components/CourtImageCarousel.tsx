"use client";

import { useMemo, useState } from "react";
import type { CourtImage } from "@/lib/supabase.types";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinaryUrl";

type CourtImageCarouselProps = {
  images: CourtImage[];
  title: string;
};

export default function CourtImageCarousel({ images, title }: CourtImageCarouselProps) {
  const sortedImages = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = sortedImages[activeIndex];

  if (sortedImages.length === 0 || !activeImage) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-parchment bg-ivory text-sm font-bold text-muted">
        {title}
      </div>
    );
  }

  const activeUrl = getOptimizedCloudinaryUrl(activeImage.publicId, { width: 1200 });

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-parchment bg-ivory">
        <img
          src={activeUrl}
          srcSet={[
            `${getOptimizedCloudinaryUrl(activeImage.publicId, { width: 480 })} 480w`,
            `${getOptimizedCloudinaryUrl(activeImage.publicId, { width: 960 })} 960w`,
            `${getOptimizedCloudinaryUrl(activeImage.publicId, { width: 1600 })} 1600w`,
          ].join(", ")}
          sizes="(max-width: 768px) 100vw, 640px"
          alt={activeImage.caption || title}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      {sortedImages.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {sortedImages.map((image, index) => (
            <button
              key={`${image.publicId}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border ${
                activeIndex === index ? "border-clay" : "border-parchment"
              }`}
            >
              <img
                src={getOptimizedCloudinaryUrl(image.publicId, { width: 160 })}
                alt={image.caption || `${title} 圖片 ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
