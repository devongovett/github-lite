import { Issue, PullRequest, Repository } from '@octokit/graphql-schema';
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, SearchIcon, XCircleIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { ReactNode, useState } from 'react';
import { Autocomplete, Button, Input, Link, ListBox, ListBoxItem, Popover, SearchField, Select, SelectValue, useFilter } from 'react-aria-components';
import { mutate } from 'swr';
import { graphql, preload, useQuery } from './client';
import { Timeline } from './Timeline';
import { CommentCard } from './CommentCard';
import { Avatar, BranchName, Card, GithubLabel, IssueStatus, IssueTypeBadge } from './components';
import { IssueCommentForm } from './CommentForm';
import { GitHubLink } from './SlideOver';

export function IssuePage({owner, repo, number}: {owner: string, repo: string, number: number}) {
  let { data: res } = useQuery<{repository: Repository}>(IssuePage.query(), {owner, repo, number});
  let data = res?.repository.issue;
  if (!data) {
    return null;
  }

  async function deleteComment(id: string) {
    await graphql(`mutation DeleteIssueComment($id: ID!) { deleteIssueComment(input: {id: $id}) { clientMutationId } }`, { id });
    await mutate([IssuePage.query(), { owner, repo, number }]);
  }

  return (
    <div className="flex flex-1 justify-center min-h-0 overflow-hidden">
      <div className="overflow-y-auto">
        <div className="flex flex-col gap-4 my-4 max-w-3xl mx-auto px-4">
          <Header data={data} />
          <CommentCard data={data} />
          <Timeline items={data.timelineItems.nodes!} onDeleteComment={deleteComment} />
          <IssueCommentForm issue={data} />
        </div>
      </div>
      <IssueSidebar data={data} />
    </div>
  );
}

IssuePage.preload = (owner: string, repo: string, number: number) => {
  preload(IssuePage.query(), {owner, repo, number});
};

IssuePage.query = () => `
query IssueTimeline($owner: String!, $repo: String!, $number: Int!) {
  repository(owner:$owner, name:$repo) {
    issue(number:$number) {
      __typename
      id
      number
      url
      title
      body
      createdAt
      state
      author {
        ...ActorFragment
      }
      reactionGroups {
        ...ReactionFragment
      }
      repository {
        name
        owner {
          login
          avatarUrl
        }
        issueTypes(first: 20) {
          nodes {
            id
            name
            color
          }
        }
        labels(first: 100) {
          nodes {
            id
            name
            color
          }
        }
      }
      viewerCanClose
      labels(first: 20) {
        nodes {
          id
          name
          color
        }
      }
      assignees(first: 20) {
        nodes {
          login
          avatarUrl
          url
        }
      }
      milestone {
        title
        url
      }
      issueType {
        id
        name
        color
      }
      closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
        nodes {
          __typename
          number
          title
          url
          state
          isDraft
        }
      }
      timelineItems(first:100) {
        nodes {
          ...IssueTimelineFragment
        }
      }
    }
  }
}

${Timeline.issueFragment()}
`;

export function Header({data}: {data: Issue | PullRequest}) {
  let isPR = data.__typename === 'PullRequest';
  return (
    <div className="flex flex-col gap-2 bg-daw-white rounded-xl p-4 shadow-card">
      <div className="flex gap-2">
        <div className="flex gap-2 items-center">
          <Avatar src={data.repository.owner.avatarUrl} />
          <span className="text-daw-gray-700">{data.repository.owner.login}/{data.repository.name} <Link target="_blank" href={data.url}>#{data.number}</Link></span>
        </div>
        <IssueStatus data={data} />
      </div>
      <h1 className={`${isPR ? 'text-xl' : 'text-2xl'} font-semibold`}><Markdown>{data.title}</Markdown></h1>
      {'headRefName' in data && <>
        <div className="flex items-center gap-2">
          <BranchName>{data.headRefName}</BranchName>
          <ArrowRightIcon className="text-daw-gray-700" />
          <BranchName>{data.baseRefName}</BranchName>
        </div>
      </>}
    </div>
  );
}

function SidebarSection({title, children}: {title: string, children: ReactNode}) {
  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <h3 className="text-xs font-semibold text-daw-gray-600 tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function IssueSidebar({data}: {data: Issue}) {
  let anyData = data as any;
  let assignees = data.assignees?.nodes ?? [];
  let milestone = data.milestone;
  let linkedPRs: any[] = anyData.closedByPullRequestsReferences?.nodes ?? [];

  return (
    <Card className="w-60 shrink-0 h-fit max-h-full overflow-y-auto my-4 mr-4">
      <div className="flex flex-col text-sm">
        <SidebarSection title="Issue Type">
          <IssueTypeSelect data={data} />
        </SidebarSection>
        <SidebarSection title="Labels">
          <LabelsSelect data={data} />
        </SidebarSection>
        <SidebarSection title="Milestone">
          {milestone
            ? <Link href={milestone.url} target="_blank" className="hover:underline truncate">{milestone.title}</Link>
            : <span className="text-daw-gray-500 text-xs">No milestone</span>
          }
        </SidebarSection>
        <SidebarSection title="Assignees">
          {assignees.length === 0
            ? <span className="text-daw-gray-500 text-xs">No assignees</span>
            : <div className="flex flex-col gap-1.5">
                {assignees.map((a: any) => (
                  <div key={a.login} className="flex items-center gap-2">
                    <Avatar src={a.avatarUrl} />
                    <Link href={a.url} target="_blank" className="hover:underline truncate">{a.login}</Link>
                  </div>
                ))}
              </div>
          }
        </SidebarSection>
        <SidebarSection title="Linked PRs">
          {linkedPRs.length === 0
            ? <span className="text-daw-gray-500 text-xs">None yet</span>
            : <div className="flex flex-col gap-2">
                {linkedPRs.map((pr: any) => (
                  <div key={pr.number} className="flex gap-2">
                    <div className="shrink-0 mt-0.5"><IssueStatus data={pr} type="icon" /></div>
                    <GitHubLink href={pr.url} className="text-xs hover:underline outline-none focus-visible:underline font-medium line-clamp-2">{pr.title}</GitHubLink>
                  </div>
                ))}
              </div>
          }
        </SidebarSection>
      </div>
    </Card>
  );
}

const listBoxItemClass = 'flex items-center px-2 py-1 rounded-lg cursor-default outline-none focus:bg-daw-gray-100 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-blue-600 text-xs';

function IssueTypeSelect({data}: {data: Issue}) {
  let anyData = data as any;
  let issueType: any = anyData.issueType;
  let availableTypes: any[] = anyData.repository?.issueTypes?.nodes ?? [];
  let [selectedKey, setSelectedKey] = useState<string>(issueType?.id ?? 'none');

  let currentId = issueType?.id ?? 'none';
  if (selectedKey !== currentId) {
    setSelectedKey(currentId);
  }

  let displayType = availableTypes.find(t => t.id === selectedKey) ?? null;

  async function handleChange(key: React.Key | null) {
    let newId = String(key);
    setSelectedKey(newId);
    let issueTypeId = newId === 'none' ? null : newId;
    await graphql(
      `mutation UpdateIssueType($id: ID!, $issueTypeId: ID) {
        updateIssue(input: {id: $id, issueTypeId: $issueTypeId}) { issue { id } }
      }`,
      {id: data.id, issueTypeId}
    );
    await mutate([IssuePage.query(), {owner: data.repository.owner.login, repo: data.repository.name, number: data.number}]);
  }

  return (
    <Select value={selectedKey} onChange={handleChange} aria-label="Issue type">
      <Button className="group flex items-center gap-1 cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded-full -mx-0.5 px-0.5">
        <SelectValue>
          {displayType
            ? <IssueTypeBadge issueType={displayType} className="py-0.5 text-xs" />
            : <span className="text-daw-gray-500 text-xs">No issue type</span>}
        </SelectValue>
      <ChevronDownIcon size={12} className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-expanded:opacity-100 text-daw-gray-500 shrink-0 transition-opacity" />
      </Button>
      <Popover crossOffset={-30} className="bg-daw-white rounded-xl shadow-card outline-none p-1 min-w-44">
        <ListBox className="outline-none flex flex-col">
          <ListBoxItem id="none" textValue="No issue type" className={listBoxItemClass}>
            {({ isSelected }) => (
              <div className="flex items-center gap-2 w-full">
                <div className="w-3 shrink-0 text-daw-gray-700">
                  {isSelected && <CheckIcon size={12} />}
                </div>
                <span className="text-daw-gray-500 py-0.5">No issue type</span>
              </div>
            )}
          </ListBoxItem>
          {availableTypes.map((t: any) => (
            <ListBoxItem key={t.id} id={t.id} textValue={t.name} className={listBoxItemClass}>
              {({ isSelected }) => (
                <div className="flex items-center gap-2 w-full">
                  <div className="w-3 shrink-0 text-daw-gray-700">
                    {isSelected && <CheckIcon size={12} />}
                  </div>
                  <IssueTypeBadge issueType={t} className="py-0.5 text-xs" />
                </div>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}

function LabelsSelect({data}: {data: Issue}) {
  let availableLabels = (data.repository?.labels?.nodes ?? []);
  let [labels, setLabels] = useState(data.labels!.nodes!);
  let [isDirty, setIsDirty] = useState(false);

  let displayLabels = labels.sort((a, b) => a!.name.localeCompare(b!.name));
  let selected = data.labels!.nodes!.map(l => l!.id).sort();
  let [lastLabels, setLastLabels] = useState(selected);
  if (lastLabels.length !== selected.length || lastLabels.some((s, i) => s !== selected[i])) {
    setLastLabels(selected);
    setLabels(data.labels!.nodes!);
  }

  async function handleOpenChange(open: boolean) {
    if (!open && isDirty) {
      setIsDirty(false);
      await graphql(
        `mutation UpdateIssueLabels($id: ID!, $labelIds: [ID!]!) {
          updateIssue(input: {id: $id, labelIds: $labelIds}) { issue { id } }
        }`,
        {id: data.id, labelIds: displayLabels.map(s => s!.id)}
      );
      await mutate([IssuePage.query(), {owner: data.repository.owner.login, repo: data.repository.name, number: data.number}]);
    }
  }

  return (
    <Select
      selectionMode="multiple"
      value={displayLabels.map(s => s!.id)}
      onChange={keys => {
        setLabels(
          keys.map(key => data.labels!.nodes!.find(l => l!.id === key) || availableLabels.find(l => l!.id === key)!)
        );
        setIsDirty(true);
      }}
      onOpenChange={handleOpenChange}
      aria-label="Labels"
    >
      <Button className="group flex items-center gap-1 w-fit cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded-full -mx-0.5 px-0.5 text-left">
        <SelectValue className="flex flex-wrap gap-1 min-w-0">
          {displayLabels.length === 0
            ? <span className="text-daw-gray-500 text-xs">None yet</span>
            : displayLabels.map((l) => <GithubLabel key={l!.id} color={l!.color}>{l!.name}</GithubLabel>)
          }
        </SelectValue>
        <ChevronDownIcon size={12} className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-expanded:opacity-100 text-daw-gray-500 shrink-0 transition-opacity mt-0.5" />
      </Button>
      <Popover crossOffset={-30} className="bg-daw-white rounded-xl shadow-card outline-none min-w-44 flex flex-col">
        <Autocomplete filter={useFilter({sensitivity: 'base'}).contains}>
          <SearchField autoFocus aria-label="Search" className="min-w-0 m-1">
            <div className="flex items-center gap-1 rounded-lg px-2 py-1 focus-within:ring-2 ring-blue-500">
              <SearchIcon size={14} className="text-daw-gray-500 shrink-0" />
              <Input className="flex-1 text-sm outline-none bg-transparent min-w-0 placeholder:text-daw-gray-400" placeholder="Search..." />
            </div>
          </SearchField>
          <ListBox className="outline-none flex-1 flex flex-col rounded-xl p-1 scroll-p-1 overflow-y-auto">
            {availableLabels.sort((a, b) => a!.name.localeCompare(b!.name)).map((l) => (
              <ListBoxItem key={l!.id} id={l!.id} textValue={l!.name} className={listBoxItemClass}>
                {({isSelected}) => (
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-3 shrink-0 text-daw-gray-700">
                      {isSelected && <CheckIcon size={12} />}
                    </div>
                    <GithubLabel color={l!.color}>{l!.name}</GithubLabel>
                  </div>
                )}
              </ListBoxItem>
            ))}
          </ListBox>
        </Autocomplete>
      </Popover>
    </Select>
  );
}
