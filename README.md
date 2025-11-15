# 🏮 Sistema de Iluminação Pública

Sistema para reporte de problemas de iluminação pública usando Node.js, Express, SQLite e Leaflet Maps.

## 📋 Pré-requisitos

- **Docker Desktop** instalado e rodando
  - [Download Docker Desktop para Windows](https://www.docker.com/products/docker-desktop)

## 🚀 Como executar

### 1. Certifique-se que o Docker Desktop está rodando
   - Abra o Docker Desktop
   - Aguarde até que o ícone da bandeja mostre que o daemon está ativo

### 2. Na pasta do projeto, execute:

```bash
docker-compose up --build
```

### 3. Acesse a aplicação
   - Abra seu navegador em: **http://localhost:3000**

### Comandos úteis:

```bash
# Rodar em background
docker-compose up -d --build

# Parar os containers
docker-compose down

# Ver logs
docker-compose logs -f

# Reconstruir sem usar cache
docker-compose up --build --no-cache
```

## 🎯 Funcionalidades

- 📍 Geolocalização com Leaflet Maps
- 📝 Reportar problemas de iluminação
- 📊 Visualizar problemas reportados
- 🗺️ Mapa interativo com marcadores
- 💾 Persistência de dados com SQLite

## 🔧 Stack Técnico

- **Backend**: Node.js 18 + Express
- **Database**: SQLite
- **Frontend**: HTML5 + Leaflet Maps
- **Containerização**: Docker

---

**Nota**: O banco de dados (iluminacao.db) é persistido e salvo na pasta do projeto.
