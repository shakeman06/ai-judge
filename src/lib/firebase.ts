import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import type {
  Submission,
  Judge,
  JudgeAssignment,
  Evaluation,
  EvaluationRun,
  RawSubmission,
} from "../types";

// ── Firebase init ─────────────────────────────────────────────────────────────
// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Collection refs ───────────────────────────────────────────────────────────
export const submissionsCol = collection(db, "submissions");
export const judgesCol = collection(db, "judges");
export const assignmentsCol = collection(db, "assignments");
export const evaluationsCol = collection(db, "evaluations");
export const runsCol = collection(db, "evaluationRuns");

// ── Submissions ───────────────────────────────────────────────────────────────
export async function importSubmissions(raw: RawSubmission[]): Promise<number> {
  const batch = writeBatch(db);
  const now = Date.now();
  for (const s of raw) {
    const ref = doc(db, "submissions", s.id);
    batch.set(ref, { ...s, importedAt: now });
  }
  await batch.commit();
  return raw.length;
}

export async function getSubmissions(queueId?: string): Promise<Submission[]> {
  const q = queueId
    ? query(submissionsCol, where("queueId", "==", queueId))
    : query(submissionsCol);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getQueues(): Promise<string[]> {
  const snap = await getDocs(submissionsCol);
  const ids = new Set<string>();
  snap.docs.forEach((d) => ids.add((d.data() as Submission).queueId));
  return Array.from(ids).sort();
}

// ── Judges ────────────────────────────────────────────────────────────────────
export async function getJudges(): Promise<Judge[]> {
  const snap = await getDocs(query(judgesCol, orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Judge));
}

export async function createJudge(
  data: Omit<Judge, "id" | "createdAt" | "updatedAt">
): Promise<Judge> {
  const now = Date.now();
  const ref = await addDoc(judgesCol, { ...data, createdAt: now, updatedAt: now });
  return { id: ref.id, ...data, createdAt: now, updatedAt: now };
}

export async function updateJudge(id: string, data: Partial<Judge>): Promise<void> {
  await updateDoc(doc(db, "judges", id), { ...data, updatedAt: Date.now() });
}

export async function deleteJudge(id: string): Promise<void> {
  await deleteDoc(doc(db, "judges", id));
}

// ── Assignments ───────────────────────────────────────────────────────────────
export async function getAssignments(queueId: string): Promise<JudgeAssignment[]> {
  const q = query(assignmentsCol, where("queueId", "==", queueId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as JudgeAssignment));
}

export async function upsertAssignment(
  queueId: string,
  questionTemplateId: string,
  judgeIds: string[]
): Promise<void> {
  const q = query(
    assignmentsCol,
    where("queueId", "==", queueId),
    where("questionTemplateId", "==", questionTemplateId)
  );
  const snap = await getDocs(q);
  const now = Date.now();
  if (snap.empty) {
    await addDoc(assignmentsCol, { queueId, questionTemplateId, judgeIds, updatedAt: now });
  } else {
    await updateDoc(snap.docs[0].ref, { judgeIds, updatedAt: now });
  }
}

// ── Evaluations ───────────────────────────────────────────────────────────────
export async function saveEvaluations(evals: Omit<Evaluation, "id">[]): Promise<void> {
  const batch = writeBatch(db);
  for (const e of evals) {
    const ref = doc(collection(db, "evaluations"));
    batch.set(ref, e);
  }
  await batch.commit();
}

export async function getEvaluations(filters?: {
  queueId?: string;
  judgeIds?: string[];
  questionTemplateIds?: string[];
  verdict?: string;
}): Promise<Evaluation[]> {
  let q = query(evaluationsCol);
  if (filters?.queueId) {
    q = query(q, where("queueId", "==", filters.queueId));
  }
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evaluation));

  // Client-side filters for arrays (Firestore limitation)
  if (filters?.judgeIds?.length) {
    results = results.filter((e) => filters.judgeIds!.includes(e.judgeId));
  }
  if (filters?.questionTemplateIds?.length) {
    results = results.filter((e) =>
      filters.questionTemplateIds!.includes(e.questionTemplateId)
    );
  }
  if (filters?.verdict) {
    results = results.filter((e) => e.verdict === filters.verdict);
  }
  return results;
}

// ── Evaluation Runs ───────────────────────────────────────────────────────────
export async function createRun(queueId: string, planned: number): Promise<string> {
  const ref = await addDoc(runsCol, {
    queueId,
    startedAt: Date.now(),
    status: "running",
    planned,
    completed: 0,
    failed: 0,
  });
  return ref.id;
}

export async function updateRun(
  id: string,
  data: Partial<EvaluationRun>
): Promise<void> {
  await updateDoc(doc(db, "evaluationRuns", id), data);
}
