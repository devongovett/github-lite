import { Issue, IssueComment, PullRequest, PullRequestReviewComment, ReactionContent, ReactionGroup } from '@octokit/graphql-schema';
import { SmileyIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { useState } from 'react';
import { useDateFormatter } from 'react-aria';
import { Button, Dialog, DialogTrigger, Link, Popover, ToggleButton } from 'react-aria-components';
import { Avatar, Card } from './components';
import { graphql } from './client';

export function CommentCard({data}: {data: Issue | PullRequest | IssueComment | PullRequestReviewComment}) {
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

CommentCard.fragment = `
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

export function CommentBody({children}: {children: string}) {
  return (
    <Markdown className="[word-break:break-word]" options={{
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

export function Reactions({id, data: initialData}: {id: string, data: ReactionGroup[]}) {
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
      setData(data.removeReaction.reactionGroups);
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
