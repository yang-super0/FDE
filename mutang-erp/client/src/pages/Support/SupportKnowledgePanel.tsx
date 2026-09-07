import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { KnowledgeDoc, KnowledgeDocDetail } from '@shared/api.interface';
import { ReportCard, StatusBadge } from '@client/src/components/blueprint';
import { Input } from '@client/src/components/ui/input';
import { cn } from '@client/src/lib/utils';
import { getKnowledgeDocs, getKnowledgeDocDetail } from '@client/src/api/support';

const SupportKnowledgePanel = () => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, KnowledgeDocDetail>>(
    {},
  );
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getKnowledgeDocs({});
        const unique: string[] = [
          ...new Set(result.items.map((doc: KnowledgeDoc) => doc.category)),
        ];
        setCategories(unique);
      } catch (error) {
        logger.error('获取知识分类失败', error);
      }
    };
    void loadCategories();
  }, []);

  useEffect(() => {
    const loadDocs = async () => {
      setLoading(true);
      try {
        const result = await getKnowledgeDocs({
          category: category || undefined,
          keyword: keyword || undefined,
        });
        setDocs(result.items);
      } catch (error) {
        logger.error('获取知识库列表失败', error);
        toast.error('获取知识库列表失败');
      } finally {
        setLoading(false);
      }
    };
    void loadDocs();
  }, [category, keyword]);

  const handleToggle = async (doc: KnowledgeDoc) => {
    if (expandedId === doc.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(doc.id);
    if (!detailMap[doc.id]) {
      setDetailLoadingId(doc.id);
      try {
        const detail = await getKnowledgeDocDetail(doc.id);
        setDetailMap((prev) => ({ ...prev, [doc.id]: detail }));
      } catch (error) {
        logger.error('获取文档内容失败', error);
        toast.error('文档内容加载失败');
        setExpandedId(null);
      } finally {
        setDetailLoadingId(null);
      }
    }
  };

  const chipClass = (active: boolean): string =>
    cn(
      'px-3 py-1 text-xs font-bold rounded-[2px] border transition-colors',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
    );

  return (
    <ReportCard>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chipClass(category === '')}
            onClick={() => setCategory('')}
          >
            全部
          </button>
          {categories.map((item: string) => (
            <button
              key={item}
              type="button"
              className={chipClass(category === item)}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索文档标题或摘要"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          加载中...
        </div>
      ) : docs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          暂无相关文档
        </div>
      ) : (
        <div>
          {docs.map((doc: KnowledgeDoc) => {
            const expanded: boolean = expandedId === doc.id;
            const detail: KnowledgeDocDetail | undefined = detailMap[doc.id];
            return (
              <div key={doc.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  className="w-full flex items-start gap-3 px-2 py-4 text-left transition-colors hover:bg-accent"
                  onClick={() => void handleToggle(doc)}
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {doc.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {doc.summary}
                    </div>
                  </div>
                  <StatusBadge tone="info" className="shrink-0 mt-0.5">
                    {doc.category}
                  </StatusBadge>
                </button>
                {expanded ? (
                  <div className="px-10 pb-5">
                    {detailLoadingId === doc.id ? (
                      <div className="text-xs text-muted-foreground py-2">
                        内容加载中...
                      </div>
                    ) : detail ? (
                      <div>
                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.15em] mb-2">
                          {detail.category} · 发布于{' '}
                          {dayjs(detail.createdAt).format('YYYY-MM-DD')}
                        </div>
                        <div className="text-sm leading-6 text-foreground/80 whitespace-pre-wrap break-words">
                          {detail.content}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </ReportCard>
  );
};

export { SupportKnowledgePanel };
