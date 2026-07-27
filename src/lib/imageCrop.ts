/**
 * Square-crop math for the avatar editor. Pure — the canvas work at the bottom
 * is the only browser-touching part, so the geometry stays unit-testable.
 */

export interface CropState {
  /** Multiplier over the cover scale; 1 = image exactly fills the viewport. */
  zoom: number
  /** Pan in viewport pixels, from the centered position. */
  offsetX: number
  offsetY: number
  /** Degrees, 0 / 90 / 180 / 270. */
  rotation: number
}

export const INITIAL_CROP: CropState = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 }

/** Image dimensions after rotation — 90/270 swap the axes. */
export function rotatedSize(width: number, height: number, rotation: number) {
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width }
}

/** Smallest scale that still covers a `viewport`-sized square. */
export function coverScale(width: number, height: number, viewport: number) {
  return viewport / Math.min(width, height)
}

/** Keep the image covering the viewport — no empty corners while panning. */
export function clampOffset(offset: number, drawn: number, viewport: number) {
  const slack = Math.max(0, (drawn - viewport) / 2)
  return Math.min(slack, Math.max(-slack, offset))
}

/** Both axes at once, given the raw image size and the current crop state. */
export function clampCrop(
  crop: CropState,
  imageWidth: number,
  imageHeight: number,
  viewport: number,
): CropState {
  const size = rotatedSize(imageWidth, imageHeight, crop.rotation)
  const scale = coverScale(size.width, size.height, viewport) * Math.max(1, crop.zoom)
  return {
    ...crop,
    zoom: Math.max(1, crop.zoom),
    offsetX: clampOffset(crop.offsetX, size.width * scale, viewport),
    offsetY: clampOffset(crop.offsetY, size.height * scale, viewport),
  }
}

/**
 * Paint the cropped square. `viewport` is the size the crop state was authored
 * against; `output` is the pixel size to render at, so the on-screen preview and
 * the saved file share one code path.
 */
export function drawCrop(
  canvas: HTMLCanvasElement,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  crop: CropState,
  viewport: number,
  output = viewport,
) {
  const context = canvas.getContext('2d')
  if (!context) return
  canvas.width = output
  canvas.height = output
  const ratio = output / viewport
  const size = rotatedSize(imageWidth, imageHeight, crop.rotation)
  const scale = coverScale(size.width, size.height, viewport) * crop.zoom * ratio

  context.clearRect(0, 0, output, output)
  context.save()
  context.translate(output / 2 + crop.offsetX * ratio, output / 2 + crop.offsetY * ratio)
  context.rotate((crop.rotation * Math.PI) / 180)
  context.scale(scale, scale)
  context.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight)
  context.restore()
}

/**
 * Encode down until the result fits `maxBytes`, stopping at the first quality
 * that does. The last step is returned even if it misses — a slightly-too-big
 * avatar beats refusing to save one.
 */
export async function encodeJpegUnder(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<Blob> {
  let blob = await canvasToJpeg(canvas, 0.8)
  for (const quality of [0.6, 0.45, 0.3, 0.2]) {
    if (blob.size <= maxBytes) break
    blob = await canvasToJpeg(canvas, quality)
  }
  return blob
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
      'image/jpeg',
      quality,
    )
  })
}
