import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** 标记无需鉴权的端点，配合全局 Guard 使用 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
