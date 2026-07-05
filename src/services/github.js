const GITHUB_URL = 'https://api.github.com';

/**
 * GitHub API client
 * Uses personal access token for authentication
 */
export function createGitHubClient(token) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  return {
    /**
     * List repositories for the authenticated user
     */
    async fetchProjects(search = '') {
      let url = `${GITHUB_URL}/user/repos?sort=updated&per_page=50`;
      if (search) url += `&q=${encodeURIComponent(search)}`;

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },

    /**
     * Get a single repository
     */
    async fetchProject(owner, repo) {
      const res = await fetch(`${GITHUB_URL}/repos/${owner}/${repo}`, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },

    /**
     * List branches for a repo
     */
    async fetchBranches(owner, repo) {
      const res = await fetch(`${GITHUB_URL}/repos/${owner}/${repo}/branches?per_page=50`, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },

    /**
     * List commits for a repo
     */
    async fetchCommits(owner, repo, sha = 'main') {
      const res = await fetch(
        `${GITHUB_URL}/repos/${owner}/${repo}/commits?sha=${sha}&per_page=1`,
        { headers }
      );
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },

    /**
     * List workflows (CI/CD) for a repo
     */
    async fetchWorkflows(owner, repo) {
      const res = await fetch(`${GITHUB_URL}/repos/${owner}/${repo}/actions/workflows?per_page=5`, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },

    /**
     * List recent workflow runs
     */
    async fetchWorkflowRuns(owner, repo) {
      const res = await fetch(`${GITHUB_URL}/repos/${owner}/${repo}/actions/runs?per_page=5`, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },

    /**
     * Test connection - get authenticated user info
     */
    async testConnection() {
      const res = await fetch(`${GITHUB_URL}/user`, { headers });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    },
  };
}

/**
 * Parse GitHub repo URL to extract owner and repo
 * Supports: https://github.com/owner/repo.git or https://github.com/owner/repo
 */
export function parseGitHubUrl(url) {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
}

/**
 * Convert GitHub repo to app format (like GitLab projects)
 */
export function githubRepoToApp(repo) {
  const owner = repo.owner?.login || '';
  return {
    id: repo.id,
    name: repo.name,
    path: `${owner}/${repo.name}`,
    description: repo.description || '',
    repo_url: repo.html_url,
    default_branch: repo.default_branch,
    last_activity: repo.updated_at,
    last_commit: null,
    health: 'unknown',
    sync: 'unknown',
    pipeline: null,
    visibility: repo.private ? 'private' : 'public',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    avatar_url: repo.owner?.avatar_url || null,
    namespace: owner,
    provider: 'github',
  };
}
