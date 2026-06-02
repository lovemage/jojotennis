import type { Metadata } from "next";
import LegalPageView from "@/components/LegalPageView";
import { DEFAULT_PRIVACY } from "@/lib/legalPageDefaults";

export const metadata: Metadata = {
  title: "隱私權政策｜揪揪網球",
  description:
    "揪揪網球（jojotennis.com）隱私權政策：說明本平台如何蒐集、使用、保護您的個人資料，以及您可以行使的權利。",
};

export default function PrivacyPolicyPage() {
  return <LegalPageView slug="privacy" initialContent={DEFAULT_PRIVACY} />;
}
