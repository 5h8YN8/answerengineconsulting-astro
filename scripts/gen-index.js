const fs   = require('fs');
const path = require('path');

const ANSWERS_DIR = path.resolve(__dirname, '../src/pages/answers');
const OUTPUT_FILE = path.join(ANSWERS_DIR, 'index.astro');

function extractFrontmatter(content) {
  const titleMatch = content.match(/title:\s*"((?:[^"\\]|\\.)*)"/);
  const descMatch  = content.match(/description:\s*"((?:[^"\\]|\\.)*)"/);
  return {
    title:       titleMatch ? titleMatch[1] : '',
    description: descMatch  ? descMatch[1]  : '',
  };
}

function findPages(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const subdir = path.join(dir, entry.name);
    for (const file of fs.readdirSync(subdir, { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.astro') || file.name === 'index.astro') continue;
      const content = fs.readFileSync(path.join(subdir, file.name), 'utf8');
      const { title, description } = extractFrontmatter(content);
      results.push({ category: entry.name, slug: `/answers/${entry.name}/${file.name.replace('.astro','')}`, title, description });
    }
  }
  return results;
}

const CATEGORY_LABELS = { 'aeo':'Answer Engine Optimization (AEO)', 'ai-search':'AI Search', 'ai-optimization':'AI Optimization' };
const CATEGORY_ORDER  = ['aeo','ai-search','ai-optimization'];

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const pages = findPages(ANSWERS_DIR);
console.log(`Found ${pages.length} pages`);

const grouped = {};
for (const p of pages) { if (!grouped[p.category]) grouped[p.category]=[]; grouped[p.category].push(p); }

const sections = CATEGORY_ORDER.filter(c=>grouped[c]).map(c=>`
    <section class="category-section">
      <h2>${CATEGORY_LABELS[c]||c}</h2>
      <div class="card-grid">
${grouped[c].map(p=>`        <a href="${p.slug}" class="answer-card">
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.description)}</p>
        </a>`).join('\n')}
      </div>
    </section>`).join('\n');

fs.writeFileSync(OUTPUT_FILE, `---
import BaseLayout from '../../layouts/BaseLayout.astro';
const frontmatter = {
  title: "Answer Engine Optimization Resources",
  description: "Browse all our AEO, AI search, and AI optimization guides organized by topic.",
  canonical: "https://answerengineconsulting.com/answers"
};
---
<BaseLayout {...frontmatter}>
  <div class="answers-hub">
    <div class="hub-header">
      <h1>Answer Engine Optimization Resources</h1>
      <p class="hub-subtitle">Expert guides on AEO, AI search visibility, and optimization strategies — organized by topic.</p>
    </div>
${sections}
  </div>
</BaseLayout>
<style>
  .answers-hub { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem 5rem; color: #e2e8f0; }
  .hub-header { text-align: center; margin-bottom: 3.5rem; }
  .hub-header h1 { font-size: clamp(1.8rem,4vw,2.5rem); font-weight: 700; margin-bottom: .75rem; background: linear-gradient(135deg,hsl(230 60% 70%),hsl(195 80% 65%),hsl(155 60% 60%)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hub-subtitle { font-size: 1.1rem; color: #94a3b8; max-width: 580px; margin: 0 auto; line-height: 1.65; }
  .category-section { margin-bottom: 3rem; }
  .category-section h2 { font-size: .78rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #64748b; margin-bottom: 1rem; padding-bottom: .5rem; border-bottom: 1px solid rgba(255,255,255,.07); }
  .card-grid { display: grid; gap: .75rem; }
  .answer-card { display: block; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: 1.1rem 1.4rem; text-decoration: none; color: inherit; transition: background .18s,border-color .18s,transform .15s; }
  .answer-card:hover { background: rgba(255,255,255,.08); border-color: rgba(99,130,255,.4); transform: translateY(-1px); }
  .answer-card h3 { font-size: .975rem; font-weight: 600; color: #f1f5f9; margin: 0 0 .35rem; line-height: 1.4; }
  .answer-card p { font-size: .85rem; color: #94a3b8; margin: 0; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
`);

console.log('Written: src/pages/answers/index.astro');
