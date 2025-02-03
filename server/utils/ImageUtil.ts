import sharp from 'sharp'

export class ImageUtil {
  private raw: string
  private image: sharp.Sharp
  public isValid = false
  constructor(image: string | Buffer) {
    this.raw = typeof image !== 'string' ? image.toString('base64') : image
    // Check if this is a image or not
    try {
      // Try to create a sharp instance from the input
      this.image = sharp(Buffer.from(this.raw, 'base64'))
      // If no error is thrown, it's likely an image
      this.isValid = true
    } catch (e) {
      // If sharp throws an error, input is not a valid image
      this.isValid = false
      throw new Error('Invalid image input')
    }
  }

  /**
   * Checks if an image URL exists by sending a HEAD request to the specified URL.
   * @param url - The URL of the image to check.
   * @returns A promise that resolves to a boolean indicating whether the image URL is reachable (status code in the 200-299 range) or not.
   */
  static isImageUrlExist = (url: string) => {
    return new Promise((resolve, reject) => {
      fetch(url, { method: 'HEAD' })
        .then((response) => {
          // If the status code is in the 200-299 range, the URL is reachable.
          resolve(response.status >= 200 && response.status < 300)
        })
        .catch(reject)
    })
  }

  /**
   * Ensures that the image does not exceed the maximum width or height.
   * If the image's width or height is greater than the specified maximum,
   * it will be resized to fit within the maximum dimensions.
   *
   * @param max - The maximum width or height allowed for the image.
   * @returns The modified ImageUtil instance.
   */
  async ensureMax(max: number) {
    const metaData = await this.image.metadata()
    if (!metaData.width || !metaData.height) return this
    if (metaData.width > max || metaData.height > max) {
      this.resizeMax(max)
    }
    return this
  }

  /**
   * Calculates the width and height of an image based on the total number of pixels and the ratio.
   *
   * @param totalPixel - The total number of pixels in the image.
   * @param _ratio - The ratio of the image width to height. It can be either a number or a string in the format "width:height".
   * @returns An object containing the calculated width and height of the image.
   */
  static getResolution(totalPixel: number, _ratio: number | string) {
    let ratio = 1
    if (typeof _ratio === 'string') {
      const parts = _ratio.split(':')
      ratio = Number(parts[0]) / Number(parts[1])
    } else {
      ratio = Number(_ratio)
    }
    const b = Math.sqrt(totalPixel / ratio)
    const a = ratio * b
    return { width: Math.round(a), height: Math.round(b) }
  }

  /**
   * Ensures that the image does not exceed a maximum number of pixels.
   *
   * @param totalPixel - The maximum number of pixels allowed.
   * @returns The modified ImageUtil instance.
   */
  async ensureMaxPixel(totalPixel: number) {
    const metaData = await this.image.metadata()
    if (!metaData.width || !metaData.height) return this
    if (metaData.width * metaData.height < totalPixel) return this

    const ratio = metaData.width / metaData.height
    const b = Math.sqrt(totalPixel / ratio)
    const a = ratio * b
    const newResolution = { width: Math.round(a), height: Math.round(b) }
    this.image.resize(newResolution.width, newResolution.height, {
      fit: 'inside'
    })
    return this
  }

  /**
   * Convert image buffer to JPG with quality less than 8MB
   * @param image Input image buffer
   * @param quality Initial quality
   * @param step Decrease step
   * @returns Return image buffer with quality less than 8MB
   */
  static async toJPG(image: Buffer, quality = 95, step = 3, maxByte = 8388284): Promise<Buffer> {
    const output = await sharp(image).jpeg({ quality, mozjpeg: true }).toBuffer()
    if (output.byteLength > maxByte) {
      return this.toJPG(image, quality - step)
    }
    return output
  }

  async intoJPG() {
    return ImageUtil.toJPG(await this.getBuffer())
  }

  async getRatio() {
    const metaData = await this.image.metadata()
    if (!metaData.width || !metaData.height) return 1
    return metaData.width / metaData.height
  }

  /**
   * Converts the image into a high-quality JPEG format.
   *
   * @returns A promise that resolves to the image buffer in JPEG format.
   */
  async intoHighJPG() {
    return ImageUtil.toJPG(await this.getBuffer(), 98, 1)
  }

  /**
   * Converts the image into a preview format.
   *
   * @returns The converted image buffer.
   */
  async intoPreviewJPG() {
    return ImageUtil.toJPG(await this.getBuffer(), 80)
  }

  /**
   * Checks if the image is pure black.
   *
   * @returns A promise that resolves to a boolean indicating whether the image is pure black.
   */
  async isPureBlack() {
    const ctx = await this.image.resize(64, 64, { fit: 'inside' }).raw().toBuffer()
    const b64 = ctx.toString('base64')
    const blackPixel = b64.match(/A/g)?.length || 0
    return blackPixel === b64.length
  }

  async joinAlpha(mask: string) {
    const maskImage = sharp(Buffer.from(mask, 'base64'))
    const maskMetaData = await maskImage.metadata()
    const metaData = await this.image.metadata()
    if (metaData.width !== maskMetaData.width || metaData.height !== maskMetaData.height) {
      maskImage.resize(metaData.width, metaData.height, { fit: 'fill' })
    }
    const maskAlpha = await maskImage.extractChannel('alpha').toBuffer()
    this.image.ensureAlpha().joinChannel(maskAlpha)
    return this
  }

  /**
   * Fills the background of the image with black color.
   * @returns The modified ImageUtil instance.
   */
  fillBgBlack() {
    this.image.flatten({ background: { r: 0, g: 0, b: 0 } })
    return this
  }

  /**
   * Converts the image into PNG format.
   * @returns A promise that resolves to a buffer containing the PNG image data.
   */
  async intoPNG() {
    return this.image
      .png({
        force: true,
        palette: false,
        compressionLevel: 0
      })
      .toBuffer()
  }

  clone() {
    return new ImageUtil(this.raw)
  }

  /**
   * Resizes the image to the maximum dimension specified.
   * @param max - The maximum dimension to resize the image to.
   * @returns The modified ImageUtil instance.
   */
  resizeMax(max: number) {
    this.image.resize(max, max, { fit: 'inside' })
    return this
  }

  /**
   * Resizes the image to the specified width and height.
   * @param width - The desired width of the image.
   * @param height - The desired height of the image.
   * @returns The modified ImageUtil instance.
   */
  resizeTo(width: number, height: number) {
    this.image.resize(width, height, { fit: 'fill' })
    return this
  }

  /**
   * Retrieves the metadata of the image.
   *
   * @returns A promise that resolves to the metadata of the image.
   */
  async getMetaData() {
    return this.image.metadata()
  }

  /**
   * Retrieves the base64 representation of the image.
   * @returns A promise that resolves to a string representing the image in base64 format.
   */
  async getBase64() {
    return this.image.toBuffer().then((buffer) => buffer.toString('base64'))
  }

  /**
   * Retrieves the buffer representation of the image.
   *
   * @returns The buffer representation of the image.
   */
  async getBuffer() {
    return this.image.toBuffer()
  }
}
