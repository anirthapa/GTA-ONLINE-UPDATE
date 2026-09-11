"use client";
import { useState } from "react";
import { MediaImage } from "./media-image";

export function VehicleGallery({
  name,
  image,
  gallery,
  vehicleClass,
  discount,
}: {
  name: string;
  image: string | null;
  gallery?: string[];
  vehicleClass: string;
  discount?: number | null;
}) {
  const images = [
    ...new Set(
      [image, ...(gallery || [])].filter((v): v is string => Boolean(v)),
    ),
  ].slice(0, 4);
  const [selected, setSelected] = useState(0);
  return (
    <div className="vehicle-gallery">
      <div className="vehicle-showcase-image">
        <MediaImage
          key={images[selected]}
          src={images[selected] || null}
          alt={`${name} — view ${selected + 1}`}
          priority
          sizes="(max-width:760px) 100vw, 60vw"
        />
        <span className="ride-class">{vehicleClass}</span>
        {discount != null && (
          <span className="offer-chip">{discount}% OFF THIS WEEK</span>
        )}
      </div>
      {images.length > 1 && (
        <div
          className="gallery-thumbnails"
          role="group"
          aria-label={`${name} photos`}
        >
          {images.map((src, i) => (
            <button
              key={src}
              aria-label={`Show ${name} photo ${i + 1}`}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            >
              <MediaImage src={src} alt="" sizes="180px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
