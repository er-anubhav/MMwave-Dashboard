import React, { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Dark mode is always on — no toggle allowed
    const isDarkMode = true;

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.add("dark");
        localStorage.setItem("theme", "dark");
    }, []);

    // No-op: kept so consumers don't break if they still call it
    const toggleTheme = () => {};

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
