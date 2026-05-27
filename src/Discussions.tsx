import { graphql, preload } from './client';
import { DiscussionPage } from './Discussion';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import useSWR from 'swr';
import { useState, useCallback, useEffect } from 'react';
import { CheckCircleIcon, CommentDiscussionIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';
import { Button, Input, RadioGroup, TextField } from 'react-aria-components';
import { FilterSection, RadioItem, SearchBar, FilterPopoverWrapper, SORT_OPTIONS } from './Filters';

type DiscussionItem = {
  id: string;
  number: number;
  title: string;
  createdAt: string;
  closed: boolean;
  author: { login: string; avatarUrl: string } | null;
  comments: { totalCount: number };
  category: { name: string; emoji: string };
  answerChosenAt: string | null;
};

type DiscussionPageResult = {
  nodes: DiscussionItem[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

type DiscussionCategory = { id: string; name: string; emoji: string };
type DiscussionKey = readonly ['discussions', string, string];

const SEARCH_QUERY = `
query SearchDiscussions($q: String!, $cursor: String) {
  search(query: $q, type: DISCUSSION, first: 25, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on Discussion {
        id number title createdAt closed
        author { login avatarUrl url }
        comments { totalCount }
        category { name emoji }
        answerChosenAt
      }
    }
  }
}
`;

const CATEGORIES_QUERY = `
query DiscussionCategories($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    discussionCategories(first: 25) {
      nodes { id name emoji }
    }
  }
}
`;

async function fetchDiscussions([, query, cursor]: DiscussionKey): Promise<DiscussionPageResult> {
  const data = await graphql<{search: DiscussionPageResult}>(SEARCH_QUERY, {q: query, cursor: cursor || undefined});
  return data.search;
}

async function fetchCategories([, owner, repo]: readonly ['discussion-categories', string, string]) {
  const data = await graphql<{repository: {discussionCategories: {nodes: DiscussionCategory[]}}}>(
    CATEGORIES_QUERY, {owner, repo}
  );
  return data.repository.discussionCategories.nodes;
}

function buildDiscussionQuery(owner: string, repo: string, search: string, author: string, status: string, answered: string, category: string, sort: string): string {
  const parts = [`repo:${owner}/${repo}`];
  if (status !== 'all') parts.push(`is:${status}`);
  if (answered) parts.push(`is:${answered}`);
  if (author) parts.push(`author:${author}`);
  if (category) parts.push(`category:"${category}"`);
  if (search) parts.push(search);
  const [sortBy, sortDir] = sort.split('-');
  parts.push(`sort:${sortBy}-${sortDir}`);
  return parts.join(' ');
}

export function DiscussionsView() {
  const {owner = '', repo = ''} = useParams<{owner: string, repo: string}>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('open');
  const [answered, setAnswered] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
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
  const {data: categories} = useSWR(
    ['discussion-categories', owner, repo] as const,
    fetchCategories
  );

  const query = buildDiscussionQuery(owner, repo, search, author, status, answered, category, sort);

  const getKey = useCallback((pageIndex: number, prev: DiscussionPageResult | null): DiscussionKey | null => {
    if (prev && !prev.pageInfo.hasNextPage) return null;
    return ['discussions', query, prev?.pageInfo.endCursor ?? ''];
  }, [query]);

  const { data, size, setSize, isLoading, isValidating, error } = useSWRInfinite(getKey, fetchDiscussions);

  const discussions = data?.flatMap(p => p.nodes) ?? [];
  const isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;

  const activeFilterCount = [
    status !== 'open',
    !!answered,
    !!category,
    !!authorInput.trim(),
    sort !== 'created-desc',
  ].filter(Boolean).length;

  const header = (
    <SearchBar value={searchInput} onChange={setSearchInput} aria-label="Search discussions">
      <DiscussionFilterPopover
        status={status} onStatusChange={setStatus}
        answered={answered} onAnsweredChange={setAnswered}
        author={authorInput} onAuthorChange={setAuthorInput}
        category={category} onCategoryChange={setCategory}
        sort={sort} onSortChange={setSort}
        categories={categories ?? []}
        activeCount={activeFilterCount}
        onClear={() => {
          setStatus('open'); setAnswered(''); setCategory('');
          setAuthorInput(''); setAuthor(''); setSort('created-desc');
        }}
      />
    </SearchBar>
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      <List
        aria-label={`Discussions — ${owner}/${repo}`}
        items={discussions}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        header={header}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {discussion => <DiscussionListItem discussion={discussion} owner={owner} repo={repo} />}
      </List>
      <div className="flex-1 overflow-auto flex flex-col">
        <Routes>
          <Route index element={<EmptyDetail text="No discussion selected." />} />
          <Route path=":number" element={<DiscussionRouteElement />} />
        </Routes>
      </div>
    </div>
  );
}

// --- Filter popover ---

interface DiscussionFilterPopoverProps {
  status: string;
  onStatusChange: (s: string) => void;
  answered: string;
  onAnsweredChange: (a: string) => void;
  author: string;
  onAuthorChange: (a: string) => void;
  category: string;
  onCategoryChange: (c: string) => void;
  sort: string;
  onSortChange: (s: string) => void;
  categories: DiscussionCategory[];
  activeCount: number;
  onClear: () => void;
}

function DiscussionFilterPopover({
  status, onStatusChange,
  answered, onAnsweredChange,
  author, onAuthorChange,
  category, onCategoryChange,
  sort, onSortChange,
  categories,
  activeCount, onClear
}: DiscussionFilterPopoverProps) {
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
      <FilterSection label="Answered">
        <RadioGroup value={answered} onChange={onAnsweredChange} aria-label="Answered" className="flex flex-col gap-1">
          <RadioItem value="" label="Any" />
          <RadioItem value="answered" label="Answered" />
          <RadioItem value="unanswered" label="Unanswered" />
        </RadioGroup>
      </FilterSection>
      <hr className="border-daw-gray-200" />
      <FilterSection label="Sort">
        <RadioGroup value={sort} onChange={onSortChange} aria-label="Sort" className="flex flex-col gap-1">
          {SORT_OPTIONS.map(opt => <RadioItem key={opt.value} value={opt.value} label={opt.label} />)}
        </RadioGroup>
      </FilterSection>
      {categories.length > 0 && (
        <>
          <hr className="border-daw-gray-200" />
          <FilterSection label="Category">
            <RadioGroup value={category} onChange={onCategoryChange} aria-label="Category" className="flex flex-col gap-1">
              <RadioItem value="" label="Any" />
              {categories.map(c => <RadioItem key={c.id} value={c.name} label={`${c.emoji} ${c.name}`} />)}
            </RadioGroup>
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

function DiscussionListItem({discussion, owner, repo}: {discussion: DiscussionItem, owner: string, repo: string}) {
  let icon;
  if (discussion.answerChosenAt) {
    icon = <CheckCircleIcon size={14} className="text-purple-600 group-aria-selected:text-daw-white" />;
  } else if (discussion.closed) {
    icon = <CommentDiscussionIcon size={14} className="text-red-600 group-aria-selected:text-daw-white" />;
  } else {
    icon = <CommentDiscussionIcon size={14} className="text-green-600 group-aria-selected:text-daw-white" />;
  }

  return (
    <ListItem
      id={`/${owner}/${repo}/discussions/${discussion.number}`}
      href={`/${owner}/${repo}/discussions/${discussion.number}`}
      textValue={discussion.title}
      onHoverStart={() => preload(DiscussionPage.query(), {owner, repo, number: discussion.number})}
      icon={icon}
      label={`${discussion.category.emoji} ${discussion.title}`}
      description={`#${discussion.number} by ${discussion.author?.login}`}
    />
  );
}

function DiscussionRouteElement() {
  let {owner = '', repo = '', number} = useParams<{owner: string, repo: string, number: string}>();
  return <DiscussionPage key={number} owner={owner} repo={repo} number={Number(number)} />;
}
