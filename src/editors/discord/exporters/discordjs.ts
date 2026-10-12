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

  for (const field of embed.fields) {
    lines.push(
      `    .addFields({ name: ${JSON.stringify(field.name)}, value: ${JSON.stringify(field.value)}, inline: ${field.inline} })`
    );
  }

  if (embed.footer) {
    lines.push(`    .setFooter({ text: ${JSON.stringify(embed.footer)} })`);
  }

  lines[lines.length - 1] += ';';

  return lines.join('\n');
}
