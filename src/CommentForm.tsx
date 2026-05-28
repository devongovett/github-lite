import { Issue, PullRequest } from "@octokit/graphql-schema";
import { IssuePage } from "./Issue";
import { PullRequestPage } from "./PullRequest";
import { github } from "./client";
import { mutate } from 'swr';
import { Button, Label, TextArea, TextField } from "react-aria-components";
import { FormEvent, ReactNode, Ref, useRef, useState } from "react";

export function IssueCommentForm({issue}: {issue: Issue | PullRequest}) {
  let formRef = useRef<HTMLFormElement>(null);
  let [isClosing, setClosing] = useState(false);

  let key = [
    issue.__typename === 'Issue' ? IssuePage.query() : PullRequestPage.query(),
    { owner: issue.repository.owner.login, repo: issue.repository.name, number: issue.number }
  ] as const;

  let onSubmit = async (comment: string) => {
    await github.issues.createComment({
      owner: issue.repository.owner.login,
      repo: issue.repository.name,
      issue_number: issue.number,
      body: comment
    });
    await mutate(key);
  };

  async function handleClose() {
    setClosing(true);
    try {
      let comment = formRef.current ? (new FormData(formRef.current).get('comment') as string) : '';
      if (comment) {
        await github.issues.createComment({
          owner: issue.repository.owner.login,
          repo: issue.repository.name,
          issue_number: issue.number,
          body: comment
        });
      }
      await github.issues.update({
        owner: issue.repository.owner.login,
        repo: issue.repository.name,
        issue_number: issue.number,
        state: 'closed'
      });
      formRef.current?.reset();
      await mutate(key);
    } finally {
      setClosing(false);
    }
  }

  return (
    <CommentForm formRef={formRef} onSubmit={onSubmit}>
      {issue.viewerCanClose && issue.state === 'OPEN' && (
        <Button type="button" isPending={isClosing} onPress={handleClose} className="px-4 py-2 rounded-md bg-purple-500 pressed:bg-purple-600 border border-purple-400 pressed:border-purple-500 pending:opacity-50 transition text-white text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Close</Button>
      )}
    </CommentForm>
  );
}

export function CommentForm({children, className, autoFocus, onSubmit, onCancel, formRef}: {children?: ReactNode, className?: string, autoFocus?: boolean, onSubmit?: (comment: string) => Promise<void>, onCancel?: () => void, formRef?: Ref<HTMLFormElement>}) {
  let [isPending, setPending] = useState(false);
  let handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let form = e.target as HTMLFormElement;
    let comment = new FormData(form).get('comment');
    if (comment && typeof comment === 'string' && onSubmit) {
      try {
        setPending(true);
        await onSubmit(comment);
      } finally {
        setPending(false);
      }
    }
    form.reset();
  };

  return (
    <form ref={formRef} className={`flex flex-col gap-2 items-end ${className}`} onSubmit={handleSubmit}>
      <TextField name="comment" className="flex flex-col gap-1 w-full" autoFocus={autoFocus}>
        <Label className="text-xs">Comment</Label>
        <TextArea className="w-full bg-daw-gray-50 border border-daw-gray-400 rounded outline-none focus:ring-1 focus:border-blue-600 ring-blue-600 p-2" rows={4} />
      </TextField>
      <div className="flex gap-2">
        {children}
        {onCancel && <Button type="button" onPress={onCancel} className="px-4 py-2 rounded-md bg-daw-gray-300 pressed:bg-daw-gray-400 border border-daw-gray-400 pressed:border-daw-gray-500 text-daw-gray-800 text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Cancel</Button>}
        <Button type="submit" isPending={isPending} className="px-4 py-2 rounded-md bg-green-600 pressed:bg-green-700 border border-green-700 pressed:border-green-800 dark:border-green-500 dark:pressed:border-green-600 pending:opacity-50 transition text-white text-sm font-medium cursor-default outline-none focus-visible:ring-2 ring-offset-2 ring-blue-600">Comment</Button>
      </div>
    </form>
  );
}
