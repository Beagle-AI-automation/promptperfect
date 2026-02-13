import { hasServerKey } from '@/lib/providers';

export async function GET() {
  return Response.json({
    providers: {
      google: hasServerKey('google'),
    },
  });
}

