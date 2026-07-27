import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgAuthGuard, type AuthedRequest } from '../auth/org-auth.guard.js';
import { RequirePermission } from '../auth/require-permission.js';
import {
  CancelBookingDto,
  CreateBookingDto,
  CreateCrewShiftDto,
  RebookDto,
  SignWaiverDto,
} from './bookings.dto.js';
import { BookingsService } from './bookings.service.js';

@Controller('org')
@UseGuards(OrgAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('bookings')
  @UseGuards(RequirePermission('trip:read'))
  async list(@Req() req: AuthedRequest) {
    const bookings = await this.bookings.list(req.orgContext!.orgId);
    return { generatedAt: new Date().toISOString(), bookings };
  }

  @Post('bookings')
  @UseGuards(RequirePermission('trip:write'))
  async create(@Req() req: AuthedRequest, @Body() body: CreateBookingDto) {
    try {
      const booking = await this.bookings.create(req.orgContext!.orgId, body);
      return { generatedAt: booking.createdAt, booking };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/booking',
        title: 'Booking failed',
        detail: err instanceof Error ? err.message : 'booking failed',
      });
    }
  }

  @Post('bookings/:id/confirm-deposit')
  @UseGuards(RequirePermission('trip:write'))
  async confirmDeposit(@Req() req: AuthedRequest, @Param('id') id: string) {
    try {
      const booking = await this.bookings.confirmDeposit(
        req.orgContext!.orgId,
        id,
      );
      return { generatedAt: new Date().toISOString(), booking };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/booking-deposit',
        title: 'Deposit confirm failed',
        detail: err instanceof Error ? err.message : 'confirm failed',
      });
    }
  }

  @Post('bookings/:id/cancel')
  @UseGuards(RequirePermission('trip:write'))
  async cancel(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: CancelBookingDto,
  ) {
    try {
      const booking = await this.bookings.cancel(
        req.orgContext!.orgId,
        id,
        body.reason,
      );
      return { generatedAt: new Date().toISOString(), booking };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/booking-cancel',
        title: 'Cancel failed',
        detail: err instanceof Error ? err.message : 'cancel failed',
      });
    }
  }

  @Post('bookings/:id/rebook')
  @UseGuards(RequirePermission('trip:write'))
  async rebook(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: RebookDto,
  ) {
    try {
      const result = await this.bookings.rebook(req.orgContext!.orgId, id, body);
      return { generatedAt: new Date().toISOString(), ...result };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/booking-rebook',
        title: 'Rebook failed',
        detail: err instanceof Error ? err.message : 'rebook failed',
      });
    }
  }

  @Post('waivers')
  @UseGuards(RequirePermission('trip:write'))
  async signWaiver(@Req() req: AuthedRequest, @Body() body: SignWaiverDto) {
    try {
      const waiver = await this.bookings.signWaiver(
        req.orgContext!.orgId,
        body,
      );
      return { generatedAt: waiver.signedAt, waiver };
    } catch (err) {
      throw new BadRequestException({
        type: 'https://troll.app/problems/waiver',
        title: 'Waiver failed',
        detail: err instanceof Error ? err.message : 'waiver failed',
      });
    }
  }

  @Get('crew/shifts')
  @UseGuards(RequirePermission('crew:read'))
  async listShifts(
    @Req() req: AuthedRequest,
    @Query('date') date?: string,
  ) {
    const shifts = await this.bookings.listCrewShifts(
      req.orgContext!.orgId,
      date,
    );
    return { generatedAt: new Date().toISOString(), shifts };
  }

  @Post('crew/shifts')
  @UseGuards(RequirePermission('crew:invite'))
  async createShift(
    @Req() req: AuthedRequest,
    @Body() body: CreateCrewShiftDto,
  ) {
    const shift = await this.bookings.scheduleCrew(req.orgContext!.orgId, body);
    return { generatedAt: shift.createdAt, shift };
  }
}
