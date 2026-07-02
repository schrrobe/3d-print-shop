<script setup lang="ts">
import { extractZoneSlot } from '@print-shop/utils'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * GLB viewer with color zones (max 4 slots, mapped by mesh/material names
 * zone_1_main … zone_4_text). If no GLB is available or loading fails, a
 * procedural fallback model with the same zone names is shown, so the color
 * configurator works without binary assets in the repo.
 */
const props = defineProps<{
  src?: string | null
  colorHexByZone: Record<string, string>
}>()

const container = ref<HTMLDivElement | null>(null)
const usingFallback = ref(false)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let frame = 0
const zoneMaterials = new Map<string, THREE.MeshStandardMaterial[]>()

function registerZoneMesh(mesh: THREE.Mesh) {
  const slot =
    extractZoneSlot(mesh.name) ??
    (Array.isArray(mesh.material)
      ? null
      : mesh.material && 'name' in mesh.material
        ? extractZoneSlot((mesh.material as THREE.Material).name)
        : null)
  if (!slot) return
  const material = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 })
  mesh.material = material
  const list = zoneMaterials.get(slot) ?? []
  list.push(material)
  zoneMaterials.set(slot, list)
}

function buildFallbackModel(target: THREE.Scene) {
  usingFallback.value = true
  const group = new THREE.Group()

  const main = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.8, 48))
  main.name = 'zone_1_main'
  main.position.y = 0
  group.add(main)

  const accent = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.25, 48))
  accent.name = 'zone_2_accent'
  accent.position.y = -1.0
  group.add(accent)

  const detail = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.08, 16, 48))
  detail.name = 'zone_3_detail'
  detail.rotation.x = Math.PI / 2
  detail.position.y = 0.95
  group.add(detail)

  const text = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.06))
  text.name = 'zone_4_text'
  text.position.set(0, 0.1, 1.08)
  group.add(text)

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) registerZoneMesh(obj)
  })
  target.add(group)
}

function applyColors() {
  for (const [slot, materials] of zoneMaterials) {
    const hex = props.colorHexByZone[slot]
    if (!hex) continue
    for (const material of materials) material.color.set(hex)
  }
}

watch(() => props.colorHexByZone, applyColors, { deep: true })

onMounted(() => {
  const el = container.value
  if (!el) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100)
  camera.position.set(2.8, 1.6, 3.4)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth, el.clientHeight)
  el.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))
  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(3, 5, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xffffff, 0.5)
  rim.position.set(-4, 2, -3)
  scene.add(rim)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  controls.autoRotateSpeed = 1.2
  controls.minDistance = 2
  controls.maxDistance = 8

  const finalize = () => {
    applyColors()
  }

  /** GLB assets are optional — verify existence fast before invoking the loader. */
  const glbAvailable = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      const type = response.headers.get('content-type') ?? ''
      return response.ok && !type.includes('text/html')
    } catch {
      return false
    }
  }

  const loadModel = async () => {
    if (props.src && (await glbAvailable(props.src))) {
      new GLTFLoader().load(
        props.src,
        (gltf) => {
          gltf.scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) registerZoneMesh(obj)
          })
          const bounds = new THREE.Box3().setFromObject(gltf.scene)
          const size = bounds.getSize(new THREE.Vector3()).length() || 1
          gltf.scene.scale.setScalar(3 / size)
          scene?.add(gltf.scene)
          finalize()
        },
        undefined,
        () => {
          buildFallbackModel(scene!)
          finalize()
        },
      )
    } else {
      buildFallbackModel(scene!)
      finalize()
    }
  }
  void loadModel()

  const onResize = () => {
    if (!renderer || !camera || !el) return
    camera.aspect = el.clientWidth / el.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(el.clientWidth, el.clientHeight)
  }
  window.addEventListener('resize', onResize)

  const animate = () => {
    frame = requestAnimationFrame(animate)
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
  }
  animate()

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(frame)
    controls?.dispose()
    renderer?.dispose()
    renderer?.domElement.remove()
  })
})
</script>

<template>
  <div
    ref="container"
    class="relative aspect-square w-full overflow-hidden rounded-card border border-subtle bg-surface-elevated"
    data-testid="model-viewer"
    :data-fallback="usingFallback ? 'true' : 'false'"
  />
</template>
