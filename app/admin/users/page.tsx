import AdminModulePage from "@/components/AdminModulePage";

export default function Page() {
  return (
    <AdminModulePage
      title='會員管理'
      description='查看會員、停權帳號與編輯基本資料。'
      actions={['查看會員列表', '停權違規會員', '編輯會員資料']}
    />
  );
}
