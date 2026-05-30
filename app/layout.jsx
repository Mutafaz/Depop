import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import AuthWrapper from '@/components/AuthWrapper';

export const metadata = {
  title: 'Depop Profit Tracker',
  description: 'Track your Depop sales and profits.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthWrapper>
            {children}
          </AuthWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
