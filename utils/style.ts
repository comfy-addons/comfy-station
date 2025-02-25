import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determines if a color is considered "dark" based on its luminance value
 * @param color - Color string in hex (#RRGGBB) or RGB/RGBA format (rgb(r,g,b))
 * @returns boolean - true if the color is dark, false if light or invalid format
 * @example
 * ```ts
 * checkIsDarkColor('#000000') // returns true
 * checkIsDarkColor('rgb(0,0,0)') // returns true
 * checkIsDarkColor('#FFFFFF') // returns false
 * checkIsDarkColor('invalid') // returns false
 * ```
 */
export function checkIsDarkColor(color: string) {
  // Handle hex colors
  let r: number, g: number, b: number

  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    r = parseInt(hex.substr(0, 2), 16)
    g = parseInt(hex.substr(2, 2), 16)
    b = parseInt(hex.substr(4, 2), 16)
  }
  // Handle rgb/rgba colors
  else if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g)?.map(Number)
    if (!rgb || rgb.length < 3) return false
    ;[r, g, b] = rgb
  }
  // Handle named colors by returning a default
  else {
    return false
  }

  // Calculate relative luminance using the sRGB color space
  // Formula from: https://www.w3.org/TR/WCAG20/#relativeluminancedef
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b

  // If luminance is less than 128 (middle of 0-255), it's considered dark
  return luminance < 128
}

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
