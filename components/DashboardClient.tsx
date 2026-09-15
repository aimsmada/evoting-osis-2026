'use client';

import { useEffect, useMemo, useState } from 'react';
import { Instagram, Vote, RefreshCw } from 'lucide-react';
import type { Candidate, Turnout } from '@/lib/types';

type PublicData = { candidates: Candidate[]; turnout: Turnout[]; settings: Record<string, any>; now: string };

const levelOrder = ['Kelas 10', 'Kelas 11', 'Kelas 12', 'Guru dan Tenaga Kependidikan'];

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

export default function DashboardClient() {
  const [data, setData] = useState<PublicData>({ candidates: [], turnout: [], settings: {}, now: '' });
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/public-data', { cache: 'no-store' });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  const turnoutMap = useMemo(() => Object.fromEntries((data.turnout || []).map((t) => [t.level, t])), [data.turnout]);
  const theme = data.settings?.theme || {};
  const cssVars = {
    ['--blue' as any]: theme.primary || '#2563eb',
    ['--slate' as any]: theme.accent || '#334155',
    ['--muted' as any]: theme.muted || '#64748b',
  };

  return (
    <div style={cssVars}>
      <header className="header clean-header">
        <p className="eyebrow">SMA Negeri 2 Sangatta Utara</p>
        <h1>PEMILIHAN KETUA DAN WAKIL KETUA OSIS SMADA 2026</h1>
        <div className="refresh-note"><RefreshCw size={16} /> Data diperbarui otomatis tiap 1 menit</div>
      </header>

      <main className="container">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Kandidat OSIS</p>
            <h2>Profil Pasangan Calon</h2>
          </div>
          <a className="mini-link" href="/vote"><Vote size={16} /> Masuk Bilik Suara</a>
        </section>

        <section className="grid public-candidates">
          {loading && <div className="card">Memuat data pasangan calon...</div>}
          {!loading && data.candidates.map((candidate) => {
            const missions = missionList(candidate.mission);
            return (
              <article className="card public-candidate-card" key={candidate.id}>
                <div className="candidate-photo-wide">
                  <img src={candidate.pair_photo_url || candidate.chair_photo_url || '/candidate-placeholder-1.svg'} alt={`Foto Paslon ${candidate.pair_number}`} />
                  <span className="pair-ribbon">PASLON {candidate.pair_number}</span>
                </div>
                <div className="candidate-content">
                  <div className="name-grid">
                    <div><small>Calon Ketua</small><strong>{candidate.chair_name}</strong></div>
                    <div><small>Calon Wakil Ketua</small><strong>{candidate.vice_name}</strong></div>
                  </div>
                  <h3>Visi</h3>
                  <p className="vision-text">{candidate.vision || candidate.slogan}</p>
                  <h3>Misi</h3>
                  <ol className="mission-list">
                    {missions.map((mission, index) => <li key={index}>{mission}</li>)}
                  </ol>
                </div>
              </article>
            );
          })}
        </section>

        <section className="turnout-section">
          <div className="section-heading">
            <span>Statistik Partisipasi Pemilih</span>
            <strong>Kelas 10, Kelas 11, Kelas 12, dan GTK</strong>
          </div>
          <div className="grid turnout">
            {levelOrder.map((level) => {
              const row = turnoutMap[level] || { level, total: 0, voted: 0, percentage: 0 };
              return (
                <div className="turnout-card" key={level}>
                  <span>{level}</span>
                  <b>{Number(row.percentage || 0)}%</b>
                  <small>{row.voted} dari {row.total} sudah memilih</small>
                  <div className="progress"><span style={{ width: `${row.percentage || 0}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>

        <a className="vote-btn" href="/vote"><Vote size={20} /> KE BILIK SUARA</a>
      </main>

      <footer className="footer">
        <b>OSIS SMA Negeri 2 Sangatta Utara</b><br />
        A Place to Learn, Lead, and <strong>SHINE</strong><br />
        <a className="social" href="https://www.instagram.com/smadaosis/" target="_blank" rel="noreferrer"><Instagram size={18} /> @smadaosis</a>
      </footer>
      <div className="running"><span>{data.settings?.running_text || 'Selamat datang di Pemilihan OSIS SMADA 2026.'}</span></div>
    </div>
  );
}
