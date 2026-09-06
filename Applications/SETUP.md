# ProjectPro - Project Management Suite

## Architecture

```
Applications/
├── index.html          # Main SPA (login, dashboard, projects, tasks, timeline, risks, milestones)
├── admin.html          # Admin panel (users, roles, projects overview)
├── css/style.css       # Design system & responsive layout
├── js/app.js           # App logic (auth, CRUD, render, state)
└── supabase/schema.sql # Database schema (10 tables, RLS policies)
```

## Database Schema (supabase/schema.sql)

| Table | Purpose |
|-------|---------|
| `pm_roles` | User roles (admin/user) |
| `pm_projects` | Projects CRUD with budget, client info |
| `pm_tasks` | Tasks per project with status/priority/assignee |
| `pm_comments` | Comment threads per project/task |
| `pm_files` | File metadata per project/task |
| `pm_risks` | Risk/issue tracking with severity & mitigation |
| `pm_milestones` | Timeline milestones with status |
| `pm_notifications` | In-app notifications per user |
| `pm_time_logs` | Time tracking against tasks |

## Supabase Setup

1. Go to [Supabase Dashboard](https://supabase.com)
2. Create a new project or use existing one
3. Open SQL Editor and run `supabase/schema.sql`
4. Enable Auth methods (Email/Password, Google OAuth)
5. Create an admin user:
   - Sign up via the app
   - In SQL Editor, run: `INSERT INTO pm_roles (user_id, role) VALUES ('<USER_UUID>', 'admin');`
6. Update `SUPABASE_URL` and `SUPABASE_KEY` in `js/app.js` and `admin.html` if using a different project

## Key API Patterns

```javascript
// Auth
const { data, error } = await sb.auth.signInWithPassword({ email, password });
const { data, error } = await sb.auth.signUp({ email, password });

// CRUD - Projects
const { data } = await sb.from('pm_projects').select('*').eq('user_id', userId);
const { error } = await sb.from('pm_projects').insert([{ id, user_id, title, ... }]);
const { error } = await sb.from('pm_projects').update({ title, ... }).eq('id', id);
const { error } = await sb.from('pm_projects').delete().eq('id', id);

// Role check
const { data } = await sb.from('pm_roles').select('role').eq('user_id', userId).single();
```

## Features

### Current (MVP)
- Email/Password + Google Auth
- Admin & User roles with RLS
- Project CRUD (title, desc, status, priority, dates, budget, client)
- Task Kanban board (To Do → In Progress → Review → Done)
- Task status, priority, due date, estimated hours
- Comment threads per project
- Risk/issue logging with severity & mitigation
- Milestone timeline with status tracking
- Simplified Gantt chart view by task status
- Budget tracking with spend bar
- Admin panel: user list, role management, full project view
- In-app notifications

### Phase 2 (Coming)
- File attachments (Supabase Storage)
- Task assignment to team members
- Time logging per task
- Real-time collaboration (Supabase Realtime)
- Email notifications (Supabase Edge Functions)
- Analytics dashboard with charts (delivery SLA, burndown)
- Client portal (shared read-only view)

### Phase 3 (Advanced)
- AI-powered requirement analysis
- Automated effort estimation
- DevOps integrations (GitHub, GitLab, Jenkins webhooks)
- Cloud service integrations (Azure, AWS, GCP)
- Mobile push notifications
- Gantt chart with drag-to-reschedule
- Resource workload heatmap

## Development

No build step required. Open `index.html` in a browser or serve with any HTTP server:

```bash
npx serve Applications/
```
