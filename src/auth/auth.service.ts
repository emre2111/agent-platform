import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-events';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly crypto: CryptoService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.db.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    const tokens = this.issueTokens(user.id, user.email);

    // Auth events use the user's own ID as both actor and target.
    // workspaceId is empty string — the user has no workspace yet.
    // This is the one exception to the "always have a workspaceId" rule.
    await this.audit.log({
      workspaceId: null,
      actorId: user.id,
      action: AuditAction.USER_REGISTERED,
      targetId: user.id,
      metadata: { email: dto.email },
    });

    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email },
    });

    const passwordValid = user?.passwordHash
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;

    if (!user || !passwordValid) {
      // Log failed attempt — no actorId available, use nil UUID
      await this.audit.log({
        workspaceId: null,
        actorId: null,
        action: AuditAction.USER_LOGIN_FAILED,
        metadata: { email: dto.email },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.issueTokens(user.id, user.email);

    await this.audit.log({
      workspaceId: null,
      actorId: user.id,
      action: AuditAction.USER_LOGGED_IN,
      targetId: user.id,
    });

    return tokens;
  }

  async refresh(refreshToken: string) {
    const payload = this.jwt.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    return this.issueTokens(payload.sub, payload.email);
  }

  async validateApiKey(keyHash: string) {
    const apiKey = await this.db.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });
    if (!apiKey || apiKey.revokedAt) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    await this.db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    return {
      userId: apiKey.userId,
      scopes: apiKey.scopes,
      workspaceId: apiKey.workspaceId,
    };
  }

  private issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    };
  }
}
