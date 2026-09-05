import { useEffect, useState } from 'react'
import { avatarPath, fetchAvatar } from '../api/index'

type Props = {
  name: string
  className: string
  path?: string
  photoURL?: string
}

export function Avatar({ name, className, path, photoURL }: Props) {
  const [failed, setFailed] = useState(false)
  const [objectURL, setObjectURL] = useState('')
  const [failedPhotoURL, setFailedPhotoURL] = useState('')
  const directURL = verifiedPhotoURL(photoURL)
  const showDirect = !!directURL && failedPhotoURL !== directURL
  const initial = (name.trim().charAt(0) || '?').toUpperCase()

  useEffect(() => {
    let cancelled = false
    let currentObjectURL = ''
    setFailed(false)
    setObjectURL('')
    if (showDirect) return
    void fetchAvatar(path ?? avatarPath())
      .then((blob) => {
        currentObjectURL = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(currentObjectURL)
          return
        }
        setObjectURL(currentObjectURL)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (currentObjectURL) URL.revokeObjectURL(currentObjectURL)
    }
  }, [path, showDirect])

  if (showDirect) {
    return (
      <img
        className={className}
        src={directURL}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailedPhotoURL(directURL)}
      />
    )
  }

  if (failed || !objectURL) {
    return (
      <span className={`${className} avatar--fallback`} aria-hidden="true">
        {initial}
      </span>
    )
  }

  return (
    <img
      className={className}
      src={objectURL}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

export function verifiedPhotoURL(value?: string): string {
  if (!value) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : ''
  } catch {
    return ''
  }
}
