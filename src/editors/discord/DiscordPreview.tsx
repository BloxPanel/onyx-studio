import type { EmbedDocument } from '../../core/types';

interface DiscordPreviewProps {
  embed: EmbedDocument;
}

export default function DiscordPreview({ embed }: DiscordPreviewProps) {
  return (
    <section className="panel preview-panel">
      <h3>Live Preview</h3>

      <div className="discord">
        <div
          className="embed"
          style={{ borderColor: embed.color }}
        >
          {embed.title && <strong>{embed.title}</strong>}

          {embed.description && <p>{embed.description}</p>}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: 10,
              marginTop: 12,
            }}
          >
            {embed.fields.map(field => (
              <div
                key={field.id}
                style={{
                  gridColumn: field.inline ? 'span 4' : 'span 12',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                <strong style={{ fontSize: 14 }}>
                  {field.name}
                </strong>

                <div
                  style={{
                    fontSize: 14,
                    marginTop: 4,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {field.value}
                </div>
              </div>
            ))}
          </div>

          {embed.footer && (
            <small style={{ display: 'block', marginTop: 18 }}>
              {embed.footer}
            </small>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#9398ad', marginTop: 15 }}>
        Preview is an approximation of Discord's embed layout.
      </p>
    </section>
  );
}
