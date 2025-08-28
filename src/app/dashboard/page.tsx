import { redirect } from 'next/navigation'

export default function DashboardPage() {
  // Redirect to the friends tab by default
  redirect('/dashboard/friends')
}
