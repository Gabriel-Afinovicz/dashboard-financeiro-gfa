/** Converte "#rrggbb" em "rgba(r,g,b,a)". */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Luminância relativa aproximada (0 escuro – 1 claro). */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Cor de texto legível sobre a cor informada. */
export function contrastText(hex: string): string {
  return luminance(hex) > 0.55 ? '#0a0a0a' : '#ffffff';
}

/** Gera uma rampa de cores (mais forte -> mais fraca) a partir de uma cor base. */
export function alphaRamp(hex: string, steps: number): string[] {
  const alphas = [1, 0.78, 0.58, 0.42, 0.28, 0.18, 0.12, 0.08];
  return Array.from({ length: steps }, (_, i) => hexToRgba(hex, alphas[Math.min(i, alphas.length - 1)]));
}
