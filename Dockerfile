# Usar a imagem oficial do Node.js com versão LTS
FROM node:18-alpine

# Definir o diretório de trabalho dentro do container
WORKDIR /app

# Copiar o arquivo package.json e package-lock.json (se existir)
COPY package*.json ./

# Instalar as dependências
RUN npm install --production

# Copiar todos os arquivos do projeto
COPY . .

# Expor a porta que o servidor usa
EXPOSE 3000

# Definir o comando para iniciar a aplicação
CMD ["npm", "start"]
