"use client";

import React from "react";
import Image from "next/image";
import { getSecondProductImage } from "../../lib/data/mockHardware";

interface ProductItemTileImageProps {
  item: {
    id?: string;
    name: string;
    category?: string;
    image: string;
    images?: string[];
  };
  sizes?: string;
  className?: string;
  alt?: string;
}

/**
 * Product tile image renderer supporting smooth crossfade on hover.
 * When hovered, the primary picture transitions smoothly into the second picture in the item gallery queue.
 */
export function ProductItemTileImage({
  item,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
  className = "object-cover group-hover:scale-105 transition-transform duration-300",
  alt,
}: ProductItemTileImageProps) {
  const imageAlt = alt || item.name;
  const secondImage = getSecondProductImage(item);

  return (
    <>
      <Image
        src={item.image}
        alt={imageAlt}
        fill
        sizes={sizes}
        className={className}
      />
      {secondImage && (
        <Image
          src={secondImage}
          alt={`${imageAlt} (secondary angle)`}
          fill
          sizes={sizes}
          className="object-cover opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none"
        />
      )}
    </>
  );
}
