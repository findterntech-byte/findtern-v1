import React from "react";

type Props = {
  imageUrl: string;
  alt?: string;
  ariaLabel?: string;
  className?: string;
};

export function HeroBannerImageOnly({
  imageUrl,
  ariaLabel = "Hero banner",
  className,
}: Props) {
  const classes = ["hero-banner-v1", "hero-banner-v1--imageOnly", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-label={ariaLabel}>
      <div
        className="hero-banner-v1__bgSlide"
        style={{ backgroundImage: `url(${imageUrl})` }}
        aria-hidden="true"
      />
    </section>
  );
}
