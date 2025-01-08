import { z } from 'zod'

const ENVBackendSchema = z.object({
  BE_SAME_DOMAIN: z.boolean().optional().default(false),
  BACKEND_URL: z.string().optional().default('http://localhost:3001'),
  BACKEND_URL_INTERNAL: z.string().optional().default('http://localhost:3001'),
  NEXTAUTH_SECRET: z.string().optional().default('secret'),
  INTERNAL_SECRET: z.string().optional().default('internal-secret'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  OPENAI_BASE_URL: z.string().optional().default('https://api.openai.com/v1'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional().default('gpt-4o-mini')
})

export const BackendENV = ENVBackendSchema.parse({
  BE_SAME_DOMAIN: process.env.BE_SAME_DOMAIN === 'true',
  BACKEND_URL: process.env.BACKEND_URL,
  BACKEND_URL_INTERNAL: process.env.BACKEND_URL_INTERNAL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  INTERNAL_SECRET: process.env.INTERNAL_SECRET,
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL
})
