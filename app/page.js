'use client';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import AttendanceTable from '../components/AttendanceTable';
import AuthScreen from '../components/AuthScreen';

export default function Page() {
  const [session, setSession] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  if (!session) return <AuthScreen message={authMessage} onAuthenticated={value => {setAuthMessage('');setSession(value);}}/>;
  return <Workspace key={session.token} session={session}
    onSignOut={() => {setSession(null);setAuthMessage('');}}
    onExpired={() => {setSession(null);setAuthMessage('Your session expired. Please sign in again.');}}/>;
}

function Workspace({ session, onSignOut, onExpired }) {
  const token = session.token;
  const coaching = session.coaching;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState('');
  const [batch, setBatch] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('attendance');
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStudent, setHistoryStudent] = useState('');
  const [report, setReport] = useState(null);
  const [students, setStudents] = useState([]);
  const [telegram, setTelegram] = useState(null);
  const [parents, setParents] = useState([]);
  const [telegramLink, setTelegramLink] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function refresh() {
      try {
        const [summary, records, roster, bot, contacts] = await Promise.all([api('/dashboard/today' + (date ? `?date=${date}` : ''), token), api('/messages', token), api('/students', token), api('/telegram/status', token), api('/parents', token)]);
        if (active) { setData(summary); setMessages(records); setStudents(roster); setTelegram(bot); setParents(contacts); setError(''); }
      } catch (e) { if (active) {
        if (e.status === 401) onExpired();
        else setError(e.message);
      } }
    }
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [token, date]);

  async function submit(event, action) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await action(Object.fromEntries(new FormData(event.currentTarget))); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const filtered = (data?.students || []).filter(s => (!batch || s.batch_id === batch) && `${s.name} ${s.student_id}`.toLowerCase().includes(search.toLowerCase()));
  const editingStudent = students.find(s => s.student_id === editingStudentId);
  return <div className="shell"><aside><div className="brand">◉ ATTENDANCE<br/>DESK</div><p className="muted">COACHING WORKSPACE</p>
    {coaching && <p className="muted">{coaching.name} · {coaching.tenant_id}</p>}
    {['attendance','students','parents','devices','messages','history','reports'].map(item => <button className={tab === item ? 'nav active' : 'nav'} key={item} onClick={() => { setTab(item); setNotice(''); }}>{item}</button>)}
    <button className="nav logout" onClick={onSignOut}>Sign out</button></aside>
    <main><header><div><p className="eyebrow">YOUR DAILY OVERVIEW</p><h1>{tab === 'attendance' ? 'Attendance' : tab[0].toUpperCase()+tab.slice(1)}</h1></div><span className="live">● Refreshes every 15s</span></header>
      {error && <p role="alert" className="error">{error}</p>}{notice && <pre role="status" className="notice">{notice}</pre>}
      {tab === 'attendance' && <><section className="stats">{[['Total students',data?.total_students],['Present',data?.present],['Absent',data?.absent]].map(([label,value]) => <article key={label}><p>{label}</p><strong>{value ?? '—'}</strong></article>)}</section>
        <section className="panel"><div className="toolbar"><div><h2>Daily register</h2><p className="muted">Entry and exit times · {data?.timezone || 'Loading…'}</p></div>
          <label>Date<input aria-label="Attendance date" type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div>
          <div className="filters"><input aria-label="Search students" placeholder="Search name or student ID" value={search} onChange={e => setSearch(e.target.value)} />
          <select aria-label="Filter batch" value={batch} onChange={e => setBatch(e.target.value)}><option value="">All batches</option>{data?.batches.map(b => <option key={b.batch_id}>{b.batch_id}</option>)}</select></div>
          {!data ? <p className="empty">Loading attendance…</p> : <AttendanceTable students={filtered} timezone={data.timezone}/>}</section>
        <section className="batch-grid">{data?.batches.map(b => <article className="panel" key={b.batch_id}><h2>{b.batch_id}</h2><p>{b.present} present · {b.absent} absent</p><progress max={b.total} value={b.present}/></article>)}</section></>}
      {tab === 'students' && <><section className="panel"><h2>Student roster</h2><p className="muted">Students registered on the server, including enrollments synced from your edge device.</p>
        <div className="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>Actions</th></tr></thead><tbody>{students.map(s => <tr key={s.student_id}><td><strong>{s.name}</strong><small>{s.student_id}</small></td><td>{s.batch_id}</td><td><span className={`badge ${s.status === 'ACTIVE' ? 'present' : 'absent'}`}>{s.status}</span></td><td><button onClick={() => {setEditingStudentId(s.student_id);setNotice('');}}>Edit</button></td></tr>)}</tbody></table>{!students.length && <p className="empty">No students synced yet.</p>}</div></section>
      <section className="panel spaced"><h2>{editingStudent ? 'Edit student' : 'Add student'}</h2><p className="muted">{editingStudent ? `Student ID: ${editingStudent.student_id}` : `A student ID will be generated automatically for ${coaching?.name || 'your coaching centre'}${coaching?.student_id_prefix ? ` (${coaching.student_id_prefix}…)` : ''}.`}</p>
        <form key={editingStudentId || 'new'} className="form-grid" onSubmit={e => { const form=e.currentTarget; submit(e, async fields => { const saved=await api('/students', token, {...fields,...(editingStudentId ? {student_id:editingStudentId} : {})}); setStudents(await api('/students', token)); setEditingStudentId(null); form.reset(); setNotice(`Student saved. ID: ${saved.student_id}. Use this ID when enrolling this existing student on the edge laptop.`); }); }}>
          <label>Full name<input name="name" required maxLength={150} defaultValue={editingStudent?.name || ''}/></label><label>Batch<input name="batch_id" required maxLength={80} defaultValue={editingStudent?.batch_id || ''}/></label>
          <label>Status<select name="status" defaultValue={editingStudent?.status || 'ACTIVE'}><option>ACTIVE</option><option>INACTIVE</option></select></label><button disabled={busy}>{editingStudent ? 'Save changes' : 'Add student'}</button>
          {editingStudent && <button type="button" onClick={() => setEditingStudentId(null)}>Cancel editing</button>}</form></section></>}
      {tab === 'parents' && <><section className="panel"><h2>Telegram connection</h2>
        <p><span className={`badge ${telegram?.configured && telegram?.username ? 'present' : 'absent'}`}>{telegram?.username ? `@${telegram.username}` : 'Not connected'}</span></p>
        <p className="muted">{!telegram?.configured ? 'A dummy bot token is configured. Add a genuine Telegram bot token in the server configuration and restart the API to enable linking.' : telegram?.error || (telegram?.polling_active ? 'Bot is listening. Link a private Telegram chat below.' : 'Bot configured. Waiting for updates; check the selected polling or webhook mode.')}</p>
        {telegramLink && <div className="notice"><p>{telegramLink.instruction}</p>{telegramLink.telegram_url && <a href={telegramLink.telegram_url} target="_blank" rel="noreferrer">Open Telegram and press Start →</a>}<p className="muted">Expires {new Date(telegramLink.expires_at).toLocaleTimeString()}. Keep this single-use link private.</p></div>}
      </section><section className="panel spaced"><h2>Link your account or a parent</h2><p className="muted">Choose a student and enter the recipient name. You can link your own Telegram account for the pilot. Future attendance messages go to the linked private chat.</p>
        <form className="form-grid" onSubmit={e => submit(e, async fields => { const parent = await api('/parents', token, fields); const link = await api(`/parents/${parent.id}/link-code`, token, {}); setTelegramLink(link); setParents(await api('/parents', token)); setNotice('Open the Telegram link and press Start. This page will update when the account is linked.'); })}>
          <label>Student<select name="student_id" required><option value="">Select a student</option>{students.map(s => <option key={s.student_id} value={s.student_id}>{s.name} · {s.student_id}</option>)}</select></label><label>Recipient name<input name="name" required maxLength={150}/></label><button disabled={busy || !telegram?.username}>Create Telegram link</button></form>
        <h2 className="spaced">Linked recipients</h2><div className="table-wrap"><table><thead><tr><th>Recipient</th><th>Telegram</th><th>Link</th></tr></thead><tbody>{parents.map(p => <tr key={p.id}><td>{p.name}</td><td><span className={`badge ${p.telegram_linked ? 'present' : 'absent'}`}>{p.telegram_linked ? 'Linked' : 'Awaiting Start'}</span></td><td><button disabled={busy || !telegram?.username} onClick={async () => { setBusy(true); setError(''); try { setTelegramLink(await api(`/parents/${p.id}/link-code`, token, {})); } catch(e) {setError(e.message);} finally {setBusy(false);} }}>New link</button></td></tr>)}</tbody></table>{!parents.length && <p className="empty">No Telegram recipients linked yet.</p>}</div>
      </section></>}
      {tab === 'devices' && <section className="panel"><h2>Register a gate device</h2><p className="muted">Register a device for {coaching?.name || 'this coaching'}. Copy the returned configuration into the edge device. The secret is shown once.</p>
        <form className="form-grid" onSubmit={e => submit(e, async fields => { const result = await api('/devices', token, fields); setNotice(`TENANT_ID=${coaching.tenant_id}\nDEVICE_ID=${result.device_id}\nDEVICE_SECRET=${result.secret}\nSYNC_ENABLED=true`); })}>
          <label>Device ID<input name="device_id" required pattern="[A-Za-z0-9_-]{1,80}"/></label><button disabled={busy}>Register device</button></form></section>}
      {tab === 'messages' && <section className="panel"><h2>Parent message audit</h2><div className="table-wrap"><table><thead><tr><th>Event</th><th>Status</th><th>Attempts</th><th>Telegram ID</th><th>Last error</th></tr></thead><tbody>{messages.map(m => <tr key={m.id}><td>{m.event_id}</td><td>{m.status}</td><td>{m.attempt_count}</td><td>{m.telegram_message_id || '—'}</td><td>{m.last_error || '—'}</td></tr>)}</tbody></table>{!messages.length && <p className="empty">No parent messages queued yet.</p>}</div></section>}
      {tab === 'history' && <section className="panel"><h2>Student history</h2><form className="filters" onSubmit={e => submit(e, async fields => { setHistory(await api('/attendance/history?'+new URLSearchParams(fields), token)); })}>
        <label>Student ID<input name="student_id" required value={historyStudent} onChange={e => setHistoryStudent(e.target.value)}/></label><label>From<input name="from" type="date" required/></label><label>To<input name="to" type="date" required/></label><button disabled={busy}>View history</button></form>
        <p className="muted">Latest 100 events in the selected date range.</p><div className="table-wrap"><table><thead><tr><th>Student</th><th>Event</th><th>Time</th><th>Device</th></tr></thead><tbody>{history.map(row => <tr key={row.event_id}><td>{row.name}</td><td>{row.event_type}</td><td>{new Date(row.timestamp).toLocaleString('en-IN', { timeZone: data?.timezone || 'Asia/Kolkata' })}</td><td>{row.device_id}</td></tr>)}</tbody></table></div></section>}
      {tab === 'reports' && <section className="panel"><h2>Monthly attendance</h2><p className="muted">Present days count distinct dates with an entry. Absence and lateness require a teaching schedule.</p>
        <form className="filters" onSubmit={e => submit(e, async fields => { if (!fields.batch_id) delete fields.batch_id; setReport(await api('/reports/monthly?'+new URLSearchParams(fields),token)); })}>
          <label>Month<input type="month" name="month" required/></label><label>Batch (optional)<input name="batch_id"/></label><button disabled={busy}>Generate report</button></form>
        {report && <><p className="muted">{report.month} · {report.timezone}</p><div className="table-wrap"><table><thead><tr><th>Student</th><th>Batch</th><th>Present days</th><th>Entries</th><th>Exits</th></tr></thead><tbody>{report.students.map(s => <tr key={s.student_id}><td>{s.name}<small>{s.student_id}</small></td><td>{s.batch_id}</td><td>{s.present_days}</td><td>{s.entry_events}</td><td>{s.exit_events}</td></tr>)}</tbody></table></div></>}
      </section>}
    </main></div>;
}
