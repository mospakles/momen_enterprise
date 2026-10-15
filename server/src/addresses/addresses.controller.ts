import { Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';

/** Address autocomplete for checkout, proxied through Google Places (New)
 * so the API key never reaches the browser. Without GOOGLE_PLACES_API_KEY
 * the endpoints answer 503 and checkout falls back to manual entry. */
@ApiTags('addresses')
@Public()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly config: ConfigService) {}

  private get key() {
    const key = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    if (!key) throw new ServiceUnavailableException('Address lookup is not configured');
    return key;
  }

  @Get('status')
  status() {
    return { enabled: Boolean(this.config.get<string>('GOOGLE_PLACES_API_KEY')) };
  }

  @Get('autocomplete')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async autocomplete(@Query('q') q = '', @Query('country') country = 'ng', @Query('session') session?: string) {
    const input = q.trim().slice(0, 120);
    if (input.length < 3) return { suggestions: [] };
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.key },
      body: JSON.stringify({
        input,
        includedRegionCodes: [country.toLowerCase().slice(0, 2)],
        ...(session ? { sessionToken: session.slice(0, 64) } : {}),
      }),
    });
    if (!res.ok) return { suggestions: [] };
    const data = (await res.json()) as {
      suggestions?: { placePrediction?: { placeId: string; text?: { text: string } } }[];
    };
    return {
      suggestions: (data.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 5)
        .map((p) => ({ id: p.placeId, label: p.text?.text ?? '' })),
    };
  }

  @Get('details')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async details(@Query('id') id = '', @Query('session') session?: string) {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}${session ? `?sessionToken=${encodeURIComponent(session)}` : ''}`,
      { headers: { 'X-Goog-Api-Key': this.key, 'X-Goog-FieldMask': 'addressComponents,formattedAddress' } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      addressComponents?: { longText: string; types: string[] }[];
    };
    const get = (type: string) => data.addressComponents?.find((c) => c.types.includes(type))?.longText ?? '';
    const street = [get('street_number'), get('route')].filter(Boolean).join(' ') || get('premise');
    return {
      address: street,
      city: get('locality') || get('sublocality') || get('administrative_area_level_2'),
      state: get('administrative_area_level_1').replace(/ State$/, ''),
      postalCode: get('postal_code'),
      country: get('country'),
    };
  }
}
