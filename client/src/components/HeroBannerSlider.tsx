import React from "react";

type Props = {
  images: string[];
  fallbackImage?: string;
  intervalMs?: number;
  ariaLabel?: string;
  className?: string;
  showControls?: boolean;
};

export function HeroBannerSlider({
  images,
  fallbackImage,
  intervalMs = 4500,
  ariaLabel = "Hero banner",
  className,
  showControls = true,
}: Props) {
  const slides = React.useMemo(() => {
    const cleaned = (images || []).map((x) => x?.trim()).filter(Boolean) as string[];
    if (cleaned.length) return cleaned;
    return fallbackImage ? [fallbackImage] : [];
  }, [images, fallbackImage]);

  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  React.useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs]);

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  const classes = ["hero-banner-v1", "hero-banner-v1--slider", className]
    .filter(Boolean)
    .join(" ");

  if (!slides.length) return null;

  return (
    <section className={classes} aria-label={ariaLabel}>
      <div className="hero-banner-v1__slide" aria-hidden="true">
        <img
          className="hero-banner-v1__img hero-banner-v1__img--auto"
          src={slides[index]}
          alt=""
          loading="eager"
          decoding="async"
        />
      </div>

      {showControls && slides.length > 1 ? (
        <>
          <button
            type="button"
            className="hero-banner-v1__nav hero-banner-v1__nav--prev"
            onClick={prev}
            aria-label="Previous banner"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="hero-banner-v1__nav hero-banner-v1__nav--next"
            onClick={next}
            aria-label="Next banner"
          >
            <span aria-hidden="true">›</span>
          </button>

          <div className="hero-banner-v1__dots" aria-label="Banner dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={
                  i === index
                    ? "hero-banner-v1__dot hero-banner-v1__dot--active"
                    : "hero-banner-v1__dot"
                }
                onClick={() => setIndex(i)}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
