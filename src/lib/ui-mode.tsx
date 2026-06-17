import { createContext, useContext } from "react";

export const SimpleModeContext = createContext(true);
export const useSimpleMode = () => useContext(SimpleModeContext);
