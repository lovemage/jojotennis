import AdminModulePage from "@/components/AdminModulePage";

export default function Page() {
  return (
    <AdminModulePage
      title='待審核球場'
      description='核准、拒絕或修改後核准會員提交的球場資料。'
      actions={['核准球場', '拒絕資料', '修改後核准']}
    />
  );
}
