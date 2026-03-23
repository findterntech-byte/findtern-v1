export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  img: string;
  date: string;
  author: string;
  body: string[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "struggles-finding-right-intern",
    title: "The Struggles of Finding the Right Intern – Why It’s So Hard?",
    excerpt:
      "Hiring interns seems simple—post a job, receive applications, and select the best candidate.",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "Hiring interns can feel like a quick task until the applications start pouring in. It’s common to receive hundreds of resumes—many of them irrelevant—making it difficult to identify truly suitable candidates.",
      "The biggest challenge is signal vs noise: good candidates get lost in the pile, screening takes time, and teams often compromise due to deadlines.",
      "A structured workflow (clear requirements, screening questions, and a consistent evaluation rubric) is the easiest way to remove uncertainty and improve hiring outcomes.",
      "Findtern helps by filtering profiles, verifying basics, and giving you a transparent score so you can shortlist confidently.",
    ],
  },
  {
    slug: "power-of-pre-screening",
    title: "The Power of Pre‑Screening – Why It’s a Game Changer in Hiring Interns",
    excerpt:
      "Imagine hiring without wasting hours reviewing irrelevant resumes [...]",
    img: "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "Pre‑screening reduces your hiring time dramatically by ensuring only qualified candidates reach your shortlist.",
      "When candidates are evaluated with consistent criteria (skills, communication, and role-fit), you avoid bias and speed up decisions.",
      "This also improves candidate experience: faster feedback, fewer redundant steps, and clearer expectations.",
    ],
  },
  {
    slug: "coffee-price-hiring",
    title: 'Why We Say "Hire an Intern for the Price of a Coffee"?',
    excerpt:
      "At Findtern, we believe that hiring interns should be easy and affordable. That’s why we say: [...]",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "Intern hiring shouldn’t be expensive. Startups and small teams should be able to test talent quickly and affordably.",
      "By combining smart matching with verified profiles and transparent scoring, Findtern reduces cost while maintaining quality.",
      "That’s how we keep intern hiring within reach—often comparable to everyday expenses.",
    ],
  },
  {
    slug: "hard-to-get-internship",
    title: "Why Is It So Hard to Get an Internship?",
    excerpt:
      "Landing an internship isn’t as easy as it sounds. Despite applying to dozens of companies, many students never [...]",
    img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "The market is competitive and most students apply broadly without tailoring resumes or demonstrating role-ready skills.",
      "Internship selection often depends on proof: projects, communication, consistency, and ability to learn quickly.",
      "A clear portfolio and structured preparation (plus applying to the right roles) increases your chances significantly.",
    ],
  },
  {
    slug: "fake-vs-real-internship",
    title: "Why Fake an Internship When You Can Get a Real One?",
    excerpt:
      "Many students, in desperation, buy fake internship certificates just to show experience on their resumes. But [...]",
    img: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "Fake certificates can harm your credibility long term. Employers verify work and quickly detect inconsistencies.",
      "A real internship—even small—builds actual skills, references, and confidence that compounds over time.",
      "Focus on learning-by-doing: contribute to projects, build a portfolio, and apply with proof of work.",
    ],
  },
  {
    slug: "invest-in-career-2500",
    title: "Invest in Your Career – INR 2500 vs. One Fun Night",
    excerpt:
      "We often spend money without thinking—a night out with friends, a fancy dinner, or a movie. But when it comes to [...]",
    img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "Small investments in your career (courses, tools, mentorship) can generate outsized returns over time.",
      "The key is consistency: learn a skill, ship projects, and use opportunities to build real proof.",
      "Your future income and options often depend on today’s habits more than one‑time bursts of effort.",
    ],
  },
  {
    slug: "best-internship-platforms",
    title:
      "Best Internship Platforms for Students: How to Apply and Land Your Dream Role",
    excerpt:
      "Internships are no longer just optional—they’re essential for building a strong career. Whether you’re a fresher or a student, [...]",
    img: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "Choose platforms that verify roles, provide clear requirements, and help you match to roles you can actually perform.",
      "Avoid random mass-applying. Instead, prepare a strong profile, tailor applications, and follow up professionally.",
      "A short list of high-quality applications often beats dozens of generic ones.",
    ],
  },
  {
    slug: "top-internships-2025",
    title:
      "Top Internships and Live Projects for Freshers in 2025: Marketing, Sales, IT, Data & AI",
    excerpt:
      "Starting your career as a fresher can feel overwhelming, but the right fresher internship can give you the confidence and skills[...]",
    img: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80",
    date: "Dec 2025",
    author: "Findtern Team",
    body: [
      "In 2025, skills-first hiring continues to grow. Marketing analytics, sales ops, full-stack development, data engineering, and AI tooling are strong tracks.",
      "Pick an internship based on learning value and mentorship, not only brand name. Aim for measurable outcomes and shipped work.",
      "Live projects (with real deliverables) are the fastest way to build a portfolio that stands out.",
    ],
  },
];

export function getBlogPostBySlug(slug?: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
