import { preload } from './client';
import { PullRequestPage } from './PullRequest';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestDraftIcon, GitPullRequestIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';
import { Button, Input, RadioGroup, TextField } from 'react-aria-components';
import {
  CheckboxFilter, FilterSection, RadioItem, LabelTagGroup, SearchBar, FilterPopoverWrapper,
  fetchLabels, fetchSearchPage, buildSearchQuery,
  SORT_OPTIONS,
  type SearchItem, type SearchKey, type SearchPageResult
} from './Filters';

type PullPageResult = SearchPageResult;

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

  const getKey = useCallback((pageIndex: number, prev: PullPageResult | null) => {
    if (prev && !prev.hasNext) return null;
    const [sortBy, sortDir] = sort.split('-') as [string, string];
    const extra = draft ? ['is:draft'] : [];
    const query = buildSearchQuery('pr', owner, repo, search, author, status, selectedLabels, extra);
    return ['pulls', query, sortBy, sortDir, pageIndex + 1] as SearchKey;
  }, [owner, repo, status, draft, selectedLabels, sort, search, author]);

  const {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getKey, fetchSearchPage);

  const pulls = data?.flatMap(p => p.items) ?? [];
  const isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;

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

// --- List items ---

function PullListItem({pull, owner, repo}: {pull: SearchItem, owner: string, repo: string}) {
  const isMerged = !!pull.pull_request?.merged_at;
  const isDraft = !!pull.draft;

  let icon;
  if (isDraft) {
    icon = <GitPullRequestDraftIcon size={14} className="text-neutral-500 group-aria-selected:text-daw-white" />;
  } else if (pull.state === 'open') {
    icon = <GitPullRequestIcon size={14} className="text-green-600 group-aria-selected:text-daw-white" />;
  } else if (isMerged) {
    icon = <GitMergeIcon size={14} className="text-purple-600 group-aria-selected:text-daw-white" />;
  } else {
    icon = <GitPullRequestClosedIcon size={14} className="text-red-600 group-aria-selected:text-daw-white" />;
  }

  return (
    <ListItem
      id={`/${owner}/${repo}/pulls/${pull.number}`}
      href={`/${owner}/${repo}/pulls/${pull.number}`}
      textValue={pull.title}
      onHoverStart={() => PullRequestPage.preload(owner, repo, pull.number)}
      icon={icon}
      label={pull.title}
      description={`#${pull.number} by ${pull.user?.login}`}
    />
  );
}

function PullRouteElement() {
  let {owner = '', repo = '', number} = useParams<{owner: string, repo: string, number: string}>();
  return <PullRequestPage key={number} owner={owner} repo={repo} number={Number(number)} />;
}
