import Link from "next/link";

type LoginPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LoginPromptModal({
  isOpen,
  onClose,
}: LoginPromptModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center bg-ink/50 p-4">
      <div className="mx-auto w-full max-w-md rounded-[1.5rem] bg-white p-5 shadow-lg">
        <h2 className="text-xl font-bold text-pine">請先登入</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          登入後即可使用揪球、社團、找教練等完整功能
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-pine px-4 py-3 text-sm font-bold text-pine"
          >
            繼續瀏覽
          </button>
          <Link
            href="/login"
            className="rounded-full bg-clay px-4 py-3 text-center text-sm font-bold text-white"
          >
            立即登入 / 註冊
          </Link>
        </div>
      </div>
    </div>
  );
}
