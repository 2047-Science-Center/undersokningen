/**
 * INTROFILM-SCEN (Three.js) — "Stölden i valvet": stationen med två lag som går igenom
 * STEGFLÖDET, plats för plats. Byggd av 3JS-tråden efter docs/bestallning-introfilm-3js.md
 * + docs/bestallning-introfilm-3js-stegflode.md (8 beats + 'moment'-läget).
 *
 * Samma figur-familj, ljus och kamerakänsla som Reaktorkärnans stavScene.ts / pulsScene.ts:
 * capsule-torso/ben, sfär-huvud, cylinder-armar, flatShading, monokromt i accentfärgen.
 * Föremålen på platserna har spelets egna färger (components/platser/platser.css): polaroid,
 * papper, röd penna/stämpel, mässingskapsel, kork, nålar i sidfärgerna.
 *
 * SKALA = meter. Vagnen (Förhandlingens vagn utan mellanvägg): höjd 0,90 · 0,46 (Z) ·
 * 0,90 (X) mellan lagen · FÄLT-sidans åttkantiga skiva buktar ut (−X). Central kiosk med
 * genomsiktligt porthål (längs X) — rörpostens väg mellan sidorna.
 *
 * FÄLT-skivan (−X), längs Z:  brottsplatsen (avtryck z 0,12–0,46 + påsställ 3×3 z −0,1–0,08)
 *                             · utredningsbordet (papper, polaroider, rörpost z −0,46–−0,15)
 * LABB-ytan (+X), längs Z:    mikroskopbordet (mikroskop + 6 provglas + 3 burkar)
 *                             · ljusbordet · rörpostens korg
 *
 * API:
 *   createIntroScene(canvas, { lage: 'film' | 'moment' } = { lage: 'film' })
 *   render(elapsed, beatId, progress) — beatId + progress är ENDA sanningen för handlingen;
 *     elapsed bara för andning/puls. 'film': en gång i takt med rösten (kameran glider mellan
 *     beatsens inramningar). 'moment': närbild på EN plats, progress 0→1 loopar sömlöst.
 */
import * as THREE from 'three'
import { FILM } from './introFilm'

const UP = new THREE.Vector3(0, 1, 0)
const FWD = new THREE.Vector3(0, 0, -1)
const THIGH = 0.45
const SHIN = 0.45
const SPINE = 0.52

// --- riktiga mått (meter) ---
const DECK_X = 0.9
const DECK_Z = 0.46
const DECK_TOP = 0.9
const SLAB_OUT = 0.25

// --- spelets färger (platser.css) ---
const C_POLAROID = '#f3eee2'
const C_PAPER = '#efe9da'
const C_RED = 0xd0241b
const C_BRASS = 0xc9a24b
const C_CORK = 0xb78a55
const C_PIN_A = 0xfff1d6 // labbet (sida A)
const C_PIN_B = 0xff3cc8 // fältet (sida B)

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t) }
const ramp = (x: number, a: number, b: number) => smooth((x - a) / (b - a))
/** 0 → 1 → 0 inom [a, d] (upp a–b, ned c–d). */
const hold = (x: number, a: number, b: number, c: number, d: number) => ramp(x, a, b) * (1 - ramp(x, c, d))
/** Stämpelns slag: 0 före, ~1 vid t, kort överslag (stämpeln "landar"). */
const slam = (x: number, t: number) => (x < t - 0.001 ? 0 : 1 + 0.35 * Math.exp(-(x - t) * 60) * Math.cos((x - t) * 90))
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

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
/** Båge mellan a och b (lyft `h` mitt på). */
function arc(a: THREE.Vector3, b: THREE.Vector3, u: number, h: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(a).lerp(b, u).setY(a.y + (b.y - a.y) * u + h * Math.sin(Math.PI * clamp01(u)))
}

export type IntroLage = 'film' | 'moment'
export type BeatId = 'open' | 'brottsplats' | 'utredning' | 'mikroskop' | 'ljusbord' | 'rorpost' | 'tavlan' | 'slut'
/** Momenten (Del 2): samma beats, sedda nära och i loop. */
export const MOMENT: readonly BeatId[] = ['brottsplats', 'utredning', 'mikroskop', 'ljusbord', 'rorpost', 'tavlan']

/* ------------------------------------------------------------------ *
 * Kamera-inramningar. Film: snett uppifrån från ett framhörn / över kiosken.
 * Moment: nära, på platsens föremål (bara aktören syns).
 * ------------------------------------------------------------------ */
interface Frame { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number }
const F = (p: [number, number, number], t: [number, number, number], fov = 36): Frame =>
  ({ pos: new THREE.Vector3(...p), tgt: new THREE.Vector3(...t), fov })
const FILM_FRAME: Record<BeatId, Frame> = {
  open: F([2.5, 4.3, 3.3], [-0.05, 0.8, 0], 34),
  brottsplats: F([-0.25, 3.9, -1.55], [-0.43, 0.93, 0.12], 12),
  utredning: F([-0.3, 3.6, -1.95], [-0.27, 1.08, -0.18], 15),
  mikroskop: F([0.45, 3.6, 1.6], [0.36, 0.96, -0.12], 11),
  ljusbord: F([0.45, 3.6, 1.85], [0.37, 0.93, -0.01], 9),
  rorpost: F([0.35, 2.7, 2.1], [0.25, 1.1, 0.04], 17),
  tavlan: F([0.3, 2.25, 2.1], [0, 1.58, 0], 24),
  slut: F([0.3, 2.25, 2.1], [0, 1.6, 0], 22),
}
const MOMENT_FRAME: Record<BeatId, Frame> = {
  open: FILM_FRAME.open,
  brottsplats: F([-0.02, 1.7, 0.62], [-0.44, 0.93, 0.16], 40),
  utredning: F([-0.02, 1.85, -1.0], [-0.33, 1.02, -0.22], 40),
  mikroskop: F([0.4, 1.85, 0.72], [0.36, 0.96, -0.13], 24),
  ljusbord: F([0.38, 1.8, 0.5], [0.38, 0.93, -0.01], 20),
  rorpost: F([0.75, 1.7, 0.85], [0.27, 1.08, 0.07], 32),
  tavlan: F([0.35, 1.95, 1.25], [0, 1.62, 0], 34),
  slut: FILM_FRAME.slut,
}
/** Mellanläge när filmen panorerar från fältet till labbet (över stationen, inte genom den). */
const OVER = F([0.2, 4.6, 2.2], [0, 0.95, 0], 34)
/** Hur länge (s) kameran glider in i en ny beats inramning. */
const CAM_EASE_S = 2.0

export interface IntroScene {
  render(elapsed: number, beatId: string, progress: number): void
  resize(w: number, h: number): void
  setAccent(css: string): void
  dispose(): void
}

export function createIntroScene(canvas: HTMLCanvasElement, opts: { lage?: IntroLage } = {}): IntroScene {
  const MOM = opts.lage === 'moment'
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.03, 40)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x303030, 1.2))
  const key = new THREE.DirectionalLight(0xffffff, 1.5)
  key.position.set(1.5, 3.5, 3)
  scene.add(key)

  // ---------- material: monokromt i accentfärgen ----------
  const accent = new THREE.Color(0xffa040)
  const M = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const matFig = M(0xffa040)
  const matFigDark = M(0x5a3410)
  const matCart = M(0x7a4a18)
  const matBody = M(0x4a2e10)
  const matDeep = M(0x24160a, { side: THREE.DoubleSide })
  const matSlab = M(0x1a1008, { roughness: 0.6 })
  const matTool = M(0x3a2410, { roughness: 0.5 })
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.3 })
  const matGlass = new THREE.MeshStandardMaterial({ color: 0xbfd0ff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide })
  const accentMats: [THREE.MeshStandardMaterial, number][] = [
    [matFig, 1], [matFigDark, 0.35], [matCart, 0.5], [matBody, 0.3], [matDeep, 0.14], [matTool, 0.22], [matSlab, 0.24],
  ]
  // föremålens egna färger
  const matBrass = M(C_BRASS, { roughness: 0.35, metalness: 0.55 })
  const matRed = M(C_RED, { roughness: 0.5 })
  const matCork = M(C_CORK, { roughness: 0.95 })
  const matWire = M(0x9a9a9a, { roughness: 0.4, metalness: 0.4 })
  const matPinA = M(C_PIN_A, { emissive: C_PIN_A, emissiveIntensity: 0.25, roughness: 0.3 })
  const matPinB = M(C_PIN_B, { emissive: C_PIN_B, emissiveIntensity: 0.25, roughness: 0.3 })
  const matNeedle = M(0xcccccc, { metalness: 0.6, roughness: 0.3 })

  const floor = new THREE.Mesh(new THREE.RingGeometry(0, 2.1, 64), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.07 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.001
  scene.add(floor)

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }
  const textures: THREE.Texture[] = []
  function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    draw(c.getContext('2d')!)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    textures.push(t)
    return t
  }
  /** Platt plan som ligger på en yta (normal +Y). */
  function flat(w: number, d: number, mat: THREE.Material, parent: THREE.Object3D = scene): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
    m.rotation.x = -Math.PI / 2
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
  box(DECK_X, 0.03, DECK_Z, matCart, 0, DECK_TOP - 0.015, 0)
  box(DECK_X - 0.02, 0.02, DECK_Z - 0.02, matCart, 0, 0.56, 0)
  box(DECK_X - 0.02, 0.02, DECK_Z - 0.02, matCart, 0, 0.2, 0)
  box(0.5, 0.33, 0.3, matDeep, 0.02, 0.375, 0)
  {
    // hörlurar på långsidan (som .skp)
    const g = new THREE.Group()
    g.position.set(0.05, 0.47, DECK_Z / 2 + 0.03)
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 8, 20, Math.PI), matDeep))
    for (const cx of [-0.075, 0.075]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14), matDeep)
      cup.rotation.x = Math.PI / 2
      cup.position.set(cx, -0.015, 0)
      g.add(cup)
    }
    scene.add(g)
  }

  // ---------- central KIOSK med porthål ----------
  const KIOSK_HALF = 0.1
  const SLOPE_X = 0.27
  const BOX_Y0 = 1.16, BOX_Y1 = 1.5
  const PORT_Y = 1.33
  const PORT_R = 0.085
  const BW = DECK_Z + 0.04
  const bx = 2 * KIOSK_HALF
  box(bx, PORT_Y - PORT_R - BOX_Y0, BW, matBody, 0, (BOX_Y0 + PORT_Y - PORT_R) / 2, 0)
  box(bx, BOX_Y1 - (PORT_Y + PORT_R), BW, matBody, 0, (PORT_Y + PORT_R + BOX_Y1) / 2, 0)
  for (const sz of [-1, 1]) {
    const w = BW / 2 - PORT_R
    box(bx, 2 * PORT_R, w, matBody, 0, PORT_Y, sz * (PORT_R + w / 2))
  }
  const portTube = new THREE.Mesh(new THREE.CylinderGeometry(PORT_R, PORT_R, bx, 28, 1, true), matDeep)
  portTube.rotation.z = Math.PI / 2
  portTube.position.y = PORT_Y
  scene.add(portTube)
  for (const sx of [-1, 1]) {
    // mässingsring runt porthålet på vardera sida = rörpostens mynning
    const ring = new THREE.Mesh(new THREE.TorusGeometry(PORT_R + 0.008, 0.012, 10, 32), matBrass)
    ring.rotation.y = Math.PI / 2
    ring.position.set(sx * (KIOSK_HALF + 0.002), PORT_Y, 0)
    scene.add(ring)
  }
  const portGlass = new THREE.Mesh(new THREE.CircleGeometry(PORT_R, 28), matGlass)
  portGlass.rotation.y = Math.PI / 2
  portGlass.position.y = PORT_Y
  scene.add(portGlass)
  const matPortGlow = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  for (const sx of [-1, 1]) {
    const pg = new THREE.Mesh(new THREE.RingGeometry(PORT_R - 0.004, PORT_R + 0.03, 32), matPortGlow)
    pg.rotation.y = Math.PI / 2
    pg.position.set(sx * (KIOSK_HALF + 0.004), PORT_Y, 0)
    scene.add(pg)
  }

  // sluttningar + skärmar
  const slopeLen = Math.hypot(SLOPE_X - KIOSK_HALF, BOX_Y0 - DECK_TOP)
  const slopeAng = Math.atan2(BOX_Y0 - DECK_TOP, SLOPE_X - KIOSK_HALF)
  interface Screen { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; sig: string }
  const screens = {} as Record<'falt' | 'labb', Screen>
  for (const side of ['falt', 'labb'] as const) {
    const sx = side === 'falt' ? -1 : 1
    const g = new THREE.Group()
    g.position.set(sx * (KIOSK_HALF + SLOPE_X) / 2, (DECK_TOP + BOX_Y0) / 2, 0)
    g.rotation.set(0, sx === -1 ? -Math.PI / 2 : Math.PI / 2, 0)
    scene.add(g)
    const tilt = new THREE.Group()
    tilt.rotation.x = -(Math.PI / 2 - slopeAng)
    g.add(tilt)
    tilt.add(new THREE.Mesh(new THREE.BoxGeometry(BW, slopeLen, 0.012), matBody))
    let ctx!: CanvasRenderingContext2D
    const tex = canvasTex(512, 320, (g2) => { ctx = g2 })
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshBasicMaterial({ map: tex }))
    scr.position.set(0, -0.005, 0.017)
    tilt.add(scr)
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.215, 0.008), matDeep)
    bezel.position.set(0, -0.005, 0.012)
    tilt.add(bezel)
    screens[side] = { ctx, tex, sig: '' }
  }
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

  // ---------- FÄLT: utökad skiva (−X) ----------
  const SLAB_IN = -SLOPE_X
  const SLAB_OUTX = -(DECK_X / 2) - 0.1
  const SLAB_HALFZ = DECK_Z / 2 + SLAB_OUT + 0.02
  const CH = 0.16, CHI = 0.07
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
  const slabGeo = new THREE.ExtrudeGeometry(slabShape, { depth: 0.024, bevelEnabled: false })
  slabGeo.rotateX(Math.PI / 2)
  const slab = new THREE.Mesh(slabGeo, [matSlab, matCart])
  slab.position.y = SLAB_Y + 0.012
  scene.add(slab)
  const SURF_Y = SLAB_Y + 0.013 // fältskivans ovansida
  const LAB_Y = DECK_TOP + 0.001 // labbytans ovansida

  // ---------- platsmarkeringar (beat 1: "steg för steg" + aktiv plats svagt tänd) ----------
  function zoneTex(): THREE.CanvasTexture {
    return canvasTex(256, 256, (g) => {
      g.strokeStyle = '#fff'
      g.lineWidth = 10
      g.setLineDash([26, 16])
      g.beginPath()
      g.roundRect(10, 10, 236, 236, 34)
      g.stroke()
    })
  }
  const zTex = zoneTex()
  type ZoneId = 'brottsplats' | 'utredning' | 'mikroskop' | 'ljusbord' | 'rorpost'
  const ZONES: { id: ZoneId; x0: number; x1: number; z0: number; z1: number; y: number }[] = [
    { id: 'brottsplats', x0: -0.54, x1: -0.33, z0: -0.12, z1: 0.47, y: SURF_Y },
    { id: 'utredning', x0: -0.54, x1: -0.3, z0: -0.47, z1: -0.15, y: SURF_Y },
    { id: 'mikroskop', x0: 0.285, x1: 0.445, z0: -0.225, z1: -0.075, y: LAB_Y },
    { id: 'ljusbord', x0: 0.285, x1: 0.445, z0: -0.07, z1: 0.07, y: LAB_Y },
    { id: 'rorpost', x0: 0.285, x1: 0.445, z0: 0.075, z1: 0.225, y: LAB_Y },
  ]
  const zoneMats = ZONES.map((z) => {
    const mat = new THREE.MeshBasicMaterial({ map: zTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
    const m = flat(z.x1 - z.x0, z.z1 - z.z0, mat)
    m.position.set((z.x0 + z.x1) / 2, z.y + 0.0015, (z.z0 + z.z1) / 2)
    return mat
  })

  // ---------- texturer för föremålen ----------
  const texPrint = canvasTex(128, 128, (g) => {
    g.strokeStyle = '#fff'
    g.lineWidth = 3
    for (let r = 8; r < 56; r += 7) { g.beginPath(); g.ellipse(64, 66, r * 0.78, r, 0, Math.PI * 0.05, Math.PI * 1.95); g.stroke() }
  })
  function polaroidTex(seed: number): THREE.CanvasTexture {
    return canvasTex(200, 240, (g) => {
      g.fillStyle = C_POLAROID
      g.fillRect(0, 0, 200, 240)
      const gr = g.createLinearGradient(0, 14, 0, 176)
      gr.addColorStop(0, '#2d3b33'); gr.addColorStop(1, '#141a16')
      g.fillStyle = gr
      g.fillRect(14, 14, 172, 162)
      // övervakningsbild: skåp + en figur
      g.fillStyle = '#3e5446'
      g.fillRect(24 + seed * 8, 40, 46, 120); g.fillRect(130 - seed * 6, 52, 40, 108)
      g.fillStyle = seed === 0 ? '#9b3a2c' : seed === 1 ? '#c7b04a' : '#7c8a92'
      g.beginPath(); g.arc(98, 98, 14, 0, Math.PI * 2); g.fill()
      g.fillRect(82, 112, 32, 46)
      g.fillStyle = '#d23'; g.beginPath(); g.arc(172, 24, 4, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#2b2b2b'
      g.fillRect(16, 192, 110 - seed * 12, 14); g.fillRect(16, 214, 70, 8)
    })
  }
  const texPolA = polaroidTex(0), texPolB = polaroidTex(1), texPolC = polaroidTex(2)
  const texPaper = canvasTex(256, 384, (g) => {
    g.fillStyle = C_PAPER
    g.fillRect(0, 0, 256, 384)
    g.fillStyle = '#333'
    g.fillRect(16, 20, 200, 12)
    g.fillStyle = '#555'
    for (let i = 0; i < 8; i++) {
      const y = 60 + i * 40
      g.fillRect(16, y, 30, 10)
      g.fillRect(56, y, 120 + ((i * 37) % 60), 10)
    }
  })
  /** Stämpeltext: vit (tonas med materialets färg). */
  function stampTex(text: string): THREE.CanvasTexture {
    return canvasTex(512, 160, (g) => {
      g.strokeStyle = '#fff'
      g.fillStyle = '#fff'
      g.lineWidth = 12
      g.strokeRect(14, 14, 484, 132)
      g.font = '900 78px Oswald, Impact, "Arial Black", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, 256, 84, 450)
      // stämpelkänsla: lite "glapp" i färgen
      g.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < 90; i++) { g.globalAlpha = 0.5; g.fillRect((i * 97) % 512, (i * 53) % 160, 6, 3) }
    })
  }
  const texMisstankt = stampTex('MISSTÄNKT'), texAvskriven = stampTex('AVSKRIVEN')
  const texMatchar = stampTex('HÅRET MATCHAR'), texUtpekad = stampTex('UTPEKAD')

  // ---------- polaroid (grupp; planet ligger i XY, normal +Z) ----------
  interface Polaroid { g: THREE.Group; imprint: THREE.Mesh; imat: THREE.MeshBasicMaterial; mat: THREE.MeshStandardMaterial }
  function makePolaroid(tex: THREE.Texture, stamp: THREE.Texture, stampColor: THREE.ColorRepresentation, w = 0.06): Polaroid {
    const g = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent: true })
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.2), mat)
    g.add(card)
    const imat = new THREE.MeshBasicMaterial({ map: stamp, color: stampColor, transparent: true, opacity: 0, depthWrite: false })
    const imprint = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.05, w * 0.33), imat)
    imprint.position.set(0, w * 0.12, 0.0008)
    imprint.rotation.z = 0.22
    g.add(imprint)
    scene.add(g)
    return { g, imprint, imat, mat }
  }
  /** Lägg en polaroid platt på en yta, "uppåt" i bilden mot −X (sett från fältsidan) eller +X. */
  function layFlat(p: Polaroid, pos: THREE.Vector3, yaw = 0): void {
    p.g.position.copy(pos)
    p.g.rotation.set(-Math.PI / 2, 0, 0)
    p.g.rotateZ(yaw)
  }
  function setStamp(p: Polaroid, k: number): void {
    p.imat.opacity = clamp01(k) * 0.92
    p.imprint.scale.setScalar(k > 0 ? 1 + 0.6 * Math.max(0, 1 - k) + (k > 1 ? (k - 1) * 0.4 : 0) : 1)
  }

  // ---------- stämpelverktyg ----------
  function makeStampTool(inkColor: number): THREE.Group {
    const g = new THREE.Group()
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.03), M(inkColor, { roughness: 0.6 }))
    base.position.y = 0.008
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8), matTool)
    neck.position.y = 0.036
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), matTool)
    knob.position.y = 0.064
    g.add(base, neck, knob)
    scene.add(g)
    return g
  }

  // ===================== BROTTSPLATSEN (fält 1) =====================
  // 9 avtryck på ytan + ställ med 9 bevispåsar (3×3). Påsar 2 och 6 blir "utsmetade" (grå).
  const PRINT_POS: THREE.Vector3[] = []
  for (let i = 0; i < 9; i++) {
    const cx = [-0.495, -0.435, -0.375][i % 3] + (((i * 7) % 5) - 2) * 0.006
    const cz = [0.17, 0.29, 0.41][Math.floor(i / 3)] + (((i * 3) % 5) - 2) * 0.008
    PRINT_POS.push(V(cx, SURF_Y + 0.001, cz))
  }
  const prints = PRINT_POS.map((pos, i) => {
    const mat = new THREE.MeshBasicMaterial({ map: texPrint, transparent: true, opacity: 0.1, color: 0xffffff, depthWrite: false })
    const m = flat(0.055, 0.055, mat)
    m.rotateZ(i * 0.7)
    m.position.copy(pos)
    return mat
  })
  const SMEARED = new Set([2, 6])
  const BAG_POS: THREE.Vector3[] = []
  for (let i = 0; i < 9; i++) BAG_POS.push(V([-0.495, -0.435, -0.375][i % 3], SURF_Y + 0.006, [-0.085, -0.015, 0.055][Math.floor(i / 3)]))
  box(0.19, 0.005, 0.21, matDeep, -0.435, SURF_Y + 0.0025, -0.015) // stället
  const matBag = new THREE.MeshStandardMaterial({ color: 0xe8eef0, transparent: true, opacity: 0.28, roughness: 0.15, depthWrite: false })
  const matBagStrip = M(0xb3261e, { roughness: 0.6 })
  const matSmear = new THREE.MeshBasicMaterial({ color: 0x8c8c8c, transparent: true, opacity: 0.85 })
  const matBagPhoto = new THREE.MeshStandardMaterial({ map: texPolA, roughness: 0.7 })
  const bags = BAG_POS.map((pos, i) => {
    const g = new THREE.Group()
    g.position.copy(pos)
    scene.add(g)
    flat(0.05, 0.062, matBag, g)
    const strip = flat(0.05, 0.011, matBagStrip, g)
    strip.position.set(0, 0.0006, -0.0255)
    const content = SMEARED.has(i)
      ? (() => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.014, 16), matSmear); m.rotation.x = -Math.PI / 2; g.add(m); return m })()
      : flat(0.032, 0.038, matBagPhoto, g)
    content.position.y = 0.0004
    content.position.z += 0.004
    return { g, content }
  })
  // kortet som flyger från avtrycket till påsen
  const flyCard = flat(0.03, 0.036, matBagPhoto)
  // UV-sken + skann-puls
  const matUv = new THREE.MeshBasicMaterial({ color: 0x8a6cff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const uvSpot = flat(0.11, 0.11, matUv)
  ;(uvSpot.geometry as THREE.BufferGeometry).dispose()
  uvSpot.geometry = new THREE.CircleGeometry(0.06, 28)
  const matPulse = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
  const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.036, 32), matPulse)
  pulseRing.rotation.x = -Math.PI / 2
  scene.add(pulseRing)

  // ===================== UTREDNINGSBORDET (fält 2) =====================
  const PAPER_C = V(-0.47, SURF_Y + 0.0012, -0.325)
  const paper = flat(0.13, 0.2, new THREE.MeshStandardMaterial({ map: texPaper, roughness: 0.9 }))
  paper.rotateZ(-Math.PI / 2) // raderna löper längs X (läses från fältsidan)
  paper.position.copy(PAPER_C)
  /** Radernas z på papperet (8 rader). */
  const rowZ = (r: number) => PAPER_C.z - 0.065 + r * 0.019
  // röda ringar (penndrag) — TubeGeometry som ritas fram med drawRange
  const RING_ROWS = [5, 6]
  const matInk = new THREE.MeshBasicMaterial({ color: C_RED })
  const RING_SEG = 64, RING_RAD = 4
  const inkRings = RING_ROWS.map((r, k) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2.18 + k
      const rr = 1 + 0.04 * Math.sin(a * 3 + k)
      pts.push(V(PAPER_C.x + 0.004 + Math.cos(a) * 0.066 * rr, SURF_Y + 0.0024, rowZ(r) + Math.sin(a) * 0.0095 * rr))
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), RING_SEG, 0.0016, RING_RAD, false)
    const m = new THREE.Mesh(geo, matInk)
    scene.add(m)
    return { m, geo, curve: new THREE.CatmullRomCurve3(pts) }
  })
  function setInk(k: number, u: number): void {
    const n = Math.floor(clamp01(u) * RING_SEG) * RING_RAD * 6
    inkRings[k].geo.setDrawRange(0, n)
    inkRings[k].m.visible = n > 0
  }
  // röd penna (lokal: spets i origo, kroppen längs +Y)
  const redPen = new THREE.Group()
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 8), matRed)
    body.position.y = 0.07
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.012, 8), matRed)
    tip.rotation.x = Math.PI
    tip.position.y = 0.002
    redPen.add(body, tip)
    scene.add(redPen)
  }
  const polA = makePolaroid(texPolA, texMisstankt, C_RED)
  const polB = makePolaroid(texPolB, texAvskriven, 0x8a8a8a)
  const POL_A_HOME = V(-0.37, SURF_Y + 0.0016, -0.255)
  const POL_B_HOME = V(-0.37, SURF_Y + 0.0016, -0.39)
  const POL_B_ASIDE = V(-0.515, SURF_Y + 0.0018, -0.43)
  const faltStamp = makeStampTool(C_RED)

  // ===================== RÖRPOSTEN (länken mellan sidorna) =====================
  const capsule = new THREE.Group()
  const capLid = new THREE.Group()
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.085, 14), matBrass)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.01, 14), matTool)
    band.position.y = -0.03
    const end = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), matBrass)
    end.position.y = -0.0425
    capsule.add(body, band, end)
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), matBrass)
    capLid.position.y = 0.0425
    capLid.add(lid)
    capsule.add(capLid)
    scene.add(capsule)
  }
  // vägen: fältskivan → upp → genom porthålet → ner i labbets korg
  const BASKET = V(0.37, LAB_Y, 0.155)
  const TUBE_PATH = new THREE.CatmullRomCurve3([
    V(-0.33, SURF_Y + 0.02, -0.17), V(-0.29, 1.16, -0.1), V(-0.17, PORT_Y, -0.01), V(0, PORT_Y, 0),
    V(0.17, PORT_Y, 0.01), V(0.31, 1.16, 0.09), V(BASKET.x, BASKET.y + 0.03, BASKET.z),
  ])
  const _tan = new THREE.Vector3()
  /** Kapseln på vägen (u 0 = fältet, 0,5 = mitt i porthålet, 1 = i korgen). */
  function capsuleAt(u: number, vis = true): void {
    capsule.visible = vis
    if (!vis) return
    TUBE_PATH.getPointAt(clamp01(u), capsule.position)
    TUBE_PATH.getTangentAt(clamp01(u), _tan)
    capsule.quaternion.setFromUnitVectors(UP, _tan.normalize())
  }
  // spår efter kapseln (mässingsglöd)
  const matTrail = new THREE.MeshBasicMaterial({ color: C_BRASS, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const TRAIL_SEG = 80
  const trailGeo = new THREE.TubeGeometry(TUBE_PATH, TRAIL_SEG, 0.006, 5, false)
  const trail = new THREE.Mesh(trailGeo, matTrail)
  scene.add(trail)
  function setTrail(u0: number, u1: number, o: number): void {
    const a = Math.floor(clamp01(Math.min(u0, u1)) * TRAIL_SEG), b = Math.ceil(clamp01(Math.max(u0, u1)) * TRAIL_SEG)
    trailGeo.setDrawRange(a * 5 * 6, Math.max(0, b - a) * 5 * 6)
    matTrail.opacity = o
  }
  // korgen (galler) på labbytan
  {
    const g = new THREE.Group()
    g.position.copy(BASKET)
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.003, 18), matWire)
    bottom.position.y = 0.0015
    g.add(bottom)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.0025, 6, 24), matWire)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.05
    g.add(rim)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05, 4), matWire)
      bar.position.set(Math.cos(a) * 0.04, 0.025, Math.sin(a) * 0.04)
      g.add(bar)
    }
    scene.add(g)
  }

  // ===================== MIKROSKOPBORDET (labb 1) =====================
  const MICRO = V(0.405, LAB_Y, -0.165)
  const STAGE = V(MICRO.x - 0.012, LAB_Y + 0.05, MICRO.z)
  const micro = new THREE.Group()
  const microTip = matGlow.clone()
  const microLight = new THREE.PointLight(0xffffff, 0, 0.35, 2)
  {
    micro.position.copy(MICRO)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.07), matTool)
    base.position.y = 0.006
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.12, 0.022), matTool)
    arm.position.set(0.022, 0.07, 0)
    const stage = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.004, 0.05), matTool)
    stage.position.set(-0.012, 0.048, 0)
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.075, 10), matTool)
    tube.position.set(-0.004, 0.1, 0)
    tube.rotation.z = 0.35
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), microTip)
    eye.position.set(0.01, 0.14, 0)
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), matTool)
    knob.rotation.x = Math.PI / 2
    knob.position.set(0.022, 0.06, 0.017)
    micro.add(base, arm, stage, tube, eye, knob)
    microLight.position.set(0.01, 0.15, 0)
    micro.add(microLight)
    scene.add(micro)
  }
  const KNOB = V(MICRO.x + 0.022, LAB_Y + 0.06, MICRO.z + 0.022)
  // provglas Q1–Q6 i ett ställ (2 × 3)
  const RACK = V(0.32, LAB_Y, -0.18)
  box(0.05, 0.012, 0.085, matTool, RACK.x, LAB_Y + 0.006, RACK.z)
  const VIAL_HOME = [0, 1, 2, 3, 4, 5].map((i) => V(RACK.x + (i < 3 ? -0.012 : 0.012), LAB_Y + 0.012, RACK.z - 0.028 + (i % 3) * 0.028))
  const matVialGlass = new THREE.MeshStandardMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false })
  const vials = VIAL_HOME.map(() => {
    const g = new THREE.Group()
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.05, 10), matVialGlass)
    glass.position.y = 0.025
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.4 })
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.01, 10), capMat)
    cap.position.y = 0.054
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.034, 4), matFig)
    strand.position.y = 0.024
    strand.rotation.z = 0.25
    g.add(glass, cap, strand)
    scene.add(g)
    return { g, capMat }
  })
  // tre burkar: MÄNNISKA / DJUR / FIBER (ljus / mellan / mörk etikett)
  const JAR = [V(0.305, LAB_Y, -0.11), V(0.305, LAB_Y, -0.06), V(0.305, LAB_Y, -0.01)]
  const jarChips: THREE.Mesh[][] = JAR.map((p, j) => {
    const g = new THREE.Group()
    g.position.copy(p)
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.04, 14, 1, true), matVialGlass)
    glass.position.y = 0.02
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.016, 14), matTool)
    bottom.rotation.x = -Math.PI / 2
    bottom.position.y = 0.001
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.012, 14, 1, true), M([0xf3eee2, 0x9b7a55, 0x4a4a4a][j], { side: THREE.DoubleSide }))
    label.position.y = 0.022
    g.add(glass, bottom, label)
    scene.add(g)
    return [0, 1, 2].map((k) => {
      const chip = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.003, 12), matGlow)
      chip.position.set(p.x, p.y + 0.004 + k * 0.004, p.z)
      chip.visible = false
      scene.add(chip)
      return chip
    })
  })
  // "bilden" som hoppar från mikroskopet ner i burken
  const matChip = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  const imgChip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.003, 0.022), matChip)
  scene.add(imgChip)

  // ===================== LJUSBORDET (labb 2) =====================
  const LIGHTBOX = V(0.395, LAB_Y, -0.0)
  const lightbox = new THREE.Group()
  const matLight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.3 })
  const HAIR_COL = [0x3a2412, 0xd8b45a, 0x9a9a9a] // MÖRKT, BLONT, GRÅTT
  const HAIR_Z = [-0.045, 0.0, 0.045]
  const hairMats = HAIR_COL.map((c) => M(c, { roughness: 0.5 }))
  const lbHairs: THREE.Mesh[] = []
  const labels: THREE.Mesh[] = []
  {
    lightbox.position.copy(LIGHTBOX)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.15), matTool)
    frame.position.y = 0.007
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.002, 0.14), matLight)
    panel.position.y = 0.0145
    lightbox.add(frame, panel)
    scene.add(lightbox)
    HAIR_Z.forEach((z, i) => {
      const curve = new THREE.CatmullRomCurve3([V(-0.03, 0, 0), V(-0.01, 0, 0.004), V(0.01, 0, -0.004), V(0.028, 0, 0.002)])
      const h = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.0014, 4, false), hairMats[i])
      h.position.set(LIGHTBOX.x - 0.006, LIGHTBOX.y + 0.017, LIGHTBOX.z + z)
      scene.add(h)
      lbHairs.push(h)
      const lab = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.002, 0.012), M(HAIR_COL[i], { roughness: 0.6 }))
      scene.add(lab)
      labels.push(lab)
    })
  }
  const labelHome = (i: number) => V(LIGHTBOX.x + 0.03, LIGHTBOX.y + 0.0175, LIGHTBOX.z + HAIR_Z[i])

  // ===================== RÖRPOSTEN i labbet (labb 3) =====================
  const polL = makePolaroid(texPolA, texMatchar, 0xffa040)
  const POL_L_HOME = V(0.315, LAB_Y + 0.0015, 0.085)
  const labbStamp = makeStampTool(0xffa040)
  const labbStampBase = labbStamp.children[0] as THREE.Mesh

  // ===================== TAVLAN =====================
  const board = new THREE.Group()
  const BOARD_UP = 1.69, BOARD_DOWN = 1.35
  {
    const cork = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.26, 0.016), matCork)
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.012), matTool)
    frame.position.z = -0.003
    board.add(frame, cork)
    scene.add(board)
  }
  const boardPols = [texPolA, texPolB, texPolC].map((t, i) => {
    const p = makePolaroid(t, texUtpekad, 0xffa040, 0.09)
    board.add(p.g)
    p.g.position.set(-0.14 + i * 0.14, -0.005, 0.0095)
    p.g.rotation.z = [0.04, -0.03, 0.05][i]
    return p
  })
  function makePin(mat: THREE.Material): THREE.Group {
    const g = new THREE.Group()
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), mat)
    head.position.z = 0.022
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.022, 5), matNeedle)
    needle.rotation.x = Math.PI / 2
    needle.position.z = 0.011
    g.add(head, needle)
    scene.add(g)
    return g
  }
  const pinA = makePin(matPinA), pinB = makePin(matPinB)
  const _bp = new THREE.Vector3()
  /** Nålens fäste på polaroid i (världen). */
  function pinSpot(i: number, dx = 0): THREE.Vector3 {
    board.updateMatrixWorld(true)
    return board.localToWorld(_bp.set(-0.14 + i * 0.14 + dx, 0.045, 0.012)).clone()
  }

  // ===================== GUBBAR (samma familj som stav/puls) =====================
  interface Fig {
    g: THREE.Group
    baseYaw: number
    pose(o: { hR?: THREE.Vector3 | null; wR?: number; hL?: THREE.Vector3 | null; wL?: number; lean?: number; breath: number }): THREE.Vector3
    shoulderR(): THREE.Vector3
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
      for (const [s, h] of [[shL, _hL], [shR, _hR]] as const) {
        const v = h.clone().sub(s)
        if (v.length() > 0.66) h.copy(s).addScaledVector(v.normalize(), 0.66)
      }
      p.handL.position.copy(_hL); p.handR.position.copy(_hR)
      place(p.armL, shL, _hL, true); place(p.armR, shR, _hR, true)
      return g.localToWorld(_hR.clone())
    }
    return { g, baseYaw: yaw, pose, shoulderR: () => g.localToWorld(shRLocal.clone()), setTurn: (t: number) => { turnNow = t } }
  }
  const FY = -Math.PI / 2, LY = Math.PI / 2
  const falt = [
    makeFig(-0.8, 0.12, FY), // 0: UV-pennan (brottsplatsen)
    makeFig(-0.76, 0.48, FY + 0.3), // 1: skannern (brottsplatsen)
    makeFig(-0.78, -0.32, FY - 0.15), // 2: utredningsbordet (penna + stämpel)
  ]
  const labb = [
    makeFig(0.78, -0.08, LY), // 0: mikroskopet / ljusbordet / rörposten
    makeFig(0.76, 0.58, LY - 0.45),
    makeFig(0.72, -0.56, LY + 0.45),
  ]
  const everyone = [...falt, ...labb]

  // ---------- verktyg (vit topp-glöd) ----------
  interface Tool { g: THREE.Group; tip: THREE.MeshStandardMaterial; light: THREE.PointLight; len: number }
  function makePen(len: number, r: number): Tool {
    const g = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 10), matTool)
    body.position.y = len / 2
    g.add(body)
    const tip = matGlow.clone()
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.25, 10, 8), tip))
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
  const matBeam = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), matBeam)
  scene.add(beam)
  const _dir = new THREE.Vector3()
  function holdTool(tool: Tool, tip: THREE.Vector3, fig: Fig, glow: number): THREE.Vector3 {
    _dir.copy(fig.shoulderR()).sub(tip).normalize()
    tool.g.position.copy(tip)
    tool.g.quaternion.setFromUnitVectors(UP, _dir)
    tool.tip.emissiveIntensity = 0.25 + 1.6 * glow
    tool.light.intensity = 0.05 * glow
    return tip.clone().addScaledVector(_dir, tool.len * 0.8)
  }
  function restTool(tool: Tool, hand: THREE.Vector3, fig: Fig): void {
    const fwd = new THREE.Vector3(-Math.sin(fig.g.rotation.y), 0, -Math.cos(fig.g.rotation.y))
    _dir.set(0, 1, 0).addScaledVector(fwd, -0.35).normalize()
    tool.g.position.copy(hand).addScaledVector(_dir, -tool.len * 0.8)
    tool.g.quaternion.setFromUnitVectors(UP, _dir)
    tool.tip.emissiveIntensity = 0.2
    tool.light.intensity = 0
  }
  /** Ett handhållet föremål (penna/stämpel): spetsen/basen vid `at`, handtaget mot axeln. */
  function holdObj(obj: THREE.Object3D, at: THREE.Vector3, fig: Fig, len: number, upright = 0.75): THREE.Vector3 {
    _dir.copy(fig.shoulderR()).sub(at).normalize().lerp(UP, upright).normalize()
    obj.position.copy(at)
    obj.quaternion.setFromUnitVectors(UP, _dir)
    return at.clone().addScaledVector(_dir, len)
  }

  // ---------- pratbubblor (tavlan) ----------
  const bTex = canvasTex(256, 192, (g) => {
    g.fillStyle = '#fff'
    g.beginPath(); g.roundRect(12, 12, 232, 124, 40); g.fill()
    g.beginPath(); g.moveTo(80, 130); g.lineTo(60, 182); g.lineTo(122, 132); g.fill()
    g.fillStyle = '#000'
    for (const x of [88, 128, 168]) { g.beginPath(); g.arc(x, 74, 13, 0, Math.PI * 2); g.fill() }
  })
  const bubbles = [falt[0], labb[0], falt[2], labb[1]].map((fig) => {
    const mat = new THREE.SpriteMaterial({ map: bTex, color: 0xffa040, transparent: true, opacity: 0, depthWrite: false })
    const s = new THREE.Sprite(mat)
    s.scale.set(0.28, 0.21, 1)
    scene.add(s)
    return { s, mat, fig }
  })

  // ---------- skärmarna: stegprickar (ingen text) ----------
  function drawScreen(side: 'falt' | 'labb', active: number, done: number, on: number): void {
    const S = screens[side]
    const sig = `${active}|${done}|${on.toFixed(2)}|${accent.getHexString()}`
    if (sig === S.sig) return
    S.sig = sig
    const g = S.ctx
    const a = '#' + accent.getHexString()
    g.globalAlpha = 1
    g.fillStyle = '#050a08'
    g.fillRect(0, 0, 512, 320)
    g.globalAlpha = 0.35 + 0.65 * on
    g.strokeStyle = a; g.fillStyle = a; g.lineWidth = 5
    g.strokeRect(10, 10, 492, 300)
    const n = side === 'falt' ? 3 : 4 // stegen + tavlan
    const x0 = 256 - ((n - 1) * 110) / 2
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 110, y = 160
      g.beginPath()
      if (i === n - 1) {
        // stjärna = tavlan
        for (let k = 0; k < 10; k++) { const r = k % 2 ? 16 : 36, an = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r) }
        g.closePath()
      } else g.arc(x, y, 30, 0, Math.PI * 2)
      if (i < done || i === active) g.fill()
      else g.stroke()
      if (i === active) { g.lineWidth = 3; g.beginPath(); g.arc(x, y, 46, 0, Math.PI * 2); g.stroke(); g.lineWidth = 5 }
    }
    g.globalAlpha = 1
    S.tex.needsUpdate = true
  }

  // ===================== KAMERA =====================
  const beatIdx: Record<string, number> = {}
  FILM.forEach((b, i) => { beatIdx[b.id] = i })
  const frameFor = (id: string): Frame => (MOM ? MOMENT_FRAME : FILM_FRAME)[id as BeatId] ?? FILM_FRAME.open
  const _cp = new THREE.Vector3(), _ct = new THREE.Vector3()
  function cameraAt(beatId: string, progress: number, elapsed: number): void {
    let fov: number
    if (MOM) {
      const f = frameFor(beatId)
      // sömlös drift: en hel sinusperiod per loop
      const s = Math.sin(progress * Math.PI * 2)
      _cp.copy(f.pos).add(_ct.set(0.015 * s, 0.008 * Math.cos(progress * Math.PI * 2), 0))
      _ct.copy(f.tgt)
      fov = f.fov
    } else {
      const i = beatIdx[beatId] ?? 0
      const beat = FILM[i]
      const cur = frameFor(beatId)
      const prev = i > 0 ? frameFor(FILM[i - 1].id) : cur
      const secs = progress * (beat?.dur ?? 5)
      const u = smooth(secs / Math.min(CAM_EASE_S, (beat?.dur ?? 5) * 0.6))
      _cp.copy(prev.pos).lerp(cur.pos, u)
      _ct.copy(prev.tgt).lerp(cur.tgt, u)
      fov = prev.fov + (cur.fov - prev.fov) * u
      if (beatId === 'mikroskop') {
        // panoreringen till labbet går ÖVER stationen
        const pu = smooth(clamp01(secs / Math.min(3.2, (beat?.dur ?? 5) * 0.5)))
        const q = 1 - pu
        _cp.set(0, 0, 0).addScaledVector(prev.pos, q * q).addScaledVector(OVER.pos, 2 * q * pu).addScaledVector(cur.pos, pu * pu)
        _ct.set(0, 0, 0).addScaledVector(prev.tgt, q * q).addScaledVector(OVER.tgt, 2 * q * pu).addScaledVector(cur.tgt, pu * pu)
        fov = prev.fov + (cur.fov - prev.fov) * pu + 6 * Math.sin(pu * Math.PI)
      }
      if (beatId === 'slut') {
        // UTPEKAD nära på tavlan, sedan backar kameran ut till hela stationen som lyser
        const k = ramp(progress, 0.35, 1)
        _cp.lerp(FILM_FRAME.open.pos, k * 0.75)
        _ct.lerp(FILM_FRAME.open.tgt, k * 0.6)
        fov += (FILM_FRAME.open.fov - fov) * k * 0.75
      }
      const drift = (progress - 0.5) * 0.06
      _cp.x += drift * Math.sign(_cp.x || 1) * -0.5
      _cp.y += Math.sin(elapsed * 0.5) * 0.01
    }
    camera.position.copy(_cp)
    camera.lookAt(_ct)
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix() }
  }

  // ===================== HANDLING =====================
  const _v = new THREE.Vector3(), _w = new THREE.Vector3()
  const ORDER: BeatId[] = ['open', 'brottsplats', 'utredning', 'mikroskop', 'ljusbord', 'rorpost', 'tavlan', 'slut']
  const ACTORS: Partial<Record<BeatId, Fig[]>> = {
    brottsplats: [falt[0], falt[1]], utredning: [falt[2]], mikroskop: [labb[0]], ljusbord: [labb[0]], rorpost: [labb[0]], tavlan: [falt[0], labb[0]],
  }
  const popScale = (o: THREE.Object3D, k: number) => { o.visible = k > 0.001; o.scale.setScalar(Math.max(1e-3, k)) }

  function render(elapsed: number, beatIdIn: string, progress: number): void {
    const beatId = (ORDER.includes(beatIdIn as BeatId) ? beatIdIn : 'open') as BeatId
    const p = clamp01(progress)
    const bi = ORDER.indexOf(beatId)
    const at = (id: BeatId) => beatId === id
    /** Film: har beaten passerats? Moment: aldrig (bara den egna platsen). */
    const after = (id: BeatId) => !MOM && bi > ORDER.indexOf(id)
    const br = (i: number) => Math.sin(elapsed * 1.3 + i * 1.7)
    const loopFade = MOM ? 1 - ramp(p, 0.9, 0.995) : 1 // momentens återställning sist i loopen

    // --- figurer: i moment bara aktörerna ---
    const actors = ACTORS[beatId] ?? []
    everyone.forEach((f) => { f.g.visible = !MOM || actors.includes(f) })

    // ================= platsmarkeringar =================
    ZONES.forEach((z, i) => {
      let o = 0
      if (!MOM && at('open')) o = 0.55 * ramp(p, 0.3 + i * 0.1, 0.38 + i * 0.1) * (1 - 0.4 * ramp(p, 0.85, 1))
      else if (!MOM && at(z.id as BeatId)) o = 0.35 * (1 - ramp(p, 0, 0.15)) // platsen "tänds" när steget börjar
      zoneMats[i].opacity = o
      zoneMats[i].color.copy(accent).lerp(new THREE.Color(0xffffff), 0.4)
    })

    // ================= BROTTSPLATSEN =================
    // cykel per avtryck c ∈ [0,1): UV 0–0,35 · skanna 0,35–0,7 (bipp 0,6) · kortet → påsen 0,62–0,9
    let printIdx = -1, cyc = 0
    if (at('brottsplats')) {
      if (MOM) { printIdx = 4; cyc = clamp01(p / 0.86) }
      else if (p < 0.4) { printIdx = 0; cyc = p / 0.4 }
      else { const q = clamp01((p - 0.4) / 0.55) * 8; printIdx = Math.min(8, 1 + Math.floor(q)); cyc = q >= 8 ? 1 : q % 1 }
    }
    const bagsFull = (i: number) => {
      if (after('brottsplats')) return 1
      if (!at('brottsplats')) return 0
      if (MOM) return i < 4 ? 1 : i === 4 ? ramp(cyc, 0.86, 0.95) * loopFade : 0
      if (i < printIdx) return 1
      if (i === printIdx) return ramp(cyc, 0.86, 0.95)
      return 0
    }
    bags.forEach((b, i) => popScale(b.content, bagsFull(i)))
    prints.forEach((mat, i) => {
      let lit = 0
      if (at('brottsplats')) {
        if (MOM) lit = i < 4 ? 0.15 : i === 4 ? ramp(cyc, 0.22, 0.33) * (1 - 0.7 * ramp(cyc, 0.85, 0.95)) * loopFade : 0.1
        else if (i < printIdx) lit = 0.3 // insamlat: svagt kvar
        else if (i === printIdx) lit = ramp(cyc, 0.22, 0.33) * (1 - 0.7 * ramp(cyc, 0.85, 0.95))
        if (SMEARED.has(i) && i === printIdx) lit *= 0.5
      } else if (at('open')) lit = 0
      const gone = after('brottsplats') ? 0.35 : 1
      mat.opacity = (0.08 + 0.85 * lit) * gone
      mat.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.35 + 0.3 * lit)
    })
    // UV-pennan (fält 0)
    const uvF = falt[0]
    if (at('brottsplats') && printIdx >= 0) {
      const pp = PRINT_POS[printIdx]
      const reach = hold(cyc, 0, 0.08, 0.36, 0.45) * (MOM ? 1 : 1)
      const s = clamp01((cyc - 0.06) / 0.3)
      _v.set(pp.x + Math.sin(s * Math.PI * 2) * 0.03, SURF_Y + 0.05, pp.z + (s - 0.5) * 0.08)
      const tip = _w.copy(uvF.pose({ breath: br(0) })).lerp(_v, reach)
      const hand = holdTool(uvPen, tip, uvF, reach)
      uvF.pose({ breath: br(0), hR: hand, wR: reach, lean: 0.28 * reach })
      matUv.opacity = 0.45 * reach * (0.85 + 0.15 * Math.sin(elapsed * 7))
      uvSpot.position.set(tip.x, SURF_Y + 0.003, tip.z)
    } else {
      matUv.opacity = 0
      restTool(uvPen, uvF.pose({ breath: br(0) }), uvF)
    }
    // skannern (fält 1)
    const scF = falt[1]
    if (at('brottsplats') && printIdx >= 0) {
      const pp = PRINT_POS[printIdx]
      const reach = hold(cyc, 0.3, 0.42, 0.72, 0.84)
      _v.copy(pp).setY(SURF_Y + 0.03 + 0.008 * Math.sin(elapsed * 9))
      const tip = _w.copy(scF.pose({ breath: br(1) })).lerp(_v, reach)
      const hand = holdTool(scanner, tip, scF, reach)
      scF.pose({ breath: br(1), hR: hand, wR: reach, lean: 0.3 * reach })
      matBeam.opacity = 0.55 * reach * (0.6 + 0.4 * Math.sin(elapsed * 20))
      beam.position.copy(tip).add(V(0, -0.012, 0))
      beam.quaternion.copy(scanner.g.quaternion)
      beam.rotateX(Math.PI / 2)
      const pulse = (cyc - 0.58) / 0.12
      if (pulse >= 0 && pulse <= 1) {
        pulseRing.position.copy(pp).setY(SURF_Y + 0.003)
        pulseRing.scale.setScalar(1 + pulse * 2.5)
        matPulse.opacity = 0.9 * (1 - pulse)
        matPulse.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.5)
      } else matPulse.opacity = 0
      // kortet flyger till påsen
      const fu = ramp(cyc, 0.62, 0.88)
      const flying = cyc > 0.6 && cyc < 0.9
      flyCard.visible = flying
      if (flying) {
        arc(V(pp.x, SURF_Y + 0.004, pp.z), BAG_POS[printIdx].clone().setY(SURF_Y + 0.008), fu, 0.08, flyCard.position)
        flyCard.material = SMEARED.has(printIdx) ? matSmear : matBagPhoto
      }
    } else {
      matBeam.opacity = 0
      matPulse.opacity = 0
      flyCard.visible = false
      restTool(scanner, scF.pose({ breath: br(1) }), scF)
    }

    // ================= UTREDNINGSBORDET =================
    // Film: papper+polaroider in 0–0,1 · ring 1 0,1–0,26 · ring 2 0,26–0,4 · MISSTÄNKT 0,46 ·
    //       polaroiden rullas in i kapseln 0,5–0,6 · kapseln iväg 0,6–0,8 · AVSKRIVEN 0,88 + åt sidan.
    // Moment: ring 0,05–0,3 · MISSTÄNKT 0,4 · in i kapseln 0,45–0,55 · iväg 0,55–0,8 · återställ 0,9–1.
    const T = MOM
      ? { in: [-1, 0], r1: [0.05, 0.3], r2: [2, 3], st: 0.4, roll: [0.45, 0.55], fly: [0.55, 0.8], stB: 2 }
      : { in: [0, 0.1], r1: [0.1, 0.26], r2: [0.26, 0.4], st: 0.46, roll: [0.5, 0.6], fly: [0.6, 0.8], stB: 0.88 }
    const utrK = at('utredning') ? (MOM ? 1 : ramp(p, T.in[0], T.in[1])) : after('utredning') ? 1 : at('open') || at('brottsplats') ? 0 : 0
    popScale(paper, utrK > 0 ? 1 : 0)
    paper.scale.setScalar(Math.max(1e-3, utrK))
    const uDone = after('utredning')
    const u = at('utredning') ? p : uDone ? 1 : 0
    setInk(0, (at('utredning') ? ramp(u, T.r1[0], T.r1[1]) : uDone ? 1 : 0) * (MOM ? 1 - ramp(p, 0.9, 0.97) : 1))
    setInk(1, at('utredning') ? ramp(u, T.r2[0], T.r2[1]) : uDone ? 1 : 0)
    // polaroid A: hemma → stämplas → rullas in i kapseln (krymper mot kapselns start)
    const rollK = at('utredning') ? ramp(u, T.roll[0], T.roll[1]) : uDone ? 1 : 0
    const polAVis = (at('utredning') ? utrK : 0) * (1 - rollK) + (MOM && at('utredning') ? ramp(p, 0.92, 0.99) * (rollK >= 1 ? 1 : 0) : 0)
    const capStart = TUBE_PATH.getPointAt(0)
    if (polAVis > 0.001) {
      layFlat(polA, POL_A_HOME.clone().lerp(capStart, rollK), Math.PI / 2)
      polA.g.scale.set(Math.max(1e-3, polAVis * (1 - 0.7 * rollK)), Math.max(1e-3, polAVis), 1)
      polA.g.visible = true
      const reset = MOM && rollK >= 1 // återkommer ostämplad
      setStamp(polA, reset ? 0 : at('utredning') ? slam(u, T.st) : 0)
    } else polA.g.visible = false
    // polaroid B: AVSKRIVEN, läggs åt sidan (bara film)
    if (!MOM && (at('utredning') || uDone)) {
      const aside = at('utredning') ? ramp(u, T.stB + 0.03, T.stB + 0.1) : 1
      layFlat(polB, POL_B_HOME.clone().lerp(POL_B_ASIDE, aside), Math.PI / 2 + 0.25 * aside)
      polB.g.scale.setScalar(Math.max(1e-3, utrK))
      polB.g.visible = true
      setStamp(polB, at('utredning') ? slam(u, T.stB) : 1)
    } else polB.g.visible = false
    // fält 2: röd penna, sedan stämpeln
    const utF = falt[2]
    const penK = at('utredning') ? hold(u, T.r1[0] - 0.04, T.r1[0] + 0.02, (MOM ? T.r1[1] : T.r2[1]) - 0.01, (MOM ? T.r1[1] : T.r2[1]) + 0.05) : 0
    const stampK = at('utredning') ? Math.max(hold(u, T.st - 0.08, T.st - 0.03, T.st + 0.03, T.st + 0.08), MOM ? 0 : hold(u, T.stB - 0.08, T.stB - 0.03, T.stB + 0.03, T.stB + 0.08)) : 0
    redPen.visible = at('utredning') || uDone
    faltStamp.visible = at('utredning') || uDone
    const penRest = V(-0.37, SURF_Y + 0.004, -0.46)
    const stampRest = V(-0.36, SURF_Y + 0.001, -0.135)
    if (penK > 0.001) {
      const ring = u < (MOM ? 2 : T.r2[0]) ? 0 : 1
      const ur = ring === 0 ? ramp(u, T.r1[0], T.r1[1]) : ramp(u, T.r2[0], T.r2[1])
      inkRings[ring].curve.getPointAt(clamp01(ur), _v)
      const tip = penRest.clone().lerp(_v, penK)
      const hand = holdObj(redPen, tip, utF, 0.1, 0.55)
      utF.pose({ breath: br(2), hR: hand, wR: penK, lean: 0.3 * penK })
    } else {
      holdObj(redPen, penRest, utF, 0.1, 0.95)
      redPen.quaternion.setFromAxisAngle(V(0, 0, 1), Math.PI / 2) // ligger ner
      redPen.position.copy(penRest).setY(SURF_Y + 0.006)
      if (stampK > 0.001) {
        const target = u < (MOM ? 2 : T.stB - 0.1) ? POL_A_HOME : POL_B_HOME
        const tStamp = u < (MOM ? 2 : T.stB - 0.1) ? T.st : T.stB
        const lift = 0.07 * (1 - smooth(clamp01(1 - Math.abs(u - tStamp) / 0.03)))
        const base = stampRest.clone().lerp(target.clone().setY(SURF_Y + 0.002 + lift), stampK)
        faltStamp.position.copy(base)
        faltStamp.quaternion.identity()
        utF.pose({ breath: br(2), hR: base.clone().setY(base.y + 0.065), wR: stampK, lean: 0.3 * stampK })
      } else {
        faltStamp.position.copy(stampRest)
        faltStamp.quaternion.identity()
        utF.pose({ breath: br(2) })
      }
    }

    // ================= RÖRPOSTEN: kapselns färd =================
    let capU = -1, capOpen = 0, trailA = 0, trailB = 0, trailO = 0
    if (at('utredning')) {
      const fu = ramp(u, T.fly[0], T.fly[1])
      if (u >= T.roll[0] && fu < 1) capU = 0.5 * fu // fältet → in i porthålet
      trailA = 0; trailB = 0.5 * fu; trailO = 0.55 * hold(u, T.fly[0], T.fly[0] + 0.03, T.fly[1], T.fly[1] + 0.08)
    } else if (at('rorpost')) {
      // landar 0–0,25 · lock upp 0,25–0,35 · polaroiden ut 0,35–0,5 · ... · tillbaka 0,8–0,93
      const land = ramp(p, 0.02, 0.25), back = ramp(p, 0.8, 0.93)
      capU = back > 0 ? 1 - 0.5 * back : 0.5 + 0.5 * land
      if (back >= 1) capU = -1
      capOpen = hold(p, 0.25, 0.33, 0.72, 0.8)
      trailA = back > 0 ? 1 - 0.5 * back : 0.5; trailB = back > 0 ? 1 : 0.5 + 0.5 * land
      trailO = 0.55 * Math.max(hold(p, 0.0, 0.03, 0.25, 0.32), hold(p, 0.8, 0.83, 0.93, 0.98))
    }
    capsuleAt(capU, capU >= 0)
    capLid.rotation.z = capOpen * 1.9
    capLid.position.set(-0.02 * capOpen, 0.0425, 0)
    setTrail(trailA, trailB, trailO)
    matPortGlow.opacity = Math.max(trailO * 0.9, at('tavlan') ? 0.25 + 0.15 * Math.sin(elapsed * 4) : at('slut') ? 0.6 : 0)
    matPortGlow.color.copy(accent).lerp(new THREE.Color(C_BRASS), 0.4)

    // ================= MIKROSKOPBORDET =================
    // cykel per prov: glaset till mikroskopet 0–0,25 · fokus + glöd 0,25–0,55 · bilden ner i burken 0,55–0,8 · glaset tillbaka + bock 0,8–0,95
    const SORT = [0, 1, 0, 2, 0, 1] // prov → burk (MÄNNISKA/DJUR/FIBER)
    let vIdx = -1, vc = 0
    if (at('mikroskop')) {
      if (MOM) { vIdx = 3; vc = clamp01(p / 0.9) }
      else { const q = clamp01(p / 0.95) * 3; vIdx = Math.min(2, Math.floor(q)); vc = q >= 3 ? 1 : q % 1 }
    }
    const vialDone = (i: number) => (after('mikroskop') ? 1 : at('mikroskop') ? (MOM ? (i < 3 ? 1 : i === 3 ? ramp(vc, 0.82, 0.92) * loopFade : 0) : i < vIdx ? 1 : i === vIdx ? ramp(vc, 0.82, 0.92) : 0) : 0)
    vials.forEach((v, i) => {
      v.g.position.copy(VIAL_HOME[i])
      v.capMat.emissiveIntensity = 0.9 * vialDone(i)
      v.capMat.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.3 + 0.5 * vialDone(i))
    })
    const chipCount = [0, 0, 0]
    for (let i = 0; i < 6; i++) {
      const inJar = after('mikroskop') ? (i < 6 ? 1 : 0) : at('mikroskop') ? (MOM ? (i < 3 ? 1 : 0) : i < vIdx ? 1 : 0) : 0
      if (inJar) chipCount[SORT[i]]++
    }
    let glow = 0
    matChip.opacity = 0
    const miF = labb[0]
    let miPose: { hR?: THREE.Vector3; wR?: number; hL?: THREE.Vector3; wL?: number; lean?: number } = {}
    if (at('mikroskop') && vIdx >= 0) {
      const v = vials[vIdx]
      const toScope = hold(vc, 0.02, 0.22, 0.8, 0.92)
      const pos = arc(VIAL_HOME[vIdx], STAGE.clone().setY(STAGE.y + 0.002), toScope, 0.05 * (1 - Math.abs(toScope - 0.5) * 2) + 0.0001)
      if (toScope > 0 && toScope < 1) pos.y += 0.05 * Math.sin(Math.PI * toScope)
      v.g.position.copy(pos)
      glow = hold(vc, 0.25, 0.32, 0.55, 0.62)
      // bilden hoppar ner i burken
      const ju = ramp(vc, 0.55, 0.8)
      if (vc > 0.53 && vc < 0.82) {
        matChip.opacity = 1
        arc(V(MICRO.x + 0.01, LAB_Y + 0.15, MICRO.z), JAR[SORT[vIdx]].clone().setY(LAB_Y + 0.03), ju, 0.04, imgChip.position)
      }
      if (vc >= 0.8) chipCount[SORT[vIdx]] = Math.min(3, chipCount[SORT[vIdx]] + (MOM ? (loopFade > 0.5 ? 1 : 0) : 1))
      // händerna: höger flyttar glaset, vänster vrider fokus
      miPose = {
        hR: pos.clone().add(V(0.012, 0.03, 0)), wR: toScope > 0 && toScope < 1 ? 1 : hold(vc, 0.0, 0.05, 0.9, 0.97) * 0.9,
        hL: KNOB, wL: hold(vc, 0.22, 0.3, 0.55, 0.62), lean: 0.3,
      }
      if (toScope >= 1) miPose.hR = STAGE.clone().add(V(0.02, 0.03, 0.02))
    }
    microTip.emissiveIntensity = 0.25 + 1.8 * glow
    microLight.intensity = 0.08 * glow
    jarChips.forEach((chips, j) => chips.forEach((c, k) => { c.visible = k < chipCount[j] && (at('mikroskop') || after('mikroskop') || false) }))

    // ================= LJUSBORDET =================
    const lbK = at('ljusbord') ? (MOM ? 1 : ramp(p, 0, 0.12)) : after('ljusbord') ? 1 : 0
    popScale(lightbox, lbK)
    lbHairs.forEach((h, i) => { h.visible = lbK > 0.01; h.position.set(LIGHTBOX.x - 0.006, LIGHTBOX.y + 0.017, LIGHTBOX.z + HAIR_Z[i]) })
    matLight.emissiveIntensity = 0.9 * lbK
    let lbPose: { hR?: THREE.Vector3; wR?: number; lean?: number } = {}
    labels.forEach((lab, i) => {
      const t0 = MOM ? 0.08 + i * 0.25 : 0.15 + i * 0.26
      const k = at('ljusbord') ? ramp(p, t0, t0 + 0.16) * loopFade : after('ljusbord') ? 1 : 0
      lab.visible = k > 0.001 || after('ljusbord')
      const from = V(LIGHTBOX.x + 0.09, LAB_Y + 0.12, LIGHTBOX.z + HAIR_Z[i] - 0.02)
      arc(from, labelHome(i), k, 0.02, lab.position)
      if (at('ljusbord') && p > t0 - 0.06 && p < t0 + 0.2) {
        const w = hold(p, t0 - 0.06, t0, t0 + 0.14, t0 + 0.2)
        lbPose = { hR: lab.position.clone().add(V(0.015, 0.02, 0)), wR: w, lean: 0.3 * w }
      }
      lab.scale.setScalar(k > 0.001 ? 1 : 1e-3)
    })

    // ================= RÖRPOSTEN i labbet =================
    // polaroiden fälls ut 0,35–0,5 · håret (MÖRKT) läggs på 0,5–0,68 · HÅRET MATCHAR 0,74
    let rpPose: { hR?: THREE.Vector3; wR?: number; lean?: number } = {}
    const rpOn = at('rorpost') || (!MOM && bi > ORDER.indexOf('rorpost'))
    if (rpOn) {
      const out = at('rorpost') ? ramp(p, 0.35, 0.5) * (MOM ? 1 - ramp(p, 0.9, 0.98) : 1) : 1
      polL.g.visible = out > 0.001
      const pos = arc(BASKET.clone().setY(LAB_Y + 0.05), POL_L_HOME, out, 0.04)
      layFlat(polL, pos, -Math.PI / 2)
      polL.g.scale.setScalar(Math.max(1e-3, 0.4 + 0.6 * out))
      setStamp(polL, at('rorpost') ? slam(p, 0.74) * (MOM ? 1 - ramp(p, 0.9, 0.98) : 1) : 1)
      // håret flyttas från ljusbordet till polaroiden
      const hu = at('rorpost') ? ramp(p, 0.5, 0.66) * (MOM ? 1 - ramp(p, 0.9, 0.98) : 1) : 1
      arc(V(LIGHTBOX.x - 0.006, LIGHTBOX.y + 0.017, LIGHTBOX.z + HAIR_Z[0]), POL_L_HOME.clone().add(V(0, 0.002, -0.01)), hu, 0.05, lbHairs[0].position)
      lbHairs[0].visible = true
      if (MOM && at('rorpost')) { lightbox.visible = true; lightbox.scale.setScalar(1) }
      if (at('rorpost')) {
        const w = hold(p, 0.46, 0.5, 0.66, 0.7)
        const ws = hold(p, 0.66, 0.7, 0.78, 0.82)
        const sp = POL_L_HOME.clone().setY(LAB_Y + 0.002 + 0.06 * (1 - smooth(clamp01(1 - Math.abs(p - 0.74) / 0.03))))
        labbStamp.visible = true
        labbStamp.position.copy(V(0.33, LAB_Y, 0.2).lerp(sp, ws))
        if (w > 0.001) rpPose = { hR: lbHairs[0].position.clone().add(V(0.01, 0.015, 0)), wR: w, lean: 0.3 * w }
        else if (ws > 0.001) rpPose = { hR: labbStamp.position.clone().setY(labbStamp.position.y + 0.065), wR: ws, lean: 0.3 * ws }
      } else labbStamp.visible = false
    } else {
      polL.g.visible = false
      labbStamp.visible = false
    }
    ;(labbStampBase.material as THREE.MeshStandardMaterial).color.copy(accent)
    polL.imat.color.copy(accent)

    // labb 0 — EN pose per frame (mikroskop / ljusbord / rörpost)
    {
      const o = at('mikroskop') ? miPose : at('ljusbord') ? lbPose : at('rorpost') ? rpPose : {}
      miF.pose({ breath: br(3), ...o })
    }

    // ================= TAVLAN =================
    const boardK = at('tavlan') ? (MOM ? 1 : ramp(p, 0, 0.15)) : at('slut') ? 1 : 0
    board.visible = boardK > 0.001
    board.position.set(0, BOARD_DOWN + (BOARD_UP - BOARD_DOWN) * boardK, 0)
    // nålarna: A (labbet) på polaroid 0 · B (fältet) först på 1, sedan flyttad till 0
    const TV = MOM
      ? { a: [0.02, 0.16], b: [0.08, 0.22], talk: [0.26, 0.52], move: [0.55, 0.68], utp: 0.74 }
      : { a: [0.15, 0.3], b: [0.25, 0.4], talk: [0.4, 0.75], move: [0.76, 0.92], utp: 2 }
    const tv = at('tavlan') ? p : at('slut') ? 1 : 0
    const pinsOn = (at('tavlan') || at('slut')) && boardK > 0.5
    pinA.visible = pinB.visible = pinsOn
    if (pinsOn) {
      const aK = at('slut') ? 1 : ramp(tv, TV.a[0], TV.a[1]) * loopFade
      const bK = at('slut') ? 1 : ramp(tv, TV.b[0], TV.b[1]) * loopFade
      const mK = at('slut') ? 1 : ramp(tv, TV.move[0], TV.move[1])
      const spotA = pinSpot(0, -0.012), spotB0 = pinSpot(1), spotBA = pinSpot(0, 0.016)
      const fromA = V(0.55, 1.75, 0.35), fromB = V(-0.55, 1.75, 0.35)
      arc(fromA, spotA, aK, 0.12, pinA.position)
      const bTarget = spotB0.clone().lerp(spotBA, mK)
      if (mK > 0 && mK < 1) bTarget.z += 0.05 * Math.sin(Math.PI * mK)
      arc(fromB, bTarget, bK, 0.12, pinB.position)
      pinA.scale.setScalar(Math.max(1e-3, Math.min(1, aK * 3)))
      pinB.scale.setScalar(Math.max(1e-3, Math.min(1, bK * 3)))
    }
    boardPols.forEach((bp, i) => {
      const k = i === 0 ? (at('slut') ? slam(p, MOM ? 2 : 0.15) : at('tavlan') && MOM ? slam(p, TV.utp) * loopFade : 0) : 0
      setStamp(bp, k)
      bp.imat.color.copy(accent)
    })

    // ================= figurerna (vila, blick, vändning) =================
    let focusTeam: 'falt' | 'labb' | null = null
    let focus: THREE.Vector3 | null = null
    if (at('brottsplats')) { focusTeam = 'falt'; focus = printIdx >= 0 ? PRINT_POS[printIdx] : PRINT_POS[0] }
    else if (at('utredning')) { focusTeam = 'falt'; focus = u > T.fly[0] && u < T.fly[1] + 0.05 ? capsule.position.clone() : PAPER_C }
    else if (at('mikroskop')) { focusTeam = 'labb'; focus = MICRO.clone().setY(LAB_Y + 0.1) }
    else if (at('ljusbord')) { focusTeam = 'labb'; focus = LIGHTBOX }
    else if (at('rorpost')) { focusTeam = 'labb'; focus = p < 0.3 ? capsule.position.clone() : POL_L_HOME }
    const isActor = (f: Fig) => actors.includes(f) && !at('tavlan')
    const turnK = at('tavlan') ? ramp(p, TV.talk[0] - 0.12, TV.talk[0]) * (1 - ramp(p, TV.talk[1], TV.talk[1] + 0.1)) : 0
    const secsIn = p * (FILM[beatIdx[beatId] ?? 0]?.dur ?? 5)
    const obsK = MOM ? 1 : smooth(secsIn / 1.2)
    everyone.forEach((f, i) => {
      if (isActor(f)) return // aktörerna har redan sin pose
      const toward = (pt: { x: number; z: number }) => {
        const dy = Math.atan2(-(pt.x - f.g.position.x), -(pt.z - f.g.position.z)) - f.baseYaw
        return Math.atan2(Math.sin(dy), Math.cos(dy))
      }
      const team = falt.includes(f) ? 'falt' : 'labb'
      let turn = toward({ x: 0, z: 0 }) * turnK
      let lean = 0
      if (turnK === 0 && focus && focusTeam === team) {
        turn = THREE.MathUtils.clamp(toward(focus), -0.6, 0.6) * 0.7 * obsK
        lean = 0.14 * obsK
      }
      f.setTurn(turn)
      // på tavlan pekar en från varje sida mot sin nål
      let o: { hL?: THREE.Vector3; wL?: number } = {}
      if (at('tavlan') && (f === falt[0] || f === labb[0])) {
        const pin = f === falt[0] ? pinB : pinA
        const w = 0.55 * hold(p, (f === falt[0] ? TV.b[0] : TV.a[0]) - 0.02, (f === falt[0] ? TV.b[1] : TV.a[1]), TV.talk[0] - 0.05, TV.talk[0] + 0.05)
        if (pin.visible) o = { hL: pin.position, wL: w }
      }
      f.pose({ breath: br(i), lean, ...o })
    })
    bubbles.forEach((bb, i) => {
      let o = 0
      if (at('tavlan')) {
        const span = TV.talk[1] - TV.talk[0]
        const ph = (((p - TV.talk[0]) / span) * 4 - i * 0.5) % 2
        o = hold(p, TV.talk[0], TV.talk[0] + 0.03, TV.talk[1] - 0.03, TV.talk[1]) * (ph >= 0 && ph < 1 ? Math.sin(Math.PI * ph) : 0)
      }
      bb.s.visible = o > 0.001 && bb.fig.g.visible
      bb.mat.opacity = o
      bb.mat.color.copy(accent).lerp(new THREE.Color(0xffffff), 0.25)
      bb.s.position.copy(bb.fig.g.localToWorld(_v.set(0, 1.98, 0))).add(_w.set(0, 0.04 * o, 0))
    })

    // ================= skärmar + final =================
    const faltStep = at('brottsplats') ? 0 : at('utredning') ? 1 : at('tavlan') || at('slut') ? 2 : -1
    const faltDone = after('utredning') ? 2 : after('brottsplats') ? 1 : 0
    const labbStep = at('mikroskop') ? 0 : at('ljusbord') ? 1 : at('rorpost') ? 2 : at('tavlan') || at('slut') ? 3 : -1
    const labbDone = after('rorpost') ? 3 : after('ljusbord') ? 2 : after('mikroskop') ? 1 : 0
    drawScreen('falt', faltStep, faltDone, at('open') ? 0.3 : 1)
    drawScreen('labb', labbStep, labbDone, at('open') ? 0.3 : 1)
    const fin = at('slut') ? ramp(p, 0.15, 0.5) : 0
    ;(floor.material as THREE.MeshBasicMaterial).opacity = 0.07 + 0.12 * fin
    matCart.emissive.copy(accent).multiplyScalar(0.12 * fin)
    matBody.emissive.copy(accent).multiplyScalar(0.1 * fin)

    cameraAt(beatId, p, elapsed)
    renderer.render(scene, camera)
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
      accent.set(css)
      for (const [m, k] of accentMats) m.color.copy(accent).multiplyScalar(k)
      ;(floor.material as THREE.MeshBasicMaterial).color.copy(accent)
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
      for (const t of textures) t.dispose()
      renderer.dispose()
    },
  }
}
