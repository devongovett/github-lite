import { Actor, AutomaticBaseChangeSucceededEvent, CheckConclusionState, ClosedEvent, Commit, HeadRefDeletedEvent, HeadRefForcePushedEvent, Issue, IssueComment, IssueTimelineItems, LabeledEvent, MergedEvent, PullRequest, PullRequestCommit, PullRequestReview, PullRequestReviewComment, PullRequestReviewDecision, PullRequestReviewState, PullRequestReviewThread, PullRequestTimelineItems, ReactionContent, ReactionGroup, RenamedTitleEvent, ReopenedEvent, Repository, ReviewDismissedEvent, StatusState } from '@octokit/graphql-schema';
import { AlertIcon, ArrowRightIcon, CheckCircleIcon, CheckIcon, CommentIcon, CommitIcon, EyeIcon, GitBranchIcon, GitMergeIcon, GitPullRequestClosedIcon, IssueClosedIcon, IssueReopenedIcon, PencilIcon, RepoPushIcon, SmileyIcon, StopIcon, TagIcon, XIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { DOMAttributes, FormEvent, ReactNode, cloneElement, useContext, useState } from 'react';
import { useDateFormatter } from 'react-aria';
import { Button, Dialog, DialogTrigger, Label, Link, Popover, TextArea, TextField, ToggleButton } from 'react-aria-components';
import { PullRequestContext } from './PullRequest';
import { github, graphql, useQuery } from './client';

export function Issue({owner, repo, number}: {owner: string, repo: string, number: number}) {
  let { data: res } = useQuery<{repository: Repository}>(Issue.query(), {owner, repo, number});
  let data = res?.repository.issue;
  if (!data) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 my-4 max-w-3xl mx-auto">
      <Header data={data} />
      <IssueCard data={data} />
      <Timeline items={data.timelineItems.nodes!} />
      <Comment issue={data} />
    </div>
  );
}

Issue.query = () => `
query IssueTimeline($owner: String!, $repo: String!, $number: Int!) {
  repository(owner:$owner, name:$repo) {
    issue(number:$number) {
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

let avatarSizes = {
  s: 'w-5',
  l: 'w-10'
}

function Avatar({src, size = 's', className}: {size?: keyof typeof avatarSizes, src: string, className?: string}) {
  return <img src={src} className={`${avatarSizes[size]} aspect-square rounded-full ${className}`} />;
}

function BranchName({children}: {children: string}) {
  return <span className="bg-daw-blue-100 border border-daw-blue-200 text-daw-blue-800 text-xs font-mono py-[2px] px-2 rounded">{children}</span>;
}

let states = {
  MERGED: 'bg-daw-purple-100 border-daw-purple-200 text-daw-purple-700',
  CLOSED: 'bg-daw-red-100 border-daw-red-200 text-daw-red-700',
  OPEN: 'bg-daw-green-100 border-daw-green-200 text-daw-green-700',
  DRAFT: 'bg-daw-gray-200 border-daw-gray-300 text-daw-gray-800'
};

function IssueStatus({data}: {data: PullRequest | Issue}) {
  let state: keyof typeof states = data.state;
  if ('isDraft' in data && data.isDraft) {
    state = 'DRAFT';
  }
  return <span className={`capitalize w-fit px-2 rounded border text-sm font-medium ${states[state]}`}>{state.toLowerCase()}</span>
}

let checkStates = {
  EXPECTED: 'bg-daw-yellow-500',
  PENDING: 'bg-daw-yellow-500',
  ACTION_REQUIRED: 'bg-daw-yellow-500',
  ERROR: 'bg-daw-red-500',
  FAILURE: 'bg-daw-red-500',
  SUCCESS: 'bg-daw-green-500',
  CANCELLED: 'bg-daw-gray-500',
  NEUTRAL: 'bg-daw-gray-500',
  SKIPPED: 'bg-daw-gray-500',
  STALE: 'bg-daw-gray-500',
  STARTUP_FAILURE: 'bg-daw-red-500',
  TIMED_OUT: 'bg-daw-red-500',

  CHANGES_REQUESTED: 'bg-daw-red-500',
  REVIEW_REQUIRED: 'bg-daw-red-500',
  APPROVED: 'bg-daw-green-500',
  COMMENTED: 'bg-daw-gray-500',
  DISMISSED: 'bg-daw-gray-500'
};

let checkIcons = {
  EXPECTED: null,
  PENDING: null,
  ERROR: null,
  FAILURE: <XIcon className="text-daw-red-500" />,
  ACTION_REQUIRED: <AlertIcon className="text-daw-yellow-600" />,
  CANCELLED: <StopIcon className="text-daw-gray-500" />,
  STARTUP_FAILURE: <XIcon className="text-daw-red-500" />,
  TIMED_OUT: <XIcon className="text-daw-red-500" />,
  SUCCESS: <CheckIcon className="text-daw-green-500" />,
  NEUTRAL: null,
  STALE: null,
  SKIPPED: null,

  CHANGES_REQUESTED: <XIcon className="text-daw-red-500" />,
  REVIEW_REQUIRED: <XIcon className="text-daw-red-500" />,
  APPROVED: <CheckIcon className="text-daw-green-500" />,
  COMMENTED: <CommentIcon className="text-daw-gray-500" />,
  DISMISSED: null
};

export function Status({state, filled}: {state: StatusState | CheckConclusionState | PullRequestReviewState | PullRequestReviewDecision, filled?: boolean}) {
  let icon = checkIcons[state];
  if (filled && icon) {
    return <span className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${checkStates[state]}`}>{cloneElement(icon, {className: 'text-white'})}</span>
  }
  if (icon) {
    return icon;
  }
  return <span className={`w-2 h-2 rounded-full ${checkStates[state]}`} />
}

interface CardProps extends DOMAttributes<Element> {
  children: ReactNode,
  gridArea?: string
}

export function Card({children, gridArea, ...otherProps}: CardProps) {
  return (
    <div className="bg-daw-white border border-daw-gray-200 rounded-lg p-3" style={{gridArea}} {...otherProps}>
      {children}
    </div>
  );
}

export function Timeline({items}: {items: (IssueTimelineItems | PullRequestTimelineItems | null)[]}) {
  return <>
    {items.map((item, i) => {
      switch (item?.__typename) {
        case 'IssueComment':
          return <IssueCard key={item.id} data={item} />;
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
        case 'ClosedEvent':
          return <Closed key={item.id} data={item} />;
        case 'ReopenedEvent':
          return <Reopened key={item.id} data={item} />;
        case 'MergedEvent':
          return <Merged key={item.id} data={item} />;
        case 'HeadRefDeletedEvent':
          return <BranchDeleted key={item.id} data={item} />;
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
  ...ClosedEventFragment
  ...ReopenedEventFragment
}

${IssueCard.fragment}
${Renamed.fragment}
${Labeled.fragment}
${Closed.fragment}
${Reopened.fragment}
${User.fragment}
${Reactions.fragment}
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
`;

export function IssueCard({data}: {data: Issue | PullRequest | IssueComment | PullRequestReviewComment}) {
  let df = useDateFormatter({
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  return (
    <Card>
      <div 
        className="grid gap-x-2"
        style={{
          gridTemplateAreas: `
            "avatar    username"
            "avatar    date"
            ".         ."
            "body      body"
            ".         ."
            "reactions reactions"
          `,
          gridTemplateRows: 'auto auto 8px auto 8px auto',
          gridTemplateColumns: '40px 1fr'
        }}>
        <Avatar size="l" className="[grid-area:avatar]" src={data.author!.avatarUrl} />
        <span className="font-medium text-sm" style={{gridArea: 'username'}}>{data.author!.login}</span>
        <span className="text-xs text-daw-gray-600" style={{gridArea: 'date'}}>{df.format(new Date(data.createdAt))}</span>
        <div style={{gridArea: 'body'}}>
          <CommentBody>{data.body}</CommentBody>
        </div>
        {data.reactionGroups && <Reactions id={data.id} data={data.reactionGroups} />}
      </div>
    </Card>
  );
}

IssueCard.fragment = `
fragment IssueCommentFragment on IssueComment {
  id
  body
  createdAt
  author {
    ...ActorFragment
  }
  reactionGroups {
    ...ReactionFragment
  }
}
`;

function CommentBody({children}: {children: string}) {
  return (
    <Markdown options={{
      overrides: {
        img: {props: {style: {maxWidth: '100%'}}},
        pre: {
          props: {
            className: 'border border-daw-gray-200 rounded p-2 bg-daw-gray-50',
            style: {
              whiteSpace: 'pre-wrap'
            }
          }
        },
        h1: {
          props: {className: 'text-3xl font-semibold my-3 pb-1 border-b-2 border-daw-gray-200'}
        },
        h2: {
          props: {className: 'text-2xl font-semibold my-3'}
        },
        h3: {
          props: {className: 'text-xl font-semibold my-3'}
        },
        a: {
          component: (props: any) => <Link {...props} className="underline" target="_blank">{props.children}</Link>,
          props: {target: '_blank'}
        },
        p: {
          props: {
            className: 'my-2',
            style: {
              wordBreak: 'break-word'
            }
          }
        }
      }
    }}>
    {children}
    </Markdown>
  );
}

const emojis: Record<ReactionContent, string> = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  CONFUSED: '😕',
  EYES: '👀',
  HEART: '❤️',
  HOORAY: '🎉',
  LAUGH: '😄',
  ROCKET: '🚀'
};

const reactionClass = "rounded-full text-sm bg-daw-gray-100 border border-daw-gray-200 hover:border-daw-gray-300 pressed:border-daw-gray-300 selected:bg-daw-blue-100 selected:border-daw-blue-200 selected:hover:border-daw-blue-300 selected:pressed:border-daw-blue-300 cursor-default flex items-center justify-center outline-none focus-visible:outline-blue-600 outline-offset-2";

function Reactions({id, data: initialData}: {id: string, data: ReactionGroup[]}) {
  let [data, setData] = useState(initialData);
  let toggleReaction = async (emoji: ReactionContent, isSelected: boolean) => {
    if (isSelected) {
      let data = graphql<{addReaction: {reactionGroups: ReactionGroup[]}}>(`
        mutation AddReaction($input: AddReactionInput!) {
          addReaction(input: $input) {
            reactionGroups {
              ...ReactionFragment
            }
          }
        }

        ${Reactions.fragment}
      `, {input: {subjectId: id, content: emoji}});
      setData((await data).addReaction.reactionGroups);
    } else {
      let data = await graphql<{removeReaction: {reactionGroups: ReactionGroup[]}}>(`
      mutation RemoveReaction($input: RemoveReactionInput!) {
        removeReaction(input: $input) {
          reactionGroups {
            ...ReactionFragment
          }
        }
      }

      ${Reactions.fragment}
    `, {input: {subjectId: id, content: emoji}});
      setData((await data).removeReaction.reactionGroups);
    }
  };

  return (
    <div className="flex gap-2" style={{gridArea: 'reactions'}}>
      <DialogTrigger>
        <Button className={`${reactionClass} px-1.5 aspect-square`}><SmileyIcon /></Button>
        <Popover placement="top start">
          <Dialog className="border border-daw-gray-300 bg-daw-white shadow-lg flex gap-2 p-2 rounded-md outline-none">
            {({close}) => 
              Object.keys(emojis).map(emoji => (
                <ToggleButton
                  key={emoji}
                  isSelected={data.find(r => r.content === emoji)?.viewerHasReacted}
                  onChange={s => {
                    toggleReaction(emoji as ReactionContent, s);
                    close();
                  }}
                  className={`${reactionClass} px-2 py-0.5`}>
                  {emojis[emoji as ReactionContent]}
                </ToggleButton>
              )
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
      {data.filter(r => r.reactors.totalCount > 0).map(r =>
        <ToggleButton 
          isSelected={r.viewerHasReacted}
          onChange={s => toggleReaction(r.content, s)}
          className={`${reactionClass} px-2 py-0.5`}
          key={r.content}>
          {emojis[r.content]} {r.reactors.totalCount}
        </ToggleButton>
      )}
    </div>
  );
}

Reactions.fragment = `
fragment ReactionFragment on ReactionGroup {
  content
  viewerHasReacted
  reactors {
    totalCount
  }
}
`;

function GithubLabel({color, children}: {color: string, children: ReactNode}) {
  return <span className="px-3 py-0.5 text-white rounded-full text-xs font-semibold" style={{background: '#' + color}}>{children}</span>;
}

export function User({actor}: {actor: Actor}) {
  return (
    <>
      <Avatar src={actor.avatarUrl} className="inline mr-2" />
      <Link href={actor.url} target="_blank" className="font-semibold hover:underline">{actor.login}</Link>
    </>
  )
}

User.fragment = `
fragment ActorFragment on Actor {
  avatarUrl
  url
  login
}
`;

function Icon({className, children}: {className: string, children: ReactNode}) {
  return <div className={`rounded-full px-1.5 aspect-square flex items-center ${className}`}>{children}</div>
}

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

function Closed({data}: {data: ClosedEvent}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="bg-purple-600 text-white"><IssueClosedIcon /></Icon>
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

// function CrossReferenced({data}: {data: TimelineCrossReferencedEvent}) {
//   return (
//     <Grid
//       areas={[
//         'icon description',
//         '.    issue'
//       ]}
//       columns={['min-content', 'max-content']}
//       gap="size-100">
//       <OpenIn size="S" gridArea="icon" />
//       <div style={{gridArea: 'description'}}>{data.actor!.login} referenced this from {data.source.issue!.repository!.full_name}</div>
//       <Card gridArea="issue">
//         <div className="flex gap-2 items-center">
//           <AlertCircleFilled size="S" UNSAFE_style={{color: `var(--spectrum-semantic-${data.source.issue!.state === 'open' ? 'positive' : 'negative'}-color-default)`}} />
//           <span><Link href={data.source.issue!.html_url} target="_blank">{data.source.issue!.title}</Link></span>
//         </div>
//       </Card>
//     </Grid>
//   );
// }

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

export function Comment({issue}: {issue: Issue | PullRequest}) {
  let onSubmit = async (comment: string) => {
    await github.issues.createComment({
      owner: issue.repository.owner.login,
      repo: issue.repository.name,
      issue_number: issue.number,
      body: comment
    });
  };

  return (
    <CommentForm onSubmit={onSubmit}>
      {issue.viewerCanClose && issue.state === 'OPEN' && <Button className="px-4 py-2 rounded-md bg-purple-500 pressed:bg-purple-600 border border-purple-400 pressed:border-purple-500 text-white text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Close</Button>}
    </CommentForm>
  );
}

function CommentForm({children, className, onSubmit}: {children: ReactNode, className?: string, onSubmit?: (comment: string) => Promise<void>}) {
  let handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let form = e.target as HTMLFormElement;
    let comment = new FormData(form).get('comment');
    if (comment && typeof comment === 'string' && onSubmit) {
      await onSubmit(comment);
    }
    form.reset();
  };

  return (
    <form className={`flex flex-col gap-2 items-end ${className}`} onSubmit={handleSubmit}>
      <TextField name="comment" className="flex flex-col gap-1 w-full">
        <Label className="text-xs">Comment</Label>
        <TextArea className="w-full bg-daw-gray-50 border border-daw-gray-400 rounded outline-none focus:ring-1 focus:border-blue-600 ring-blue-600 p-2" rows={4} />
      </TextField>
      <div className="flex gap-2">
        {children}
        <Button type="submit" className="px-4 py-2 rounded-md bg-green-600 pressed:bg-green-700 border border-green-700 pressed:border-green-800 dark:border-green-500 dark:pressed:border-green-600 text-white text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Comment</Button>
      </div>
    </form>
  );
}
