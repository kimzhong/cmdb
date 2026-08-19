<template>
  <div class="resource-page">
    <a-row :gutter="16">
      <a-col :span="5">
        <a-card title="资源模型" size="small">
          <a-tree
            :tree-data="modelTree"
            :show-icon="true"
            @select="handleModelSelect"
          />
        </a-card>
      </a-col>
      <a-col :span="19">
        <a-card title="资源列表" size="small">
          <template #extra>
            <a-space>
              <a-input-search
                v-model:value="searchKeyword"
                placeholder="搜索"
                style="width: 200px"
                @search="handleSearch"
              />
              <a-button type="primary" @click="showResourceModal" :disabled="!selectedModel">
                <PlusOutlined /> 新建资源
              </a-button>
              <a-button danger :disabled="selectedRows.length === 0" @click="handleBatchDelete">
                批量删除
              </a-button>
            </a-space>
          </template>
          <a-table
            :columns="resourceColumns"
            :data-source="resources"
            :pagination="pagination"
            :loading="loading"
            :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectionChange }"
            row-key="id"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'data'">
                {{ JSON.stringify(record.data || {}).substring(0, 50) }}...
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="viewResource(record)">
                    查看
                  </a-button>
                  <a-button type="link" size="small" @click="goGraph(record)">
                    关系图
                  </a-button>
                  <a-button type="link" size="small" @click="editResource(record)">
                    编辑
                  </a-button>
                  <a-button type="link" danger size="small" @click="deleteResource(record)">
                    删除
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 资源弹窗 -->
    <a-modal
      v-model:open="resourceModalVisible"
      :title="resourceEditing ? '编辑资源' : '新建资源'"
      width="800px"
      @ok="handleResourceSubmit"
    >
      <a-form :model="resourceForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12" v-for="field in fields" :key="field.id">
            <a-form-item :label="field.name">
              <a-input
                v-if="field.type === 'string'"
                v-model:value="resourceForm.data[field.identify]"
              />
              <a-input-number
                v-else-if="field.type === 'number'"
                v-model:value="resourceForm.data[field.identify]"
                style="width: 100%"
              />
              <a-date-picker
                v-else-if="field.type === 'date'"
                v-model:value="resourceForm.data[field.identify]"
                style="width: 100%"
              />
              <a-select
                v-else-if="field.type === 'select'"
                v-model:value="resourceForm.data[field.identify]"
                :options="getFieldOptions(field)"
              />
              <a-input-password
                v-else-if="field.type === 'password'"
                v-model:value="resourceForm.data[field.identify]"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- 资源详情弹窗 -->
    <a-modal
      v-model:open="resourceDetailVisible"
      title="资源详情"
      width="900px"
      :footer="null"
    >
      <a-tabs v-model:activeKey="resourceDetailTab">
        <a-tab-pane key="basic" tab="基本信息">
          <a-descriptions :column="2" bordered>
            <a-descriptions-item label="ID">
              {{ resourceDetail.id }}
            </a-descriptions-item>
            <a-descriptions-item label="模型标识">
              {{ resourceDetail.model_identify }}
            </a-descriptions-item>
            <a-descriptions-item v-for="(value, key) in resourceDetail.data" :key="key" :label="key">
              {{ value }}
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ resourceDetail.create_at }}
            </a-descriptions-item>
            <a-descriptions-item label="更新时间">
              {{ resourceDetail.update_at }}
            </a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="relations" tab="关系管理">
          <a-tabs v-model:activeKey="relationTab">
            <a-tab-pane key="belong" tab="从属关系">
              <a-divider>从属于</a-divider>
              <a-table
                :columns="relationColumns"
                :data-source="resourceRelations.belong?.own || []"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    {{ record.name }} ({{ record.identify }})
                  </template>
                  <template v-else-if="column.key === 'target_data'">
                    {{ JSON.stringify(record.target_data || {}).substring(0, 50) }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="viewResourceById(record.id)">
                      查看
                    </a-button>
                  </template>
                </template>
              </a-table>
              <a-divider>被从属（反向）</a-divider>
              <a-table
                :columns="relationColumns"
                :data-source="resourceRelations.belong?.reverse || []"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    {{ record.name }} ({{ record.identify }})
                  </template>
                  <template v-else-if="column.key === 'target_data'">
                    {{ JSON.stringify(record.target_data || {}).substring(0, 50) }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="viewResourceById(record.id)">
                      查看
                    </a-button>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>
            <a-tab-pane key="connect" tab="连接关系">
              <a-divider>已连接</a-divider>
              <a-table
                :columns="relationColumns"
                :data-source="resourceRelations.connect?.own || []"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    {{ record.name }} ({{ record.identify }})
                  </template>
                  <template v-else-if="column.key === 'target_data'">
                    {{ JSON.stringify(record.target_data || {}).substring(0, 50) }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="viewResourceById(record.id)">
                      查看
                    </a-button>
                  </template>
                </template>
              </a-table>
              <a-divider>被连接（反向）</a-divider>
              <a-table
                :columns="relationColumns"
                :data-source="resourceRelations.connect?.reverse || []"
                :pagination="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    {{ record.name }} ({{ record.identify }})
                  </template>
                  <template v-else-if="column.key === 'target_data'">
                    {{ JSON.stringify(record.target_data || {}).substring(0, 50) }}
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="viewResourceById(record.id)">
                      查看
                    </a-button>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-tab-pane>
        <a-tab-pane key="tags" tab="标签">
          <a-tag v-for="tag in resourceTags" :key="tag.id" color="blue">
            {{ tag.name }}
          </a-tag>
          <a-empty v-if="resourceTags.length === 0" description="暂无标签" />
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlusOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import api from '../api'

export default defineComponent({
  name: 'Resource',
  components: {
    PlusOutlined,
    AppstoreOutlined
  },
  setup() {
    const modelTree = ref([])
    const selectedModel = ref(null)
    const resources = ref([])
    const fields = ref([])
    const loading = ref(false)
    const searchKeyword = ref('')
    const resourceModalVisible = ref(false)
    const resourceEditing = ref(false)
    const resourceDetailVisible = ref(false)
    const resourceDetailTab = ref('basic')
    const relationTab = ref('belong')
    const resourceDetail = ref({})
    const resourceRelations = ref({})
    const resourceTags = ref([])

    const resourceForm = reactive({
      id: '',
      modelId: '',
      modelIdentify: '',
      data: {}
    })

    const pagination = reactive({
      current: 1,
      pageSize: 10,
      total: 0
    })

    // 批量选择
    const selectedRowKeys = ref([])
    const selectedRows = ref([])

    const onSelectionChange = (keys, rows) => {
      selectedRowKeys.value = keys
      selectedRows.value = rows
    }

    const handleBatchDelete = async () => {
      if (selectedRows.value.length === 0) return
      try {
        const ids = selectedRows.value.map(r => r.id)
        await api.batchDeleteResources(ids)
        message.success('删除成功')
        selectedRowKeys.value = []
        selectedRows.value = []
        loadResources()
      } catch (error) {
        console.error(error)
        message.error('删除失败')
      }
    }

    const resourceColumns = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
      { title: '模型标识', dataIndex: 'model_identify', key: 'model_identify', width: 120 },
      { title: '数据', key: 'data' },
      { title: '创建时间', dataIndex: 'create_at', key: 'create_at', width: 180 },
      { title: '操作', key: 'action', width: 180 }
    ]

    const relationColumns = [
      { title: '关系名称', key: 'name', width: 150 },
      { title: '关联数据', key: 'target_data' },
      { title: '操作', key: 'action', width: 80 }
    ]

    const loadModelTree = async () => {
      try {
        const categories = ['资产模型', '应用模型', '组织模型', '其他']
        const tree = []

        for (const category of categories) {
          // 获取该分类下的模型分组
          const res = await api.getModelGroups({ category })
          const groups = res.data || []

          const groupChildren = []
          for (const group of groups) {
            // 获取每个分组下的模型
            const modelRes = await api.getModels({ groupId: group.id })
            const models = modelRes.data || []

            const modelChildren = models.map(model => ({
              title: model.model_name || model.name,
              key: model.id,
              isModel: true
            }))

            groupChildren.push({
              title: group.model_group_name || group.name,
              key: group.id,
              isGroup: true,
              children: modelChildren
            })
          }

          tree.push({
            title: category,
            key: category,
            children: groupChildren
          })
        }

        modelTree.value = tree
      } catch (error) {
        console.error(error)
      }
    }

    const loadResources = async () => {
      if (!selectedModel.value) return

      loading.value = true
      try {
        const res = await api.getResources(selectedModel.value, {
          page: pagination.current,
          pageSize: pagination.pageSize
        })
        resources.value = (res.data.list || []).map(r => ({
          id: r.id,
          model_id: r.model_id,
          model_identify: r.model_identify,
          data: r.data,
          create_at: r.create_at,
          updated_at: r.updated_at
        }))
        pagination.total = res.data.total || 0
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    const loadFields = async () => {
      if (!selectedModel.value) return

      try {
        const res = await api.getModelDetails(selectedModel.value)
        const groups = res.data.groups || []
        // 后端返回格式: [{ Group: {...}, Fields: [...] }]
        fields.value = groups.flatMap(g => {
          const groupFields = g.Fields || g.fields || []
          return groupFields.map(f => ({
            id: f.id,
            name: f.field_name,
            identify: f.field_identify,
            type: f.field_type,
            required: f.required,
            options: f.options
          }))
        })
      } catch (error) {
        console.error(error)
      }
    }

    // 辅助函数：根据key查找节点信息
    const findNodeInfo = (key, nodes = modelTree.value) => {
      for (const node of nodes) {
        if (node.key === key) return node
        if (node.children) {
          const found = findNodeInfo(key, node.children)
          if (found) return found
        }
      }
      return null
    }

    const handleModelSelect = async (keys) => {
      if (keys.length > 0) {
        const key = keys[0]
        const nodeInfo = findNodeInfo(key)

        // 只有点击具体的模型才加载资源和字段
        if (nodeInfo && nodeInfo.isModel) {
          selectedModel.value = key
          pagination.current = 1
          await loadFields()
          await loadResources()
        } else {
          // 点击分组或分类时，清空资源列表
          selectedModel.value = null
          resources.value = []
          fields.value = []
        }
      }
    }

    const handleTableChange = (pag) => {
      pagination.current = pag.current
      pagination.pageSize = pag.pageSize
      loadResources()
    }

    const handleSearch = () => {
      // 搜索功能
    }

    const showResourceModal = () => {
      if (!selectedModel.value) {
        message.warning('请先在左侧选择一个模型')
        return
      }
      resourceEditing.value = false
      resourceForm.data = {}
      resourceModalVisible.value = true
    }

    const handleResourceSubmit = async () => {
      try {
        if (resourceEditing.value) {
          // 编辑资源
          await api.updateResource(resourceForm.id, {
            model_id: selectedModel.value,
            model_identify: resourceForm.modelIdentify,
            data: resourceForm.data
          })
          message.success('更新成功')
        } else {
          // 新建资源
          await api.createResource({
            model_id: selectedModel.value,
            model_identify: resourceForm.modelIdentify,
            data: resourceForm.data
          })
          message.success('创建成功')
        }
        resourceModalVisible.value = false
        loadResources()
      } catch (error) {
        console.error(error)
      }
    }

    const viewResource = async (record) => {
      resourceDetailTab.value = 'basic'
      relationTab.value = 'belong'
      try {
        // 获取资源详情
        const res = await api.getResource(record.id)
        resourceDetail.value = res.data

        // 获取资源关系
        const relationsRes = await api.getResourceRelations(record.id)
        resourceRelations.value = relationsRes.data || {}

        // 获取资源标签 - 需要将标签ID转换为标签值名称
        const tagIds = res.data.tags || []
        if (tagIds.length > 0) {
          // 获取所有标签值
          const tagValuesRes = await api.getAllTagValues()
          const allTagValues = tagValuesRes.data || []
          // 根据ID匹配标签值名称
          resourceTags.value = tagIds.map(id => {
            const tagValue = allTagValues.find(t => t.id === id)
            return tagValue ? { id: tagValue.id, name: tagValue.tag_value_name } : { id: id, name: id }
          })
        } else {
          resourceTags.value = []
        }

        resourceDetailVisible.value = true
      } catch (error) {
        console.error(error)
        message.error('获取资源详情失败')
      }
    }

    const viewResourceById = async (id) => {

const goGraph = (record) => {
  router.push({ path: '/graph', query: { center: record.id } })
}

      await viewResource({ id })
    }

    const editResource = (record) => {
      resourceEditing.value = true
      resourceForm.id = record.id
      resourceForm.data = record.data || {}
      resourceModalVisible.value = true
    }

    const deleteResource = async (record) => {
      try {
        await api.deleteResource(record.id)
        message.success('删除成功')
        loadResources()
      } catch (error) {
        console.error(error)
      }
    }

    const getFieldOptions = (field) => {
      if (!field.options) return []
      try {
        return JSON.parse(field.options)
      } catch {
        return []
      }
    }

    // 必须在 setup 同步执行获取 route（Vue Router 规则）
    const router = useRouter()
    const route = useRoute()

    onMounted(async () => {
      await loadModelTree()
      // 处理从 Search.vue 跳转过来的 query（id + modelId），自动打开资源详情
      const { id, modelId } = route.query
      if (id && modelId) {
        const mid = Array.isArray(modelId) ? modelId[0] : modelId
        const rid = Array.isArray(id) ? id[0] : id
        // 兜底：构造一个最小 model 对象供详情加载（resources 是资源列表，modelId 在此阶段未必已加载）
        selectedModel.value = { id: mid, identify: '', name: '' }
        await viewResource({ id: rid })
      }
    })

    return {
      modelTree,
      selectedModel,
      resources,
      fields,
      loading,
      searchKeyword,
      resourceColumns,
      relationColumns,
      resourceForm,
      pagination,
      selectedRowKeys,
      selectedRows,
      onSelectionChange,
      handleBatchDelete,
      resourceModalVisible,
      resourceEditing,
      resourceDetailVisible,
      resourceDetailTab,
      relationTab,
      resourceDetail,
      resourceRelations,
      resourceTags,
      handleModelSelect,
      handleTableChange,
      handleSearch,
      showResourceModal,
      handleResourceSubmit,
      viewResource,
      viewResourceById,
      editResource,
      deleteResource,
      getFieldOptions
    }
  }
})
</script>
