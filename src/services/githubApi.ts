import { GITHUB_API_BASE, GITHUB_GRAPHQL_ENDPOINT } from '../config/github';
import { GitHubRepoInfo, GitHubCommitItem } from '../types';

async function githubFetch(url: string, method: string = 'GET', body?: string, token?: string): Promise<any> {
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const resText = await invoke<string>('github_http_request', {
        method,
        url,
        body,
        token,
      });
      return JSON.parse(resText);
    } catch (e) {
      console.warn('Tauri github_http_request failed, using fetch', e);
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub API HTTP ${res.status}: ${errText}`);
  }
  return await res.json();
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name?: string;
  html_url: string;
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const data = await githubFetch(`${GITHUB_API_BASE}/user`, 'GET', undefined, token);
  return {
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name || data.login,
    html_url: data.html_url,
  };
}

export async function fetchRepoInfo(repo: string, token?: string): Promise<GitHubRepoInfo> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const data = await githubFetch(`${GITHUB_API_BASE}/repos/${cleanRepo}`, 'GET', undefined, token);

  return {
    full_name: data.full_name,
    description: data.description || '',
    stars: data.stargazers_count || 0,
    issues: data.open_issues_count || 0,
    forks: data.forks_count || 0,
    pushed_at: data.pushed_at || data.updated_at || '',
    html_url: data.html_url,
    default_branch: data.default_branch || 'main',
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchRepoCommits(repo: string, token?: string): Promise<GitHubCommitItem[]> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const data = await githubFetch(`${GITHUB_API_BASE}/repos/${cleanRepo}/commits?per_page=20`, 'GET', undefined, token);

  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    sha: item.sha,
    shortSha: item.sha.substring(0, 7),
    message: item.commit?.message?.split('\n')[0] || 'Commit',
    html_url: item.html_url,
    date: item.commit?.author?.date || item.commit?.committer?.date || '',
    authorName: item.commit?.author?.name || item.author?.login || 'Author',
  }));
}

export async function fetchUserContributions(username: string, token?: string): Promise<Record<string, number>> {
  if (!token) return {};

  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const body = JSON.stringify({ query, variables: { username } });
    const data = await githubFetch(GITHUB_GRAPHQL_ENDPOINT, 'POST', body, token);
    const result: Record<string, number> = {};

    const weeks = data?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
    if (Array.isArray(weeks)) {
      for (const week of weeks) {
        if (Array.isArray(week.contributionDays)) {
          for (const day of week.contributionDays) {
            if (day.date && day.contributionCount > 0) {
              result[day.date] = day.contributionCount;
            }
          }
        }
      }
    }

    return result;
  } catch (e) {
    console.error('Failed to fetch GitHub contribution calendar via GraphQL:', e);
    return {};
  }
}
