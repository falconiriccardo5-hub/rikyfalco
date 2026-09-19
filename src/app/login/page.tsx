import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security/auth';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await currentUser().catch(() => null);
  if (user) redirect('/');

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
      <div className="panel p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet text-sm font-bold text-[#04060F]">
            R
          </span>
          <div>
            <p className="eyebrow">Riccardo</p>
            <h1 className="text-lg font-semibold">AI Content Orchestrator</h1>
          </div>
        </div>

        <p className="mt-6 text-sm text-secondary">
          Accedi per gestire i workflow, gli agenti e il gate di approvazione.
        </p>

        <LoginForm />
      </div>
    </div>
  );
}
