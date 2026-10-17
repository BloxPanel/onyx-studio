import { useState } from 'react';
import type { WebBlock } from './websiteTypes';
import { iconStyle, lucideIcons } from './websiteIcons';

export default function WebsiteContentInspector({ block, onChange }: { block: WebBlock; onChange: (changes: Partial<WebBlock>) => void }) {
  const [search, setSearch] = useState('');
  const text = (label: string, key: 'text' | 'url' | 'imageUrl' | 'faqAnswer' | 'cardIconUrl' | 'cardIconLink' | 'planPrice' | 'planPeriod' | 'planFeatures' | 'planBadge' | 'cardDescription' | 'cardButtonText', multiline = false) => <label>{label}
    {multiline ? <textarea rows={4} value={block[key] ?? ''} onChange={event => onChange({ [key]: event.target.value })} />
      : <input value={block[key] ?? ''} onChange={event => onChange({ [key]: event.target.value })} />}
  </label>;
  const check = (label: string, key: 'showIcon' | 'browserHeader' | 'faqOpen', value: boolean) => <label>
    <input type="checkbox" checked={value} onChange={event => onChange({ [key]: event.target.checked })} />{label}
  </label>;
  return <>
    {block.type === 'steps' && <>
      {text('Heading', 'text')}
      {(block.steps ?? []).map((step, index) => <fieldset key={index}><legend>Step {String(index + 1).padStart(2, '0')}</legend>
        <label>Title<input value={step.title} onChange={event => onChange({ steps: block.steps!.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} /></label>
        <label>Description<textarea rows={2} value={step.description} onChange={event => onChange({ steps: block.steps!.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></label>
        <button type="button" disabled={index === 0} onClick={() => { const steps = [...block.steps!]; [steps[index - 1], steps[index]] = [steps[index], steps[index - 1]]; onChange({ steps }); }}>Move Up</button>
        <button type="button" disabled={index === (block.steps?.length ?? 0) - 1} onClick={() => { const steps = [...block.steps!]; [steps[index + 1], steps[index]] = [steps[index], steps[index + 1]]; onChange({ steps }); }}>Move Down</button>
        <button type="button" onClick={() => onChange({ steps: block.steps!.filter((_, i) => i !== index) })}>Remove Step</button>
      </fieldset>)}
      <button type="button" disabled={(block.steps?.length ?? 0) >= 100} onClick={() => onChange({ steps: [...(block.steps ?? []), { title: 'New step', description: 'Describe this step.' }] })}>Add Step</button>
      <p className="website-muted">Numbers update automatically. Increase the element height in Layout for more steps.</p>
    </>}
    {block.type === 'pricing'  && <>
      {text('Plan Name', 'text')}{text('Price', 'planPrice')}{text('Billing Period', 'planPeriod')}
      {text('Badge (optional)', 'planBadge')}{text('Description', 'cardDescription', true)}
      {text('Features (one per line)', 'planFeatures', true)}
      {text('Button Text', 'cardButtonText')}{text('Button Link URL', 'url')}
      <label><input type="checkbox" checked={block.cardShowButton !== false} onChange={event => onChange({ cardShowButton: event.target.checked })} /> Show Button</label>
    </>}
    {block.type === 'icon' && <>{text('Accessible Label', 'text')}{text('Link URL (optional)', 'url')}</>}
    {block.type === 'button' && check('Show Icon', 'showIcon', block.showIcon ?? false)}
    {block.type === 'badge' && <>{text('Badge Text', 'text')}{check('Show Icon', 'showIcon', block.showIcon ?? false)}</>}
    {(block.type === 'icon' || (block.type === 'card' && block.cardShowIcon !== false) || ((block.type === 'badge' || block.type === 'button') && block.showIcon)) && <>
      <label>Lucide Icon — {block.iconName ?? (block.type === 'card' ? 'panels-top-left' : 'star')}</label>
      <input aria-label="Search Lucide icons" placeholder="Search icons…" value={search} onChange={event => setSearch(event.target.value)} />
      <div className="website-icon-picker" role="group" aria-label="Lucide icon picker">
        {lucideIcons.filter(name => name.includes(search.trim().toLowerCase())).map(name => <button type="button" key={name}
          title={name} aria-label={name} aria-pressed={(block.iconName ?? (block.type === 'card' ? 'panels-top-left' : 'star')) === name} onClick={() => onChange({ iconName: name, ...(block.type === 'card' ? { cardIconUrl: undefined } : {}) })}>
          <span aria-hidden="true" style={iconStyle(name, 20)} />
        </button>)}
      </div>
      {!lucideIcons.some(name => name.includes(search.trim().toLowerCase())) && <p className="website-muted">No matching icons.</p>}
      <label>Icon Size — {block.iconSize ?? (block.type === 'card' ? 42 : 24)}px<input type="range" min="12" max="160" value={block.iconSize ?? (block.type === 'card' ? 42 : 24)} onChange={event => onChange({ iconSize: Number(event.target.value) })} /></label>
    </>}
    {block.type === 'card' && block.cardShowIcon !== false && <>{text('Custom Icon URL (optional)', 'cardIconUrl')}{text('Icon Link URL (optional)', 'cardIconLink')}</>}
    {block.type === 'container' && <>{text('Image URL (optional)', 'imageUrl')}{text('Image Alt Text', 'text')}</>}
    {block.type === 'screenshot' && <>{text('Image URL', 'url')}{text('Image Alt Text / Browser Title', 'text')}{check('Show Browser Header', 'browserHeader', block.browserHeader !== false)}</>}
    {(block.type === 'screenshot' || block.type === 'container') && <label>Image Fit
      <select value={block.imageFit ?? (block.type === 'container' ? 'cover' : 'contain')} onChange={event => onChange({ imageFit: event.target.value as 'contain' | 'cover' })}>
        <option value="contain">Contain</option><option value="cover">Cover</option>
      </select>
    </label>}
    {block.type === 'faq' && <>{text('Question', 'text')}{text('Answer', 'faqAnswer', true)}{check('Initially Expanded', 'faqOpen', block.faqOpen ?? false)}
      <p className="website-muted">Visitors can expand and collapse this question in the exported website. Increase its height in Layout for longer answers.</p>
    </>}
  </>;
}
