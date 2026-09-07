import type { IndustryTrendRecord } from '@shared/api.interface';
import { exportRowsToExcel } from '@client/src/pages/AdsBusiness/ads-excel';

export async function exportIndustryTrendRecords(
  items: IndustryTrendRecord[],
): Promise<number> {
  const rows: Record<string, string>[] = items.map(
    (item: IndustryTrendRecord) => ({
      编号: item.trendNo,
      行业: item.industry,
      二级行业: item.subIndustry ?? '',
      平台: item.platform ?? '',
      统计日期: item.statDate,
      总消耗: item.totalConsumption === null || item.totalConsumption === undefined ? '' : String(item.totalConsumption),
      消耗增长率: item.consumptionGrowth === null || item.consumptionGrowth === undefined ? '' : String(item.consumptionGrowth),
      平均CPC: item.avgCpc === null || item.avgCpc === undefined ? '' : String(item.avgCpc),
      CPC变化: item.cpcChange === null || item.cpcChange === undefined ? '' : String(item.cpcChange),
      平均CPM: item.avgCpm === null || item.avgCpm === undefined ? '' : String(item.avgCpm),
      CPM变化: item.cpmChange === null || item.cpmChange === undefined ? '' : String(item.cpmChange),
      转化率: item.avgConversionRate === null || item.avgConversionRate === undefined ? '' : String(item.avgConversionRate),
      转化变化: item.conversionChange === null || item.conversionChange === undefined ? '' : String(item.conversionChange),
      活跃广告主: item.activeAdvertisers === null || item.activeAdvertisers === undefined ? '' : String(item.activeAdvertisers),
      流量指数: item.trafficIndex === null || item.trafficIndex === undefined ? '' : String(item.trafficIndex),
      竞争指数: item.competitionIndex === null || item.competitionIndex === undefined ? '' : String(item.competitionIndex),
      数据来源: item.dataSource,
      备注: item.remark ?? '',
    }),
  );
  return exportRowsToExcel(
    rows,
    [
      '编号', '行业', '二级行业', '平台', '统计日期', '总消耗', '消耗增长率',
      '平均CPC', 'CPC变化', '平均CPM', 'CPM变化', '转化率', '转化变化',
      '活跃广告主', '流量指数', '竞争指数', '数据来源', '备注',
    ],
    '行业大盘',
    '行业大盘',
  );
}
