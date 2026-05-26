import { ListBox, ListBoxItem, RouterProvider } from 'react-aria-components';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BellIcon, CommentDiscussionIcon, GitPullRequestIcon, IssueOpenedIcon } from '@primer/octicons-react';
import { NotificationsView } from './Notifications';
import { IssuesView } from './Issues';
import { PullsView } from './Pulls';
import { DiscussionsView } from './Discussions';

export function App() {
  let navigate = useNavigate();
  if (!localStorage.token) {
    return <Login />;
  }
  return (
    <RouterProvider navigate={navigate}>
      <div className="flex h-full">
        <SourceSelector />
        <Routes>
          <Route path="/notifications/*" element={<NotificationsView />} />
          <Route path="/issues/*" element={<IssuesView />} />
          <Route path="/pulls/*" element={<PullsView />} />
          <Route path="/discussions/*" element={<DiscussionsView />} />
          <Route path="*" element={<Navigate to="/notifications" replace />} />
        </Routes>
      </div>
    </RouterProvider>
  );
}

function Login() {
  return <h1>Login</h1>;
}

function SourceSelector() {
  let {pathname} = useLocation();
  let source = '/' + pathname.split('/')[1];

  return (
    <ListBox
      aria-label="Source"
      selectionMode="single"
      selectionBehavior="replace"
      // @ts-ignore - TODO expose in RAC
      linkBehavior="selection"
      selectedKeys={[source]}
      disallowEmptySelection
      className="w-16 border-r border-daw-gray-300 flex flex-col py-2 gap-0.5 items-stretch px-1.5 shrink-0">
      <ListBoxItem id="/notifications" href="/notifications" textValue="Inbox"
        className="flex flex-col items-center gap-1 py-2 rounded-md cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600">
        <BellIcon size={18} />
        <span className="text-[10px] font-medium leading-none">Inbox</span>
      </ListBoxItem>
      <ListBoxItem id="/issues" href="/issues" textValue="Issues"
        className="flex flex-col items-center gap-1 py-2 rounded-md cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600">
        <IssueOpenedIcon size={18} />
        <span className="text-[10px] font-medium leading-none">Issues</span>
      </ListBoxItem>
      <ListBoxItem id="/pulls" href="/pulls" textValue="Pull Requests"
        className="flex flex-col items-center gap-1 py-2 rounded-md cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600">
        <GitPullRequestIcon size={18} />
        <span className="text-[10px] font-medium leading-none">PRs</span>
      </ListBoxItem>
      <ListBoxItem id="/discussions" href="/discussions" textValue="Discussions"
        className="flex flex-col items-center gap-1 py-2 rounded-md cursor-default outline-none hover:bg-daw-gray-100 selected:bg-daw-gray-900 selected:text-daw-white focus-visible:outline-2 outline-blue-600">
        <CommentDiscussionIcon size={18} />
        <span className="text-[10px] font-medium leading-none">Discuss</span>
      </ListBoxItem>
    </ListBox>
  );
}
