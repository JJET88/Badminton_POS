"use client";
import { createContext, useContext, useState } from "react";

const ToggleContext = createContext();

export const ToggleProvider = ({ children }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);
  const openSection = () => setOpen(true);
  const closeSection = () => setOpen(false);

  return (
    <ToggleContext.Provider value={{ open, toggle, openSection, closeSection }}>
      {children}
    </ToggleContext.Provider>
  );
};

export const useToggle = () => useContext(ToggleContext);
