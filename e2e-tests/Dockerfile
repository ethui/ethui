FROM ianwalter/playwright:latest

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/opt/playwright-browsers/chromium-857950/chrome-linux/chrome

WORKDIR /app
ADD . /app

RUN yarn install

ENTRYPOINT ["yarn", "workspace", "@iron/e2e-tests", "test"]
