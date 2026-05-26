import { RestEndpointMethodTypes } from '@octokit/rest';
import { Link } from 'react-aria-components';
import { useDateFormatter } from 'react-aria';
import useSWR, { preload as swrPreload } from 'swr';
import { github } from './client';
import { DiffCodeView } from './DiffCodeView';
import { Avatar } from './components';

type CommitData = RestEndpointMethodTypes['repos']['getCommit']['response']['data'];

async function fetchCommit([, owner, repo, sha]: readonly ['commit', string, string, string]): Promise<CommitData> {
  const res = await github.repos.getCommit({owner, repo, ref: sha});
  return res.data;
}

async function fetchCommitDiff([, owner, repo, sha]: readonly ['commit-diff', string, string, string]): Promise<string> {
  const res = await github.request('GET /repos/{owner}/{repo}/commits/{ref}', {
    owner, repo, ref: sha,
    headers: {accept: 'application/vnd.github.diff'}
  });
  return res.data as unknown as string;
}

export function CommitPage({owner, repo, sha}: {owner: string, repo: string, sha: string}) {
  let {data: commit} = useSWR(['commit', owner, repo, sha] as const, fetchCommit);
  let {data: patch} = useSWR(['commit-diff', owner, repo, sha] as const, fetchCommitDiff);

  if (!commit) return null;

  return (
    <div className="flex flex-col h-full">
      <CommitHeader commit={commit} owner={owner} repo={repo} />
      <div className="border-b border-daw-gray-200 mx-2 shrink-0" />
      <div className="flex-1 min-h-0">
        {patch
          ? <DiffCodeView patch={patch} />
          : <div className="text-sm text-daw-gray-500 py-4 max-w-3xl mx-auto w-full">Loading diff…</div>
        }
      </div>
    </div>
  );
}

CommitPage.preload = (owner: string, repo: string, sha: string) => {
  swrPreload(['commit', owner, repo, sha] as const, fetchCommit);
  swrPreload(['commit-diff', owner, repo, sha] as const, fetchCommitDiff);
};

function CommitHeader({commit, owner, repo}: {commit: CommitData, owner: string, repo: string}) {
  let df = useDateFormatter({year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
  let [title, ...bodyLines] = commit.commit.message.split('\n');
  let body = bodyLines.join('\n').trim();
  let date = commit.commit.author?.date;
  let authorName = commit.author?.login ?? commit.commit.author?.name ?? 'Unknown';
  let avatarUrl = commit.author?.avatar_url ?? '';

  return (
    <div className="flex flex-col gap-2 my-4 mx-2 w-full shrink-0">
      <div className="flex gap-2 items-center">
        <Avatar src={avatarUrl} />
        <span className="text-daw-gray-700">{owner}/{repo}</span>
        <Link target="_blank" href={commit.html_url} className="font-mono text-xs text-daw-gray-500 hover:underline">
          {commit.sha.slice(0, 7)}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {body && <pre className="text-sm text-daw-gray-600 whitespace-pre-wrap font-sans">{body}</pre>}
      <div className="flex items-center gap-2 text-sm text-daw-gray-600">
        <Avatar src={avatarUrl} size="s" />
        <span>{authorName}</span>
        {date && <>
          <span>·</span>
          <span>{df.format(new Date(date))}</span>
        </>}
        <span>·</span>
        <span className="text-daw-gray-500">{commit.stats?.additions ?? 0} additions, {commit.stats?.deletions ?? 0} deletions</span>
      </div>
    </div>
  );
}
