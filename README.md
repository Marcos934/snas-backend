# SNAS Backend

Sistema de notificações assíncronas desenvolvido em NestJS com RabbitMQ para processamento de mensagens em fila.

## Descrição do Sistema

O SNAS Backend é uma API REST que gerencia o envio e consulta de notificações através de um sistema de filas usando RabbitMQ. O sistema permite:

- **Envio de notificações**: Recebe mensagens via API e as envia para processamento assíncrono
- **Consulta de status**: Permite verificar o status de processamento das mensagens enviadas
- **Processamento assíncrono**: Utiliza RabbitMQ para garantir que as mensagens sejam processadas de forma confiável

## Requisitos

- **Node.js** 18+ 
- **Docker** e **Docker Compose**
- **npm** ou **yarn**

## Configuração e Execução

### 1. Clonar o repositório
```bash
git clone https://github.com/Marcos934/snas-backend
cd snas-backend
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Subir o RabbitMQ com Docker
```bash
docker-compose up -d
```

Isso irá inicializar:
- **RabbitMQ**: Porta 5672 (AMQP) e 15672 (Interface Web)
- **Credenciais**: admin/admin
- **Interface Web**: http://localhost:15672

### 4. Executar a aplicação

#### Desenvolvimento
```bash
npm run start:dev
```

#### Produção
```bash
npm run build
npm run start:prod
```

A API estará disponível em: **http://localhost:3000**

## Endpoints da API

### POST /api/notificar
Envia uma nova notificação para processamento.

**Body:**
```json
{
  "mensagemId": "550e8400-e29b-41d4-a716-446655440000",
  "conteudoMensagem": "Sua mensagem aqui"
}
```

**Resposta:**
```json
{
  "status": "success",
  "mensagemId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /api/notificar/status/:id
Consulta o status de processamento de uma mensagem.

**Parâmetros:**
- `id`: UUID da mensagem

**Resposta:**
```json
{
  "mensagemId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processando|concluido|erro",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Estrutura do Projeto

```
src/
├── gateway/           # Módulo principal da API
│   ├── dto/          # Data Transfer Objects
│   ├── gateway.controller.ts
│   ├── gateway.service.ts
│   └── gateway.module.ts
├── rabbitmq/         # Configuração do RabbitMQ
├── worker/           # Processadores de mensagens
│   └── notification/ # Worker de notificações
└── main.ts          # Ponto de entrada da aplicação
```

## Scripts Disponíveis

```bash
# Desenvolvimento com hot-reload
npm run start:dev

# Build para produção
npm run build

# Executar em produção
npm run start:prod
```

## 🎯 Fluxo Detalhado Passo a Passo

### 1. 📤 **Envio da Mensagem**
```
[Cliente] 
    ↓ POST /api/notificar
    ↓ { mensagemId: "uuid", conteudoMensagem: "texto" }
[GatewayController.notificar()]
    ↓ Valida dados (UUID v4, string não vazia)
[GatewayService.notificar()]
    ↓ Repassa para NotificationService
[NotificationService.notificar()]
    ↓ Chama RabbitMQ Service
[RabbitmqService.publish()]
    ↓ Publica na fila
[fila.notificacao.entrada.MULINARI]
```

**Resposta ao Cliente:**
```json
{
  "statusCode": 202,
  "success": true,
  "message": "Mensagem enviada para processamento com sucesso"
}
```

---

### 2. ⚙️ **Processamento Assíncrono**
```
[fila.notificacao.entrada.MULINARI]
    ↓ Consumer ativo (inicializado no onModuleInit)
[NotificationService.processarMensagem()]
    ↓ Simula processamento (3-4 segundos)
    ↓ Gera resultado aleatório (80% sucesso, 20% falha)
    ↓ Armazena status em memória (Map)
[NotificationService.publicarStatusProcessamento()]
    ↓ Publica resultado na fila de status
[fila.notificacao.status.MULINARI]
```

**Status Possíveis:**
- `PROCESSADO_SUCESSO` (80% dos casos)
- `FALHA_PROCESSAMENTO` (20% dos casos)
- `ERRO_PROCESSAMENTO` (em caso de exceção)

---

### 3. 🔍 **Consulta de Status**
```
[Cliente]
    ↓ GET /api/notificar/status/{uuid}
[GatewayController.getNotificar()]
    ↓ Valida UUID com ParseUUIDPipe
[GatewayService.consultaStatus()]
    ↓ Repassa para NotificationService
[NotificationService.consultaStatus()]
    ↓ Consulta Map em memória
    ↓ Retorna status ou "NAO_ENCONTRADO"
[Cliente recebe resposta]
```

**Resposta Típica:**
```json
{
  "mensagemId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSADO_SUCESSO",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## 🏗️ Arquitetura dos Componentes

### **Camada Gateway (API)**
- **GatewayController**: Endpoints REST
- **GatewayService**: Lógica de negócio da API
- **GatewayNotificationDto**: Validação de entrada

### **Camada Worker (Processamento)**
- **NotificationService**: Processamento assíncrono
- **NotificationDto**: Estrutura de dados interna

### **Camada Infraestrutura**
- **RabbitmqService**: Comunicação com RabbitMQ
- **Filas**: Entrada e status de mensagens

---
## Configurações

### CORS
A aplicação está configurada para aceitar requisições do frontend em `http://localhost:4200`.

### Validação
Todas as requisições são validadas automaticamente usando class-validator:
- `mensagemId`: Deve ser um UUID v4 válido
- `conteudoMensagem`: String obrigatória e não vazia

## Monitoramento

### RabbitMQ Management
Acesse http://localhost:15672 para monitorar:
- Filas de mensagens
- Conexões ativas
- Taxa de processamento
- Status geral do sistema

---


### RabbitMQ não conecta
- Verifique se o Docker está rodando
- Execute `docker-compose up -d` novamente
- Verifique se as portas 5672 e 15672 estão livres

### Erro de validação
- Certifique-se de que o `mensagemId` é um UUID v4 válido
- Verifique se `conteudoMensagem` não está vazio

### Aplicação não inicia
- Verifique se o Node.js 18+ está instalado
- Execute `npm install` novamente
- Verifique se a porta 3000 está livre
