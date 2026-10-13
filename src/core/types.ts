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

  authorName: string;
  authorUrl: string;
  authorIconUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerIconUrl: string;
  timestamp: boolean;
}

export const initialEmbed: EmbedDocument = {
  title: 'Welcome to Onyx Studio!',
  description: 'Design visually. Export real code.',
  color: '#5865F2',
  footer: 'Made with Onyx Studio',
  fields: [],

  authorName: '',
  authorUrl: '',
  authorIconUrl: '',
  thumbnailUrl: '',
  imageUrl: '',
  footerIconUrl: '',
  timestamp: false,
};
