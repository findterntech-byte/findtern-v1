import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Copy, Share2 } from 'lucide-react';
import './BlogDetail.css';

export default function BlogDetail({ params }: { params?: { slug?: string } }) {
  const slug = params?.slug;

  const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

  const sanitizeHtml = (html: string) => {
    let out = String(html ?? '');
    out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    out = out.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
    out = out.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
    out = out.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
    out = out.replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"');
    out = out.replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'");
    return out;
  };

  const stripHtml = (html: string) => String(html ?? '').replace(/<[^>]+>/g, ' ');
  type BlogPost = {
    slug: string;
    title: string;
    excerpt: string;
    img: string;
    date: string;
    author: string;
    body: string[];
  };
  type CmsBlogPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImageUrl: string | null;
    bannerImageUrl: string | null;
    body: string;
    publishedAt: string | null;
  };

  const [cmsPost, setCmsPost] = useState<CmsBlogPost | null>(null);
  const [cmsList, setCmsList] = useState<CmsBlogPost[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      try {
        const res = await fetch(`/api/website/blogs/${encodeURIComponent(slug)}`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCmsPost(json?.post ?? null);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/website/blogs', { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setCmsList(Array.isArray(json?.posts) ? json.posts : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const post: BlogPost | undefined = useMemo(() => {
    if (!cmsPost) return undefined;

    const bodyRaw = String(cmsPost.body ?? '');
    const isHtml = looksLikeHtml(bodyRaw);
    const bodyParts = isHtml
      ? [bodyRaw]
      : bodyRaw
          .split(/\n\n+/)
          .map((s) => s.trim())
          .filter(Boolean);

    return {
      slug: cmsPost.slug,
      title: cmsPost.title,
      excerpt: cmsPost.excerpt || '',
      img: cmsPost.bannerImageUrl || cmsPost.coverImageUrl || '',
      date: cmsPost.publishedAt ? new Date(cmsPost.publishedAt).toLocaleDateString() : '',
      author: 'Findtern',
      body: bodyParts.length ? bodyParts : [bodyRaw],
    };
  }, [cmsPost, slug]);

  const postBodyIsHtml = useMemo(() => {
    if (!cmsPost) return false;
    return looksLikeHtml(String(cmsPost.body ?? ''));
  }, [cmsPost]);

  const related: BlogPost[] = useMemo(() => {
    if (cmsList && cmsList.length) {
      return cmsList
        .filter((p: any) => p?.slug && p.slug !== slug)
        .slice(0, 3)
        .map((p: any) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt || '',
          img: p.coverImageUrl || '',
          date: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '',
          author: 'Findtern',
          body: [],
        }));
    }
    return [];
  }, [cmsList, slug]);

  const calcReadingTime = (p: BlogPost) => {
    const bodyText = (p.body || []).map((x) => stripHtml(String(x))).join(' ');
    const words = [p.title, p.excerpt, bodyText]
      .join(' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 200));
    return { words, minutes };
  };

  const getNavPosts = (currentSlug?: string) => {
    const list = Array.isArray(cmsList) ? cmsList : [];
    const idx = list.findIndex((p: any) => String(p?.slug ?? '') === String(currentSlug ?? ''));
    if (idx < 0) return { prev: null, next: null };
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx < list.length - 1 ? list[idx + 1] : null;
    const toMini = (p: any): BlogPost | null => {
      if (!p) return null;
      return {
        slug: String(p.slug ?? ''),
        title: String(p.title ?? ''),
        excerpt: String(p.excerpt ?? ''),
        img: String(p.coverImageUrl ?? ''),
        date: p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '',
        author: 'Findtern',
        body: [],
      };
    };
    return { prev: toMini(prev), next: toMini(next) };
  };

  if (!post) {
    return (
      <div className="blog-detail-pro">
        <section className="blog-detail-pro__hero">
          <div className="container">
            <div className="blog-detail-pro__breadcrumbs">
              <Link href="/blog">Blogs</Link>
              <span aria-hidden="true">/</span>
              <span>Not found</span>
            </div>
            <h1 className="blog-detail-pro__title">Blog</h1>
          </div>
        </section>

        <section className="blog-detail-pro__body">
          <div className="container">
            <div className="blog-detail-pro__layout">
              <article className="blog-detail-pro__article">
                <p className="blog-detail-pro__excerpt">The blog post you’re looking for doesn’t exist.</p>
                <Link href="/blog" className="blog-detail-pro__btn blog-detail-pro__btnPrimary">Back to Blogs</Link>
              </article>

              <aside className="blog-detail-pro__aside">
                <div className="blog-detail-pro__card">
                  <div className="blog-detail-pro__cardHead">
                    <div className="blog-detail-pro__cardTitle">Related Blogs</div>
                  </div>
                  <div className="blog-detail-pro__related">
                    {related.map((p) => (
                      <Link key={p.slug} className="blog-detail-pro__relatedItem" href={`/blog/${p.slug}`}>
                        <div className="blog-detail-pro__thumb">
                          <img src={p.img} alt="" loading="lazy" decoding="async" />
                        </div>
                        <div>
                          <div className="blog-detail-pro__relatedTitle">{p.title}</div>
                          <div className="blog-detail-pro__relatedMeta">{p.date}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const { minutes } = calcReadingTime(post);
  const { prev, next } = getNavPosts(slug);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const onCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  const onShare = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: shareUrl,
        });
        return;
      }
      await onCopyLink();
    } catch {
      // ignore
    }
  };

  return (
    <div className="blog-detail-pro">
      <section className="blog-detail-pro__hero">
        <div className="container">
          <div className="blog-detail-pro__breadcrumbs">
            <Link href="/blog">Blogs</Link>
            <span aria-hidden="true">/</span>
            <span>{post.title}</span>
          </div>

          <div className="blog-detail-pro__tag">Blog</div>
          <h1 className="blog-detail-pro__title">{post.title}</h1>
          <div className="blog-detail-pro__meta">
            <span>{post.date}</span>
            <span className="blog-detail-pro__metaDot" aria-hidden="true" />
            <span>{post.author}</span>
          </div>
        </div>
      </section>

      <section className="blog-detail-pro__body">
        <div className="container">
          <div className="blog-detail-pro__layout">
            <article className="blog-detail-pro__article">
              <div className="blog-detail-pro__cover">
                <img src={post.img} alt="" loading="lazy" decoding="async" />
              </div>

              <p className="blog-detail-pro__excerpt">{post.excerpt}</p>

              <div className="blog-detail-pro__content">
                {postBodyIsHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(post.body?.[0] ?? '')) }} />
                ) : (
                  post.body.map((para: string, idx: number) => (
                    <React.Fragment key={`${post.slug}-${idx}`}>
                      <p>{para}</p>
                      {idx === 0 ? (
                        <blockquote className="blog-detail-pro__quote">
                          {post.excerpt}
                        </blockquote>
                      ) : null}
                    </React.Fragment>
                  ))
                )}
              </div>

              <div className="blog-detail-pro__more">
                <div className="blog-detail-pro__infoRow">
                  <div className="blog-detail-pro__pill">{minutes} min read</div>
                  <div className="blog-detail-pro__pill">Updated: {post.date}</div>
                </div>

                <div className="blog-detail-pro__author">
                  <div className="blog-detail-pro__authorAvatar" aria-hidden="true">
                    FT
                  </div>
                  <div className="blog-detail-pro__authorBody">
                    <div className="blog-detail-pro__authorName">{post.author}</div>
                    <div className="blog-detail-pro__authorNote">
                      Practical, no-fluff insights on internships, hiring, and building your career.
                    </div>
                  </div>
                </div>

                <div className="blog-detail-pro__shareRow" role="group" aria-label="Share">
                  <button type="button" className="blog-detail-pro__shareAction" onClick={onShare}>
                    <Share2 className="blog-detail-pro__shareIcon" aria-hidden="true" />
                    <span>Share</span>
                  </button>

                  <button type="button" className="blog-detail-pro__shareAction" onClick={onCopyLink}>
                    <Copy className="blog-detail-pro__shareIcon" aria-hidden="true" />
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                
              </div>
            </article>

            <aside className="blog-detail-pro__aside">
              <div className="blog-detail-pro__card">
                <div className="blog-detail-pro__cardHead">
                  <div className="blog-detail-pro__cardTitle">Related Blogs</div>
                </div>
                <div className="blog-detail-pro__related">
                  {related.map((p) => (
                    <Link key={p.slug} className="blog-detail-pro__relatedItem" href={`/blog/${p.slug}`}>
                      <div className="blog-detail-pro__thumb">
                        <img src={p.img} alt="" loading="lazy" decoding="async" />
                      </div>
                      <div>
                        <div className="blog-detail-pro__relatedTitle">{p.title}</div>
                        <div className="blog-detail-pro__relatedMeta">{p.date}</div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="blog-detail-pro__cta">
                  <a className="blog-detail-pro__btn blog-detail-pro__btnPrimary" href="/employers" target="_blank" rel="noreferrer">
                    Hire an Intern
                  </a>
                  <a className="blog-detail-pro__btn" href="/login" target="_blank" rel="noreferrer">
                    Apply for Internship
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
