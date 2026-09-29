import { useEffect, useState } from 'react'
import { Redirect } from 'wouter'
import { useAuth } from 'react-oidc-context'

const API_BASE = 'https://yxpnxitdnh.execute-api.us-east-2.amazonaws.com'

type Producto = {
  id: number
  name: string
  price: number
  stock: number
}

function decodeJwt(token: string) {
  return JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>
}

function asList(data: unknown): Producto[] {
  if (Array.isArray(data)) return data as Producto[]
  if (data && typeof data === 'object') {
    for (const key of ['content', 'data', 'items']) {
      const v = (data as Record<string, unknown>)[key]
      if (Array.isArray(v)) return v as Producto[]
    }
  }
  return []
}

export default function DashboardPage() {
  const auth = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(false)
  const [errorApi, setErrorApi] = useState('')

  useEffect(() => {
    const token = auth.user?.id_token
    if (!auth.isAuthenticated || !token) return
    setCargando(true)
    setErrorApi('')
    fetch(`${API_BASE}/api/products`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => setProductos(asList(data)))
      .catch((e: Error) => setErrorApi(e.message))
      .finally(() => setCargando(false))
  }, [auth.isAuthenticated, auth.user?.id_token])

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
        <p className="mb-6">
          <strong>Grupos:</strong>{' '}
          {groups.length > 0 ? groups.join(', ') : 'Ninguno'}
        </p>

        <h3 className="mb-2 font-bold">Productos</h3>
        {cargando && <p className="text-sm text-gray-500">Cargando...</p>}
        {errorApi && <p className="text-sm text-red-500">Error: {errorApi}</p>}
        {!cargando && !errorApi && productos.length === 0 && (
          <p className="text-sm text-gray-500">Sin productos.</p>
        )}
        {productos.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-2">ID</th>
                <th className="py-2">Nombre</th>
                <th className="py-2">Precio</th>
                <th className="py-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.id}</td>
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.price}</td>
                  <td className="py-2">{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="mb-2 mt-6 font-bold">Claims del id_token (JWT)</h3>
        <pre className="overflow-x-auto rounded-md bg-neutral-900 p-4 text-xs text-lime-400">
          {JSON.stringify(claims, null, 2)}
        </pre>
      </div>
    </div>
  )
}
