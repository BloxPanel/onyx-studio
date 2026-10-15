export type BlockType = 'section' | 'heading' | 'text' | 'button' | 'image' | 'divider' | 'card';
export type Align = 'left' | 'center' | 'right';
export interface WebBlock {
  id: string;
  type: BlockType;
  text: string;
  url: string;
  color: string;
  background: string;
  fontSize: number;
  padding: number;
  align: Align;
  children: WebBlock[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  sectionHeight?: number;
  fontFamily?: string;
  fontWeight?: number;
  italic?: boolean;
  underline?: boolean;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  cardDescription?: string;
  cardIconUrl?: string;
  cardButtonText?: string;
  cardShowIcon?: boolean;
  cardShowButton?: boolean;
  cardGap?: number;
}
export interface WebProject {
  version: 1;
  title: string;
  background: string;
  blocks: WebBlock[];
}
export const DESIGN_WIDTH = 1000;
export const DEFAULT_SECTION_HEIGHT = 440;
export const createBlock = (type: BlockType): WebBlock => ({
  id: crypto.randomUUID(), type,
  text: { section: '', heading: 'Your heading', text: 'Write something amazing.', button: 'Get Started', image: 'Image description', divider: '', card: 'Your Project' }[type],
  url: '', color: '#ffffff',
  background: type === 'section' ? '#172033' : type === 'button' ? '#6366f1' : type === 'card' ? '#222d46' : 'transparent',
  fontSize: type === 'heading' ? 42 : 16,
  padding: type === 'section' ? 24 : 12,
  align: 'center', children: [],
  fontFamily: 'Arial, sans-serif', fontWeight: type === 'heading' ? 700 : 400,
  italic: false, underline: false, borderRadius: type === 'card' ? 16 : type === 'button' ? 8 : 0,
  borderWidth: type === 'section' ? 0 : 2, borderColor: type === 'divider' ? '#94a3b8' : '#818cf8', opacity: 100,
  x: 100, y: 50,
  width: type === 'card' ? 360 : type === 'button' ? 240 : type === 'image' ? 400 : 800,
  height: type === 'card' ? 310 : type === 'divider' ? 12 : type === 'heading' ? 90 : type === 'text' ? 100 : type === 'button' ? 70 : 240,
  sectionHeight: type === 'section' ? DEFAULT_SECTION_HEIGHT : undefined,
  ...(type === 'card' ? {
    cardDescription: 'Describe what makes this project useful.',
    cardIconUrl: 'https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/panels-top-left.svg',
    cardButtonText: 'Explore project', cardShowIcon: true, cardShowButton: true,
    cardGap: 12, padding: 22, align: 'left' as Align, fontSize: 22, fontWeight: 700,
    borderWidth: 2, borderColor: '#465575', color: '#ffffff',
  } : {}),
});
export const initialWebsite: WebProject = {
  version: 1, title: 'My Website', background: '#0b1020',
  blocks: [{ ...createBlock('section'), children: [
    { ...createBlock('heading'), text: 'Built with Onyx Studio', x: 100, y: 55, width: 800, height: 90 },
    { ...createBlock('text'), text: 'Create your website visually. Own every line of the result.', x: 150, y: 175, width: 700, height: 75 },
    { ...createBlock('button'), text: 'Explore Projects', url: 'https://builtbybuzz.dev', x: 370, y: 295, width: 260, height: 70 },
  ] }],
};
