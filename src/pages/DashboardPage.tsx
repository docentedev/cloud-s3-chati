import { Redirect } from 'wouter'
import { useAuth } from 'react-oidc-context'

function decodeJwt(token: string) {
  return JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>
}

export default function DashboardPage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return <p className="p-8 text-center text-gray-500">Cargando sesión...</p>
  }

  if (!auth.isAuthenticated || !auth.user) {
    return <Redirect to="/login" />
  }

  const claims = auth.user.id_token
    ? decodeJwt(auth.user.id_token)
    : auth.user.profile
  const groups = (claims['cognito:groups'] as string[]) ?? []

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Sesión iniciada ✅</h2>
          <button
            onClick={() => auth.removeUser()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cerrar sesión
          </button>
        </div>
        <p className="mb-1">
          <strong>Email:</strong> {String(claims.email ?? '—')}
        </p>
        <p className="mb-1">
          <strong>Sub:</strong> {String(claims.sub ?? '—')}
        </p>
        <p className="mb-4">
          <strong>Grupos:</strong>{' '}
          {groups.length > 0 ? groups.join(', ') : 'Ninguno'}
        </p>
        <h3 className="mb-2 font-bold">Claims del id_token (JWT)</h3>
        <pre className="overflow-x-auto rounded-md bg-neutral-900 p-4 text-xs text-lime-400">
          {JSON.stringify(claims, null, 2)}
        </pre>
      </div>
    </div>
  )
}
