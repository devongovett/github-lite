import {RestEndpointMethodTypes} from '@octokit/rest';
import {github, preload} from './client';
import { PullRequest } from './PullRequest';
import { Issue } from './Issue';
import { ListBox, Item, Text, RouterProvider } from 'react-aria-components';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import useSWR from 'swr';

type Notification = RestEndpointMethodTypes["activity"]["listNotificationsForAuthenticatedUser"]["response"]["data"][0];

async function fetchNotifications() {
  let res = await github.activity.listNotificationsForAuthenticatedUser({page: 1, all: true});

  for (let item of res.data.slice(0, 10)) {
    preloadNotification(item);
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
  let {data} = useSWR('notifications', fetchNotifications);
  let {pathname} = useLocation();

  return (
    <div className="flex h-full">
      <div className="w-[280px] border-r border-daw-gray-300 overflow-hidden">
        <ListBox
          aria-label="Notifications"
          items={data}
          selectionMode="single"
          selectionBehavior="replace"
          // @ts-ignore - TODO expose in RAC
          linkBehavior="selection"
          selectedKeys={[pathname]}
          disallowEmptySelection
          className="h-full max-h-[100vh] overflow-auto p-2 flex flex-col gap-1">
          {item => <NotificationItem item={item} />}
        </ListBox>
      </div>
      <Routes>
        <Route path="/*" element={<Notification selectedItem={data?.find(d => d.id === pathname.slice(1))} />} />
      </Routes>
    </div>
  );
}

function NotificationItem({item}: {item: Notification}) {
  return (
    <Item
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
    </Item>
  );
}

function preloadNotification(item: Notification) {
  switch (item?.subject.type) {
    case 'PullRequest':
      preload(PullRequest.query(), {owner: item.repository.owner.login, repo: item.repository.name, number: Number(item.subject.url.split('/').pop())});
      break;
    case 'Issue':
      preload(Issue.query(), {owner: item.repository.owner.login, repo: item.repository.name, number: Number(item.subject.url.split('/').pop())});
      break;
  }
}

function Notification({selectedItem}: {selectedItem: Notification | undefined}) {
  let content;
  switch (selectedItem?.subject.type) {
    case 'PullRequest':
      content = <PullRequest key={selectedItem.id} owner={selectedItem.repository.owner.login} repo={ selectedItem.repository.name} number={Number(selectedItem.subject.url.split('/').pop())} />;
      break;
    case 'Issue':
      content = <Issue key={selectedItem.id} owner={selectedItem.repository.owner.login} repo={ selectedItem.repository.name} number={Number(selectedItem.subject.url.split('/').pop())} />;
      break;
    default:
      content = (
        <div className="flex items-center justify-center h-full text-lg text-gray-700 font-semibold">
          {selectedItem ? `Unknown item type: ${selectedItem.subject.type}` : 'No notification selected.'}
        </div>
      );
      break;
  }

  return (
    <div className="flex-1 overflow-auto" key={selectedItem?.id}>
      {content}
    </div>
  );
}
