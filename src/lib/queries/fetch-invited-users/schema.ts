import * as v from 'valibot';

export const InvitedUser = v.object({
  id: v.string(),
  email: v.string(),
  givenName: v.string(),
  familyName: v.string(),
  avatarUrl: v.string(),
  googleUserId: v.null(),
  labId: v.union([v.string(), v.null()]),
  labName: v.union([v.string(), v.null()]),
});
export type InvitedUser = v.InferOutput<typeof InvitedUser>;

export const FetchInvitedUsersResponse = v.array(InvitedUser);
export type FetchInvitedUsersResponse = v.InferOutput<typeof FetchInvitedUsersResponse>;
