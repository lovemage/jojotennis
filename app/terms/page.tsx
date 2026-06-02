import type { Metadata } from "next";
import LegalPageView from "@/components/LegalPageView";
import { DEFAULT_TERMS } from "@/lib/legalPageDefaults";

export const metadata: Metadata = {
  title: "服務條款｜揪揪網球",
  description:
    "揪揪網球（jojotennis.com）服務條款：說明使用本平台找球場、揪球友、社團、教練等服務的權利義務，並提供揪球友的防詐騙宣導。",
};

export default function TermsOfServicePage() {
  return <LegalPageView slug="terms" initialContent={DEFAULT_TERMS} />;
}
