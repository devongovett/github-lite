import { AutomaticBaseChangeSucceededEvent, ClosedEvent, CommentDeletedEvent, Commit, ConvertToDraftEvent, CrossReferencedEvent, HeadRefDeletedEvent, HeadRefForcePushedEvent, IssueTimelineItems, LabeledEvent, MergedEvent, PullRequestCommit, PullRequestReview, PullRequestReviewThread, PullRequestTimelineItems, ReadyForReviewEvent, ReferencedEvent, RenamedTitleEvent, ReopenedEvent, ReviewDismissedEvent, ReviewRequestedEvent, UnlabeledEvent } from '@octokit/graphql-schema';
import { CheckCircleIcon, CommitIcon, CrossReferenceIcon, EyeIcon, GitBranchIcon, GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestDraftIcon, IssueClosedIcon, IssueReopenedIcon, PencilIcon, RepoPushIcon, SkipIcon, TagIcon, XIcon } from '@primer/octicons-react';
import { useContext } from 'react';
import { useDateFormatter } from 'react-aria';
import { Button, Link } from 'react-aria-components';
import { PullRequestContext } from './PullRequest';
import { CommentCard, CommentBody, Reactions } from './CommentCard';
import { Card, BranchName, GithubLabel, Icon, User, IssueStatus, Avatar, Status } from './components';
import { CommentForm } from './CommentForm';

export function Timeline({items}: {items: (IssueTimelineItems | PullRequestTimelineItems | null)[]}) {
  return <>
    {items.map((item, i) => {
      switch (item?.__typename) {
        case 'IssueComment':
          return <CommentCard key={item.id} data={item} />;
        case 'AutomaticBaseChangeSucceededEvent':
          return <BaseChanged key={item.id} data={item} />;
        case 'PullRequestCommit':
          return <Committed key={item.id} data={item} />;
        case 'HeadRefForcePushedEvent':
          return <ForcePushed key={item.id} data={item} />;
        case 'PullRequestReview':
          return <Reviewed key={item.id} data={item} />;
        case 'ReviewDismissedEvent':
          return <ReviewDismissed key={item.id} data={item} />;
        case 'RenamedTitleEvent':
          return <Renamed key={item.id} data={item} />;
        case 'LabeledEvent':
          return <Labeled key={item.id} data={item} />;
        case 'UnlabeledEvent':
          return <Unlabeled key={item.id} data={item} />;
        case 'ClosedEvent':
          return <Closed key={item.id} data={item} />;
        case 'ReopenedEvent':
          return <Reopened key={item.id} data={item} />;
        case 'MergedEvent':
          return <Merged key={item.id} data={item} />;
        case 'HeadRefDeletedEvent':
          return <BranchDeleted key={item.id} data={item} />;
        case 'CrossReferencedEvent':
          return <CrossReferenced key={item.id} data={item} />;
        case 'ReferencedEvent':
          return <Referenced key={item.id} data={item} />;
        case 'ReviewRequestedEvent':
          return <ReviewRequested key={item.id} data={item} />;
        case 'ConvertToDraftEvent':
          return <ConvertToDraft key={item.id} data={item} />;
        case 'ReadyForReviewEvent':
          return <ReadyForReview key={item.id} data={item} />;
        case 'CommentDeletedEvent':
          return <CommentDeleted key={item.id} data={item} />;
        case 'MentionedEvent':
        case 'SubscribedEvent':
          return null;
        default:
          return <p key={i}>Unknown event <code className="break-all">{JSON.stringify(item)}</code></p>;
      }
    })}
  </>;
}

Timeline.issueFragment = () => `
fragment IssueTimelineFragment on PullRequestTimelineItems {
  __typename
  ...IssueCommentFragment
  ...RenamedTitleFragment
  ...LabeledEventFragment
  ...UnlabeledEventFragment
  ...ClosedEventFragment
  ...ReopenedEventFragment
  ...CrossReferencedEventFragment
  ...ReferencedEventFragment
  ...CommentDeletedEventFragment
}

${CommentCard.fragment}
${Renamed.fragment}
${Labeled.fragment}
${Unlabeled.fragment}
${Closed.fragment}
${Reopened.fragment}
${User.fragment}
${Reactions.fragment}
${CrossReferenced.fragment}
${Referenced.fragment}
${CommentDeleted.fragment}
`;

Timeline.pullRequestFragment = () => `
fragment PullRequestTimelineFragment on PullRequestTimelineItems {
  ...IssueTimelineFragment
  ...BaseChangeEventFragment
  ...CommittedEventFragment
  ...ForcePushedEventFragment
  ...ReviewedEventFragment
  ...ReviewDismissedFragment
  ...MergedEventFragment
  ...BranchDeletedEventFragment
  ...ReviewRequestedEventFragment
  ...ConvertToDraftEventFragment
  ...ReadyForReviewEventFragment
}

${Timeline.issueFragment()}
${BaseChanged.fragment}
${Committed.fragment}
${ForcePushed.fragment}
${Reviewed.fragment}
${ReviewDismissed.fragment}
${Merged.fragment}
${BranchDeleted.fragment}
${PullRequestThread.fragment}
${ReviewRequested.fragment}
${ConvertToDraft.fragment}
${ReadyForReview.fragment}
`;

function Labeled({data}: {data: LabeledEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><TagIcon /></Icon>
      <span><User actor={data.actor!} /> added the <GithubLabel color={data.label.color}>{data.label.name}</GithubLabel> label</span>
    </div>
  );
}

Labeled.fragment = `
fragment LabeledEventFragment on LabeledEvent {
  id
  actor {
    ...ActorFragment
  }
  label {
    name
    color
  }
}
`;

function Unlabeled({data}: {data: UnlabeledEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><TagIcon /></Icon>
      <span><User actor={data.actor!} /> removed the <GithubLabel color={data.label.color}>{data.label.name}</GithubLabel> label</span>
    </div>
  );
}

Unlabeled.fragment = `
fragment UnlabeledEventFragment on UnlabeledEvent {
  id
  actor {
    ...ActorFragment
  }
  label {
    name
    color
  }
}
`;

function Closed({data}: {data: ClosedEvent}) {
  return (
    <div className="flex items-center gap-2">
      {data.stateReason === "NOT_PLANNED" ? (
        <Icon className="bg-daw-gray-300 text-daw-gray-800"><SkipIcon /></Icon>
      ) : (
        <Icon className="bg-purple-600 text-white"><IssueClosedIcon /></Icon>
      )}
      <span><User actor={data.actor!} /> closed this as {data.stateReason?.toLowerCase()}</span>
    </div>
  );
}

Closed.fragment = `
fragment ClosedEventFragment on ClosedEvent {
  id
  actor {
    ...ActorFragment
  }
  stateReason
}
`;

function Reopened({data}: {data: ReopenedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-green-600 text-white"><IssueReopenedIcon /></Icon>
      <span><User actor={data.actor!} /> reopened this</span>
    </div>
  );
}

Reopened.fragment = `
fragment ReopenedEventFragment on ReopenedEvent {
  id
  actor {
    ...ActorFragment
  }
}
`;

function Merged({data}: {data: MergedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-purple-600 text-white"><GitMergeIcon /></Icon>
      <span><User actor={data.actor!} /> merged commit <CommitLink commit={data.commit!} /> into <BranchName>{data.mergeRefName}</BranchName></span>
    </div>
  );
}

Merged.fragment = `
fragment MergedEventFragment on MergedEvent {
  id
  actor {
    ...ActorFragment
  }
  commit {
    url
    abbreviatedOid
  }
  mergeRefName
}
`;

function CommitLink({commit}: {commit: Commit}) {
  return <Link target="_blank" href={commit.url} className="text-sm hover:underline"><code>{commit.abbreviatedOid}</code></Link>;
}

function BranchDeleted({data}: {data: HeadRefDeletedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><GitBranchIcon /></Icon>
      <span><User actor={data.actor!} /> deleted the <BranchName>{data.headRefName}</BranchName> branch</span>
    </div>
  );
}

BranchDeleted.fragment = `
fragment BranchDeletedEventFragment on HeadRefDeletedEvent {
  id
  actor {
    ...ActorFragment
  }
  headRefName
}
`;

function Renamed({data}: {data: RenamedTitleEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><PencilIcon /></Icon>
      <span><User actor={data.actor!} /> changed the title from <del>{data.previousTitle}</del> to <ins>{data.currentTitle}</ins></span>
    </div>
  );
}

Renamed.fragment = `
fragment RenamedTitleFragment on RenamedTitleEvent {
  id
  actor {
    ...ActorFragment
  }
  previousTitle
  currentTitle
}
`;

function Reviewed({data}: {data: PullRequestReview}) {
  let pr = useContext(PullRequestContext);
  let threadsById = new Map();
  for (let thread of pr?.reviewThreads.nodes!) {
    threadsById.set(thread?.comments.nodes?.[0]?.id, thread);
  }

  return (
    <div
      className="grid items-center gap-2"
      style={{
        gridTemplateAreas: `
          "icon description"
          ".    issue"
        `,
        gridTemplateColumns: 'min-content 1fr'
      }}>
      {data.state === 'CHANGES_REQUESTED'
        ? <Icon className="bg-red-600 text-white"><GitPullRequestClosedIcon /></Icon>
        : data.state === 'APPROVED'
        ? <Icon className="bg-green-600 text-white"><CheckCircleIcon /></Icon>
        : <Icon className="bg-daw-gray-300 text-daw-gray-800"><EyeIcon /></Icon>}
      <div style={{gridArea: 'description'}}><User actor={data.author!} />  {data.state === 'CHANGES_REQUESTED' ? 'requested changes' : data.state === 'APPROVED' ? 'approved' : 'reviewed'}</div>
      {(data.body || !!data.comments?.nodes?.length) && (
        <div style={{gridArea: 'issue'}} className="flex flex-col gap-2">
          {data.body &&
            <Card>
              <CommentBody>{data.body}</CommentBody>
            </Card>
          }
          {data.comments.nodes?.map(comment => {
            let thread = threadsById.get(comment?.id);
            if (thread) {
              return <PullRequestThread key={thread.id} data={thread} />;
            }
          })}
        </div>
      )}
    </div>
  );
}

Reviewed.fragment = `
fragment ReviewedEventFragment on PullRequestReview {
  id
  author {
    ...ActorFragment
  }
  body
  createdAt
  reactionGroups {
    ...ReactionFragment
  }
  state
  comments(first:100) {
    nodes {
      id
    }
  }
}
`;

function PullRequestThread({data}: {data: PullRequestReviewThread}) {
  let df = useDateFormatter({
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  return (
    <Card>
      <details open={!data.isCollapsed}>
        <summary className="font-mono text-xs cursor-default">
          {data.path}
        </summary>
        <div className="flex flex-col gap-4 pt-3 mt-3 border-t border-daw-gray-200">
          {data.comments.nodes?.map(comment => (
            <div key={comment!.id} className="flex flex-col gap-2 pb-4 border-b border-daw-gray-200">
              <div>
                <User actor={comment!.author!} />
                {' • '}
                <span className="text-xs text-daw-gray-600" style={{gridArea: 'date'}}>{df.format(new Date(comment!.createdAt))}</span>
              </div>
              <div style={{gridArea: 'body'}}>
                <CommentBody>{comment!.body}</CommentBody>
              </div>
              {comment!.reactionGroups && <Reactions id={comment!.id} data={comment!.reactionGroups} />}
            </div>
          ))}
          <CommentForm>
            {data.viewerCanResolve &&
              <Button className="flex-shrink-0 px-4 py-2 rounded-md bg-daw-gray-300 pressed:bg-daw-gray-400 border border-daw-gray-400 pressed:border-daw-gray-500 text-daw-gray-800 text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Resolve conversation</Button>
            }
          </CommentForm>
        </div>
      </details>
    </Card>
  );
}

PullRequestThread.fragment = `
fragment PullRequestThreadFragment on PullRequestReviewThread {
  id
  isCollapsed
  isOutdated
  isResolved
  resolvedBy {
    ...ActorFragment
  }
  line
  path
  viewerCanResolve
  comments(first:100) {
    nodes {
      id
      author {
        ...ActorFragment
      }
      body
      createdAt
      reactionGroups {
        ...ReactionFragment
      }
      isMinimized
      minimizedReason
      startLine
      line
      path
      state
      outdated
    }
  }
}
`;

function ReviewDismissed({data}: {data: ReviewDismissedEvent}) {
  return (
    <div
      className="grid items-center gap-2"
      style={{
        gridTemplateAreas: `
          "icon description"
          ".    issue"
        `,
        gridTemplateColumns: 'min-content 1fr'
      }}>
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><XIcon /></Icon>
      <span><User actor={data.actor!} /> dismissed <Link href={data.review!.author!.url} target="_blank" className="font-semibold hover:underline">{data.review!.author!.login}</Link>'s stale review {data.pullRequestCommit && <>via <CommitLink commit={data.pullRequestCommit.commit} /></>}</span>
      {data.dismissalMessage && (
        <Card gridArea="issue">
          <CommentBody>{data.dismissalMessage}</CommentBody>
        </Card>
      )}
    </div>
  );
}

ReviewDismissed.fragment = `
fragment ReviewDismissedFragment on ReviewDismissedEvent {
  id
  actor {
    ...ActorFragment
  }
  review {
    author {
      login
      url
    }
  }
  dismissalMessage
  pullRequestCommit {
    commit {
      url
      abbreviatedOid
    }
  }
}
`;

function CrossReferenced({data}: {data: CrossReferencedEvent}) {
  return (
    <div
      className="grid items-center gap-2"
      style={{
        gridTemplateAreas: `
          "icon description"
          ".    issue"
        `,
        gridTemplateColumns: 'min-content 1fr'
      }}>
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><CrossReferenceIcon /></Icon>
      <span><User actor={data.actor!} /> referenced this</span>
      <Card gridArea="issue">
        <div className="flex gap-1 items-center">
          <div className="flex flex-col gap-1 flex-1">
            <Link href={data.source.url} target="_blank" className="truncate font-semibold outline-none hover:underline focus-visible:underline">{data.source.title}</Link>
            {data.isCrossRepository &&
              <div className="flex gap-1 items-center">
                <Avatar src={data.source.repository.owner.avatarUrl} />
                <Link target="_blank" href={data.source.url} className="text-daw-gray-700 outline-none hover:underline focus-visible:underline">{data.source.repository.owner.login}/{data.source.repository.name} #{data.source.number}</Link>
              </div>
            }
            {!data.isCrossRepository && <Link target="_blank" href={data.source.url} className="text-daw-gray-700 outline-none hover:underline focus-visible:underline">#{data.source.number}</Link>}
          </div>
          <IssueStatus data={data.source} />
        </div>
      </Card>
    </div>
  );
}

CrossReferenced.fragment = `
fragment CrossReferencedEventFragment on CrossReferencedEvent {
  id
  actor {
    ...ActorFragment
  }
  isCrossRepository
  source {
    __typename
    ...on Issue {
      title
      number
      url
      number
      repository {
        name
        url
        owner {
          login
          avatarUrl
        }
      }
      state
    }
    ...on PullRequest {
      title
      number
      url
      number
      repository {
        name
        url
        owner {
          login
          avatarUrl
        }
      }
      state
    }
  }
}
`;

function Referenced({data}: {data: ReferencedEvent}) {
  return (
    <div
      className="grid items-center gap-2"
      style={{
        gridTemplateAreas: `
          "icon description"
          ".    commit"
        `,
        gridTemplateColumns: 'min-content 1fr'
      }}>
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><CrossReferenceIcon /></Icon>
      <span><User actor={data.actor!} /> referenced this pull request</span>
      <div style={{gridArea: 'commit'}} className="flex gap-2">
        <span className="flex-1 line-clamp-2 text-sm"><Link href={data.commit!.commitUrl} target="_blank" className="hover:underline">{data.commit!.message}</Link></span>
        {data.commit!.statusCheckRollup && <Status state={data.commit!.statusCheckRollup.state} />}
        <CommitLink commit={data.commit!} />
      </div>
    </div>
  );
}

Referenced.fragment = `
fragment ReferencedEventFragment on ReferencedEvent {
  id
  actor {
    ...ActorFragment
  }
  isCrossRepository
  commit {
    url
    abbreviatedOid
    message
    commitUrl
    author {
      user {
        login
      }
      avatarUrl
    }
    statusCheckRollup {
      state
    }
  }
}
`;

function Committed({data}: {data: PullRequestCommit}) {
  return (
    <div className="flex gap-2 items-center">
      <Icon className="text-daw-gray-800"><CommitIcon /></Icon>
      <Avatar src={data.commit.author!.avatarUrl} />
      <span className="flex-1 line-clamp-2 text-sm"><Link href={data.commit.commitUrl} target="_blank" className="hover:underline">{data.commit.message}</Link></span>
      {data.commit.statusCheckRollup && <Status state={data.commit.statusCheckRollup.state} />}
      <CommitLink commit={data.commit} />
    </div>
  );
}

Committed.fragment = `
fragment CommittedEventFragment on PullRequestCommit {
  id
  commit {
    url
    abbreviatedOid
    message
    commitUrl
    author {
      user {
        login
      }
      avatarUrl
    }
    statusCheckRollup {
      state
    }
  }
}
`;

function ForcePushed({data}: {data: HeadRefForcePushedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><RepoPushIcon /></Icon>
      <span><User actor={data.actor!} /> force-pushed the {data.ref && <BranchName>{data.ref.name}</BranchName>} branch from <CommitLink commit={data.beforeCommit!} /> to <CommitLink commit={data.afterCommit!} /></span>
    </div>
  );
}

ForcePushed.fragment = `
fragment ForcePushedEventFragment on HeadRefForcePushedEvent {
  id
  actor {
    ...ActorFragment
  }
  beforeCommit {
    url
    abbreviatedOid
  }
  afterCommit {
    url
    abbreviatedOid
  }
  ref {
    name
  }
}
`;

function BaseChanged({data}: {data: AutomaticBaseChangeSucceededEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-green-600 text-white"><GitBranchIcon /></Icon>
      <span>Base automatically changed from <BranchName>{data.oldBase}</BranchName> to <BranchName>{data.newBase}</BranchName></span>
    </div>
  );
}

BaseChanged.fragment = `
fragment BaseChangeEventFragment on AutomaticBaseChangeSucceededEvent {
  id
  newBase
  oldBase
}
`;

function ReviewRequested({data}: {data: ReviewRequestedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-green-600 text-white"><EyeIcon /></Icon>
      <span><User actor={data.actor!} /> requested a review{'login' in data.requestedReviewer! && <> from <Link href={data.requestedReviewer!.url} target="_blank" className="hover:underline font-semibold">{data.requestedReviewer!.login}</Link></>}</span>
    </div>
  );
}

ReviewRequested.fragment = `
fragment ReviewRequestedEventFragment on ReviewRequestedEvent {
  actor {
    ...ActorFragment
  }
  requestedReviewer {
    ...on Actor {
      login
      url
    }
  }
}
`;

function ConvertToDraft({data}: {data: ConvertToDraftEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><GitPullRequestDraftIcon /></Icon>
      <span><User actor={data.actor!} /> marked this pull request as a draft</span>
    </div>
  );
}

ConvertToDraft.fragment = `
fragment ConvertToDraftEventFragment on ConvertToDraftEvent {
  actor {
    ...ActorFragment
  }
}
`;

function ReadyForReview({data}: {data: ReadyForReviewEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><EyeIcon /></Icon>
      <span><User actor={data.actor!} /> marked this pull request as ready for review</span>
    </div>
  );
}

ReadyForReview.fragment = `
fragment ReadyForReviewEventFragment on ReadyForReviewEvent {
  actor {
    ...ActorFragment
  }
}
`;

function CommentDeleted({data}: {data: CommentDeletedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-daw-gray-300 text-daw-gray-800"><XIcon /></Icon>
      <span><User actor={data.actor!} /> deleted a comment from <Link href={data.deletedCommentAuthor!.url} target="_blank" className="hover:underline font-semibold">{data.deletedCommentAuthor!.login}</Link></span>
    </div>
  );
}

CommentDeleted.fragment = `
fragment CommentDeletedEventFragment on CommentDeletedEvent {
  actor {
    ...ActorFragment
  }
  deletedCommentAuthor {
    login
    url
  }
}
`;
