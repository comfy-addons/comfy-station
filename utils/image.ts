/**
 * Converts white pixels in an image to transparent pixels
 * @param file - The input image File object
 * @returns Promise<Blob> - A promise that resolves to a PNG blob with transparent background
 */
export const removeWhiteBackground = async (file: File): Promise<Blob> => {
  // Create a new promise to handle the image processing
  return new Promise((resolve, reject) => {
    try {
      // Create temporary image and canvas elements
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // When image loads, process it
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the image on canvas
        ctx.drawImage(img, 0, 0)

        // Get image data to process pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Process each pixel
        // Note: data array contains [r,g,b,a,r,g,b,a,...] values
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // Check if pixel is white-ish (allowing some tolerance)
          // You can adjust these values for different levels of "whiteness"
          if (r > 250 && g > 250 && b > 250) {
            // Set alpha to 0 (transparent)
            data[i + 3] = 0
          }
        }

        // Put the processed image data back on the canvas
        ctx.putImageData(imageData, 0, 0)

        // Convert canvas to PNG blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        }, 'image/png')
      }

      // Handle image load errors
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      // Load the image from the File object
      img.src = URL.createObjectURL(file)
    } catch (error) {
      reject(error)
    }
  })
}

// Example usage:
// const processedBlob = await removeWhiteBackground(imageFile);
