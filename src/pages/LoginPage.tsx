import { Redirect } from 'wouter'
import { useAuth } from 'react-oidc-context'

export default function LoginPage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return <p className="p-8 text-center text-gray-500">Cargando sesión...</p>
  }

  if (auth.isAuthenticated) {
    return <Redirect to="/dashboard" />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 text-center shadow">
        <h2 className="mb-2 text-xl font-bold">🔐 Inicio de sesión</h2>
        {auth.error && (
          <p className="mb-4 text-sm text-red-500">{auth.error.message}</p>
        )}
        <p className="mb-6 text-sm text-gray-500">
          Ingresa con el directorio de AWS Cognito.
        </p>
        <button
          onClick={() => auth.signinRedirect()}
          className="w-full rounded-md bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700"
        >
          Ingresar con Cognito
        </button>
      </div>
    </div>
  )
}
