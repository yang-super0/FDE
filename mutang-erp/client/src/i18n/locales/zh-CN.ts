// 中文（简体）语言包聚合。Messages 类型以 zh-CN 字典为基准，
// en-US 字典必须与其 key 结构完全一致（由 TypeScript 编译期约束）。

import { commonZh } from './common';
import { menuZh } from './menu';
import { enumsZh } from './enums';
import { modulesZh } from './modules';
import { dashboardZh } from './dashboard';

const zhCN = {
  common: commonZh,
  menu: menuZh,
  enums: enumsZh,
  dashboard: dashboardZh,
  ...modulesZh,
};

export type Messages = typeof zhCN;
export { zhCN };
