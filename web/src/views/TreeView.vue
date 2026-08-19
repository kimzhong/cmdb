<template>
  <div class="tree-view-page">
    <a-card title="资源层级视图（Phase 5）" size="small">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="selectedModelId"
            placeholder="选择模型"
            style="width: 220px"
            :options="modelOptions"
            :loading="loadingModels"
            show-search
            :filter-option="filterOption"
            @change="handleModelChange"
          />
          <a-select
            v-model:value="groupBy"
            placeholder="按字段分层"
            style="width: 220px"
            :options="fieldOptions"
            :disabled="!selectedModelId"
            @change="loadTree"
          />
          <a-button @click="loadTree" :disabled="!selectedModelId">
            <ReloadOutlined /> 刷新
          </a-button>
        </a-space>
      </template>

      <a-row :gutter="16">
        <a-col :span="12">
          <div v-if="!selectedModelId" class="empty-tip">请先选择模型</div>
          <a-tree
            v-else
            :tree-data="treeData"
            :loading="loadingTree"
            :show-line="{ showLeafIcon: false }"
            :default-expand-all="false"
            @select="handleNodeSelect"
          >
            <template #title="{ title }">
              <span>{{ title }}</span>
            </template>
          </a-tree>
        </a-col>
        <a-col :span="12">
          <div v-if="!selectedResource" class="empty-tip">点击左侧叶子节点查看资源</div>
          <a-descriptions
            v-else
            :title="`资源详情 - ${selectedResource.id}`"
            bordered
            size="small"
            :column="1"
          >
            <a-descriptions-item v-for="(v, k) in selectedResource.data" :key="k" :label="k">
              <span v-if="v === null || v === undefined" style="color:#999">—</span>
              <span v-else-if="typeof v === 'object'">{{ JSON.stringify(v) }}</span>
              <span v-else>{{ v }}</span>
            </a-descriptions-item>
          </a-descriptions>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { message } from "ant-design-vue"
import { ReloadOutlined } from "@ant-design/icons-vue"
import api from "../api/index"
import treeApi from "../api/tree"

const selectedModelId = ref(undefined)
const selectedModel = ref(null)
const groupBy = ref("唯一标识")
const models = ref([])
const fields = ref([])
const loadingModels = ref(false)
const loadingTree = ref(false)
const treeData = ref([])
const selectedResource = ref(null)

const modelOptions = computed(() =>
  models.value.map((m) => ({ value: m.id, label: `${m.name}（${m.model_identify}）` }))
)

const fieldOptions = computed(() => {
  const opts = fields.value.map((f) => ({ value: f.field_identify, label: f.field_name }))
  if (!opts.find((o) => o.value === "唯一标识")) opts.unshift({ value: "唯一标识", label: "唯一标识" })
  if (!opts.find((o) => o.value === "名称")) opts.unshift({ value: "名称", label: "名称" })
  return opts
})

function filterOption(input, option) {
  return (option.label || "").toLowerCase().includes(input.toLowerCase())
}

async function loadModels() {
  loadingModels.value = true
  try {
    const res = await api.getModels()
    models.value = res.data || []
  } catch (err) {
    message.error("加载模型失败")
  } finally {
    loadingModels.value = false
  }
}

async function handleModelChange(modelId) {
  selectedModel.value = models.value.find((m) => m.id === modelId) || null
  selectedResource.value = null
  if (!modelId) {
    fields.value = []
    treeData.value = []
    return
  }
  try {
    const res = await api.getModelDetails(modelId)
    const groups = (res.data && res.data.groups) || []
    fields.value = groups.flatMap((g) => g.fields || [])
  } catch (err) {
    message.error("加载字段失败")
  }
  await loadTree()
}

async function loadTree() {
  if (!selectedModelId.value) return
  loadingTree.value = true
  try {
    const res = await treeApi.getResourceTree(selectedModelId.value, groupBy.value)
    const branches = (res.data && res.data.branches) || []
    treeData.value = branches.map((b) => ({
      key: `branch-${b.key}`,
      title: `${b.title}（${b.count}）`,
      selectable: false,
      children: (b.leaves || []).map((l) => {
        const name = (l.data && (l.data[groupBy.value] || l.data["名称"] || l.data["唯一标识"])) || l.id
        return {
          key: l.id,
          title: name,
          isLeaf: true,
          raw: l,
        }
      }),
    }))
  } catch (err) {
    message.error("加载资源树失败")
  } finally {
    loadingTree.value = false
  }
}

function handleNodeSelect(keys, info) {
  const node = info.node
  if (node && node.isLeaf && node.raw) {
    selectedResource.value = node.raw
  } else {
    selectedResource.value = null
  }
}

onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.tree-view-page { padding: 0; }
.empty-tip { padding: 40px; text-align: center; color: #999; background: #fafafa; border-radius: 4px; }
</style>
