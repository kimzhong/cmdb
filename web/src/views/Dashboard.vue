<template>
  <div class="dashboard">
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="模型总数"
            :value="stats.modelCount"
            :value-style="{ color: '#3f8600' }"
          >
            <template #prefix>
              <AppstoreOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="资源总数"
            :value="stats.resourceCount"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <DatabaseOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="标签总数"
            :value="stats.tagCount"
            :value-style="{ color: '#cf1322' }"
          >
            <template #prefix>
              <TagsOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="用户总数"
            :value="stats.userCount"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix>
              <TeamOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 20px">
      <a-col :span="12">
        <a-card title="快速操作" :bordered="false">
          <a-space direction="vertical" style="width: 100%">
            <a-button type="primary" block @click="$router.push('/resource')">
              <DatabaseOutlined /> 资源管理
            </a-button>
            <a-button type="primary" block @click="$router.push('/model')">
              <AppstoreOutlined /> 模型管理
            </a-button>
            <a-button type="primary" block @click="$router.push('/tag')">
              <TagsOutlined /> 标签管理
            </a-button>
            <a-button type="primary" block @click="$router.push('/search')">
              <SearchOutlined /> 全局搜索
            </a-button>
          </a-space>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="系统信息" :bordered="false">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="系统版本">CMDB v1.0.0</a-descriptions-item>
            <a-descriptions-item label="技术栈">Golang + Vue + MongoDB</a-descriptions-item>
            <a-descriptions-item label="认证方式">本地认证 / LDAP / AD域</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import {
  AppstoreOutlined,
  DatabaseOutlined,
  TagsOutlined,
  TeamOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import api from '../api'

export default defineComponent({
  name: 'Dashboard',
  components: {
    AppstoreOutlined,
    DatabaseOutlined,
    TagsOutlined,
    TeamOutlined,
    SearchOutlined
  },
  setup() {
    const stats = ref({
      modelCount: 0,
      resourceCount: 0,
      tagCount: 0,
      userCount: 0
    })

    const fetchStats = async () => {
      try {
        const res = await api.getStats()
        stats.value = res.data
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }

    onMounted(async () => {
      await fetchStats()
    })

    return {
      stats
    }
  }
})
</script>
