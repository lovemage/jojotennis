import AdminModulePage from "@/components/AdminModulePage";

export default function Page() {
  return (
    <AdminModulePage
      title='球場管理'
      description='新增、編輯、刪除球場資料，並審核會員回報。'
      actions={['新增球場', '編輯既有球場', '刪除錯誤資料', '審核會員回報']}
    />
  );
}
