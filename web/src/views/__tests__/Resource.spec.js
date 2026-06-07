// Resource.vue 关键路径测试：mount 不应崩溃 + 路由 query 消费
// 修复 review 中 Search.vue 跳转 bug 后，确保 Resource.vue 自身 mount 稳定
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

vi.mock('ant-design-vue', () => ({
  message: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))

const mockGetResources = vi.fn()
const mockGetModelGroups = vi.fn()
const mockGetModels = vi.fn()
const mockGetModelDetails = vi.fn()
const mockGetResource = vi.fn()
const mockGetResourceRelations = vi.fn()
const mockGetAllTagValues = vi.fn()

vi.mock('../../api', () => ({
  default: {
    getResources: mockGetResources,
    getModelGroups: mockGetModelGroups,
    getModels: mockGetModels,
    getModelDetails: mockGetModelDetails,
    getFields: vi.fn(),
    getResource: mockGetResource,
    getResourceRelations: mockGetResourceRelations,
    getAllTagValues: mockGetAllTagValues,
    createResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    batchDeleteResources: vi.fn()
  }
}))

const { default: Resource } = await import('../Resource.vue')

// 收集 unhandled 错误
const unhandled = []
const origError = console.error
console.error = (...args) => {
  unhandled.push(args.join(' '))
  origError(...args)
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/resource', component: Resource },
    { path: '/', component: { template: '<div/>' } }
  ]
})

beforeEach(async () => {
  vi.clearAllMocks()
  unhandled.length = 0
  await router.push('/').catch(() => {})
  await router.isReady()
})

describe('Resource.vue mount 稳定性（修复 useRoute 在 onMounted 调用 bug）', () => {
  it('无 query 直接 mount 不应抛运行时错误', async () => {
    mockGetModelGroups.mockResolvedValue({ data: [] })
    mockGetModels.mockResolvedValue({ data: [] })
    mockGetResources.mockResolvedValue({ data: { list: [], total: 0 } })
    mockGetModelDetails.mockResolvedValue({ data: { fields: [], field_groups: [] } })

    const wrapper = mount(Resource, { global: { plugins: [router] } })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    // 关键断言：useRoute() 在 onMounted 中调用不再抛 "Cannot read properties of undefined (reading 'query')"
    const fatal = unhandled.filter(e => e.includes('TypeError') || e.includes('ReferenceError'))
    expect(fatal).toEqual([])
  })

  it('带 ?id=&modelId= query（来自 Search.vue 跳转）应自动打开详情', async () => {
    mockGetModelGroups.mockResolvedValue({
      data: [{ id: 'g1', identify: 'srv', name: '服务器', category: '资产' }]
    })
    mockGetModels.mockResolvedValue({
      data: [{ id: 'm1', identify: 'host', name: '主机', model_group_id: 'g1' }]
    })
    mockGetResources.mockResolvedValue({
      data: { list: [{ id: 'r1', model_identify: 'host', data: { ip: '10.0.0.1' } }], total: 1 }
    })
    mockGetModelDetails.mockResolvedValue({ data: { fields: [], field_groups: [] } })
    mockGetResource.mockResolvedValue({
      data: { id: 'r1', model_identify: 'host', data: { ip: '10.0.0.1' }, tags: [] }
    })
    mockGetResourceRelations.mockResolvedValue({
      data: { belong: { own: [], reverse: [] }, connect: { own: [], reverse: [] } }
    })
    mockGetAllTagValues.mockResolvedValue({ data: [] })

    await router.push({ path: '/resource', query: { id: 'r1', modelId: 'm1' } })
    await router.isReady()
    const wrapper = mount(Resource, { global: { plugins: [router] } })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    const fatal = unhandled.filter(e => e.includes('TypeError') || e.includes('ReferenceError'))
    expect(fatal).toEqual([])
    // 验证自动调用了 getResource 加载详情
    expect(mockGetResource).toHaveBeenCalledWith('r1')
  })
})
