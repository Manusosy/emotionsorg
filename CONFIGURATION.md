# Configuration Guide

This document provides detailed information about the configuration settings and environment setup for the Emotions App. It is intended for developers who need to configure the application for development, testing, or production environments.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Environment Variables](#environment-variables)
- [Authentication Configuration](#authentication-configuration)
- [API Integration](#api-integration)
- [Development Configuration](#development-configuration)
- [Production Deployment](#production-deployment)
- [Service Mocking](#service-mocking)
- [Custom Configuration](#custom-configuration)

## Environment Setup

### Prerequisites

To run the Emotions App, you'll need:

- Node.js (v18+)
- npm or yarn
- Git

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/emotions-app.git
   cd emotions-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables) section)

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at http://localhost:8080 (or another port if 8080 is busy).

## Environment Variables

The application uses environment variables for configuration. In development, these can be defined in a `.env` file in the project root.

### Required Environment Variables

```
# Application
VITE_APP_NAME=Emotions App
VITE_PUBLIC_URL=http://localhost:8080

# Authentication (for production)
VITE_AUTH_PROVIDER=mock  # Options: mock, firebase, auth0, supabase
VITE_API_KEY=your_api_key
VITE_AUTH_DOMAIN=your_auth_domain

# API Services
VITE_API_BASE_URL=https://api.example.com
VITE_API_TIMEOUT=30000
```

### Optional Environment Variables

```
# Feature Flags
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_REAL_TIME_MESSAGING=false
VITE_ENABLE_EXPORT_FEATURES=true

# Theming
VITE_DEFAULT_THEME=light  # Options: light, dark, system

# Analytics
VITE_ANALYTICS_PROVIDER=none  # Options: none, ga, plausible, custom
VITE_ANALYTICS_ID=

# Debugging
VITE_DEBUG_MODE=false
VITE_API_MOCK=true  # Use mock services instead of real API
```

### Environment Variable Usage

Environment variables are accessed through the `import.meta.env` object in the application:

```typescript
// Example usage
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDebugMode = import.meta.env.VITE_DEBUG_MODE === 'true';
```

## Authentication Configuration

The application supports multiple authentication providers through a common interface. The configuration is determined by the `VITE_AUTH_PROVIDER` environment variable.

### Mock Authentication (Development)

For development, the application uses a mock authentication service with predetermined users:

- **Patient**: `user@example.com` / `password123`
- **Mood Mentor**: `mentor@example.com` / `password123`

No additional configuration is required for mock authentication.

### Firebase Authentication

To use Firebase Authentication:

1. Set environment variables:
   ```
   VITE_AUTH_PROVIDER=firebase
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   ```

2. Update the Firebase configuration in `src/config/firebase.config.ts`:
   ```typescript
   export const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID
   };
   ```

### Auth0 Configuration

To use Auth0:

1. Set environment variables:
   ```
   VITE_AUTH_PROVIDER=auth0
   VITE_AUTH0_DOMAIN=your_auth0_domain
   VITE_AUTH0_CLIENT_ID=your_auth0_client_id
   VITE_AUTH0_AUDIENCE=your_auth0_audience
   ```

2. Configure Auth0 roles to match the application's role structure:
   - `patient`
   - `mood_mentor`
   - `admin`

### Supabase Authentication

To use Supabase:

1. Set environment variables:
   ```
   VITE_AUTH_PROVIDER=supabase
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Create a Supabase project with the appropriate user tables and authentication settings

## API Integration

The application uses a service-based architecture to interact with backend APIs. All service implementations can be found in the `src/services` directory.

### Configuring API Endpoints

Update the following files to configure API endpoints:

1. `src/config/api.config.ts`:
   ```typescript
   export const apiConfig = {
     baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
     timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
     headers: {
       'Content-Type': 'application/json',
       'Accept': 'application/json',
     }
   };
   ```

2. For service-specific endpoints, modify the corresponding service implementation:
   ```typescript
   // src/services/user/user.service.ts
   private getEndpoints() {
     return {
       profile: `${this.baseUrl}/users/profile`,
       update: `${this.baseUrl}/users/update`,
       // Other endpoints...
     };
   }
   ```

### API Authentication

The application automatically includes authentication tokens in API requests. The token management is handled by the `AuthService` and injected into API requests through an interceptor.

To configure the token format:

1. Update `src/services/api/api.service.ts`:
   ```typescript
   private setAuthHeader(config: any) {
     const token = localStorage.getItem('authToken');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   }
   ```

## Development Configuration

### Vite Configuration

The application uses Vite for development and building. The configuration is defined in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8081,
    open: true,
  },
});
```

### TypeScript Configuration

TypeScript configuration is defined in `tsconfig.json` and extended in `tsconfig.app.json` and `tsconfig.node.json`.

Key settings include:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Tailwind Configuration

Tailwind CSS is configured in `tailwind.config.cjs`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Custom theme extensions...
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Other plugins...
  ],
}
```

## Production Deployment

### Build Configuration

To build the application for production:

```bash
npm run build
```

This creates a production-ready build in the `dist` directory.

### Environment-Specific Builds

For different environments (staging, production), use environment-specific `.env` files:

- `.env.production` - Production settings
- `.env.staging` - Staging settings

To use a specific environment:

```bash
npm run build -- --mode staging
```

## Service Mocking

The application uses mock services for development. Each service has a mock implementation that simulates backend functionality.

### Configuring Mock Data

Mock data is defined within each service implementation:

```typescript
// src/services/mood-mentor/mood-mentor.service.ts
private mockMoodMentors: MoodMentor[] = [
  {
    id: '1',
    name: 'Dr. Sophie Chen',
    specialization: 'Anxiety & Depression',
    qualification: 'Ph.D. Clinical Psychology',
    rating: 4.9,
    reviews: 124,
    avatar_url: 'https://i.pravatar.cc/150?img=1',
    about: 'Specializing in cognitive behavioral therapy...',
    // Other fields...
  },
  // More mock data...
];
```

### Switching Between Mock and Real Services

The application can toggle between mock and real services using the `VITE_API_MOCK` environment variable:

```typescript
// src/services/index.ts
import { MockAuthService, ApiAuthService } from './auth';
import { MockUserService, ApiUserService } from './user';
// Other service imports...

const useMockServices = import.meta.env.VITE_API_MOCK === 'true';

export const authService = useMockServices 
  ? new MockAuthService() 
  : new ApiAuthService();

export const userService = useMockServices
  ? new MockUserService()
  : new ApiUserService();

// Other service exports...
```

## Custom Configuration

### Adding Custom Environment Variables

To add custom environment variables:

1. Add the variable to your `.env` file:
   ```
   VITE_CUSTOM_FEATURE_FLAG=true
   ```

2. Add type definition in `src/vite-env.d.ts`:
   ```typescript
   /// <reference types="vite/client" />

   interface ImportMetaEnv {
     readonly VITE_APP_NAME: string;
     readonly VITE_API_BASE_URL: string;
     // Add your custom variable
     readonly VITE_CUSTOM_FEATURE_FLAG: string;
   }

   interface ImportMeta {
     readonly env: ImportMetaEnv;
   }
   ```

3. Use the variable in your code:
   ```typescript
   const isFeatureEnabled = import.meta.env.VITE_CUSTOM_FEATURE_FLAG === 'true';
   ```

### Feature Flags

The application supports feature flags for enabling/disabling specific features:

```typescript
// src/config/features.config.ts
export const featureFlags = {
  enableNotifications: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  enableRealTimeMessaging: import.meta.env.VITE_ENABLE_REAL_TIME_MESSAGING === 'true',
  enableExportFeatures: import.meta.env.VITE_ENABLE_EXPORT_FEATURES !== 'false', // Default to true
};
```

Usage:

```typescript
import { featureFlags } from '@/config/features.config';

if (featureFlags.enableNotifications) {
  // Initialize notification system
}
```

### Theming Configuration

The application supports theming through the `next-themes` package:

```typescript
// src/config/theme.config.ts
export const themeConfig = {
  defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'system',
  themes: ['light', 'dark', 'system'],
};
```

Theme configuration is applied in `src/app/providers/ThemeProvider.tsx`. 