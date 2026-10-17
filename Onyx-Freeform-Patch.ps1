$ErrorActionPreference = 'Stop'
$root = Get-Location
$editorPath = Join-Path $root 'src\editors\website\WebsiteEditor.tsx'
$typesPath = Join-Path $root 'src\editors\website\websiteTypes.ts'
$exportPath = Join-Path $root 'src\editors\website\websiteExporter.ts'
$cssPath = Join-Path $root 'src\editors\website\website.css'
$discordPath = Join-Path $root 'src\editors\discord\DiscordEditor.tsx'
foreach ($path in @($editorPath, $typesPath, $exportPath, $cssPath, $discordPath)) {
  if (!(Test-Path $path)) { throw "Missing $path. Run from the Onyx Studio root." }
}
$backupSuffix = '.before-freeform.bak'
foreach ($path in @($editorPath, $typesPath, $exportPath, $cssPath)) {
  Copy-Item $path ($path + $backupSuffix) -Force
}
@'
export type BlockType = 'section' | 'heading' | 'text' | 'button' | 'image';
export type Align = 'left' | 'center' | 'right';
export interface WebBlock {
  id: string;
  type: BlockType;
  text: string;
  url: string;
  color: string;
  background: string;
  fontSize: number;
  padding: number;
  align: Align;
  children: WebBlock[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  sectionHeight?: number;
}
export interface WebProject {
  version: 1;
  title: string;
  background: string;
  blocks: WebBlock[];
}
export const DESIGN_WIDTH = 1000;
export const DEFAULT_SECTION_HEIGHT = 440;
export const createBlock = (type: BlockType): WebBlock => ({
  id: crypto.randomUUID(), type,
  text: { section: '', heading: 'Your heading', text: 'Write something amazing.', button: 'Get Started', image: 'Image description' }[type],
  url: '', color: '#ffffff',
  background: type === 'section' ? '#172033' : type === 'button' ? '#6366f1' : 'transparent',
  fontSize: type === 'heading' ? 42 : 16,
  padding: type === 'section' ? 24 : 12,
  align: 'center', children: [],
  x: 100, y: 50,
  width: type === 'button' ? 240 : type === 'image' ? 400 : 800,
  height: type === 'heading' ? 90 : type === 'text' ? 100 : type === 'button' ? 70 : 240,
  sectionHeight: type === 'section' ? DEFAULT_SECTION_HEIGHT : undefined,
});
export const initialWebsite: WebProject = {
  version: 1, title: 'My Website', background: '#0b1020',
  blocks: [{ ...createBlock('section'), children: [
    { ...createBlock('heading'), text: 'Built with Onyx Studio', x: 100, y: 55, width: 800, height: 90 },
    { ...createBlock('text'), text: 'Create your website visually. Own every line of the result.', x: 150, y: 175, width: 700, height: 75 },
    { ...createBlock('button'), text: 'Explore Projects', url: 'https://builtbybuzz.dev', x: 370, y: 295, width: 260, height: 70 },
  ] }],
};
'@ | Set-Content -Encoding UTF8 $typesPath
@'
import type { WebBlock, WebProject } from './websiteTypes';
import { DESIGN_WIDTH, DEFAULT_SECTION_HEIGHT } from './websiteTypes';
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character] ?? character);
const safeUrl = (value: string, image = false): string => {
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol) || (!image && url.protocol === 'mailto:')) return escapeHtml(value);
  } catch { /* Invalid URLs become inert links. */ }
  return image ? '' : '#';
};
const validColor = (value: string) => /^(#[0-9a-fA-F]{3,8}|transparent)$/.test(value) ? value : 'transparent';
const clamp = (n: number | undefined, fallback: number, min: number, max: number) =>
  Math.max(min, Math.min(max, typeof n === 'number' && Number.isFinite(n) ? n : fallback));
function renderElement(block: WebBlock, index: number): string {
  const x = clamp(block.x, 100, 0, DESIGN_WIDTH - 40);
  const y = clamp(block.y, 35 + index * 110, 0, 20000);
  const width = clamp(block.width, 800, 40, DESIGN_WIDTH - x);
  const height = clamp(block.height, 80, 32, 20000);
  const base = `position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;box-sizing:border-box;overflow:hidden;`;
  const style = `${base}color:${validColor(block.color)};background:${validColor(block.background)};font-size:${clamp(block.fontSize,16,10,96)}px;padding:${clamp(block.padding,12,0,120)}px;text-align:${block.align};overflow-wrap:anywhere;`;
  const text = escapeHtml(block.text);
  switch (block.type) {
    case 'heading': return `<h2 style="${style}margin:0;line-height:1.2">${text}</h2>`;
    case 'text': return `<p style="${style}margin:0;line-height:1.5;white-space:pre-wrap">${text}</p>`;
    case 'button': return `<a href="${safeUrl(block.url)}" style="${style}display:flex;align-items:center;justify-content:center;text-decoration:none;border-radius:8px;font-weight:600">${text}</a>`;
    case 'image': {
      const src = safeUrl(block.url, true);
      return src ? `<img src="${src}" alt="${text}" style="${base}object-fit:contain;padding:${clamp(block.padding,12,0,120)}px" />` : '';
    }
    case 'section': return '';
  }
}
function renderSection(section: WebBlock): string {
  const height = clamp(section.sectionHeight, DEFAULT_SECTION_HEIGHT, 120, 20000);
  const background = validColor(section.background);
  return `<section style="background:${background}"><div class="onyx-section" style="height:${height}px">${section.children.map(renderElement).join('\n')}</div></section>`;
}
export function exportWebsite(project: WebProject): string {
  return `<!-- Generated with Onyx Studio | https://builtbybuzz.dev -->
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(project.title)}</title>
<style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${validColor(project.background)};color:white;font-family:system-ui,sans-serif}
section{width:100%;overflow:hidden}.onyx-section{position:relative;width:${DESIGN_WIDTH}px;margin:auto;transform-origin:top center}
@media(max-width:1000px){.onyx-section{margin-left:0;margin-right:0;transform-origin:top left}}
</style>
</head>
<body>
${project.blocks.filter(block => block.type === 'section').map(renderSection).join('\n')}
<script>
(function(){
  const width=${DESIGN_WIDTH};
  function resize(){
    const scale=Math.min(1,document.documentElement.clientWidth/width);
    document.querySelectorAll('.onyx-section').forEach(section=>{
      const designHeight=parseFloat(section.style.height);
      section.style.transform='scale('+scale+')';
      section.parentElement.style.height=(designHeight*scale)+'px';
    });
  }
  window.addEventListener('resize',resize);
  resize();
})();
</script>
</body>
</html>`;
}
'@ | Set-Content -Encoding UTF8 $exportPath
@'
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { BlockType, WebBlock, WebProject } from './websiteTypes';
import { createBlock, initialWebsite, DESIGN_WIDTH, DEFAULT_SECTION_HEIGHT } from './websiteTypes';
import { exportWebsite } from './websiteExporter';
import './website.css';
const STORAGE_KEY = 'onyx-studio-website-v1';
const types: BlockType[] = ['section', 'heading', 'text', 'button', 'image'];
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
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [canvasWidth, setCanvasWidth] = useState(DESIGN_WIDTH);
  const canvasHost = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const gesture = useRef<Gesture | null>(null);
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
    setProject(previous => ({ ...previous, blocks: modify(previous.blocks, selectedId, block => ({ ...block, ...changes })) }));
  }
  function addBlock(type: BlockType) {
    const block = createBlock(type);
    const parent = selected?.type === 'section' ? selected : project.blocks.find(item => item.type === 'section');
    if (type === 'section' || !parent) {
      const section = type === 'section' ? block : { ...createBlock('section'), children: [block] };
      setProject(previous => ({ ...previous, blocks: [...previous.blocks, section] }));
    } else {
      const index = parent.children.length;
      block.x = 100 + (index % 3) * 35;
      block.y = 35 + index * 85;
      block.width = type === 'button' ? 240 : 800;
      block.height = type === 'heading' ? 90 : type === 'button' ? 70 : 100;
      const neededHeight = block.y + block.height + 35;
      setProject(previous => ({ ...previous, blocks: modify(previous.blocks, parent.id, section => ({
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
      x = clamp(Math.round(g.x + dx), 0, DESIGN_WIDTH - g.width);
      y = clamp(Math.round(g.y + dy), 0, g.sectionHeight - g.height);
    } else {
      width = clamp(Math.round(g.width + dx), 40, DESIGN_WIDTH - g.x);
      height = clamp(Math.round(g.height + dy), 32, g.sectionHeight - g.y);
    }
    setProject(previous => ({ ...previous, blocks: modify(previous.blocks, g.id, block => ({ ...block, x, y, width, height })) }));
  }
  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId === event.pointerId) gesture.current = null;
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
    };
    return <div key={block.id} className={`onyx-free-block ${active ? 'active' : ''}`}
      style={style} onPointerDown={event => beginGesture(event, block, section, 'move')}
      onPointerMove={handlePointerMove} onPointerUp={endGesture} onPointerCancel={endGesture}
      onClick={event => { event.stopPropagation(); setSelectedId(block.id); }}>
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
        {selectedId === section.id && <span className="onyx-section-tag">SECTION · {height}px</span>}
      </div>
    </div>;
  }
  async function openProject(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error('Project exceeds 2 MB.');
      const parsed: unknown = JSON.parse(await file.text());
      if (!validProject(parsed)) throw new Error('Unsupported or invalid .onyx project.');
      if (!window.confirm('Replace the current website with this project?')) return;
      setProject(parsed); setSelectedId(null);
    } catch (error) { alert(error instanceof Error ? error.message : 'Unable to load project.'); }
  }
  const inputColor = (value: string) => isHex(value) ? value : '#172033';
  return <div className="website-editor">
    <div className="website-toolbar">
      <strong>◆ ONYX · Website Studio</strong>
      <div className="website-actions">
        <button onClick={() => setDevice('desktop')}>Desktop</button>
        <button onClick={() => setDevice('mobile')}>Mobile</button>
        <button onClick={() => download('website.onyx', JSON.stringify(project, null, 2), 'application/json')}>Save Project</button>
        <button onClick={() => fileInput.current?.click()}>Open Project</button>
        <button onClick={() => download('index.html', exportWebsite(project), 'text/html')}>Export HTML ↓</button>
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
        <p className="website-muted">Drag elements to move them. Select an element to reveal its resize handle.</p>
      </aside>
      <main className="website-canvas-area">
        <div className="website-canvas-label">{device === 'desktop' ? 'Desktop' : 'Mobile'} · Click, drag, and resize · {Math.round(scale * 100)}% zoom</div>
        <div ref={canvasHost} className="website-canvas-host">
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
          <label>Website Title</label><input value={project.title} onChange={event => setProject(previous => ({ ...previous, title: event.target.value }))} />
          <label>Page Background</label><input type="color" value={inputColor(project.background)} onChange={event => setProject(previous => ({ ...previous, background: event.target.value }))} />
          <p className="website-muted">Select an element or section to customize it.</p>
        </> : <>
          <strong>{selected.type.toUpperCase()}</strong>
          {selected.type !== 'section' && <>
            <label>{selected.type === 'image' ? 'Alt Text' : 'Content'}</label>
            <textarea rows={3} value={selected.text} onChange={event => updateSelected({ text: event.target.value })} />
          </>}
          {(selected.type === 'button' || selected.type === 'image') && <>
            <label>{selected.type === 'image' ? 'Image URL' : 'Link URL'}</label>
            <input value={selected.url} onChange={event => updateSelected({ url: event.target.value })} />
          </>}
          <label>Text Color</label><input type="color" value={inputColor(selected.color)} onChange={event => updateSelected({ color: event.target.value })} />
          <label>Background Color</label><input type="color" value={inputColor(selected.background)} onChange={event => updateSelected({ background: event.target.value })} />
          <label>Font Size — {selected.fontSize}px</label><input type="range" min="10" max="96" value={selected.fontSize} onChange={event => updateSelected({ fontSize: Number(event.target.value) })} />
          <label>Padding — {selected.padding}px</label><input type="range" min="0" max="120" value={selected.padding} onChange={event => updateSelected({ padding: Number(event.target.value) })} />
          <label>Alignment</label><select value={selected.align} onChange={event => updateSelected({ align: event.target.value as WebBlock['align'] })}>
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
          </select>
          {selected.type === 'section' ? <>
            <label>Section Height — {numberOr(selected.sectionHeight, DEFAULT_SECTION_HEIGHT)}px</label>
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
            <button onClick={() => setProject(previous => ({ ...previous, blocks: move(previous.blocks, selected.id, -1) }))}>↑ Order</button>
            <button onClick={() => setProject(previous => ({ ...previous, blocks: move(previous.blocks, selected.id, 1) }))}>↓ Order</button>
            <button onClick={() => setProject(previous => ({ ...previous, blocks: duplicate(previous.blocks, selected.id) }))}>Duplicate</button>
            <button onClick={() => { setProject(previous => ({ ...previous, blocks: remove(previous.blocks, selected.id) })); setSelectedId(null); }}>Delete</button>
          </div>
        </>}
      </aside>
    </div>
  </div>;
}
'@ | Set-Content -Encoding UTF8 $editorPath
@'
.website-editor{min-height:100vh;background:#0e111a;color:#eef0f8;font-family:system-ui,sans-serif}
.website-editor button{cursor:pointer}
.website-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 24px;border-bottom:1px solid #303648}
.website-actions{display:flex;flex-wrap:wrap;gap:8px}
.website-actions button,.website-inspector-actions button{border:1px solid #40465c;background:#232a3b;color:#fff;padding:9px 12px;border-radius:7px}
.website-layout{display:grid;grid-template-columns:215px minmax(0,1fr) 270px;min-height:calc(100vh - 130px)}
.website-library,.website-inspector{padding:20px;background:#151a27}
.website-library{border-right:1px solid #303648}.website-inspector{border-left:1px solid #303648}
.website-muted{font-size:12px;color:#a4abc1;line-height:1.5}
.website-library-item{display:block;width:100%;text-align:left;background:#242b3e;border:1px solid #3b435a;color:white;border-radius:8px;padding:12px;margin:10px 0}
.website-library-item:hover{background:#343e58}
.website-canvas-area{padding:22px;min-width:0;overflow:auto}
.website-canvas-label{font-size:13px;color:#b2bad0;margin-bottom:14px}
.website-canvas-host{width:100%;min-width:0}
.website-canvas{margin:0 auto;min-height:200px;border:1px solid #444b60;border-radius:10px;overflow:hidden;box-shadow:0 15px 45px #0005}
.onyx-section-shell{position:relative;width:100%;overflow:hidden}
.onyx-design-section{position:relative;cursor:default;user-select:none;touch-action:none}
.onyx-design-section.section-active{outline:3px solid #818cf8;outline-offset:-3px}
.onyx-free-block{border:2px solid transparent;cursor:grab;touch-action:none;user-select:none}
.onyx-free-block:hover{border-color:#7c83c8}.onyx-free-block.active{border-color:#818cf8;cursor:move}
.onyx-free-block img{pointer-events:none}
.onyx-preview-link{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:600}
.onyx-block-tag,.onyx-section-tag{position:absolute;top:0;right:0;background:#6366f1;color:white;font-size:11px;padding:3px 8px;z-index:2;pointer-events:none}
.onyx-resize-handle{position:absolute;right:0;bottom:0;width:17px;height:17px;background:#fff;border:3px solid #6366f1;cursor:nwse-resize;z-index:3;touch-action:none}
.website-empty-canvas{padding:30px;text-align:center;color:#a4abc1}
.website-inspector label{display:block;margin-top:18px;margin-bottom:7px;font-size:13px}
.website-inspector input:not([type=color]):not([type=range]),.website-inspector textarea,.website-inspector select{width:100%;background:#0e1320;border:1px solid #424a60;color:white;padding:10px;border-radius:7px}
.website-inspector input[type=color]{width:100%;height:38px}.website-inspector input[type=range]{width:100%}
.website-inspector-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:25px}
.onyx-coordinate-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.onyx-coordinate-grid label{margin-top:10px}
@media(max-width:1000px){.website-layout{grid-template-columns:180px minmax(0,1fr)}.website-inspector{grid-column:1/-1;border-top:1px solid #303648}}
@media(max-width:650px){.website-layout{display:block}.website-library{border-right:0}.website-canvas-area{padding:12px}}
'@ | Set-Content -Encoding UTF8 $cssPath
Write-Host 'Freeform editor installed. Building...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed. Backups were kept. Do not push.' }
Write-Host 'BUILD PASSED. Run npm run dev and test before pushing.' -ForegroundColor Green
