<template>
  <div class="model-page">
    <a-tabs v-model:activeKey="activeCategory" @change="handleCategoryChange">
      <a-tab-pane key="资产模型" tab="资产模型" />
      <a-tab-pane key="应用模型" tab="应用模型" />
      <a-tab-pane key="组织模型" tab="组织模型" />
      <a-tab-pane key="其他" tab="其他" />
    </a-tabs>

    <a-row :gutter="16">
      <a-col :span="6">
        <a-card title="模型分组" size="small">
          <template #extra>
            <a-button type="link" size="small" @click="showGroupModal">
              <PlusOutlined />
            </a-button>
          </template>
          <a-menu
            v-model:selectedKeys="selectedGroup"
            mode="inline"
            @click="handleGroupClick"
          >
            <a-menu-item v-for="group in groups" :key="group.id">
              {{ group.name }}
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>
      <a-col :span="18">
        <a-card title="模型列表" size="small">
          <template #extra>
            <a-button type="primary" size="small" @click="showModelModal">
              <PlusOutlined /> 新建模型
            </a-button>
          </template>
          <a-table
            :columns="modelColumns"
            :data-source="models"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="editModel(record)">
                    编辑
                  </a-button>
                  <a-button type="link" size="small" @click="viewModel(record)">
                    详情
                  </a-button>
                  <a-button type="link" danger size="small" @click="deleteModel(record)">
                    删除
                  </a-button>
                </a-space>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 模型分组弹窗 -->
    <a-modal
      v-model:open="groupModalVisible"
      :title="groupEditing ? '编辑分组' : '新建分组'"
      @ok="handleGroupSubmit"
    >
      <a-form :model="groupForm" layout="vertical">
        <a-form-item label="分组名称" required>
          <a-input v-model:value="groupForm.name" placeholder="请输入分组名称" />
        </a-form-item>
        <a-form-item label="分组标识">
          <a-input v-model:value="groupForm.identify" placeholder="请输入分组标识" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 模型弹窗 -->
    <a-modal
      v-model:open="modelModalVisible"
      :title="modelEditing ? '编辑模型' : '新建模型'"
      width="600px"
      @ok="handleModelSubmit"
    >
      <a-form :model="modelForm" layout="vertical">
        <a-form-item label="模型名称" required>
          <a-input v-model:value="modelForm.name" placeholder="请输入模型名称" />
        </a-form-item>
        <a-form-item label="模型标识" required>
          <a-input v-model:value="modelForm.identify" placeholder="请输入模型标识" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="modelForm.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 模型详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="模型详情"
      width="900px"
      :footer="null"
    >
      <a-tabs v-model:activeKey="detailTab">
        <a-tab-pane key="info" tab="基本信息">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="模型名称">{{ currentModel.model_name }}</a-descriptions-item>
            <a-descriptions-item label="模型标识">{{ currentModel.model_identify }}</a-descriptions-item>
            <a-descriptions-item label="描述" :span="2">{{ currentModel.description || '-' }}</a-descriptions-item>
            <a-descriptions-item label="创建时间">{{ currentModel.create_at }}</a-descriptions-item>
            <a-descriptions-item label="更新时间">{{ currentModel.update_at }}</a-descriptions-item>
          </a-descriptions>
        </a-tab-pane>
        <a-tab-pane key="fields" tab="字段管理">
          <a-space style="margin-bottom: 16px">
            <a-button type="primary" size="small" @click="showFieldGroupModal">
              <PlusOutlined /> 新建分组
            </a-button>
            <a-button type="primary" size="small" @click="showFieldModal" :disabled="!fieldGroups.length">
              <PlusOutlined /> 新建字段
            </a-button>
          </a-space>

          <a-collapse v-model:activeKey="fieldGroupActiveKeys">
            <a-collapse-panel v-for="group in fieldGroups" :key="group.id" :header="group.field_group_name">
              <template #extra>
                <a-space>
                  <a-button type="link" size="small" @click.stop="editFieldGroup(group)">编辑</a-button>
                  <a-button type="link" danger size="small" @click.stop="deleteFieldGroup(group)">删除</a-button>
                </a-space>
              </template>
              <a-table
                :columns="fieldColumns"
                :data-source="group.fields || []"
                :pagination="false"
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'type'">
                    <a-tag :color="getFieldTypeColor(record.field_type)">{{ record.field_type }}</a-tag>
                  </template>
                  <template v-if="column.key === 'required'">
                    <a-checkable-tag :checked="record.required" disabled>必填</a-checkable-tag>
                  </template>
                  <template v-if="column.key === 'action'">
                    <a-space>
                      <a-button type="link" size="small" @click="editField(record)">编辑</a-button>
                      <a-button type="link" danger size="small" @click="deleteField(record)">删除</a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </a-collapse-panel>
          </a-collapse>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <!-- 字段分组弹窗 -->
    <a-modal
      v-model:open="fieldGroupModalVisible"
      :title="fieldGroupEditing ? '编辑分组' : '新建分组'"
      @ok="handleFieldGroupSubmit"
    >
      <a-form :model="fieldGroupForm" layout="vertical">
        <a-form-item label="分组名称" required>
          <a-input v-model:value="fieldGroupForm.name" placeholder="请输入分组名称" />
        </a-form-item>
        <a-form-item label="分组标识">
          <a-input v-model:value="fieldGroupForm.identify" placeholder="请输入分组标识" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 字段弹窗 -->
    <a-modal
      v-model:open="fieldModalVisible"
      :title="fieldEditing ? '编辑字段' : '新建字段'"
      width="600px"
      @ok="handleFieldSubmit"
    >
      <a-form :model="fieldForm" layout="vertical">
        <a-form-item label="所属分组" required>
          <a-select v-model:value="fieldForm.field_group_id" placeholder="请选择字段分组">
            <a-select-option v-for="g in fieldGroups" :key="g.id" :value="g.id">
              {{ g.field_group_name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="字段名称" required>
          <a-input v-model:value="fieldForm.name" placeholder="请输入字段名称" />
        </a-form-item>
        <a-form-item label="字段标识" required>
          <a-input v-model:value="fieldForm.identify" placeholder="请输入字段标识" :disabled="fieldEditing" />
        </a-form-item>
        <a-form-item label="字段类型" required>
          <a-select v-model:value="fieldForm.type" placeholder="请选择字段类型" :disabled="fieldEditing">
            <a-select-option value="string">字符串</a-select-option>
            <a-select-option value="number">数字</a-select-option>
            <a-select-option value="date">日期</a-select-option>
            <a-select-option value="select">下拉选项</a-select-option>
            <a-select-option value="password">密码</a-select-option>
            <a-select-option value="relation">关系</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="下拉选项" v-if="fieldForm.type === 'select'">
          <a-textarea v-model:value="fieldForm.options" placeholder='JSON格式，如["选项1","选项2"]' :rows="3" />
        </a-form-item>
        <a-form-item label="校验规则">
          <a-input v-model:value="fieldForm.validate_rule" placeholder="正则表达式，如 ^[a-zA-Z0-9]+$" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model:value="fieldForm.description" placeholder="请输入描述" :rows="2" />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="fieldForm.required">必填</a-checkbox>
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
  name: 'Model',
  components: {
    PlusOutlined
  },
  setup() {
    const activeCategory = ref('资产模型')
    const selectedGroup = ref([])
    const groups = ref([])
    const models = ref([])
    const groupModalVisible = ref(false)
    const modelModalVisible = ref(false)
    const groupEditing = ref(false)
    const modelEditing = ref(false)

    // 详情相关
    const detailModalVisible = ref(false)
    const detailTab = ref('info')
    const currentModel = ref({})
    const fieldGroups = ref([])
    const fieldGroupActiveKeys = ref([])

    // 字段分组相关
    const fieldGroupModalVisible = ref(false)
    const fieldGroupEditing = ref(false)

    // 字段相关
    const fieldModalVisible = ref(false)
    const fieldEditing = ref(false)

    const groupForm = reactive({
      id: '',
      name: '',
      identify: ''
    })

    const modelForm = reactive({
      id: '',
      name: '',
      identify: '',
      description: ''
    })

    const fieldGroupForm = reactive({
      id: '',
      name: '',
      identify: '',
      model_id: ''
    })

    const fieldForm = reactive({
      id: '',
      field_group_id: '',
      name: '',
      identify: '',
      type: 'string',
      options: '',
      validate_rule: '',
      description: '',
      required: false
    })

    const modelColumns = [
      { title: '模型名称', dataIndex: 'model_name', key: 'model_name' },
      { title: '模型标识', dataIndex: 'model_identify', key: 'model_identify' },
      { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
      { title: '操作', key: 'action', width: 180 }
    ]

    const groupColumns = [
      { title: '分组名称', dataIndex: 'name', key: 'name' },
      { title: '操作', key: 'action', width: 100 }
    ]

    const fieldColumns = [
      { title: '字段名称', dataIndex: 'field_name', key: 'field_name', width: 120 },
      { title: '字段标识', dataIndex: 'field_identify', key: 'field_identify', width: 120 },
      { title: '类型', key: 'type', width: 80 },
      { title: '必填', key: 'required', width: 60 },
      { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
      { title: '操作', key: 'action', width: 120 }
    ]

    const getFieldTypeColor = (type) => {
      const colors = {
        string: 'blue',
        number: 'green',
        date: 'orange',
        select: 'purple',
        password: 'red',
        relation: 'cyan'
      }
      return colors[type] || 'default'
    }

    const loadGroups = async (category) => {
      try {
        const res = await api.getModelGroups({ category })
        groups.value = (res.data || []).map(g => ({
          id: g.id,
          name: g.model_group_name || g.name,
          identify: g.model_group_identify
        }))
      } catch (error) {
        console.error(error)
      }
    }

    const loadModels = async (groupId) => {
      try {
        const res = await api.getModels({ groupId })
        models.value = res.data || []
      } catch (error) {
        console.error(error)
      }
    }

    const handleCategoryChange = () => {
      selectedGroup.value = []
      models.value = []
      loadGroups(activeCategory.value)
    }

    const handleGroupClick = ({ key }) => {
      loadModels(key)
    }

    const showGroupModal = () => {
      groupEditing.value = false
      groupForm.id = ''
      groupForm.name = ''
      groupForm.identify = ''
      groupModalVisible.value = true
    }

    const handleGroupSubmit = async () => {
      try {
        const data = {
          model_group_name: groupForm.name,
          model_group_identify: groupForm.identify,
          category: activeCategory.value
        }
        if (groupEditing.value) {
          await api.updateModelGroup(groupForm.id, data)
          message.success('更新成功')
        } else {
          await api.createModelGroup(data)
          message.success('创建成功')
        }
        groupModalVisible.value = false
        loadGroups(activeCategory.value)
      } catch (error) {
        console.error(error)
      }
    }

    const showModelModal = () => {
      modelEditing.value = false
      modelForm.id = ''
      modelForm.name = ''
      modelForm.identify = ''
      modelForm.description = ''
      modelModalVisible.value = true
    }

    const handleModelSubmit = async () => {
      try {
        const data = {
          model_name: modelForm.name,
          model_identify: modelForm.identify,
          description: modelForm.description,
          model_group_id: selectedGroup.value[0]
        }
        if (modelEditing.value) {
          await api.updateModel(modelForm.id, data)
          message.success('更新成功')
        } else {
          await api.createModel(data)
          message.success('创建成功')
        }
        modelModalVisible.value = false
        if (selectedGroup.value.length > 0) {
          loadModels(selectedGroup.value[0])
        }
      } catch (error) {
        console.error(error)
      }
    }

    const editModel = (record) => {
      modelEditing.value = true
      modelForm.id = record.id
      modelForm.name = record.model_name
      modelForm.identify = record.model_identify
      modelForm.description = record.description
      modelModalVisible.value = true
    }

    const viewModel = async (record) => {
      currentModel.value = record
      detailModalVisible.value = true
      detailTab.value = 'info'
      await loadFieldGroups(record.id)
    }

    const deleteModel = async (record) => {
      try {
        await api.deleteModel(record.id)
        message.success('删除成功')
        if (selectedGroup.value.length > 0) {
          loadModels(selectedGroup.value[0])
        }
      } catch (error) {
        console.error(error)
      }
    }

    // 字段分组和字段管理
    const loadFieldGroups = async (modelId) => {
      try {
        const res = await api.getFieldGroups(modelId)
        // 后端直接返回数组，需要包装成 groups 格式
        const groupsData = Array.isArray(res.data) ? res.data : (res.data.groups || [])
        fieldGroups.value = groupsData.map(g => ({
          id: g.id,
          field_group_name: g.field_group_name,
          field_group_identify: g.field_group_identify,
          fields: g.fields || []
        }))
        fieldGroupActiveKeys.value = fieldGroups.value.map(g => g.id)
      } catch (error) {
        console.error(error)
      }
    }

    const showFieldGroupModal = () => {
      fieldGroupEditing.value = false
      fieldGroupForm.id = ''
      fieldGroupForm.name = ''
      fieldGroupForm.identify = ''
      fieldGroupForm.model_id = currentModel.value.id
      fieldGroupModalVisible.value = true
    }

    const editFieldGroup = (group) => {
      fieldGroupEditing.value = true
      fieldGroupForm.id = group.id
      fieldGroupForm.name = group.field_group_name
      fieldGroupForm.identify = group.field_group_identify
      fieldGroupForm.model_id = currentModel.value.id
      fieldGroupModalVisible.value = true
    }

    const handleFieldGroupSubmit = async () => {
      try {
        const data = {
          field_group_name: fieldGroupForm.name,
          field_group_identify: fieldGroupForm.identify,
          model_id: fieldGroupForm.model_id
        }
        if (fieldGroupEditing.value) {
          await api.updateFieldGroup(fieldGroupForm.id, data)
          message.success('更新成功')
        } else {
          await api.createFieldGroup(data)
          message.success('创建成功')
        }
        fieldGroupModalVisible.value = false
        loadFieldGroups(currentModel.value.id)
      } catch (error) {
        console.error(error)
      }
    }

    const deleteFieldGroup = async (group) => {
      try {
        await api.deleteFieldGroup(group.id)
        message.success('删除成功')
        loadFieldGroups(currentModel.value.id)
      } catch (error) {
        console.error(error)
      }
    }

    const showFieldModal = () => {
      fieldEditing.value = false
      fieldForm.id = ''
      fieldForm.field_group_id = fieldGroups.value[0]?.id || ''
      fieldForm.name = ''
      fieldForm.identify = ''
      fieldForm.type = 'string'
      fieldForm.options = ''
      fieldForm.validate_rule = ''
      fieldForm.description = ''
      fieldForm.required = false
      fieldModalVisible.value = true
    }

    const editField = (record) => {
      fieldEditing.value = true
      fieldForm.id = record.id
      fieldForm.field_group_id = record.field_group_id
      fieldForm.name = record.field_name
      fieldForm.identify = record.field_identify
      fieldForm.type = record.field_type
      fieldForm.options = record.options || ''
      fieldForm.validate_rule = record.validate_rule || ''
      fieldForm.description = record.description || ''
      fieldForm.required = record.required || false
      fieldModalVisible.value = true
    }

    const handleFieldSubmit = async () => {
      try {
        const data = {
          field_group_id: fieldForm.field_group_id,
          field_name: fieldForm.name,
          field_identify: fieldForm.identify,
          field_type: fieldForm.type,
          options: fieldForm.options,
          validate_rule: fieldForm.validate_rule,
          description: fieldForm.description,
          required: fieldForm.required
        }
        if (fieldEditing.value) {
          await api.updateField(fieldForm.id, data)
          message.success('更新成功')
        } else {
          await api.createField(data)
          message.success('创建成功')
        }
        fieldModalVisible.value = false
        loadFieldGroups(currentModel.value.id)
      } catch (error) {
        console.error(error)
      }
    }

    const deleteField = async (record) => {
      try {
        await api.deleteField(record.id)
        message.success('删除成功')
        loadFieldGroups(currentModel.value.id)
      } catch (error) {
        console.error(error)
      }
    }

    onMounted(() => {
      loadGroups(activeCategory.value)
    })

    return {
      activeCategory,
      selectedGroup,
      groups,
      models,
      groupModalVisible,
      modelModalVisible,
      groupEditing,
      modelEditing,
      groupForm,
      modelForm,
      modelColumns,
      groupColumns,
      fieldColumns,
      getFieldTypeColor,
      loadGroups,
      loadModels,
      handleCategoryChange,
      handleGroupClick,
      showGroupModal,
      handleGroupSubmit,
      showModelModal,
      handleModelSubmit,
      editModel,
      viewModel,
      deleteModel,
      // 详情
      detailModalVisible,
      detailTab,
      currentModel,
      fieldGroups,
      fieldGroupActiveKeys,
      // 字段分组
      fieldGroupModalVisible,
      fieldGroupEditing,
      fieldGroupForm,
      showFieldGroupModal,
      editFieldGroup,
      handleFieldGroupSubmit,
      deleteFieldGroup,
      // 字段
      fieldModalVisible,
      fieldEditing,
      fieldForm,
      showFieldModal,
      editField,
      handleFieldSubmit,
      deleteField
    }
  }
})
</script>

<style scoped>
.model-page {
  background: #fff;
  padding: 16px;
}
</style>
