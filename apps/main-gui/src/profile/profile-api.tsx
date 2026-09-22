import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "../authentication";
import { profileSchema, type Profile } from "./profile-schema";

/*
 * The signed-in person's profile, read once and shared.
 *
 * Both the rail and the profile page want it -- the rail shows the
 * designation under the name -- so it is fetched by the provider the `_app`
 * route mounts rather than by each of them. A save updates what is held here,
 * which is what makes the rail change the moment the form is submitted.
 */

/* Every field of it, in one place: the query and the mutation ask for the
 * same selection, so a field added to the profile is added once here. */
const PROFILE_FIELDS = `UserUUID FirstName LastName NickName Designation
  Biography Language Gender BirthDate Phone Address Twitter Facebook
  LinkedIn Github WantsAwardEmails WantsDigestEmails`;

const READ = `query Profile { profile { ${PROFILE_FIELDS} } }`;

const WRITE = `mutation UpdateProfile($profile: UserProfileInput!) {
  updateProfile(profile: $profile) { ${PROFILE_FIELDS} }
}`;

/* What comes back: the profile, and the account it belongs to. */
export interface StoredProfile extends Profile {
  UserUUID: string;
}

interface ProfileState {
  profile: StoredProfile | null;
  /* True until the first answer arrives, so the form can wait rather than
   * seeding itself from empties and overwriting them a moment later. */
  loading: boolean;
  error: string | null;
  save: (profile: Profile) => Promise<StoredProfile>;
}

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { status, getAccessToken } = useSession();
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async <Result,>(
      query: string,
      variables: Record<string, unknown>,
    ): Promise<Result> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session has expired. Sign in again.");

      const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });
      const body = (await response.json()) as {
        data?: Record<string, Result | null>;
        errors?: { message: string }[];
      };
      /* The API answers 200 with an errors array, so the status says nothing;
       * the first message is the one worth showing. */
      if (body.errors?.length) throw new Error(body.errors[0]!.message);
      const [result] = Object.values(body.data ?? {});
      if (result === undefined || result === null)
        throw new Error("The API returned no profile.");
      return result;
    },
    [getAccessToken],
  );

  useEffect(() => {
    if (status !== "signed-in") return;
    let cancelled = false;

    call<StoredProfile>(READ, {})
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch((failure: unknown) => {
        if (!cancelled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not reach the API.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, call]);

  const save = useCallback(
    async (edited: Profile) => {
      /* Parsed rather than sent as typed: the schema trims, and what is sent
       * should be what was validated. The API checks it again regardless. */
      const saved = await call<StoredProfile>(WRITE, {
        profile: profileSchema.parse(edited),
      });
      setProfile(saved);
      setError(null);
      return saved;
    },
    [call],
  );

  const value = useMemo(
    () => ({ profile, loading, error, save }),
    [profile, loading, error, save],
  );

  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): ProfileState {
  const state = use(ProfileContext);
  if (!state)
    throw new Error("useProfile must be used inside a ProfileProvider");
  return state;
}
