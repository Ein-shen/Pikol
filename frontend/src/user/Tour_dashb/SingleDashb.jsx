
import React, { useEffect, useState } from 'react';
import { Plus, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';

import {
  Bracket_Single_VIew,
  createBracket,
  applyResults,
} from '../bracket_lead/Bracket_Single_VIew';

// ==========================================
// 1. ROUTES AND CACHE KEY
// ==========================================

const DASH_ROUTE = '/dashboard/singledashb';
const NEW_ROUTE = '/dashboard/single';

const CACHE_KEY = 'cachSingleElimination';

// ==========================================
// 2. SINGLE DASHBOARD COMPONENT
// ==========================================

export const SingleDashb = () => {

  // ==========================================
  // STATES
  // ==========================================

  // Load the saved tournament list from localStorage.
  // If nothing is saved or the data is invalid, use an empty array.
  const [tournaments, setTournaments] = useState(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load tournament cache:', error);
      return [];
    }
  });

  const [openError, setOpenError] = useState('');
  const [menuId, setMenuId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const current = location.state;

  // ==========================================
  // 3. AUTOMATICALLY SAVE TO LOCALSTORAGE
  // ==========================================

  // Whenever the tournament list changes,
  // automatically save the updated list.
  useEffect(() => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(tournaments)
      );
    } catch (error) {
      console.error('Failed to save tournament cache:', error);
    }
  }, [tournaments]);

  // ==========================================
  // 4. FETCH TOURNAMENT LIST
  // ==========================================

  const fetchTournaments = async () => {
    try {
      const res = await api.get('/single');

      // Get the latest tournament list from the backend.
      const data = Array.isArray(res.data) ? res.data : [];

      // Updating this state also updates localStorage
      // because of the useEffect above.
      setTournaments(data);

    } catch (err) {
      console.error('Get single tournaments error:', err);

      // Keep the cached list visible if the backend fails.
    }
  };

  // ==========================================
  // 5. INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchTournaments();
  }, []);

  // ==========================================
  // 6. CLOSE OPTIONS MENU WHEN CLICKING OUTSIDE
  // ==========================================

  useEffect(() => {
    const close = () => setMenuId(null);

    window.addEventListener('click', close);

    return () => {
      window.removeEventListener('click', close);
    };
  }, []);

  // ==========================================
  // 7. OPEN TOURNAMENT
  // ==========================================

  const openTournament = async (id) => {
    setOpenError('');

    try {
      // Always get the latest teams and matches.
      // This prevents old bracket results from localStorage.
      const res = await api.get(`/single/${id}`);

      const data = res.data;

      // Check if the tournament has enough teams.
      if (!data.teams || data.teams.length < 2) {
        setOpenError(
          'This tournament needs at least 2 saved teams to build a bracket.'
        );
        return;
      }

      // Create the bracket and apply previously saved results.
      const bracket = applyResults(
        createBracket(data.teams),
        data.matches || []
      );

      // Open the bracket dashboard.
      navigate(DASH_ROUTE, {
        state: {
          tournamentId: data.id,
          tournamentName: data.name,
          teams: data.teams,
          bracket,
        },
      });

    } catch (err) {
      console.error('Open tournament error:', err);
      setOpenError('Could not open tournament.');
    }
  };

  // ==========================================
  // 8. DELETE TOURNAMENT
  // ==========================================

  const deleteTournament = async (id, e) => {
    e.stopPropagation();

    try {
      // Delete from the backend first.
      await api.delete(`/single/${id}`);

      // Remove the deleted tournament from React state.
      // The useEffect automatically updates localStorage.
      setTournaments((previous) =>
        previous.filter((t) => String(t.id) !== String(id))
      );

      // If the deleted tournament is currently open,
      // return to the tournament list.
      if (String(current?.tournamentId) === String(id)) {
        navigate(DASH_ROUTE, {
          replace: true,
          state: null,
        });
      }

    } catch (err) {
      console.error('Delete tournament error:', err);

      setOpenError(
        err.response?.data?.message ||
        'Could not delete the tournament.'
      );
    }

    setConfirmId(null);
    setMenuId(null);
  };

  // ==========================================
  // 9. RENAME TOURNAMENT
  // ==========================================

  const renameTournament = async (id, e) => {
    e.preventDefault();

    const name = renameValue.trim();

    if (!name) return;

    try {
      // Update the name in the backend.
      await api.put(`/single/${id}`, { name });

      // Update the tournament name in React state.
      // The useEffect automatically updates localStorage.
      setTournaments((previous) =>
        previous.map((t) =>
          String(t.id) === String(id)
            ? { ...t, name }
            : t
        )
      );

      // If this tournament is currently open,
      // update the name in the bracket dashboard too.
      if (String(current?.tournamentId) === String(id)) {
        navigate(DASH_ROUTE, {
          replace: true,
          state: {
            ...current,
            tournamentName: name,
          },
        });
      }

    } catch (err) {
      console.error('Rename tournament error:', err);

      setOpenError(
        err.response?.data?.message ||
        'Could not rename the tournament.'
      );
    }

    setRenamingId(null);
    setRenameValue('');
  };

  // ==========================================
  // 10. RESET TOURNAMENT VIEW
  // ==========================================

  const resetTournament = () => {
    navigate(DASH_ROUTE, {
      replace: true,
      state: null,
    });

    fetchTournaments();
  };

  // ==========================================
  // 11. GET TEAM COUNT
  // ==========================================

  const getTeamCount = (t) => {
    return t.teams?.length ?? t.teamCount ?? null;
  };

  // ==========================================
  // 12. DISPLAY
  // ==========================================

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">

      {/* HEADER */}
      <header className="flex items-center justify-between gap-3">

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">

          <button
            className="shrink-0 rounded-md p-2 opacity-60 transition hover:opacity-100"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft />
          </button>

          <h1 className="truncate text-lg font-bold sm:text-xl">
            Top 1 Single Elimination
          </h1>

        </div>

        <button
          onClick={() => navigate(NEW_ROUTE)}
          className="theme-accent flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold sm:gap-2 sm:px-4"
        >
          <Plus size={16} />

          <span className="sm:hidden">New</span>

          <span className="hidden sm:inline">
            New Tournament
          </span>
        </button>

      </header>

      {/* ERROR MESSAGE */}
      {openError && (
        <p role="alert" className="text-sm text-red-500">
          {openError}
        </p>
      )}

      {/* BRACKET VIEW OR TOURNAMENT LIST */}
      {current?.bracket ? (

        <Bracket_Single_VIew
          key={current.tournamentId}
          tournamentId={current.tournamentId}
          tournamentName={current.tournamentName}
          teams={current.teams}
          initialBracket={current.bracket}
          onReset={resetTournament}
        />

      ) : (

        <div className="grid grid-cols-1 animate-fade-in animation-delay-100 pt-10 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">

          {tournaments.map((t) => {

            const teamCount = getTeamCount(t);

            return (

              <div
                key={t.id}
                onClick={() => openTournament(t.id)}
                className="theme-card theme-hover theme-border relative flex min-w-0 cursor-pointer flex-col justify-between rounded-xl border p-4 shadow-sm sm:p-5"
              >

                <div className="flex items-start justify-between gap-2">

                  <div className="min-w-0">

                    <div className="flex items-center gap-3">

                      <img
                        src="https://img.icons8.com/?size=100&id=zbygTShAC2X2&format=png&color=000000"
                        alt="pikol"
                        height={24}
                        width={24}
                        className="theme-icon shrink-0"
                      />

                      <h3 className="truncate text-base font-bold capitalize">
                        {t.name}
                      </h3>

                    </div>

                    {teamCount !== null && (
                      <p className="theme-muted mt-0.5 pl-9 text-xs">
                        {teamCount} {teamCount === 1 ? 'team' : 'teams'}
                      </p>
                    )}

                  </div>

                  {/* OPTIONS MENU */}
                  <div
                    className="relative shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >

                    <button
                      className="theme-hover rounded-md p-2 sm:p-1.5"
                      onClick={() =>
                        setMenuId(menuId === t.id ? null : t.id)
                      }
                      aria-label="Options"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuId === t.id && (

                      <div className="theme-border theme-card absolute right-0 top-9 z-10 flex w-40 flex-col rounded-lg border py-1 shadow-lg sm:w-36">

                        {/* RENAME */}
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(t.id);
                            setRenameValue(t.name);
                            setMenuId(null);
                          }}
                          className="theme-hover theme-border w-full border-b px-4 py-3 text-left text-sm sm:py-2 sm:text-xs"
                        >
                          Edit
                        </button>

                        {/* DELETE */}
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmId(t.id);
                            setMenuId(null);
                          }}
                          className="theme-hover w-full px-4 py-3 text-left text-sm text-red-500 sm:py-2 sm:text-xs"
                        >
                          Delete
                        </button>

                      </div>
                    )}

                  </div>

                </div>

                {/* RENAME FORM / DELETE CONFIRMATION */}
                {renamingId === t.id ? (

                  <form
                    onSubmit={(e) => renameTournament(t.id, e)}
                    className="mt-4"
                    onClick={(e) => e.stopPropagation()}
                  >

                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="theme-input mb-2 w-full rounded-md p-2 text-base sm:p-1.5 sm:text-xs"
                      autoFocus
                    />

                    <div className="flex justify-end gap-2">

                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="theme-border rounded border px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="theme-accent rounded px-3 py-2 text-sm font-semibold sm:px-2 sm:py-1 sm:text-xs"
                      >
                        Save
                      </button>

                    </div>

                  </form>

                ) : confirmId === t.id ? (

                  <div
                    className="mt-4 flex flex-col gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >

                    <p className="text-xs font-medium text-red-500">
                      Delete this tournament?
                    </p>

                    <div className="flex gap-2">

                      <button
                        onClick={(e) => deleteTournament(t.id, e)}
                        className="flex-1 rounded bg-red-500 px-3 py-2 text-sm font-semibold text-white sm:flex-none sm:py-1 sm:text-xs"
                      >
                        Yes
                      </button>

                      <button
                        onClick={() => setConfirmId(null)}
                        className="theme-border flex-1 rounded border px-3 py-2 text-sm sm:flex-none sm:py-1 sm:text-xs"
                      >
                        No
                      </button>

                    </div>

                  </div>

                ) : null}

              </div>
            );
          })}

          {/* EMPTY STATE */}
          {tournaments.length === 0 && (

            <p className="theme-muted col-span-full py-10 text-center text-sm">
              No single elimination tournaments found. Create one to get started!
            </p>

          )}

        </div>

      )}

    </div>
  );
};
