// colleagues-job.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ColleaguesJobController } from './colleagues-job.controller';
import { ColleaguesJobService } from './colleagues-job.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/resumes',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `resume-${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit for resumes
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(pdf|doc|docx)$/)) {
          return cb(new Error('Only PDF, DOC, and DOCX files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  ],
  controllers: [ColleaguesJobController],
  providers: [ColleaguesJobService],
  exports: [ColleaguesJobService],
})
export class ColleaguesJobModule {}