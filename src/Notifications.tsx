import { RestEndpointMethodTypes } from '@octokit/rest';
import { github, preload } from './client';
import { PullRequestPage } from './PullRequest';
import { IssuePage } from './Issue';
import { DiscussionPage } from './Discussion';
import { CommitPage } from './Commit';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import {preload as swrPreload} from 'swr';
import { useCallback, useEffect } from 'react';
import { List, ListItem, EmptyDetail } from './List';

type Notification = RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

const PER_PAGE = 50;

const getNotificationsKey = (pageIndex: number, previousPageData: Notification[] | null) => {
  if (previousPageData && previousPageData.length < PER_PAGE) return null;
  return ['notifications', pageIndex + 1] as const;
};

async function fetchNotificationsPage([, page]: readonly [string, number]): Promise<Notification[]> {
  let res = await github.activity.listNotificationsForAuthenticatedUser({
    page, per_page: PER_PAGE, all: true,
    headers: { 'If-None-Match': '' }
  });
  if (page === 1) {
    for (let item of res.data.slice(0, 10)) preloadNotification(item);
  }
  return res.data;
}

function preloadNotification(item: Notification) {
  switch (item?.subject.type) {
    case 'PullRequest':
      PullRequestPage.preload(item.repository.owner.login, item.repository.name, Number(item.subject.url.split('/').pop()));
      break;
    case 'Issue':
      IssuePage.preload(item.repository.owner.login, item.repository.name, Number(item.subject.url.split('/').pop()));
      break;
    case 'Discussion':
      preload(DiscussionPage.query(), {owner: item.repository.owner.login, repo: item.repository.name, number: Number(item.subject.url.split('/').pop())});
      break;
    case 'Commit':
      CommitPage.preload(item.repository.owner.login, item.repository.name, item.subject.url.split('/').pop()!);
      break;
  }
}

export function NotificationsView() {
  let {data, size, setSize, isLoading, isValidating, mutate, error} = useSWRInfinite(getNotificationsKey, fetchNotificationsPage);
  let {pathname} = useLocation();

  let notifications = data?.flat() ?? [];
  let isLoadingMore = !isLoading && isValidating && (data?.length ?? 0) < size;

  const markAsRead = useCallback((id: string) => {
    mutate(
      currentData => currentData?.map(page => page.map(n => n.id === id ? {...n, unread: false} : n)),
      {revalidate: false}
    );
    github.activity.markThreadAsRead({thread_id: Number(id)});
  }, [mutate]);

  return (
    <div className="flex flex-1">
      <List
        aria-label="Notifications"
        items={notifications}
        selectedKeys={[pathname]}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onLoadMore={() => { if (!isLoading && !isValidating && !error) setSize(size + 1); }}>
        {item => <NotificationItem item={item} />}
      </List>
      <div className="flex-1 overflow-auto flex flex-col">
        <Routes>
          <Route index element={<EmptyDetail text="No notification selected." />} />
          <Route path=":id" element={<NotificationDetail notifications={notifications} markAsRead={markAsRead} />} />
        </Routes>
      </div>
    </div>
  );
}

NotificationsView.preload = () => {
  swrPreload(getNotificationsKey, fetchNotificationsPage);
};

function NotificationItem({item}: {item: Notification}) {
  return (
    <ListItem
      id={`/notifications/${item.id}`}
      href={`/notifications/${item.id}`}
      textValue={item.subject.title}
      onHoverStart={() => preloadNotification(item)}
      icon={
        <div className="w-[10px] h-[10px]">
          {item.unread && <div aria-label="Unread" role="status" className="rounded-full bg-blue-500 w-full h-full" />}
        </div>
      }
      label={item.subject.title}
      description={`${item.repository.full_name} #${item.subject.url?.split('/').pop()}`}
    />
  );
}

function NotificationDetail({notifications, markAsRead}: {notifications: Notification[], markAsRead: (id: string) => void}) {
  let {id} = useParams<{id: string}>();
  let item = id ? notifications.find(n => n.id === id) : undefined;

  useEffect(() => {
    if (item?.unread) markAsRead(item.id);
  }, [item]);

  switch (item?.subject.type) {
    case 'PullRequest':
      return <PullRequestPage key={item.id} owner={item.repository.owner.login} repo={item.repository.name} number={Number(item.subject.url.split('/').pop())} />;
    case 'Issue':
      return <IssuePage key={item.id} owner={item.repository.owner.login} repo={item.repository.name} number={Number(item.subject.url.split('/').pop())} />;
    case 'Discussion':
      return <DiscussionPage key={item.id} owner={item.repository.owner.login} repo={item.repository.name} number={Number(item.subject.url.split('/').pop())} />;
    case 'Commit':
      return <CommitPage key={item.id} owner={item.repository.owner.login} repo={item.repository.name} sha={item.subject.url.split('/').pop()!} />;
    default:
      return <EmptyDetail text={item ? `Unknown type: ${item.subject.type}` : 'No notification selected.'} />;
  }
}
