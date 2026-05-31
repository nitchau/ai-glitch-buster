export const theme = {
  colors: {
    background: '#0a0820',
    primary: '#43e97b',
    secondary: '#38f9d7',
    accent: '#ffd700',
    danger: '#f5576c',
    warning: '#ffce3a',
    text: '#cfeefe',
    textDark: '#15234a',
  },
  fonts: { display: 'Arial Black, sans-serif', body: 'Arial, sans-serif' },
  sizes: { hud: 18, banner: 22, modalQ: 22, button: 18 },
  radii: { sm: 6, md: 12, lg: 18 },
} as const;

export type Theme = typeof theme;
