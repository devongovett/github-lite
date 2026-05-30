import { Actor, CheckConclusionState, Issue, PullRequest, PullRequestReviewDecision, PullRequestReviewState, StatusState } from '@octokit/graphql-schema';
import { AlertIcon, CheckIcon, CommentIcon, StopIcon, HourglassIcon, XIcon, FeedMergedIcon, FeedPullRequestClosedIcon, FeedPullRequestOpenIcon, FeedPullRequestDraftIcon, GitMergeIcon, GitPullRequestClosedIcon, GitPullRequestIcon, GitPullRequestDraftIcon } from '@primer/octicons-react';
import { DOMAttributes, ReactNode, cloneElement } from 'react';
import { Link } from 'react-aria-components';

let avatarSizes = {
  s: 'w-5',
  l: 'w-10'
}

export function Avatar({src, size = 's', className}: {size?: keyof typeof avatarSizes, src: string, className?: string}) {
  return <img src={src} className={`${avatarSizes[size]} aspect-square rounded-full ${className}`} />;
}

export function BranchName({children}: {children: string}) {
  return <span className="bg-daw-blue-100 border border-daw-blue-200 text-daw-blue-800 text-xs font-mono py-[2px] px-2 rounded">{children}</span>;
}

let states = {
  MERGED: 'bg-daw-purple-100 border-daw-purple-200 text-daw-purple-700',
  CLOSED: 'bg-daw-red-100 border-daw-red-200 text-daw-red-700',
  OPEN: 'bg-daw-green-100 border-daw-green-200 text-daw-green-700',
  DRAFT: 'bg-daw-gray-200 border-daw-gray-300 text-daw-gray-800'
};

let statusIcons = {
  MERGED: <GitMergeIcon className="text-daw-purple-700" />,
  CLOSED: <GitPullRequestClosedIcon className="text-daw-red-700" />,
  OPEN: <GitPullRequestIcon className="text-daw-green-700" />,
  DRAFT: <GitPullRequestDraftIcon className="text-daw-gray-700" />
};

export function IssueStatus({data, type}: {data: PullRequest | Issue, type?: 'label' | 'icon'}) {
  let state: keyof typeof states = data.state;
  if ('isDraft' in data && data.isDraft) {
    state = 'DRAFT';
  }
  if (type === 'icon') {
    return statusIcons[state];
  }
  return <span className={`capitalize w-fit px-2 py-0.5 rounded border text-sm font-medium ${states[state]}`}>{state.toLowerCase()}</span>
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
  FAILURE: <XIcon className="text-daw-red-500 group-selected:text-daw-white" />,
  ACTION_REQUIRED: <AlertIcon className="text-daw-yellow-600 group-selected:text-daw-white" />,
  CANCELLED: <StopIcon className="text-daw-gray-500 group-selected:text-daw-white" />,
  STARTUP_FAILURE: <XIcon className="text-daw-red-500 group-selected:text-daw-white" />,
  TIMED_OUT: <XIcon className="text-daw-red-500 group-selected:text-daw-white" />,
  SUCCESS: <CheckIcon className="text-daw-green-500 group-selected:text-daw-white" />,
  NEUTRAL: null,
  STALE: null,
  SKIPPED: null,

  CHANGES_REQUESTED: <XIcon className="text-daw-red-500 group-selected:text-daw-white" />,
  REVIEW_REQUIRED: <XIcon className="text-daw-yellow-500 group-selected:text-daw-white" />,
  APPROVED: <CheckIcon className="text-daw-green-500 group-selected:text-daw-white" />,
  COMMENTED: <CommentIcon className="text-daw-gray-500 group-selected:text-daw-white" />,
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
  className?: string
}

export function Card({children, gridArea, className, ...otherProps}: CardProps) {
  return (
    <div className={`bg-daw-white rounded-xl p-3 shadow-card min-w-0 ${className || ''}`} style={{gridArea}} {...otherProps}>
      {children}
    </div>
  );
}

export function Icon({className, children}: {className: string, children: ReactNode}) {
  return <div className={`rounded-full px-1.5 aspect-square flex items-center ${className}`}>{children}</div>
}

export function GithubLabel({color, children}: {color: string, children: ReactNode}) {
  return (
    <span
      className="px-2 py-0.5 text-black rounded-full text-xs font-semibold border"
      style={{background: `#${color}66`, borderColor: `#${color}66`, color: `color-mix(in srgb, #${color}, light-dark(black, white) 70%)`}}>
      {children}
    </span>
  );
}

export const ISSUE_TYPE_COLORS = {
  BLUE: 'bg-blue-400/20 text-blue-600 group-selected:text-blue-300 dark:text-blue-300 dark:group-selected:text-blue-600 border-blue-400/20',
  GRAY: 'bg-neutral-400/20 text-neutral-600 group-selected:text-neutral-300 dark:text-neutral-300 dark:group-selected:text-neutral-600 border-neutral-400/20',
  GREEN: 'bg-green-400/20 text-green-600 group-selected:text-green-300 dark:text-green-300 dark:group-selected:text-green-600 border-green-400/20',
  ORANGE: 'bg-orange-400/20 text-orange-600 group-selected:text-orange-300 dark:text-orange-300 dark:group-selected:text-orange-600 border-orange-400/20',
  PINK: 'bg-pink-400/20 text-pink-600 group-selected:text-pink-300 dark:text-pink-300 dark:group-selected:text-pink-600 border-pink-400/20',
  PURPLE: 'bg-purple-400/20 text-purple-600 group-selected:text-purple-300 dark:text-purple-300 dark:group-selected:text-purple-600 border-purple-400/20',
  RED: 'bg-red-400/20 text-red-600 group-selected:text-red-300 dark:text-red-300 dark:group-selected:text-red-600 border-red-400/20',
  YELLOW: 'bg-yellow-400/20 text-yellow-600 group-selected:text-yellow-300 dark:text-yellow-300 dark:group-selected:text-yellow-600 border-yellow-400/20',
} as const;

export function IssueTypeBadge({issueType, className}: {issueType: {name: string, color: string}, className?: string}) {
  let colors = ISSUE_TYPE_COLORS[issueType.color as keyof typeof ISSUE_TYPE_COLORS] ?? ISSUE_TYPE_COLORS.GRAY;
  return (
    <span className={`px-2 font-semibold rounded-full border ${colors}${className ? ` ${className}` : ''}`}>
      {issueType.name}
    </span>
  );
}

export function User({actor}: {actor: Actor}) {
  return (
    <span className="inline-flex items-center align-bottom">
      <Avatar src={actor.avatarUrl} className="inline mr-2" />
      <Link href={actor.url} target="_blank" className="font-semibold hover:underline">{actor.login}</Link>
    </span>
  )
}

User.fragment = `
fragment ActorFragment on Actor {
  avatarUrl
  url
  login
}
`;
