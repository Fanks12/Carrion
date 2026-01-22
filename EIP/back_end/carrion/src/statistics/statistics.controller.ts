import {
  Controller,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
  Param,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '@/auth/guards/jwt/jwt-auth.guard';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserStatistics(@Request() req) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return this.statisticsService.getStatistics(req.user.id);
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  async getOrganizationStatistics(@Param('userId') userId: string, @Request() req) {

    if (!req.user?.id) {
      throw new UnauthorizedException('User ID not found in request');
    }

    try {
      const result = await this.statisticsService.getStatistics(userId);
      return result;
    } catch (error) {
      console.error('Error in getOrganizationStatistics:', error);
      throw error;
    }
  }

  @Get('locations')
  @UseGuards(JwtAuthGuard)
  async getApplicationLocations(@Request() req) {
    if (!req.user?.id) {
      throw new UnauthorizedException('User ID not found in request');
    }
    return this.statisticsService.getApplicationLocations(req.user.id);
  }
}
