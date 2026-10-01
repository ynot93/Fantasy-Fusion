export function centsToKsh(cents: number): number {
  return cents / 100;
}

export function kshToCents(ksh: number): number {
  return Math.round(ksh * 100);
}
