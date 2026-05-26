import { preload } from './client';
import { IssuePage } from './Issue';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { IssueClosedIcon, IssueOpenedIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';
import { Button, Input, RadioGroup, TextField } from 'react-aria-components';
import {
  FilterSection, RadioItem, LabelTagGroup, SearchBar, FilterPopoverWrapper,
  fetchLabels, fetchSearchPage, buildSearchQuery,
  SORT_OPTIONS,
  type RepoLabel, type SearchItem, type SearchKey, type SearchPageResult
} from './Filters';

type IssuePageResult = SearchPageResult;

const OWNER = 'adobe';
const REPO = 'react-spectrum';
const TYPE_LABEL_NAMES = ['bug', 'enhancement', 'feature', 'feature request', 'question', 'documentation'];

export function IssuesView() {
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
  const {data: availableLabels} = useSWR(['labels', OWNER, REPO] as const, fetchLabels);

  const getKey = useCallback((pageIndex: number, prev: IssuePageResult | null) => {
    if (prev && !prev.hasNext) return null;
    const [sortBy, sortDir] = sort.split('-') as [string, string];
    const labels = [...selectedLabels, ...(issueType ? [issueType] : [])];
    const query = buildSearchQuery('issue', OWNER, REPO, search, author, status, labels);
    return ['issues', query, sortBy, sortDir, pageIndex + 1] as SearchKey;
  }, [status, selectedLabels, issueType, sort, search, author]);

  const {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getKey, fetchSearchPage);

  const issues = data?.flatMap(p => p.items) ?? [];
  const isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;

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
    <div className="flex flex-1 overflow-hidden">
      <List
        aria-label={`Issues — ${OWNER}/${REPO}`}
        items={issues}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        header={header}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {issue => <IssueListItem issue={issue} />}
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

function IssueListItem({issue}: {issue: SearchItem}) {
  return (
    <ListItem
      id={`/issues/${issue.number}`}
      href={`/issues/${issue.number}`}
      textValue={issue.title}
      onHoverStart={() => preload(IssuePage.query(), {owner: OWNER, repo: REPO, number: issue.number})}
      icon={issue.state === 'open'
        ? <IssueOpenedIcon size={14} className="text-green-600 group-aria-selected:text-daw-white" />
        : <IssueClosedIcon size={14} className="text-purple-600 group-aria-selected:text-daw-white" />
      }
      label={issue.title}
      description={`#${issue.number} opened by ${issue.user?.login}`}
    />
  );
}

function IssueRouteElement() {
  let {number} = useParams<{number: string}>();
  return <IssuePage key={number} owner={OWNER} repo={REPO} number={Number(number!)} />;
}
