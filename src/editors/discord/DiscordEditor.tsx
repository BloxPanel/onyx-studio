
import ValidatedField from '../../components/ValidatedField';
import DiscordPreview from './DiscordPreview';
import { useEffect, useState } from 'react';
import type { EmbedDocument, EmbedField, Framework } from '../../core/types';
import { initialEmbed } from '../../core/types';
import { generateCode } from '../../core/exporters';
import { validateEmbed } from '../../core/validation';
import '../../index.css';

const STORAGE_KEY = 'onyx-studio-discord-v1';

function loadEmbed(): EmbedDocument {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialEmbed;

    const parsed: unknown = JSON.parse(saved);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('title' in parsed) ||
      typeof parsed.title !== 'string' ||
      !('description' in parsed) ||
      typeof parsed.description !== 'string' ||
      !('color' in parsed) ||
      typeof parsed.color !== 'string' ||
      !/^#[0-9a-fA-F]{6}$/.test(parsed.color) ||
      !('footer' in parsed) ||
      typeof parsed.footer !== 'string' ||
      !('fields' in parsed) ||
      !Array.isArray(parsed.fields)
    ) {
      return initialEmbed;
    }

    const fields: EmbedField[] = parsed.fields
      .filter((field: unknown): field is EmbedField => {
        if (typeof field !== 'object' || field === null) return false;
        return (
          'id' in field && typeof field.id === 'string' &&
          'name' in field && typeof field.name === 'string' &&
          'value' in field && typeof field.value === 'string' &&
          'inline' in field && typeof field.inline === 'boolean'
        );
      })
      .slice(0, 25);

    return {
      ...initialEmbed,
      title: parsed.title,
      description: parsed.description,
      color: parsed.color,
      footer: parsed.footer,
      fields,
      authorName: typeof Reflect.get(parsed, 'authorName') === 'string'
        ? Reflect.get(parsed, 'authorName') : '',
      authorUrl: typeof Reflect.get(parsed, 'authorUrl') === 'string'
        ? Reflect.get(parsed, 'authorUrl') : '',
      authorIconUrl: typeof Reflect.get(parsed, 'authorIconUrl') === 'string'
        ? Reflect.get(parsed, 'authorIconUrl') : '',
      thumbnailUrl: typeof Reflect.get(parsed, 'thumbnailUrl') === 'string'
        ? Reflect.get(parsed, 'thumbnailUrl') : '',
      imageUrl: typeof Reflect.get(parsed, 'imageUrl') === 'string'
        ? Reflect.get(parsed, 'imageUrl') : '',
      footerIconUrl: typeof Reflect.get(parsed, 'footerIconUrl') === 'string'
        ? Reflect.get(parsed, 'footerIconUrl') : '',
      timestamp: Reflect.get(parsed, 'timestamp') === true,
    };
  } catch {
    return initialEmbed;
  }
}

function DiscordEditor() {
  const [framework, setFramework] = useState<Framework>('pycord');
  const [embed, setEmbed] = useState<EmbedDocument>(loadEmbed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(embed));
    } catch (error) {
      console.warn('Unable to save Onyx Studio project:', error);
    }
  }, [embed]);

  const code = generateCode(framework, embed);
  const validationIssues = validateEmbed(embed);
  const errors = validationIssues.filter(issue => issue.severity === 'error');
  const warnings = validationIssues.filter(issue => issue.severity === 'warning');
  const canExport = errors.length === 0;

  function issuesFor(...names: string[]) {
    return validationIssues.filter(issue =>
      names.includes(issue.field)
    );
  }

  function focusFirstError() {
    const first = errors[0];
    if (!first) return;

    let fieldKey = first.field;

    if (/^Field \d+$/.test(first.field)) {
      const part = first.message.toLowerCase().includes('value')
        ? 'value'
        : 'name';
      fieldKey = `${first.field} ${part}`;
    }

    if (fieldKey === 'Total characters') {
      fieldKey = 'Description';
    }

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-validation-field]')
    );

    const target = targets.find(
      element => element.dataset.validationField === fieldKey
    );

    const fallback = document.querySelector<HTMLElement>(
      '[data-validation-field="Embed"]'
    );

    const destination = target ?? fallback;

    destination?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    const input = destination?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >('input, textarea');

    input?.focus({ preventScroll: true });
  }
  function updateEmbed<K extends keyof EmbedDocument>(
    key: K,
    value: EmbedDocument[K]
  ) {
    setEmbed(previous => ({ ...previous, [key]: value }));
  }


  function addField() {
    if (embed.fields.length >= 25) return;

    const field: EmbedField = {
      id: crypto.randomUUID(),
      name: 'New Field',
      value: 'Field value',
      inline: false,
    };

    updateEmbed('fields', [...embed.fields, field]);
  }

  function updateField(id: string, changes: Partial<EmbedField>) {
    updateEmbed(
      'fields',
      embed.fields.map(field =>
        field.id === id ? { ...field, ...changes } : field
      )
    );
  }

  function removeField(id: string) {
    updateEmbed(
      'fields',
      embed.fields.filter(field => field.id !== id)
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= embed.fields.length) return;

    const updated = [...embed.fields];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    updateEmbed('fields', updated);
  }

  function downloadCode() {
    if (!canExport) {
      focusFirstError();
      return;
    }
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = framework === 'discord.js' ? 'embed.js' : 'embed.py';
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyCode() {
    if (!canExport) {
      focusFirstError();
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      console.error('Unable to copy code:', error);
      alert('Copy failed. You can select the code manually.');
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>◆ ONYX STUDIO</h2>
        <p className="subtitle">Visual Development Platform</p>

        <div className="nav active">Discord Studio</div>
        <div className="nav disabled">Website Studio — Soon</div>
        <div className="nav disabled">More editors coming</div>

        <div className="sidebar-bottom">
          Open Source • v0.2
        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <h1>Discord Studio</h1>
            <p>Design Discord embeds visually. Export real code.</p>
          </div>

          <button onClick={downloadCode}>
            Export Code ↓
          </button>
        </header>

        <div className="workspace">
          <section className="panel" data-validation-field="Embed">
            <h3>Embed Properties</h3>

            {validationIssues
              .filter(issue => issue.field === 'Embed')
              .map((issue, index) => (
                <div
                  key={index}
                  data-onyx-embed-error
                  role="alert"
                  style={{
                    padding: '12px 14px',
                    marginBottom: 18,
                    border: '1px solid #ed4245',
                    borderRadius: 8,
                    background: 'rgba(237, 66, 69, 0.08)',
                    color: '#ff9c9f',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  <strong>⚠ Invalid Embed</strong>
                  <div>{issue.message}</div>
                </div>
              ))}

<ValidatedField
  label="Title"
  fieldKey="Title"
  issues={issuesFor('Title')}
>
  <input
              id="embed-title"
              maxLength={256}
              value={embed.title}
              onChange={event =>
                updateEmbed('title', event.target.value)
              }
            />
</ValidatedField>

<ValidatedField
  label="Description"
  fieldKey="Description"
  issues={issuesFor('Description')}
>
  <textarea
              id="embed-description"
              rows={5}
              maxLength={4096}
              value={embed.description}
              onChange={event =>
                updateEmbed('description', event.target.value)
              }
            />
</ValidatedField>

            <label htmlFor="embed-color">Accent Color</label>
            <input
              id="embed-color"
              type="color"
              value={embed.color}
              onChange={event =>
                updateEmbed('color', event.target.value)
              }
            />

<ValidatedField
  label="Footer Text"
  fieldKey="Footer"
  issues={issuesFor('Footer')}
>
  <input
              id="embed-footer"
              maxLength={2048}
              value={embed.footer}
              onChange={event =>
                updateEmbed('footer', event.target.value)
              }
            />
</ValidatedField>

            <h3 style={{ marginTop: 28 }}>Advanced Properties</h3>

<ValidatedField
  label="Author Name"
  fieldKey="Author"
  issues={issuesFor('Author')}
>
  <input
              maxLength={256}
              value={embed.authorName}
              onChange={e => updateEmbed('authorName', e.target.value)}
            />
</ValidatedField>
            

<ValidatedField
  label="Author URL"
  fieldKey="Author URL"
  issues={issuesFor('Author URL')}
>
  <input
              type="url"
              placeholder="https://example.com"
              value={embed.authorUrl}
              onChange={e => updateEmbed('authorUrl', e.target.value)}
            />
</ValidatedField>
            

<ValidatedField
  label="Author Icon URL"
  fieldKey="Author icon"
  issues={issuesFor('Author icon')}
>
  <input
              type="url"
              placeholder="https://example.com/avatar.png"
              value={embed.authorIconUrl}
              onChange={e => updateEmbed('authorIconUrl', e.target.value)}
            />
</ValidatedField>
            

<ValidatedField
  label="Thumbnail URL"
  fieldKey="Thumbnail"
  issues={issuesFor('Thumbnail')}
>
  <input
              type="url"
              placeholder="https://example.com/thumbnail.png"
              value={embed.thumbnailUrl}
              onChange={e => updateEmbed('thumbnailUrl', e.target.value)}
            />
</ValidatedField>
            

<ValidatedField
  label="Image URL"
  fieldKey="Image"
  issues={issuesFor('Image')}
>
  <input
              type="url"
              placeholder="https://example.com/image.png"
              value={embed.imageUrl}
              onChange={e => updateEmbed('imageUrl', e.target.value)}
            />
</ValidatedField>
            

<ValidatedField
  label="Footer Icon URL"
  fieldKey="Footer icon"
  issues={issuesFor('Footer icon')}
>
  <input
              type="url"
              placeholder="https://example.com/footer.png"
              value={embed.footerIconUrl}
              onChange={e => updateEmbed('footerIconUrl', e.target.value)}
            />
</ValidatedField>
            

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={embed.timestamp}
                onChange={e => updateEmbed('timestamp', e.target.checked)}
              />
              Include Timestamp
            </label>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 30,
              gap: 12,
            }}>
              <h3 style={{ margin: 0 }}>
                Fields ({embed.fields.length}/25)
              </h3>

              <button
                onClick={addField}
                disabled={embed.fields.length >= 25}
              >
                + Add Field
              </button>
            </div>

            {embed.fields.length === 0 && (
              <p style={{ color: '#9398ad' }}>
                No fields yet. Add one to get started.
              </p>
            )}

            {embed.fields.map((field, index) => (
              <div
                key={field.id}
                style={{
                  marginTop: 18,
                  padding: 15,
                  background: '#10131b',
                  border: '1px solid #393e50',
                  borderRadius: 8,
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <strong>Field {index + 1}</strong>

                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveField(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      title="Move down"
                      disabled={index === embed.fields.length - 1}
                      onClick={() => moveField(index, 1)}
                    >
                      ↓
                    </button>
                    <button onClick={() => removeField(field.id)}>
                      Remove
                    </button>
                  </div>
                </div>

                <ValidatedField
  label="Field Name"
  fieldKey={`Field ${index + 1} name`}
  issues={validationIssues.filter(issue =>
    issue.field === `Field ${index + 1} name` ||
    (issue.field === `Field ${index + 1}` &&
     issue.message.toLowerCase().includes('name'))
  )}
>
  <input
    maxLength={256}
    value={field.name}
    onChange={event =>
      updateField(field.id, { name: event.target.value })
    }
  />
</ValidatedField>

                <ValidatedField
  label="Field Value"
  fieldKey={`Field ${index + 1} value`}
  issues={validationIssues.filter(issue =>
    issue.field === `Field ${index + 1} value` ||
    (issue.field === `Field ${index + 1}` &&
     issue.message.toLowerCase().includes('value'))
  )}
>
  <textarea
    rows={3}
    maxLength={1024}
    value={field.value}
    onChange={event =>
      updateField(field.id, { value: event.target.value })
    }
  />
</ValidatedField>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={field.inline}
                    onChange={event =>
                      updateField(field.id, {
                        inline: event.target.checked,
                      })
                    }
                  />
                  Display Inline
                </label>
              </div>
            ))}
          </section>

          <DiscordPreview embed={embed} />
        </div>

                <section className="panel" style={{ marginTop: 20 }}>
  <h3>Embed Validation</h3>
  <p
    role="status"
    style={{
      color: errors.length > 0
        ? '#ff9c9f'
        : warnings.length > 0
          ? '#ffd479'
          : '#43b581',
      marginBottom: 0,
    }}
  >
    {errors.length > 0
      ? `${errors.length} error(s) — fix the highlighted inputs before exporting.`
      : warnings.length > 0
        ? `${warnings.length} warning(s) — check the highlighted inputs.`
        : '✓ No validation issues detected.'}
  </p>
</section>
        <section className="panel code-panel">
          <div className="code-header">
            <h3>Generated Code</h3>

            <select
              aria-label="Export framework"
              value={framework}
              onChange={event =>
                setFramework(event.target.value as Framework)
              }
            >
              <option value="pycord">Pycord</option>
              <option value="discord.py">discord.py</option>
              <option value="discord.js">discord.js</option>
            </select>

            <button onClick={copyCode}>
              Copy Code
            </button>
          </div>

          <pre><code>{code}</code></pre>
        </section>
      </main>
    </div>
  );
}

export default DiscordEditor;












