import type { EmbedDocument, Framework } from './types';
import { exportPycord } from '../editors/discord/exporters/pycord';
import { exportDiscordPy } from '../editors/discord/exporters/discordpy';
import { exportDiscordJs } from '../editors/discord/exporters/discordjs';

export const exporters: Record<Framework, (embed: EmbedDocument) => string> = {
  pycord: exportPycord,
  'discord.py': exportDiscordPy,
  'discord.js': exportDiscordJs,
};

export function generateCode(
  framework: Framework,
  embed: EmbedDocument
): string {
  return exporters[framework](embed);
}
