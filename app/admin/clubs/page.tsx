import AdminModulePage from "@/components/AdminModulePage";

export default function Page() {
  return (
    <AdminModulePage
      title='社團管理'
      description='查看社團與解散違規社團。'
      actions={['查看社團列表', '解散違規社團', '處理社團檢舉']}
    />
  );
}
