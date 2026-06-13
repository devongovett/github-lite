import { Blob, Repository } from '@octokit/graphql-schema';
import { File, FileContents, FileOptions } from '@pierre/diffs';
import { isValidElement, ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import { Link } from 'react-aria-components';
import { useQuery } from './client';
import { GitHubLink } from './SlideOver';

export interface CodeReference {
  owner: string;
  repo: string;
  sha: string;
  path: string;
  start: number;
  end: number;
  url: string;
}

const MAX_LINES = 200;
const FRAGMENT_REGEX = /^L(\d+)(?:C\d+)?(?:-L(\d+)(?:C\d+)?)?$/;

// Parses GitHub permalinks like
// https://github.com/{owner}/{repo}/blob/{sha}/{path}#L46-L47
// Only full commit SHAs are embedded since branch contents can change.
export function parseCodeReference(url: string): CodeReference | null {
  try {
    let parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    let match = FRAGMENT_REGEX.exec(parsed.hash.slice(1));
    if (!match) return null;
    let [owner, repo, type, sha, ...pathParts] = parsed.pathname.split('/').filter(Boolean);
    if (type !== 'blob' || !sha || !/^[0-9a-f]{40}$/i.test(sha) || pathParts.length === 0) return null;
    let path = pathParts.map(decodeURIComponent).join('/');
    let start = parseInt(match[1], 10);
    let end = match[2] ? parseInt(match[2], 10) : start;
    if (start < 1) return null;
    if (end < start) [start, end] = [end, start];
    return {owner, repo, sha, path, start, end, url};
  } catch {
    return null;
  }
}

// Returns a CodeReference if the given element is a bare autolinked permalink
// (like github.com, [text](url) links stay links).
function getLinkReference(child: ReactNode): CodeReference | null {
  if (!isValidElement(child)) return null;
  let {href, children: linkChildren} = child.props as {href?: unknown, children?: ReactNode};
  if (typeof href !== 'string') return null;
  let text = Array.isArray(linkChildren) && linkChildren.length === 1 ? linkChildren[0] : linkChildren;
  if (text !== href) return null;
  return parseCodeReference(href);
}

// Replaces bare permalink links anywhere in the given children with embedded
// code snippets. Returns null if there are none.
export function replaceCodeReferences(children: ReactNode): ReactNode[] | null {
  let array = Array.isArray(children) ? children : [children];
  let found = false;
  let result = array.map((child, i) => {
    let reference = getLinkReference(child);
    if (reference) {
      found = true;
      return <CodeReferenceCard key={i} reference={reference} />;
    }
    return child;
  });
  return found ? result : null;
}

const blobQuery = `
query CodeReferenceBlob($owner: String!, $name: String!, $expression: String!) {
  repository(owner: $owner, name: $name) {
    object(expression: $expression) {
      ... on Blob {
        text
        isBinary
      }
    }
  }
}
`;

export function CodeReferenceCard({reference}: {reference: CodeReference}) {
  let {owner, repo, sha, path, url, start} = reference;
  let {data, error} = useQuery<{repository: Repository | null}>(blobQuery, {owner, name: repo, expression: `${sha}:${path}`});
  let blob = data?.repository?.object as Blob | null | undefined;
  let lineCount = useMemo(() => {
    if (blob?.text == null) return null;
    let count = blob.text.split('\n').length;
    return blob.text.endsWith('\n') ? count - 1 : count;
  }, [blob]);

  let failed = error != null
    || (data != null && (blob?.text == null || blob.isBinary))
    || (lineCount != null && start > lineCount);
  if (failed) {
    return (
      <p className="my-2" style={{wordBreak: 'break-word'}}>
        <GitHubLink href={url} className="underline">{url}</GitHubLink>
      </p>
    );
  }

  let end = Math.min(reference.end, start + MAX_LINES - 1, lineCount ?? Infinity);
  return (
    <div className="code-reference my-2 border border-daw-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 text-xs flex flex-col gap-0.5 border-b border-daw-gray-200 bg-daw-gray-50">
        <Link href={url} target="_blank" className="font-semibold text-daw-blue-800 hover:underline w-fit [word-break:break-all]">
          {repo}/{path}
        </Link>
        <span className="text-daw-gray-600">
          {start === end ? `Line ${start}` : `Lines ${start} to ${end}`} in{' '}
          <GitHubLink href={`https://github.com/${owner}/${repo}/commit/${sha}`} className="font-mono underline">{sha.slice(0, 7)}</GitHubLink>
        </span>
      </div>
      {blob?.text != null
        ? (
          <div className="max-h-96 overflow-y-auto">
            <Snippet path={path} contents={blob.text} start={start} end={end} />
          </div>
        )
        : <div className="animate-pulse bg-daw-gray-100" style={{height: Math.min(end - start + 1, 19) * 20 + 16}} />}
    </div>
  );
}

const SNIPPET_OPTIONS: FileOptions<undefined> = {
  theme: { dark: 'pierre-dark', light: 'pierre-light' },
  themeType: 'system',
  disableFileHeader: true
};

// Renders a window of the full file so the gutter shows the true line numbers.
// The React File wrapper doesn't expose renderRange, so this drives the
// imperative File class directly.
function Snippet({path, contents, start, end}: {path: string, contents: string, start: number, end: number}) {
  let ref = useRef<HTMLDivElement | null>(null);
  let file: FileContents = useMemo(() => ({name: path, contents}), [path, contents]);

  useLayoutEffect(() => {
    let instance = new File(SNIPPET_OPTIONS);
    instance.render({
      file,
      containerWrapper: ref.current!,
      renderRange: {
        startingLine: start - 1,
        totalLines: end - start + 1,
        bufferBefore: 0,
        bufferAfter: 0
      }
    });
    return () => instance.cleanUp();
  }, [file, start, end]);

  return <div ref={ref} />;
}
