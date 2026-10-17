import type { EmbedDocument } from '../../../core/types';

export function exportDiscordJs(embed: EmbedDocument): string {
  const lines = [
    "const { EmbedBuilder } = require('discord.js');",
    '',
    'const embed = new EmbedBuilder()',
    `    .setTitle(${JSON.stringify(embed.title)})`,
    `    .setDescription(${JSON.stringify(embed.description)})`,
    `    .setColor(${JSON.stringify(embed.color)})`,
  ];

  if (embed.authorName) {
    const properties = [
      `name: ${JSON.stringify(embed.authorName)}`,
    ];

    if (embed.authorUrl) {
      properties.push(`url: ${JSON.stringify(embed.authorUrl)}`);
    }

    if (embed.authorIconUrl) {
      properties.push(
        `iconURL: ${JSON.stringify(embed.authorIconUrl)}`
      );
    }

    lines.push(`    .setAuthor({ ${properties.join(', ')} })`);
  }

  if (embed.thumbnailUrl) {
    lines.push(
      `    .setThumbnail(${JSON.stringify(embed.thumbnailUrl)})`
    );
  }

  if (embed.imageUrl) {
    lines.push(
      `    .setImage(${JSON.stringify(embed.imageUrl)})`
    );
  }

  for (const field of embed.fields) {
    lines.push(
      `    .addFields({ name: ${JSON.stringify(field.name)}, value: ${JSON.stringify(field.value)}, inline: ${field.inline} })`
    );
  }

  if (embed.footer) {
    const properties = [
      `text: ${JSON.stringify(embed.footer)}`,
    ];

    if (embed.footerIconUrl) {
      properties.push(
        `iconURL: ${JSON.stringify(embed.footerIconUrl)}`
      );
    }

    lines.push(`    .setFooter({ ${properties.join(', ')} })`);
  }

  if (embed.timestamp) {
    lines.push('    .setTimestamp()');
  }

  lines[lines.length - 1] += ';';

  return lines.join('\n') + '\n';
}
