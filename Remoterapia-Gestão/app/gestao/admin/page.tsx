import { listarStaff } from '@/lib/actions/auth'
import AdminClient from './AdminClient'

export default async function AdminPainel() {
  const { data } = await listarStaff()
  const staffs = data || []

  return <AdminClient />
}


