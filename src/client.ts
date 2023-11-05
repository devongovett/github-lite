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
  let code = new URL(location.href).searchParams.get("code");
  if (!code) {
    location.replace(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo&redirect=${location.href}`);
    return;
  }

  try {
    let res = await fetch('/login', {
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
    // location.reload();
  } catch (err) {
    console.log(err);
    // location.reload();
  }
}
