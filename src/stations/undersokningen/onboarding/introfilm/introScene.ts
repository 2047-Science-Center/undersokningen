/**
 * INTROFILM-SCEN (3GS / Three.js) — stationen med gubbar som jobbar.
 * Samma bygg-mönster som Reaktorkärnans stavScene: primitiv-figurer + accent-
 * material som följer --color-primary, renderer med alpha så CRT-bakgrunden syns.
 *
 * Stationen = Förhandlingens VAGN (approx geometri; riktig .skp läggs in senare):
 * en fristående vagn på fyra snedställda ben med hjul, hyllplan under. I mitten en
 * KIOSK — lutad panel upp till en hög låda med ett runt sikthål (porthål) som man
 * ser igenom till andra sidan, med en lutad skärm åt vardera håll. Lagen står på
 * var sin sida om kiosken (ser varandra genom hålet):
 *   FÄLT (vänster): stor, utskjutande åttkantig skiva med avtryck + skanner.
 *   LABB (höger): liten yta med hårprover.
 * 3 gubbar per sida. Kameran skiftar vänster/höger och zoomar; verktygen lyser
 * vitt från toppen när de är på.
 *
 * API: render(elapsed, beatId, progress) körs varje frame från IntroFilm.vue.
 */
import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)
const TABLE_TOP = 0.95

/** Placera en mesh mellan två punkter (för "armar" mellan axel och verktyg). */
const _d = new THREE.Vector3()
function place(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, stretch = false): void {
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  _d.subVectors(b, a)
  if (stretch) mesh.scale.y = Math.max(0.0001, _d.length())
  mesh.quaternion.setFromUnitVectors(UP, _d.clone().normalize())
}

/**
 * Kamera-inramningar: position + mål. Eas mjukt mellan dem när beaten byter.
 * FÄLT = vänster (−X, stora skivan), LABB = höger (+X, lilla ytan).
 */
const FRAMES: Record<string, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  overview: { pos: new THREE.Vector3(0.1, 3.4, 4.3), tgt: new THREE.Vector3(-0.15, 0.95, 0) },
  faltWide: { pos: new THREE.Vector3(-1.75, 2.35, 3.0), tgt: new THREE.Vector3(-0.95, 1.0, 0) },
  faltClose: { pos: new THREE.Vector3(-1.85, 1.6, 2.05), tgt: new THREE.Vector3(-1.0, 0.96, 0) },
  labbWide: { pos: new THREE.Vector3(1.5, 2.35, 3.0), tgt: new THREE.Vector3(0.55, 1.0, 0) },
  labbClose: { pos: new THREE.Vector3(1.5, 1.55, 2.0), tgt: new THREE.Vector3(0.6, 0.96, 0) },
  both: { pos: new THREE.Vector3(-0.1, 2.75, 3.8), tgt: new THREE.Vector3(-0.1, 1.05, 0) },
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
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60)
  camera.position.copy(FRAMES.overview.pos)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x202830, 1.15))
  const key = new THREE.DirectionalLight(0xffffff, 1.3)
  key.position.set(2, 4, 3)
  scene.add(key)

  // --- material (accent = --color-primary; vagn ljus/neutral) ---
  const M = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const matFig = M(0xffa040)
  const matFigDark = M(0x5a3410)
  const matCart = M(0xd9dde2, { roughness: 0.6 }) // ljus vagn/skiva som i .skp
  const matFrame = M(0xaab0b8, { roughness: 0.5 }) // ben/ram (aluminium)
  const matKiosk = M(0xe6e9ec, { roughness: 0.7 })
  const matDark = M(0x1b2129, { roughness: 0.6 })
  const matScreen = new THREE.MeshStandardMaterial({ color: 0x0a1016, emissive: 0x16324a, emissiveIntensity: 0.7, roughness: 0.4 })
  const matTool = M(0x9fb4c4, { roughness: 0.5 })
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.3 })
  const matMark = new THREE.MeshStandardMaterial({ color: 0x2a3340, emissive: 0x000000, roughness: 0.6 })
  const matBubble = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xffa040, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0 })

  // golv-glow (accent) så figurerna står på något
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.06 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.002
  scene.add(floor)

  // ===================== VAGNEN =====================
  const cart = new THREE.Group()
  scene.add(cart)

  // bordsskiva (huvudyta) — ljus, löper mest i X
  const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 1.05), matCart)
  topDeck.position.set(0, TABLE_TOP - 0.03, 0)
  cart.add(topDeck)
  // hyllplan under + "dator"-låda
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.95), matCart)
  shelf.position.set(0, 0.42, 0)
  cart.add(shelf)
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.45), matDark)
  box.position.set(0.0, 0.6, -0.05)
  cart.add(box)
  // fyra snedställda ben med hjul
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, TABLE_TOP, 8), matFrame)
    leg.position.set(sx * 0.72, (TABLE_TOP - 0.1) / 2 + 0.05, sz * 0.46)
    leg.rotation.z = sx * 0.06
    leg.rotation.x = -sz * 0.05
    cart.add(leg)
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), matDark)
    caster.position.set(sx * 0.78, 0.05, sz * 0.5)
    cart.add(caster)
  }

  // ---------- central KIOSK (lutad panel + hög låda m. porthål + skärmar) ----------
  const kiosk = new THREE.Group()
  kiosk.position.set(0, 0, 0)
  cart.add(kiosk)
  // hög låda överst
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.78), matKiosk)
  head.position.set(0, 1.72, 0)
  kiosk.add(head)
  // lutad panel ned från lådan mot skärmarna
  const slope = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.74), matKiosk)
  slope.position.set(0, 1.28, 0)
  slope.rotation.z = 0.0
  kiosk.add(slope)
  // runt sikthål (porthål): torus med hål-axel längs X (mellan de två sidorna)
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 12, 28), matFrame)
  port.rotation.y = Math.PI / 2
  port.position.set(0.251, 1.74, 0)
  kiosk.add(port)
  const port2 = port.clone()
  port2.position.set(-0.251, 1.74, 0)
  kiosk.add(port2)
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.52, 20), matDark)
  hole.rotation.z = Math.PI / 2
  hole.position.set(0, 1.74, 0)
  kiosk.add(hole)
  // lutad skärm åt vardera operatör (−X = FÄLT, +X = LABB)
  function buildMonitor(sign: 1 | -1) {
    const g = new THREE.Group()
    g.position.set(sign * 0.27, 1.2, 0)
    g.rotation.y = sign * (Math.PI / 2)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.04), matDark)
    frame.rotation.x = -0.3
    const sc = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.36, 0.02), matScreen)
    sc.rotation.x = -0.3
    sc.position.set(0, 0, 0.03)
    g.add(frame, sc)
    kiosk.add(g)
  }
  buildMonitor(-1)
  buildMonitor(1)

  // ---------- FÄLT: stor utskjutande ÅTTKANTIG skiva (−X) ----------
  const faltCx = -1.05
  const faltSlab = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 8), matCart)
  faltSlab.rotation.y = Math.PI / 8 // platt kant utåt
  faltSlab.scale.set(1.35, 1, 1.0) // förlängd utåt
  faltSlab.position.set(faltCx, TABLE_TOP - 0.02, 0)
  scene.add(faltSlab)
  const faltSurf = { x: faltCx, y: TABLE_TOP + 0.01, z: 0 }

  // avtrycks-prickar på skivan (tänds under UV/scan)
  const marks: THREE.Mesh[] = []
  const markPts = [
    [-0.34, 0.22], [-0.12, -0.12], [0.08, 0.16], [-0.2, -0.34], [0.22, -0.2], [0.0, 0.38],
  ] as const
  for (const [mx, mz] of markPts) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), matMark.clone())
    m.rotation.x = -Math.PI / 2
    m.position.set(faltSurf.x + mx, faltSurf.y + 0.012, faltSurf.z + mz)
    scene.add(m)
    marks.push(m)
  }

  // ---------- LABB: liten yta med hårprover (+X) ----------
  const labbCx = 0.62
  const labbPlate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.6), matDark)
  labbPlate.position.set(labbCx, TABLE_TOP + 0.005, 0)
  scene.add(labbPlate)
  const labbSurf = { x: labbCx, y: TABLE_TOP + 0.02, z: 0 }
  const hairs: THREE.Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 6), matFig.clone())
    h.rotation.z = Math.PI / 2
    h.rotation.y = (i - 2) * 0.22
    h.position.set(labbSurf.x + (i % 2 === 0 ? -0.05 : 0.05), labbSurf.y + 0.014, labbSurf.z - 0.2 + i * 0.1)
    scene.add(h)
    hairs.push(h)
  }

  // ===================== GUBBAR =====================
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
    add(new THREE.CapsuleGeometry(0.13, 0.42, 4, 10)).position.set(0, 1.12, 0) // torso
    add(new THREE.SphereGeometry(0.11, 12, 10)).position.set(0, 1.52, 0) // huvud
    for (const lx of [-0.08, 0.08]) {
      const leg = add(new THREE.CapsuleGeometry(0.05, 0.62, 4, 8), lx < 0 ? matFig : matFigDark)
      leg.position.set(lx, 0.42, 0)
    }
    add(new THREE.BoxGeometry(0.2, 0.05, 0.12), matFigDark).position.set(0.03, 0.03, 0.1)
    add(new THREE.BoxGeometry(0.2, 0.05, 0.12), matFigDark).position.set(0.03, 0.03, -0.1)
    const idleArm = add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8))
    idleArm.position.set(-0.17, 1.15, 0)
    idleArm.rotation.z = 0.25

    group.updateMatrixWorld(true)
    const shoulder = new THREE.Vector3(0.16, 1.32, 0.05)
    group.localToWorld(shoulder)

    let arm: THREE.Mesh | null = null
    let toolGrp: THREE.Group | null = null
    let glowTip: THREE.Mesh | null = null
    let light: THREE.PointLight | null = null

    if (tool) {
      arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), matFig)
      scene.add(arm)
      toolGrp = new THREE.Group()
      scene.add(toolGrp)
      if (tool === 'scanner') {
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), matTool)
        grip.rotation.x = 0.5
        grip.position.set(0, -0.06, 0.04)
        const headM = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.18), matTool)
        toolGrp.add(grip, headM)
        glowTip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.02), matGlow.clone())
        glowTip.position.set(0, -0.04, 0.095)
        toolGrp.add(glowTip)
      } else {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.22, 10), matTool)
        toolGrp.add(body)
        glowTip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), matGlow.clone())
        glowTip.position.set(0, 0.12, 0)
        toolGrp.add(glowTip)
      }
      light = new THREE.PointLight(0xffffff, 0, 1.2, 2)
      scene.add(light)
    }

    const _sh = new THREE.Vector3()
    function aim(point: THREE.Vector3): void {
      if (!arm || !toolGrp) return
      toolGrp.position.copy(point).add(new THREE.Vector3(0, 0.12, 0))
      toolGrp.lookAt(point)
      _sh.copy(shoulder)
      place(arm, _sh, toolGrp.position, true)
      if (light) light.position.copy(point).add(new THREE.Vector3(0, 0.18, 0))
    }
    function lookInward(k: number): void {
      group.rotation.y = faceY + (x < 0 ? -1 : 1) * k * 0.28
    }
    return { group, shoulder, arm, tool: toolGrp, glowTip, light, faceY, aim, lookInward }
  }

  // FÄLT (vänster, vända mot +X) — 3 gubbar kring stora skivan
  const uvFig = makeFig(-1.1, 0.55, Math.PI / 2 + 0.12, 'uv')
  const scanFig = makeFig(-1.1, -0.5, Math.PI / 2 - 0.12, 'scanner')
  makeFig(-1.62, 0.02, Math.PI / 2, null) // fält-observatör
  // LABB (höger, vända mot −X) — 3 gubbar kring lilla ytan
  const microFig = makeFig(1.05, 0.5, -Math.PI / 2 - 0.12, 'micro')
  makeFig(1.05, -0.5, -Math.PI / 2 + 0.12, null) // labb-observatör
  makeFig(1.5, 0.02, -Math.PI / 2, null) // labb-observatör

  const toolFigs = [uvFig, scanFig, microFig]
  function toolActive(f: Fig, on: boolean, pt: THREE.Vector3): void {
    if (!f.tool) return
    f.tool.visible = on
    if (f.arm) f.arm.visible = on
    if (f.light) f.light.intensity = on ? 2.4 : 0
    const gt = f.glowTip?.material as THREE.MeshStandardMaterial | undefined
    if (gt) gt.emissiveIntensity = on ? 1.6 : 0.2
    if (on) f.aim(pt)
  }

  // pratbubblor (talk/finale) — ovanför var sin sida
  const bubbles: THREE.Mesh[] = []
  for (const bx of [-1.1, 1.05]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), matBubble)
    b.position.set(bx, 1.98, 0.05)
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
    for (const h of hairs) h.position.y = labbSurf.y + 0.014
    uvFig.lookInward(0)
    scanFig.lookInward(0)
    microFig.lookInward(0)
  }

  function sweepPoint(progress: number): THREE.Vector3 {
    // sveper över FÄLT-skivan fram→bak (längs Z)
    const t = Math.min(1, progress / 0.7)
    const z = THREE.MathUtils.lerp(0.42, -0.34, t)
    return _sweep.set(faltSurf.x, faltSurf.y, z)
  }

  function render(elapsed: number, beatId: string, progress: number): void {
    resetHighlights()

    const frameKey = BEAT_FRAME[beatId] ?? 'overview'
    const fr = FRAMES[frameKey]
    camPos.lerp(fr.pos, 0.055)
    camTgt.lerp(fr.tgt, 0.055)
    const breath = Math.sin(elapsed * 0.6) * 0.03
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
        const pt = _sweep.set(faltSurf.x + 0.08, faltSurf.y, 0.16)
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
        hairs[i].position.y = labbSurf.y + 0.05 + Math.sin(elapsed * 6) * 0.01
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
          b.position.y = 1.98 + bob * 0.06
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
