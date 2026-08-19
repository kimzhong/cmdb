import request from "./index"

export default {
  getRelationGraph(resourceId, depth = 2) {
    return request.get(`/relations/instances/graph/${resourceId}`, {
      params: { depth }
    })
  }
}
