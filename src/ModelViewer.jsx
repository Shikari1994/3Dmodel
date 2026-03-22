import { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, useProgress, Html } from '@react-three/drei'

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
import * as THREE from 'three'

// ---------- Заглушки характеристик ----------
const DEFAULT_SPECS = [
  { label: 'Напряжение питания',   value: '—' },
  { label: 'Вид смазки',           value: '—' },
  { label: 'Материал',             value: '—' },
  { label: 'Рабочая температура',  value: '—' },
  { label: 'Рабочее давление',     value: '—' },
  { label: 'Частота сигнала',      value: '—' },
  { label: 'Точность измерения',   value: '—' },
  { label: 'Класс защиты (IP)',    value: '—' },
  { label: 'Срок службы',         value: '—' },
  { label: 'Масса',                value: '—' },
]

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

// ---------- SVG иконки ----------
function IconReset() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.36"/>
    </svg>
  )
}

function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  )
}

function IconCompress() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  )
}


function IconAutoRotate() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3.6-7.2"/>
      <polyline points="21 3 21 9 15 9"/>
    </svg>
  )
}


function IconDrag() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15"/>
      <polyline points="9 5 12 2 15 5"/>
      <polyline points="15 19 12 22 9 19"/>
      <polyline points="19 9 22 12 19 15"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
  )
}

// ---------- Кнопка управления видом ----------
function CtrlBtn({ onClick, title, children, active = false }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '34px', height: '34px',
        background: active ? 'rgba(29,163,220,0.18)' : 'rgba(8,9,15,0.82)',
        border: `1px solid ${active ? 'rgba(29,163,220,0.55)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: '8px',
        color: active ? '#1da3dc' : 'rgba(255,255,255,0.55)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)',
        transition: 'color 0.15s, border-color 0.15s, background 0.15s',
        padding: 0,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' } }}
    >
      {children}
    </button>
  )
}

// ---------- Модель с анимацией взрыв-схемы ----------
// phase: 'warmup' | 'loading' | 'assembled' | 'exploding' | 'exploded' | 'assembling'
function AnimatedModel({ url, modelIndex, outerRef, focused, onFocus, onReady, onAssembled, visible = true, exploded = false, explodeConfig = null, onHover, enableDrag = false, onDragStateChange }) {
  const { scene } = useGLTF(url)
  const { camera, gl } = useThree()
  const animData    = useRef([])
  const phaseRef    = useRef('warmup')
  const animStart   = useRef(null)
  const warmupCount = useRef(0)
  const groupRef    = useRef()
  const hoveredRef  = useRef(null) // { mesh, savedEmissives, savedIntensities }
  const dragRef     = useRef(null) // { mesh, plane, offset } — тест-режим

  const WARMUP_FRAMES    = 6
  const LOAD_DURATION    = 3.8
  const EXPLODE_DURATION = 1.6
  const ASSEMBLE_DURATION = 2.0

  const applyHover = (mesh) => {
    if (!mesh?.isMesh) return
    clearHover()
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const savedEmissives   = mats.map(m => m.emissive ? m.emissive.clone() : null)
    const savedIntensities = mats.map(m => m.emissiveIntensity ?? 0)
    mats.forEach(m => {
      if (!m.emissive) return
      m.emissive.setHex(0x1da3dc)
      m.emissiveIntensity = 0.22
      m.needsUpdate = true
    })
    hoveredRef.current = { mesh, savedEmissives, savedIntensities }
  }

  const clearHover = () => {
    if (!hoveredRef.current) return
    const { mesh, savedEmissives, savedIntensities } = hoveredRef.current
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach((m, i) => {
      if (!m.emissive || !savedEmissives[i]) return
      m.emissive.copy(savedEmissives[i])
      m.emissiveIntensity = savedIntensities[i]
      m.needsUpdate = true
    })
    hoveredRef.current = null
  }


  // Снять подсветку и отменить drag при скрытии модели.
  // Перевод мешей в layer 1 полностью исключает их из raycasting (layer 0 — дефолтный).
  useEffect(() => {
    scene.traverse(obj => { if (obj.isMesh) obj.layers.set(visible ? 0 : 1) })
    if (!visible) {
      clearHover()
      onHover?.(null)
      if (dragRef.current) { dragRef.current = null; onDragStateChange?.(false); document.body.style.cursor = 'default' }
    }
  }, [visible])


  useEffect(() => {
    scene.updateMatrixWorld(true)

    // Фикс просвечивающих деталей и текстур
    scene.traverse((child) => {
      if (!child.isMesh) return
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach(m => {
        m.side = THREE.DoubleSide
        m.depthWrite = true
        if (m.transparent) m.alphaTest = 0.1
        m.needsUpdate = true
      })
    })

    const box     = new THREE.Box3().setFromObject(scene)
    const center  = box.getCenter(new THREE.Vector3())
    const boxSize = box.getSize(new THREE.Vector3())
    const maxDim  = Math.max(boxSize.x, boxSize.y, boxSize.z)

    scene.position.sub(center)
    scene.updateMatrix()
    scene.updateMatrixWorld(true)

    const mainAxis =
      boxSize.x >= boxSize.y && boxSize.x >= boxSize.z ? 'x' :
      boxSize.y >= boxSize.x && boxSize.y >= boxSize.z ? 'y' : 'z'
    const perpAxis = mainAxis === 'y' ? 'x' : mainAxis === 'x' ? 'z' : 'x'

    onReady?.({ maxDim, boxSize: boxSize.clone(), mainAxis, perpAxis })
    try { gl.compile(scene, camera) } catch (_) {}

    const mainAxisLen = boxSize[mainAxis]

    // Находим уровень логических деталей: спускаемся мимо одиночных обёрток
    let rootNode = scene
    while (rootNode.children.length === 1 && !rootNode.children[0].isMesh) {
      rootNode = rootNode.children[0]
    }

    // Рекурсивно собираем все детали для анимации.
    // Если дочерняя группа сама содержит несколько значимых объектов,
    // анимируем их по отдельности — иначе гайки внутри CylinderGroup едут вместе с ней.
    // Мелкие детали (ниже MIN_SIZE) тоже включаем — чтобы ни одна часть не оставалась на месте.
    const MIN_SIZE = maxDim * 0.025
    const partObjects = []
    const addParts = (node, depth = 0) => {
      for (const child of node.children) {
        const b = new THREE.Box3().setFromObject(child)
        const s = b.getSize(new THREE.Vector3())
        if (Math.max(s.x, s.y, s.z) < 0.0001) continue // пропускаем вырожденные объекты

        // Группа с собственными значимыми детьми — идём глубже (не анимируем её целиком)
        const hasNestedParts = !child.isMesh && depth < 4 && child.children.some(gc => {
          const b2 = new THREE.Box3().setFromObject(gc)
          const s2 = b2.getSize(new THREE.Vector3())
          return Math.max(s2.x, s2.y, s2.z) >= MIN_SIZE
        })
        if (hasNestedParts) {
          addParts(child, depth + 1)
        } else {
          partObjects.push(child)
        }
      }
    }
    addParts(rootNode)

    // --- Проход 1: собираем данные каждой детали ---
    const partData = partObjects.map(obj => {
      const origPos    = obj.position.clone()
      const origRot    = obj.rotation.clone()
      const partBox    = new THREE.Box3().setFromObject(obj)
      const partCenter = partBox.getCenter(new THREE.Vector3())
      const worldPos   = new THREE.Vector3()
      obj.getWorldPosition(worldPos)
      const t = mainAxisLen > 0.001 ? partCenter[mainAxis] / (mainAxisLen / 2) : 0

      // Загрузочный разлёт (вдоль главной оси, мягкий)
      const loadOffset = new THREE.Vector3()
      loadOffset[mainAxis] = t * mainAxisLen * 1.05
      const radialLoad = partCenter.clone(); radialLoad[mainAxis] = 0
      if (radialLoad.length() > 0.001) loadOffset.add(radialLoad.normalize().multiplyScalar(mainAxisLen * 0.18))
      const loadScatteredPos = obj.parent
        ? obj.parent.worldToLocal(worldPos.clone().add(loadOffset))
        : worldPos.clone().add(loadOffset)

      const partSize = partBox.getSize(new THREE.Vector3())
      return { obj, origPos, origRot, partCenter, partSize, worldPos, t, loadScatteredPos }
    })

    // --- Классификация: крепёж (радиально) vs тело (по оси) ---
    const isFastener = (pd) => {
      if (!explodeConfig) return false
      const name = (pd.obj.name || '').toLowerCase()
      if ((explodeConfig.fastenerNames || []).some(n => name.includes(n))) return true
      if (explodeConfig.fastenerSizeRatio) {
        return Math.max(pd.partSize.x, pd.partSize.y, pd.partSize.z) / maxDim <= explodeConfig.fastenerSizeRatio
      }
      return false
    }

    const fasteners = partData.filter(pd => isFastener(pd))
    const bodyParts = partData.filter(pd => !isFastener(pd))
    if (explodeConfig) console.log('[explode] fasteners:', fasteners.map(p => p.obj.name), '| body:', bodyParts.map(p => p.obj.name))

    // Осевые детали: сортируем и раскладываем с учётом реального размера каждой
    bodyParts.sort((a, b) => a.t - b.t)
    const nb = bodyParts.length
    const spreadRatio = explodeConfig?.spreadRatio ?? 1.0

    // Единая карта слотов: locked-группа = 1 слот, individual-деталь = 1 слот
    const _nameToGi = new Map()
    ;(explodeConfig?.lockedParts ?? []).forEach((names, gi) => names.forEach(n => _nameToGi.set(n, gi)))

    // Аккумулируем для каждой группы: средний t, осевые границы (из реальных bounding box)
    const _giAcc = new Map()
    bodyParts.forEach(pd => {
      const gi = _nameToGi.get(pd.obj.name)
      if (gi !== undefined) {
        if (!_giAcc.has(gi)) _giAcc.set(gi, { tSum: 0, n: 0, axMin: Infinity, axMax: -Infinity })
        const acc = _giAcc.get(gi)
        acc.tSum += pd.t; acc.n++
        acc.axMin = Math.min(acc.axMin, pd.partCenter[mainAxis] - pd.partSize[mainAxis] / 2)
        acc.axMax = Math.max(acc.axMax, pd.partCenter[mainAxis] + pd.partSize[mainAxis] / 2)
      }
    })

    // Список слотов с реальными размерами и центрами вдоль главной оси
    const _slots = []
    const _seenGi = new Set()
    bodyParts.forEach(pd => {
      const gi = _nameToGi.get(pd.obj.name)
      if (gi !== undefined) {
        if (!_seenGi.has(gi)) {
          _seenGi.add(gi)
          const acc = _giAcc.get(gi)
          _slots.push({ gi, t: acc.tSum / acc.n, axSize: acc.axMax - acc.axMin, axCenter: (acc.axMin + acc.axMax) / 2 })
        }
      } else {
        _slots.push({ pd, t: pd.t, axSize: pd.partSize[mainAxis], axCenter: pd.partCenter[mainAxis] })
      }
    })
    _slots.sort((a, b) => a.t - b.t)

    // Если задан явный порядок деталей — переупорядочиваем слоты
    if (explodeConfig?.partOrder?.length) {
      const order = explodeConfig.partOrder
      const getSlotOrderIdx = (slot) => {
        const names = slot.gi !== undefined
          ? ((explodeConfig.lockedParts ?? [])[slot.gi] ?? [])
          : [slot.pd?.obj?.name ?? '']
        for (const n of names) {
          const idx = order.findIndex(k => Array.isArray(k) ? k.includes(n) : k === n)
          if (idx !== -1) return idx
        }
        return 9999
      }
      _slots.sort((a, b) => getSlotOrderIdx(a) - getSlotOrderIdx(b))
    }

    const ns = _slots.length

    // Пропорциональный разлёт: масштабируем исходные позиции, сохраняя относительную компоновку.
    // Детали, которые были рядом, остаются ближе друг к другу — видно, где что стояло.
    const spreadMultiplier = 1 + spreadRatio * 2.5
    const minGap = maxDim * 0.03 * spreadRatio
    const minSlotSize = maxDim * 0.012
    const slotSizes = _slots.map(s => Math.max(s.axSize, minSlotSize))

    // Пропорциональные позиции из исходных центров (от центра тяжести слотов,
    // чтобы крайние детали не улетали непропорционально далеко)
    const axMid = _slots.reduce((s, sl) => s + sl.axCenter, 0) / Math.max(ns, 1)
    const proportionalPos = _slots.map(s => axMid + (s.axCenter - axMid) * spreadMultiplier)

    // Гарантируем минимальный зазор между соседними слотами
    const rawPos = [proportionalPos[0]]
    for (let i = 1; i < ns; i++) {
      const minPos = rawPos[i - 1] + slotSizes[i - 1] / 2 + slotSizes[i] / 2 + minGap
      rawPos.push(Math.max(proportionalPos[i], minPos))
    }

    // Центрируем результат
    const spanCenter = ns > 0 ? (rawPos[0] + rawPos[ns - 1]) / 2 : 0
    // _slotTarget: целевая осевая позиция центра каждого слота
    const _slotTarget = new Map()
    _slots.forEach(({ pd, gi }, i) => {
      const tgt = rawPos[i] - spanCenter
      if (gi !== undefined) _slotTarget.set('gi:' + gi, tgt)
      else _slotTarget.set(pd, tgt)
    })

    const sideExplode  = explodeConfig?.explodeStyle === 'side'
    const plateExplode = explodeConfig?.explodeStyle === 'plate'
    // Ось разлёта: перпендикулярна главной оси (вертикаль Y, или Z если главная Y)
    const spreadAxis      = mainAxis === 'y' ? 'z' : 'y'
    const bodyRadialRatio = explodeConfig?.bodyRadialRatio ?? 1.0
    // spreadHalf используется только для sideExplode
    const spreadHalf = Math.min(maxDim * 0.6, ns * maxDim * 0.14) * spreadRatio

    // Оси «тарелки»: pa1 — вдоль пульсатора (mainAxis), pa2 — вертикаль, paFlat — в глубину (=0)
    const pa1    = mainAxis
    const pa2    = mainAxis === 'y' ? 'x' : 'y'
    const paFlat = mainAxis === 'x' ? 'z' : mainAxis === 'y' ? 'z' : 'x'

    // 2D-позиции слотов для plate-режима: сетка в плоскости pa1/pa2 — вид сбоку
    const _slotPlatePos = new Map()
    if (plateExplode) {
      const cols = Math.ceil(Math.sqrt(ns))
      const rows = Math.ceil(ns / cols)
      const cellSize = maxDim * (0.18 + spreadRatio * 0.35)
      _slots.forEach((slot, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const pos = new THREE.Vector3()
        pos[pa1]    = (col - (cols - 1) / 2) * cellSize
        pos[pa2]    = (row - (rows - 1) / 2) * cellSize
        pos[paFlat] = 0
        if (slot.gi !== undefined) _slotPlatePos.set('gi:' + slot.gi, pos)
        else _slotPlatePos.set(slot.pd, pos)
      })
    }

    const makeBodyEntry = (pd, i) => {
      const { obj, origPos, origRot, partCenter, worldPos, t, loadScatteredPos } = pd
      const giPd = _nameToGi.get(obj.name)
      const radialVec = partCenter.clone(); radialVec[mainAxis] = 0
      const radialLen = radialVec.length()
      const radialNorm = radialLen > maxDim * 0.005 ? radialVec.clone().normalize() : new THREE.Vector3()
      const explodeOffset = new THREE.Vector3()
      if (plateExplode) {
        // Тарелка: двигаем деталь в свою ячейку 2D-сетки
        const key = giPd !== undefined ? 'gi:' + giPd : pd
        const targetPos = _slotPlatePos.get(key)
        if (targetPos) explodeOffset.copy(targetPos).sub(partCenter)
      } else if (sideExplode) {
        const slotT = ns > 1 ? (i / (ns - 1)) * 2 - 1 : 0
        explodeOffset[spreadAxis] = slotT * spreadHalf
        if (bodyRadialRatio > 0 && radialLen > maxDim * 0.005) explodeOffset.addScaledVector(radialNorm, maxDim * 0.04 * bodyRadialRatio)
      } else {
        // Осевой разлёт: двигаем деталь так, чтобы её центр оказался в целевой позиции
        const currentCenter = giPd !== undefined
          ? (_slots.find(s => s.gi === giPd)?.axCenter ?? partCenter[mainAxis])
          : partCenter[mainAxis]
        const axTarget = giPd !== undefined
          ? (_slotTarget.get('gi:' + giPd) ?? partCenter[mainAxis])
          : (_slotTarget.get(pd) ?? partCenter[mainAxis])
        explodeOffset[mainAxis] = axTarget - currentCenter
        if (bodyRadialRatio > 0 && radialLen > maxDim * 0.005) explodeOffset.addScaledVector(radialNorm, maxDim * 0.08 * bodyRadialRatio)
      }
      const explodeTarget = worldPos.clone().add(explodeOffset)
      const explodePos = obj.parent ? obj.parent.worldToLocal(explodeTarget.clone()) : explodeTarget.clone()
      return {
        mesh: obj, origPos, origRot, loadScatteredPos, explodePos,
        explodeRotOffset: new THREE.Euler(0, 0, 0),
        startPos: new THREE.Vector3(), startRot: new THREE.Euler(),
        loadDelay: Math.abs(t) * 0.15 + Math.random() * 0.05,
        explodeDelay: i / Math.max(nb - 1, 1) * 0.15,
      }
    }

    // Крепёж: радиально от оси, небольшое смещение
    const radialPush = (explodeConfig?.radialPushRatio ?? 0.20) * maxDim
    const nf = fasteners.length
    const makeFastenerEntry = ({ obj, origPos, origRot, partCenter, worldPos, t }, i) => {
      const radialVec = partCenter.clone(); radialVec[mainAxis] = 0
      const radialLen = radialVec.length()
      // Запасной вектор перпендикулярен главной оси
      const fallback = mainAxis === 'x' ? new THREE.Vector3(0, 1, 0)
                     : mainAxis === 'y' ? new THREE.Vector3(1, 0, 0)
                     :                    new THREE.Vector3(0, 1, 0)
      const radialDir = radialLen > maxDim * 0.005 ? radialVec.clone().normalize() : fallback

      // Взрыв-схема: полный радиальный отвод
      const explodeTarget = worldPos.clone().addScaledVector(radialDir, radialPush)
      const explodePos = obj.parent ? obj.parent.worldToLocal(explodeTarget) : explodeTarget.clone()

      // Загрузочный разлёт: гайки тоже уходят в сторону (не зависают на оси)
      const loadRadial = mainAxisLen * 0.14
      const loadTarget = worldPos.clone().addScaledVector(radialDir, loadRadial)
      loadTarget[mainAxis] += t * mainAxisLen * 0.7
      const loadScatteredPos = obj.parent ? obj.parent.worldToLocal(loadTarget) : loadTarget.clone()

      return {
        mesh: obj, origPos, origRot, loadScatteredPos, explodePos,
        explodeRotOffset: new THREE.Euler(0, 0, 0),
        startPos: new THREE.Vector3(), startRot: new THREE.Euler(),
        loadDelay: Math.abs(t) * 0.15 + Math.random() * 0.05,
        explodeDelay: 0.05 + (nf > 1 ? i / (nf - 1) : 0) * 0.25,
      }
    }

    animData.current = [
      ...bodyParts.map(makeBodyEntry),
      ...fasteners.map(makeFastenerEntry),
    ]

    // Совмещённые детали — двигаются вместе как единый блок
    if (explodeConfig?.lockedParts?.length) {
      explodeConfig.lockedParts.forEach((groupNames, gi) => {
        const groupEntries = animData.current.filter(e => groupNames.includes(e.mesh.name))
        if (groupEntries.length < 2) return

        // Центр группы в world-пространстве
        const groupWorldCenter = new THREE.Vector3()
        groupEntries.forEach(e => {
          const wPos = new THREE.Vector3()
          e.mesh.getWorldPosition(wPos)
          groupWorldCenter.add(wPos)
        })
        groupWorldCenter.divideScalar(groupEntries.length)

        // Радиальное направление группы
        const radialVec = groupWorldCenter.clone(); radialVec[mainAxis] = 0
        const radialLen2 = radialVec.length()
        const radialNorm2 = radialLen2 > maxDim * 0.005 ? radialVec.clone().normalize() : new THREE.Vector3()

        // Смещение взрыва группы (в world-пространстве)
        const groupOffset = new THREE.Vector3()
        if (plateExplode) {
          // Тарелка: смещаем группу целиком в её ячейку сетки
          const targetPos = _slotPlatePos.get('gi:' + gi)
          if (targetPos) groupOffset.copy(targetPos).sub(groupWorldCenter)
        } else if (sideExplode) {
          const slotIdx = _slots.findIndex(s => s.gi === gi)
          const slotT = ns > 1 && slotIdx >= 0 ? (slotIdx / (ns - 1)) * 2 - 1 : 0
          groupOffset[spreadAxis] = slotT * spreadHalf
          if (bodyRadialRatio > 0 && radialLen2 > maxDim * 0.005) groupOffset.addScaledVector(radialNorm2, maxDim * 0.04 * bodyRadialRatio)
        } else {
          // Двигаем группу так, чтобы её bounding-box центр совпал с целевой позицией
          const acc = _giAcc.get(gi)
          const groupAxCenter = acc ? (acc.axMin + acc.axMax) / 2 : groupWorldCenter[mainAxis]
          const axTarget = _slotTarget.get('gi:' + gi) ?? groupWorldCenter[mainAxis]
          groupOffset[mainAxis] = axTarget - groupAxCenter
          if (bodyRadialRatio > 0 && radialLen2 > maxDim * 0.005) groupOffset.addScaledVector(radialNorm2, maxDim * 0.08 * bodyRadialRatio)
        }

        // Единая задержка — берём минимальную из уже вычисленных
        const groupDelay = Math.min(...groupEntries.map(e => e.explodeDelay))

        // Применяем ко всем членам группы
        groupEntries.forEach(e => {
          const wPos = new THREE.Vector3()
          e.mesh.getWorldPosition(wPos)
          const wTarget = wPos.clone().add(groupOffset)
          e.explodePos    = e.mesh.parent ? e.mesh.parent.worldToLocal(wTarget) : wTarget
          e.explodeDelay  = groupDelay
        })
      })
    }

    phaseRef.current  = 'warmup'
    warmupCount.current = 0
    animStart.current = null

    return () => {
      clearHover()
      scene.position.add(center)
      scene.updateMatrix()
      animData.current.forEach(({ mesh, origPos, origRot }) => {
        mesh.position.copy(origPos)
        mesh.rotation.copy(origRot)
      })
    }
  }, [scene])

  // Тест-режим: drag детали мышью
  useEffect(() => {
    if (!enableDrag) return
    const canvas = gl.domElement
    const rc = new THREE.Raycaster()

    const onMove = (e) => {
      if (!dragRef.current) return
      const { mesh, plane, offset } = dragRef.current
      const rect = canvas.getBoundingClientRect()
      rc.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      )
      const hit = new THREE.Vector3()
      if (rc.ray.intersectPlane(plane, hit)) {
        const worldPos = hit.add(offset)
        const localPos = mesh.parent ? mesh.parent.worldToLocal(worldPos.clone()) : worldPos.clone()
        mesh.position.copy(localPos)
      }
    }

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null
        onDragStateChange?.(false)
        document.body.style.cursor = 'grab'
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [enableDrag, camera, gl])

  // Реакция на prop exploded
  useEffect(() => {
    const phase = phaseRef.current
    if (exploded && phase === 'assembled') {
      animData.current.forEach(item => {
        item.startPos.copy(item.mesh.position)
        item.startRot.copy(item.mesh.rotation)
      })
      phaseRef.current = 'exploding'
      animStart.current = null
    } else if (!exploded && phase === 'exploded') {
      animData.current.forEach(item => {
        item.startPos.copy(item.mesh.position)
        item.startRot.copy(item.mesh.rotation)
      })
      phaseRef.current = 'assembling'
      animStart.current = null
    }
  }, [exploded])

  useFrame(({ clock }) => {
    const phase = phaseRef.current

    // — WARMUP —
    if (phase === 'warmup') {
      if (++warmupCount.current >= WARMUP_FRAMES) {
        animData.current.forEach(item => {
          item.mesh.position.copy(item.loadScatteredPos)
          item.mesh.rotation.copy(item.origRot)
          item.startPos.copy(item.loadScatteredPos)
          item.startRot.copy(item.origRot)
        })
        phaseRef.current = 'loading'
        animStart.current = null
      }
      return
    }

    // — ЗАГРУЗОЧНАЯ СБОРКА —
    if (phase === 'loading') {
      if (animStart.current === null) animStart.current = clock.elapsedTime
      const prog = Math.min((clock.elapsedTime - animStart.current) / LOAD_DURATION, 1)
      let allDone = true
      animData.current.forEach(({ mesh, origPos, origRot, startPos, startRot, loadDelay }) => {
        const lT = Math.max(0, Math.min((prog - loadDelay) / (1 - loadDelay), 1))
        if (lT < 1) allDone = false
        mesh.position.lerpVectors(startPos, origPos, easeInOutCubic(lT))
        mesh.rotation.x = startRot.x + (origRot.x - startRot.x) * easeOutCubic(lT)
        mesh.rotation.y = startRot.y + (origRot.y - startRot.y) * easeOutCubic(lT)
        mesh.rotation.z = startRot.z + (origRot.z - startRot.z) * easeOutCubic(lT)
      })
      if (allDone) {
        animData.current.forEach(({ mesh, origPos, origRot }) => { mesh.position.copy(origPos); mesh.rotation.copy(origRot) })
        phaseRef.current = 'assembled'
        onAssembled?.()
      }
      return
    }

    // — ВЗРЫВ —
    if (phase === 'exploding') {
      if (animStart.current === null) animStart.current = clock.elapsedTime
      const prog = Math.min((clock.elapsedTime - animStart.current) / EXPLODE_DURATION, 1)
      let allDone = true
      animData.current.forEach(({ mesh, explodePos, explodeRotOffset, startPos, startRot, explodeDelay }) => {
        const span = 1 - explodeDelay
        const lT = Math.max(0, Math.min((prog - explodeDelay) / span, 1))
        if (lT < 1) allDone = false
        mesh.position.lerpVectors(startPos, explodePos, easeInOutCubic(lT))
        mesh.rotation.x = startRot.x + explodeRotOffset.x * easeOutCubic(lT)
        mesh.rotation.y = startRot.y + explodeRotOffset.y * easeOutCubic(lT)
        mesh.rotation.z = startRot.z + explodeRotOffset.z * easeOutCubic(lT)
      })
      if (allDone) phaseRef.current = 'exploded'
      return
    }

    // — СБОРКА ОБРАТНО —
    if (phase === 'assembling') {
      if (animStart.current === null) animStart.current = clock.elapsedTime
      const prog = Math.min((clock.elapsedTime - animStart.current) / ASSEMBLE_DURATION, 1)
      let allDone = true
      animData.current.forEach(({ mesh, origPos, origRot, startPos, startRot, explodeDelay }) => {
        const d  = explodeDelay * 0.4
        const lT = Math.max(0, Math.min((prog - d) / (1 - d), 1))
        if (lT < 1) allDone = false
        mesh.position.lerpVectors(startPos, origPos, easeInOutCubic(lT))
        mesh.rotation.x = startRot.x + (origRot.x - startRot.x) * easeOutCubic(lT)
        mesh.rotation.y = startRot.y + (origRot.y - startRot.y) * easeOutCubic(lT)
        mesh.rotation.z = startRot.z + (origRot.z - startRot.z) * easeOutCubic(lT)
      })
      if (allDone) {
        animData.current.forEach(({ mesh, origPos, origRot }) => { mesh.position.copy(origPos); mesh.rotation.copy(origRot) })
        phaseRef.current = 'assembled'
      }
      return
    }

    // — IDLE: группа неподвижна, вращение управляется OrbitControls.autoRotate —
  })

  return (
    <group ref={outerRef} visible={visible}>
      <group ref={groupRef}>
        <primitive
          object={scene}
          onPointerDown={(e) => {
            if (!enableDrag || phaseRef.current !== 'assembled') return
            e.stopPropagation()
            const mesh = e.object
            const meshWorldPos = new THREE.Vector3()
            mesh.getWorldPosition(meshWorldPos)
            const planeNormal = new THREE.Vector3()
            camera.getWorldDirection(planeNormal).negate()
            dragRef.current = {
              mesh,
              plane: new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, e.point),
              offset: meshWorldPos.sub(e.point),
            }
            onDragStateChange?.(true)
            document.body.style.cursor = 'grabbing'
          }}
          onClick={(e) => {
            if (enableDrag) return
            e.stopPropagation()
            if (groupRef.current) { groupRef.current.rotation.y = 0; groupRef.current.updateMatrixWorld(true) }
            const box    = new THREE.Box3().setFromObject(e.object)
            const center = box.getCenter(new THREE.Vector3())
            const size   = box.getSize(new THREE.Vector3())
            onFocus?.({ mesh: e.object, center, dim: Math.max(size.x, size.y, size.z), modelIndex })
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            if (hoveredRef.current?.mesh === e.object) return
            applyHover(e.object)
            onHover?.(e.object.name || null)
            document.body.style.cursor = enableDrag ? 'grab' : 'pointer'
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            clearHover()
            onHover?.(null)
            document.body.style.cursor = 'default'
          }}
        />
      </group>
    </group>
  )
}

// ---------- Сцена с несколькими моделями ----------
function Scene({ models, focused, onFocus, onReady, onAssembled, activeIndex, exploded, onHover, resetTrigger, autoRotate = false, enableDrag = false }) {
  const { camera, size: canvasSize } = useThree()
  const controlsRef      = useRef()
  const flyAnim          = useRef(null)
  const initPosRef       = useRef(new THREE.Vector3())
  const initTargetRef    = useRef(new THREE.Vector3(0, 0, 0))
  // По одному outerRef на каждую модель
  const outerRefs        = useRef(models.map(() => ({ current: null })))
  const modelInfos       = useRef([])
  const modelOffsets     = useRef([])
  const readySet         = useRef(new Set())
  const assembledCount   = useRef(0)
  const maxDimRef        = useRef(0)
  const userInteracting  = useRef(false)
  const interactTimer    = useRef(null)
  const isDraggingRef    = useRef(false)

  const startFly = (toPos, toTarget) => {
    if (!controlsRef.current) return
    flyAnim.current = {
      fromPos:    camera.position.clone(),
      fromTarget: controlsRef.current.target.clone(),
      toPos, toTarget, t: 0,
    }
  }

  // Сброс вида по внешнему триггеру
  useEffect(() => {
    if (!resetTrigger || initPosRef.current.length() < 0.001) return
    const maxDim = Math.max(...modelInfos.current.filter(Boolean).map(i => i.maxDim), 1)
    if (controlsRef.current) {
      controlsRef.current.minDistance = maxDim * 0.12
      controlsRef.current.maxDistance = maxDim * 4
    }
    startFly(initPosRef.current.clone(), initTargetRef.current.clone())
  }, [resetTrigger])

  // Определяем взаимодействие пользователя — пауза autoRotate на 2с после отпускания
  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    const onStart = () => {
      userInteracting.current = true
      clearTimeout(interactTimer.current)
    }
    const onEnd = () => {
      clearTimeout(interactTimer.current)
      interactTimer.current = setTimeout(() => { userInteracting.current = false }, 2000)
      const dir = camera.position.clone().normalize()
      console.log(`[camera] direction: (${dir.x.toFixed(3)}, ${dir.y.toFixed(3)}, ${dir.z.toFixed(3)})  distance: ${camera.position.length().toFixed(1)}  pos: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)})`)
    }
    ctrl.addEventListener('start', onStart)
    ctrl.addEventListener('end', onEnd)
    return () => {
      ctrl.removeEventListener('start', onStart)
      ctrl.removeEventListener('end', onEnd)
      clearTimeout(interactTimer.current)
    }
  }, [])


  useEffect(() => {
    if (!controlsRef.current) return
    const maxDim = maxDimRef.current || 1
    const fovRad = (camera.fov * Math.PI) / 180

    if (focused) {
      const { center, dim } = focused
      // Деталь занимает ~40% высоты экрана, но не ближе 8% размера всей модели
      const fitDist = (dim / 2) / Math.tan(fovRad / 2) * 1.3
      const dist = Math.max(fitDist, maxDim * 0.04)
      const dir = camera.position.clone().sub(center)
      if (dir.length() < 0.001) dir.set(0.4, 0.3, 0.9)
      dir.normalize()
      controlsRef.current.minDistance = Math.max(dim * 0.25, maxDim * 0.04)
      controlsRef.current.maxDistance = maxDim * 5
      startFly(center.clone().add(dir.multiplyScalar(dist)), center.clone())

    } else if (activeIndex !== null && modelInfos.current[activeIndex] && modelOffsets.current[activeIndex]) {
      const info      = modelInfos.current[activeIndex]
      const offset    = modelOffsets.current[activeIndex]
      const modelCfg  = models[activeIndex]
      const camCfg    = exploded ? modelCfg.explodedCamera : modelCfg.initialCamera

      controlsRef.current.minDistance = info.maxDim * 0.06
      controlsRef.current.maxDistance = info.maxDim * (exploded ? 12 : 6)

      if (camCfg) {
        // Зафиксированная позиция камеры из конфига модели
        const dir  = new THREE.Vector3(...camCfg.direction).normalize()
        const dist = camCfg.distance
        startFly(offset.clone().add(dir.multiplyScalar(dist)), offset.clone())
      } else {
        // Автоматический расчёт
        const aspect  = canvasSize.width / canvasSize.height
        const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect)
        const allAxes = ['x', 'y', 'z']
        const [pa1, pa2] = allAxes.filter(a => a !== info.mainAxis)
        const halfPerp = Math.max(info.boxSize[pa1], info.boxSize[pa2]) / 2
        const halfMain = info.boxSize[info.mainAxis] / 2
        const distV = halfPerp / Math.tan(fovRad / 2)
        const distH = halfMain / Math.tan(hFovRad / 2)
        const baseDist = Math.max(distV, distH) * 1.1
        const dist = exploded ? baseDist * 2.0 : baseDist
        const dir = camera.position.clone().sub(offset)
        if (dir.length() < 0.001) dir.set(0.1, 1, 0.15)
        dir.normalize()
        startFly(offset.clone().add(dir.multiplyScalar(dist)), offset.clone())
      }

    } else {
      if (maxDim > 0) {
        controlsRef.current.minDistance = maxDim * 0.12
        controlsRef.current.maxDistance = maxDim * 4
      }
      startFly(initPosRef.current.clone(), initTargetRef.current.clone())
    }
  }, [focused, activeIndex, exploded])

  useFrame((_, delta) => {
    if (!controlsRef.current) return

    // Блокировка OrbitControls во время drag
    controlsRef.current.enabled = !isDraggingRef.current

    // Авто-вращение: пауза при взаимодействии или во время перелёта.
    // При выбранной детали target уже стоит на её центре → камера крутится вокруг неё.
    controlsRef.current.autoRotate = autoRotate && !userInteracting.current && !flyAnim.current

    if (flyAnim.current) {
      flyAnim.current.t = Math.min(flyAnim.current.t + Math.min(delta, 0.05) * 1.5, 1)
      const t = easeInOutCubic(flyAnim.current.t)
      camera.position.lerpVectors(flyAnim.current.fromPos, flyAnim.current.toPos, t)
      controlsRef.current.target.lerpVectors(flyAnim.current.fromTarget, flyAnim.current.toTarget, t)
      if (flyAnim.current.t >= 1) flyAnim.current = null
    }

    // Ограничиваем панорамирование: цель орбиты не уходит дальше 1.5x размера модели от центра
    if (maxDimRef.current > 0 && !flyAnim.current) {
      const maxPan = maxDimRef.current * 1.5
      if (controlsRef.current.target.length() > maxPan) {
        controlsRef.current.target.setLength(maxPan)
      }
    }

    controlsRef.current.update()
  })

  const handleModelReady = (index, info) => {
    if (readySet.current.has(index)) return
    readySet.current.add(index)
    modelInfos.current[index] = info
    if (readySet.current.size < models.length) return

    // Все модели загружены — рассчитываем раскладку
    const infos     = modelInfos.current
    const mainAxis  = infos[0].mainAxis
    const perpAxis  = infos[0].perpAxis
    const maxDim    = Math.max(...infos.map(i => i.maxDim))
    maxDimRef.current = maxDim
    const gap       = maxDim * 0.1

    // Центрируем группу: каждая модель смещается ±(perpSize/2 + gap/2)
    const offset0 = -(infos[0].boxSize[perpAxis] / 2 + gap / 2)
    const offset1 = +(infos[1].boxSize[perpAxis] / 2 + gap / 2)

    if (outerRefs.current[0].current) outerRefs.current[0].current.position[perpAxis] = offset0
    if (outerRefs.current[1].current) outerRefs.current[1].current.position[perpAxis] = offset1

    modelOffsets.current[0] = new THREE.Vector3(); modelOffsets.current[0][perpAxis] = offset0
    modelOffsets.current[1] = new THREE.Vector3(); modelOffsets.current[1][perpAxis] = offset1

    // Позиция камеры: видит всю сцену целиком
    const fovRad  = (camera.fov * Math.PI) / 180
    const aspect  = canvasSize.width / canvasSize.height
    const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect)
    const totalPerp  = Math.abs(offset1) + infos[1].boxSize[perpAxis] / 2
                     + Math.abs(offset0) + infos[0].boxSize[perpAxis] / 2
    const mainSize   = Math.max(...infos.map(i => i.boxSize[mainAxis]))
    const distV = (infos[0].boxSize.y / 2) / Math.tan(fovRad / 2)
    const distH = (Math.max(mainSize, totalPerp) / 2) / Math.tan(hFovRad / 2)
    const dist  = Math.max(distV, distH) * 1.5

    camera.near = dist * 0.01
    camera.far  = dist * 100
    camera.updateProjectionMatrix()

    const direction = new THREE.Vector3(-0.485, 0.227, -0.845).normalize()
    const initPos   = direction.multiplyScalar(25.2)
    const target    = new THREE.Vector3(0, 0, 0)

    initPosRef.current.copy(initPos)
    initTargetRef.current.copy(target)
    camera.position.copy(initPos)

    if (controlsRef.current) {
      controlsRef.current.target.copy(target)
      controlsRef.current.minDistance = maxDim * 0.12
      controlsRef.current.maxDistance = maxDim * 4
      controlsRef.current.update()
    }

    onReady?.()
  }

  return (
    <>
      <Suspense fallback={<Loader />}>
        {models.map(({ url, explodeConfig }, i) => (
          <AnimatedModel
            key={url}
            url={url}
            modelIndex={i}
            outerRef={outerRefs.current[i]}
            focused={focused}
            onFocus={onFocus}
            onHover={onHover}
            visible={activeIndex === null || activeIndex === i}
            exploded={exploded && activeIndex === i}
            explodeConfig={explodeConfig ?? null}
            onReady={(info) => handleModelReady(i, info)}
            enableDrag={enableDrag && activeIndex === i}
            onDragStateChange={(v) => { isDraggingRef.current = v }}
            onAssembled={() => {
              assembledCount.current++
              if (assembledCount.current >= models.length) {
                // Летим к обзорной позиции только если ни одна модель не выбрана
                if (activeIndex === null) {
                  startFly(initPosRef.current.clone(), initTargetRef.current.clone())
                }
                onAssembled?.()
              }
            }}
          />
        ))}
        <Environment preset="city" />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        panSpeed={0.8}
        screenSpacePanning={true}
        enableZoom={true}
        zoomSpeed={1.0}
        rotateSpeed={0.7}
        enableDamping
        dampingFactor={0.12}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.92}
        autoRotateSpeed={1.2}
        makeDefault
      />
    </>
  )
}

// ---------- Экспорт ----------
export default function ModelViewer({ models }) {
  const [focused,      setFocused]      = useState(null)
  const [assembling,   setAssembling]   = useState(false)
  const [hint,         setHint]         = useState(false)
  const [activeIndex,  setActiveIndex]  = useState(null)
  const [isExploded,   setIsExploded]   = useState(false)
  const [hoveredName,  setHoveredName]  = useState(null)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRotate,   setAutoRotate]   = useState(false)
  const [dragMode,     setDragMode]     = useState(false)

  const containerRef = useRef(null)

  // Данные выбранной детали из конфига моделей
  const meshName   = focused?.mesh?.name ?? null
  const modelIdx   = focused?.modelIndex ?? null
  const partConfig = modelIdx !== null ? models[modelIdx]?.parts?.[meshName] : null

  const handleSetActive = (idx) => {
    setActiveIndex(idx)
    setFocused(null)
    setIsExploded(false)
    setDragMode(false)
  }

  const handleReset = () => {
    setFocused(null)
    setActiveIndex(null)
    setIsExploded(false)
    setResetTrigger(v => v + 1)
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        gl={{ alpha: true }}
        camera={{ position: [0, 0, 10], fov: 45 }}
        style={{ background: 'transparent' }}
        onPointerMissed={() => setFocused(null)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]}  intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.3} />

        <Scene
          models={models}
          focused={focused}
          activeIndex={activeIndex}
          exploded={isExploded}
          onFocus={(data) => setFocused(prev => prev?.mesh === data.mesh ? null : data)}
          onHover={setHoveredName}
          resetTrigger={resetTrigger}
          autoRotate={autoRotate}
          enableDrag={dragMode}
          onReady={() => setAssembling(true)}
          onAssembled={() => {
            setAssembling(false)
            setHint(true)
            setTimeout(() => setHint(false), 3500)
          }}
        />
      </Canvas>

      {/* Панель выбора модели */}
      <div style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
        background: 'rgba(8,9,15,0.82)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '8px',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        minWidth: '148px',
      }}>
        <div style={{
          padding: '5px 10px 7px',
          fontSize: '0.58rem',
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.28)',
          textTransform: 'uppercase',
          fontFamily: 'inherit',
        }}>
          Инструменты
        </div>

        {models.map(({ name }, i) => {
          const active = activeIndex === i
          return (
            <button key={i} onClick={() => handleSetActive(active ? null : i)} style={{
              background: active ? 'rgba(29,163,220,0.13)' : 'transparent',
              border: `1px solid ${active ? 'rgba(29,163,220,0.45)' : 'transparent'}`,
              color: active ? '#1da3dc' : 'rgba(255,255,255,0.55)',
              padding: '9px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.82rem',
              letterSpacing: '0.04em',
              transition: 'all 0.18s',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              width: '100%',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
            >
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: active ? '#1da3dc' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.18s',
              }} />
              {name ?? `Модель ${i + 1}`}
            </button>
          )
        })}

        {/* Кнопка взрыв-схемы — только при выбранной одной модели */}
        {activeIndex !== null && (
          <>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 2px' }} />
            <button onClick={() => setIsExploded(v => !v)} style={{
              background: isExploded ? 'rgba(226,46,16,0.12)' : 'rgba(29,163,220,0.08)',
              border: `1px solid ${isExploded ? 'rgba(226,46,16,0.45)' : 'rgba(29,163,220,0.3)'}`,
              color: isExploded ? '#e22e10' : '#1da3dc',
              padding: '9px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              letterSpacing: '0.07em',
              fontWeight: 600,
              transition: 'all 0.18s',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
            }}>
              <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>
                {isExploded ? '⟳' : '⊕'}
              </span>
              {isExploded ? 'Собрать' : 'Разобрать'}
            </button>

          </>
        )}

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 2px' }} />

        {/* Показать все */}
        {(() => {
          const allActive = activeIndex === null
          return (
            <button onClick={() => handleSetActive(null)} style={{
              background: allActive ? 'rgba(29,163,220,0.1)' : 'transparent',
              border: `1px solid ${allActive ? 'rgba(29,163,220,0.35)' : 'transparent'}`,
              color: allActive ? '#1da3dc' : 'rgba(255,255,255,0.42)',
              padding: '9px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              letterSpacing: '0.06em',
              transition: 'all 0.18s',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              width: '100%',
            }}
              onMouseEnter={e => { if (!allActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
              onMouseLeave={e => { if (!allActive) e.currentTarget.style.color = 'rgba(255,255,255,0.42)' }}
            >
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: allActive ? '#1da3dc' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.18s',
              }} />
              Показать все
            </button>
          )
        })()}
      </div>

      {/* Кнопки управления видом — правый верхний угол */}
      <div style={{
        position: 'absolute', top: '16px',
        right: focused ? '284px' : '16px',
        zIndex: 10, display: 'flex', gap: '6px', alignItems: 'center',
        transition: 'right 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      }}>
        <CtrlBtn onClick={handleReset} title="Сбросить вид">
          <IconReset />
        </CtrlBtn>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />

        <CtrlBtn
          onClick={() => setAutoRotate(v => !v)}
          title={autoRotate ? 'Выключить авто-вращение' : 'Включить авто-вращение'}
          active={autoRotate}
        >
          <IconAutoRotate />
        </CtrlBtn>

        {activeIndex !== null && (
          <CtrlBtn
            onClick={() => setDragMode(v => !v)}
            title={dragMode ? 'Выключить тест-drag' : 'Тест: двигать детали мышью'}
            active={dragMode}
          >
            <IconDrag />
          </CtrlBtn>
        )}

<CtrlBtn onClick={handleFullscreen} title={isFullscreen ? 'Свернуть' : 'Полноэкранный режим'}>
          {isFullscreen ? <IconCompress /> : <IconExpand />}
        </CtrlBtn>
      </div>

      {/* Инфо-панель выбранной детали — slide in справа */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '268px',
        height: '100%',
        background: 'rgba(8,9,15,0.91)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        zIndex: 9,
        boxSizing: 'border-box',
        padding: '20px',
        overflowY: 'auto',
        transform: focused ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        pointerEvents: focused ? 'auto' : 'none',
      }}>
        {focused && (
          <>
            {/* Кнопка закрытия */}
            <button
              onClick={() => setFocused(null)}
              title="Закрыть"
              style={{
                position: 'absolute', top: '14px', right: '14px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.4)',
                width: '26px', height: '26px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem',
                transition: 'color 0.15s, border-color 0.15s',
                padding: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
            >
              ✕
            </button>

            {/* Раздел / модель */}
            <div style={{
              fontSize: '0.58rem', letterSpacing: '0.22em',
              color: 'rgba(29,163,220,0.65)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}>
              {models[modelIdx]?.name ?? 'Деталь'}
            </div>

            {/* Имя детали */}
            <div style={{
              fontSize: '0.98rem', fontWeight: 700,
              color: '#fff', lineHeight: 1.3,
              marginBottom: '16px',
              wordBreak: 'break-word',
              paddingRight: '36px',
            }}>
              {partConfig?.title ?? meshName ?? '—'}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />

            {/* Описание */}
            {partConfig?.description ? (
              <p style={{
                fontSize: '0.82rem',
                color: 'rgba(255,255,255,0.58)',
                lineHeight: 1.65,
                margin: '0 0 16px',
              }}>
                {partConfig.description}
              </p>
            ) : (
              <p style={{
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.22)',
                lineHeight: 1.5,
                margin: '0 0 16px',
                fontStyle: 'italic',
              }}>
                Описание не задано
              </p>
            )}

            {/* Характеристики */}
            {(() => {
              const specs = partConfig?.specs?.length > 0 ? partConfig.specs : DEFAULT_SPECS
              return (
                <>
                  <div style={{
                    fontSize: '0.58rem', letterSpacing: '0.2em',
                    color: 'rgba(255,255,255,0.25)',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                  }}>
                    Характеристики
                  </div>
                  {specs.map(({ label, value }) => (
                    <div key={label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: '8px',
                      padding: '7px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.78rem',
                    }}>
                      <span style={{ color: 'rgba(255,255,255,0.38)', flexShrink: 0 }}>{label}</span>
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                    </div>
                  ))}
                </>
              )
            })()}

            {/* Идентификатор меша — для настройки конфига */}
            <div style={{
              marginTop: '20px',
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.2)',
            }}>
              id: <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.38)', userSelect: 'all' }}>{meshName}</span>
            </div>
          </>
        )}
      </div>

      {/* Tooltip с именем детали при наведении */}
      {hoveredName && !focused && (
        <div style={{
          position: 'absolute',
          bottom: '28px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,9,15,0.82)',
          border: '1px solid rgba(29,163,220,0.22)',
          color: 'rgba(255,255,255,0.8)',
          fontFamily: 'inherit',
          fontSize: '0.72rem',
          letterSpacing: '0.07em',
          padding: '5px 14px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 20,
          maxWidth: '260px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {hoveredName}
        </div>
      )}

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
