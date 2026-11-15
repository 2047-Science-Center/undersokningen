/**
 * INTROFILM-SCEN (3GS / Three.js) — stationen med gubbar som jobbar.
 * Samma bygg-mönster som Reaktorkärnans stavScene: primitiv-figurer + accent-
 * material som följer --color-primary, renderer med alpha så CRT-bakgrunden syns.
 *
 * SKALA = meter, efter riktiga .skp-vagnen (approx tills .skp byts in):
 *   Vagn: 0.90 m hög, 0.90 m lång (Z), 0.46 m bred (X).
 *   Utökad skiva (FÄLT): ~0.25 m utbuktning på −X.
 * Fristående vagn på fyra ben med hjul + hyllplan. Central KIOSK: lutad panel upp
 * till en hög låda med runt sikthål (porthål) man ser igenom, lutad skärm åt vardera
 * håll. Lagen står på GOLVET på var sin långsida (−X = FÄLT, +X = LABB), 3 gubbar
 * per sida, vända mot varandra tvärs över de 0.46 m. Verktygen lyser vitt från toppen.
 *
 * API: render(elapsed, beatId, progress) körs varje frame från IntroFilm.vue.
 */
import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)

// --- riktiga mått (meter) ---
const DECK_X = 0.46 // bredd (mellan de två sidorna)
const DECK_Z = 0.9 // längd (varje sidas långsida)
const DECK_TOP = 0.9 // höjd
const SLAB_OUT = 0.25 // utökade skivans utbuktning

/** Placera en mesh mellan två punkter (för "armar" mellan axel och verktyg). */
const _d = new THREE.Vector3()
function place(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, stretch = false): void {
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  _d.subVectors(b, a)
  if (stretch) mesh.scale.y = Math.max(0.0001, _d.length())
  mesh.quaternion.setFromUnitVectors(UP, _d.clone().normalize())
}

/**
 * Kamera-inramningar (meter-skala): position + mål. Eas mjukt mellan dem.
 * FÄLT = vänster (−X, utökade skivan), LABB = höger (+X, lilla ytan).
 */
const FRAMES: Record<string, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  overview: { pos: new THREE.Vector3(0.1, 2.2, 2.95), tgt: new THREE.Vector3(-0.1, 0.9, 0) },
  faltWide: { pos: new THREE.Vector3(-1.15, 1.6, 1.75), tgt: new THREE.Vector3(-0.4, 0.95, 0) },
  faltClose: { pos: new THREE.Vector3(-1.05, 1.2, 1.2), tgt: new THREE.Vector3(-0.42, 0.9, 0) },
  labbWide: { pos: new THREE.Vector3(1.05, 1.6, 1.75), tgt: new THREE.Vector3(0.35, 0.95, 0) },
  labbClose: { pos: new THREE.Vector3(1.0, 1.2, 1.2), tgt: new THREE.Vector3(0.28, 0.9, 0) },
  both: { pos: new THREE.Vector3(-0.1, 2.05, 2.9), tgt: new THREE.Vector3(-0.1, 1.0, 0) },
}

export interface IntroScene {
  render(elapsed: number, beatId: string, progress: number): void
  resize(w: number, h: number): void
  setAccent(css: string): void
  dispose(): void
}

export function createIntroScene(canvas: HTMLCanvasElement): IntroScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60)
  camera.position.copy(FRAMES.overview.pos)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202830, 1.15))
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3)
  keyLight.position.set(2, 4, 3)
  scene.add(keyLight)

  // --- material (accent = --color-primary; vagn ljus/neutral som .skp) ---
  const M = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const matFig = M(0xffa040)
  const matFigDark = M(0x5a3410)
  const matCart = M(0xd9dde2, { roughness: 0.6 })
  const matFrame = M(0xaab0b8, { roughness: 0.5 })
  const matKiosk = M(0xe6e9ec, { roughness: 0.7 })
  const matDark = M(0x1b2129, { roughness: 0.6 })
  const matScreen = new THREE.MeshStandardMaterial({ color: 0x0a1016, emissive: 0x16324a, emissiveIntensity: 0.7, roughness: 0.4 })
  const matTool = M(0x9fb4c4, { roughness: 0.5 })
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.3 })
  const matMark = new THREE.MeshStandardMaterial({ color: 0x2a3340, emissive: 0x000000, roughness: 0.6 })
  const matBubble = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xffa040, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0 })

  // golv-glow (accent)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 48),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.06 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.002
  scene.add(floor)

  // ===================== VAGNEN (0.46 × 0.90 × h0.90) =====================
  const cart = new THREE.Group()
  scene.add(cart)
  const topDeck = new THREE.Mesh(new THREE.BoxGeometry(DECK_X, 0.04, DECK_Z), matCart)
  topDeck.position.set(0, DECK_TOP - 0.02, 0)
  cart.add(topDeck)
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(DECK_X - 0.04, 0.03, DECK_Z - 0.08), matCart)
  shelf.position.set(0, 0.4, 0)
  cart.add(shelf)
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.4), matDark)
  box.position.set(0, 0.56, -0.02)
  cart.add(box)
  // fyra ben + hjul
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, DECK_TOP - 0.05, 8), matFrame)
    leg.position.set(sx * (DECK_X / 2 - 0.03), (DECK_TOP - 0.05) / 2 + 0.05, sz * (DECK_Z / 2 - 0.05))
    cart.add(leg)
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), matDark)
    caster.position.set(sx * (DECK_X / 2 - 0.03), 0.03, sz * (DECK_Z / 2 - 0.05))
    cart.add(caster)
  }

  // ---------- central KIOSK (porthål + lutade skärmar åt ±X) ----------
  const kiosk = new THREE.Group()
  cart.add(kiosk)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.42), matKiosk)
  head.position.set(0, 1.26, 0)
  kiosk.add(head)
  const slopeBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.4), matKiosk)
  slopeBase.position.set(0, 1.0, 0)
  kiosk.add(slopeBase)
  // runt sikthål: torus m. hål-axel längs X (mellan de två sidorna) + mörkt genomhål
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 12, 26), matFrame)
  port.rotation.y = Math.PI / 2
  port.position.set(0.131, 1.28, 0)
  kiosk.add(port)
  const port2 = port.clone()
  port2.position.set(-0.131, 1.28, 0)
  kiosk.add(port2)
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.27, 20), matDark)
  hole.rotation.z = Math.PI / 2
  hole.position.set(0, 1.28, 0)
  kiosk.add(hole)
  // lutad skärm åt vardera operatör
  function buildMonitor(sign: 1 | -1) {
    const g = new THREE.Group()
    g.position.set(sign * 0.14, 1.04, 0)
    g.rotation.y = sign * (Math.PI / 2)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.025), matDark)
    frame.rotation.x = -0.32
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.015), matScreen)
    sc.rotation.x = -0.32
    sc.position.set(0, 0, 0.02)
    g.add(frame, sc)
    kiosk.add(g)
  }
  buildMonitor(-1)
  buildMonitor(1)

  // ---------- FÄLT: liten utökad ÅTTKANTIG skiva (−X, ~0.25 m ut) ----------
  const faltCx = -(DECK_X / 2) - SLAB_OUT / 2 // skivans centrum, halvt ut
  const faltSlab = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 8), matCart)
  faltSlab.rotation.y = Math.PI / 8
  faltSlab.position.set(faltCx, DECK_TOP - 0.005, 0)
  scene.add(faltSlab)
  const faltSurf = { x: faltCx, y: DECK_TOP + 0.01, z: 0 }

  // avtrycks-prickar på skivan
  const marks: THREE.Mesh[] = []
  const markPts = [
    [-0.08, 0.1], [-0.02, -0.1], [0.04, 0.05], [-0.1, -0.03], [0.0, 0.15], [-0.12, 0.02],
  ] as const
  for (const [mx, mz] of markPts) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), matMark.clone())
    m.rotation.x = -Math.PI / 2
    m.position.set(faltSurf.x + mx, faltSurf.y + 0.008, faltSurf.z + mz)
    scene.add(m)
    marks.push(m)
  }

  // ---------- LABB: liten yta med hårprover (+X) ----------
  const labbCx = 0.18
  const labbPlate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.4), matDark)
  labbPlate.position.set(labbCx, DECK_TOP + 0.003, 0)
  scene.add(labbPlate)
  const labbSurf = { x: labbCx, y: DECK_TOP + 0.014, z: 0 }
  const hairs: THREE.Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 6), matFig.clone())
    h.rotation.z = Math.PI / 2
    h.rotation.y = (i - 2) * 0.22
    h.position.set(labbSurf.x + (i % 2 === 0 ? -0.03 : 0.03), labbSurf.y + 0.01, labbSurf.z - 0.14 + i * 0.07)
    scene.add(h)
    hairs.push(h)
  }

  // ===================== GUBBAR (på golvet, bredvid vagnen) =====================
  interface Fig {
    group: THREE.Group
    shoulder: THREE.Vector3
    arm: THREE.Mesh | null
    tool: THREE.Group | null
    glowTip: THREE.Mesh | null
    light: THREE.PointLight | null
    faceY: number
    aim(point: THREE.Vector3): void
    lookInward(k: number): void
  }
  function makeFig(x: number, z: number, faceY: number, tool: 'uv' | 'scanner' | 'micro' | null): Fig {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = faceY
    scene.add(group)
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material = matFig) => {
      const m = new THREE.Mesh(geo, mat)
      group.add(m)
      return m
    }
    // människa ~1.7 m: ben till 0.9, torso till ~1.45, huvud topp ~1.72
    add(new THREE.CapsuleGeometry(0.11, 0.42, 4, 10)).position.set(0, 1.2, 0) // torso
    add(new THREE.SphereGeometry(0.1, 12, 10)).position.set(0, 1.6, 0) // huvud
    for (const lx of [-0.07, 0.07]) {
      const leg = add(new THREE.CapsuleGeometry(0.045, 0.7, 4, 8), lx < 0 ? matFig : matFigDark)
      leg.position.set(lx, 0.45, 0)
    }
    add(new THREE.BoxGeometry(0.17, 0.04, 0.1), matFigDark).position.set(0.02, 0.02, 0.08)
    add(new THREE.BoxGeometry(0.17, 0.04, 0.1), matFigDark).position.set(0.02, 0.02, -0.08)
    const idleArm = add(new THREE.CylinderGeometry(0.03, 0.03, 0.44, 8))
    idleArm.position.set(-0.15, 1.22, 0)
    idleArm.rotation.z = 0.25

    group.updateMatrixWorld(true)
    const shoulder = new THREE.Vector3(0.14, 1.4, 0.04)
    group.localToWorld(shoulder)

    let arm: THREE.Mesh | null = null
    let toolGrp: THREE.Group | null = null
    let glowTip: THREE.Mesh | null = null
    let light: THREE.PointLight | null = null

    if (tool) {
      arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), matFig)
      scene.add(arm)
      toolGrp = new THREE.Group()
      scene.add(toolGrp)
      if (tool === 'scanner') {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.13, 8), matTool)
        grip.rotation.x = 0.5
        grip.position.set(0, -0.05, 0.03)
        const headM = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.15), matTool)
        toolGrp.add(grip, headM)
        glowTip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.008, 0.016), matGlow.clone())
        glowTip.position.set(0, -0.03, 0.08)
        toolGrp.add(glowTip)
      } else {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.18, 10), matTool)
        toolGrp.add(body)
        glowTip = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), matGlow.clone())
        glowTip.position.set(0, 0.1, 0)
        toolGrp.add(glowTip)
      }
      light = new THREE.PointLight(0xffffff, 0, 1.0, 2)
      scene.add(light)
    }

    const _sh = new THREE.Vector3()
    function aim(point: THREE.Vector3): void {
      if (!arm || !toolGrp) return
      toolGrp.position.copy(point).add(new THREE.Vector3(0, 0.1, 0))
      toolGrp.lookAt(point)
      _sh.copy(shoulder)
      place(arm, _sh, toolGrp.position, true)
      if (light) light.position.copy(point).add(new THREE.Vector3(0, 0.15, 0))
    }
    function lookInward(k: number): void {
      group.rotation.y = faceY + (x < 0 ? -1 : 1) * k * 0.28
    }
    return { group, shoulder, arm, tool: toolGrp, glowTip, light, faceY, aim, lookInward }
  }

  // FÄLT (−X, vända mot +X) — 3 gubbar på golvet bredvid utökade skivan
  const uvFig = makeFig(-0.66, 0.26, Math.PI / 2 + 0.1, 'uv')
  const scanFig = makeFig(-0.66, -0.26, Math.PI / 2 - 0.1, 'scanner')
  makeFig(-0.72, 0.0, Math.PI / 2, null) // fält-observatör
  // LABB (+X, vända mot −X) — 3 gubbar på golvet bredvid lilla ytan
  const microFig = makeFig(0.48, 0.26, -Math.PI / 2 - 0.1, 'micro')
  makeFig(0.48, -0.26, -Math.PI / 2 + 0.1, null) // labb-observatör
  makeFig(0.54, 0.0, -Math.PI / 2, null) // labb-observatör

  const toolFigs = [uvFig, scanFig, microFig]
  function toolActive(f: Fig, on: boolean, pt: THREE.Vector3): void {
    if (!f.tool) return
    f.tool.visible = on
    if (f.arm) f.arm.visible = on
    if (f.light) f.light.intensity = on ? 1.8 : 0
    const gt = f.glowTip?.material as THREE.MeshStandardMaterial | undefined
    if (gt) gt.emissiveIntensity = on ? 1.6 : 0.2
    if (on) f.aim(pt)
  }

  // pratbubblor (talk/finale)
  const bubbles: THREE.Mesh[] = []
  for (const bx of [-0.66, 0.48]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), matBubble)
    b.position.set(bx, 1.92, 0.04)
    b.scale.set(1.3, 0.9, 0.2)
    scene.add(b)
    bubbles.push(b)
  }

  // --- kamera-easing ---
  const camPos = FRAMES.overview.pos.clone()
  const camTgt = FRAMES.overview.tgt.clone()
  const _sweep = new THREE.Vector3()

  function resetHighlights(): void {
    for (const m of marks) {
      ;(m.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000)
    }
    for (const f of toolFigs) toolActive(f, false, _sweep)
    for (const b of bubbles) (b.material as THREE.MeshStandardMaterial).opacity = 0
    for (const h of hairs) h.position.y = labbSurf.y + 0.01
    uvFig.lookInward(0)
    scanFig.lookInward(0)
    microFig.lookInward(0)
  }

  function sweepPoint(progress: number): THREE.Vector3 {
    const t = Math.min(1, progress / 0.7)
    const z = THREE.MathUtils.lerp(0.12, -0.12, t)
    return _sweep.set(faltSurf.x - 0.04, faltSurf.y, z)
  }

  function render(elapsed: number, beatId: string, progress: number): void {
    resetHighlights()

    const frameKey = BEAT_FRAME[beatId] ?? 'overview'
    const fr = FRAMES[frameKey]
    camPos.lerp(fr.pos, 0.055)
    camTgt.lerp(fr.tgt, 0.055)
    const breath = Math.sin(elapsed * 0.6) * 0.015
    camera.position.copy(camPos).add(new THREE.Vector3(breath, breath * 0.5, 0))
    camera.lookAt(camTgt)

    switch (beatId) {
      case 'uv': {
        const pt = sweepPoint(progress)
        toolActive(uvFig, true, pt)
        lightNearest(pt, 0x8a5bd8)
        break
      }
      case 'skanna': {
        const pt = _sweep.set(faltSurf.x + 0.02, faltSurf.y, 0.05)
        toolActive(scanFig, true, pt)
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 10)
        ;(marks[2].material as THREE.MeshStandardMaterial).emissive.setHex(0x20406a)
        ;(marks[2].material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + pulse
        break
      }
      case 'markera':
        lightAll(0x20406a, 0.5)
        break
      case 'lista':
        lightAll(0x20406a, 0.35)
        break
      case 'sortera': {
        toolActive(microFig, true, _sweep.set(labbSurf.x, labbSurf.y, 0))
        const i = Math.floor(progress * hairs.length) % hairs.length
        hairs[i].position.y = labbSurf.y + 0.035 + Math.sin(elapsed * 6) * 0.008
        break
      }
      case 'samarbete':
      case 'slut': {
        const k = Math.min(1, progress * 1.4)
        uvFig.lookInward(k)
        scanFig.lookInward(k)
        microFig.lookInward(k)
        const bob = 0.5 + 0.5 * Math.sin(elapsed * 3)
        for (const b of bubbles) {
          ;(b.material as THREE.MeshStandardMaterial).opacity = 0.35 + 0.5 * bob
          b.position.y = 1.92 + bob * 0.04
        }
        break
      }
      default:
        break
    }

    renderer.render(scene, camera)
  }

  function lightNearest(pt: THREE.Vector3, hex: number): void {
    let best = marks[0]
    let bd = Infinity
    for (const m of marks) {
      const d = m.position.distanceToSquared(pt)
      if (d < bd) {
        bd = d
        best = m
      }
    }
    const mm = best.material as THREE.MeshStandardMaterial
    mm.emissive.setHex(hex)
    mm.emissiveIntensity = 1.2
  }
  function lightAll(hex: number, inten: number): void {
    for (const m of marks) {
      const mm = m.material as THREE.MeshStandardMaterial
      mm.emissive.setHex(hex)
      mm.emissiveIntensity = inten
    }
  }

  return {
    render,
    resize(w, h) {
      if (w < 1 || h < 1) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    },
    setAccent(css) {
      const c = new THREE.Color(css)
      matFig.color.copy(c)
      matFigDark.color.copy(c).multiplyScalar(0.4)
      matBubble.color.copy(c)
      matBubble.emissive.copy(c)
      ;(floor.material as THREE.MeshBasicMaterial).color.copy(c)
      for (const h of hairs) (h.material as THREE.MeshStandardMaterial).color.copy(c).lerp(new THREE.Color(0xffffff), 0.3)
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
      })
      renderer.dispose()
    },
  }
}

/** beatId → kamera-inramning (speglar FILM[].cam). */
const BEAT_FRAME: Record<string, string> = {
  open: 'overview',
  forensik: 'faltWide',
  uv: 'faltClose',
  skanna: 'faltClose',
  markera: 'faltClose',
  lista: 'faltWide',
  panlabb: 'labbWide',
  sortera: 'labbClose',
  samarbete: 'both',
  slut: 'overview',
}
