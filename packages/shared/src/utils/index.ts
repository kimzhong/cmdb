// 共享工具函数

export function ok<T>(data: T) {
  return { code: 0, message: 'ok', data };
}

export function paginate<T>(list: T[], total: number, page: number, pageSize: number) {
  return { list, total, page, pageSize };
}
