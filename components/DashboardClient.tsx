 'use client';

import { useEffect, useMemo, useState } from 'react';
import { Instagram, Vote, RefreshCw } from 'lucide-react';
import type { Candidate, Turnout } from '@/lib/types';

type PublicData = { candidates: Candidate[]; turnout: Turnout[]; settings: Record<string, any>; now: string };

const levelOrder = ['Kelas 10', 'Kelas 11', 'Kelas 12', 'Guru dan Tenaga Kependidikan'];

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
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const totalVotes = useMemo(() => data.candidates.reduce((sum, c) => sum + Number(c.votes || 0), 0), [data.candidates]);
  const first = data.candidates[0];
  const firstPct = totalVotes ? Math.round((Number(first?.votes || 0) / totalVotes) * 100) : 0;
  const deg = totalVotes ? (Number(first?.votes || 0) / totalVotes) * 360 : 180;
  const turnoutMap = Object.fromEntries((data.turnout || []).map((t) => [t.level, t]));

  const theme = data.settings?.theme || {};
  const cssVars = { ['--red' as any]: theme.primary || '#b91c1c', ['--black' as any]: theme.accent || '#0a0a0a' };

  return (
    <div style={cssVars}>
      <header className="header"><h1>PEMILIHAN KETUA DAN WAKIL KETUA OSIS SMADA 2026</h1></header>
      <main className="container">
        <section className="grid dashboard-grid">
          <div className="card">
            <div className="title-row"><h2>Hasil Polling Real Time</h2><span className="badge"><RefreshCw size={16}/> Update tiap 1 menit</span></div>
            <div className="pie-wrap"><div className="pie" style={{ ['--deg' as any]: `${deg}deg` }} /><div className="pie-center"><div><strong>{firstPct}%</strong><br/><span>Paslon 1</span></div></div></div>
            <p style={{ textAlign:'center', color:'#6b7280' }}>{loading ? 'Memuat hasil...' : `Total suara masuk: ${totalVotes}`}</p>
          </div>
          <div className="grid candidates">
            {data.candidates.map((c) => {
              const pct = totalVotes ? Math.round((Number(c.votes || 0) / totalVotes) * 100) : 0;
              return <article className="card candidate" key={c.id}>
                <div className="photo-row"><div className="photo"><img src={c.chair_photo_url || '/candidate-placeholder-1.svg'} alt={c.chair_name}/></div><div className="photo"><img src={c.vice_photo_url || '/candidate-placeholder-2.svg'} alt={c.vice_name}/></div></div>
                <div className="title-row"><span className="pair-no">{c.pair_number}</span><span className="percent">{pct}%</span></div>
                <h2>{c.chair_name}</h2><h3 style={{marginTop:-8, color:'#6b7280'}}>Wakil: {c.vice_name}</h3>
                <p>{c.slogan}</p><b>{c.votes || 0} suara</b>
              </article>;
            })}
          </div>
        </section>

        <section className="turnout-section">
          <div className="section-heading">
            <span>Statistik Partisipasi Pemilih</span>
            <strong>Per tingkat kelas dan GTK</strong>
          </div>
          <div className="grid turnout">
            {levelOrder.map((level) => {
              const row = turnoutMap[level] || { level, total: 0, voted: 0, percentage: 0 };
              return <div className="turnout-card" key={level}><span>{level}</span><b>{Number(row.percentage || 0)}%</b><small>{row.voted} dari {row.total} sudah memilih</small><div className="progress"><span style={{ width: `${row.percentage || 0}%` }} /></div></div>;
            })}
          </div>
        </section>

        <a className="vote-btn" href="/vote"><Vote size={18} style={{verticalAlign:'middle', marginRight:8}}/> KE BILIK SUARA</a>
      </main>
      <footer className="footer"><b>OSIS SMA Negeri 2 Sangatta Utara</b><br/>A Place to Learn, Lead, and <strong>SHINE</strong><br/><a className="social" href="https://www.instagram.com/smadaosis/" target="_blank" rel="noreferrer"><Instagram size={18}/> @smadaosis</a></footer>
      <div className="running"><span>{data.settings?.running_text || 'Selamat datang di Pemilihan OSIS SMADA 2026.'}</span></div>
    </div>
  );
}
