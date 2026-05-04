
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useFirebase } from '../provider';

export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      // Se non c'è un utente e siamo in ambiente di sviluppo, attiviamo il login fittizio
      if (!u && process.env.NODE_ENV === 'development') {
        setUser({
          uid: 'dev-user-123',
          displayName: 'Sviluppatore Locale',
          email: 'dev@mg30studio.local',
          photoURL: 'https://picsum.photos/seed/dev/200/200',
        } as User);
      } else {
        setUser(u);
      }
      setLoading(false);
    });
  }, [auth]);

  return { user, loading };
}
