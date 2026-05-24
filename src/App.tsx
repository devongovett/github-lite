import {RestEndpointMethodTypes} from '@octokit/rest';
import {github, preload} from './client';
import { PullRequestPage } from './PullRequest';
import { IssuePage } from './Issue';
import { Collection, ListBox, ListBoxItem, ListBoxLoadMoreItem, Text, RouterProvider } from 'react-aria-components';
import {Virtualizer, ListLayout} from 'react-aria-components/Virtualizer';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import { useCallback, useEffect, useRef } from 'react';

type Notification = RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

const PER_PAGE = 50;

const getKey = (pageIndex: number, previousPageData: Notification[] | null) => {
  if (previousPageData && previousPageData.length < PER_PAGE) return null;
  return ['notifications', pageIndex + 1] as const;
};

async function fetchNotificationsPage([, page]: readonly [string, number]): Promise<Notification[]> {
  let res = await github.activity.listNotificationsForAuthenticatedUser({
    page,
    per_page: PER_PAGE,
    all: true,
    headers: { 'If-None-Match': '' }
  });

  if (page === 1) {
    for (let item of res.data.slice(0, 10)) {
      preloadNotification(item);
    }
  }

  return res.data;
}

export function App() {
  let navigate = useNavigate();

  if (!localStorage.token) {
    return <Login />;
  }

  return (
    <RouterProvider navigate={navigate}>
      <Notifications />
    </RouterProvider>
  );
}

function Login() {
  return <h1>Login</h1>
}

function Notifications() {
  let {data, size, setSize, isLoading, isValidating, mutate, error} = useSWRInfinite(getKey, fetchNotificationsPage);
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
    <div className="flex h-full">
      <div className="w-[280px] border-r border-daw-gray-300 overflow-hidden">
        <Virtualizer layout={ListLayout} layoutOptions={{estimatedRowSize: 56, padding: 8, gap: 4}}>
          <ListBox
            aria-label="Notifications"
            selectionMode="single"
            selectionBehavior="replace"
            // @ts-ignore - TODO expose in RAC
            linkBehavior="selection"
            selectedKeys={[pathname]}
            disallowEmptySelection
            className="h-full overflow-auto"
            style={{display: 'block', padding: 0}}
            renderEmptyState={() => isLoading && (
              <div className="flex justify-center items-center h-full">
                <div className="w-5 h-5 border-2 border-daw-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}>
            <Collection items={notifications}>
              {item => <NotificationItem item={item} />}
            </Collection>
            <ListBoxLoadMoreItem
              isLoading={isLoadingMore}
              onLoadMore={() => {
                if (!isLoading && !isValidating && !error) {
                  console.log(size)
                  setSize(size + 1);
                }
              }}>
              <div className="flex justify-center items-center h-12">
                <div className="w-5 h-5 border-2 border-daw-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            </ListBoxLoadMoreItem>
          </ListBox>
        </Virtualizer>
      </div>
      <Routes>
        <Route path="/*" element={
          <Notification
            selectedItem={notifications.find(d => d.id === pathname.slice(1))}
            markAsRead={markAsRead}
          />
        } />
      </Routes>
    </div>
  );
}

function NotificationItem({item}: {item: Notification}) {
  return (
    <ListBoxItem
      textValue={item.subject.title}
      id={`/${item.id}`}
      href={`/${item.id}`}
      className="group grid grid-cols-[auto_1fr] gap-y-1 gap-x-3 items-baseline rounded-md cursor-default px-3 py-2 hover:bg-daw-gray-200 selected:bg-daw-gray-900 hover:aria-selected:bg-daw-gray-900 selected:text-daw-white outline-none focus-visible]:outline-black outline-offset-2">
      {({isHovered}) => {
        if (isHovered) {
          preloadNotification(item);
        }

        return <>
          <div className="col-start-1 w-[10px] h-[10px]">{item.unread ? <div aria-label="Unread" role="status" className="rounded-full bg-blue-500 w-full h-full" /> : null}</div>
          <Text slot="label" className="col-start-2 text-sm font-medium line-clamp-2">{item.subject.title}</Text>
          <Text slot="description" className="text-xs col-start-2 text-daw-gray-600 group-aria-selected:text-daw-gray-300 truncate">{item.repository.full_name} #{item.subject.url?.split('/').pop()}</Text>
        </>;
      }}
    </ListBoxItem>
  );
}

function preloadNotification(item: Notification) {
  switch (item?.subject.type) {
    case 'PullRequest':
      preload(PullRequestPage.query(), {owner: item.repository.owner.login, repo: item.repository.name, number: Number(item.subject.url.split('/').pop())});
      break;
    case 'Issue':
      preload(IssuePage.query(), {owner: item.repository.owner.login, repo: item.repository.name, number: Number(item.subject.url.split('/').pop())});
      break;
  }
}

function Notification({selectedItem, markAsRead}: {selectedItem: Notification | undefined, markAsRead: (id: string) => void}) {
  let content;
  switch (selectedItem?.subject.type) {
    case 'PullRequest':
      content = <PullRequestPage key={selectedItem.id} owner={selectedItem.repository.owner.login} repo={selectedItem.repository.name} number={Number(selectedItem.subject.url.split('/').pop())} />;
      break;
    case 'Issue':
      content = <IssuePage key={selectedItem.id} owner={selectedItem.repository.owner.login} repo={selectedItem.repository.name} number={Number(selectedItem.subject.url.split('/').pop())} />;
      break;
    default:
      content = (
        <div className="flex items-center justify-center h-full text-lg text-neutral-700 font-semibold">
          {selectedItem ? `Unknown item type: ${selectedItem.subject.type}` : 'No notification selected.'}
        </div>
      );
      break;
  }

  useEffect(() => {
    if (selectedItem?.unread) {
      markAsRead(selectedItem.id);
    }
  }, [selectedItem]);

  return (
    <div className="flex-1 overflow-auto flex flex-col" key={selectedItem?.id}>
      {content}
    </div>
  );
}
