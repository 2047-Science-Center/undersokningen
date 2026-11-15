/**
 * INTROFILM-SCEN (3GS / Three.js) — stationen ovanifrån med gubbar som jobbar.
 * Samma bygg-mönster som Reaktorkärnans stavScene: primitiv-figurer + accent-
 * material som följer --color-primary, renderer med alpha så CRT-bakgrunden syns.
 *
 * Stationen = Förhandlingens monter UTAN mellanväggen (approx geometri; riktig .skp
 * läggs in senare). EN sammanhängande bordsenhet i mitten: FÄLT står på vänstra
 * långsidan (lyspenna + skanner över avtrycksytan), LABB på högra (mikroskop över
 * hårprover) — de står MITT EMOT varandra tvärs över samma bord, precis som i
 * Förhandlingen. Väggen som förr delade bordet vid x=0 är borttagen; de två
 * skärmarna sitter rygg-mot-rygg där väggen satt. Kameran stannar på publiksidan
 * (+Z), skiftar vänster/höger och zoomar; verktygen lyser vitt från toppen.
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
 * Alla ligger på publiksidan (+Z) och tittar in mot bordet; FÄLT = vänster (−X),
 * LABB = höger (+X).
 */
const FRAMES: Record<string, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  overview: { pos: new THREE.Vector3(0, 3.4, 4.2), tgt: new THREE.Vector3(0, 0.95, 0) },
  faltWide: { pos: new THREE.Vector3(-1.45, 2.35, 3.0), tgt: new THREE.Vector3(-0.45, 1.0, 0) },
  faltClose: { pos: new THREE.Vector3(-1.5, 1.6, 1.95), tgt: new THREE.Vector3(-0.35, 0.98, 0) },
  labbWide: { pos: new THREE.Vector3(1.45, 2.35, 3.0), tgt: new THREE.Vector3(0.45, 1.0, 0) },
  labbClose: { pos: new THREE.Vector3(1.5, 1.6, 1.95), tgt: new THREE.Vector3(0.35, 0.98, 0) },
  both: { pos: new THREE.Vector3(0, 2.7, 3.6), tgt: new THREE.Vector3(0, 1.0, 0) },
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

  // --- material (accent = --color-primary; monter mörk/neutral) ---
  const M = (c: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, ...o })
  const matFig = M(0xffa040)
  const matFigDark = M(0x5a3410)
  const matDesk = M(0x1a2430, { roughness: 0.7 })
  const matWall = M(0x121a22, { roughness: 0.95 })
  const matScreen = new THREE.MeshStandardMaterial({ color: 0x0a1016, emissive: 0x0a2230, emissiveIntensity: 0.6, roughness: 0.4 })
  const matTool = M(0x9fb4c4, { roughness: 0.5 })
  const matGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.4, roughness: 0.3 })
  const matMark = new THREE.MeshStandardMaterial({ color: 0x20303a, emissive: 0x000000, roughness: 0.6 })
  const matBubble = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xffa040, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0 })

  // --- monter: U av mörka väggar + golv, öppen mot publiken (+Z) ---
  const booth = new THREE.Group()
  scene.add(booth)
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.0, 0.08), matWall)
  wallBack.position.set(0, 1.5, -1.3)
  booth.add(wallBack)
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 2.6), matWall)
    w.position.set(sx * 1.55, 1.5, -0.1)
    booth.add(w)
  }
  // porthål (siktluckan) + fönsterslits på bakväggen — bara dekor så montern känns igen
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.05, 10, 28), matTool)
  port.position.set(0, 1.9, -1.25)
  booth.add(port)
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.04), matScreen)
  slit.position.set(0, 2.45, -1.25)
  booth.add(slit)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 48),
    new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.06 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.002
  scene.add(floor)

  // --- ETT sammanhängande bord i mitten (löper i Z; de två står på var sin långsida) ---
  const table = new THREE.Group()
  scene.add(table)
  // bordsskiva
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 2.0), matDesk)
  top.position.set(0, TABLE_TOP - 0.05, 0)
  table.add(top)
  // ben i fyra hörn
  for (const [lx, lz] of [[-0.5, 0.85], [0.5, 0.85], [-0.5, -0.85], [0.5, -0.85]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, TABLE_TOP - 0.1, 0.08), matDesk)
    leg.position.set(lx, (TABLE_TOP - 0.1) / 2, lz)
    table.add(leg)
  }
  // central "rygg" där mellanväggen satt — nu bara en låg list som bär de två skärmarna
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.4), matDesk)
  spine.position.set(0, TABLE_TOP + 0.06, 0)
  table.add(spine)

  // två skärmar rygg-mot-rygg i mitten: FÄLT-skärmen vänd åt vänster, LABB åt höger
  function buildScreen(faceSign: 1 | -1) {
    const grp = new THREE.Group()
    grp.position.set(faceSign * 0.06, TABLE_TOP + 0.35, 0)
    grp.rotation.y = faceSign * (Math.PI / 2) // vänd skärmen mot sin operatör
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.56, 0.05), matScreen)
    s.rotation.x = -0.12
    grp.add(s)
    table.add(grp)
  }
  buildScreen(-1) // FÄLT (vänster)
  buildScreen(1) // LABB (höger)

  // arbetsytor på var sin halva av bordsskivan (framför respektive operatör)
  const faltSurf = { x: -0.34, y: TABLE_TOP + 0.005, z: 0 }
  const labbSurf = { x: 0.34, y: TABLE_TOP + 0.005, z: 0 }
  for (const s of [faltSurf, labbSurf]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 1.3), matDesk)
    plate.position.set(s.x, s.y, s.z)
    table.add(plate)
  }

  // FÄLT: avtrycks-prickar på vänstra ytan (tänds under UV/scan)
  const marks: THREE.Mesh[] = []
  const markPts = [
    [0.08, 0.42], [-0.1, 0.18], [0.02, -0.05], [-0.06, -0.3], [0.1, -0.52],
  ] as const
  for (const [mx, mz] of markPts) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), matMark.clone())
    m.rotation.x = -Math.PI / 2
    m.position.set(faltSurf.x + mx, faltSurf.y + 0.012, faltSurf.z + mz)
    scene.add(m)
    marks.push(m)
  }

  // LABB: hårprover (tunna strån) på högra ytan
  const hairs: THREE.Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 6), matFig.clone())
    h.rotation.z = Math.PI / 2
    h.rotation.y = (i - 2) * 0.22
    h.position.set(labbSurf.x + (i % 2 === 0 ? -0.04 : 0.04), labbSurf.y + 0.014, labbSurf.z - 0.44 + i * 0.22)
    scene.add(h)
    hairs.push(h)
  }

  // --- gubbe: stående figur, ev. med en arm som håller ett verktyg mot en punkt ---
  interface Fig {
    group: THREE.Group
    shoulder: THREE.Vector3 // world
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
    // vilo-arm (icke-verktygs-sida)
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
        // streckkods-skanner-silhuett: handtag + "pistol"-huvud
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), matTool)
        grip.rotation.x = 0.5
        grip.position.set(0, -0.06, 0.04)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.18), matTool)
        toolGrp.add(grip, head)
        glowTip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.02), matGlow.clone())
        glowTip.position.set(0, -0.04, 0.095)
        toolGrp.add(glowTip)
      } else {
        // penna (UV / mikroskop): smal penna som lyser från toppen
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
      // rikta pennan/skannern ner mot punkten
      toolGrp.lookAt(point)
      _sh.copy(shoulder)
      place(arm, _sh, toolGrp.position, true)
      if (light) light.position.copy(point).add(new THREE.Vector3(0, 0.18, 0))
    }
    function lookInward(k: number): void {
      // vrid kroppen lite extra mot bordets mitt (mot den andra sidan)
      group.rotation.y = faceY + (x < 0 ? -1 : 1) * k * 0.28
    }
    return { group, shoulder, arm, tool: toolGrp, glowTip, light, faceY, aim, lookInward }
  }

  // FÄLT (vänster, vända mot +X): UV-gubbe + skanner-gubbe.
  // LABB (höger, vända mot −X): mikroskop-gubbe + observatör.
  const uvFig = makeFig(-0.95, 0.4, Math.PI / 2 + 0.12, 'uv')
  const scanFig = makeFig(-0.95, -0.35, Math.PI / 2 - 0.12, 'scanner')
  const microFig = makeFig(0.95, 0.35, -Math.PI / 2 - 0.12, 'micro')
  makeFig(0.95, -0.4, -Math.PI / 2 + 0.12, null) // labb-observatör (står bara med)

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

  // pratbubblor (talk/finale) — ovanför var sin operatör
  const bubbles: THREE.Mesh[] = []
  for (const bx of [-0.95, 0.95]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), matBubble)
    b.position.set(bx, 1.95, 0.05)
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
    // sveper över FÄLT-ytan fram→bak (längs Z), landar mot mitt-pricken
    const t = Math.min(1, progress / 0.7)
    const z = THREE.MathUtils.lerp(0.42, -0.3, t)
    return _sweep.set(faltSurf.x, faltSurf.y, z)
  }

  function render(elapsed: number, beatId: string, progress: number): void {
    resetHighlights()

    const frameKey = BEAT_FRAME[beatId] ?? 'overview'
    const fr = FRAMES[frameKey]
    camPos.lerp(fr.pos, 0.055)
    camTgt.lerp(fr.tgt, 0.055)
    // lätt "andning" så bilden lever
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
        const pt = _sweep.set(faltSurf.x, faltSurf.y, -0.05)
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
        // hår "lyfts" lätt i tur och ordning
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
          b.position.y = 1.95 + bob * 0.06
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
