"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A muted, looping, autoplaying video that downloads only when it is about to scroll into view.
 * A plain autoplay video starts fetching immediately, which on the home page meant several MB for
 * a section most visitors never reach. Until then only the small poster image is loaded.
 */
export default function LazyAutoplayVideo({
  src,
  poster,
  className,
  ariaLabel,
}: {
  src: string;
  poster: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  // Start loading when the video is within ~one screen of the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Once the source is attached, load and play (autoplay is allowed: muted + playsInline).
  useEffect(() => {
    const el = ref.current;
    if (!near || !el) return;
    el.load();
    el.play().catch(() => { /* blocked autoplay: the poster stays, controls are not needed */ });
  }, [near]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-label={ariaLabel}
      className={className}
    >
      {near && <source src={src} type="video/mp4" />}
    </video>
  );
}
