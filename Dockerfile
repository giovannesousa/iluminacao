# Usar a imagem oficial do Node.js com versão LTS
FROM node:18-alpine

# Build arguments / environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o arquivo package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar dependências de forma reprodutível quando existir package-lock
# tenta usar `npm ci` (mais rápido/reprodutível), caso não esteja disponível cai para `npm install`
RUN if [ -f package-lock.json ]; then \
			npm ci --only=production --no-audit --no-fund || npm install --production --no-audit --no-fund; \
		else \
			npm install --production --no-audit --no-fund; \
		fi

# Copiar todos os arquivos do projeto
COPY . .

# Expor a porta que o servidor usa
EXPOSE 3000

# Usa o comando padrão do package.json
CMD ["npm", "start"]
