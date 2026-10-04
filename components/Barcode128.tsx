import React from 'react';

// Code 128 (set B) barcode as SVG — used for the IRN on the e-invoice print.
// Each pattern lists bar/space widths in modules; the last one is the stop.
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

/** Module widths (bar, space, bar…) for `text` in Code 128 set B. */
export function code128Widths(text: string): number[] {
  const codes = [...text].map((ch) => {
    const c = ch.charCodeAt(0) - 32;
    return c >= 0 && c < 95 ? c : 0; // characters outside set B print as a space
  });
  const check = (START_B + codes.reduce((sum, c, i) => sum + c * (i + 1), 0)) % 103;
  return [START_B, ...codes, check, STOP].flatMap((c) => [...PATTERNS[c]].map(Number));
}

export function Barcode128({ value, height = 40, className }: { value: string; height?: number; className?: string }) {
  const widths = code128Widths(value);
  const quiet = 10;
  const total = widths.reduce((s, w) => s + w, 0) + quiet * 2;
  let x = quiet;
  const bars: React.ReactNode[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={w} height={height} />);
    x += w;
  });
  return (
    <svg viewBox={`0 0 ${total} ${height}`} preserveAspectRatio="none" className={className} style={{ width: '100%', height }} role="img" aria-label={`Barcode ${value}`}>
      <rect width={total} height={height} fill="#fff" />
      <g fill="#000">{bars}</g>
    </svg>
  );
}
