import { createElement, ReactNode, useCallback } from "react";
import useSWR from "swr";
import { github } from "./client";

// GitHub's GraphQL API returns emoji as shortcodes rather than Unicode (for
// example DiscussionCategory.emoji returns ":bulb:"), so we render them for
// display. GitHub's emoji REST API (https://api.github.com/emojis) maps each
// shortcode to an image URL; standard emoji encode their Unicode codepoint(s)
// in the path, e.g. .../unicode/1f64f.png, which we turn back into the actual
// emoji character. Custom GitHub emoji (e.g. :shipit:) have no Unicode form, so
// we render the image URL that GitHub provides.
const UNICODE_RE = /\/unicode\/([0-9a-f-]+)\.png/i;

type GitHubEmoji =
  | { kind: "unicode"; value: string }
  | { kind: "image"; url: string };

async function fetchEmojis(): Promise<Record<string, GitHubEmoji>> {
  const { data } = await github.emojis.get();
  const map: Record<string, GitHubEmoji> = {};
  for (const [name, url] of Object.entries(data as Record<string, string>)) {
    const match = url.match(UNICODE_RE);
    if (match) {
      map[name] = {
        kind: "unicode",
        value: match[1]
          .split("-")
          .map((cp) => String.fromCodePoint(parseInt(cp, 16)))
          .join(""),
      };
    } else {
      map[name] = { kind: "image", url };
    }
  }
  return map;
}

const SHORTCODE_RE = /:([a-z0-9_+-]+):/gi;

function renderEmoji(name: string, emoji: GitHubEmoji, key: string): ReactNode {
  if (emoji.kind === "unicode") {
    return emoji.value;
  }

  return createElement("img", {
    key,
    src: emoji.url,
    alt: `:${name}:`,
    title: `:${name}:`,
    loading: "lazy",
    decoding: "async",
    className: "inline-block h-[1em] w-[1em] align-[-0.125em]",
  });
}

// Returns a function that renders any `:shortcode:` tokens in `text`. The
// shortcode map is fetched once from GitHub and cached by SWR; until it loads
// (or for unknown shortcodes) the text is returned unchanged.
export function useRenderGitHubEmojis(): (text: string) => ReactNode {
  const { data: map } = useSWR("github-emojis", fetchEmojis);
  return useCallback(
    (text: string) => {
      if (!map) {
        return text;
      }

      const nodes: ReactNode[] = [];
      let lastIndex = 0;
      let hasEmoji = false;

      for (const match of text.matchAll(SHORTCODE_RE)) {
        const [shortcode, name] = match;
        const index = match.index ?? 0;
        const emoji = map[name.toLowerCase()];

        if (!emoji) {
          continue;
        }

        if (index > lastIndex) {
          nodes.push(text.slice(lastIndex, index));
        }
        nodes.push(renderEmoji(name, emoji, `${name}-${index}`));
        lastIndex = index + shortcode.length;
        hasEmoji = true;
      }

      if (!hasEmoji) {
        return text;
      }

      if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
      }

      return nodes;
    },
    [map],
  );
}
