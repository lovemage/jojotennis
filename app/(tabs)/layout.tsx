import Navbar from "@/components/Navbar";

export default function TabsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <main className="min-h-screen pb-24">{children}</main>
      <Navbar />
    </>
  );
}
