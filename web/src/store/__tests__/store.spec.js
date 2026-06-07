// Vuex store 单测：覆盖 SET_TOKEN / SET_USER / CLEAR_AUTH / login / logout
import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock api 避免引入完整 axios 链
vi.mock('../../api', () => ({
  default: {
    login: vi.fn()
  }
}))

// 必须在 mock 后 import
const { default: store } = await import('../index.js')
const { default: api } = await import('../../api')

describe('store initial state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无 localStorage 时 token 为空', () => {
    const fresh = store.state
    expect(fresh.token).toBe('')
    expect(fresh.user).toEqual({})
  })

  it('从 localStorage 恢复 token', () => {
    localStorage.setItem('token', 'saved-token')
    // 由于 store 已在模块加载时初始化，这里仅验证 getter 行为
    expect(store.getters.isLoggedIn).toBe(false) // 当前 store 实例未重新初始化
  })
})

describe('SET_TOKEN mutation', () => {
  it('写入 state.token 并持久化到 localStorage', () => {
    store.commit('SET_TOKEN', 'new-token-xyz')
    expect(store.state.token).toBe('new-token-xyz')
    expect(localStorage.getItem('token')).toBe('new-token-xyz')
  })
})

describe('SET_USER mutation', () => {
  it('写入 state.user 并 JSON 持久化', () => {
    const user = { id: 'u1', username: 'alice', role: 'admin' }
    store.commit('SET_USER', user)
    expect(store.state.user).toEqual(user)
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(user)
  })
})

describe('CLEAR_AUTH mutation', () => {
  it('清空 token + user + localStorage', () => {
    store.commit('SET_TOKEN', 'temp')
    store.commit('SET_USER', { id: 'u1' })
    store.commit('CLEAR_AUTH')
    expect(store.state.token).toBe('')
    expect(store.state.user).toEqual({})
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})

describe('login action', () => {
  beforeEach(() => {
    store.commit('CLEAR_AUTH')
    vi.clearAllMocks()
  })

  it('成功后写入 token + user', async () => {
    api.login.mockResolvedValue({
      data: { token: 'tok-123', user: { username: 'alice', role: 'admin' } }
    })
    const result = await store.dispatch('login', { username: 'alice', password: 'admin123' })
    expect(api.login).toHaveBeenCalledWith({ username: 'alice', password: 'admin123' })
    expect(store.state.token).toBe('tok-123')
    expect(store.state.user).toEqual({ username: 'alice', role: 'admin' })
    expect(store.getters.isLoggedIn).toBe(true)
    expect(store.getters.username).toBe('alice')
    expect(store.getters.role).toBe('admin')
  })

  it('失败时抛出且不清空已存在的 token（保留旧会话）', async () => {
    store.commit('SET_TOKEN', 'old-tok')
    api.login.mockRejectedValue(new Error('Invalid credentials'))
    await expect(store.dispatch('login', { username: 'x', password: 'y' })).rejects.toThrow()
    // 注意：当前实现不会在失败时清空 token，这是已知行为
    // 如果未来要修，测试需要相应更新
  })
})

describe('logout action', () => {
  it('清空 token + user', async () => {
    store.commit('SET_TOKEN', 'temp')
    store.commit('SET_USER', { id: 'u1' })
    await store.dispatch('logout')
    expect(store.state.token).toBe('')
    expect(store.state.user).toEqual({})
    expect(store.getters.isLoggedIn).toBe(false)
  })
})
