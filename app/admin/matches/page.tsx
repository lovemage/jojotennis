import AdminModulePage from "@/components/AdminModulePage";

export default function Page() {
  return (
    <AdminModulePage
      title='約球管理'
      description='查看與刪除不當約球內容。'
      actions={['查看約球邀請', '刪除不當內容', '處理檢舉']}
    />
  );
}
