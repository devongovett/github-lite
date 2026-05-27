import { PullRequest, PullRequestReviewDecision, Repository } from '@octokit/graphql-schema';
import { Fragment, createContext } from 'react';
import { Button, Link, Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { DiffCodeView } from './DiffCodeView';
import { PullRequestThread } from './Timeline';
import type { PullRequestReviewThread } from '@octokit/graphql-schema';
import { Header } from './Issue';
import { useQuery, github } from './client';
import { CommentCard } from './CommentCard';
import { Timeline } from './Timeline';
import { IssueCommentForm } from './CommentForm';
import { Card, Status, User } from './components';
import useSWR from 'swr';

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
  if (!data) {
    return null;
  }

  return (
    <PullRequestContext.Provider value={data}>
      {/*<div className="flex flex-col gap-4 my-4 w-full max-w-3xl mx-auto">
        <Header data={data} />
      </div>*/}
      {/*<Tabs className="flex flex-col my-4 flex-1 min-h-0">
        <TabList aria-label="Pull request tabs" className="flex gap-1 max-w-3xl mx-auto w-full">
          <Tab id="overview" className="px-4 py-2 text-sm font-medium cursor-default outline-none rounded-t-md selected:border-b-2 selected:border-blue-600 selected:text-blue-600 hover:bg-daw-gray-100 focus-visible:ring-2 ring-blue-600">
            Overview
          </Tab>
          <Tab id="files" className="px-4 py-2 text-sm font-medium cursor-default outline-none rounded-t-md selected:border-b-2 selected:border-blue-600 selected:text-blue-600 hover:bg-daw-gray-100 focus-visible:ring-2 ring-blue-600">
            Files
          </Tab>
        </TabList>
        <div className="border-b border-daw-gray-200 mx-2" />
        <TabPanel id="overview" className="flex flex-col gap-4 mt-4 max-w-3xl mx-auto w-full">
          <CommentCard data={data} />
          <PullHeader data={data} />
          <Timeline items={data.timelineItems.nodes!} />
          <IssueCommentForm issue={data} />
        </TabPanel>
        <TabPanel id="files" className="flex-1 min-h-0">
          {patch
            ? <DiffCodeView patch={patch} threads={(data.reviewThreads.nodes ?? []) as Thread[]} renderAnnotation={annotation => <div className="font-sans text-base mx-2"><PullRequestThread data={annotation.metadata} /></div>} />
            : <div className="text-sm text-daw-gray-500 py-4 max-w-3xl mx-auto w-full">Loading diff…</div>
          }
        </TabPanel>
      </Tabs>*/}
      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-4 pb-4 mt-2 -mr-4 max-w-3xl mx-auto w-[500px] overflow-auto text-sm">
          <Header data={data} />
          <CommentCard data={data} />
          <PullHeader data={data} />
          <Timeline items={data.timelineItems.nodes!} />
          <IssueCommentForm issue={data} />
        </div>
        <div className="flex-1">
          {patch
            ? <DiffCodeView patch={patch} threads={(data.reviewThreads.nodes ?? []) as Thread[]} renderAnnotation={annotation => <div className="font-sans text-base mx-2"><PullRequestThread data={annotation.metadata} /></div>} />
            : <div className="text-sm text-daw-gray-500 py-4 max-w-3xl mx-auto w-full">Loading diff…</div>
          }
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
        owner {
          login
          avatarUrl
        }
      }
      headRef {
        name
      }
      baseRef {
        name
      }
      reviews(last:100) {
        nodes {
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
      mergeable
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

function Merge({data}: {data: PullRequest}) {
  if (data.mergeable !== 'MERGEABLE') {
    return (
      <div className="flex gap-2 items-center justify-space-between">
        <p className="text-xs text-daw-gray-600 text-balance flex-1">Conflicts must be resolved before merging.</p>
        {data.viewerCanUpdateBranch &&
          <Button className="shrink-0 px-4 py-2 rounded-md bg-neutral-600 pressed:bg-neutral-700 border border-neutral-500 pressed:border-neutral-600 text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Update branch</Button>
        }
      </div>
    );
  }

  if (data.reviewDecision === 'APPROVED') {
    return (
      <div className="flex gap-2 justify-end">
        <Button className="px-4 py-2 rounded-md bg-green-600 pressed:bg-green-700 border border-green-700 pressed:border-green-800 dark:border-green-500 dark:pressed:border-green-600 text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Merge</Button>
      </div>
    );
  }

  if (data.viewerCanMergeAsAdmin) {
    return (
      <div className="flex gap-2 items-center justify-space-between">
        <p className="text-xs text-daw-gray-600 text-balance">Use your administrator privileges to merge this pull request immediately without waiting for requirements to be met.</p>
        <Button className="shrink-0 px-4 py-2 rounded-md bg-red-600 pressed:bg-red-700 border border-red-500 pressed:border-red-600 text-white cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Merge as administrator</Button>
      </div>
    );
  }

  return null;
}
