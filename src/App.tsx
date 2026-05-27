import { Button, ListBox, ListBoxItem, Popover, RouterProvider, Select, SelectValue } from 'react-aria-components';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BellIcon, CommentDiscussionIcon, GitCommitIcon, GitPullRequestIcon, IssueOpenedIcon, RepoIcon } from '@primer/octicons-react';
import { NotificationsView } from './Notifications';
import { IssuesView } from './Issues';
import { PullsView } from './Pulls';
import { DiscussionsView } from './Discussions';
import { CommitsView } from './Commits';
import { useQuery } from './client';
import { useEffect } from 'react';

type TopRepo = {nameWithOwner: string, owner: {login: string, avatarUrl: string}};

const TOP_REPOS_QUERY = `
query TopRepositories {
  viewer {
    topRepositories(first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        nameWithOwner
        owner { login avatarUrl }
      }
    }
  }
}
`;

export function App() {
  let navigate = useNavigate();
  if (!localStorage.token) {
    return <Login />;
  }
  return (
    <RouterProvider navigate={navigate}>
      <div className="flex flex-col h-full">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <SourceSelector />
          <Routes>
            <Route path="/notifications/*" element={<NotificationsView />} />
            <Route path="/:owner/:repo/issues/*" element={<IssuesView />} />
            <Route path="/:owner/:repo/pulls/*" element={<PullsView />} />
            <Route path="/:owner/:repo/discussions/*" element={<DiscussionsView />} />
            <Route path="/:owner/:repo/commits/*" element={<CommitsView />} />
            <Route path="*" element={<Navigate to="/notifications" replace />} />
          </Routes>
        </div>
      </div>
    </RouterProvider>
  );
}

function Login() {
  return <h1>Login</h1>;
}

function parsePathParts(pathname: string) {
  const isNotifications = pathname.startsWith('/notifications');
  const parts = pathname.split('/').filter(Boolean);
  const urlOwner = isNotifications ? null : (parts[0] ?? null);
  const urlRepo = isNotifications ? null : (parts[1] ?? null);
  const section = isNotifications ? 'notifications' : (parts[2] ?? 'issues');
  return {isNotifications, urlOwner, urlRepo, section};
}

function getStoredRepoUrl(): string {
  const stored = localStorage.getItem('github_lite_repo') ?? '';
  return stored ? `/${stored}` : '';
}

function Toolbar() {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const {data} = useQuery<{viewer: {topRepositories: {nodes: TopRepo[]}}}>(TOP_REPOS_QUERY, {});
  const repos = data?.viewer.topRepositories.nodes ?? [];

  const {isNotifications, urlOwner, urlRepo, section} = parsePathParts(pathname);

  const currentRepo = (urlOwner && urlRepo) ? `${urlOwner}/${urlRepo}` : (localStorage.getItem('github_lite_repo') ?? '');

  useEffect(() => {
    if (urlOwner && urlRepo) {
      localStorage.setItem('github_lite_repo', `${urlOwner}/${urlRepo}`);
    }
  }, [urlOwner, urlRepo]);

  function handleRepoChange(nameWithOwner: string) {
    localStorage.setItem('github_lite_repo', nameWithOwner);
    if (!isNotifications) {
      navigate(`/${nameWithOwner}/${section}`);
    }
  }

  return (
    <div className="border-b border-daw-gray-200 px-3 py-2 flex items-center shrink-0">
      <Select
        selectedKey={currentRepo || null}
        onSelectionChange={key => handleRepoChange(key as string)}
        aria-label="Repository">
        <Button className="flex items-center gap-1.5 text-sm font-medium px-2 py-1.5 rounded-md border border-daw-gray-200 hover:bg-daw-gray-100 cursor-default outline-none focus-visible:ring-2 ring-blue-600">
          <SelectValue className="max-w-xs truncate flex items-center gap-2" />
        </Button>
        <Popover placement="bottom start" offset={4} className="bg-white dark:bg-neutral-900 border border-daw-gray-200 rounded-lg shadow-xl outline-none w-72 max-h-80 overflow-y-auto">
          <ListBox className="outline-none p-1 flex flex-col" items={repos}>
            {repo => (
              <ListBoxItem
                id={repo.nameWithOwner}
                textValue={repo.nameWithOwner}
                className="flex items-center gap-2 text-sm px-2 py-1.5 rounded cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600">
                <img src={repo.owner.avatarUrl} className="w-4 h-4 rounded-sm shrink-0" alt="" />
                <span className="truncate">{repo.nameWithOwner}</span>
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
}

function SourceSelector() {
  const {pathname} = useLocation();
  const {isNotifications, urlOwner, urlRepo, section} = parsePathParts(pathname);

  const repoBase = (urlOwner && urlRepo) ? `/${urlOwner}/${urlRepo}` : getStoredRepoUrl();

  const itemClass = "flex flex-col items-center gap-1 py-2 rounded-md cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600";
  const labelClass = "text-[10px] font-medium leading-none";

  return (
    <ListBox
      aria-label="Source"
      selectionMode="single"
      selectionBehavior="replace"
      // @ts-ignore
      linkBehavior="selection"
      selectedKeys={[section]}
      disallowEmptySelection
      className="w-16 border-r border-daw-gray-300 flex flex-col py-2 gap-0.5 items-stretch px-1.5 shrink-0">
      <ListBoxItem id="notifications" href="/notifications" textValue="Inbox" className={itemClass}>
        <BellIcon size={18} />
        <span className={labelClass}>Inbox</span>
      </ListBoxItem>
      <ListBoxItem id="issues" href={`${repoBase}/issues`} textValue="Issues" className={itemClass}>
        <IssueOpenedIcon size={18} />
        <span className={labelClass}>Issues</span>
      </ListBoxItem>
      <ListBoxItem id="pulls" href={`${repoBase}/pulls`} textValue="Pull Requests" className={itemClass}>
        <GitPullRequestIcon size={18} />
        <span className={labelClass}>PRs</span>
      </ListBoxItem>
      <ListBoxItem id="discussions" href={`${repoBase}/discussions`} textValue="Discussions" className={itemClass}>
        <CommentDiscussionIcon size={18} />
        <span className={labelClass}>Discuss</span>
      </ListBoxItem>
      <ListBoxItem id="commits" href={`${repoBase}/commits`} textValue="Commits" className={itemClass}>
        <GitCommitIcon size={18} />
        <span className={labelClass}>Commits</span>
      </ListBoxItem>
    </ListBox>
  );
}
