FROM ivangabriele/tauri:debian-bullseye-18

RUN apt-get update && apt-get install -y librsvg2-dev patchelf libsodium-dev
RUN apt-get install -y file

WORKDIR /app
ADD . /app/
RUN yarn install --locked
RUN yarn run tauri build
RUN chmod 777 -R *
