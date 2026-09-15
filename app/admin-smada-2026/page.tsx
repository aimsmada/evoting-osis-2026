'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, ArrowUpDown, RefreshCw } from 'lucide-react';
import type { Candidate, Voter } from '@/lib/types';

type VoteRow = {
  id: string;
  voter_id: string;
  candidate_id: string;
  valid: boolean;
  created_at: string;
  invalidated_at?: string | null;
  candidates?: { pair_number: number; chair_name: string; vice_name: string } | null;
};

type AdminData = { voters: Voter[]; candidates: Candidate[]; votes: VoteRow[]; settings: any[] };
type SortKey = 'credential' | 'full_name' | 'role' | 'level' | 'class_name' | 'status' | 'candidate' | 'voted_at';

type VoterRow = Voter & { status_label: string; candidate_label: string; voted_time_label: string; sort_voted_at: string };

function missionToLines(mission: Candidate['mission']) {
  if (Array.isArray(mission)) return mission.join('\n');
  if (typeof mission === 'string') {
    try {
      const parsed = JSON.parse(mission);
      if (Array.isArray(parsed)) return parsed.map(String).join('\n');
    } catch {}
    return mission;
  }
  return '';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Makassar',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function csvEscape(value: unknown) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<AdminData>({ voters: [], candidates: [], votes: [], settings: [] });
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState('');
  const [theme, setTheme] = useState({ primary: '#2563eb', accent: '#334155', muted: '#64748b' });
  const [sortKey, setSortKey] = useState<SortKey>('level');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const authHeaders = { 'Content-Type': 'application/json', 'x-admin-password': password };

  async function load() {
    const res = await fetch('/api/admin-data', { headers: { 'x-admin-password': password }, cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error || 'Password admin salah.');
      return;
    }
    setData(json);
    setUnlocked(true);
    setRunning(json.settings?.find((s: any) => s.key === 'running_text')?.value || '');
    setTheme(json.settings?.find((s: any) => s.key === 'theme')?.value || { primary: '#2563eb', accent: '#334155', muted: '#64748b' });
  }

  const validVotes = useMemo(() => data.votes.filter((vote) => vote.valid), [data.votes]);
  const totalValidVotes = validVotes.length;

  const resultRows = useMemo(() => data.candidates.map((candidate) => {
    const voteCount = validVotes.filter((vote) => vote.candidate_id === candidate.id).length;
    const percentage = totalValidVotes ? Math.round((voteCount / totalValidVotes) * 1000) / 10 : 0;
    return { ...candidate, voteCount, percentage };
  }), [data.candidates, validVotes, totalValidVotes]);

  const allVoterRows = useMemo<VoterRow[]>(() => data.voters.map((voter) => {
    const validVote = data.votes.find((vote) => vote.voter_id === voter.id && vote.valid);
    const anyVote = data.votes.find((vote) => vote.voter_id === voter.id);
    const candidate = validVote?.candidates || data.candidates.find((c) => c.id === voter.voted_candidate_id);
    const candidateLabel = validVote && candidate
      ? `Paslon ${candidate.pair_number} - ${candidate.chair_name} / ${candidate.vice_name}`
      : voter.has_voted && anyVote
        ? 'Suara dibatalkan/tidak valid'
        : '-';
    const votedAt = validVote?.created_at || voter.voted_at;
    return {
      ...voter,
      status_label: voter.has_voted ? 'Sudah memilih' : 'Belum memilih',
      candidate_label: candidateLabel,
      voted_time_label: formatDateTime(votedAt),
      sort_voted_at: votedAt || '',
    };
  }), [data.voters, data.votes, data.candidates]);

  const voterRows = useMemo<VoterRow[]>(() => {
    const filtered = allVoterRows.filter((voter) => `${voter.full_name} ${voter.credential} ${voter.role} ${voter.level} ${voter.class_name} ${voter.status_label} ${voter.candidate_label}`.toLowerCase().includes(query.toLowerCase()));

    return [...filtered].sort((a, b) => {
      const av = sortKey === 'status' ? a.status_label : sortKey === 'candidate' ? a.candidate_label : sortKey === 'voted_at' ? a.sort_voted_at : String(a[sortKey] || '');
      const bv = sortKey === 'status' ? b.status_label : sortKey === 'candidate' ? b.candidate_label : sortKey === 'voted_at' ? b.sort_voted_at : String(b[sortKey] || '');
      const compare = String(av).localeCompare(String(bv), 'id-ID', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? compare : -compare;
    });
  }, [allVoterRows, query, sortKey, sortDir]);

  function setSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function resetVoter(credential: string, invalidate_only = false) {
    if (!confirm(invalidate_only ? 'Batalkan suara peserta ini?' : 'Reset agar peserta ini bisa memilih ulang?')) return;
    const res = await fetch('/api/admin-reset-voter', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ credential, invalidate_only, note: 'Diubah dari admin backend' }),
    });
    const json = await res.json();
    setMsg(json.ok ? 'Berhasil diperbarui.' : json.error);
    load();
  }

  async function saveSettings() {
    const res = await fetch('/api/admin-settings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ running_text: running, theme }),
    });
    const json = await res.json();
    setMsg(res.ok ? 'Running text dan warna tampilan berhasil disimpan.' : json.error);
    load();
  }

  async function saveCandidate(candidate: Candidate) {
    const res = await fetch('/api/admin-candidates', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(candidate),
    });
    const json = await res.json();
    setMsg(res.ok ? 'Kandidat berhasil disimpan.' : json.error);
    load();
  }

  async function addVoter(formData: FormData) {
    const row = Object.fromEntries(formData.entries());
    const res = await fetch('/api/admin-voters', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(row),
    });
    const json = await res.json();
    setMsg(res.ok ? 'Pemilih berhasil ditambah/diedit.' : json.error);
    load();
  }

  function downloadResults() {
    const rows = allVoterRows;
    const header = ['NISN/NIP', 'Nama Pemilih', 'Peran', 'Tingkat', 'Kelas/Jabatan', 'Gender', 'Status', 'Kandidat Paslon yang Dipilih', 'Timestamp Waktu Pemilihan'];
    const body = rows.map((row) => [row.credential, row.full_name, row.role, row.level, row.class_name || '', row.gender || '', row.status_label, row.candidate_label, row.voted_time_label]);
    const csv = '\uFEFF' + [header, ...body].map((line) => line.map(csvEscape).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hasil-evoting-osis-smada-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!unlocked) {
    return (
      <div className="form-page">
        <div className="card form-card">
          <h1>Backend Admin E-Voting</h1>
          <p>Link backend: <b>/admin-smada-2026</b></p>
          <label>Password Admin</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn" onClick={load} style={{ marginTop: 14 }}>Masuk Admin</button>
          {msg && <div className="notice">{msg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>Admin SMADA</h2>
        <p>E-Voting OSIS 2026</p>
        <a href="/" className="btn ghost" style={{ display: 'inline-block' }}>Lihat Frontend</a>
        <button className="btn secondary" onClick={load} style={{ marginTop: 12, width: '100%' }}><RefreshCw size={16} /> Refresh Data</button>
      </aside>
      <main className="admin-main">
        <h1>Backend Admin</h1>
        {msg && <div className="notice success">{msg}</div>}

        <section className="card admin-results">
          <div className="title-row">
            <div>
              <p className="eyebrow">Backend Only</p>
              <h2>Persentase Hasil Pemilihan</h2>
            </div>
            <button className="btn" onClick={downloadResults}><Download size={16} /> Download Hasil Semua Peserta</button>
          </div>
          <div className="grid result-grid">
            {resultRows.map((row) => (
              <div className="result-card" key={row.id}>
                <div className="admin-pair-photo"><img src={row.pair_photo_url || row.chair_photo_url || '/candidate-placeholder-1.svg'} alt={`Foto Paslon ${row.pair_number}`} /></div>
                <span>Paslon {row.pair_number}</span>
                <b>{row.percentage}%</b>
                <small>{row.voteCount} suara dari {totalValidVotes} suara valid</small>
                <div className="progress"><span style={{ width: `${row.percentage}%` }} /></div>
                <strong>{row.chair_name}</strong>
                <small>Wakil: {row.vice_name}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2>Ubah Running Text & Tampilan Dashboard</h2>
          <label>Running Text</label>
          <textarea rows={3} value={running} onChange={(e) => setRunning(e.target.value)} />
          <div className="grid settings-grid">
            <div><label>Warna Utama</label><input type="color" value={theme.primary} onChange={(e) => setTheme({ ...theme, primary: e.target.value })} /></div>
            <div><label>Warna Aksen</label><input type="color" value={theme.accent} onChange={(e) => setTheme({ ...theme, accent: e.target.value })} /></div>
            <div><label>Warna Abu-Abu</label><input type="color" value={theme.muted} onChange={(e) => setTheme({ ...theme, muted: e.target.value })} /></div>
          </div>
          <button className="btn" onClick={saveSettings} style={{ marginTop: 12 }}>Simpan Running Text & Tampilan</button>
        </section>

        <section className="grid candidates" style={{ marginTop: 18 }}>
          {data.candidates.map((candidate) => <CandidateEditor key={candidate.id} candidate={candidate} onSave={saveCandidate} />)}
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2>Tambah / Edit Pemilih</h2>
          <form action={addVoter} className="grid add-voter-grid">
            <input name="credential" placeholder="NISN/NIP" />
            <input name="full_name" placeholder="Nama lengkap" />
            <select name="level"><option>Kelas 10</option><option>Kelas 11</option><option>Kelas 12</option><option>Guru dan Tenaga Kependidikan</option></select>
            <input name="class_name" placeholder="Kelas/Jabatan" />
            <select name="role"><option>Murid</option><option>Guru</option><option>Tenaga Kependidikan</option></select>
            <select name="gender"><option>L</option><option>P</option></select>
            <button className="btn">Simpan Pemilih</button>
          </form>
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <div className="title-row">
            <div>
              <h2>Data Pemilih</h2>
              <p className="muted-text">Klik judul kolom untuk mengurutkan data. Menampilkan {voterRows.length} dari {data.voters.length} pemilih.</p>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama/NISN/kelas/paslon" style={{ maxWidth: 360 }} />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="NISN/NIP" active={sortKey === 'credential'} dir={sortDir} onClick={() => setSort('credential')} />
                  <SortTh label="Nama" active={sortKey === 'full_name'} dir={sortDir} onClick={() => setSort('full_name')} />
                  <SortTh label="Peran" active={sortKey === 'role'} dir={sortDir} onClick={() => setSort('role')} />
                  <SortTh label="Tingkat" active={sortKey === 'level'} dir={sortDir} onClick={() => setSort('level')} />
                  <SortTh label="Kelas/Jabatan" active={sortKey === 'class_name'} dir={sortDir} onClick={() => setSort('class_name')} />
                  <SortTh label="Status" active={sortKey === 'status'} dir={sortDir} onClick={() => setSort('status')} />
                  <SortTh label="Kandidat Paslon yang Dipilih" active={sortKey === 'candidate'} dir={sortDir} onClick={() => setSort('candidate')} />
                  <SortTh label="Timestamp Waktu Pemilihan" active={sortKey === 'voted_at'} dir={sortDir} onClick={() => setSort('voted_at')} />
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {voterRows.map((voter) => (
                  <tr key={voter.id}>
                    <td>{voter.credential}</td>
                    <td>{voter.full_name}</td>
                    <td>{voter.role}</td>
                    <td>{voter.level}</td>
                    <td>{voter.class_name}</td>
                    <td>{voter.status_label}</td>
                    <td>{voter.candidate_label}</td>
                    <td>{voter.voted_time_label}</td>
                    <td className="actions">
                      <button className="btn ghost" onClick={() => resetVoter(voter.credential, false)}>Reset Pilihan</button>
                      <button className="btn secondary" onClick={() => resetVoter(voter.credential, true)}>Batalkan Suara</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function SortTh({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <th>
      <button className={`sort-btn ${active ? 'active' : ''}`} onClick={onClick} type="button">
        {label} <ArrowUpDown size={14} /> {active ? (dir === 'asc' ? 'A-Z' : 'Z-A') : ''}
      </button>
    </th>
  );
}

function CandidateEditor({ candidate, onSave }: { candidate: Candidate; onSave: (candidate: Candidate) => void }) {
  const [c, setC] = useState(candidate);
  useEffect(() => setC(candidate), [candidate]);

  return (
    <div className="card candidate-editor">
      <h2>Paslon {c.pair_number}</h2>
      <div className="admin-pair-photo editor-preview"><img src={c.pair_photo_url || c.chair_photo_url || '/candidate-placeholder-1.svg'} alt={`Preview Paslon ${c.pair_number}`} /></div>
      <label>URL Foto Paslon</label>
      <input value={c.pair_photo_url || c.chair_photo_url || ''} onChange={(e) => setC({ ...c, pair_photo_url: e.target.value, chair_photo_url: e.target.value })} />
      <label>Nama Calon Ketua</label>
      <input value={c.chair_name} onChange={(e) => setC({ ...c, chair_name: e.target.value })} />
      <label>Nama Calon Wakil Ketua</label>
      <input value={c.vice_name} onChange={(e) => setC({ ...c, vice_name: e.target.value })} />
      <label>Visi</label>
      <textarea rows={4} value={c.vision || ''} onChange={(e) => setC({ ...c, vision: e.target.value })} />
      <label>Misi — satu nomor per baris</label>
      <textarea rows={7} value={missionToLines(c.mission)} onChange={(e) => setC({ ...c, mission: e.target.value })} />
      <button className="btn" onClick={() => onSave(c)} style={{ marginTop: 12 }}>Simpan Kandidat</button>
    </div>
  );
}
