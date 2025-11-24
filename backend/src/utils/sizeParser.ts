const SIZE_REGEX = /\b(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3})\b/gi;

export const parseSizes = (description: string = ''): string[] => {
  const matches = description.match(SIZE_REGEX) ?? [];
  return Array.from(new Set(matches.map((size) => size.toUpperCase())));
};
















