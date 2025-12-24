// coin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CoinTransactionDto,
  CoinTransactionType,
  RewardDto,
  UnlockAchievementDto,
  AchievementType,
} from './dto/coin-transaction.dto';

@Injectable()
export class CoinService {
  constructor(private prisma: PrismaService) {}

  // ==================== COIN MANAGEMENT ====================

  async getCoinBalance(userId: string) {
    const wallet = await this.prisma.coinWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      // Create wallet if doesn't exist
      const newWallet = await this.prisma.coinWallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
      return { balance: newWallet.balance };
    }

    return { balance: wallet.balance };
  }

  async addCoins(userId: string, dto: CoinTransactionDto) {
    // Get or create wallet
    let wallet = await this.prisma.coinWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.coinWallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    // Create transaction
    const transaction = await this.prisma.coinTransaction.create({
      data: {
        userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        metadata: dto.metadata as any,
      },
    });

    // Update wallet balance
    const updatedWallet = await this.prisma.coinWallet.update({
      where: { userId },
      data: {
        balance: { increment: dto.amount },
      },
    });

    return {
      message: `${dto.amount} coins added successfully`,
      transaction,
      newBalance: updatedWallet.balance,
    };
  }

  async deductCoins(userId: string, amount: number, description: string) {
    const wallet = await this.prisma.coinWallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < amount) {
      throw new BadRequestException('Insufficient coin balance');
    }

    // Create transaction
    const transaction = await this.prisma.coinTransaction.create({
      data: {
        userId,
        type: CoinTransactionType.REWARD_REDEMPTION,
        amount: -amount,
        description,
      },
    });

    // Update wallet balance
    const updatedWallet = await this.prisma.coinWallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
      },
    });

    return {
      message: `${amount} coins deducted successfully`,
      transaction,
      newBalance: updatedWallet.balance,
    };
  }

  async getCoinTransactions(userId: string, limit: number = 50) {
    const transactions = await this.prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      metadata: t.metadata,
      createdAt: t.createdAt,
    }));
  }

  // ==================== PROFILE COMPLETION REWARD ====================

  async checkAndRewardProfileCompletion(userId: string) {
    // Check if already rewarded
    const existingReward = await this.prisma.coinTransaction.findFirst({
      where: {
        userId,
        type: CoinTransactionType.PROFILE_COMPLETION,
      },
    });

    if (existingReward) {
      return {
        alreadyRewarded: true,
        message: 'Profile completion reward already claimed',
      };
    }

    // Calculate profile completion
    const profileCompletion = await this.calculateProfileCompletion(userId);

    if (profileCompletion >= 100) {
      // Award 5 coins
      const reward = await this.addCoins(userId, {
        type: CoinTransactionType.PROFILE_COMPLETION,
        amount: 5,
        description: 'Profile completed 100%',
        metadata: { profileCompletion: 100 },
      });

      // Unlock achievement
      await this.unlockAchievement(userId, {
        type: AchievementType.PROFILE_MASTER,
      });

      return {
        rewarded: true,
        coins: 5,
        newBalance: reward.newBalance,
        message: 'Congratulations! You earned 5 coins for completing your profile!',
      };
    }

    return {
      rewarded: false,
      profileCompletion,
      message: `Profile ${profileCompletion}% complete. Finish your profile to earn 5 coins!`,
    };
  }

  // ==================== ACHIEVEMENT SYSTEM ====================

  async unlockAchievement(userId: string, dto: UnlockAchievementDto) {
    // Check if already unlocked
    const existing = await this.prisma.achievement.findFirst({
      where: {
        userId,
        type: dto.type,
      },
    });

    if (existing) {
      return {
        message: 'Achievement already unlocked',
        achievement: existing,
      };
    }

    // Get achievement details
    const achievementInfo = this.getAchievementInfo(dto.type);

    // Create achievement
    const achievement = await this.prisma.achievement.create({
      data: {
        userId,
        type: dto.type,
        title: achievementInfo.title,
        description: achievementInfo.description,
        coinReward: achievementInfo.coinReward,
        icon: achievementInfo.icon,
      },
    });

    // Award coins if applicable
    if (achievementInfo.coinReward > 0) {
      await this.addCoins(userId, {
        type: CoinTransactionType.ACHIEVEMENT,
        amount: achievementInfo.coinReward,
        description: `Achievement unlocked: ${achievementInfo.title}`,
        metadata: { achievementType: dto.type },
      });
    }

    return {
      message: 'Achievement unlocked!',
      achievement,
      coinsEarned: achievementInfo.coinReward,
    };
  }

  async getUserAchievements(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });

    return achievements;
  }

  // ==================== REWARDS & REDEMPTION ====================

  async getAvailableRewards() {
    // Mock rewards - in production, fetch from database
    return [
      {
        id: 'reward-1',
        title: 'Free Coffee Voucher',
        description: 'Redeem for a free coffee at partner locations',
        cost: 10,
        icon: '☕',
        available: true,
      },
      {
        id: 'reward-2',
        title: '$5 Gift Card',
        description: 'Amazon gift card worth $5',
        cost: 50,
        icon: '🎁',
        available: true,
      },
      {
        id: 'reward-3',
        title: 'Premium Badge',
        description: 'Show off your premium status',
        cost: 100,
        icon: '⭐',
        available: true,
      },
    ];
  }

  async redeemReward(userId: string, dto: RewardDto) {
    const rewards = await this.getAvailableRewards();
    const reward = rewards.find(r => r.id === dto.rewardId);

    if (!reward) {
      throw new NotFoundException('Reward not found');
    }

    const wallet = await this.prisma.coinWallet.findUnique({
      where: { userId },
    });

    if (!wallet || wallet.balance < reward.cost) {
      throw new BadRequestException(
        `Insufficient coins. You need ${reward.cost} coins but have ${wallet?.balance || 0}`,
      );
    }

    // Deduct coins
    await this.deductCoins(userId, reward.cost, `Redeemed: ${reward.title}`);

    // Create redemption record
    const redemption = await this.prisma.rewardRedemption.create({
      data: {
        userId,
        rewardId: dto.rewardId,
        rewardTitle: reward.title,
        coinsCost: reward.cost,
        status: 'pending',
      },
    });

    return {
      message: 'Reward redeemed successfully!',
      redemption: {
        id: redemption.id,
        reward: reward.title,
        cost: reward.cost,
        status: redemption.status,
      },
    };
  }

  // ==================== HELPER METHODS ====================

 private async calculateProfileCompletion(userId: string): Promise<number> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }, // Changed from Profile to profile
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  let completion = 0;
  const totalFields = 10;

  // Basic info (4 fields)
  if (user.fullName) completion += 10;
  if (user.email && user.isVerified) completion += 10;
  if (user.phoneNumber) completion += 10;
  if (user.profileImage) completion += 10;

  if (user.profile) { // Changed from Profile to profile
    // Profile details (6 fields)
    if (user.profile.bio) completion += 10; // Changed from Profile to profile
    if (user.profile.dateOfBirth) completion += 10; // Changed from Profile to profile
    if (user.profile.gender) completion += 10; // Changed from Profile to profile
    if (user.profile.location) completion += 10; // Changed from Profile to profile
    if (user.profile.interests && user.profile.interests.length > 0) completion += 10; // Changed from Profile to profile
    
    // Check if has social media or companies
    const hasSocialMedia = await this.prisma.socialMedia.count({
      where: { profileId: user.profile.id }, // Changed from Profile to profile
    });
    const hasCompanies = await this.prisma.company.count({
      where: { profileId: user.profile.id }, // Changed from Profile to profile
    });
    
    if (hasSocialMedia > 0 || hasCompanies > 0) completion += 10;
  }

  return Math.min(completion, 100);
}

  private getAchievementInfo(type: AchievementType) {
    const achievements = {
      [AchievementType.PROFILE_MASTER]: {
        title: 'Profile Master',
        description: 'Completed your profile 100%',
        coinReward: 5,
        icon: '⭐',
      },
      [AchievementType.FIRST_SHIFT]: {
        title: 'First Shift',
        description: 'Completed your first shift',
        coinReward: 10,
        icon: '🎉',
      },
      [AchievementType.WEEK_WARRIOR]: {
        title: 'Week Warrior',
        description: 'Worked 5 days in a week',
        coinReward: 15,
        icon: '💪',
      },
      [AchievementType.MONTH_CHAMPION]: {
        title: 'Month Champion',
        description: 'Worked full month',
        coinReward: 50,
        icon: '🏆',
      },
      [AchievementType.REFERRAL_KING]: {
        title: 'Referral King',
        description: 'Referred 10 colleagues',
        coinReward: 25,
        icon: '👑',
      },
      [AchievementType.PERFECT_ATTENDANCE]: {
        title: 'Perfect Attendance',
        description: 'No missed shifts in a month',
        coinReward: 30,
        icon: '✨',
      },
    };

    return achievements[type] || {
      title: 'Achievement',
      description: 'You earned an achievement',
      coinReward: 0,
      icon: '🎖️',
    };
  }
}