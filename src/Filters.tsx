import { RestEndpointMethodTypes } from '@octokit/rest';
import { github } from './client';
import { ReactNode } from 'react';
import { SearchIcon, XCircleIcon, FilterIcon, CheckIcon } from '@primer/octicons-react';
import {
  Button, Checkbox, Dialog, DialogTrigger, Input,
  Popover, Radio, SearchField, Tag, TagGroup, TagList
} from 'react-aria-components';
import { PullRequestPage } from './PullRequest';
import { IssuePage } from './Issue';

export type RepoLabel = RestEndpointMethodTypes["issues"]["listLabelsForRepo"]["response"]["data"][0];
export type SearchItem = RestEndpointMethodTypes["search"]["issuesAndPullRequests"]["response"]["data"]["items"][0];
export type SearchKey = readonly [string, string, string, string, number];
export type SearchPageResult = {items: SearchItem[], hasNext: boolean};

export const PER_PAGE = 100;

export const DISCUSSION_SORT_OPTIONS = [
  { value: '', label: 'Latest activity' },
  { value: 'date_created', label: 'Newest' },
  { value: 'top', label: 'Top' },
];

export const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Newest' },
  { value: 'created-asc', label: 'Oldest' },
  { value: 'comments-desc', label: 'Most commented' },
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'reactions-desc', label: '🔥 Most reactions' },
  { value: 'reactions-+1-desc', label: '👍 Thumbs up' },
  { value: 'reactions-heart-desc', label: '❤️ Heart' },
  { value: 'reactions-tada-desc', label: '🎉 Tada' },
  { value: 'reactions-rocket-desc', label: '🚀 Rocket' },
  { value: 'reactions-eyes-desc', label: '👀 Eyes' },
];

export function buildSearchQuery(
  type: 'issue' | 'pr',
  owner: string, repo: string,
  search: string, author: string, status: string, labels: string[],
  extra: string[] = []
): string {
  const parts = [`repo:${owner}/${repo}`, `is:${type}`];
  if (status !== 'all') parts.push(`is:${status}`);
  parts.push(...extra);
  if (author) parts.push(`author:${author}`);
  for (const label of labels) parts.push(`label:"${label}"`);
  if (search) parts.push(search);
  return parts.join(' ');
}

export async function fetchLabels([, owner, repo]: readonly ['labels', string, string]) {
  let res = await github.issues.listLabelsForRepo({owner, repo, per_page: 100});
  return res.data;
}

export async function fetchSearchPage([, query, sortBy, sortDir, page]: SearchKey): Promise<SearchPageResult> {
  let res = await github.search.issuesAndPullRequests({
    q: query,
    sort: sortBy as any,
    order: sortDir as 'asc' | 'desc',
    per_page: PER_PAGE,
    page
  });
  const hasNext = page * PER_PAGE < res.data.total_count;
  for (let item of res.data.items.slice(0, 10)) {
    let [owner, repo] = item.repository_url.split('/').slice(-2);
    if (item.pull_request) {
      PullRequestPage.preload(owner, repo, item.number);
    } else {
      IssuePage.preload(owner, repo, item.number);
    }
  }
  return {items: res.data.items, hasNext};
}

// --- Shared UI components ---

export function FilterSection({label, children}: {label: string, children: ReactNode}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-daw-gray-500 uppercase tracking-wide">{label}</div>
      {children}
    </section>
  );
}

export function RadioItem({value, label, color}: {value: string, label: string, color?: string}) {
  return (
    <Radio value={value} className="flex items-center gap-2 text-sm cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded py-0.5">
      {({isSelected}) => (
        <>
          <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-blue-500' : 'border-daw-gray-400'}`}>
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </div>
          {color != null && <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: `#${color}`}} />}
          <span>{label}</span>
        </>
      )}
    </Radio>
  );
}

export function CheckboxFilter({isSelected, onChange, label}: {isSelected: boolean, onChange: (v: boolean) => void, label: string}) {
  return (
    <Checkbox isSelected={isSelected} onChange={onChange} className="flex items-center gap-2 text-sm cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded py-0.5">
      {({isSelected: sel}) => (
        <>
          <div className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center ${sel ? 'border-blue-500 bg-blue-500' : 'border-daw-gray-400'}`}>
            {sel && <CheckIcon size={8} className="text-white" />}
          </div>
          <span>{label}</span>
        </>
      )}
    </Checkbox>
  );
}

export function LabelTagGroup({labels, selectedLabels, onLabelsChange}: {
  labels: RepoLabel[];
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
}) {
  if (!labels.length) return null;
  return (
    <TagGroup
      selectionMode="multiple"
      selectedKeys={new Set(selectedLabels)}
      onSelectionChange={(keys) => {
        if (keys !== 'all') onLabelsChange([...keys] as string[]);
      }}
      aria-label="Labels">
      <TagList
        items={labels.map(l => ({...l, id: l.name}))}
        className="flex flex-wrap gap-1">
        {(label) => (
          <Tag
            className={({isSelected}) =>
              `px-2.5 py-0.5 text-xs font-semibold border rounded-full cursor-default outline-none focus-visible:ring-2 ring-blue-600 ring-offset-1${isSelected ? ' bg-daw-gray-900 text-daw-white border-daw-gray-900' : ''}`
            }
            style={({isSelected}) => isSelected ? {} : {
              background: `#${label.color}66`,
              borderColor: `#${label.color}66`,
              color: `color-mix(in srgb, #${label.color}, black 70%)`
            }}>
            {label.name}
          </Tag>
        )}
      </TagList>
    </TagGroup>
  );
}

export function FilterPopoverWrapper({activeCount, children}: {activeCount: number, children: ReactNode}) {
  return (
    <DialogTrigger>
      <Button className="shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md border border-daw-gray-200 hover:bg-daw-gray-100 cursor-default outline-none focus-visible:ring-2 ring-blue-600">
        <FilterIcon size={13} />
        Filters
        {activeCount > 0 && (
          <span className="px-1 py-px text-[9px] leading-none bg-blue-500 text-white rounded-full">{activeCount}</span>
        )}
      </Button>
      <Popover placement="bottom end" offset={4} className="bg-white dark:bg-neutral-900 border border-daw-gray-200 rounded-lg shadow-xl outline-none w-72 max-h-[80vh] overflow-y-auto">
        <Dialog aria-label="Filters" className="outline-none p-3 flex flex-col gap-4">
          {children}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

export function SearchBar({'aria-label': ariaLabel, value, onChange, children}: {
  'aria-label': string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-1.5 p-2 border-b border-daw-gray-200 shrink-0">
      <SearchField value={value} onChange={onChange} aria-label={ariaLabel} className="flex-1 min-w-0">
        <div className="flex items-center gap-1 border border-daw-gray-200 rounded-md px-2 py-1.5 focus-within:ring-2 ring-blue-500">
          <SearchIcon size={14} className="text-daw-gray-500 shrink-0" />
          <Input className="flex-1 text-sm outline-none bg-transparent min-w-0 placeholder:text-daw-gray-400" placeholder="Search..." />
          {value !== '' && (
            <Button className="text-daw-gray-400 hover:text-daw-gray-600 cursor-default outline-none">
              <XCircleIcon size={14} />
            </Button>
          )}
        </div>
      </SearchField>
      {children}
    </div>
  );
}
