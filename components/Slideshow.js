"use client"
import React, { useEffect, useState } from "react";

export default function Slideshow({ images }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [images.length]);

  const previous = () => {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  const next = () => {
    setIndex((i) => (i + 1) % images.length);
  };

  return (
    <div className="relative w-full max-w-4xl  flex items-center justify-center mx-auto h-40 md:h-52 lg:h-60 rounded-xl overflow-hidden shadow-lg">
      {/* Image */}
      <img
        src={images[index]}
        alt="Slideshow"
        className=" h-full object-contain transition-opacity duration-700 ease-in-out"
        // className="h-full object-contain"
      />

      {/* Previous Button */}
      <button
        onClick={previous}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white px-4 py-3 rounded-full"
      >
        ❮
      </button>

      {/* Next Button */}
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white px-4 py-3 rounded-full"
      >
        ❯
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 md:w-4 md:h-4 rounded-full border transition-all duration-300 ${
              i === index
                ? "bg-white border-white scale-110"
                : "bg-white/40 border-white/60 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
