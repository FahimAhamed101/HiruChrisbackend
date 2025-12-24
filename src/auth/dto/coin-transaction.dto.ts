// dto/coin-transaction.dto.ts
import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CoinTransactionType {
  PROFILE_COMPLETION = 'profile_completion',
  REFERRAL_BONUS = 'referral_bonus',
  SHIFT_COMPLETION = 'shift_completion',
  ACHIEVEMENT = 'achievement',
  DAILY_LOGIN = 'daily_login',
  REWARD_REDEMPTION = 'reward_redemption',
  ADMIN_CREDIT = 'admin_credit',
  ADMIN_DEBIT = 'admin_debit',
}

export class CoinTransactionDto {
  @ApiProperty({ 
    enum: CoinTransactionType,
    example: 'profile_completion',
    description: 'Type of coin transaction' 
  })
  @IsEnum(CoinTransactionType)
  type: CoinTransactionType;

  @ApiProperty({ example: 5, description: 'Amount of coins' })
  @IsNumber()
  amount: number;

  @ApiProperty({ 
    example: 'Profile completed 100%',
    description: 'Transaction description',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    example: { profileCompletion: 100 },
    description: 'Additional metadata',
    required: false 
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RewardDto {
  @ApiProperty({ example: 'reward-id', description: 'Reward ID to redeem' })
  @IsString()
  rewardId: string;
}

// dto/achievement.dto.ts
export enum AchievementType {
  PROFILE_MASTER = 'profile_master',
  FIRST_SHIFT = 'first_shift',
  WEEK_WARRIOR = 'week_warrior',
  MONTH_CHAMPION = 'month_champion',
  REFERRAL_KING = 'referral_king',
  PERFECT_ATTENDANCE = 'perfect_attendance',
}

export class UnlockAchievementDto {
  @ApiProperty({ 
    enum: AchievementType,
    example: 'profile_master',
    description: 'Type of achievement' 
  })
  @IsEnum(AchievementType)
  type: AchievementType;
}