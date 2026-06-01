import { IssuePage } from './Issue';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import useSWR, { preload as swrPreload } from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { CommentIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';
import { Button, Input, RadioGroup, TextField } from 'react-aria-components';
import { graphql } from './client';
import {
  FilterSection, RadioItem, LabelTagGroup, SearchBar, FilterPopoverWrapper,
  fetchLabels, SORT_OPTIONS,
  type RepoLabel,
} from './Filters';
import { Issue } from '@octokit/graphql-schema';
import { emojis } from './CommentCard';
import { GithubLabel, IssueTypeBadge } from './components';

type IssuesPageResult = {
  nodes: Issue[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type IssuesKey = readonly ['issues', string, string];

const SEARCH_QUERY = `
query SearchIssues($q: String!, $cursor: String) {
  search(query: $q, type: ISSUE, first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on Issue {
        id number title state
        author { login }
        issueType { color name }
        comments {
          totalCount
        }
        reactionGroups {
          content
          reactors {
            totalCount
          }
        }
      }
    }
  }
}
`;

async function fetchIssuesPage([, query, cursor]: IssuesKey): Promise<IssuesPageResult> {
  const data = await graphql<{search: IssuesPageResult}>(SEARCH_QUERY, {q: query, cursor: cursor || undefined});
  return data.search;
}

function buildIssuesQuery(owner: string, repo: string, search: string, author: string, status: string, labels: string[], sort: string): string {
  const parts = [`repo:${owner}/${repo}`, 'is:issue'];
  if (status !== 'all') parts.push(`is:${status}`);
  if (author) parts.push(`author:${author}`);
  for (const label of labels) parts.push(`label:"${label}"`);
  if (search) parts.push(search);
  if (sort) parts.push(`sort:${sort}`);
  return parts.join(' ');
}

const TYPE_LABEL_NAMES = ['bug', 'enhancement', 'feature', 'feature request', 'question', 'documentation'];

export function IssuesView() {
  let {owner = '', repo = ''} = useParams<{owner: string, repo: string}>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [issueType, setIssueType] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [author, setAuthor] = useState('');
  const [sort, setSort] = useState('created-desc');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => setAuthor(authorInput), 500);
    return () => clearTimeout(timer);
  }, [authorInput]);

  const {pathname} = useLocation();
  const {data: availableLabels} = useSWR(['labels', owner, repo] as const, fetchLabels);

  const getKey = useCallback((pageIndex: number, prev: IssuesPageResult | null): IssuesKey | null => {
    if (prev && !prev.pageInfo.hasNextPage) return null;
    const labels = [...selectedLabels, ...(issueType ? [issueType] : [])];
    const query = buildIssuesQuery(owner, repo, search, author, status, labels, sort);
    return ['issues', query, prev?.pageInfo.endCursor ?? ''];
  }, [owner, repo, status, selectedLabels, issueType, sort, search, author]);

  const {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getKey, fetchIssuesPage);

  const issues = data?.flatMap(p => p.nodes) ?? [];
  const isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;
  const hasMore = !data || data[data.length - 1]?.pageInfo.hasNextPage !== false;

  const activeFilterCount = [
    status !== 'open',
    selectedLabels.length > 0,
    !!issueType,
    !!authorInput.trim(),
    sort !== 'created-desc',
  ].filter(Boolean).length;

  const typeLabels = availableLabels?.filter(l => TYPE_LABEL_NAMES.includes(l.name.toLowerCase())) ?? [];
  const otherLabels = availableLabels?.filter(l => !TYPE_LABEL_NAMES.includes(l.name.toLowerCase())) ?? [];

  const header = (
    <SearchBar value={searchInput} onChange={setSearchInput} aria-label="Search issues">
      <IssueFilterPopover
        status={status} onStatusChange={setStatus}
        selectedLabels={selectedLabels} onLabelsChange={setSelectedLabels}
        issueType={issueType} onIssueTypeChange={setIssueType}
        author={authorInput} onAuthorChange={setAuthorInput}
        sort={sort} onSortChange={setSort}
        typeLabels={typeLabels}
        otherLabels={otherLabels}
        activeCount={activeFilterCount}
        onClear={() => {
          setStatus('open'); setSelectedLabels([]); setIssueType('');
          setAuthorInput(''); setAuthor(''); setSort('created-desc');
        }}
      />
    </SearchBar>
  );

  return (
    <div className="flex flex-1">
      <List
        aria-label={`Issues — ${owner}/${repo}`}
        items={issues}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        header={header}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {issue => <IssueListItem issue={issue} owner={owner} repo={repo} />}
      </List>
      <div className="flex-1 overflow-auto flex flex-col">
        <Routes>
          <Route index element={<EmptyDetail text="No issue selected." />} />
          <Route path=":number" element={<IssueRouteElement />} />
        </Routes>
      </div>
    </div>
  );
}

IssuesView.preload = async function (owner: string, repo: string) {
  const query = buildIssuesQuery(owner, repo, '', '', 'open', [], 'created-desc');
  swrPreload(['issues', query, ''] as const, fetchIssuesPage);
};

// --- Filter popover ---

interface IssueFilterPopoverProps {
  status: string;
  onStatusChange: (s: string) => void;
  selectedLabels: string[];
  onLabelsChange: (l: string[]) => void;
  issueType: string;
  onIssueTypeChange: (t: string) => void;
  author: string;
  onAuthorChange: (a: string) => void;
  sort: string;
  onSortChange: (s: string) => void;
  typeLabels: RepoLabel[];
  otherLabels: RepoLabel[];
  activeCount: number;
  onClear: () => void;
}

function IssueFilterPopover({
  status, onStatusChange,
  selectedLabels, onLabelsChange,
  issueType, onIssueTypeChange,
  author, onAuthorChange,
  sort, onSortChange,
  typeLabels, otherLabels,
  activeCount, onClear
}: IssueFilterPopoverProps) {
  return (
    <FilterPopoverWrapper activeCount={activeCount}>
      <FilterSection label="Status">
        <RadioGroup value={status} onChange={onStatusChange} aria-label="Status" className="flex gap-4">
          <RadioItem value="open" label="Open" />
          <RadioItem value="closed" label="Closed" />
          <RadioItem value="all" label="All" />
        </RadioGroup>
      </FilterSection>
      <hr className="border-daw-gray-200" />
      <FilterSection label="Sort">
        <RadioGroup value={sort} onChange={onSortChange} aria-label="Sort" className="flex flex-col gap-1">
          {SORT_OPTIONS.map(opt => <RadioItem key={opt.value} value={opt.value} label={opt.label} />)}
        </RadioGroup>
      </FilterSection>
      {typeLabels.length > 0 && (
        <>
          <hr className="border-daw-gray-200" />
          <FilterSection label="Type">
            <RadioGroup value={issueType} onChange={onIssueTypeChange} aria-label="Issue type" className="flex flex-col gap-1">
              <RadioItem value="" label="Any" />
              {typeLabels.map(l => <RadioItem key={l.name} value={l.name} label={l.name} color={l.color} />)}
            </RadioGroup>
          </FilterSection>
        </>
      )}
      {otherLabels.length > 0 && (
        <>
          <hr className="border-daw-gray-200" />
          <FilterSection label="Labels">
            <LabelTagGroup labels={otherLabels} selectedLabels={selectedLabels} onLabelsChange={onLabelsChange} />
          </FilterSection>
        </>
      )}
      <hr className="border-daw-gray-200" />
      <FilterSection label="Author">
        <TextField value={author} onChange={onAuthorChange} aria-label="Author username">
          <Input className="w-full text-sm border border-daw-gray-200 rounded-md px-2 py-1.5 outline-none bg-transparent placeholder:text-daw-gray-400 focus:ring-2 ring-blue-500" placeholder="Username..." />
        </TextField>
      </FilterSection>
      {activeCount > 0 && (
        <>
          <hr className="border-daw-gray-200" />
          <Button onPress={onClear} className="text-xs text-red-600 hover:underline cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded self-start">
            Clear filters
          </Button>
        </>
      )}
    </FilterPopoverWrapper>
  );
}

// --- List items ---
//

function IssueListItem({ issue, owner, repo }: { issue: Issue, owner: string, repo: string }) {
  let description;
  let reactions = issue.reactionGroups!.filter(r => r.reactors.totalCount > 0).map((r, i) => <span key={i}>{emojis[r.content]} {r.reactors.totalCount}</span>);
  let type = (issue as any).issueType;
  let issueType = type ? <IssueTypeBadge issueType={type} className="text-2xs" /> : null;
  let commentCount = <>{issueType}<span><CommentIcon className="w-3 h-3 inline mr-1" />{issue.comments!.totalCount}</span></>;
  if (reactions.length) {
    description = <span className="flex gap-2 items-center">{commentCount} {reactions}</span>
  } else {
    description = <span className="flex gap-2 items-center">{commentCount}</span>;
  }

  return (
    <ListItem
      id={`/${owner}/${repo}/issues/${issue.number}`}
      href={`/${owner}/${repo}/issues/${issue.number}`}
      textValue={issue.title}
      onPreload={() => IssuePage.preload(owner, repo, issue.number)}
      label={issue.title}
      description={description}
    />
  );
}

function IssueRouteElement() {
  let {owner = '', repo = '', number} = useParams<{owner: string, repo: string, number: string}>();
  return <IssuePage key={number} owner={owner} repo={repo} number={Number(number)} />;
}
