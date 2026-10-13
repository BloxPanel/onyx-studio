import type { EmbedDocument } from '../../core/types';

interface DiscordPreviewProps {
  embed: EmbedDocument;
}

function safeImageUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export default function DiscordPreview({ embed }: DiscordPreviewProps) {
  const authorIcon = safeImageUrl(embed.authorIconUrl);
  const thumbnail = safeImageUrl(embed.thumbnailUrl);
  const image = safeImageUrl(embed.imageUrl);
  const footerIcon = safeImageUrl(embed.footerIconUrl);

  const authorLink = (() => {
    try {
      const url = new URL(embed.authorUrl);
      return ['https:', 'http:'].includes(url.protocol)
        ? url.href
        : undefined;
    } catch {
      return undefined;
    }
  })();

  return (
    <section className="panel preview-panel">
      <h3>Live Preview</h3>

      <div className="discord">
        <div className="embed" style={{ borderColor: embed.color }}>
          {embed.authorName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}>
              {authorIcon && (
                <img
                  src={authorIcon}
                  alt=""
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              )}

              {authorLink ? (
                <a
                  href={authorLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#8ea1ff' }}
                >
                  {embed.authorName}
                </a>
              ) : (
                <strong>{embed.authorName}</strong>
              )}
            </div>
          )}

          {thumbnail && (
            <img
              src={thumbnail}
              alt="Embed thumbnail"
              style={{
                width: 80,
                height: 80,
                objectFit: 'cover',
                borderRadius: 5,
                float: 'right',
                marginLeft: 15,
                marginBottom: 10,
              }}
            />
          )}

          {embed.title && (
            <strong style={{ display: 'block' }}>
              {embed.title}
            </strong>
          )}

          {embed.description && <p>{embed.description}</p>}

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
                  gridColumn: field.inline ? 'span 4' : 'span 12',
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

          {image && (
            <img
              src={image}
              alt="Embed image"
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: 300,
                objectFit: 'contain',
                borderRadius: 5,
                marginTop: 15,
                clear: 'both',
              }}
            />
          )}

          {(embed.footer || embed.timestamp) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 18,
              clear: 'both',
              color: '#aeb2bb',
              fontSize: 12,
            }}>
              {footerIcon && embed.footer && (
                <img
                  src={footerIcon}
                  alt=""
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                  }}
                />
              )}

              {embed.footer && <span>{embed.footer}</span>}

              {embed.footer && embed.timestamp && <span>•</span>}

              {embed.timestamp && (
                <span>{new Date().toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <p style={{
        fontSize: 12,
        color: '#9398ad',
        marginTop: 15,
      }}>
        Preview approximates Discord's embed layout.
      </p>
    </section>
  );
}
