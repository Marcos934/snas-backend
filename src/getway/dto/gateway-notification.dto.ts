import { IsNotEmpty, IsString, IsUUID, NotEquals } from 'class-validator';

export class GatewayNotificationDto {
    @IsUUID(4, { message: 'mensagemId deve ser um UUID v4 válido' })
    mensagemId: string;

    @IsString({ message: 'conteudoMensagem deve ser uma string' })
    @IsNotEmpty({ message: 'conteudoMensagem não pode ser vazio' })   
    @NotEquals('', { message: 'conteudoMensagem não pode ser vazio' })
    conteudoMensagem: string;
}