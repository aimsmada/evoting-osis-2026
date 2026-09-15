'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Vote } from 'lucide-react';
import type { Candidate, Voter } from '@/lib/types';

function missionList(mission: Candidate['mission']) {
  if (Array.isArray(mission)) return mission;
  if (typeof mission === 'string') {
    try {
      const parsed = JSON.parse(mission);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return mission.split('\n').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export default function VotePage() {
  const [credential, setCredential] = useState('');
  const [voter, setVoter] = useState<Voter | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/public-data', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setCandidates(j.candidates || []));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setSuccess(false);
    setLoading(true);
    const res = await fetch('/api/login-voter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) return setMsg(json.error || 'Login gagal.');
    setVoter(json.voter);
    if (json.voter.has_voted) setMsg('Anda sudah menggunakan hak suara.');
  }

  function resetIdentity() {
    setVoter(null);
    setCandidateId('');
    setMsg('');
    setSuccess(false);
  }

  async function submitVote() {
    if (!candidateId) return setMsg('Pilih salah satu pasangan calon terlebih dahulu.');
    setMsg('');
    setSuccess(false);
    setLoading(true);
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, candidate_id: candidateId }),
    });
    const json = await res.json();
    setLoading(false);
    setMsg(json.message || json.error || 'Selesai.');
    setSuccess(Boolean(json.ok));
    if (json.ok) setVoter((v) => (v ? { ...v, has_voted: true, voted_at: new Date().toISOString() } : v));
  }

  return (
    <div className="form-page voting-bg">
      <div className="card form-card voting-card">
        <a className="back-link" href="/"><ArrowLeft size={16} /> Kembali ke Beranda</a>
        <h1>Bilik Suara OSIS SMADA 2026</h1>
        <p>Masukkan NISN/NIP untuk membuka data pemilih dan menggunakan hak suara.</p>

        {!voter && (
          <form onSubmit={login}>
            <label>NISN / NIP</label>
            <input value={credential} onChange={(e) => setCredential(e.target.value)} placeholder="Masukkan NISN atau NIP" autoFocus />
            <button className="btn" style={{ marginTop: 14 }} disabled={loading}>{loading ? 'Memeriksa...' : 'Masuk Bilik Suara'}</button>
          </form>
        )}

        {voter && (
          <div className="identity-step">
            <div className="identity-card">
              <CheckCircle2 size={28} />
              <div>
                <span>Identitas Pemilih</span>
                <b>{voter.full_name}</b>
                <small>{voter.credential} • {voter.level} {voter.class_name ? `• ${voter.class_name}` : `• ${voter.role}`}</small>
              </div>
            </div>
            <button className="btn ghost" onClick={resetIdentity} type="button">Ini bukan identitas saya</button>

            {!voter.has_voted && (
              <>
                <label style={{ marginTop: 22 }}>Pilih Pasangan Calon</label>
                <div className="grid vote-candidate-list">
                  {candidates.map((candidate) => {
                    const missions = missionList(candidate.mission);
                    return (
                      <label className={`card vote-option ${candidateId === candidate.id ? 'selected' : ''}`} key={candidate.id}>
                        <input type="radio" name="candidate" value={candidate.id} onChange={() => setCandidateId(candidate.id)} />
                        <div className="vote-option-photo">
                          <img src={candidate.pair_photo_url || candidate.chair_photo_url || '/candidate-placeholder-1.svg'} alt={`Foto Paslon ${candidate.pair_number}`} />
                        </div>
                        <div>
                          <span className="pair-ribbon inline">PASLON {candidate.pair_number}</span>
                          <h2>{candidate.chair_name}</h2>
                          <p className="vice-name">Wakil: {candidate.vice_name}</p>
                          <h3>Visi</h3>
                          <p>{candidate.vision || candidate.slogan}</p>
                          {missions.length > 0 && <small>{missions.length} misi dapat dilihat pada halaman utama.</small>}
                        </div>
                      </label>
                    );
                  })}
                </div>
                <button className="vote-btn" onClick={submitVote} disabled={!candidateId || loading} type="button">
                  <Vote size={20} /> {loading ? 'Mengirim...' : 'Kirim Suara'}
                </button>
              </>
            )}

            {voter.has_voted && <a href="/" className="vote-btn">Kembali ke Beranda</a>}
          </div>
        )}

        {msg && <div className={`notice ${success ? 'success' : ''}`}>{msg}</div>}
      </div>
    </div>
  );
}
