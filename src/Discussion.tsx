import { Discussion, DiscussionComment, Repository } from '@octokit/graphql-schema';
import { CheckCircleIcon, CommentIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { useState } from 'react';
import { Button, Link } from 'react-aria-components';
import { graphql, useQuery } from './client';
import { useRenderGitHubEmojis } from './emoji';
import { CommentCard, Reactions } from './CommentCard';
import { CommentForm } from './CommentForm';
import { Avatar, User } from './components';
import { mutate } from 'swr';

export function DiscussionPage({owner, repo, number}: {owner: string, repo: string, number: number}) {
  let { data: res } = useQuery<{repository: Repository}>(DiscussionPage.query(), {owner, repo, number});
  let data = res?.repository.discussion;
  if (!data) return null;

  async function addComment(body: string, replyToId?: string) {
    await graphql(`
      mutation AddDiscussionComment($input: AddDiscussionCommentInput!) {
        addDiscussionComment(input: $input) { comment { id } }
      }
    `, {input: {discussionId: data!.id, body, ...(replyToId ? {replyToId} : {})}});
    mutate([DiscussionPage.query(), {owner, repo, number}]);
  }

  async function deleteComment(id: string) {
    await graphql(`mutation DeleteDiscussionComment($id: ID!) { deleteDiscussionComment(input: {id: $id}) { clientMutationId } }`, { id });
    await mutate([DiscussionPage.query(), { owner, repo, number }]);
  }

  return (
    <div className="flex flex-col gap-4 my-4 w-full max-w-3xl mx-auto">
      <DiscussionHeader data={data} />
      <CommentCard data={data} />
      {data.comments.nodes?.map(comment => comment && (
        <DiscussionCommentItem key={comment.id} comment={comment} onDelete={deleteComment} onReply={addComment} />
      ))}
      <CommentForm onSubmit={addComment}>{null}</CommentForm>
    </div>
  );
}

DiscussionPage.query = () => `
query Discussion($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    discussion(number: $number) {
      __typename
      id
      number
      url
      title
      body
      createdAt
      closed
      category { name emoji }
      author { ...ActorFragment }
      reactionGroups { ...ReactionFragment }
      repository {
        name
        owner { login avatarUrl }
      }
      comments(first: 100) {
        nodes {
          __typename id body createdAt isAnswer viewerCanDelete
          author { ...ActorFragment }
          reactionGroups { ...ReactionFragment }
          replies(first: 20) {
            nodes {
              __typename id body createdAt viewerCanDelete
              author { ...ActorFragment }
              reactionGroups { ...ReactionFragment }
            }
          }
        }
      }
    }
  }
}

${User.fragment}
${Reactions.fragment}
`;

function DiscussionHeader({data}: {data: Discussion}) {
  let renderGitHubEmojis = useRenderGitHubEmojis();
  return (
    <div className="flex flex-col gap-2 mb-2">
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-2 items-center">
          <Avatar src={data.repository.owner.avatarUrl} />
          <span className="text-daw-gray-700">
            {data.repository.owner.login}/{data.repository.name}{' '}
            <Link target="_blank" href={data.url}>#{data.number}</Link>
          </span>
        </div>
        <span className={`capitalize w-fit px-2 py-0.5 rounded border text-sm font-medium ${data.closed ? 'bg-daw-red-100 border-daw-red-200 text-daw-red-700' : 'bg-daw-green-100 border-daw-green-200 text-daw-green-700'}`}>
          {data.closed ? 'Closed' : 'Open'}
        </span>
        <span className="w-fit px-2 py-0.5 rounded border text-sm font-medium bg-daw-purple-100 border-daw-purple-200 text-daw-purple-700">
          {renderGitHubEmojis(data.category.emoji)} {data.category.name}
        </span>
      </div>
      <h1 className="text-2xl font-semibold"><Markdown>{data.title}</Markdown></h1>
    </div>
  );
}

function DiscussionCommentItem({comment, onDelete, onReply}: {
  comment: DiscussionComment;
  onDelete: (id: string) => Promise<void>;
  onReply: (body: string, replyToId: string) => Promise<void>;
}) {
  const [showReply, setShowReply] = useState(false);
  const hasReplies = (comment.replies.nodes?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <CommentCard data={comment} onDelete={() => onDelete(comment.id)} />
      </div>
      <div className="ml-8 flex flex-col gap-2 border-l-2 border-daw-gray-200 pl-4">
        {comment.replies.nodes?.map(reply => reply && (
          <CommentCard key={reply.id} data={reply} onDelete={() => onDelete(reply.id)} />
        ))}
        {showReply && (
          <CommentForm
            autoFocus
            onSubmit={async (body) => {
              await onReply(body, comment.id);
              setShowReply(false);
            }}
            onCancel={() => setShowReply(false)}
          />
        )}
        {!showReply && (
          <Button
            onPress={() => setShowReply(true)}
            className="self-start flex items-center gap-1.5 text-xs text-daw-gray-700 hover:text-daw-gray-800 transition cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded py-0.5">
            <CommentIcon />
            Reply
          </Button>
        )}
      </div>
    </div>
  );
}
