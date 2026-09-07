import { Inject, Injectable } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { count, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { videoMaterial } from '@server/database/schema';
import type {
  DashboardDistributions,
  DashboardSummary,
  DistributionItem,
} from '@shared/dashboard';

interface SummaryRow {
  totalCount: number;
  totalPlayCount: string | null;
  totalLikeCount: string | null;
  totalCommentCount: string | null;
}

const OTHER_LABEL = '其他';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE_DATABASE)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const rows: SummaryRow[] = await this.db
      .select({
        totalCount: count(),
        totalPlayCount: sql<string | null>`coalesce(sum(${videoMaterial.playCount}), 0)`,
        totalLikeCount: sql<string | null>`coalesce(sum(${videoMaterial.likeCount}), 0)`,
        totalCommentCount: sql<string | null>`coalesce(sum(${videoMaterial.commentCount}), 0)`,
      })
      .from(videoMaterial);

    const row: SummaryRow | undefined = rows[0];
    return {
      totalCount: Number(row?.totalCount ?? 0),
      totalPlayCount: Number(row?.totalPlayCount ?? 0),
      totalLikeCount: Number(row?.totalLikeCount ?? 0),
      totalCommentCount: Number(row?.totalCommentCount ?? 0),
    };
  }

  async getDistributions(): Promise<DashboardDistributions> {
    const [byTargetPlatform, byVideoType, byProcessStatus] =
      await Promise.all([
        this.buildDistribution(videoMaterial.targetPlatform),
        this.buildDistribution(videoMaterial.videoType),
        this.buildDistribution(videoMaterial.processStatus),
      ]);

    return { byTargetPlatform, byVideoType, byProcessStatus };
  }

  private async buildDistribution(
    column: PgColumn,
  ): Promise<DistributionItem[]> {
    const rows = await this.db
      .select({
        dimension: column,
        count: count(),
        playCount: sql<string | null>`coalesce(sum(${videoMaterial.playCount}), 0)`,
        likeCount: sql<string | null>`coalesce(sum(${videoMaterial.likeCount}), 0)`,
      })
      .from(videoMaterial)
      .groupBy(column);

    const merged = new Map<string, DistributionItem>();
    for (const row of rows) {
      const rawDimension: unknown = row.dimension;
      const label: string =
        typeof rawDimension === 'string' && rawDimension !== ''
          ? rawDimension
          : OTHER_LABEL;
      const existing: DistributionItem | undefined = merged.get(label);
      if (existing) {
        existing.count += Number(row.count);
        existing.playCount += Number(row.playCount ?? 0);
        existing.likeCount += Number(row.likeCount ?? 0);
      } else {
        merged.set(label, {
          dimension: label,
          count: Number(row.count),
          playCount: Number(row.playCount ?? 0),
          likeCount: Number(row.likeCount ?? 0),
        });
      }
    }

    const items: DistributionItem[] = Array.from(merged.values());
    items.sort((a: DistributionItem, b: DistributionItem) => b.count - a.count);
    return items;
  }
}
