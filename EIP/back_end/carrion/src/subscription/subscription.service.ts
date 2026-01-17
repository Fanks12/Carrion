import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private getStripe(): Stripe {
    if (!this.stripe) {
      const stripeSecretKey =
        this.configService.get<string>('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        this.logger.error('STRIPE_SECRET_KEY is not configured');
        throw new InternalServerErrorException(
          'Stripe configuration is missing',
        );
      }
      this.stripe = new Stripe(stripeSecretKey);
    }
    return this.stripe;
  }

  async createCheckoutSession(userId: string, userEmail: string) {
    try {
      let subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        subscription = await this.prisma.subscription.create({
          data: {
            userId,
            status: 'INACTIVE',
          },
        });
      }

      let customerId = subscription.stripeCustomerId;
      const stripe = this.getStripe();

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });

        customerId = customer.id;

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const frontendUrl = this.configService.get<string>('FRONT');
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Carrion Premium',
                description: 'Accès premium complet',
              },
              recurring: { interval: 'month' },
              unit_amount: 399,
            },
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/subscription?success=true`,
        cancel_url: `${frontendUrl}/subscription?canceled=true`,
        metadata: { userId },

        subscription_data: {
          metadata: { userId },
        },
      });

      return { url: session.url };
    } catch (error) {
      this.logger.error('Error creating checkout session:', error);
      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const sub = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdate(sub);
          break;
        case 'customer.subscription.deleted':
          const subDeleted = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subDeleted);
          break;
        case 'customer.deleted':
          const customerDeleted = event.data
            .object as unknown as Stripe.DeletedCustomer;
          await this.handleCustomerDeleted(customerDeleted);
          break;
      }
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const subscriptionId = session.subscription as string;

    if (userId && subscriptionId) {
      const stripe = this.getStripe();
      const stripeSubscription =
        await stripe.subscriptions.retrieve(subscriptionId);
      await this.updateSubscriptionFromStripe(userId, stripeSubscription);
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    let userId = subscription.metadata?.userId;

    if (!userId) {
      const customerId = subscription.customer as string;
      const subRecord = await this.prisma.subscription.findUnique({
        where: { stripeCustomerId: customerId },
      });
      if (subRecord) userId = subRecord.userId;
    }

    if (userId) {
      await this.updateSubscriptionFromStripe(userId, subscription);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const subRecord = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (subRecord) {
      await this.prisma.subscription.update({
        where: { id: subRecord.id },
        data: {
          status: 'CANCELED',
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });
      this.logger.log(
        `Subscription deleted for user ${subRecord.userId}, but CustomerID kept.`,
      );
    }
  }

  private async updateSubscriptionFromStripe(
    userId: string,
    stripeSubscription: Stripe.Subscription,
  ) {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: 'ACTIVE',
      trialing: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'INACTIVE',
      incomplete: 'INACTIVE',
      incomplete_expired: 'INACTIVE',
      paused: 'INACTIVE',
    };

    const prismaStatus = statusMap[stripeSubscription.status] || 'INACTIVE';
    let stripePeriodEnd = (stripeSubscription as any).current_period_end;

    if (
      !stripePeriodEnd &&
      stripeSubscription.items?.data?.[0]?.current_period_end
    ) {
      stripePeriodEnd = stripeSubscription.items.data[0].current_period_end;
    }

    if (!stripePeriodEnd) {
      this.logger.error(
        `Didn't find a period end for subscription ${stripeSubscription.id}`,
      );
    }

    this.logger.log(`🔍 DEBUG FINAL - Date trouvée : ${stripePeriodEnd}`);

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        stripeSubscriptionId: stripeSubscription.id,
        status: prismaStatus,
        currentPeriodEnd: stripePeriodEnd
          ? new Date(stripePeriodEnd * 1000)
          : null,
      },
    });

    this.logger.log(
      `Updated subscription. Status: ${prismaStatus}, EndDate: ${stripePeriodEnd ? new Date(stripePeriodEnd * 1000).toISOString() : 'NULL'}`,
    );
  }

  async getSubscriptionStatus(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    return {
      status: subscription?.status || 'INACTIVE',
      hasSubscription: subscription?.status === 'ACTIVE',
      currentPeriodEnd: subscription?.currentPeriodEnd,
    };
  }

  async createPortalSession(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new InternalServerErrorException(
        'Aucun abonnement trouvé pour cet utilisateur',
      );
    }

    const frontendUrl = this.configService.get<string>('FRONT');
    const stripe = this.getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${frontendUrl}/subscription`,
    });

    return { url: session.url };
  }

  private async handleCustomerDeleted(customer: Stripe.DeletedCustomer) {
    const customerId = customer.id;

    const subRecord = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (subRecord) {
      await this.prisma.subscription.update({
        where: { id: subRecord.id },
        data: {
          status: 'INACTIVE',
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          stripeCustomerId: null,
        },
      });
      this.logger.log(
        `Customer deleted for user ${subRecord.userId}. Full reset.`,
      );
    }
  }
}
