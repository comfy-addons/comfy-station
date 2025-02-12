/**
 * Converts either white or black pixels in an image to transparent pixels
 * @param file - The input image File object
 * @param removeColor - The color to remove ('white' | 'black')
 * @param tolerance - How close to pure white/black to consider (0-255, default 5)
 * @returns Promise<Blob> - A promise that resolves to a PNG blob with transparent background
 */
export const removeBackground = async (
  file: File,
  removeColor: 'white' | 'black' = 'white',
  tolerance: number = 5
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          if (removeColor === 'white') {
            // Check if pixel is close to white
            if (r >= 255 - tolerance && g >= 255 - tolerance && b >= 255 - tolerance) {
              data[i + 3] = 0 // Set alpha to transparent
            }
          } else {
            // Check if pixel is close to black
            if (r <= tolerance && g <= tolerance && b <= tolerance) {
              data[i + 3] = 0 // Set alpha to transparent
            }
          }
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        }, 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    } catch (error) {
      reject(error)
    }
  })
}
