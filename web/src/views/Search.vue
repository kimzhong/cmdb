<template>
  <div class="search-page">
    <a-card>
      <a-input-search
        v-model:value="keyword"
        placeholder="输入关键词进行全局搜索"
        size="large"
        enter-button="搜索"
        @search="handleSearch"
      />
    </a-card>

    <a-card style="margin-top: 16px" v-if="results.length > 0">
      <a-list
        :data-source="results"
        :loading="loading"
      >
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta
              :title="item.model_name"
              :description="JSON.stringify(item.data || {}).substring(0, 100)"
            >
              <template #avatar>
                <a-avatar :style="{ backgroundColor: '#1890ff' }">
                  {{ item.model_identify?.substring(0, 1) }}
                </a-avatar>
              </template>
            </a-list-item-meta>
            <template #actions>
              <a-button type="link" @click="viewDetail(item)">查看详情</a-button>
            </template>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

    <a-empty v-else-if="searched && results.length === 0" style="margin-top: 40px" />
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import api from '../api'

export default defineComponent({
  name: 'Search',
  setup() {
    const router = useRouter()
    const keyword = ref('')
    const results = ref([])
    const loading = ref(false)
    const searched = ref(false)

    const handleSearch = async () => {
      if (!keyword.value.trim()) {
        message.warning('请输入搜索关键词')
        return
      }

      loading.value = true
      searched.value = true

      try {
        const res = await api.search(keyword.value)
        results.value = res.data || []
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    const viewDetail = (item) => {
      router.push({
        path: '/resource',
        query: { id: item.id, modelId: item.model_id }
      })
    }

    return {
      keyword,
      results,
      loading,
      searched,
      handleSearch,
      viewDetail
    }
  }
})
</script>
