import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET || '123456',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}