const fs   = require('fs');
const path = require('path');

const PAGES_DIR  = path.resolve(__dirname, '../src/pages');
const ANSWERS_DIR = path.join(PAGES_DIR, 'answers');
const OUTPUT_FILE = path.join(ANSWERS_DIR, 'index.astro');

// ── Manual overrides for pages with empty frontmatter ────────────────────────
const OVERRIDES = {
  '/answers/aeo/what-makes-answer-engine-consulting-different': {
    title: 'What makes Answer Engine Consulting different?',
    description: 'Answer Engine Consulting is purpose-built for the AI search era — combining an answer gap methodology, JSON-LD structured data expertise, and revenue-aligned measurement that ties AI citations directly to pipeline outcomes. Unlike agencies that adapted SEO playbooks, AEC was designed from the ground up for LLM optimization.',
  },
  '/answers/ai-search/how-do-you-accurately-measure-ai-search-visibility': {
    title: 'How do you accurately measure AI search visibility?',
    description: 'Accurately measuring AI search visibility requires tracking citation frequency across major LLMs, monitoring answer gap coverage, and connecting AI appearances to pipeline metrics like demo conversions and sales cycle length — not just impressions or rankings.',
  },
};

// ── Buyer journey stages (problem unaware → purchase intent) ─────────────────
const STAGES = [
  {
    label: 'Problem Unaware',
    sublabel: 'What is this?',
    slugs: [
      '/answers/aeo/what-is-answer-engine-optimization-aeo',
      '/answers/ai-search/what-is-ai-search',
      '/answers/ai-search/is-ai-search-replacing-traditional-search-engines',
      '/answers/ai-search/why-does-ai-search-matter-for-modern-marketing-teams',
    ],
  },
  {
    label: 'Problem Aware',
    sublabel: 'Understanding the landscape',
    slugs: [
      '/answers/aeo/how-is-aeo-different-from-hiring-an-seo-agency',
      '/answers/ai-search/how-is-ai-search-different-from-traditional-seo',
      '/answers/ai-search/what-content-formats-perform-best-in-ai-search',
      '/answers/ai-optimization/how-do-large-language-models-read-and-interpret-websites',
      '/answers/ai-optimization/how-do-ai-models-evaluate-authority-and-trust',
      '/answers/ai-optimization/how-do-you-structure-a-website-for-machine-readability',
      '/answers/ai-optimization/what-technical-changes-are-required-for-ai-optimization',
    ],
  },
  {
    label: 'Solution Aware',
    sublabel: 'Evaluating AEO',
    slugs: [
      '/answers/aeo/what-are-aeo-best-practices',
      '/answers/ai-search/how-do-you-optimize-a-website-for-ai-search',
      '/answers/ai-search/how-does-internal-linking-impact-ai-search-visibility',
      '/answers/ai-search/how-do-you-measure-ai-search-visibility',
      '/answers/ai-search/how-do-you-accurately-measure-ai-search-visibility',
      '/answers/aeo/what-roi-can-organizations-expect-from-aeo',
      '/answers/aeo/how-long-does-aeo-take-to-show-results',
      '/answers/aeo/what-are-the-risks-of-implementing-aeo-without-expertise',
      '/answers/aeo/what-resources-are-required-to-implement-aeo',
    ],
  },
  {
    label: 'Product Aware',
    sublabel: 'Evaluating Answer Engine Consulting',
    slugs: [
      '/answers/ai-search/what-are-the-benefits-of-hiring-an-ai-search-consultant',
      '/answers/ai-search/who-are-the-top-ai-search-consultants',
      '/answers/aeo/what-makes-answer-engine-consulting-different',
      '/answers/aeo/what-makes-answer-engine-consulting-different-from-seo-agencies',
      '/answers/ai-search/why-choose-answer-engine-consulting-for-ai-search-optimization',
      '/answers/aeo/what-results-have-companies-achieved-with-answer-engine-consulting',
      '/answers/aeo/what-deliverables-are-included-in-an-aeo-engagement',
      '/answers/aeo/what-is-it-like-working-with-answer-engine-consulting',
    ],
  },
  {
    label: 'Purchase Intent',
    sublabel: 'Ready to engage',
    slugs: [
      '/answers/aeo/should-we-implement-aeo-internally-or-hire-a-consultant',
      '/answers/aeo/what-should-we-look-for-in-an-aeo-consultant',
      '/answers/aeo/how-much-does-aeo-consulting-typically-cost',
      '/answers/aeo/what-is-the-pricing-structure-of-answer-engine-consulting',
      '/answers/aeo/does-answer-engine-consulting-offer-audits-or-pilot-engagements',
      '/answers/aeo/how-quickly-can-we-get-started-with-answer-engine-consulting',
    ],
  },
];

// ── Extract frontmatter from .astro file ─────────────────────────────────────
function extractFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const titleMatch = content.match(/title:\s*"((?:[^"\\]|\\.)*)"/);
  const descMatch  = content.match(/description:\s*"((?:[^"\\]|\\.)*)"/);
  return {
    title:       titleMatch ? titleMatch[1] : '',
    description: descMatch  ? descMatch[1]  : '',
  };
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Build sections HTML ───────────────────────────────────────────────────────
const sections = STAGES.map(stage => {
  const cards = stage.slugs.map(slug => {
    const filePath = path.join(PAGES_DIR, slug + '.astro');
    const fm = extractFrontmatter(filePath) || {};
    const override = OVERRIDES[slug] || {};
    const title       = override.title       || fm.title       || '';
    const description = override.description || fm.description || '';

    if (!title) {
      console.warn('  ⚠️  No title found for', slug);
      return '';
    }
    return `      <a href="${slug}" class="answer-card">
        <h3>${esc(title)}</h3>
        <p>${esc(description)}</p>
      </a>`;
  }).filter(Boolean).join('\n');

  return `    <section class="stage-section">
      <div class="stage-label">
        <span class="stage-name">${stage.label}</span>
        <span class="stage-sub">— ${stage.sublabel}</span>
      </div>
      <div class="card-grid">
${cards}
      </div>
    </section>`;
}).join('\n\n');

// ── Write index.astro ─────────────────────────────────────────────────────────
const output = `---
import BaseLayout from '../../layouts/BaseLayout.astro';

const frontmatter = {
  title: "Answer Engine Optimization Resources",
  description: "Browse all our AEO, AI search, and AI optimization guides — from foundational concepts to purchase-ready decisions.",
  canonical: "https://answerengineconsulting.com/answers"
};
---

<BaseLayout {...frontmatter}>
  <div class="answers-hub">

    <div class="hub-header">
      <h1>Answer Engine Optimization Resources</h1>
      <p class="hub-subtitle">
        Expert guides on AEO, AI search visibility, and optimization strategy —
        organized from foundational concepts to purchase decisions.
      </p>
    </div>

${sections}

  </div>
</BaseLayout>

<style>
  .answers-hub {
    max-width: 900px;
    margin: 0 auto;
    padding: 3rem 1.5rem 5rem;
    color: #e2e8f0;
  }

  .hub-header {
    text-align: center;
    margin-bottom: 3.5rem;
  }

  .hub-header h1 {
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 700;
    margin-bottom: .75rem;
    background: linear-gradient(135deg, hsl(230 60% 70%), hsl(195 80% 65%), hsl(155 60% 60%));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
  }

  .hub-subtitle {
    font-size: 1.1rem;
    color: #94a3b8;
    max-width: 580px;
    margin: 0 auto;
    line-height: 1.65;
  }

  .stage-section {
    margin-bottom: 2.75rem;
  }

  .stage-label {
    display: flex;
    align-items: baseline;
    gap: .5rem;
    margin-bottom: 1rem;
    padding-bottom: .5rem;
    border-bottom: 1px solid rgba(255,255,255,.07);
  }

  .stage-name {
    font-size: .78rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: hsl(195 80% 60%);
  }

  .stage-sub {
    font-size: .78rem;
    color: #475569;
    letter-spacing: .02em;
  }

  .card-grid {
    display: grid;
    gap: .65rem;
  }

  .answer-card {
    display: block;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 10px;
    padding: 1rem 1.4rem;
    text-decoration: none;
    color: inherit;
    transition: background .18s, border-color .18s, transform .15s;
  }

  .answer-card:hover {
    background: rgba(255,255,255,.08);
    border-color: rgba(99,130,255,.4);
    transform: translateY(-1px);
  }

  .answer-card h3 {
    font-size: .95rem;
    font-weight: 600;
    color: #f1f5f9;
    margin: 0 0 .3rem;
    line-height: 1.4;
  }

  .answer-card p {
    font-size: .84rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
`;

fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
console.log('\nWritten: src/pages/answers/index.astro');
console.log('Stages:');
STAGES.forEach(s => console.log(' ', s.label, '—', s.slugs.length, 'pages'));
