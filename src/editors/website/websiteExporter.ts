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
const fontFamily = (value: string | undefined): string => {
  const allowed = ['Arial, sans-serif', 'Georgia, serif', 'Verdana, sans-serif',
    'Tahoma, sans-serif', 'Trebuchet MS, sans-serif', 'Courier New, monospace',
    'system-ui, sans-serif'];
  return allowed.includes(value ?? '') ? value! : 'Arial, sans-serif';
};
function renderElement(block: WebBlock, index: number): string {
  const x = clamp(block.x, 100, 0, DESIGN_WIDTH - 40);
  const y = clamp(block.y, 35 + index * 110, 0, 20000);
  const width = clamp(block.width, 800, 40, DESIGN_WIDTH - x);
  const height = clamp(block.height, 80, 4, 20000);
  const base = `position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;box-sizing:border-box;overflow:hidden;`;
  const style = `${base}color:${validColor(block.color)};background:${validColor(block.background)};font-size:${clamp(block.fontSize,16,10,96)}px;padding:${clamp(block.padding,12,0,120)}px;text-align:${block.align};overflow-wrap:anywhere;` +
    `font-family:${fontFamily(block.fontFamily)};font-weight:${block.fontWeight ?? (block.type === 'heading' ? 700 : 400)};font-style:${block.italic ? 'italic' : 'normal'};text-decoration:${block.underline ? 'underline' : 'none'};` +
    `border-radius:${clamp(block.borderRadius,block.type === 'button' ? 8 : 0,0,100)}px;border:${clamp(block.borderWidth,0,0,16)}px solid ${validColor(block.borderColor ?? '#818cf8')};opacity:${clamp(block.opacity,100,0,100) / 100};`;
  const text = escapeHtml(block.text);
  switch (block.type) {
    case 'divider': return `<div aria-hidden="true" style="${base}background:transparent;overflow:visible;opacity:${clamp(block.opacity,100,0,100) / 100}"><div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:${clamp(block.borderWidth,2,1,16)}px;background:${validColor(block.borderColor ?? '#94a3b8')};border-radius:${clamp(block.borderRadius,0,0,12)}px"></div></div>`;
    case 'card': {
      const icon = safeUrl(block.cardIconUrl ?? '', true);
      const iconHtml = block.cardShowIcon === false ? '' : icon
        ? `<img src="${icon}" alt="" style="width:42px;height:42px;object-fit:contain;flex-shrink:0" />`
        : `<span aria-hidden="true" style="font-size:30px">&#9670;</span>`;
      const description = escapeHtml(block.cardDescription ?? '');
      const buttonText = escapeHtml(block.cardButtonText || 'Explore project');
      const button = block.cardShowButton === false ? '' : `<a href="${safeUrl(block.url)}" style="margin-top:auto;font-size:14px;font-weight:600;color:#a5b4fc;text-decoration:none">${buttonText} &rarr;</a>`;
      return `<article style="${style}display:flex;flex-direction:column;gap:${clamp(block.cardGap,12,0,40)}px">${iconHtml}<strong style="font-size:inherit;font-weight:${clamp(block.fontWeight,700,100,900)};line-height:1.2">${text}</strong><p style="margin:0;font-size:15px;font-weight:400;line-height:1.5;white-space:pre-wrap;color:#cbd5e1">${description}</p>${button}</article>`;
    }
    case 'heading': return `<h2 style="${style}margin:0;line-height:1.2">${text}</h2>`;
    case 'text': return `<p style="${style}margin:0;line-height:1.5;white-space:pre-wrap">${text}</p>`;
    case 'button': return `<a href="${safeUrl(block.url)}" style="${style}display:flex;align-items:center;justify-content:center;text-decoration:none">${text}</a>`;
    case 'image': {
      const src = safeUrl(block.url, true);
      return src ? `<img src="${src}" alt="${text}" style="${style}object-fit:contain" />` : '';
    }
    case 'section': return '';
  }
}
function renderSection(section: WebBlock): string {
  const height = clamp(section.sectionHeight, DEFAULT_SECTION_HEIGHT, 120, 20000);
  const background = validColor(section.background);
  return `<section style="background:${background}"><div class="onyx-section" style="height:${height}px">${section.children.map(renderElement).join('\n')}</div></section>`;
}
export function exportWebsite(project: WebProject, layout: 'full' | 'fixed' = 'full'): string {
  return `<!-- Generated with Onyx Studio | https://builtbybuzz.dev -->
<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(project.title)}</title>
<style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${validColor(project.background)};color:white;font-family:system-ui,sans-serif}
section{width:100%;overflow:hidden}.onyx-section{position:relative;width:${DESIGN_WIDTH}px;margin:${layout === 'fixed' ? 'auto' : '0'};transform-origin:${layout === 'fixed' ? 'top center' : 'top left'}}

</style>
</head>
<body>
${project.blocks.filter(block => block.type === 'section').map(renderSection).join('\n')}
<script>
(function(){
  const width=${DESIGN_WIDTH};
  function resize(){
    const scale=${layout === 'fixed' ? 'Math.min(1,document.documentElement.clientWidth/width)' : 'document.documentElement.clientWidth/width'};
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
