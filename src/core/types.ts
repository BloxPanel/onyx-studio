export type Framework = 'pycord' | 'discord.py' | 'discord.js';

export interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

export interface EmbedDocument {
  title: string;
  description: string;
  color: string;
  footer: string;
  fields: EmbedField[];
}

export const initialEmbed: EmbedDocument = {
  title: 'Welcome to Onyx Studio!',
  description: 'Design visually. Export real code.',
  color: '#5865F2',
  footer: 'Made with Onyx Studio',
  fields: [],
};
