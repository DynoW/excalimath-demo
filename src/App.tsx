import { useState, useCallback, useEffect } from "react";
import { Excalidraw, parseLibraryTokensFromUrl } from "@excalidraw/excalidraw";
import { ExcaliMath } from "@excalimath/core";

const LIBRARY_KEY = "excalidraw-library";

type SavedScene = {
  elements: readonly any[];
  files?: Record<string, any>;
};

function readSavedScene(): SavedScene | undefined {
  try {
    const scene = localStorage.getItem("excalidraw-scene");
    if (scene) {
      const parsed = JSON.parse(scene);
      if (parsed && Array.isArray(parsed.elements)) {
        return {
          elements: parsed.elements,
          files: parsed.files && typeof parsed.files === "object" ? parsed.files : undefined,
        };
      }
    }
  } catch (error) {
    console.error("Failed to restore initial data", error);
  }

  return undefined;
}

function readSavedLibrary(): any[] | undefined {
  try {
    const data = localStorage.getItem(LIBRARY_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to restore library", error);
  }

  return undefined;
}

export function App() {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [lastSavedTheme, setLastSavedTheme] = useState<string | null>(() => {
    return localStorage.getItem("excalimath-theme");
  });

  const [initialData] = useState(() => {
    const savedScene = readSavedScene();
    const savedTheme = localStorage.getItem("excalimath-theme");
    const savedLibrary = readSavedLibrary();

    const data: any = {};

    if (savedScene) {
      data.elements = savedScene.elements;
      if (savedScene.files) {
        data.files = savedScene.files;
      }
    }

    if (savedLibrary) {
      data.libraryItems = savedLibrary;
    }

    if (savedTheme) {
      data.appState = { theme: savedTheme as "light" | "dark" };
    }

    return Object.keys(data).length > 0 ? data : undefined;
  });

  const handleExcalidrawAPI = useCallback((api: any) => {
    setExcalidrawAPI(api);
  }, []);

  // Handle #addLibrary hash for importing libraries from URL
  useEffect(() => {
    if (!excalidrawAPI) return;

    const tokens = parseLibraryTokensFromUrl();
    if (!tokens) return;

    (async () => {
      try {
        const response = await fetch(decodeURIComponent(tokens.libraryUrl));
        const blob = await response.blob();
        await excalidrawAPI.updateLibrary({
          libraryItems: blob,
          merge: true,
          prompt: tokens.idToken !== excalidrawAPI.id,
          defaultStatus: "published",
          openLibraryMenu: true,
        });
      } catch (error) {
        console.error("Failed to import library from URL", error);
      } finally {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        hash.delete("addLibrary");
        window.history.replaceState({}, "", `#${hash.toString()}`);
      }
    })();
  }, [excalidrawAPI]);

  const handleChange = useCallback((elements: readonly any[], appState: any, files: Record<string, any>) => {
    try {
      const scene = { elements, files };
      localStorage.setItem("excalidraw-scene", JSON.stringify(scene));
    } catch (error) {
      console.error("Failed to save Excalidraw data", error);
    }

    const currentTheme = appState?.theme;
    if (currentTheme && currentTheme !== lastSavedTheme) {
      try {
        localStorage.setItem("excalimath-theme", currentTheme);
        setLastSavedTheme(currentTheme);

        if (currentTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (error) {
        console.error("Failed to save theme preference", error);
      }
    }
  }, [lastSavedTheme]);

  const handleLibraryChange = useCallback((items: readonly any[]) => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save library", error);
    }
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        initialData={initialData}
        onChange={handleChange}
        onLibraryChange={handleLibraryChange}
        renderTopRightUI={() =>
          excalidrawAPI ? (
            <ExcaliMath
              excalidrawAPI={excalidrawAPI}
              enabledPlugins={["equation", "graph", "library"]}
              theme="auto"
            />
          ) : null
        }
      />
    </div>
  );
}