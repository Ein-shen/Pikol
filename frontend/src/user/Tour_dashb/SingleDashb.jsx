return (
  <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">

    {/* FIXED HEADER: stays visible while content scrolls */}
    <header className="flex shrink-0 items-center justify-between gap-3 pb-6">

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
        <span className="hidden sm:inline">New Tournament</span>
      </button>

    </header>

    {/* SCROLLABLE CONTENT */}
    <div className="min-h-0 flex-1 overflow-y-auto -mr-3.5">

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

  </div>
);