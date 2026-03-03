#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const REACT_SOURCE_PATH = process.env.REACT_SOURCE_PATH || '../react-source';
const ASTRO_PAGES_OUT   = 'src/pages';
const ASTRO_LAYOUT      = '../layouts/BaseLayout.astro';

const args  = process.argv.slice(2);
const flags = {
  source:        getArg('--source') || REACT_SOURCE_PATH,
  out:           getArg('--out')    || ASTRO_PAGES_OUT,
  includeCustom: args.includes('--include-custom'),
  dryRun:        args.includes('--dry-run'),
  page:          getArg('--page'),
};

function getArg(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

function extractHtml(content) {
  const t = content.match(/__html\s*:\s*`([\s\S]*?)`\s*\}/);
  if (t) return t[1].trim();
  const v = content.match(/(?:const|let|var)\s+(?:pageContent|htmlContent|content)\s*=\s*`([\s\S]*?)`/);
  if (v) return v[1].trim();
  return null;
}

function extractLayoutProps(content) {
  const m = content.match(/<ArticleLayout([\s\S]*?)(?:\/?>)/);
  if (!m) return {};
  const props = {};
  const re = /(\w+)\s*=\s*(?:"([^"]*?)"|'([^']*?)'|\{`([\s\S]*?)`\}|\{([^}]*?)\})/g;
  let match;
  while ((match = re.exec(m[1])) !== null) {
    const [, name, dq, sq, tmpl, expr] = match;
    props[name] = dq ?? sq ?? tmpl ?? expr;
  }
  return props;
}

function extractSchema(content) {
  const s = content.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
  if (s) return s[1].trim();
  const v = content.match(/const\s+pageSchema\s*=\s*(\{[\s\S]*?\});?\s*\n/);
  if (v) {
    try {
      return JSON.stringify(Function('"use strict"; return (' + v[1] + ')')(), null, 2);
    } catch { return v[1]; }
  }
  return null;
}

function fileToSlug(filePath) {
  return path.basename(filePath, path.extname(filePath))
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateAstroFile({ title, description, canonical, schema, html, extraProps }) {
  const lines = [
    'title: ' + JSON.stringify(title || ''),
    'description: ' + JSON.stringify(description || ''),
    canonical ? 'canonical: ' + JSON.stringify(canonical) : null,
    ...Object.entries(extraProps || {})
      .filter(([k]) => !['title','description','canonical'].includes(k))
      .map(([k,v]) => k + ': ' + JSON.stringify(v)),
  ].filter(Boolean);

  const fmBlock = lines.join(',\n  ');
  const schemaBlock = schema ? '\n<script type="application/ld+json">\n' + schema + '\n</script>\n' : '';
  const safeHtml = (html || '<!-- TODO: add content -->').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  return '---\nimport BaseLayout from \'' + ASTRO_LAYOUT + '\';\n\nconst frontmatter = {\n  ' + fmBlock + '\n};\n---\n\n<BaseLayout {...frontmatter}>' + schemaBlock + '\n  <div class="content" set:html={`' + safeHtml + '`} />\n</BaseLayout>\n';
}

function findReactPageFiles(dir) {
  const results = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx|jsx)$/.test(entry.name)) results.push(full);
    }
  }
  walk(dir);
  const pageFiles = results.filter(f => /[/\\]pages?[/\\]|[/\\]routes?[/\\]/.test(f));
  return pageFiles.length > 0 ? pageFiles : results;
}

async function main() {
  const sourcePath = path.resolve(flags.source);
  const outPath    = path.resolve(flags.out);

  if (!fs.existsSync(sourcePath)) {
    console.error('React source not found: ' + sourcePath);
    process.exit(1);
  }

  console.log('\nReact -> Astro Converter');
  console.log('Source: ' + sourcePath);
  console.log('Output: ' + outPath + '\n');

  const allFiles = findReactPageFiles(sourcePath);
  const filesToProcess = flags.page ? allFiles.filter(f => f.includes(flags.page)) : allFiles;

  if (!filesToProcess.length) {
    console.error('No React page files found in ' + sourcePath);
    process.exit(1);
  }

  const stats = { converted: 0, skipped: 0, errors: 0 };
  const skippedFiles = [];

  for (const filePath of filesToProcess) {
    const rel     = path.relative(sourcePath, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const hasArticleLayout = /ArticleLayout/.test(content);
    const hasDangerousHtml = /dangerouslySetInnerHTML/.test(content);

    if (!hasArticleLayout && !hasDangerousHtml) {
      if (/[Cc]omponent|[Hh]ook|[Uu]til|[Ll]ayout|[Tt]ype/.test(rel)) continue;
      if (!flags.includeCustom) {
        skippedFiles.push({ path: rel, reason: 'No ArticleLayout or dangerouslySetInnerHTML' });
        stats.skipped++;
        continue;
      }
    }

    try {
      const html   = extractHtml(content);
      const props  = extractLayoutProps(content);
      const schema = extractSchema(content);
      const slug   = fileToSlug(filePath);
      const { title, description, canonical, ...extraProps } = props;
      const astroContent = generateAstroFile({ title, description, canonical, schema, html, extraProps });
      const outFile = path.join(outPath, slug + '.astro');

      if (flags.dryRun) {
        console.log('[dry-run] -> ' + outFile);
      } else {
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, astroContent, 'utf8');
        console.log('OK ' + rel + ' -> src/pages/' + slug + '.astro');
      }
      stats.converted++;
    } catch (err) {
      console.error('ERR ' + rel + ' - ' + err.message);
      stats.errors++;
    }
  }

  console.log('\nConverted: ' + stats.converted);
  console.log('Skipped:   ' + stats.skipped);
  console.log('Errors:    ' + stats.errors);
  if (skippedFiles.length) {
    console.log('\nSkipped files:');
    skippedFiles.forEach(f => console.log('  ' + f.path + ' - ' + f.reason));
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
