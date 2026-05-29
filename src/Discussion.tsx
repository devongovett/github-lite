import { Discussion, DiscussionComment, Repository } from '@octokit/graphql-schema';
import { CheckCircleIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { Link } from 'react-aria-components';
import { graphql, useQuery } from './client';
import { CommentCard, Reactions } from './CommentCard';
import { CommentForm } from './CommentForm';
import { Avatar, User } from './components';
import { mutate } from 'swr';

export function DiscussionPage({owner, repo, number}: {owner: string, repo: string, number: number}) {
  let { data: res } = useQuery<{repository: Repository}>(DiscussionPage.query(), {owner, repo, number});
  let data = res?.repository.discussion;
  if (!data) return null;

  let onSubmit = async (body: string) => {
    await graphql(`
      mutation AddDiscussionComment($input: AddDiscussionCommentInput!) {
        addDiscussionComment(input: $input) { comment { id } }
      }
    `, {input: {discussionId: data!.id, body}});
    mutate([DiscussionPage.query(), {owner, repo, number}]);
  };

  async function deleteComment(id: string) {
    await graphql(`mutation DeleteDiscussionComment($id: ID!) { deleteDiscussionComment(input: {id: $id}) { clientMutationId } }`, { id });
    await mutate([DiscussionPage.query(), { owner, repo, number }]);
  }

  return (
    <div className="flex flex-col gap-4 my-4 w-full max-w-3xl mx-auto">
      <DiscussionHeader data={data} />
      <CommentCard data={data} />
      {data.comments.nodes?.map(comment => comment && (
        <DiscussionCommentItem key={comment.id} comment={comment} onDelete={deleteComment} />
      ))}
      <CommentForm onSubmit={onSubmit}>{null}</CommentForm>
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
          {data.category.emoji} {data.category.name}
        </span>
      </div>
      <h1 className="text-2xl font-semibold"><Markdown>{data.title}</Markdown></h1>
    </div>
  );
}

function DiscussionCommentItem({comment, onDelete}: {comment: DiscussionComment, onDelete: (id: string) => Promise<void>}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {comment.isAnswer && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium mb-1">
            <CheckCircleIcon size={14} className="text-green-600" />
            Marked as answer
          </div>
        )}
        <CommentCard data={comment} onDelete={() => onDelete(comment.id)} />
      </div>
      {comment.replies.nodes && comment.replies.nodes.length > 0 && (
        <div className="ml-8 flex flex-col gap-2 border-l-2 border-daw-gray-200 pl-4">
          {comment.replies.nodes.map(reply => reply && (
            <CommentCard key={reply.id} data={reply} onDelete={() => onDelete(reply.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
