import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
}

interface TeamContextType {
  activeTeam: Team | null;
  userTeams: Team[];
  setActiveTeam: (team: Team) => void;
  loading: boolean;
  refreshTeams: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!user) {
      setUserTeams([]);
      setActiveTeam(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get the user document which contains the list of team IDs
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let teamsToFetch: string[] = [];

      if (userDoc.exists()) {
        const userData = userDoc.data();
        teamsToFetch = userData.teams || [];
      } else {
        // If query by ownerId instead of checking user's teams directly
        const q = query(collection(db, 'teams'), where('members', 'array-contains', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedTeams = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
        setUserTeams(fetchedTeams);
        if (fetchedTeams.length > 0 && !activeTeam) {
            setActiveTeam(fetchedTeams[0]);
        }
        setLoading(false);
        return;
      }

      if (teamsToFetch.length > 0) {
          // Fetch each team (Firestore 'in' query supports max 10, so fetch individually or use array-contains on teams collection)
          const q = query(collection(db, 'teams'), where('members', 'array-contains', user.uid));
          const querySnapshot = await getDocs(q);
          const fetchedTeams = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Team));
          setUserTeams(fetchedTeams);
          if (fetchedTeams.length > 0 && (!activeTeam || !fetchedTeams.find(t => t.id === activeTeam.id))) {
              setActiveTeam(fetchedTeams[0]);
          }
      } else {
          setUserTeams([]);
          setActiveTeam(null);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user]);

  return (
    <TeamContext.Provider value={{ activeTeam, userTeams, setActiveTeam, loading, refreshTeams: fetchTeams }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
