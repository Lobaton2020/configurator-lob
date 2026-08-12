# syntax=docker/dockerfile:1.6

# ===== Stage 1: build =====
FROM node:22-alpine AS build
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

# URL del backend de laurel; se bakea en el bundle en tiempo de build.
ARG VITE_LAUREL_API=https://laurel-api.andreslobaton.top/api
ENV VITE_LAUREL_API=$VITE_LAUREL_API

# Client ID de Google OAuth (valor publico); se inyecta via build-args desde
# el secret VITE_GOOGLE_CLIENT_ID de GitHub Actions. Sin el, el
# GoogleOAuthProvider queda vacio y el boton de login falla en produccion.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY . .
RUN npm run build

# ===== Stage 2: static =====
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]