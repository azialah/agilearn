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
const VIEWPORT = 288
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

  // Repaint the preview whenever the source or the crop changes.
  useEffect(() => {
    if (!image || !canvasRef.current) return
    drawCrop(
      canvasRef.current,
      image,
      image.width,
      image.height,
      crop,
      VIEWPORT,
      VIEWPORT,
    )
  }, [image, crop])

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
        VIEWPORT,
      ),
    )
  }

  async function save() {
    if (!image) return
    try {
      const canvas = document.createElement('canvas')
      drawCrop(canvas, image, image.width, image.height, crop, VIEWPORT, OUTPUT)
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
      <ResponsiveDrawerContent className="md:w-[min(28rem,calc(100%-3rem))] lg:w-[min(30rem,calc(100%-4rem))] xl:w-[min(30rem,calc(100%-8rem))]">
        <ResponsiveDrawerHeader
          title={image ? 'Adjust your photo' : 'Profile photo'}
          description={
            image
              ? 'Drag to reposition, zoom and rotate. Only the circle is saved.'
              : 'PNG, JPG or HEIC up to 10 MB. Saved as a square JPG.'
          }
        />
        <ResponsiveDrawerBody>
          {image ? (
            <div className="flex flex-col items-center gap-5">
              <canvas
                ref={canvasRef}
                onPointerMove={pan}
                style={{ width: VIEWPORT, height: VIEWPORT }}
                className="max-w-full cursor-grab touch-none rounded-full border border-(--color-border) bg-(--color-surface-2) active:cursor-grabbing"
              />
              <label className="flex w-full max-w-xs items-center gap-3 text-sm font-medium">
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
                        VIEWPORT,
                      ),
                    )
                  }
                />
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setCrop((current) =>
                      clampCrop(
                        { ...current, rotation: (current.rotation + 90) % 360 },
                        image.width,
                        image.height,
                        VIEWPORT,
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
