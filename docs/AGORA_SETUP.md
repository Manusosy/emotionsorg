# Agora Video/Audio Call Setup

This document provides instructions for setting up the Agora video and audio call functionality in the Emotions App.

## Environment Variables

The application uses the following environment variables for Agora integration:

- `VITE_AGORA_APP_ID`: Your Agora App ID
- `VITE_AGORA_APP_CERTIFICATE`: Your Agora App Certificate

## Setting Up Environment Variables

### Local Development

1. Create or update your `.env` file in the project root with the following variables:

```
VITE_AGORA_APP_ID=your_agora_app_id
VITE_AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

### Supabase Edge Functions

For the token generation function to work properly, you need to set up environment variables in your Supabase project:

#### Using the Deployment Script (Recommended)

We've created a script to automate the deployment process:

1. Make sure you have the Supabase CLI installed and logged in:
   ```
   npm install -g supabase
   supabase login
   ```

2. Run the deployment script:
   ```
   npm run deploy:agora
   ```

This script will:
- Deploy the `agora-token` function to your Supabase project
- Set up the necessary environment variables
- Verify the deployment was successful

#### Manual Setup

If you prefer to set up manually:

1. Deploy the function:
   ```
   supabase functions deploy agora-token
   ```

2. Set the environment variables:
   ```
   supabase secrets set AGORA_APP_ID=your_agora_app_id AGORA_APP_CERTIFICATE=your_agora_app_certificate
   ```

Alternatively, you can add these variables to the `supabase/config.toml` file:

```toml
[functions.agora-token.environment]
AGORA_APP_ID = "your_agora_app_id"
AGORA_APP_CERTIFICATE = "your_agora_app_certificate"
```

### Production Deployment

For production environments, ensure these variables are set in your hosting platform:

- For Vercel, add them in Project Settings > Environment Variables
- For other platforms, follow their specific instructions for environment variable configuration

## Testing the Integration

1. After setting up the environment variables, restart your development server
2. Navigate to an appointment session page
3. Attempt to start a video or audio call
4. Check the browser console for any errors related to token generation

You can also test the token generation function directly:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/agora-token" \
  -H "Content-Type: application/json" \
  -d '{"channelName":"test","uid":"123456"}'
```

## Troubleshooting

If you encounter issues with the video/audio calls:

1. Verify that your environment variables are correctly set
2. Check that the Supabase Edge Function `agora-token` is deployed
3. Examine browser console logs for specific error messages
4. Ensure your Agora account has sufficient quota and permissions

## Security Considerations

- Never expose your Agora App Certificate in client-side code
- Always generate tokens server-side (using the Supabase Edge Function)
- Use temporary tokens with appropriate expiration times
- Implement proper access control for your token generation endpoint 