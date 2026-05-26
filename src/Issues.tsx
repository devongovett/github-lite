import { RestEndpointMethodTypes } from '@octokit/rest';
import { github, preload } from './client';
import { IssuePage } from './Issue';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import { IssueClosedIcon, IssueOpenedIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';

type RestIssue = RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][0];
type IssuePageResult = {items: RestIssue[], hasNext: boolean};

const OWNER = 'adobe';
const REPO = 'react-spectrum';

const getIssuesKey = (pageIndex: number, previousPageData: IssuePageResult | null) => {
  if (previousPageData && !previousPageData.hasNext) return null;
  return ['issues', OWNER, REPO, pageIndex + 1] as const;
};

async function fetchIssuesPage([, owner, repo, page]: readonly [string, string, string, number]): Promise<IssuePageResult> {
  let res = await github.issues.listForRepo({owner, repo, state: 'open', per_page: 100, page});
  let hasNext = (res.headers.link as string | undefined)?.includes('rel="next"') ?? false;
  return {items: res.data.filter(item => !item.pull_request) as RestIssue[], hasNext};
}

export function IssuesView() {
  let {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getIssuesKey, fetchIssuesPage);
  let {pathname} = useLocation();

  let issues = data?.flatMap(p => p.items) ?? [];
  let isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;

  return (
    <div className="flex flex-1 overflow-hidden">
      <List
        aria-label={`Issues — ${OWNER}/${REPO}`}
        items={issues}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
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

function IssueListItem({issue}: {issue: RestIssue}) {
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
