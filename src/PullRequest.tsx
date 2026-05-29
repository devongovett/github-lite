import { PullRequest, PullRequestReviewDecision, Repository } from '@octokit/graphql-schema';
import { Fragment, createContext, useState } from 'react';
import { Button, Link, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { DiffCodeView, PendingComment } from './DiffCodeView';
import { PullRequestThread } from './Timeline';
import type { PullRequestReviewThread } from '@octokit/graphql-schema';
import { Header } from './Issue';
import { useQuery, github, preload, graphql } from './client';
import { CommentCard } from './CommentCard';
import { Timeline } from './Timeline';
import { IssueCommentForm, CommentForm } from './CommentForm';
import { Card, Status, User } from './components';
import useSWR, {preload as swrPreload, mutate} from 'swr';
import { CommentIcon } from '@primer/octicons-react';

async function fetchPatch([, owner, repo, number]: ['patch', string, string, number]): Promise<string> {
  let res = await github.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: number,
    headers: { accept: 'application/vnd.github.diff' }
  });
  return res.data as unknown as string;
}

function usePatch(owner: string, repo: string, number: number) {
  return useSWR(['patch', owner, repo, number] as const, fetchPatch);
}

export const PullRequestContext = createContext<PullRequest | null>(null);

export function PullRequestPage({owner, repo, number}: {owner: string, repo: string, number: number}) {
  let { data: res } = useQuery<{repository: Repository}>(PullRequestPage.query(), {owner, repo, number});
  let data = res?.repository.pullRequest;
  let { data: patch } = usePatch(owner, repo, number);
  let [pendingComment, setPendingComment] = useState<PendingComment | null>(null);

  if (!data) {
    return null;
  }

  async function getOrCreateReviewId(): Promise<string> {
    let reviewId = data!.reviews?.nodes?.find(r => r?.state === 'PENDING')?.id;
    if (reviewId) return reviewId;

    let result = await graphql<{addPullRequestReview: {pullRequestReview: {id: string}}}>(
      `mutation AddPullRequestReview($pullRequestId: ID!) {
        addPullRequestReview(input: { pullRequestId: $pullRequestId }) {
          pullRequestReview {
            id
          }
        }
      }`,
      { pullRequestId: data!.id }
    );
    return result.addPullRequestReview.pullRequestReview.id;
  }

  async function handleSubmitComment(body: string) {
    if (!pendingComment || !data) return;

    let reviewId = await getOrCreateReviewId();
    let side = pendingComment.side === 'additions' ? 'RIGHT' : 'LEFT';
    await graphql(
      `mutation AddPullRequestReviewThread($pullRequestReviewId: ID!, $path: String!, $line: Int!, $side: DiffSide!, $body: String!) {
        addPullRequestReviewThread(input: {
          pullRequestReviewId: $pullRequestReviewId,
          path: $path,
          line: $line,
          side: $side,
          body: $body
        }) {
          thread {
            id
          }
        }
      }`,
      {
        pullRequestReviewId: reviewId,
        path: pendingComment.path,
        line: pendingComment.line,
        side,
        body
      }
    );

    await mutate([PullRequestPage.query(), { owner, repo, number }]);
    setPendingComment(null);
  }

  async function handleSubmitReview(event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') {
    if (!data) return;

    let existingReviewId = data.reviews?.nodes?.find(r => r?.state === 'PENDING')?.id;
    if (existingReviewId) {
      await graphql(
        `mutation SubmitPullRequestReview($pullRequestReviewId: ID!, $event: PullRequestReviewEvent!) {
          submitPullRequestReview(input: {
            pullRequestReviewId: $pullRequestReviewId,
            event: $event
          }) {
            pullRequestReview {
              id
              state
            }
          }
        }`,
        { pullRequestReviewId: existingReviewId, event }
      );
    } else {
      await graphql(
        `mutation AddAndSubmitPullRequestReview($pullRequestId: ID!, $event: PullRequestReviewEvent!) {
          addPullRequestReview(input: {
            pullRequestId: $pullRequestId,
            event: $event
          }) {
            pullRequestReview {
              id
              state
            }
          }
        }`,
        { pullRequestId: data.id, event }
      );
    }

    await mutate([PullRequestPage.query(), { owner, repo, number }]);
  }

  async function deleteComment(id: string) {
    await graphql(`mutation DeleteIssueComment($id: ID!) { deleteIssueComment(input: {id: $id}) { clientMutationId } }`, { id });
    await mutate([PullRequestPage.query(), { owner, repo, number }]);
  }

  let hasPendingReview = data.reviews?.nodes?.some(r => r?.state === 'PENDING') ?? false;

  return (
    <PullRequestContext.Provider value={data}>
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-4 pb-4 pt-2 -mr-4 max-w-3xl mx-auto w-[500px] overflow-auto text-sm">
          <Header data={data} />
          <CommentCard data={data} />
          <PullHeader data={data} />
          <Timeline items={data.timelineItems.nodes!} onDeleteComment={deleteComment} />
          <IssueCommentForm issue={data} />
        </div>
        <div className="flex flex-col flex-1 gap-2 pt-2 min-h-0">
          {data.state === 'OPEN' && (
            <div className="flex items-center gap-2 mx-4 bg-daw-white rounded-xl p-3 shadow-card shrink-0 text-sm">
              <div className="flex items-center mr-auto text-sm font-medium">
                <span className="ml-1 text-daw-gray-600">{data.changedFiles} {data.changedFiles === 1 ? 'file' : 'files'}</span>
                <span className="ml-3 text-red-500">-{data.deletions}</span>
                <span className="ml-1 text-green-600">+{data.additions}</span>
                {data.totalCommentsCount != null && data.totalCommentsCount > 0 && <>
                  <CommentIcon className="ml-3 text-daw-gray-600" />
                  <span className="ml-1 text-daw-gray-600">{data.totalCommentsCount}</span>
                </>}
              </div>
              <Button
                isDisabled={!hasPendingReview}
                onPress={() => handleSubmitReview('COMMENT')}
                className="px-3 py-1.5 rounded-md bg-daw-gray-300 pressed:bg-daw-gray-400 border border-daw-gray-400 pressed:border-daw-gray-500 text-daw-gray-800 text-xs font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600 disabled:opacity-40"
              >
                Comment
              </Button>
              <Button
                isDisabled={!hasPendingReview}
                onPress={() => handleSubmitReview('REQUEST_CHANGES')}
                className="px-3 py-1.5 rounded-md bg-red-500 pressed:bg-red-600 border border-red-600 pressed:border-red-700 text-white text-xs font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600 disabled:opacity-40"
              >
                Request changes
              </Button>
              <Button
                onPress={() => handleSubmitReview('APPROVE')}
                className="px-3 py-1.5 rounded-md bg-green-600 pressed:bg-green-700 border border-green-700 pressed:border-green-800 dark:border-green-500 dark:pressed:border-green-600 text-white text-xs font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600"
              >
                Approve
              </Button>
            </div>
          )}
          <div className="flex-1 min-h-0">
            {patch
              ? <DiffCodeView
                  patch={patch}
                  threads={(data.reviewThreads.nodes ?? []) as Thread[]}
                  pendingComment={pendingComment}
                  onGutterUtilityClick={(path, line, side) => setPendingComment({ path, line, side })}
                  renderAnnotation={annotation => {
                    let {metadata} = annotation;
                    if (metadata === null) {
                      return (
                        <div className="font-sans text-base mx-2">
                          <Card>
                            <CommentForm autoFocus onSubmit={handleSubmitComment} onCancel={() => setPendingComment(null)} />
                          </Card>
                        </div>
                      );
                    }
                    return <div className="font-sans text-base mx-2"><PullRequestThread data={metadata} /></div>;
                  }}
                />
              : <div className="text-sm text-daw-gray-500 py-4 max-w-3xl mx-auto w-full">Loading diff…</div>
            }
          </div>
        </div>
      </div>
    </PullRequestContext.Provider>
  );
}

PullRequestPage.query = () => `
query issueTimeline($owner: String!, $repo: String!, $number: Int!) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$number) {
      __typename
      id
      number
      url
      title
      body
      createdAt
      state
      isDraft
      author {
        avatarUrl
        url
        login
      }
      reactionGroups {
        content
        viewerHasReacted
        reactors {
          totalCount
        }
      }
      repository {
        name
        viewerDefaultMergeMethod
        owner {
          login
          avatarUrl
        }
      }
      headRefName
      baseRefName
      reviews(last:100) {
        nodes {
          id
          author {
            ...ActorFragment
          }
          state
        }
      }
      commits(last:1) {
        nodes {
          commit {
            statusCheckRollup {
              state
            }
            checkSuites(first:100) {
              nodes {
                id
                app {
                  name
                  logoUrl
                  logoBackgroundColor
                }
                status
                conclusion
                checkRuns(first:100) {
                  nodes {
                    id
                    name
                    detailsUrl
                    status
                    conclusion
                    isRequired(pullRequestNumber:$number)
                  }
                }
              }
            }
          }
        }
      }
      additions
      deletions
      changedFiles
      totalCommentsCount
      mergeable
      isInMergeQueue
      isMergeQueueEnabled
      autoMergeRequest { mergeMethod }
      viewerCanEnableAutoMerge
      viewerCanDisableAutoMerge
      reviewDecision
      viewerCanMergeAsAdmin
      viewerCanClose
      viewerCanUpdateBranch
      timelineItems(first:100) {
        nodes {
          ...PullRequestTimelineFragment
        }
      }
      reviewThreads(first:100) {
        nodes {
          ...PullRequestThreadFragment
        }
      }
    }
  }
}

${Timeline.pullRequestFragment()}
`;

PullRequestPage.preload = (owner: string, repo: string, number: number) => {
  preload(PullRequestPage.query(), {owner, repo, number});
  swrPreload(['patch', owner, repo, number] as const, fetchPatch);
};

type Thread = PullRequestReviewThread;

function PullHeader({data}: {data: PullRequest}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 text-sm">
        <Reviews data={data} />
        <hr className="border-daw-gray-200" />
        <Checks data={data} />
        {data.state === 'OPEN' && <>
          <hr className="border-daw-gray-200" />
          <Merge data={data} />
        </>}
      </div>
    </Card>
  );
}

let reviewDecisionMessages: Record<PullRequestReviewDecision, string> = {
  APPROVED: 'Approved',
  REVIEW_REQUIRED: 'Review required',
  CHANGES_REQUESTED: 'Changes requested'
};

function Reviews({data}: {data: PullRequest}) {
  let reviews = data.reviews?.nodes?.filter(node => node?.author?.login !== data.author?.login);
  if (!reviews || !reviews.length) {
    return <div>No reviews.</div>;
  }

  let reviewsByAuthor = new Map();
  for (let review of reviews) {
    reviewsByAuthor.set(review?.author?.login, review);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Status state={data.reviewDecision!} filled />
        <h3 className="font-semibold">{reviewDecisionMessages[data.reviewDecision!]}</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {[...reviewsByAuthor.values()]?.map((review, i) => (
          <li key={i} className="flex gap-2 items-center">
            <div className="w-5 flex justify-center"><Status state={review.state} /></div>
            <div><User actor={review.author} /></div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Checks({data}: {data: PullRequest}) {
  let status = data.commits.nodes?.[0]?.commit.statusCheckRollup?.state;
  let checks = data.commits.nodes?.[0]?.commit.checkSuites?.nodes;

  if (status == null && checks?.length) {
    status = 'PENDING';
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Status state={status!} filled />
        <h3 className="font-semibold">Checks</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {checks?.map(check => {
          if (!check?.conclusion) {
            return null;
          }

          let summary = (
            <div className="flex gap-2 items-center">
              <div className="w-5 flex justify-center"><Status state={check!.conclusion!} /></div>
              <img src={check!.app?.logoUrl} className="w-8 h-8 rounded" style={{backgroundColor: '#' + check!.app?.logoBackgroundColor}} alt="" />
              <div className="flex flex-col">
                <span>{check!.app?.name}</span>
                {check!.conclusion === 'ACTION_REQUIRED' && <span className="text-daw-gray-500 text-xs">Awaiting approval</span>}
              </div>
            </div>
          );

          if (check?.checkRuns?.nodes?.length === 0) {
            return (
              <li key={check.id}>
                {summary}
              </li>
            );
          }

          if ((check?.checkRuns?.nodes?.length as number) > 1) {
            return (
              <li key={check.id} className="flex flex-col gap-2">
                <details>
                  <summary className="flex items-center">
                    {summary}
                  </summary>
                  <ul className="flex flex-col gap-2 ml-4 mt-2">
                    {check?.checkRuns?.nodes?.map((node) => (
                      <li key={node!.id} className="flex gap-2 items-center">
                        <div className="w-5 flex justify-center"><Status state={node!.conclusion!} /></div>
                        <div className="flex flex-col">
                          <Link target="_blank" href={node!.detailsUrl}>{node!.name}</Link>
                          <span className="text-daw-gray-500 text-xs">{node!.isRequired ? 'Required' : 'Not required'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          }

          return (
            <Fragment key={check.id}>
              {check?.checkRuns?.nodes?.map(node => (
                <li key={node!.id} className="flex gap-2 items-center">
                  <div className="w-5 flex justify-center"><Status state={node!.conclusion!} /></div>
                  <img src={check!.app?.logoUrl} className="w-8 h-8 rounded" style={{backgroundColor: '#' + check!.app?.logoBackgroundColor}} alt="" />
                  <div className="flex flex-col">
                    <Link target="_blank" href={node!.detailsUrl}>{node!.name}</Link>
                    <span className="text-daw-gray-500 text-xs">{node!.isRequired ? 'Required' : 'Not required'}</span>
                  </div>
                </li>
              ))}
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
}

function Merge({ data }: { data: PullRequest }) {
  let [isMerging, setMerging] = useState(false);
  let [isUpdating, setUpdating] = useState(false);
  let [isPending, setPending] = useState(false);

  let refresh = () => mutate([PullRequestPage.query(), { owner: data.repository.owner.login, repo: data.repository.name, number: data.number }]);

  async function handleMerge() {
    setMerging(true);
    try {
      await github.pulls.merge({
        owner: data.repository.owner.login,
        repo: data.repository.name,
        pull_number: data.number,
        merge_method: data.repository.viewerDefaultMergeMethod.toLowerCase() as any,
      });
      await refresh();
    } finally {
      setMerging(false);
    }
  }

  async function handleUpdateBranch() {
    setUpdating(true);
    try {
      await github.pulls.updateBranch({
        owner: data.repository.owner.login,
        repo: data.repository.name,
        pull_number: data.number,
      });
      await refresh();
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddToQueue() {
    setPending(true);
    try {
      await graphql(`mutation AddToMergeQueue($pullRequestId: ID!) { enqueuePullRequest(input: {pullRequestId: $pullRequestId}) { mergeQueue { id } } }`, { pullRequestId: data.id });
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleRemoveFromQueue() {
    setPending(true);
    try {
      await graphql(`mutation RemoveFromMergeQueue($pullRequestId: ID!, $branch: String!) { dequeuePullRequest(input: {pullRequestId: $pullRequestId, branch: $branch}) { mergeQueue { id } } }`, { pullRequestId: data.id, branch: data.baseRefName });
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleEnableAutoMerge() {
    setPending(true);
    try {
      await graphql(`mutation EnableAutoMerge($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) { enablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId, mergeMethod: $mergeMethod}) { pullRequest { id } } }`, { pullRequestId: data.id, mergeMethod: data.repository.viewerDefaultMergeMethod });
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDisableAutoMerge() {
    setPending(true);
    try {
      await graphql(`mutation DisableAutoMerge($pullRequestId: ID!) { disablePullRequestAutoMerge(input: {pullRequestId: $pullRequestId}) { pullRequest { id } } }`, { pullRequestId: data.id });
      await refresh();
    } finally {
      setPending(false);
    }
  }

  if (data.mergeable !== 'MERGEABLE') {
    return (
      <div className="flex gap-2 items-center justify-space-between">
        <p className="text-xs text-daw-gray-600 text-balance flex-1">Conflicts must be resolved before merging.</p>
        {data.viewerCanUpdateBranch &&
          <Button isPending={isUpdating} onPress={handleUpdateBranch} className="shrink-0 px-4 py-2 rounded-md bg-neutral-600 pressed:bg-neutral-700 border border-neutral-500 pressed:border-neutral-600 pending:opacity-50 transition text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Update branch</Button>
        }
      </div>
    );
  }

  if (data.reviewDecision !== 'APPROVED' && (data.viewerCanEnableAutoMerge || data.viewerCanDisableAutoMerge)) {
    return (
      <div className="flex gap-2 items-center justify-end">
        {data.autoMergeRequest
          ? <Button isPending={isPending} onPress={handleDisableAutoMerge} className="shrink-0 px-4 py-2 rounded-md bg-neutral-600 pressed:bg-neutral-700 border border-neutral-500 pressed:border-neutral-600 pending:opacity-50 transition text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Disable auto-merge</Button>
          : <Button isPending={isPending} onPress={handleEnableAutoMerge} className="shrink-0 px-4 py-2 rounded-md bg-neutral-600 pressed:bg-neutral-700 border border-neutral-500 pressed:border-neutral-600 pending:opacity-50 transition text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Enable auto-merge</Button>
        }
      </div>
    );
  }

  if (data.reviewDecision === 'APPROVED' && data.isMergeQueueEnabled) {
    return (
      <div className="flex gap-2 items-center justify-end">
        {data.isInMergeQueue
          ? <Button isPending={isPending} onPress={handleRemoveFromQueue} className="shrink-0 px-4 py-2 rounded-md bg-neutral-600 pressed:bg-neutral-700 border border-neutral-500 pressed:border-neutral-600 pending:opacity-50 transition text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Remove from merge queue</Button>
          : <Button isPending={isPending} onPress={handleAddToQueue} className="shrink-0 px-4 py-2 rounded-md bg-green-600 pressed:bg-green-700 border border-green-700 pressed:border-green-800 dark:border-green-500 dark:pressed:border-green-600 pending:opacity-50 transition text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Add to merge queue</Button>
        }
      </div>
    );
  }

  let mergeColor = data.reviewDecision === 'APPROVED' ? 'bg-green-600 pressed:bg-green-700 border-green-700 pressed:border-green-800 dark:border-green-500 dark:pressed:border-green-600' : 'bg-red-600 pressed:bg-red-700 border-red-500 pressed:border-red-600';
  let mergeLabel = data.reviewDecision === 'APPROVED' ? 'Merge' : 'Merge as administrator';

  if (data.reviewDecision === 'APPROVED' || data.viewerCanMergeAsAdmin) {
    return (
      <div className="flex gap-2 items-center justify-end flex-wrap">
        {data.viewerCanMergeAsAdmin && data.reviewDecision !== 'APPROVED' &&
          <p className="text-xs text-daw-gray-600 text-balance flex-1">Use your administrator privileges to merge this pull request immediately without waiting for requirements to be met.</p>
        }
        <Button isPending={isMerging} onPress={handleMerge} className={`shrink-0 px-4 py-2 rounded-md border pending:opacity-50 transition text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600 ${mergeColor}`}>{mergeLabel}</Button>
      </div>
    );
  }

  return null;
}
