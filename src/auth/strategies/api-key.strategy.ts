import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-header-strategy';
import { AuthService } from '../auth.service';
import { CryptoService } from '../../crypto/crypto.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    private readonly authService: AuthService,
    private readonly crypto: CryptoService,
  ) {
    super({ header: 'X-API-Key' });
  }

  async validate(apiKey: string) {
    const keyHash = this.crypto.sha256(apiKey);
    const result = await this.authService.validateApiKey(keyHash);
    if (!result) throw new UnauthorizedException('Invalid API key');
    return result;
  }
}
