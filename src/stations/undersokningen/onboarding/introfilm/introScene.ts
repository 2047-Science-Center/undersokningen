/**
 * INTROFILM-SCEN (3GS / Three.js) — "Stölden i valvet": stationen med två lag
 * som jobbar, beat för beat. Byggd av 3JS-tråden efter
 * docs/bestallning-introfilm-3js.md. Samma figur-familj, ljus och kamerakänsla som
 * Reaktorkärnans stavScene.ts / pulsScene.ts (capsule-torso/ben, sfär-huvud,
 * cylinder-armar, mörka fotboxar, flatShading, monokromt i accentfärgen).
 *
 * SKALA = meter. Vagnen (Förhandlingens vagn utan mellanvägg):
 *   höjd 0,90 · långsidan man står framför 0,46 (Z) · 0,90 tvärs över (X) mellan
 *   lagen · FÄLT-sidans utökade åttkantiga skiva buktar ut ~0,25 m (−X).
 *   Central kiosk: sluttande panel → hög låda med runt genomsiktligt porthål (längs X,
 *   lagen ser varandra), lutad laptop-skärm infälld i sluttningen åt vardera lag.
 *   Hjul, hyllplan, dator-låda på nedre hyllan, hörlurar under skivan, infälld ruta.
 * Lagen står på GOLVET: FÄLT (−X) och LABB (+X), 3 gubbar var, mitt emot varandra.
 *
 * API (anropas varje frame av IntroFilm.vue):
 *   render(elapsed, beatId, progress) — beatId + progress är ENDA sanningen för
 *   handlingen; elapsed används bara för andning/puls. Kameran räknas deterministiskt
 *   ur (beat, progress) → samma bild oavsett bildfrekvens.
 */
import * as THREE from 'three'
import { FILM } from './introFilm'

const UP = new THREE.Vector3(0, 1, 0)
const FWD = new THREE.Vector3(0, 0, -1)
const THIGH = 0.45
const SHIN = 0.45
const SPINE = 0.52

// --- riktiga mått (meter) ---
const DECK_X = 0.9 // tvärs över mellan lagen
const DECK_Z = 0.46 // långsidan man står framför
const DECK_TOP = 0.9
const SLAB_OUT = 0.25 // FÄLT-skivans utbuktning

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t) }
const ramp = (x: number, a: number, b: number) => smooth((x - a) / (b - a))

const _d = new THREE.Vector3()
function place(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, stretch = false): void {
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  _d.subVectors(b, a)
  if (stretch) mesh.scale.y = Math.max(1e-4, _d.length())
  mesh.quaternion.setFromUnitVectors(UP, _d.normalize())
}
function kneeOf(hip: THREE.Vector3, ankle: THREE.Vector3): THREE.Vector3 {
  const v = new THREE.Vector3().subVectors(ankle, hip)
  const d = Math.min(v.length(), THIGH + SHIN - 1e-4)
  v.normalize()
  const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a))
  const perp = FWD.clone().addScaledVector(v, -FWD.dot(v)).normalize()
  return hip.clone().addScaledVector(v, a).addScaledVector(perp, h)
}

/* ------------------------------------------------------------------ *
 * Kamera-inramningar. Översikt/samarbete snett uppifrån från ett FRAMHÖRN
 * (inte rakt framifrån — då skymmer främsta gubben de två bakom).
 * ------------------------------------------------------------------ */
interface Frame { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number }
const F = (p: [number, number, number], t: [number, number, number], fov = 36): Frame =>
  ({ pos: new THREE.Vector3(...p), tgt: new THREE.Vector3(...t), fov })
const FRAMES: Record<string, Frame> = {
  // högt + långt bort; närbilder med smal bildvinkel uppifrån → ser ÖVER gubbarnas huvuden
  overview: F([2.5, 4.3, 3.3], [-0.05, 0.8, 0], 34),
  faltWide: F([-1.4, 4.2, 2.8], [-0.45, 0.9, 0], 28),
  // närbild på FÄLT-skivan från LABB-sidan, över kiosken → lagets ansikten + händer syns
  faltClose: F([0.75, 3.0, 1.15], [-0.5, 0.95, 0], 24),
  faltScreen: F([-1.25, 3.3, 2.1], [-0.3, 1.0, 0], 20), // 3/4 från framhörn: avtryck + skärmglöd fria
  faltSide: F([1.2, 3.4, 1.9], [-0.5, 0.95, 0], 30),
  labbWide: F([1.4, 4.2, 2.8], [0.4, 0.9, 0], 28), // spegelbild av FÄLT-vid: landar på LABB:s framhörn
  labbClose: F([-0.5, 3.6, 1.7], [0.4, 0.95, 0], 22),
  both: F([0.6, 4.2, 3.6], [0, 1.0, 0], 34),
  over: F([0.2, 4.6, 2.2], [0, 0.95, 0], 34), // mellanläge för panoreringen över stationen
}
/** beatId → inramning. */
const BEAT_FRAME: Record<string, string> = {
  open: 'overview',
  forensik: 'faltWide',
  uv: 'faltClose',
  skanna: 'faltClose',
  markera: 'faltScreen',
  lista: 'faltSide',
  panlabb: 'labbWide',
  sortera: 'labbClose',
  samarbete: 'both',
  slut: 'overview',
}
/** Hur länge (s) kameran glider in i en ny beats inramning. */
const CAM_EASE_S = 2.0

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
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 40)
  let viewW = 16, viewH = 9

  // ljus som stav/puls
  scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 1.2))
  const key = new THREE.DirectionalLight(0xffffff, 1.5)
  key.position.set(1.5, 3.5, 3)
  scene.add(key)

  // ---------- material: monokromt i accentfärgen ----------
  const accent = new THREE.Color(0xffa040)
  const M = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const matFig = M(0xffa040)
  const matFigDark = M(0x5a3410) // fötter
  const matCart = M(0x7a4a18) // vagnens ram/skiva
  const matBody = M(0x4a2e10) // kiosk/lådor
  const matDeep = M(0x24160a) // dator-låda, infälld ruta, porthålsram
  const matSlab = M(0x1a1008, { roughness: 0.6 }) // forensikskivan: mörk så avtrycken syns
  const matTool = M(0x3a2410, { roughness: 0.5 }) // verktygskroppar (mörka)
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.3 })
  const matGlass = new THREE.MeshStandardMaterial({
    color: 0xbfd0ff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide,
  })
  const accentMats: [THREE.MeshStandardMaterial, number][] = [
    [matFig, 1], [matFigDark, 0.35], [matCart, 0.5], [matBody, 0.3], [matDeep, 0.14], [matTool, 0.22], [matSlab, 0.24],
  ]

  const floor = new THREE.Mesh(
    new THREE.RingGeometry(0, 2.1, 64),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.07 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.001
  scene.add(floor)

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }

  // ===================== VAGNEN =====================
  const LEG_X = DECK_X / 2 - 0.025
  const LEG_Z = DECK_Z / 2 - 0.025
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(0.035, DECK_TOP - 0.08, 0.035, matCart, sx * LEG_X, 0.07 + (DECK_TOP - 0.08) / 2, sz * LEG_Z)
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.022, 14), matDeep)
    wheel.rotation.x = Math.PI / 2
    wheel.position.set(sx * LEG_X, 0.032, sz * LEG_Z)
    scene.add(wheel)
  }
  box(DECK_X, 0.03, DECK_Z, matCart, 0, DECK_TOP - 0.015, 0) // skivan
  box(DECK_X - 0.02, 0.02, DECK_Z - 0.02, matCart, 0, 0.56, 0) // mellanhylla
  box(DECK_X - 0.02, 0.02, DECK_Z - 0.02, matCart, 0, 0.2, 0) // nedre hylla
  box(0.5, 0.33, 0.3, matDeep, 0.02, 0.375, 0) // dator/CPU-låda (stor grå låda, som .skp)

  // hörlurar som hänger på långsidan vid mellanhyllan (som .skp)
  {
    const g = new THREE.Group()
    g.position.set(0.05, 0.47, DECK_Z / 2 + 0.03)
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 8, 20, Math.PI), matDeep)
    g.add(band)
    for (const cx of [-0.075, 0.075]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), matDeep)
      cup.rotation.x = Math.PI / 2
      cup.position.set(cx, -0.015, 0)
      g.add(cup)
    }
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), matCart)
    hook.position.set(0, 0.09, -0.01)
    g.add(hook)
    scene.add(g)
  }

  // ---------- central KIOSK ----------
  const KIOSK_HALF = 0.1 // höga lådans halvdjup i X (porthålets längd = 0,2 m)
  const SLOPE_X = 0.27 // där sluttningen möter skivan
  const BOX_Y0 = 1.16, BOX_Y1 = 1.5
  const PORT_Y = 1.33
  const PORT_R = 0.085
  // hög låda med porthål: byggd av fyra delar runt hålet så hålet är äkta genomsiktligt
  const BW = DECK_Z + 0.04 // lådan lika bred som vagnen (lite bredare, som .skp)
  const bx = 2 * KIOSK_HALF
  box(bx, PORT_Y - PORT_R - BOX_Y0, BW, matBody, 0, (BOX_Y0 + PORT_Y - PORT_R) / 2, 0)
  box(bx, BOX_Y1 - (PORT_Y + PORT_R), BW, matBody, 0, (PORT_Y + PORT_R + BOX_Y1) / 2, 0)
  for (const sz of [-1, 1]) {
    const w = BW / 2 - PORT_R
    box(bx, 2 * PORT_R, w, matBody, 0, PORT_Y, sz * (PORT_R + w / 2))
  }
  const portTube = new THREE.Mesh(new THREE.CylinderGeometry(PORT_R, PORT_R, bx, 28, 1, true), matDeep)
  matDeep.side = THREE.DoubleSide
  portTube.rotation.z = Math.PI / 2
  portTube.position.y = PORT_Y
  scene.add(portTube)
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PORT_R + 0.008, 0.012, 10, 32), matDeep)
    ring.rotation.y = Math.PI / 2
    ring.position.set(sx * (KIOSK_HALF + 0.002), PORT_Y, 0)
    scene.add(ring)
  }
  const portGlass = new THREE.Mesh(new THREE.CircleGeometry(PORT_R, 28), matGlass)
  portGlass.rotation.y = Math.PI / 2
  portGlass.position.y = PORT_Y
  scene.add(portGlass)
  const matPortGlow = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  const portGlow = new THREE.Mesh(new THREE.RingGeometry(PORT_R - 0.004, PORT_R + 0.03, 32), matPortGlow)
  portGlow.rotation.y = Math.PI / 2
  portGlow.position.y = PORT_Y
  scene.add(portGlow)

  // sluttande panel åt vardera lag, med infälld lutad laptop-skärm
  const slopeLen = Math.hypot(SLOPE_X - KIOSK_HALF, BOX_Y0 - DECK_TOP)
  const slopeAng = Math.atan2(BOX_Y0 - DECK_TOP, SLOPE_X - KIOSK_HALF)
  interface Screen { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; mat: THREE.MeshBasicMaterial; sig: string }
  const screens: Record<'falt' | 'labb', Screen> = {} as Record<'falt' | 'labb', Screen>
  for (const side of ['falt', 'labb'] as const) {
    const sx = side === 'falt' ? -1 : 1
    const g = new THREE.Group()
    g.position.set(sx * (KIOSK_HALF + SLOPE_X) / 2, (DECK_TOP + BOX_Y0) / 2, 0)
    g.rotation.set(0, sx === -1 ? -Math.PI / 2 : Math.PI / 2, 0)
    scene.add(g)
    const tilt = new THREE.Group()
    tilt.rotation.x = -(Math.PI / 2 - slopeAng) // panelen lutar bakåt mot lådan
    g.add(tilt)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(BW, slopeLen, 0.012), matBody)
    tilt.add(panel)
    const c = document.createElement('canvas')
    c.width = 512; c.height = 320
    const ctx = c.getContext('2d')!
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshBasicMaterial({ map: tex })
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), mat)
    scr.position.set(0, -0.005, 0.017)
    tilt.add(scr)
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.215, 0.008), matDeep)
    bezel.position.set(0, -0.005, 0.012)
    tilt.add(bezel)
    screens[side] = { canvas: c, ctx, tex, mat, sig: '' }
  }

  // sluttningarna är massiva kilar (sidotrianglarna syns på .skp)
  for (const sx of [-1, 1]) {
    const tri = new THREE.Shape()
    tri.moveTo(sx * KIOSK_HALF, DECK_TOP)
    tri.lineTo(sx * SLOPE_X, DECK_TOP)
    tri.lineTo(sx * KIOSK_HALF, BOX_Y0)
    tri.closePath()
    const wedge = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: BW - 0.004, bevelEnabled: false }), matBody)
    wedge.position.z = -(BW - 0.004) / 2
    scene.add(wedge)
  }
  // infälld rektangulär ruta framför vardera sluttning (som .skp)
  box(0.11, 0.004, 0.36, matDeep, SLOPE_X + 0.075, DECK_TOP + 0.002, 0) // LABB, på vagnens skiva

  // ---------- FÄLT: utökad skiva (−X) med fingeravtryck ----------
  // Som .skp: en bred skiva som börjar vid sluttningens fot, går ut över vagnens
  // kortsida (~0,1 m utanför benen) och breder ut sig långt åt sidorna; ytterhörnen
  // avfasade (åttkant-känsla). Tjocklek 0,024. Mitten (för avtryck) = SLAB_CX.
  const SLAB_IN = -SLOPE_X // inre kant (vid sluttningens fot)
  const SLAB_OUTX = -(DECK_X / 2) - 0.1 // yttre kant
  const SLAB_HALFZ = DECK_Z / 2 + SLAB_OUT + 0.02 // ~0,5 m åt vardera sida
  const CH = 0.16 // avfasning ytterhörn
  const CHI = 0.07 // avfasning innerhörn
  const slabShape = new THREE.Shape()
  slabShape.moveTo(SLAB_IN, -SLAB_HALFZ + CHI)
  slabShape.lineTo(SLAB_IN - CHI, -SLAB_HALFZ)
  slabShape.lineTo(SLAB_OUTX + CH, -SLAB_HALFZ)
  slabShape.lineTo(SLAB_OUTX, -SLAB_HALFZ + CH)
  slabShape.lineTo(SLAB_OUTX, SLAB_HALFZ - CH)
  slabShape.lineTo(SLAB_OUTX + CH, SLAB_HALFZ)
  slabShape.lineTo(SLAB_IN - CHI, SLAB_HALFZ)
  slabShape.lineTo(SLAB_IN, SLAB_HALFZ - CHI)
  slabShape.closePath()
  const SLAB_Y = DECK_TOP + 0.012
  // shape ritas i (x, z) → lägg ner den: rotera −90° runt X (y→−z), spegla z
  const slabGeo = new THREE.ExtrudeGeometry(slabShape, { depth: 0.024, bevelEnabled: false })
  slabGeo.rotateX(Math.PI / 2)
  const slab = new THREE.Mesh(slabGeo, [matSlab, matCart])
  slab.position.y = SLAB_Y + 0.012
  scene.add(slab)
  const SLAB_CX = (SLAB_IN + SLAB_OUTX) / 2 - 0.03
  const SURF_Y = SLAB_Y + 0.013
  // infälld ruta på FÄLT-skivan framför sluttningen
  box(0.1, 0.004, 0.36, matDeep, SLAB_IN - 0.06, SURF_Y + 0.001, 0)

  // fingeravtryck: dekaler (räfflade ellipser) — svaga tills UV/skanning
  function printTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    g.strokeStyle = '#fff'
    g.lineWidth = 3
    for (let r = 8; r < 56; r += 7) {
      g.beginPath()
      g.ellipse(64, 66, r * 0.78, r, 0, Math.PI * 0.05, Math.PI * 1.95)
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  const printTex = printTexture()
  interface Print { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; pos: THREE.Vector3 }
  const PRINT_OFF: [number, number, number][] = [
    [0.0, 0.0, 0.3], [-0.06, 0.26, -0.5], [0.02, -0.3, 0.9], [-0.07, -0.16, 0.2], [0.03, 0.38, -0.2], [-0.05, -0.42, 0.6],
  ]
  const prints: Print[] = PRINT_OFF.map(([ox, oz, rot]) => {
    const mat = new THREE.MeshBasicMaterial({ map: printTex, transparent: true, opacity: 0.1, color: 0xffffff, depthWrite: false })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), mat)
    mesh.rotation.set(-Math.PI / 2, 0, rot)
    const pos = new THREE.Vector3(SLAB_CX + ox, SURF_Y + 0.001, oz)
    mesh.position.copy(pos)
    scene.add(mesh)
    return { mesh, mat, pos }
  })
  // Vilka avtryck som ringas in som "misstänkt" i lista-beaten (övriga dämpas).
  // Samarbetet utesluter sedan misstänkta en i taget tills EN återstår — anonymt.
  const SUSPECT = [true, false, true, false, true, false]
  const ELIM_ORDER = [0, 4] // faller bort i den här ordningen; 2 blir kvar (anonym)
  const rings = prints.map((p) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    const m = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.048, 32), mat)
    m.rotation.x = -Math.PI / 2
    m.position.copy(p.pos).setY(SURF_Y + 0.002)
    scene.add(m)
    return { m, mat }
  })
  // UV-svepets kalla violetta sken på ytan under pennan
  const matUv = new THREE.MeshBasicMaterial({ color: 0x8a6cff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const uvSpot = new THREE.Mesh(new THREE.CircleGeometry(0.07, 28), matUv)
  uvSpot.rotation.x = -Math.PI / 2
  scene.add(uvSpot)
  // skann-puls (expanderande ring) — bippet
  const matPulse = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 32), matPulse)
  pulseRing.rotation.x = -Math.PI / 2
  scene.add(pulseRing)

  // ---------- LABB: liten yta med hårprover (+X) ----------
  const LAB_X = SLOPE_X + 0.1 // mellan sluttningen och långsidan
  interface Hair { dish: THREE.Mesh; strand: THREE.Mesh; home: THREE.Vector3 }
  const hairs: Hair[] = []
  const matDish = new THREE.MeshStandardMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.35, roughness: 0.1 })
  const matStrand = M(0xffffff)
  for (let i = 0; i < 4; i++) {
    const home = new THREE.Vector3(LAB_X + (i % 2 ? 0.035 : -0.01), DECK_TOP + 0.008, -0.15 + i * 0.1)
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18), matDish)
    dish.position.copy(home)
    scene.add(dish)
    // hårstrå: tunn böjd tub
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.022, 0, 0), new THREE.Vector3(-0.006, 0, 0.01), new THREE.Vector3(0.008, 0, -0.008), new THREE.Vector3(0.022, 0, 0.004),
    ])
    const strand = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0022, 5, false), matStrand)
    strand.position.copy(home).setY(home.y + 0.007)
    strand.rotation.y = i * 0.9
    scene.add(strand)
    hairs.push({ dish, strand, home })
  }

  // ===================== GUBBAR (samma familj som stav/puls) =====================
  interface Fig {
    g: THREE.Group
    baseYaw: number
    /** rita: hR/hL = världsmål för höger/vänster hand (null = vila), w = hur mycket. */
    pose(o: { hR?: THREE.Vector3 | null; wR?: number; hL?: THREE.Vector3 | null; wL?: number; lean?: number; breath: number }): THREE.Vector3
    shoulderR(): THREE.Vector3
    /** vridning (rad) från grundriktningen — gäller tills den sätts igen */
    setTurn(t: number): void
  }
  function makeFig(x: number, z: number, yaw: number): Fig {
    const g = new THREE.Group()
    g.position.set(x, 0, z)
    g.rotation.y = yaw
    scene.add(g)
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material = matFig) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m }
    const cap = (r: number, L: number) => add(new THREE.CapsuleGeometry(r, L - 2 * r, 4, 10))
    const sph = (r: number) => add(new THREE.SphereGeometry(r, 12, 10))
    const p = {
      torso: cap(0.14, SPINE), head: sph(0.12),
      thighL: cap(0.055, THIGH), shinL: cap(0.05, SHIN), thighR: cap(0.055, THIGH), shinR: cap(0.05, SHIN),
      armL: add(new THREE.CylinderGeometry(0.038, 0.038, 1, 10)), armR: add(new THREE.CylinderGeometry(0.038, 0.038, 1, 10)),
      handL: sph(0.045), handR: sph(0.045), shL: sph(0.045), shR: sph(0.045),
      footL: add(new THREE.BoxGeometry(0.09, 0.05, 0.2), matFigDark), footR: add(new THREE.BoxGeometry(0.09, 0.05, 0.2), matFigDark),
    }
    // ben (statiska, stående) — lokal: vänd mot −z
    const hip = new THREE.Vector3(0, 0.97, 0)
    const ankL = new THREE.Vector3(-0.11, 0.08, 0), ankR = new THREE.Vector3(0.11, 0.08, 0)
    const hipL = hip.clone().setX(-0.1), hipR = hip.clone().setX(0.1)
    const kL = kneeOf(hipL, ankL), kR = kneeOf(hipR, ankR)
    place(p.thighL, hipL, kL); place(p.shinL, kL, ankL)
    place(p.thighR, hipR, kR); place(p.shinR, kR, ankR)
    p.footL.position.set(ankL.x, 0.025, ankL.z - 0.05)
    p.footR.position.set(ankR.x, 0.025, ankR.z - 0.05)
    const _hL = new THREE.Vector3(), _hR = new THREE.Vector3(), _t = new THREE.Vector3()
    let shRLocal = new THREE.Vector3()
    let turnNow = 0
    function pose(o: { hR?: THREE.Vector3 | null; wR?: number; hL?: THREE.Vector3 | null; wL?: number; lean?: number; breath: number }): THREE.Vector3 {
      g.rotation.y = yaw + turnNow
      g.updateMatrixWorld(true)
      const lean = o.lean ?? 0
      const spine = new THREE.Vector3(0, Math.cos(lean), -Math.sin(lean))
      const sh = hip.clone().addScaledVector(spine, SPINE + o.breath * 0.008)
      place(p.torso, hip, sh)
      p.head.position.copy(hip).addScaledVector(spine, SPINE + 0.2)
      const shL = sh.clone().add(new THREE.Vector3(-0.19, -0.04, 0))
      const shR = sh.clone().add(new THREE.Vector3(0.19, -0.04, 0))
      shRLocal = shR
      p.shL.position.copy(shL); p.shR.position.copy(shR)
      _hL.copy(shL).add(new THREE.Vector3(-0.03, -0.52, -0.06))
      _hR.copy(shR).add(new THREE.Vector3(0.03, -0.52, -0.06))
      if (o.hL && (o.wL ?? 1) > 0) _hL.lerp(g.worldToLocal(_t.copy(o.hL)), o.wL ?? 1)
      if (o.hR && (o.wR ?? 1) > 0) _hR.lerp(g.worldToLocal(_t.copy(o.hR)), o.wR ?? 1)
      // armen når max ~0,62 m — dra in handen om målet ligger längre bort
      for (const [s, h] of [[shL, _hL], [shR, _hR]] as const) {
        const v = h.clone().sub(s)
        if (v.length() > 0.62) h.copy(s).addScaledVector(v.normalize(), 0.62)
      }
      p.handL.position.copy(_hL); p.handR.position.copy(_hR)
      place(p.armL, shL, _hL, true); place(p.armR, shR, _hR, true)
      return g.localToWorld(_hR.clone())
    }
    return { g, baseYaw: yaw, pose, shoulderR: () => g.localToWorld(shRLocal.clone()), setTurn: (t: number) => { turnNow = t } }
  }
  // FÄLT (−X), vända mot +X (lokal −z → världs +x: yaw = −90°). Snett ställda så alla tre läses.
  const FY = -Math.PI / 2, LY = Math.PI / 2
  const falt = [
    makeFig(-0.8, 0.0, FY), // 0: UV-pennan
    makeFig(-0.76, 0.4, FY + 0.3), // 1: skannern
    makeFig(-0.76, -0.4, FY - 0.3), // 2: observatör
  ]
  const labb = [
    makeFig(0.78, 0.0, LY), // 0: mikroskopet
    makeFig(0.72, 0.48, LY - 0.45), // 1: observatör
    makeFig(0.72, -0.48, LY + 0.45), // 2: observatör
  ]
  const everyone = [...falt, ...labb]

  // ---------- verktyg (vit topp-glöd: emissive + liten PointLight) ----------
  interface Tool { g: THREE.Group; tip: THREE.MeshStandardMaterial; light: THREE.PointLight; len: number }
  function makePen(len: number, r: number): Tool {
    const g = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 10), matTool)
    body.position.y = len / 2
    g.add(body)
    const tip = matGlow.clone()
    const t = new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), tip)
    t.position.y = 0 // spetsen = gruppens origo (pekar mot ytan)
    g.add(t)
    const light = new THREE.PointLight(0xffffff, 0, 0.3, 2)
    g.add(light)
    scene.add(g)
    return { g, tip, light, len }
  }
  function makeScanner(): Tool {
    const g = new THREE.Group()
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.06), matTool)
    head.position.y = 0.03
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 8), matTool)
    grip.position.set(0, 0.1, 0.02)
    grip.rotation.x = 0.35
    g.add(head, grip)
    const tip = matGlow.clone()
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.006, 0.04), tip)
    win.position.y = 0.008
    g.add(win)
    const light = new THREE.PointLight(0xffffff, 0, 0.3, 2)
    g.add(light)
    scene.add(g)
    return { g, tip, light, len: 0.15 }
  }
  const uvPen = makePen(0.16, 0.012)
  const scanner = makeScanner()
  const microPen = makePen(0.17, 0.014)
  // skannerns ljusridå (streckkods-linje)
  const matBeam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), matBeam)
  scene.add(beam)

  /** Håll verktyget: spetsen vid `tip` (världen), riktat bort från axeln. Returnerar handens mål. */
  const _dir = new THREE.Vector3()
  function holdTool(tool: Tool, tip: THREE.Vector3, fig: Fig, glow: number): THREE.Vector3 {
    _dir.copy(fig.shoulderR()).sub(tip).normalize()
    tool.g.position.copy(tip)
    tool.g.quaternion.setFromUnitVectors(UP, _dir)
    tool.tip.emissiveIntensity = 0.25 + 1.6 * glow
    tool.light.intensity = 0.05 * glow
    return tip.clone().addScaledVector(_dir, tool.len * 0.8)
  }
  /** Verktyget i vila i handen (pekar nedåt-framåt). */
  function restTool(tool: Tool, hand: THREE.Vector3, fig: Fig): void {
    // hänger i handen, spetsen nedåt-framåt (framåt = figurens −z)
    const fwd = new THREE.Vector3(-Math.sin(fig.g.rotation.y), 0, -Math.cos(fig.g.rotation.y))
    _dir.set(0, 1, 0).addScaledVector(fwd, -0.35).normalize() // spets → hand
    tool.g.position.copy(hand).addScaledVector(_dir, -tool.len * 0.8)
    tool.g.quaternion.setFromUnitVectors(UP, _dir)
    tool.tip.emissiveIntensity = 0.2
    tool.light.intensity = 0
  }

  // ---------- pratbubblor (samarbete) ----------
  function bubbleTex(): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = 256; c.height = 192
    const g = c.getContext('2d')!
    g.fillStyle = '#fff'
    g.beginPath()
    g.roundRect(12, 12, 232, 124, 40)
    g.fill()
    g.beginPath()
    g.moveTo(80, 130); g.lineTo(60, 182); g.lineTo(122, 132); g.fill()
    g.fillStyle = '#000'
    for (const x of [88, 128, 168]) { g.beginPath(); g.arc(x, 74, 13, 0, Math.PI * 2); g.fill() }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  const bTex = bubbleTex()
  const bubbles = [falt[0], labb[0], falt[1], labb[2]].map((fig) => {
    const mat = new THREE.SpriteMaterial({ map: bTex, color: 0xffa040, transparent: true, opacity: 0, depthWrite: false })
    const s = new THREE.Sprite(mat)
    s.scale.set(0.28, 0.21, 1)
    scene.add(s)
    return { s, mat, fig }
  })

  // ---------- skärmarna (canvas-texturer) ----------
  interface ScreenState { on: number; rows?: number; marks?: string; scan?: number; human?: number; animal?: number }
  function drawScreen(side: 'falt' | 'labb', state: ScreenState): void {
    const S = screens[side]
    const sig = JSON.stringify(state) + accent.getHexString()
    if (sig === S.sig) return
    S.sig = sig
    const g = S.ctx
    const a = '#' + accent.getHexString()
    const on = 0.35 + 0.65 * state.on
    g.globalAlpha = 1
    g.fillStyle = '#050a08'
    g.fillRect(0, 0, 512, 320)
    g.globalAlpha = on
    g.strokeStyle = a; g.lineWidth = 4
    g.strokeRect(10, 10, 492, 300)
    g.fillStyle = a
    g.font = 'bold 34px ui-monospace, Menlo, monospace'
    g.fillText(side === 'falt' ? 'FÄLT · AVTRYCK' : 'LABB · HÅRPROVER', 30, 58)
    if (side === 'falt') {
      // en rad per avtryck: ✓ = misstänkt (ljus), – = icke misstänkt (dämpad). Inget facit.
      const n = state.rows ?? 0
      const marks = state.marks ?? ''
      for (let i = 0; i < 6; i++) {
        const m = marks[i] ?? ' '
        g.globalAlpha = (i < n ? (m === '-' ? 0.35 : 1) : 0.15) * on
        g.fillRect(30, 80 + i * 36, 300, 20)
        g.font = 'bold 26px ui-monospace, Menlo, monospace'
        if (i < n && m === 'x') g.fillText('✓', 350, 99 + i * 36)
        if (i < n && m === '-') g.fillText('–', 350, 99 + i * 36)
      }
      if (state.scan !== undefined && state.scan >= 0) {
        g.globalAlpha = 0.9 * on
        g.fillRect(20, 76 + state.scan * 220, 472, 3) // aktiv scanlinje
      }
    } else {
      const labels = ['MÄNNISKA', 'DJUR', 'FIBER']
      const fill = [state.human ?? 0, state.animal ?? 0, 0]
      for (let i = 0; i < 3; i++) {
        const lit = fill[i]
        g.globalAlpha = (lit ? 1 : 0.35) * on
        g.lineWidth = i === 0 && lit ? 8 : lit ? 5 : 3
        g.strokeRect(30 + i * 158, 100, 140, 150)
        if (lit) {
          g.globalAlpha = (i === 0 ? 0.55 : 0.3) * on
          g.fillRect(30 + i * 158, 100, 140, 150)
          g.globalAlpha = on
        }
        g.font = 'bold 22px ui-monospace, Menlo, monospace'
        g.fillText(labels[i], 42 + i * 158, 285)
      }
    }
    g.globalAlpha = 1
    S.tex.needsUpdate = true
  }

  // ===================== KAMERA (deterministisk ur beat + progress) =====================
  const beatIdx: Record<string, number> = {}
  FILM.forEach((b, i) => { beatIdx[b.id] = i })
  const _cp = new THREE.Vector3(), _ct = new THREE.Vector3()
  function frameFor(id: string): Frame { return FRAMES[BEAT_FRAME[id] ?? 'overview'] }
  function cameraAt(beatId: string, progress: number, elapsed: number): void {
    const i = beatIdx[beatId] ?? 0
    const beat = FILM[i]
    const cur = frameFor(beatId)
    const prev = i > 0 ? frameFor(FILM[i - 1].id) : cur
    const secs = progress * beat.dur
    const u = smooth(secs / Math.min(CAM_EASE_S, beat.dur * 0.6))
    _cp.copy(prev.pos).lerp(cur.pos, u)
    _ct.copy(prev.tgt).lerp(cur.tgt, u)
    let fov = prev.fov + (cur.fov - prev.fov) * u
    // panoreringen till labbet går OVER stationen (inte genom den)
    if (beatId === 'panlabb') {
      const pu = smooth(clamp01(secs / (beat.dur * 0.85)))
      const a = frameFor('lista'), b = cur, o = FRAMES.over
      const q = 1 - pu
      _cp.set(0, 0, 0).addScaledVector(a.pos, q * q).addScaledVector(o.pos, 2 * q * pu).addScaledVector(b.pos, pu * pu)
      _ct.set(0, 0, 0).addScaledVector(a.tgt, q * q).addScaledVector(o.tgt, 2 * q * pu).addScaledVector(b.tgt, pu * pu)
      fov = a.fov + (b.fov - a.fov) * pu + 4 * Math.sin(pu * Math.PI)
    }
    // långsam drift inom beaten + andning (kameran står aldrig helt still)
    const drift = (progress - 0.5) * 0.06
    _cp.x += drift * Math.sign(_cp.x || 1) * -0.5
    _cp.y += Math.sin(elapsed * 0.5) * 0.01
    camera.position.copy(_cp)
    camera.lookAt(_ct)
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix() }
    // Beats med spelarskärmen (FilmScreen) i övre halvan: flytta ner 3D-bilden så
    // gubben som jobbar syns under rutan. Glider in/ut på samma sätt som kameran.
    const SHOW = (id: string) => id === 'skanna' || id === 'markera' || id === 'sortera'
    const prevId = i > 0 ? FILM[i - 1].id : beatId
    const nextId = i < FILM.length - 1 ? FILM[i + 1].id : beatId
    let shift = SHOW(beatId) ? 1 : 0
    if (SHOW(beatId) && !SHOW(prevId)) shift = smooth(secs / 0.8)
    if (SHOW(beatId) && !SHOW(nextId)) shift *= 1 - smooth((secs - (beat.dur - 0.8)) / 0.8)
    setShift(shift * 0.22)
  }
  let shiftNow = -1
  function setShift(f: number): void {
    if (Math.abs(f - shiftNow) < 1e-4) return
    shiftNow = f
    const w = viewW, h = viewH
    if (f <= 0) camera.clearViewOffset()
    else camera.setViewOffset(w, h, 0, -h * f, w, h)
  }

  // ===================== HANDLING per beat =====================
  const _v = new THREE.Vector3(), _w = new THREE.Vector3()
  const SCREEN_F = new THREE.Vector3(-(KIOSK_HALF + SLOPE_X) / 2 - 0.03, (DECK_TOP + BOX_Y0) / 2 + 0.02, 0)
  const SCREEN_L = new THREE.Vector3((KIOSK_HALF + SLOPE_X) / 2 + 0.03, (DECK_TOP + BOX_Y0) / 2 + 0.02, 0)

  function render(elapsed: number, beatId: string, progress: number): void {
    const b = beatIdx[beatId] ?? 0
    const after = (id: string) => b > (beatIdx[id] ?? 99)
    const at = (id: string) => beatId === id
    const br = (i: number) => Math.sin(elapsed * 1.3 + i * 1.7)

    // --- avtryck: synlighet / tänd / misstänkt ---
    // avtryck 0: tänds av UV, skannas, markeras. Lista: avtryck 1..5 processas i följd.
    const LIST_END = 0.85
    let listN = 0 // antal processade avtryck
    if (at('lista')) listN = 1 + Math.floor(clamp01(progress / LIST_END) * 5 + 1e-6)
    else if (after('lista')) listN = 6
    else if (after('skanna') || (at('skanna') && progress > 0.55)) listN = 1
    listN = Math.min(6, listN)
    // uteslutning i samarbetet: hur många av ELIM_ORDER som fallit bort
    const elimK = at('samarbete') ? (progress > 0.62 ? 2 : progress > 0.36 ? 1 : 0) : after('samarbete') ? 2 : 0
    const eliminated = (i: number) => ELIM_ORDER.slice(0, elimK).includes(i)
    const elimFade = (i: number) => {
      const k = ELIM_ORDER.indexOf(i)
      if (k < 0 || !at('samarbete')) return eliminated(i) ? 0 : 1
      const t0 = k === 0 ? 0.3 : 0.56
      return 1 - ramp(progress, t0, t0 + 0.08)
    }
    prints.forEach((p, i) => {
      let lit = 0
      if (i === 0) {
        if (at('uv')) lit = ramp(progress, 0.42, 0.55)
        else if (after('uv')) lit = 1
      } else if (i < listN) lit = 1
      else if (at('lista') && i === listN) lit = 0.5
      // icke misstänkta dämpas när de processats; uteslutna dämpas i samarbetet
      const processed = i < listN && (after('markera') || i === 0)
      if (processed && !SUSPECT[i] && (at('lista') || after('lista'))) lit *= 0.35
      if (SUSPECT[i] && (at('samarbete') || after('samarbete'))) lit *= 0.35 + 0.65 * elimFade(i)
      const finale = at('slut') ? 0.25 * (0.5 + 0.5 * Math.sin(elapsed * 3 + i)) : 0
      p.mat.opacity = 0.1 + 0.8 * lit + finale
      p.mat.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.35 + 0.3 * lit)
    })
    // ringar: avtryck 0 ringas i markera; övriga misstänkta när de processas i lista
    rings.forEach((r, i) => {
      let o = 0
      if (i === 0) o = at('markera') ? ramp(progress, 0.55, 0.7) : after('markera') ? 0.85 : 0
      else if (SUSPECT[i] && i < listN && (at('lista') || after('lista'))) o = 0.85
      if (SUSPECT[i]) o *= elimFade(i)
      // den kvarvarande (anonyma) markören pulsar svagt i samarbete/slut
      const survivor = SUSPECT[i] && !ELIM_ORDER.includes(i)
      if (survivor && (at('samarbete') && progress > 0.7 || at('slut'))) o = 0.75 + 0.25 * Math.sin(elapsed * 4)
      r.mat.opacity = o
      r.mat.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.2)
    })

    // --- fokuspunkt för observatörerna (blick + lätt lutning, läsande — inte pekande) ---
    const uvPt = (pr: number) => {
      const s2 = clamp01((pr - 0.12) / 0.75)
      return new THREE.Vector3(SLAB_CX + 0.02 + Math.sin(s2 * Math.PI * 2) * 0.06, SURF_Y, THREE.MathUtils.lerp(0.14, -0.14, s2))
    }
    let focusTeam: 'falt' | 'labb' | null = null
    let focus: THREE.Vector3 | null = null
    if (at('forensik')) { focusTeam = 'falt'; focus = new THREE.Vector3(SLAB_CX, SURF_Y, 0) }
    else if (at('uv')) { focusTeam = 'falt'; focus = uvPt(progress) }
    else if (at('skanna')) { focusTeam = 'falt'; focus = prints[0].pos }
    else if (at('markera')) { focusTeam = 'falt'; focus = SCREEN_F }
    else if (at('lista')) { focusTeam = 'falt'; focus = prints[Math.min(5, Math.max(1, listN))].pos }
    else if (at('panlabb') || at('sortera')) { focusTeam = 'labb'; focus = hairs[at('sortera') && progress > 0.55 ? 3 : 1].home }
    const actor = (f: Fig) =>
      (f === falt[0] && (at('uv') || at('markera'))) || (f === falt[1] && (at('skanna') || at('lista'))) || (f === labb[0] && at('sortera'))

    // --- gubbarna: vila + andning; samarbete = alla vänder sig mot porthålet ---
    const turnK = at('samarbete') ? ramp(progress, 0.0, 0.18) : at('slut') ? 1 - ramp(progress, 0, 0.5) : 0
    const secsIn = progress * (FILM[b]?.dur ?? 1)
    const obsK = smooth(secsIn / 1.2) // blicken glider in i början av beaten
    everyone.forEach((f, i) => {
      const toward = (pt: { x: number; z: number }) => {
        let dy = Math.atan2(-(pt.x - f.g.position.x), -(pt.z - f.g.position.z)) - f.baseYaw
        return Math.atan2(Math.sin(dy), Math.cos(dy))
      }
      const team = falt.includes(f) ? 'falt' : 'labb'
      let turn = toward({ x: 0, z: 0 }) * turnK
      let lean = 0
      if (turnK === 0 && focus && focusTeam === team && !actor(f)) {
        turn = THREE.MathUtils.clamp(toward(focus), -0.6, 0.6) * 0.7 * obsK
        lean = 0.14 * obsK
      }
      f.setTurn(turn)
      f.pose({ breath: br(i), lean })
    })

    // --- UV-pennan (FÄLT 0) ---
    const uvF = falt[0]
    if (at('uv')) {
      // svep i ett S över skivan; passerar avtryck 0 kring progress ~0.5
      const s = clamp01((progress - 0.12) / 0.75)
      const z = THREE.MathUtils.lerp(0.14, -0.14, s)
      const x = SLAB_CX + 0.02 + Math.sin(s * Math.PI * 2) * 0.06
      _v.set(x, SURF_Y + 0.05, z)
      const reach = ramp(progress, 0, 0.12) * (1 - ramp(progress, 0.92, 1))
      const tip = _w.copy(uvF.pose({ breath: br(0), lean: 0.25 * reach })).lerp(_v, reach)
      const hand = holdTool(uvPen, tip, uvF, reach)
      uvF.pose({ breath: br(0), hR: hand, wR: reach, lean: 0.25 * reach })
      uvSpot.position.set(tip.x, SURF_Y + 0.003, tip.z)
      matUv.opacity = 0.45 * reach * (0.85 + 0.15 * Math.sin(elapsed * 7))
    } else {
      matUv.opacity = 0
      restTool(uvPen, uvF.pose({ breath: br(0) }), uvF)
    }

    // --- skannern (FÄLT 1) ---
    const scF = falt[1]
    let scanTarget: THREE.Vector3 | null = null
    let scanReach = 0
    if (at('skanna')) {
      scanTarget = prints[0].pos
      scanReach = ramp(progress, 0.05, 0.25) * (1 - ramp(progress, 0.85, 1))
    } else if (at('lista')) {
      scanTarget = prints[Math.min(5, Math.max(1, listN))].pos
      scanReach = ramp(progress, 0.02, 0.1) * (1 - ramp(progress, 0.9, 1))
    }
    if (scanTarget && scanReach > 0) {
      const hover = 0.03 + 0.012 * Math.sin(elapsed * 9)
      _v.copy(scanTarget).setY(SURF_Y + hover)
      const rest = scF.pose({ breath: br(1) })
      const tip = _w.copy(rest).lerp(_v, scanReach)
      const hand = holdTool(scanner, tip, scF, scanReach)
      scF.pose({ breath: br(1), hR: hand, wR: scanReach, lean: 0.3 * scanReach })
      matBeam.opacity = 0.55 * scanReach * (0.6 + 0.4 * Math.sin(elapsed * 20))
      beam.position.copy(tip).add(new THREE.Vector3(0, -0.012, 0))
      beam.quaternion.copy(scanner.g.quaternion)
      beam.rotateX(Math.PI / 2)
    } else {
      matBeam.opacity = 0
      restTool(scanner, scF.pose({ breath: br(1) }), scF)
    }
    // bipp-puls på avtrycket som just skannats
    let pulseAt = -1
    if (at('skanna')) pulseAt = (progress - 0.55) * 8 / 1.0
    if (at('lista') && progress < LIST_END) pulseAt = ((progress / LIST_END) * 5 % 1) * 2.5
    if (pulseAt >= 0 && pulseAt <= 1) {
      const target = at('skanna') ? prints[0] : prints[Math.min(5, Math.max(1, listN - 1))]
      pulseRing.position.copy(target.pos).setY(SURF_Y + 0.003)
      pulseRing.scale.setScalar(1 + pulseAt * 2.5)
      matPulse.opacity = 0.9 * (1 - pulseAt)
      matPulse.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.5)
    } else matPulse.opacity = 0

    // markera: UV-gubben pekar mot skärmen när loggen läses
    if (at('markera')) {
      const k = ramp(progress, 0.15, 0.3) * (1 - ramp(progress, 0.85, 1))
      uvF.pose({ breath: br(0), hL: SCREEN_F, wL: k * 0.75, lean: 0.12 * k })
    }

    // --- mikroskopet (LABB 0) + hårprov som lyfts ---
    const miF = labb[0]
    hairs.forEach((h) => { h.strand.position.copy(h.home).setY(h.home.y + 0.007) })
    if (at('sortera')) {
      // två prover sorteras synligt: prov 1 → Människohår (0.1–0.5), prov 3 → Djurhår (0.52–0.92)
      const firstHalf = progress < 0.51
      const pick = hairs[firstHalf ? 1 : 3]
      const u = firstHalf ? progress / 0.5 : (progress - 0.52) / 0.43 // samma lokala tid som FilmScreen
      const reach = ramp(u, 0.0, 0.25) * (1 - ramp(u, 0.92, 1))
      const lift = ramp(u, 0.25, 0.45) * (1 - ramp(u, 0.75, 0.9))
      pick.strand.position.copy(pick.home).setY(pick.home.y + 0.007 + 0.06 * lift + 0.004 * Math.sin(elapsed * 4))
      _v.copy(pick.home).setY(pick.home.y + 0.08 + 0.06 * lift)
      const rest = miF.pose({ breath: br(3) })
      const tip = _w.copy(rest).lerp(_v, reach)
      const hand = holdTool(microPen, tip, miF, reach)
      // andra handen drar provet till rätt korg på skärmen
      const drag = ramp(u, 0.5, 0.58) * (1 - ramp(u, 0.9, 0.96)) // i takt med fingret i FilmScreen (0.56–0.9)
      miF.pose({ breath: br(3), hR: hand, wR: reach, hL: SCREEN_L, wL: drag * 0.7, lean: 0.3 * reach })
    } else {
      restTool(microPen, miF.pose({ breath: br(3) }), miF)
    }

    // --- samarbete: pratbubblor turas om + gester ---
    bubbles.forEach((bb, i) => {
      let o = 0
      if (at('samarbete')) {
        const phase = (progress * 6 - i * 0.5) % 2
        o = ramp(progress, 0.12, 0.2) * (phase < 1 ? Math.sin(Math.PI * clamp01(phase)) : 0)
      }
      bb.mat.opacity = o
      bb.mat.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.25)
      const head = bb.fig.g.localToWorld(new THREE.Vector3(0, 1.98, 0))
      bb.s.position.copy(head).add(new THREE.Vector3(0, 0.04 * o, 0))
    })
    if (at('samarbete')) {
      // talaren gestikulerar lite mot porthålet
      for (const [fig, phaseOff] of [[falt[0], 0], [labb[0], 1]] as const) {
        const ph = (progress * 6 - phaseOff * 0.5) % 2
        const talk = ph < 1 ? Math.sin(Math.PI * ph) : 0
        if (talk > 0.05) {
          _v.set(0, PORT_Y - 0.05, 0)
          fig.pose({ breath: br(0), hL: _v, wL: 0.45 * talk })
        }
      }
    }

    // --- porthålet + skärmar ---
    const glowPort = at('samarbete') ? 0.35 + 0.25 * Math.sin(elapsed * 4) : at('slut') ? 0.7 : 0
    matPortGlow.opacity = glowPort
    matPortGlow.color.copy(accent)
    const faltOn = after('forensik') ? 1 : 0.25
    // FÄLT-skärmens rader: x = misstänkt, - = icke; uteslutna i samarbetet blir '-'
    let marks = ''
    for (let i = 0; i < 6; i++) marks += SUSPECT[i] && !eliminated(i) ? 'x' : '-'
    if (!after('markera') && !(at('markera') && progress > 0.6)) marks = ' ' + marks.slice(1)
    drawScreen('falt', {
      on: at('slut') ? 1 : faltOn,
      rows: listN,
      marks,
      scan: at('skanna') && progress > 0.2 && progress < 0.85 ? Math.round(((progress * 3) % 1) * 20) / 20 : -1,
    })
    drawScreen('labb', {
      on: at('sortera') || after('sortera') ? 1 : 0.3,
      human: (at('sortera') && progress > 0.4) || after('sortera') ? 1 : 0,
      animal: (at('sortera') && progress > 0.85) || after('sortera') ? 1 : 0,
    })
    // finalen: hela stationen lyser upp
    const fin = at('slut') ? ramp(progress, 0, 0.5) : 0
    ;(floor.material as THREE.MeshBasicMaterial).opacity = 0.07 + 0.12 * fin
    matCart.emissive.copy(accent).multiplyScalar(0.12 * fin)
    matBody.emissive.copy(accent).multiplyScalar(0.1 * fin)

    cameraAt(beatId, progress, elapsed)
    renderer.render(scene, camera)
  }

  return {
    render,
    resize(w, h) {
      if (w < 1 || h < 1) return
      renderer.setSize(w, h, false)
      viewW = w; viewH = h
      camera.aspect = w / h
      shiftNow = -1
      camera.updateProjectionMatrix()
    },
    setAccent(css) {
      accent.set(css)
      for (const [m, k] of accentMats) m.color.copy(accent).multiplyScalar(k)
      ;(floor.material as THREE.MeshBasicMaterial).color.copy(accent)
      matStrand.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.5)
      screens.falt.sig = ''
      screens.labb.sig = ''
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose()
      })
      printTex.dispose()
      bTex.dispose()
      for (const s of Object.values(screens)) s.tex.dispose()
      renderer.dispose()
    },
  }
}

