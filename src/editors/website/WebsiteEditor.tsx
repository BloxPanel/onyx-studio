import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, SetStateAction } from 'react';
import type { BlockType, WebBlock, WebProject } from './websiteTypes';
import { createBlock, initialWebsite, DESIGN_WIDTH, DEFAULT_SECTION_HEIGHT } from './websiteTypes';
import { exportWebsite } from './websiteExporter';
import WebsiteStyleInspector from './WebsiteStyleInspector';
import './website.css';
const STORAGE_KEY = 'onyx-studio-website-v1';
const types: BlockType[] = ['section', 'heading', 'text', 'button', 'image', 'divider', 'card'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const numberOr = (value: number | undefined, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);
function findBlock(blocks: WebBlock[], id: string): WebBlock | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    const nested = findBlock(block.children, id);
    if (nested) return nested;
  }
  return undefined;
}
function modify(blocks: WebBlock[], id: string, change: (block: WebBlock) => WebBlock): WebBlock[] {
  return blocks.map(block => block.id === id ? change(block) : { ...block, children: modify(block.children, id, change) });
}
function remove(blocks: WebBlock[], id: string): WebBlock[] {
  return blocks.filter(block => block.id !== id).map(block => ({ ...block, children: remove(block.children, id) }));
}
function duplicate(blocks: WebBlock[], id: string): WebBlock[] {
  const index = blocks.findIndex(block => block.id === id);
  if (index >= 0) {
    const clone = (block: WebBlock): WebBlock => ({ ...block, id: crypto.randomUUID(), children: block.children.map(clone) });
    const result = [...blocks];
    result.splice(index + 1, 0, clone(result[index]));
    return result;
  }
  return blocks.map(block => ({ ...block, children: duplicate(block.children, id) }));
}
function move(blocks: WebBlock[], id: string, direction: -1 | 1): WebBlock[] {
  const index = blocks.findIndex(block => block.id === id);
  if (index >= 0) {
    const next = index + direction;
    if (next < 0 || next >= blocks.length) return blocks;
    const result = [...blocks];
    [result[index], result[next]] = [result[next], result[index]];
    return result;
  }
  return blocks.map(block => ({ ...block, children: move(block.children, id, direction) }));
}
function validBlock(value: unknown, depth = 0): value is WebBlock {
  if (depth > 8 || typeof value !== 'object' || value === null) return false;
  const block = value as Partial<WebBlock>;
  return typeof block.id === 'string' && types.includes(block.type as BlockType) &&
    typeof block.text === 'string' && typeof block.url === 'string' &&
    typeof block.color === 'string' && typeof block.background === 'string' &&
    typeof block.fontSize === 'number' && Number.isFinite(block.fontSize) &&
    typeof block.padding === 'number' && Number.isFinite(block.padding) &&
    ['left','center','right'].includes(block.align ?? '') && Array.isArray(block.children) &&
    block.children.length <= 500 && block.children.every(child => validBlock(child, depth + 1)) &&
    ['x','y','width','height','sectionHeight'].every(key => {
      const v = block[key as keyof WebBlock];
      return v === undefined || (typeof v === 'number' && Number.isFinite(v));
    });
}
function validProject(value: unknown): value is WebProject {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<WebProject>;
  return p.version === 1 && typeof p.title === 'string' && p.title.length <= 200 &&
    typeof p.background === 'string' && isHex(p.background) && Array.isArray(p.blocks) &&
    p.blocks.length <= 500 && p.blocks.every(block => validBlock(block));
}
function loadProject(): WebProject {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialWebsite;
    const parsed: unknown = JSON.parse(saved);
    return validProject(parsed) ? parsed : initialWebsite;
  } catch { return initialWebsite; }
}
function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Gesture = { id: string; sectionId: string; pointerId: number; kind: 'move' | 'resize'; startX: number; startY: number; x: number; y: number; width: number; height: number; sectionHeight: number; scale: number };
export default function WebsiteEditor() {
  const [project, setProject] = useState<WebProject>(loadProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<{
    sectionId: string; verticalX: number | null; horizontalY: number | null;
  } | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [canvasWidth, setCanvasWidth] = useState(DESIGN_WIDTH);
  const canvasHost = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const undoStack = useRef<WebProject[]>([]);
  const redoStack = useRef<WebProject[]>([]);
  const clipboard = useRef<WebBlock | null>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const gestureStart = useRef<WebProject | null>(null);
  function commitProject(change: SetStateAction<WebProject>) {
    const previous = projectRef.current;
    const next = typeof change === 'function' ? change(previous) : change;
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    undoStack.current.push(previous);
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
    projectRef.current = next;
    setProject(next);
  }
  function undo() {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(projectRef.current);
    projectRef.current = previous;
    setProject(previous);
    setSelectedId(null);
  }
  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(projectRef.current);
    projectRef.current = next;
    setProject(next);
    setSelectedId(null);
  }
  function deleteSelected() {
    const id = selectedRef.current;
    if (!id) return;
    commitProject(previous => ({ ...previous, blocks: remove(previous.blocks, id) }));
    setSelectedId(null);
  }
  function copySelected() {
    const id = selectedRef.current;
    const block = id ? findBlock(projectRef.current.blocks, id) : undefined;
    if (block) clipboard.current = structuredClone(block);
  }
  function pasteSelected() {
    const source = clipboard.current;
    if (!source) return;
    const clone = (block: WebBlock): WebBlock => ({ ...block, id: crypto.randomUUID(), children: block.children.map(clone) });
    const pasted = clone(source);
    if (source.type === 'section') {
      commitProject(previous => ({ ...previous, blocks: [...previous.blocks, pasted] }));
    } else {
      const sections = projectRef.current.blocks.filter(block => block.type === 'section');
      const target = sections.find(section => section.children.some(child => child.id === selectedRef.current)) ??
        sections.find(section => section.id === selectedRef.current) ?? sections[0];
      if (!target) return;
      pasted.x = clamp(numberOr(source.x, 100) + 20, 0, DESIGN_WIDTH - numberOr(source.width, 800));
      pasted.y = clamp(numberOr(source.y, 35) + 20, 0, numberOr(target.sectionHeight, DEFAULT_SECTION_HEIGHT) - numberOr(source.height, 80));
      commitProject(previous => ({ ...previous, blocks: modify(previous.blocks, target.id, section => ({ ...section, children: [...section.children, pasted] })) }));
    }
    setSelectedId(pasted.id);
  }
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      const editing = target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest('input, textarea, select, [contenteditable="true"]')));
      if (editing || event.altKey) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      else if (mod && (key === 'y' || (key === 'z' && event.shiftKey))) { event.preventDefault(); redo(); }
      else if (mod && key === 'c' && selectedRef.current) { event.preventDefault(); copySelected(); }
      else if (mod && key === 'v' && clipboard.current) { event.preventDefault(); pasteSelected(); }
      else if (!mod && (key === 'backspace' || key === 'delete') && selectedRef.current) { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); } catch (error) { console.warn('Autosave failed', error); } }, [project]);
  useEffect(() => {
    const host = canvasHost.current;
    if (!host) return;
    const observer = new ResizeObserver(() => setCanvasWidth(host.clientWidth));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);
  const selected = selectedId ? findBlock(project.blocks, selectedId) : undefined;
  const scale = Math.min(1, Math.max(0.1, Math.min(canvasWidth, device === 'mobile' ? 390 : DESIGN_WIDTH) / DESIGN_WIDTH));
  function updateSelected(changes: Partial<WebBlock>) {
    if (!selectedId) return;
    commitProject(previous => ({ ...previous, blocks: modify(previous.blocks, selectedId, block => ({ ...block, ...changes })) }));
  }
  function addBlock(type: BlockType) {
    const block = createBlock(type);
    const parent = selected?.type === 'section' ? selected : project.blocks.find(item => item.type === 'section');
    if (type === 'section' || !parent) {
      const section = type === 'section' ? block : { ...createBlock('section'), children: [block] };
      commitProject(previous => ({ ...previous, blocks: [...previous.blocks, section] }));
    } else {
      const index = parent.children.length;
      block.x = 100 + (index % 3) * 35;
      block.y = 35 + index * 85;
      block.width = type === 'card' ? 360 : type === 'button' ? 240 : 800;
      block.height = type === 'card' ? 310 : type === 'divider' ? 12 : type === 'heading' ? 90 : type === 'button' ? 70 : 100;
      const neededHeight = block.y + block.height + 35;
      commitProject(previous => ({ ...previous, blocks: modify(previous.blocks, parent.id, section => ({
        ...section, sectionHeight: Math.max(numberOr(section.sectionHeight, DEFAULT_SECTION_HEIGHT), neededHeight),
        children: [...section.children, block],
      })) }));
    }
    setSelectedId(block.id);
  }
  function beginGesture(event: ReactPointerEvent<HTMLDivElement>, block: WebBlock, section: WebBlock, kind: 'move' | 'resize') {
    if (event.button !== 0) return;
    event.stopPropagation(); event.preventDefault();
    setSelectedId(block.id);
    const rect = event.currentTarget.closest('.onyx-design-section')?.getBoundingClientRect();
    if (!rect) return;
    const actualScale = rect.width / DESIGN_WIDTH;
    gestureStart.current = projectRef.current;
    setAlignmentGuides(null);
    gesture.current = {
      id: block.id, sectionId: section.id, pointerId: event.pointerId, kind,
      startX: event.clientX, startY: event.clientY,
      x: numberOr(block.x, 100), y: numberOr(block.y, 35 + section.children.indexOf(block) * 110),
      width: numberOr(block.width, 800), height: numberOr(block.height, 80),
      sectionHeight: numberOr(section.sectionHeight, DEFAULT_SECTION_HEIGHT), scale: actualScale || 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const dx = (event.clientX - g.startX) / g.scale;
    const dy = (event.clientY - g.startY) / g.scale;
    let x = g.x, y = g.y, width = g.width, height = g.height;
    if (g.kind === 'move') {
      x = clamp(Math.round(g.x + dx), 0, Math.max(0, DESIGN_WIDTH - g.width));
      y = clamp(Math.round(g.y + dy), 0, Math.max(0, g.sectionHeight - g.height));
      const tolerance = 6;
      const section = findBlock(projectRef.current.blocks, g.sectionId);
      const siblings = section?.children.filter(block => block.id !== g.id) ?? [];
      type Snap = { position: number; guide: number; distance: number; priority: number };
      const horizontalCandidates: Snap[] = [];
      const verticalCandidates: Snap[] = [];
      const addX = (position: number, guide: number, priority: number) => {
        const distance = Math.abs(x - position);
        if (distance <= tolerance && position >= 0 && position <= DESIGN_WIDTH - g.width)
          horizontalCandidates.push({ position, guide, distance, priority });
      };
      const addY = (position: number, guide: number, priority: number) => {
        const distance = Math.abs(y - position);
        if (distance <= tolerance && position >= 0 && position <= g.sectionHeight - g.height)
          verticalCandidates.push({ position, guide, distance, priority });
      };
      // Keep the existing section-center snapping.
      addX((DESIGN_WIDTH - g.width) / 2, DESIGN_WIDTH / 2, 1);
      addY((g.sectionHeight - g.height) / 2, g.sectionHeight / 2, 1);
      // Align left/center/right and top/middle/bottom to other elements.
      for (const sibling of siblings) {
        const sx = numberOr(sibling.x, 100);
        const sy = numberOr(sibling.y, 35);
        const sw = numberOr(sibling.width, 800);
        const sh = numberOr(sibling.height, 80);
        for (const guide of [sx, sx + sw / 2, sx + sw]) {
          addX(guide, guide, 0);
          addX(guide - g.width / 2, guide, 0);
          addX(guide - g.width, guide, 0);
        }
        for (const guide of [sy, sy + sh / 2, sy + sh]) {
          addY(guide, guide, 0);
          addY(guide - g.height / 2, guide, 0);
          addY(guide - g.height, guide, 0);
        }
      }
      // Closest alignment wins; another element wins an exact tie with page center.
      const choose = (candidates: Snap[]) =>
        candidates.sort((a, b) => a.distance - b.distance || a.priority - b.priority)[0];
      const snapX = choose(horizontalCandidates);
      const snapY = choose(verticalCandidates);
      if (snapX) x = snapX.position;
      if (snapY) y = snapY.position;
      const verticalX = snapX?.guide ?? null;
      const horizontalY = snapY?.guide ?? null;
      setAlignmentGuides(previous => {
        if (previous?.sectionId === g.sectionId &&
          previous.verticalX === verticalX && previous.horizontalY === horizontalY) return previous;
        return verticalX !== null || horizontalY !== null
          ? { sectionId: g.sectionId, verticalX, horizontalY } : null;
      });
    } else {
      width = clamp(Math.round(g.width + dx), 40, DESIGN_WIDTH - g.x);
      height = clamp(Math.round(g.height + dy), 4, g.sectionHeight - g.y);
    }
    const next = { ...projectRef.current, blocks: modify(projectRef.current.blocks, g.id, block => ({ ...block, x, y, width, height })) };
    projectRef.current = next;
    setProject(next);
  }
  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    setAlignmentGuides(null);
    const start = gestureStart.current;
    gestureStart.current = null;
    if (start && JSON.stringify(start) !== JSON.stringify(projectRef.current)) {
      undoStack.current.push(start);
      if (undoStack.current.length > 100) undoStack.current.shift();
      redoStack.current = [];
    }
  }
  function renderElement(block: WebBlock, section: WebBlock, index: number) {
    const x = numberOr(block.x, 100);
    const y = numberOr(block.y, 35 + index * 110);
    const width = numberOr(block.width, 800);
    const height = numberOr(block.height, 80);
    const active = selectedId === block.id;
    const style: CSSProperties = {
      position: 'absolute', left: x, top: y, width, height, boxSizing: 'border-box',
      color: block.color, background: block.background, fontSize: block.fontSize,
      padding: block.padding, textAlign: block.align, overflow: 'hidden', overflowWrap: 'anywhere',
      fontFamily: block.fontFamily ?? 'Arial, sans-serif',
      fontWeight: block.fontWeight ?? (block.type === 'heading' ? 700 : 400),
      fontStyle: block.italic ? 'italic' : 'normal',
      textDecoration: block.underline ? 'underline' : 'none',
      borderRadius: block.borderRadius ?? (block.type === 'button' ? 8 : 0),
      border: `${block.borderWidth ?? 0}px solid ${block.borderColor ?? '#818cf8'}`,
      opacity: (block.opacity ?? 100) / 100,
      ...(block.type === 'divider' ? {
        background: 'transparent',
        border: 'none',
        padding: 0,
        overflow: 'visible' as const,
      } : {}),
    };
    return <div key={block.id} className={`onyx-free-block ${active ? 'active' : ''}`}
      style={style} onPointerDown={event => beginGesture(event, block, section, 'move')}
      onPointerMove={handlePointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}
      onClick={event => { event.stopPropagation(); setSelectedId(block.id); }}>
      {block.type === 'divider' && <div aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, top: '50%',
        height: Math.max(1, block.borderWidth ?? 2),
        transform: 'translateY(-50%)',
        background: block.borderColor ?? '#94a3b8',
        borderRadius: block.borderRadius ?? 0,
        pointerEvents: 'none',
      }} />}
      {block.type === 'card' && <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: block.cardGap ?? 12, minHeight: 0, textAlign: block.align }}>
        {block.cardShowIcon !== false && (block.cardIconUrl ? <img src={block.cardIconUrl} alt="" draggable={false} style={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0 }} /> : <span aria-hidden="true" style={{ fontSize: 30 }}>◆</span>)}
        <strong style={{ fontSize: 'inherit', fontWeight: block.fontWeight ?? 700, lineHeight: 1.2 }}>{block.text}</strong>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 400, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{block.cardDescription ?? ''}</p>
        {block.cardShowButton !== false && <span style={{ marginTop: 'auto', fontSize: 14, fontWeight: 600, color: '#a5b4fc' }}>{block.cardButtonText || 'Explore project'} →</span>}
      </div>}
      {block.type === 'heading' && <h2 style={{ margin: 0, fontSize: 'inherit', lineHeight: 1.2 }}>{block.text}</h2>}
      {block.type === 'text' && <p style={{ margin: 0, fontSize: 'inherit', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{block.text}</p>}
      {block.type === 'button' && <span className="onyx-preview-link">{block.text}</span>}
      {block.type === 'image' && (block.url ? <img src={block.url} alt={block.text} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} /> : <span>Enter an image URL</span>)}
      {active && <><span className="onyx-block-tag">{block.type}</span><div className="onyx-resize-handle"
        onPointerDown={event => { event.stopPropagation(); beginGesture(event, block, section, 'resize'); }} /></>}
    </div>;
  }
  function renderSection(section: WebBlock) {
    const height = numberOr(section.sectionHeight, DEFAULT_SECTION_HEIGHT);
    return <div key={section.id} className="onyx-section-shell" style={{ height: height * scale, background: section.background }}>
      <div className={`onyx-design-section ${selectedId === section.id ? 'section-active' : ''}`}
        style={{ width: DESIGN_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        onClick={event => { event.stopPropagation(); setSelectedId(section.id); }}>
        {section.children.map((child, index) => renderElement(child, section, index))}
        {alignmentGuides?.sectionId === section.id && alignmentGuides.verticalX !== null && alignmentGuides?.verticalX !== undefined && (
          <div aria-hidden="true" style={{ position: 'absolute', left: alignmentGuides.verticalX, top: 0, height: '100%', borderLeft: '1px solid #ff3535', pointerEvents: 'none', zIndex: 1000 }} />
        )}
        {alignmentGuides?.sectionId === section.id && alignmentGuides.horizontalY !== null && alignmentGuides?.horizontalY !== undefined && (
          <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: alignmentGuides.horizontalY, width: '100%', borderTop: '1px solid #ff3535', pointerEvents: 'none', zIndex: 1000 }} />
        )}
        {selectedId === section.id && <span className="onyx-section-tag">SECTION  -  {height}px</span>}
      </div>
    </div>;
  }
  async function openProject(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error('Project exceeds 2 MB.');
      const parsed: unknown = JSON.parse(await file.text());
      if (!validProject(parsed)) throw new Error('Unsupported or invalid .onyx project.');
      if (!window.confirm('Replace the current website with this project?')) return;
      setProject(parsed); projectRef.current = parsed; undoStack.current = []; redoStack.current = []; setSelectedId(null);
    } catch (error) { alert(error instanceof Error ? error.message : 'Unable to load project.'); }
  }
  const inputColor = (value: string) => isHex(value) ? value : '#172033';
  return <div className="website-editor">
    <div className="website-toolbar">
      <strong>ONYX - Website Studio</strong>
      <div className="website-actions">
        <button onClick={() => setDevice('desktop')}>Desktop</button>
        <button onClick={() => setDevice('mobile')}>Mobile</button>
        <button onClick={() => download('website.onyx', JSON.stringify(project, null, 2), 'application/json')}>Save Project</button>
        <button onClick={() => fileInput.current?.click()}>Open Project</button>
        <button onClick={() => download('index.html', exportWebsite(project), 'text/html')}>Export HTML</button>
        <input hidden ref={fileInput} type="file" accept=".onyx,.json" onChange={event => {
          const file = event.target.files?.[0]; if (file) void openProject(file); event.target.value = '';
        }} />
      </div>
    </div>
    <div className="website-layout">
      <aside className="website-library">
        <h3>Components</h3>
        <p className="website-muted">Select a section, then add elements inside it.</p>
        {types.map(type => <button key={type} className="website-library-item" onClick={() => addBlock(type)}>+ {type[0].toUpperCase() + type.slice(1)}</button>)}
        <p className="website-muted">Drag to move; resize from the corner. Ctrl+Z/Y undo/redo, Ctrl+C/V copy/paste, Backspace deletes. Shortcuts work outside text fields.</p>
      </aside>
      <main className="website-canvas-area" onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
        <div className="website-canvas-label">{device === 'desktop' ? 'Desktop' : 'Mobile'} - Click, drag, and resize - {Math.round(scale * 100)}% zoom</div>
        <div ref={canvasHost} className="website-canvas-host" onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <div className="website-canvas" style={{ width: DESIGN_WIDTH * scale, background: project.background }}
            onClick={() => setSelectedId(null)}>
            {project.blocks.filter(block => block.type === 'section').map(renderSection)}
            {project.blocks.length === 0 && <div className="website-empty-canvas">Add a section to begin.</div>}
          </div>
        </div>
      </main>
      <aside className="website-inspector">
        <h3>Properties</h3>
        {!selected ? <>
          <label>Website Title</label><input value={project.title} onChange={event => commitProject(previous => ({ ...previous, title: event.target.value }))} />
          <label>Page Background</label><input type="color" value={inputColor(project.background)} onChange={event => commitProject(previous => ({ ...previous, background: event.target.value }))} />
          <p className="website-muted">Select an element or section to customize it.</p>
        </> : <>
          <strong>{selected.type.toUpperCase()}</strong>
          {selected.type !== 'section' && selected.type !== 'divider' && <>
            <label>{selected.type === 'image' ? 'Alt Text' : selected.type === 'card' ? 'Card Title' : 'Content'}</label>
            <textarea rows={3} value={selected.text} onChange={event => updateSelected({ text: event.target.value })} />
          </>}
          {(selected.type === 'button' || selected.type === 'image') && <>
            <label>{selected.type === 'image' ? 'Image URL' : 'Link URL'}</label>
            <input value={selected.url} onChange={event => updateSelected({ url: event.target.value })} />
          </>}
          {selected.type === 'card' && <>
            <label>Card Description</label>
            <textarea rows={4} value={selected.cardDescription ?? ''} onChange={event => updateSelected({ cardDescription: event.target.value })} />
            <label>Icon Image URL</label>
            <input value={selected.cardIconUrl ?? ''} onChange={event => updateSelected({ cardIconUrl: event.target.value })} placeholder="https://.../icon.svg" />
            <label><input type="checkbox" checked={selected.cardShowIcon !== false} onChange={event => updateSelected({ cardShowIcon: event.target.checked })} /> Show Icon</label>
            <label>Button Text</label>
            <input value={selected.cardButtonText ?? ''} onChange={event => updateSelected({ cardButtonText: event.target.value })} />
            <label>Button Link URL</label>
            <input value={selected.url} onChange={event => updateSelected({ url: event.target.value })} placeholder="https://..." />
            <label><input type="checkbox" checked={selected.cardShowButton !== false} onChange={event => updateSelected({ cardShowButton: event.target.checked })} /> Show Button</label>
            <label>Content Spacing - {selected.cardGap ?? 12}px</label>
            <input type="range" min="0" max="40" value={selected.cardGap ?? 12} onChange={event => updateSelected({ cardGap: Number(event.target.value) })} />
          </>}
          {selected.type === 'divider' ? <>
            <label>Line Color</label>
            <input type="color" value={inputColor(selected.borderColor ?? '#94a3b8')}
              onChange={event => updateSelected({ borderColor: event.target.value })} />
            <label>Line Thickness - {selected.borderWidth ?? 2}px</label>
            <input type="range" min="1" max="16" value={selected.borderWidth ?? 2}
              onChange={event => updateSelected({ borderWidth: Number(event.target.value) })} />
            <label>Rounded Ends - {selected.borderRadius ?? 0}px</label>
            <input type="range" min="0" max="12" value={selected.borderRadius ?? 0}
              onChange={event => updateSelected({ borderRadius: Number(event.target.value) })} />
          </> : <>
          <label>Text Color</label><input type="color" value={inputColor(selected.color)} onChange={event => updateSelected({ color: event.target.value })} />
          <label>Background Color</label><input type="color" value={inputColor(selected.background)} onChange={event => updateSelected({ background: event.target.value })} />
          <label>Font Size - {selected.fontSize}px</label><input type="range" min="10" max="96" value={selected.fontSize} onChange={event => updateSelected({ fontSize: Number(event.target.value) })} />
          <label>Padding - {selected.padding}px</label><input type="range" min="0" max="120" value={selected.padding} onChange={event => updateSelected({ padding: Number(event.target.value) })} />
          <WebsiteStyleInspector block={selected} onChange={updateSelected} />
          <label>Alignment</label><select value={selected.align} onChange={event => updateSelected({ align: event.target.value as WebBlock['align'] })}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          </>}
          {selected.type === 'section' ? <>
            <label>Section Height  -  {numberOr(selected.sectionHeight, DEFAULT_SECTION_HEIGHT)}px</label>
            <input type="range" min="120" max="1600" step="10" value={numberOr(selected.sectionHeight, DEFAULT_SECTION_HEIGHT)}
              onChange={event => updateSelected({ sectionHeight: Number(event.target.value) })} />
          </> : <>
            <div className="onyx-coordinate-grid">
              {(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>{key.toUpperCase()}
                <input type="number" min="0" value={Math.round(numberOr(selected[key], key === 'x' ? 100 : key === 'y' ? 35 : key === 'width' ? 800 : 80))}
                  onChange={event => updateSelected({ [key]: Math.max(0, Number(event.target.value) || 0) })} />
              </label>)}
            </div>
          </>}
          <div className="website-inspector-actions">
            <button onClick={() => commitProject(previous => ({ ...previous, blocks: move(previous.blocks, selected.id, -1) }))}>Move Up</button>
            <button onClick={() => commitProject(previous => ({ ...previous, blocks: move(previous.blocks, selected.id, 1) }))}>Move Down</button>
            <button onClick={() => commitProject(previous => ({ ...previous, blocks: duplicate(previous.blocks, selected.id) }))}>Duplicate</button>
            <button onClick={() => { commitProject(previous => ({ ...previous, blocks: remove(previous.blocks, selected.id) })); setSelectedId(null); }}>Delete</button>
          </div>
        </>}
      </aside>
    </div>
  </div>;
}


