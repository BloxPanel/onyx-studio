import type { EmbedDocument } from '../../../core/types';

export function exportDiscordPy(embed: EmbedDocument): string {
  const lines = [
    'import discord',
    '',
    'embed = discord.Embed(',
    `    title=${JSON.stringify(embed.title)},`,
    `    description=${JSON.stringify(embed.description)},`,
    `    color=discord.Color(0x${embed.color.slice(1)})`,
    ')',
  ];

  for (const field of embed.fields) {
    lines.push(
      `embed.add_field(name=${JSON.stringify(field.name)}, value=${JSON.stringify(field.value)}, inline=${field.inline ? 'True' : 'False'})`
    );
  }

  if (embed.footer) {
    lines.push(`embed.set_footer(text=${JSON.stringify(embed.footer)})`);
  }

  return lines.join('\n');
}
