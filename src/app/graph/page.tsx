'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
  // Group by category, lay out in rough clusters
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

  // Center gravity
  const cx = w / 2;
  const cy = h / 2;
  const GRAVITY = 0.01 * alpha;

  for (const node of nodes) {
    if (node.fx != null) { node.x = node.fx; node.vx = 0; }
    if (node.fy != null) { node.y = node.fy; node.vy = 0; }

    // Gravity toward center
    node.vx += (cx - node.x) * GRAVITY;
    node.vy += (cy - node.y) * GRAVITY;
  }

  // Repulsion between all nodes (Barnes-Hut would be better, but N is small enough)
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

  // Spring force along edges
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

  // Apply velocity with damping
  const DAMPING = 0.85;
  for (const node of nodes) {
    if (node.fx != null && node.fy != null) continue;
    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.x += node.vx;
    node.y += node.vy;
    // Bounds
    node.x = Math.max(40, Math.min(w - 40, node.x));
    node.y = Math.max(40, Math.min(h - 40, node.y));
  }
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function GraphPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animRef = useRef<number>(0);
  const alphaRef = useRef(1);

  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });

  // Camera state for zoom/pan
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Drag state
  const dragRef = useRef<{
    type: 'node' | 'pan' | null;
    nodeId?: string;
    startX: number;
    startY: number;
    startCamX: number;
    startCamY: number;
  }>({ type: null, startX: 0, startY: 0, startCamX: 0, startCamY: 0 });

  // Stats for legend
  const [stats, setStats] = useState<Record<string, number>>({});

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

        // Count per category
        const counts: Record<string, number> = {};
        nodes.forEach((n: GraphNode) => {
          counts[n.category] = (counts[n.category] || 0) + 1;
        });
        setStats(counts);
        setLoaded(true);

        // Center camera
        setCamera({ x: 0, y: 0, scale: 1 });
      })
      .catch(console.error);
  }, []);

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
        alphaRef.current *= 0.995; // cool down
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

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Defs for filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Glow filter
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

    // Edge glow filter
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

    // Draw edges
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

      // Highlight edges connected to hovered node
      if (hovered && (edge.source === hovered || edge.target === hovered)) {
        line.setAttribute('stroke', 'rgba(250,222,41,0.6)');
        line.setAttribute('stroke-width', '2.5');
      }

      g.appendChild(line);
    }

    // Draw nodes
    for (const node of nodes) {
      const color = getColor(node.category);
      const glowColor = getGlow(node.category);
      const isHovered = hovered === node.id;
      const baseRadius = Math.max(6, Math.min(20, 6 + node.connections * 2));
      const radius = isHovered ? baseRadius * 1.3 : baseRadius;

      // Ambient glow circle
      const glowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glowCircle.setAttribute('cx', String(node.x));
      glowCircle.setAttribute('cy', String(node.y));
      glowCircle.setAttribute('r', String(radius * 2));
      glowCircle.setAttribute('fill', isHovered ? glowColor : 'transparent');
      glowCircle.setAttribute('opacity', '0.3');
      g.appendChild(glowCircle);

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(node.x));
      circle.setAttribute('cy', String(node.y));
      circle.setAttribute('r', String(radius));
      circle.setAttribute('fill', `${color}22`);
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', isHovered ? '3' : '2');
      circle.setAttribute('filter', 'url(#glow)');
      circle.setAttribute('style', 'cursor: pointer;');
      circle.setAttribute('data-node-id', node.id);
      g.appendChild(circle);

      // Label on hover
      if (isHovered) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(node.x));
        text.setAttribute('y', String(node.y - radius - 8));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#FAFAFA');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Space Grotesk, sans-serif');
        text.setAttribute('font-weight', '600');
        text.setAttribute('filter', 'url(#glow)');
        text.textContent = node.title.length > 30 ? node.title.slice(0, 28) + '…' : node.title;
        g.appendChild(text);

        // Category label
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
  }, [hovered, dimensions]);

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

    // Hover detection
    const world = screenToWorld(sx, sy);
    const node = findNodeAt(world.x, world.y);
    setHovered(node ? node.id : null);
  }, [screenToWorld, findNodeAt]);

  const handleMouseUp = useCallback(() => {
    const drag = dragRef.current;
    if (drag.type === 'node' && drag.nodeId) {
      const node = nodesRef.current.find(n => n.id === drag.nodeId);
      if (node) {
        // Check if it was a click (not a drag)
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
      // Zoom toward mouse position
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
    alphaRef.current = 0.5; // reheat
  }, []);

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
            {nodesRef.current.length} documents · {edgesRef.current.length} connections
          </p>
        </div>
        <button
          onClick={resetView}
          className="pointer-events-auto px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-foreground-muted hover:text-foreground hover:border-primary/30 transition-all"
        >
          <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 14 }}>center_focus_strong</span>
          Reset View
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-20 md:bottom-6 left-6 z-20 bg-bg-secondary/80 backdrop-blur-md border border-border rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Categories</div>
        {Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: getColor(cat), background: `${getColor(cat)}22` }}
            />
            <span className="text-foreground-muted capitalize">{cat}</span>
            <span className="text-foreground-muted/50 ml-auto">{count}</span>
          </div>
        ))}
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

      {/* Selected node popover */}
      {selected && (
        <div
          className="absolute z-30 bg-bg-secondary/95 backdrop-blur-xl border border-primary/20 rounded-xl p-4 shadow-2xl min-w-[240px] max-w-[320px] animate-fade-in"
          style={{
            left: Math.min(selected.screenX, dimensions.w - 340),
            top: Math.min(selected.screenY + 10, dimensions.h - 200),
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

          <Link
            href={`/doc/${selected.node.id}`}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            Open Document
          </Link>
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
