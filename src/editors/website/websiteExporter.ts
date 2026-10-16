import type { WebBlock, WebProject } from './websiteTypes';
import { DESIGN_WIDTH, DEFAULT_SECTION_HEIGHT } from './websiteTypes';
import { iconUrl } from './websiteIcons';
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
  const base = `position:absolute;z-index:${index};left:${x}px;top:${y}px;width:${width}px;height:${height}px;box-sizing:border-box;overflow:hidden;`;
  const style = `${base}color:${validColor(block.color)};background:${validColor(block.background)};font-size:${clamp(block.fontSize,16,10,96)}px;padding:${clamp(block.padding,12,0,120)}px;text-align:${block.align};overflow-wrap:anywhere;` +
    `font-family:${fontFamily(block.fontFamily)};font-weight:${block.fontWeight ?? (block.type === 'heading' ? 700 : 400)};font-style:${block.italic ? 'italic' : 'normal'};text-decoration:${block.underline ? 'underline' : 'none'};` +
    `border-radius:${clamp(block.borderRadius,block.type === 'button' ? 8 : 0,0,100)}px;border:${clamp(block.borderWidth,0,0,16)}px solid ${validColor(block.borderColor ?? '#818cf8')};opacity:${clamp(block.opacity,100,0,100) / 100};`;
  const text = escapeHtml(block.text);
  const icon = `<span aria-hidden="true" style="display:inline-block;flex-shrink:0;width:${clamp(block.iconSize,block.type === 'icon' ? 48 : 18,12,160)}px;height:${clamp(block.iconSize,block.type === 'icon' ? 48 : 18,12,160)}px;background-color:currentColor;mask:url('${iconUrl(block.iconName)}') center / contain no-repeat;-webkit-mask:url('${iconUrl(block.iconName)}') center / contain no-repeat"></span>`;
  switch (block.type) {
    case 'icon': {
      const content = `<span role="img" aria-label="${text || 'Icon'}" style="display:flex;width:100%;height:100%;align-items:center;justify-content:center">${icon}</span>`;
      return block.url ? `<a href="${safeUrl(block.url)}" style="${style}">${content}</a>` : `<div style="${style}">${content}</div>`;
    }
    case 'badge': return `<div style="${style}display:flex;align-items:center;justify-content:center;gap:8px">${block.showIcon ? icon : ''}${text}</div>`;
    case 'container': {
      const src = safeUrl(block.imageUrl ?? '', true);
      return `<div style="${style}">${src ? `<img src="${src}" alt="${text}" style="width:100%;height:100%;object-fit:${block.imageFit === 'contain' ? 'contain' : 'cover'}" />` : ''}</div>`;
    }
    case 'screenshot': {
      const src = safeUrl(block.url, true);
      const header = block.browserHeader === false ? '' : `<div style="height:32px;flex-shrink:0;background:#334155;color:#cbd5e1;display:flex;align-items:center;padding:0 12px;font:12px system-ui,sans-serif">&#9679; &#9679; &#9679; &nbsp; ${text || 'Browser preview'}</div>`;
      return `<figure style="${style}margin:0;display:flex;flex-direction:column">${header}${src ? `<img src="${src}" alt="${text}" style="width:100%;flex:1;min-height:0;object-fit:${block.imageFit === 'cover' ? 'cover' : 'contain'}" />` : ''}</figure>`;
    }
    case 'faq': return `<details${block.faqOpen ? ' open' : ''} style="${style}overflow:auto"><summary style="cursor:pointer;font-weight:bold">${text}</summary><p style="white-space:pre-wrap;margin-bottom:0">${escapeHtml(block.faqAnswer ?? '')}</p></details>`;
    case 'divider': return `<div aria-hidden="true" style="${base}background:transparent;overflow:visible;opacity:${clamp(block.opacity,100,0,100) / 100}"><div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);height:${clamp(block.borderWidth,2,1,16)}px;background:${validColor(block.borderColor ?? '#94a3b8')};border-radius:${clamp(block.borderRadius,0,0,12)}px"></div></div>`;
    case 'card': {
      const source = (safeUrl(block.cardIconUrl ?? '', true) || iconUrl(block.iconName ?? 'panels-top-left')).replace(/'/g, '%27');
      const size = clamp(block.iconSize,42,12,160);
      const cardIcon = `<span aria-hidden="true" style="display:inline-block;width:${size}px;height:${size}px;flex-shrink:0;background-color:currentColor;mask:url('${source}') center / contain no-repeat;-webkit-mask:url('${source}') center / contain no-repeat"></span>`;
      const iconHtml = block.cardShowIcon === false ? '' : block.cardIconLink
        ? `<a href="${safeUrl(block.cardIconLink)}" aria-label="${text || 'Card'}" style="display:flex;align-self:flex-start;color:inherit">${cardIcon}</a>` : cardIcon;
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
  const metadata = project.metadata ?? {};
  const tags: string[] = [];
  const meta = (name: string, value: string | undefined, property = false) => {
    if (value?.trim()) tags.push(`<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value.trim())}" />`);
  };
  meta('description', metadata.description);
  meta('author', metadata.author);
  meta('keywords', metadata.keywords);
  meta('og:title', project.title, true);
  meta('og:description', metadata.description, true);
  meta('og:type', 'website', true);
  const canonical = safeUrl(metadata.canonicalUrl ?? '', true);
  const image = safeUrl(metadata.imageUrl ?? '', true);
  const favicon = safeUrl(metadata.faviconUrl ?? '', true);
  if (canonical) tags.push(`<link rel="canonical" href="${canonical}" />`, `<meta property="og:url" content="${canonical}" />`);
  if (image) tags.push(`<meta property="og:image" content="${image}" />`);
  if (favicon) tags.push(`<link rel="icon" href="${favicon}" />`);
  meta('twitter:card', image ? 'summary_large_image' : 'summary');
  const language = /^[a-zA-Z]{2,8}(-[a-zA-Z0-9]{1,8})*$/.test(metadata.language ?? '') ? metadata.language! : 'en';
  return `<!-- Generated with Onyx Studio | https://builtbybuzz.dev -->
<!doctype html>
<html lang="${language}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(project.title)}</title>
${tags.join('\n')}
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
