// src/static/static.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import express from 'express';
import { join } from 'path';

@Controller('uploads')
export class StaticController {
  @Get('profiles/:filename')
  getProfileImage(@Param('filename') filename: string, @Res() res: express.Response) {
    const filePath = join(process.cwd(), 'uploads', 'profiles', filename);
    return res.sendFile(filePath);
  }
}