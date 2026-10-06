import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, HardDrive, RefreshCw, Trash2, UserCheck, Wallet } from 'lucide-react';
import { Empty, ErrorBox, Loading, PageHead, useAction, useApi } from '../components/ui';
import { api } from '../lib/api';

type N = { id: string; kind: string; title: string; body: string; link: string; read_at: string | null; created_at: string };
const ICON: Record<string, [typeof Bell, string]> = { pagamento: [Wallet, 'red'], rinnovo: [RefreshCw, 'amber'], presenza: [UserCheck, 'violet'], backup: [HardDrive, 'red'] };

export default function Notifications() {
  const { data, error } = useApi<N[]>('/notifications');
  const act = useAction();
  const nav = useNavigate();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;
  const unread = data.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHead label={`${unread} DA LEGGERE`} title="Notifiche">
        <button className="btn" disabled={!unread} onClick={() => act(() => api.post('/notifications/read-all'), 'Tutte lette')}><CheckCheck /> Segna tutte come lette</button>
      </PageHead>
      <div className="card list fade-in">
        {data.length === 0 ? <Empty icon={<Bell />}>Nessuna notifica.</Empty> : data.map((n) => {
          const [Icon, color] = ICON[n.kind] ?? [Bell, 'violet'];
          return (
            <div className="list-row" key={n.id} style={{ opacity: n.read_at ? 0.55 : 1, cursor: n.link ? 'pointer' : 'default' }}
              onClick={async () => { if (!n.read_at) await act(() => api.post(`/notifications/${n.id}/read`)); if (n.link) nav(n.link); }}>
              <div className={`row-icon ${color}`}><Icon /></div>
              <div className="grow"><div className="title">{n.title}</div><div className="sub">{n.body} · {new Date(n.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</div></div>
              {!n.read_at && <span className="pill violet plain">nuova</span>}
              <button className="icon-btn sm" aria-label="Elimina" onClick={(e) => { e.stopPropagation(); act(() => api.del(`/notifications/${n.id}`)); }}><Trash2 /></button>
            </div>
          );
        })}
      </div>
    </>
  );
}
