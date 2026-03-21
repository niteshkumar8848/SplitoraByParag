import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import toast from 'react-hot-toast'
import { Camera, X, Check } from 'lucide-react'
import { uploadAvatar } from '../../api/auth.api'
import useAuthStore from '../../store/authStore'
import Button from './Button'
import Modal from './Modal'
import Avatar from './Avatar'

const getCroppedImg = async (imageSrc, croppedAreaPixels) => {
  const image = new Image()
  image.src = imageSrc
  await new Promise((resolve) => { image.onload = resolve })
  const canvas = document.createElement('canvas')
  canvas.width = croppedAreaPixels.width
  canvas.height = croppedAreaPixels.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  )
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}

export default function AvatarUpload({ user, size = 'xl' }) {
  const { setUser } = useAuthStore()
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [uploading, setUploading] = useState(false)

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result)
      setIsCropModalOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!croppedAreaPixels || !imageSrc) return
    try {
      setUploading(true)
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      const formData = new FormData()
      formData.append('avatar', croppedBlob, 'avatar.jpg')
      const response = await uploadAvatar(formData)
      const updatedUser = response?.data?.user
      if (updatedUser) {
        setUser(updatedUser)
        localStorage.setItem('splitora_user', JSON.stringify(updatedUser))
      }
      toast.success('Profile picture updated!')
      setIsCropModalOpen(false)
      setImageSrc(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setIsCropModalOpen(false)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <>
      <div className="relative inline-block">
        <Avatar user={user} size={size} />
        <label
          htmlFor="avatar-upload-input"
          className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-600 text-white shadow-md transition hover:bg-primary-700"
          title="Change profile picture"
        >
          <Camera size={14} />
        </label>
        <input
          id="avatar-upload-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Modal isOpen={isCropModalOpen} onClose={handleCancel} title="Crop Profile Picture" size="md">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">Drag to reposition. Pinch or use slider to zoom.</p>

          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-surface-900">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary-600"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<X size={16} />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              leftIcon={<Check size={16} />}
              loading={uploading}
              onClick={handleUpload}
            >
              Save Photo
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
