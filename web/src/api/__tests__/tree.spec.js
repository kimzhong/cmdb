import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import MockAdapter from "axios-mock-adapter"

// 通过 vi.mock 拦截 api/index.js 暴露的 request 实例
const mockGet = vi.fn()
vi.mock("../index", () => ({
  default: { get: (...args) => mockGet(...args) },
  request: { get: (...args) => mockGet(...args) }
}))

describe("api/tree", () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockResolvedValue({ code: 200, data: { branches: [] } })
  })

  it("getResourceTree 调用 /resources/tree 并附带 model_id 与 group_by 参数", async () => {
    const { default: treeApi } = await import("../tree")
    await treeApi.getResourceTree("m-1", "env")
    expect(mockGet).toHaveBeenCalledWith("/resources/tree", {
      params: { model_id: "m-1", group_by: "env" }
    })
  })
})
