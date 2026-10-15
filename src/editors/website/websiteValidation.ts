import type { BlockType, WebBlock, WebProject } from './websiteTypes';
import { blockTypes } from './websiteTypes';
import { lucideIcons } from './websiteIcons';
const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);
function validBlock(value: unknown, depth = 0): value is WebBlock {
  if (depth > 8 || typeof value !== 'object' || value === null) return false;
  const block = value as Partial<WebBlock>;
  return typeof block.id === 'string' && blockTypes.includes(block.type as BlockType) &&
    typeof block.text === 'string' && typeof block.url === 'string' &&
    typeof block.color === 'string' && typeof block.background === 'string' &&
    typeof block.fontSize === 'number' && Number.isFinite(block.fontSize) &&
    typeof block.padding === 'number' && Number.isFinite(block.padding) &&
    ['left','center','right'].includes(block.align ?? '') && Array.isArray(block.children) &&
    block.children.length <= 500 && block.children.every(child => validBlock(child, depth + 1)) &&
    ['x','y','width','height','sectionHeight','fontWeight','borderRadius','borderWidth','opacity','cardGap','iconSize'].every(key => {
      const v = block[key as keyof WebBlock];
      return v === undefined || (typeof v === 'number' && Number.isFinite(v));
    }) &&
    ['fontFamily','borderColor','cardDescription','cardIconUrl','cardButtonText','imageUrl','faqAnswer'].every(key => {
      const v = block[key as keyof WebBlock];
      return v === undefined || typeof v === 'string';
    }) &&
    ['italic','underline','cardShowIcon','cardShowButton','showIcon','browserHeader','faqOpen'].every(key => {
      const v = block[key as keyof WebBlock];
      return v === undefined || typeof v === 'boolean';
    }) &&
    (block.iconName === undefined || lucideIcons.includes(block.iconName as typeof lucideIcons[number])) &&
    (block.imageFit === undefined || ['contain', 'cover'].includes(block.imageFit)) &&
    (block.cardPreset === undefined || ['project', 'feature', 'information'].includes(block.cardPreset));
}
export function validProject(value: unknown): value is WebProject {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Partial<WebProject>;
  if (p.metadata !== undefined) {
    if (typeof p.metadata !== 'object' || p.metadata === null || Array.isArray(p.metadata)) return false;
    if (!['description', 'author', 'keywords', 'canonicalUrl', 'imageUrl', 'faviconUrl', 'language'].every(key => {
      const field = p.metadata![key as keyof typeof p.metadata];
      return field === undefined || (typeof field === 'string' && field.length <= 2000);
    })) return false;
  }
  return p.version === 1 && typeof p.title === 'string' && p.title.length <= 200 &&
    typeof p.background === 'string' && isHex(p.background) && Array.isArray(p.blocks) &&
    p.blocks.length <= 500 && p.blocks.every(block => validBlock(block));
}
