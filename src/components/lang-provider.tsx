import {
  createContext,
  useState,
  useContext,
  type ReactNode,
} from "react";

interface LangContextType {
  isKorean: boolean;
  setLang: (lang: "ko" | "en") => void;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export const LangProvider = ({ children }: { children: ReactNode }) => {
  const [isKorean, setIsKorean] = useState(true);

  const setLang = (lang: "ko" | "en") => {
    setIsKorean(lang === "ko");
  }

  return (
    <LangContext.Provider value={{ isKorean, setLang }}>{children}</LangContext.Provider>
  );
};

export const useLang = () => {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error("useLang must be used within a LangProvider");
  }
  return context;
};
