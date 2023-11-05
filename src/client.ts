import { graphql as githubGraphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';
import useSWR, { SWRResponse, preload as swrPreload } from 'swr';

const CLIENT_ID = '07a30b365ca6f9eb8c5f';

export const github = new Octokit({
  auth: localStorage.token
});

export const graphql = githubGraphql.defaults({
  headers: {
    authorization: `token ${localStorage.token}`,
  },
});

function runQuery<T>([query, options]: [string, Record<string, unknown>]): Promise<T> {
  return graphql(query, options);
}

export function useQuery<T>(query: string, options: Record<string, unknown>): SWRResponse<T> {
  return useSWR([query, options], runQuery as typeof runQuery<T>);
}

export function preload(query: string, options: Record<string, unknown>) {
  swrPreload([query, options], runQuery);
}

export async function login() {
  let url = new URL(location.href);
  let code = url.searchParams.get('code');
  if (!code) {
    let redirect = new URL('https://github.com/login/oauth/authorize');
    redirect.searchParams.set('client_id', CLIENT_ID);
    if (process.env.NODE_ENV !== 'production') {
      redirect.searchParams.set('redirect_uri', `https://github-lite.pages.dev/login?redirect=${location.href}`);
    }
    location.replace(redirect);
    return;
  }

  try {
    let res = await fetch('https://github-lite.pages.dev/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({code})
    });

    let json = await res.json();
    if (json.error) {
      console.log(json);
      return;
    }

    localStorage.token = json.token;

    url.searchParams.delete('code');
    location.replace(url)
  } catch (err) {
    console.log(err);
    // location.reload();
  }
}
