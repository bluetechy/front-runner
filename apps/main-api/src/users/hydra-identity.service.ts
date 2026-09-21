import { Injectable, ServiceUnavailableException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class HydraIdentityService {
  constructor(private readonly config: ConfigService) {}
  async authenticate(value: string): Promise<{ loginName: string; expiresIn: number }> {
    if (!value || value.length > 4096) throw new BadRequestException('Invalid credentials input');
    const base = this.config.get<string>('HYDRA_BASE_URL');
    const namespace = this.config.get<string>('HYDRA_NAMESPACE');
    if (!base || !namespace) throw new ServiceUnavailableException('Login provider is not configured');
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, '')}/loginTokens?expand=whoami`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ namespace, type: 'base64', value }),
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
    } catch { throw new ServiceUnavailableException('Login provider is unavailable'); }
    if (response.status === 401 || response.status === 403) throw new UnauthorizedException('Invalid credentials');
    if (!response.ok) throw new ServiceUnavailableException('Login provider is unavailable');
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new ServiceUnavailableException('Invalid login provider response'); }
    const record = data as { employee?: { username?: unknown }; whoami?: { loginTokenSecondsLeft?: unknown } } | null;
    const loginName = record?.employee?.username;
    const expiresIn = record?.whoami?.loginTokenSecondsLeft;
    if (typeof loginName !== 'string' || !loginName || loginName.length > 64 ||
        typeof expiresIn !== 'number' || !Number.isInteger(expiresIn) || expiresIn <= 0) {
      throw new ServiceUnavailableException('Invalid login provider response');
    }
    return { loginName, expiresIn: Math.min(expiresIn, 86400) };
  }
}
