// 元模型（分类 / 模型分组 / 模型）相关类型

/** 模型分类：4 种内置 */
export enum ModelCategory {
  Asset = 'asset',       // 资产模型
  Application = 'app',   // 应用模型
  Organization = 'org',  // 组织模型
  Other = 'other',       // 其他
}

export interface Category {
  id: string;
  uid: string;          // 唯一标识
  name: string;
  icon?: string;
  order: number;
  builtin: boolean;
  createdAt: string;
  updatedAt: string;
}
