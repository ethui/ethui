alias w := watch

watch:
  watchexec --restart --exts .ts,.tsx --ignore .next yarn dev
