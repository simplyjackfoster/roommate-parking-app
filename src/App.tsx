import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

dayjs.extend(relativeTime);

const ROOMMATES = ['Aswin', 'Jack', 'Joel', 'Nishant'];

const SPOT_BLUEPRINT = [
  { id: 'garage-1', label: 'Garage 1', location: 'Garage' },
  { id: 'garage-2', label: 'Garage 2', location: 'Garage' },
  { id: 'driveway-1', label: 'Driveway 1', location: 'Driveway' },
  { id: 'driveway-2', label: 'Driveway 2', location: 'Driveway' }
] as const;

type SpotId = (typeof SPOT_BLUEPRINT)[number]['id'];

type SpotState = {
  id: SpotId;
  label: string;
  location: 'Garage' | 'Driveway';
  occupant: string | null;
  updatedAt: Date | null;
};

const DEFAULT_SPOTS: SpotState[] = SPOT_BLUEPRINT.map((spot) => ({
  ...spot,
  occupant: null,
  updatedAt: null
}));

const STORAGE_KEY = 'roommate-parking-name';

function useCurrentUserName() {
  const [name, setName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedName = window.localStorage.getItem(STORAGE_KEY);
    if (storedName) {
      setName(storedName);
    }
    setIsReady(true);
  }, []);

  const saveName = (nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    window.localStorage.setItem(STORAGE_KEY, trimmed);
    setName(trimmed);
  };

  return { name, saveName, isReady } as const;
}

function useRelativeTimeTicker() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((previous) => previous + 1);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function NameDialog({
  initialValue,
  onSubmit
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur"
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-dialog-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-xl">
        <h2 id="name-dialog-title" className="text-xl font-semibold text-slate-100">
          What’s your name?
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          We’ll show it on your parking spot. You can change it later in your browser
          storage settings.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <label className="block text-sm font-medium text-slate-200" htmlFor="name-input">
            First name
          </label>
          <input
            id="name-input"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g., Aswin"
            required
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">Roommates: {ROOMMATES.join(', ')}</div>
            <button
              type="submit"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Save name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { name: currentUserName, saveName, isReady } = useCurrentUserName();
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [spots, setSpots] = useState<SpotState[]>(DEFAULT_SPOTS);
  const [loading, setLoading] = useState(firebaseEnabled);
  const [error, setError] = useState<string | null>(null);
  const [activeActionSpot, setActiveActionSpot] = useState<SpotId | null>(null);

  useRelativeTimeTicker();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!currentUserName) {
      setIsNameDialogOpen(true);
    }
  }, [currentUserName, isReady]);

  useEffect(() => {
    if (!firebaseEnabled || !db) {
      return;
    }

    let isSubscribed = true;
    const parkingCollection = collection(db, 'parking-spots');

    const ensureDocs = async () => {
      try {
        await Promise.all(
          SPOT_BLUEPRINT.map(async (spot) => {
            const spotRef = doc(parkingCollection, spot.id);
            const snapshot = await getDoc(spotRef);
            if (!snapshot.exists()) {
              await setDoc(spotRef, {
                id: spot.id,
                label: spot.label,
                location: spot.location,
                occupant: null,
                updatedAt: serverTimestamp()
              });
            }
          })
        );
      } catch (setupError) {
        console.error(setupError);
        if (isSubscribed) {
          setError('Unable to connect to the parking board. Please refresh.');
          setLoading(false);
        }
      }
    };

    const unsubscribe = onSnapshot(
      parkingCollection,
      (snapshot) => {
        const nextState = SPOT_BLUEPRINT.map((spot) => {
          const docData = snapshot.docs.find((docSnapshot) => docSnapshot.id === spot.id)?.data();
          const updatedAtValue = docData?.updatedAt;
          return {
            ...spot,
            occupant: (docData?.occupant as string | null) ?? null,
            updatedAt:
              updatedAtValue && typeof updatedAtValue.toDate === 'function'
                ? updatedAtValue.toDate()
                : null
          } satisfies SpotState;
        });
        if (isSubscribed) {
          setSpots(nextState);
          setLoading(false);
        }
      },
      (subscriptionError) => {
        console.error(subscriptionError);
        if (isSubscribed) {
          setError('Realtime updates are unavailable. Try reloading the page.');
          setLoading(false);
        }
      }
    );

    ensureDocs();

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const handleSetName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    saveName(trimmed);
    setIsNameDialogOpen(false);
  };

  const disabledBecauseMissingFirebase = !firebaseEnabled || !db;

  const updateSpotLocally = (spotId: SpotId, occupant: string | null) => {
    setSpots((previous) =>
      previous.map((spot) =>
        spot.id === spotId
          ? {
              ...spot,
              occupant,
              updatedAt: new Date()
            }
          : spot
      )
    );
  };

  const parkHere = async (spot: SpotState) => {
    if (!currentUserName) {
      setIsNameDialogOpen(true);
      return;
    }

    setError(null);
    setActiveActionSpot(spot.id);

    try {
      if (disabledBecauseMissingFirebase) {
        updateSpotLocally(spot.id, currentUserName);
        return;
      }

      await runTransaction(db!, async (transaction) => {
        const ref = doc(db!, 'parking-spots', spot.id);
        const snap = await transaction.get(ref);
        const data = snap.data();
        if (data?.occupant && data.occupant !== currentUserName) {
          throw new Error(`Spot already taken by ${data.occupant}`);
        }
        transaction.update(ref, {
          occupant: currentUserName,
          updatedAt: serverTimestamp()
        });
      });
    } catch (actionError) {
      console.error(actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Could not claim the spot. Please try again.'
      );
    } finally {
      setActiveActionSpot(null);
    }
  };

  const leaveSpot = async (spot: SpotState) => {
    if (!currentUserName) {
      return;
    }
    setError(null);
    setActiveActionSpot(spot.id);

    try {
      if (disabledBecauseMissingFirebase) {
        updateSpotLocally(spot.id, null);
        return;
      }

      await runTransaction(db!, async (transaction) => {
        const ref = doc(db!, 'parking-spots', spot.id);
        const snap = await transaction.get(ref);
        const data = snap.data();
        if (data?.occupant && data.occupant !== currentUserName) {
          throw new Error(`Spot is now taken by ${data.occupant}`);
        }
        transaction.update(ref, {
          occupant: null,
          updatedAt: serverTimestamp()
        });
      });
    } catch (actionError) {
      console.error(actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Could not release the spot. Please try again.'
      );
    } finally {
      setActiveActionSpot(null);
    }
  };

  const sortedSpots = useMemo(() => {
    return SPOT_BLUEPRINT.map((spot) => spots.find((item) => item.id === spot.id) ?? {
      ...spot,
      occupant: null,
      updatedAt: null
    });
  }, [spots]);

  return (
    <div className="min-h-screen bg-slate-950 py-10 text-slate-100">
      <header className="px-4">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h1 className="text-center text-3xl font-bold tracking-tight sm:text-left">
              Roommate Parking Tracker
            </h1>
            <p className="mt-2 text-center text-sm text-slate-400 sm:text-left">
              Tap your spot to update it. Everyone sees changes instantly.
            </p>
          </div>
          {currentUserName ? (
            <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
              Signed in as <span className="font-semibold text-slate-100">{currentUserName}</span>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto mt-10 w-full max-w-4xl px-4">
        {error ? (
          <div
            className="mb-6 rounded-xl border border-rose-500/60 bg-rose-500/10 p-4 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {disabledBecauseMissingFirebase ? (
          <div
            className="mb-6 rounded-xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200"
            role="alert"
          >
            Firebase configuration is missing. Realtime sync is disabled until environment
            variables are provided.
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {sortedSpots.map((spot) => {
            const isMine = !!currentUserName && spot.occupant === currentUserName;
            const isEmpty = !spot.occupant;
            const isTakenByOther = !isEmpty && !isMine;
            const relative = spot.updatedAt ? dayjs(spot.updatedAt).fromNow() : 'just now';
            const isBusy = activeActionSpot === spot.id;

            const actionLabel = isEmpty ? 'Park here' : isMine ? 'Leave' : `Taken by ${spot.occupant}`;

            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  if (isBusy || loading) return;
                  if (isEmpty) {
                    void parkHere(spot);
                  } else if (isMine) {
                    void leaveSpot(spot);
                  }
                }}
                disabled={isTakenByOther || isBusy || loading}
                aria-pressed={isMine}
                className={classNames(
                  'relative flex min-h-[150px] flex-col rounded-3xl border-2 p-5 text-left shadow-lg transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed',
                  isEmpty
                    ? 'border-emerald-500/70 bg-slate-900 hover:border-emerald-400 hover:bg-slate-800'
                    : 'border-rose-500/70 bg-rose-500/10 hover:bg-rose-500/20',
                  isBusy ? 'opacity-75' : '',
                  isMine ? 'ring-2 ring-emerald-400/60' : '',
                  'outline-none'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {spot.location} <span className="text-slate-400">&bull;</span>{' '}
                      <span className="text-lg">Spot {spot.label.split(' ')[1]}</span>
                    </p>
                    <p
                      className={classNames(
                        'mt-1 text-sm font-semibold',
                        isEmpty ? 'text-emerald-300' : 'text-rose-300'
                      )}
                      aria-live="polite"
                    >
                      {isEmpty ? 'Empty' : `Parked by ${spot.occupant}`}
                    </p>
                  </div>
                  {isMine ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-200">
                      ✅ Your spot
                    </span>
                  ) : null}
                </div>
                <p className="mt-auto text-xs uppercase tracking-wide text-slate-400">
                  Last updated {relative}
                </p>
                <div
                  className={classNames(
                    'mt-4 text-sm font-semibold',
                    isEmpty ? 'text-emerald-200' : 'text-rose-200'
                  )}
                >
                  {isBusy ? 'Saving…' : actionLabel}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {isNameDialogOpen ? (
        <NameDialog initialValue={currentUserName ?? ''} onSubmit={handleSetName} />
      ) : null}

      {loading ? (
        <div className="sr-only" role="status" aria-live="polite">
          Loading parking spots…
        </div>
      ) : null}
    </div>
  );
}
