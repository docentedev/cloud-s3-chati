import { Redirect, Route, Switch } from 'wouter'
import { useAuth } from 'react-oidc-context'
import LoginPage from './pages/LoginPage.tsx'
import DashboardPage from './pages/DashboardPage.tsx'

// Raíz: recibe el callback de Cognito y deriva según sesión
function Home() {
  const auth = useAuth()
  if (auth.isLoading) {
    return <p className="p-8 text-center text-gray-500">Cargando sesión...</p>
  }
  return auth.isAuthenticated ? (
    <Redirect to="/dashboard" />
  ) : (
    <Redirect to="/login" />
  )
}

export default function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route>
        <Home />
      </Route>
    </Switch>
  )
}
