# Security Specification — National Vigilance Centre IMS (NVC-IMS)

## 1. Data Invariants & Master Source of Truth
1. **Identity & Role Source of Truth**: User RBAC assignments (`role`, `mahashakhaId`, `shakhaId`, `status`) live in `/users/{uid}`. The bootstrapped primary administrator (`vigilancenepal@gmail.com` with `email_verified == true`) or any active user whose `/users/{uid}` document has `role == 'admin'` and `status == 'active'` holds Tier-1 Admin privileges.
2. **No Self-Privilege Escalation**: Non-admin users cannot self-assign `role == 'admin'` or `role == 'mahashakha'` unless bootstrapped; non-admins cannot alter their own `role`, `status`, `mahashakhaId`, or `shakhaId` after profile creation (except Admin or Demo Role Switcher explicitly restricted to bootstrapped owner/admin).
3. **3-Level RBAC Enforcement**:
   - **Admin (`role == 'admin'`)**: Can read/write all `/users`, `/complaints`, and `/activities`.
   - **Mahashakha (`role == 'mahashakha'`)**: Can read/list `/complaints` and `/activities` only when `resource.data.mahashakhaId` matches their assigned `mahashakhaId`.
   - **Shakha (`role == 'shakha'`)**: Can read/list `/complaints` and `/activities` only when `resource.data.shakhaId` matches their assigned `shakhaId` or `resource.data.createdByUid == request.auth.uid`.
4. **PII Isolation**: `/users/{userId}` contains staff `email` and `fullName`. Read/get/list on `/users` is strictly restricted to `isOwner(userId)` or `isAdmin()`. Blanket `isSignedIn()` reads on `/users` are strictly prohibited.
5. **Temporal & Immutable Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time`; `createdByUid` must equal `request.auth.uid` on creation and remain immutable on update.

## 2. The "Dirty Dozen" Payloads (Adversarial Break Attempts)
1. **Payload 1 (Unverified Email Admin Spoof)**: Authenticated user with `email: "vigilancenepal@gmail.com"` and `email_verified: false` attempting `delete /users/staff_01` -> `PERMISSION_DENIED`.
2. **Payload 2 (Self-Assigned Admin Escalation)**: New user `uid_attacker` creating `/users/uid_attacker` with `role: "admin"` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on Complaint)**: Creating `/complaints/cmp_1` with required keys plus `"isApprovedByChief": true` -> `PERMISSION_DENIED` (`hasOnly` check).
4. **Payload 4 (PII Blanket Scraping on Users)**: Authenticated `shakha` user executing `get /users/other_uid` or `list /users` -> `PERMISSION_DENIED`.
5. **Payload 5 (Cross-Mahashakha Data Leak)**: User in `maha_police` querying `list /complaints` for `mahashakhaId == 'maha_tech'` -> `PERMISSION_DENIED`.
6. **Payload 6 (Cross-Shakha Data Leak)**: User in `shakha_it` querying `list /complaints` for `shakhaId == 'shakha_lab'` -> `PERMISSION_DENIED`.
7. **Payload 7 (ID Poisoning / 2KB Path ID)**: Creating `/complaints/<2000-char-junk-id>` -> `PERMISSION_DENIED` (`isValidId` check).
8. **Payload 8 (Denial-of-Wallet String Overflow)**: Updating `title` on `/complaints/cmp_1` with a 50,000-character string -> `PERMISSION_DENIED` (`title.size() <= 240`).
9. **Payload 9 (Identity Spoofing on Create)**: Creating `/complaints/cmp_2` with `createdByUid: "someone_else_uid"` -> `PERMISSION_DENIED`.
10. **Payload 10 (Immutable Field Tampering)**: Updating `/complaints/cmp_1` with modified `createdAt` or `createdByUid` -> `PERMISSION_DENIED`.
11. **Payload 11 (Forged Client Timestamp)**: Creating `/activities/act_1` with `createdAt` set to past date `2020-01-01T00:00:00Z` instead of `request.time` -> `PERMISSION_DENIED`.
12. **Payload 12 (Value Poisoning on Update)**: Updating `status` on `/complaints/cmp_1` to `"hacked_status"` -> `PERMISSION_DENIED` (`isValidComplaint` enum check wraps `allow update`).
