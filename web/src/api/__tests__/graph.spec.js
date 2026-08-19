import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGet = vi.fn()
vi.mock("../index", () => ({
  default: { get: (...args) => mockGet(...args) },
  request: { get: (...args) => mockGet(...args) }
}))

describe("api/graph", () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockResolvedValue({ code: 200, data: { center: "x", depth: 2, nodes: [], edges: [] } })
  })

  it("getRelationGraph 调用 /relations/instances/graph/:id 并带 depth 参数", async () => {
    const { default: graphApi } = await import("../graph")
    await graphApi.getRelationGraph("res-1", 3)
    expect(mockGet).toHaveBeenCalledWith("/relations/instances/graph/res-1", {
      params: { depth: 3 }
    })
  })

  it("getRelationGraph 默认 depth=2", async () => {
    const { default: graphApi } = await import("../graph")
    await graphApi.getRelationGraph("res-1")
    expect(mockGet).toHaveBeenCalledWith("/relations/instances/graph/res-1", {
      params: { depth: 2 }
    })
  })
})
