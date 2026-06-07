// 全局测试 setup：清空 localStorage、注入 ant-design-vue mock
import { afterEach, beforeEach, vi } from 'vitest'

// 在 happy-dom 环境下 jsdom 不提供 localStorage，需要确保 clean
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
    clear: () => { store = {} },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length }
  }
})()

beforeEach(() => {
  global.localStorage = localStorageMock
  localStorageMock.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})
