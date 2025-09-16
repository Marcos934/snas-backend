import { GatewayNotificationDto } from 'src/gateway/dto/gateway-notification.dto';
import { IsString, IsOptional } from 'class-validator';

export class NotificationDto extends GatewayNotificationDto {
    @IsString()
    @IsOptional()
    id?: string;
}
