-- Supabase schema untuk E-Voting OSIS SMADA 2026
-- Jalankan file ini di Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  pair_number int not null unique check (pair_number in (1, 2)),
  chair_name text not null,
  vice_name text not null,
  pair_photo_url text,
  chair_photo_url text,
  vice_photo_url text,
  vision text default '',
  mission jsonb not null default '[]'::jsonb,
  slogan text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.candidates
  add column if not exists pair_photo_url text,
  add column if not exists vision text default '',
  add column if not exists mission jsonb not null default '[]'::jsonb;

create table if not exists public.voters (
  id uuid primary key default gen_random_uuid(),
  credential text not null unique,
  role text not null,
  level text not null,
  class_name text,
  full_name text not null,
  gender text,
  has_voted boolean not null default false,
  voted_candidate_id uuid references public.candidates(id) on delete set null,
  voted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null unique references public.voters(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete restrict,
  valid boolean not null default true,
  created_at timestamptz not null default now(),
  invalidated_at timestamptz,
  admin_note text
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_candidates_updated_at on public.candidates;
create trigger set_candidates_updated_at before update on public.candidates
for each row execute function public.set_updated_at();

drop trigger if exists set_voters_updated_at on public.voters;
create trigger set_voters_updated_at before update on public.voters
for each row execute function public.set_updated_at();

-- Fungsi voting atomic agar 1 pemilih hanya bisa memilih 1 kali.
create or replace function public.cast_vote(p_credential text, p_candidate_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter public.voters%rowtype;
  v_candidate public.candidates%rowtype;
begin
  select * into v_voter
  from public.voters
  where credential = trim(p_credential)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'NISN/NIP tidak terdaftar.');
  end if;

  if v_voter.has_voted then
    return jsonb_build_object('ok', false, 'message', 'Anda sudah menggunakan hak suara.');
  end if;

  select * into v_candidate
  from public.candidates
  where id = p_candidate_id and is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Kandidat tidak valid.');
  end if;

  insert into public.votes(voter_id, candidate_id, valid)
  values(v_voter.id, p_candidate_id, true);

  update public.voters
  set has_voted = true, voted_candidate_id = p_candidate_id, voted_at = now()
  where id = v_voter.id;

  return jsonb_build_object('ok', true, 'message', 'Suara berhasil direkam. Terima kasih sudah memilih.');
end;
$$;

revoke all on function public.cast_vote(text, uuid) from public, anon, authenticated;

drop view if exists public.vote_results;
create view public.vote_results with (security_invoker = true) as
select
  c.id,
  c.pair_number,
  c.chair_name,
  c.vice_name,
  c.pair_photo_url,
  c.chair_photo_url,
  c.vice_photo_url,
  c.vision,
  c.mission,
  c.slogan,
  count(v.id) filter (where v.valid = true) as votes
from public.candidates c
left join public.votes v on v.candidate_id = c.id
where c.is_active = true
group by c.id, c.pair_number, c.chair_name, c.vice_name, c.pair_photo_url, c.chair_photo_url, c.vice_photo_url, c.vision, c.mission, c.slogan;

drop view if exists public.turnout_by_level;
create view public.turnout_by_level with (security_invoker = true) as
select
  level,
  count(*) as total,
  count(*) filter (where has_voted = true) as voted,
  round((count(*) filter (where has_voted = true)::numeric / nullif(count(*), 0)) * 100, 1) as percentage
from public.voters
group by level
order by case level
  when 'Kelas 10' then 1
  when 'Kelas 11' then 2
  when 'Kelas 12' then 3
  else 4
end;

alter table public.candidates enable row level security;
alter table public.voters enable row level security;
alter table public.votes enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "public read candidates" on public.candidates;
create policy "public read candidates" on public.candidates for select to anon using (is_active = true);

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select to anon using (key in ('running_text','theme'));

grant usage on schema public to anon, authenticated;
grant select on public.candidates to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select on public.vote_results to anon, authenticated;
grant select on public.turnout_by_level to anon, authenticated;

-- Aktifkan Realtime bila tabel belum masuk publication. Jika muncul error duplicate, abaikan atau hapus baris terkait.
do $$
begin
  begin alter publication supabase_realtime add table public.votes; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.voters; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.candidates; exception when duplicate_object then null; end;
end $$;

insert into public.candidates (pair_number, chair_name, vice_name, pair_photo_url, chair_photo_url, vice_photo_url, vision, mission, slogan) values
  (1, 'DZAKY KALWA YUDHA', 'SERHAN ZEKI ADHYATNA', '/paslon-1.svg', '/paslon-1.svg', null,
   $$Menjadikan OSIS sebagai organisasi yang aktif, berintegritas, dan berwibawa serta siap merangkul dan menampung aspirasi siswa dalam mengembangkan potensi dan prestasi melalui inovasi dan teknologi dalam dunia pendidikan.$$, 
   '["Membangun karakter siswa SMAN 2 Sangatta Utara yang beriman dan bertaqwa terhadap tuhan yang maha esa","Membangun sistem aspirasi para siswa yang terbuka dan responsif","Menanamkan nilai kejujuran, kedisiplinan, dan tanggung jawab dalam lingkungan SMAN 2 Sangatta Utara","Memanfaatkan perkembangan teknologi sebagai sarana untuk mendukung potensi dan prestasi siswa","Menjalankan setiap program kerja dengan optimal yang telah dirancang oleh pengurus OSIS"]'::jsonb,
   ''),
  (2, 'FAJAR NATANAEL MANULLANG', 'SAFWANA AISYAH ADALIA RISQIN', '/paslon-2.svg', '/paslon-2.svg', null,
   $$Menjadikan OSIS sebagai organisasi yang berwibawa, berintegritas, inovatif, dan lebih dekat dengan siswa dalam menjadi wadah aspirasi serta pengembangan potensi untuk mewujudkan generasi yang kreatif, berkualitas, berprestasi, dan berdaya saing tinggi di SMAN 2 Sangatta Utara.$$, 
   '["Membetuk murid SMAN 2 Sangatta utara untuk senantiasa menjunjung tinggi keimanan dan ketakwaan kepada Tuhan Yang Maha Esa.","Membuka ruang bagi murid SMAN 2 Sangatta Utara untuk menyampaikan aspirasi.","Membangun karakter murid SMAN 2 Sangatta utara yang kreatif, berwibawa, dan berakhlak mulia.","Memanfaatkan kemajuan teknologi dan membangun kolaborasi untuk mendukung pengembangan bakat dan minat murid.","Menjalankan seluruh program kerja OSIS secara maksimal, terarah, dan bertanggung jawab sesuai dengan rancangan yang telah disusun oleh pengurus OSIS."]'::jsonb,
   '')
on conflict (pair_number) do update set
  chair_name=excluded.chair_name,
  vice_name=excluded.vice_name,
  pair_photo_url=excluded.pair_photo_url,
  chair_photo_url=excluded.chair_photo_url,
  vice_photo_url=excluded.vice_photo_url,
  vision=excluded.vision,
  mission=excluded.mission,
  slogan=excluded.slogan,
  updated_at=now();

insert into public.site_settings (key, value) values
  ('running_text', '"Selamat datang di Pemilihan Ketua dan Wakil Ketua OSIS SMADA 2026. Gunakan hak suara dengan jujur, tertib, dan bertanggung jawab."'::jsonb),
  ('theme', '{"primary":"#2563eb","accent":"#334155","muted":"#64748b"}'::jsonb)
on conflict (key) do update set value=excluded.value, updated_at=now();
