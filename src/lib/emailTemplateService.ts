import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export type EmailTemplate = {
  subject: string;
  greeting: string;
  body: string;
  ctaLabel: string;
};

export async function getEmailTemplate(key: string): Promise<EmailTemplate | null> {
  const snap = await getDoc(doc(db, "email_templates", key));
  if (!snap.exists()) return null;
  const data = snap.data() as Partial<EmailTemplate>;
  return {
    subject: String(data.subject ?? ""),
    greeting: String(data.greeting ?? ""),
    body: String(data.body ?? ""),
    ctaLabel: String(data.ctaLabel ?? ""),
  };
}

export async function saveEmailTemplate(
  key: string,
  data: EmailTemplate,
): Promise<void> {
  await setDoc(
    doc(db, "email_templates", key),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
