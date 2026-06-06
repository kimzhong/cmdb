<template>
  <div class="task-view">
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col>
        <a-button type="primary" @click="showAddModal">
          <PlusOutlined /> 新建任务
        </a-button>
      </a-col>
    </a-row>

    <a-table
      :columns="columns"
      :data-source="taskList"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 1 ? 'green' : 'red'">
            {{ record.status === 1 ? '启用' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="runTask(record)">执行</a-button>
            <a-button type="link" size="small" @click="editTask(record)">编辑</a-button>
            <a-button type="link" danger size="small" @click="deleteTask(record)">删除</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新建/编辑任务弹窗 -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEdit ? '编辑任务' : '新建任务'"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirm-loading="submitLoading"
      width="600px"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item label="任务名称" name="name">
          <a-input v-model:value="formData.name" placeholder="请输入任务名称" />
        </a-form-item>
        <a-form-item label="任务标识" name="identify">
          <a-input v-model:value="formData.identify" placeholder="请输入任务标识" :disabled="isEdit" />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="关联模型" name="modelId">
              <a-select v-model:value="formData.modelId" placeholder="请选择模型" @change="handleModelChange">
                <a-select-option v-for="model in models" :key="model.id" :value="model.id">
                  {{ model.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="云类型" name="cloudType">
              <a-select v-model:value="formData.cloudType" placeholder="请选择云类型">
                <a-select-option value="aliyun">阿里云</a-select-option>
                <a-select-option value="tencent">腾讯云</a-select-option>
                <a-select-option value="huawei">华为云</a-select-option>
                <a-select-option value="aws">AWS</a-select-option>
                <a-select-option value="other">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="同步方式" name="syncType">
              <a-select v-model:value="formData.syncType" placeholder="请选择同步方式">
                <a-select-option value="full">全量同步</a-select-option>
                <a-select-option value="incremental">增量同步</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Cron表达式" name="schedule">
              <a-input v-model:value="formData.schedule" placeholder="如: 0 0 * * *" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="状态" name="status">
          <a-switch v-model:checked="formData.status" checked-children="启用" un-checked-children="停用" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { defineComponent, reactive, ref, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import api from '../api'

export default defineComponent({
  name: 'TaskView',
  components: {
    PlusOutlined
  },
  setup() {
    const loading = ref(false)
    const submitLoading = ref(false)
    const taskList = ref([])
    const models = ref([])
    const modalVisible = ref(false)
    const isEdit = ref(false)
    const currentEditId = ref(null)
    const formRef = ref()

    const formData = reactive({
      name: '',
      identify: '',
      modelId: undefined,
      cloudType: undefined,
      syncType: undefined,
      schedule: '',
      status: true
    })

    const formRules = {
      name: [{ required: true, message: '请输入任务名称' }],
      identify: [{ required: true, message: '请输入任务标识' }],
      modelId: [{ required: true, message: '请选择模型' }],
      cloudType: [{ required: true, message: '请选择云类型' }],
      syncType: [{ required: true, message: '请选择同步方式' }],
      schedule: [{ required: true, message: '请输入Cron表达式' }]
    }

    const pagination = reactive({
      current: 1,
      pageSize: 10,
      total: 0
    })

    const columns = [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
      { title: '任务名称', dataIndex: 'name', key: 'name' },
      { title: '任务标识', dataIndex: 'identify', key: 'identify' },
      { title: '云类型', dataIndex: 'cloudType', key: 'cloudType' },
      { title: '同步方式', dataIndex: 'syncType', key: 'syncType' },
      { title: '执行计划', dataIndex: 'schedule', key: 'schedule' },
      { title: '状态', key: 'status', width: 80 },
      { title: '最后执行', dataIndex: 'lastRunAt', key: 'lastRunAt', width: 180 },
      { title: '操作', key: 'action', width: 180 }
    ]

    const fetchTasks = async () => {
      loading.value = true
      try {
        const res = await api.getTasks({
          page: pagination.current,
          page_size: pagination.pageSize
        })
        taskList.value = res.data.list
        pagination.total = res.data.total
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    }

    const fetchModels = async () => {
      try {
        const res = await api.getModels()
        models.value = res.data
      } catch (error) {
        console.error(error)
      }
    }

    const handleTableChange = (pag) => {
      pagination.current = pag.current
      pagination.pageSize = pag.pageSize
      fetchTasks()
    }

    const handleModelChange = (value) => {
      formData.modelId = value
    }

    const showAddModal = () => {
      isEdit.value = false
      formData.name = ''
      formData.identify = ''
      formData.modelId = undefined
      formData.cloudType = undefined
      formData.syncType = undefined
      formData.schedule = ''
      formData.status = true
      currentEditId.value = null
      modalVisible.value = true
    }

    const editTask = (record) => {
      isEdit.value = true
      currentEditId.value = record.id
      formData.name = record.name
      formData.identify = record.identify
      formData.modelId = record.model_id
      formData.cloudType = record.cloud_type
      formData.syncType = record.sync_type
      formData.schedule = record.schedule
      formData.status = record.status === 1
      modalVisible.value = true
    }

    const handleSubmit = async () => {
      try {
        await formRef.value.validate()
        submitLoading.value = true

        const data = {
          name: formData.name,
          identify: formData.identify,
          model_id: formData.modelId,
          cloud_type: formData.cloudType,
          sync_type: formData.syncType,
          schedule: formData.schedule,
          status: formData.status ? 1 : 0
        }

        if (isEdit.value) {
          await api.updateTask(currentEditId.value, data)
          message.success('更新成功')
        } else {
          await api.createTask(data)
          message.success('创建成功')
        }

        modalVisible.value = false
        fetchTasks()
      } catch (error) {
        console.error(error)
      } finally {
        submitLoading.value = false
      }
    }

    const handleCancel = () => {
      formRef.value?.resetFields()
    }

    const runTask = async (record) => {
      try {
        await api.runTask(record.id)
        message.success('任务已触发执行')
      } catch (error) {
        console.error(error)
      }
    }

    const deleteTask = async (record) => {
      try {
        await api.deleteTask(record.id)
        message.success('删除成功')
        fetchTasks()
      } catch (error) {
        console.error(error)
      }
    }

    onMounted(() => {
      fetchTasks()
      fetchModels()
    })

    return {
      loading,
      submitLoading,
      taskList,
      models,
      modalVisible,
      isEdit,
      formRef,
      formData,
      formRules,
      pagination,
      columns,
      fetchTasks,
      handleTableChange,
      handleModelChange,
      showAddModal,
      editTask,
      handleSubmit,
      handleCancel,
      runTask,
      deleteTask
    }
  }
})
</script>

<style scoped>
.task-view {
  background: #fff;
  padding: 16px;
}
</style>
