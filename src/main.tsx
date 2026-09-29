import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context'
import './index.css'
import App from './App.tsx'

const cognitoAuthConfig: AuthProviderProps = {
  authority: 'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_ZhTULhf5B',
  client_id: '4fm8oratn2rgup09trhbrdk3gd',
  redirect_uri: 'https://d3nchyae80v81y.cloudfront.net/',
  response_type: 'code',
  scope: 'email openid phone',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
