import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface DbUser {
  active: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  dbUser: DbUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnap: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        const isMaster = uid === '9Omk4UhYFZU2gob04pm1y6bRNmr2';
        const userRef = doc(db, 'users', uid);
        
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          // Create new user in users collection
          const newDbUser = {
            uid: uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            active: isMaster, // Only master is auto-active initially
            isAdmin: isMaster,
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newDbUser);
          setDbUser({ active: isMaster, isAdmin: isMaster });
        } else {
           const data = snap.data();
           // Force master to always be active and admin
           if (isMaster) {
              if (!data.active || !data.isAdmin) {
                 await setDoc(userRef, { active: true, isAdmin: true }, { merge: true });
                 setDbUser({ active: true, isAdmin: true });
              } else {
                 setDbUser({ active: data.active, isAdmin: data.isAdmin });
              }
           } else {
             setDbUser({ active: data.active, isAdmin: data.isAdmin });
           }
        }

        // Listen for realtime admin changes
        unsubscribeSnap = onSnapshot(userRef, (docSnap) => {
           if (docSnap.exists()) {
             const d = docSnap.data();
             setDbUser({ active: isMaster ? true : d.active, isAdmin: isMaster ? true : d.isAdmin });
           }
        });
        setLoading(false);
      } else {
        setDbUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnap) unsubscribeSnap();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signInWithGoogle, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
