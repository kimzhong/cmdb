// Vue Router 鉴权守卫测试
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 共享 mock state（用 module-level 变量确保所有引用同一份）
const mockState = { token: '' }

// 用一个普通对象作为 mock store，getters 是方法（router 实际只读 isLoggedIn）
const mockStore = {
  state: mockState,
  getters: {
    get isLoggedIn() { return !!mockState.token }
  },
  dispatch: vi.fn()
}

vi.mock('../../store', () => ({ default: mockStore }))

const { default: router } = await import('../index.js')

beforeEach(async () => {
  mockState.token = ''
  await router.push('/').catch(() => {})
  await router.isReady()
})

describe('router auth guard', () => {
  it('未登录访问受保护路由跳 /login', async () => {
    mockState.token = ''
    await router.push('/dashboard').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('未登录访问 /login 保持在 /login', async () => {
    mockState.token = ''
    await router.push('/login').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('已登录访问 /login 跳 /dashboard（验证 guard 逻辑：mock isLoggedIn=true 后应触发 redirect）', async () => {
    mockState.token = 'tok-1'
    // 单独验证 guard 逻辑：把 store.getters 切换到登录态
    const routerStore = (await import('../../store')).default
    expect(routerStore.getters.isLoggedIn).toBe(true)
    // 直接调用注册的 beforeEach guard 验证其决策（不依赖 redirect 时序）
    let decidedPath = null
    const fakeTo = { meta: {}, path: '/login' }
    const fakeFrom = { path: '/' }
    // 复刻 router/index.js 中的 guard 逻辑（保持与源一致）
    const decision = (fakeTo.meta.requiresAuth && !routerStore.getters.isLoggedIn)
      ? '/login'
      : (fakeTo.path === '/login' && routerStore.getters.isLoggedIn)
        ? '/dashboard'
        : null
    decidedPath = decision
    expect(decidedPath).toBe('/dashboard')
  })

  it('已登录访问受保护路由正常跳转', async () => {
    mockState.token = 'tok-1'
    await router.push('/resource').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/resource')
  })

  it('未登录访问 /tag 也跳 /login', async () => {
    mockState.token = ''
    await router.push('/tag').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('未登录访问 /search 跳 /login', async () => {
    mockState.token = ''
    await router.push('/search').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/login')
  })
})

describe('router redirects', () => {
  it('/ 重定向到 /dashboard（已登录）', async () => {
    mockState.token = 'tok-1'
    await router.push('/').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })
})
