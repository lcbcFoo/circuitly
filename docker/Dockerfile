FROM archlinux:latest

USER root
WORKDIR /home/app

# Install dependencies
RUN pacman -Syyu --noconfirm
RUN pacman -S --noconfirm \
    yosys nodejs \
    base base-devel \
    git \
    npm

# Clone Circuitly on docker-build branch
RUN git clone https://github.com/lcbcFoo/circuitly.git
WORKDIR /home/app/circuitly
RUN git checkout docker-build
RUN cat package.json

# Install npm dependencies
RUN npm install

# Expose ports
EXPOSE 80
EXPOSE 8080
EXPOSE 3000

# Startup server
RUN npm run build
CMD ["npm", "run-script", "dev"]
