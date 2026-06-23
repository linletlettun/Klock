# Auth Guard Skill

Protect routes and handle Supabase Auth sessions.

## What it does
- Implements ProtectedRoute component for authenticated pages
- Handles login/logout flows with Supabase Auth
- Manages session state and redirects
- Guards API calls with user context

## When to use
- Adding a new protected route
- Implementing auth-related UI
- Debugging session issues

## How it works
1. Check Supabase session on route access
2. Redirect to /login if not authenticated
3. Wrap protected pages with ProtectedRoute component
4. Provide user context via AuthContext
