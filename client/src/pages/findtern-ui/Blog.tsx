import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import useReveal from '../../hooks/useReveal.ts';

export default function Blog() {
  useReveal();

  type CmsBlogPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    publishedAt: string | null;
  };

  const [posts, setPosts] = useState<CmsBlogPost[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website/blogs', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setPosts(Array.isArray(json?.posts) ? json.posts : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo(() => {
    return Array.isArray(posts) ? posts : [];
  }, [posts]);

  return (
    <div className="blog-page-v2">
      <section className="blog-hero-v2">
        <div className="blog-hero-v2__bg" aria-hidden="true"></div>
        <div className="container about-hero-v2__inner">
          <div className="about-hero-v2__content reveal reveal--up is-visible">
            <h1>Blogs</h1>
            <p>Insights, tips, and updates from Findtern.</p>
          </div>
          
        </div>
      </section>


      <section className="blog-grid-v2 reveal reveal--up">
        <div className="container">
          {merged.length === 0 ? (
            <div className="text-center text-slate-600 py-10">No blogs yet.</div>
          ) : (
            <div className="blog-grid-v2__grid">
              {merged.map((p: any) => (
                <article key={p.slug} className="blog-card-v2 tilt-3d">
                  <div className="blog-card-v2__img">
                    <img src={p.coverImageUrl || ''} alt="" loading="lazy" />
                  </div>
                  <h3 className="blog-card-v2__title">{p.title}</h3>
                  <p className="blog-card-v2__excerpt">{p.excerpt || ''}</p>
                  <Link className="blog-card-v2__btn" href={`/blog/${p.slug}`} aria-label="Read more">
                    Read More
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
