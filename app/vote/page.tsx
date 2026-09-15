 'use client';

import { useEffect, useState } from 'react';
import type { Candidate, Voter } from '@/lib/types';

export default function VotePage() {
  const [credential, setCredential] = useState('');
  const [voter, setVoter] = useState<Voter | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => { fetch('/api/public-data').then(r => r.json()).then(j => setCandidates(j.candidates || [])); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setSuccess(false);
    const res = await fetch('/api/login-voter', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ credential }) });
    const json = await res.json();
    if (!res.ok) return setMsg(json.error || 'Login gagal.');
    setVoter(json.voter);
    if (json.voter.has_voted) setMsg('Anda sudah menggunakan hak suara.');
  }

  async function submitVote() {
    setMsg(''); setSuccess(false);
    const res = await fetch('/api/vote', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ credential, candidate_id: candidateId }) });
    const json = await res.json();
    setMsg(json.message || json.error || 'Selesai.');
    setSuccess(Boolean(json.ok));
    if (json.ok) setVoter(v => v ? { ...v, has_voted: true, voted_at: new Date().toISOString() } : v);
  }

  return <div className="form-page"><div className="card form-card">
    <h1>Bilik Suara OSIS SMADA 2026</h1><p>Masukkan NISN/NIP untuk menggunakan hak suara.</p>
    {!voter && <form onSubmit={login}><label>NISN / NIP</label><input value={credential} onChange={e=>setCredential(e.target.value)} placeholder="Contoh: 0111614675"/><button className="btn" style={{marginTop:14}}>Masuk Bilik Suara</button></form>}
    {voter && <div>
      <div className="notice success"><b>{voter.full_name}</b><br/>{voter.level} - {voter.class_name || voter.role}</div>
      {!voter.has_voted && <><label>Pilih Pasangan Calon</label><div className="grid candidates">{candidates.map(c => <label className="card" key={c.id} style={{cursor:'pointer', border: candidateId===c.id ? '3px solid var(--red)' : undefined}}><input type="radio" name="candidate" value={c.id} onChange={()=>setCandidateId(c.id)} style={{width:'auto', marginRight:8}}/> Paslon {c.pair_number}<h2>{c.chair_name}</h2><p>Wakil: {c.vice_name}</p></label>)}</div><button className="btn" onClick={submitVote} disabled={!candidateId} style={{marginTop:14}}>Kirim Suara</button></>}
      {voter.has_voted && <a href="/" className="vote-btn">Kembali ke Hasil Polling</a>}
    </div>}
    {msg && <div className={`notice ${success ? 'success' : ''}`}>{msg}</div>}
  </div></div>;
}
