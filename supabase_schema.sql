-- =============================================
-- QUINIELA MUNDIAL 2026 - Schema Supabase
-- Ejecuta esto en el SQL Editor de Supabase
-- =============================================

-- Profiles (extiende auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Equipos del mundial
create table public.teams (
  id serial primary key,
  name text not null,
  code text not null,       -- ESP, BRA, etc.
  group_name text not null, -- A, B, C...
  flag_emoji text,
  created_at timestamptz default now()
);

-- Partidos
create table public.matches (
  id serial primary key,
  home_team_id int references public.teams(id),
  away_team_id int references public.teams(id),
  match_date timestamptz not null,
  stage text not null,       -- 'group', 'round16', 'quarter', 'semi', 'final', '3rd'
  group_name text,           -- solo para fase de grupos
  home_score int,            -- null hasta que se juegue
  away_score int,
  status text default 'upcoming', -- upcoming, live, finished
  created_at timestamptz default now()
);

-- Preguntas especiales (apuestas previas al mundial)
create table public.special_questions (
  id serial primary key,
  question text not null,
  question_type text not null,   -- 'team', 'player', 'country', 'number'
  points int default 10,
  is_active boolean default true,
  correct_answer text,           -- admin lo rellena al terminar el mundial
  created_at timestamptz default now()
);

-- Apuestas especiales (previas al mundial)
create table public.special_bets (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  question_id int references public.special_questions(id),
  answer text not null,
  is_correct boolean,            -- null hasta que se evalúe
  points_earned int default 0,
  created_at timestamptz default now(),
  unique(user_id, question_id)
);

-- Apuestas de partidos (1X2 + resultado exacto)
create table public.match_bets (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  match_id int references public.matches(id),
  prediction text not null,      -- '1', 'X', '2'
  predicted_home int,            -- resultado exacto
  predicted_away int,
  points_earned int default 0,
  created_at timestamptz default now(),
  unique(user_id, match_id)
);

-- Apuestas de clasificación de grupos
create table public.group_bets (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  group_name text not null,      -- A, B, C...
  first_place_team_id int references public.teams(id),
  second_place_team_id int references public.teams(id),
  points_earned int default 0,
  created_at timestamptz default now(),
  unique(user_id, group_name)
);

-- Vista de ranking
create view public.rankings as
select
  p.id,
  p.username,
  p.full_name,
  coalesce(sum(mb.points_earned), 0) +
  coalesce(sum(sb.points_earned), 0) +
  coalesce(sum(gb.points_earned), 0) as total_points,
  coalesce(sum(mb.points_earned), 0) as match_points,
  coalesce(sum(sb.points_earned), 0) as special_points,
  coalesce(sum(gb.points_earned), 0) as group_points,
  count(distinct mb.id) as total_match_bets,
  count(distinct sb.id) as total_special_bets
from public.profiles p
left join public.match_bets mb on mb.user_id = p.id
left join public.special_bets sb on sb.user_id = p.id
left join public.group_bets gb on gb.user_id = p.id
group by p.id, p.username, p.full_name
order by total_points desc;

-- =============================================
-- RLS (Row Level Security)
-- =============================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.special_questions enable row level security;
alter table public.special_bets enable row level security;
alter table public.match_bets enable row level security;
alter table public.group_bets enable row level security;

-- Profiles: ver todos, editar solo el tuyo
create policy "Profiles visibles para todos" on public.profiles for select using (true);
create policy "Editar propio perfil" on public.profiles for update using (auth.uid() = id);
create policy "Insertar propio perfil" on public.profiles for insert with check (auth.uid() = id);

-- Teams y matches: todos pueden ver
create policy "Teams visibles" on public.teams for select using (true);
create policy "Matches visibles" on public.matches for select using (true);
create policy "Admin gestiona teams" on public.teams for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "Admin gestiona matches" on public.matches for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Special questions: todos pueden ver
create policy "Preguntas visibles" on public.special_questions for select using (true);
create policy "Admin gestiona preguntas" on public.special_questions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Special bets: ver todas (para ranking), gestionar las tuyas
create policy "Ver apuestas especiales" on public.special_bets for select using (true);
create policy "Gestionar apuestas especiales propias" on public.special_bets
  for insert with check (auth.uid() = user_id);
create policy "Actualizar apuestas especiales propias" on public.special_bets
  for update using (auth.uid() = user_id);
create policy "Admin actualiza puntos especiales" on public.special_bets
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Match bets
create policy "Ver apuestas partidos" on public.match_bets for select using (true);
create policy "Gestionar apuestas propias" on public.match_bets
  for insert with check (auth.uid() = user_id);
create policy "Actualizar apuestas propias" on public.match_bets
  for update using (auth.uid() = user_id);
create policy "Admin actualiza puntos" on public.match_bets
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Group bets
create policy "Ver apuestas grupos" on public.group_bets for select using (true);
create policy "Gestionar grupos propios" on public.group_bets
  for insert with check (auth.uid() = user_id);
create policy "Actualizar grupos propios" on public.group_bets
  for update using (auth.uid() = user_id);

-- =============================================
-- Trigger: crear perfil al registrarse
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- Datos iniciales: preguntas especiales
-- =============================================
insert into public.special_questions (question, question_type, points) values
  ('¿Qué selección ganará el Mundial 2026?', 'team', 15),
  ('¿Qué selección llegará a la final pero no ganará?', 'team', 10),
  ('¿Quién será el mejor jugador del Mundial (Balón de Oro)?', 'player', 10),
  ('¿Quién será el máximo goleador del Mundial (Bota de Oro)?', 'player', 10),
  ('¿Cuántos goles se marcarán en total en el Mundial?', 'number', 8),
  ('¿Qué selección llegará a las semifinales como mayor sorpresa?', 'team', 8),
  ('¿Qué portero recibirá el Guante de Oro?', 'player', 8),
  ('¿Cuántos partidos acabarán en empate en la fase de grupos?', 'number', 6);

-- =============================================
-- Datos iniciales: equipos del Mundial 2026
-- =============================================
-- Grupo A
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Estados Unidos', 'USA', 'A', '🇺🇸'),
  ('México', 'MEX', 'A', '🇲🇽'),
  ('Canadá', 'CAN', 'A', '🇨🇦'),
  ('Honduras', 'HON', 'A', '🇭🇳');
-- Grupo B
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Argentina', 'ARG', 'B', '🇦🇷'),
  ('Chile', 'CHI', 'B', '🇨🇱'),
  ('Perú', 'PER', 'B', '🇵🇪'),
  ('Australia', 'AUS', 'B', '🇦🇺');
-- Grupo C
insert into public.teams (name, code, group_name, flag_emoji) values
  ('España', 'ESP', 'C', '🇪🇸'),
  ('Croacia', 'CRO', 'C', '🇭🇷'),
  ('Marruecos', 'MAR', 'C', '🇲🇦'),
  ('Bélgica', 'BEL', 'C', '🇧🇪');
-- Grupo D
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Francia', 'FRA', 'D', '🇫🇷'),
  ('Brasil', 'BRA', 'D', '🇧🇷'),
  ('Colombia', 'COL', 'D', '🇨🇴'),
  ('Senegal', 'SEN', 'D', '🇸🇳');
-- Grupo E
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Alemania', 'GER', 'E', '🇩🇪'),
  ('Portugal', 'POR', 'E', '🇵🇹'),
  ('Japón', 'JPN', 'E', '🇯🇵'),
  ('Ecuador', 'ECU', 'E', '🇪🇨');
-- Grupo F
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Inglaterra', 'ENG', 'F', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  ('Países Bajos', 'NED', 'F', '🇳🇱'),
  ('Uruguay', 'URU', 'F', '🇺🇾'),
  ('Arabia Saudí', 'KSA', 'F', '🇸🇦');
-- Grupo G
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Italia', 'ITA', 'G', '🇮🇹'),
  ('Turquía', 'TUR', 'G', '🇹🇷'),
  ('Costa Rica', 'CRC', 'G', '🇨🇷'),
  ('Nigeria', 'NGA', 'G', '🇳🇬');
-- Grupo H
insert into public.teams (name, code, group_name, flag_emoji) values
  ('Portugal', 'POR2', 'H', '🇵🇹'),
  ('Suiza', 'SUI', 'H', '🇨🇭'),
  ('Ghana', 'GHA', 'H', '🇬🇭'),
  ('Irán', 'IRN', 'H', '🇮🇷');

-- NOTA: Actualiza los equipos con los reales del sorteo del Mundial 2026
-- cuando se confirme el sorteo oficial.
