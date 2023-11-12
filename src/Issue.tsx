import { Issue, PullRequest, Repository } from '@octokit/graphql-schema';
import { ArrowRightIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { Link } from 'react-aria-components';
import { useQuery } from './client';
import { Timeline } from './Timeline';
import { CommentCard } from './CommentCard';
import { Avatar, BranchName, IssueStatus } from './components';
import { IssueCommentForm } from './CommentForm';

export function IssuePage({owner, repo, number}: {owner: string, repo: string, number: number}) {
  let { data: res } = useQuery<{repository: Repository}>(IssuePage.query(), {owner, repo, number});
  let data = res?.repository.issue;
  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 my-4 max-w-3xl mx-auto">
      <Header data={data} />
      <CommentCard data={data} />
      <Timeline items={data.timelineItems.nodes!} />
      <IssueCommentForm issue={data} />
    </div>
  );
}

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
      }
      viewerCanClose
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
  return (
    <div className="flex flex-col gap-2 mb-2">
      <div className="flex gap-2">
        <div className="flex gap-2 items-center">
          <Avatar src={data.repository.owner.avatarUrl} />
          <span className="text-daw-gray-700">{data.repository.owner.login}/{data.repository.name} <Link target="_blank" href={data.url}>#{data.number}</Link></span>
        </div>
        <IssueStatus data={data} />
      </div>
      <h1 className="text-2xl font-semibold"><Markdown>{data.title}</Markdown></h1>
      {'headRef' in data && data.headRef && <>
        <div className="flex items-center gap-2">
          <BranchName>{data.headRef!.name}</BranchName>
          <ArrowRightIcon className="text-daw-gray-700" />
          <BranchName>{data.baseRef!.name}</BranchName>
        </div>
      </>}
    </div>
  );
}
