import { AttachmentGallery } from '@/components/AttachmentGallery'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug
  return <AttachmentGallery slug={slug} />
}
