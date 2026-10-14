import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import ApprovalGate from "./components/ApprovalGate";
import NavBar from "./components/NavBar";
import { AppRoutes, HashNav, useNav } from "./lib/nav";
import { fetchProgramme } from "./lib/pmu";
import type { Reunion } from "./lib/types";
import AdminPage from "./pages/AdminPage";
import AidePage from "./pages/AidePage";
import FavorisPage from "./pages/FavorisPage";
import HistoriquePage from "./pages/HistoriquePage";
import NotFoundPage from "./pages/NotFoundPage";
import PartantsPage from "./pages/PartantsPage";
import ProgrammePage, { useProgrammeDate } from "./pages/ProgrammePage";

const SELECTION_KEY = "partants-pmu-selection";

interface Selection {
  reunion: number | null;
  course: number | null;
}

function readSelection(): Selection {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    if (!raw) return { reunion: null, course: null };
    const parsed = JSON.parse(raw) as Selection;
    return {
      reunion: typeof parsed?.reunion === "number" ? parsed.reunion : null,
      course: typeof parsed?.course === "number" ? parsed.course : null,
    };
  } catch {
    return { reunion: null, course: null };
  }
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { message: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    const raw = error instanceof Error ? String(error.message || "") : String(error ?? "");
    return { message: raw || "L'application a rencontré une erreur." };
  }

  render() {
    if (this.state.message) {
      return (
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 bg-[#04180f] px-6 pb-28 text-center text-emerald-50">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
          <h1 className="text-xl font-black">Partants PMU</h1>
          <p className="text-sm text-emerald-100/80">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-xl bg-amber-400 px-4 text-sm font-bold text-[#062214]"
          >
            Recharger
          </button>
          <NavBar />
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <HashNav>
        <Gate />
      </HashNav>
    </AppErrorBoundary>
  );
}

function Gate() {
  const { path } = useNav();
  if (String(path || "") === "/admin") {
    return (
      <div className="min-h-screen bg-[#04180f] pb-24 text-emerald-50">
        <AdminPage />
        <NavBar />
      </div>
    );
  }
  return (
    <ApprovalGate>
      <Shell />
    </ApprovalGate>
  );
}

function Shell() {
  const { dateValue, date, onDateChange } = useProgrammeDate();
  const [reunions, setReunions] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [selection, setSelection] = useState<Selection>(readSelection);

  const selectCourse = useCallback((reunion: number, course: number) => {
    const next = { reunion: Number(reunion) || 0, course: Number(course) || 0 };
    setSelection(next);
    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify(next));
    } catch {
      /* préférence locale optionnelle */
    }
  }, []);

  const openFavorite = useCallback(
    (favDate: string, reunion: number, course: number) => {
      onDateChange(String(favDate ?? ""));
      selectCourse(reunion, course);
    },
    [onDateChange, selectCourse]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const list = await fetchProgramme(date);
        if (cancelled) return;
        const safe = Array.isArray(list) ? list : [];
        setReunions(safe);
        if (safe.length === 0) {
          setError("Aucune réunion n'est publiée pour cette date. Choisissez un autre jour ou touchez Réessayer.");
        }
      } catch (err) {
        if (cancelled) return;
        setReunions([]);
        const raw = err instanceof Error ? String(err.message ?? "") : String(err ?? "");
        setError(raw || "Impossible de joindre le programme PMU. Touchez Réessayer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dateValue, date, tick]);

  function refresh() {
    setTick((n) => n + 1);
  }

  const safeReunions = Array.isArray(reunions) ? reunions : [];

  return (
    <div className="min-h-screen bg-[#04180f] text-emerald-50">
      <div className="pb-28">
        <AppRoutes
          routes={[
            {
              path: "/",
              element: (
                <ProgrammePage
                  reunions={safeReunions}
                  loading={loading}
                  error={error}
                  dateValue={dateValue}
                  onDateChange={onDateChange}
                  onRefresh={refresh}
                  onOpenCourse={selectCourse}
                />
              ),
            },
            {
              path: "/partants",
              element: (
                <PartantsPage
                  reunions={safeReunions}
                  loadingProgramme={loading}
                  programmeError={error}
                  dateValue={dateValue}
                  onDateChange={onDateChange}
                  onRefresh={refresh}
                  selectedReunion={selection.reunion}
                  selectedCourse={selection.course}
                  onSelect={selectCourse}
                />
              ),
            },
            {
              path: "/historique",
              element: <HistoriquePage reunions={safeReunions} dateValue={dateValue} loadingProgramme={loading} />,
            },
            { path: "/favoris", element: <FavorisPage onOpen={openFavorite} /> },
            { path: "/aide", element: <AidePage /> },
            { path: "*", element: <NotFoundPage /> },
          ]}
        />
      </div>
      <NavBar />
    </div>
  );
}
