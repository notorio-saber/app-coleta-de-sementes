import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: string[]; // uids
  invitedEmails?: string[]; // emails
  monthlyGoalKg?: number;
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
    if (!user || !user.email) {
      setUserTeams([]);
      setActiveTeam(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const qMembers = query(collection(db, 'teams'), where('members', 'array-contains', user.uid));
      const qInvites = query(collection(db, 'teams'), where('invitedEmails', 'array-contains', user.email));
      
      const [snapMembers, snapInvites] = await Promise.all([
        getDocs(qMembers),
        getDocs(qInvites)
      ]);

      const teamsMap = new Map<string, Team>();
      snapMembers.docs.forEach(doc => teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team));
      snapInvites.docs.forEach(doc => teamsMap.set(doc.id, { id: doc.id, ...doc.data() } as Team));

      const teamsData = Array.from(teamsMap.values());
      
      setUserTeams(teamsData);
      if (teamsData.length > 0 && !activeTeam) {
          setActiveTeam(teamsData[0]);
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
