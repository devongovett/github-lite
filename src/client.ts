import { graphql as githubGraphql } from '@octokit/graphql';
import { Octokit } from '@octokit/rest';
import useSWR, { SWRResponse, preload as swrPreload } from 'swr';

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
