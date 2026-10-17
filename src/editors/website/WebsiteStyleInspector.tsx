import type { WebBlock } from './websiteTypes';

interface Props {
  block: WebBlock;
  onChange: (changes: Partial<WebBlock>) => void;
}

const fonts = [
  'Arial, sans-serif', 'Georgia, serif', 'Verdana, sans-serif',
  'Tahoma, sans-serif', 'Trebuchet MS, sans-serif',
  'Courier New, monospace', 'system-ui, sans-serif',
];
const hex = (value: string | undefined, fallback: string) =>
  value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

export default function WebsiteStyleInspector({ block, onChange }: Props) {
  return <>
    <fieldset className="website-property-section"><legend>Typography</legend>
      <label>Text / Icon Color<input type="color" value={hex(block.color, '#ffffff')} onChange={event => onChange({ color: event.target.value })} /></label>
      <label>Font Size - {block.fontSize}px<input type="range" min="10" max="96" value={block.fontSize} onChange={event => onChange({ fontSize: Number(event.target.value) })} /></label>
      <label>Font Family
        <select value={fonts.includes(block.fontFamily ?? '') ? block.fontFamily : fonts[0]} onChange={event => onChange({ fontFamily: event.target.value })}>
          {fonts.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
        </select>
      </label>
      <label>Font Weight<select value={block.fontWeight ?? (block.type === 'heading' ? 700 : 400)} onChange={event => onChange({ fontWeight: Number(event.target.value) })}>
        <option value={400}>Regular</option><option value={700}>Bold</option>
      </select></label>
      <label><input type="checkbox" checked={block.italic ?? false} onChange={event => onChange({ italic: event.target.checked })} />Italic</label>
      <label><input type="checkbox" checked={block.underline ?? false} onChange={event => onChange({ underline: event.target.checked })} />Underline</label>
      <label>Alignment<select value={block.align} onChange={event => onChange({ align: event.target.value as WebBlock['align'] })}>
        <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
      </select></label>
    </fieldset>
    <fieldset className="website-property-section"><legend>Appearance</legend>
      <label>Background Color<input type="color" value={hex(block.background, '#172033')} onChange={event => onChange({ background: event.target.value })} /></label>
      <button type="button" onClick={() => onChange({ background: 'transparent' })}>Transparent Background</button>
      <label>{block.type === 'divider' ? 'Rounded Ends' : 'Corner Radius'} - {block.borderRadius ?? 0}px
        <input type="range" min="0" max="100" value={block.borderRadius ?? 0} onChange={event => onChange({ borderRadius: Number(event.target.value) })} />
      </label>
      <label>{block.type === 'divider' ? 'Line Thickness' : 'Border Width'} - {block.borderWidth ?? 0}px
        <input type="range" min={block.type === 'divider' ? 1 : 0} max="16" value={block.borderWidth ?? (block.type === 'divider' ? 2 : 0)} onChange={event => onChange({ borderWidth: Number(event.target.value) })} />
      </label>
      <label>{block.type === 'divider' ? 'Line Color' : 'Border Color'}<input type="color" value={hex(block.borderColor, '#818cf8')} onChange={event => onChange({ borderColor: event.target.value })} /></label>
      <label>Opacity - {block.opacity ?? 100}%<input type="range" min="0" max="100" value={block.opacity ?? 100} onChange={event => onChange({ opacity: Number(event.target.value) })} /></label>
    </fieldset>
  </>;
}
