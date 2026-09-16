PORT ?= 8733

.DEFAULT_GOAL := help
.PHONY: help build play

help:  ## list the targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/\t/'

build:  ## regenerate src/dims.js, src/glyphs.js and src/glyphs/ from letters/
	node scripts/gen.mjs

play:  ## serve the playground (override the port with PORT=...)
	@echo "  dynamic  http://localhost:$(PORT)/playground/dynamic.html"
	@echo "  static   http://localhost:$(PORT)/playground/static.html"
	@echo "  demo     http://localhost:$(PORT)/playground/demo.html   (the README image)"
	@python3 -m http.server $(PORT) --bind 127.0.0.1
