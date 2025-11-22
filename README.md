# 🏮 Sistema de Iluminação Pública

Sistema para reporte de problemas de iluminação pública.

## 🎯 Objetivos

- Reporte de problemas de iluminação pública com geolocalização
- Painel administrativo para visualizar e gerenciar ocorrências
- Mapa interativo com marcadores de status
- Persistência de dados

## 🔧 Stack Técnico

- **Backend**: Node.js 18 + Express
- **Database**: SQLite
- **Frontend**: HTML5 + CSS3 + Leaflet Maps
- **Autenticação**: JWT + bcryptjs
- **Containerização**: Docker

## 🚀 Como Executar

### 1. Certifique-se que o Docker Desktop está rodando

```bash
# Na pasta do projeto
docker-compose up --build
```

### 2. Acesse a aplicação

- **Frontend** (Relatório): http://localhost:3000
- **Painel Admin**: http://localhost:3000/admin.html

### Comandos úteis

```bash
docker-compose up -d --build        # Rodar em background
docker-compose down                  # Parar containers
docker-compose logs -f               # Ver logs em tempo real
```

## 📡 Endpoints da API

### Público
- `POST /report` — Criar novo relatório
- `GET /reports` — Listar todos os relatórios

### Admin (Protegido com JWT)
- `POST /admin/login` — body: `{ "username", "password" }` → retorna `{ token, expiresInSeconds }`
- `GET /admin/occurrences` — Listar ocorrências (filtro: `?status=pendente|resolvido`)
- `GET /admin/occurrences/:id` — Obter detalhes de uma ocorrência
- `PUT /admin/occurrences/:id/resolve` — Marcar como resolvido

### Autenticação
Use header: `Authorization: Bearer <token>`

**Credenciais padrão**: 
- Usuário: `admin`
- Senha: `admin123`

**Variáveis de ambiente**:
- `ADMIN_USER` - Username do admin
- `ADMIN_PASS` - Senha do admin
- `ADMIN_JWT_SECRET` - Segredo JWT (mude em produção)
