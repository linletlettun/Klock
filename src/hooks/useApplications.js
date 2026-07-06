import { useState, useEffect, useCallback } from 'react';
import { fetchProjects, fetchCommits, fetchPipelines, gitlabProjectToApp } from '@/services/gitlab';
import { createGitHubClient, githubRepoToApp } from '@/services/github';

function getHealthStatus(pipeline) {
  if (!pipeline) return 'unknown';
  switch (pipeline.status) {
    case 'success': return 'healthy';
    case 'failed': return 'degraded';
    case 'running': return 'progressing';
    case 'pending': return 'pending';
    default: return 'unknown';
  }
}

function getSyncStatus(lastActivity, lastCommitDate) {
  if (!lastActivity || !lastCommitDate) return 'unknown';
  const diffHours = Math.abs(new Date(lastActivity).getTime() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60);
  return diffHours < 24 ? 'synced' : 'out-of-sync';
}

function timeAgo(dateStr) {
  if (!dateStr) return '-';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Hook to fetch applications from GitLab and/or GitHub
 * Reads provider config from Settings API
 */
export function useApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState('gitlab');

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch settings to get provider config
      const API_BASE = import.meta.env.VITE_API_URL || '';
      let settings = {};
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        if (res.ok) settings = await res.json();
      } catch {}

      const gitProvider = settings.git_provider || 'gitlab';
      setProvider(gitProvider);

      if (gitProvider === 'github') {
        // GitHub mode
        const githubToken = settings.git_token || import.meta.env.VITE_GITHUB_TOKEN || '';
        const githubClient = createGitHubClient(githubToken);

        try {
          const repos = await githubClient.fetchProjects();
          const apps = repos.map(repo => {
            const app = githubRepoToApp(repo);
            app.health = 'unknown';
            app.sync = 'unknown';
            return app;
          });
          setApplications(apps);
        } catch (err) {
          // Token not configured or invalid — show empty, not an error
          if (err.message.includes('401') || err.message.includes('403')) {
            setApplications([]);
          } else {
            // Other error (network etc) — just show empty
            setApplications([]);
          }
        }
      } else {
        // GitLab mode (default) — fail silently if not configured
        try {
          const projects = await fetchProjects();
          const apps = await Promise.all(
            projects.map(async (project) => {
              try {
                const [commits, pipelines] = await Promise.all([
                  fetchCommits(project.id, project.default_branch).catch(() => []),
                  fetchPipelines(project.id).catch(() => []),
                ]);
                const lastCommit = commits[0] || null;
                const lastPipeline = pipelines[0] || null;
                const app = gitlabProjectToApp(project);
                app.health = getHealthStatus(lastPipeline);
                app.sync = getSyncStatus(project.last_activity_at, lastCommit?.committed_date);
                if (lastCommit) {
                  app.last_commit = {
                    message: lastCommit.message?.split('\n')[0] || '',
                    author: lastCommit.author_name || '',
                    date: lastCommit.committed_date || '',
                    short_id: lastCommit.short_id || '',
                  };
                }
                if (lastPipeline) {
                  app.pipeline = { id: lastPipeline.id, status: lastPipeline.status, ref: lastPipeline.ref };
                }
                return app;
              } catch {
                return gitlabProjectToApp(project);
              }
            })
          );
          setApplications(apps);
        } catch {
          // GitLab not configured — that's OK
          setApplications([]);
        }
      }

      // Always load manually added apps from localStorage
      const saved = localStorage.getItem('klock_manual_apps');
      if (saved) {
        try {
          const manualApps = JSON.parse(saved);
          setApplications(prev => {
            const existing = new Set(prev.map(a => a.repo_url));
            const newApps = manualApps.filter(a => !existing.has(a.repo_url));
            return [...prev, ...newApps];
          });
        } catch {}
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncApplication = useCallback(async (appId) => {
    // Re-fetch all for simplicity
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    provider,
    syncApplication,
    syncAll: fetchApplications,
    refetch: fetchApplications,
    timeAgo,
  };
}
