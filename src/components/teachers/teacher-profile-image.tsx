'use client'

import { CldImage } from 'next-cloudinary'

type TeacherProfileImageProps = {
  profileImagePublicId: string | null
  name: string
}

const isCloudinaryAvailable = Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)

export function TeacherProfileImage({ profileImagePublicId, name }: TeacherProfileImageProps) {
  if (profileImagePublicId && isCloudinaryAvailable) {
    return (
      <CldImage
        width={96}
        height={96}
        src={profileImagePublicId}
        sizes="96px"
        alt={`${name} 프로필 사진`}
        className="w-24 h-24 rounded-full object-cover border-2 border-gray-100"
        crop="fill"
        gravity="face"
        quality="auto"
        format="auto"
      />
    )
  }

  return (
    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
      <span className="text-gray-400 text-sm">No Image</span>
    </div>
  )
}
