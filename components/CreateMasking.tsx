import React, { useRef, useState, useEffect } from 'react'
import { TInputFileType } from '@/states/fileDrag'
import { trpc } from '@/utils/trpc'
import { removeBackground } from '@/utils/image'
import { LoadingSVG } from './svg/LoadingSVG'
import { cn } from '@/utils/style'
import { useTranslations } from 'next-intl'

interface CreateMaskingProps {
  file: TInputFileType | null
  brushSize?: number
  onMaskChange?: (maskURL: string | null) => void
  onBrushSizeChange?: (size: number) => void
}
const CreateMasking: React.FC<CreateMaskingProps> = ({ file, brushSize = 5, onMaskChange, onBrushSizeChange }) => {
  const t = useTranslations('components.createMasking')
  // Refs for the canvases
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  // Refs for the canvases
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Local state for image, drawing status, and the exported mask URL
  const [imageLoaded, setImageLoaded] = useState(false)
  const [maskLoading, setMaskLoading] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 })
  const [history, setHistory] = useState<ImageData[]>([])

  // Pan state
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [isAltPressed, setIsAltPressed] = useState(false)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 })

  const getFileUrlMut = trpc.attachment.getFileUrlMutation.useMutation()

  // Update canvas size to fit container while maintaining aspect ratio
  const updateCanvasSize = () => {
    if (!containerRef.current || !baseCanvasRef.current || !drawingCanvasRef.current || !imageLoaded) return

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const scale = Math.min(containerWidth / originalSize.width, containerHeight / originalSize.height)

    const scaledWidth = originalSize.width * scale * zoom
    const scaledHeight = originalSize.height * scale * zoom

    const baseCanvas = baseCanvasRef.current
    const drawingCanvas = drawingCanvasRef.current

    baseCanvas.style.width = `${scaledWidth}px`
    baseCanvas.style.height = `${scaledHeight}px`
    drawingCanvas.style.width = `${scaledWidth}px`
    drawingCanvas.style.height = `${scaledHeight}px`
  }

  useEffect(() => {
    updateCanvasSize()
  }, [zoom, imageLoaded])

  useEffect(() => {
    if (file) {
      setMaskLoading(true)
      const img = new Image()
      const baseCanvas = baseCanvasRef.current
      const drawingCanvas = drawingCanvasRef.current
      if (!baseCanvas || !drawingCanvas) return
      img.onload = () => {
        // Set original dimensions
        setOriginalSize({ width: img.width, height: img.height })
        // Set canvas drawing dimensions
        baseCanvas.width = img.width
        baseCanvas.height = img.height
        drawingCanvas.width = img.width
        drawingCanvas.height = img.height

        // Draw the image on the base canvas
        const baseCtx = baseCanvas.getContext('2d')
        if (!baseCtx) return
        baseCtx.drawImage(img, 0, 0, img.width, img.height)

        // Clear the drawing canvas
        const drawingCtx = drawingCanvas.getContext('2d')
        if (!drawingCtx) return
        drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height)

        if (file.type === 'mask') {
          const maskFile = file.data
          removeBackground(maskFile, 'black').then((blob) => {
            const maskImg = new Image()
            maskImg.onload = () => {
              drawingCtx.drawImage(maskImg, 0, 0)
              // Invert the mask colors
              const imageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)
              const data = imageData.data
              for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i]
                data[i + 1] = 255 - data[i + 1]
                data[i + 2] = 255 - data[i + 2]
              }
              drawingCtx.putImageData(imageData, 0, 0)
              setMaskLoading(false)
            }
            maskImg.src = URL.createObjectURL(blob)
          })
        } else {
          setMaskLoading(false)
        }

        setImageLoaded(true)
      }
      switch (file.type) {
        case 'attachment': {
          getFileUrlMut.mutateAsync(file.data).then((urls) => {
            if (urls.high) {
              img.src = urls.high.url
            }
          })
          break
        }
        case 'mask': {
          if (file.original.type === 'attachment') {
            getFileUrlMut.mutateAsync(file.original.data).then((urls) => {
              if (urls.high) {
                img.src = urls.high.url
              }
            })
          } else {
            img.src = URL.createObjectURL(file.original.data)
          }
          break
        }
        case 'file': {
          img.src = URL.createObjectURL(file.data)
          break
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  // Handle keyboard events for space and alt keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault()
        setIsAltPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        setIsPanning(false)
      }
      if (e.code === 'AltLeft' || e.code === 'AltRight') {
        e.preventDefault()
        setIsAltPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isSpacePressed])

  // Handle zoom and brush size
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY / 1000
      setZoom((prevZoom) => Math.min(Math.max(0.1, prevZoom + delta), 5))
    } else {
      // Adjust brush size when not zooming
      const delta = -e.deltaY / 100
      const newSize = Math.min(Math.max(1, brushSize + delta), 200)
      onBrushSizeChange?.(newSize)
    }
  }

  // Utility to get mouse coordinates relative to a canvas
  const getMousePosInCanvas = (canvas: HTMLCanvasElement, event: React.MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }

  const getMousePosInDiv = (div: HTMLDivElement, event: React.MouseEvent): { x: number; y: number } => {
    const rect = div.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  // Mouse event handlers for panning
  const handleMouseDownGeneral = (e: React.MouseEvent) => {
    if (isSpacePressed) {
      setIsPanning(true)
      setLastPanPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMoveGeneral = (e: React.MouseEvent) => {
    // Mouse position on containerRef
    const pos = getMousePosInDiv(containerRef.current!, e)
    setCursorPos(pos)

    if (isPanning) {
      const deltaX = e.clientX - lastPanPos.x
      const deltaY = e.clientY - lastPanPos.y
      setPanPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      setLastPanPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUpGeneral = () => {
    setIsPanning(false)
  }

  // Mouse event handlers for drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSpacePressed) return // Don't draw while panning

    const drawingCanvas = drawingCanvasRef.current
    if (!drawingCanvas) return

    const pos = getMousePosInCanvas(drawingCanvas, e)
    setIsDrawing(true)
    setLastPos(pos)

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    // Compute effective scale factor (CSS pixels per internal canvas unit)
    let effectiveScale = 1
    if (containerRef.current && originalSize.width && originalSize.height) {
      const container = containerRef.current
      const scaleVal = Math.min(
        container.clientWidth / originalSize.width,
        container.clientHeight / originalSize.height
      )
      effectiveScale = scaleVal * zoom
    }

    // Adjust line width and radius to counter the CSS scaling
    ctx.strokeStyle = isAltPressed ? 'white' : 'black'
    ctx.fillStyle = isAltPressed ? 'white' : 'black'
    ctx.lineWidth = brushSize / effectiveScale
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.arc(pos.x, pos.y, brushSize / 2 / effectiveScale, 0, Math.PI * 2)
    ctx.fill()
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isSpacePressed) return
    const drawingCanvas = drawingCanvasRef.current
    if (!drawingCanvas) return

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    const pos = getMousePosInCanvas(drawingCanvas, e)

    // Compute effective scale factor again
    let effectiveScale = 1
    if (containerRef.current && originalSize.width && originalSize.height) {
      const container = containerRef.current
      const scaleVal = Math.min(
        container.clientWidth / originalSize.width,
        container.clientHeight / originalSize.height
      )
      effectiveScale = scaleVal * zoom
    }

    ctx.strokeStyle = isAltPressed ? 'white' : 'black'
    ctx.lineWidth = brushSize / effectiveScale
    ctx.lineCap = 'round'

    ctx.beginPath()
    ctx.moveTo(lastPos.x, lastPos.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    setLastPos(pos)
  }

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory() // Save state to history when drawing ends
      exportMask() // Auto-export mask when user finishes drawing
    }
  }

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory() // Save state to history when drawing ends
      exportMask() // Auto-export mask when mouse leaves canvas while drawing
    }
  }

  // Export the drawn mask as a black and white image
  // Save current canvas state to history
  const saveToHistory = () => {
    const drawingCanvas = drawingCanvasRef.current
    if (!drawingCanvas) return

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)
    setHistory((prev) => [...prev, imageData])
  }

  // Undo last drawing action
  const undo = () => {
    if (history.length === 0) return

    const drawingCanvas = drawingCanvasRef.current
    if (!drawingCanvas) return

    const ctx = drawingCanvas.getContext('2d')
    if (!ctx) return

    // Remove the last state from history
    setHistory((prev) => {
      const newHistory = [...prev]
      newHistory.pop()

      // Clear canvas
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height)

      // If there's a previous state, restore it
      const lastState = newHistory[newHistory.length - 1]
      if (lastState) {
        ctx.putImageData(lastState, 0, 0)
      }

      return newHistory
    })

    // Export the new mask state
    exportMask()
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [history])

  const exportMask = () => {
    const drawingCanvas = drawingCanvasRef.current
    if (!drawingCanvas) return

    // Create an offscreen canvas and fill it with a white background
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = drawingCanvas.width
    offscreenCanvas.height = drawingCanvas.height
    const offscreenCtx = offscreenCanvas.getContext('2d')
    if (!offscreenCtx) return

    offscreenCtx.fillStyle = 'white'
    offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

    // Draw the drawing canvas (which contains the user's mask strokes) on top
    offscreenCtx.drawImage(drawingCanvas, 0, 0)

    // Apply thresholding to force pixels to pure black or white
    const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height)
    const data = imageData.data
    const threshold = 128 // Adjust if needed

    for (let i = 0; i < data.length; i += 4) {
      // Calculate the average brightness
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
      if (avg < threshold) {
        // Pixel is considered white
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
      } else {
        // Pixel is considered black
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      }
      data[i + 3] = 255 // Fully opaque
    }
    offscreenCtx.putImageData(imageData, 0, 0)

    // Convert the canvas to a data URL and update the state
    const dataURL = offscreenCanvas.toDataURL('image/png')
    onMaskChange?.(dataURL)
  }

  return (
    <div
      ref={containerRef}
      className='w-full h-[60vh] overflow-hidden'
      onWheel={handleWheel}
      onMouseDown={handleMouseDownGeneral}
      onMouseMove={handleMouseMoveGeneral}
      onMouseUp={handleMouseUpGeneral}
      onMouseLeave={handleMouseUpGeneral}
      style={{ cursor: isSpacePressed ? 'grab' : 'default' }}
    >
      {maskLoading && (
        <div className='absolute top-0 left-0 w-full h-full z-10 flex items-center justify-center bg-black/50'>
          <LoadingSVG width={32} height={32} className='text-white' />
        </div>
      )}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          transform: `translate(${panPosition.x}px, ${panPosition.y}px)`
        }}
      >
        {/* Base canvas: displays the image */}
        <canvas ref={baseCanvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
        {/* Drawing canvas: used for drawing the mask */}
        <canvas
          ref={drawingCanvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            opacity: 0.6,
            cursor: isSpacePressed ? 'grab' : 'crosshair'
          }}
          className='bg-white'
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      {!isSpacePressed && (
        <div
          className={cn('pointer-events-none absolute border-2 rounded-full z-10', {
            'border-white': !isAltPressed,
            'border-red-400': isAltPressed
          })}
          style={{
            width: brushSize,
            height: brushSize,
            top: cursorPos.y - brushSize / 2,
            left: cursorPos.x - brushSize / 2,
            opacity: 0.5
          }}
        />
      )}
      <div className='absolute border flex justify-center left-4 right-4 bottom-4 bg-background/80 backdrop-blur px-2 py-1 rounded text-sm pointer-events-none'>
        {t('zoomPercentage', { zoom: Math.round(zoom * 100) })} | {t('instructions')}
      </div>
    </div>
  )
}

export default CreateMasking
