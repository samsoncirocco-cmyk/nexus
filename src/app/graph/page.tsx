'use client';

import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ================================================================
   TYPES
   ================================================================ */

interface GraphNode {
  id: string;
  title: string;
  category: string;
  tags: string[];
  connections: number;
  // simulation state
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'tag' | 'reference';
}

interface SelectedNode {
  node: GraphNode;
  screenX: number;
  screenY: number;
}

/* ================================================================
   CATEGORY COLORS
   ================================================================ */

const CATEGORY_COLORS: Record<string, string> = {
  accounts: '#22c55e',
  concepts: '#fade29',
  projects: '#3b82f6',
  journal: '#a855f7',
  erate: '#f97316',
  intel: '#06b6d4',
  reports: '#ef4444',
  root: '#9ca3af',
  'data-source': '#10b981',
  repos: '#f59e0b',
  device: '#38bdf8',   // sky-400 — distinct from other categories
  scan: '#818cf8',     // indigo-400 — scans are children of devices
};

const CATEGORY_GLOW: Record<string, string> = {
  accounts: 'rgba(34,197,94,0.4)',
  concepts: 'rgba(250,222,41,0.4)',
  projects: 'rgba(59,130,246,0.4)',
  journal: 'rgba(168,85,247,0.4)',
  erate: 'rgba(249,115,22,0.4)',
  intel: 'rgba(6,182,212,0.4)',
  reports: 'rgba(239,68,68,0.4)',
  root: 'rgba(156,163,175,0.4)',
  'data-source': 'rgba(16,185,129,0.4)',
  repos: 'rgba(245,158,11,0.4)',
  device: 'rgba(56,189,248,0.4)',
  scan: 'rgba(129,140,248,0.4)',
};

/** Map category to Material Symbols icon name for special node types */
const CATEGORY_ICONS: Record<string, string> = {
  device: 'devices',
  scan: 'document_scanner',
  'data-source': 'database',
};

function getColor(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.root;
}

function getGlow(cat: string) {
  return CATEGORY_GLOW[cat] || CATEGORY_GLOW.root;
}

/* ================================================================
   FORCE SIMULATION
   ================================================================ */

function initializePositions(nodes: GraphNode[], w: number, h: number) {
  const categories = [...new Set(nodes.map(n => n.category))];
  const angleStep = (2 * Math.PI) / Math.max(categories.length, 1);
  const radius = Math.min(w, h) * 0.3;

  nodes.forEach(node => {
    const catIdx = categories.indexOf(node.category);
    const baseAngle = catIdx * angleStep;
    const jitter = (Math.random() - 0.5) * radius * 0.6;
    node.x = w / 2 + Math.cos(baseAngle) * radius + jitter;
    node.y = h / 2 + Math.sin(baseAngle) * radius + (Math.random() - 0.5) * radius * 0.6;
    node.vx = 0;
    node.vy = 0;
  });
}

function simulationTick(
  nodes: GraphNode[],
  edges: GraphEdge[],
  w: number,
  h: number,
  alpha: number
) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const cx = w / 2;
  const cy = h / 2;
  const GRAVITY = 0.01 * alpha;

  for (const node of nodes) {
    if (node.fx != null) { node.x = node.fx; node.vx = 0; }
    if (node.fy != null) { node.y = node.fy; node.vy = 0; }
    node.vx += (cx - node.x) * GRAVITY;
    node.vy += (cy - node.y) * GRAVITY;
  }

  // Repulsion
  const REPULSION = 800 * alpha;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 20) dist = 20;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (a.fx == null) a.vx -= fx;
      if (a.fy == null) a.vy -= fy;
      if (b.fx == null) b.vx += fx;
      if (b.fy == null) b.vy += fy;
    }
  }

  // Springs
  const SPRING = 0.05 * alpha;
  const TARGET_LEN = 120;
  for (const edge of edges) {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b) continue;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - TARGET_LEN;
    const fx = (dx / dist) * displacement * SPRING;
    const fy = (dy / dist) * displacement * SPRING;
    if (a.fx == null) a.vx += fx;
    if (a.fy == null) a.vy += fy;
    if (b.fx == null) b.vx -= fx;
    if (b.fy == null) b.vy -= fy;
  }

  // Velocity + damping
  const DAMPING = 0.85;
  for (const node of nodes) {
    if (node.fx != null && node.fy != null) continue;
    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.x += node.vx;
    node.y += node.vy;
    node.x = Math.max(40, Math.min(w - 40, node.x));
    node.y = Math.max(40, Math.min(h - 40, node.y));
  }
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function GraphPageWrapper() {
  return (
    <Suspense fallback={
      <div className="relative w-full h-screen overflow-hidden flex items-center justify-center" style={{ background: '#0a0f0c' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
          <div className="text-sm text-foreground-muted">Building knowledge graph...</div>
        </div>
      </div>
    }>
      <GraphPageInner />
    </Suspense>
  );
}

function GraphPageInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const allNodesRef = useRef<GraphNode[]>([]);
  const allEdgesRef = useRef<GraphEdge[]>([]);
  const animRef = useRef<number>(0);
  const alphaRef = useRef(1);

  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });

  // Search & filter state
  const [search, setSearch] = useState('');
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());
  const [searchFocusId, setSearchFocusId] = useState<string | null>(null);

  // Camera
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Drag
  const dragRef = useRef<{
    type: 'node' | 'pan' | null;
    nodeId?: string;
    startX: number;
    startY: number;
    startCamX: number;
    startCamY: number;
  }>({ type: null, startX: 0, startY: 0, startCamX: 0, startCamY: 0 });

  const [stats, setStats] = useState<Record<string, number>>({});
  const searchParams = useSearchParams();
  const initialFocusDone = useRef(false);

  /* ---- Fetch data ---- */
  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.json())
      .then(data => {
        const w = containerRef.current?.clientWidth || 1200;
        const h = containerRef.current?.clientHeight || 800;
        setDimensions({ w, h });

        const nodes: GraphNode[] = data.nodes.map((n: GraphNode) => ({
          ...n,
          x: 0, y: 0, vx: 0, vy: 0,
        }));
        initializePositions(nodes, w, h);
        nodesRef.current = nodes;
        edgesRef.current = data.edges;
        allNodesRef.current = [...nodes];
        allEdgesRef.current = [...data.edges];

        const counts: Record<string, number> = {};
        nodes.forEach((n: GraphNode) => {
          counts[n.category] = (counts[n.category] || 0) + 1;
        });
        setStats(counts);
        setLoaded(true);
        setCamera({ x: 0, y: 0, scale: 1 });
      })
      .catch(console.error);
  }, []);

  /* ---- Apply filters ---- */
  const applyFilters = useCallback(() => {
    const q = search.toLowerCase();
    const allNodes = allNodesRef.current;
    const allEdges = allEdgesRef.current;

    const filtered = allNodes.filter(n => {
      if (hiddenCategories.has(n.category)) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.tags.some(t => t.toLowerCase().includes(q))) return false;
      return true;
    });

    const visibleIds = new Set(filtered.map(n => n.id));
    const filteredEdges = allEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));

    nodesRef.current = filtered;
    edgesRef.current = filteredEdges;
    alphaRef.current = Math.max(alphaRef.current, 0.5);
  }, [search, hiddenCategories]);

  useEffect(() => {
    if (!loaded) return;
    applyFilters();
  }, [loaded, applyFilters]);

  /* ---- Search results dropdown ---- */
  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return allNodesRef.current
      .filter(n => n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [search]);

  const focusOnNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    const { w, h } = dimensions;
    setCamera({
      scale: 1.5,
      x: w / 2 - node.x * 1.5,
      y: h / 2 - node.y * 1.5,
    });
    setSearchFocusId(nodeId);
    setHovered(nodeId);
    setTimeout(() => setSearchFocusId(null), 3000);
  }, [dimensions]);

  /* ---- Get connected docs for popover ---- */
  const getConnectedDocs = useCallback((nodeId: string) => {
    const edges = allEdgesRef.current;
    const connected = new Set<string>();
    for (const e of edges) {
      if (e.source === nodeId) connected.add(e.target);
      if (e.target === nodeId) connected.add(e.source);
    }
    return allNodesRef.current.filter(n => connected.has(n.id)).slice(0, 6);
  }, []);

  /* ---- Auto-focus from ?focus= query param ---- */
  useEffect(() => {
    if (!loaded || initialFocusDone.current) return;
    const focusId = searchParams.get('focus');
    if (focusId) {
      // Wait a brief moment for simulation to settle a bit
      const timer = setTimeout(() => {
        focusOnNode(focusId);
        initialFocusDone.current = true;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loaded, searchParams, focusOnNode]);

  /* ---- Animation loop ---- */
  useEffect(() => {
    if (!loaded) return;
    alphaRef.current = 1;
    let running = true;

    const tick = () => {
      if (!running) return;
      const { w, h } = dimensions;
      const alpha = alphaRef.current;

      if (alpha > 0.001) {
        simulationTick(nodesRef.current, edgesRef.current, w, h, alpha);
        alphaRef.current *= 0.995;
      }

      renderSVG();
      animRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [loaded, dimensions]);

  /* ---- Render SVG ---- */
  const renderSVG = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const cam = cameraRef.current;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'glow');
    filter.appendChild(blur);
    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const m1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    m1.setAttribute('in', 'glow');
    merge.appendChild(m1);
    const m2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    m2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(m2);
    filter.appendChild(merge);
    defs.appendChild(filter);

    const edgeFilter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    edgeFilter.setAttribute('id', 'edge-glow');
    edgeFilter.setAttribute('x', '-20%');
    edgeFilter.setAttribute('y', '-20%');
    edgeFilter.setAttribute('width', '140%');
    edgeFilter.setAttribute('height', '140%');
    const eBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    eBlur.setAttribute('stdDeviation', '2');
    eBlur.setAttribute('result', 'glow');
    edgeFilter.appendChild(eBlur);
    const eMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const em1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    em1.setAttribute('in', 'glow');
    eMerge.appendChild(em1);
    const em2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    em2.setAttribute('in', 'SourceGraphic');
    eMerge.appendChild(em2);
    edgeFilter.appendChild(eMerge);
    defs.appendChild(edgeFilter);

    svg.appendChild(defs);

    // Transform group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${cam.x},${cam.y}) scale(${cam.scale})`);

    // Edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x));
      line.setAttribute('y2', String(b.y));
      line.setAttribute('stroke', 'rgba(250,222,41,0.15)');
      line.setAttribute('stroke-width', edge.type === 'reference' ? '2' : '1');
      line.setAttribute('filter', 'url(#edge-glow)');

      if (hovered && (edge.source === hovered || edge.target === hovered)) {
        line.setAttribute('stroke', 'rgba(250,222,41,0.6)');
        line.setAttribute('stroke-width', '2.5');
      }

      g.appendChild(line);
    }

    // Nodes
    for (const node of nodes) {
      const color = getColor(node.category);
      const glowColor = getGlow(node.category);
      const isHovered = hovered === node.id;
      const isFocused = searchFocusId === node.id;
      const baseRadius = Math.max(6, Math.min(20, 6 + node.connections * 2));
      const radius = (isHovered || isFocused) ? baseRadius * 1.3 : baseRadius;

      // Ambient glow
      const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glowCircle.setAttribute('cx', String(node.x));
      glowCircle.setAttribute('cy', String(node.y));
      glowCircle.setAttribute('r', String(radius * (isFocused ? 3 : 2)));
      glowCircle.setAttribute('fill', (isHovered || isFocused) ? glowColor : 'transparent');
      glowCircle.setAttribute('opacity', isFocused ? '0.5' : '0.3');
      g.appendChild(glowCircle);

      // Pulse ring for focused node
      if (isFocused) {
        const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pulse.setAttribute('cx', String(node.x));
        pulse.setAttribute('cy', String(node.y));
        pulse.setAttribute('r', String(radius * 2.5));
        pulse.setAttribute('fill', 'none');
        pulse.setAttribute('stroke', color);
        pulse.setAttribute('stroke-width', '1.5');
        pulse.setAttribute('opacity', '0.6');
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'r');
        animate.setAttribute('from', String(radius * 1.5));
        animate.setAttribute('to', String(radius * 3.5));
        animate.setAttribute('dur', '1.5s');
        animate.setAttribute('repeatCount', 'indefinite');
        pulse.appendChild(animate);
        const fadeAnimate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        fadeAnimate.setAttribute('attributeName', 'opacity');
        fadeAnimate.setAttribute('from', '0.6');
        fadeAnimate.setAttribute('to', '0');
        fadeAnimate.setAttribute('dur', '1.5s');
        fadeAnimate.setAttribute('repeatCount', 'indefinite');
        pulse.appendChild(fadeAnimate);
        g.appendChild(pulse);
      }

      // Node shape — device/scan get a rounded-rect with icon, others get a circle
      const iconName = CATEGORY_ICONS[node.category];
      if (iconName) {
        // Rounded rect for device/scan nodes
        const rectSize = radius * 2.2;
        const rx = 4;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(node.x - rectSize / 2));
        rect.setAttribute('y', String(node.y - rectSize / 2));
        rect.setAttribute('width', String(rectSize));
        rect.setAttribute('height', String(rectSize));
        rect.setAttribute('rx', String(rx));
        rect.setAttribute('ry', String(rx));
        rect.setAttribute('fill', `${color}22`);
        rect.setAttribute('stroke', color);
        rect.setAttribute('stroke-width', (isHovered || isFocused) ? '3' : '2');
        rect.setAttribute('filter', 'url(#glow)');
        rect.setAttribute('style', 'cursor: pointer;');
        rect.setAttribute('data-node-id', node.id);
        g.appendChild(rect);

        // Material Symbols icon text inside
        const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        iconText.setAttribute('x', String(node.x));
        iconText.setAttribute('y', String(node.y + radius * 0.35));
        iconText.setAttribute('text-anchor', 'middle');
        iconText.setAttribute('fill', color);
        iconText.setAttribute('font-family', 'Material Symbols Outlined');
        iconText.setAttribute('font-size', String(Math.max(12, radius * 1.1)));
        iconText.setAttribute('style', 'cursor: pointer; font-variation-settings: "FILL" 1;');
        iconText.textContent = iconName;
        g.appendChild(iconText);
      } else {
        // Standard circle for vault doc nodes
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(node.x));
        circle.setAttribute('cy', String(node.y));
        circle.setAttribute('r', String(radius));
        circle.setAttribute('fill', `${color}22`);
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', (isHovered || isFocused) ? '3' : '2');
        circle.setAttribute('filter', 'url(#glow)');
        circle.setAttribute('style', 'cursor: pointer;');
        circle.setAttribute('data-node-id', node.id);
        g.appendChild(circle);
      }

      // Label on hover
      if (isHovered || isFocused) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x));
        text.setAttribute('y', String(node.y - radius - 8));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#FAFAFA');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Space Grotesk, sans-serif');
        text.setAttribute('font-weight', '600');
        text.setAttribute('filter', 'url(#glow)');
        text.textContent = node.title.length > 30 ? node.title.slice(0, 28) + '\u2026' : node.title;
        g.appendChild(text);

        const catText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        catText.setAttribute('x', String(node.x));
        catText.setAttribute('y', String(node.y - radius - 22));
        catText.setAttribute('text-anchor', 'middle');
        catText.setAttribute('fill', color);
        catText.setAttribute('font-size', '9');
        catText.setAttribute('font-family', 'Space Grotesk, sans-serif');
        catText.setAttribute('font-weight', '700');
        catText.setAttribute('text-transform', 'uppercase');
        catText.setAttribute('letter-spacing', '0.1em');
        catText.textContent = node.category.toUpperCase();
        g.appendChild(catText);
      }
    }

    svg.appendChild(g);
  }, [hovered, dimensions, searchFocusId]);

  /* ---- Mouse handlers ---- */
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = cameraRef.current;
    return {
      x: (sx - cam.x) / cam.scale,
      y: (sy - cam.y) / cam.scale,
    };
  }, []);

  const findNodeAt = useCallback((wx: number, wy: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = Math.max(6, Math.min(20, 6 + n.connections * 2));
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy < (r + 5) * (r + 5)) return n;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const node = findNodeAt(world.x, world.y);

    if (node) {
      dragRef.current = {
        type: 'node',
        nodeId: node.id,
        startX: sx,
        startY: sy,
        startCamX: 0,
        startCamY: 0,
      };
      node.fx = node.x;
      node.fy = node.y;
      alphaRef.current = Math.max(alphaRef.current, 0.3);
    } else {
      dragRef.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        startCamX: cameraRef.current.x,
        startCamY: cameraRef.current.y,
      };
      setSelected(null);
    }
  }, [screenToWorld, findNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const drag = dragRef.current;

    if (drag.type === 'node' && drag.nodeId) {
      const world = screenToWorld(sx, sy);
      const node = nodesRef.current.find(n => n.id === drag.nodeId);
      if (node) {
        node.fx = world.x;
        node.fy = world.y;
        node.x = world.x;
        node.y = world.y;
      }
      return;
    }

    if (drag.type === 'pan') {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setCamera(c => ({ ...c, x: drag.startCamX + dx, y: drag.startCamY + dy }));
      return;
    }

    const world = screenToWorld(sx, sy);
    const node = findNodeAt(world.x, world.y);
    setHovered(node ? node.id : null);
  }, [screenToWorld, findNodeAt]);

  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag.type === 'node' && drag.nodeId) {
      const node = nodesRef.current.find(n => n.id === drag.nodeId);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
    }
    dragRef.current = { type: null, startX: 0, startY: 0, startCamX: 0, startCamY: 0 };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const node = findNodeAt(world.x, world.y);

    if (node) {
      setSelected({
        node,
        screenX: e.clientX,
        screenY: e.clientY,
      });
    }
  }, [screenToWorld, findNodeAt]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;

    setCamera(cam => {
      const newScale = Math.max(0.2, Math.min(5, cam.scale * scaleFactor));
      const wx = (sx - cam.x) / cam.scale;
      const wy = (sy - cam.y) / cam.scale;
      return {
        scale: newScale,
        x: sx - wx * newScale,
        y: sy - wy * newScale,
      };
    });
  }, []);

  /* ---- Resize ---- */
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ---- Reset view ---- */
  const resetView = useCallback(() => {
    setCamera({ x: 0, y: 0, scale: 1 });
    alphaRef.current = 0.5;
  }, []);

  /* ---- Toggle category ---- */
  const toggleCategory = useCallback((cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  /* ---- Connected docs for popover ---- */
  const connectedDocs = useMemo(() => {
    if (!selected) return [];
    return getConnectedDocs(selected.node.id);
  }, [selected, getConnectedDocs]);

  /* ---- Visible counts ---- */
  const visibleCount = nodesRef.current.length;
  const visibleEdgeCount = edgesRef.current.length;

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0a0f0c' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 flex items-center justify-between pointer-events-none bg-gradient-to-b from-bg-dark/80 to-transparent">
        <div className="pointer-events-auto">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Interactive</span>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>hub</span>
            Knowledge Graph
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {visibleCount} nodes · {visibleEdgeCount} connections
            {(search || hiddenCategories.size > 0) && (
              <span className="text-primary ml-1">(filtered)</span>
            )}
          </p>
        </div>

        {/* Search + Reset */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 16 }}>search</span>
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-bg-secondary/80 backdrop-blur border border-border text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-primary/40 w-48 transition-all"
            />
            {/* Search dropdown */}
            {search.length >= 2 && searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-bg-secondary/95 backdrop-blur-xl border border-border rounded-lg overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
                {searchResults.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      focusOnNode(n.id);
                      setSearch('');
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 border"
                      style={{ borderColor: getColor(n.category), background: `${getColor(n.category)}33` }}
                    />
                    <span className="text-foreground truncate">{n.title}</span>
                    <span className="text-foreground-muted/50 capitalize text-[10px] ml-auto shrink-0">{n.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={resetView}
            className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-foreground-muted hover:text-foreground hover:border-primary/30 transition-all"
          >
            <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 14 }}>center_focus_strong</span>
            Reset
          </button>
        </div>
      </div>

      {/* Legend with category toggles */}
      <div className="absolute bottom-20 md:bottom-6 left-6 z-20 bg-bg-secondary/80 backdrop-blur-md border border-border rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Categories</div>
        {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const isHidden = hiddenCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-2 text-xs w-full text-left transition-opacity ${isHidden ? 'opacity-30' : 'opacity-100'}`}
            >
              <div
                className="w-3 h-3 rounded-full border-2 transition-all"
                style={{
                  borderColor: isHidden ? '#555' : getColor(cat),
                  background: isHidden ? 'transparent' : `${getColor(cat)}22`,
                }}
              />
              <span className={`capitalize ${isHidden ? 'text-foreground-muted/40 line-through' : 'text-foreground-muted'}`}>{cat}</span>
              <span className="text-foreground-muted/50 ml-auto">{count}</span>
            </button>
          );
        })}
        {hiddenCategories.size > 0 && (
          <button
            onClick={() => setHiddenCategories(new Set())}
            className="text-[10px] text-primary hover:text-primary/80 mt-1 transition-colors"
          >
            Show all
          </button>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-20 md:bottom-6 right-6 z-20 flex flex-col gap-1">
        <button
          onClick={() => setCamera(c => ({ ...c, scale: Math.min(5, c.scale * 1.3) }))}
          className="w-9 h-9 rounded-lg bg-bg-secondary/80 backdrop-blur border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-primary/30 transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
        </button>
        <button
          onClick={() => setCamera(c => ({ ...c, scale: Math.max(0.2, c.scale * 0.7) }))}
          className="w-9 h-9 rounded-lg bg-bg-secondary/80 backdrop-blur border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-primary/30 transition-all"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>remove</span>
        </button>
      </div>

      {/* Selected node popover with backlinks */}
      {selected && (
        <div
          className="absolute z-30 bg-bg-secondary/95 backdrop-blur-xl border border-primary/20 rounded-xl p-4 shadow-2xl min-w-[260px] max-w-[340px] animate-fade-in"
          style={{
            left: Math.min(selected.screenX, dimensions.w - 360),
            top: Math.min(selected.screenY + 10, dimensions.h - 300),
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-sm font-bold text-foreground">{selected.node.title}</div>
              <div
                className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                style={{ color: getColor(selected.node.category) }}
              >
                {selected.node.category}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-foreground-muted hover:text-foreground"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>

          {selected.node.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {selected.node.tags.slice(0, 6).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-secondary-dark/40 text-primary/80 border border-primary/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-foreground-muted mb-3">
            <span>{selected.node.connections} connections</span>
          </div>

          {/* Connected documents / backlinks */}
          {connectedDocs.length > 0 && (
            <div className="border-t border-white/5 pt-2 mb-3">
              <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>link</span>
                Linked Documents
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {connectedDocs.map(doc => (
                  <Link
                    key={doc.id}
                    href={`/doc/${doc.id}`}
                    className="flex items-center gap-1.5 text-[11px] text-foreground-muted hover:text-primary transition-colors py-0.5"
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: getColor(doc.category) }}
                    />
                    <span className="truncate">{doc.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {selected.node.category === 'device' ? (
            <Link
              href={`/devices/${selected.node.id.replace('device:', '')}`}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
              Open Device
            </Link>
          ) : selected.node.category === 'scan' ? (
            (() => {
              // scan id format: "scan:device-id:scan-TIMESTAMP"
              const parts = selected.node.id.split(':');
              const deviceId = parts[1] || '';
              return (
                <Link
                  href={`/devices/${deviceId}`}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                  Open Device
                </Link>
              );
            })()
          ) : (
            <Link
              href={`/doc/${selected.node.id}`}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
              Open Document
            </Link>
          )}
        </div>
      )}

      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center z-40">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto mb-4" />
            <div className="text-sm text-foreground-muted">Building knowledge graph...</div>
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        onWheel={handleWheel}
      >
        <svg
          ref={svgRef}
          width={dimensions.w}
          height={dimensions.h}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          style={{ cursor: dragRef.current.type === 'pan' ? 'grabbing' : 'default' }}
        />
      </div>

      {/* Background ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(250,222,41,0.03) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
