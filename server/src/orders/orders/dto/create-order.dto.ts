import { ApiProperty } from '@nestjs/swagger';
import {
  DeliveryMethod,
  MeasurementUnit,
  PaymentMethod,
  ProductionSpeed,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class OrderAddressDto {
  @ApiProperty() @IsString() @MinLength(1) fullName!: string;
  @ApiProperty() @IsString() country!: string;
  @ApiProperty() @IsString() state!: string;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() address!: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apartment?: string;
  @ApiProperty() @IsString() postalCode!: string;
  @ApiProperty() @IsString() phone!: string;
}

class OrderItemMeasurementDto {
  @ApiProperty({ enum: ['profile', 'manual', 'pending'] })
  @IsIn(['profile', 'manual', 'pending'])
  mode!: 'profile' | 'manual' | 'pending';

  @ApiProperty({
    required: false,
    description: 'Required when mode is "profile"',
  })
  @IsOptional()
  @IsString()
  profileId?: string;

  @ApiProperty({
    required: false,
    description: 'Required when mode is "manual"',
  })
  @IsOptional()
  @IsObject()
  values?: Record<string, number>;

  @ApiProperty({ enum: MeasurementUnit })
  @IsEnum(MeasurementUnit)
  unit!: MeasurementUnit;
}

class CustomOrderDetailsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() fabricId?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryColor?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secondaryColor?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contrastColor?: string;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceNotes?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

class CreateOrderItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() size!: string;
  @ApiProperty() @IsString() color!: string;
  @ApiProperty() @IsInt() @Min(1) quantity!: number;

  @ApiProperty({ required: false, description: 'groupId -> choiceId' })
  @IsOptional()
  @IsObject()
  customizations?: Record<string, string>;

  @ApiProperty({ type: CustomOrderDetailsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomOrderDetailsDto)
  customOrder?: CustomOrderDetailsDto;

  @ApiProperty({ type: OrderItemMeasurementDto })
  @ValidateNested()
  @Type(() => OrderItemMeasurementDto)
  measurement!: OrderItemMeasurementDto;
}

export class CreateOrderDto {
  @ApiProperty({
    description:
      'Required for guest checkout; ignored (derived from the session) for logged-in customers',
  })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ type: OrderAddressDto })
  @ValidateNested()
  @Type(() => OrderAddressDto)
  address!: OrderAddressDto;

  @ApiProperty({ enum: ProductionSpeed })
  @IsEnum(ProductionSpeed)
  productionSpeed!: ProductionSpeed;

  @ApiProperty({
    enum: DeliveryMethod,
    required: false,
    description: 'Pickup is only accepted where the destination zone offers it',
  })
  @IsOptional()
  @IsEnum(DeliveryMethod)
  deliveryMethod?: DeliveryMethod;

  @ApiProperty({ enum: [PaymentMethod.card, PaymentMethod.transfer] })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  // deliveryFee/expressFee are no longer accepted from the client at all —
  // OrdersService resolves them itself from DeliveryZonesService, matched
  // against the destination country in `address`.

  @ApiProperty({
    required: false,
    description: 'Validated and priced server-side against live Coupon rules',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({
    required: false,
    description:
      'Applied up to its available balance; any remainder is still due via the payment provider',
  })
  @IsOptional()
  @IsString()
  giftCardCode?: string;

  @ApiProperty({
    required: false,
    description: 'Complimentary gift wrapping; recorded on the order as a customer-visible note',
  })
  @IsOptional()
  @IsBoolean()
  giftWrap?: boolean;

  @ApiProperty({ required: false, maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  giftMessage?: string;
}
