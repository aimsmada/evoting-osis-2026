 'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Candidate, Voter } from '@/lib/types';

type AdminData = { voters: Voter[]; candidates: Candidate[]; votes: any[]; settings: any[] };

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState<AdminData>({ voters: [], candidates: [], votes: [], settings: [] });
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState('');
  const [theme, setTheme] = useState({ primary: '#b91c1c', accent: '#111827' });

  const authHeaders = { 'Content-Type':'application/json', 'x-admin-password': password };
  async function load() {
    const res = await fetch('/api/admin-data', { headers: { 'x-admin-password': password }, cache:'no-store' });
    const json = await res.json();
    if (!res.ok) { setMsg(json.error || 'Password admin salah.'); return; }
    setData(json); setUnlocked(true); setRunning(json.settings?.find((s:any)=>s.key==='running_text')?.value || ''); setTheme(json.settings?.find((s:any)=>s.key==='theme')?.value || { primary: '#b91c1c', accent: '#111827' });
  }

  const voters = useMemo(() => data.voters.filter(v => `${v.full_name} ${v.credential} ${v.level} ${v.class_name}`.toLowerCase().includes(query.toLowerCase())).slice(0, 120), [data.voters, query]);

  async function resetVoter(credential: string, invalidate_only = false) {
    if (!confirm(invalidate_only ? 'Batalkan suara peserta ini?' : 'Reset agar peserta ini bisa memilih ulang?')) return;
    const res = await fetch('/api/admin-reset-voter', { method:'POST', headers: authHeaders, body: JSON.stringify({ credential, invalidate_only, note:'Diubah dari admin backend' }) });
    const json = await res.json(); setMsg(json.ok ? 'Berhasil diperbarui.' : json.error); load();
  }

  async function saveSettings() {
    const res = await fetch('/api/admin-settings', { method:'POST', headers: authHeaders, body: JSON.stringify({ running_text: running, theme }) });
    const json = await res.json(); setMsg(res.ok ? 'Running text berhasil disimpan.' : json.error); load();
  }

  async function saveCandidate(c: Candidate) {
    const res = await fetch('/api/admin-candidates', { method:'POST', headers: authHeaders, body: JSON.stringify(c) });
    const json = await res.json(); setMsg(res.ok ? 'Kandidat berhasil disimpan.' : json.error); load();
  }

  async function addVoter(formData: FormData) {
    const row = Object.fromEntries(formData.entries());
    const res = await fetch('/api/admin-voters', { method:'POST', headers: authHeaders, body: JSON.stringify(row) });
    const json = await res.json(); setMsg(res.ok ? 'Pemilih berhasil ditambah/diedit.' : json.error); load();
  }

  if (!unlocked) return <div className="form-page"><div className="card form-card"><h1>Backend Admin E-Voting</h1><p>Link backend: <b>/admin-smada-2026</b></p><label>Password Admin</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /><button className="btn" onClick={load} style={{marginTop:14}}>Masuk Admin</button>{msg && <div className="notice">{msg}</div>}</div></div>;

  return <div className="admin-layout"><aside className="sidebar"><h2>Admin SMADA</h2><p>E-Voting OSIS 2026</p><a href="/" className="btn ghost" style={{display:'inline-block'}}>Lihat Frontend</a></aside><main className="admin-main">
    <h1>Backend Admin</h1>{msg && <div className="notice success">{msg}</div>}
    <section className="card"><h2>Ubah Running Text & Tampilan Dashboard</h2><label>Running Text</label><textarea rows={3} value={running} onChange={e=>setRunning(e.target.value)} /><div className="grid" style={{gridTemplateColumns:'repeat(2, 1fr)'}}><div><label>Warna Utama</label><input type="color" value={theme.primary} onChange={e=>setTheme({...theme, primary:e.target.value})}/></div><div><label>Warna Aksen</label><input type="color" value={theme.accent} onChange={e=>setTheme({...theme, accent:e.target.value})}/></div></div><button className="btn" onClick={saveSettings} style={{marginTop:12}}>Simpan Running Text & Tampilan</button></section>
    <section className="grid candidates" style={{marginTop:18}}>{data.candidates.map((c, idx) => <CandidateEditor key={c.id} candidate={c} onSave={saveCandidate}/>)}</section>
    <section className="card" style={{marginTop:18}}><h2>Tambah / Edit Pemilih</h2><form action={addVoter} className="grid" style={{gridTemplateColumns:'repeat(3, 1fr)'}}><input name="credential" placeholder="NISN/NIP"/><input name="full_name" placeholder="Nama lengkap"/><select name="level"><option>Kelas 10</option><option>Kelas 11</option><option>Kelas 12</option><option>Guru dan Tenaga Kependidikan</option></select><input name="class_name" placeholder="Kelas/Jabatan"/><select name="role"><option>Murid</option><option>Guru</option><option>Tenaga Kependidikan</option></select><select name="gender"><option>L</option><option>P</option></select><button className="btn">Simpan Pemilih</button></form></section>
    <section className="card" style={{marginTop:18}}><div className="title-row"><h2>Data Pemilih</h2><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama/NISN/kelas" style={{maxWidth:360}}/></div><div className="table-wrap"><table><thead><tr><th>NISN/NIP</th><th>Nama</th><th>Tingkat</th><th>Kelas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{voters.map(v => <tr key={v.id}><td>{v.credential}</td><td>{v.full_name}</td><td>{v.level}</td><td>{v.class_name}</td><td>{v.has_voted ? 'Sudah memilih' : 'Belum'}</td><td className="actions"><button className="btn ghost" onClick={()=>resetVoter(v.credential,false)}>Reset Pilihan</button><button className="btn secondary" onClick={()=>resetVoter(v.credential,true)}>Batalkan Suara</button></td></tr>)}</tbody></table></div></section>
  </main></div>;
}

function CandidateEditor({ candidate, onSave }: { candidate: Candidate; onSave: (c: Candidate) => void }) {
  const [c, setC] = useState(candidate);
  useEffect(()=>setC(candidate), [candidate]);
  return <div className="card"><h2>Paslon {c.pair_number}</h2><label>Nama Ketua</label><input value={c.chair_name} onChange={e=>setC({...c, chair_name:e.target.value})}/><label>Nama Wakil</label><input value={c.vice_name} onChange={e=>setC({...c, vice_name:e.target.value})}/><label>URL Foto Ketua</label><input value={c.chair_photo_url || ''} onChange={e=>setC({...c, chair_photo_url:e.target.value})}/><label>URL Foto Wakil</label><input value={c.vice_photo_url || ''} onChange={e=>setC({...c, vice_photo_url:e.target.value})}/><label>Slogan</label><textarea value={c.slogan || ''} onChange={e=>setC({...c, slogan:e.target.value})}/><button className="btn" onClick={()=>onSave(c)} style={{marginTop:12}}>Simpan Kandidat</button></div>;
}
