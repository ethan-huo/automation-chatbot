'use client'

type CircularProgressProps = {
  size: number
  fillColor: string
  total: number
  current: number
  className?: string
}

export function CircularProgress({
  size,
  fillColor,
  total,
  current,
  className,
}: CircularProgressProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (current / total) * circumference
  const halfSize = size / 2

  const commonParams = {
    cx: halfSize,
    cy: halfSize,
    r: radius,
    fill: 'none' as const,
    strokeWidth,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <circle {...commonParams} stroke="#e2e8f0" />
      <circle
        {...commonParams}
        stroke={fillColor}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        transform={`rotate(-90 ${halfSize} ${halfSize})`}
        strokeLinecap="round"
      />
    </svg>
  )
}
