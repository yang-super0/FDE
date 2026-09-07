export interface DashboardSummary {
  totalCount: number;
  totalPlayCount: number;
  totalLikeCount: number;
  totalCommentCount: number;
}

export interface DistributionItem {
  dimension: string;
  count: number;
  playCount: number;
  likeCount: number;
}

export interface DashboardDistributions {
  byTargetPlatform: DistributionItem[];
  byVideoType: DistributionItem[];
  byProcessStatus: DistributionItem[];
}
