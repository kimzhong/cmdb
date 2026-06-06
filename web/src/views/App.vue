<template>
  <div class="app-view">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card title="业务与应用" size="small">
          <template #extra>
            <a-space>
              <a-button type="primary" size="small" @click="showBusinessModal">
                <PlusOutlined /> 业务
              </a-button>
              <a-button size="small" @click="showAppModal">
                <PlusOutlined /> 应用
              </a-button>
            </a-space>
          </template>
          <a-tree
            :tree-data="businessTree"
            :show-icon="true"
            @select="handleTreeSelect"
          />
        </a-card>
      </a-col>
      <a-col :span="18">
        <a-card title="应用详情" size="small" v-if="selectedApp">
          <template #extra>
            <a-space>
              <a-button type="link" size="small" @click="editCurrentApp">编辑</a-button>
              <a-button type="link" danger size="small" @click="deleteCurrentApp">删除</a-button>
            </a-space>
          </template>
          <a-tabs v-model:activeKey="detailTab">
            <a-tab-pane key="basic" tab="基本信息">
              <a-descriptions :column="2" bordered size="small">
                <a-descriptions-item label="应用名称">{{ selectedApp.name }}</a-descriptions-item>
                <a-descriptions-item label="应用标识">{{ selectedApp.identify }}</a-descriptions-item>
                <a-descriptions-item label="描述" :span="2">{{ selectedApp.description || '-' }}</a-descriptions-item>
                <a-descriptions-item label="状态">{{ selectedApp.status }}</a-descriptions-item>
                <a-descriptions-item label="负责人">{{ selectedApp.owner || '-' }}</a-descriptions-item>
                <a-descriptions-item label="创建时间">{{ selectedApp.created_at }}</a-descriptions-item>
                <a-descriptions-item label="更新时间">{{ selectedApp.updated_at }}</a-descriptions-item>
              </a-descriptions>
            </a-tab-pane>
            <a-tab-pane key="resources" tab="关联资源">
              <a-space style="margin-bottom: 16px">
                <a-select
                  v-model:value="filterModelId"
                  placeholder="选择模型筛选"
                  style="width: 200px"
                  allowClear
                  @change="loadAppResources"
                >
                  <a-select-option v-for="m in models" :key="m.id" :value="m.id">
                    {{ m.name }}
                  </a-select-option>
                </a-select>
                <a-select
                  v-model:value="filterEnv"
                  placeholder="选择环境筛选"
                  style="width: 150px"
                  allowClear
                  @change="loadAppResources"
                >
                  <a-select-option value="test">测试环境</a-select-option>
                  <a-select-option value="pre">预发环境</a-select-option>
                  <a-select-option value="prod">正式环境</a-select-option>
                </a-select>
              </a-space>
              <a-table
                :columns="resourceColumns"
                :data-source="appResources"
                :loading="resourcesLoading"
                :pagination="{ pageSize: 10 }"
                row-key="id"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'data'">
                    {{ JSON.stringify(record.data || {}).substring(0, 50) }}...
                  </template>
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-card>
        <a-empty v-else description="请选择左侧的应用查看详情" />
      </a-col>
    </a-row>

    <!-- 新建/编辑业务弹窗 -->
    <a-modal
      v-model:open="businessModalVisible"
      :title="businessEditing ? '编辑业务' : '新建业务'"
      @ok="handleBusinessSubmit"
    >
      <a-form :model="businessForm" layout="vertical">
        <a-form-item label="业务名称" required>
          <a-input v-model:value="businessForm.name" placeholder="请输入业务名称" />
        </a-form-item>
        <a-form-item label="业务标识">
          <a-input v-model:value="businessForm.identify" placeholder="请输入业务标识" />
        </a-form-item>
        <a-form-item label="负责人">
          <a-input v-model:value="businessForm.owner" placeholder="请输入负责人" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="businessForm.description" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 新建/编辑应用弹窗 -->
    <a-modal
      v-model:open="appModalVisible"
      :title="appEditing ? '编辑应用' : '新建应用'"
      @ok="handleAppSubmit"
    >
      <a-form :model="appForm" layout="vertical">
        <a-form-item label="所属业务" required>
          <a-select v-model:value="appForm.business_id" placeholder="请选择所属业务">
            <a-select-option v-for="b in businesses" :key="b.id" :value="b.id">
              {{ b.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="应用名称" required>
          <a-input v-model:value="appForm.name" placeholder="请输入应用名称" />
        </a-form-item>
        <a-form-item label="应用标识">
          <a-input v-model:value="appForm.identify" placeholder="请输入应用标识" />
        </a-form-item>
        <a-form-item label="负责人">
          <a-input v-model:value="appForm.owner" placeholder="请输入负责人" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="appForm.status">
            <a-select-option value="planning">规划中</a-select-option>
            <a-select-option value="developing">开发中</a-select-option>
            <a-select-option value="testing">测试中</a-select-option>
            <a-select-option value="running">运行中</a-select-option>
            <a-select-option value="stopped">已停止</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="appForm.description" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted } from 'vue'
import { PlusOutlined, TeamOutlined, AppstoreOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import api from '../api'

export default defineComponent({
  name: 'AppView',
  components: {
    PlusOutlined,
    TeamOutlined,
    AppstoreOutlined
  },
  setup() {
    const router = useRouter()

    // 业务树
    const businessTree = ref([])
    const businesses = ref([])
    const apps = ref([])
    const models = ref([])

    // 选中状态
    const selectedApp = ref(null)
    const selectedBusiness = ref(null)
    const detailTab = ref('basic')

    // 筛选
    const filterModelId = ref(null)
    const filterEnv = ref(null)
    const appResources = ref([])
    const resourcesLoading = ref(false)

    // 弹窗状态
    const businessModalVisible = ref(false)
    const businessEditing = ref(false)
    const appModalVisible = ref(false)
    const appEditing = ref(false)

    // 表单数据
    const businessForm = reactive({
      id: '',
      name: '',
      identify: '',
      owner: '',
      description: ''
    })

    const appForm = reactive({
      id: '',
      business_id: '',
      name: '',
      identify: '',
      owner: '',
      status: 'running',
      description: ''
    })

    const resourceColumns = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
      { title: '模型', dataIndex: 'model_identify', key: 'model_identify', width: 120 },
      { title: '数据', key: 'data' }
    ]

    // 加载业务树
    const loadBusinessTree = async () => {
      try {
        // 加载业务列表
        const businessRes = await api.getBusinesses({ pageSize: 100 })
        businesses.value = businessRes.data.list || []
        const businessList = businessRes.data.list || []

        // 加载应用列表
        const appRes = await api.getApps({ pageSize: 100 })
        apps.value = appRes.data.list || []
        const appList = appRes.data.list || []

        // 加载模型列表
        const modelRes = await api.getModels()
        models.value = (modelRes.data || []).map(m => ({
          id: m.id,
          name: m.model_name,
          identify: m.model_identify
        }))

        // 构建树
        const tree = businessList.map(business => {
          const businessApps = appList.filter(app => app.business_id === business.id)
          return {
            title: business.name,
            key: 'business-' + business.id,
            isBusiness: true,
            businessId: business.id,
            children: businessApps.map(app => ({
              title: app.name,
              key: 'app-' + app.id,
              isBusiness: false,
              appId: app.id
            }))
          }
        })

        businessTree.value = tree
      } catch (error) {
        console.error(error)
      }
    }

    // 加载应用资源
    const loadAppResources = async () => {
      if (!selectedApp.value) return

      resourcesLoading.value = true
      try {
        const res = await api.getAppResources(selectedApp.value.id)
        let resources = res.data || []

        // 按模型筛选
        if (filterModelId.value) {
          resources = resources.filter(r => r.model_id === filterModelId.value)
        }

        // 按环境标签筛选
        if (filterEnv.value) {
          // 过滤有对应环境标签的资源
          // 这里简化处理：需要后端支持按标签筛选
          resources = resources
        }

        appResources.value = resources
      } catch (error) {
        console.error(error)
      } finally {
        resourcesLoading.value = false
      }
    }

    // 树选择
    const handleTreeSelect = async (keys) => {
      if (keys.length === 0) return

      const key = keys[0]
      if (key.startsWith('app-')) {
        const appId = key.replace('app-', '')
        const app = apps.value.find(a => a.id === appId)
        if (app) {
          selectedApp.value = app
          selectedBusiness.value = null
          detailTab.value = 'basic'
          filterModelId.value = null
          filterEnv.value = null
          await loadAppResources()
        }
      } else if (key.startsWith('business-')) {
        selectedBusiness.value = key.replace('business-', '')
        selectedApp.value = null
      }
    }

    // 业务相关
    const showBusinessModal = () => {
      businessEditing.value = false
      businessForm.id = ''
      businessForm.name = ''
      businessForm.identify = ''
      businessForm.owner = ''
      businessForm.description = ''
      businessModalVisible.value = true
    }

    const handleBusinessSubmit = async () => {
      try {
        if (businessEditing.value) {
          await api.updateBusiness(businessForm.id, businessForm)
          message.success('更新成功')
        } else {
          await api.createBusiness(businessForm)
          message.success('创建成功')
        }
        businessModalVisible.value = false
        loadBusinessTree()
      } catch (error) {
        console.error(error)
      }
    }

    // 应用相关
    const showAppModal = () => {
      appEditing.value = false
      appForm.id = ''
      appForm.business_id = selectedBusiness.value || ''
      appForm.name = ''
      appForm.identify = ''
      appForm.owner = ''
      appForm.status = 'running'
      appForm.description = ''
      appModalVisible.value = true
    }

    const handleAppSubmit = async () => {
      try {
        if (!appForm.name || !appForm.identify) {
          message.error('请填写应用名称和应用标识')
          return
        }
        if (appEditing.value) {
          await api.updateApp(appForm.id, appForm)
          message.success('更新成功')
        } else {
          await api.createApp(appForm)
          message.success('创建成功')
        }
        appModalVisible.value = false
        loadBusinessTree()
      } catch (error) {
        console.error(error)
        const errMsg = error.response?.data?.message || error.message || '创建失败'
        message.error(errMsg)
      }
    }

    const editCurrentApp = () => {
      if (!selectedApp.value) return
      appEditing.value = true
      appForm.id = selectedApp.value.id
      appForm.business_id = selectedApp.value.business_id
      appForm.name = selectedApp.value.name
      appForm.identify = selectedApp.value.identify
      appForm.owner = selectedApp.value.owner || ''
      appForm.status = selectedApp.value.status || 'running'
      appForm.description = selectedApp.value.description || ''
      appModalVisible.value = true
    }

    const deleteCurrentApp = async () => {
      if (!selectedApp.value) return
      try {
        await api.deleteApp(selectedApp.value.id)
        message.success('删除成功')
        selectedApp.value = null
        loadBusinessTree()
      } catch (error) {
        console.error(error)
      }
    }

    onMounted(() => {
      loadBusinessTree()
    })

    return {
      businessTree,
      businesses,
      models,
      selectedApp,
      selectedBusiness,
      detailTab,
      filterModelId,
      filterEnv,
      appResources,
      resourcesLoading,
      businessModalVisible,
      businessEditing,
      appModalVisible,
      appEditing,
      businessForm,
      appForm,
      resourceColumns,
      handleTreeSelect,
      showBusinessModal,
      handleBusinessSubmit,
      showAppModal,
      handleAppSubmit,
      editCurrentApp,
      deleteCurrentApp,
      loadAppResources
    }
  }
})
</script>

<style scoped>
.app-view {
  background: #fff;
  padding: 16px;
}
</style>
