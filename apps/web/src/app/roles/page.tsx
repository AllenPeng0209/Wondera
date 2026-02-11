import { AppShell } from '@/components/AppShell';
import { Topbar } from '@/components/Topbar';
import { RoleBoard } from '@/components/RoleBoard';
import { getRoles } from '@/lib/api';

export default async function RolesPage() {
  const roles = await getRoles();
  return (
    <AppShell>
      <Topbar />
      <RoleBoard roles={roles} />
    </AppShell>
  );
}
