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
git clone <url-do-repositorio>
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

### Logs da Aplicação
Os logs são exibidos no console durante a execução e incluem:
- Requisições HTTP
- Erros de processamento
- Status das conexões com RabbitMQ

## Desenvolvimento

### Adicionando Novos Endpoints
1. Adicione métodos no `GatewayController`
2. Implemente a lógica no `GatewayService`
3. Crie DTOs para validação se necessário

### Adicionando Novos Workers
1. Crie um novo módulo em `src/worker/`
2. Implemente o processador de mensagens
3. Registre no módulo principal

## Troubleshooting

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
