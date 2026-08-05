import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, RotateCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import { useRemoveAvatar, useUploadAvatar } from '@/lib/queries/profiles'
import {
  clampCrop,
  drawCrop,
  encodeJpegUnder,
  INITIAL_CROP,
  type CropState,
} from '@/lib/imageCrop'

const ACCEPT = 'image/png,image/jpeg,image/heic,image/heif'
const MAX_BYTES = 10 * 1024 * 1024
const OUTPUT = 512
/** Saved file must be at least 60% smaller than what the teacher picked. */
const SIZE_BUDGET = 0.4

interface AvatarUploadDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasPhoto: boolean
}

export function AvatarUploadDrawer({
  open,
  onOpenChange,
  hasPhoto,
}: AvatarUploadDrawerProps) {
  const { toast } = useToast()
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const captureRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<ImageBitmap | null>(null)
  const [sourceBytes, setSourceBytes] = useState(0)
  const [crop, setCrop] = useState<CropState>(INITIAL_CROP)
  const previewRef = useRef<HTMLCanvasElement>(null)
  // The crop is expressed in viewport pixels, so the editor size is state: a
  // 288px square on a phone would waste half a desktop dialog.
  const [viewport, setViewport] = useState(288)

  useEffect(() => {
    const large = window.matchMedia('(min-width: 1024px)')
    const medium = window.matchMedia('(min-width: 768px)')
    const sync = () => setViewport(large.matches ? 400 : medium.matches ? 340 : 288)
    sync()
    large.addEventListener('change', sync)
    medium.addEventListener('change', sync)
    return () => {
      large.removeEventListener('change', sync)
      medium.removeEventListener('change', sync)
    }
  }, [])

  // Resizing mid-edit can leave the image off-centre; re-clamp rather than reset.
  useEffect(() => {
    if (image)
      setCrop((current) => clampCrop(current, image.width, image.height, viewport))
  }, [viewport, image])

  // Repaint the editor and the "how it will look" preview together.
  useEffect(() => {
    if (!image) return
    if (canvasRef.current) {
      drawCrop(
        canvasRef.current,
        image,
        image.width,
        image.height,
        crop,
        viewport,
        viewport,
      )
    }
    if (previewRef.current) {
      drawCrop(previewRef.current, image, image.width, image.height, crop, viewport, 96)
    }
  }, [image, crop, viewport])

  function reset() {
    setImage(null)
    setCrop(INITIAL_CROP)
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  async function handleFile(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = '' // so re-picking the same file still fires onChange
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast({ title: 'That photo is over 10 MB', tone: 'error' })
      return
    }
    try {
      const bitmap = await createImageBitmap(file)
      setImage(bitmap)
      setSourceBytes(file.size)
      setCrop(INITIAL_CROP)
    } catch {
      toast({
        title: 'Could not open that photo',
        description: 'Try a JPG or PNG — this device cannot read that format.',
        tone: 'error',
      })
    }
  }

  function pan(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.buttons !== 1 || !image) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setCrop((current) =>
      clampCrop(
        {
          ...current,
          offsetX: current.offsetX + event.movementX,
          offsetY: current.offsetY + event.movementY,
        },
        image.width,
        image.height,
        viewport,
      ),
    )
  }

  async function save() {
    if (!image) return
    try {
      const canvas = document.createElement('canvas')
      drawCrop(canvas, image, image.width, image.height, crop, viewport, OUTPUT)
      await upload.mutateAsync(await encodeJpegUnder(canvas, sourceBytes * SIZE_BUDGET))
      toast({ title: 'Profile photo updated', tone: 'success' })
      close()
    } catch (error) {
      toast({
        title: 'Could not save the photo',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function removePhoto() {
    try {
      await remove.mutateAsync()
      toast({ title: 'Profile photo removed', tone: 'success' })
      close()
    } catch (error) {
      toast({
        title: 'Could not remove the photo',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <ResponsiveDrawerContent
        className={
          image
            ? 'md:w-[min(34rem,calc(100%-3rem))] lg:w-[min(52rem,calc(100%-4rem))] xl:w-[min(56rem,calc(100%-8rem))]'
            : 'md:w-[min(28rem,calc(100%-3rem))] lg:w-[min(30rem,calc(100%-4rem))] xl:w-[min(30rem,calc(100%-8rem))]'
        }
      >
        <ResponsiveDrawerHeader
          title={image ? 'Adjust your photo' : 'Profile photo'}
          description={
            image
              ? 'Drag to reposition, zoom and rotate. The circle is what shows in the app.'
              : 'PNG, JPG or HEIC up to 10 MB. Saved as a square JPG.'
          }
        />
        <ResponsiveDrawerBody>
          {image ? (
            <div className="gap-6 lg:grid lg:grid-cols-[auto_1fr] lg:items-start">
              <div
                className="relative mx-auto lg:mx-0"
                style={{ width: viewport, height: viewport }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerMove={pan}
                  style={{ width: viewport, height: viewport }}
                  className="cursor-grab touch-none rounded-2xl border border-(--color-border) bg-(--color-surface-2) active:cursor-grabbing"
                />
                {/* Rule of thirds, plus the circle the app actually shows. The
                    saved file is the whole square, so both are drawn. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/35" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/35" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/35" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/35" />
                  <div className="absolute inset-0 rounded-full ring-2 ring-white/70" />
                </div>
              </div>

              <div className="mt-5 space-y-5 lg:mt-0">
                <div className="flex items-center gap-3">
                  <canvas
                    ref={previewRef}
                    width={96}
                    height={96}
                    aria-hidden
                    className="size-12 rounded-full border border-(--color-border)"
                  />
                  <p className="text-sm text-(--color-ink-muted)">
                    How it will look beside your name.
                  </p>
                </div>

                <label className="flex items-center gap-3 text-sm font-medium">
                  Zoom
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={crop.zoom}
                    aria-label="Zoom"
                    className="flex-1"
                    onChange={(event) =>
                      setCrop((current) =>
                        clampCrop(
                          { ...current, zoom: Number(event.target.value) },
                          image.width,
                          image.height,
                          viewport,
                        ),
                      )
                    }
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCrop((current) =>
                        clampCrop(
                          { ...current, rotation: (current.rotation + 90) % 360 },
                          image.width,
                          image.height,
                          viewport,
                        ),
                      )
                    }
                  >
                    <RotateCw className="size-4" /> Rotate
                  </Button>
                  <Button type="button" variant="ghost" onClick={reset}>
                    Choose another
                  </Button>
                </div>

                <p className="text-xs text-(--color-ink-faint)">
                  Drag the photo to reposition it. Saved at 512px and compressed to at
                  least 60% smaller than the file you picked.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <input
                ref={pickRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(event) => void handleFile(event.target)}
              />
              <input
                ref={captureRef}
                type="file"
                accept={ACCEPT}
                capture="user"
                className="hidden"
                onChange={(event) => void handleFile(event.target)}
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => pickRef.current?.click()}
              >
                <ImagePlus className="size-4" /> Upload a photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => captureRef.current?.click()}
              >
                <Camera className="size-4" /> Take a photo
              </Button>
              {hasPhoto && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  loading={remove.isPending}
                  onClick={() => void removePhoto()}
                >
                  <Trash2 className="size-4" /> Remove current photo
                </Button>
              )}
            </div>
          )}
        </ResponsiveDrawerBody>
        {image && (
          <ResponsiveDrawerFooter
            primaryLabel="Save photo"
            primaryLoading={upload.isPending}
            onPrimary={() => void save()}
            onSecondary={close}
          />
        )}
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}
