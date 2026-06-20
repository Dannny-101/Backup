const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./admin');

const VAULT_DIR = path.join(__dirname, '..', '..', 'orchestrator');

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return [{}, text];
  const parts = text.split('---');
  if (parts.length < 3) return [{}, text];
  const fmText = parts[1].trim();
  const body = parts.slice(2).join('---');
  const fm = {};
  let currentKey = null;
  for (const line of fmText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('- ')) {
      const tag = trimmed.slice(2).replace(/^["']|["']$/g, '');
      if (!fm[currentKey]) fm[currentKey] = [];
      fm[currentKey].push(tag);
    } else if (trimmed.includes(':')) {
      const [key, ...valParts] = trimmed.split(':');
      const val = valParts.join(':').trim();
      currentKey = key.trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        fm[currentKey] = val.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      } else if (val === '') {
        fm[currentKey] = '';
      } else if (!isNaN(val)) {
        fm[currentKey] = Number(val);
      } else if (val === 'true') {
        fm[currentKey] = true;
      } else if (val === 'false') {
        fm[currentKey] = false;
      } else {
        fm[currentKey] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
  return [fm, body];
}

function extractWikilinks(text) {
  const pattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const matches = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    matches.push(m[1].trim());
  }
  return matches;
}

function extractTitle(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

let cachedGraph = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

function buildGraph() {
  if (cachedGraph && (Date.now() - cacheTime) < CACHE_TTL) {
    return cachedGraph;
  }

  if (!fs.existsSync(VAULT_DIR)) {
    throw new Error(`Vault directory not found at ${VAULT_DIR}. Ensure orchestrator/ is copied in Dockerfile.`);
  }

  const nodes = [];
  const edges = [];
  const nodeMap = new Map();
  const fileMap = new Map();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const relPath = path.relative(VAULT_DIR, fullPath).replace(/\\/g, '/');
        const text = fs.readFileSync(fullPath, 'utf8');
        const [fm, body] = parseFrontmatter(text);
        const parts = relPath.split('/');
        const section = parts.length > 1 ? parts[0] : 'root';
        const radius = typeof fm.radius === 'number' ? fm.radius : 2;
        const nodeType = fm.type || 'topic';
        const title = extractTitle(body) || relPath.replace(/\.md$/, '');

        const node = {
          id: relPath,
          title,
          section,
          radius,
          type: nodeType,
          tags: Array.isArray(fm.tags) ? fm.tags : []
        };
        nodes.push(node);
        nodeMap.set(relPath, node);
        fileMap.set(relPath.replace(/\.md$/, ''), node);
      }
    }
  }

  walk(VAULT_DIR);

  // Build edges from wikilinks
  const seen = new Set();
  for (const node of nodes) {
    const fullPath = path.join(VAULT_DIR, node.id);
    const text = fs.readFileSync(fullPath, 'utf8');
    const [, body] = parseFrontmatter(text);
    const links = extractWikilinks(body);

    for (const link of links) {
      let target = null;
      // Try exact match
      if (nodeMap.has(link)) {
        target = nodeMap.get(link);
      } else if (fileMap.has(link)) {
        target = fileMap.get(link);
      } else {
        // Try relative to current node's directory
        const baseDir = path.dirname(node.id);
        const candidate = path.join(baseDir, link + '.md').replace(/\\/g, '/');
        if (nodeMap.has(candidate)) {
          target = nodeMap.get(candidate);
        }
      }

      if (target && target.id !== node.id) {
        const key = [node.id, target.id].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ source: node.id, target: target.id });
        }
      }
    }
  }

  cachedGraph = { nodes, edges, count: { nodes: nodes.length, edges: edges.length } };
  cacheTime = Date.now();
  return cachedGraph;
}

router.get('/', authMiddleware, (req, res) => {
  try {
    const graph = buildGraph();
    res.json({ success: true, data: graph });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET file tree (.md and .pdf only)
router.get('/files', authMiddleware, (req, res) => {
  try {
    const tree = [];
    function walk(dir, parent) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(VAULT_DIR, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          const folder = { type: 'folder', name: entry.name, path: relPath, children: [] };
          walk(fullPath, folder.children);
          if (folder.children.length) parent.push(folder);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.pdf')) {
          parent.push({ type: 'file', name: entry.name, path: relPath });
        }
      }
    }
    walk(VAULT_DIR, tree);
    res.json({ success: true, data: tree });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET markdown file content
router.get('/content', authMiddleware, (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ success: false, error: 'Path required' });
    const fullPath = path.join(VAULT_DIR, filePath);
    if (!fullPath.startsWith(VAULT_DIR)) return res.status(403).json({ success: false, error: 'Invalid path' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'File not found' });
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ success: true, data: { path: filePath, content } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET raw file (for PDFs and images)
router.get('/raw', authMiddleware, (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ success: false, error: 'Path required' });
    const fullPath = path.join(VAULT_DIR, filePath);
    if (!fullPath.startsWith(VAULT_DIR)) return res.status(403).json({ success: false, error: 'Invalid path' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'File not found' });
    const mime = filePath.endsWith('.pdf') ? 'application/pdf' :
                 filePath.endsWith('.png') ? 'image/png' :
                 filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ? 'image/jpeg' :
                 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    const stream = fs.createReadStream(fullPath);
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
