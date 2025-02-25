/**
 * Generates a hex color based on the input text.
 * @param text - The input string to generate a color from.
 * @returns A hex color string in uppercase format.
 */
export const generateColorByText = (text: string) => {
  let r = 0,
    g = 0,
    b = 0
  for (let i = 0; i < text.length; i++) {
    r += text.charCodeAt(i)
    g += text.charCodeAt(i) * 2
    b += text.charCodeAt(i) * 3
  }
  r = r % 256
  g = g % 256
  b = b % 256
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
}
