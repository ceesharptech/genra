/**
 * Converts a storage path or external URL to a fully qualified public URL.
 * Handles paths inside the public 'creation-media' bucket.
 */
export function getMediaUrl(
  pathOrUrl: string | null | undefined
): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') {
    return null
  }

  const trimmed = pathOrUrl.trim()
  if (!trimmed) {
    return null
  }

  // Already a full external URL (e.g. YouTube embed, external image)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return null
  }

  const cleanPath = trimmed.replace(/^\/+/, '')
  const cleanBase = supabaseUrl.replace(/\/+$/, '')

  return `${cleanBase}/storage/v1/object/public/creation-media/${cleanPath}`
}
