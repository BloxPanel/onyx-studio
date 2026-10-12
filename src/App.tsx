import { useEffect, useState } from 'react';
import type { EmbedDocument, EmbedField, Framework } from './core/types';
import { initialEmbed } from './core/types';
import { generateCode } from './core/exporters';
import './index.css';

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
      title: parsed.title,
      description: parsed.description,
      color: parsed.color,
      footer: parsed.footer,
      fields,
    };
  } catch {
    return initialEmbed;
  }
}

function App() {
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
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = framework === 'discord.js' ? 'embed.js' : 'embed.py';
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyCode() {
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
          <section className="panel">
            <h3>Embed Properties</h3>

            <label htmlFor="embed-title">Title</label>
            <input
              id="embed-title"
              maxLength={256}
              value={embed.title}
              onChange={event =>
                updateEmbed('title', event.target.value)
              }
            />

            <label htmlFor="embed-description">Description</label>
            <textarea
              id="embed-description"
              rows={5}
              maxLength={4096}
              value={embed.description}
              onChange={event =>
                updateEmbed('description', event.target.value)
              }
            />

            <label htmlFor="embed-color">Accent Color</label>
            <input
              id="embed-color"
              type="color"
              value={embed.color}
              onChange={event =>
                updateEmbed('color', event.target.value)
              }
            />

            <label htmlFor="embed-footer">Footer</label>
            <input
              id="embed-footer"
              maxLength={2048}
              value={embed.footer}
              onChange={event =>
                updateEmbed('footer', event.target.value)
              }
            />

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

                <label>Field Name</label>
                <input
                  maxLength={256}
                  value={field.name}
                  onChange={event =>
                    updateField(field.id, {
                      name: event.target.value,
                    })
                  }
                />

                <label>Field Value</label>
                <textarea
                  rows={3}
                  maxLength={1024}
                  value={field.value}
                  onChange={event =>
                    updateField(field.id, {
                      value: event.target.value,
                    })
                  }
                />

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

          <section className="panel preview-panel">
            <h3>Live Preview</h3>

            <div className="discord">
              <div
                className="embed"
                style={{ borderColor: embed.color }}
              >
                {embed.title && (
                  <strong>{embed.title}</strong>
                )}

                {embed.description && (
                  <p>{embed.description}</p>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 12,
                }}>
                  {embed.fields.map(field => (
                    <div
                      key={field.id}
                      style={{
                        gridColumn: field.inline
                          ? 'span 4'
                          : 'span 12',
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <strong style={{ fontSize: 14 }}>
                        {field.name}
                      </strong>

                      <div style={{
                        fontSize: 14,
                        marginTop: 4,
                        whiteSpace: 'pre-wrap',
                      }}>
                        {field.value}
                      </div>
                    </div>
                  ))}
                </div>

                {embed.footer && (
                  <small style={{
                    display: 'block',
                    marginTop: 18,
                  }}>
                    {embed.footer}
                  </small>
                )}
              </div>
            </div>

            <p style={{
              fontSize: 12,
              color: '#9398ad',
              marginTop: 15,
            }}>
              Preview is an approximation of Discord's embed layout.
            </p>
          </section>
        </div>

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

export default App;
