import { createContext, RefObject, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Link, LinkProps } from 'react-aria-components';
import { FocusScope } from 'react-aria';
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from '@primer/octicons-react';
import { IssuePage } from './Issue';
import { PullRequestPage } from './PullRequest';
import { CommitPage } from './Commit';
import { DiscussionPage } from './Discussion';

export type SlideOverContent =
  | { type: 'issue'; owner: string; repo: string; number: number }
  | { type: 'pr'; owner: string; repo: string; number: number }
  | { type: 'commit'; owner: string; repo: string; sha: string }
  | { type: 'discussion'; owner: string; repo: string; number: number };

interface SlideOverContextValue {
  open: (content: SlideOverContent) => void;
  close: () => void;
}

const SlideOverContext = createContext<SlideOverContextValue>({
  open: () => {},
  close: () => {}
});

export function useSlideOver() {
  return useContext(SlideOverContext);
}

// The repository whose content is currently being displayed.
export const RepoContext = createContext<{owner: string, repo: string} | null>(null);

export function parseGitHubUrl(url: string): SlideOverContent | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com') return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 4) return null;
    const [owner, repo, type, id] = parts;
    if (type === 'issues') {
      const number = parseInt(id, 10);
      if (!isNaN(number)) return { type: 'issue', owner, repo, number };
    } else if (type === 'pull') {
      const number = parseInt(id, 10);
      if (!isNaN(number)) return { type: 'pr', owner, repo, number };
    } else if (type === 'commit') {
      return { type: 'commit', owner, repo, sha: id };
    } else if (type === 'discussions') {
      const number = parseInt(id, 10);
      if (!isNaN(number)) return { type: 'discussion', owner, repo, number };
    }
    return null;
  } catch {
    return null;
  }
}

interface PanelContent {
  content: SlideOverContent,
  scrollPosition: number
}

interface HistoryState {
  history: PanelContent[];
  index: number;
}

const CLOSED: HistoryState = { history: [], index: -1 };

function updateHistory(state: HistoryState, scrollRef: RefObject<HTMLDivElement | null>) {
  let newHistory = state.history.slice();
  if (state.history[state.index]) {
    newHistory[state.index] = { content: state.history[state.index].content, scrollPosition: scrollRef.current?.scrollTop ?? 0 };
  }
  return newHistory;
}

export function SlideOverProvider({ children }: { children: ReactNode }) {
  const [{ history, index }, setState] = useState<HistoryState>(CLOSED);
  const scrollRef = useRef<HTMLDivElement>(null);

  const open = useCallback((c: SlideOverContent) => {
    setState(s => ({
      history: [
        ...updateHistory(s, scrollRef).slice(0, s.index + 1),
        { content: c, scrollPosition: 0 }
      ],
      index: s.index + 1
    }));
  }, []);

  const close = useCallback(() => {
    setState(CLOSED);
  }, []);
  const back = useCallback(() => setState(s => ({ history: updateHistory(s, scrollRef), index: s.index - 1 })), []);
  const forward = useCallback(() => setState(s => ({ history: updateHistory(s, scrollRef), index: s.index + 1 })), []);

  const content = history[index] ?? null;
  const canGoBack = index > 0;
  const canGoForward = index < history.length - 1;

  return (
    <SlideOverContext.Provider value={{ open, close }}>
      {children}
      <Panel
        content={content}
        index={index}
        scrollRef={scrollRef}
        onClose={close}
        onBack={back}
        onForward={forward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
    </SlideOverContext.Provider>
  );
}

interface PanelProps {
  content: PanelContent | null;
  index: number;
  scrollRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

function Panel({ content, index, scrollRef, onClose, onBack, onForward, canGoBack, canGoForward }: PanelProps) {
  const isOpen = content !== null;
  const navBtnClass = "p-1.5 rounded-md hover:bg-daw-gray-100 pressed:bg-daw-gray-200 cursor-default outline-none focus-visible:ring-2 ring-blue-600 disabled:opacity-40";
  return (
    <div
      className={`fixed top-0 right-0 h-full w-3/5 bg-daw-gray-50 border-l border-daw-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
      inert={!isOpen || undefined}
      role="dialog"
      aria-modal="false"
    >
      {content && (
        <FocusScope autoFocus restoreFocus>
          <div className="flex items-center justify-between p-2 shrink-0">
            <div className="flex items-center gap-0.5">
            {(canGoBack || canGoForward) && (
              <>
                <Button onPress={onBack} isDisabled={!canGoBack} aria-label="Back" className={navBtnClass}>
                  <ArrowLeftIcon size={16} />
                </Button>
                <Button onPress={onForward} isDisabled={!canGoForward} aria-label="Forward" className={navBtnClass}>
                  <ArrowRightIcon size={16} />
                </Button>
              </>
            )}
            </div>
            <Button onPress={onClose} aria-label="Close" className={navBtnClass}>
              <XIcon size={16} />
            </Button>
          </div>
          <ScrollPane key={index} ref={scrollRef} scrollPosition={content.scrollPosition}>
            <PageContent content={content.content} />
          </ScrollPane>
        </FocusScope>
      )}
    </div>
  );
}

function ScrollPane({ ref, scrollPosition, children }: {
  ref: RefObject<HTMLDivElement | null>,
  scrollPosition: number,
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    const el = ref.current!;
    el.scrollTop = scrollPosition ?? 0;
  }, []);

  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto flex flex-col">
      {children}
    </div>
  );
}

function PageContent({ content }: { content: SlideOverContent }) {
  switch (content.type) {
    case 'issue':
      return <IssuePage owner={content.owner} repo={content.repo} number={content.number} />;
    case 'pr':
      return <PullRequestPage owner={content.owner} repo={content.repo} number={content.number} />;
    case 'commit':
      return <CommitPage owner={content.owner} repo={content.repo} sha={content.sha} />;
    case 'discussion':
      return <DiscussionPage owner={content.owner} repo={content.repo} number={content.number} />;
  }
}

function preloadContent(content: SlideOverContent) {
  switch (content.type) {
    case 'issue':
      IssuePage.preload(content.owner, content.repo, content.number);
      break;
    case 'pr':
      PullRequestPage.preload(content.owner, content.repo, content.number);
      break;
    case 'commit':
      CommitPage.preload(content.owner, content.repo, content.sha);
      break;
  }
}

// Formats an issue/PR/discussion/commit URL as a short reference, e.g. "#123", "owner/repo#123", or "abc1234".
function formatGitHubReference(href: string, content: SlideOverContent, currentRepo: {owner: string, repo: string} | null): string | null {
  const url = new URL(href);
  if (url.pathname.split('/').filter(Boolean).length !== 4 || url.search) {
    return null;
  }

  const isCurrentRepo = currentRepo
    && content.owner.toLowerCase() === currentRepo.owner.toLowerCase()
    && content.repo.toLowerCase() === currentRepo.repo.toLowerCase();
  if (content.type === 'commit') {
    if (!/^[0-9a-f]{40}$/.test(content.sha)) {
      return null;
    }
    const sha = content.sha.slice(0, 7);
    return isCurrentRepo ? sha : `${content.owner}/${content.repo}@${sha}`;
  }

  let suffix = '';
  if (/^#(issuecomment|discussioncomment)-/.test(url.hash)) {
    suffix = ' (comment)';
  } else if (/^#pullrequestreview-/.test(url.hash)) {
    suffix = ' (review)';
  }
  const prefix = isCurrentRepo ? '' : `${content.owner}/${content.repo}`;
  return `${prefix}#${content.number}${suffix}`;
}

export function GitHubLink({ href, children, className, ...props }: LinkProps) {
  const { open } = useSlideOver();
  const currentRepo = useContext(RepoContext);
  const content = href ? parseGitHubUrl(href) : null;

  // Autolinked bare URLs (link text is the URL itself) render as short references.
  const text = Array.isArray(children) && children.length === 1 ? children[0] : children;
  if (href && content && typeof text === 'string' && text === href) {
    children = formatGitHubReference(href, content, currentRepo) ?? children;
  }

  if (content) {
    return (
      <Link
        onHoverStart={() => preloadContent(content)}
        onPress={() => open(content)}
        className={`${className || ''} cursor-pointer`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link target="_blank" {...props} className={className} href={href}>
      {children}
    </Link>
  );
}
