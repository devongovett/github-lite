import { Issue, PullRequest } from "@octokit/graphql-schema";
import { IssuePage } from "./Issue";
import { PullRequestPage } from "./PullRequest";
import { github } from "./client";
import { mutate } from 'swr';
import { Button, Label, TextArea, TextField } from "react-aria-components";
import { FormEvent, ReactNode } from "react";

export function IssueCommentForm({issue}: {issue: Issue | PullRequest}) {
  let onSubmit = async (comment: string) => {
    await github.issues.createComment({
      owner: issue.repository.owner.login,
      repo: issue.repository.name,
      issue_number: issue.number,
      body: comment
    });

    mutate([
      issue.__typename === 'Issue' ? IssuePage.query() : PullRequestPage.query(),
      {
        owner: issue.repository.owner.login,
        repo: issue.repository.name,
        number: issue.number
      }
    ]);
  };

  return (
    <CommentForm onSubmit={onSubmit}>
      {issue.viewerCanClose && issue.state === 'OPEN' && <Button className="px-4 py-2 rounded-md bg-purple-500 pressed:bg-purple-600 border border-purple-400 pressed:border-purple-500 text-white text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Close</Button>}
    </CommentForm>
  );
}

export function CommentForm({children, className, onSubmit}: {children: ReactNode, className?: string, onSubmit?: (comment: string) => Promise<void>}) {
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
