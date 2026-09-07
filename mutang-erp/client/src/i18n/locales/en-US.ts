// 英文（美国）语言包聚合，key 结构与 zh-CN 完全一致。

import { commonEn } from './common';
import { menuEn } from './menu';
import { enumsEn } from './enums';
import { modulesEn } from './modules';
import { dashboardEn } from './dashboard';
import type { Messages } from './zh-CN';

const enUS: Messages = {
  common: commonEn,
  menu: menuEn,
  enums: enumsEn,
  dashboard: dashboardEn,
  ...modulesEn,
};

export { enUS };
