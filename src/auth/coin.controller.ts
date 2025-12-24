// coin.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CoinService } from './coin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CoinTransactionDto,
  RewardDto,
  UnlockAchievementDto,
} from './dto/coin-transaction.dto';

@ApiTags('coins-rewards')
@Controller('coins')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoinController {
  constructor(private coinService: CoinService) {}

  // ==================== COIN BALANCE ====================

  @Get('balance')
  @ApiOperation({ 
    summary: 'Get user coin balance',
    description: 'Returns the current coin balance for the user (shown as "05" in header)'
  })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  async getBalance(@Request() req) {
    return this.coinService.getCoinBalance(req.user.id);
  }

  @Get('transactions')
  @ApiOperation({ 
    summary: 'Get coin transaction history',
    description: 'Returns list of all coin transactions'
  })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of transactions to fetch' })
  async getTransactions(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    return this.coinService.getCoinTransactions(req.user.id, limit);
  }

  // ==================== PROFILE COMPLETION REWARD ====================

  @Post('claim-profile-reward')
  @ApiOperation({ 
    summary: 'Claim 5 coins for completing profile 100%',
    description: 'Awards 5 coins when profile is 100% complete. Can only be claimed once.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Profile completion reward claimed - 5 coins awarded',
    schema: {
      example: {
        rewarded: true,
        coins: 5,
        newBalance: 5,
        message: 'Congratulations! You earned 5 coins for completing your profile!'
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile not complete or already rewarded',
    schema: {
      example: {
        rewarded: false,
        profileCompletion: 80,
        message: 'Profile 80% complete. Finish your profile to earn 5 coins!'
      }
    }
  })
  @HttpCode(HttpStatus.OK)
  async claimProfileReward(@Request() req) {
    return this.coinService.checkAndRewardProfileCompletion(req.user.id);
  }

  // ==================== ACHIEVEMENTS ====================

  @Get('achievements')
  @ApiOperation({ 
    summary: 'Get user achievements',
    description: 'Returns all unlocked achievements and coin rewards'
  })
  @ApiResponse({ status: 200, description: 'Achievements retrieved successfully' })
  async getAchievements(@Request() req) {
    return this.coinService.getUserAchievements(req.user.id);
  }

  @Post('achievements/unlock')
  @ApiOperation({ 
    summary: 'Unlock an achievement (internal use)',
    description: 'System endpoint to unlock achievements and award coins'
  })
  @ApiResponse({ status: 201, description: 'Achievement unlocked' })
  async unlockAchievement(
    @Request() req,
    @Body() dto: UnlockAchievementDto,
  ) {
    return this.coinService.unlockAchievement(req.user.id, dto);
  }

  // ==================== REWARDS ====================

  @Get('rewards')
  @ApiOperation({ 
    summary: 'Get available rewards',
    description: 'Returns list of rewards that can be redeemed with coins'
  })
  @ApiResponse({ status: 200, description: 'Rewards retrieved successfully' })
  async getRewards() {
    return this.coinService.getAvailableRewards();
  }

  @Post('rewards/redeem')
  @ApiOperation({ 
    summary: 'Redeem a reward',
    description: 'Use coins to redeem rewards like gift cards, vouchers, etc.'
  })
  @ApiResponse({ status: 201, description: 'Reward redeemed successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient coins' })
  @ApiResponse({ status: 404, description: 'Reward not found' })
  async redeemReward(@Request() req, @Body() dto: RewardDto) {
    return this.coinService.redeemReward(req.user.id, dto);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post('admin/add')
  @ApiOperation({ 
    summary: 'Add coins to user (admin only)',
    description: 'Manually add coins to a user account'
  })
  @ApiResponse({ status: 201, description: 'Coins added successfully' })
  async addCoins(
    @Request() req,
    @Body() dto: CoinTransactionDto,
  ) {
    // TODO: Add admin guard
    return this.coinService.addCoins(req.user.id, dto);
  }
}