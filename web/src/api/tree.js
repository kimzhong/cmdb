import request from "./index"

export default {
  // 资源树形视图：按 data[group_by] 分层
  // group_by 默认 "唯一标识"
  getResourceTree(modelId, groupBy) {
    return request.get("/resources/tree", {
      params: { model_id: modelId, group_by: groupBy }
    })
  }
}
