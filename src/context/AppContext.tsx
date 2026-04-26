import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
    activeSymbol: string;
    setActiveSymbol: (symbol: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [activeSymbol, setActiveSymbol] = useState<string>("BTCUSDT");

    return (
        <AppContext.Provider value={{ activeSymbol, setActiveSymbol }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
