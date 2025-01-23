import { Attachment } from '@/entities/attachment'
import { BackendENV } from '@/env'
import { S3Client } from 'bun'
import { Logger } from '@saintno/needed-tools'
import { LRUCache } from 'lru-cache'
import fs from 'fs'
import mime from 'mime'

export enum EAttachmentType {
  S3 = 's3',
  LOCAL = 'local'
}

class AttachmentService {
  private static instance: AttachmentService
  private s3?: S3Client
  private logger: Logger
  private cacheStorage: LRUCache<string, string>
  private localPath = process.cwd() + '/storage/attachments/'

  static getInstance(): AttachmentService {
    if (!AttachmentService.instance) {
      AttachmentService.instance = new AttachmentService()
    }
    return AttachmentService.instance
  }

  private constructor() {
    this.logger = new Logger('AttachmentService')
    this.cacheStorage = new LRUCache({
      ttl: 1000 * 60 * 60,
      ttlAutopurge: true
    })
    // Check if S3 config is set in environment variables
    if (!!BackendENV.S3_ENDPOINT && !!BackendENV.S3_ACCESS_KEY && !!BackendENV.S3_SECRET_KEY) {
      // Initialize S3 client with the provided config
      this.s3 = new S3Client({
        endpoint: BackendENV.S3_ENDPOINT,
        accessKeyId: BackendENV.S3_ACCESS_KEY,
        secretAccessKey: BackendENV.S3_SECRET_KEY,
        region: BackendENV.S3_REGION,
        bucket: BackendENV.S3_BUCKET_NAME
      })
      this.logger.i('init', 'Using S3 for file storage', {
        endpoint: BackendENV.S3_ENDPOINT,
        region: BackendENV.S3_REGION
      })
      this.checkS3Connection().then((connected) => {
        if (!connected) {
          this.logger.w('init', 'Failed to connect to S3, fallback into localstorage')
          this.s3 = undefined
        } else {
          this.logger.i('init', 'S3 connection successful')
        }
      })
    } else {
      this.logger.i('init', 'Using local storage for file storage')
    }
  }

  async checkS3Connection() {
    if (!this.s3) return false
    try {
      const file = this.s3.file('ping')
      await file.write('HelloWorld!')
      return true
    } catch (error: any) {
      this.logger.w('checkS3Connection', 'Error checking S3 connection', { error })
      return false
    }
  }

  async getAttachmentURL(item: Attachment, baseURL = 'http://localhost:3001') {
    return this.getFileURL(item.fileName, 3600 * 24, baseURL)
  }

  async getFileURL(fileName: string, expiresIn?: number, baseURL = '') {
    const place = await this.getExistObjectPlace(fileName)
    switch (place) {
      case EAttachmentType.S3: {
        const s3Url = this.cacheStorage.get(`s3Url:${fileName}`)
        if (s3Url) {
          return {
            type: EAttachmentType.S3,
            url: s3Url
          }
        } else {
          const signedUrl = await this.getSignedUrl(fileName, expiresIn)
          if (signedUrl) {
            this.cacheStorage.set(`s3Url:${fileName}`, signedUrl)
            return {
              type: EAttachmentType.S3,
              url: signedUrl
            }
          }
        }
      }
      case EAttachmentType.LOCAL: {
        return {
          type: EAttachmentType.LOCAL,
          url: baseURL + '/attachments/' + fileName
        }
      }
      default:
        return null
    }
  }

  async getSignedUrl(fileName: string, expiresIn?: number): Promise<string | undefined> {
    const place = await this.getExistObjectPlace(fileName)
    switch (place) {
      case EAttachmentType.S3: {
        return this.s3!.presign(fileName, {
          expiresIn
        })
      }
      default:
        return undefined
    }
  }

  async getFileBlob(fileName: string): Promise<Blob | null> {
    const place = await this.getExistObjectPlace(fileName)
    switch (place) {
      case EAttachmentType.S3: {
        try {
          const file = this.s3!.file(fileName)
          const arrBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrBuffer)
          return new Blob([buffer], { type: file.type })
        } catch (error) {
          this.logger.w('getFileBlob', 'Error fetching file from S3', { error })
          return null
        }
      }
      case EAttachmentType.LOCAL: {
        const filePath = `${this.localPath}${fileName}`
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath)
          const mimeType = mime.getType(fileName) || 'application/octet-stream'
          return new Blob([buffer], { type: mimeType })
        }
      }
      default:
        return null
    }
  }

  async uploadFile(file: Buffer, fileName: string) {
    try {
      if (this.s3) {
        const mimeType = mime.getType(fileName)
        const s3File = this.s3.file(fileName)
        await s3File.write(file, {
          type: mimeType ?? undefined
        })
        return true
      } else {
        if (!fs.existsSync(this.localPath)) {
          fs.mkdirSync(this.localPath, { recursive: true })
        }
        // Save file locally
        const filePath = `${this.localPath}${fileName}`
        fs.writeFileSync(filePath, file as any)
        return true
      }
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async uploadBlob(blob: Blob, fileName: string) {
    const buffer = Buffer.from(await blob.arrayBuffer())
    return this.uploadFile(buffer, fileName)
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (this.s3) {
      const fileName = fileUrl.split('/').pop()
      if (fileName) {
        const s3File = this.s3.file(fileName)
        await s3File.delete()
      }
    } else {
      // Delete file from local storage
      fs.unlinkSync(fileUrl)
    }
  }

  /**
   * Checks if an object with the specified fileName exists in the Minio bucket.
   * @param fileName - The name of the object to check.
   */
  getExistObjectPlace = async (fileName: string): Promise<EAttachmentType | null> => {
    if (this.s3) {
      const result = await this.s3.exists(fileName)
      if (!!result) {
        return EAttachmentType.S3
      }
    }
    if (fs.existsSync(this.localPath + fileName)) {
      return EAttachmentType.LOCAL
    }
    return null
  }
}

export default AttachmentService
