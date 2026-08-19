<template>
  <div class="relation-graph-page">
    <a-card title="关系图视图（Phase 6）" size="small">
      <template #extra>
        <a-space>
          <span>中心: <b>{{ centerId || noCenterLabel }}</b></span>
          <a-select
            v-model:value="depth"
            :options="depthOptions"
            style="width: 100px"
            @change="loadGraph"
          />
          <a-button @click="loadGraph" :disabled="!centerId">
            <ReloadOutlined /> 刷新
          </a-button>
        </a-space>
      </template>
      <div ref="containerRef" class="graph-canvas"></div>
      <a-empty v-if="!centerId" description="请从资源页面点击关系图按钮进入，或 URL 携带 ?center=xxx" />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue"
import { useRoute } from "vue-router"
import { message } from "ant-design-vue"
import { ReloadOutlined } from "@ant-design/icons-vue"
import { Network } from "vis-network/standalone"
import "vis-network/styles/vis-network.css"
import graphApi from "../api/graph"

const noCenterLabel = "（未指定）"
const route = useRoute()
const containerRef = ref(null)
const depth = ref(2)
const centerId = ref("")
let networkInstance = null

const depthOptions = [
  { value: 0, label: "仅中心" },
  { value: 1, label: "1 层" },
  { value: 2, label: "2 层" },
  { value: 3, label: "3 层" }
]

function readCenter() {
  const fromQuery = route.query.center
  if (fromQuery) {
    centerId.value = String(fromQuery)
    return true
  }
  const fromPath = route.params.resourceId
  if (fromPath) {
    centerId.value = String(fromPath)
    return true
  }
  return false
}

async function loadGraph() {
  if (!centerId.value) return
  if (!networkInstance) return
  try {
    const res = await graphApi.getRelationGraph(centerId.value, depth.value)
    const data = res.data || {}
    const nodes = (data.nodes || []).map((n) => ({
      id: n.id,
      label: n.label || n.id,
      group: n.group,
      title: n.group ? "模型：" + n.group : ""
    }))
    const edges = (data.edges || []).map((e) => ({
      from: e.from,
      to: e.to,
      label: e.label || "",
      arrows: e.arrows || "to",
      color: e.type === "belong" ? { color: "#1677ff" } : { color: "#52c41a" }
    }))
    networkInstance.setData({ nodes, edges })
  } catch (err) {
    message.error("加载关系图失败")
  }
}

function initNetwork() {
  if (!containerRef.value) return
  networkInstance = new Network(containerRef.value, { nodes: [], edges: [] }, {
    physics: { stabilization: { iterations: 200 } },
    interaction: { hover: true },
    nodes: { shape: "dot", size: 16, font: { size: 14 } },
    edges: { font: { size: 11, align: "horizontal" } }
  })
}

watch(() => route.query.center, () => {
  if (readCenter()) loadGraph()
})

onMounted(async () => {
  await nextTick()
  initNetwork()
  if (readCenter()) loadGraph()
})

onBeforeUnmount(() => {
  if (networkInstance) {
    networkInstance.destroy()
    networkInstance = null
  }
})
</script>

<style scoped>
.relation-graph-page { padding: 0; }
.graph-canvas { width: 100%; height: calc(100vh - 220px); min-height: 480px; border: 1px solid #f0f0f0; border-radius: 4px; }
</style>
