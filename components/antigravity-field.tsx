"use client"

import { useEffect, useRef } from "react"

interface Particle {
  ox: number
  oy: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  depth: number
  phase: number
  hueOffset: number
}

/**
 * Interactive particle field inspired by Google Antigravity's landing page:
 * a soft 3D-layered grid of glowing dots/capsules that gently float and
 * react smoothly to cursor movement with spring physics.
 */
export function AntigravityField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let rafId = 0
    let particles: Particle[] = []

    const pointer = {
      x: -9999,
      y: -9999,
      tx: -9999,
      ty: -9999,
      vx: 0,
      vy: 0,
      active: false,
    }

    const readThemeColors = () => {
      const style = getComputedStyle(document.documentElement)
      const hRaw = parseFloat(style.getPropertyValue("--ac-h").trim())
      const hue = Number.isFinite(hRaw) ? hRaw : 277
      const isDark = document.documentElement.classList.contains("dark")
      return { hue, isDark }
    }

    let theme = readThemeColors()
    const observer = new MutationObserver(() => {
      theme = readThemeColors()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-accent", "style"],
    })

    const buildParticles = () => {
      particles = []
      const spacing = width < 640 ? 44 : 38
      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1
      const offsetX = (width - (cols - 1) * spacing) / 2
      const offsetY = (height - (rows - 1) * spacing) / 2

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const jx = (Math.random() - 0.5) * 10
          const jy = (Math.random() - 0.5) * 10
          const ox = offsetX + c * spacing + jx
          const oy = offsetY + r * spacing + jy
          const depth = 0.45 + Math.random() * 0.85 // 3D depth factor
          particles.push({
            ox,
            oy,
            x: ox,
            y: oy,
            vx: 0,
            vy: 0,
            size: (1.35 + Math.random() * 1.35) * depth,
            depth,
            phase: Math.random() * Math.PI * 2,
            hueOffset: (Math.random() - 0.5) * 32,
          })
        }
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildParticles()
    }

    const onMove = (e: MouseEvent) => {
      pointer.tx = e.clientX
      pointer.ty = e.clientY
      if (!pointer.active) {
        pointer.x = e.clientX
        pointer.y = e.clientY
        pointer.active = true
      }
    }

    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        pointer.tx = e.touches[0].clientX
        pointer.ty = e.touches[0].clientY
        pointer.active = true
      }
    }

    const onLeave = () => {
      pointer.active = false
      pointer.tx = -9999
      pointer.ty = -9999
    }

    resize()
    window.addEventListener("resize", resize)
    window.addEventListener("mousemove", onMove, { passive: true })
    window.addEventListener("touchmove", onTouch, { passive: true })
    window.addEventListener("mouseleave", onLeave)

    let start = performance.now()

    const render = (now: number) => {
      const t = (now - start) * 0.001
      ctx.clearRect(0, 0, width, height)

      // Smoothly interpolate pointer for fluid trailing feel
      const prevX = pointer.x
      const prevY = pointer.y
      pointer.x += (pointer.tx - pointer.x) * 0.14
      pointer.y += (pointer.ty - pointer.y) * 0.14
      pointer.vx = pointer.x - prevX
      pointer.vy = pointer.y - prevY

      const radius = 210
      const radiusSq = radius * radius
      const { hue, isDark } = theme

      // Soft cursor aura
      if (pointer.active && pointer.x > -1000) {
        const grad = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          radius * 1.15
        )
        grad.addColorStop(
          0,
          isDark
            ? `oklch(0.65 0.22 ${hue} / 0.14)`
            : `oklch(0.60 0.22 ${hue} / 0.10)`
        )
        grad.addColorStop(1, "transparent")
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, radius * 1.15, 0, Math.PI * 2)
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Ambient antigravity float wave
        const floatX = Math.cos(t * 0.9 + p.phase + p.oy * 0.008) * 2.2 * p.depth
        const floatY = Math.sin(t * 1.1 + p.phase + p.ox * 0.008) * 2.2 * p.depth
        const targetX = p.ox + floatX
        const targetY = p.oy + floatY

        let influence = 0
        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const dSq = dx * dx + dy * dy
          if (dSq < radiusSq && dSq > 0.001) {
            const d = Math.sqrt(dSq)
            const falloff = Math.pow(1 - d / radius, 2)
            influence = falloff

            // Gentle magnetic swirl + repulsion + cursor velocity drag
            const nx = dx / d
            const ny = dy / d
            const push = falloff * 2.6 * p.depth
            const swirl = falloff * 0.65 * p.depth
            p.vx += (nx * push - ny * swirl + pointer.vx * 0.045 * falloff) * 0.55
            p.vy += (ny * push + nx * swirl + pointer.vy * 0.045 * falloff) * 0.55
          }
        }

        // Spring back to origin
        p.vx += (targetX - p.x) * 0.055
        p.vy += (targetY - p.y) * 0.055
        p.vx *= 0.84
        p.vy *= 0.84
        p.x += p.vx
        p.y += p.vy

        const speed = Math.hypot(p.vx, p.vy)
        const r = p.size * (1 + influence * 0.85)
        const dotHue = (hue + p.hueOffset + 360) % 360
        const alphaBase = isDark ? 0.22 : 0.24
        const alpha = Math.min(0.9, alphaBase * p.depth + influence * 0.55)
        const chroma = 0.08 + influence * 0.16
        const lightness = isDark ? 0.72 + influence * 0.14 : 0.52 - influence * 0.05

        ctx.fillStyle = `oklch(${lightness.toFixed(2)} ${chroma.toFixed(2)} ${dotHue.toFixed(0)} / ${alpha.toFixed(2)})`

        // Draw elongated capsule when moving fast (Antigravity dash look), circle at rest
        if (speed > 0.35) {
          const angle = Math.atan2(p.vy, p.vx)
          const stretch = Math.min(r * 2.8, r + speed * 1.9)
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(angle)
          ctx.beginPath()
          ctx.roundRect(-stretch, -r * 0.75, stretch * 2, r * 1.5, r)
          ctx.fill()
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      rafId = requestAnimationFrame(render)
    }

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("touchmove", onTouch)
      window.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  )
}

