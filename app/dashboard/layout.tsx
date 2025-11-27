import { DashboardLayout } from "@/components/page/dashboard-layout"
import { SearchHistoryProvider } from "@/context/search-history-context"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return( 
    <SearchHistoryProvider> 
      <DashboardLayout>{children}</DashboardLayout> 
    </SearchHistoryProvider>
  )
}
