/**
 * Firestore Security Rules Test & Invariant Specification
 * Verifies all Dirty Dozen adversarial payloads against firestore.rules
 */
export interface DirtyDozenAssertion {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  expectedOutcome: 'PERMISSION_DENIED';
  reason: string;
}

export const DIRTY_DOZEN_ASSERTIONS: DirtyDozenAssertion[] = [
  {
    id: 1,
    name: 'Unverified Email Admin Spoof',
    operation: 'delete',
    path: '/users/staff_01',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isVerifiedUser() requires request.auth.token.email_verified == true'
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Escalation',
    operation: 'create',
    path: '/users/uid_attacker',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Non-admin self-registration strictly enforces incoming().role == shakha'
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Complaint',
    operation: 'create',
    path: '/complaints/cmp_1',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidComplaint enforces data.keys().hasOnly(...) rejecting ghost keys'
  },
  {
    id: 4,
    name: 'PII Blanket Scraping on Users',
    operation: 'get',
    path: '/users/other_uid',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'allow get on /users/{userId} requires isOwner(userId) || isAdmin()'
  },
  {
    id: 5,
    name: 'Cross-Mahashakha Document Read',
    operation: 'get',
    path: '/complaints/cmp_tech_01',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Mahashakha user can only read complaints matching their currentUserDoc().mahashakhaId'
  },
  {
    id: 6,
    name: 'Cross-Shakha Document Read',
    operation: 'get',
    path: '/complaints/cmp_lab_01',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'Shakha user can only read complaints matching their shakhaId or createdByUid'
  },
  {
    id: 7,
    name: 'ID Poisoning 2KB Path ID',
    operation: 'create',
    path: '/complaints/oversized_id',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidId enforces size <= 128 and alphanumeric regex'
  },
  {
    id: 8,
    name: 'Denial-of-Wallet String Overflow',
    operation: 'update',
    path: '/complaints/cmp_1',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidComplaint enforces title.size() <= 240'
  },
  {
    id: 9,
    name: 'Identity Spoofing on Create',
    operation: 'create',
    path: '/complaints/cmp_2',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'incoming().createdByUid == request.auth.uid strictly enforced'
  },
  {
    id: 10,
    name: 'Immutable Field Tampering',
    operation: 'update',
    path: '/complaints/cmp_1',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'incoming().createdAt == existing().createdAt && incoming().createdByUid == existing().createdByUid'
  },
  {
    id: 11,
    name: 'Forged Client Timestamp',
    operation: 'create',
    path: '/activities/act_1',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'incoming().createdAt == request.time enforced'
  },
  {
    id: 12,
    name: 'Value Poisoning on Update',
    operation: 'update',
    path: '/complaints/cmp_1',
    expectedOutcome: 'PERMISSION_DENIED',
    reason: 'isValidComplaint wraps allow update and enforces enum allowlist on status'
  }
];
