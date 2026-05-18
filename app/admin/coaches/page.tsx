import AdminModulePage from "@/components/AdminModulePage";

export default function Page() {
  return (
    <AdminModulePage
      title='教練管理'
      description='審核教練刊登與處理教練檢舉。'
      actions={['審核教練刊登', '下架教練資訊', '處理檢舉']}
    />
  );
}
