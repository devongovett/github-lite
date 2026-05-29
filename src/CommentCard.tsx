import { Discussion, DiscussionComment, Issue, IssueComment, PullRequest, PullRequestReviewComment, ReactionContent, ReactionGroup } from '@octokit/graphql-schema';
import { SmileyIcon, TrashIcon } from '@primer/octicons-react';
import Markdown from 'markdown-to-jsx';
import { useState } from 'react';
import { useDateFormatter } from 'react-aria';
import { Button, Dialog, DialogTrigger, Link, Popover, ToggleButton } from 'react-aria-components';
import { Avatar, Card } from './components';
import { graphql } from './client';
import { File } from '@pierre/diffs/react';

export function CommentCard({data, onDelete}: {data: Issue | PullRequest | IssueComment | Discussion | DiscussionComment, onDelete?: () => Promise<void>}) {
  let df = useDateFormatter({
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });

  let canDelete = onDelete && 'viewerCanDelete' in data && (data as IssueComment).viewerCanDelete;

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
        <div className="flex justify-between items-center" style={{gridArea: 'username'}}>
          <span className="font-medium text-sm">{data.author!.login}</span>
          {canDelete && (
            <Button onPress={() => window.confirm('Delete this comment?') && onDelete!()} className="text-daw-gray-400 hover:text-daw-red-500 pressed:text-daw-red-600 cursor-default outline-none focus-visible:ring-2 ring-blue-600 rounded">
              <TrashIcon size={14} />
            </Button>
          )}
        </div>
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
  __typename
  id
  body
  createdAt
  author {
    ...ActorFragment
  }
  reactionGroups {
    ...ReactionFragment
  }
  viewerCanDelete
}
`;

const SUPPORTED_LANGUAGES = new Set([
  '1c', '1c-query', 'abap', 'actionscript-3', 'ada', 'adoc', 'angular-html', 'angular-ts', 'apache', 'apex', 'apl', 'applescript', 'ara', 'asciidoc', 'asm', 'astro', 'awk', 'ballerina', 'bash', 'bat', 'batch', 'be', 'beancount', 'berry', 'bibtex', 'bicep', 'bird', 'bird2', 'blade', 'bsl', 'c', 'c#', 'c++', 'c3', 'cadence', 'cairo', 'cdc', 'cjs', 'clarity', 'clj', 'clojure', 'closure-templates', 'cmake', 'cmd', 'cobol', 'codeowners', 'codeql', 'coffee', 'coffeescript', 'common-lisp', 'console', 'coq', 'cpp', 'cql', 'crystal', 'cs', 'csharp', 'css', 'csv', 'cts', 'cue', 'cypher', 'd', 'dart', 'dax', 'desktop', 'diff', 'docker', 'dockerfile', 'dotenv', 'dream-maker', 'edge', 'elisp', 'elixir', 'elm', 'emacs-lisp', 'erb', 'erl', 'erlang', 'f', 'f#', 'f03', 'f08', 'f18', 'f77', 'f90', 'f95', 'fennel', 'fish', 'fluent', 'for', 'fortran-fixed-form', 'fortran-free-form', 'fs', 'fsharp', 'fsl', 'ftl', 'gd', 'gdresource', 'gdscript', 'gdshader', 'genie', 'gherkin', 'git-commit', 'git-rebase', 'gjs', 'gleam', 'glimmer-js', 'glimmer-ts', 'glsl', 'gn', 'gnuplot', 'go', 'gql', 'graphql', 'groovy', 'gts', 'hack', 'haml', 'handlebars', 'haskell', 'haxe', 'hbs', 'hcl', 'hjson', 'hlsl', 'hs', 'html', 'html-derivative', 'http', 'hurl', 'hxml', 'hy', 'imba', 'ini', 'jade', 'java', 'javascript', 'jinja', 'jison', 'jl', 'js', 'json', 'json5', 'jsonc', 'jsonl', 'jsonnet', 'jssm', 'jsx', 'julia', 'just', 'kdl', 'kotlin', 'kql', 'kt', 'kts', 'kusto', 'latex', 'lean', 'lean4', 'less', 'liquid', 'lisp', 'lit', 'llvm', 'log', 'logo', 'lua', 'luau', 'make', 'makefile', 'markdown', 'marko', 'matlab', 'mbt', 'mbti', 'md', 'mdc', 'mdx', 'mediawiki', 'mermaid', 'mips', 'mipsasm', 'mjs', 'mmd', 'mojo', 'moonbit', 'move', 'mts', 'nar', 'narrat', 'nextflow', 'nextflow-groovy', 'nf', 'nginx', 'nim', 'nix', 'nu', 'nushell', 'objc', 'objective-c', 'objective-cpp', 'ocaml', 'odin', 'openscad', 'pascal', 'perl', 'perl6', 'php', 'pkl', 'plsql', 'po', 'polar', 'postcss', 'pot', 'potx', 'powerquery', 'powershell', 'prisma', 'prolog', 'properties', 'proto', 'protobuf', 'ps', 'ps1', 'pug', 'puppet', 'purescript', 'py', 'python', 'ql', 'qml', 'qmldir', 'qss', 'r', 'racket', 'raku', 'razor', 'rb', 'reg', 'regex', 'regexp', 'rel', 'riscv', 'ron', 'rosmsg', 'rs', 'rst', 'ruby', 'rust', 'sas', 'sass', 'scad', 'scala', 'scheme', 'scss', 'sdbl', 'sh', 'shader', 'shaderlab', 'shell', 'shellscript', 'shellsession', 'smalltalk', 'solidity', 'soy', 'sparql', 'spl', 'splunk', 'sql', 'ssh-config', 'stata', 'styl', 'stylus', 'surql', 'surrealql', 'svelte', 'swift', 'system-verilog', 'systemd', 'talon', 'talonscript', 'tasl', 'tcl', 'templ', 'terraform', 'tex', 'tf', 'tfvars', 'toml', 'tres', 'ts', 'ts-tags', 'tscn', 'tsp', 'tsv', 'tsx', 'turtle', 'twig', 'typ', 'typescript', 'typespec', 'typst', 'v', 'vala', 'vb', 'verilog', 'vhdl', 'vim', 'viml', 'vimscript', 'vue', 'vue-html', 'vue-vine', 'vy', 'vyper', 'wasm', 'wenyan', 'wgsl', 'wiki', 'wikitext', 'wit', 'wl', 'wolfram', 'xml', 'xsl', 'yaml', 'yml', 'zenscript', 'zig', 'zsh', '文言'
]);

export function CommentBody({children}: {children: string}) {
  return (
    <Markdown className="[word-break:break-word]" options={{
      disableParsingRawHTML: true,
      overrides: {
        img: {props: {style: {maxWidth: '100%'}}},
        pre: {
          component: (props) => {
            let child = props.children;
            let lang = child?.props?.className?.match(/lang-([^\s]+)/);
            if (lang && typeof child.props.children === 'string' && SUPPORTED_LANGUAGES.has(lang[1])) {
              return (
                <File
                  file={{ name: '', lang: lang[1], contents: child.props.children }}
                  options={{
                    theme: { dark: 'pierre-dark', light: 'pierre-light' },
                    themeType: 'system',
                    disableFileHeader: true,
                    disableLineNumbers: true
                  }}
                  className="my-2" />
              );
            } else {
              return <pre {...props} className="border border-daw-gray-200 rounded p-2 bg-daw-gray-50 text-xs my-2 overflow-auto" />;
            }
          }
        },
        h1: {
          props: {className: 'text-2xl font-semibold my-3 pb-1 border-b-2 border-daw-gray-200'}
        },
        h2: {
          props: {className: 'text-xl font-semibold my-3'}
        },
        h3: {
          props: {className: 'text-lg font-semibold my-3'}
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
        },
        ul: {
          props: {className: 'list-disc pl-4'}
        },
        ol: {
          props: {className: 'list-decimal pl-4'}
        },
        li: {
          props: {
            className: 'my-1'
          }
        },
        blockquote: {
          props: {className: 'border-l border-l-2 border-daw-gray-300 pl-2'}
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
