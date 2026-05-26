import { RestEndpointMethodTypes } from '@octokit/rest';
import { github, preload } from './client';
import { PullRequestPage } from './PullRequest';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import { GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestDraftIcon, GitPullRequestIcon } from '@primer/octicons-react';
import { List, ListItem, EmptyDetail } from './List';

type RestPull = RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0];

const OWNER = 'adobe';
const REPO = 'react-spectrum';
const PER_PAGE = 50;

const getPullsKey = (pageIndex: number, previousPageData: RestPull[] | null) => {
  if (previousPageData && previousPageData.length < PER_PAGE) return null;
  return ['pulls', OWNER, REPO, pageIndex + 1] as const;
};

async function fetchPullsPage([, owner, repo, page]: readonly [string, string, string, number]): Promise<RestPull[]> {
  let res = await github.pulls.list({owner, repo, state: 'open', per_page: PER_PAGE, page});
  return res.data;
}

export function PullsView() {
  let {data, size, setSize, isLoading, isValidating, error} = useSWRInfinite(getPullsKey, fetchPullsPage);
  let {pathname} = useLocation();

  let pulls = data?.flat() ?? [];
  let isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;

  return (
    <div className="flex flex-1 overflow-hidden">
      <List
        aria-label={`Pull Requests — ${OWNER}/${REPO}`}
        items={pulls}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {pull => <PullListItem pull={pull} />}
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

function PullListItem({pull}: {pull: RestPull}) {
  let icon;
  if (pull.draft) {
    icon = <GitPullRequestDraftIcon size={14} className="text-neutral-500 group-aria-selected:text-daw-white" />;
  } else if (pull.state === 'open') {
    icon = <GitPullRequestIcon size={14} className="text-green-600 group-aria-selected:text-daw-white" />;
  } else if (pull.merged_at) {
    icon = <GitMergeIcon size={14} className="text-purple-600 group-aria-selected:text-daw-white" />;
  } else {
    icon = <GitPullRequestClosedIcon size={14} className="text-red-600 group-aria-selected:text-daw-white" />;
  }

  return (
    <ListItem
      id={`/pulls/${pull.number}`}
      href={`/pulls/${pull.number}`}
      textValue={pull.title}
      onHoverStart={() => preload(PullRequestPage.query(), {owner: OWNER, repo: REPO, number: pull.number})}
      icon={icon}
      label={pull.title}
      description={`#${pull.number} by ${pull.user?.login}`}
    />
  );
}

function PullRouteElement() {
  let {number} = useParams<{number: string}>();
  return <PullRequestPage key={number} owner={OWNER} repo={REPO} number={Number(number!)} />;
}
