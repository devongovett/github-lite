import { RestEndpointMethodTypes } from '@octokit/rest';
import { GitBranchIcon } from '@primer/octicons-react';
import { useDateFormatter } from 'react-aria';
import { Button, ListBox, ListBoxItem, Popover, Select } from 'react-aria-components';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWR, { preload as swrPreload } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useCallback, useState } from 'react';
import { github } from './client';
import { CommitPage } from './Commit';
import { List, ListItem, EmptyDetail } from './List';

const PER_PAGE = 30;

type RawCommit = RestEndpointMethodTypes['repos']['listCommits']['response']['data'][0];
type CommitItem = RawCommit & {id: string};
type BranchItem = RestEndpointMethodTypes['repos']['listBranches']['response']['data'][0];
type RepoInfo = RestEndpointMethodTypes['repos']['get']['response']['data'];
type CommitPageResult = {items: CommitItem[]; hasNext: boolean};

async function fetchRepoInfo([, owner, repo]: readonly ['repo-info', string, string]): Promise<RepoInfo> {
  const res = await github.repos.get({owner, repo});
  return res.data;
}

async function fetchBranches([, owner, repo]: readonly ['branches', string, string]): Promise<BranchItem[]> {
  const res = await github.repos.listBranches({owner, repo, per_page: 100});
  return res.data;
}

async function fetchCommitsPage([, owner, repo, branch, page]: readonly ['commits', string, string, string, number]): Promise<CommitPageResult> {
  const res = await github.repos.listCommits({owner, repo, sha: branch, per_page: PER_PAGE, page});
  return {items: res.data.map(c => ({...c, id: c.sha})), hasNext: res.data.length === PER_PAGE};
}

export function CommitsView() {
  const {owner = '', repo = ''} = useParams<{owner: string, repo: string}>();
  const [branch, setBranch] = useState<string | null>(null);
  const {pathname} = useLocation();

  const {data: repoInfo} = useSWR(['repo-info', owner, repo] as const, fetchRepoInfo);
  const {data: branches} = useSWR(['branches', owner, repo] as const, fetchBranches);

  const effectiveBranch = branch ?? repoInfo?.default_branch ?? 'main';

  const getKey = useCallback((pageIndex: number, prev: CommitPageResult | null) => {
    if (prev && !prev.hasNext) return null;
    return ['commits', owner, repo, effectiveBranch, pageIndex + 1] as const;
  }, [owner, repo, effectiveBranch]);

  const {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getKey, fetchCommitsPage);

  const commits = data?.flatMap(p => p.items) ?? [];
  const isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;
  const hasMore = !data || data[data.length - 1]?.hasNext !== false;

  const header = (
    <div className="p-2 border-b border-daw-gray-200 shrink-0">
      <BranchSelector branches={branches ?? []} value={effectiveBranch} onChange={setBranch} />
    </div>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <List
        aria-label={`Commits — ${owner}/${repo}`}
        items={commits}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        header={header}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {commit => <CommitListItem commit={commit} owner={owner} repo={repo} />}
      </List>
      <div className="flex-1 overflow-auto flex flex-col">
        <Routes>
          <Route index element={<EmptyDetail text="No commit selected." />} />
          <Route path=":sha" element={<CommitRouteElement />} />
        </Routes>
      </div>
    </div>
  );
}

CommitsView.preload = async function (owner: string, repo: string) {
  const repoInfo = await swrPreload(['repo-info', owner, repo] as const, fetchRepoInfo);
  const branch = repoInfo?.default_branch ?? 'main';
  await swrPreload(['commits', owner, repo, branch, 1] as const, fetchCommitsPage)
};

function BranchSelector({branches, value, onChange}: {
  branches: BranchItem[];
  value: string;
  onChange: (branch: string) => void;
}) {
  return (
    <Select selectedKey={value} onSelectionChange={key => onChange(key as string)} aria-label="Branch">
      <Button className="flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-md border border-daw-gray-200 hover:bg-daw-gray-100 cursor-default outline-none focus-visible:ring-2 ring-blue-600 w-full">
        <GitBranchIcon size={13} className="shrink-0" />
        <span className="flex-1 text-left truncate">{value}</span>
      </Button>
      <Popover placement="bottom" offset={4} className="bg-white dark:bg-neutral-900 border border-daw-gray-200 rounded-lg shadow-xl outline-none w-[--trigger-width] max-h-72 overflow-y-auto">
        <ListBox className="outline-none p-1 flex flex-col" items={branches}>
          {b => (
            <ListBoxItem
              id={b.name}
              textValue={b.name}
              className="text-sm px-2 py-1.5 rounded cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600">
              {b.name}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </Select>
  );
}

function CommitListItem({commit, owner, repo}: {commit: CommitItem, owner: string, repo: string}) {
  let df = useDateFormatter({month: 'short', day: 'numeric', year: 'numeric'});
  let title = commit.commit.message.split('\n')[0];
  let author = commit.author?.login ?? commit.commit.author?.name ?? 'Unknown';
  let date = commit.commit.author?.date ? df.format(new Date(commit.commit.author.date)) : '';

  return (
    <ListItem
      id={`/${owner}/${repo}/commits/${commit.sha}`}
      href={`/${owner}/${repo}/commits/${commit.sha}`}
      textValue={title}
      onHoverStart={() => CommitPage.preload(owner, repo, commit.sha)}
      label={title}
      description={`${author} · ${date}`}
    />
  );
}

function CommitRouteElement() {
  let {owner, repo, sha} = useParams<{owner: string, repo: string, sha: string}>();
  return <CommitPage key={sha} owner={owner!} repo={repo!} sha={sha!} />;
}
