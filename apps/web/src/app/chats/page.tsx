import { AppShell } from '@/components/AppShell';
import { ChatView } from './ChatView';

export default function ChatsPage() {
  return (
    <AppShell mainClassName="main--flush">
      <ChatView />
    </AppShell>
  );
}
