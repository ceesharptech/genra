/**
 * Client-side image processor for creation media.
 * - Downscales large images to max 2000px dimension using Canvas.
 * - Converts non-GIF images to efficient WebP (quality 0.88).
 * - Leaves GIFs untouched to preserve multi-frame animation.
 * - Reads natural width and height.
 */

export interface ProcessedImageResult {
  file: Blob | File
  width: number
  height: number
  mimeType: string
  extension: string
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_DIMENSION = 2000

export async function processImageForUpload(file: File): Promise<ProcessedImageResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image exceeds the maximum allowed size of 10 MB')
  }

  // 1. Leave animated GIFs untouched
  if (file.type === 'image/gif') {
    const dimensions = await getImageDimensions(file)
    return {
      file,
      width: dimensions.width,
      height: dimensions.height,
      mimeType: 'image/gif',
      extension: 'gif',
    }
  }

  // 2. Process other image formats (JPEG, PNG, WebP)
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Calculate scaled dimensions if exceeding max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }

      // Render to canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Fallback: resolve original file
        resolve({
          file,
          width: img.naturalWidth,
          height: img.naturalHeight,
          mimeType: file.type || 'image/jpeg',
          extension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
        })
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Export as webp with 0.88 quality
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              width,
              height,
              mimeType: file.type,
              extension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
            })
            return
          }

          resolve({
            file: blob,
            width,
            height,
            mimeType: 'image/webp',
            extension: 'webp',
          })
        },
        'image/webp',
        0.88
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image file'))
    }

    img.src = objectUrl
  })
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: 0, height: 0 })
    }
    img.src = objectUrl
  })
}
