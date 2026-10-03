-- =====================================================================
-- Genra Phase 03: Developer Discovery Seed Dataset
-- DO NOT APPLY TO PRODUCTION.
-- Use for local development or manual verification in staging.
-- To clean up: run supabase/seed.dev-discovery.cleanup.sql.
-- =====================================================================

do $$
declare
  v_creator_1 uuid;
  v_creator_2 uuid;
begin
  -- Resolve valid profile IDs
  select id into v_creator_1 from profiles where username = 'ceesharptech' limit 1;
  select id into v_creator_2 from profiles where username = 'eniolamusu' limit 1;

  if v_creator_1 is null then
    select id into v_creator_1 from profiles limit 1;
  end if;
  if v_creator_2 is null then
    v_creator_2 := v_creator_1;
  end if;

  -- -------------------------------------------------------------------
  -- 1. SaaS Landing Page with Claude & Next.js
  -- -------------------------------------------------------------------
  insert into creations (
    id, creator_id, slug, title, summary, description, category_id,
    status, live_url, repo_url, published_at, like_count, comment_count, view_count, trending_score
  ) values (
    'c0000000-0000-4000-a000-000000000001',
    v_creator_1,
    'lumina-analytics-dashboard',
    'Lumina: Real-time Cloud Analytics Dashboard',
    'A high-performance modern web dashboard built with Next.js App Router, Tailwind CSS, and shadcn/ui components.',
    'Lumina was built over a weekend using Claude Code and Cursor. The goal was to build a low-latency monitoring interface for distributed serverless workers with zero external component libraries outside Base UI primitives.',
    1, -- Websites
    'published',
    'https://lumina-demo.vercel.app',
    'https://github.com/example/lumina',
    now() - interval '2 days',
    42, 7, 312, 125.4
  ) on conflict (id) do nothing;

  insert into creation_tools (creation_id, tool_id, role, position)
  values
    ('c0000000-0000-4000-a000-000000000001', 1, 'primary', 0),    -- Claude
    ('c0000000-0000-4000-a000-000000000001', 5, 'supporting', 1), -- Cursor
    ('c0000000-0000-4000-a000-000000000001', 10, 'supporting', 2) -- Next.js
  on conflict do nothing;

  insert into process_steps (id, creation_id, position, title, body)
  values
    ('s0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-000000000001', 0, 'Architecture Design', 'Outlined the data schema and API boundaries with Claude.'),
    ('s0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-000000000001', 1, 'Frontend Scaffolding', 'Generated the component tree and implemented responsive layouts with Tailwind v4.')
  on conflict do nothing;

  -- -------------------------------------------------------------------
  -- 2. Retro Cyberpunk Cityscape Concept Art
  -- -------------------------------------------------------------------
  insert into creations (
    id, creator_id, slug, title, summary, description, category_id,
    status, published_at, like_count, comment_count, view_count, trending_score
  ) values (
    'c0000000-0000-4000-a000-000000000002',
    v_creator_2,
    'neo-kyoto-2099',
    'Neo Kyoto 2099: Volumetric Lighting & Rain',
    'Photorealistic cinematic concept exploration of rain-slicked alleyways in a futuristic Japanese metropolis.',
    'Rendered through Midjourney v6 using custom style references and detailed negative weighting. Post-processed for chromatic aberration and color grading.',
    3, -- Images
    'published',
    now() - interval '1 day',
    89, 14, 820, 240.2
  ) on conflict (id) do nothing;

  insert into creation_tools (creation_id, tool_id, role, position)
  values
    ('c0000000-0000-4000-a000-000000000002', 6, 'primary', 0) -- Midjourney
  on conflict do nothing;

  -- -------------------------------------------------------------------
  -- 3. Autonomous Support Agent with Gemini & Supabase
  -- -------------------------------------------------------------------
  insert into creations (
    id, creator_id, slug, title, summary, description, category_id,
    status, live_url, repo_url, published_at, like_count, comment_count, view_count, trending_score
  ) values (
    'c0000000-0000-4000-a000-000000000003',
    v_creator_1,
    'sentinel-autonomous-agent',
    'Sentinel: Multi-Agent Customer Routing Bot',
    'Autonomous customer success triage agent built with Google Gemini and Supabase pgvector.',
    'Sentinel handles incoming enterprise inquiries, matches query embeddings against knowledge docs, and proposes resolutions before routing complex tickets.',
    8, -- Agents
    'published',
    'https://sentinel-agent.example.com',
    'https://github.com/example/sentinel',
    now() - interval '3 days',
    34, 5, 290, 88.0
  ) on conflict (id) do nothing;

  insert into creation_tools (creation_id, tool_id, role, position)
  values
    ('c0000000-0000-4000-a000-000000000003', 4, 'primary', 0),    -- Gemini
    ('c0000000-0000-4000-a000-000000000003', 13, 'supporting', 1) -- Supabase
  on conflict do nothing;

  -- -------------------------------------------------------------------
  -- 4. Mobile Fitness Tracker with Lovable & Next.js
  -- -------------------------------------------------------------------
  insert into creations (
    id, creator_id, slug, title, summary, description, category_id,
    status, live_url, published_at, like_count, comment_count, view_count, trending_score
  ) values (
    'c0000000-0000-4000-a000-000000000004',
    v_creator_2,
    'pulse-workout-companion',
    'Pulse: Workout & Calorie Tracker App',
    'Progressive Web App for tracking strength workouts, rest intervals, and nutrition intake.',
    'Created in 3 hours using Lovable and polished in Cursor with clean dark mode tokens and interactive chart components.',
    2, -- Apps
    'published',
    'https://pulse-fit.example.com',
    now() - interval '5 days',
    51, 9, 440, 110.5
  ) on conflict (id) do nothing;

  insert into creation_tools (creation_id, tool_id, role, position)
  values
    ('c0000000-0000-4000-a000-000000000004', 7, 'primary', 0),    -- Lovable
    ('c0000000-0000-4000-a000-000000000004', 5, 'supporting', 1)  -- Cursor
  on conflict do nothing;

  -- -------------------------------------------------------------------
  -- 5. Prompt Engineering Workflow for Technical Docs
  -- -------------------------------------------------------------------
  insert into creations (
    id, creator_id, slug, title, summary, description, category_id,
    status, published_at, like_count, comment_count, view_count, trending_score
  ) values (
    'c0000000-0000-4000-a000-000000000005',
    v_creator_1,
    'api-docs-generator-prompt-system',
    'Production API Spec to Markdown Pipeline',
    'A chain-of-thought prompt system that transforms raw OpenAPI 3.1 JSON into interactive dev documentation.',
    'Tested across ChatGPT-4o and Claude 3.5 Sonnet to ensure zero code halluncinations and accurate TypeScript type signatures.',
    10, -- Workflows
    'published',
    now() - interval '6 hours',
    12, 2, 95, 45.1
  ) on conflict (id) do nothing;

  insert into creation_tools (creation_id, tool_id, role, position)
  values
    ('c0000000-0000-4000-a000-000000000005', 3, 'primary', 0),    -- ChatGPT
    ('c0000000-0000-4000-a000-000000000005', 1, 'supporting', 1)  -- Claude
  on conflict do nothing;

  -- -------------------------------------------------------------------
  -- 6. Interactive 3D Spatial Audio Visualizer
  -- -------------------------------------------------------------------
  insert into creations (
    id, creator_id, slug, title, summary, description, category_id,
    status, live_url, published_at, like_count, comment_count, view_count, trending_score
  ) values (
    'c0000000-0000-4000-a000-000000000006',
    v_creator_2,
    'vortex-spatial-audio-visualizer',
    'Vortex: Three.js Realtime Audio Mesh',
    'WebAudio API visualizer generating reactive geometric distortions according to sound frequency bands.',
    'Built with v0 for the control bar and custom Three.js shaders generated with Claude.',
    12, -- 3D
    'published',
    'https://vortex-audio.example.com',
    now() - interval '4 days',
    67, 11, 510, 130.8
  ) on conflict (id) do nothing;

  insert into creation_tools (creation_id, tool_id, role, position)
  values
    ('c0000000-0000-4000-a000-000000000006', 8, 'primary', 0),    -- v0
    ('c0000000-0000-4000-a000-000000000006', 1, 'supporting', 1)  -- Claude
  on conflict do nothing;

end $$;
