'use client'

import type { MotionValue } from 'motion/react'
import type {
  ComponentProps,
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
  TouchEventHandler,
} from 'react'
import { cn } from '@/lib/utils'
import { GripVerticalIcon } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { createContext, useContext, useState } from 'react'

type ImageComparisonContextType = {
  sliderPosition: number
  setSliderPosition: (pos: number) => void
  motionSliderPosition: MotionValue<number>
  mode: 'hover' | 'drag'
}

const ImageComparisonContext = createContext<
  ImageComparisonContextType | undefined
>(undefined)

const useImageComparisonContext = () => {
  const context = useContext(ImageComparisonContext)

  if (!context) {
    throw new Error(
      'useImageComparisonContext must be used within a ImageComparison',
    )
  }

  return context
}

export type ComparisonProps = HTMLAttributes<HTMLDivElement> & {
  mode?: 'hover' | 'drag'
  onDragStart?: () => void
  onDragEnd?: () => void
}

export const Comparison = ({
  className,
  mode = 'drag',
  onDragStart,
  onDragEnd,
  ...props
}: ComparisonProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const motionValue = useMotionValue(50)
  const motionSliderPosition = useSpring(motionValue, {
    bounce: 0,
    duration: 0,
  })
  const [sliderPosition, setSliderPosition] = useState(50)

  const handleDrag = (domRect: DOMRect, clientX: number) => {
    if (!isDragging && mode === 'drag') {
      return
    }

    const x = clientX - domRect.left
    const percentage = Math.min(Math.max((x / domRect.width) * 100, 0), 100)
    motionValue.set(percentage)
    setSliderPosition(percentage)
  }

  const handleMouseDrag: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!event) {
      return
    }

    const containerRect = event.currentTarget.getBoundingClientRect()

    handleDrag(containerRect, event.clientX)
  }

  const handleTouchDrag: TouchEventHandler<HTMLDivElement> = (event) => {
    if (!event) {
      return
    }

    const containerRect = event.currentTarget.getBoundingClientRect()
    const touches = Array.from(event.touches)

    handleDrag(containerRect, touches.at(0)?.clientX ?? 0)
  }

  const handleDragStart = () => {
    if (mode === 'drag') {
      setIsDragging(true)
      onDragStart?.()
    }
  }

  const handleDragEnd = () => {
    if (mode === 'drag') {
      setIsDragging(false)
      onDragEnd?.()
    }
  }

  return (
    <ImageComparisonContext.Provider
      value={{ sliderPosition, setSliderPosition, motionSliderPosition, mode }}
    >
      <div
        className={cn(
          'relative isolate w-full overflow-hidden select-none',
          className,
        )}
        onMouseMove={handleMouseDrag}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchMove={handleTouchDrag}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        role="slider"
        tabIndex={0}
        aria-label="Comparison slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderPosition}
        {...props}
      />
    </ImageComparisonContext.Provider>
  )
}

export type ComparisonItemProps = ComponentProps<typeof motion.div> & {
  position: 'left' | 'right'
}

export const ComparisonItem = ({
  className,
  position,
  ...props
}: ComparisonItemProps) => {
  const { motionSliderPosition } = useImageComparisonContext()
  const leftClipPath = useTransform(
    motionSliderPosition,
    (value) => `inset(0 0 0 ${value}%)`,
  )
  const rightClipPath = useTransform(
    motionSliderPosition,
    (value) => `inset(0 ${100 - value}% 0 0)`,
  )

  return (
    <motion.div
      className={cn('absolute inset-0 h-full w-full object-cover', className)}
      style={{
        clipPath: position === 'left' ? leftClipPath : rightClipPath,
      }}
      role="img"
      aria-hidden="true"
      {...props}
    />
  )
}

export type ComparisonHandleProps = ComponentProps<typeof motion.div> & {
  children?: ReactNode
}

export const ComparisonHandle = ({
  className,
  children,
  ...props
}: ComparisonHandleProps) => {
  const { motionSliderPosition, mode } = useImageComparisonContext()
  const left = useTransform(motionSliderPosition, (value) => `${value}%`)

  return (
    <motion.div
      className={cn(
        'absolute top-0 z-50 flex h-full w-10 -translate-x-1/2 items-center justify-center',
        mode === 'drag' && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      style={{ left }}
      role="presentation"
      aria-hidden="true"
      {...props}
    >
      {children ?? (
        <>
          <div className="bg-background absolute left-1/2 h-full w-1 -translate-x-1/2" />
          {mode === 'drag' && (
            <div className="bg-background z-50 flex items-center justify-center rounded-sm px-0.5 py-1">
              <GripVerticalIcon className="text-muted-foreground h-4 w-4 select-none" />
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
