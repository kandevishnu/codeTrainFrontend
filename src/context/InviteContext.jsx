import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../routes/AuthContext';
import { getPendingInvitesForUser } from '../firebase/firebaseUtils';

const InviteContext = createContext();

export const useInvites = () => useContext(InviteContext);

export const InviteProvider = ({ children }) => {
    const { user } = useAuth();
    const [pendingInvites, setPendingInvites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvites = async () => {
            if (user) {
                setIsLoading(true);
                const invites = await getPendingInvitesForUser(user.uid);
                setPendingInvites(invites);
                setIsLoading(false);
            } else {
                setPendingInvites([]);
                setIsLoading(false);
            }
        };
        fetchInvites();
    }, [user]);

    const value = {
        pendingInvites,
        setPendingInvites,
        isLoading,
        inviteCount: pendingInvites.length
    };

    return (
        <InviteContext.Provider value={value}>
            {children}
        </InviteContext.Provider>
    );
};