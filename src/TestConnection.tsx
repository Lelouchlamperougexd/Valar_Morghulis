import { useState } from 'react';
import api from './api/index.ts';

interface Listing {
  id: number;
  title: string;
  city: string;
  price: number;
  deal_type: string;
  property_type: string;
  status: string;
}

export default function TestConnection() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const testHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/health');
      setHealth(JSON.stringify(response.data));
    } catch (err: unknown) {
      if (err instanceof Error) setError('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const testListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Listing[]>('/listings', {
        params: { limit: 10, offset: 0 }
      });
      setListings(response.data);
    } catch (err: unknown) {
      if (err instanceof Error) setError('Ошибка: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Тест подключения к бэку</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={testHealth} disabled={loading}>
          Проверить Health
        </button>
        <button onClick={testListings} disabled={loading}>
          Получить объявления
        </button>
      </div>

      {loading && <p>Загрузка...</p>}

      {error && (
        <div style={{ color: 'red', background: '#ffe0e0', padding: 10, borderRadius: 6 }}>
          {error}
        </div>
      )}

      {health && (
        <div style={{ background: '#e0ffe0', padding: 10, borderRadius: 6, marginBottom: 10 }}>
          <h3>Health:</h3>
          <p>{health}</p>
        </div>
      )}

      {listings.length > 0 && (
        <div style={{ background: '#e0f0ff', padding: 10, borderRadius: 6 }}>
          <h3>Объявления ({listings.length}):</h3>
          {listings.map(l => (
            <div key={l.id} style={{ borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 8 }}>
              <b>{l.title}</b> — {l.city} | {l.price} ₸ | {l.deal_type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}