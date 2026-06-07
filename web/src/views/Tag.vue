<template>
  <div class="tag-page">
    <!-- 标签搜索 -->
    <a-card title="标签搜索" size="small" style="margin-bottom: 16px">
      <a-space>
        <a-select
          v-model:value="searchForm.tagKeyId"
          placeholder="选择标签键"
          style="width: 150px"
          :loading="tagKeysLoading"
          @change="loadTagValuesForSearch"
        >
          <a-select-option v-for="k in tagKeys" :key="k.id" :value="k.id">
            {{ k.tag_name }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="searchForm.tagValueId"
          placeholder="选择标签值"
          style="width: 150px"
          :disabled="!searchForm.tagKeyId"
        >
          <a-select-option v-for="v in tagValuesForSearch" :key="v.id" :value="v.id">
            {{ v.tag_value_name }}
          </a-select-option>
        </a-select>
        <a-button type="primary" @click="handleTagSearch" :disabled="!searchForm.tagValueId">
          搜索
        </a-button>
      </a-space>
    </a-card>

    <a-card title="标签管理">
      <template #extra>
        <a-button type="primary" @click="showKeyModal">
          <PlusOutlined /> 新建标签键
        </a-button>
      </template>
      <a-table
        :columns="tagKeyColumns"
        :data-source="tagKeys"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="manageValues(record)">
                管理值
              </a-button>
              <a-button type="link" size="small" @click="editTagKey(record)">
                编辑
              </a-button>
              <a-button type="link" danger size="small" @click="deleteTagKey(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 搜索结果 -->
    <a-card title="搜索结果" size="small" style="margin-top: 16px" v-if="searchResults.length > 0">
      <a-table
        :columns="resultColumns"
        :data-source="searchResults"
        :loading="searchLoading"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'model_identify'">
            {{ record.model_identify }}
          </template>
          <template v-else-if="column.key === 'data'">
            {{ JSON.stringify(record.data || {}).substring(0, 50) }}...
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 标签键弹窗 -->
    <a-modal
      v-model:open="keyModalVisible"
      :title="keyEditing ? '编辑标签键' : '新建标签键'"
      @ok="handleKeySubmit"
    >
      <a-form :model="keyForm" layout="vertical">
        <a-form-item label="标签键名称" required>
          <a-input v-model:value="keyForm.name" placeholder="请输入标签键名称" />
        </a-form-item>
        <a-form-item label="标签键标识">
          <a-input v-model:value="keyForm.identify" placeholder="请输入标签键标识" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="keyForm.description" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 标签值管理抽屉 -->
    <a-drawer
      v-model:open="valuesDrawerVisible"
      title="标签值管理"
      width="500"
    >
      <template #extra>
        <a-button type="primary" size="small" @click="showValueModal">
          <PlusOutlined /> 新建标签值
        </a-button>
      </template>
      <a-table
        :columns="tagValueColumns"
        :data-source="tagValues"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="editTagValue(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" @click="bindResources(record)">
                绑定资源
              </a-button>
              <a-button type="link" danger size="small" @click="deleteTagValue(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-drawer>

    <!-- 绑定资源弹窗 -->
    <a-modal
      v-model:open="bindModalVisible"
      title="绑定资源"
      width="800px"
      @ok="handleBindSubmit"
    >
      <a-select
        v-model:value="bindForm.modelId"
        placeholder="选择模型"
        style="width: 200px; margin-bottom: 16px"
        @change="loadBindResources"
      >
        <a-select-option v-for="m in models" :key="m.id" :value="m.id">
          {{ m.name }}
        </a-select-option>
      </a-select>
      <a-table
        :columns="resourceColumns"
        :data-source="bindResourcesList"
        :row-selection="{ selectedRowKeys: bindForm.resourceIds, onChange: onSelectChange }"
        :pagination="false"
        row-key="id"
      >
      </a-table>
    </a-modal>

    <!-- 标签值弹窗 -->
    <a-modal
      v-model:open="valueModalVisible"
      :title="valueEditing ? '编辑标签值' : '新建标签值'"
      @ok="handleValueSubmit"
    >
      <a-form :model="valueForm" layout="vertical">
        <a-form-item label="标签值名称" required>
          <a-input v-model:value="valueForm.name" placeholder="请输入标签值名称" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import api from '../api'

export default defineComponent({
  name: 'Tag',
  components: {
    PlusOutlined
  },
  setup() {
    const tagKeys = ref([])
    const tagValues = ref([])
    const models = ref([])
    const bindResourcesList = ref([])
    const currentTagKey = ref(null)
    const currentTagValue = ref(null)

    const keyModalVisible = ref(false)
    const keyEditing = ref(false)
    const valuesDrawerVisible = ref(false)
    const valueModalVisible = ref(false)
    const bindModalVisible = ref(false)

    const keyForm = reactive({
      id: '',
      name: '',
      identify: '',
      description: ''
    })

    const valueForm = reactive({
      id: '',
      name: '',
      tagKeyId: ''
    })

    // 搜索表单
    const searchForm = reactive({ tagKeyId: '', tagValueId: '' })
    const tagValuesForSearch = ref([])
    const tagKeysLoading = ref(false)
    const searchResults = ref([])
    const searchLoading = ref(false)

    const loadTagValuesForSearch = async () => {
      searchForm.tagValueId = ''
      tagValuesForSearch.value = []
      if (!searchForm.tagKeyId) { return }
      try {
        const res = await api.getTagValues(searchForm.tagKeyId)
        tagValuesForSearch.value = (res.data || []).map(v => ({
          id: v.id,
          tag_value_name: v.tag_value_name
        }))
      } catch (e) {
        console.error(e)
      }
    }

    const handleTagSearch = async () => {
      if (!searchForm.tagValueId) return
      searchLoading.value = true
      try {
        const res = await api.searchByTag(searchForm.tagKeyId, searchForm.tagValueId)
        searchResults.value = res.data || []
      } finally { searchLoading.value = false }
    }

    const valueEditing = ref(false)

    const bindForm = reactive({
      modelId: '',
      resourceIds: []
    })

    const tagKeyColumns = [
      { title: '标签键名称', dataIndex: 'tag_name', key: 'tag_name' },
      { title: '标签键标识', dataIndex: 'tag_identify', key: 'tag_identify' },
      { title: '描述', dataIndex: 'description', key: 'description' },
      { title: '操作', key: 'action', width: 200 }
    ]

    const resultColumns = [
      { title: '模型', dataIndex: 'model_identify', key: 'model_identify', width: 120 },
      { title: '数据', key: 'data' }
    ]

    const tagValueColumns = [
      { title: '标签值名称', dataIndex: 'name', key: 'name' },
      { title: '关联资源数', dataIndex: 'resources', key: 'resources', customRender: ({ record }) => record.resources?.length || 0 },
      { title: '操作', key: 'action', width: 180 }
    ]

    const resourceColumns = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
      { title: '数据', key: 'data', customRender: ({ record }) => JSON.stringify(record.data || {}).substring(0, 30) }
    ]

    const loadTagKeys = async () => {
      tagKeysLoading.value = true
      try {
        const res = await api.getTagKeys()
        tagKeys.value = (res.data || []).map(k => ({
          id: k.id,
          tag_name: k.tag_name || k.name,
          tag_identify: k.tag_identify || k.identify,
          description: k.description
        }))
      } catch (error) {
        console.error(error)
      } finally {
        tagKeysLoading.value = false
      }
    }

    const loadTagValues = async (tagKeyId) => {
      try {
        const res = await api.getTagValues(tagKeyId)
        tagValues.value = (res.data || []).map(v => ({
          id: v.id,
          name: v.tag_value_name,
          resources: v.resources || []
        }))
      } catch (error) {
        console.error(error)
      }
    }

    const loadModels = async () => {
      try {
        const res = await api.getModels()
        // 转换字段名：后端返回 model_name，前端使用 name
        models.value = (res.data || []).map(m => ({
          id: m.id,
          name: m.model_name || m.name
        }))
      } catch (error) {
        console.error(error)
      }
    }

    const showKeyModal = () => {
      keyEditing.value = false
      keyForm.name = ''
      keyForm.identify = ''
      keyForm.description = ''
      keyModalVisible.value = true
    }

    const handleKeySubmit = async () => {
      try {
        if (keyEditing.value) {
          await api.updateTagKey(keyForm.id, {
            tag_name: keyForm.name,
            tag_identify: keyForm.identify,
            description: keyForm.description
          })
          message.success('更新成功')
        } else {
          await api.createTagKey({
            tag_name: keyForm.name,
            tag_identify: keyForm.identify,
            description: keyForm.description
          })
          message.success('创建成功')
        }
        keyModalVisible.value = false
        loadTagKeys()
      } catch (error) {
        console.error(error)
      }
    }

    const editTagKey = (record) => {
      keyEditing.value = true
      keyForm.id = record.id
      // 后端 TagKey 模型序列化字段为 tag_name / tag_identify（与数据库 bson 一致）
      keyForm.name = record.tag_name || record.name
      keyForm.identify = record.tag_identify || record.identify
      keyForm.description = record.description
      keyModalVisible.value = true
    }

    const deleteTagKey = async (record) => {
      try {
        await api.deleteTagKey(record.id)
        message.success('删除成功')
        loadTagKeys()
      } catch (error) {
        console.error(error)
      }
    }

    const manageValues = (record) => {
      currentTagKey.value = record.id
      valuesDrawerVisible.value = true
      loadTagValues(record.id)
    }

    const showValueModal = () => {
      valueEditing.value = false
      valueForm.id = ''
      valueForm.name = ''
      valueModalVisible.value = true
    }

    const editTagValue = (record) => {
      valueEditing.value = true
      valueForm.id = record.id
      valueForm.name = record.name
      valueModalVisible.value = true
    }

    const handleValueSubmit = async () => {
      try {
        if (valueEditing.value) {
          await api.updateTagValue(valueForm.id, {
            tag_value_name: valueForm.name
          })
          message.success('更新成功')
        } else {
          await api.createTagValue({
            tag_value_name: valueForm.name,
            tag_key_id: currentTagKey.value
          })
          message.success('创建成功')
        }
        valueModalVisible.value = false
        loadTagValues(currentTagKey.value)
      } catch (error) {
        console.error(error)
      }
    }

    const deleteTagValue = async (record) => {
      try {
        await api.deleteTagValue(record.id)
        message.success('删除成功')
        loadTagValues(currentTagKey.value)
      } catch (error) {
        console.error(error)
      }
    }

    const bindResources = (record) => {
      currentTagValue.value = record.id
      bindForm.modelId = ''
      bindForm.resourceIds = []
      bindResourcesList.value = []
      bindModalVisible.value = true
    }

    const loadBindResources = async () => {
      if (!bindForm.modelId) return
      try {
        const res = await api.getResources(bindForm.modelId, { pageSize: 100 })
        bindResourcesList.value = res.data.list || []
      } catch (error) {
        console.error(error)
      }
    }

    const onSelectChange = (selectedRowKeys) => {
      bindForm.resourceIds = selectedRowKeys
    }

    const handleBindSubmit = async () => {
      if (!currentTagValue.value || bindForm.resourceIds.length === 0) {
        message.warning('请选择要绑定的资源')
        return
      }
      try {
        await api.bindResource(currentTagValue.value, bindForm.resourceIds)
        message.success('绑定成功')
        bindModalVisible.value = false
        loadTagValues(currentTagKey.value)
      } catch (error) {
        console.error(error)
      }
    }

    onMounted(() => {
      loadTagKeys()
      loadModels()
    })

    return {
      tagKeys,
      tagKeysLoading,
      tagValues,
      models,
      bindResourcesList,
      tagKeyColumns,
      resultColumns,
      tagValueColumns,
      resourceColumns,
      keyModalVisible,
      keyEditing,
      valuesDrawerVisible,
      valueModalVisible,
      valueEditing,
      bindModalVisible,
      searchForm,
      searchResults,
      loadTagValuesForSearch,
      handleTagSearch,
      keyForm,
      valueForm,
      bindForm,
      showKeyModal,
      handleKeySubmit,
      editTagKey,
      deleteTagKey,
      manageValues,
      showValueModal,
      editTagValue,
      handleValueSubmit,
      deleteTagValue,
      bindResources,
      loadBindResources,
      onSelectChange,
      handleBindSubmit
    }
  }
})
</script>
