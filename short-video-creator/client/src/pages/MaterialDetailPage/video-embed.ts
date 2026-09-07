export type VideoEmbedResult =
  | { kind: 'embed'; platform: string; embedUrl: string }
  | { kind: 'fallback'; platform: string };

const BV_PATTERN: RegExp = /BV[0-9A-Za-z]{10}/u;

const PLATFORM_NAMES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /douyin\.com|iesdouyin\.com/u, name: '抖音' },
  { pattern: /xiaohongshu\.com|xhslink\.com/u, name: '小红书' },
  { pattern: /kuaishou\.com|chenzhongtech\.com/u, name: '快手' },
  { pattern: /channels\.weixin\.qq\.com|weixin\.qq\.com/u, name: '微信视频号' },
  { pattern: /b23\.tv/u, name: 'B站（短链）' },
];

function parseBilibili(link: string): VideoEmbedResult | null {
  const bvMatch: RegExpMatchArray | null = link.match(BV_PATTERN);
  if (bvMatch) {
    return {
      kind: 'embed',
      platform: 'B站',
      embedUrl: `https://player.bilibili.com/player.html?bvid=${bvMatch[0]}&autoplay=0&high_quality=1`,
    };
  }
  if (/bilibili\.com|b23\.tv/u.test(link)) {
    return { kind: 'fallback', platform: 'B站（短链）' };
  }
  return null;
}

function parseYouTube(link: string): VideoEmbedResult | null {
  let videoId: string | null = null;
  const watchMatch: RegExpMatchArray | null = link.match(
    /youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{6,})/u,
  );
  if (watchMatch) {
    videoId = watchMatch[1];
  } else {
    const pathMatch: RegExpMatchArray | null = link.match(
      /(?:youtu\.be|youtube\.com\/(?:shorts|embed|v))\/([A-Za-z0-9_-]{6,})/u,
    );
    if (pathMatch) {
      videoId = pathMatch[1];
    }
  }
  if (videoId) {
    return {
      kind: 'embed',
      platform: 'YouTube',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };
  }
  if (/youtube\.com|youtu\.be/u.test(link)) {
    return { kind: 'fallback', platform: 'YouTube' };
  }
  return null;
}

export function parseVideoEmbed(videoLink: string): VideoEmbedResult {
  const link: string = videoLink.trim();
  if (!link) {
    return { kind: 'fallback', platform: '外部视频' };
  }

  const bilibili: VideoEmbedResult | null = parseBilibili(link);
  if (bilibili) {
    return bilibili;
  }

  const youtube: VideoEmbedResult | null = parseYouTube(link);
  if (youtube) {
    return youtube;
  }

  const normalized: string = /^https?:\/\//iu.test(link)
    ? link
    : `https://${link}`;
  let hostname: string = '';
  try {
    hostname = new URL(normalized).hostname.toLowerCase();
  } catch {
    return { kind: 'fallback', platform: '外部视频' };
  }

  const matched = PLATFORM_NAMES.find((item: { pattern: RegExp; name: string }) =>
    item.pattern.test(hostname),
  );
  return { kind: 'fallback', platform: matched?.name ?? '外部视频' };
}
