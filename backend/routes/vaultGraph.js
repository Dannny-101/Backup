const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./admin');
const { createAuditLog } = require('./audit');

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

function clearCache() {
  cachedGraph = null;
  cacheTime = 0;
}

function stringifyFrontmatter(fm) {
  const lines = [];
  for (const [key, val] of Object.entries(fm)) {
    if (Array.isArray(val)) {
      lines.push(`${key}:`);
      val.forEach(item => lines.push(`  - ${item}`));
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else if (typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  return lines.join('\n');
}

function updateMdFile(fullPath, updates) {
  const text = fs.readFileSync(fullPath, 'utf8');
  const [fm, body] = parseFrontmatter(text);
  let newBody = body;
  if (updates.title !== undefined) {
    fm.title = updates.title;
    if (/^#\s+(.+)$/m.test(newBody)) {
      newBody = newBody.replace(/^#\s+(.+)$/m, `# ${updates.title}`);
    } else {
      newBody = `# ${updates.title}\n\n${newBody}`;
    }
  }
  if (updates.radius !== undefined) fm.radius = updates.radius;
  if (updates.type !== undefined) fm.type = updates.type;
  if (updates.tags !== undefined) fm.tags = updates.tags;
  const newText = `---\n${stringifyFrontmatter(fm)}\n---\n${newBody}`;
  fs.writeFileSync(fullPath, newText, 'utf8');
}

function auditPayload(req, filePath, title) {
  return [
    {
      userId: req.admin?.id,
      username: req.admin?.username,
      role: req.admin?.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    },
    {
      entityType: 'vault_file',
      entityId: filePath,
      entityName: title || filePath
    }
  ];
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

// POST create a new markdown file
router.post('/files', authMiddleware, async (req, res) => {
  try {
    const { path: filePath, title, content = '', type = 'topic', radius = 2, tags = [] } = req.body;
    if (!filePath) return res.status(400).json({ success: false, error: 'Path required' });
    if (!filePath.endsWith('.md')) return res.status(400).json({ success: false, error: 'Path must end with .md' });
    const fullPath = path.join(VAULT_DIR, filePath);
    if (!fullPath.startsWith(VAULT_DIR)) return res.status(403).json({ success: false, error: 'Invalid path' });
    if (fs.existsSync(fullPath)) return res.status(409).json({ success: false, error: 'File already exists' });

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const fm = { title, type, radius };
    if (tags && tags.length) fm.tags = tags;
    const fmText = stringifyFrontmatter(fm);
    const bodyText = content.trim() ? `# ${title}\n\n${content}` : `# ${title}\n`;
    const text = `---\n${fmText}\n---\n${bodyText}`;
    fs.writeFileSync(fullPath, text, 'utf8');

    clearCache();
    const [performedBy, target] = auditPayload(req, filePath, title);
    await createAuditLog('vault_file_created', performedBy, target);
    res.json({ success: true, data: { path: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST upload a PDF (base64)
router.post('/files/upload', authMiddleware, async (req, res) => {
  try {
    const { path: filePath, base64 } = req.body;
    if (!filePath) return res.status(400).json({ success: false, error: 'Path required' });
    if (!filePath.endsWith('.pdf')) return res.status(400).json({ success: false, error: 'Path must end with .pdf' });
    if (!base64) return res.status(400).json({ success: false, error: 'File data required' });
    const fullPath = path.join(VAULT_DIR, filePath);
    if (!fullPath.startsWith(VAULT_DIR)) return res.status(403).json({ success: false, error: 'Invalid path' });
    if (fs.existsSync(fullPath)) return res.status(409).json({ success: false, error: 'File already exists' });

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(fullPath, buffer);

    clearCache();
    const [performedBy, target] = auditPayload(req, filePath);
    await createAuditLog('vault_file_uploaded', performedBy, target);
    res.json({ success: true, data: { path: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update a markdown file (title, radius, type, tags)
router.put('/files', authMiddleware, async (req, res) => {
  try {
    const { path: filePath, updates } = req.body;
    if (!filePath) return res.status(400).json({ success: false, error: 'Path required' });
    const fullPath = path.join(VAULT_DIR, filePath);
    if (!fullPath.startsWith(VAULT_DIR)) return res.status(403).json({ success: false, error: 'Invalid path' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'File not found' });
    if (!filePath.endsWith('.md')) return res.status(400).json({ success: false, error: 'Only .md files can be updated' });

    updateMdFile(fullPath, updates);
    clearCache();
    const [performedBy, target] = auditPayload(req, filePath);
    await createAuditLog('vault_file_updated', performedBy, target);
    res.json({ success: true, data: { path: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE a file
router.delete('/files', authMiddleware, async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ success: false, error: 'Path required' });
    const fullPath = path.join(VAULT_DIR, filePath);
    if (!fullPath.startsWith(VAULT_DIR)) return res.status(403).json({ success: false, error: 'Invalid path' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'File not found' });

    fs.unlinkSync(fullPath);
    clearCache();
    const [performedBy, target] = auditPayload(req, filePath);
    await createAuditLog('vault_file_deleted', performedBy, target);
    res.json({ success: true, data: { path: filePath } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
