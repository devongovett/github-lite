import { Actor, CheckConclusionState, Issue, PullRequest, PullRequestReviewDecision, PullRequestReviewState, StatusState } from '@octokit/graphql-schema';
import { AlertIcon, CheckIcon, CommentIcon, StopIcon, XIcon } from '@primer/octicons-react';
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

export function IssueStatus({data}: {data: PullRequest | Issue}) {
  let state: keyof typeof states = data.state;
  if ('isDraft' in data && data.isDraft) {
    state = 'DRAFT';
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

export function Icon({className, children}: {className: string, children: ReactNode}) {
  return <div className={`rounded-full px-1.5 aspect-square flex items-center ${className}`}>{children}</div>
}

export function GithubLabel({color, children}: {color: string, children: ReactNode}) {
  return (
    <span
      className="px-3 py-0.5 text-black rounded-full text-xs font-semibold border"
      style={{background: `#${color}66`, borderColor: `#${color}66`, color: `color-mix(in srgb, #${color}, black 70%)`}}>
      {children}
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
