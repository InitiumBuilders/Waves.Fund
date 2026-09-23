export type WaveRole = 'builder' | 'guide' | 'support' | 'admin';
export type WaveMember = { email: string; role: Exclude<WaveRole, 'admin'> };
export type WaveBrief = { mission: string; audience: string; needs: string };
export type WaveDraft = { title: string; story: string; guideName: string; guideBio: string; buildNotes: string; deliverableUrl: string };
export type WaveEngagement = {
  scope: string; fee: string; paymentSchedule: string; deliveryWindow: string;
  revisions: string; ownership: string; support: string;
  builderApprovedAt: string | null; guideApprovedAt: string | null;
};
export type WaveMove = {
  id: string; title: string; owner: string; needs: string; completion: string;
  status: 'open' | 'complete'; evidence: string; outcome: string;
};
export type WaveJourney = { id: string; title: string; body: string; evidence: string; created: string };
export type WaveOffer = {
  id: string; name: string; email: string; message: string; moveId: string;
  recognitionConsent: boolean; status: 'offered' | 'acknowledged' | 'agreed' | 'completed' | 'declined' | 'withdrawn';
  response: string; outcome: string; evidence: string; created: string; updated: string;
};
export type WavePass = {
  id: string; name: string; purpose: string; expires: string;
  status: 'invited' | 'accepted' | 'declined' | 'completed' | 'revoked' | 'expired';
  outcome: string; evidence: string; recognitionConsent: boolean; created: string; updated: string;
};
export type PublicWave = {
  id: string; slug: string; title: string; template: string; story: string;
  guideName: string; guideBio: string; currentMove: WaveMove;
  journey: WaveJourney[]; publishedAt: string;
  contributions: { name: string; outcome: string; evidence: string }[];
  carrying: { name: string; purpose: string; status: string; outcome: string; evidence: string }[];
};
export type WorkspaceWave = {
  id: string; slug: string; title: string; template: string; legacyApplicationId: string;
  version: number; status: 'draft' | 'review' | 'published' | 'paused';
  created: string; updated: string; members: WaveMember[];
  brief: WaveBrief; draft: WaveDraft; engagement: WaveEngagement;
  currentMove: WaveMove; journey: WaveJourney[];
  offers: WaveOffer[]; passes: WavePass[];
  published: PublicWave | null; pending: PublicWave | null;
  initialReviewAt: string | null; role?: WaveRole;
};
export type WorkspaceDetail = { wave: WorkspaceWave; role: WaveRole; roles: WaveRole[]; isAdmin: boolean };
export type WorkspaceList = { waves: WorkspaceWave[]; isAdmin: boolean; email: string };
export type WorkspaceConfig = { ready: boolean; message?: string };
export type WorkspaceAction =
  | { action: 'create'; title: string; slug: string; template?: string; builderEmail: string; guideEmail: string; legacyApplicationId?: string }
  | { action: 'update'; id: string; version: number; brief?: WaveBrief; draft?: WaveDraft; engagement?: Omit<WaveEngagement, 'builderApprovedAt' | 'guideApprovedAt'>; currentMove?: WaveMove; journey?: WaveJourney[] }
  | { action: 'approveEngagement'; id: string; version: number; as: 'builder' | 'guide' }
  | { action: 'publish'; id: string; version: number }
  | { action: 'review'; id: string; version: number; decision: 'approve' | 'return' }
  | { action: 'pause'; id: string; version: number }
  | { action: 'member'; id: string; version: number; email: string; role: WaveMember['role']; remove?: boolean }
  | { action: 'offer'; id: string; version: number; offerId: string; status: WaveOffer['status']; response: string; outcome: string; evidence: string }
  | { action: 'pass'; id: string; version: number; name: string; purpose: string; expires: string }
  | { action: 'passUpdate'; id: string; version: number; passId: string; status: 'completed' | 'revoked'; outcome: string; evidence: string };
export type WorkspaceMutationResult = WorkspaceDetail & { receipt?: string };
export type ReceiptResult = { kind: 'offer' | 'pass'; wave: { title: string; slug: string }; record: WaveOffer | WavePass; journey: WaveJourney[] };
