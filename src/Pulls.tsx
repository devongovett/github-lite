import { PullRequestPage, reviewDecisionMessages } from './PullRequest';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import useSWR, { preload as swrPreload } from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestDraftIcon, CodeReviewIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';
import { Button, Input, RadioGroup, TextField } from 'react-aria-components';
import { graphql } from './client';
import { Avatar, Status } from './components';
import {
  CheckboxFilter, FilterSection, RadioItem, LabelTagGroup, SearchBar, FilterPopoverWrapper,
  fetchLabels, SORT_OPTIONS,
} from './Filters';
import { PullRequest } from '@octokit/graphql-schema';

type PullsPageResult = {
  nodes: PullRequest[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type PullsKey = readonly ['pulls', string, string];

const SEARCH_QUERY = `
query SearchPullRequests($q: String!, $cursor: String) {
  search(query: $q, type: ISSUE, first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        id number title state isDraft
        author { login avatarUrl }
        viewerLatestReview { state }
        reviewDecision
        reviews(last:100) {
          nodes {
            state
          }
        }
      }
    }
  }
}
`;

async function fetchPullsPage([, query, cursor]: PullsKey): Promise<PullsPageResult> {
  const data = await graphql<{search: PullsPageResult}>(SEARCH_QUERY, {q: query, cursor: cursor || undefined});
  return data.search;
}

function buildPullsQuery(owner: string, repo: string, search: string, author: string, status: string, labels: string[], sort: string, draft: boolean): string {
  const parts = [`repo:${owner}/${repo}`, 'is:pr'];
  if (status !== 'all') parts.push(`is:${status}`);
  if (draft) parts.push('is:draft');
  if (author) parts.push(`author:${author}`);
  for (const label of labels) parts.push(`label:"${label}"`);
  if (search) parts.push(search);
  if (sort) parts.push(`sort:${sort}`);
  return parts.join(' ');
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
  { value: 'all', label: 'All' },
];

export function PullsView() {
  let {owner = '', repo = ''} = useParams<{owner: string, repo: string}>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [draft, setDraft] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
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

  const getKey = useCallback((pageIndex: number, prev: PullsPageResult | null): PullsKey | null => {
    if (prev && !prev.pageInfo.hasNextPage) return null;
    const query = buildPullsQuery(owner, repo, search, author, status, selectedLabels, sort, draft);
    return ['pulls', query, prev?.pageInfo.endCursor ?? ''];
  }, [owner, repo, status, draft, selectedLabels, sort, search, author]);

  const {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getKey, fetchPullsPage);

  const pulls = data?.flatMap(p => p.nodes) ?? [];
  const isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;
  const hasMore = !data || data[data.length - 1]?.pageInfo.hasNextPage !== false;

  const activeFilterCount = [
    status !== 'open',
    draft,
    selectedLabels.length > 0,
    !!authorInput.trim(),
    sort !== 'created-desc',
  ].filter(Boolean).length;

  const header = (
    <SearchBar value={searchInput} onChange={setSearchInput} aria-label="Search pull requests">
      <PullFilterPopover
        status={status} onStatusChange={setStatus}
        draft={draft} onDraftChange={setDraft}
        selectedLabels={selectedLabels} onLabelsChange={setSelectedLabels}
        author={authorInput} onAuthorChange={setAuthorInput}
        sort={sort} onSortChange={setSort}
        availableLabels={availableLabels ?? []}
        activeCount={activeFilterCount}
        onClear={() => {
          setStatus('open'); setDraft(false); setSelectedLabels([]);
          setAuthorInput(''); setAuthor(''); setSort('created-desc');
        }}
      />
    </SearchBar>
  );

  return (
    <div className="flex flex-1">
      <List
        aria-label={`Pull Requests — ${owner}/${repo}`}
        items={pulls}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        header={header}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {pull => <PullListItem pull={pull} owner={owner} repo={repo} />}
      </List>
      <div className="flex-1 overflow-auto flex flex-col">
        <Routes>
          <Route index element={<EmptyDetail text="No pull request selected." />} />
          <Route path=":number" element={<PullRouteElement />} />
        </Routes>
      </div>
    </div>
  );
}

// --- Filter popover ---

interface PullFilterPopoverProps {
  status: string;
  onStatusChange: (s: string) => void;
  draft: boolean;
  onDraftChange: (d: boolean) => void;
  selectedLabels: string[];
  onLabelsChange: (l: string[]) => void;
  author: string;
  onAuthorChange: (a: string) => void;
  sort: string;
  onSortChange: (s: string) => void;
  availableLabels: Parameters<typeof LabelTagGroup>[0]['labels'];
  activeCount: number;
  onClear: () => void;
}

function PullFilterPopover({
  status, onStatusChange,
  draft, onDraftChange,
  selectedLabels, onLabelsChange,
  author, onAuthorChange,
  sort, onSortChange,
  availableLabels,
  activeCount, onClear
}: PullFilterPopoverProps) {
  return (
    <FilterPopoverWrapper activeCount={activeCount}>
      <FilterSection label="Status">
        <RadioGroup value={status} onChange={onStatusChange} aria-label="Status" className="flex flex-col gap-1">
          {STATUS_OPTIONS.map(opt => <RadioItem key={opt.value} value={opt.value} label={opt.label} />)}
        </RadioGroup>
      </FilterSection>
      <hr className="border-daw-gray-200" />
      <FilterSection label="Draft">
        <CheckboxFilter isSelected={draft} onChange={onDraftChange} label="Draft only" />
      </FilterSection>
      <hr className="border-daw-gray-200" />
      <FilterSection label="Sort">
        <RadioGroup value={sort} onChange={onSortChange} aria-label="Sort" className="flex flex-col gap-1">
          {SORT_OPTIONS.map(opt => <RadioItem key={opt.value} value={opt.value} label={opt.label} />)}
        </RadioGroup>
      </FilterSection>
      {availableLabels.length > 0 && (
        <>
          <hr className="border-daw-gray-200" />
          <FilterSection label="Labels">
            <LabelTagGroup labels={availableLabels} selectedLabels={selectedLabels} onLabelsChange={onLabelsChange} />
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

PullsView.preload = async function (owner: string, repo: string) {
  const query = buildPullsQuery(owner, repo, '', '', 'open', [], 'created-desc', false);
  swrPreload(['pulls', query, ''] as const, fetchPullsPage);
};

// --- List items ---

function PullListItem({pull, owner, repo}: {pull: PullRequest, owner: string, repo: string}) {
  const isMerged = pull.state === 'MERGED';
  const isDraft = pull.isDraft;
  const reviewState = pull.viewerLatestReview?.state;

  let avatar = <Avatar src={pull.author!.avatarUrl} />;
  let description;
  if (isDraft) {
    description = <span className="flex gap-1 items-center"><GitPullRequestDraftIcon size={14} className="text-neutral-500 group-aria-selected:text-daw-white" />Draft</span>;
  } else if (pull.state === 'OPEN') {
    if (reviewState === 'APPROVED' || reviewState === 'CHANGES_REQUESTED' || reviewState === 'COMMENTED') {
      let message = reviewState === 'CHANGES_REQUESTED' ? 'requested changes' : reviewState.toLowerCase();
      description = <span className="flex gap-1 items-center"><Status state={reviewState as any} />You {message}</span>;
    } else {
      let message = reviewDecisionMessages[pull.reviewDecision!];
      let numReviews = pull.reviews!.nodes!.length;
      if (pull.reviewDecision === 'REVIEW_REQUIRED' && numReviews > 0) {
        let approvals = pull.reviews!.nodes!.filter(r => r!.state === 'APPROVED').length;
        let changesRequested = pull.reviews!.nodes!.filter(r => r!.state === 'CHANGES_REQUESTED').length;
        if (approvals > 0 && changesRequested === 0) {
          message = `${approvals} ${approvals === 1 ? 'approval' : 'approvals'}`;
        } else if (changesRequested > 0 && approvals === 0) {
          message = `${changesRequested} requested changes`;
        } else {
          message = `${numReviews} ${numReviews === 1 ? 'review' : 'reviews'}`
        }
      }
      description = <span className="flex gap-1 items-center"><Status state={pull.reviewDecision!} />{message}</span>;
    }
  } else if (isMerged) {
    description = <span className="flex gap-1 items-center"><GitMergeIcon size={14} className="text-purple-600 group-aria-selected:text-daw-white" />Merged</span>;
  } else {
    description = <span className="flex gap-1 items-center"><GitPullRequestClosedIcon size={14} className="text-red-600 group-aria-selected:text-daw-white" />Closed</span>;
  }

  return (
    <ListItem
      id={`/${owner}/${repo}/pulls/${pull.number}`}
      href={`/${owner}/${repo}/pulls/${pull.number}`}
      textValue={pull.title}
      onPreload={() => PullRequestPage.preload(owner, repo, pull.number)}
      label={pull.title}
      description={description}
      trailingIcon={avatar}
    />
  );
}

function PullRouteElement() {
  let {owner = '', repo = '', number} = useParams<{owner: string, repo: string, number: string}>();
  return <PullRequestPage key={number} owner={owner} repo={repo} number={Number(number)} />;
}
