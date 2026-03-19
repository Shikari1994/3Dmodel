import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, useProgress, Html } from '@react-three/drei'
import * as THREE from 'three'

// ---------- easing ----------
const easeOutCubic   = t => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

// ---------- Loader ----------
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{
        color: '#fff', fontFamily: 'sans-serif', textAlign: 'center',
        background: 'rgba(0,0,0,0.75)', padding: '20px 32px',
        borderRadius: '12px', minWidth: '180px',
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
          {Math.round(progress)}%
        </div>
        <div style={{ width: '160px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: '#c9a860', borderRadius: '2px', transition: 'width 0.2s',
          }} />
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#888' }}>Загрузка модели…</div>
      </div>
    </Html>
  )
}

// ---------- Модель с анимацией сборки ----------
function AnimatedModel({ url, focused, onFocus, onReady, onAssembled }) {
  const { scene } = useGLTF(url)
  const { camera, gl } = useThree()
  const animData     = useRef([])
  const animating    = useRef(false)
  const animStart    = useRef(null)
  const pendingStart = useRef(false)
  const warmupCount  = useRef(0)
  const assembledRef = useRef(false)
  const groupRef     = useRef()
  const WARMUP_FRAMES = 6
  const ANIM_DURATION = 3.8

  useEffect(() => {
    // Принудительно обновляем матрицы перед вычислением bounding box
    scene.updateMatrixWorld(true)
    const box    = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size   = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    // Сдвигаем сцену так, чтобы её геометрический центр оказался в (0,0,0)
    scene.position.sub(center)
    scene.updateMatrix()
    scene.updateMatrixWorld(true)

    const fovRad = (camera.fov * Math.PI) / 180
    const dist   = (maxDim / 2) / Math.tan(fovRad / 2) * 0.95
    camera.near = dist * 0.01
    camera.far  = dist * 100
    camera.updateProjectionMatrix()

    const modelCenter = new THREE.Vector3(0, 0, 0)
    const direction   = new THREE.Vector3(-0.5, 0.15, 0.8).normalize()
    const initPos     = direction.multiplyScalar(dist * 0.85)

    onReady?.({ scene, initCameraPos: initPos, modelCenter, maxDim })

    try { gl.compile(scene, camera) } catch (_) { /* large models may exceed GPU budget */ }

    const meshObjects = []
    scene.traverse(obj => { if (obj.isMesh) meshObjects.push(obj) })

    const scatter  = maxDim * 2.8
    const shuffled = [...meshObjects].sort(() => Math.random() - 0.5)

    animData.current = shuffled.map((obj, i) => {
      const origPos = obj.position.clone()
      const origRot = obj.rotation.clone()

      const scatteredPos = origPos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * scatter,
        (Math.random() - 0.5) * scatter,
        (Math.random() - 0.5) * scatter,
      ))
      const scatteredRot = new THREE.Euler(
        origRot.x + (Math.random() - 0.5) * Math.PI * 1.5,
        origRot.y + (Math.random() - 0.5) * Math.PI * 1.5,
        origRot.z + (Math.random() - 0.5) * Math.PI * 1.5,
      )

      return {
        mesh: obj, origPos, origRot, scatteredPos, scatteredRot,
        startPos: new THREE.Vector3(),
        startRot: new THREE.Euler(),
        delay: (i / Math.max(shuffled.length - 1, 1)) * 0.65,
      }
    })

    pendingStart.current = true
    warmupCount.current  = 0
    animating.current    = false

    return () => {
      scene.position.add(center)
      scene.updateMatrix()
      animData.current.forEach(({ mesh, origPos, origRot }) => {
        mesh.position.copy(origPos)
        mesh.rotation.copy(origRot)
      })
    }
  }, [scene])

  useFrame(({ clock }) => {
    // --- Warmup перед стартом сборки ---
    if (pendingStart.current) {
      warmupCount.current++
      if (warmupCount.current < WARMUP_FRAMES) return

      animData.current.forEach(item => {
        item.mesh.position.copy(item.scatteredPos)
        item.mesh.rotation.copy(item.scatteredRot)
        item.startPos.copy(item.scatteredPos)
        item.startRot.copy(item.scatteredRot)
      })
      pendingStart.current = false
      animating.current    = true
      animStart.current    = null
      return
    }

    // --- Анимация сборки ---
    if (animating.current) {
      if (animStart.current === null) animStart.current = clock.elapsedTime

      const prog = Math.min((clock.elapsedTime - animStart.current) / ANIM_DURATION, 1)

      let allDone = true
      animData.current.forEach(({ mesh, origPos, origRot, startPos, startRot, delay }) => {
        const localT = Math.max(0, Math.min((prog - delay) / (1 - delay), 1))
        if (localT < 1) allDone = false

        mesh.position.lerpVectors(startPos, origPos, easeInOutCubic(localT))
        mesh.rotation.x = startRot.x + (origRot.x - startRot.x) * easeOutCubic(localT)
        mesh.rotation.y = startRot.y + (origRot.y - startRot.y) * easeOutCubic(localT)
        mesh.rotation.z = startRot.z + (origRot.z - startRot.z) * easeOutCubic(localT)
      })

      if (allDone) {
        animating.current    = false
        assembledRef.current = true
        animData.current.forEach(({ mesh, origPos, origRot }) => {
          mesh.position.copy(origPos)
          mesh.rotation.copy(origRot)
        })

        // Ищем красный меш: максимальный (R - G - B) среди материалов
        let redMesh = null
        let maxRedness = -Infinity
        scene.traverse(obj => {
          if (obj.isMesh) {
            const color = obj.material?.color
            if (color) {
              const redness = color.r - color.g - color.b
              if (redness > maxRedness) { maxRedness = redness; redMesh = obj }
            }
          }
        })
        onAssembled?.(redMesh)
      }
    }

    // --- Маятник — только после сборки ---
    if (assembledRef.current && groupRef.current) {
      if (focused) {
        groupRef.current.rotation.y = 0  // зафиксировано при клике
      } else {
        groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.1) * (10 * Math.PI / 180)
      }
    }
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        onClick={(e) => {
          e.stopPropagation()
          // Останавливаем маятник и обновляем матрицы всего дерева от группы вниз
          if (groupRef.current) {
            groupRef.current.rotation.y = 0
            groupRef.current.updateMatrixWorld(true)
          }
          const box    = new THREE.Box3().setFromObject(e.object)
          const center = box.getCenter(new THREE.Vector3())
          const size   = box.getSize(new THREE.Vector3())
          onFocus?.({ mesh: e.object, center, dim: Math.max(size.x, size.y, size.z) })
        }}
        onPointerEnter={() => { document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { document.body.style.cursor = 'default' }}
      />
    </group>
  )
}

// ---------- Сцена ----------
function Scene({ url, focused, onFocus, onReady, onAssembled }) {
  const { camera } = useThree()
  const controlsRef   = useRef()
  const flyAnim       = useRef(null)
  const initPosRef    = useRef(new THREE.Vector3())
  const initTargetRef = useRef(new THREE.Vector3())
  const angleLimits   = useRef(null)

  const startFly = (toPos, toTarget) => {
    if (!controlsRef.current) return
    flyAnim.current = {
      fromPos:    camera.position.clone(),
      fromTarget: controlsRef.current.target.clone(),
      toPos, toTarget, t: 0,
    }
  }

  useEffect(() => {
    if (!controlsRef.current) return
    const c = controlsRef.current
    if (focused) {
      // Снимаем лимиты — свободное вращение 360°
      c.minAzimuthAngle = -Infinity
      c.maxAzimuthAngle =  Infinity
      c.minPolarAngle   = 0
      c.maxPolarAngle   = Math.PI

      // Используем координаты, захваченные в момент клика (маятник уже остановлен)
      const { center, dim } = focused
      const dir    = camera.position.clone().sub(center).normalize()
      const fovRad = (camera.fov * Math.PI) / 180
      const rawDist = (dim / 2) / Math.tan(fovRad / 2) * 3.2
      // Камера всегда приближается к мешу, никогда не отдаляется
      const currentDist = camera.position.distanceTo(center)
      const dist = Math.max(Math.min(rawDist, currentDist * 0.9), 0.1)
      startFly(center.clone().add(dir.multiplyScalar(dist)), center.clone())
    } else {
      // Восстанавливаем лимиты ±15°
      if (angleLimits.current) {
        c.minAzimuthAngle = angleLimits.current.minAz
        c.maxAzimuthAngle = angleLimits.current.maxAz
        c.minPolarAngle   = angleLimits.current.minPol
        c.maxPolarAngle   = angleLimits.current.maxPol
      }
      startFly(initPosRef.current.clone(), initTargetRef.current.clone())
    }
  }, [focused])

  useFrame((_, delta) => {
    if (!controlsRef.current) return
    if (flyAnim.current) {
      flyAnim.current.t = Math.min(flyAnim.current.t + Math.min(delta, 0.05) * 1.5, 1)
      const t = easeInOutCubic(flyAnim.current.t)
      camera.position.lerpVectors(flyAnim.current.fromPos, flyAnim.current.toPos, t)
      controlsRef.current.target.lerpVectors(flyAnim.current.fromTarget, flyAnim.current.toTarget, t)
      if (flyAnim.current.t >= 1) flyAnim.current = null
    }
    controlsRef.current.update()
  })

  const handleReady = ({ initCameraPos, modelCenter, maxDim }) => {
    const target = new THREE.Vector3(-(maxDim ?? 1) * 0.15, (modelCenter?.y ?? 0) - (maxDim ?? 1) * 0.4, 0)
    initPosRef.current.copy(initCameraPos)
    initTargetRef.current.copy(target)
    camera.position.copy(initCameraPos)

    if (controlsRef.current) {
      const c = controlsRef.current
      c.target.copy(target)
      c.update()

      // Лимиты ±15° от начального ракурса
      const lim = Math.PI / 12
      const sph = new THREE.Spherical().setFromVector3(initCameraPos.clone().sub(target))
      angleLimits.current = {
        minAz:  sph.theta - lim,
        maxAz:  sph.theta + lim,
        minPol: Math.max(0.1, sph.phi - lim),
        maxPol: Math.min(Math.PI - 0.1, sph.phi + lim),
      }
      c.minAzimuthAngle = angleLimits.current.minAz
      c.maxAzimuthAngle = angleLimits.current.maxAz
      c.minPolarAngle   = angleLimits.current.minPol
      c.maxPolarAngle   = angleLimits.current.maxPol
    }
    onReady?.()
  }

  return (
    <>
      <Suspense fallback={<Loader />}>
        <AnimatedModel
          url={url}
          focused={focused}
          onFocus={onFocus}
          onReady={handleReady}
          onAssembled={() => {
            startFly(initPosRef.current.clone(), initTargetRef.current.clone())
            onAssembled?.()
          }}
        />
        <Environment preset="city" />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.06}
        makeDefault
      />
    </>
  )
}

// ---------- Экспорт ----------
export default function ModelViewer({ url }) {
  const [focused,    setFocused]    = useState(null)
  const [assembling, setAssembling] = useState(false)
  const [hint,       setHint]       = useState(false)

  const handleFocus = (data) => {
    setFocused(prev => prev?.mesh === data.mesh ? null : data)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        gl={{ alpha: true }}
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'transparent' }}
        onPointerMissed={() => setFocused(null)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]}  intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />

        <Scene
          url={url}
          focused={focused}
          onFocus={handleFocus}
          onReady={() => setAssembling(true)}
          onAssembled={() => {
            setAssembling(false)
            setHint(true)
            setTimeout(() => setHint(false), 3500)
          }}
        />
      </Canvas>

      {assembling && (
        <div style={{
          position: 'absolute', top: '16px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', color: '#c9a860',
          padding: '6px 18px', borderRadius: '20px',
          fontFamily: 'sans-serif', fontSize: '0.8rem', letterSpacing: '0.1em',
          backdropFilter: 'blur(8px)', pointerEvents: 'none',
          border: '1px solid rgba(201,168,96,0.3)',
        }}>
          ⟳ сборка…
        </div>
      )}

      {hint && (
        <div style={{
          position: 'absolute', bottom: '28px', left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(201,168,96,0.6)', fontFamily: 'sans-serif',
          fontSize: '0.75rem', letterSpacing: '0.1em',
          pointerEvents: 'none',
          animation: 'fadeInOut 3.5s ease forwards',
        }}>
          нажмите на деталь чтобы рассмотреть
        </div>
      )}

      {focused && (
        <div style={{
          position: 'absolute', bottom: '28px', left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(201,168,96,0.5)', fontFamily: 'sans-serif',
          fontSize: '0.75rem', letterSpacing: '0.1em',
          pointerEvents: 'none',
        }}>
          нажмите ещё раз или на пустое место — сброс вида
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0%   { opacity: 0; }
          15%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
