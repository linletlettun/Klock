const GITLAB_URL = import.meta.env.VITE_GITLAB_URL || 'https://gitlab.example.com';
const GITLAB_TOKEN = import.meta.env.VITE_GITLAB_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  ...(GITLAB_TOKEN && { 'PRIVATE-TOKEN': GITLAB_TOKEN }),
};

export async function fetchProjects(search = '') {
  const params = new URLSearchParams({
    visibility: 'public',
    order_by: 'last_activity_at',
    sort: 'desc',
    per_page: '50',
  });
  if (search) params.set('search', search);

  const res = await fetch(`${GITLAB_URL}/api/v4/projects?${params}`, { headers });
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

export async function fetchProject(projectId) {
  const res = await fetch(`${GITLAB_URL}/api/v4/projects/${projectId}`, { headers });
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

export async function fetchBranches(projectId) {
  const res = await fetch(`${GITLAB_URL}/api/v4/projects/${projectId}/repository/branches`, { headers });
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

export async function fetchCommits(projectId, refName = 'main') {
  const res = await fetch(
    `${GITLAB_URL}/api/v4/projects/${projectId}/repository/commits?ref_name=${refName}&per_page=1`,
    { headers }
  );
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

export async function fetchPipelines(projectId) {
  const res = await fetch(
    `${GITLAB_URL}/api/v4/projects/${projectId}/pipelines?per_page=1`,
    { headers }
  );
  if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
  return res.json();
}

/**
 * Parse GitLab repo URL to extract project path
 */
export function parseGitLabUrl(url) {
  const match = url.match(/gitlab\.com[/:](.+?)(?:\.git)?$/);
  if (match) return match[1];
  return null;
}

/**
 * Convert GitLab project to app format
 */
export function gitlabProjectToApp(project) {
  const lastCommit = project.last_commit || null;
  return {
    id: project.id,
    name: project.name,
    path: project.path_with_namespace,
    description: project.description || '',
    repo_url: project.web_url,
    default_branch: project.default_branch,
    last_activity: project.last_activity_at,
    last_commit: lastCommit ? {
      message: lastCommit.message?.split('\n')[0] || '',
      author: lastCommit.author_name || '',
      date: lastCommit.committed_date || '',
      short_id: lastCommit.short_id || '',
    } : null,
    health: 'unknown',
    sync: 'unknown',
    pipeline: null,
    visibility: project.visibility,
    stars: project.star_count || 0,
    forks: project.forks_count || 0,
    avatar_url: project.avatar_url || null,
    namespace: project.namespace?.full_path || '',
    provider: 'gitlab',
  };
}

export { GITLAB_URL };
