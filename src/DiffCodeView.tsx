import { CodeView } from '@pierre/diffs/react';
import { parsePatchFiles, type CodeViewDiffItem, type DiffLineAnnotation, type SelectedLineRange } from '@pierre/diffs';
import type { PullRequestReviewThread } from '@octokit/graphql-schema';
import { useMemo } from 'react';

type Thread = PullRequestReviewThread;
type ThreadOrNull = Thread | null;
type ThreadAnnotation = DiffLineAnnotation<ThreadOrNull>;

export interface PendingComment {
  path: string;
  line: number;
  side: 'additions' | 'deletions';
}

const threadsVersion = new WeakMap<any, number>();
let version = 1;

export function DiffCodeView({patch, threads = [], pendingComment, renderAnnotation, onGutterUtilityClick}: {
  patch: string;
  threads?: Thread[];
  pendingComment?: PendingComment | null;
  renderAnnotation?: (annotation: ThreadAnnotation) => React.ReactNode;
  onGutterUtilityClick?: (path: string, line: number, side: 'additions' | 'deletions') => void;
}) {
  let files = useMemo(() => parsePatchFiles(patch), [patch]);
  let items: CodeViewDiffItem<ThreadOrNull>[] = useMemo(() => {
    let threadVersion = threadsVersion.get(threads);
    if (!threadVersion) {
      threadVersion = version++;
      threadsVersion.set(threads, threadVersion);
    }

    let threadsByPath = new Map<string, Thread[]>();
    for (let thread of threads) {
      if (!thread.path || thread.line == null) continue;
      let list = threadsByPath.get(thread.path);
      if (!list) threadsByPath.set(thread.path, list = []);
      list.push(thread);
    }

    return files.flatMap((parsed, pi) =>
      parsed.files.map((file, fi) => {
        let fileThreads = threadsByPath.get(file.name) ?? [];
        let annotations: ThreadAnnotation[] = fileThreads.map(thread => ({
          side: thread.diffSide === 'LEFT' ? 'deletions' as const : 'additions' as const,
          lineNumber: thread.line!,
          metadata: thread,
        }));

        let version = threadVersion;
        if (pendingComment && pendingComment.path === file.name) {
          annotations = [...annotations, {
            side: pendingComment.side,
            lineNumber: pendingComment.line,
            metadata: null,
          }];
          version++;
        }

        return { id: `${pi}:${fi}:${file.name}`, type: 'diff' as const, fileDiff: file, annotations, version } satisfies CodeViewDiffItem<ThreadOrNull>;
      })
    )
  }, [files, threads, pendingComment]);

  return (
    <CodeView
      items={items}
      options={{
        theme: { dark: 'pierre-dark', light: 'pierre-light' },
        themeType: 'system',
        stickyHeaders: true,
        diffStyle: 'unified',
        ...(onGutterUtilityClick && {
          enableGutterUtility: true,
          onGutterUtilityClick: ((range: SelectedLineRange, context: any) => {
            if (context?.type === 'diff') {
              onGutterUtilityClick(
                context.item.fileDiff.name,
                range.end,
                (range.endSide ?? range.side ?? 'additions') as 'additions' | 'deletions'
              );
            }
          }) as any
        })
      }}
      className="h-full overflow-auto px-4 [&>div]:m-0! diff-code-view"
      renderAnnotation={renderAnnotation}
    />
  );
}
