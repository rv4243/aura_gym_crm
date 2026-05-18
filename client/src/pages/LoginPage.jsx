import { SignIn } from '@clerk/clerk-react';

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 32,
      padding: 20,
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 36, fontWeight: 800, color: 'var(--accent)',
          letterSpacing: 3, marginBottom: 6,
        }}>
          ⬡ AURA
        </div>
        <div style={{
          fontSize: 11, letterSpacing: 4, textTransform: 'uppercase',
          color: 'var(--text-muted)', fontWeight: 500,
        }}>
          Elite Fitness CRM
        </div>
        <div style={{
          marginTop: 12, fontSize: 14, color: 'var(--text-secondary)',
        }}>
          Sign in to access your dashboard
        </div>
      </div>

      {/* Clerk Sign-In component — styled via appearance prop */}
      <SignIn
        routing="hash"
        appearance={{
          variables: {
            colorPrimary: '#c8a96e',
            colorBackground: '#12121a',
            colorInputBackground: '#1a1a26',
            colorInputText: '#f0ede8',
            colorText: '#f0ede8',
            colorTextSecondary: '#8b8a9b',
            colorNeutral: '#6a6880',
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
          },
          elements: {
            card: {
              background: '#12121a',
              border: '1px solid rgba(200,169,110,0.15)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
              borderRadius: '16px',
            },
            headerTitle: { color: '#f0ede8', fontWeight: 700 },
            headerSubtitle: { color: '#8b8a9b' },
            formButtonPrimary: {
              background: '#c8a96e',
              color: '#0a0a0f',
              fontWeight: 600,
              '&:hover': { background: '#d4b87e' },
            },
            footerActionLink: { color: '#c8a96e' },
            dividerLine: { background: 'rgba(200,169,110,0.15)' },
            dividerText: { color: '#6a6880' },
          },
        }}
      />

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        Aura Gym CRM · Admin Access Only
      </p>
    </div>
  );
}
