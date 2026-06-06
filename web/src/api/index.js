import axios from 'axios'
import { message } from 'ant-design-vue'
import store from '../store'

const request = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = store.state.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    if (response.data.code === 200) {
      return response.data
    }
    message.error(response.data.message || '请求失败')
    return Promise.reject(response.data)
  },
  error => {
    if (error.response?.status === 401) {
      message.error('登录已过期，请重新登录')
      store.dispatch('logout')
      window.location.href = '/login'
    } else {
      message.error(error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export default {
  // 登录
  login(data) {
    return request.post('/login', data)
  },

  // 用户
  getUsers(params) {
    return request.get('/users', { params })
  },

  // 模型分组
  getModelGroups(params) {
    return request.get('/model-groups', { params })
  },
  createModelGroup(data) {
    return request.post('/model-groups', data)
  },
  updateModelGroup(id, data) {
    return request.put(`/model-groups/${id}`, data)
  },
  deleteModelGroup(id) {
    return request.delete(`/model-groups/${id}`)
  },

  // 模型
  getModels(params) {
    return request.get('/models', { params })
  },
  getModelDetails(id) {
    return request.get(`/models/${id}/details`)
  },
  createModel(data) {
    return request.post('/models', data)
  },
  updateModel(id, data) {
    return request.put(`/models/${id}`, data)
  },
  deleteModel(id) {
    return request.delete(`/models/${id}`)
  },

  // 字段分组
  getFieldGroups(modelId) {
    return request.get(`/models/${modelId}/field-groups`)
  },
  createFieldGroup(data) {
    return request.post('/field-groups', data)
  },
  updateFieldGroup(id, data) {
    return request.put(`/field-groups/${id}`, data)
  },
  deleteFieldGroup(id) {
    return request.delete(`/field-groups/${id}`)
  },

  // 字段
  getFields(fieldGroupId) {
    return request.get(`/field-groups/${fieldGroupId}/fields`)
  },
  createField(data) {
    return request.post('/fields', data)
  },
  updateField(id, data) {
    return request.put(`/fields/${id}`, data)
  },
  deleteField(id) {
    return request.delete(`/fields/${id}`)
  },

  // 资源
  getResources(modelId, params) {
    return request.get(`/resources/model/${modelId}`, { params })
  },
  getResource(id) {
    return request.get(`/resources/${id}`)
  },
  createResource(data) {
    return request.post('/resources', data)
  },
  updateResource(id, data) {
    return request.put(`/resources/${id}`, data)
  },
  deleteResource(id) {
    return request.delete(`/resources/${id}`)
  },
  // 资源关系
  getResourceRelations(id) {
    return request.get(`/resources/${id}/relations`)
  },
  addResourceRelation(id, data) {
    return request.post(`/resources/${id}/relations`, data)
  },
  removeResourceRelation(id, identify) {
    return request.delete(`/resources/${id}/relations/${identify}`)
  },

  // 全局搜索
  search(keyword) {
    return request.get('/search', { params: { keyword } })
  },

  // 标签
  getTagKeys() {
    return request.get('/tags')
  },
  createTagKey(data) {
    return request.post('/tags', data)
  },
  updateTagKey(id, data) {
    return request.put(`/tags/${id}`, data)
  },
  deleteTagKey(id) {
    return request.delete(`/tags/${id}`)
  },
  getTagValues(tagKeyId) {
    return request.get(`/tags/${tagKeyId}/values`)
  },
  getAllTagValues() {
    return request.get('/tags/values/all')
  },
  createTagValue(data) {
    return request.post('/tags/values', data)
  },
  updateTagValue(id, data) {
    return request.put(`/tags/values/${id}`, data)
  },
  deleteTagValue(id) {
    return request.delete(`/tags/values/${id}`)
  },
  bindResource(tagValueId, resourceIds) {
    return request.post(`/tags/values/${tagValueId}/bind`, { resource_ids: resourceIds })
  },
  unbindResource(tagValueId, resourceIds) {
    return request.delete(`/tags/values/${tagValueId}/unbind`, { data: { resource_ids: resourceIds } })
  },

  // 统计数据
  getStats() {
    return request.get('/stats')
  },

  // 应用管理
  getApps(params) {
    return request.get('/apps', { params })
  },
  getApp(id) {
    return request.get(`/apps/${id}`)
  },
  createApp(data) {
    return request.post('/apps', data)
  },
  updateApp(id, data) {
    return request.put(`/apps/${id}`, data)
  },
  deleteApp(id) {
    return request.delete(`/apps/${id}`)
  },
  getAppResources(id) {
    return request.get(`/apps/${id}/resources`)
  },

  // 业务管理
  getBusinesses(params) {
    return request.get('/businesses', { params })
  },
  getBusiness(id) {
    return request.get(`/businesses/${id}`)
  },
  createBusiness(data) {
    return request.post('/businesses', data)
  },
  updateBusiness(id, data) {
    return request.put(`/businesses/${id}`, data)
  },
  deleteBusiness(id) {
    return request.delete(`/businesses/${id}`)
  },
  getBusinessApps(id) {
    return request.get(`/businesses/${id}/apps`)
  },

  // 定时任务
  getTasks(params) {
    return request.get('/tasks', { params })
  },
  getTask(id) {
    return request.get(`/tasks/${id}`)
  },
  createTask(data) {
    return request.post('/tasks', data)
  },
  updateTask(id, data) {
    return request.put(`/tasks/${id}`, data)
  },
  deleteTask(id) {
    return request.delete(`/tasks/${id}`)
  },
  runTask(id) {
    return request.post(`/tasks/${id}/run`)
  }
}
