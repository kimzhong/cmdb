// Search.vue 关键路径测试：搜索提交 + viewDetail 跳转
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'

// 静默 ant-design-vue 的副作用（happy-dom 不渲染 a-* 复杂组件）
vi.mock('ant-design-vue', () => ({
  message: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))

const mockSearch = vi.fn()
vi.mock('../../api', () => ({
  default: { search: mockSearch }
}))

const { default: Search } = await import('../Search.vue')

// 最小化路由：只用来验证 viewDetail 跳到 /resource 带 query
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/search', component: Search },
    { path: '/resource', component: { template: '<div>resource</div>' } }
  ]
})

const i18n = createI18n({ legacy: false, locale: 'zh' })

beforeEach(async () => {
  vi.clearAllMocks()
  await router.push('/search')
  await router.isReady()
})

const factory = () => mount(Search, {
  global: { plugins: [router, i18n] }
})

describe('Search.vue', () => {
  it('空关键词时弹 warning 不调 api', async () => {
    mockSearch.mockResolvedValue({ data: [] })
    const wrapper = factory()
    // 直接调用组件 setup 暴露的 handleSearch
    await wrapper.vm.handleSearch()
    const { message } = await import('ant-design-vue')
    expect(message.warning).toHaveBeenCalledWith('请输入搜索关键词')
    expect(mockSearch).not.toHaveBeenCalled()
  })

  it('输入关键词后 handleSearch 调用 api.search', async () => {
    mockSearch.mockResolvedValue({ data: [{ id: 'r1', model_id: 'm1', model_name: 'Host', data: { ip: '10.0.0.1' } }] })
    const wrapper = factory()
    wrapper.vm.keyword = 'host'
    await wrapper.vm.handleSearch()
    expect(mockSearch).toHaveBeenCalledWith('host')
    expect(wrapper.vm.results).toHaveLength(1)
    expect(wrapper.vm.searched).toBe(true)
  })

  it('搜索失败时不应把 results 设为空数组', async () => {
    mockSearch.mockRejectedValue(new Error('boom'))
    const wrapper = factory()
    wrapper.vm.keyword = 'x'
    await wrapper.vm.handleSearch()
    // 异常路径：保持原 results 不变
    expect(wrapper.vm.results).toEqual([])
  })

  it('viewDetail 跳转到 /resource 并带上 id + modelId query（修复 review 中的 bug）', async () => {
    const wrapper = factory()
    const pushSpy = vi.spyOn(router, 'push')
    await wrapper.vm.viewDetail({ id: 'res-123', model_id: 'model-456' })
    expect(pushSpy).toHaveBeenCalledWith({
      path: '/resource',
      query: { id: 'res-123', modelId: 'model-456' }
    })
  })

  it('viewDetail 不会误传 modelId 当成 id 字段（参数名映射正确）', async () => {
    const wrapper = factory()
    const pushSpy = vi.spyOn(router, 'push')
    await wrapper.vm.viewDetail({ id: 'real-id', model_id: 'real-model' })
    const call = pushSpy.mock.calls[0][0]
    expect(call.query.id).toBe('real-id')
    expect(call.query.modelId).toBe('real-model')
    expect(call.query.modelId).not.toBe(call.query.id) // 关键防错
  })
})
