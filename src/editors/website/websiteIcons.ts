// Static Lucide SVGs avoid adding a runtime dependency. Pin the asset version.
export const lucideIcons = ['star', 'sparkles', 'heart', 'check', 'circle-check', 'info', 'circle-help', 'zap', 'rocket', 'code', 'globe', 'mail', 'phone', 'search', 'settings', 'user', 'users', 'shield', 'lock', 'image', 'camera', 'monitor', 'smartphone', 'folder', 'file', 'calendar', 'clock', 'map-pin', 'download', 'upload', 'external-link', 'arrow-right', 'arrow-left', 'chevron-down', 'plus', 'minus', 'menu', 'house', 'briefcase', 'layers', 'layout-dashboard', 'panels-top-left', 'lightbulb', 'coffee', 'gift', 'bell', 'bookmark', 'flag'] as const;
export const iconUrl = (name = 'star') => `https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/${lucideIcons.includes(name as typeof lucideIcons[number]) ? name : 'star'}.svg`;
export function iconStyle(name: string | undefined, size = 24, customUrl?: string) {
  let source = iconUrl(name);
  try {
    if (customUrl && ['https:', 'http:'].includes(new URL(customUrl).protocol)) source = customUrl;
  } catch { /* Fall back to the preset for invalid URLs. */ }
  return { display: 'inline-block', width: size, height: size, flexShrink: 0, backgroundColor: 'currentColor',
    mask: `url("${source.replace(/["\\\n\r]/g, character => encodeURIComponent(character))}") center / contain no-repeat`, WebkitMask: `url("${source.replace(/["\\\n\r]/g, character => encodeURIComponent(character))}") center / contain no-repeat` };
}
