import type { EmbedDocument } from '../../../core/types';

export function exportPycord(embed: EmbedDocument): string {
  const lines = [
    'import discord',
    '',
    'embed = discord.Embed(',
    `    title=${JSON.stringify(embed.title)},`,
    `    description=${JSON.stringify(embed.description)},`,
    `    color=discord.Color(0x${embed.color.slice(1)})`,
    ')',
  ];

  if (embed.authorName) {
    const args = [`name=${JSON.stringify(embed.authorName)}`];

    if (embed.authorUrl) {
      args.push(`url=${JSON.stringify(embed.authorUrl)}`);
    }

    if (embed.authorIconUrl) {
      args.push(`icon_url=${JSON.stringify(embed.authorIconUrl)}`);
    }

    lines.push(`embed.set_author(${args.join(', ')})`);
  }

  if (embed.thumbnailUrl) {
    lines.push(
      `embed.set_thumbnail(url=${JSON.stringify(embed.thumbnailUrl)})`
    );
  }

  if (embed.imageUrl) {
    lines.push(
      `embed.set_image(url=${JSON.stringify(embed.imageUrl)})`
    );
  }

  for (const field of embed.fields) {
    lines.push(
      `embed.add_field(name=${JSON.stringify(field.name)}, value=${JSON.stringify(field.value)}, inline=${field.inline ? 'True' : 'False'})`
    );
  }

  if (embed.footer) {
    const args = [`text=${JSON.stringify(embed.footer)}`];

    if (embed.footerIconUrl) {
      args.push(`icon_url=${JSON.stringify(embed.footerIconUrl)}`);
    }

    lines.push(`embed.set_footer(${args.join(', ')})`);
  }

  if (embed.timestamp) {
    lines.splice(1, 0, 'from datetime import datetime, timezone');
    lines.push('embed.timestamp = datetime.now(timezone.utc)');
  }

  return lines.join('\n') + '\n';
}
