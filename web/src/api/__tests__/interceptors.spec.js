// 验证 src/api/index.js 的请求/响应拦截器
import { describe, it, expect, beforeEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'

// mock ant-design-vue message
vi.mock('ant-design-vue', () => ({
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

// mock store：api/index.js 通过 store.state.token 拿 token
const mockStoreState = { token: '' }
const mockStore = {
  state: mockStoreState,
  getters: { get isLoggedIn() { return !!mockStoreState.token } },
  dispatch: vi.fn()
}
vi.mock('../../store', () => ({ default: mockStore }))

// mock window.location 防止 401 路径的跳转影响测试
const originalLocation = window.location
delete window.location
window.location = { href: '' }

const { request } = await import('../index.js')
const mock = new MockAdapter(request)

describe('API request interceptor', () => {
  beforeEach(() => {
    mock.reset()
    mockStoreState.token = ''
  })

  it('无 token 时不注入 Authorization 头', async () => {
    let captured = null
    mock.onGet('/users').reply((config) => {
      captured = config.headers
      return [200, { code: 200, data: [], message: 'success' }]
    })
    await request.get('/users')
    expect(captured.Authorization).toBeUndefined()
  })

  it('store 中有 token 时自动注入 Authorization: Bearer <token>', async () => {
    mockStoreState.token = 'test-token-abc'
    let captured = null
    mock.onGet('/users').reply((config) => {
      captured = config.headers
      return [200, { code: 200, data: [], message: 'success' }]
    })
    await request.get('/users')
    expect(captured.Authorization).toBe('Bearer test-token-abc')
  })
})

describe('API response interceptor', () => {
  beforeEach(() => {
    mock.reset()
  })

  it('code===200 直接放行 data（拦截器返回 response.data）', async () => {
    mock.onGet('/users').reply(200, { code: 200, data: [{ id: '1' }], message: 'ok' })
    const res = await request.get('/users')
    // 响应拦截器在 code===200 时直接 return response.data，所以 res 就是 data 本身
    expect(res.code).toBe(200)
    expect(res.data).toEqual([{ id: '1' }])
  })

  it('code!==200 弹错误并 reject', async () => {
    const { message } = await import('ant-design-vue')
    mock.onGet('/users').reply(200, { code: 500, message: '服务器错误' })
    await expect(request.get('/users')).rejects.toBeTruthy()
    expect(message.error).toHaveBeenCalledWith('服务器错误')
  })

  it('401 触发 logout + 跳转 /login', async () => {
    const { message } = await import('ant-design-vue')
    mock.onGet('/users').reply(401, { code: 401, message: 'unauthorized' })
    await expect(request.get('/users')).rejects.toBeTruthy()
    expect(message.error).toHaveBeenCalledWith('登录已过期，请重新登录')
    expect(mockStore.dispatch).toHaveBeenCalledWith('logout')
    expect(window.location.href).toBe('/login')
  })

  it('网络错误（非 401）弹通用错误', async () => {
    const { message } = await import('ant-design-vue')
    mock.onGet('/users').networkError()
    await expect(request.get('/users')).rejects.toBeTruthy()
    expect(message.error).toHaveBeenCalled()
  })
})
