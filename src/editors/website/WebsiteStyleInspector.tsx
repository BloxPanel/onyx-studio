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
  return <div style={{ borderTop: '1px solid #40465c', marginTop: 20, paddingTop: 14 }}>
    <h4 style={{ margin: '0 0 12px' }}>Typography and Appearance</h4>
    <label>Font Family</label>
    <select value={fonts.includes(block.fontFamily ?? '') ? block.fontFamily : fonts[0]}
      onChange={event => onChange({ fontFamily: event.target.value })}>
      {fonts.map(font => <option key={font} value={font}>{font.split(',')[0]}</option>)}
    </select>
    <label>Font Weight</label>
    <select value={block.fontWeight ?? (block.type === 'heading' ? 700 : 400)}
      onChange={event => onChange({ fontWeight: Number(event.target.value) })}>
      <option value={400}>Regular</option><option value={700}>Bold</option>
    </select>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input type="checkbox" checked={block.italic ?? false}
        onChange={event => onChange({ italic: event.target.checked })} /> Italic
    </label>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input type="checkbox" checked={block.underline ?? false}
        onChange={event => onChange({ underline: event.target.checked })} /> Underline
    </label>
    <label>Corner Radius - {block.borderRadius ?? (block.type === 'button' ? 8 : 0)}px</label>
    <input type="range" min="0" max="100" value={block.borderRadius ?? (block.type === 'button' ? 8 : 0)}
      onChange={event => onChange({ borderRadius: Number(event.target.value) })} />
    <label>Border Width - {block.borderWidth ?? 0}px</label>
    <input type="range" min="0" max="16" value={block.borderWidth ?? 0}
      onChange={event => onChange({ borderWidth: Number(event.target.value) })} />
    <label>Border Color</label>
    <input type="color" value={hex(block.borderColor, '#818cf8')}
      onChange={event => onChange({ borderColor: event.target.value })} />
    <label>Opacity - {block.opacity ?? 100}%</label>
    <input type="range" min="0" max="100" value={block.opacity ?? 100}
      onChange={event => onChange({ opacity: Number(event.target.value) })} />
    <button type="button" style={{ marginTop: 14, padding: 9, background: '#303952', color: 'white', border: '1px solid #59647f', borderRadius: 6 }}
      onClick={() => onChange({ background: 'transparent' })}>Transparent Background</button>
  </div>;
}
