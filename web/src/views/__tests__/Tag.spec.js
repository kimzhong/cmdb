// Tag.vue 关键路径测试：loadTagKeys 字段映射（修复 review 中的 dataIndex 错位）
// 注：loadTagKeys 是 setup 内部函数，onMounted 会自动调用，
// 因此测试通过等待 onMounted 完成 + 检查 tagKeys ref 来验证。
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 静默 ant-design-vue（happy-dom 不完整渲染 a-* 组件，但不影响 setup 内部状态）
vi.mock('ant-design-vue', () => ({
  message: { error: vi.fn(), success: vi.fn(), warning: vi.fn() }
}))

const mockGetTagKeys = vi.fn()
const mockGetTagValues = vi.fn()
vi.mock('../../api', () => ({
  default: {
    getTagKeys: mockGetTagKeys,
    getTagValues: mockGetTagValues,
    searchByTag: vi.fn(),
    getModels: vi.fn(),
    getResources: vi.fn(),
    bindResource: vi.fn(),
    createTagKey: vi.fn(),
    updateTagKey: vi.fn(),
    deleteTagKey: vi.fn(),
    createTagValue: vi.fn(),
    updateTagValue: vi.fn(),
    deleteTagValue: vi.fn()
  }
}))

const { default: Tag } = await import('../Tag.vue')
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

const i18n = createI18n({ legacy: false, locale: 'zh' })

// 抽离公共 factory：mount + 等 onMounted 完成
const mountAndWait = async (mockData) => {
  mockGetTagKeys.mockResolvedValue({ data: mockData })
  mockGetTagValues.mockResolvedValue({ data: [] })
  const wrapper = mount(Tag, { global: { plugins: [i18n] } })
  // onMounted 是异步的，需要等 microtask 完成
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('Tag.vue 字段映射（修复 review 中的 dataIndex 错位）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('后端返回 tag_name/tag_identify → tagKeys 保留这些字段（修复关键 bug）', async () => {
    const wrapper = await mountAndWait([
      { id: 'k1', tag_name: 'env', tag_identify: 'env', description: '环境' },
      { id: 'k2', tag_name: 'team', tag_identify: 'team', description: '团队' }
    ])
    expect(mockGetTagKeys).toHaveBeenCalled()
    expect(wrapper.vm.tagKeys).toEqual([
      { id: 'k1', tag_name: 'env', tag_identify: 'env', description: '环境' },
      { id: 'k2', tag_name: 'team', tag_identify: 'team', description: '团队' }
    ])
  })

  it('兼容后端旧字段（无 tag_name 时降级到 name）', async () => {
    const wrapper = await mountAndWait([
      { id: 'k1', name: 'legacy', identify: 'legacy' }
    ])
    expect(wrapper.vm.tagKeys[0].tag_name).toBe('legacy')
    expect(wrapper.vm.tagKeys[0].tag_identify).toBe('legacy')
  })

  it('editTagKey 能从映射后的对象正确读取字段（修复 review 中的 editTagKey 失效）', async () => {
    const wrapper = await mountAndWait([
      { id: 'k1', tag_name: 'env', tag_identify: 'env', description: '环境' }
    ])
    wrapper.vm.editTagKey({ id: 'k1', tag_name: 'env', tag_identify: 'env', description: '环境' })
    expect(wrapper.vm.keyForm.name).toBe('env')
    expect(wrapper.vm.keyForm.identify).toBe('env')
    expect(wrapper.vm.keyForm.description).toBe('环境')
    expect(wrapper.vm.keyForm.id).toBe('k1')
    expect(wrapper.vm.keyEditing).toBe(true)
  })
})
