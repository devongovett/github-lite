import { CodeView } from '@pierre/diffs/react';
import { parsePatchFiles, type CodeViewDiffItem, type DiffLineAnnotation } from '@pierre/diffs';
import type { PullRequestReviewThread } from '@octokit/graphql-schema';

type Thread = PullRequestReviewThread;
type ThreadAnnotation = DiffLineAnnotation<Thread>;

export function DiffCodeView({patch, threads = [], renderAnnotation}: {
  patch: string;
  threads?: Thread[];
  renderAnnotation?: (annotation: ThreadAnnotation) => React.ReactNode;
}) {
  let threadsByPath = new Map<string, Thread[]>();
  for (let thread of threads) {
    if (!thread.path || thread.line == null) continue;
    let list = threadsByPath.get(thread.path);
    if (!list) threadsByPath.set(thread.path, list = []);
    list.push(thread);
  }

  let items: CodeViewDiffItem<Thread>[] = parsePatchFiles(patch).flatMap((parsed, pi) =>
    parsed.files.map((file, fi) => {
      let fileThreads = threadsByPath.get(file.name) ?? [];
      let annotations: ThreadAnnotation[] = fileThreads.map(thread => ({
        side: thread.diffSide === 'LEFT' ? 'deletions' : 'additions',
        lineNumber: thread.line!,
        metadata: thread,
      }));
      return { id: `${pi}:${fi}:${file.name}`, type: 'diff' as const, fileDiff: file, annotations };
    })
  );

  return (
    <CodeView
      items={items}
      options={{
        theme: { dark: 'pierre-dark', light: 'pierre-light' },
        themeType: 'system',
        stickyHeaders: true,
        diffStyle: 'unified',
        enableGutterUtility: true
      }}
      className="h-full overflow-auto px-4"
      renderAnnotation={renderAnnotation}
    />
  );
}
