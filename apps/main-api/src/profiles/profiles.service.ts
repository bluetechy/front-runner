import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import { UserProfile } from "./profiles.model.js";
import type { ProfileInput } from "./profiles.schema.js";

@Injectable()
export class ProfilesService {
  constructor(private readonly db: DatabaseService) {}

  // A row comes back for any account that exists, edited or not: dbo.GetUserProfile
  // answers with empty fields rather than with nothing, which is what a first
  // visit to the profile page should see.
  async get(loginName: string) {
    const [profile] = await this.db.query<UserProfile>(
      'SELECT * FROM dbo."GetUserProfile"($1)',
      [loginName],
    );
    return profile ?? null;
  }

  // The login name comes from the verified token, never from the caller, so
  // this can only ever write the signed-in account's own profile.
  async set(loginName: string, profile: ProfileInput) {
    const [saved] = await this.db.query<UserProfile>(
      'SELECT * FROM dbo."SetUserProfile"($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
      [
        loginName,
        profile.FirstName,
        profile.LastName,
        profile.NickName,
        profile.Designation,
        profile.Biography,
        profile.Gender,
        profile.BirthDate,
        profile.Phone,
        profile.Address,
        profile.Facebook,
        profile.Github,
        profile.LinkedIn,
        profile.TikTok,
        profile.Twitter,
        profile.WantsAwardEmails,
        profile.WantsDigestEmails,
      ],
    );
    return saved ?? null;
  }
}
